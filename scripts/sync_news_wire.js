import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NEWS_WIRE_PROCESSING_POLICY,
  NEWS_WIRE_RETENTION_DAYS,
  NEWS_WIRE_SEC_EDGAR_WATCHLIST,
  NEWS_WIRE_SOURCES,
  NEWS_WIRE_STORAGE_POLICY,
} from "../src/industry-board/newsWireSources.js";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputPath = path.join(rootDir, "src", "industry-board", "generatedNewsWire.js");
const now = new Date();
const cutoff = new Date(now.getTime() - NEWS_WIRE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
const translationProvider = process.env.NEWS_WIRE_TRANSLATION_PROVIDER
  || NEWS_WIRE_PROCESSING_POLICY.translationProvider
  || "deepl_api";
const translationTargetLang = process.env.DEEPL_TARGET_LANG
  || NEWS_WIRE_PROCESSING_POLICY.defaultTranslationTargetLang
  || "ZH-HANS";
const openAiTranslationModel = process.env.NEWS_WIRE_TRANSLATION_MODEL || "gpt-5-mini";
const requireTranslation = process.env.NEWS_WIRE_REQUIRE_TRANSLATION === "1";

const USER_AGENT = [
  "ai-investment-dashboard-newswire/0.1",
  "(local P0 source monitor; stores title/link/snippet only)",
].join(" ");

const CATEGORY_RULES = [
  { category: "政策", re: /\b(export control|entity list|federal register|regulation|policy|commerce|bis|safety institute)\b/i },
  { category: "并购", re: /\b(acquire|acquires|acquisition|merger|merge|tender offer|definitive agreement)\b/i },
  { category: "投资", re: /\b(funding|financing|ipo|s-1|form 8-k|valuation|investment|invests|raises)\b/i },
  { category: "机器人", re: /\b(robot|robotics|humanoid|optimus|robotaxi|autopilot|fsd|isaac|gr00t|autonomy)\b/i },
  { category: "电力", re: /\b(data center|datacenter|power|grid|ppa|nuclear|megapack|substation|transformer|energy storage)\b/i },
  { category: "芯片", re: /\b(gpu|chip|semiconductor|accelerator|cuda|blackwell|rubin|hbm|nvlink|asic|inference)\b/i },
  { category: "模型", re: /\b(model|gpt|claude|gemini|llama|reasoning|agent|open source|api)\b/i },
];

const SEVERITY_RULES = [
  { severity: "high", re: /\b(launch|release|announces|introduces|unveils|general availability|s-1|acquisition|export control|entity list)\b/i },
  { severity: "medium", re: /\b(partner|partnership|expands|available|new|update|report|filing)\b/i },
];

const LOW_SIGNAL_RULES = [
  /\bterms\s*&\s*conditions\b/i,
  /\bcontest\b/i,
  /\bgetting started\b/i,
  /\bprompting fundamentals\b/i,
  /\bchatgpt for\b/i,
  /\busing (projects|custom gpts|skills)\b/i,
  /\bcreating images\b/i,
  /\bbrainstorming with chatgpt\b/i,
  /\bwriting with chatgpt\b/i,
  /\bpersonalizing chatgpt\b/i,
  /\bai fundamentals\b/i,
  /\bwhere the .* came from\b/i,
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decodeEntity = (entity) => {
  if (entity.startsWith("#x")) {
    return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
  }
  if (entity.startsWith("#")) {
    return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
  }
  return ({
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  })[entity] || `&${entity};`;
};

const decodeHtml = (value = "") => String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&([a-zA-Z0-9#]+);/g, (_, entity) => decodeEntity(entity));

const stripHtml = (value = "") => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const compact = (value = "", maxLength = 220) => {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const boundary = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf("。"));
  return `${slice.slice(0, boundary > 80 ? boundary + 1 : maxLength).trim()}...`;
};

const extractTag = (xml, tag) => {
  const pattern = new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "i");
  const match = xml.match(pattern);
  return match ? decodeHtml(match[1]).trim() : "";
};

const extractLink = (xml) => {
  const simple = extractTag(xml, "link");
  if (simple) return simple;
  const href = xml.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  return href ? decodeHtml(href[1]).trim() : "";
};

const normalizeUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinRetention = (date) => !date || date >= cutoff;

const matchesSourceKeywords = (source, text) => {
  if (source.keywordMode !== "include") return true;
  return (source.keywords || []).some((keyword) => keywordMatches(text, String(keyword)));
};

const keywordMatches = (text, keyword) => {
  const escaped = escapeRegExp(keyword.trim());
  if (!escaped) return false;
  if (/^[a-z0-9 +.-]+$/i.test(keyword)) {
    const separator = "[\\s\\-_/]+";
    const pattern = escaped.replace(/\\ /g, separator).replace(/\s+/g, separator);
    return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(text);
  }
  return text.toLowerCase().includes(keyword.toLowerCase());
};

const inferCategory = (source, text) => {
  const rule = CATEGORY_RULES.find((item) => item.re.test(text));
  return rule?.category || source.primaryCategory || "应用";
};

const inferSeverity = (source, text) => {
  if (source.displayStrength === "weak_hint") return "low";
  const rule = SEVERITY_RULES.find((item) => item.re.test(text));
  return rule?.severity || "medium";
};

const inferTags = (text) => {
  const tagRules = [
    ["OpenAI", /\bopenai|gpt\b/i],
    ["Claude", /\bclaude|anthropic\b/i],
    ["Gemini", /\bgemini|deepmind\b/i],
    ["Llama", /\bllama|meta ai\b/i],
    ["NVIDIA", /\bnvidia|cuda|blackwell|rubin\b/i],
    ["Microsoft", /\bmicrosoft|azure|copilot\b/i],
    ["AWS", /\baws|bedrock|trainium\b/i],
    ["Tesla", /\btesla|optimus|fsd|dojo|megapack\b/i],
    ["SpaceX", /\bspacex|starlink|starship\b/i],
    ["Policy", /\bexport control|entity list|regulation|federal register\b/i],
    ["SEC", /\bs-1|8-k|10-k|10-q\b/i],
    ["Data Center", /\bdata center|datacenter\b/i],
  ];
  return tagRules.filter(([, re]) => re.test(text)).map(([tag]) => tag).slice(0, 5);
};

const relativeTime = (date) => {
  if (!date) return "undated";
  const diffMs = now.getTime() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  if (days === 0) {
    const hours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)));
    return `${hours}h`;
  }
  if (days < 30) return `${days}d`;
  return date.toISOString().slice(5, 10);
};

const buildItem = (source, raw, index) => {
  const title = compact(raw.title, 180);
  const url = normalizeUrl(raw.url, source.url);
  const publishedDate = parseDate(raw.publishedAt);
  if (!title || !url || !isWithinRetention(publishedDate)) return null;

  const sourceSummary = compact(raw.summary, 180);
  const text = [title, sourceSummary].join(" ");
  if (LOW_SIGNAL_RULES.some((rule) => rule.test(text))) return null;
  if (!matchesSourceKeywords(source, text)) return null;

  const category = inferCategory(source, text);
  const severity = inferSeverity(source, text);
  const tags = inferTags(text);
  const generatedSummary = sourceSummary || `${source.name} official update. Open the source link to verify the details.`;

  return {
    id: `${source.id}_${publishedDate ? publishedDate.toISOString().slice(0, 10) : "undated"}_${index}_${Math.abs(hash(`${title}${url}`))}`,
    category,
    severity,
    time: relativeTime(publishedDate),
    title,
    titleZh: null,
    source: source.name,
    sourceId: source.id,
    sourceType: source.sourceType,
    displayStrength: source.displayStrength || "normal",
    url,
    tags,
    summary: generatedSummary,
    summaryZh: null,
    publishedAt: publishedDate ? publishedDate.toISOString() : null,
    fetchedAt: now.toISOString(),
    translationStatus: "pending",
    dedupeKey: normalizeDedupeKey(title, url),
  };
};

const hash = (value) => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = ((result << 5) - result) + value.charCodeAt(index);
    result |= 0;
  }
  return result;
};

const normalizeDedupeKey = (title, url) => {
  const host = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  })();
  return `${host}:${title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim()}`;
};

const parseRssOrAtom = (xml, source) => {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  const entryMatches = itemMatches.length ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)];
  const blocks = itemMatches.length ? itemMatches : entryMatches;
  return blocks.map((match, index) => {
    const block = match[0];
    const raw = {
      title: extractTag(block, "title"),
      url: extractLink(block),
      publishedAt: extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated"),
      summary: extractTag(block, "description") || extractTag(block, "summary"),
    };
    return buildItem(source, raw, index);
  }).filter(Boolean);
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
};

const fetchFeedItems = async (source) => {
  const text = await fetchText(source.url);
  return parseRssOrAtom(text, source).slice(0, source.maxItems || 20);
};

const fetchFederalRegisterItems = async (source) => {
  const params = new URLSearchParams({
    "conditions[term]": (source.keywords || []).join(" OR "),
    order: "newest",
    per_page: "20",
  });
  const text = await fetchText(`${source.url}?${params.toString()}`);
  const data = JSON.parse(text);
  return (data.results || []).map((result, index) => buildItem(source, {
    title: result.title,
    url: result.html_url || result.pdf_url,
    publishedAt: result.publication_date,
    summary: result.abstract || result.type,
  }, index)).filter(Boolean);
};

const fetchPageItems = async (source) => {
  await fetchText(source.url);
  return [];
};

const fetchSecEdgarItems = async (source) => {
  const forms = new Set(["8-K", "S-1", "S-1/A", "10-K", "10-Q", "424B4"]);
  const items = [];

  for (const company of NEWS_WIRE_SEC_EDGAR_WATCHLIST) {
    const text = await fetchText(`${source.url}CIK${company.cik}.json`);
    const data = JSON.parse(text);
    const recent = data.filings?.recent || {};
    const accessions = recent.accessionNumber || [];
    const filingForms = recent.form || [];
    const dates = recent.filingDate || [];
    const primaryDocs = recent.primaryDocument || [];

    accessions.forEach((accession, index) => {
      const form = filingForms[index];
      const filingDate = parseDate(dates[index]);
      if (!forms.has(form) || !isWithinRetention(filingDate)) return;

      const accessionNoDashes = accession.replace(/-/g, "");
      const companyCik = String(company.cik).replace(/^0+/, "");
      const archivePath = `/Archives/edgar/data/${companyCik}/${accessionNoDashes}/${primaryDocs[index] || ""}`;
      const filingUrl = primaryDocs[index]
        ? `https://www.sec.gov/ixviewer/doc/action?doc=${archivePath}`
        : `https://www.sec.gov/Archives/edgar/data/${companyCik}/${accessionNoDashes}/`;
      const item = buildItem(source, {
        title: `${company.name} filed ${form}`,
        url: filingUrl,
        publishedAt: dates[index],
        summary: `${company.ticker} ${form} filing. Watch reason: ${company.reason}.`,
      }, index);
      if (item) items.push({ ...item, tags: [...new Set([...(item.tags || []), company.ticker, form])] });
    });
  }

  return items;
};

const fetchSource = async (source) => {
  if (source.adapter === "browser_page") {
    return {
      items: [],
      status: {
        sourceId: source.id,
        source: source.name,
        adapter: source.adapter,
        ok: true,
        fetched: false,
        itemCount: 0,
        message: "Browser adapter accepted but not executed by this batch script.",
      },
    };
  }
  if (source.adapter === "sec_edgar") {
    const items = await fetchSecEdgarItems(source);
    return {
      items,
      status: {
        sourceId: source.id,
        source: source.name,
        adapter: source.adapter,
        ok: true,
        fetched: true,
        itemCount: items.length,
        message: `Fetched SEC filings for ${NEWS_WIRE_SEC_EDGAR_WATCHLIST.length} AI-related companies.`,
      },
    };
  }

  const fetcher = {
    atom: fetchFeedItems,
    rss: fetchFeedItems,
    federal_register: fetchFederalRegisterItems,
    page: fetchPageItems,
  }[source.adapter];

  if (!fetcher) {
    throw new Error(`Unsupported adapter: ${source.adapter}`);
  }

  const items = await fetcher(source);
  return {
    items,
    status: {
      sourceId: source.id,
      source: source.name,
      adapter: source.adapter,
      ok: true,
      fetched: true,
      itemCount: items.length,
      message: "Fetched title/link/snippet metadata only.",
    },
  };
};

const dedupeItems = (items) => {
  const seen = new Set();
  return items
    .sort((a, b) => Date.parse(b.publishedAt || b.fetchedAt) - Date.parse(a.publishedAt || a.fetchedAt))
    .filter((item) => {
      if (seen.has(item.dedupeKey)) return false;
      seen.add(item.dedupeKey);
      return true;
    });
};

const chunkItems = (items, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const deeplTranslateUrl = () => {
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL;
  return process.env.DEEPL_API_KEY?.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
};

const compactTranslation = (value = "", maxLength = 120) => {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const translateChunkWithDeepL = async (chunk) => {
  const texts = chunk.flatMap((item) => [
    item.title,
    item.summary,
  ]);

  const response = await fetch(deeplTranslateUrl(), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "EN",
      target_lang: translationTargetLang,
      preserve_formatting: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepL translation HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const translated = data.translations || [];
  if (translated.length !== texts.length) {
    throw new Error(`DeepL translation returned ${translated.length} texts for ${texts.length} inputs`);
  }

  return chunk.map((item, index) => ({
    id: item.id,
    titleZh: compactTranslation(translated[index * 2]?.text, 80),
    summaryZh: compactTranslation(translated[(index * 2) + 1]?.text, 140),
  }));
};

const responseText = (data) => {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("");
};

const extractJsonObject = (text) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("translation response did not contain JSON");
};

const translateChunkWithOpenAI = async (chunk) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiTranslationModel,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "You translate AI industry news metadata into concise Simplified Chinese.",
                "Do not add facts not present in the input.",
                "Keep company/product names in English when that is standard in Chinese finance writing.",
                "For titleZh, produce a natural headline under 42 Chinese characters when possible.",
                "For summaryZh, produce one concise sentence under 80 Chinese characters when possible.",
                "Return JSON only.",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                items: chunk.map((item) => ({
                  id: item.id,
                  title: item.title,
                  summary: item.summary,
                  source: item.source,
                  category: item.category,
                })),
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "news_wire_translations",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["items"],
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "titleZh", "summaryZh"],
                  properties: {
                    id: { type: "string" },
                    titleZh: { type: "string" },
                    summaryZh: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI translation HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return extractJsonObject(responseText(data)).items || [];
};

const applyTranslations = async (items) => {
  if (translationProvider === "none") {
    return {
      items: items.map((item) => ({
        ...item,
        translationStatus: "translation_disabled",
      })),
      status: {
        ok: false,
        provider: translationProvider,
        translatedCount: 0,
        message: "News Wire translation is disabled.",
      },
    };
  }

  if (translationProvider === "deepl_api") {
    if (!process.env.DEEPL_API_KEY) {
      if (requireTranslation) {
        throw new Error("DEEPL_API_KEY is required for News Wire translation.");
      }
      return {
        items: items.map((item) => ({
          ...item,
          translationStatus: "missing_deepl_api_key",
        })),
        status: {
          ok: false,
          provider: translationProvider,
          targetLang: translationTargetLang,
          translatedCount: 0,
          message: "DEEPL_API_KEY is not set; Simplified Chinese translation was not generated.",
        },
      };
    }

    const translations = new Map();
    for (const chunk of chunkItems(items, 20)) {
      const translatedItems = await translateChunkWithDeepL(chunk);
      translatedItems.forEach((item) => translations.set(item.id, item));
    }

    return {
      items: items.map((item) => {
        const translated = translations.get(item.id);
        if (!translated) return { ...item, translationStatus: "translation_missing" };
        return {
          ...item,
          titleZh: translated.titleZh,
          summaryZh: translated.summaryZh,
          translationStatus: "translated",
        };
      }),
      status: {
        ok: true,
        provider: translationProvider,
        targetLang: translationTargetLang,
        translatedCount: translations.size,
        message: "Generated Simplified Chinese title and summary translations from stored metadata only.",
      },
    };
  }

  if (translationProvider !== "openai_responses_api") {
    throw new Error(`Unsupported NEWS_WIRE_TRANSLATION_PROVIDER: ${translationProvider}`);
  }

  if (!process.env.OPENAI_API_KEY) {
    if (requireTranslation) {
      throw new Error("OPENAI_API_KEY is required for News Wire translation.");
    }
    return {
      items: items.map((item) => ({
        ...item,
        translationStatus: "missing_openai_api_key",
      })),
      status: {
        ok: false,
        provider: translationProvider,
        model: openAiTranslationModel,
        translatedCount: 0,
        message: "OPENAI_API_KEY is not set; Simplified Chinese translation was not generated.",
      },
    };
  }

  const translations = new Map();
  for (const chunk of chunkItems(items, 20)) {
    const translatedItems = await translateChunkWithOpenAI(chunk);
    translatedItems.forEach((item) => translations.set(item.id, item));
  }

  return {
    items: items.map((item) => {
      const translated = translations.get(item.id);
      if (!translated) return { ...item, translationStatus: "translation_missing" };
      return {
        ...item,
        titleZh: translated.titleZh,
        summaryZh: translated.summaryZh,
        translationStatus: "translated",
      };
    }),
    status: {
      ok: true,
      provider: translationProvider,
      model: openAiTranslationModel,
      translatedCount: translations.size,
      message: "Generated Simplified Chinese title and summary fields from stored metadata only.",
    },
  };
};

const sourceStatusForError = (source, error) => ({
  sourceId: source.id,
  source: source.name,
  adapter: source.adapter,
  ok: false,
  fetched: false,
  itemCount: 0,
  message: error.cause?.message ? `${error.message}: ${error.cause.message}` : error.message,
});

const toModule = (metadata, items) => `// Generated by scripts/sync_news_wire.js. Do not edit by hand.
export const NEWS_WIRE_DATA_SOURCE = ${JSON.stringify(metadata, null, 2)};

export const NEWS = ${JSON.stringify(items, null, 2)};
`;

const main = async () => {
  const sourceStatuses = [];
  const allItems = [];

  for (const source of NEWS_WIRE_SOURCES) {
    try {
      const { items, status } = await fetchSource(source);
      allItems.push(...items);
      sourceStatuses.push(status);
    } catch (error) {
      sourceStatuses.push(sourceStatusForError(source, error));
    }
  }

  const rawItems = dedupeItems(allItems);
  const translationResult = await applyTranslations(rawItems);
  const items = translationResult.items;
  const metadata = {
    generatedAt: now.toISOString(),
    retentionDays: NEWS_WIRE_STORAGE_POLICY.retentionDays,
    sourceCount: NEWS_WIRE_SOURCES.length,
    itemCount: items.length,
    status: sourceStatuses.some((status) => status.ok && status.itemCount > 0) ? "ok" : "empty",
    message: "P0 News Wire snapshot. Full article text is not stored.",
    processingPolicy: NEWS_WIRE_PROCESSING_POLICY,
    translation: translationResult.status,
    sourceStatuses,
  };

  await writeFile(outputPath, toModule(metadata, items), "utf8");
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    itemCount: items.length,
    fetchedSources: sourceStatuses.filter((status) => status.fetched).length,
    failedSources: sourceStatuses.filter((status) => !status.ok).length,
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
