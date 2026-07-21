"use client";

import { useState } from "react";
import {
  PERGUNTAS_PARQ,
  pontosAtencaoAnamnese,
  respostasPositivasParQ,
} from "@/lib/anamnese";
import { useStore } from "@/lib/store";
import type { AnamneseDigital } from "@/lib/types";
import {
  AlertTriangleIcon,
  CheckIcon,
  HeartPulseIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "./icons";
import { Badge, Button, Card, Textarea, cx } from "./ui";

function dataHora(dataIso: string): string {
  return new Date(dataIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnamneseAluno({ alunoId }: { alunoId: string }) {
  const { anamneseDoAluno, revisarAnamnese, reabrirAnamnese } = useStore();
  const anamnese = anamneseDoAluno(alunoId);
  const [observacao, setObservacao] = useState(anamnese?.observacaoPersonal ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const revisar = () => {
    try {
      revisarAnamnese(alunoId, observacao.trim() || undefined);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível revisar a anamnese.");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Anamnese digital</h2>
            {anamnese ? (
              <Badge
                tone={
                  anamnese.status === "revisada"
                    ? "volt"
                    : anamnese.status === "enviada"
                      ? "off"
                      : "neutral"
                }
              >
                {anamnese.status === "revisada"
                  ? "Revisada"
                  : anamnese.status === "enviada"
                    ? "Aguardando revisão"
                    : "Rascunho"}
              </Badge>
            ) : (
              <Badge tone="off">Não preenchida</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            PAR-Q, lesões, medicamentos, restrições, emergência e consentimentos.
          </p>
        </div>
        {anamnese?.status === "revisada" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              try {
                reabrirAnamnese(alunoId);
                setErro(null);
              } catch (error) {
                setErro(error instanceof Error ? error.message : "Não foi possível reabrir.");
              }
            }}
          >
            Reabrir revisão
          </Button>
        )}
      </div>

      {!anamnese ? (
        <Card className="flex items-start gap-3 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
            <ShieldCheckIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Aguardando preenchimento</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              O formulário já está disponível no portal do aluno. Assim que ele salvar, o rascunho
              aparece aqui.
            </p>
          </div>
        </Card>
      ) : (
        <DetalhesAnamnese
          anamnese={anamnese}
          observacao={observacao}
          setObservacao={setObservacao}
          onRevisar={revisar}
          erro={erro}
        />
      )}
    </section>
  );
}

function DetalhesAnamnese({
  anamnese,
  observacao,
  setObservacao,
  onRevisar,
  erro,
}: {
  anamnese: AnamneseDigital;
  observacao: string;
  setObservacao: (valor: string) => void;
  onRevisar: () => void;
  erro: string | null;
}) {
  const positivas = respostasPositivasParQ(anamnese.respostasParq);
  const pontos = pontosAtencaoAnamnese(anamnese);
  const perguntas = new Map(PERGUNTAS_PARQ.map((pergunta) => [pergunta.id, pergunta.texto]));

  return (
    <Card className="overflow-hidden">
      <div className="grid border-b border-line sm:grid-cols-[1fr_auto]">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <span
            className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              positivas.length > 0 || pontos.length > 0
                ? "bg-orange-400/15 text-orange-300"
                : "bg-accent/15 text-accent",
            )}
          >
            {positivas.length > 0 || pontos.length > 0 ? (
              <AlertTriangleIcon className="h-5 w-5" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="font-display font-semibold">
              {pontos.length > 0
                ? `${pontos.length} ponto${pontos.length === 1 ? "" : "s"} para contextualizar`
                : "Sem ponto de atenção declarado"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Atualizada em {dataHora(anamnese.atualizadoEm)}
              {anamnese.enviadoEm ? ` · enviada em ${dataHora(anamnese.enviadoEm)}` : ""}
            </p>
          </div>
        </div>
        <div className="border-t border-line px-4 py-3 sm:border-l sm:border-t-0 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Assinatura</p>
          <p className="mt-1 text-sm font-semibold">{anamnese.assinaturaNome || "Não assinada"}</p>
          {anamnese.assinadoEm && <p className="mt-0.5 text-[10px] text-muted">{dataHora(anamnese.assinadoEm)}</p>}
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-bg/25 p-4">
            <p className="flex items-center gap-2 font-display font-semibold">
              <PhoneIcon className="h-4 w-4 text-accent" /> Emergência
            </p>
            <p className="mt-3 text-sm font-semibold">
              {anamnese.contatoEmergencia.nome || "Não informado"}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {anamnese.contatoEmergencia.telefone || "Sem telefone"}
              {anamnese.contatoEmergencia.parentesco
                ? ` · ${anamnese.contatoEmergencia.parentesco}`
                : ""}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-bg/25 p-4">
            <p className="flex items-center gap-2 font-display font-semibold">
              <HeartPulseIcon className="h-4 w-4 text-accent" /> Saúde declarada
            </p>
            <div className="mt-3 space-y-3">
              <TextoSaude label="Condições e histórico" valor={anamnese.historicoCondicoes} />
              <TextoSaude label="Lesões" valor={anamnese.lesoes} />
              <TextoSaude label="Medicamentos" valor={anamnese.medicamentos} />
              <TextoSaude label="Restrições" valor={anamnese.restricoes} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-bg/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display font-semibold">Triagem PAR-Q</p>
              <span
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  positivas.length > 0
                    ? "bg-orange-400/10 text-orange-300"
                    : "bg-accent/10 text-accent",
                )}
              >
                {positivas.length} sim
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {anamnese.respostasParq.map((resposta) => (
                <div
                  key={resposta.perguntaId}
                  className={cx(
                    "rounded-lg border px-3 py-2.5",
                    resposta.resposta
                      ? "border-orange-400/25 bg-orange-400/6"
                      : "border-line bg-surface-2/30",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cx(
                        "mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        resposta.resposta
                          ? "bg-orange-400/15 text-orange-300"
                          : "bg-accent/10 text-accent",
                      )}
                    >
                      {resposta.resposta ? "Sim" : "Não"}
                    </span>
                    <div>
                      <p className="text-xs leading-relaxed text-muted">
                        {perguntas.get(resposta.perguntaId)}
                      </p>
                      {resposta.detalhe && (
                        <p className="mt-1 text-xs font-medium text-text">{resposta.detalhe}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {anamnese.respostasParq.length === 0 && (
                <p className="text-sm text-muted">O rascunho ainda não tem respostas.</p>
              )}
            </div>
          </div>

          {anamnese.status === "enviada" && (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
              <p className="font-display font-semibold">Revisão do personal</p>
              <p className="mt-1 text-xs text-muted">
                Registre o alinhamento realizado. A revisão não substitui avaliação de saúde.
              </p>
              <Textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                rows={3}
                className="mt-3"
                placeholder="Ex.: alinhamos adaptações e solicitei avaliação antes de progredir a carga."
              />
              {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
              <Button type="button" onClick={onRevisar} className="mt-3 w-full">
                <CheckIcon className="h-4 w-4" /> Marcar como revisada
              </Button>
            </div>
          )}

          {anamnese.status === "rascunho" && (
            <div className="rounded-xl border border-line bg-surface-2/30 p-4 text-sm text-muted">
              O aluno ainda está preenchendo. A revisão será liberada após o envio e a assinatura.
            </div>
          )}

          {anamnese.status === "revisada" && (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
              <p className="flex items-center gap-2 font-display font-semibold text-accent">
                <CheckIcon className="h-4 w-4" /> Revisão concluída
              </p>
              {anamnese.revisadoEm && (
                <p className="mt-1 text-xs text-muted">Em {dataHora(anamnese.revisadoEm)}</p>
              )}
              {anamnese.observacaoPersonal && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {anamnese.observacaoPersonal}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function TextoSaude({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{valor || "Ainda não informado"}</p>
    </div>
  );
}
