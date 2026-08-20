"use client";

import type { PlanoAlimentar } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cx } from "./ui";
import { paraIso } from "@/lib/data";

const DIA_CURTO = ["D", "S", "T", "Q", "Q", "S", "S"];

// Resumo de adesão às refeições dos últimos 7 dias, para o personal acompanhar.
export function AdesaoRefeicoes({
  alunoId,
  plano,
}: {
  alunoId: string;
  plano: PlanoAlimentar;
}) {
  const { registrosRefeicoesDoAluno } = useStore();
  const total = plano.refeicoes.length;
  if (total === 0) return null;

  const registros = registrosRefeicoesDoAluno(alunoId);
  const porData = new Map(registros.map((r) => [r.data, r]));

  const hoje = new Date();
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - (6 - i));
    const iso = paraIso(d);
    const registro = porData.get(iso);
    const feitas = registro
      ? plano.refeicoes.filter((r) => registro.refeicoesFeitas.includes(r.id)).length
      : 0;
    return { iso, diaSemana: d.getDay(), feitas, temRegistro: Boolean(registro) };
  });

  const diasComRegistro = dias.filter((d) => d.temRegistro);
  const mediaPct =
    diasComRegistro.length === 0
      ? null
      : Math.round(
          (diasComRegistro.reduce((s, d) => s + d.feitas / total, 0) /
            diasComRegistro.length) *
            100,
        );

  return (
    <div className="rounded-xl border border-line bg-surface-2/25 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          Adesão às refeições · 7 dias
        </p>
        <span className="text-xs font-semibold">
          {mediaPct === null ? (
            <span className="text-muted">sem registros ainda</span>
          ) : (
            <span className={mediaPct >= 70 ? "text-accent" : "text-orange-400"}>
              {mediaPct}%
            </span>
          )}
        </span>
      </div>
      <div className="flex items-end justify-between gap-1.5">
        {dias.map((d) => {
          const pct = d.temRegistro ? (d.feitas / total) * 100 : 0;
          return (
            <div key={d.iso} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end overflow-hidden rounded-md bg-surface-2">
                <div
                  className={cx(
                    "w-full rounded-md transition-all",
                    pct >= 70 ? "bg-volt" : pct > 0 ? "bg-orange-400" : "bg-transparent",
                  )}
                  style={{ height: `${Math.max(pct, d.temRegistro ? 8 : 0)}%` }}
                  title={d.temRegistro ? `${d.feitas}/${total} refeições` : "sem registro"}
                />
              </div>
              <span className="text-[10px] text-muted">{DIA_CURTO[d.diaSemana]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
