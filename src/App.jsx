import { useEffect, useMemo, useState } from "react";
import { DATA_SOURCE, INDUSTRY_CHAIN, KEY_METRIC_GROUPS, KEY_METRICS, NEWS } from "./industry-board/data.js";
import { MetricGroup, NewsFeed } from "./industry-board/metrics_news.jsx";
import { SectorCard } from "./industry-board/sector.jsx";
import { recalculateSector } from "./industry-board/sectorMath.js";
import "./industry-board/styles.css";

const TWEAK_DEFAULTS = {
  colorConvention: "us",
};

const cloneIndustryChain = () => JSON.parse(JSON.stringify(INDUSTRY_CHAIN));

const formatSyncTime = (value) => {
  if (!value) return "NO QUOTE SYNC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const quoteSourceSummary = Object.entries(DATA_SOURCE.quoteSourceCounts || {})
  .map(([source, count]) => `${source} ${count}`)
  .join(" · ");

export default function App() {
  const [convention, setConvention] = useState(TWEAK_DEFAULTS.colorConvention);
  const [industryChain, setIndustryChain] = useState(cloneIndustryChain);

  useEffect(() => {
    document.documentElement.setAttribute("data-convention", convention);
  }, [convention]);

  const allSectors = useMemo(
    () => industryChain.flatMap((layer) => layer.sectors),
    [industryChain],
  );

  const boardStats = useMemo(() => {
    const getCurrentMonthChange = (sector) => sector.currentMonthChange ?? sector.averageChange;
    const avgChange = allSectors.reduce((sum, sector) => sum + getCurrentMonthChange(sector), 0) / allSectors.length;
    const sorted = [...allSectors].sort((a, b) => getCurrentMonthChange(b) - getCurrentMonthChange(a));
    return {
      avgChange,
      bestSector: sorted[0],
      worstSector: sorted[sorted.length - 1],
      bestChange: getCurrentMonthChange(sorted[0]),
      worstChange: getCurrentMonthChange(sorted[sorted.length - 1]),
    };
  }, [allSectors]);

  const keyMetricsById = useMemo(
    () => new Map(KEY_METRICS.map((metric) => [metric.id, metric])),
    [],
  );

  const updateSectorCompanies = (sectorId, companies) => {
    setIndustryChain((currentChain) => currentChain.map((layer) => ({
      ...layer,
      sectors: layer.sectors.map((sector) => (
        sector.id === sectorId ? recalculateSector(sector, companies) : sector
      )),
    })));
  };

  const quoteSyncLabel = formatSyncTime(DATA_SOURCE.quoteSyncedAt);
  const quoteCoverageLabel = `${DATA_SOURCE.quoteCoverage || 0}/${DATA_SOURCE.companyCount || 0}`;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">Ai</div>
          <div>
            <div className="brand-title">AI Industry Board</div>
            <div className="brand-sub">L0-L2 Ranked Core Companies</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="live-chip" title={quoteSourceSummary || DATA_SOURCE.quoteSource}>
            <span className="pulse-dot" />
            QUOTE SNAPSHOT · {quoteCoverageLabel} · {quoteSyncLabel}
          </div>
          <div className="topbar-stat">
            <span className="lbl">Sectors Avg Month</span>
            <span
              className="val"
              style={{ color: boardStats.avgChange >= 0 ? "var(--up)" : "var(--down)" }}
            >
              {boardStats.avgChange >= 0 ? "+" : ""}
              {boardStats.avgChange.toFixed(1)}%
            </span>
          </div>
          <div className="topbar-stat">
            <span className="lbl">Best</span>
            <span className="val" style={{ color: "var(--up)" }}>
              {boardStats.bestSector.code} {boardStats.bestSector.name} {boardStats.bestChange >= 0 ? "+" : ""}
              {boardStats.bestChange.toFixed(1)}%
            </span>
          </div>
          <div className="topbar-stat">
            <span className="lbl">Worst</span>
            <span className="val" style={{ color: "var(--down)" }}>
              {boardStats.worstSector.code} {boardStats.worstSector.name} {boardStats.worstChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </header>

      <div className="board-controls" aria-label="Dashboard display controls">
        <div className="control-group">
          <span className="control-label">Color</span>
          <div className="segmented">
            <button
              className={convention === "us" ? "active" : ""}
              onClick={() => setConvention("us")}
              type="button"
            >
              Green Up
            </button>
            <button
              className={convention === "cn" ? "active" : ""}
              onClick={() => setConvention("cn")}
              type="button"
            >
              Red Up
            </button>
          </div>
        </div>
      </div>

      <main>
        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>L0-L2 主干栈 · Industry Chain</h2>
              <span className="sub">排序来自 L0-L2stocks.xlsx，价格来自 Futu 快照 + fallback</span>
              <span className="num">{allSectors.length} SECTORS</span>
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
              <h2>关键数据追踪 · Key Metrics</h2>
              <span className="sub">算力供需跟踪框架：需求体感、供给约束、扩产投入、价值捕获</span>
              <span className="num">{KEY_METRICS.length} SIGNALS · {KEY_METRIC_GROUPS.length} GROUPS</span>
            </div>
          </div>
          <div className="metric-groups">
            {KEY_METRIC_GROUPS.map((group) => (
              <MetricGroup
                key={group.id}
                group={group}
                metrics={group.metricIds.map((id) => keyMetricsById.get(id)).filter(Boolean)}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>AI 产业动态 · News Wire</h2>
              <span className="sub">当前仍为示例动态，尚未与 workbook 同步</span>
              <span className="num">{NEWS.length} ITEMS</span>
            </div>
          </div>
          <NewsFeed items={NEWS} />
        </section>
      </main>
    </div>
  );
}
