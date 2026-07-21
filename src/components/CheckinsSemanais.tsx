"use client";

import { useState } from "react";
import { fimDaSemana, pontosDeAtencaoCheckin } from "@/lib/checkins";
import { useStore } from "@/lib/store";
import type { CheckinSemanal, EscalaTreino } from "@/lib/types";
import { CheckIcon, PencilIcon } from "./icons";
import { Badge, Button, Card, Textarea, cx } from "./ui";

function dataCurta(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CheckinsSemanais({ alunoId }: { alunoId: string }) {
  const { checkinsDoAluno, revisarCheckinSemanal } = useStore();
  const checkins = checkinsDoAluno(alunoId).slice(0, 8);
  const pendentes = checkins.filter((checkin) => !checkin.revisadoEm).length;
  const [revisandoId, setRevisandoId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");

  const abrirRevisao = (checkin: CheckinSemanal) => {
    setRevisandoId(checkin.id);
    setComentario(checkin.comentarioPersonal ?? "");
  };

  const salvarRevisao = (id: string) => {
    revisarCheckinSemanal(id, comentario.trim() || undefined);
    setRevisandoId(null);
    setComentario("");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold">Check-ins semanais</h2>
            {pendentes > 0 && <Badge tone="volt">{pendentes} para revisar</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            Energia, sono, estresse, alimentação, dores e peso informados pelo aluno.
          </p>
        </div>
      </div>

      {checkins.length === 0 ? (
        <Card className="px-5 py-8 text-center">
          <p className="text-sm font-semibold">Nenhum check-in respondido</p>
          <p className="mt-1 text-sm text-muted">
            O formulário semanal já está disponível no portal do aluno.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {checkins.map((checkin, index) => {
            const alertas = pontosDeAtencaoCheckin(checkin);
            const anterior = checkins[index + 1];
            const variacaoPeso =
              checkin.pesoKg !== undefined && anterior?.pesoKg !== undefined
                ? Number((checkin.pesoKg - anterior.pesoKg).toFixed(1))
                : undefined;
            const revisando = revisandoId === checkin.id;
            return (
              <Card
                key={checkin.id}
                className={cx(
                  "overflow-hidden",
                  alertas.length > 0 && !checkin.revisadoEm && "border-danger/40",
                )}
              >
                <div className="flex flex-col gap-3 border-b border-line bg-surface-2/35 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display font-semibold">
                      {dataCurta(checkin.semanaInicio)} a {dataCurta(fimDaSemana(checkin.semanaInicio))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Respondido em {dataHora(checkin.respondidoEm)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        checkin.revisadoEm
                          ? "bg-accent/15 text-accent"
                          : "bg-orange-500/10 text-orange-400",
                      )}
                    >
                      {checkin.revisadoEm ? "Revisado" : "Aguardando revisão"}
                    </span>
                    {!revisando && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => abrirRevisao(checkin)}
                        className="!px-2.5 !py-1.5 text-xs"
                      >
                        {checkin.revisadoEm ? (
                          <PencilIcon className="h-3.5 w-3.5" />
                        ) : (
                          <CheckIcon className="h-3.5 w-3.5" />
                        )}
                        {checkin.revisadoEm ? "Editar" : "Revisar"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MetricaCard label="Energia" valor={checkin.energia} ruim={checkin.energia <= 2} />
                    <MetricaCard label="Sono" valor={checkin.sono} ruim={checkin.sono <= 2} />
                    <MetricaCard label="Estresse" valor={checkin.estresse} ruim={checkin.estresse >= 4} />
                    <MetricaCard label="Alimentação" valor={checkin.alimentacao} ruim={checkin.alimentacao <= 2} />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {checkin.horasSono !== undefined && (
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
                        {checkin.horasSono.toLocaleString("pt-BR")}h de sono
                      </span>
                    )}
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1",
                        checkin.dor === "Moderada" || checkin.dor === "Forte"
                          ? "bg-danger/10 text-danger"
                          : "bg-surface-2 text-muted",
                      )}
                    >
                      Dor: {checkin.dor}
                      {checkin.localDor ? ` · ${checkin.localDor}` : ""}
                    </span>
                    {checkin.pesoKg !== undefined && (
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
                        {checkin.pesoKg.toLocaleString("pt-BR")} kg
                        {variacaoPeso !== undefined && variacaoPeso !== 0
                          ? ` · ${variacaoPeso > 0 ? "+" : ""}${variacaoPeso.toLocaleString("pt-BR")} kg`
                          : ""}
                      </span>
                    )}
                  </div>

                  {alertas.length > 0 && (
                    <div className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-danger">
                        Pontos de atenção
                      </p>
                      <p className="mt-1 text-sm text-text">{alertas.join(" · ")}</p>
                    </div>
                  )}

                  {checkin.observacoes && (
                    <div className="rounded-xl bg-surface-2/45 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        Observação do aluno
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">{checkin.observacoes}</p>
                    </div>
                  )}

                  {checkin.comentarioPersonal && !revisando && (
                    <div className="border-l-2 border-accent pl-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
                        Nota da revisão
                      </p>
                      <p className="mt-1 text-sm text-muted">{checkin.comentarioPersonal}</p>
                    </div>
                  )}

                  {revisando && (
                    <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                          Nota da revisão
                        </span>
                        <Textarea
                          value={comentario}
                          onChange={(event) => setComentario(event.target.value)}
                          rows={2}
                          autoFocus
                          placeholder="Ajustes, orientação ou ponto a acompanhar (opcional)."
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setRevisandoId(null);
                            setComentario("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button type="button" onClick={() => salvarRevisao(checkin.id)}>
                          <CheckIcon className="h-4 w-4" />
                          Marcar como revisado
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetricaCard({
  label,
  valor,
  ruim,
}: {
  label: string;
  valor: EscalaTreino;
  ruim: boolean;
}) {
  return (
    <div className={cx("rounded-xl border p-3", ruim ? "border-danger/30 bg-danger/5" : "border-line bg-surface-2/25")}>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
        <span className={cx("font-display text-lg font-bold", ruim ? "text-danger" : "text-accent")}>
          {valor}<span className="text-xs text-muted">/5</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((nivel) => (
          <span
            key={nivel}
            className={cx(
              "h-1 rounded-full",
              nivel <= valor
                ? ruim
                  ? "bg-danger"
                  : "bg-volt"
                : "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
