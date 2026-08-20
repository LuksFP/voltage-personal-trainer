"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  gerarRelatorioSemanal,
  semanaPadraoRelatorioSemanal,
} from "@/lib/relatorio-semanal";
import { useStore } from "@/lib/store";
import { AlertTriangleIcon, ChevronRightIcon, ReportIcon } from "./icons";
import { Badge, Card, cx } from "./ui";
import { fmtDiaMesCurto } from "@/lib/data";

export function ResumoRelatoriosSemanais() {
  const store = useStore();
  const referencia = useMemo(() => semanaPadraoRelatorioSemanal(), []);
  const relatorios = useMemo(() => {
    const prioridade = { alta: 3, media: 2, baixa: 1 } as const;
    return store.alunos
      .filter((aluno) => aluno.ativo)
      .map((aluno) =>
        gerarRelatorioSemanal({
          alunoId: aluno.id,
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
      )
      .sort((a, b) => {
        const pesoA = a.alertas.reduce((total, alerta) => total + prioridade[alerta.prioridade], 0);
        const pesoB = b.alertas.reduce((total, alerta) => total + prioridade[alerta.prioridade], 0);
        return pesoB - pesoA || a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR");
      });
  }, [
    referencia,
    store.alunos,
    store.sessoes,
    store.historicoExercicios,
    store.checkinsSemanais,
    store.configuracoesHabitos,
    store.registrosHabitos,
    store.videosExecucao,
    store.solicitacoesSubstituicao,
  ]);

  if (relatorios.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReportIcon className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-semibold">Relatórios semanais prontos</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Semana de {fmtDiaMesCurto(referencia)} a {fmtDiaMesCurto(relatorios[0].periodo.fim)}, ordenada por
            atenção.
          </p>
        </div>
        <Badge tone="volt">Atualização automática</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {relatorios.map((relatorio) => {
          const alta = relatorio.alertas.filter((alerta) => alerta.prioridade === "alta").length;
          const media = relatorio.alertas.filter((alerta) => alerta.prioridade === "media").length;
          return (
            <Link key={relatorio.aluno.id} href={`/alunos/${relatorio.aluno.id}`}>
              <Card
                className={cx(
                  "h-full p-4 transition-colors hover:border-accent/40",
                  alta > 0 && "border-danger/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold">{relatorio.aluno.nome}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {relatorio.sessoes.realizadas} treino{relatorio.sessoes.realizadas === 1 ? "" : "s"}
                      {relatorio.sessoes.comparecimentoPercentual === null
                        ? " · frequência sem base"
                        : ` · ${Math.round(relatorio.sessoes.comparecimentoPercentual)}% de frequência`}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  {alta + media > 0 ? (
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        alta > 0 ? "bg-danger/10 text-danger" : "bg-orange-400/10 text-orange-300",
                      )}
                    >
                      <AlertTriangleIcon className="h-3.5 w-3.5" /> {alta + media} ponto
                      {alta + media === 1 ? "" : "s"} de atenção
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                      Sem alerta relevante
                    </span>
                  )}
                  <span className="text-xs font-semibold text-muted">
                    {relatorio.recordesE1RM.length} PR{relatorio.recordesE1RM.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
