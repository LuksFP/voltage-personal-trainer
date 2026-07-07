"use client";

import type { PontoMes } from "@/lib/relatorios";

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 30, left: 30 };

/**
 * Barras agrupadas (realizadas x faltas) por mês, em SVG puro.
 * Sem dependência externa — escala com a largura e respeita o tema.
 */
export function BarChart({ dados }: { dados: PontoMes[] }) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(1, ...dados.flatMap((d) => [d.realizadas, d.faltas]));
  // "Passo" de grade agradável: 1, 2, 5, 10...
  const alvoLinhas = 4;
  const passoBruto = max / alvoLinhas;
  const mag = Math.pow(10, Math.floor(Math.log10(passoBruto)));
  const passo = [1, 2, 5, 10].map((m) => m * mag).find((p) => p >= passoBruto) ?? 10 * mag;
  const topo = Math.ceil(max / passo) * passo;

  const grupoW = innerW / dados.length;
  const barW = Math.min(26, (grupoW - 10) / 2);
  const y = (v: number) => PAD.top + innerH - (v / topo) * innerH;

  const grid: number[] = [];
  for (let v = 0; v <= topo; v += passo) grid.push(v);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-volt" /> Realizadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Faltas
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Sessões realizadas e faltas por mês"
      >
        {grid.map((gv) => (
          <g key={gv}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(gv)}
              y2={y(gv)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={y(gv) + 3} textAnchor="end" className="fill-muted" fontSize={10}>
              {gv}
            </text>
          </g>
        ))}

        {dados.map((d, i) => {
          const cx = PAD.left + grupoW * i + grupoW / 2;
          const gap = 3;
          const xReal = cx - barW - gap / 2;
          const xFalta = cx + gap / 2;
          const base = PAD.top + innerH;
          return (
            <g key={d.chave}>
              <rect
                x={xReal}
                y={y(d.realizadas)}
                width={barW}
                height={Math.max(0, base - y(d.realizadas))}
                rx={3}
                className="fill-volt"
              />
              <rect
                x={xFalta}
                y={y(d.faltas)}
                width={barW}
                height={Math.max(0, base - y(d.faltas))}
                rx={3}
                className="fill-danger"
              />
              <text x={cx} y={H - 10} textAnchor="middle" className="fill-muted" fontSize={11}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
