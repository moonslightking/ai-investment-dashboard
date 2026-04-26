export const VISIBLE_COMPANY_LIMIT = 5;

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

export const normalizeTicker = (ticker) => {
  const cleanTicker = ticker.trim().toUpperCase();
  const [market, symbol] = cleanTicker.split(".");

  if (!symbol) return cleanTicker;
  if (market === "US") return symbol;
  if (["SH", "SZ", "HK", "KS"].includes(market)) return `${symbol}.${market}`;
  return cleanTicker;
};

export const calculateDailyChange = (price, prevClose) => {
  if (!isFiniteNumber(price) || !isFiniteNumber(prevClose) || prevClose === 0) return null;
  return ((price - prevClose) / prevClose) * 100;
};

export const buildSnapshotTrend = ({ price, open, high, low, prevClose }) => {
  if (!isFiniteNumber(prevClose) || prevClose === 0 || !isFiniteNumber(price)) return [];

  const points = [
    ["Prev", prevClose],
    ["Open", open],
    ["Low", low],
    ["High", high],
    ["Last", price],
  ];

  return points
    .filter(([, value]) => isFiniteNumber(value))
    .map(([label, value]) => ({
      label,
      value: (value / prevClose) * 100,
    }));
};

export const averageCompanyTrends = (companies) => {
  const trends = companies
    .map((company) => company.trend)
    .filter((trend) => Array.isArray(trend) && trend.length > 0);

  if (trends.length === 0) return [];

  const labels = trends.reduce((longest, trend) => trend.length > longest.length ? trend : longest, trends[0]);

  return labels.map((point, index) => {
    const values = trends
      .map((trend) => trend[index]?.value)
      .filter(isFiniteNumber);

    return {
      label: point.label,
      value: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    };
  }).filter((point) => isFiniteNumber(point.value));
};

export const averageCompanyMonthlyTrends = (companies) => {
  const monthMap = new Map();

  companies.forEach((company) => {
    if (!Array.isArray(company.monthlyTrend)) return;
    company.monthlyTrend.forEach((point) => {
      if (!point?.month) return;
      const bucket = monthMap.get(point.month) || {
        month: point.month,
        label: point.label || point.month.slice(5),
        open: [],
        high: [],
        low: [],
        close: [],
        change: [],
      };

      ["open", "high", "low", "close", "change"].forEach((key) => {
        if (isFiniteNumber(point[key])) bucket[key].push(point[key]);
      });
      monthMap.set(point.month, bucket);
    });
  });

  return [...monthMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((bucket) => {
      const average = (values) => (
        values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null
      );

      return {
        month: bucket.month,
        label: bucket.label,
        open: average(bucket.open),
        high: average(bucket.high),
        low: average(bucket.low),
        close: average(bucket.close),
        change: average(bucket.change),
      };
    })
    .filter((point) => (
      isFiniteNumber(point.open)
      && isFiniteNumber(point.high)
      && isFiniteNumber(point.low)
      && isFiniteNumber(point.close)
      && isFiniteNumber(point.change)
    ))
    .slice(-6);
};

export const recalculateSector = (sector, companies) => {
  const rankedCompanies = companies.map((company, index) => {
    const price = isFiniteNumber(company.price) ? company.price : null;
    const prevClose = isFiniteNumber(company.prevClose) ? company.prevClose : null;
    const dailyChange = isFiniteNumber(company.dailyChange)
      ? company.dailyChange
      : calculateDailyChange(price, prevClose);

    return {
      ...company,
      rank: index + 1,
      price,
      prevClose,
      dailyChange,
      displayTicker: company.displayTicker || normalizeTicker(company.ticker),
      trend: Array.isArray(company.trend) && company.trend.length > 0
        ? company.trend
        : buildSnapshotTrend(company),
    };
  });

  const movers = rankedCompanies
    .filter((company) => isFiniteNumber(company.dailyChange))
    .sort((a, b) => a.dailyChange - b.dailyChange);
  const validChanges = movers.map((company) => company.dailyChange);
  const leader = movers[movers.length - 1] || null;
  const laggard = movers[0] || null;
  const monthlyTrend = averageCompanyMonthlyTrends(rankedCompanies);
  const currentMonthChange = monthlyTrend[monthlyTrend.length - 1]?.change;

  return {
    ...sector,
    companies: rankedCompanies,
    summary: `${rankedCompanies.length} companies`,
    quoteCoverage: validChanges.length,
    averageChange: validChanges.length > 0
      ? validChanges.reduce((sum, value) => sum + value, 0) / validChanges.length
      : 0,
    currentMonthChange: isFiniteNumber(currentMonthChange) ? currentMonthChange : sector.currentMonthChange,
    leader: leader
      ? { ticker: leader.displayTicker, change: leader.dailyChange }
      : null,
    laggard: laggard
      ? { ticker: laggard.displayTicker, change: laggard.dailyChange }
      : null,
    trend: averageCompanyTrends(rankedCompanies),
    monthlyTrend: monthlyTrend.length > 0 ? monthlyTrend : sector.monthlyTrend,
  };
};

export const createCompanyFromDraft = (draft) => {
  const ticker = draft.ticker.trim().toUpperCase();
  const price = Number.parseFloat(draft.price);
  const prevClose = Number.parseFloat(draft.prevClose);
  const open = Number.parseFloat(draft.open);
  const high = Number.parseFloat(draft.high);
  const low = Number.parseFloat(draft.low);

  const company = {
    rank: 0,
    ticker,
    displayTicker: normalizeTicker(ticker),
    market: ticker.includes(".") ? ticker.split(".")[0] : "",
    name: draft.name.trim() || normalizeTicker(ticker),
    price: isFiniteNumber(price) ? price : null,
    prevClose: isFiniteNumber(prevClose) ? prevClose : null,
    open: isFiniteNumber(open) ? open : null,
    high: isFiniteNumber(high) ? high : null,
    low: isFiniteNumber(low) ? low : null,
  };

  return {
    ...company,
    dailyChange: calculateDailyChange(company.price, company.prevClose),
    trend: buildSnapshotTrend(company),
  };
};
