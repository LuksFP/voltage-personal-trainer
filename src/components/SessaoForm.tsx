"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Sessao } from "@/lib/types";
import { Button, Field, Input, Select } from "./ui";

export type SessaoFormPayload = {
  alunoId: string;
  data: string;
  hora: string;
  duracaoMin?: number;
  foco?: string;
};

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
  const { alunos } = useStore();
  const ativos = alunos.filter((a) => a.ativo).sort((a, b) => a.nome.localeCompare(b.nome));

  const [alunoId, setAlunoId] = useState(initial?.alunoId ?? defaultAlunoId ?? "");
  const nomeFixo = alunos.find((a) => a.id === alunoId)?.nome;
  const [data, setData] = useState(initial?.data ?? defaultData ?? new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(initial?.hora ?? "07:00");
  const [duracao, setDuracao] = useState(initial?.duracaoMin != null ? String(initial.duracaoMin) : "60");
  const [foco, setFoco] = useState(initial?.foco ?? "");

  const canSubmit = alunoId !== "" && data !== "" && hora !== "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const dur = Number(duracao);
    onSubmit({
      alunoId,
      data,
      hora,
      duracaoMin: duracao.trim() === "" || Number.isNaN(dur) ? undefined : dur,
      foco: foco.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Aluno">
        {bloquearAluno ? (
          <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm font-semibold">
            {nomeFixo ?? "—"}
          </div>
        ) : (
          <Select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} autoFocus>
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
