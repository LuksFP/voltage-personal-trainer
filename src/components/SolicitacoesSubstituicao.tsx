"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { SolicitacaoSubstituicao } from "@/lib/types";
import { Modal } from "./Modal";
import { RevisarSubstituicaoForm } from "./RevisarSubstituicaoForm";
import { Badge, Button, Card } from "./ui";
import { CheckIcon, SwapIcon, XIcon } from "./icons";
import { fmtDataHora } from "@/lib/data";

const motivoLabel = {
  "equipamento-indisponivel": "Equipamento indisponível",
  dor: "Dor ou desconforto",
  dificuldade: "Dificuldade na execução",
  outro: "Outro motivo",
} as const;

export function SolicitacoesSubstituicao({ alunoId }: { alunoId: string }) {
  const {
    solicitacoesDoAluno,
    aprovarSolicitacaoSubstituicao,
    recusarSolicitacaoSubstituicao,
  } = useStore();
  const solicitacoes = solicitacoesDoAluno(alunoId);
  const pendentes = solicitacoes.filter((item) => item.status === "pendente");
  const respondidas = solicitacoes.filter(
    (item) => item.status === "aprovada" || item.status === "recusada",
  );
  const [analisando, setAnalisando] = useState<SolicitacaoSubstituicao | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold">
            <SwapIcon className="h-5 w-5 text-accent" /> Solicitações de troca
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pedidos enviados pelo aluno diretamente no exercício.
          </p>
        </div>
        {pendentes.length > 0 && <Badge tone="off">{pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}</Badge>}
      </div>

      {pendentes.length === 0 ? (
        <Card className="px-5 py-6 text-center text-sm text-muted">
          Nenhuma solicitação aguardando análise.
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pendentes.map((solicitacao) => (
            <Card key={solicitacao.id} className="border-orange-500/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{solicitacao.exercicioNomeSnapshot}</p>
                  <p className="mt-1 text-xs font-semibold text-orange-300">
                    {motivoLabel[solicitacao.motivo]}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted">{fmtDataHora(solicitacao.criadoEm)}</span>
              </div>
              {solicitacao.detalhes && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{solicitacao.detalhes}</p>
              )}
              <Button className="mt-4 w-full" onClick={() => setAnalisando(solicitacao)}>
                Analisar solicitação
              </Button>
            </Card>
          ))}
        </div>
      )}

      {respondidas.length > 0 && (
        <details className="rounded-xl border border-line bg-surface/40">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">
            Ver histórico de respostas ({respondidas.length})
          </summary>
          <div className="divide-y divide-[var(--color-line)] border-t border-line">
            {respondidas.slice(0, 8).map((solicitacao) => (
              <div key={solicitacao.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    solicitacao.status === "aprovada"
                      ? "bg-accent/10 text-accent"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {solicitacao.status === "aprovada" ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <XIcon className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {solicitacao.exercicioNomeSnapshot}
                    {solicitacao.substituto ? ` → ${solicitacao.substituto.nome}` : ""}
                  </p>
                  {solicitacao.respostaPersonal && (
                    <p className="mt-0.5 text-xs text-muted">{solicitacao.respostaPersonal}</p>
                  )}
                </div>
                <Badge tone={solicitacao.status === "aprovada" ? "volt" : "neutral"}>
                  {solicitacao.status === "aprovada" ? "Aprovada" : "Recusada"}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}

      <Modal
        open={analisando !== null}
        onClose={() => setAnalisando(null)}
        title="Revisar substituição"
      >
        {analisando && (
          <RevisarSubstituicaoForm
            solicitacao={analisando}
            onApprove={(substituto, resposta) => {
              aprovarSolicitacaoSubstituicao(analisando.id, substituto, resposta);
              setAnalisando(null);
            }}
            onReject={(resposta) => {
              recusarSolicitacaoSubstituicao(analisando.id, resposta);
              setAnalisando(null);
            }}
            onCancel={() => setAnalisando(null)}
          />
        )}
      </Modal>
    </section>
  );
}
