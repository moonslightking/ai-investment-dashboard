import { useId, useState } from "react";

// Renders OHLC data as an SVG with vertical wicks and body rects.
export const Candlestick = ({ data, width = 300, height = 90 }) => {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0) return null;

  const padX = 4;
  const padY = 8;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const allVals = data.flatMap(d => [d.high, d.low]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  const candleW = Math.max(2, (plotW / data.length) * 0.62);
  const step = plotW / data.length;

  const yFor = v => padY + (1 - (v - min) / range) * plotH;

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {/* baseline grid */}
        <line x1={padX} x2={width - padX} y1={height/2} y2={height/2}
          stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />

        {data.map((d, i) => {
          const cx = padX + step * (i + 0.5);
          const isUp = d.close >= d.open;
          const color = isUp ? 'var(--up)' : 'var(--down)';
          const bodyTop = yFor(Math.max(d.open, d.close));
          const bodyBot = yFor(Math.min(d.open, d.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}
              onMouseEnter={() => setHover({ ...d, x: cx, idx: i })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'crosshair' }}>
              {/* wick */}
              <line x1={cx} x2={cx} y1={yFor(d.high)} y2={yFor(d.low)}
                stroke={color} strokeWidth="1" opacity="0.85" />
              {/* body */}
              <rect x={cx - candleW/2} y={bodyTop} width={candleW} height={bodyH}
                fill={isUp ? color : '#fff'}
                opacity={1}
                stroke={color}
                strokeWidth="1"
              />
              {/* hit area */}
              <rect x={padX + step*i} y={0} width={step} height={height}
                fill="transparent" />
            </g>
          );
        })}
        {/* hover crosshair */}
        {hover && (
          <line x1={hover.x} x2={hover.x} y1={0} y2={height}
            stroke="var(--accent)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        )}
      </svg>
      {hover && (
        <div className="candle-tooltip" style={{
          left: Math.min(Math.max(hover.x * 1 - 70, 4), width - 140),
          top: 4,
        }}>
          W{hover.idx + 1} · O {hover.open.toFixed(1)} H {hover.high.toFixed(1)} L {hover.low.toFixed(1)} C {hover.close.toFixed(1)}
        </div>
      )}
    </div>
  );
};

export const Sparkline = ({ data, positive = true, height = 36 }) => {
  const gradientId = useId().replace(/:/g, "");
  if (!data || data.length === 0) return null;
  const width = 200;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height * 0.9 - height * 0.05}`);
  const color = positive ? 'var(--up)' : 'var(--down)';
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={`url(#${gradientId})`} stroke="none" />
      <polyline points={points.join(' ')}
        fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* last-point dot */}
      {(() => {
        const last = points[points.length - 1].split(',');
        return <circle cx={last[0]} cy={last[1]} r="2" fill={color} />;
      })()}
    </svg>
  );
};
