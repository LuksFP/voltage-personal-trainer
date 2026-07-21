import type { BlocoTreino, Divisao, Exercicio } from "./types";

export interface UnidadeTreino {
  bloco?: BlocoTreino;
  exercicios: Exercicio[];
}

function minimoExercicios(bloco: BlocoTreino): number {
  return bloco.tipo === "individual" ? 1 : 2;
}

/**
 * Organiza a divisão para exibição sem perder exercícios avulsos.
 * A posição do primeiro exercício de cada bloco define a posição do bloco;
 * dentro dele, prevalece a ordem configurada em `exercicioIds`.
 */
export function unidadesDaDivisao(divisao: Divisao): UnidadeTreino[] {
  const exerciciosPorId = new Map(
    divisao.exercicios.map((exercicio) => [exercicio.id, exercicio] as const),
  );
  const blocoPorExercicio = new Map<string, BlocoTreino>();

  for (const bloco of divisao.blocos ?? []) {
    const idsValidos = Array.from(new Set(bloco.exercicioIds)).filter((id) =>
      exerciciosPorId.has(id),
    );
    if (idsValidos.length < minimoExercicios(bloco)) continue;

    for (const exercicioId of idsValidos) {
      // Dados persistidos pelo schema 5 não permitem sobreposição. A proteção
      // mantém a saída previsível também para objetos montados em memória.
      if (!blocoPorExercicio.has(exercicioId)) {
        blocoPorExercicio.set(exercicioId, bloco);
      }
    }
  }

  const unidades: UnidadeTreino[] = [];
  const blocosIncluidos = new Set<string>();
  const exerciciosIncluidos = new Set<string>();

  for (const exercicio of divisao.exercicios) {
    if (exerciciosIncluidos.has(exercicio.id)) continue;
    const bloco = blocoPorExercicio.get(exercicio.id);

    if (!bloco || blocosIncluidos.has(bloco.id)) {
      unidades.push({ exercicios: [exercicio] });
      exerciciosIncluidos.add(exercicio.id);
      continue;
    }

    const exerciciosDoBloco = bloco.exercicioIds
      .map((id) => exerciciosPorId.get(id))
      .filter((item): item is Exercicio => item !== undefined)
      .filter((item) => !exerciciosIncluidos.has(item.id));

    if (exerciciosDoBloco.length < minimoExercicios(bloco)) {
      unidades.push({ exercicios: [exercicio] });
      exerciciosIncluidos.add(exercicio.id);
      continue;
    }

    unidades.push({ bloco, exercicios: exerciciosDoBloco });
    blocosIncluidos.add(bloco.id);
    exerciciosDoBloco.forEach((item) => exerciciosIncluidos.add(item.id));
  }

  return unidades;
}

export function tituloDoBloco(bloco: BlocoTreino): string {
  if (bloco.tipo === "superset") return "Superset";
  if (bloco.tipo === "circuito") return "Circuito";
  return "Bloco individual";
}

export function detalhesDoBloco(bloco: BlocoTreino): string[] {
  if (bloco.tipo === "individual") return [];

  const detalhes = [`${bloco.rounds} ${bloco.rounds === 1 ? "round" : "rounds"}`];
  if (bloco.tipo === "circuito") {
    if (bloco.trabalhoSeg !== undefined) {
      detalhes.push(`${bloco.trabalhoSeg}s de trabalho por exercício`);
    }
    if (bloco.transicaoSeg !== undefined) {
      detalhes.push(
        bloco.transicaoSeg === 0
          ? "sem transição"
          : `${bloco.transicaoSeg}s de transição`,
      );
    }
  }
  detalhes.push(
    bloco.descansoEntreRoundsSeg === 0
      ? "sem descanso entre rounds"
      : `${bloco.descansoEntreRoundsSeg}s de descanso entre rounds`,
  );
  return detalhes;
}
