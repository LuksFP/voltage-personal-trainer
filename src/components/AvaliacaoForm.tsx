"use client";

import { useRef, useState } from "react";
import type { Avaliacao } from "@/lib/types";
import { arquivoParaDataUrl } from "@/lib/imagem";
import { Button, Field, Input, Textarea } from "./ui";
import { PlusIcon, TrashIcon } from "./icons";

// Medidas numéricas do formulário (chave = campo em Avaliacao).
const MEDIDAS = [
  { key: "peso", label: "Peso", unit: "kg" },
  { key: "percentualGordura", label: "% Gordura", unit: "%" },
  { key: "cintura", label: "Cintura", unit: "cm" },
  { key: "quadril", label: "Quadril", unit: "cm" },
  { key: "peito", label: "Peito", unit: "cm" },
  { key: "braco", label: "Braço", unit: "cm" },
  { key: "coxa", label: "Coxa", unit: "cm" },
] as const;

type MedidaKey = (typeof MEDIDAS)[number]["key"];

export type AvaliacaoFormPayload = Omit<Avaliacao, "id" | "alunoId" | "criadoEm">;

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(s: string): number | undefined {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? undefined : n;
}

export function AvaliacaoForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Avaliacao;
  onSubmit: (v: AvaliacaoFormPayload) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState(initial?.data?.slice(0, 10) ?? hoje());
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [fotos, setFotos] = useState<string[]>(initial?.fotos ?? []);
  const [processando, setProcessando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [medidas, setMedidas] = useState<Record<MedidaKey, string>>(() => {
    const init = {} as Record<MedidaKey, string>;
    for (const m of MEDIDAS) {
      const val = initial?.[m.key];
      init[m.key] = val != null ? String(val).replace(".", ",") : "";
    }
    return init;
  });

  const setMedida = (k: MedidaKey, val: string) => setMedidas((p) => ({ ...p, [k]: val }));

  const adicionarFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessando(true);
    try {
      const novas = await Promise.all(
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .map((f) => arquivoParaDataUrl(f)),
      );
      setFotos((prev) => [...prev, ...novas]);
    } catch {
      /* falha ao processar imagem — ignora */
    } finally {
      setProcessando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Precisa de data e ao menos uma medida OU uma foto.
  const canSubmit =
    data !== "" && (MEDIDAS.some((m) => medidas[m.key].trim() !== "") || fotos.length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: AvaliacaoFormPayload = { data };
    const medidasOut = payload as Record<MedidaKey, number>;
    for (const m of MEDIDAS) {
      const n = toNum(medidas[m.key]);
      if (n !== undefined) medidasOut[m.key] = n;
    }
    if (fotos.length > 0) payload.fotos = fotos;
    const obs = observacoes.trim();
    if (obs) payload.observacoes = obs;
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Data da avaliação">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} autoFocus />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MEDIDAS.map((m) => (
          <Field key={m.key} label={`${m.label} (${m.unit})`}>
            <Input
              value={medidas[m.key]}
              onChange={(e) => setMedida(m.key, e.target.value)}
              placeholder="—"
              inputMode="decimal"
            />
          </Field>
        ))}
      </div>

      <Field label="Fotos de progresso" hint="Frente, lado, costas… ficam salvas junto da avaliação">
        <div className="flex flex-wrap gap-2">
          {fotos.map((src, i) => (
            <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-ink/70 text-text opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remover foto"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={processando}
            className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-line text-muted transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
            aria-label="Adicionar fotos"
          >
            {processando ? (
              <span className="text-xs">…</span>
            ) : (
              <PlusIcon className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => adicionarFotos(e.target.files)}
          />
        </div>
      </Field>

      <Field label="Observações" hint="Dobras, disposição, contexto do dia…">
        <Textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Anotações desta avaliação"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {initial ? "Salvar avaliação" : "Registrar avaliação"}
        </Button>
      </div>
    </form>
  );
}
