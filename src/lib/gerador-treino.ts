import type {
  Divisao,
  Exercicio,
  ExercicioBiblioteca,
  GrupoMuscular,
  Objetivo,
} from "./types";

/* ──────────────────────────────────────────────────────────────
   Gerador de treino do app do aluno.

   Funções puras: entram as preferências do onboarding e a biblioteca
   de exercícios, sai uma planilha completa (divisões + exercícios +
   dias da semana) pronta pra virar Treino no store.
   ────────────────────────────────────────────────────────────── */

export type NivelAluno = "iniciante" | "intermediario" | "avancado";
export type LocalTreino = "academia" | "casa";

export interface PreferenciasTreino {
  objetivo: Objetivo;
  nivel: NivelAluno;
  /** Quantos dias por semana o aluno pretende treinar (2 a 6). */
  dias: number;
  local: LocalTreino;
}

export interface PlanoGerado {
  nome: string;
  descricao: string;
  divisoes: Divisao[];
}

export const NIVEIS: { id: NivelAluno; label: string; detalhe: string }[] = [
  { id: "iniciante", label: "Iniciante", detalhe: "Nunca treinei ou parei há mais de 6 meses" },
  { id: "intermediario", label: "Intermediário", detalhe: "Treino com alguma regularidade há uns meses" },
  { id: "avancado", label: "Avançado", detalhe: "Treino sério e constante há mais de 2 anos" },
];

export const LOCAIS: { id: LocalTreino; label: string; detalhe: string }[] = [
  { id: "academia", label: "Academia", detalhe: "Tenho barra, máquinas e polia" },
  { id: "casa", label: "Em casa", detalhe: "Peso corporal e, no máximo, halteres" },
];

/** Equipamentos que existem fora da academia. */
const EQUIPAMENTO_CASA = new Set([
  "Peso corporal",
  "Halteres",
  "Halter",
  "Kettlebell",
  "Corda",
]);

/** Movimentos explosivos — fora quando o objetivo é reabilitação. */
const EXPLOSIVOS = new Set([
  "Burpee",
  "Agachamento com salto",
  "Pular corda",
  "Escalador",
  "Remada alta",
]);

function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** O exercício pode entrar no treino de quem tem esse local/objetivo? */
function cabeNoContexto(
  item: ExercicioBiblioteca,
  prefs: Pick<PreferenciasTreino, "local" | "objetivo">,
): boolean {
  if (prefs.local === "casa" && !EQUIPAMENTO_CASA.has(item.equipamento ?? "")) return false;
  if (prefs.objetivo === "Reabilitação" && EXPLOSIVOS.has(item.nome)) return false;
  return true;
}

/**
 * Outros exercícios que treinam o mesmo grupo do atual — é a lista que o aluno
 * sem personal vê quando o aparelho está ocupado ou o movimento incomoda.
 * Fora: o próprio exercício e o que já está na divisão de hoje.
 */
export function alternativasDoExercicio(
  biblioteca: ExercicioBiblioteca[],
  atual: { nome: string; bibliotecaId?: string },
  prefs: Pick<PreferenciasTreino, "local" | "objetivo">,
  jaNaDivisao: readonly string[] = [],
): ExercicioBiblioteca[] {
  const nomeAtual = normalizar(atual.nome);
  const referencia =
    (atual.bibliotecaId ? biblioteca.find((item) => item.id === atual.bibliotecaId) : undefined) ??
    biblioteca.find((item) => normalizar(item.nome) === nomeAtual);
  if (!referencia) return [];

  return exerciciosDisponiveis(biblioteca, prefs, {
    grupo: referencia.grupo,
    excluirNomes: [...jaNaDivisao, atual.nome],
  }).filter((item) => item.id !== referencia.id);
}

/**
 * O que da biblioteca cabe no treino de quem tem esse local e objetivo —
 * opcionalmente de um grupo muscular só e sem repetir o que já está no dia.
 */
export function exerciciosDisponiveis(
  biblioteca: ExercicioBiblioteca[],
  prefs: Pick<PreferenciasTreino, "local" | "objetivo">,
  filtros: { grupo?: GrupoMuscular; excluirNomes?: readonly string[] } = {},
): ExercicioBiblioteca[] {
  const ocupados = new Set((filtros.excluirNomes ?? []).map(normalizar));
  return biblioteca
    .filter(
      (item) =>
        (filtros.grupo === undefined || item.grupo === filtros.grupo) &&
        !ocupados.has(normalizar(item.nome)) &&
        cabeNoContexto(item, prefs),
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/* ---------- prescrição de séries/reps/descanso ---------- */

interface Prescricao {
  series: number;
  repeticoes: string;
  descanso: number; // segundos
}

const POR_OBJETIVO: Record<Objetivo, Prescricao> = {
  Hipertrofia: { series: 4, repeticoes: "8-12", descanso: 75 },
  Força: { series: 5, repeticoes: "3-5", descanso: 150 },
  Emagrecimento: { series: 3, repeticoes: "12-15", descanso: 45 },
  Condicionamento: { series: 3, repeticoes: "15", descanso: 40 },
  "Saúde geral": { series: 3, repeticoes: "10-12", descanso: 60 },
  Reabilitação: { series: 2, repeticoes: "12-15", descanso: 60 },
};

const AJUSTE_NIVEL: Record<NivelAluno, number> = {
  iniciante: -1,
  intermediario: 0,
  avancado: 1,
};

/** Quantos exercícios entram em cada divisão. */
const EXERCICIOS_POR_DIVISAO: Record<NivelAluno, number> = {
  iniciante: 5,
  intermediario: 6,
  avancado: 7,
};

function prescrever(prefs: PreferenciasTreino, composto: boolean): Prescricao {
  const base = POR_OBJETIVO[prefs.objetivo];
  const series = Math.max(2, base.series + AJUSTE_NIVEL[prefs.nivel]);
  // Exercício composto pede mais descanso; isolado devolve mais rápido.
  const descanso = composto ? base.descanso + 15 : Math.max(30, base.descanso - 15);
  return { series, repeticoes: base.repeticoes, descanso };
}

/**
 * Prescrição padrão pra um exercício que o aluno acrescenta à mão — mesma
 * régua do gerador, tratando o novo como isolado (quem entra depois raramente
 * é o pesado do dia).
 */
export function exercicioPadrao(
  item: ExercicioBiblioteca,
  prefs: PreferenciasTreino,
): Omit<Exercicio, "id"> {
  const receita = prescrever(prefs, false);
  return {
    nome: item.nome,
    series: String(receita.series),
    repeticoes: receita.repeticoes,
    carga: cargaInicial(item.equipamento),
    descanso: segundosParaTexto(receita.descanso),
    bibliotecaId: item.id,
  };
}

/* ---------- modelos de divisão ---------- */

interface ModeloDivisao {
  nome: string;
  /** Grupos em ordem de prioridade — os primeiros são os compostos do dia. */
  grupos: GrupoMuscular[];
}

const FULL_A: ModeloDivisao = {
  nome: "A — Corpo todo",
  grupos: ["Pernas", "Peito", "Costas", "Ombro", "Abdômen", "Glúteos", "Tríceps"],
};
const FULL_B: ModeloDivisao = {
  nome: "B — Corpo todo",
  grupos: ["Costas", "Pernas", "Peito", "Bíceps", "Abdômen", "Panturrilha", "Ombro"],
};
const FULL_C: ModeloDivisao = {
  nome: "C — Corpo todo",
  grupos: ["Glúteos", "Peito", "Costas", "Pernas", "Tríceps", "Bíceps", "Abdômen"],
};
const EMPURRAR: ModeloDivisao = {
  nome: "A — Empurrar",
  grupos: ["Peito", "Ombro", "Peito", "Tríceps", "Ombro", "Tríceps", "Abdômen"],
};
const PUXAR: ModeloDivisao = {
  nome: "B — Puxar",
  grupos: ["Costas", "Costas", "Bíceps", "Costas", "Bíceps", "Abdômen", "Abdômen"],
};
const PERNAS: ModeloDivisao = {
  nome: "C — Pernas",
  grupos: ["Pernas", "Pernas", "Glúteos", "Pernas", "Glúteos", "Panturrilha", "Abdômen"],
};

function modelos(prefs: PreferenciasTreino): ModeloDivisao[] {
  const { dias, nivel } = prefs;
  if (dias <= 2) return [FULL_A, FULL_B];
  if (dias === 3) {
    // Iniciante rende mais com corpo todo; daí pra cima, empurrar/puxar/pernas.
    return nivel === "iniciante" ? [FULL_A, FULL_B, FULL_C] : [EMPURRAR, PUXAR, PERNAS];
  }
  if (dias === 4) {
    return [
      { nome: "A — Peito e tríceps", grupos: ["Peito", "Peito", "Tríceps", "Peito", "Tríceps", "Abdômen", "Ombro"] },
      { nome: "B — Costas e bíceps", grupos: ["Costas", "Costas", "Bíceps", "Costas", "Bíceps", "Abdômen", "Costas"] },
      { nome: "C — Pernas e glúteos", grupos: ["Pernas", "Pernas", "Glúteos", "Pernas", "Glúteos", "Panturrilha", "Abdômen"] },
      { nome: "D — Ombro e core", grupos: ["Ombro", "Ombro", "Ombro", "Abdômen", "Abdômen", "Panturrilha", "Tríceps"] },
    ];
  }
  if (dias === 5) {
    return [
      { nome: "A — Peito", grupos: ["Peito", "Peito", "Peito", "Tríceps", "Tríceps", "Abdômen", "Peito"] },
      { nome: "B — Costas", grupos: ["Costas", "Costas", "Costas", "Bíceps", "Bíceps", "Abdômen", "Costas"] },
      { nome: "C — Pernas", grupos: ["Pernas", "Pernas", "Pernas", "Glúteos", "Glúteos", "Panturrilha", "Abdômen"] },
      { nome: "D — Ombro e core", grupos: ["Ombro", "Ombro", "Ombro", "Abdômen", "Abdômen", "Panturrilha", "Ombro"] },
      { nome: "E — Braços", grupos: ["Bíceps", "Tríceps", "Bíceps", "Tríceps", "Abdômen", "Panturrilha", "Bíceps"] },
    ];
  }
  return [
    EMPURRAR,
    PUXAR,
    PERNAS,
    { ...EMPURRAR, nome: "D — Empurrar (2ª)" },
    { ...PUXAR, nome: "E — Puxar (2ª)" },
    { ...PERNAS, nome: "F — Pernas (2ª)" },
  ];
}

/** Dias da semana sugeridos para cada quantidade de treinos (0=dom … 6=sáb). */
const AGENDA_SEMANAL: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

/* ---------- montagem ---------- */

function segundosParaTexto(segundos: number): string {
  return segundos >= 120 ? `${Math.round(segundos / 60)}min` : `${segundos}s`;
}

function cargaInicial(equipamento: string | undefined): string {
  return equipamento === "Peso corporal" ? "corporal" : "a definir";
}

/** Ordena a biblioteca por grupo, já filtrada pelo que o aluno tem disponível. */
function porGrupo(
  biblioteca: ExercicioBiblioteca[],
  prefs: PreferenciasTreino,
): Map<GrupoMuscular, ExercicioBiblioteca[]> {
  const mapa = new Map<GrupoMuscular, ExercicioBiblioteca[]>();
  for (const item of biblioteca) {
    if (prefs.local === "casa" && !EQUIPAMENTO_CASA.has(item.equipamento ?? "")) continue;
    if (prefs.objetivo === "Reabilitação" && EXPLOSIVOS.has(item.nome)) continue;
    const lista = mapa.get(item.grupo);
    if (lista) lista.push(item);
    else mapa.set(item.grupo, [item]);
  }
  return mapa;
}

export function gerarPlano(
  prefs: PreferenciasTreino,
  biblioteca: ExercicioBiblioteca[],
  /** Muda as escolhas sem mudar as preferências — usado no "gerar outro treino". */
  variacao = 0,
): PlanoGerado {
  const dias = Math.min(6, Math.max(2, prefs.dias));
  const catalogo = porGrupo(biblioteca, { ...prefs, dias });
  const lista = modelos({ ...prefs, dias });
  const agenda = AGENDA_SEMANAL[dias] ?? AGENDA_SEMANAL[3];
  const quantidade = EXERCICIOS_POR_DIVISAO[prefs.nivel];
  // Usado no plano inteiro: evita o mesmo exercício aparecendo em vários dias.
  const usadosNoPlano = new Set<string>();
  let sequencia = 0;

  /* Escolhe um exercício do grupo em duas tentativas:
     1) algo que ainda não entrou no plano;
     2) algo que ainda não entrou NESTE dia (repetir entre dias é normal).
     Se nem isso houver, devolve undefined e o slot fica vazio — melhor um
     treino mais curto que o mesmo exercício três vezes no mesmo dia. */
  const escolher = (
    grupo: GrupoMuscular,
    indice: number,
    usadosNaDivisao: Set<string>,
  ): ExercicioBiblioteca | undefined => {
    const opcoes = catalogo.get(grupo) ?? [];
    if (opcoes.length === 0) return undefined;
    const inicio = (indice + variacao) % opcoes.length;
    for (const evitar of [usadosNoPlano, usadosNaDivisao]) {
      for (let i = 0; i < opcoes.length; i += 1) {
        const candidato = opcoes[(inicio + i) % opcoes.length];
        if (!evitar.has(candidato.id) && !usadosNaDivisao.has(candidato.id)) return candidato;
      }
    }
    return undefined;
  };

  /** Grupos que salvam a divisão quando os do modelo esgotam. */
  const RESERVA: GrupoMuscular[] = ["Corpo todo", "Abdômen", "Pernas", "Costas", "Peito", "Cardio"];
  const MINIMO_POR_DIVISAO = 4;

  const divisoes = lista.map((modelo, indice): Divisao => {
    const exercicios: Exercicio[] = [];
    const usadosNaDivisao = new Set<string>();

    const adicionar = (item: ExercicioBiblioteca) => {
      usadosNoPlano.add(item.id);
      usadosNaDivisao.add(item.id);
      // Os dois primeiros do dia são os pesados (compostos).
      const receita = prescrever(prefs, exercicios.length < 2);
      sequencia += 1;
      exercicios.push({
        id: `gerado_${sequencia}_${Date.now().toString(36)}`,
        nome: item.nome,
        series: String(receita.series),
        repeticoes: receita.repeticoes,
        carga: cargaInicial(item.equipamento),
        descanso: segundosParaTexto(receita.descanso),
        bibliotecaId: item.id,
      });
    };

    for (const grupo of modelo.grupos.slice(0, quantidade)) {
      const item = escolher(grupo, indice, usadosNaDivisao);
      if (item) adicionar(item);
    }

    // Catálogo magro (treino em casa, divisão repetida) pode deixar o dia curto:
    // completa com grupos de reserva antes de entregar um treino de 2 exercícios.
    for (const grupo of RESERVA) {
      if (exercicios.length >= Math.min(MINIMO_POR_DIVISAO, quantidade)) break;
      const item = escolher(grupo, indice, usadosNaDivisao);
      if (item) adicionar(item);
    }

    // Emagrecimento e condicionamento fecham o treino com cardio.
    if (prefs.objetivo === "Emagrecimento" || prefs.objetivo === "Condicionamento") {
      const item = escolher("Cardio", indice, usadosNaDivisao);
      if (item) {
        usadosNaDivisao.add(item.id);
        sequencia += 1;
        exercicios.push({
          id: `gerado_${sequencia}_${Date.now().toString(36)}`,
          nome: item.nome,
          series: "1",
          repeticoes: prefs.objetivo === "Emagrecimento" ? "15min" : "10min",
          carga: cargaInicial(item.equipamento),
          descanso: "—",
          bibliotecaId: item.id,
          observacoes: "Ritmo em que dá pra conversar com dificuldade.",
        });
      }
    }

    return {
      id: `div_gerada_${indice + 1}_${Date.now().toString(36)}`,
      nome: modelo.nome,
      exercicios,
      diasSemana: agenda[indice] != null ? [agenda[indice]] : undefined,
    };
  });

  const letras = divisoes.map((d) => d.nome.charAt(0)).join("");
  return {
    nome: `Treino ${letras} — ${prefs.objetivo}`,
    descricao: `Gerado pelo app · ${dias}x por semana · ${
      prefs.local === "casa" ? "em casa" : "academia"
    }`,
    divisoes,
  };
}
