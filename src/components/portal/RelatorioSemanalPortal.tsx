"use client";

import { useMemo, useState } from "react";
import {
  gerarRelatorioSemanal,
  semanaPadraoRelatorioSemanal,
} from "@/lib/relatorio-semanal";
import { useStore } from "@/lib/store";
import {
  AlertTriangleIcon,
  ChartIcon,
  ChevronRightIcon,
  DumbbellIcon,
  ReportIcon,
  TrophyIcon,
} from "@/components/icons";
import { cx } from "@/components/ui";

function dataCurta(dataIso: string): string {
  return new Date(`${dataIso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatarNumero(valor: number, casas = 0): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarVolume(valor: number | null): string {
  if (valor === null) return "—";
  return valor >= 1000 ? `${formatarNumero(valor / 1000, 1)} t` : `${formatarNumero(valor)} kg`;
}

export function RelatorioSemanalPortal({ alunoId }: { alunoId: string }) {
  const store = useStore();
  const [aberto, setAberto] = useState(false);
  const referencia = useMemo(() => semanaPadraoRelatorioSemanal(), []);
  const relatorio = useMemo(
    () =>
      gerarRelatorioSemanal({
        alunoId,
        semanaInicio: referencia,
        alunos: store.alunos,
        sessoes: store.sessoes,
        historicoExercicios: store.historicoExercicios,
        checkinsSemanais: store.checkinsSemanais,
        configuracoesHabitos: store.configuracoesHabitos,
        registrosHabitos: store.registrosHabitos,
        videosExecucao: store.videosExecucao,
        solicitacoesSubstituicao: store.solicitacoesSubstituicao,
      }),
    [
      alunoId,
      referencia,
      store.alunos,
      store.sessoes,
      store.historicoExercicios,
      store.checkinsSemanais,
      store.configuracoesHabitos,
      store.registrosHabitos,
      store.videosExecucao,
      store.solicitacoesSubstituicao,
    ],
  );
  const alertas = relatorio.alertas.filter((alerta) => alerta.visivelAluno);

  return (
    <section className="overflow-hidden rounded-xl2 border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="w-full p-4 text-left"
        aria-expanded={aberto}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt text-ink">
            <ReportIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-display font-semibold">Seu resumo da semana</span>
              {alertas.some((alerta) => alerta.prioridade === "alta") && (
                <span className="h-2 w-2 rounded-full bg-danger" aria-label="Há ponto importante" />
              )}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {dataCurta(relatorio.periodo.inicio)} a {dataCurta(relatorio.periodo.fim)} · atualizado
              automaticamente
            </span>
          </span>
          <ChevronRightIcon
            className={cx(
              "mt-2 h-5 w-5 shrink-0 text-muted transition-transform",
              aberto && "rotate-90",
            )}
          />
        </div>

        <span className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-bg/30">
          <ResumoNumero
            icon={<DumbbellIcon className="h-3.5 w-3.5" />}
            label="Treinos"
            valor={String(relatorio.sessoes.realizadas)}
          />
          <ResumoNumero
            icon={<ChartIcon className="h-3.5 w-3.5" />}
            label="Frequência"
            valor={
              relatorio.sessoes.comparecimentoPercentual === null
                ? "—"
                : `${formatarNumero(relatorio.sessoes.comparecimentoPercentual)}%`
            }
          />
          <ResumoNumero
            icon={<TrophyIcon className="h-3.5 w-3.5" />}
            label="Recordes"
            valor={String(relatorio.recordesE1RM.length)}
          />
        </span>
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-line p-4">
          <div className="grid grid-cols-3 gap-2">
            <Dado label="Séries" valor={String(relatorio.treino.seriesTrabalho)} />
            <Dado label="Volume" valor={formatarVolume(relatorio.treino.volumeExterno.kg)} />
            <Dado
              label="RPE médio"
              valor={
                relatorio.treino.rpeMedio === null
                  ? "—"
                  : formatarNumero(relatorio.treino.rpeMedio, 1)
              }
            />
          </div>

          {alertas.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                Para conversar com seu personal
              </p>
              <div className="space-y-2">
                {alertas.slice(0, 3).map((alerta) => (
                  <div
                    key={alerta.id}
                    className={cx(
                      "flex items-start gap-2 rounded-xl border p-3",
                      alerta.prioridade === "alta"
                        ? "border-danger/30 bg-danger/7"
                        : "border-orange-400/25 bg-orange-400/5",
                    )}
                  >
                    <AlertTriangleIcon
                      className={cx(
                        "mt-0.5 h-4 w-4 shrink-0",
                        alerta.prioridade === "alta" ? "text-danger" : "text-orange-300",
                      )}
                    />
                    <div>
                      <p className="text-sm font-semibold">{alerta.titulo}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{alerta.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatorio.recordesE1RM.length > 0 && (
            <div className="rounded-xl border border-accent/20 bg-accent/6 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent">
                <TrophyIcon className="h-3.5 w-3.5" /> Recorde da semana
              </p>
              <p className="mt-1.5 text-sm font-semibold">
                {relatorio.recordesE1RM[0].nome} · e1RM{" "}
                {formatarNumero(relatorio.recordesE1RM[0].e1rmKg, 1)} kg
              </p>
            </div>
          )}

          <div className="rounded-xl bg-surface-2/45 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Resumo automático
            </p>
            <p className="mt-1.5 text-sm leading-6 text-muted">{relatorio.textos.aluno}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ResumoNumero({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <span className="border-r border-line px-2 py-3 text-center last:border-r-0">
      <span className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted">
        <span className="text-accent">{icon}</span> {label}
      </span>
      <span className="font-display mt-1 block text-xl font-bold">{valor}</span>
    </span>
  );
}

function Dado({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/25 px-2 py-3 text-center">
      <p className="text-[9px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-1 text-lg font-bold">{valor}</p>
    </div>
  );
}
