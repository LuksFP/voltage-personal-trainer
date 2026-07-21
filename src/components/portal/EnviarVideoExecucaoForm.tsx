"use client";

import { useEffect, useState } from "react";
import { Button, Field, Textarea } from "@/components/ui";

const LIMITE_BYTES = 25 * 1024 * 1024;

function tamanho(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

function duracao(segundos: number): string {
  const total = Math.round(segundos);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function EnviarVideoExecucaoForm({
  exercicioNome,
  onSubmit,
  onCancel,
}: {
  exercicioNome: string;
  onSubmit: (arquivo: File, duracaoSegundos: number | undefined, observacoes: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duracaoSegundos, setDuracaoSegundos] = useState<number | undefined>();
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const selecionar = (file: File | undefined) => {
    setErro(null);
    setDuracaoSegundos(undefined);
    if (!file) {
      setArquivo(null);
      setPreview(null);
      return;
    }
    if (!file.type.startsWith("video/")) {
      setErro("Selecione um arquivo de vídeo.");
      setArquivo(null);
      setPreview(null);
      return;
    }
    if (file.size > LIMITE_BYTES) {
      setErro("O vídeo precisa ter no máximo 25 MB neste aparelho.");
      setArquivo(null);
      setPreview(null);
      return;
    }
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
  };

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!arquivo || enviando) return;
    try {
      setErro(null);
      setEnviando(true);
      await onSubmit(arquivo, duracaoSegundos, observacoes.trim());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o vídeo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Exercício</p>
        <p className="mt-1 font-semibold">{exercicioNome}</p>
      </div>

      <Field label="Arquivo de vídeo" hint="MP4, WebM ou vídeo gravado pelo celular · até 25 MB">
        <input
          type="file"
          accept="video/*"
          capture="environment"
          onChange={(event) => selecionar(event.target.files?.[0])}
          className="block w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent"
        />
      </Field>

      {preview && arquivo && (
        <div className="overflow-hidden rounded-xl border border-line bg-black">
          <video
            src={preview}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const segundos = event.currentTarget.duration;
              if (Number.isFinite(segundos) && segundos > 0) setDuracaoSegundos(segundos);
            }}
            className="aspect-video w-full object-contain"
          />
          <div className="flex items-center justify-between gap-3 bg-surface px-3 py-2 text-xs text-muted">
            <span className="truncate">{arquivo.name}</span>
            <span className="shrink-0">
              {tamanho(arquivo.size)}{duracaoSegundos ? ` · ${duracao(duracaoSegundos)}` : ""}
            </span>
          </div>
        </div>
      )}

      <Field label="Observação para o personal" hint="Opcional — diga em qual série ou trecho quer ajuda">
        <Textarea
          rows={3}
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          placeholder="Ex.: essa foi a terceira série; quero revisar a posição do cotovelo."
        />
      </Field>

      <p className="rounded-xl bg-surface-2/50 px-3 py-2 text-xs leading-relaxed text-muted">
        O arquivo fica salvo somente neste aparelho. Comentários e status entram no backup do Voltage.
      </p>
      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={!arquivo || enviando}>
          {enviando ? "Salvando vídeo…" : "Enviar para revisão"}
        </Button>
      </div>
    </form>
  );
}
