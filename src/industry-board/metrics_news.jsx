import { useState } from "react";
import { Sparkline } from "./charts.jsx";

export const MetricCard = ({ m }) => {
  const up = m.change >= 0;
  // For some metrics (API price, PUE, spot), going DOWN is the "good" direction
  // but we color purely by sign for clarity; the hint text explains the nuance.
  const signStr = (m.change >= 0 ? '+' : '') + m.change.toFixed(1) + '%';
  const fmt = v => {
    if (Math.abs(v) >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 100) return v.toFixed(1);
    if (Math.abs(v) >= 10) return v.toFixed(2);
    return v.toFixed(2);
  };
  return (
    <div className={`metric-card ${up ? 'up' : 'down'}`}>
      <div className="metric-head">
        <span className="metric-cat">{m.category}</span>
        <span className={`metric-change ${up ? 'up' : 'down'}`}>{signStr}</span>
      </div>
      <div className="metric-label">{m.label}</div>
      <div className="metric-sublabel">{m.sublabel}</div>
      <div className="metric-current">
        <span className="metric-value">{fmt(m.current)}</span>
        {m.unit && <span className="metric-unit">{m.unit}</span>}
      </div>
      <div className="metric-spark">
        <Sparkline data={m.spark} positive={up} height={36} />
      </div>
      <div className="metric-hint">{m.hint}</div>
    </div>
  );
};

const NewsItem = ({ n }) => {
  return (
    <div className="news-item">
      <div className="news-time">{n.time}</div>
      <div className={`news-bar ${n.severity}`} />
      <div className="news-body">
        <div className="news-meta">
          <span className={`news-cat ${n.category}`}>{n.category}</span>
          <span className="news-source">{n.source}</span>
        </div>
        <div className="news-title">{n.title}</div>
        <div className="news-summary">{n.summary}</div>
      </div>
    </div>
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
        {filtered.map(n => <NewsItem key={n.id} n={n} />)}
      </div>
    </div>
  );
};
