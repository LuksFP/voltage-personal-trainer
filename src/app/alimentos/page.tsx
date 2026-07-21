"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { AlimentoBanco, CategoriaAlimento } from "@/lib/types";
import {
  buscarAlimentos,
  CATEGORIAS_ALIMENTO,
  rotuloCategoria,
  sufixoUnidade,
  type CriarAlimentoBancoInput,
} from "@/lib/alimentos";
import { AlimentoBancoForm } from "@/components/AlimentoBancoForm";
import { Badge, Button, Card, cx, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { LeafIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";

type Filtro = "Todos" | CategoriaAlimento;

export default function AlimentosPage() {
  const { bancoAlimentos, addAlimentoBanco, updateAlimentoBanco, removeAlimentoBanco } = useStore();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<AlimentoBanco | null>(null);

  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of bancoAlimentos) m.set(a.categoria, (m.get(a.categoria) ?? 0) + 1);
    return m;
  }, [bancoAlimentos]);

  const lista = useMemo(() => {
    return buscarAlimentos(bancoAlimentos, busca).filter((a) =>
      filtro === "Todos" ? true : a.categoria === filtro,
    );
  }, [bancoAlimentos, busca, filtro]);

  const abrirNovo = () => {
    setEditando(null);
    setModalOpen(true);
  };
  const abrirEdicao = (item: AlimentoBanco) => {
    setEditando(item);
    setModalOpen(true);
  };
  const salvar = (v: CriarAlimentoBancoInput) => {
    if (editando) updateAlimentoBanco(editando.id, v);
    else addAlimentoBanco(v);
    setModalOpen(false);
  };

  const chips: Filtro[] = [
    "Todos",
    ...CATEGORIAS_ALIMENTO.map((c) => c.value).filter((c) => contagem.has(c)),
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Alimentos</p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
            {bancoAlimentos.length} alimento{bancoAlimentos.length === 1 ? "" : "s"} no banco
          </h1>
          <p className="mt-1 text-sm text-muted">
            Macros por porção usados no cálculo automático dos planos alimentares.
          </p>
        </div>
        <Button onClick={abrirNovo} className="shrink-0">
          <PlusIcon className="h-4 w-4" />
          Novo alimento
        </Button>
      </header>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar alimento…"
          className="pl-10"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setFiltro(c)}
            className={cx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filtro === c
                ? "bg-volt text-ink"
                : "border border-line text-muted hover:border-accent/50 hover:text-text",
            )}
          >
            {c === "Todos" ? "Todos" : rotuloCategoria(c)}
            {c !== "Todos" && <span className="ml-1.5 opacity-70">{contagem.get(c)}</span>}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <LeafIcon className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">
            {bancoAlimentos.length === 0
              ? "O banco de alimentos está vazio. Adicione o primeiro."
              : "Nenhum alimento encontrado com esse filtro."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((item) => (
            <AlimentoCard
              key={item.id}
              item={item}
              onEdit={() => abrirEdicao(item)}
              onRemove={() =>
                confirm(`Remover "${item.nome}" do banco?`) && removeAlimentoBanco(item.id)
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? "Editar alimento" : "Novo alimento"}
      >
        <AlimentoBancoForm
          alimento={editando ?? undefined}
          onSubmit={salvar}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function AlimentoCard({
  item,
  onEdit,
  onRemove,
}: {
  item: AlimentoBanco;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const sufixo = sufixoUnidade(item.unidade);
  const macros: { rotulo: string; valor: number; cor: string }[] = [
    { rotulo: "P", valor: item.proteinas, cor: "text-volt" },
    { rotulo: "C", valor: item.carboidratos, cor: "text-sky-400" },
    { rotulo: "G", valor: item.gorduras, cor: "text-orange-400" },
  ];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-semibold leading-tight">{item.nome}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="volt">{rotuloCategoria(item.categoria)}</Badge>
            {item.marca && <Badge>{item.marca}</Badge>}
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

      <div className="mt-auto rounded-xl border border-line bg-surface-2/30 px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg font-bold">{item.kcal}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
            kcal / {item.base} {sufixo}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {macros.map((m) => (
            <span key={m.rotulo} className="text-muted">
              <span className={cx("font-bold", m.cor)}>{m.rotulo}</span>{" "}
              <span className="font-semibold text-text">{m.valor} g</span>
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
