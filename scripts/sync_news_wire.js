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
  const summaryZh = sourceSummary
    ? sourceSummary
    : `${source.name} 官方更新；请打开原文确认细节。`;

  return {
    id: `${source.id}_${publishedDate ? publishedDate.toISOString().slice(0, 10) : "undated"}_${index}_${Math.abs(hash(`${title}${url}`))}`,
    category,
    severity,
    time: relativeTime(publishedDate),
    title,
    titleZh: title,
    source: source.name,
    sourceId: source.id,
    sourceType: source.sourceType,
    displayStrength: source.displayStrength || "normal",
    url,
    tags,
    summary: generatedSummary,
    summaryZh,
    publishedAt: publishedDate ? publishedDate.toISOString() : null,
    fetchedAt: now.toISOString(),
    translationStatus: NEWS_WIRE_PROCESSING_POLICY.translationSummaryMode === "server_batch"
      ? "source_language_fallback"
      : "not_configured",
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
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${companyCik}/${accessionNoDashes}/${primaryDocs[index] || ""}`;
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

  const items = dedupeItems(allItems);
  const metadata = {
    generatedAt: now.toISOString(),
    retentionDays: NEWS_WIRE_STORAGE_POLICY.retentionDays,
    sourceCount: NEWS_WIRE_SOURCES.length,
    itemCount: items.length,
    status: sourceStatuses.some((status) => status.ok && status.itemCount > 0) ? "ok" : "empty",
    message: "P0 News Wire snapshot. Full article text is not stored.",
    processingPolicy: NEWS_WIRE_PROCESSING_POLICY,
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
