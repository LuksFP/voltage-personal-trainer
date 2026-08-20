import type { StoreData } from "./store";
import type {
  CheckinSemanal,
  HabitoDiario,
  HistoricoExercicio,
  NivelDor,
  RegistroHabitosDiario,
} from "./types";
import { resumoHabitosDoDia } from "./habitos";
import { chaveExercicio } from "./progressao";
import { seriesDeTrabalho } from "./historico-exercicios";
import { dataUtc, paraIso } from "./data";
import { inicioDaSemana, somarDias } from "./data";

const ORDEM_HABITOS: HabitoDiario[] = [
  "agua",
  "passos",
  "sono",
  "alongamento",
  "cardio",
  "alimentacao",
];

export type PrioridadeAlertaSemanal = "alta" | "media" | "baixa";
export type TipoAlertaSemanal =
  | "dor"
  | "recuperacao"
  | "frequencia"
  | "registro"
  | "revisao";
export type DirecaoComparacao = "subiu" | "caiu" | "estavel" | "sem-base";

export interface PeriodoRelatorioSemanal {
  inicio: string;
  fim: string;
  fimEfetivo: string;
  diasConsiderados: number;
  parcial: boolean;
}

export interface CoberturaRelatorio {
  informados: number;
  total: number;
  percentual: number;
}

export interface MetricasSessoesSemanais {
  realizadas: number;
  faltas: number;
  canceladas: number;
  agendadasPassadas: number;
  comparecimentoPercentual: number | null;
  duracao: {
    totalMinutos: number | null;
    mediaMinutos: number | null;
    cobertura: CoberturaRelatorio;
  };
}

export interface MetricasTreinoSemanais {
  registrosExercicios: number;
  registrosDetalhados: number;
  coberturaDetalhamentoPercentual: number;
  seriesTrabalho: number;
  exerciciosDistintos: number;
  rpeMedio: number | null;
  volumeExterno: {
    kg: number | null;
    seriesComVolume: number;
    cobertura: CoberturaRelatorio;
  };
}

export interface BemEstarSemanal {
  respondido: boolean;
  energia: number | null;
  sono: number | null;
  horasSono: number | null;
  estresse: number | null;
  alimentacao: number | null;
  dor: NivelDor | null;
  localDor: string | null;
  pesoKg: number | null;
  observacoes: string | null;
  revisado: boolean;
}

export interface ProgressoHabitoSemanal {
  habito: HabitoDiario;
  diasAtivos: number;
  diasRegistrados: number;
  diasAtingidos: number;
  percentualMedio: number | null;
}

export interface MetricasHabitosSemanais {
  diasNoPeriodo: number;
  diasRegistrados: number;
  coberturaPercentual: number;
  diasCompletos: number;
  percentualGeralMedio: number | null;
  porHabito: Record<HabitoDiario, ProgressoHabitoSemanal>;
}

export interface RecordeE1RMSemanal {
  chave: string;
  nome: string;
  data: string;
  e1rmKg: number;
  anteriorKg: number | null;
  ganhoKg: number | null;
  primeiraMarca: boolean;
}

export interface AlertaRelatorioSemanal {
  id: string;
  tipo: TipoAlertaSemanal;
  prioridade: PrioridadeAlertaSemanal;
  titulo: string;
  descricao: string;
  visivelAluno: boolean;
}

export interface ComparacaoMetricaSemanal {
  atual: number | null;
  anterior: number | null;
  delta: number | null;
  variacaoPercentual: number | null;
  direcao: DirecaoComparacao;
}

export interface ComparacaoRelatorioSemanal {
  periodoAnterior: { inicio: string; fim: string };
  treinosRealizados: ComparacaoMetricaSemanal;
  comparecimento: ComparacaoMetricaSemanal;
  volumeExterno: ComparacaoMetricaSemanal;
  seriesTrabalho: ComparacaoMetricaSemanal;
  rpeMedio: ComparacaoMetricaSemanal;
}

export interface RelatorioSemanal {
  versaoRegra: 1;
  aluno: { id: string; nome: string };
  referencia: string;
  periodo: PeriodoRelatorioSemanal;
  sessoes: MetricasSessoesSemanais;
  treino: MetricasTreinoSemanais;
  bemEstar: BemEstarSemanal;
  habitos: MetricasHabitosSemanais;
  recordesE1RM: RecordeE1RMSemanal[];
  alertas: AlertaRelatorioSemanal[];
  comparacao: ComparacaoRelatorioSemanal;
  textos: { personal: string; aluno: string; whatsapp: string };
}

type ColecoesRelatorio = Pick<
  StoreData,
  | "alunos"
  | "sessoes"
  | "historicoExercicios"
  | "checkinsSemanais"
  | "configuracoesHabitos"
  | "registrosHabitos"
  | "videosExecucao"
  | "solicitacoesSubstituicao"
>;

export type EntradaRelatorioSemanal = ColecoesRelatorio & {
  alunoId: string;
  semanaInicio?: string;
  hoje?: Date | string;
};

function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function dataLocalHoje(referencia: Date | string = new Date()): string {
  if (typeof referencia === "string") {
    dataUtc(referencia);
    return referencia;
  }
  if (Number.isNaN(referencia.getTime())) throw new Error("A data de referência é inválida.");
  return paraIso(referencia);
}

function diferencaDias(inicio: string, fim: string): number {
  return Math.round((dataUtc(fim).getTime() - dataUtc(inicio).getTime()) / 86_400_000);
}

export function semanaPadraoRelatorioSemanal(hoje: Date | string = new Date()): string {
  return somarDias(inicioDaSemana(dataLocalHoje(hoje)), -7);
}

export function semanaAnteriorRelatorio(semanaInicio: string): string {
  validarSegunda(semanaInicio);
  return somarDias(semanaInicio, -7);
}

function validarSegunda(data: string): void {
  if (dataUtc(data).getUTCDay() !== 1) {
    throw new Error("A semana do relatório deve começar em uma segunda-feira.");
  }
}

function criarPeriodo(semanaInicio: string, hoje: string): PeriodoRelatorioSemanal {
  validarSegunda(semanaInicio);
  const fim = somarDias(semanaInicio, 6);
  if (semanaInicio > hoje) throw new Error("Não é possível gerar um relatório de uma semana futura.");
  const fimEfetivo = fim > hoje ? hoje : fim;
  return {
    inicio: semanaInicio,
    fim,
    fimEfetivo,
    diasConsiderados: diferencaDias(semanaInicio, fimEfetivo) + 1,
    parcial: fim > hoje,
  };
}

function noPeriodo(data: string, periodo: PeriodoRelatorioSemanal): boolean {
  return data >= periodo.inicio && data <= periodo.fimEfetivo;
}

function cobertura(informados: number, total: number): CoberturaRelatorio {
  return {
    informados,
    total,
    percentual: total === 0 ? 0 : arredondar((informados / total) * 100),
  };
}

function metricasSessoes(
  input: EntradaRelatorioSemanal,
  periodo: PeriodoRelatorioSemanal,
  hoje: string,
): MetricasSessoesSemanais {
  const sessoes = input.sessoes.filter(
    (sessao) => sessao.alunoId === input.alunoId && noPeriodo(sessao.data, periodo),
  );
  const realizadas = sessoes.filter((sessao) => sessao.status === "realizada");
  const faltas = sessoes.filter((sessao) => sessao.status === "faltou").length;
  const canceladas = sessoes.filter((sessao) => sessao.status === "cancelada").length;
  const agendadasPassadas = sessoes.filter(
    (sessao) => sessao.status === "agendada" && sessao.data < hoje,
  ).length;
  const duracoes = realizadas
    .map((sessao) => sessao.duracaoMin)
    .filter((valor): valor is number => valor !== undefined && Number.isFinite(valor));
  const totalDuracao = duracoes.reduce((total, valor) => total + valor, 0);
  const baseComparecimento = realizadas.length + faltas;
  return {
    realizadas: realizadas.length,
    faltas,
    canceladas,
    agendadasPassadas,
    comparecimentoPercentual:
      baseComparecimento === 0 ? null : arredondar((realizadas.length / baseComparecimento) * 100),
    duracao: {
      totalMinutos: duracoes.length === 0 ? null : arredondar(totalDuracao),
      mediaMinutos: duracoes.length === 0 ? null : arredondar(totalDuracao / duracoes.length),
      cobertura: cobertura(duracoes.length, realizadas.length),
    },
  };
}

function historicosDoPeriodo(
  input: EntradaRelatorioSemanal,
  periodo: PeriodoRelatorioSemanal,
): HistoricoExercicio[] {
  const porId = new Map<string, HistoricoExercicio>();
  for (const historico of input.historicoExercicios) {
    if (historico.alunoId !== input.alunoId || !noPeriodo(historico.data, periodo)) continue;
    const atual = porId.get(historico.id);
    if (!atual || historico.criadoEm > atual.criadoEm) porId.set(historico.id, historico);
  }
  return [...porId.values()];
}

function metricasTreino(historicos: HistoricoExercicio[]): MetricasTreinoSemanais {
  const detalhados = historicos.filter((historico) => historico.formato === "por-serie");
  const series = detalhados.flatMap(seriesDeTrabalho);
  const seriesComVolume = series.filter(
    (serie) => serie.resultado.metrica === "repeticoes" && serie.carga.modo === "externa",
  );
  const volume = seriesComVolume.reduce((total, serie) => {
    if (serie.resultado.metrica !== "repeticoes" || serie.carga.modo !== "externa") return total;
    return total + serie.resultado.repeticoes * serie.carga.valorKg;
  }, 0);
  return {
    registrosExercicios: historicos.length,
    registrosDetalhados: detalhados.length,
    coberturaDetalhamentoPercentual:
      historicos.length === 0 ? 0 : arredondar((detalhados.length / historicos.length) * 100),
    seriesTrabalho: series.length,
    exerciciosDistintos: new Set(historicos.map(chaveExercicio)).size,
    rpeMedio: (() => {
      const comRpe = series.filter(
        (serie): serie is (typeof series)[number] & { rpe: number } => serie.rpe != null,
      );
      return comRpe.length === 0
        ? null
        : arredondar(comRpe.reduce((total, serie) => total + serie.rpe, 0) / comRpe.length);
    })(),
    volumeExterno: {
      kg: seriesComVolume.length === 0 ? null : arredondar(volume),
      seriesComVolume: seriesComVolume.length,
      cobertura: cobertura(seriesComVolume.length, series.length),
    },
  };
}

function checkinDaSemana(
  checkins: CheckinSemanal[],
  alunoId: string,
  semanaInicio: string,
): CheckinSemanal | undefined {
  return checkins
    .filter((checkin) => checkin.alunoId === alunoId && checkin.semanaInicio === semanaInicio)
    .sort((a, b) => b.respondidoEm.localeCompare(a.respondidoEm))[0];
}

function bemEstar(checkin?: CheckinSemanal): BemEstarSemanal {
  return {
    respondido: Boolean(checkin),
    energia: checkin?.energia ?? null,
    sono: checkin?.sono ?? null,
    horasSono: checkin?.horasSono ?? null,
    estresse: checkin?.estresse ?? null,
    alimentacao: checkin?.alimentacao ?? null,
    dor: checkin?.dor ?? null,
    localDor: checkin?.localDor ?? null,
    pesoKg: checkin?.pesoKg ?? null,
    observacoes: checkin?.observacoes ?? null,
    revisado: Boolean(checkin?.revisadoEm),
  };
}

function registrosHabitosUnicos(
  registros: RegistroHabitosDiario[],
  alunoId: string,
  periodo: PeriodoRelatorioSemanal,
): RegistroHabitosDiario[] {
  const porData = new Map<string, RegistroHabitosDiario>();
  for (const registro of registros) {
    if (registro.alunoId !== alunoId || !noPeriodo(registro.data, periodo)) continue;
    const atual = porData.get(registro.data);
    if (!atual || registro.atualizadoEm > atual.atualizadoEm) porData.set(registro.data, registro);
  }
  return [...porData.values()].sort((a, b) => a.data.localeCompare(b.data));
}

function metricasHabitos(
  registros: RegistroHabitosDiario[],
  diasNoPeriodo: number,
): MetricasHabitosSemanais {
  const resumos = registros.map((registro) => resumoHabitosDoDia(registro));
  const porHabito = Object.fromEntries(
    ORDEM_HABITOS.map((habito) => {
      const ativos = resumos
        .map((resumo) => resumo.progressoPorHabito[habito])
        .filter((item) => item.ativo);
      const valor: ProgressoHabitoSemanal = {
        habito,
        diasAtivos: ativos.length,
        diasRegistrados: ativos.filter((item) => item.valor !== null).length,
        diasAtingidos: ativos.filter((item) => item.atingido).length,
        percentualMedio:
          ativos.length === 0
            ? null
            : arredondar(ativos.reduce((total, item) => total + item.percentual, 0) / ativos.length),
      };
      return [habito, valor];
    }),
  ) as Record<HabitoDiario, ProgressoHabitoSemanal>;
  return {
    diasNoPeriodo,
    diasRegistrados: registros.length,
    coberturaPercentual:
      diasNoPeriodo === 0 ? 0 : arredondar((registros.length / diasNoPeriodo) * 100),
    diasCompletos: resumos.filter((resumo) => resumo.completo).length,
    percentualGeralMedio:
      resumos.length === 0
        ? null
        : arredondar(
            resumos.reduce((total, resumo) => total + resumo.percentualGeral, 0) / resumos.length,
          ),
    porHabito,
  };
}

function melhorE1RM(historico: HistoricoExercicio): number | null {
  if (historico.formato !== "por-serie") return null;
  const valores = seriesDeTrabalho(historico)
    .filter(
      (serie) =>
        serie.resultado.metrica === "repeticoes" && serie.carga.modo === "externa",
    )
    .map((serie) => {
      if (serie.resultado.metrica !== "repeticoes" || serie.carga.modo !== "externa") return 0;
      return serie.carga.valorKg * (1 + serie.resultado.repeticoes / 30);
    });
  return valores.length === 0 ? null : Math.max(...valores);
}

function calcularRecordes(
  historicos: HistoricoExercicio[],
  alunoId: string,
  periodo: PeriodoRelatorioSemanal,
): RecordeE1RMSemanal[] {
  const anteriores = new Map<string, number>();
  const semana = new Map<
    string,
    { chave: string; nome: string; data: string; e1rmKg: number }
  >();
  for (const historico of historicos) {
    if (historico.alunoId !== alunoId || historico.data > periodo.fimEfetivo) continue;
    const e1rm = melhorE1RM(historico);
    if (e1rm === null) continue;
    const chave = chaveExercicio(historico);
    if (historico.data < periodo.inicio) {
      anteriores.set(chave, Math.max(anteriores.get(chave) ?? 0, e1rm));
      continue;
    }
    if (!noPeriodo(historico.data, periodo)) continue;
    const atual = semana.get(chave);
    if (!atual || e1rm > atual.e1rmKg || (e1rm === atual.e1rmKg && historico.data < atual.data)) {
      semana.set(chave, { chave, nome: historico.nome, data: historico.data, e1rmKg: e1rm });
    }
  }
  return [...semana.values()]
    .map((item): RecordeE1RMSemanal | null => {
      const anterior = anteriores.get(item.chave) ?? null;
      if (anterior !== null && item.e1rmKg <= anterior + 0.05) return null;
      return {
        ...item,
        e1rmKg: arredondar(item.e1rmKg),
        anteriorKg: anterior === null ? null : arredondar(anterior),
        ganhoKg: anterior === null ? null : arredondar(item.e1rmKg - anterior),
        primeiraMarca: anterior === null,
      };
    })
    .filter((item): item is RecordeE1RMSemanal => item !== null)
    .sort(
      (a, b) =>
        (b.ganhoKg ?? 0) - (a.ganhoKg ?? 0) ||
        b.e1rmKg - a.e1rmKg ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

function alertasSemanais(
  input: EntradaRelatorioSemanal,
  periodo: PeriodoRelatorioSemanal,
  sessoes: MetricasSessoesSemanais,
  treino: MetricasTreinoSemanais,
  bem: BemEstarSemanal,
): AlertaRelatorioSemanal[] {
  const alertas: AlertaRelatorioSemanal[] = [];
  const sessoesPeriodo = input.sessoes.filter(
    (sessao) => sessao.alunoId === input.alunoId && noPeriodo(sessao.data, periodo),
  );
  const doresSessao = sessoesPeriodo
    .map((sessao) => sessao.feedback)
    .filter((feedback) => feedback && feedback.dor !== "Sem dor")
    .map((feedback) => feedback?.dor);
  const trocasPorDor = input.solicitacoesSubstituicao.filter(
    (item) =>
      item.alunoId === input.alunoId &&
      item.motivo === "dor" &&
      item.criadoEm.slice(0, 10) >= periodo.inicio &&
      item.criadoEm.slice(0, 10) <= periodo.fimEfetivo,
  );
  const dorForte = bem.dor === "Forte" || doresSessao.includes("Forte");
  const dorModerada = bem.dor === "Moderada" || doresSessao.includes("Moderada");
  if (dorForte || dorModerada || trocasPorDor.length > 0) {
    const local = bem.localDor ? ` em ${bem.localDor}` : "";
    alertas.push({
      id: "dor",
      tipo: "dor",
      prioridade: dorForte || trocasPorDor.length > 0 ? "alta" : "media",
      titulo: dorForte ? "Dor forte relatada" : "Dor pede acompanhamento",
      descricao: `Houve relato de dor${local}. Converse antes do próximo treino e ajuste o plano se necessário.`,
      visivelAluno: true,
    });
  }
  if (bem.energia !== null && bem.energia <= 2) {
    alertas.push({
      id: "energia",
      tipo: "recuperacao",
      prioridade: "media",
      titulo: "Energia baixa",
      descricao: `Energia informada em ${bem.energia}/5 no check-in da semana.`,
      visivelAluno: true,
    });
  }
  if ((bem.sono !== null && bem.sono <= 2) || (bem.horasSono !== null && bem.horasSono < 6)) {
    alertas.push({
      id: "sono",
      tipo: "recuperacao",
      prioridade: "media",
      titulo: "Sono abaixo do combinado",
      descricao: `O registro de sono merece contexto antes de aumentar a exigência do treino.`,
      visivelAluno: true,
    });
  }
  if (bem.estresse !== null && bem.estresse >= 4) {
    alertas.push({
      id: "estresse",
      tipo: "recuperacao",
      prioridade: "media",
      titulo: "Estresse elevado",
      descricao: `Estresse informado em ${bem.estresse}/5 no check-in.`,
      visivelAluno: true,
    });
  }
  if (sessoes.faltas > 0) {
    alertas.push({
      id: "faltas",
      tipo: "frequencia",
      prioridade: "media",
      titulo: `${sessoes.faltas} falta${sessoes.faltas === 1 ? "" : "s"} na semana`,
      descricao: "Vale entender a causa e ajustar a rotina ou a agenda.",
      visivelAluno: true,
    });
  }
  if (sessoes.agendadasPassadas > 0) {
    alertas.push({
      id: "sem-baixa",
      tipo: "registro",
      prioridade: "media",
      titulo: "Sessão passada sem baixa",
      descricao: `${sessoes.agendadasPassadas} sessão agendada já passou e ainda precisa de status.`,
      visivelAluno: false,
    });
  }
  if (treino.rpeMedio !== null && treino.rpeMedio >= 9.3 && treino.seriesTrabalho >= 3) {
    alertas.push({
      id: "rpe",
      tipo: "recuperacao",
      prioridade: "media",
      titulo: "Esforço médio muito alto",
      descricao: `RPE médio ${treino.rpeMedio.toLocaleString("pt-BR")} nas séries registradas.`,
      visivelAluno: true,
    });
  }
  if (!bem.respondido && !periodo.parcial) {
    alertas.push({
      id: "sem-checkin",
      tipo: "registro",
      prioridade: "baixa",
      titulo: "Check-in não respondido",
      descricao: "A semana fechou sem respostas de energia, sono, estresse e dor.",
      visivelAluno: true,
    });
  } else if (bem.respondido && !bem.revisado) {
    alertas.push({
      id: "revisar-checkin",
      tipo: "revisao",
      prioridade: "baixa",
      titulo: "Check-in aguardando revisão",
      descricao: "As respostas do aluno ainda não foram marcadas como revisadas.",
      visivelAluno: false,
    });
  }
  const videosPendentes = input.videosExecucao.filter(
    (video) =>
      video.alunoId === input.alunoId &&
      video.status === "pendente" &&
      video.criadoEm.slice(0, 10) <= periodo.fimEfetivo,
  ).length;
  if (videosPendentes > 0) {
    alertas.push({
      id: "videos",
      tipo: "revisao",
      prioridade: "baixa",
      titulo: "Vídeo aguardando revisão",
      descricao: `${videosPendentes} vídeo${videosPendentes === 1 ? "" : "s"} de execução pendente${videosPendentes === 1 ? "" : "s"}.`,
      visivelAluno: false,
    });
  }
  const ordem: Record<PrioridadeAlertaSemanal, number> = { alta: 0, media: 1, baixa: 2 };
  return alertas.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade] || a.id.localeCompare(b.id));
}

function comparar(atual: number | null, anterior: number | null): ComparacaoMetricaSemanal {
  if (atual === null || anterior === null) {
    return { atual, anterior, delta: null, variacaoPercentual: null, direcao: "sem-base" };
  }
  const delta = arredondar(atual - anterior);
  return {
    atual,
    anterior,
    delta,
    variacaoPercentual: anterior === 0 ? null : arredondar((delta / Math.abs(anterior)) * 100),
    direcao: Math.abs(delta) < 0.05 ? "estavel" : delta > 0 ? "subiu" : "caiu",
  };
}

function formatarNumero(valor: number, casas = 0): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarVolume(kg: number): string {
  return kg >= 1000 ? `${formatarNumero(kg / 1000, 1)} t` : `${formatarNumero(kg)} kg`;
}

function periodoPorExtenso(inicio: string, fim: string): string {
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const i = dataUtc(inicio);
  const f = dataUtc(fim);
  const diaI = i.getUTCDate();
  const diaF = f.getUTCDate();
  const mesI = meses[i.getUTCMonth()];
  const mesF = meses[f.getUTCMonth()];
  return i.getUTCMonth() === f.getUTCMonth()
    ? `${diaI} a ${diaF} de ${mesF}`
    : `${diaI} de ${mesI} a ${diaF} de ${mesF}`;
}

function trechoComparacao(comparacao: ComparacaoRelatorioSemanal): string | null {
  const partes: string[] = [];
  if (comparacao.treinosRealizados.delta !== null && comparacao.treinosRealizados.delta !== 0) {
    const delta = comparacao.treinosRealizados.delta;
    partes.push(`${delta > 0 ? "+" : ""}${formatarNumero(delta)} treino${Math.abs(delta) === 1 ? "" : "s"}`);
  }
  if (comparacao.comparecimento.delta !== null && comparacao.comparecimento.delta !== 0) {
    const delta = comparacao.comparecimento.delta;
    partes.push(`${delta > 0 ? "+" : ""}${formatarNumero(delta)} p.p. de comparecimento`);
  }
  if (
    comparacao.volumeExterno.variacaoPercentual !== null &&
    comparacao.volumeExterno.variacaoPercentual !== 0
  ) {
    const valor = comparacao.volumeExterno.variacaoPercentual;
    partes.push(`${valor > 0 ? "+" : ""}${formatarNumero(valor)}% de volume`);
  }
  return partes.length === 0 ? null : `Em relação à semana anterior: ${partes.join(", ")}.`;
}

function montarTextos(
  alunoNome: string,
  periodo: PeriodoRelatorioSemanal,
  sessoes: MetricasSessoesSemanais,
  treino: MetricasTreinoSemanais,
  bem: BemEstarSemanal,
  habitos: MetricasHabitosSemanais,
  recordes: RecordeE1RMSemanal[],
  alertas: AlertaRelatorioSemanal[],
  comparacao: ComparacaoRelatorioSemanal,
): RelatorioSemanal["textos"] {
  const abertura = `Semana de ${periodoPorExtenso(periodo.inicio, periodo.fim)}${periodo.parcial ? " (parcial)" : ""}.`;
  const presenca =
    sessoes.realizadas === 0
      ? "Nenhum treino foi marcado como realizado."
      : `${sessoes.realizadas} treino${sessoes.realizadas === 1 ? "" : "s"} realizado${sessoes.realizadas === 1 ? "" : "s"}${
          sessoes.comparecimentoPercentual === null
            ? ""
            : ` e ${formatarNumero(sessoes.comparecimentoPercentual)}% de comparecimento`
        }.`;
  const carga: string[] = [];
  if (treino.seriesTrabalho > 0) carga.push(`${treino.seriesTrabalho} séries de trabalho`);
  if (treino.volumeExterno.kg !== null) carga.push(`${formatarVolume(treino.volumeExterno.kg)} de volume externo`);
  if (treino.rpeMedio !== null) carga.push(`RPE médio ${formatarNumero(treino.rpeMedio, 1)}`);
  const trechoCarga = carga.length > 0 ? `${carga.join(", ")}.` : null;
  const trechoComparar = trechoComparacao(comparacao);
  const trechoBem = bem.respondido
    ? `No check-in: energia ${bem.energia}/5, sono ${bem.sono}/5 e estresse ${bem.estresse}/5${
        bem.dor && bem.dor !== "Sem dor" ? `; dor ${bem.dor.toLocaleLowerCase("pt-BR")}${bem.localDor ? ` em ${bem.localDor}` : ""}` : ""
      }.`
    : null;
  const trechoHabitos =
    habitos.diasRegistrados > 0
      ? `Hábitos registrados em ${habitos.diasRegistrados} de ${habitos.diasNoPeriodo} dias, com ${habitos.diasCompletos} dia${habitos.diasCompletos === 1 ? "" : "s"} completo${habitos.diasCompletos === 1 ? "" : "s"}.`
      : null;
  const recordesTexto = recordes.slice(0, 2).map(
    (recorde) => `${recorde.nome}: e1RM ${formatarNumero(recorde.e1rmKg, 1)} kg`,
  );
  const trechoRecorde =
    recordesTexto.length === 0
      ? null
      : `${recordes.length === 1 ? "Novo recorde" : "Novos recordes"}: ${recordesTexto.join("; ")}${recordes.length > 2 ? ` e mais ${recordes.length - 2}` : ""}.`;
  const alertasAluno = alertas.filter(
    (alerta) => alerta.visivelAluno && (alerta.prioridade === "alta" || alerta.prioridade === "media"),
  );
  const atencaoAluno =
    alertasAluno.length === 0
      ? null
      : `Ponto de atenção: ${alertasAluno
          .slice(0, 2)
          .map((alerta) => alerta.descricao)
          .join(" ")}`;
  const atencaoPersonal =
    alertas.length === 0
      ? "Sem pontos de atenção automáticos nesta semana."
      : `Pontos de atenção: ${alertas
          .slice(0, 3)
          .map((alerta) => alerta.titulo)
          .join("; ")}.`;
  const base = [abertura, presenca, trechoCarga, trechoComparar, trechoBem, trechoHabitos, trechoRecorde];
  const aluno = [...base, atencaoAluno].filter(Boolean).join(" ");
  const personal = [`${abertura} ${alunoNome}:`, ...base.slice(1), atencaoPersonal]
    .filter(Boolean)
    .join(" ");
  const primeiroNome = alunoNome.split(" ")[0];
  return {
    personal,
    aluno,
    whatsapp: `Oi ${primeiroNome}! Seu resumo semanal do Voltage está pronto:\n\n${aluno}`,
  };
}

interface CalculoBase {
  periodo: PeriodoRelatorioSemanal;
  sessoes: MetricasSessoesSemanais;
  treino: MetricasTreinoSemanais;
  bemEstar: BemEstarSemanal;
  habitos: MetricasHabitosSemanais;
  recordesE1RM: RecordeE1RMSemanal[];
  alertas: AlertaRelatorioSemanal[];
}

function calcularBase(
  input: EntradaRelatorioSemanal,
  semanaInicio: string,
  hoje: string,
): CalculoBase {
  const periodo = criarPeriodo(semanaInicio, hoje);
  const sessoes = metricasSessoes(input, periodo, hoje);
  const historicos = historicosDoPeriodo(input, periodo);
  const treino = metricasTreino(historicos);
  const bem = bemEstar(checkinDaSemana(input.checkinsSemanais, input.alunoId, periodo.inicio));
  const registros = registrosHabitosUnicos(input.registrosHabitos, input.alunoId, periodo);
  const habitos = metricasHabitos(registros, periodo.diasConsiderados);
  const recordesE1RM = calcularRecordes(
    input.historicoExercicios,
    input.alunoId,
    periodo,
  );
  const alertas = alertasSemanais(input, periodo, sessoes, treino, bem);
  return { periodo, sessoes, treino, bemEstar: bem, habitos, recordesE1RM, alertas };
}

export function gerarRelatorioSemanal(input: EntradaRelatorioSemanal): RelatorioSemanal {
  const aluno = input.alunos.find((item) => item.id === input.alunoId);
  if (!aluno) throw new Error("Aluno do relatório semanal não encontrado.");
  const hoje = dataLocalHoje(input.hoje ?? new Date());
  const semanaInicio = input.semanaInicio ?? semanaPadraoRelatorioSemanal(hoje);
  const atual = calcularBase(input, semanaInicio, hoje);
  const anteriorInicio = semanaAnteriorRelatorio(semanaInicio);
  const anterior = calcularBase(input, anteriorInicio, hoje);
  const comparacao: ComparacaoRelatorioSemanal = {
    periodoAnterior: { inicio: anterior.periodo.inicio, fim: anterior.periodo.fim },
    treinosRealizados: comparar(atual.sessoes.realizadas, anterior.sessoes.realizadas),
    comparecimento: comparar(
      atual.sessoes.comparecimentoPercentual,
      anterior.sessoes.comparecimentoPercentual,
    ),
    volumeExterno: comparar(atual.treino.volumeExterno.kg, anterior.treino.volumeExterno.kg),
    seriesTrabalho: comparar(atual.treino.seriesTrabalho, anterior.treino.seriesTrabalho),
    rpeMedio: comparar(atual.treino.rpeMedio, anterior.treino.rpeMedio),
  };
  const textos = montarTextos(
    aluno.nome,
    atual.periodo,
    atual.sessoes,
    atual.treino,
    atual.bemEstar,
    atual.habitos,
    atual.recordesE1RM,
    atual.alertas,
    comparacao,
  );
  return {
    versaoRegra: 1,
    aluno: { id: aluno.id, nome: aluno.nome },
    referencia: semanaInicio,
    ...atual,
    comparacao,
    textos,
  };
}

export function relatorioSemanalParaWhatsApp(relatorio: RelatorioSemanal): string {
  return relatorio.textos.whatsapp;
}
