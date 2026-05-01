import { useState } from "react";
import { MetricChart, toneClassName } from "./metricCharts.jsx";

const STATUS_LABELS = {
  verified: "已验证",
  "mixed-proxy": "混合代理口径",
  stale: "待刷新",
  blocked: "来源受限",
};

export const MetricCard = ({ m }) => {
  const snapshot = m.data;

  return (
    <article className={`metric-card priority-${m.priority.toLowerCase()}`}>
      <div className="metric-head">
        <span className="metric-cat">{m.category}</span>
        <span className="metric-priority">{m.priority}</span>
      </div>
      <div className="metric-label">{m.title}</div>
      <div className="metric-sublabel">{m.titleEn}</div>

      <div className="metric-meta-row">
        <span>{m.signalType}</span>
        <span>{m.frequency}</span>
        <span>来源等级 {m.sourceGrade}</span>
      </div>

      {snapshot && (
        <div className={`metric-data-panel status-${snapshot.status}`}>
          <div className="metric-data-top">
            <span className="metric-data-status">{STATUS_LABELS[snapshot.status] || snapshot.status}</span>
            <span className="metric-data-date">{snapshot.updatedAt}</span>
          </div>
          <div className="metric-headline-row">
            <div>
              <div className={`metric-headline-value ${toneClassName(snapshot.headline.tone)}`}>
                {snapshot.headline.value}
              </div>
              <div className="metric-headline-label">{snapshot.headline.label}</div>
            </div>
            <div className={`metric-delta-pill ${toneClassName(snapshot.delta.tone)}`}>
              <strong>{snapshot.delta.value}</strong>
              <span>{snapshot.delta.label}</span>
            </div>
          </div>
          {snapshot.headline.subvalue && (
            <div className="metric-headline-subvalue">{snapshot.headline.subvalue}</div>
          )}
          <MetricChart chart={snapshot.chart} events={snapshot.events} />
          <div className="metric-data-rows">
            {snapshot.rows.map((row) => (
              <div className="metric-data-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
          <div className="metric-source-note">{snapshot.sourceNote}</div>
        </div>
      )}

      <p className="metric-definition">{m.definition}</p>

      <div className="metric-watch">
        {m.watch.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="metric-sources" aria-label={`${m.title} 数据来源`}>
        {(snapshot?.sources || m.sources).map((source) => (
          <a key={source.label} href={source.url} target="_blank" rel="noreferrer">
            {source.label}
          </a>
        ))}
      </div>

      <div className="metric-hint">{m.guardrail}</div>
    </article>
  );
};

export const MetricGroup = ({ group, metricData, metrics }) => (
  <section className="metric-group" aria-labelledby={`metric-group-${group.id}`}>
    <div className="metric-group-head">
      <div>
        <h3 id={`metric-group-${group.id}`}>{group.title}</h3>
        <span>{group.titleEn}</span>
      </div>
      <strong>{metrics.length}</strong>
    </div>
    <p className="metric-group-subtitle">{group.subtitle}</p>
    <div className="metrics-grid">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} m={{ ...metric, data: metricData?.[metric.id] }} />
      ))}
    </div>
  </section>
);

const NewsItem = ({ n }) => {
  const title = n.titleZh || n.title;
  const summary = n.summaryZh || n.summary;
  const isWeakHint = n.displayStrength === "weak_hint";
  const openOriginal = () => {
    if (!n.url) return;
    window.open(n.url, "_blank", "noopener,noreferrer");
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openOriginal();
    }
  };

  return (
    <article
      className={`news-item ${isWeakHint ? "weak-hint" : ""}`}
      role="link"
      tabIndex={0}
      onClick={openOriginal}
      onKeyDown={onKeyDown}
      title="打开原始来源"
    >
      <div className="news-time">{n.time}</div>
      <div className={`news-bar ${n.severity}`} />
      <div className="news-body">
        <div className="news-meta">
          <span className={`news-cat ${n.category}`}>{n.category}</span>
          <span className="news-source">{n.source}</span>
          {isWeakHint && <span className="news-hint">弱信号</span>}
        </div>
        <div className="news-title">{title}</div>
        <div className="news-summary">{summary}</div>
      </div>
    </article>
  );
};

export const NewsFeed = ({ items }) => {
  const categories = ['全部', '模型', '芯片', '投资', '并购', '政策', '电力', '机器人', '应用'];
  const [active, setActive] = useState('全部');
  const filtered = active === '全部' ? items : items.filter(n => n.category === active);
  return (
    <div className="news-shell">
      <div className="news-tabs">
        {categories.map(c => (
          <button key={c}
            className={`news-tab ${active === c ? 'active' : ''}`}
            onClick={() => setActive(c)}>
            {c}
            {c !== '全部' && (
              <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>
                {items.filter(n => n.category === c).length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="news-list">
        {filtered.length > 0
          ? filtered.map(n => <NewsItem key={n.id} n={n} />)
          : <div className="news-empty">当前 30 天窗口内没有 P0 条目。</div>}
      </div>
    </div>
  );
};
