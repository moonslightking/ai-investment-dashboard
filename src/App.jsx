import { useEffect, useMemo, useState } from "react";
import { INDUSTRY_CHAIN, KEY_METRICS, NEWS } from "./industry-board/data.js";
import { MetricCard, NewsFeed } from "./industry-board/metrics_news.jsx";
import { SectorCard } from "./industry-board/sector.jsx";
import "./industry-board/styles.css";

const TWEAK_DEFAULTS = {
  colorConvention: "us",
  timeWindow: "6M",
};

export default function App() {
  const [convention, setConvention] = useState(TWEAK_DEFAULTS.colorConvention);
  const [timeWindow, setTimeWindow] = useState(TWEAK_DEFAULTS.timeWindow);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.documentElement.setAttribute("data-convention", convention);
  }, [convention]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const allSectors = useMemo(
    () => INDUSTRY_CHAIN.flatMap((layer) => layer.sectors),
    [],
  );

  const boardStats = useMemo(() => {
    const avgChange = allSectors.reduce((sum, sector) => sum + sector.totalChange, 0) / allSectors.length;
    const sorted = [...allSectors].sort((a, b) => b.totalChange - a.totalChange);
    return {
      avgChange,
      bestSector: sorted[0],
      worstSector: sorted[sorted.length - 1],
    };
  }, [allSectors]);

  const timeStr = now.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">Ai</div>
          <div>
            <div className="brand-title">AI Industry Board</div>
            <div className="brand-sub">Full-Stack · Sector Tracker</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="live-chip">
            <span className="pulse-dot" />
            SAMPLE · {timeStr}
          </div>
          <div className="topbar-stat">
            <span className="lbl">Sectors Avg {timeWindow}</span>
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
              {boardStats.bestSector.name} +{boardStats.bestSector.totalChange.toFixed(0)}%
            </span>
          </div>
          <div className="topbar-stat">
            <span className="lbl">Worst</span>
            <span className="val" style={{ color: "var(--down)" }}>
              {boardStats.worstSector.name} {boardStats.worstSector.totalChange.toFixed(0)}%
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
        <div className="control-group">
          <span className="control-label">Window</span>
          <div className="segmented compact">
            {["1M", "3M", "6M", "1Y"].map((windowLabel) => (
              <button
                className={timeWindow === windowLabel ? "active" : ""}
                key={windowLabel}
                onClick={() => setTimeWindow(windowLabel)}
                type="button"
              >
                {windowLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main>
        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>产业链分层 · Industry Chain</h2>
              <span className="sub">过去 {timeWindow} · 示例周 K 线</span>
              <span className="num">{allSectors.length} SECTORS</span>
            </div>
          </div>

          {INDUSTRY_CHAIN.map((layer, layerIndex) => (
            <div className="layer" key={layer.id}>
              <div className="layer-header">
                <span className="layer-idx">L{layerIndex + 1}</span>
                <h3>{layer.name}</h3>
                <span className="layer-sub">
                  {layer.nameEn} · {layer.sectors.length} 个细分
                </span>
              </div>
              <div className="sector-grid">
                {layer.sectors.map((sector) => (
                  <SectorCard key={sector.id} sector={sector} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>关键数据追踪 · Key Metrics</h2>
              <span className="sub">算力 · 模型 · 投资 · 电力</span>
              <span className="num">{KEY_METRICS.length} SIGNALS</span>
            </div>
          </div>
          <div className="metrics-grid">
            {KEY_METRICS.map((metric) => (
              <MetricCard key={metric.id} m={metric} />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>AI 产业动态 · News Wire</h2>
              <span className="sub">模型发布 · 收并购 · 融资 · 政策</span>
              <span className="num">{NEWS.length} ITEMS</span>
            </div>
          </div>
          <NewsFeed items={NEWS} />
        </section>
      </main>
    </div>
  );
}
