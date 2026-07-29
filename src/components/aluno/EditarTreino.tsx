"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  exercicioPadrao,
  exerciciosDisponiveis,
  type PreferenciasTreino,
} from "@/lib/gerador-treino";
import { GRUPOS_MUSCULARES, type Exercicio, type GrupoMuscular, type Treino } from "@/lib/types";
import { Button, Card, Input, cx } from "@/components/ui";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";

/**
 * Ajuste da planilha pelo próprio aluno.
 *
 * Sem personal, a única saída era regerar o treino inteiro — perdendo tudo que
 * já estava do jeito dele. Aqui dá pra mexer no que incomoda: número de séries,
 * faixa de repetições, descanso, tirar um exercício ou somar outro do mesmo
 * grupo. O gerador continua sendo o ponto de partida, não a prisão.
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
  const { updateExercicio, removeExercicio } = useStore();

  return (
    <section className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Ajustar</p>
        <h1 className="font-display mt-1 text-3xl font-bold leading-tight">Seu treino, do seu jeito</h1>
        <p className="mt-2 text-sm text-muted">
          Mudou de ideia sobre um exercício? Tire, troque ou acrescente. O que você já
          treinou continua no histórico.
        </p>
      </div>

      {treino.divisoes.map((divisao) => (
        <div key={divisao.id}>
          <h2 className="font-display border-b border-line pb-2 text-lg font-semibold">
            {divisao.nome}
          </h2>

          <ul className="divide-y divide-[var(--color-line)]">
            {divisao.exercicios.map((exercicio) => (
              <li key={exercicio.id} className="py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold">{exercicio.nome}</p>
                  <button
                    type="button"
                    onClick={() => removeExercicio(treino.id, divisao.id, exercicio.id)}
                    aria-label={`Tirar ${exercicio.nome} do treino`}
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <CampoCurto
                    rotulo="Séries"
                    valor={exercicio.series}
                    aoMudar={(series) =>
                      updateExercicio(treino.id, divisao.id, { ...exercicio, series })
                    }
                  />
                  <CampoCurto
                    rotulo="Reps"
                    valor={exercicio.repeticoes}
                    aoMudar={(repeticoes) =>
                      updateExercicio(treino.id, divisao.id, { ...exercicio, repeticoes })
                    }
                  />
                  <CampoCurto
                    rotulo="Descanso"
                    valor={exercicio.descanso}
                    aoMudar={(descanso) =>
                      updateExercicio(treino.id, divisao.id, { ...exercicio, descanso })
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
            treinoId={treino.id}
            divisaoId={divisao.id}
            jaNaDivisao={divisao.exercicios}
            preferencias={preferencias}
          />
        </div>
      ))}

      <Button onClick={aoFechar}>
        <CheckIcon className="h-4 w-4" /> Pronto
      </Button>
    </section>
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
