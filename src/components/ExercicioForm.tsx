"use client";

import { useState } from "react";
import type { Exercicio } from "@/lib/types";
import { Button, Field, Input, Textarea } from "./ui";

export type ExercicioValues = Omit<Exercicio, "id">;

export function ExercicioForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Exercicio;
  onSubmit: (v: ExercicioValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ExercicioValues>({
    nome: initial?.nome ?? "",
    series: initial?.series ?? "3",
    repeticoes: initial?.repeticoes ?? "12",
    carga: initial?.carga ?? "",
    descanso: initial?.descanso ?? "60s",
    observacoes: initial?.observacoes ?? "",
  });

  const set = <K extends keyof ExercicioValues>(k: K, val: ExercicioValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const canSubmit = v.nome.trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ ...v, nome: v.nome.trim() });
      }}
      className="space-y-4"
    >
      <Field label="Exercício">
        <Input
          value={v.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="Ex.: Supino reto com barra"
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Séries">
          <Input value={v.series} onChange={(e) => set("series", e.target.value)} placeholder="4" />
        </Field>
        <Field label="Reps">
          <Input value={v.repeticoes} onChange={(e) => set("repeticoes", e.target.value)} placeholder="8-10" />
        </Field>
        <Field label="Carga">
          <Input value={v.carga} onChange={(e) => set("carga", e.target.value)} placeholder="60kg" />
        </Field>
        <Field label="Descanso">
          <Input value={v.descanso} onChange={(e) => set("descanso", e.target.value)} placeholder="90s" />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea
          value={v.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={2}
          placeholder="Cadência, técnica, amplitude…"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {initial ? "Salvar" : "Adicionar exercício"}
        </Button>
      </div>
    </form>
  );
}
