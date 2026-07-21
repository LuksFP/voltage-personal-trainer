"use client";

import { useState } from "react";
import type { MotivoSubstituicao } from "@/lib/types";
import { Button, Field, Select, Textarea } from "@/components/ui";

const MOTIVOS: { value: MotivoSubstituicao; label: string; ajuda: string }[] = [
  {
    value: "equipamento-indisponivel",
    label: "Equipamento indisponível",
    ajuda: "Diga qual equipamento ou espaço não está disponível.",
  },
  {
    value: "dor",
    label: "Dor ou desconforto",
    ajuda: "Informe onde sente e em qual momento do movimento.",
  },
  {
    value: "dificuldade",
    label: "Dificuldade na execução",
    ajuda: "Explique o que impede executar com segurança.",
  },
  { value: "outro", label: "Outro motivo", ajuda: "Conte ao personal o que aconteceu." },
];

export function SolicitacaoSubstituicaoForm({
  exercicioNome,
  onSubmit,
  onCancel,
}: {
  exercicioNome: string;
  onSubmit: (motivo: MotivoSubstituicao, detalhes: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoSubstituicao>("equipamento-indisponivel");
  const [detalhes, setDetalhes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const atual = MOTIVOS.find((item) => item.value === motivo) ?? MOTIVOS[0];
  const canSubmit = detalhes.trim().length >= 3;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      setErro(null);
      onSubmit(motivo, detalhes.trim());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar o pedido.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Exercício atual</p>
        <p className="mt-1 font-semibold">{exercicioNome}</p>
      </div>

      <Field label="Por que precisa trocar?">
        <Select
          value={motivo}
          onChange={(event) => {
            const proximo = MOTIVOS.find((item) => item.value === event.target.value);
            if (proximo) setMotivo(proximo.value);
          }}
          autoFocus
        >
          {MOTIVOS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Detalhes" hint={atual.ajuda}>
        <Textarea
          rows={4}
          value={detalhes}
          onChange={(event) => setDetalhes(event.target.value)}
          placeholder={
            motivo === "dor"
              ? "Ex.: sinto dor na frente do ombro ao descer a barra."
              : motivo === "equipamento-indisponivel"
                ? "Ex.: a academia não tem banco inclinado."
                : "Explique o que aconteceu."
          }
        />
      </Field>

      {motivo === "dor" && (
        <p className="rounded-xl border border-orange-500/25 bg-orange-500/8 px-3 py-2 text-xs leading-relaxed text-orange-300">
          Se a dor for forte ou súbita, interrompa o exercício. O pedido não substitui avaliação profissional de saúde.
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
          Enviar ao personal
        </Button>
      </div>
    </form>
  );
}
