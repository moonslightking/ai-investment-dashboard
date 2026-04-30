import { useState } from "react";

export const MetricCard = ({ m }) => {
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
        <span>Source {m.sourceGrade}</span>
      </div>

      <p className="metric-definition">{m.definition}</p>

      <div className="metric-watch">
        {m.watch.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="metric-sources" aria-label={`${m.title} data sources`}>
        {m.sources.map((source) => (
          <a key={source.label} href={source.url} target="_blank" rel="noreferrer">
            {source.label}
          </a>
        ))}
      </div>

      <div className="metric-hint">{m.guardrail}</div>
    </article>
  );
};

export const MetricGroup = ({ group, metrics }) => (
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
        <MetricCard key={metric.id} m={metric} />
      ))}
    </div>
  </section>
);

const NewsItem = ({ n }) => {
  const title = n.titleZh || n.title;
  const summary = n.summaryZh || n.summary;
  const isWeakHint = n.displayStrength === "weak_hint";

  return (
    <a className={`news-item ${isWeakHint ? "weak-hint" : ""}`} href={n.url} target="_blank" rel="noreferrer">
      <div className="news-time">{n.time}</div>
      <div className={`news-bar ${n.severity}`} />
      <div className="news-body">
        <div className="news-meta">
          <span className={`news-cat ${n.category}`}>{n.category}</span>
          <span className="news-source">{n.source}</span>
          {isWeakHint && <span className="news-hint">WEAK SIGNAL</span>}
        </div>
        <div className="news-title">{title}</div>
        <div className="news-summary">{summary}</div>
      </div>
    </a>
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
          : <div className="news-empty">No P0 items in the current 30-day window.</div>}
      </div>
    </div>
  );
};
