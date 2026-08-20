"use client";

import { useState } from "react";
import { conflitosEntreCandidatosEExistentes } from "@/lib/agenda";
import {
  useStore,
  type CancelarSessaoOpcoes,
  type EscopoRecorrenciaSessao,
} from "@/lib/store";
import type { Sessao } from "@/lib/types";
import { Button, Field, Input, Textarea } from "./ui";
import { somarDias } from "@/lib/data";

export function CancelarSessaoForm({
  sessao,
  onSubmit,
  onCancel,
}: {
  sessao: Sessao;
  onSubmit: (opcoes: CancelarSessaoOpcoes) => void;
  onCancel: () => void;
}) {
  const { sessoes, alunos } = useStore();
  const [escopo, setEscopo] = useState<EscopoRecorrenciaSessao>("esta");
  const [motivo, setMotivo] = useState("");
  const [criarReposicao, setCriarReposicao] = useState(false);
  const [dataReposicao, setDataReposicao] = useState(() => somarDias(sessao.data, 1));
  const [horaReposicao, setHoraReposicao] = useState(sessao.hora);
  const [permitirConflito, setPermitirConflito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const afetadas =
    escopo === "esta-e-proximas" && sessao.recorrenciaId
      ? sessoes.filter(
          (item) =>
            item.recorrenciaId === sessao.recorrenciaId &&
            item.data >= sessao.data &&
            item.status === "agendada",
        )
      : [sessao];
  const idsAfetados = new Set(afetadas.map((item) => item.id));
  const candidata = {
    data: dataReposicao,
    hora: horaReposicao,
    duracaoMin: sessao.duracaoMin,
    status: "agendada" as const,
  };
  const conflitos = criarReposicao
    ? conflitosEntreCandidatosEExistentes(
        [candidata],
        sessoes.filter((item) => !idsAfetados.has(item.id)),
      )
    : [];
  const reposicaoValida =
    !criarReposicao ||
    (dataReposicao !== "" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(horaReposicao) &&
      (conflitos.length === 0 || permitirConflito));

  const enviar = () => {
    if (!reposicaoValida) return;
    try {
      onSubmit({
        escopo,
        motivo: motivo.trim() || undefined,
        reposicao: criarReposicao
          ? { data: dataReposicao, hora: horaReposicao }
          : undefined,
        permitirConflito,
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cancelar a sessão.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface-2/35 px-3.5 py-3">
        <p className="text-sm font-semibold">
          {sessao.data.split("-").reverse().join("/")} às {sessao.hora}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {alunos.find((aluno) => aluno.id === sessao.alunoId)?.nome ?? "Aluno"}
          {sessao.foco ? ` · ${sessao.foco}` : ""}
        </p>
      </div>

      {sessao.recorrenciaId && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            Cancelar
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["esta", "Somente esta sessão"],
                ["esta-e-proximas", "Esta e as próximas"],
              ] as const
            ).map(([valor, label]) => (
              <label
                key={valor}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                  escopo === valor
                    ? "border-danger/50 bg-danger/8 text-danger"
                    : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="escopo-cancelamento"
                  checked={escopo === valor}
                  onChange={() => {
                    setEscopo(valor);
                    if (valor === "esta-e-proximas") setCriarReposicao(false);
                    setPermitirConflito(false);
                  }}
                  className="accent-[var(--color-danger)]"
                />
                {label}
              </label>
            ))}
          </div>
          {escopo === "esta-e-proximas" && (
            <p className="mt-2 text-xs font-semibold text-danger">
              {afetadas.length} sessões agendadas serão canceladas.
            </p>
          )}
        </fieldset>
      )}

      <Field label="Motivo do cancelamento" hint="Opcional — fica registrado no histórico">
        <Textarea
          rows={2}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ex.: viagem, indisposição ou conflito de horário"
        />
      </Field>

      {escopo === "esta" && (
        <div className="rounded-xl border border-line p-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={criarReposicao}
              onChange={(event) => {
                setCriarReposicao(event.target.checked);
                setPermitirConflito(false);
              }}
              className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold">Já agendar uma reposição</span>
              <span className="mt-0.5 block text-xs text-muted">
                A nova sessão ficará ligada a este cancelamento.
              </span>
            </span>
          </label>

          {criarReposicao && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
              <Field label="Nova data">
                <Input
                  type="date"
                  value={dataReposicao}
                  onChange={(event) => {
                    setDataReposicao(event.target.value);
                    setPermitirConflito(false);
                  }}
                />
              </Field>
              <Field label="Novo horário">
                <Input
                  type="time"
                  value={horaReposicao}
                  onChange={(event) => {
                    setHoraReposicao(event.target.value);
                    setPermitirConflito(false);
                  }}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {conflitos.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-3.5">
          <p className="text-sm font-bold text-orange-400">A reposição conflita com a agenda</p>
          {conflitos.map(({ existente }) => (
            <p key={existente.id} className="mt-1 text-xs text-muted">
              {existente.hora} · {alunos.find((aluno) => aluno.id === existente.alunoId)?.nome ?? "Outra sessão"}
            </p>
          ))}
          <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-orange-500/20 pt-3 text-xs font-semibold">
            <input
              type="checkbox"
              checked={permitirConflito}
              onChange={(event) => setPermitirConflito(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-400"
            />
            Confirmo que quero manter o encaixe mesmo assim.
          </label>
        </div>
      )}

      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Voltar
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={enviar}
          disabled={!reposicaoValida}
          className="border border-danger/35"
        >
          {criarReposicao ? "Cancelar e criar reposição" : "Confirmar cancelamento"}
        </Button>
      </div>
    </div>
  );
}
