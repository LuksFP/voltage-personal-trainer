"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { VideoExecucao } from "@/lib/types";
import { carregarVideoLocal, removerVideoLocal } from "@/lib/video-storage";
import { Badge, Button, Card, Textarea } from "./ui";
import { CheckIcon, TrashIcon, VideoIcon } from "./icons";
import { fmtDataHora } from "@/lib/data";

function tamanho(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function VideosExecucao({ alunoId }: { alunoId: string }) {
  const { videosDoAluno } = useStore();
  const videos = videosDoAluno(alunoId);
  const pendentes = videos.filter((video) => video.status === "pendente");
  const revisados = videos.filter((video) => video.status === "revisado");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold">
            <VideoIcon className="h-5 w-5 text-accent" /> Vídeos de execução
          </h2>
          <p className="mt-1 text-sm text-muted">
            Revise o movimento, comente e devolva a orientação ao aluno.
          </p>
        </div>
        {pendentes.length > 0 && <Badge tone="off">{pendentes.length} para revisar</Badge>}
      </div>

      {pendentes.length === 0 ? (
        <Card className="px-5 py-6 text-center text-sm text-muted">
          Nenhum vídeo aguardando revisão.
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pendentes.map((video) => (
            <VideoRevisaoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {revisados.length > 0 && (
        <details className="rounded-xl border border-line bg-surface/40">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">
            Ver vídeos revisados ({revisados.length})
          </summary>
          <div className="grid gap-3 border-t border-line p-3 lg:grid-cols-2">
            {revisados.slice(0, 8).map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <VideoLocalPlayer videoId={video.id} />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{video.exercicioNomeSnapshot}</p>
                    <Badge tone="volt"><CheckIcon className="h-3.5 w-3.5" /> Revisado</Badge>
                  </div>
                  {video.comentarioPersonal && (
                    <p className="mt-2 text-xs leading-relaxed text-muted">{video.comentarioPersonal}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function VideoRevisaoCard({ video }: { video: VideoExecucao }) {
  const { revisarVideoExecucao, removeVideoExecucao } = useStore();
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const revisar = () => {
    try {
      setErro(null);
      revisarVideoExecucao(video.id, comentario);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível revisar o vídeo.");
    }
  };

  const excluir = async () => {
    if (!confirm(`Excluir o vídeo de ${video.exercicioNomeSnapshot}?`)) return;
    await removerVideoLocal(video.id);
    removeVideoExecucao(video.id);
  };

  return (
    <Card className="overflow-hidden border-sky-500/20">
      <VideoLocalPlayer videoId={video.id} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{video.exercicioNomeSnapshot}</p>
            <p className="mt-0.5 text-xs text-muted">
              {fmtDataHora(video.criadoEm)} · {tamanho(video.tamanhoBytes)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void excluir()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
            aria-label="Excluir vídeo"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        {video.observacoesAluno && (
          <p className="mt-3 rounded-lg bg-surface-2/50 px-3 py-2 text-xs leading-relaxed text-muted">
            “{video.observacoesAluno}”
          </p>
        )}
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Comentário para o aluno
          </span>
          <Textarea
            rows={3}
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
            placeholder="Ex.: mantenha o punho neutro e reduza um pouco a amplitude."
          />
        </label>
        {erro && <p className="mt-2 text-xs font-semibold text-danger">{erro}</p>}
        <Button className="mt-3 w-full" onClick={revisar} disabled={comentario.trim().length < 3}>
          <CheckIcon className="h-4 w-4" /> Marcar como revisado
        </Button>
      </div>
    </Card>
  );
}

function VideoLocalPlayer({ videoId }: { videoId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    let objetoUrl: string | null = null;
    void carregarVideoLocal(videoId)
      .then((blob) => {
        if (!ativo || !blob) return;
        objetoUrl = URL.createObjectURL(blob);
        setUrl(objetoUrl);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
      if (objetoUrl) URL.revokeObjectURL(objetoUrl);
    };
  }, [videoId]);

  if (carregando) {
    return <div className="grid aspect-video place-items-center bg-black text-xs text-muted">Carregando vídeo…</div>;
  }
  if (!url) {
    return (
      <div className="grid aspect-video place-items-center bg-surface-2 px-5 text-center text-xs text-muted">
        Arquivo indisponível neste aparelho. Os metadados podem ter vindo de um backup.
      </div>
    );
  }
  return <video src={url} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" />;
}
