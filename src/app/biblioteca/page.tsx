"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { ExercicioBiblioteca, GrupoMuscular } from "@/lib/types";
import { GRUPOS_MUSCULARES } from "@/lib/types";
import { BibliotecaForm, type BibliotecaValues } from "@/components/BibliotecaForm";
import { Badge, Button, Card, cx, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { DumbbellIcon, PencilIcon, PlayIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";

type Filtro = "Todos" | GrupoMuscular;

export default function BibliotecaPage() {
  const { biblioteca, addExercicioBiblioteca, updateExercicioBiblioteca, removeExercicioBiblioteca } =
    useStore();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<ExercicioBiblioteca | null>(null);

  // Contagem por grupo para os chips de filtro.
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of biblioteca) m.set(b.grupo, (m.get(b.grupo) ?? 0) + 1);
    return m;
  }, [biblioteca]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return biblioteca
      .filter((b) => (filtro === "Todos" ? true : b.grupo === filtro))
      .filter((b) =>
        termo
          ? b.nome.toLowerCase().includes(termo) ||
            (b.equipamento ?? "").toLowerCase().includes(termo)
          : true,
      )
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [biblioteca, busca, filtro]);

  const abrirNovo = () => {
    setEditando(null);
    setModalOpen(true);
  };
  const abrirEdicao = (item: ExercicioBiblioteca) => {
    setEditando(item);
    setModalOpen(true);
  };
  const salvar = (v: BibliotecaValues) => {
    if (editando) updateExercicioBiblioteca(editando.id, v);
    else addExercicioBiblioteca(v);
    setModalOpen(false);
  };

  const chips: Filtro[] = ["Todos", ...GRUPOS_MUSCULARES.filter((g) => contagem.has(g))];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Biblioteca</p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
            {biblioteca.length} exercício{biblioteca.length === 1 ? "" : "s"} no catálogo
          </h1>
        </div>
        <Button onClick={abrirNovo}>
          <PlusIcon className="h-4 w-4" />
          Novo exercício
        </Button>
      </header>

      {/* Busca */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou equipamento…"
          className="pl-10"
        />
      </div>

      {/* Filtros por grupo */}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setFiltro(c)}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filtro === c
                ? "bg-volt text-ink"
                : "border border-line text-muted hover:border-accent/50 hover:text-text",
            )}
          >
            {c}
            {c !== "Todos" && (
              <span className="ml-1.5 opacity-70">{contagem.get(c)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid de exercícios */}
      {lista.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <DumbbellIcon className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">
            {biblioteca.length === 0
              ? "Sua biblioteca está vazia. Adicione o primeiro exercício."
              : "Nenhum exercício encontrado com esse filtro."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((item) => (
            <ExercicioCard
              key={item.id}
              item={item}
              onEdit={() => abrirEdicao(item)}
              onRemove={() =>
                confirm(`Remover "${item.nome}" da biblioteca?`) && removeExercicioBiblioteca(item.id)
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? "Editar exercício" : "Novo exercício"}
      >
        <BibliotecaForm
          initial={editando ?? undefined}
          onSubmit={salvar}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function ExercicioCard({
  item,
  onEdit,
  onRemove,
}: {
  item: ExercicioBiblioteca;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-semibold leading-tight">{item.nome}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="volt">{item.grupo}</Badge>
            {item.equipamento && <Badge>{item.equipamento}</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-accent"
            aria-label="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            aria-label="Remover"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {item.instrucoes && (
        <p className="line-clamp-3 text-sm text-muted">{item.instrucoes}</p>
      )}

      {item.videoUrl && (
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          <PlayIcon className="h-4 w-4" />
          Ver vídeo
        </a>
      )}
    </Card>
  );
}
