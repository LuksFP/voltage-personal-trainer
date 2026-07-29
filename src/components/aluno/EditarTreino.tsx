"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  exercicioPadrao,
  exerciciosDisponiveis,
  type PreferenciasTreino,
} from "@/lib/gerador-treino";
import { DIAS_CURTOS, DIAS_LONGOS } from "@/lib/dias-treino";
import {
  GRUPOS_MUSCULARES,
  type Divisao,
  type Exercicio,
  type GrupoMuscular,
  type Treino,
} from "@/lib/types";
import { Button, Card, Input, cx } from "@/components/ui";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";

/**
 * Ajuste da planilha pelo próprio aluno.
 *
 * Sem personal, a única saída era regerar o treino inteiro — perdendo tudo que
 * já estava do jeito dele. Aqui dá pra mexer no que incomoda: ordem e número de
 * séries, faixa de repetições, descanso, tirar um exercício ou somar outro do
 * mesmo grupo — e também criar, renomear e agendar os dias de treino. O gerador
 * continua sendo o ponto de partida, não a prisão.
 */
export function EditarTreino({
  treino,
  preferencias,
  aoFechar,
}: {
  treino: Treino;
  preferencias: PreferenciasTreino;
  aoFechar: () => void;
}) {
  const { addDivisao } = useStore();

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Ajustar</p>
        <h1 className="font-display mt-1 text-3xl font-bold leading-tight">Seu treino, do seu jeito</h1>
        <p className="mt-2 text-sm text-muted">
          Mudou de ideia sobre um exercício? Tire, troque, mude a ordem ou acrescente
          outro dia. O que você já treinou continua no histórico.
        </p>
      </div>

      {treino.divisoes.map((divisao) => (
        <DivisaoEditavel
          key={divisao.id}
          treinoId={treino.id}
          divisao={divisao}
          podeRemover={treino.divisoes.length > 1}
          preferencias={preferencias}
        />
      ))}

      <button
        type="button"
        onClick={() => addDivisao(treino.id, proximoNomeDeDivisao(treino.divisoes))}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl2 border border-dashed border-line py-3.5 text-sm font-semibold text-muted transition-colors hover:border-accent/60 hover:text-accent"
      >
        <PlusIcon className="h-4 w-4" /> Novo dia de treino
      </button>

      <Button onClick={aoFechar}>
        <CheckIcon className="h-4 w-4" /> Pronto
      </Button>
    </section>
  );
}

/** Sugere a próxima letra livre: A, B, C… olhando como as divisões já se chamam. */
function proximoNomeDeDivisao(divisoes: Divisao[]): string {
  const usadas = new Set(
    divisoes
      .map((divisao) => divisao.nome.trim().charAt(0).toUpperCase())
      .filter((letra) => letra >= "A" && letra <= "Z"),
  );
  for (let i = 0; i < 26; i += 1) {
    const letra = String.fromCharCode(65 + i);
    if (!usadas.has(letra)) return `${letra} — Novo dia`;
  }
  return "Novo dia";
}

function DivisaoEditavel({
  treinoId,
  divisao,
  podeRemover,
  preferencias,
}: {
  treinoId: string;
  divisao: Divisao;
  podeRemover: boolean;
  preferencias: PreferenciasTreino;
}) {
  const {
    updateDivisao,
    removeDivisao,
    setDivisaoDias,
    updateExercicio,
    removeExercicio,
    moverExercicio,
  } = useStore();
  const ultimo = divisao.exercicios.length - 1;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <input
          value={divisao.nome}
          onChange={(evento) => updateDivisao(treinoId, divisao.id, evento.target.value)}
          onBlur={(evento) => {
            if (!evento.target.value.trim()) updateDivisao(treinoId, divisao.id, "Novo dia");
          }}
          aria-label={`Nome do dia ${divisao.nome}`}
          className="font-display min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-1 text-lg font-semibold outline-none transition-colors hover:bg-surface-2/60 focus:bg-surface-2"
        />
        {podeRemover && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Tirar "${divisao.nome}" do seu treino?`)) {
                removeDivisao(treinoId, divisao.id);
              }
            }}
            aria-label={`Tirar o dia ${divisao.nome}`}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {DIAS_CURTOS.map((rotulo, dia) => {
            const ativo = divisao.diasSemana?.includes(dia) ?? false;
            return (
              <button
                key={dia}
                type="button"
                onClick={() => {
                  const atuais = divisao.diasSemana ?? [];
                  setDivisaoDias(
                    treinoId,
                    divisao.id,
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
          <span className="text-xs text-muted">sem dia fixo — entra no rodízio</span>
        )}
      </div>

      <ul className="mt-1 divide-y divide-[var(--color-line)]">
        {divisao.exercicios.map((exercicio, indice) => (
          <li key={exercicio.id} className="py-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-semibold">{exercicio.nome}</p>
              <div className="flex shrink-0 items-center gap-0.5">
                <BotaoMover
                  direcao={-1}
                  desabilitado={indice === 0}
                  nome={exercicio.nome}
                  onClick={() => moverExercicio(treinoId, divisao.id, exercicio.id, -1)}
                />
                <BotaoMover
                  direcao={1}
                  desabilitado={indice === ultimo}
                  nome={exercicio.nome}
                  onClick={() => moverExercicio(treinoId, divisao.id, exercicio.id, 1)}
                />
                <button
                  type="button"
                  onClick={() => removeExercicio(treinoId, divisao.id, exercicio.id)}
                  aria-label={`Tirar ${exercicio.nome} do treino`}
                  className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <CampoCurto
                rotulo="Séries"
                valor={exercicio.series}
                aoMudar={(series) =>
                  updateExercicio(treinoId, divisao.id, { ...exercicio, series })
                }
              />
              <CampoCurto
                rotulo="Reps"
                valor={exercicio.repeticoes}
                aoMudar={(repeticoes) =>
                  updateExercicio(treinoId, divisao.id, { ...exercicio, repeticoes })
                }
              />
              <CampoCurto
                rotulo="Descanso"
                valor={exercicio.descanso}
                aoMudar={(descanso) =>
                  updateExercicio(treinoId, divisao.id, { ...exercicio, descanso })
                }
              />
            </div>
          </li>
        ))}
      </ul>

      {divisao.exercicios.length === 0 && (
        <p className="py-4 text-sm text-muted">
          Esse dia ficou vazio. Acrescente pelo menos um exercício.
        </p>
      )}

      <AdicionarExercicio
        treinoId={treinoId}
        divisaoId={divisao.id}
        jaNaDivisao={divisao.exercicios}
        preferencias={preferencias}
      />
    </div>
  );
}

function BotaoMover({
  direcao,
  desabilitado,
  nome,
  onClick,
}: {
  direcao: -1 | 1;
  desabilitado: boolean;
  nome: string;
  onClick: () => void;
}) {
  const Icone = direcao === -1 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={`Mover ${nome} para ${direcao === -1 ? "cima" : "baixo"}`}
      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:pointer-events-none disabled:opacity-25"
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

function CampoCurto({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
        {rotulo}
      </span>
      <Input
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="rounded-lg px-2.5 py-2 text-xs"
      />
    </label>
  );
}

/** Escolhe por grupo muscular, respeitando local de treino e objetivo. */
function AdicionarExercicio({
  treinoId,
  divisaoId,
  jaNaDivisao,
  preferencias,
}: {
  treinoId: string;
  divisaoId: string;
  jaNaDivisao: Exercicio[];
  preferencias: PreferenciasTreino;
}) {
  const { biblioteca, addExercicio } = useStore();
  const [aberto, setAberto] = useState(false);
  const [grupo, setGrupo] = useState<GrupoMuscular>("Peito");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
      >
        <PlusIcon className="h-4 w-4" /> Adicionar exercício
      </button>
    );
  }

  // Mesma regra da troca: equipamento que o aluno tem, sem repetir o dia.
  const doGrupo = exerciciosDisponiveis(biblioteca, preferencias, {
    grupo,
    excluirNomes: jaNaDivisao.map((item) => item.nome),
  });

  return (
    <Card className="mt-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {GRUPOS_MUSCULARES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setGrupo(item)}
            className={cx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              item === grupo
                ? "border-volt bg-volt text-ink"
                : "border-line text-muted hover:border-accent/50 hover:text-text",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {doGrupo.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nada de {grupo.toLowerCase()} sobrando pro seu local de treino — os que existem
          já estão nesse dia.
        </p>
      ) : (
        <ul className="mt-3 max-h-64 divide-y divide-[var(--color-line)] overflow-y-auto">
          {doGrupo.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  addExercicio(treinoId, divisaoId, exercicioPadrao(item, preferencias));
                  setAberto(false);
                }}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-accent"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.nome}</span>
                  {item.equipamento && (
                    <span className="block text-xs text-muted">{item.equipamento}</span>
                  )}
                </span>
                <PlusIcon className="h-4 w-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAberto(false)}
        className="mt-3 text-sm font-semibold text-muted hover:text-text"
      >
        Fechar
      </button>
    </Card>
  );
}
