import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DATA_SOURCE,
  INDUSTRY_CHAIN,
  KEY_METRIC_DATA,
  KEY_METRIC_DATA_SOURCE,
  KEY_METRIC_GROUPS,
  KEY_METRICS,
  NEWS,
  NEWS_WIRE_DATA_SOURCE,
} from "./industry-board/data.js";
import { MetricGroup, NewsFeed } from "./industry-board/metrics_news.jsx";
import { SectorCard } from "./industry-board/sector.jsx";
import { recalculateSector } from "./industry-board/sectorMath.js";
import "./industry-board/styles.css";

const TWEAK_DEFAULTS = {
  colorConvention: "us",
};

const QUOTE_FETCH_TIMEOUT_MS = 15_000;

const cloneIndustryChain = () => JSON.parse(JSON.stringify(INDUSTRY_CHAIN));

const collectTickers = (chain) => [
  ...new Set(chain.flatMap((layer) => layer.sectors.flatMap((sector) => (
    sector.companies.map((company) => company.ticker).filter(Boolean)
  )))),
];

const formatSyncTime = (value) => {
  if (!value) return "未同步行情";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const mergeLiveQuotesIntoChain = (chain, quotes) => chain.map((layer) => ({
  ...layer,
  sectors: layer.sectors.map((sector) => {
    const companies = sector.companies.map((company) => {
      const quote = quotes[company.ticker];
      const liveReset = {
        ...company,
        liveQuote: false,
      };

      if (!quote) return liveReset;

      return {
        ...liveReset,
        name: quote.name || company.name,
        price: quote.price ?? company.price,
        open: quote.open ?? company.open,
        high: quote.high ?? company.high,
        low: quote.low ?? company.low,
        prevClose: quote.prevClose ?? company.prevClose,
        dailyChange: quote.dailyChange,
        volume: quote.volume ?? company.volume,
        turnover: quote.turnover ?? company.turnover,
        quoteSource: quote.quoteSource || "futu-live",
        quoteTime: quote.quoteTime,
        liveQuote: true,
      };
    });
    return recalculateSector(sector, companies);
  }),
}));

export default function App() {
  const [convention, setConvention] = useState(TWEAK_DEFAULTS.colorConvention);
  const [industryChain, setIndustryChain] = useState(cloneIndustryChain);
  const industryChainRef = useRef(industryChain);
  const [quoteRuntime, setQuoteRuntime] = useState({
    status: "static",
    source: DATA_SOURCE.quoteSource || "static",
    sourceCounts: DATA_SOURCE.quoteSourceCounts || {},
    syncedAt: DATA_SOURCE.quoteSyncedAt,
    coverage: DATA_SOURCE.quoteCoverage || 0,
    requestedCount: DATA_SOURCE.companyCount || 0,
    message: "静态行情快照",
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-convention", convention);
  }, [convention]);

  useEffect(() => {
    industryChainRef.current = industryChain;
  }, [industryChain]);

  const fetchLiveQuotes = useCallback(async () => {
    const codes = collectTickers(industryChainRef.current);
    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, QUOTE_FETCH_TIMEOUT_MS);

    setQuoteRuntime((current) => ({
      ...current,
      status: "loading",
      message: "正在拉取实时行情快照",
      requestedCount: codes.length,
    }));

    try {
      const response = await fetch("/api/industry-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();

      if (!payload?.ok) {
        throw new Error(payload?.error || payload?.stderr || "Futu quote fetch failed");
      }

      const quotes = payload.quotes || {};
      setIndustryChain((currentChain) => mergeLiveQuotesIntoChain(currentChain, quotes));
      setQuoteRuntime({
        status: "live",
        source: payload.source || "live",
        sourceCounts: payload.quoteSourceCounts || { "futu-live": payload.quoteCoverage || 0 },
        syncedAt: payload.fetchedAt,
        coverage: payload.quoteCoverage || 0,
        requestedCount: payload.requestedCount || codes.length,
        message: payload.quoteCoverage === payload.requestedCount
          ? `${payload.source || "实时"} 行情快照已加载`
          : `${payload.source || "实时"} 已加载 ${payload.quoteCoverage || 0} 条，缺失 ${Object.keys(payload.missing || {}).length} 条`,
      });
    } catch (error) {
      const message = didTimeout || error?.name === "AbortError"
        ? `行情请求超过 ${QUOTE_FETCH_TIMEOUT_MS / 1000} 秒，请重试`
        : error?.message || "行情请求失败，请重试";
      setQuoteRuntime((current) => ({
        ...current,
        status: "error",
        message,
      }));
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    fetchLiveQuotes();
  }, [fetchLiveQuotes]);

  const allSectors = useMemo(
    () => industryChain.flatMap((layer) => layer.sectors),
    [industryChain],
  );

  const boardStats = useMemo(() => {
    const getDailyChange = (sector) => sector.averageChange ?? 0;
    const avgChange = allSectors.reduce((sum, sector) => sum + getDailyChange(sector), 0) / allSectors.length;
    const sorted = [...allSectors].sort((a, b) => getDailyChange(b) - getDailyChange(a));
    return {
      avgChange,
      bestSector: sorted[0],
      worstSector: sorted[sorted.length - 1],
      bestChange: getDailyChange(sorted[0]),
      worstChange: getDailyChange(sorted[sorted.length - 1]),
    };
  }, [allSectors]);

  const keyMetricsById = useMemo(
    () => new Map(KEY_METRICS.map((metric) => [metric.id, metric])),
    [],
  );
  const metricCoverage = KEY_METRIC_DATA_SOURCE.coverage || {};
  const coveredMetricCount = metricCoverage.covered ?? Object.keys(KEY_METRIC_DATA).length;
  const verifiedMetricCount = metricCoverage.verified ?? 0;
  const proxyMetricCount = metricCoverage.mixedProxy ?? 0;

  const updateSectorCompanies = (sectorId, companies) => {
    setIndustryChain((currentChain) => currentChain.map((layer) => ({
      ...layer,
      sectors: layer.sectors.map((sector) => (
        sector.id === sectorId ? recalculateSector(sector, companies) : sector
      )),
    })));
  };

  const quoteSourceSummary = Object.entries(quoteRuntime.sourceCounts || {})
    .map(([source, count]) => `${source} ${count}`)
    .join(" · ");
  const quoteSyncLabel = formatSyncTime(quoteRuntime.syncedAt || DATA_SOURCE.quoteSyncedAt);
  const quoteCoverageLabel = `${quoteRuntime.coverage || 0}/${quoteRuntime.requestedCount || DATA_SOURCE.companyCount || 0}`;
  const quoteChipLabel = quoteRuntime.status === "live"
    ? `${String(quoteRuntime.source || "实时").toUpperCase()} 实时`
    : quoteRuntime.status === "loading"
      ? "实时拉取中"
      : "静态快照";

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">Ai</div>
          <div>
            <div className="brand-title">AI 产业看板</div>
            <div className="brand-sub">L0-L2 核心公司排序</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className={`live-chip ${quoteRuntime.status}`} title={`${quoteRuntime.message} · ${quoteSourceSummary || DATA_SOURCE.quoteSource}`}>
            <span className="pulse-dot" />
            {quoteChipLabel} · {quoteCoverageLabel} · {quoteSyncLabel}
          </div>
          <div className="topbar-stat">
            <span className="lbl">细分板块日均</span>
            <span
              className="val"
              style={{ color: boardStats.avgChange >= 0 ? "var(--up)" : "var(--down)" }}
            >
              {boardStats.avgChange >= 0 ? "+" : ""}
              {boardStats.avgChange.toFixed(1)}%
            </span>
          </div>
          <div className="topbar-stat">
            <span className="lbl">最强</span>
            <span className="val" style={{ color: "var(--up)" }}>
              {boardStats.bestSector.code} {boardStats.bestSector.name} {boardStats.bestChange >= 0 ? "+" : ""}
              {boardStats.bestChange.toFixed(1)}%
            </span>
          </div>
          <div className="topbar-stat">
            <span className="lbl">最弱</span>
            <span className="val" style={{ color: "var(--down)" }}>
              {boardStats.worstSector.code} {boardStats.worstSector.name} {boardStats.worstChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </header>

      <div className="board-controls" aria-label="看板显示控制">
        <div className="control-group">
          <span className="control-label">涨跌配色</span>
          <div className="segmented">
            <button
              className={convention === "us" ? "active" : ""}
              onClick={() => setConvention("us")}
              type="button"
            >
              美股：绿涨
            </button>
            <button
              className={convention === "cn" ? "active" : ""}
              onClick={() => setConvention("cn")}
              type="button"
            >
              A股：红涨
            </button>
          </div>
        </div>
        <div className="control-group quote-control">
          <span className={`quote-status ${quoteRuntime.status}`}>{quoteRuntime.message}</span>
          <button
            className="quote-refresh-btn"
            disabled={quoteRuntime.status === "loading"}
            onClick={fetchLiveQuotes}
            type="button"
          >
            {quoteRuntime.status === "loading" ? "刷新中" : "刷新行情"}
          </button>
        </div>
      </div>

      <main>
        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>L0-L2 主干栈</h2>
              <span className="sub">排序来自 L0-L2stocks.xlsx；本地优先 Futu OpenD，线上使用部署 API 拉取实时行情</span>
              <span className="num">{allSectors.length} 个细分</span>
            </div>
          </div>

          {industryChain.map((layer) => (
            <div className="layer" key={layer.id}>
              <div className="layer-header">
                <span className="layer-idx">{layer.code}</span>
                <h3>{layer.name}</h3>
                <span className="layer-sub">
                  {layer.nameEn} · {layer.sectors.length} 个细分
                </span>
              </div>
              <div className="sector-grid">
                {layer.sectors.map((sector) => (
                  <SectorCard
                    key={sector.id}
                    onCompaniesChange={updateSectorCompanies}
                    sector={sector}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>关键数据追踪</h2>
              <span className="sub">11 个指标已接入真实来源快照；直接验证与代理口径分开展示</span>
              <span className="num">{coveredMetricCount}/{KEY_METRICS.length} 已覆盖 · {verifiedMetricCount} 已验证 · {proxyMetricCount} 代理口径 · {KEY_METRIC_GROUPS.length} 组</span>
            </div>
          </div>
          <div className="metric-groups">
            {KEY_METRIC_GROUPS.map((group) => (
              <MetricGroup
                key={group.id}
                group={group}
                metricData={KEY_METRIC_DATA}
                metrics={group.metricIds.map((id) => keyMetricsById.get(id)).filter(Boolean)}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>AI 产业动态</h2>
              <span className="sub">仅跟踪 P0 来源 · 30 天窗口 · 只保留标题、链接与摘要，不抓取全文</span>
              <span className="num">{NEWS.length} 条 · {NEWS_WIRE_DATA_SOURCE.status === "ok" ? "已更新" : "静态快照"}</span>
            </div>
          </div>
          <NewsFeed items={NEWS} />
        </section>
      </main>
    </div>
  );
}
