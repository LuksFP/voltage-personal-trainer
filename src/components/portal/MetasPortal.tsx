"use client";

import { useMemo } from "react";
import { CalendarIcon, TargetIcon } from "@/components/icons";
import { cx } from "@/components/ui";
import { calcularProgressoMeta } from "@/lib/metas";
import { useStore } from "@/lib/store";
import type { MetaAluno } from "@/lib/types";

function dataLocalHoje(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function unidadeCurta(unidade: MetaAluno["unidade"]): string {
  return unidade === "sessoes/semana" ? "sessões/semana" : unidade;
}

function formatarValor(valor: number, unidade: MetaAluno["unidade"]): string {
  return `${formatarNumero(valor)} ${unidadeCurta(unidade)}`;
}

function formatarPercentual(valor: number): string {
  return `${formatarNumero(valor)}%`;
}

function formatarPrazo(dataIso: string): string {
  return new Date(`${dataIso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function rotuloTipo(meta: MetaAluno): string {
  if (meta.tipo === "peso") return "Peso corporal";
  if (meta.tipo === "frequencia-semanal") return "Frequência semanal";
  if (meta.tipo === "carga-exercicio") return `Carga · ${meta.exercicioNomeSnapshot}`;

  const medidas: Record<typeof meta.medida, string> = {
    percentualGordura: "Percentual de gordura",
    cintura: "Cintura",
    quadril: "Quadril",
    peito: "Peito",
    braco: "Braço",
    coxa: "Coxa",
  };
  return medidas[meta.medida];
}

export function MetasPortal({ alunoId }: { alunoId: string }) {
  const store = useStore();
  const hoje = useMemo(() => dataLocalHoje(), []);
  const metasAtivas = store.metasDoAluno(alunoId).filter((meta) => meta.status === "ativa");
  const dados = useMemo(
    () => ({
      avaliacoes: store.avaliacoes,
      sessoes: store.sessoes,
      historicoExercicios: store.historicoExercicios,
    }),
    [store.avaliacoes, store.historicoExercicios, store.sessoes],
  );

  return (
    <section className="space-y-3" aria-labelledby="metas-portal-titulo">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Evolução planejada
          </p>
          <h2 id="metas-portal-titulo" className="font-display mt-1 text-xl font-semibold">
            Suas metas
          </h2>
        </div>
        {metasAtivas.length > 0 && (
          <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            {metasAtivas.length} {metasAtivas.length === 1 ? "ativa" : "ativas"}
          </span>
        )}
      </div>

      {metasAtivas.length === 0 ? (
        <div className="rounded-xl2 border border-line bg-surface/70 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
              <TargetIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display font-semibold">Nenhuma meta ativa</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Quando seu personal definir um objetivo, o progresso aparece aqui automaticamente.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {metasAtivas.map((meta) => {
            const progresso = calcularProgressoMeta(meta, dados, hoje);
            const aguardandoRegistro = progresso.valorAtual === null;

            return (
              <article
                key={meta.id}
                className={cx(
                  "overflow-hidden rounded-xl2 border bg-surface/70",
                  progresso.prazoVencido ? "border-danger/35" : "border-line",
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cx(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                        progresso.prazoVencido
                          ? "bg-danger/10 text-danger"
                          : "bg-accent/12 text-accent",
                      )}
                    >
                      <TargetIcon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted">
                        {rotuloTipo(meta)}
                      </p>
                      <h3 className="mt-0.5 truncate font-display text-base font-semibold">
                        {meta.titulo}
                      </h3>
                    </div>
                    <span className="font-display shrink-0 text-xl font-bold text-accent">
                      {formatarPercentual(progresso.percentual)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      Valor atual
                    </p>
                    <p
                      className={cx(
                        "font-display mt-1 font-bold",
                        aguardandoRegistro ? "text-base text-muted" : "text-2xl text-text",
                      )}
                    >
                      {aguardandoRegistro
                        ? "Aguardando registro"
                        : formatarValor(progresso.valorAtual!, meta.unidade)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatarValor(meta.valorInicial, meta.unidade)}
                      <span className="mx-1.5 text-accent" aria-hidden="true">
                        →
                      </span>
                      meta de {formatarValor(meta.valorAlvo, meta.unidade)}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-surface-2"
                      role="progressbar"
                      aria-label={`Progresso da meta ${meta.titulo}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progresso.percentual}
                    >
                      <div
                        className={cx(
                          "h-full rounded-full transition-[width] duration-500",
                          progresso.prazoVencido ? "bg-danger" : "bg-volt",
                        )}
                        style={{ width: `${progresso.percentual}%` }}
                      />
                    </div>
                    <div
                      className={cx(
                        "mt-2 flex items-center gap-1.5 text-[11px]",
                        progresso.prazoVencido ? "font-semibold text-danger" : "text-muted",
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {progresso.prazoVencido ? "Prazo encerrado em" : "Prazo até"}{" "}
                        {formatarPrazo(meta.prazo)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
