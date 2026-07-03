"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Aluno, Divisao, Exercicio, Treino } from "@/lib/types";
import { treinoParaTexto, linkWhatsapp } from "@/lib/compartilhar";
import { imprimirTreino } from "@/lib/imprimir";
import { Badge, Button, Card, Input } from "./ui";
import { Modal } from "./Modal";
import { ExercicioForm, type ExercicioValues } from "./ExercicioForm";
import {
  CopyIcon,
  DumbbellIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  TrashIcon,
  WhatsappIcon,
} from "./icons";

export function TreinoBuilder({ alunoId }: { alunoId: string }) {
  const { treinosDoAluno, addTreino, getAluno } = useStore();
  const treinos = treinosDoAluno(alunoId);
  const aluno = getAluno(alunoId);

  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");

  const criar = () => {
    const nome = nomeNovo.trim() || "Nova planilha";
    addTreino(alunoId, nome);
    setNomeNovo("");
    setCriando(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Planilhas de treino</h2>
        {!criando && (
          <Button variant="outline" onClick={() => setCriando(true)}>
            <PlusIcon className="h-4 w-4" />
            Nova planilha
          </Button>
        )}
      </div>

      {criando && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            placeholder="Nome da planilha (ex.: Treino ABC — Hipertrofia)"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && criar()}
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button onClick={criar}>Criar</Button>
          </div>
        </Card>
      )}

      {treinos.length === 0 && !criando ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <DumbbellIcon className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">Nenhuma planilha ainda. Crie a primeira ficha deste aluno.</p>
          <Button onClick={() => setCriando(true)}>
            <PlusIcon className="h-4 w-4" />
            Nova planilha
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {treinos.map((t) => (
            <TreinoCard key={t.id} treino={t} aluno={aluno} />
          ))}
        </div>
      )}
    </section>
  );
}

function TreinoCard({ treino, aluno }: { treino: Treino; aluno?: Aluno }) {
  const { updateTreino, removeTreino, addDivisao } = useStore();
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(treino.nome);
  const [addDiv, setAddDiv] = useState(false);
  const [nomeDiv, setNomeDiv] = useState("");
  const [copiado, setCopiado] = useState(false);

  const totalEx = treino.divisoes.reduce((s, d) => s + d.exercicios.length, 0);
  const semExercicios = totalEx === 0;

  const salvarNome = () => {
    updateTreino(treino.id, { nome: nome.trim() || treino.nome });
    setEditandoNome(false);
  };
  const criarDivisao = () => {
    const n = nomeDiv.trim();
    if (!n) return;
    addDivisao(treino.id, n);
    setNomeDiv("");
    setAddDiv(false);
  };

  const enviarWhatsapp = () => {
    const texto = treinoParaTexto(treino, aluno?.nome);
    window.open(linkWhatsapp(texto, aluno?.telefone), "_blank", "noopener,noreferrer");
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(treinoParaTexto(treino, aluno?.nome));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard indisponível — ignora silenciosamente */
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Cabeçalho da planilha */}
      <div className="flex items-start justify-between gap-3 border-b border-line bg-surface-2/40 p-4">
        <div className="min-w-0 flex-1">
          {editandoNome ? (
            <div className="flex gap-2">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && salvarNome()} />
              <Button onClick={salvarNome}>OK</Button>
            </div>
          ) : (
            <button
              onClick={() => setEditandoNome(true)}
              className="group flex items-center gap-2 text-left"
            >
              <h3 className="font-display text-lg font-semibold">{treino.nome}</h3>
              <PencilIcon className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="volt">{treino.divisoes.length} divisõe{treino.divisoes.length === 1 ? "" : "s"}</Badge>
            <Badge>{totalEx} exercício{totalEx === 1 ? "" : "s"}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            onClick={enviarWhatsapp}
            disabled={semExercicios}
            className="!px-3"
            title={semExercicios ? "Adicione exercícios para compartilhar" : "Enviar no WhatsApp"}
          >
            <WhatsappIcon className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <Button
            variant="ghost"
            onClick={copiar}
            disabled={semExercicios}
            className="!px-2.5"
            aria-label="Copiar treino"
            title="Copiar texto do treino"
          >
            <CopyIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => imprimirTreino(treino, aluno)}
            disabled={semExercicios}
            className="!px-2.5"
            aria-label="Imprimir ou salvar PDF"
            title="Imprimir / salvar PDF"
          >
            <PrinterIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="danger"
            onClick={() => confirm(`Excluir a planilha "${treino.nome}"?`) && removeTreino(treino.id)}
            className="!px-2.5"
            aria-label="Excluir planilha"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {copiado && (
        <p className="border-b border-line bg-accent/10 px-4 py-1.5 text-center text-xs font-semibold text-accent">
          Treino copiado para a área de transferência ✓
        </p>
      )}

      {/* Divisões */}
      <div className="divide-y divide-[var(--color-line)]">
        {treino.divisoes.map((d) => (
          <DivisaoBlock key={d.id} treinoId={treino.id} divisao={d} />
        ))}
      </div>

      {/* Adicionar divisão */}
      <div className="p-4">
        {addDiv ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={nomeDiv}
              onChange={(e) => setNomeDiv(e.target.value)}
              placeholder="Nome da divisão (ex.: A — Peito e Tríceps)"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && criarDivisao()}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setAddDiv(false)}>
                Cancelar
              </Button>
              <Button onClick={criarDivisao}>Adicionar</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddDiv(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar divisão
          </button>
        )}
      </div>
    </Card>
  );
}

function DivisaoBlock({ treinoId, divisao }: { treinoId: string; divisao: Divisao }) {
  const { removeDivisao, addExercicio, updateExercicio, removeExercicio } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Exercicio | null>(null);

  const abrirNovo = () => {
    setEditando(null);
    setModalOpen(true);
  };
  const abrirEdicao = (ex: Exercicio) => {
    setEditando(ex);
    setModalOpen(true);
  };
  const salvar = (v: ExercicioValues) => {
    if (editando) updateExercicio(treinoId, divisao.id, { ...editando, ...v });
    else addExercicio(treinoId, divisao.id, v);
    setModalOpen(false);
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-semibold">
          <span className="h-4 w-1 rounded-full bg-volt" />
          {divisao.nome}
        </h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={abrirNovo} className="!px-2.5 !py-1.5 text-xs">
            <PlusIcon className="h-3.5 w-3.5" />
            Exercício
          </Button>
          <Button
            variant="danger"
            onClick={() => confirm(`Remover a divisão "${divisao.nome}"?`) && removeDivisao(treinoId, divisao.id)}
            className="!px-2 !py-1.5"
            aria-label="Remover divisão"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {divisao.exercicios.length === 0 ? (
        <p className="rounded-lg bg-surface-2/40 px-3 py-3 text-sm text-muted">Sem exercícios nesta divisão.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          {/* Cabeçalho da tabela (desktop) */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 bg-surface-2/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>Exercício</span>
            <span className="w-12 text-center">Séries</span>
            <span className="w-14 text-center">Reps</span>
            <span className="w-16 text-center">Carga</span>
            <span className="w-16 text-center">Desc.</span>
            <span className="w-16" />
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {divisao.exercicios.map((ex) => (
              <ExercicioRow key={ex.id} ex={ex} onEdit={() => abrirEdicao(ex)} onRemove={() => removeExercicio(treinoId, divisao.id, ex.id)} />
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? "Editar exercício" : "Adicionar exercício"}
      >
        <ExercicioForm initial={editando ?? undefined} onSubmit={salvar} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}

function ExercicioRow({ ex, onEdit, onRemove }: { ex: Exercicio; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-3 py-2.5 text-sm transition-colors hover:bg-surface-2/40 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{ex.nome}</p>
        {ex.observacoes && <p className="truncate text-xs text-muted">{ex.observacoes}</p>}
        {/* resumo mobile */}
        <p className="text-xs text-muted sm:hidden">
          {ex.series}x{ex.repeticoes} · {ex.carga || "—"} · {ex.descanso}
        </p>
      </div>
      <span className="hidden w-12 text-center text-muted sm:block">{ex.series}</span>
      <span className="hidden w-14 text-center text-muted sm:block">{ex.repeticoes}</span>
      <span className="hidden w-16 text-center text-muted sm:block">{ex.carga || "—"}</span>
      <span className="hidden w-16 text-center text-muted sm:block">{ex.descanso}</span>
      <div className="flex justify-end gap-1 sm:w-16">
        <button onClick={onEdit} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-accent" aria-label="Editar">
          <PencilIcon className="h-4 w-4" />
        </button>
        <button onClick={onRemove} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-danger" aria-label="Remover">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
