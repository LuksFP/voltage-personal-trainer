export type Objetivo =
  | "Hipertrofia"
  | "Emagrecimento"
  | "Condicionamento"
  | "Força"
  | "Reabilitação"
  | "Saúde geral";

// Modalidade é aberta: o personal pode escolher uma comum ou digitar a específica.
export interface Aluno {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  objetivo?: Objetivo;
  modalidade?: string;
  pesoMeta?: number; // kg — meta de peso, vira linha-alvo no gráfico de evolução
  mensalidade?: number; // R$ — valor da mensalidade; base para gerar cobranças
  diaVencimento?: number; // 1-28 — dia do mês em que a mensalidade vence
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;
  // Aluno que criou a própria conta pelo app (/app), sem personal vinculado.
  // Não entra nas listas, relatórios, cobranças nem lembretes do personal.
  contaApp?: boolean;
}

export type OrigemInteressado =
  | "instagram"
  | "indicacao"
  | "google"
  | "whatsapp"
  | "site"
  | "evento"
  | "outro";

export type StatusInteressado =
  | "novo"
  | "em-contato"
  | "experimental-agendada"
  | "experimental-realizada"
  | "proposta"
  | "convertido"
  | "perdido";

export type CanalContatoInteressado =
  | "whatsapp"
  | "ligacao"
  | "email"
  | "presencial"
  | "outro";

export type StatusAulaExperimental =
  | "agendada"
  | "realizada"
  | "faltou"
  | "cancelada";

export interface RegistroContatoInteressado {
  id: string;
  canal: CanalContatoInteressado;
  observacao: string;
  realizadoEm: string;
}

export interface AulaExperimentalInteressado {
  data: string; // YYYY-MM-DD local
  hora: string; // HH:MM
  status: StatusAulaExperimental;
  observacoes?: string;
}

export interface Interessado {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  objetivo?: Objetivo;
  origem: OrigemInteressado;
  origemDetalhe?: string;
  status: StatusInteressado;
  proximoFollowUp?: string; // YYYY-MM-DD local
  historicoContatos: RegistroContatoInteressado[];
  aulaExperimental?: AulaExperimentalInteressado;
  observacoes?: string;
  motivoPerda?: string;
  convertidoAlunoId?: string;
  convertidoEm?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusPagamento = "pago" | "pendente";

// Cobrança de mensalidade de um aluno numa competência (mês de referência).
// "atrasado" não é armazenado — é derivado de status "pendente" + vencimento no passado.
export interface Pagamento {
  id: string;
  alunoId: string;
  competencia: string; // "YYYY-MM" — mês de referência
  valor: number; // R$ cobrado (snapshot da mensalidade na hora da cobrança)
  vencimento: string; // "YYYY-MM-DD"
  status: StatusPagamento;
  pagoEm?: string; // "YYYY-MM-DD" quando marcado como pago
  metodo?: string; // Pix, Dinheiro, Cartão…
  criadoEm: string;
}

export type StatusSessao = "agendada" | "realizada" | "faltou" | "cancelada";
export type EscalaTreino = 1 | 2 | 3 | 4 | 5;
export type NivelDor = "Sem dor" | "Leve" | "Moderada" | "Forte";

export interface FeedbackTreino {
  dificuldade: EscalaTreino;
  energia: EscalaTreino;
  dor: NivelDor;
  observacoes?: string;
}

// Sessão de treino agendada com um aluno.
export interface Sessao {
  id: string;
  alunoId: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracaoMin?: number;
  foco?: string; // ex.: "Treino A", "Sparring", "Corrida longa"
  treinoId?: string;
  divisaoId?: string;
  status: StatusSessao;
  feedback?: FeedbackTreino;
  registroOperacaoId?: string;
  recorrenciaId?: string;
  recorrenciaOrdem?: number;
  canceladaEm?: string;
  motivoCancelamento?: string;
  origemReposicaoId?: string;
  reposicaoSessaoId?: string;
  pacoteId?: string;
  criadoEm: string;
}

export interface PacoteSessoes {
  id: string;
  alunoId: string;
  nome: string;
  quantidadeContratada: number;
  utilizadasAntesDoVoltage: number;
  dataInicio: string; // YYYY-MM-DD
  dataValidade: string; // YYYY-MM-DD
  valorTotal?: number;
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

// Resposta única por aluno e semana. `semanaInicio` usa a segunda-feira local
// como chave estável; a revisão do personal pode acontecer em outro momento.
export interface CheckinSemanal {
  id: string;
  alunoId: string;
  semanaInicio: string; // YYYY-MM-DD
  respondidoEm: string; // ISO date-time
  energia: EscalaTreino;
  sono: EscalaTreino;
  horasSono?: number;
  estresse: EscalaTreino;
  alimentacao: EscalaTreino;
  dor: NivelDor;
  localDor?: string;
  pesoKg?: number;
  observacoes?: string;
  revisadoEm?: string; // ISO date-time
  comentarioPersonal?: string;
}

export type StatusAnamnese = "rascunho" | "enviada" | "revisada";

// Identificadores semânticos e estáveis. O texto exibido pode evoluir sem invalidar
// respostas já persistidas ou quebrar comparações futuras.
export type PerguntaParQId =
  | "condicao-cardiovascular"
  | "desconforto-peito-atividade"
  | "desconforto-peito-repouso"
  | "tontura-desmaio"
  | "problema-osseo-articular"
  | "medicacao-cardiovascular"
  | "outro-impedimento";

export interface ContatoEmergenciaAnamnese {
  nome: string;
  telefone: string;
  parentesco?: string;
}

export interface RespostaParQ {
  perguntaId: PerguntaParQId;
  resposta: boolean;
  detalhe?: string;
}

export interface ConsentimentosAnamnese {
  veracidadeInformacoes: boolean;
  cienciaTriagemNaoEDiagnosticoNemLiberacao: boolean;
  tratamentoLocalDados: boolean;
}

/**
 * Uma única anamnese por aluno. Campos textuais podem conter uma descrição ou
 * uma declaração explícita de ausência, como "nenhum".
 */
export interface AnamneseDigital {
  id: string;
  alunoId: string;
  status: StatusAnamnese;
  contatoEmergencia: ContatoEmergenciaAnamnese;
  historicoCondicoes: string;
  lesoes: string;
  medicamentos: string;
  restricoes: string;
  respostasParq: RespostaParQ[];
  consentimentos: ConsentimentosAnamnese;
  assinaturaNome: string;
  criadoEm: string;
  atualizadoEm: string;
  enviadoEm?: string;
  assinadoEm?: string;
  revisadoEm?: string;
  observacaoPersonal?: string;
}

export type StatusMetaAluno = "ativa" | "concluida" | "arquivada";

export type MedidaCorporalMeta =
  | "percentualGordura"
  | "cintura"
  | "quadril"
  | "peito"
  | "braco"
  | "coxa";

export type MedidaCorporalCentimetros = Exclude<
  MedidaCorporalMeta,
  "percentualGordura"
>;

export interface MetaAlunoBase {
  id: string;
  alunoId: string;
  titulo: string;
  dataInicio: string; // YYYY-MM-DD
  prazo: string; // YYYY-MM-DD
  valorInicial: number;
  status: StatusMetaAluno;
  criadoEm: string;
  atualizadoEm: string;
  concluidaEm?: string;
}

export interface MetaPesoAluno extends MetaAlunoBase {
  tipo: "peso";
  valorAlvo: number;
  unidade: "kg";
}

export type MetaMedidaCorporalAluno =
  | (MetaAlunoBase & {
      tipo: "medida-corporal";
      medida: "percentualGordura";
      valorAlvo: number;
      unidade: "%";
    })
  | (MetaAlunoBase & {
      tipo: "medida-corporal";
      medida: MedidaCorporalCentimetros;
      valorAlvo: number;
      unidade: "cm";
    });

export interface MetaFrequenciaSemanalAluno extends MetaAlunoBase {
  tipo: "frequencia-semanal";
  valorAlvo: number;
  unidade: "sessoes/semana";
}

export interface MetaCargaExercicioAluno extends MetaAlunoBase {
  tipo: "carga-exercicio";
  valorAlvo: number;
  unidade: "kg";
  exercicioNomeSnapshot: string;
  bibliotecaId?: string;
}

export type MetaAluno =
  | MetaPesoAluno
  | MetaMedidaCorporalAluno
  | MetaFrequenciaSemanalAluno
  | MetaCargaExercicioAluno;

export type TipoLembreteWhatsApp =
  | "treino"
  | "avaliacao"
  | "mensalidade"
  | "checkin"
  | "renovacao";

export type StatusLembreteWhatsApp = "pendente" | "enviado" | "dispensado";
export type OrigemLembreteWhatsApp = "automatica" | "manual";

export interface LembreteWhatsApp {
  id: string;
  alunoId: string;
  tipo: TipoLembreteWhatsApp;
  titulo: string;
  mensagem: string;
  dataReferencia?: string; // YYYY-MM-DD
  status: StatusLembreteWhatsApp;
  origem: OrigemLembreteWhatsApp;
  chaveAutomatica?: string;
  relacionadoId?: string;
  criadoEm: string;
  enviadoEm?: string;
  dispensadoEm?: string;
}

// Avaliação física do aluno numa data. Todas as medidas são opcionais —
// o personal registra só o que mediu naquele dia.
export interface Avaliacao {
  id: string;
  alunoId: string;
  data: string; // ISO (dia da avaliação)
  peso?: number; // kg
  percentualGordura?: number; // %
  cintura?: number; // cm
  quadril?: number; // cm
  peito?: number; // cm
  braco?: number; // cm
  coxa?: number; // cm
  fotos?: string[]; // data URLs (redimensionadas) de fotos de progresso
  observacoes?: string;
  criadoEm: string;
}

export interface Exercicio {
  id: string;
  nome: string;
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
  observacoes?: string;
  bibliotecaId?: string; // referência opcional a um item da biblioteca (vídeo/instruções)
}

export type MotivoSubstituicao =
  | "equipamento-indisponivel"
  | "dor"
  | "dificuldade"
  | "outro";

export type StatusSolicitacaoSubstituicao =
  | "pendente"
  | "aprovada"
  | "recusada"
  | "cancelada";

export interface SolicitacaoSubstituicao {
  id: string;
  alunoId: string;
  treinoId: string;
  divisaoId: string;
  exercicioId: string;
  exercicioNomeSnapshot: string;
  motivo: MotivoSubstituicao;
  detalhes?: string;
  status: StatusSolicitacaoSubstituicao;
  criadoEm: string;
  respondidaEm?: string;
  respostaPersonal?: string;
  substituto?: Pick<
    Exercicio,
    | "nome"
    | "bibliotecaId"
    | "series"
    | "repeticoes"
    | "carga"
    | "descanso"
    | "observacoes"
  >;
}

export type StatusVideoExecucao = "pendente" | "revisado";

export interface VideoExecucao {
  id: string;
  alunoId: string;
  treinoId?: string;
  divisaoId?: string;
  exercicioId?: string;
  exercicioNomeSnapshot: string;
  arquivoNome: string;
  mimeType: string;
  tamanhoBytes: number;
  duracaoSegundos?: number;
  observacoesAluno?: string;
  status: StatusVideoExecucao;
  criadoEm: string;
  revisadoEm?: string;
  comentarioPersonal?: string;
}

export type HabitoDiario =
  | "agua"
  | "passos"
  | "sono"
  | "alongamento"
  | "cardio"
  | "alimentacao";

export interface MetasHabitos {
  aguaMl: number;
  passos: number;
  sonoHoras: number;
  alongamentoMinutos: number;
  cardioMinutos: number;
  adesaoAlimentarPercentual: number;
}

export interface ValoresHabitosDiarios {
  aguaMl?: number;
  passos?: number;
  sonoHoras?: number;
  alongamentoMinutos?: number;
  cardioMinutos?: number;
  adesaoAlimentarPercentual?: number;
}

export interface ConfiguracaoHabitosSnapshot {
  habitosAtivos: HabitoDiario[];
  metas: MetasHabitos;
}

export interface ConfiguracaoHabitos extends ConfiguracaoHabitosSnapshot {
  alunoId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegistroHabitosDiario {
  id: string;
  alunoId: string;
  data: string; // YYYY-MM-DD local, sem conversão implícita de fuso
  valores: ValoresHabitosDiarios;
  configuracaoSnapshot: ConfiguracaoHabitosSnapshot;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoSerieExecutada = "aquecimento" | "trabalho";

export type ResultadoSerie =
  | { metrica: "repeticoes"; repeticoes: number }
  | { metrica: "tempo"; duracaoSegundos: number };

export type CargaExecutada =
  | { modo: "externa"; valorKg: number }
  | { modo: "assistida"; valorKg: number }
  | { modo: "peso-corporal" | "sem-carga" };

export interface SerieExecutada {
  id: string;
  ordem: number;
  tipo: TipoSerieExecutada;
  resultado: ResultadoSerie;
  carga: CargaExecutada;
  rpe?: number; // opcional — nem toda execução registra percepção de esforço
  concluidaEm?: string;
  observacoes?: string;
}

interface HistoricoExercicioBase {
  id: string;
  alunoId: string;
  sessaoId: string;
  treinoId?: string;
  treinoNome?: string;
  divisaoId?: string;
  divisaoNome?: string;
  exercicioId?: string;
  bibliotecaId?: string;
  nome: string;
  data: string; // YYYY-MM-DD
  criadoEm: string;
}

export interface HistoricoExercicioLegado extends HistoricoExercicioBase {
  formato: "resumo-legado";
  resumoLegado: {
    series: string;
    repeticoes: string;
    carga: string;
    descanso?: string;
  };
}

export interface HistoricoExercicioDetalhado extends HistoricoExercicioBase {
  formato: "por-serie";
  descansoPlanejado?: string;
  seriesExecutadas: SerieExecutada[];
}

export type HistoricoExercicio = HistoricoExercicioLegado | HistoricoExercicioDetalhado;

export type GrupoMuscular =
  | "Peito"
  | "Costas"
  | "Pernas"
  | "Glúteos"
  | "Ombro"
  | "Bíceps"
  | "Tríceps"
  | "Abdômen"
  | "Panturrilha"
  | "Cardio"
  | "Corpo todo";

export const GRUPOS_MUSCULARES: GrupoMuscular[] = [
  "Peito",
  "Costas",
  "Pernas",
  "Glúteos",
  "Ombro",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Panturrilha",
  "Cardio",
  "Corpo todo",
];

// Exercício do catálogo reutilizável (biblioteca), separado do exercício dentro de uma planilha.
export interface ExercicioBiblioteca {
  id: string;
  nome: string;
  grupo: GrupoMuscular;
  equipamento?: string; // ex.: "Barra", "Halteres", "Peso corporal"
  instrucoes?: string;
  videoUrl?: string; // link de vídeo/gif demonstrativo (YouTube ou direto)
  criadoEm: string;
}

interface BlocoTreinoBase {
  id: string;
  exercicioIds: string[];
}

export interface BlocoIndividual extends BlocoTreinoBase {
  tipo: "individual";
}

export interface BlocoSuperset extends BlocoTreinoBase {
  tipo: "superset";
  rounds: number;
  descansoEntreRoundsSeg: number;
}

export interface BlocoCircuito extends BlocoTreinoBase {
  tipo: "circuito";
  rounds: number;
  trabalhoSeg?: number;
  transicaoSeg?: number;
  descansoEntreRoundsSeg: number;
}

export type BlocoTreino = BlocoIndividual | BlocoSuperset | BlocoCircuito;

export interface Divisao {
  id: string;
  nome: string; // ex.: "A — Peito e Tríceps"
  exercicios: Exercicio[];
  blocos?: BlocoTreino[];
  // Dias da semana em que esta divisão é o treino do dia (0=domingo … 6=sábado).
  // Opcional: sem dias, o portal cai no rodízio pela última divisão concluída.
  diasSemana?: number[];
}

export interface Treino {
  id: string;
  alunoId: string;
  nome: string; // ex.: "Treino ABC — Hipertrofia"
  descricao?: string;
  ativo: boolean;
  divisoes: Divisao[];
  templateOrigemId?: string;
  duplicadoDeTreinoId?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// Modelo reutilizável de planilha. Não pertence a um aluno e sempre é clonado
// com novos IDs ao ser aplicado, evitando que edições futuras vazem entre alunos.
export interface TemplateTreino {
  id: string;
  nome: string;
  descricao?: string;
  divisoes: Divisao[];
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusPrograma = "rascunho" | "ativo" | "concluido" | "cancelado";

export interface FasePrograma {
  id: string;
  nome: string;
  ordem: number;
  semanaInicial: number;
  duracaoSemanas: number;
  treinoIds: string[];
  objetivo?: string;
  observacoes?: string;
}

export interface ProgramaTreino {
  id: string;
  alunoId: string;
  nome: string;
  objetivo?: string;
  dataInicio: string;
  dataFim: string;
  status: StatusPrograma;
  fases: FasePrograma[];
  renovadoDeProgramaId?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusSugestaoProgressao = "pendente" | "aceita" | "ignorada";

export interface SugestaoProgressao {
  id: string;
  alunoId: string;
  historicoOrigemId: string;
  treinoId?: string;
  divisaoId?: string;
  exercicioId?: string;
  bibliotecaId?: string;
  exercicioNomeSnapshot: string;
  cargaAtualKg: number;
  cargaSugeridaKg: number;
  rpeMedio: number;
  motivo: string;
  status: StatusSugestaoProgressao;
  criadoEm: string;
  resolvidoEm?: string;
}

// ── Nutrição ──────────────────────────────────────────────────────────────
// Plano alimentar montado pelo personal para o aluno: metas de macros + refeições.
// Frontend-first: sem cálculo de tabela nutricional, o personal define os alvos.

export type StatusPlanoAlimentar = "ativo" | "arquivado";

export interface AlimentoRefeicao {
  id: string;
  nome: string; // "Ovo mexido", "Aveia em flocos" (snapshot exibido)
  quantidade: string; // texto livre pt-BR: "2 unid", "40 g", "1 scoop"
  observacao?: string;
  // Vínculo opcional ao banco de alimentos para cálculo automático de macros.
  // Retrocompatível: alimentos avulsos (texto livre) não têm bancoId/quantidadeNum.
  bancoId?: string;
  quantidadeNum?: number; // quantidade numérica na unidade do alimento vinculado
}

// ── Banco de alimentos ──────────────────────────────────────────────────────
// Catálogo global de alimentos com macros por porção de referência, usado para
// calcular automaticamente os macros das refeições de um plano.

export type CategoriaAlimento =
  | "proteina"
  | "carboidrato"
  | "gordura"
  | "fruta"
  | "vegetal"
  | "laticinio"
  | "bebida"
  | "suplemento"
  | "outro";

export type UnidadeMedidaAlimento = "g" | "ml" | "unidade";

export interface MacrosCalculados {
  kcal: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
}

export interface AlimentoBanco {
  id: string;
  nome: string;
  categoria: CategoriaAlimento;
  unidade: UnidadeMedidaAlimento;
  base: number; // porção de referência dos macros: 100 (g/ml) ou 1 (unidade)
  kcal: number; // valores por `base` `unidade`
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  marca?: string;
  criadoEm: string;
}

export interface RefeicaoPlano {
  id: string;
  nome: string; // "Café da manhã", "Pós-treino"
  horario?: string; // "07:30" (HH:MM, opcional)
  alimentos: AlimentoRefeicao[];
  observacao?: string;
}

// Metas diárias de macronutrientes. Todos opcionais — o personal preenche o que orienta.
export interface MetasMacros {
  calorias?: number; // kcal/dia
  proteinas?: number; // g/dia
  carboidratos?: number; // g/dia
  gorduras?: number; // g/dia
}

// Adesão diária: quais refeições do plano o aluno marcou como feitas num dia.
export interface RegistroRefeicoesDia {
  id: string;
  alunoId: string;
  planoId: string;
  data: string; // YYYY-MM-DD local
  refeicoesFeitas: string[]; // ids de RefeicaoPlano concluídas
  criadoEm: string;
  atualizadoEm: string;
}

export interface PlanoAlimentar {
  id: string;
  alunoId: string;
  titulo: string; // "Cutting — Fase 1"
  objetivo?: string; // texto livre: "Déficit leve mantendo massa"
  status: StatusPlanoAlimentar;
  metas: MetasMacros;
  aguaLitros?: number; // meta de água/dia em litros
  refeicoes: RefeicaoPlano[];
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
  arquivadoEm?: string;
}
