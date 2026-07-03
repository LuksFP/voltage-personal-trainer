"use client";

export type ChartPoint = { label: string; value: number };

const W = 640;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 26, left: 40 };

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Gráfico de linha simples em SVG. Escala com a largura do container.
 * Sem dependência externa — respeita a CSP e o tema (usa currentColor).
 */
export function LineChart({
  points,
  unit = "",
  target,
}: {
  points: ChartPoint[];
  unit?: string;
  target?: number;
}) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  // A meta entra na escala para a linha-alvo ficar sempre visível.
  if (target != null) values.push(target);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // série constante: cria uma folga para não achatar a linha
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.15;
  min -= pad;
  max += pad;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${PAD.left},${PAD.top + innerH} ${line} ${PAD.left + innerW},${PAD.top + innerH}`;

  // 3 linhas de grade horizontais (min, meio, max dos valores reais)
  const gridVals = [max - pad, (min + max) / 2, min + pad];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full text-accent"
      role="img"
      aria-label="Gráfico de evolução"
    >
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(gv)}
            y2={y(gv)}
            className="stroke-line"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={y(gv) + 3}
            textAnchor="end"
            className="fill-muted"
            fontSize={10}
          >
            {fmt(gv)}
          </text>
        </g>
      ))}

      {target != null && (
        <g className="text-danger">
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(target)}
            y2={y(target)}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.8}
          />
          <text
            x={W - PAD.right}
            y={y(target) - 5}
            textAnchor="end"
            className="fill-danger"
            fontSize={10}
            fontWeight={700}
          >
            meta {fmt(target)}
            {unit}
          </text>
        </g>
      )}

      <polygon points={area} fill="currentColor" opacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="currentColor" />
          <text
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted"
            fontSize={10}
          >
            {p.label}
          </text>
        </g>
      ))}

      {/* rótulo do último valor */}
      <text
        x={x(points.length - 1)}
        y={y(points[points.length - 1].value) - 8}
        textAnchor="end"
        className="fill-text"
        fontSize={11}
        fontWeight={700}
      >
        {fmt(points[points.length - 1].value)}
        {unit}
      </text>
    </svg>
  );
}
