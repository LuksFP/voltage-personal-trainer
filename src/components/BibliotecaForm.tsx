"use client";

import { useState } from "react";
import type { ExercicioBiblioteca, GrupoMuscular } from "@/lib/types";
import { GRUPOS_MUSCULARES } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "./ui";

export type BibliotecaValues = Omit<ExercicioBiblioteca, "id" | "criadoEm">;

// Sugestões de equipamento — campo aceita texto livre, isto só alimenta o autocomplete.
const EQUIPAMENTOS = [
  "Barra",
  "Halteres",
  "Máquina",
  "Polia",
  "Peso corporal",
  "Kettlebell",
  "Elástico",
  "Cabo",
  "Banco",
];

export function BibliotecaForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ExercicioBiblioteca;
  onSubmit: (v: BibliotecaValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<BibliotecaValues>({
    nome: initial?.nome ?? "",
    grupo: initial?.grupo ?? "Peito",
    equipamento: initial?.equipamento ?? "",
    instrucoes: initial?.instrucoes ?? "",
    videoUrl: initial?.videoUrl ?? "",
  });

  const set = <K extends keyof BibliotecaValues>(k: K, val: BibliotecaValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const canSubmit = v.nome.trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          nome: v.nome.trim(),
          grupo: v.grupo,
          equipamento: v.equipamento?.trim() || undefined,
          instrucoes: v.instrucoes?.trim() || undefined,
          videoUrl: v.videoUrl?.trim() || undefined,
        });
      }}
      className="space-y-4"
    >
      <Field label="Nome do exercício">
        <Input
          value={v.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="Ex.: Supino reto com barra"
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Grupo muscular">
          <Select value={v.grupo} onChange={(e) => set("grupo", e.target.value as GrupoMuscular)}>
            {GRUPOS_MUSCULARES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Equipamento">
          <Input
            value={v.equipamento}
            onChange={(e) => set("equipamento", e.target.value)}
            placeholder="Ex.: Barra"
            list="equipamentos-sugestoes"
          />
          <datalist id="equipamentos-sugestoes">
            {EQUIPAMENTOS.map((eq) => (
              <option key={eq} value={eq} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Vídeo (URL)" hint="Link de demonstração — YouTube ou vídeo/gif direto">
        <Input
          value={v.videoUrl}
          onChange={(e) => set("videoUrl", e.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>

      <Field label="Instruções de execução">
        <Textarea
          value={v.instrucoes}
          onChange={(e) => set("instrucoes", e.target.value)}
          rows={3}
          placeholder="Como executar o movimento com boa técnica"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {initial ? "Salvar" : "Adicionar à biblioteca"}
        </Button>
      </div>
    </form>
  );
}
