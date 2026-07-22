import type {
  Aluno,
  AnamneseDigital,
  Avaliacao,
  BlocoTreino,
  CheckinSemanal,
  ConfiguracaoHabitos,
  ConfiguracaoHabitosSnapshot,
  Divisao,
  Exercicio,
  ExercicioBiblioteca,
  HistoricoExercicio,
  HabitoDiario,
  Interessado,
  LembreteWhatsApp,
  MetaAluno,
  PacoteSessoes,
  PlanoAlimentar,
  RefeicaoPlano,
  AlimentoRefeicao,
  AlimentoBanco,
  CategoriaAlimento,
  UnidadeMedidaAlimento,
  MetasMacros,
  CargaExecutada,
  ResultadoSerie,
  SerieExecutada,
  SugestaoProgressao,
  SolicitacaoSubstituicao,
  Pagamento,
  FasePrograma,
  ProgramaTreino,
  RegistroHabitosDiario,
  RespostaParQ,
  Sessao,
  TemplateTreino,
  Treino,
  ValoresHabitosDiarios,
  VideoExecucao,
} from "./types";
import type { StoreData } from "./store";
import { ehPerguntaParQId, PERGUNTAS_PARQ } from "./anamnese";
import { ehMedidaCorporalMeta } from "./metas";
import { isInteressado } from "./interessados";

export const CURRENT_SCHEMA_VERSION = 17;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: UnknownRecord, key: string): boolean {
  return typeof record[key] === "string";
}

function hasOptionalString(record: UnknownRecord, key: string): boolean {
  return record[key] === undefined || typeof record[key] === "string";
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isEscalaTreino(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function isDataLocal(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function isInicioDeSemana(value: unknown): value is string {
  return isDataLocal(value) && new Date(`${value}T00:00:00.000Z`).getUTCDay() === 1;
}

function isHoraLocal(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const partes = /^(\d{2}):(\d{2})$/.exec(value);
  if (!partes) return false;
  return Number(partes[1]) <= 23 && Number(partes[2]) <= 59;
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isExercicio(value: unknown): value is Exercicio {
  if (!isRecord(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "nome") &&
    hasString(value, "series") &&
    hasString(value, "repeticoes") &&
    hasString(value, "carga") &&
    hasString(value, "descanso")
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasUniqueStrings(value: unknown, minimumLength: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= minimumLength &&
    value.every((item) => typeof item === "string") &&
    new Set(value).size === value.length
  );
}

function isBlocoTreino(value: unknown): value is BlocoTreino {
  if (!isRecord(value) || !hasString(value, "id")) return false;

  if (value.tipo === "individual") {
    return hasUniqueStrings(value.exercicioIds, 1);
  }

  if (
    (value.tipo !== "superset" && value.tipo !== "circuito") ||
    !hasUniqueStrings(value.exercicioIds, 2) ||
    !isPositiveInteger(value.rounds) ||
    !isNonNegativeInteger(value.descansoEntreRoundsSeg)
  ) {
    return false;
  }

  if (value.tipo === "superset") return true;

  return (
    (value.trabalhoSeg === undefined || isPositiveInteger(value.trabalhoSeg)) &&
    (value.transicaoSeg === undefined || isNonNegativeInteger(value.transicaoSeg))
  );
}

function isDivisao(value: unknown): value is Divisao {
  if (
    !isRecord(value) ||
    !hasString(value, "id") ||
    !hasString(value, "nome") ||
    !Array.isArray(value.exercicios) ||
    !value.exercicios.every(isExercicio)
  ) {
    return false;
  }

  // `diasSemana` (agenda semanal da divisão) é opcional; quando presente, deve ser
  // uma lista de inteiros de 0 (domingo) a 6 (sábado).
  if (
    value.diasSemana !== undefined &&
    (!Array.isArray(value.diasSemana) ||
      !value.diasSemana.every(
        (d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6,
      ))
  ) {
    return false;
  }

  // `blocos` surgiu no schema 5. Sua ausência mantém treinos e modelos antigos válidos.
  if (value.blocos === undefined) return true;
  if (!Array.isArray(value.blocos) || !value.blocos.every(isBlocoTreino)) return false;

  const listaExercicioIds = value.exercicios.map((exercicio) => exercicio.id);
  const exercicioIds = new Set(listaExercicioIds);
  if (exercicioIds.size !== listaExercicioIds.length) return false;
  const blocoIds = new Set<string>();
  const exerciciosAgrupados = new Set<string>();

  for (const bloco of value.blocos) {
    if (blocoIds.has(bloco.id)) return false;
    blocoIds.add(bloco.id);

    for (const exercicioId of bloco.exercicioIds) {
      if (!exercicioIds.has(exercicioId) || exerciciosAgrupados.has(exercicioId)) return false;
      exerciciosAgrupados.add(exercicioId);
    }
  }

  return true;
}

function isAluno(value: unknown): value is Aluno {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    typeof value.ativo === "boolean" &&
    hasString(value, "criadoEm")
  );
}

function isRespostaParQ(value: unknown): value is RespostaParQ {
  return (
    isRecord(value) &&
    ehPerguntaParQId(value.perguntaId) &&
    typeof value.resposta === "boolean" &&
    hasOptionalString(value, "detalhe")
  );
}

function isAnamneseDigital(value: unknown): value is AnamneseDigital {
  if (
    !isRecord(value) ||
    !hasString(value, "id") ||
    !hasString(value, "alunoId") ||
    (value.status !== "rascunho" &&
      value.status !== "enviada" &&
      value.status !== "revisada") ||
    !isRecord(value.contatoEmergencia) ||
    !hasString(value.contatoEmergencia, "nome") ||
    !hasString(value.contatoEmergencia, "telefone") ||
    !hasOptionalString(value.contatoEmergencia, "parentesco") ||
    !hasString(value, "historicoCondicoes") ||
    !hasString(value, "lesoes") ||
    !hasString(value, "medicamentos") ||
    !hasString(value, "restricoes") ||
    !Array.isArray(value.respostasParq) ||
    !value.respostasParq.every(isRespostaParQ) ||
    new Set(value.respostasParq.map((resposta) => resposta.perguntaId)).size !==
      value.respostasParq.length ||
    !isRecord(value.consentimentos) ||
    typeof value.consentimentos.veracidadeInformacoes !== "boolean" ||
    typeof value.consentimentos.cienciaTriagemNaoEDiagnosticoNemLiberacao !==
      "boolean" ||
    typeof value.consentimentos.tratamentoLocalDados !== "boolean" ||
    !hasString(value, "assinaturaNome") ||
    !isIsoDateTime(value.criadoEm) ||
    !isIsoDateTime(value.atualizadoEm) ||
    (value.enviadoEm !== undefined && !isIsoDateTime(value.enviadoEm)) ||
    (value.assinadoEm !== undefined && !isIsoDateTime(value.assinadoEm)) ||
    (value.revisadoEm !== undefined && !isIsoDateTime(value.revisadoEm)) ||
    !hasOptionalString(value, "observacaoPersonal")
  ) {
    return false;
  }

  if (value.status === "rascunho") {
    return (
      value.enviadoEm === undefined &&
      value.assinadoEm === undefined &&
      value.revisadoEm === undefined &&
      value.observacaoPersonal === undefined
    );
  }

  const completa =
    isNonBlankString(value.contatoEmergencia.nome) &&
    isNonBlankString(value.contatoEmergencia.telefone) &&
    isNonBlankString(value.historicoCondicoes) &&
    isNonBlankString(value.lesoes) &&
    isNonBlankString(value.medicamentos) &&
    isNonBlankString(value.restricoes) &&
    value.respostasParq.length === PERGUNTAS_PARQ.length &&
    value.consentimentos.veracidadeInformacoes &&
    value.consentimentos.cienciaTriagemNaoEDiagnosticoNemLiberacao &&
    value.consentimentos.tratamentoLocalDados &&
    isNonBlankString(value.assinaturaNome) &&
    value.enviadoEm !== undefined &&
    value.assinadoEm !== undefined;
  if (!completa) return false;

  if (value.status === "enviada") {
    return value.revisadoEm === undefined && value.observacaoPersonal === undefined;
  }

  return value.revisadoEm !== undefined;
}

function isMetaAluno(value: unknown): value is MetaAluno {
  if (
    !isRecord(value) ||
    !isNonBlankString(value.id) ||
    !isNonBlankString(value.alunoId) ||
    !isNonBlankString(value.titulo) ||
    !isDataLocal(value.dataInicio) ||
    !isDataLocal(value.prazo) ||
    value.prazo < value.dataInicio ||
    typeof value.valorInicial !== "number" ||
    !Number.isFinite(value.valorInicial) ||
    typeof value.valorAlvo !== "number" ||
    !Number.isFinite(value.valorAlvo) ||
    value.valorInicial === value.valorAlvo ||
    (value.status !== "ativa" &&
      value.status !== "concluida" &&
      value.status !== "arquivada") ||
    !isIsoDateTime(value.criadoEm) ||
    !isIsoDateTime(value.atualizadoEm) ||
    (value.concluidaEm !== undefined && !isIsoDateTime(value.concluidaEm)) ||
    (value.status === "ativa" && value.concluidaEm !== undefined) ||
    (value.status === "concluida" && value.concluidaEm === undefined)
  ) {
    return false;
  }

  if (value.tipo === "peso") {
    return (
      value.unidade === "kg" &&
      isNumberBetween(value.valorInicial, 20, 400) &&
      isNumberBetween(value.valorAlvo, 20, 400)
    );
  }

  if (value.tipo === "medida-corporal") {
    if (!ehMedidaCorporalMeta(value.medida)) return false;
    if (value.medida === "percentualGordura") {
      return (
        value.unidade === "%" &&
        isNumberBetween(value.valorInicial, 1, 80) &&
        isNumberBetween(value.valorAlvo, 1, 80)
      );
    }
    return (
      value.unidade === "cm" &&
      isNumberBetween(value.valorInicial, 1, 300) &&
      isNumberBetween(value.valorAlvo, 1, 300)
    );
  }

  if (value.tipo === "frequencia-semanal") {
    return (
      value.unidade === "sessoes/semana" &&
      isIntegerBetween(value.valorInicial, 0, 21) &&
      isIntegerBetween(value.valorAlvo, 1, 21)
    );
  }

  if (value.tipo === "carga-exercicio") {
    return (
      value.unidade === "kg" &&
      isNumberBetween(value.valorInicial, 0, 2_000) &&
      isNumberBetween(value.valorAlvo, 0.5, 2_000) &&
      isNonBlankString(value.exercicioNomeSnapshot) &&
      (value.bibliotecaId === undefined || isNonBlankString(value.bibliotecaId))
    );
  }

  return false;
}

function isTreino(value: unknown): value is Treino {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "nome") &&
    typeof value.ativo === "boolean" &&
    Array.isArray(value.divisoes) &&
    value.divisoes.every(isDivisao) &&
    hasString(value, "criadoEm")
  );
}

function isAvaliacao(value: unknown): value is Avaliacao {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "data") &&
    hasString(value, "criadoEm")
  );
}

function isSessao(value: unknown): value is Sessao {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    isDataLocal(value.data) &&
    isHoraLocal(value.hora) &&
    (value.duracaoMin === undefined ||
      (typeof value.duracaoMin === "number" &&
        Number.isFinite(value.duracaoMin) &&
        value.duracaoMin > 0)) &&
    (value.status === "agendada" ||
      value.status === "realizada" ||
      value.status === "faltou" ||
      value.status === "cancelada") &&
    hasOptionalString(value, "foco") &&
    hasOptionalString(value, "treinoId") &&
    hasOptionalString(value, "divisaoId") &&
    hasOptionalString(value, "registroOperacaoId") &&
    hasOptionalString(value, "recorrenciaId") &&
    (value.recorrenciaOrdem === undefined || isPositiveInteger(value.recorrenciaOrdem)) &&
    (value.canceladaEm === undefined || isIsoDateTime(value.canceladaEm)) &&
    hasOptionalString(value, "motivoCancelamento") &&
    hasOptionalString(value, "origemReposicaoId") &&
    hasOptionalString(value, "reposicaoSessaoId") &&
    hasOptionalString(value, "pacoteId") &&
    hasString(value, "criadoEm")
  );
}

function isPagamento(value: unknown): value is Pagamento {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "competencia") &&
    typeof value.valor === "number" &&
    hasString(value, "vencimento") &&
    (value.status === "pago" || value.status === "pendente") &&
    hasString(value, "criadoEm")
  );
}

function isBiblioteca(value: unknown): value is ExercicioBiblioteca {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    hasString(value, "grupo") &&
    hasString(value, "criadoEm")
  );
}

function optionalString(record: UnknownRecord, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function migrarSerie(value: unknown): SerieExecutada | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const ordem = value.ordem;
  const tipo = value.tipo;
  const rpe = value.rpe;
  if (typeof id !== "string") return null;
  if (typeof ordem !== "number" || !Number.isInteger(ordem) || ordem < 1) return null;
  if (tipo !== "aquecimento" && tipo !== "trabalho") return null;
  // RPE é opcional; se vier, precisa ser válido (1–10).
  if (rpe !== undefined && (typeof rpe !== "number" || !Number.isFinite(rpe) || rpe < 1 || rpe > 10)) {
    return null;
  }
  if (!isRecord(value.resultado) || !isRecord(value.carga)) return null;

  let resultado: ResultadoSerie;
  const metrica = value.resultado.metrica;
  const repeticoes = value.resultado.repeticoes;
  const duracaoSegundos = value.resultado.duracaoSegundos;
  if (
    metrica === "repeticoes" &&
    typeof repeticoes === "number" &&
    Number.isInteger(repeticoes) &&
    repeticoes > 0
  ) {
    resultado = {
      metrica: "repeticoes",
      repeticoes,
    };
  } else if (
    metrica === "tempo" &&
    typeof duracaoSegundos === "number" &&
    Number.isFinite(duracaoSegundos) &&
    duracaoSegundos > 0
  ) {
    resultado = {
      metrica: "tempo",
      duracaoSegundos,
    };
  } else {
    return null;
  }

  let carga: CargaExecutada;
  const modoCarga = value.carga.modo;
  const valorKg = value.carga.valorKg;
  if (
    (modoCarga === "externa" || modoCarga === "assistida") &&
    typeof valorKg === "number" &&
    Number.isFinite(valorKg) &&
    valorKg >= 0
  ) {
    carga = { modo: modoCarga, valorKg };
  } else if (modoCarga === "peso-corporal" || modoCarga === "sem-carga") {
    carga = { modo: modoCarga };
  } else {
    return null;
  }

  return {
    id,
    ordem,
    tipo,
    resultado,
    carga,
    ...(typeof rpe === "number" ? { rpe } : {}),
    concluidaEm: optionalString(value, "concluidaEm"),
    observacoes: optionalString(value, "observacoes"),
  };
}

function migrarHistorico(value: unknown): HistoricoExercicio | null {
  if (
    !isRecord(value) ||
    !hasString(value, "id") ||
    !hasString(value, "alunoId") ||
    !hasString(value, "sessaoId") ||
    !hasString(value, "nome") ||
    !hasString(value, "data") ||
    !hasString(value, "criadoEm")
  ) {
    return null;
  }

  const id = value.id;
  const alunoId = value.alunoId;
  const sessaoId = value.sessaoId;
  const nome = value.nome;
  const data = value.data;
  const criadoEm = value.criadoEm;
  if (
    typeof id !== "string" ||
    typeof alunoId !== "string" ||
    typeof sessaoId !== "string" ||
    typeof nome !== "string" ||
    typeof data !== "string" ||
    typeof criadoEm !== "string"
  ) {
    return null;
  }
  const base = {
    id,
    alunoId,
    sessaoId,
    treinoId: optionalString(value, "treinoId"),
    treinoNome: optionalString(value, "treinoNome"),
    divisaoId: optionalString(value, "divisaoId"),
    divisaoNome: optionalString(value, "divisaoNome"),
    exercicioId: optionalString(value, "exercicioId"),
    bibliotecaId: optionalString(value, "bibliotecaId"),
    nome,
    data,
    criadoEm,
  };

  if (value.formato === "por-serie") {
    if (!Array.isArray(value.seriesExecutadas)) return null;
    const series = value.seriesExecutadas.map(migrarSerie);
    if (series.some((serie) => serie === null)) return null;
    return {
      ...base,
      formato: "por-serie",
      descansoPlanejado: optionalString(value, "descansoPlanejado"),
      seriesExecutadas: series.filter((serie): serie is SerieExecutada => serie !== null),
    };
  }

  const resumo = value.formato === "resumo-legado" ? value.resumoLegado : value;
  if (
    !isRecord(resumo) ||
    !hasString(resumo, "series") ||
    !hasString(resumo, "repeticoes") ||
    !hasString(resumo, "carga")
  ) {
    return null;
  }
  const series = resumo.series;
  const repeticoes = resumo.repeticoes;
  const carga = resumo.carga;
  if (
    typeof series !== "string" ||
    typeof repeticoes !== "string" ||
    typeof carga !== "string"
  ) {
    return null;
  }
  return {
    ...base,
    formato: "resumo-legado",
    resumoLegado: {
      series,
      repeticoes,
      carga,
      descanso: optionalString(resumo, "descanso"),
    },
  };
}

function isTemplate(value: unknown): value is TemplateTreino {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    Array.isArray(value.divisoes) &&
    value.divisoes.every(isDivisao) &&
    hasString(value, "criadoEm") &&
    hasString(value, "atualizadoEm")
  );
}

function isFasePrograma(value: unknown): value is FasePrograma {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    typeof value.ordem === "number" &&
    typeof value.semanaInicial === "number" &&
    typeof value.duracaoSemanas === "number" &&
    Array.isArray(value.treinoIds) &&
    value.treinoIds.every((id) => typeof id === "string")
  );
}

function isProgramaTreino(value: unknown): value is ProgramaTreino {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "nome") &&
    hasString(value, "dataInicio") &&
    hasString(value, "dataFim") &&
    (value.status === "rascunho" ||
      value.status === "ativo" ||
      value.status === "concluido" ||
      value.status === "cancelado") &&
    Array.isArray(value.fases) &&
    value.fases.every(isFasePrograma) &&
    hasString(value, "criadoEm") &&
    hasString(value, "atualizadoEm")
  );
}

function isSugestaoProgressao(value: unknown): value is SugestaoProgressao {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "historicoOrigemId") &&
    hasString(value, "exercicioNomeSnapshot") &&
    typeof value.cargaAtualKg === "number" &&
    typeof value.cargaSugeridaKg === "number" &&
    typeof value.rpeMedio === "number" &&
    hasString(value, "motivo") &&
    (value.status === "pendente" || value.status === "aceita" || value.status === "ignorada") &&
    hasString(value, "criadoEm")
  );
}

function isSubstitutoSnapshot(
  value: unknown,
): value is NonNullable<SolicitacaoSubstituicao["substituto"]> {
  return (
    isRecord(value) &&
    hasString(value, "nome") &&
    hasOptionalString(value, "bibliotecaId") &&
    hasString(value, "series") &&
    hasString(value, "repeticoes") &&
    hasString(value, "carga") &&
    hasString(value, "descanso") &&
    hasOptionalString(value, "observacoes")
  );
}

function isSolicitacaoSubstituicao(value: unknown): value is SolicitacaoSubstituicao {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "treinoId") &&
    hasString(value, "divisaoId") &&
    hasString(value, "exercicioId") &&
    hasString(value, "exercicioNomeSnapshot") &&
    (value.motivo === "equipamento-indisponivel" ||
      value.motivo === "dor" ||
      value.motivo === "dificuldade" ||
      value.motivo === "outro") &&
    hasOptionalString(value, "detalhes") &&
    (value.status === "pendente" ||
      value.status === "aprovada" ||
      value.status === "recusada" ||
      value.status === "cancelada") &&
    isIsoDateTime(value.criadoEm) &&
    (value.respondidaEm === undefined || isIsoDateTime(value.respondidaEm)) &&
    hasOptionalString(value, "respostaPersonal") &&
    (value.substituto === undefined || isSubstitutoSnapshot(value.substituto))
  );
}

function isVideoExecucao(value: unknown): value is VideoExecucao {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasOptionalString(value, "treinoId") &&
    hasOptionalString(value, "divisaoId") &&
    hasOptionalString(value, "exercicioId") &&
    hasString(value, "exercicioNomeSnapshot") &&
    hasString(value, "arquivoNome") &&
    typeof value.mimeType === "string" &&
    value.mimeType.startsWith("video/") &&
    isPositiveInteger(value.tamanhoBytes) &&
    value.tamanhoBytes <= 100 * 1024 * 1024 &&
    (value.duracaoSegundos === undefined ||
      (typeof value.duracaoSegundos === "number" &&
        Number.isFinite(value.duracaoSegundos) &&
        value.duracaoSegundos > 0 &&
        value.duracaoSegundos <= 21_600)) &&
    hasOptionalString(value, "observacoesAluno") &&
    (value.status === "pendente" || value.status === "revisado") &&
    isIsoDateTime(value.criadoEm) &&
    (value.revisadoEm === undefined || isIsoDateTime(value.revisadoEm)) &&
    hasOptionalString(value, "comentarioPersonal")
  );
}

function isHabitoDiario(value: unknown): value is HabitoDiario {
  return (
    value === "agua" ||
    value === "passos" ||
    value === "sono" ||
    value === "alongamento" ||
    value === "cardio" ||
    value === "alimentacao"
  );
}

function isNumberBetween(value: unknown, minimo: number, maximo: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimo &&
    value <= maximo
  );
}

function isIntegerBetween(value: unknown, minimo: number, maximo: number): value is number {
  return isNumberBetween(value, minimo, maximo) && Number.isInteger(value);
}

function isMetasHabitos(value: unknown): value is ConfiguracaoHabitosSnapshot["metas"] {
  return (
    isRecord(value) &&
    isIntegerBetween(value.aguaMl, 250, 10_000) &&
    isIntegerBetween(value.passos, 500, 100_000) &&
    isNumberBetween(value.sonoHoras, 1, 24) &&
    isIntegerBetween(value.alongamentoMinutos, 1, 240) &&
    isIntegerBetween(value.cardioMinutos, 1, 600) &&
    isIntegerBetween(value.adesaoAlimentarPercentual, 1, 100)
  );
}

function isConfiguracaoHabitosSnapshot(
  value: unknown,
): value is ConfiguracaoHabitosSnapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.habitosAtivos) &&
    new Set(value.habitosAtivos).size === value.habitosAtivos.length &&
    value.habitosAtivos.every(isHabitoDiario) &&
    isMetasHabitos(value.metas)
  );
}

function isValoresHabitosDiarios(value: unknown): value is ValoresHabitosDiarios {
  if (!isRecord(value)) return false;
  const valores = [
    value.aguaMl,
    value.passos,
    value.sonoHoras,
    value.alongamentoMinutos,
    value.cardioMinutos,
    value.adesaoAlimentarPercentual,
  ];
  return (
    valores.some((item) => item !== undefined) &&
    (value.aguaMl === undefined || isIntegerBetween(value.aguaMl, 0, 20_000)) &&
    (value.passos === undefined || isIntegerBetween(value.passos, 0, 100_000)) &&
    (value.sonoHoras === undefined || isNumberBetween(value.sonoHoras, 0, 24)) &&
    (value.alongamentoMinutos === undefined ||
      isIntegerBetween(value.alongamentoMinutos, 0, 1_440)) &&
    (value.cardioMinutos === undefined ||
      isIntegerBetween(value.cardioMinutos, 0, 1_440)) &&
    (value.adesaoAlimentarPercentual === undefined ||
      isIntegerBetween(value.adesaoAlimentarPercentual, 0, 100))
  );
}

function isConfiguracaoHabitos(value: unknown): value is ConfiguracaoHabitos {
  if (!isRecord(value)) return false;
  return (
    isConfiguracaoHabitosSnapshot(value) &&
    hasString(value, "alunoId") &&
    isIsoDateTime(value.criadoEm) &&
    isIsoDateTime(value.atualizadoEm)
  );
}

function isRegistroHabitosDiario(value: unknown): value is RegistroHabitosDiario {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    isDataLocal(value.data) &&
    isValoresHabitosDiarios(value.valores) &&
    isConfiguracaoHabitosSnapshot(value.configuracaoSnapshot) &&
    isIsoDateTime(value.criadoEm) &&
    isIsoDateTime(value.atualizadoEm)
  );
}

function isCheckinSemanal(value: unknown): value is CheckinSemanal {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    isInicioDeSemana(value.semanaInicio) &&
    isIsoDateTime(value.respondidoEm) &&
    isEscalaTreino(value.energia) &&
    isEscalaTreino(value.sono) &&
    (value.horasSono === undefined ||
      (typeof value.horasSono === "number" &&
        Number.isFinite(value.horasSono) &&
        value.horasSono >= 0 &&
        value.horasSono <= 24)) &&
    isEscalaTreino(value.estresse) &&
    isEscalaTreino(value.alimentacao) &&
    (value.dor === "Sem dor" ||
      value.dor === "Leve" ||
      value.dor === "Moderada" ||
      value.dor === "Forte") &&
    hasOptionalString(value, "localDor") &&
    (value.pesoKg === undefined ||
      (typeof value.pesoKg === "number" && Number.isFinite(value.pesoKg) && value.pesoKg > 0)) &&
    hasOptionalString(value, "observacoes") &&
    (value.revisadoEm === undefined || isIsoDateTime(value.revisadoEm)) &&
    hasOptionalString(value, "comentarioPersonal")
  );
}

function isMacroOpcional(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 20000)
  );
}

function isMetasMacros(value: unknown): value is MetasMacros {
  return (
    isRecord(value) &&
    isMacroOpcional(value.calorias) &&
    isMacroOpcional(value.proteinas) &&
    isMacroOpcional(value.carboidratos) &&
    isMacroOpcional(value.gorduras)
  );
}

function isAlimentoRefeicao(value: unknown): value is AlimentoRefeicao {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    typeof value.quantidade === "string" &&
    hasOptionalString(value, "observacao") &&
    hasOptionalString(value, "bancoId") &&
    (value.quantidadeNum === undefined ||
      (typeof value.quantidadeNum === "number" &&
        Number.isFinite(value.quantidadeNum) &&
        value.quantidadeNum >= 0))
  );
}

const CATEGORIAS_ALIMENTO_VALIDAS = new Set<CategoriaAlimento>([
  "proteina",
  "carboidrato",
  "gordura",
  "fruta",
  "vegetal",
  "laticinio",
  "bebida",
  "suplemento",
  "outro",
]);

function ehUnidadeAlimento(value: unknown): value is UnidadeMedidaAlimento {
  return value === "g" || value === "ml" || value === "unidade";
}

function ehMacroNaoNegativo(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isAlimentoBanco(value: unknown): value is AlimentoBanco {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    CATEGORIAS_ALIMENTO_VALIDAS.has(value.categoria as CategoriaAlimento) &&
    ehUnidadeAlimento(value.unidade) &&
    typeof value.base === "number" &&
    Number.isFinite(value.base) &&
    value.base > 0 &&
    ehMacroNaoNegativo(value.kcal) &&
    ehMacroNaoNegativo(value.proteinas) &&
    ehMacroNaoNegativo(value.carboidratos) &&
    ehMacroNaoNegativo(value.gorduras) &&
    hasOptionalString(value, "marca") &&
    isIsoDateTime(value.criadoEm)
  );
}

function isRefeicaoPlano(value: unknown): value is RefeicaoPlano {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "nome") &&
    (value.horario === undefined || isHoraLocal(value.horario)) &&
    Array.isArray(value.alimentos) &&
    value.alimentos.every(isAlimentoRefeicao) &&
    hasOptionalString(value, "observacao")
  );
}

function isPlanoAlimentar(value: unknown): value is PlanoAlimentar {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "titulo") &&
    hasOptionalString(value, "objetivo") &&
    (value.status === "ativo" || value.status === "arquivado") &&
    isMetasMacros(value.metas) &&
    (value.aguaLitros === undefined ||
      (typeof value.aguaLitros === "number" &&
        Number.isFinite(value.aguaLitros) &&
        value.aguaLitros > 0 &&
        value.aguaLitros <= 20)) &&
    Array.isArray(value.refeicoes) &&
    value.refeicoes.every(isRefeicaoPlano) &&
    hasOptionalString(value, "observacoes") &&
    isIsoDateTime(value.criadoEm) &&
    isIsoDateTime(value.atualizadoEm) &&
    (value.arquivadoEm === undefined || isIsoDateTime(value.arquivadoEm))
  );
}

function isLembreteWhatsApp(value: unknown): value is LembreteWhatsApp {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    (value.tipo === "treino" ||
      value.tipo === "avaliacao" ||
      value.tipo === "mensalidade" ||
      value.tipo === "checkin" ||
      value.tipo === "renovacao") &&
    hasString(value, "titulo") &&
    hasString(value, "mensagem") &&
    (value.dataReferencia === undefined || isDataLocal(value.dataReferencia)) &&
    (value.status === "pendente" ||
      value.status === "enviado" ||
      value.status === "dispensado") &&
    (value.origem === "automatica" || value.origem === "manual") &&
    (value.origem === "manual" ||
      (typeof value.chaveAutomatica === "string" && value.chaveAutomatica.trim().length > 0)) &&
    hasOptionalString(value, "chaveAutomatica") &&
    hasOptionalString(value, "relacionadoId") &&
    isIsoDateTime(value.criadoEm) &&
    (value.enviadoEm === undefined || isIsoDateTime(value.enviadoEm)) &&
    (value.dispensadoEm === undefined || isIsoDateTime(value.dispensadoEm))
  );
}

function isPacoteSessoes(value: unknown): value is PacoteSessoes {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "alunoId") &&
    hasString(value, "nome") &&
    isPositiveInteger(value.quantidadeContratada) &&
    isNonNegativeInteger(value.utilizadasAntesDoVoltage) &&
    isDataLocal(value.dataInicio) &&
    isDataLocal(value.dataValidade) &&
    value.dataValidade >= value.dataInicio &&
    (value.valorTotal === undefined ||
      (typeof value.valorTotal === "number" &&
        Number.isFinite(value.valorTotal) &&
        value.valorTotal >= 0)) &&
    hasOptionalString(value, "observacoes") &&
    typeof value.ativo === "boolean" &&
    isIsoDateTime(value.criadoEm) &&
    isIsoDateTime(value.atualizadoEm)
  );
}

function collection<T>(
  source: UnknownRecord,
  key: string,
  guard: (value: unknown) => value is T,
  fallback: T[],
): T[] {
  const value = source[key];
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new Error(`A coleção '${key}' está corrompida ou usa um formato inválido.`);
  }
  return value;
}

function uniqueCollection<T>(
  source: UnknownRecord,
  key: string,
  guard: (value: unknown) => value is T,
  fallback: T[],
  uniqueKey: (item: T) => string,
): T[] {
  const items = collection(source, key, guard, fallback);
  const chaves = new Set<string>();
  for (const item of items) {
    const chave = uniqueKey(item);
    if (chaves.has(chave)) {
      throw new Error(`A coleção '${key}' contém registros duplicados.`);
    }
    chaves.add(chave);
  }
  return items;
}

function mappedCollection<T>(
  source: UnknownRecord,
  key: string,
  migrate: (value: unknown) => T | null,
  fallback: T[],
): T[] {
  const value = source[key];
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) {
    throw new Error(`A coleção '${key}' está corrompida ou usa um formato inválido.`);
  }
  return value.map((item, index) => {
    const migrated = migrate(item);
    if (migrated === null) {
      throw new Error(`O item ${index + 1} da coleção '${key}' é inválido.`);
    }
    return migrated;
  });
}

export function migrarStoreData(input: unknown, defaults: StoreData): StoreData {
  if (!isRecord(input)) throw new Error("A base de dados não é um objeto válido.");

  const version = input.schemaVersion;
  if (version !== undefined && (typeof version !== "number" || !Number.isInteger(version))) {
    throw new Error("A versão da base de dados é inválida.");
  }
  if (typeof version === "number" && version > CURRENT_SCHEMA_VERSION) {
    throw new Error("Esta base foi criada por uma versão mais nova do Voltage.");
  }

  const alunos = collection(input, "alunos", isAluno, defaults.alunos);
  const interessados = uniqueCollection(
    input,
    "interessados",
    isInteressado,
    defaults.interessados,
    (interessado: Interessado) => interessado.id,
  );
  const alunosPorId = new Set(alunos.map((aluno) => aluno.id));
  const alunosConvertidos = new Set<string>();
  for (const interessado of interessados) {
    if (interessado.status !== "convertido" || !interessado.convertidoAlunoId) continue;
    if (!alunosPorId.has(interessado.convertidoAlunoId)) {
      throw new Error(
        `O interessado '${interessado.nome}' referencia um aluno convertido inexistente.`,
      );
    }
    if (alunosConvertidos.has(interessado.convertidoAlunoId)) {
      throw new Error("Mais de um interessado referencia o mesmo aluno convertido.");
    }
    alunosConvertidos.add(interessado.convertidoAlunoId);
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    alunos,
    interessados,
    anamneses: uniqueCollection(
      input,
      "anamneses",
      isAnamneseDigital,
      defaults.anamneses,
      (anamnese) => anamnese.alunoId,
    ),
    metasAluno: uniqueCollection(
      input,
      "metasAluno",
      isMetaAluno,
      defaults.metasAluno,
      (meta) => meta.id,
    ),
    treinos: collection(input, "treinos", isTreino, defaults.treinos),
    avaliacoes: collection(input, "avaliacoes", isAvaliacao, defaults.avaliacoes),
    sessoes: collection(input, "sessoes", isSessao, defaults.sessoes),
    pagamentos: collection(input, "pagamentos", isPagamento, defaults.pagamentos),
    biblioteca: collection(input, "biblioteca", isBiblioteca, defaults.biblioteca),
    historicoExercicios: mappedCollection(
      input,
      "historicoExercicios",
      migrarHistorico,
      defaults.historicoExercicios,
    ),
    templatesTreino: collection(
      input,
      "templatesTreino",
      isTemplate,
      defaults.templatesTreino,
    ),
    programasTreino: collection(
      input,
      "programasTreino",
      isProgramaTreino,
      defaults.programasTreino,
    ),
    sugestoesProgressao: collection(
      input,
      "sugestoesProgressao",
      isSugestaoProgressao,
      defaults.sugestoesProgressao,
    ),
    checkinsSemanais: collection(
      input,
      "checkinsSemanais",
      isCheckinSemanal,
      defaults.checkinsSemanais,
    ),
    lembretesWhatsApp: collection(
      input,
      "lembretesWhatsApp",
      isLembreteWhatsApp,
      defaults.lembretesWhatsApp,
    ),
    pacotesSessoes: collection(
      input,
      "pacotesSessoes",
      isPacoteSessoes,
      defaults.pacotesSessoes,
    ),
    solicitacoesSubstituicao: collection(
      input,
      "solicitacoesSubstituicao",
      isSolicitacaoSubstituicao,
      defaults.solicitacoesSubstituicao,
    ),
    videosExecucao: collection(
      input,
      "videosExecucao",
      isVideoExecucao,
      defaults.videosExecucao,
    ),
    configuracoesHabitos: uniqueCollection(
      input,
      "configuracoesHabitos",
      isConfiguracaoHabitos,
      defaults.configuracoesHabitos,
      (configuracao) => configuracao.alunoId,
    ),
    registrosHabitos: uniqueCollection(
      input,
      "registrosHabitos",
      isRegistroHabitosDiario,
      defaults.registrosHabitos,
      (registro) => `${registro.alunoId}:${registro.data}`,
    ),
    planosAlimentares: uniqueCollection(
      input,
      "planosAlimentares",
      isPlanoAlimentar,
      defaults.planosAlimentares,
      (plano) => plano.id,
    ),
    bancoAlimentos: uniqueCollection(
      input,
      "bancoAlimentos",
      isAlimentoBanco,
      defaults.bancoAlimentos,
      (alimento) => alimento.id,
    ),
  };
}
