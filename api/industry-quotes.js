const CODE_PATTERN = /^(US|HK|SH|SZ|BJ|KS)\.[A-Za-z0-9._-]+$/;

const normalizeCode = (value) => {
  const code = String(value || "").trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
};

const calcDailyChange = (price, prevClose) => (
  Number.isFinite(price) && Number.isFinite(prevClose) && prevClose !== 0
    ? ((price - prevClose) / prevClose) * 100
    : null
);

const sinaCode = (ticker) => {
  const [market, symbol] = ticker.split(".");
  if (!symbol) return null;
  if (market === "US") return `gb_${symbol.toLowerCase()}`;
  if (market === "HK") return `hk${symbol.padStart(5, "0")}`;
  if (market === "SH" || market === "SZ") {
    if (/^[489]/.test(symbol)) return `bj${symbol}`;
    return `${market.toLowerCase()}${symbol}`;
  }
  if (market === "BJ") return `bj${symbol}`;
  return null;
};

const readRequestPayload = async (req) => {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const parseSinaText = (text) => {
  const result = {};
  const pattern = /var hq_str_([^=]+)="([^"]*)";/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    result[match[1]] = match[2].split(",");
  }
  return result;
};

const buildQuote = (ticker, code, parts) => {
  if (!parts || parts.length < 2 || !parts[0]) return null;

  if (code.startsWith("gb_")) {
    const price = parseNumber(parts[1]);
    const prevClose = parseNumber(parts[26]);
    return {
      ticker,
      name: parts[0],
      price,
      open: parseNumber(parts[5]),
      high: parseNumber(parts[6]),
      low: parseNumber(parts[7]),
      prevClose,
      dailyChange: calcDailyChange(price, prevClose),
      volume: parseNumber(parts[10]),
      quoteSource: "sina-live",
      quoteTime: parts[3],
    };
  }

  if (code.startsWith("hk")) {
    const price = parseNumber(parts[6]);
    const prevClose = parseNumber(parts[3]);
    return {
      ticker,
      name: parts[1] || parts[0],
      price,
      open: parseNumber(parts[2]),
      high: parseNumber(parts[4]),
      low: parseNumber(parts[5]),
      prevClose,
      dailyChange: calcDailyChange(price, prevClose),
      volume: parseNumber(parts[12]),
      turnover: parseNumber(parts[11]),
      quoteSource: "sina-live",
      quoteTime: parts[17] && parts[18] ? `${parts[17]} ${parts[18]}` : undefined,
    };
  }

  const price = parseNumber(parts[3]);
  const prevClose = parseNumber(parts[2]);
  return {
    ticker,
    name: parts[0],
    price,
    open: parseNumber(parts[1]),
    high: parseNumber(parts[4]),
    low: parseNumber(parts[5]),
    prevClose,
    dailyChange: calcDailyChange(price, prevClose),
    volume: parseNumber(parts[8]),
    turnover: parseNumber(parts[9]),
    quoteSource: "sina-live",
    quoteTime: parts[30] && parts[31] ? `${parts[30]} ${parts[31]}` : undefined,
  };
};

const compactQuote = (quote) => Object.fromEntries(
  Object.entries(quote).filter(([, value]) => value !== undefined && value !== null && value !== ""),
);

const isFreshQuote = (quote) => {
  if (!Number.isFinite(quote.price) || quote.price <= 0) return false;
  if (!quote.quoteTime) return true;

  const parsedTime = Date.parse(String(quote.quoteTime).replace(/\//g, "-"));
  if (!Number.isFinite(parsedTime)) return true;

  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - parsedTime <= maxAgeMs;
};

const fetchSinaQuotes = async (codePairs) => {
  const quotes = {};
  const missing = {};

  for (let index = 0; index < codePairs.length; index += 80) {
    const batch = codePairs.slice(index, index + 80);
    const response = await fetch(`https://hq.sinajs.cn/list=${batch.map((item) => item.sina).join(",")}`, {
      headers: {
        Referer: "https://finance.sina.com.cn",
        "User-Agent": "Mozilla/5.0",
      },
    });

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("gb18030").decode(buffer);
    const parsed = parseSinaText(text);

    batch.forEach(({ ticker, sina }) => {
      const quote = buildQuote(ticker, sina, parsed[sina]);
      if (quote && isFreshQuote(quote)) {
        quotes[ticker] = compactQuote(quote);
      } else {
        missing[ticker] = quote ? "stale or invalid Sina quote" : "not returned by Sina quote API";
      }
    });
  }

  return { quotes, missing };
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "GET or POST required" });
    return;
  }

  try {
    const payload = req.method === "GET"
      ? { codes: String(req.query.codes || "").split(",") }
      : await readRequestPayload(req);
    const codes = [...new Set((payload.codes || []).map(normalizeCode).filter(Boolean))];
    const missing = {};
    const codePairs = [];

    codes.forEach((ticker) => {
      const mapped = sinaCode(ticker);
      if (mapped) {
        codePairs.push({ ticker, sina: mapped });
      } else {
        missing[ticker] = "unsupported ticker prefix";
      }
    });

    const { quotes, missing: quoteMissing } = await fetchSinaQuotes(codePairs);
    Object.assign(missing, quoteMissing);

    res.status(200).json({
      ok: true,
      source: "sina",
      fetchedAt: new Date().toISOString(),
      requestedCount: codes.length,
      quoteCoverage: Object.keys(quotes).length,
      quoteSourceCounts: { "sina-live": Object.keys(quotes).length },
      quotes,
      missing,
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      source: "sina",
      error: error.message,
    });
  }
}
