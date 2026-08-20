"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Exercicio, GrupoMuscular, HistoricoExercicio } from "@/lib/types";
import { GRUPOS_MUSCULARES } from "@/lib/types";
import { resumoDaExecucao } from "@/lib/historico-exercicios";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { PlayIcon } from "./icons";
import { fmtDiaMes } from "@/lib/data";

export type ExercicioValues = Omit<Exercicio, "id">;

export function ExercicioForm({
  initial,
  alunoId,
  onSubmit,
  onCancel,
}: {
  initial?: Exercicio;
  alunoId?: string;
  onSubmit: (v: ExercicioValues) => void;
  onCancel: () => void;
}) {
  const { biblioteca, getExercicioBiblioteca, ultimoHistoricoExercicio } = useStore();

  const [v, setV] = useState<ExercicioValues>({
    nome: initial?.nome ?? "",
    series: initial?.series ?? "3",
    repeticoes: initial?.repeticoes ?? "12",
    carga: initial?.carga ?? "",
    descanso: initial?.descanso ?? "60s",
    observacoes: initial?.observacoes ?? "",
    bibliotecaId: initial?.bibliotecaId,
  });

  // Opções da biblioteca agrupadas por grupo muscular (para o <optgroup>).
  const porGrupo = useMemo(() => {
    const m = new Map<GrupoMuscular, typeof biblioteca>();
    for (const b of [...biblioteca].sort((a, b) => a.nome.localeCompare(b.nome))) {
      const arr = m.get(b.grupo) ?? [];
      arr.push(b);
      m.set(b.grupo, arr);
    }
    return m;
  }, [biblioteca]);

  const set = <K extends keyof ExercicioValues>(k: K, val: ExercicioValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const aplicarUltimaExecucao = (
    base: ExercicioValues,
    ultima: HistoricoExercicio,
  ): ExercicioValues => {
    const resumo = resumoDaExecucao(ultima);
    return {
      ...base,
      series: resumo.series || base.series,
      repeticoes: resumo.repeticoes || base.repeticoes,
      carga: resumo.carga || base.carga,
      descanso: resumo.descanso || base.descanso,
    };
  };

  // Ao escolher da biblioteca, preenche nome e vincula a referência.
  const escolherDaBiblioteca = (id: string) => {
    const item = getExercicioBiblioteca(id);
    if (!item) return;
    const ultima = alunoId
      ? ultimoHistoricoExercicio(alunoId, { nome: item.nome, bibliotecaId: id })
      : undefined;
    setV((p) => {
      const base = { ...p, nome: item.nome, bibliotecaId: id };
      return !initial && ultima ? aplicarUltimaExecucao(base, ultima) : base;
    });
  };

  // Editar o nome manualmente desvincula se não bater mais com o item referenciado.
  const alterarNome = (nome: string) =>
    setV((p) => {
      const ref = p.bibliotecaId ? getExercicioBiblioteca(p.bibliotecaId) : undefined;
      const bibliotecaId = ref && ref.nome === nome.trim() ? p.bibliotecaId : undefined;
      return { ...p, nome, bibliotecaId };
    });

  const vinculado = v.bibliotecaId ? getExercicioBiblioteca(v.bibliotecaId) : undefined;
  const ultimaExecucao =
    alunoId && v.nome.trim().length > 0
      ? ultimoHistoricoExercicio(alunoId, { nome: v.nome, bibliotecaId: v.bibliotecaId })
      : undefined;
  const resumoUltimaExecucao = ultimaExecucao ? resumoDaExecucao(ultimaExecucao) : undefined;
  const canSubmit = v.nome.trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ ...v, nome: v.nome.trim() });
      }}
      className="space-y-4"
    >
      {biblioteca.length > 0 && (
        <Field label="Da biblioteca" hint="Escolha um exercício do catálogo ou digite abaixo">
          <Select
            value={v.bibliotecaId ?? ""}
            onChange={(e) => (e.target.value ? escolherDaBiblioteca(e.target.value) : undefined)}
          >
            <option value="">— Escolher da biblioteca —</option>
            {GRUPOS_MUSCULARES.filter((g) => porGrupo.has(g)).map((g) => (
              <optgroup key={g} label={g}>
                {porGrupo.get(g)!.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Exercício">
        <Input
          value={v.nome}
          onChange={(e) => alterarNome(e.target.value)}
          placeholder="Ex.: Supino reto com barra"
          autoFocus
        />
        {vinculado && (
          <span className="mt-1 flex items-center gap-2 text-xs text-muted">
            Vinculado à biblioteca · {vinculado.grupo}
            {vinculado.videoUrl && (
              <a
                href={vinculado.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                <PlayIcon className="h-3.5 w-3.5" />
                vídeo
              </a>
            )}
          </span>
        )}
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

      {ultimaExecucao && resumoUltimaExecucao && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Último treino
              </p>
              <p className="mt-1 text-sm font-semibold">
                {resumoUltimaExecucao.series}×{resumoUltimaExecucao.repeticoes}
                {resumoUltimaExecucao.carga ? ` · ${resumoUltimaExecucao.carga}` : ""} ·{" "}
                {fmtDiaMes(ultimaExecucao.data)}
              </p>
              {ultimaExecucao.divisaoNome && (
                <p className="text-xs text-muted">{ultimaExecucao.divisaoNome}</p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="self-start !px-3 !py-2 text-xs sm:self-center"
              onClick={() => setV((p) => aplicarUltimaExecucao(p, ultimaExecucao))}
            >
              Usar valores
            </Button>
          </div>
        </div>
      )}

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
