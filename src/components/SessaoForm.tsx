"use client";

import { useState } from "react";
import { useStore, type EscopoRecorrenciaSessao } from "@/lib/store";
import {
  conflitosEntreCandidatosEExistentes,
  gerarDatasRecorrentes,
  somarDiasIso,
  type SessaoComparavel,
} from "@/lib/agenda";
import type { Sessao } from "@/lib/types";
import { resumoDoPacote } from "@/lib/pacotes";
import { Button, Field, Input, Select } from "./ui";

export type SessaoFormPayload = {
  alunoId: string;
  data: string;
  hora: string;
  duracaoMin?: number;
  foco?: string;
  pacoteId?: string;
  recorrenciaSemanas: number;
  escopoRecorrencia: EscopoRecorrenciaSessao;
  permitirConflito: boolean;
};

function diferencaDias(origem: string, destino: string): number {
  return Math.round(
    (Date.parse(`${destino}T00:00:00Z`) - Date.parse(`${origem}T00:00:00Z`)) /
      86_400_000,
  );
}

export function SessaoForm({
  initial,
  defaultData,
  defaultAlunoId,
  bloquearAluno,
  onSubmit,
  onCancel,
}: {
  initial?: Sessao;
  defaultData?: string;
  defaultAlunoId?: string;
  bloquearAluno?: boolean;
  onSubmit: (v: SessaoFormPayload) => void;
  onCancel: () => void;
}) {
  const { alunos, sessoes, pacotesSessoes } = useStore();
  const ativos = alunos.filter((a) => a.ativo).sort((a, b) => a.nome.localeCompare(b.nome));

  const [alunoId, setAlunoId] = useState(initial?.alunoId ?? defaultAlunoId ?? "");
  const nomeFixo = alunos.find((a) => a.id === alunoId)?.nome;
  const [data, setData] = useState(initial?.data ?? defaultData ?? new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(initial?.hora ?? "07:00");
  const [duracao, setDuracao] = useState(initial?.duracaoMin != null ? String(initial.duracaoMin) : "60");
  const [foco, setFoco] = useState(initial?.foco ?? "");
  const [pacoteId, setPacoteId] = useState(initial?.pacoteId ?? "");
  const [recorrente, setRecorrente] = useState(false);
  const [quantidadeSemanas, setQuantidadeSemanas] = useState("4");
  const [escopoRecorrencia, setEscopoRecorrencia] =
    useState<EscopoRecorrenciaSessao>("esta");
  const [permitirConflito, setPermitirConflito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dur = Number(duracao);
  const duracaoValida =
    duracao.trim() === "" || (Number.isFinite(dur) && dur >= 1 && dur <= 1440);
  const quantidade = Number(quantidadeSemanas);
  const quantidadeValida =
    !recorrente || (Number.isInteger(quantidade) && quantidade >= 2 && quantidade <= 52);

  let candidatas: SessaoComparavel[] = [];
  let idsIgnorados = new Set<string>();
  try {
    if (initial) {
      const relacionadas =
        escopoRecorrencia === "esta-e-proximas" && initial.recorrenciaId
          ? sessoes.filter(
              (sessao) =>
                sessao.recorrenciaId === initial.recorrenciaId &&
                sessao.data >= initial.data &&
                sessao.status === "agendada",
            )
          : [initial];
      idsIgnorados = new Set(relacionadas.map((sessao) => sessao.id));
      const deslocamento = diferencaDias(initial.data, data);
      candidatas = relacionadas.map((sessao) => ({
        id: sessao.id,
        data: sessao.id === initial.id ? data : somarDiasIso(sessao.data, deslocamento),
        hora,
        duracaoMin: duracao.trim() === "" ? undefined : dur,
        status: sessao.status,
      }));
    } else if (data && hora && quantidadeValida) {
      const datas = gerarDatasRecorrentes(data, recorrente ? quantidade : 1);
      candidatas = datas.map((dataSessao) => ({
        data: dataSessao,
        hora,
        duracaoMin: duracao.trim() === "" ? undefined : dur,
        status: "agendada",
      }));
    }
  } catch {
    candidatas = [];
  }

  const conflitos =
    duracaoValida && candidatas.length > 0
      ? conflitosEntreCandidatosEExistentes(
          candidatas,
          sessoes.filter((sessao) => !idsIgnorados.has(sessao.id)),
        )
      : [];
  const pacotesDoAluno = pacotesSessoes
    .filter(
      (pacote) =>
        pacote.alunoId === alunoId && (pacote.ativo || pacote.id === initial?.pacoteId),
    )
    .sort((a, b) => b.dataValidade.localeCompare(a.dataValidade));
  const pacoteSelecionado = pacotesDoAluno.find((pacote) => pacote.id === pacoteId);
  const sessoesSemAfetadas = sessoes.filter((sessao) => !idsIgnorados.has(sessao.id));
  const resumoPacote = pacoteSelecionado
    ? resumoDoPacote(pacoteSelecionado, sessoesSemAfetadas)
    : undefined;
  const reservasDoPacote = pacoteSelecionado
    ? sessoesSemAfetadas.filter(
        (sessao) =>
          sessao.pacoteId === pacoteSelecionado.id && sessao.status === "agendada",
      ).length
    : 0;
  const vagasNoPacote = resumoPacote
    ? Math.max(0, resumoPacote.restantes - reservasDoPacote)
    : 0;
  const datasDentroDoPacote =
    !pacoteSelecionado ||
    candidatas.every(
      (sessao) =>
        sessao.data >= pacoteSelecionado.dataInicio &&
        sessao.data <= pacoteSelecionado.dataValidade,
    );
  const pacoteValido =
    pacoteId === "" ||
    (pacoteSelecionado !== undefined &&
      pacoteSelecionado.ativo &&
      datasDentroDoPacote &&
      candidatas.length <= vagasNoPacote);
  const canSubmit =
    alunoId !== "" &&
    data !== "" &&
    hora !== "" &&
    duracaoValida &&
    quantidadeValida &&
    pacoteValido &&
    (conflitos.length === 0 || permitirConflito);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      onSubmit({
        alunoId,
        data,
        hora,
        duracaoMin: duracao.trim() === "" ? undefined : dur,
        foco: foco.trim() || undefined,
        pacoteId: pacoteId || undefined,
        recorrenciaSemanas: initial ? 1 : recorrente ? quantidade : 1,
        escopoRecorrencia,
        permitirConflito,
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a sessão.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Aluno">
        {bloquearAluno ? (
          <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm font-semibold">
            {nomeFixo ?? "—"}
          </div>
        ) : (
          <Select
            value={alunoId}
            onChange={(e) => {
              setAlunoId(e.target.value);
              setPacoteId("");
            }}
            autoFocus
          >
            <option value="">Selecione…</option>
            {ativos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
                {a.modalidade ? ` — ${a.modalidade}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
        <Field label="Hora">
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Field>
        <Field label="Duração (min)">
          <Input
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            inputMode="numeric"
            placeholder="60"
          />
        </Field>
      </div>

      <Field label="Foco da sessão" hint="Opcional — ex.: Treino A, Sparring, Corrida longa">
        <Input value={foco} onChange={(e) => setFoco(e.target.value)} placeholder="Ex.: Treino A — Peito/Tríceps" />
      </Field>

      {alunoId && (
        <Field
          label="Pacote de sessões"
          hint={
            pacoteSelecionado && resumoPacote
              ? `${resumoPacote.restantes} restantes · ${reservasDoPacote} já reservadas · validade ${pacoteSelecionado.dataValidade
                  .split("-")
                  .reverse()
                  .join("/")}`
              : "Opcional — o saldo só é consumido quando a sessão for realizada"
          }
        >
          <Select value={pacoteId} onChange={(event) => setPacoteId(event.target.value)}>
            <option value="">Sem vínculo com pacote</option>
            {pacotesDoAluno.map((pacote) => {
              const resumo = resumoDoPacote(pacote, sessoesSemAfetadas);
              const reservadas = sessoesSemAfetadas.filter(
                (sessao) => sessao.pacoteId === pacote.id && sessao.status === "agendada",
              ).length;
              const livres = Math.max(0, resumo.restantes - reservadas);
              return (
                <option key={pacote.id} value={pacote.id} disabled={!pacote.ativo}>
                  {pacote.nome} — {livres} livre{livres === 1 ? "" : "s"}
                  {!pacote.ativo ? " (encerrado)" : ""}
                </option>
              );
            })}
          </Select>
        </Field>
      )}

      {pacoteSelecionado && !datasDentroDoPacote && (
        <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger">
          Uma ou mais sessões ficam fora da vigência deste pacote, de {pacoteSelecionado.dataInicio
            .split("-")
            .reverse()
            .join("/")} a {pacoteSelecionado.dataValidade.split("-").reverse().join("/")}.
        </p>
      )}
      {pacoteSelecionado && datasDentroDoPacote && candidatas.length > vagasNoPacote && (
        <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs font-semibold text-danger">
          Este agendamento precisa de {candidatas.length}{" "}
          {candidatas.length === 1 ? "sessão" : "sessões"}, mas o pacote tem {vagasNoPacote} vaga
          {vagasNoPacote === 1 ? "" : "s"} livre{vagasNoPacote === 1 ? "" : "s"}.
        </p>
      )}

      {!initial && (
        <div className="rounded-xl border border-line bg-surface-2/30 p-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={recorrente}
              onChange={(event) => {
                setRecorrente(event.target.checked);
                setPermitirConflito(false);
              }}
              className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold">Repetir semanalmente</span>
              <span className="mt-0.5 block text-xs text-muted">
                Cria a mesma sessão no mesmo dia e horário das próximas semanas.
              </span>
            </span>
          </label>
          {recorrente && (
            <div className="mt-3 border-t border-line pt-3">
              <Field
                label="Quantidade de sessões"
                hint={
                  quantidadeValida && data
                    ? `Última ocorrência em ${gerarDatasRecorrentes(data, quantidade).at(-1)?.split("-").reverse().join("/")}`
                    : "Entre 2 e 52 sessões"
                }
              >
                <Input
                  type="number"
                  min={2}
                  max={52}
                  step={1}
                  value={quantidadeSemanas}
                  onChange={(event) => {
                    setQuantidadeSemanas(event.target.value);
                    setPermitirConflito(false);
                  }}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {initial?.recorrenciaId && initial.status === "agendada" && (
        <fieldset className="rounded-xl border border-line bg-surface-2/30 p-3.5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Aplicar alteração
          </legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["esta", "Somente esta sessão"],
                ["esta-e-proximas", "Esta e as próximas"],
              ] as const
            ).map(([valor, label]) => (
              <label
                key={valor}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  escopoRecorrencia === valor
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="escopo-recorrencia"
                  value={valor}
                  checked={escopoRecorrencia === valor}
                  onChange={() => {
                    setEscopoRecorrencia(valor);
                    setPermitirConflito(false);
                  }}
                  className="accent-[var(--color-accent)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {conflitos.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-3.5">
          <p className="text-sm font-bold text-orange-400">
            {conflitos.length} conflito{conflitos.length === 1 ? "" : "s"} de horário
          </p>
          <div className="mt-2 space-y-1 text-xs text-muted">
            {conflitos.slice(0, 4).map(({ candidata, existente }, index) => {
              const nome = alunos.find((aluno) => aluno.id === existente.alunoId)?.nome;
              return (
                <p key={`${candidata.data}-${candidata.hora}-${existente.id ?? index}`}>
                  {candidata.data.split("-").reverse().join("/")} às {candidata.hora}
                  {nome ? ` · já ocupado por ${nome}` : " · horário já ocupado"}
                </p>
              );
            })}
            {conflitos.length > 4 && <p>+ {conflitos.length - 4} outros conflitos</p>}
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-orange-500/20 pt-3 text-xs font-semibold text-text">
            <input
              type="checkbox"
              checked={permitirConflito}
              onChange={(event) => setPermitirConflito(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-400"
            />
            Confirmo que quero manter este encaixe mesmo com sobreposição.
          </label>
        </div>
      )}

      {!duracaoValida && (
        <p className="text-xs font-semibold text-danger">
          A duração precisa estar entre 1 e 1440 minutos.
        </p>
      )}
      {!quantidadeValida && (
        <p className="text-xs font-semibold text-danger">
          A recorrência precisa ter entre 2 e 52 sessões.
        </p>
      )}
      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {initial ? "Salvar sessão" : "Agendar sessão"}
        </Button>
      </div>
    </form>
  );
}
