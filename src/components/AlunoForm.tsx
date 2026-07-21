"use client";

import { useState } from "react";
import type { Aluno, Objetivo } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "./ui";

export const OBJETIVOS: Objetivo[] = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Força",
  "Reabilitação",
  "Saúde geral",
];

// Sugestões de modalidade — o campo aceita qualquer texto, essas só aparecem no autocomplete.
export const MODALIDADES: string[] = [
  "Musculação",
  "Jiu-Jitsu",
  "Muay Thai",
  "Boxe",
  "MMA",
  "CrossFit",
  "Corrida",
  "Natação",
  "Ciclismo",
  "Funcional",
  "Futebol",
  "Vôlei",
];

export type AlunoFormValues = {
  nome: string;
  telefone: string;
  email: string;
  objetivo: Objetivo | "";
  modalidade: string;
  pesoMeta: string; // string no form; convertida pra número na página
  mensalidade: string; // R$ — string no form
  diaVencimento: string; // 1-28 — string no form
  observacoes: string;
  ativo: boolean;
};

export function AlunoForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Partial<Aluno>;
  onSubmit: (v: AlunoFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [v, setV] = useState<AlunoFormValues>({
    nome: initial?.nome ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    objetivo: initial?.objetivo ?? "",
    modalidade: initial?.modalidade ?? "",
    pesoMeta: initial?.pesoMeta != null ? String(initial.pesoMeta).replace(".", ",") : "",
    mensalidade: initial?.mensalidade != null ? String(initial.mensalidade).replace(".", ",") : "",
    diaVencimento: initial?.diaVencimento != null ? String(initial.diaVencimento) : "",
    observacoes: initial?.observacoes ?? "",
    ativo: initial?.ativo ?? true,
  });

  const set = <K extends keyof AlunoFormValues>(k: K, val: AlunoFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const canSubmit = v.nome.trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit)
          onSubmit({
            ...v,
            nome: v.nome.trim(),
            modalidade: v.modalidade.trim(),
            pesoMeta: v.pesoMeta.trim(),
          });
      }}
      className="space-y-4"
    >
      <Field label="Nome do aluno">
        <Input
          value={v.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="Ex.: Rafael Menezes"
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input
            value={v.telefone}
            onChange={(e) => set("telefone", e.target.value)}
            placeholder="(13) 99999-0000"
            inputMode="tel"
          />
        </Field>
        <Field label="E-mail">
          <Input
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="aluno@email.com"
            type="email"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Objetivo">
          <Select value={v.objetivo} onChange={(e) => set("objetivo", e.target.value as Objetivo)}>
            <option value="">Selecione…</option>
            {OBJETIVOS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Modalidade" hint="Escolha uma ou digite a específica">
          <Input
            value={v.modalidade}
            onChange={(e) => set("modalidade", e.target.value)}
            placeholder="Ex.: Jiu-Jitsu"
            list="modalidades-sugestoes"
          />
          <datalist id="modalidades-sugestoes">
            {MODALIDADES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Meta de peso (kg)" hint="Vira uma linha-alvo no gráfico de evolução">
        <Input
          value={v.pesoMeta}
          onChange={(e) => set("pesoMeta", e.target.value)}
          placeholder="Ex.: 78"
          inputMode="decimal"
          className="sm:max-w-[10rem]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mensalidade (R$)" hint="Usada para gerar as cobranças no Financeiro">
          <Input
            value={v.mensalidade}
            onChange={(e) => set("mensalidade", e.target.value)}
            placeholder="Ex.: 260"
            inputMode="decimal"
          />
        </Field>
        <Field label="Dia de vencimento" hint="Dia do mês (1 a 28)">
          <Input
            value={v.diaVencimento}
            onChange={(e) => set("diaVencimento", e.target.value)}
            placeholder="Ex.: 5"
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field label="Observações" hint="Lesões, restrições, disponibilidade…">
        <Textarea
          value={v.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={3}
          placeholder="Anotações sobre o aluno"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
        <input
          type="checkbox"
          checked={v.ativo}
          onChange={(e) => set("ativo", e.target.checked)}
          className="h-4 w-4 accent-[var(--color-volt)]"
        />
        <span className="text-sm font-semibold">Aluno ativo</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitLabel ?? (initial ? "Salvar alterações" : "Cadastrar aluno")}
        </Button>
      </div>
    </form>
  );
}
