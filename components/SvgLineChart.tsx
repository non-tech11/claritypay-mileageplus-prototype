import type { MetricPoint } from "@/lib/types";

/** Tiny hand-rolled SVG line chart — no chart library needed. */
export function SvgLineChart({
  points,
  height = 120,
}: {
  points: MetricPoint[];
  height?: number;
}) {
  if (points.length < 2) return null;
  const w = 600;
  const pad = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${height - pad} L${pad},${height - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Financed volume, ${points[0].date} to ${points[points.length - 1].date}`}
    >
      <path d={area} fill="var(--brand)" opacity={0.08} />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} />
      <text x={pad} y={height - 1} fontSize={9} fill="#94a3b8">
        {points[0].date}
      </text>
      <text x={w - pad} y={height - 1} fontSize={9} fill="#94a3b8" textAnchor="end">
        {points[points.length - 1].date}
      </text>
    </svg>
  );
}
