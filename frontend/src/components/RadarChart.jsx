import React from "react";

// Simple, dependency-free radar chart using SVG
// props: { series: Array<{ name: string, metrics: Record<string, number>, color?: string }>,
//          metricsOrder?: string[], size?: number, levels?: number }
export default function RadarChart({
  series = [],
  metricsOrder = ["rating", "popularity", "availability", "recency", "match"],
  size = 320,
  levels = 4,
}) {
  const radius = size / 2 - 30; // padding for labels
  const center = { x: size / 2, y: size / 2 };

  const angleFor = (idx) => (Math.PI * 2 * idx) / metricsOrder.length - Math.PI / 2; // start at top

  const pointFor = (value, angle) => {
    const r = Math.max(0, Math.min(1, value || 0)) * radius;
    return {
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle),
    };
  };

  const gridLevels = Array.from({ length: levels }, (_, i) => (i + 1) / levels);

  const palette = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
  ];

  const safeSeries = series.map((s, i) => ({
    ...s,
    color: s.color || palette[i % palette.length],
  }));

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <svg width={size} height={size} role="img" aria-label="Book comparison radar">
        {/* concentric grid circles */}
        <g>
          {gridLevels.map((lv) => (
            <circle
              key={`grid-${lv}`}
              cx={center.x}
              cy={center.y}
              r={lv * radius}
              fill="none"
              stroke="#e5e7eb"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        {/* axes */}
        <g>
          {metricsOrder.map((m, idx) => {
            const angle = angleFor(idx);
            const end = pointFor(1, angle);
            const label = pointFor(1.08, angle);
            return (
              <g key={`axis-${m}`}>
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#9ca3af"
                  strokeWidth={1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fontSize={12}
                  textAnchor="middle"
                  fill="#374151"
                >
                  {m}
                </text>
              </g>
            );
          })}
        </g>

        {/* series polygons */}
        <g>
          {safeSeries.map((s) => {
            const points = metricsOrder.map((m, idx) => {
              const angle = angleFor(idx);
              const p = pointFor(s.metrics[m] ?? 0, angle);
              return `${p.x},${p.y}`;
            });
            const path = points.join(" ");
            return (
              <polygon
                key={`poly-${s.name}`}
                points={path}
                fill={s.color + "33"}
                stroke={s.color}
                strokeWidth={2}
              />
            );
          })}
        </g>
      </svg>

      {/* legend */}
      <div style={{ minWidth: 180 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Legend</div>
        <div style={{ display: "grid", gap: 8 }}>
          {safeSeries.map((s) => (
            <div key={`legend-${s.name}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  background: s.color,
                  display: "inline-block",
                }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13 }}>{s.name}</div>
                {typeof s.metrics?.customScore === "number" && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Score: {s.metrics.customScore.toFixed(3)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}