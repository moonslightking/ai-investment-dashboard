import { useId, useState } from "react";

// Renders OHLC data as an SVG with vertical wicks and body rects.
export const Candlestick = ({ data, width = 300, height = 90 }) => {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0) return null;

  const formatPct = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  const padLeft = 28;
  const padRight = 4;
  const padTop = 8;
  const padBottom = 16;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allVals = data.flatMap(d => [d.high, d.low, d.open, d.close, 0]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const paddedMin = min - range * 0.08;
  const paddedMax = max + range * 0.08;
  const paddedRange = paddedMax - paddedMin || 1;

  const candleW = Math.max(2, (plotW / data.length) * 0.62);
  const step = plotW / data.length;

  const yFor = v => padTop + (1 - (v - paddedMin) / paddedRange) * plotH;
  const zeroY = yFor(0);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <line x1={padLeft} x2={padLeft} y1={padTop} y2={height - padBottom}
          stroke="var(--border-normal)" strokeWidth="0.8" />
        <line x1={padLeft} x2={width - padRight} y1={zeroY} y2={zeroY}
          stroke="var(--border-strong)" strokeDasharray="3 3" strokeWidth="0.8" />
        <text x={2} y={padTop + 3} fill="var(--text-lo)" fontSize="7" fontFamily="var(--font-mono)">{formatPct(paddedMax)}</text>
        <text x={2} y={zeroY + 3} fill="var(--text-lo)" fontSize="7" fontFamily="var(--font-mono)">0%</text>
        <text x={2} y={height - padBottom} fill="var(--text-lo)" fontSize="7" fontFamily="var(--font-mono)">{formatPct(paddedMin)}</text>

        {data.map((d, i) => {
          const cx = padLeft + step * (i + 0.5);
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
              <rect x={padLeft + step*i} y={0} width={step} height={height}
                fill="transparent" />
              <text x={cx} y={height - 3} fill="var(--text-lo)" fontSize="7" textAnchor="middle" fontFamily="var(--font-mono)">
                {d.label}
              </text>
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
          {hover.label || `M${hover.idx + 1}`} · O {formatPct(hover.open)} H {formatPct(hover.high)} L {formatPct(hover.low)} C {formatPct(hover.close)}
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
