import type {
  ConfiguracaoHabitosSnapshot,
  HabitoDiario,
  MetasHabitos,
  RegistroHabitosDiario,
  ValoresHabitosDiarios,
} from "./types";
import { paraIso } from "./data";
import { somarDias } from "./data";

export const HABITOS_DIARIOS = [
  "agua",
  "passos",
  "sono",
  "alongamento",
  "cardio",
  "alimentacao",
] as const satisfies readonly HabitoDiario[];

export const METAS_HABITOS_PADRAO: Readonly<MetasHabitos> = Object.freeze({
  aguaMl: 2_000,
  passos: 8_000,
  sonoHoras: 8,
  alongamentoMinutos: 10,
  cardioMinutos: 30,
  adesaoAlimentarPercentual: 80,
});

export interface ConfiguracaoHabitosInput {
  habitosAtivos?: HabitoDiario[];
  metas?: Partial<MetasHabitos>;
}

export interface ProgressoHabito {
  habito: HabitoDiario;
  ativo: boolean;
  valor: number | null;
  meta: number;
  percentual: number;
  atingido: boolean;
}

export interface ResumoHabitosDia {
  data: string;
  progressoPorHabito: Record<HabitoDiario, ProgressoHabito>;
  totalHabitosAtivos: number;
  metasAtingidas: number;
  percentualGeral: number;
  completo: boolean;
}

export interface SequenciaHabito {
  atual: number;
  melhor: number;
}

export interface SequenciasHabitos {
  hoje: string;
  global: SequenciaHabito;
  porHabito: Record<HabitoDiario, SequenciaHabito>;
}

const DATA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILISSEGUNDOS_DIA = 86_400_000;

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function normalizarNumero(
  valor: number,
  nome: string,
  minimo: number,
  maximo: number,
  casas = 0,
): number {
  if (!Number.isFinite(valor)) throw new Error(`${nome} deve ser um número válido.`);
  return arredondar(Math.min(maximo, Math.max(minimo, valor)), casas);
}

function normalizarHabitosAtivos(habitos: readonly HabitoDiario[]): HabitoDiario[] {
  if (!Array.isArray(habitos)) throw new Error("A lista de hábitos ativos é inválida.");
  const selecionados = new Set(habitos);
  if (selecionados.size !== habitos.length) {
    throw new Error("A lista de hábitos ativos não pode conter itens repetidos.");
  }
  for (const habito of selecionados) {
    if (!HABITOS_DIARIOS.includes(habito)) {
      throw new Error("A lista contém um hábito desconhecido.");
    }
  }
  return HABITOS_DIARIOS.filter((habito) => selecionados.has(habito));
}

/** Retorna a data civil local sem passar por UTC ou `toISOString()`. */
export function dataLocalHoje(referencia: Date = new Date()): string {
  return paraIso(referencia);
}

/** Valida uma data civil estrita e devolve a própria chave YYYY-MM-DD. */
export function validarDataLocalHabitos(data: string): string {
  const partes = DATA_LOCAL.exec(data);
  if (!partes) throw new Error("Use uma data no formato YYYY-MM-DD.");
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    dataUtc.getUTCFullYear() !== ano ||
    dataUtc.getUTCMonth() !== mes - 1 ||
    dataUtc.getUTCDate() !== dia
  ) {
    throw new Error("A data informada é inválida.");
  }
  return data;
}

function timestampDataLocal(data: string): number {
  validarDataLocalHabitos(data);
  const partes = DATA_LOCAL.exec(data);
  if (!partes) throw new Error("A data informada é inválida.");
  return Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
}

function diferencaDias(primeira: string, segunda: string): number {
  return Math.round(
    (timestampDataLocal(segunda) - timestampDataLocal(primeira)) / MILISSEGUNDOS_DIA,
  );
}

export function normalizarConfiguracaoHabitos(
  input: ConfiguracaoHabitosInput = {},
  base?: ConfiguracaoHabitosSnapshot,
): ConfiguracaoHabitosSnapshot {
  const metasBase = base?.metas ?? METAS_HABITOS_PADRAO;
  const metas = input.metas ?? {};
  const habitosAtivos = normalizarHabitosAtivos(
    input.habitosAtivos ?? base?.habitosAtivos ?? [...HABITOS_DIARIOS],
  );

  return {
    habitosAtivos,
    metas: {
      aguaMl: normalizarNumero(
        metas.aguaMl ?? metasBase.aguaMl,
        "A meta de água",
        250,
        10_000,
      ),
      passos: normalizarNumero(
        metas.passos ?? metasBase.passos,
        "A meta de passos",
        500,
        100_000,
      ),
      sonoHoras: normalizarNumero(
        metas.sonoHoras ?? metasBase.sonoHoras,
        "A meta de sono",
        1,
        24,
        1,
      ),
      alongamentoMinutos: normalizarNumero(
        metas.alongamentoMinutos ?? metasBase.alongamentoMinutos,
        "A meta de alongamento",
        1,
        240,
      ),
      cardioMinutos: normalizarNumero(
        metas.cardioMinutos ?? metasBase.cardioMinutos,
        "A meta de cardio",
        1,
        600,
      ),
      adesaoAlimentarPercentual: normalizarNumero(
        metas.adesaoAlimentarPercentual ?? metasBase.adesaoAlimentarPercentual,
        "A meta de adesão alimentar",
        1,
        100,
      ),
    },
  };
}

/**
 * Normaliza valores informados pelo aluno. Números não finitos são rejeitados;
 * valores fora da faixa física do dia são limitados e arredondados explicitamente.
 */
export function normalizarValoresHabitos(
  valores: ValoresHabitosDiarios = {},
): ValoresHabitosDiarios {
  const normalizados: ValoresHabitosDiarios = {};
  if (valores.aguaMl !== undefined) {
    normalizados.aguaMl = normalizarNumero(valores.aguaMl, "A água consumida", 0, 20_000);
  }
  if (valores.passos !== undefined) {
    normalizados.passos = normalizarNumero(valores.passos, "Os passos", 0, 100_000);
  }
  if (valores.sonoHoras !== undefined) {
    normalizados.sonoHoras = normalizarNumero(valores.sonoHoras, "O sono", 0, 24, 1);
  }
  if (valores.alongamentoMinutos !== undefined) {
    normalizados.alongamentoMinutos = normalizarNumero(
      valores.alongamentoMinutos,
      "O alongamento",
      0,
      1_440,
    );
  }
  if (valores.cardioMinutos !== undefined) {
    normalizados.cardioMinutos = normalizarNumero(
      valores.cardioMinutos,
      "O cardio",
      0,
      1_440,
    );
  }
  if (valores.adesaoAlimentarPercentual !== undefined) {
    normalizados.adesaoAlimentarPercentual = normalizarNumero(
      valores.adesaoAlimentarPercentual,
      "A adesão alimentar",
      0,
      100,
    );
  }
  return normalizados;
}

function progresso(
  habito: HabitoDiario,
  ativo: boolean,
  valor: number | undefined,
  meta: number,
): ProgressoHabito {
  const percentual = arredondar(Math.min(100, ((valor ?? 0) / meta) * 100), 1);
  return {
    habito,
    ativo,
    valor: valor ?? null,
    meta,
    percentual,
    atingido: ativo && valor !== undefined && valor >= meta,
  };
}

export function resumoHabitosDoDia(
  registro: Pick<
    RegistroHabitosDiario,
    "data" | "valores" | "configuracaoSnapshot"
  > | null = null,
  configuracaoAtual: ConfiguracaoHabitosSnapshot = normalizarConfiguracaoHabitos(),
  data: string = dataLocalHoje(),
): ResumoHabitosDia {
  const dataResumo = validarDataLocalHabitos(registro?.data ?? data);
  const configuracao = registro
    ? normalizarConfiguracaoHabitos(registro.configuracaoSnapshot)
    : normalizarConfiguracaoHabitos(configuracaoAtual);
  const valores = normalizarValoresHabitos(registro?.valores);
  const ativo = (habito: HabitoDiario) => configuracao.habitosAtivos.includes(habito);

  const progressoPorHabito: Record<HabitoDiario, ProgressoHabito> = {
    agua: progresso("agua", ativo("agua"), valores.aguaMl, configuracao.metas.aguaMl),
    passos: progresso("passos", ativo("passos"), valores.passos, configuracao.metas.passos),
    sono: progresso("sono", ativo("sono"), valores.sonoHoras, configuracao.metas.sonoHoras),
    alongamento: progresso(
      "alongamento",
      ativo("alongamento"),
      valores.alongamentoMinutos,
      configuracao.metas.alongamentoMinutos,
    ),
    cardio: progresso(
      "cardio",
      ativo("cardio"),
      valores.cardioMinutos,
      configuracao.metas.cardioMinutos,
    ),
    alimentacao: progresso(
      "alimentacao",
      ativo("alimentacao"),
      valores.adesaoAlimentarPercentual,
      configuracao.metas.adesaoAlimentarPercentual,
    ),
  };
  const progressosAtivos = HABITOS_DIARIOS.map((habito) => progressoPorHabito[habito]).filter(
    (item) => item.ativo,
  );
  const metasAtingidas = progressosAtivos.filter((item) => item.atingido).length;
  const totalHabitosAtivos = progressosAtivos.length;
  const percentualGeral =
    totalHabitosAtivos === 0
      ? 0
      : arredondar(
          progressosAtivos.reduce((total, item) => total + item.percentual, 0) /
            totalHabitosAtivos,
          1,
        );

  return {
    data: dataResumo,
    progressoPorHabito,
    totalHabitosAtivos,
    metasAtingidas,
    percentualGeral,
    completo: totalHabitosAtivos > 0 && metasAtingidas === totalHabitosAtivos,
  };
}

function calcularSequencia(datasConcluidas: ReadonlySet<string>, hoje: string): SequenciaHabito {
  const datas = [...datasConcluidas].filter((data) => data <= hoje).sort();
  let melhor = 0;
  let corrida = 0;
  let anterior: string | undefined;

  for (const data of datas) {
    corrida = anterior !== undefined && diferencaDias(anterior, data) === 1 ? corrida + 1 : 1;
    melhor = Math.max(melhor, corrida);
    anterior = data;
  }

  // O dia ainda em andamento não quebra a sequência: se hoje não foi concluído,
  // a contagem atual pode terminar ontem.
  let cursor = datasConcluidas.has(hoje) ? hoje : somarDias(hoje, -1);
  let atual = 0;
  while (datasConcluidas.has(cursor)) {
    atual += 1;
    cursor = somarDias(cursor, -1);
  }

  return { atual, melhor };
}

export function calcularSequenciasHabitos(
  registros: readonly RegistroHabitosDiario[],
  hoje: Date | string = new Date(),
): SequenciasHabitos {
  const dataHoje =
    typeof hoje === "string" ? validarDataLocalHabitos(hoje) : dataLocalHoje(hoje);
  const alunoIds = new Set(registros.map((registro) => registro.alunoId));
  if (alunoIds.size > 1) {
    throw new Error("Calcule sequências com registros de apenas um aluno por vez.");
  }

  const datasVistas = new Set<string>();
  const datasGlobais = new Set<string>();
  const datasPorHabito: Record<HabitoDiario, Set<string>> = {
    agua: new Set<string>(),
    passos: new Set<string>(),
    sono: new Set<string>(),
    alongamento: new Set<string>(),
    cardio: new Set<string>(),
    alimentacao: new Set<string>(),
  };

  for (const registro of registros) {
    const data = validarDataLocalHabitos(registro.data);
    if (datasVistas.has(data)) {
      throw new Error(`Existe mais de um registro de hábitos em ${data}.`);
    }
    datasVistas.add(data);
    if (data > dataHoje) continue;

    const resumo = resumoHabitosDoDia(registro);
    if (resumo.completo) datasGlobais.add(data);
    for (const habito of HABITOS_DIARIOS) {
      const item = resumo.progressoPorHabito[habito];
      if (item.ativo && item.atingido) datasPorHabito[habito].add(data);
    }
  }

  return {
    hoje: dataHoje,
    global: calcularSequencia(datasGlobais, dataHoje),
    porHabito: {
      agua: calcularSequencia(datasPorHabito.agua, dataHoje),
      passos: calcularSequencia(datasPorHabito.passos, dataHoje),
      sono: calcularSequencia(datasPorHabito.sono, dataHoje),
      alongamento: calcularSequencia(datasPorHabito.alongamento, dataHoje),
      cardio: calcularSequencia(datasPorHabito.cardio, dataHoje),
      alimentacao: calcularSequencia(datasPorHabito.alimentacao, dataHoje),
    },
  };
}
