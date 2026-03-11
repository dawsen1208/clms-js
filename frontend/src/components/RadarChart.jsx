import React from "react";

// Simple, dependency-free radar chart using SVG
// props: { series: Array<{ name: string, metrics: Record<string, number>, color?: string }>,
//          metricsOrder?: string[], size?: number, levels?: number }
export default function RadarChart({
  series = [],
  metricsOrder = ["rating", "popularity", "availability", "recency", "match"],
  size = 320,
  levels = 4,
  axisLabels,
  showLegend = true,
  legendPosition = "bottom",
}) {
  const labelPadding = 56;
  const radius = Math.max(40, size / 2 - labelPadding);
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

  const metricsLabel = (m) => {
    if (axisLabels && axisLabels[m]) return axisLabels[m];
    return String(m || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (c) => c.toUpperCase());
  };

  const tickLabel = (lv) => {
    const v = Math.round(lv * 100) / 100;
    return v === 1 ? "1.0" : String(v);
  };

  const gridPolygons = gridLevels.map((lv) => {
    const pts = metricsOrder.map((_, idx) => {
      const angle = angleFor(idx);
      const p = pointFor(lv, angle);
      return `${p.x},${p.y}`;
    });
    return pts.join(" ");
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: legendPosition === "right" ? "row" : "column",
        gap: 12,
        alignItems: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Book comparison radar"
        style={{ display: "block" }}
      >
        <g>
          {gridPolygons.map((poly, idx) => (
            <polygon
              key={`grid-${idx}`}
              points={poly}
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
            const label = pointFor(1.13, angle);
            const cos = Math.cos(angle);
            const anchor = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
            const dx = cos > 0.35 ? 8 : cos < -0.35 ? -8 : 0;
            const sin = Math.sin(angle);
            const dy = sin > 0.35 ? 14 : sin < -0.35 ? -6 : 4;
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
                  x={label.x + dx}
                  y={label.y + dy}
                  fontSize={12}
                  textAnchor={anchor}
                  fill="#374151"
                >
                  {metricsLabel(m)}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {gridLevels.map((lv, idx) => {
            const angle = angleFor(0);
            const p = pointFor(lv, angle);
            return (
              <text
                key={`tick-${idx}`}
                x={p.x}
                y={p.y - 6}
                fontSize={11}
                textAnchor="middle"
                fill="#9ca3af"
              >
                {tickLabel(lv)}
              </text>
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
              <g key={`poly-${s.name}`}>
                <polygon
                  points={path}
                  fill={s.color + "2E"}
                  stroke={s.color}
                  strokeWidth={2.2}
                />
                {metricsOrder.map((m, idx) => {
                  const angle = angleFor(idx);
                  const p = pointFor(s.metrics[m] ?? 0, angle);
                  return (
                    <circle
                      key={`${s.name}-${m}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.2}
                      fill={s.color}
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* legend */}
      {showLegend && (
        <div
          style={{
            width: legendPosition === "right" ? 220 : size,
            maxWidth: "100%",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {safeSeries.map((s) => (
            <div
              key={`legend-${s.name}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                maxWidth: legendPosition === "right" ? 220 : undefined,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: s.color,
                  display: "inline-block",
                  flex: "0 0 auto",
                }}
              />
              <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.name}
                </div>
                {typeof s.metrics?.customScore === "number" && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {s.metrics.customScore.toFixed(3)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
