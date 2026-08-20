/**
 * Regras puras de montagem de treino usadas pelo store: clonar divisões,
 * montar/salvar blocos, reordenar exercícios e casar exercício com sugestão.
 *
 * Ficam fora do `store.tsx` porque não dependem de estado nenhum — e assim dá
 * pra testá-las sem montar o Provider.
 */
import type {
  BlocoTreino,
  Divisao,
  Exercicio,
  HistoricoExercicio,
  SugestaoProgressao,
} from "./types";
import type { BlocoTreinoInput, ExercicioHistoricoFiltro } from "./store-tipos";
import { uid } from "./id";


export function clonarDivisoes(divisoes: Divisao[]): Divisao[] {
  const copia = structuredClone(divisoes);
  return copia.map((divisao) => {
    const mapaExercicios = new Map<string, string>();
    const exercicios = divisao.exercicios.map((exercicio) => {
      const novoId = uid("ex");
      mapaExercicios.set(exercicio.id, novoId);
      return { ...exercicio, id: novoId };
    });
    const blocos = divisao.blocos?.map((bloco) => ({
      ...bloco,
      id: uid("bloco"),
      exercicioIds: bloco.exercicioIds
        .map((id) => mapaExercicios.get(id))
        .filter((id): id is string => id !== undefined),
    }));
    return { ...divisao, id: uid("div"), exercicios, blocos };
  });
}


export function minimoExerciciosBloco(tipo: BlocoTreino["tipo"]): number {
  return tipo === "individual" ? 1 : 2;
}


export function normalizarNumeroInteiro(valor: number, minimo: number): number {
  return Number.isFinite(valor) ? Math.max(minimo, Math.round(valor)) : minimo;
}


export function construirBloco(
  input: BlocoTreinoInput,
  exerciciosValidos: Set<string>,
  id = uid("bloco"),
): BlocoTreino {
  const exercicioIds = Array.from(new Set(input.exercicioIds)).filter((exercicioId) =>
    exerciciosValidos.has(exercicioId),
  );
  if (exercicioIds.length < minimoExerciciosBloco(input.tipo)) {
    throw new Error(
      input.tipo === "individual"
        ? "Escolha um exercício para o bloco."
        : "Supersets e circuitos precisam de ao menos dois exercícios.",
    );
  }
  if (input.tipo === "individual") return { id, tipo: "individual", exercicioIds };
  if (input.tipo === "superset") {
    return {
      id,
      tipo: "superset",
      exercicioIds,
      rounds: normalizarNumeroInteiro(input.rounds, 1),
      descansoEntreRoundsSeg: normalizarNumeroInteiro(input.descansoEntreRoundsSeg, 0),
    };
  }
  return {
    id,
    tipo: "circuito",
    exercicioIds,
    rounds: normalizarNumeroInteiro(input.rounds, 1),
    trabalhoSeg:
      input.trabalhoSeg === undefined
        ? undefined
        : normalizarNumeroInteiro(input.trabalhoSeg, 1),
    transicaoSeg:
      input.transicaoSeg === undefined
        ? undefined
        : normalizarNumeroInteiro(input.transicaoSeg, 0),
    descansoEntreRoundsSeg: normalizarNumeroInteiro(input.descansoEntreRoundsSeg, 0),
  };
}


export function salvarBloco(
  divisao: Divisao,
  input: BlocoTreinoInput,
  blocoId?: string,
): Divisao {
  const idsValidos = new Set(divisao.exercicios.map((exercicio) => exercicio.id));
  const bloco = construirBloco(input, idsValidos, blocoId);
  const selecionados = new Set(bloco.exercicioIds);
  const outros = (divisao.blocos ?? [])
    .filter((item) => item.id !== bloco.id)
    .map((item) => ({
      ...item,
      exercicioIds: item.exercicioIds.filter((id) => !selecionados.has(id)),
    }))
    .filter((item) => item.exercicioIds.length >= minimoExerciciosBloco(item.tipo));
  return { ...divisao, blocos: [...outros, bloco] };
}


export function removerExercicioDosBlocos(divisao: Divisao, exercicioId: string): BlocoTreino[] {
  return (divisao.blocos ?? [])
    .map((bloco) => ({
      ...bloco,
      exercicioIds: bloco.exercicioIds.filter((id) => id !== exercicioId),
    }))
    .filter((bloco) => bloco.exercicioIds.length >= minimoExerciciosBloco(bloco.tipo));
}

/** Troca um exercício de lugar com o vizinho. Nas pontas, não faz nada. */
export function trocarPosicao(exercicios: Exercicio[], exercicioId: string, direcao: -1 | 1): Exercicio[] {
  const de = exercicios.findIndex((exercicio) => exercicio.id === exercicioId);
  const para = de + direcao;
  if (de < 0 || para < 0 || para >= exercicios.length) return exercicios;
  const copia = [...exercicios];
  [copia[de], copia[para]] = [copia[para], copia[de]];
  return copia;
}


export function normalizarExercicio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


export function mesmoExercicio(
  registro: HistoricoExercicio,
  exercicio: ExercicioHistoricoFiltro,
): boolean {
  if (exercicio.bibliotecaId && registro.bibliotecaId === exercicio.bibliotecaId) return true;
  return normalizarExercicio(registro.nome) === normalizarExercicio(exercicio.nome);
}


export function exercicioCorrespondeSugestao(
  exercicio: Exercicio,
  sugestao: SugestaoProgressao,
): boolean {
  if (sugestao.exercicioId !== undefined && exercicio.id === sugestao.exercicioId) return true;
  if (
    sugestao.bibliotecaId !== undefined &&
    exercicio.bibliotecaId === sugestao.bibliotecaId
  ) {
    return true;
  }
  return (
    normalizarExercicio(exercicio.nome) ===
    normalizarExercicio(sugestao.exercicioNomeSnapshot)
  );
}
