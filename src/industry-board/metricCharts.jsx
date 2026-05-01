const getToneClass = (tone) => {
  if (tone === "high") return "metric-tone-high";
  if (tone === "mid") return "metric-tone-mid";
  if (tone === "low") return "metric-tone-low";
  if (tone === "up") return "metric-tone-up";
  if (tone === "down") return "metric-tone-down";
  return "metric-tone-neutral";
};

const MetricBarChart = ({ chart }) => {
  const items = chart.items || [];
  const max = Math.max(
    1,
    ...items.flatMap((item) => [
      Math.abs(item.value || 0),
      Math.abs(item.previousValue || 0),
    ]),
  );

  return (
    <div className="metric-chart metric-bar-chart" aria-label={chart.title}>
      <div className="metric-chart-title">{chart.title}</div>
      <div className="metric-bar-list">
        {items.map((item) => {
          const currentWidth = `${Math.max(3, (Math.abs(item.value || 0) / max) * 100)}%`;
          const previousWidth = item.previousValue
            ? `${Math.max(3, (Math.abs(item.previousValue) / max) * 100)}%`
            : null;

          return (
            <div className="metric-bar-row" key={item.label}>
              <div className="metric-bar-label">
                <span>{item.label}</span>
                <strong>{item.displayValue || item.value}</strong>
              </div>
              <div className="metric-bar-track">
                {previousWidth && (
                  <div
                    className="metric-bar metric-bar-previous"
                    style={{ width: previousWidth }}
                    title={`Previous ${item.previousDisplayValue || item.previousValue}`}
                  />
                )}
                <div
                  className={`metric-bar metric-bar-current ${getToneClass(item.tone)}`}
                  style={{ width: currentWidth }}
                />
              </div>
              {previousWidth && (
                <div className="metric-bar-prev-label">
                  Prior {item.previousDisplayValue || item.previousValue}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {chart.unit && <div className="metric-chart-unit">{chart.unit}</div>}
    </div>
  );
};

const MetricLineChart = ({ chart }) => {
  const points = chart.points || [];
  if (points.length < 2) return null;

  const width = 240;
  const height = 76;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * xStep;
    const y = height - ((point.value - min) / range) * (height - 12) - 6;
    return `${x},${y}`;
  });

  return (
    <div className="metric-chart metric-line-chart" aria-label={chart.title}>
      <div className="metric-chart-title">{chart.title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          className="metric-line-fill"
          points={`0,${height} ${coords.join(" ")} ${width},${height}`}
        />
        <polyline className="metric-line" points={coords.join(" ")} />
      </svg>
    </div>
  );
};

const MetricEvents = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="metric-events">
      {events.map((event) => (
        <div className="metric-event" key={`${event.date}-${event.label}`}>
          <span>{event.date}</span>
          <p>{event.label}</p>
        </div>
      ))}
    </div>
  );
};

export const MetricChart = ({ chart, events }) => {
  if (!chart && (!events || events.length === 0)) return null;

  return (
    <>
      {chart?.type === "bar" && <MetricBarChart chart={chart} />}
      {chart?.type === "line" && <MetricLineChart chart={chart} />}
      {chart?.type === "events" && <MetricEvents events={chart.events} />}
      {chart?.type !== "events" && <MetricEvents events={events} />}
    </>
  );
};

export const toneClassName = getToneClass;
