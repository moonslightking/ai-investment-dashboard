import { useState } from "react";
import { Candlestick } from "./charts.jsx";

export const SectorCard = ({ sector }) => {
  const [companies, setCompanies] = useState(sector.companies);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const onDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const onDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) setOverIdx(idx);
  };
  const onDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...companies];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setCompanies(next);
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const up = sector.totalChange >= 0;
  const sign = sector.totalChange >= 0 ? '+' : '';

  return (
    <div className="sector-card">
      <div className="sector-top">
        <div>
          <h4 className="sector-name">{sector.name}</h4>
          <div className="sector-name-en">{sector.nameEn}</div>
          <div className="sector-desc">{sector.desc}</div>
        </div>
        <div>
          <div className="sector-change-lbl">6M Return</div>
          <div className={`sector-change ${up ? 'up' : 'down'}`}>
            {sign}{sector.totalChange.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="candlestick-wrap">
        <Candlestick data={sector.ohlc} width={320} height={90} />
      </div>

      <div className="company-list">
        {companies.map((c, i) => {
          const changeStr = (c.dailyChange >= 0 ? '+' : '') + c.dailyChange.toFixed(2) + '%';
          const changeClass = Math.abs(c.dailyChange) < 0.05 ? 'flat' : (c.dailyChange >= 0 ? 'up' : 'down');
          return (
            <div key={c.ticker}
              className={`company-row ${dragIdx === i ? 'dragging' : ''} ${overIdx === i ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={onDragEnd}
              title="按住拖动以排序"
            >
              <span className="company-drag">⋮⋮</span>
              <div>
                <span className="company-ticker">{c.ticker.replace(/^PRIV:/, '')}</span>
                <span className="company-name">{c.cn}</span>
              </div>
              <span className="company-price">
                {c.ticker.startsWith('PRIV:') ? '—' : `$${c.price.toFixed(2)}`}
              </span>
              <span className={`company-change ${changeClass}`}>{changeStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
