"use client";

import { useState } from "react";
import { useStore, type BlocoTreinoInput } from "@/lib/store";
import { resumoDaExecucao } from "@/lib/historico-exercicios";
import type { BlocoTreino, Divisao, Exercicio } from "@/lib/types";
import { DIAS_CURTOS, DIAS_LONGOS } from "@/lib/dias-treino";
import { ExercicioForm, type ExercicioValues } from "./ExercicioForm";
import { Modal } from "./Modal";
import { PencilIcon, PlusIcon, TrashIcon } from "./icons";
import { Button, Input, cx } from "./ui";
import { fmtDiaMes } from "@/lib/data";

export interface EstruturaTreinoEditorProps {
  alunoId?: string;
  divisoes: Divisao[];
  onAddDivisao: (nome: string) => void;
  onUpdateDivisao: (divisaoId: string, nome: string) => void;
  /** Define os dias da semana desta divisão. Ausente = agenda semanal oculta (ex.: modelos). */
  onSetDias?: (divisaoId: string, dias: number[]) => void;
  onRemoveDivisao: (divisaoId: string) => void;
  onAddExercicio: (divisaoId: string, exercicio: ExercicioValues) => void;
  onUpdateExercicio: (divisaoId: string, exercicio: Exercicio) => void;
  onRemoveExercicio: (divisaoId: string, exercicioId: string) => void;
  onAddBloco: (divisaoId: string, bloco: BlocoTreinoInput) => void;
  onUpdateBloco: (divisaoId: string, bloco: BlocoTreino) => void;
  onRemoveBloco: (divisaoId: string, blocoId: string) => void;
}

export function EstruturaTreinoEditor({
  alunoId,
  divisoes,
  onAddDivisao,
  onUpdateDivisao,
  onSetDias,
  onRemoveDivisao,
  onAddExercicio,
  onUpdateExercicio,
  onRemoveExercicio,
  onAddBloco,
  onUpdateBloco,
  onRemoveBloco,
}: EstruturaTreinoEditorProps) {
  const [adicionandoDivisao, setAdicionandoDivisao] = useState(false);
  const [nomeDivisao, setNomeDivisao] = useState("");

  const adicionarDivisao = () => {
    const nome = nomeDivisao.trim();
    if (!nome) return;
    onAddDivisao(nome);
    setNomeDivisao("");
    setAdicionandoDivisao(false);
  };

  return (
    <div>
      <div className="divide-y divide-[var(--color-line)]">
        {divisoes.map((divisao) => (
          <DivisaoEditor
            key={divisao.id}
            alunoId={alunoId}
            divisao={divisao}
            onUpdateNome={(nome) => onUpdateDivisao(divisao.id, nome)}
            onSetDias={onSetDias ? (dias) => onSetDias(divisao.id, dias) : undefined}
            onRemove={() => onRemoveDivisao(divisao.id)}
            onAddExercicio={(exercicio) => onAddExercicio(divisao.id, exercicio)}
            onUpdateExercicio={(exercicio) => onUpdateExercicio(divisao.id, exercicio)}
            onRemoveExercicio={(exercicioId) => onRemoveExercicio(divisao.id, exercicioId)}
            onAddBloco={(bloco) => onAddBloco(divisao.id, bloco)}
            onUpdateBloco={(bloco) => onUpdateBloco(divisao.id, bloco)}
            onRemoveBloco={(blocoId) => onRemoveBloco(divisao.id, blocoId)}
          />
        ))}
      </div>

      {divisoes.length === 0 && (
        <div className="mx-4 mt-4 rounded-xl border border-dashed border-line bg-surface-2/30 px-4 py-6 text-center">
          <p className="text-sm font-semibold">Estrutura vazia</p>
          <p className="mt-1 text-xs text-muted">
            Adicione uma divisão para começar a montar este treino.
          </p>
        </div>
      )}

      <div className="p-4">
        {adicionandoDivisao ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={nomeDivisao}
              onChange={(event) => setNomeDivisao(event.target.value)}
              placeholder="Nome da divisão (ex.: A — Peito e Tríceps)"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") adicionarDivisao();
                if (event.key === "Escape") {
                  setNomeDivisao("");
                  setAdicionandoDivisao(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setNomeDivisao("");
                  setAdicionandoDivisao(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={adicionarDivisao} disabled={!nomeDivisao.trim()}>
                Adicionar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdicionandoDivisao(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar divisão
          </button>
        )}
      </div>
    </div>
  );
}

function DivisaoEditor({
  alunoId,
  divisao,
  onUpdateNome,
  onSetDias,
  onRemove,
  onAddExercicio,
  onUpdateExercicio,
  onRemoveExercicio,
  onAddBloco,
  onUpdateBloco,
  onRemoveBloco,
}: {
  alunoId?: string;
  divisao: Divisao;
  onUpdateNome: (nome: string) => void;
  onSetDias?: (dias: number[]) => void;
  onRemove: () => void;
  onAddExercicio: (exercicio: ExercicioValues) => void;
  onUpdateExercicio: (exercicio: Exercicio) => void;
  onRemoveExercicio: (exercicioId: string) => void;
  onAddBloco: (bloco: BlocoTreinoInput) => void;
  onUpdateBloco: (bloco: BlocoTreino) => void;
  onRemoveBloco: (blocoId: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoExercicio, setEditandoExercicio] = useState<Exercicio | null>(null);
  const [blocoModalOpen, setBlocoModalOpen] = useState(false);
  const [editandoBloco, setEditandoBloco] = useState<BlocoTreino | null>(null);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(divisao.nome);

  const abrirNovoExercicio = () => {
    setEditandoExercicio(null);
    setModalOpen(true);
  };

  const abrirEdicaoExercicio = (exercicio: Exercicio) => {
    setEditandoExercicio(exercicio);
    setModalOpen(true);
  };

  const abrirNovoBloco = () => {
    setEditandoBloco(null);
    setBlocoModalOpen(true);
  };

  const abrirEdicaoBloco = (bloco: BlocoTreino) => {
    setEditandoBloco(bloco);
    setBlocoModalOpen(true);
  };

  const salvarExercicio = (values: ExercicioValues) => {
    if (editandoExercicio) {
      onUpdateExercicio({ ...editandoExercicio, ...values });
    } else {
      onAddExercicio(values);
    }
    setModalOpen(false);
    setEditandoExercicio(null);
  };

  const iniciarEdicaoNome = () => {
    setNome(divisao.nome);
    setEditandoNome(true);
  };

  const cancelarEdicaoNome = () => {
    setNome(divisao.nome);
    setEditandoNome(false);
  };

  const salvarNome = () => {
    const valor = nome.trim();
    if (valor && valor !== divisao.nome) onUpdateNome(valor);
    if (!valor) setNome(divisao.nome);
    setEditandoNome(false);
  };

  const exerciciosPorId = new Map(
    divisao.exercicios.map((exercicio) => [exercicio.id, exercicio]),
  );
  const blocosExibiveis = (divisao.blocos ?? []).flatMap((bloco) => {
    const exercicios = bloco.exercicioIds.flatMap((id) => {
      const exercicio = exerciciosPorId.get(id);
      return exercicio ? [exercicio] : [];
    });
    const minimo = bloco.tipo === "individual" ? 1 : 2;
    return exercicios.length >= minimo ? [{ bloco, exercicios }] : [];
  });
  const idsAgrupados = new Set(
    blocosExibiveis.flatMap(({ exercicios }) => exercicios.map((exercicio) => exercicio.id)),
  );
  const exerciciosAvulsos = divisao.exercicios.filter(
    (exercicio) => !idsAgrupados.has(exercicio.id),
  );

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editandoNome ? (
            <div className="flex max-w-lg gap-2">
              <Input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                autoFocus
                aria-label="Nome da divisão"
                onKeyDown={(event) => {
                  if (event.key === "Enter") salvarNome();
                  if (event.key === "Escape") cancelarEdicaoNome();
                }}
              />
              <Button type="button" onClick={salvarNome} className="!px-3">
                OK
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={iniciarEdicaoNome}
              className="group flex max-w-full items-center gap-2 text-left"
              title="Editar nome da divisão"
            >
              <span className="h-4 w-1 shrink-0 rounded-full bg-volt" />
              <span className="truncate font-semibold">{divisao.nome}</span>
              <PencilIcon className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={abrirNovoExercicio}
            className="!px-2.5 !py-1.5 text-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Exercício
          </Button>
          {divisao.exercicios.length >= 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={abrirNovoBloco}
              className="!px-2.5 !py-1.5 text-xs"
            >
              Agrupar
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            onClick={() =>
              confirm(`Remover a divisão "${divisao.nome}" e seus exercícios?`) && onRemove()
            }
            className="!px-2 !py-1.5"
            aria-label={`Remover divisão ${divisao.nome}`}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {onSetDias && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Dias:</span>
          <div className="flex gap-1">
            {DIAS_CURTOS.map((rotulo, dia) => {
              const ativo = divisao.diasSemana?.includes(dia) ?? false;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => {
                    const atuais = divisao.diasSemana ?? [];
                    onSetDias(
                      ativo ? atuais.filter((d) => d !== dia) : [...atuais, dia],
                    );
                  }}
                  aria-pressed={ativo}
                  aria-label={DIAS_LONGOS[dia]}
                  title={DIAS_LONGOS[dia]}
                  className={cx(
                    "h-8 w-8 rounded-lg text-xs font-bold transition-colors",
                    ativo
                      ? "bg-volt text-ink"
                      : "bg-surface-2 text-muted hover:bg-surface-2/70 hover:text-text",
                  )}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
          {(divisao.diasSemana?.length ?? 0) === 0 && (
            <span className="text-xs text-muted">rodízio automático</span>
          )}
        </div>
      )}

      {divisao.exercicios.length === 0 ? (
        <p className="rounded-lg bg-surface-2/40 px-3 py-3 text-sm text-muted">
          Sem exercícios nesta divisão.
        </p>
      ) : (
        <div className="space-y-3">
          {blocosExibiveis.map(({ bloco, exercicios }, index) => (
            <div key={bloco.id} className="overflow-hidden rounded-xl border border-accent/30">
              <div className="flex flex-col gap-2 bg-accent/8 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-accent/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                      {nomeDoBloco(bloco, index)}
                    </span>
                    <span className="text-xs text-muted">{resumoDoBloco(bloco)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEdicaoBloco(bloco)}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-accent"
                    aria-label={`Editar ${nomeDoBloco(bloco, index)}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirm("Desagrupar estes exercícios? Os exercícios serão mantidos na divisão.") &&
                      onRemoveBloco(bloco.id)
                    }
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    Desagrupar
                  </button>
                </div>
              </div>
              <ExerciciosTabela
                alunoId={alunoId}
                exercicios={exercicios}
                onEdit={abrirEdicaoExercicio}
                onRemove={onRemoveExercicio}
              />
            </div>
          ))}

          {exerciciosAvulsos.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line">
              {blocosExibiveis.length > 0 && (
                <div className="border-b border-line bg-surface-2/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Exercícios avulsos
                </div>
              )}
              <ExerciciosTabela
                alunoId={alunoId}
                exercicios={exerciciosAvulsos}
                onEdit={abrirEdicaoExercicio}
                onRemove={onRemoveExercicio}
              />
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditandoExercicio(null);
        }}
        title={editandoExercicio ? "Editar exercício" : "Adicionar exercício"}
      >
        <ExercicioForm
          alunoId={alunoId}
          initial={editandoExercicio ?? undefined}
          onSubmit={salvarExercicio}
          onCancel={() => {
            setModalOpen(false);
            setEditandoExercicio(null);
          }}
        />
      </Modal>

      <Modal
        open={blocoModalOpen}
        onClose={() => {
          setBlocoModalOpen(false);
          setEditandoBloco(null);
        }}
        title={editandoBloco ? "Editar bloco" : "Agrupar exercícios"}
      >
        <BlocoForm
          exercicios={divisao.exercicios}
          blocos={divisao.blocos ?? []}
          initial={editandoBloco ?? undefined}
          onSubmit={(bloco) => {
            if (editandoBloco) {
              onUpdateBloco({ ...bloco, id: editandoBloco.id });
            } else {
              onAddBloco(bloco);
            }
            setBlocoModalOpen(false);
            setEditandoBloco(null);
          }}
          onCancel={() => {
            setBlocoModalOpen(false);
            setEditandoBloco(null);
          }}
        />
      </Modal>
    </div>
  );
}

function nomeDoBloco(bloco: BlocoTreino, indice: number): string {
  if (bloco.tipo === "superset") return `Superset ${indice + 1}`;
  if (bloco.tipo === "circuito") return `Circuito ${indice + 1}`;
  return `Bloco ${indice + 1}`;
}

function resumoDoBloco(bloco: BlocoTreino): string {
  if (bloco.tipo === "individual") {
    return `${bloco.exercicioIds.length} exercício${bloco.exercicioIds.length === 1 ? "" : "s"}`;
  }
  const partes = [`${bloco.rounds} round${bloco.rounds === 1 ? "" : "s"}`];
  if (bloco.tipo === "circuito") {
    if (bloco.trabalhoSeg) partes.push(`${bloco.trabalhoSeg}s de trabalho`);
    if (bloco.transicaoSeg !== undefined) partes.push(`${bloco.transicaoSeg}s de transição`);
  }
  partes.push(`${bloco.descansoEntreRoundsSeg}s de descanso`);
  return partes.join(" · ");
}

function ExerciciosTabela({
  alunoId,
  exercicios,
  onEdit,
  onRemove,
}: {
  alunoId?: string;
  exercicios: Exercicio[];
  onEdit: (exercicio: Exercicio) => void;
  onRemove: (exercicioId: string) => void;
}) {
  return (
    <div>
      <div className="hidden grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 border-b border-line bg-surface-2/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
        <span>Exercício</span>
        <span className="w-12 text-center">Séries</span>
        <span className="w-14 text-center">Reps</span>
        <span className="w-16 text-center">Carga</span>
        <span className="w-16 text-center">Desc.</span>
        <span className="w-16" />
      </div>
      <div className="divide-y divide-[var(--color-line)]">
        {exercicios.map((exercicio) => (
          <ExercicioRow
            key={exercicio.id}
            alunoId={alunoId}
            exercicio={exercicio}
            onEdit={() => onEdit(exercicio)}
            onRemove={() => onRemove(exercicio.id)}
          />
        ))}
      </div>
    </div>
  );
}

function inteiroDoCampo(valor: string, minimo: number, maximo: number): number | null {
  if (!/^\d+$/.test(valor.trim())) return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

function BlocoForm({
  exercicios,
  blocos,
  initial,
  onSubmit,
  onCancel,
}: {
  exercicios: Exercicio[];
  blocos: BlocoTreino[];
  initial?: BlocoTreino;
  onSubmit: (bloco: BlocoTreinoInput) => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<"superset" | "circuito">(
    initial?.tipo === "circuito" ? "circuito" : "superset",
  );
  const [selecionados, setSelecionados] = useState<string[]>(initial?.exercicioIds ?? []);
  const [rounds, setRounds] = useState(
    initial && initial.tipo !== "individual" ? String(initial.rounds) : "3",
  );
  const [trabalhoSeg, setTrabalhoSeg] = useState(
    initial?.tipo === "circuito" && initial.trabalhoSeg !== undefined
      ? String(initial.trabalhoSeg)
      : "40",
  );
  const [transicaoSeg, setTransicaoSeg] = useState(
    initial?.tipo === "circuito" && initial.transicaoSeg !== undefined
      ? String(initial.transicaoSeg)
      : "15",
  );
  const [descansoSeg, setDescansoSeg] = useState(
    initial && initial.tipo !== "individual"
      ? String(initial.descansoEntreRoundsSeg)
      : "60",
  );

  const roundsValidos = inteiroDoCampo(rounds, 1, 20);
  const descansoValido = inteiroDoCampo(descansoSeg, 0, 3600);
  const trabalhoValido =
    tipo === "circuito" && trabalhoSeg.trim()
      ? inteiroDoCampo(trabalhoSeg, 1, 3600)
      : undefined;
  const transicaoValida =
    tipo === "circuito" && transicaoSeg.trim()
      ? inteiroDoCampo(transicaoSeg, 0, 600)
      : undefined;
  const valido =
    selecionados.length >= 2 &&
    roundsValidos !== null &&
    descansoValido !== null &&
    trabalhoValido !== null &&
    transicaoValida !== null;

  const outroBlocoPorExercicio = new Map<string, BlocoTreino>();
  for (const bloco of blocos) {
    if (bloco.id === initial?.id) continue;
    for (const exercicioId of bloco.exercicioIds) {
      outroBlocoPorExercicio.set(exercicioId, bloco);
    }
  }

  const alternarExercicio = (exercicioId: string) => {
    setSelecionados((atuais) =>
      atuais.includes(exercicioId)
        ? atuais.filter((id) => id !== exercicioId)
        : [...atuais, exercicioId],
    );
  };

  const salvar = () => {
    if (!valido || roundsValidos === null || descansoValido === null) return;
    if (tipo === "superset") {
      onSubmit({
        tipo,
        exercicioIds: selecionados,
        rounds: roundsValidos,
        descansoEntreRoundsSeg: descansoValido,
      });
      return;
    }
    onSubmit({
      tipo,
      exercicioIds: selecionados,
      rounds: roundsValidos,
      trabalhoSeg: trabalhoValido,
      transicaoSeg: transicaoValida,
      descansoEntreRoundsSeg: descansoValido,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Tipo de bloco
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["superset", "circuito"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setTipo(opcao)}
              aria-pressed={tipo === opcao}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                tipo === opcao
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface-2/30 text-muted hover:border-accent/50"
              }`}
            >
              <span className="block text-sm font-bold">
                {opcao === "superset" ? "Superset" : "Circuito"}
              </span>
              <span className="mt-0.5 block text-xs font-medium">
                {opcao === "superset"
                  ? "Exercícios alternados"
                  : "Sequência com tempo e transição"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Exercícios do bloco
          </p>
          <span className="text-xs font-semibold text-accent">
            {selecionados.length} selecionado{selecionados.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
          {exercicios.map((exercicio) => {
            const selecionado = selecionados.includes(exercicio.id);
            const outroBloco = outroBlocoPorExercicio.get(exercicio.id);
            return (
              <label
                key={exercicio.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  selecionado ? "bg-accent/10" : "hover:bg-surface-2/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selecionado}
                  onChange={() => alternarExercicio(exercicio.id)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{exercicio.nome}</span>
                  {outroBloco && (
                    <span className="block text-[11px] text-muted">
                      Será movido do {outroBloco.tipo === "circuito" ? "circuito" : "superset"} atual
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        {selecionados.length < 2 && (
          <p className="mt-2 text-xs font-semibold text-danger">
            Selecione pelo menos dois exercícios.
          </p>
        )}
      </div>

      <div className={`grid gap-3 ${tipo === "circuito" ? "grid-cols-2" : "grid-cols-2"}`}>
        <CampoNumero label="Rounds" value={rounds} onChange={setRounds} min={1} max={20} />
        <CampoNumero
          label="Descanso entre rounds (s)"
          value={descansoSeg}
          onChange={setDescansoSeg}
          min={0}
          max={3600}
        />
        {tipo === "circuito" && (
          <>
            <CampoNumero
              label="Trabalho por exercício (s)"
              value={trabalhoSeg}
              onChange={setTrabalhoSeg}
              min={1}
              max={3600}
              opcional
            />
            <CampoNumero
              label="Transição (s)"
              value={transicaoSeg}
              onChange={setTransicaoSeg}
              min={0}
              max={600}
              opcional
            />
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={salvar} disabled={!valido}>
          {initial ? "Salvar bloco" : "Criar bloco"}
        </Button>
      </div>
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
  min,
  max,
  opcional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  opcional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <Input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={opcional ? "Opcional" : undefined}
      />
    </label>
  );
}

function ExercicioRow({
  alunoId,
  exercicio,
  onEdit,
  onRemove,
}: {
  alunoId?: string;
  exercicio: Exercicio;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { ultimoHistoricoExercicio } = useStore();
  const ultimaExecucao = alunoId
    ? ultimoHistoricoExercicio(alunoId, {
        nome: exercicio.nome,
        bibliotecaId: exercicio.bibliotecaId,
      })
    : undefined;
  const resumoUltimaExecucao = ultimaExecucao ? resumoDaExecucao(ultimaExecucao) : undefined;

  return (
    <div className="grid grid-cols-1 gap-1 px-3 py-2.5 text-sm transition-colors hover:bg-surface-2/40 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{exercicio.nome}</p>
        {exercicio.observacoes && (
          <p className="truncate text-xs text-muted">{exercicio.observacoes}</p>
        )}
        {ultimaExecucao && resumoUltimaExecucao && (
          <p className="truncate text-xs font-semibold text-accent">
            Último: {resumoUltimaExecucao.series}×{resumoUltimaExecucao.repeticoes}
            {resumoUltimaExecucao.carga ? ` · ${resumoUltimaExecucao.carga}` : ""} ·{" "}
            {fmtDiaMes(ultimaExecucao.data)}
          </p>
        )}
        <p className="text-xs text-muted sm:hidden">
          {exercicio.series}x{exercicio.repeticoes} · {exercicio.carga || "—"} ·{" "}
          {exercicio.descanso}
        </p>
      </div>
      <span className="hidden w-12 text-center text-muted sm:block">{exercicio.series}</span>
      <span className="hidden w-14 text-center text-muted sm:block">
        {exercicio.repeticoes}
      </span>
      <span className="hidden w-16 text-center text-muted sm:block">
        {exercicio.carga || "—"}
      </span>
      <span className="hidden w-16 text-center text-muted sm:block">{exercicio.descanso}</span>
      <div className="flex justify-end gap-1 sm:w-16">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          aria-label={`Editar ${exercicio.nome}`}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => confirm(`Remover o exercício "${exercicio.nome}"?`) && onRemove()}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-danger"
          aria-label={`Remover ${exercicio.nome}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
