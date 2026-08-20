"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AlimentoBanco,
  PersonalPublico,
  Aluno,
  AnamneseDigital,
  Avaliacao,
  BlocoTreino,
  CheckinSemanal,
  ConfiguracaoHabitos,
  Divisao,
  Exercicio,
  ExercicioBiblioteca,
  HistoricoExercicio,
  Interessado,
  LembreteWhatsApp,
  MetaAluno,
  PacoteSessoes,
  Pagamento,
  PlanoAlimentar,
  FasePrograma,
  ProgramaTreino,
  RegistroHabitosDiario,
  RegistroRefeicoesDia,
  SolicitacaoSubstituicao,
  SugestaoProgressao,
  Sessao,
  StatusInteressado,
  TemplateTreino,
  Treino,
  VideoExecucao,
} from "./types";
import {
  normalizarRascunhoAnamnese,
  validarAnamneseParaEnvio,
  type SalvarRascunhoAnamneseInput,
} from "./anamnese";
import {
  normalizarMetaAlunoInput,
  ordenarMetasAluno,
  type CriarMetaAlunoInput,
} from "./metas";
import {
  adicionarContatoInteressado,
  aplicarAgendamentoAulaExperimental,
  aplicarAtualizacaoAulaExperimental,
  aplicarAtualizacaoInteressado,
  aplicarPerdaInteressado,
  aplicarReativacaoInteressado,
  aplicarStatusInteressado,
  converterInteressadoParaAluno,
  normalizarCriarInteressadoInput,
  ordenarInteressados,
  type AgendarAulaExperimentalInput,
  type AtualizarAulaExperimentalInput,
  type AtualizarInteressadoInput,
  type ConverterInteressadoDominioInput,
  type CriarAlunoConversaoInput,
  type CriarInteressadoInput,
  type RegistrarContatoInteressadoInput,
} from "./interessados";
import { vencimentoDe } from "./pagamentos";
import {
  normalizarPlanoInput,
  ordenarPlanos,
  type CriarPlanoAlimentarInput,
} from "./nutricao";
import {
  normalizarAlimentoBancoInput,
  type CriarAlimentoBancoInput,
} from "./alimentos";
import { CURRENT_SCHEMA_VERSION, migrarStoreData } from "./persistencia";
import { sugestoesMaisRecentes } from "./progressao";
import { gerarCandidatosLembrete } from "./lembretes-whatsapp";
import {
  dataLocalHoje,
  normalizarConfiguracaoHabitos,
  normalizarValoresHabitos,
  validarDataLocalHabitos,
} from "./habitos";
import { conflitosEntreCandidatosEExistentes, gerarDatasRecorrentes } from "./agenda";
import {
  normalizarPerfilPublicoInput,
  type SalvarPerfilPublicoInput,
} from "./catalogo";
import {
  alunosSeed,
  avaliacoesSeed,
  bancoAlimentosSeed,
  bibliotecaSeed,
  historicoExerciciosSeed,
  pagamentosSeed,
  perfisPublicosSeed,
  planosAlimentaresSeed,
  sessoesSeed,
  treinosSeed,
} from "./seed";
import { hojeIso, somarDias } from "./data";
import { uid } from "./id";
import {
  clonarDivisoes,
  exercicioCorrespondeSugestao,
  mesmoExercicio,
  removerExercicioDosBlocos,
  salvarBloco,
  trocarPosicao,
} from "./store-treino";
import {
  diferencaDiasIso,
  erroDeConflito,
  interessadoObrigatorio,
  validarAgendamento,
  validarCheckinSemanal,
  validarDadosPacote,
  validarDatasNoPacote,
  validarExercicioSubstituto,
  validarMudancaSessaoComPacote,
  validarRegistroTreino,
  validarReservaDoPacote,
  validarSolicitacaoSubstituicao,
  validarVideoExecucao,
} from "./store-validacoes";

const STORAGE_KEY = "pt.app.v1";

export interface StoreData {
  schemaVersion: number;
  alunos: Aluno[];
  interessados: Interessado[];
  anamneses: AnamneseDigital[];
  metasAluno: MetaAluno[];
  treinos: Treino[];
  avaliacoes: Avaliacao[];
  sessoes: Sessao[];
  pagamentos: Pagamento[];
  biblioteca: ExercicioBiblioteca[];
  historicoExercicios: HistoricoExercicio[];
  templatesTreino: TemplateTreino[];
  programasTreino: ProgramaTreino[];
  sugestoesProgressao: SugestaoProgressao[];
  checkinsSemanais: CheckinSemanal[];
  lembretesWhatsApp: LembreteWhatsApp[];
  pacotesSessoes: PacoteSessoes[];
  solicitacoesSubstituicao: SolicitacaoSubstituicao[];
  videosExecucao: VideoExecucao[];
  configuracoesHabitos: ConfiguracaoHabitos[];
  registrosHabitos: RegistroHabitosDiario[];
  planosAlimentares: PlanoAlimentar[];
  registrosRefeicoes: RegistroRefeicoesDia[];
  bancoAlimentos: AlimentoBanco[];
  perfisPublicos: PersonalPublico[];
}

export type CriarAlunoInput = CriarAlunoConversaoInput;

export type ConverterInteressadoInput = ConverterInteressadoDominioInput;

export type {
  AgendarAulaExperimentalInput,
  AtualizarAulaExperimentalInput,
  AtualizarInteressadoInput,
  CriarInteressadoInput,
  RegistrarContatoInteressadoInput,
} from "./interessados";

import type {
  AplicarTemplateOpcoes,
  BlocoTreinoInput,
  CancelarSessaoOpcoes,
  CriarLembreteWhatsAppInput,
  CriarSolicitacaoSubstituicaoInput,
  CriarVideoExecucaoInput,
  EscopoRecorrenciaSessao,
  ExercicioHistoricoFiltro,
  ExercicioSubstitutoInput,
  PacoteSessoesInput,
  RegistrarTreinoRealizadoInput,
  SalvarCheckinSemanalInput,
  SalvarConfiguracaoHabitosInput,
  SalvarRegistroHabitosInput,
  SessaoAgendamentoInput,
} from "./store-tipos";

// Reexportados pra não quebrar quem já importa esses tipos de "@/lib/store".
export type {
  AplicarTemplateOpcoes,
  BlocoTreinoInput,
  CancelarSessaoOpcoes,
  CriarLembreteWhatsAppInput,
  CriarSolicitacaoSubstituicaoInput,
  CriarVideoExecucaoInput,
  EscopoRecorrenciaSessao,
  ExercicioHistoricoFiltro,
  ExercicioSubstitutoInput,
  PacoteSessoesInput,
  RegistrarTreinoRealizadoInput,
  RegistroExercicioPorSerieInput,
  SalvarCheckinSemanalInput,
  SalvarConfiguracaoHabitosInput,
  SalvarRegistroHabitosInput,
  SerieExecutadaInput,
  SessaoAgendamentoInput,
} from "./store-tipos";

/**
 * Leitura: as coleções e as funções que consultam/derivam a partir delas.
 * Muda a cada alteração de dado — quem depende disso re-renderiza.
 */
interface StoreConsultas extends StoreData {
  getAluno: (id: string) => Aluno | undefined;
  // CRM de interessados
  interessadoPorId: (id: string) => Interessado | undefined;
  interessadosOrdenados: (hoje?: string) => Interessado[];
  updateInteressado: (id: string, input: AtualizarInteressadoInput) => Interessado;
  alterarStatusInteressado: (id: string, status: StatusInteressado) => Interessado;
  registrarContatoInteressado: (
    id: string,
    input: RegistrarContatoInteressadoInput,
  ) => Interessado;
  agendarAulaExperimental: (
    id: string,
    input: AgendarAulaExperimentalInput,
  ) => Interessado;
  atualizarAulaExperimental: (
    id: string,
    input: AtualizarAulaExperimentalInput,
  ) => Interessado;
  marcarInteressadoPerdido: (id: string, motivo: string) => Interessado;
  reativarInteressado: (id: string) => Interessado;
  converterInteressado: (
    id: string,
    input?: ConverterInteressadoInput,
  ) => Aluno;
  anamneseDoAluno: (alunoId: string) => AnamneseDigital | undefined;
  salvarRascunhoAnamnese: (
    alunoId: string,
    input: SalvarRascunhoAnamneseInput,
  ) => AnamneseDigital;
  enviarAnamnese: (alunoId: string) => AnamneseDigital;
  revisarAnamnese: (
    alunoId: string,
    observacaoPersonal?: string,
  ) => AnamneseDigital;
  reabrirAnamnese: (alunoId: string) => AnamneseDigital;
  metasDoAluno: (alunoId: string) => MetaAluno[];
  addMetaAluno: (alunoId: string, input: CriarMetaAlunoInput) => MetaAluno;
  updateMetaAluno: (id: string, input: CriarMetaAlunoInput) => MetaAluno;
  concluirMetaAluno: (id: string) => MetaAluno;
  reativarMetaAluno: (id: string) => MetaAluno;
  arquivarMetaAluno: (id: string) => MetaAluno;
  avaliacoesDoAluno: (alunoId: string) => Avaliacao[];
  addSessao: (data: Omit<Sessao, "id" | "criadoEm" | "status"> & { status?: Sessao["status"] }) => Sessao;
  updateSessao: (id: string, patch: Partial<Sessao>) => void;
  agendarSessoes: (
    data: SessaoAgendamentoInput,
    opcoes?: { semanas?: number; permitirConflito?: boolean },
  ) => Sessao[];
  updateSessaoRecorrente: (
    id: string,
    patch: Partial<SessaoAgendamentoInput>,
    escopo?: EscopoRecorrenciaSessao,
    permitirConflito?: boolean,
  ) => void;
  cancelarSessao: (id: string, opcoes?: CancelarSessaoOpcoes) => Sessao | undefined;
  registrarTreinoRealizado: (data: RegistrarTreinoRealizadoInput) => Sessao;
  // pacotes de sessões
  pacotesDoAluno: (alunoId: string) => PacoteSessoes[];
  addPacoteSessoes: (alunoId: string, data: PacoteSessoesInput) => PacoteSessoes;
  updatePacoteSessoes: (id: string, patch: Partial<PacoteSessoesInput>) => void;
  removePacoteSessoes: (id: string) => void;
  // solicitações de substituição de exercício
  solicitacoesDoAluno: (alunoId: string) => SolicitacaoSubstituicao[];
  solicitacaoPendenteExercicio: (
    alunoId: string,
    treinoId: string,
    divisaoId: string,
    exercicioId: string,
  ) => SolicitacaoSubstituicao | undefined;
  addSolicitacaoSubstituicao: (
    data: CriarSolicitacaoSubstituicaoInput,
  ) => SolicitacaoSubstituicao;
  aprovarSolicitacaoSubstituicao: (
    id: string,
    substituto: ExercicioSubstitutoInput,
    respostaPersonal?: string,
  ) => boolean;
  recusarSolicitacaoSubstituicao: (id: string, respostaPersonal: string) => void;
  // vídeos de execução
  videosDoAluno: (alunoId: string) => VideoExecucao[];
  addVideoExecucao: (data: CriarVideoExecucaoInput) => VideoExecucao;
  revisarVideoExecucao: (id: string, comentarioPersonal: string) => void;
  configuracaoHabitosDoAluno: (alunoId: string) => ConfiguracaoHabitos | undefined;
  registrosHabitosDoAluno: (alunoId: string) => RegistroHabitosDiario[];
  registroHabitosDoDia: (
    alunoId: string,
    data: string,
  ) => RegistroHabitosDiario | undefined;
  salvarConfiguracaoHabitos: (
    alunoId: string,
    input: SalvarConfiguracaoHabitosInput,
  ) => ConfiguracaoHabitos;
  salvarRegistroHabitos: (input: SalvarRegistroHabitosInput) => RegistroHabitosDiario;
  planosDoAluno: (alunoId: string) => PlanoAlimentar[];
  planoAtivoDoAluno: (alunoId: string) => PlanoAlimentar | undefined;
  addPlanoAlimentar: (alunoId: string, input: CriarPlanoAlimentarInput) => PlanoAlimentar;
  updatePlanoAlimentar: (id: string, input: CriarPlanoAlimentarInput) => PlanoAlimentar;
  arquivarPlanoAlimentar: (id: string) => PlanoAlimentar;
  reativarPlanoAlimentar: (id: string) => PlanoAlimentar;
  registroRefeicoesDoDia: (alunoId: string, data: string) => RegistroRefeicoesDia | undefined;
  registrosRefeicoesDoAluno: (alunoId: string) => RegistroRefeicoesDia[];
  // banco de alimentos
  updateAlimentoBanco: (id: string, input: CriarAlimentoBancoInput) => AlimentoBanco;
  getAlimentoBanco: (id: string) => AlimentoBanco | undefined;
  // catálogo de personais (perfil público)
  perfilPublicoPorEmail: (email: string) => PersonalPublico | undefined;
  perfilPublicoPorId: (id: string) => PersonalPublico | undefined;
  salvarPerfilPublico: (input: SalvarPerfilPublicoInput) => PersonalPublico;
  checkinsDoAluno: (alunoId: string) => CheckinSemanal[];
  checkinDaSemana: (alunoId: string, semanaInicio: string) => CheckinSemanal | undefined;
  salvarCheckinSemanal: (data: SalvarCheckinSemanalInput) => CheckinSemanal;
  revisarCheckinSemanal: (id: string, comentario?: string) => boolean;
  // lembretes WhatsApp
  lembretesDoAluno: (alunoId: string) => LembreteWhatsApp[];
  sincronizarLembretesWhatsApp: (hoje?: string) => number;
  addLembreteWhatsApp: (data: CriarLembreteWhatsAppInput) => LembreteWhatsApp;
  historicoDoAluno: (alunoId: string) => HistoricoExercicio[];
  ultimoHistoricoExercicio: (
    alunoId: string,
    exercicio: ExercicioHistoricoFiltro,
  ) => HistoricoExercicio | undefined;
  // pagamentos (financeiro)
  pagamentosDaCompetencia: (competencia: string) => Pagamento[];
  gerarCobrancas: (competencia: string) => number;
  // biblioteca de exercícios (catálogo reutilizável)
  getExercicioBiblioteca: (id: string) => ExercicioBiblioteca | undefined;
  // treinos
  treinosDoAluno: (alunoId: string) => Treino[];
  getTreino: (id: string) => Treino | undefined;
  duplicarTreino: (id: string) => Treino | undefined;
  // templates de treino
  criarTemplateDeTreino: (treinoId: string, nome?: string) => TemplateTreino | undefined;
  duplicarTemplateTreino: (id: string) => TemplateTreino | undefined;
  aplicarTemplateTreino: (
    templateId: string,
    alunoIds: string[],
    opcoes?: AplicarTemplateOpcoes,
  ) => Treino[];
  programasDoAluno: (alunoId: string) => ProgramaTreino[];
  renovarProgramaTreino: (
    id: string,
    data: Pick<ProgramaTreino, "nome" | "dataInicio" | "dataFim"> & { ativar?: boolean },
  ) => ProgramaTreino | undefined;
  sugestoesDoAluno: (alunoId: string) => SugestaoProgressao[];
  gerarSugestoesProgressao: (alunoId: string) => number;
  aceitarSugestaoProgressao: (id: string) => boolean;
}

/**
 * Escrita: só muda dado, nunca lê. Por isso o objeto é criado uma vez e nunca
 * troca de identidade — quem usa `useAcoes()` não re-renderiza quando o dado muda.
 */
interface StoreAcoes {
  addAluno: (data: CriarAlunoInput) => Aluno;
  updateAluno: (id: string, data: Partial<Aluno>) => void;
  removeAluno: (id: string) => void;
  addInteressado: (input: CriarInteressadoInput) => Interessado;
  removeInteressado: (id: string) => void;
  // anamnese digital (uma por aluno)
  removerAnamnese: (alunoId: string) => void;
  // metas de evolução (múltiplas por aluno)
  removeMetaAluno: (id: string) => void;
  // backup (substitui toda a base — usado na importação)
  substituirTudo: (data: StoreData) => void;
  // avaliações físicas
  addAvaliacao: (alunoId: string, data: Omit<Avaliacao, "id" | "alunoId" | "criadoEm">) => Avaliacao;
  updateAvaliacao: (id: string, patch: Partial<Avaliacao>) => void;
  removeAvaliacao: (id: string) => void;
  // sessões (agenda)
  removeSessao: (id: string) => void;
  encerrarPacoteSessoes: (id: string) => void;
  reativarPacoteSessoes: (id: string) => void;
  cancelarSolicitacaoSubstituicao: (id: string) => void;
  removeVideoExecucao: (id: string) => void;
  // hábitos diários
  removerConfiguracaoHabitos: (alunoId: string) => void;
  removerRegistroHabitos: (id: string) => void;
  // nutrição
  removePlanoAlimentar: (id: string) => void;
  // adesão às refeições (marcadas pelo aluno)
  alternarRefeicaoFeita: (
    alunoId: string,
    planoId: string,
    data: string,
    refeicaoId: string,
  ) => void;
  addAlimentoBanco: (input: CriarAlimentoBancoInput) => AlimentoBanco;
  removeAlimentoBanco: (id: string) => void;
  removerPerfilPublico: (id: string) => void;
  // check-in semanal
  marcarLembreteWhatsAppEnviado: (id: string) => void;
  dispensarLembreteWhatsApp: (id: string) => void;
  reativarLembreteWhatsApp: (id: string) => void;
  // histórico de exercícios realizados
  addPagamento: (data: Omit<Pagamento, "id" | "criadoEm" | "status"> & { status?: Pagamento["status"] }) => Pagamento;
  updatePagamento: (id: string, patch: Partial<Pagamento>) => void;
  removePagamento: (id: string) => void;
  marcarPago: (id: string, dados?: { pagoEm?: string; metodo?: string }) => void;
  marcarPendente: (id: string) => void;
  // Gera as cobranças de uma competência para os alunos ativos com mensalidade.
  // Não duplica: pula quem já tem cobrança no mês. Retorna quantas foram criadas.
  addExercicioBiblioteca: (data: Omit<ExercicioBiblioteca, "id" | "criadoEm">) => ExercicioBiblioteca;
  updateExercicioBiblioteca: (id: string, patch: Partial<ExercicioBiblioteca>) => void;
  removeExercicioBiblioteca: (id: string) => void;
  addTreino: (alunoId: string, nome: string, descricao?: string) => Treino;
  updateTreino: (id: string, data: Partial<Treino>) => void;
  ativarTreino: (id: string) => void;
  removeTreino: (id: string) => void;
  addTemplateTreino: (nome: string, descricao?: string) => TemplateTreino;
  updateTemplateTreino: (id: string, patch: Partial<Pick<TemplateTreino, "nome" | "descricao">>) => void;
  removeTemplateTreino: (id: string) => void;
  addDivisaoTemplate: (templateId: string, nome: string) => void;
  updateDivisaoTemplate: (templateId: string, divisaoId: string, nome: string) => void;
  removeDivisaoTemplate: (templateId: string, divisaoId: string) => void;
  addExercicioTemplate: (templateId: string, divisaoId: string, ex: Omit<Exercicio, "id">) => void;
  updateExercicioTemplate: (templateId: string, divisaoId: string, ex: Exercicio) => void;
  removeExercicioTemplate: (templateId: string, divisaoId: string, exId: string) => void;
  addBlocoTemplate: (templateId: string, divisaoId: string, bloco: BlocoTreinoInput) => void;
  updateBlocoTemplate: (templateId: string, divisaoId: string, bloco: BlocoTreino) => void;
  removeBlocoTemplate: (templateId: string, divisaoId: string, blocoId: string) => void;
  // periodização
  addProgramaTreino: (
    alunoId: string,
    data: Pick<ProgramaTreino, "nome" | "objetivo" | "dataInicio" | "dataFim">,
  ) => ProgramaTreino;
  updateProgramaTreino: (
    id: string,
    patch: Partial<Pick<ProgramaTreino, "nome" | "objetivo" | "dataInicio" | "dataFim" | "status">>,
  ) => void;
  ativarProgramaTreino: (id: string) => void;
  removeProgramaTreino: (id: string) => void;
  addFasePrograma: (
    programaId: string,
    data: Omit<FasePrograma, "id" | "ordem">,
  ) => void;
  updateFasePrograma: (
    programaId: string,
    faseId: string,
    patch: Partial<Omit<FasePrograma, "id">>,
  ) => void;
  moverFasePrograma: (programaId: string, faseId: string, direcao: "cima" | "baixo") => void;
  removeFasePrograma: (programaId: string, faseId: string) => void;
  // progressão
  ignorarSugestaoProgressao: (id: string) => void;
  // divisões
  addDivisao: (treinoId: string, nome: string) => void;
  updateDivisao: (treinoId: string, divisaoId: string, nome: string) => void;
  setDivisaoDias: (treinoId: string, divisaoId: string, dias: number[]) => void;
  removeDivisao: (treinoId: string, divisaoId: string) => void;
  // exercícios
  addExercicio: (treinoId: string, divisaoId: string, ex: Omit<Exercicio, "id">) => void;
  updateExercicio: (treinoId: string, divisaoId: string, ex: Exercicio) => void;
  removeExercicio: (treinoId: string, divisaoId: string, exId: string) => void;
  moverExercicio: (
    treinoId: string,
    divisaoId: string,
    exId: string,
    direcao: -1 | 1,
  ) => void;
  addBlocoTreino: (treinoId: string, divisaoId: string, bloco: BlocoTreinoInput) => void;
  updateBlocoTreino: (treinoId: string, divisaoId: string, bloco: BlocoTreino) => void;
  removeBlocoTreino: (treinoId: string, divisaoId: string, blocoId: string) => void;
}

type StoreContextValue = StoreConsultas & StoreAcoes;


// Dois contextos de propósito: quem só escreve (formulários, botões) assina
// `AcoesContext` e para de re-renderizar quando qualquer dado muda.
const StoreContext = createContext<StoreContextValue | null>(null);
const AcoesContext = createContext<StoreAcoes | null>(null);

/**
 * Quem entra nas listas, relatórios, cobranças e lembretes do personal.
 * Conta criada no app (`contaApp`) só entra depois de vinculada a um personal.
 */
function naCarteiraDoPersonal(aluno: Aluno): boolean {
  return !aluno.contaApp || Boolean(aluno.personalEmail);
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    alunos: [],
    interessados: [],
    anamneses: [],
    metasAluno: [],
    treinos: [],
    avaliacoes: [],
    sessoes: [],
    pagamentos: [],
    biblioteca: [],
    historicoExercicios: [],
    templatesTreino: [],
    programasTreino: [],
    sugestoesProgressao: [],
    checkinsSemanais: [],
    lembretesWhatsApp: [],
    pacotesSessoes: [],
    solicitacoesSubstituicao: [],
    videosExecucao: [],
    configuracoesHabitos: [],
    registrosHabitos: [],
    planosAlimentares: [],
    registrosRefeicoes: [],
    bancoAlimentos: [],
    perfisPublicos: [],
  });
  const [hydrated, setHydrated] = useState(false);
  const [persistenciaLiberada, setPersistenciaLiberada] = useState(false);

  // hidratação a partir do localStorage (ou seed na primeira vez)
  useEffect(() => {
    const seed: StoreData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      alunos: alunosSeed,
      interessados: [],
      anamneses: [],
      metasAluno: [],
      treinos: treinosSeed,
      avaliacoes: avaliacoesSeed,
      sessoes: sessoesSeed(),
      pagamentos: pagamentosSeed(),
      biblioteca: bibliotecaSeed,
      historicoExercicios: historicoExerciciosSeed(),
      templatesTreino: [],
      programasTreino: [],
      sugestoesProgressao: [],
      checkinsSemanais: [],
      lembretesWhatsApp: [],
      pacotesSessoes: [],
      solicitacoesSubstituicao: [],
      videosExecucao: [],
      configuracoesHabitos: [],
      registrosHabitos: [],
      planosAlimentares: planosAlimentaresSeed(),
      registrosRefeicoes: [],
      bancoAlimentos: bancoAlimentosSeed,
      perfisPublicos: perfisPublicosSeed,
    };
    let inicial: StoreData = seed;
    let podePersistir = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        inicial = migrarStoreData(JSON.parse(raw), {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          alunos: [],
          interessados: [],
          anamneses: [],
          metasAluno: [],
          treinos: [],
          avaliacoes: [],
          sessoes: [],
          pagamentos: [],
          biblioteca: bibliotecaSeed,
          historicoExercicios: [],
          templatesTreino: [],
          programasTreino: [],
          sugestoesProgressao: [],
          checkinsSemanais: [],
          lembretesWhatsApp: [],
          pacotesSessoes: [],
          solicitacoesSubstituicao: [],
          videosExecucao: [],
          configuracoesHabitos: [],
          registrosHabitos: [],
          planosAlimentares: [],
          registrosRefeicoes: [],
          bancoAlimentos: bancoAlimentosSeed,
          perfisPublicos: perfisPublicosSeed,
        });
      }
    } catch (error) {
      inicial = seed;
      podePersistir = false;
      console.error("Não foi possível migrar a base local. A gravação foi bloqueada.", error);
    }
    // Carga inicial do estado no mount (padrão SSR-safe de hidratação do localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(inicial);
    setPersistenciaLiberada(podePersistir);
    setHydrated(true);
  }, []);

  // persistência
  useEffect(() => {
    if (!hydrated || !persistenciaLiberada) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated, persistenciaLiberada]);

  // Escrita: criado uma vez (deps []) e nunca mais trocado. Todas as ações
  // usam `setData(d => ...)`, então nenhuma precisa enxergar o estado atual —
  // é isso que deixa a identidade do objeto estável entre renders.
  const acoes = useMemo<StoreAcoes>(() => {
    const mutTreino = (id: string, fn: (t: Treino) => Treino) =>
      setData((d) => ({
        ...d,
        treinos: d.treinos.map((t) =>
          t.id === id ? { ...fn(t), atualizadoEm: new Date().toISOString() } : t,
        ),
      }));

    return {
      addAluno: (input) => {
        const aluno: Aluno = {
          id: uid("aluno"),
          criadoEm: new Date().toISOString(),
          ativo: input.ativo ?? true,
          ...input,
        };
        setData((d) => ({ ...d, alunos: [aluno, ...d.alunos] }));
        return aluno;
      },
      updateAluno: (id, patch) =>
        setData((d) => ({
          ...d,
          alunos: d.alunos.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAluno: (id) => {
        const agora = new Date().toISOString();
        setData((d) => ({
          ...d,
          alunos: d.alunos.filter((a) => a.id !== id),
          interessados: d.interessados.map((interessado) =>
            interessado.convertidoAlunoId === id
              ? {
                  ...interessado,
                  status: "em-contato",
                  convertidoAlunoId: undefined,
                  convertidoEm: undefined,
                  atualizadoEm: agora,
                }
              : interessado,
          ),
          anamneses: d.anamneses.filter((anamnese) => anamnese.alunoId !== id),
          metasAluno: d.metasAluno.filter((meta) => meta.alunoId !== id),
          treinos: d.treinos.filter((t) => t.alunoId !== id),
          avaliacoes: d.avaliacoes.filter((av) => av.alunoId !== id),
          sessoes: d.sessoes.filter((s) => s.alunoId !== id),
          pagamentos: d.pagamentos.filter((p) => p.alunoId !== id),
          historicoExercicios: d.historicoExercicios.filter((h) => h.alunoId !== id),
          programasTreino: d.programasTreino.filter((programa) => programa.alunoId !== id),
          sugestoesProgressao: d.sugestoesProgressao.filter(
            (sugestao) => sugestao.alunoId !== id,
          ),
          checkinsSemanais: d.checkinsSemanais.filter(
            (checkin) => checkin.alunoId !== id,
          ),
          lembretesWhatsApp: d.lembretesWhatsApp.filter(
            (lembrete) => lembrete.alunoId !== id,
          ),
          pacotesSessoes: d.pacotesSessoes.filter((pacote) => pacote.alunoId !== id),
          solicitacoesSubstituicao: d.solicitacoesSubstituicao.filter(
            (solicitacao) => solicitacao.alunoId !== id,
          ),
          videosExecucao: d.videosExecucao.filter((video) => video.alunoId !== id),
          configuracoesHabitos: d.configuracoesHabitos.filter(
            (configuracao) => configuracao.alunoId !== id,
          ),
          registrosHabitos: d.registrosHabitos.filter(
            (registro) => registro.alunoId !== id,
          ),
          planosAlimentares: d.planosAlimentares.filter((plano) => plano.alunoId !== id),
          registrosRefeicoes: d.registrosRefeicoes.filter(
            (registro) => registro.alunoId !== id,
          ),
        }));
      },
      addInteressado: (input) => {
        const agora = new Date().toISOString();
        const interessado: Interessado = {
          ...normalizarCriarInteressadoInput(input),
          id: uid("interessado"),
          status: "novo",
          historicoContatos: [],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        setData((d) => ({
          ...d,
          interessados: [interessado, ...d.interessados],
        }));
        return interessado;
      },
      removeInteressado: (id) =>
        setData((d) => ({
          ...d,
          interessados: d.interessados.filter((item) => item.id !== id),
        })),

      removerAnamnese: (alunoId) =>
        setData((d) => ({
          ...d,
          anamneses: d.anamneses.filter(
            (anamnese) => anamnese.alunoId !== alunoId,
          ),
        })),

      removeMetaAluno: (id) =>
        setData((d) => ({
          ...d,
          metasAluno: d.metasAluno.filter((meta) => meta.id !== id),
        })),

      substituirTudo: (novo) => {
        setData(novo);
        setPersistenciaLiberada(true);
      },

      addAvaliacao: (alunoId, input) => {
        const avaliacao: Avaliacao = {
          id: uid("aval"),
          alunoId,
          criadoEm: new Date().toISOString(),
          ...input,
        };
        setData((d) => ({ ...d, avaliacoes: [...d.avaliacoes, avaliacao] }));
        return avaliacao;
      },
      updateAvaliacao: (id, patch) =>
        setData((d) => ({
          ...d,
          avaliacoes: d.avaliacoes.map((av) => (av.id === id ? { ...av, ...patch } : av)),
        })),
      removeAvaliacao: (id) =>
        setData((d) => ({ ...d, avaliacoes: d.avaliacoes.filter((av) => av.id !== id) })),

      removeSessao: (id) =>
        setData((d) => ({
          ...d,
          sessoes: d.sessoes
            .filter((sessao) => sessao.id !== id)
            .map((sessao) => ({
              ...sessao,
              origemReposicaoId:
                sessao.origemReposicaoId === id ? undefined : sessao.origemReposicaoId,
              reposicaoSessaoId:
                sessao.reposicaoSessaoId === id ? undefined : sessao.reposicaoSessaoId,
            })),
          historicoExercicios: d.historicoExercicios.filter((h) => h.sessaoId !== id),
        })),
      encerrarPacoteSessoes: (id) =>
        setData((d) => ({
          ...d,
          pacotesSessoes: d.pacotesSessoes.map((pacote) =>
            pacote.id === id
              ? { ...pacote, ativo: false, atualizadoEm: new Date().toISOString() }
              : pacote,
          ),
          sessoes: d.sessoes.map((sessao) =>
            sessao.pacoteId === id && sessao.status === "agendada"
              ? { ...sessao, pacoteId: undefined }
              : sessao,
          ),
        })),
      reativarPacoteSessoes: (id) =>
        setData((d) => ({
          ...d,
          pacotesSessoes: d.pacotesSessoes.map((pacote) =>
            pacote.id === id
              ? { ...pacote, ativo: true, atualizadoEm: new Date().toISOString() }
              : pacote,
          ),
        })),
      cancelarSolicitacaoSubstituicao: (id) =>
        setData((d) => ({
          ...d,
          solicitacoesSubstituicao: d.solicitacoesSubstituicao.map((solicitacao) =>
            solicitacao.id === id && solicitacao.status === "pendente"
              ? {
                  ...solicitacao,
                  status: "cancelada",
                  respondidaEm: new Date().toISOString(),
                }
              : solicitacao,
          ),
        })),
      removeVideoExecucao: (id) =>
        setData((d) => ({
          ...d,
          videosExecucao: d.videosExecucao.filter((video) => video.id !== id),
        })),
      removerConfiguracaoHabitos: (alunoId) =>
        setData((d) => ({
          ...d,
          configuracoesHabitos: d.configuracoesHabitos.filter(
            (configuracao) => configuracao.alunoId !== alunoId,
          ),
        })),
      removerRegistroHabitos: (id) =>
        setData((d) => ({
          ...d,
          registrosHabitos: d.registrosHabitos.filter((registro) => registro.id !== id),
        })),

      // ── nutrição ──────────────────────────────────────────────────────
      removePlanoAlimentar: (id) =>
        setData((d) => ({
          ...d,
          planosAlimentares: d.planosAlimentares.filter((plano) => plano.id !== id),
        })),

      // ── adesão às refeições (marcadas pelo aluno no portal) ────────────
      alternarRefeicaoFeita: (alunoId, planoId, dataDia, refeicaoId) =>
        setData((d) => {
          const existente = d.registrosRefeicoes.find(
            (registro) => registro.alunoId === alunoId && registro.data === dataDia,
          );
          const agora = new Date().toISOString();
          if (!existente) {
            const novo: RegistroRefeicoesDia = {
              id: uid("refdia"),
              alunoId,
              planoId,
              data: dataDia,
              refeicoesFeitas: [refeicaoId],
              criadoEm: agora,
              atualizadoEm: agora,
            };
            return { ...d, registrosRefeicoes: [novo, ...d.registrosRefeicoes] };
          }
          const feitas = existente.refeicoesFeitas.includes(refeicaoId)
            ? existente.refeicoesFeitas.filter((id) => id !== refeicaoId)
            : [...existente.refeicoesFeitas, refeicaoId];
          return {
            ...d,
            registrosRefeicoes: d.registrosRefeicoes.map((registro) =>
              registro.id === existente.id
                ? { ...registro, planoId, refeicoesFeitas: feitas, atualizadoEm: agora }
                : registro,
            ),
          };
        }),

      // ── banco de alimentos ────────────────────────────────────────────
      addAlimentoBanco: (input) => {
        const alimento: AlimentoBanco = {
          ...normalizarAlimentoBancoInput(input),
          id: uid("alimento"),
          criadoEm: new Date().toISOString(),
        };
        setData((d) => ({ ...d, bancoAlimentos: [alimento, ...d.bancoAlimentos] }));
        return alimento;
      },
      removeAlimentoBanco: (id) =>
        setData((d) => ({
          ...d,
          bancoAlimentos: d.bancoAlimentos.filter((alimento) => alimento.id !== id),
        })),
      removerPerfilPublico: (id) =>
        setData((d) => ({
          ...d,
          perfisPublicos: d.perfisPublicos.filter((perfil) => perfil.id !== id),
        })),

      marcarLembreteWhatsAppEnviado: (id) =>
        setData((d) => ({
          ...d,
          lembretesWhatsApp: d.lembretesWhatsApp.map((lembrete) =>
            lembrete.id === id
              ? {
                  ...lembrete,
                  status: "enviado",
                  enviadoEm: new Date().toISOString(),
                  dispensadoEm: undefined,
                }
              : lembrete,
          ),
        })),
      dispensarLembreteWhatsApp: (id) =>
        setData((d) => ({
          ...d,
          lembretesWhatsApp: d.lembretesWhatsApp.map((lembrete) =>
            lembrete.id === id
              ? {
                  ...lembrete,
                  status: "dispensado",
                  dispensadoEm: new Date().toISOString(),
                }
              : lembrete,
          ),
        })),
      reativarLembreteWhatsApp: (id) =>
        setData((d) => ({
          ...d,
          lembretesWhatsApp: d.lembretesWhatsApp.map((lembrete) =>
            lembrete.id === id
              ? {
                  ...lembrete,
                  status: "pendente",
                  enviadoEm: undefined,
                  dispensadoEm: undefined,
                }
              : lembrete,
          ),
        })),
      addPagamento: (input) => {
        const pagamento: Pagamento = {
          id: uid("pag"),
          criadoEm: new Date().toISOString(),
          status: input.status ?? "pendente",
          ...input,
        };
        setData((d) => ({ ...d, pagamentos: [...d.pagamentos, pagamento] }));
        return pagamento;
      },
      updatePagamento: (id, patch) =>
        setData((d) => ({
          ...d,
          pagamentos: d.pagamentos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePagamento: (id) =>
        setData((d) => ({ ...d, pagamentos: d.pagamentos.filter((p) => p.id !== id) })),
      marcarPago: (id, dados) =>
        setData((d) => ({
          ...d,
          pagamentos: d.pagamentos.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "pago",
                  pagoEm: dados?.pagoEm ?? hojeIso(),
                  metodo: dados?.metodo ?? p.metodo,
                }
              : p,
          ),
        })),
      marcarPendente: (id) =>
        setData((d) => ({
          ...d,
          pagamentos: d.pagamentos.map((p) =>
            // remove pagoEm/metodo ao reverter para pendente
            p.id === id ? { ...p, status: "pendente", pagoEm: undefined, metodo: undefined } : p,
          ),
        })),
      addExercicioBiblioteca: (input) => {
        const item: ExercicioBiblioteca = {
          id: uid("bib"),
          criadoEm: new Date().toISOString(),
          ...input,
        };
        setData((d) => ({ ...d, biblioteca: [item, ...d.biblioteca] }));
        return item;
      },
      updateExercicioBiblioteca: (id, patch) =>
        setData((d) => ({
          ...d,
          biblioteca: d.biblioteca.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeExercicioBiblioteca: (id) =>
        setData((d) => ({ ...d, biblioteca: d.biblioteca.filter((b) => b.id !== id) })),
      addTreino: (alunoId, nome, descricao) => {
        const agora = new Date().toISOString();
        const treino: Treino = {
          id: uid("treino"),
          alunoId,
          nome,
          descricao,
          ativo: true,
          divisoes: [],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        setData((d) => ({
          ...d,
          treinos: [
            treino,
            ...d.treinos.map((item) =>
              item.alunoId === alunoId ? { ...item, ativo: false, atualizadoEm: agora } : item,
            ),
          ],
        }));
        return treino;
      },
      updateTreino: (id, patch) => mutTreino(id, (t) => ({ ...t, ...patch })),
      ativarTreino: (id) =>
        setData((d) => {
          const alvo = d.treinos.find((treino) => treino.id === id);
          if (!alvo) return d;
          const agora = new Date().toISOString();
          return {
            ...d,
            treinos: d.treinos.map((treino) =>
              treino.alunoId === alvo.alunoId
                ? { ...treino, ativo: treino.id === id, atualizadoEm: agora }
                : treino,
            ),
          };
        }),
      removeTreino: (id) =>
        setData((d) => ({ ...d, treinos: d.treinos.filter((t) => t.id !== id) })),
      addTemplateTreino: (nome, descricao) => {
        const agora = new Date().toISOString();
        const template: TemplateTreino = {
          id: uid("template"),
          nome: nome.trim() || "Novo modelo",
          descricao: descricao?.trim() || undefined,
          divisoes: [],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        setData((d) => ({ ...d, templatesTreino: [template, ...d.templatesTreino] }));
        return template;
      },
      updateTemplateTreino: (id, patch) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === id
              ? {
                  ...template,
                  ...patch,
                  nome: patch.nome?.trim() || template.nome,
                  descricao:
                    patch.descricao === undefined
                      ? template.descricao
                      : patch.descricao.trim() || undefined,
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      removeTemplateTreino: (id) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.filter((template) => template.id !== id),
        })),
      addDivisaoTemplate: (templateId, nome) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: [...template.divisoes, { id: uid("div"), nome, exercicios: [] }],
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      updateDivisaoTemplate: (templateId, divisaoId, nome) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId ? { ...divisao, nome } : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      removeDivisaoTemplate: (templateId, divisaoId) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.filter((divisao) => divisao.id !== divisaoId),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      addExercicioTemplate: (templateId, divisaoId, ex) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId
                      ? { ...divisao, exercicios: [...divisao.exercicios, { id: uid("ex"), ...ex }] }
                      : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      updateExercicioTemplate: (templateId, divisaoId, ex) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId
                      ? {
                          ...divisao,
                          exercicios: divisao.exercicios.map((item) =>
                            item.id === ex.id ? ex : item,
                          ),
                        }
                      : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      removeExercicioTemplate: (templateId, divisaoId, exId) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId
                      ? {
                          ...divisao,
                          exercicios: divisao.exercicios.filter((item) => item.id !== exId),
                          blocos: removerExercicioDosBlocos(divisao, exId),
                        }
                      : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      addBlocoTemplate: (templateId, divisaoId, bloco) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId ? salvarBloco(divisao, bloco) : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      updateBlocoTemplate: (templateId, divisaoId, bloco) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId
                      ? salvarBloco(divisao, bloco, bloco.id)
                      : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),
      removeBlocoTemplate: (templateId, divisaoId, blocoId) =>
        setData((d) => ({
          ...d,
          templatesTreino: d.templatesTreino.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  divisoes: template.divisoes.map((divisao) =>
                    divisao.id === divisaoId
                      ? {
                          ...divisao,
                          blocos: (divisao.blocos ?? []).filter(
                            (bloco) => bloco.id !== blocoId,
                          ),
                        }
                      : divisao,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : template,
          ),
        })),

      addProgramaTreino: (alunoId, input) => {
        const agora = new Date().toISOString();
        const programa: ProgramaTreino = {
          id: uid("programa"),
          alunoId,
          nome: input.nome.trim() || "Novo programa",
          objetivo: input.objetivo?.trim() || undefined,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          status: "rascunho",
          fases: [],
          criadoEm: agora,
          atualizadoEm: agora,
        };
        setData((d) => ({ ...d, programasTreino: [programa, ...d.programasTreino] }));
        return programa;
      },
      updateProgramaTreino: (id, patch) =>
        setData((d) => ({
          ...d,
          programasTreino: d.programasTreino.map((programa) =>
            programa.id === id
              ? {
                  ...programa,
                  ...patch,
                  nome: patch.nome?.trim() || programa.nome,
                  objetivo:
                    patch.objetivo === undefined
                      ? programa.objetivo
                      : patch.objetivo.trim() || undefined,
                  atualizadoEm: new Date().toISOString(),
                }
              : programa,
          ),
        })),
      ativarProgramaTreino: (id) =>
        setData((d) => {
          const alvo = d.programasTreino.find((programa) => programa.id === id);
          if (!alvo) return d;
          const agora = new Date().toISOString();
          return {
            ...d,
            programasTreino: d.programasTreino.map((programa) =>
              programa.alunoId === alvo.alunoId
                ? {
                    ...programa,
                    status: programa.id === id ? "ativo" : programa.status === "ativo" ? "rascunho" : programa.status,
                    atualizadoEm: agora,
                  }
                : programa,
            ),
          };
        }),
      removeProgramaTreino: (id) =>
        setData((d) => ({
          ...d,
          programasTreino: d.programasTreino.filter((programa) => programa.id !== id),
        })),
      addFasePrograma: (programaId, input) =>
        setData((d) => ({
          ...d,
          programasTreino: d.programasTreino.map((programa) =>
            programa.id === programaId
              ? {
                  ...programa,
                  fases: [
                    ...programa.fases,
                    {
                      ...input,
                      id: uid("fase"),
                      nome: input.nome.trim() || `Fase ${programa.fases.length + 1}`,
                      ordem: programa.fases.length,
                      semanaInicial: Math.max(1, input.semanaInicial),
                      duracaoSemanas: Math.max(1, input.duracaoSemanas),
                      treinoIds: Array.from(new Set(input.treinoIds)),
                    },
                  ],
                  atualizadoEm: new Date().toISOString(),
                }
              : programa,
          ),
        })),
      updateFasePrograma: (programaId, faseId, patch) =>
        setData((d) => ({
          ...d,
          programasTreino: d.programasTreino.map((programa) =>
            programa.id === programaId
              ? {
                  ...programa,
                  fases: programa.fases.map((fase) =>
                    fase.id === faseId
                      ? {
                          ...fase,
                          ...patch,
                          nome: patch.nome?.trim() || fase.nome,
                          objetivo:
                            patch.objetivo === undefined
                              ? fase.objetivo
                              : patch.objetivo.trim() || undefined,
                          observacoes:
                            patch.observacoes === undefined
                              ? fase.observacoes
                              : patch.observacoes.trim() || undefined,
                          semanaInicial: Math.max(1, patch.semanaInicial ?? fase.semanaInicial),
                          duracaoSemanas: Math.max(1, patch.duracaoSemanas ?? fase.duracaoSemanas),
                          treinoIds:
                            patch.treinoIds === undefined
                              ? fase.treinoIds
                              : Array.from(new Set(patch.treinoIds)),
                        }
                      : fase,
                  ),
                  atualizadoEm: new Date().toISOString(),
                }
              : programa,
          ),
        })),
      moverFasePrograma: (programaId, faseId, direcao) =>
        setData((d) => ({
          ...d,
          programasTreino: d.programasTreino.map((programa) => {
            if (programa.id !== programaId) return programa;
            const ordenadas = [...programa.fases].sort((a, b) => a.ordem - b.ordem);
            const indice = ordenadas.findIndex((fase) => fase.id === faseId);
            const destino = direcao === "cima" ? indice - 1 : indice + 1;
            if (indice < 0 || destino < 0 || destino >= ordenadas.length) return programa;
            [ordenadas[indice], ordenadas[destino]] = [ordenadas[destino], ordenadas[indice]];
            return {
              ...programa,
              fases: ordenadas.map((fase, ordem) => ({ ...fase, ordem })),
              atualizadoEm: new Date().toISOString(),
            };
          }),
        })),
      removeFasePrograma: (programaId, faseId) =>
        setData((d) => ({
          ...d,
          programasTreino: d.programasTreino.map((programa) =>
            programa.id === programaId
              ? {
                  ...programa,
                  fases: programa.fases
                    .filter((fase) => fase.id !== faseId)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((fase, ordem) => ({ ...fase, ordem })),
                  atualizadoEm: new Date().toISOString(),
                }
              : programa,
          ),
        })),

      ignorarSugestaoProgressao: (id) =>
        setData((d) => ({
          ...d,
          sugestoesProgressao: d.sugestoesProgressao.map((sugestao) =>
            sugestao.id === id && sugestao.status === "pendente"
              ? {
                  ...sugestao,
                  status: "ignorada",
                  resolvidoEm: new Date().toISOString(),
                }
              : sugestao,
          ),
        })),

      addDivisao: (treinoId, nome) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: [...t.divisoes, { id: uid("div"), nome, exercicios: [] }],
        })),
      updateDivisao: (treinoId, divisaoId, nome) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) => (dv.id === divisaoId ? { ...dv, nome } : dv)),
        })),
      setDivisaoDias: (treinoId, divisaoId, dias) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, diasSemana: [...new Set(dias)].sort((a, b) => a - b) }
              : dv,
          ),
        })),
      removeDivisao: (treinoId, divisaoId) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.filter((dv) => dv.id !== divisaoId),
        })),

      addExercicio: (treinoId, divisaoId, ex) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, exercicios: [...dv.exercicios, { id: uid("ex"), ...ex }] }
              : dv,
          ),
        })),
      updateExercicio: (treinoId, divisaoId, ex) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, exercicios: dv.exercicios.map((e) => (e.id === ex.id ? ex : e)) }
              : dv,
          ),
        })),
      removeExercicio: (treinoId, divisaoId, exId) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? {
                  ...dv,
                  exercicios: dv.exercicios.filter((e) => e.id !== exId),
                  blocos: removerExercicioDosBlocos(dv, exId),
                }
              : dv,
          ),
        })),
      moverExercicio: (treinoId, divisaoId, exId, direcao) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, exercicios: trocarPosicao(dv.exercicios, exId, direcao) }
              : dv,
          ),
        })),
      addBlocoTreino: (treinoId, divisaoId, bloco) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((divisao) =>
            divisao.id === divisaoId ? salvarBloco(divisao, bloco) : divisao,
          ),
        })),
      updateBlocoTreino: (treinoId, divisaoId, bloco) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((divisao) =>
            divisao.id === divisaoId
              ? salvarBloco(divisao, bloco, bloco.id)
              : divisao,
          ),
        })),
      removeBlocoTreino: (treinoId, divisaoId, blocoId) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((divisao) =>
            divisao.id === divisaoId
              ? {
                  ...divisao,
                  blocos: (divisao.blocos ?? []).filter(
                    (bloco) => bloco.id !== blocoId,
                  ),
                }
              : divisao,
          ),
        })),
    };
    // Sem deps: o ESLint confirma que nenhuma ação lê o estado atual.
  }, []);

  // Leitura: refeita a cada mudança de dado, como antes.
  const consultas = useMemo<StoreConsultas>(
    () => ({
        schemaVersion: data.schemaVersion,
        // getAluno() continua enxergando todos — o app/portal depende disso.
        alunos: data.alunos.filter(naCarteiraDoPersonal),
        interessados: data.interessados,
        anamneses: data.anamneses,
        metasAluno: data.metasAluno,
        treinos: data.treinos,
        avaliacoes: data.avaliacoes,
        sessoes: data.sessoes,
        pagamentos: data.pagamentos,
        biblioteca: data.biblioteca,
        historicoExercicios: data.historicoExercicios,
        templatesTreino: data.templatesTreino,
        programasTreino: data.programasTreino,
        sugestoesProgressao: data.sugestoesProgressao,
        checkinsSemanais: data.checkinsSemanais,
        lembretesWhatsApp: data.lembretesWhatsApp,
        pacotesSessoes: data.pacotesSessoes,
        solicitacoesSubstituicao: data.solicitacoesSubstituicao,
        videosExecucao: data.videosExecucao,
        configuracoesHabitos: data.configuracoesHabitos,
        registrosHabitos: data.registrosHabitos,
        planosAlimentares: data.planosAlimentares,
        registrosRefeicoes: data.registrosRefeicoes,
        bancoAlimentos: data.bancoAlimentos,
        perfisPublicos: data.perfisPublicos,
  
        getAluno: (id) => data.alunos.find((a) => a.id === id),
  
        interessadoPorId: (id) => data.interessados.find((item) => item.id === id),
        interessadosOrdenados: (hoje) => ordenarInteressados(data.interessados, hoje),
        updateInteressado: (id, input) => {
          const agora = new Date().toISOString();
          const interessado = aplicarAtualizacaoInteressado(
            interessadoObrigatorio(data.interessados, id),
            input,
            agora,
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = aplicarAtualizacaoInteressado(atual, input, agora);
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        alterarStatusInteressado: (id, status) => {
          const agora = new Date().toISOString();
          const interessado = aplicarStatusInteressado(
            interessadoObrigatorio(data.interessados, id),
            status,
            agora,
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = aplicarStatusInteressado(atual, status, agora);
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        registrarContatoInteressado: (id, input) => {
          const agora = new Date().toISOString();
          const contatoId = uid("contato");
          const interessado = adicionarContatoInteressado(
            interessadoObrigatorio(data.interessados, id),
            input,
            { id: contatoId, agora },
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = adicionarContatoInteressado(atual, input, {
              id: contatoId,
              agora,
            });
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        agendarAulaExperimental: (id, input) => {
          const agora = new Date().toISOString();
          const interessado = aplicarAgendamentoAulaExperimental(
            interessadoObrigatorio(data.interessados, id),
            input,
            agora,
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = aplicarAgendamentoAulaExperimental(atual, input, agora);
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        atualizarAulaExperimental: (id, input) => {
          const agora = new Date().toISOString();
          const interessado = aplicarAtualizacaoAulaExperimental(
            interessadoObrigatorio(data.interessados, id),
            input,
            agora,
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = aplicarAtualizacaoAulaExperimental(atual, input, agora);
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        marcarInteressadoPerdido: (id, motivo) => {
          const agora = new Date().toISOString();
          const interessado = aplicarPerdaInteressado(
            interessadoObrigatorio(data.interessados, id),
            motivo,
            agora,
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = aplicarPerdaInteressado(atual, motivo, agora);
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        reativarInteressado: (id) => {
          const agora = new Date().toISOString();
          const interessado = aplicarReativacaoInteressado(
            interessadoObrigatorio(data.interessados, id),
            agora,
          );
          setData((d) => {
            const atual = interessadoObrigatorio(d.interessados, id);
            const atualizado = aplicarReativacaoInteressado(atual, agora);
            return {
              ...d,
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizado : item,
              ),
            };
          });
          return interessado;
        },
        converterInteressado: (id, input = {}) => {
          const atual = interessadoObrigatorio(data.interessados, id);
          const agora = new Date().toISOString();
          const alunoId = uid("aluno");
          const dados = { alunoId, agora, personalEmail: input.personalEmail };
          const conversao = converterInteressadoParaAluno(atual, input, data.alunos, dados);
  
          setData((d) => {
            const interessadoAtual = interessadoObrigatorio(d.interessados, id);
            const atualizada = converterInteressadoParaAluno(
              interessadoAtual,
              input,
              d.alunos,
              dados,
            );
            return {
              ...d,
              // Lead vindo do app não vira cadastro novo: o existente é assumido.
              alunos: atualizada.adotado
                ? d.alunos.map((aluno) =>
                    aluno.id === atualizada.aluno.id ? atualizada.aluno : aluno,
                  )
                : [atualizada.aluno, ...d.alunos],
              interessados: d.interessados.map((item) =>
                item.id === id ? atualizada.interessado : item,
              ),
            };
          });
          return conversao.aluno;
        },
        anamneseDoAluno: (alunoId) =>
          data.anamneses.find((anamnese) => anamnese.alunoId === alunoId),
        salvarRascunhoAnamnese: (alunoId, input) => {
          if (!data.alunos.some((aluno) => aluno.id === alunoId)) {
            throw new Error("Aluno da anamnese não encontrado.");
          }
          const existente = data.anamneses.find(
            (anamnese) => anamnese.alunoId === alunoId,
          );
          if (existente && existente.status !== "rascunho") {
            throw new Error("Reabra a anamnese antes de editar as respostas.");
          }
          const agora = new Date().toISOString();
          const anamnese: AnamneseDigital = {
            id: existente?.id ?? uid("anamnese"),
            alunoId,
            status: "rascunho",
            ...normalizarRascunhoAnamnese(input),
            criadoEm: existente?.criadoEm ?? agora,
            atualizadoEm: agora,
          };
          setData((d) => {
            const atual = d.anamneses.find((item) => item.alunoId === alunoId);
            if (atual && atual.status !== "rascunho") {
              throw new Error("Reabra a anamnese antes de editar as respostas.");
            }
            const valor: AnamneseDigital = atual
              ? { ...anamnese, id: atual.id, criadoEm: atual.criadoEm }
              : anamnese;
            return {
              ...d,
              anamneses: atual
                ? d.anamneses.map((item) =>
                    item.alunoId === alunoId ? valor : item,
                  )
                : [valor, ...d.anamneses],
            };
          });
          return anamnese;
        },
        enviarAnamnese: (alunoId) => {
          const existente = data.anamneses.find(
            (anamnese) => anamnese.alunoId === alunoId,
          );
          if (!existente) throw new Error("Anamnese não encontrada.");
          if (existente.status !== "rascunho") {
            throw new Error("Somente uma anamnese em rascunho pode ser enviada.");
          }
          validarAnamneseParaEnvio(existente);
          const agora = new Date().toISOString();
          const enviada: AnamneseDigital = {
            ...existente,
            status: "enviada",
            atualizadoEm: agora,
            enviadoEm: agora,
            assinadoEm: agora,
            revisadoEm: undefined,
            observacaoPersonal: undefined,
          };
          setData((d) => ({
            ...d,
            anamneses: d.anamneses.map((anamnese) =>
              anamnese.alunoId === alunoId ? enviada : anamnese,
            ),
          }));
          return enviada;
        },
        revisarAnamnese: (alunoId, observacaoPersonal) => {
          const existente = data.anamneses.find(
            (anamnese) => anamnese.alunoId === alunoId,
          );
          if (!existente) throw new Error("Anamnese não encontrada.");
          if (existente.status !== "enviada") {
            throw new Error("Somente uma anamnese enviada pode ser revisada.");
          }
          if (
            observacaoPersonal !== undefined &&
            typeof observacaoPersonal !== "string"
          ) {
            throw new Error("A observação do personal precisa ser um texto.");
          }
          const agora = new Date().toISOString();
          const revisada: AnamneseDigital = {
            ...existente,
            status: "revisada",
            atualizadoEm: agora,
            revisadoEm: agora,
            observacaoPersonal: observacaoPersonal?.trim() || undefined,
          };
          setData((d) => ({
            ...d,
            anamneses: d.anamneses.map((anamnese) =>
              anamnese.alunoId === alunoId ? revisada : anamnese,
            ),
          }));
          return revisada;
        },
        reabrirAnamnese: (alunoId) => {
          const existente = data.anamneses.find(
            (anamnese) => anamnese.alunoId === alunoId,
          );
          if (!existente) throw new Error("Anamnese não encontrada.");
          if (existente.status === "rascunho") {
            throw new Error("A anamnese já está aberta para edição.");
          }
          const reaberta: AnamneseDigital = {
            ...existente,
            status: "rascunho",
            atualizadoEm: new Date().toISOString(),
            enviadoEm: undefined,
            assinadoEm: undefined,
            revisadoEm: undefined,
            observacaoPersonal: undefined,
          };
          setData((d) => ({
            ...d,
            anamneses: d.anamneses.map((anamnese) =>
              anamnese.alunoId === alunoId ? reaberta : anamnese,
            ),
          }));
          return reaberta;
        },
        metasDoAluno: (alunoId) =>
          ordenarMetasAluno(data.metasAluno.filter((meta) => meta.alunoId === alunoId)),
        addMetaAluno: (alunoId, input) => {
          if (!data.alunos.some((aluno) => aluno.id === alunoId)) {
            throw new Error("Aluno da meta não encontrado.");
          }
          const agora = new Date().toISOString();
          const meta: MetaAluno = {
            ...normalizarMetaAlunoInput(input),
            id: uid("meta"),
            alunoId,
            status: "ativa",
            criadoEm: agora,
            atualizadoEm: agora,
          };
          setData((d) => ({ ...d, metasAluno: [meta, ...d.metasAluno] }));
          return meta;
        },
        updateMetaAluno: (id, input) => {
          const existente = data.metasAluno.find((meta) => meta.id === id);
          if (!existente) throw new Error("Meta não encontrada.");
          if (existente.status !== "ativa") {
            throw new Error("Reative a meta antes de editar seus valores.");
          }
          const normalizada = normalizarMetaAlunoInput(input);
          const atualizada: MetaAluno = {
            ...normalizada,
            id: existente.id,
            alunoId: existente.alunoId,
            status: existente.status,
            criadoEm: existente.criadoEm,
            atualizadoEm: new Date().toISOString(),
            concluidaEm: existente.concluidaEm,
          };
          setData((d) => ({
            ...d,
            metasAluno: d.metasAluno.map((meta) => (meta.id === id ? atualizada : meta)),
          }));
          return atualizada;
        },
        concluirMetaAluno: (id) => {
          const existente = data.metasAluno.find((meta) => meta.id === id);
          if (!existente) throw new Error("Meta não encontrada.");
          if (existente.status !== "ativa") {
            throw new Error("Somente uma meta ativa pode ser concluída.");
          }
          const agora = new Date().toISOString();
          const concluida: MetaAluno = {
            ...existente,
            status: "concluida",
            atualizadoEm: agora,
            concluidaEm: agora,
          };
          setData((d) => ({
            ...d,
            metasAluno: d.metasAluno.map((meta) => (meta.id === id ? concluida : meta)),
          }));
          return concluida;
        },
        reativarMetaAluno: (id) => {
          const existente = data.metasAluno.find((meta) => meta.id === id);
          if (!existente) throw new Error("Meta não encontrada.");
          if (existente.status === "ativa") throw new Error("A meta já está ativa.");
          const reativada: MetaAluno = {
            ...existente,
            status: "ativa",
            atualizadoEm: new Date().toISOString(),
            concluidaEm: undefined,
          };
          setData((d) => ({
            ...d,
            metasAluno: d.metasAluno.map((meta) => (meta.id === id ? reativada : meta)),
          }));
          return reativada;
        },
        arquivarMetaAluno: (id) => {
          const existente = data.metasAluno.find((meta) => meta.id === id);
          if (!existente) throw new Error("Meta não encontrada.");
          if (existente.status === "arquivada") throw new Error("A meta já está arquivada.");
          const arquivada: MetaAluno = {
            ...existente,
            status: "arquivada",
            atualizadoEm: new Date().toISOString(),
          };
          setData((d) => ({
            ...d,
            metasAluno: d.metasAluno.map((meta) => (meta.id === id ? arquivada : meta)),
          }));
          return arquivada;
        },
        avaliacoesDoAluno: (alunoId) =>
          data.avaliacoes
            .filter((av) => av.alunoId === alunoId)
            .sort((a, b) => a.data.localeCompare(b.data)),
        addSessao: (input) => {
          const sessao: Sessao = {
            id: uid("sess"),
            criadoEm: new Date().toISOString(),
            status: input.status ?? "agendada",
            ...input,
          };
          validarMudancaSessaoComPacote(
            sessao,
            data.sessoes,
            data.pacotesSessoes,
          );
          setData((d) => ({ ...d, sessoes: [...d.sessoes, sessao] }));
          return sessao;
        },
        updateSessao: (id, patch) => {
          const atual = data.sessoes.find((sessao) => sessao.id === id);
          if (!atual) throw new Error("Sessão não encontrada.");
          const atualizada = { ...atual, ...patch };
          validarMudancaSessaoComPacote(
            atualizada,
            data.sessoes,
            data.pacotesSessoes,
          );
          setData((d) => ({
            ...d,
            sessoes: d.sessoes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          }));
        },
        agendarSessoes: (input, opcoes) => {
          validarAgendamento(input);
          if (!data.alunos.some((aluno) => aluno.id === input.alunoId)) {
            throw new Error("Aluno da sessão não encontrado.");
          }
          const semanas = opcoes?.semanas ?? 1;
          const datas = gerarDatasRecorrentes(input.data, semanas);
          const recorrenciaId = datas.length > 1 ? uid("rec") : undefined;
          const criadoEm = new Date().toISOString();
          const novas: Sessao[] = datas.map((dataSessao, indice) => ({
            id: uid("sess"),
            alunoId: input.alunoId,
            data: dataSessao,
            hora: input.hora,
            duracaoMin: input.duracaoMin,
            foco: input.foco?.trim() || undefined,
            treinoId: input.treinoId,
            divisaoId: input.divisaoId,
            pacoteId: input.pacoteId,
            status: "agendada",
            recorrenciaId,
            recorrenciaOrdem: recorrenciaId ? indice + 1 : undefined,
            criadoEm,
          }));
          validarReservaDoPacote(
            input.pacoteId,
            input.alunoId,
            novas,
            data.sessoes,
            data.pacotesSessoes,
          );
          const conflitos = conflitosEntreCandidatosEExistentes(novas, data.sessoes);
          if (conflitos.length > 0 && !opcoes?.permitirConflito) {
            throw erroDeConflito(conflitos.length);
          }
          setData((d) => ({ ...d, sessoes: [...d.sessoes, ...novas] }));
          return novas;
        },
        updateSessaoRecorrente: (id, patch, escopo = "esta", permitirConflito = false) => {
          const alvo = data.sessoes.find((sessao) => sessao.id === id);
          if (!alvo) throw new Error("Sessão não encontrada.");
          if (alvo.status === "cancelada") {
            throw new Error("Uma sessão cancelada não pode ser editada.");
          }
          const base: SessaoAgendamentoInput = {
            alunoId: patch.alunoId ?? alvo.alunoId,
            data: patch.data ?? alvo.data,
            hora: patch.hora ?? alvo.hora,
            duracaoMin:
              "duracaoMin" in patch ? patch.duracaoMin : alvo.duracaoMin,
            foco: "foco" in patch ? patch.foco : alvo.foco,
            treinoId: "treinoId" in patch ? patch.treinoId : alvo.treinoId,
            divisaoId: "divisaoId" in patch ? patch.divisaoId : alvo.divisaoId,
            pacoteId: "pacoteId" in patch ? patch.pacoteId : alvo.pacoteId,
          };
          validarAgendamento(base);
          const afetadas =
            escopo === "esta-e-proximas" && alvo.recorrenciaId
              ? data.sessoes.filter(
                  (sessao) =>
                    sessao.recorrenciaId === alvo.recorrenciaId &&
                    sessao.data >= alvo.data &&
                    sessao.status === "agendada",
                )
              : [alvo];
          const idsAfetados = new Set(afetadas.map((sessao) => sessao.id));
          const deslocamentoDias = diferencaDiasIso(alvo.data, base.data);
          const candidatas = afetadas.map<Sessao>((sessao) => ({
            ...sessao,
            alunoId: base.alunoId,
            data:
              sessao.id === alvo.id
                ? base.data
                : somarDias(sessao.data, deslocamentoDias),
            hora: base.hora,
            duracaoMin: base.duracaoMin,
            foco: base.foco?.trim() || undefined,
            treinoId: base.treinoId,
            divisaoId: base.divisaoId,
            pacoteId: base.pacoteId,
          }));
          validarReservaDoPacote(
            base.pacoteId,
            base.alunoId,
            candidatas,
            data.sessoes,
            data.pacotesSessoes,
            idsAfetados,
          );
          const conflitos = conflitosEntreCandidatosEExistentes(
            candidatas,
            data.sessoes.filter((sessao) => !idsAfetados.has(sessao.id)),
          );
          if (conflitos.length > 0 && !permitirConflito) {
            throw erroDeConflito(conflitos.length);
          }
          const porId = new Map(candidatas.map((sessao) => [sessao.id, sessao]));
          setData((d) => ({
            ...d,
            sessoes: d.sessoes.map((sessao) => porId.get(sessao.id) ?? sessao),
          }));
        },
        cancelarSessao: (id, opcoes) => {
          const alvo = data.sessoes.find((sessao) => sessao.id === id);
          if (!alvo) throw new Error("Sessão não encontrada.");
          if (alvo.status !== "agendada") {
            throw new Error("Somente sessões agendadas podem ser canceladas.");
          }
          const escopo = opcoes?.escopo ?? "esta";
          if (escopo === "esta-e-proximas" && opcoes?.reposicao) {
            throw new Error("A reposição só pode ser criada ao cancelar uma ocorrência.");
          }
          const afetadas =
            escopo === "esta-e-proximas" && alvo.recorrenciaId
              ? data.sessoes.filter(
                  (sessao) =>
                    sessao.recorrenciaId === alvo.recorrenciaId &&
                    sessao.data >= alvo.data &&
                    sessao.status === "agendada",
                )
              : [alvo];
          const idsAfetados = new Set(afetadas.map((sessao) => sessao.id));
          const criadoEm = new Date().toISOString();
          const reposicao: Sessao | undefined = opcoes?.reposicao
            ? {
                id: uid("sess"),
                alunoId: alvo.alunoId,
                data: opcoes.reposicao.data,
                hora: opcoes.reposicao.hora,
                duracaoMin: alvo.duracaoMin,
                foco: alvo.foco,
                treinoId: alvo.treinoId,
                divisaoId: alvo.divisaoId,
                pacoteId: alvo.pacoteId,
                status: "agendada",
                origemReposicaoId: alvo.id,
                criadoEm,
              }
            : undefined;
          if (reposicao) {
            validarAgendamento(reposicao);
            validarReservaDoPacote(
              reposicao.pacoteId,
              reposicao.alunoId,
              [reposicao],
              data.sessoes,
              data.pacotesSessoes,
              idsAfetados,
            );
            const conflitos = conflitosEntreCandidatosEExistentes(
              [reposicao],
              data.sessoes.filter((sessao) => !idsAfetados.has(sessao.id)),
            );
            if (conflitos.length > 0 && !opcoes?.permitirConflito) {
              throw erroDeConflito(conflitos.length);
            }
          }
          const canceladaEm = new Date().toISOString();
          setData((d) => ({
            ...d,
            sessoes: [
              ...d.sessoes.map((sessao) =>
                idsAfetados.has(sessao.id)
                  ? {
                      ...sessao,
                      status: "cancelada" as const,
                      canceladaEm,
                      motivoCancelamento: opcoes?.motivo?.trim() || undefined,
                      reposicaoSessaoId:
                        sessao.id === alvo.id ? reposicao?.id : undefined,
                    }
                  : sessao,
              ),
              ...(reposicao ? [reposicao] : []),
            ],
          }));
          return reposicao;
        },
        registrarTreinoRealizado: (input) => {
          validarRegistroTreino(input);
          const criadoEm = new Date().toISOString();
          const sessaoAgendada = input.sessaoAgendadaId
            ? data.sessoes.find(
                (item) => item.id === input.sessaoAgendadaId && item.alunoId === input.alunoId,
              )
            : undefined;
          const sessao: Sessao = {
            ...sessaoAgendada,
            id: sessaoAgendada?.id ?? uid("sess"),
            criadoEm: sessaoAgendada?.criadoEm ?? criadoEm,
            status: "realizada",
            alunoId: input.alunoId,
            data: input.data,
            hora: sessaoAgendada?.hora ?? input.hora,
            duracaoMin: input.duracaoMin ?? sessaoAgendada?.duracaoMin,
            foco: input.foco ?? sessaoAgendada?.foco,
            treinoId: input.treinoId,
            divisaoId: input.divisaoId,
            feedback: input.feedback,
            registroOperacaoId: input.operacaoId,
          };
          validarMudancaSessaoComPacote(
            sessao,
            data.sessoes,
            data.pacotesSessoes,
          );
          const registros: HistoricoExercicio[] = input.exercicios.map((ex) => ({
            id: uid("hist"),
            alunoId: input.alunoId,
            sessaoId: sessao.id,
            data: input.data,
            criadoEm,
            formato: "por-serie" as const,
            treinoId: ex.treinoId,
            treinoNome: ex.treinoNome,
            divisaoId: ex.divisaoId,
            divisaoNome: ex.divisaoNome,
            exercicioId: ex.exercicioId,
            bibliotecaId: ex.bibliotecaId,
            nome: ex.nome.trim(),
            descansoPlanejado: ex.descansoPlanejado?.trim() || undefined,
            seriesExecutadas: ex.seriesExecutadas.map((serie) => ({
              ...structuredClone(serie),
              id: uid("serie"),
            })),
          }));
          setData((d) => {
            if (d.sessoes.some((item) => item.registroOperacaoId === input.operacaoId)) return d;
            return {
              ...d,
              sessoes: sessaoAgendada
                ? d.sessoes.map((item) => (item.id === sessao.id ? sessao : item))
                : [...d.sessoes, sessao],
              historicoExercicios: [...d.historicoExercicios, ...registros],
            };
          });
          return sessao;
        },
        pacotesDoAluno: (alunoId) =>
          data.pacotesSessoes
            .filter((pacote) => pacote.alunoId === alunoId)
            .sort(
              (a, b) =>
                Number(b.ativo) - Number(a.ativo) ||
                b.dataValidade.localeCompare(a.dataValidade) ||
                b.criadoEm.localeCompare(a.criadoEm),
            ),
        addPacoteSessoes: (alunoId, input) => {
          if (!data.alunos.some((aluno) => aluno.id === alunoId)) {
            throw new Error("Aluno do pacote não encontrado.");
          }
          validarDadosPacote(input);
          const agora = new Date().toISOString();
          const pacote: PacoteSessoes = {
            id: uid("pacote"),
            alunoId,
            nome: input.nome.trim(),
            quantidadeContratada: input.quantidadeContratada,
            utilizadasAntesDoVoltage: input.utilizadasAntesDoVoltage,
            dataInicio: input.dataInicio,
            dataValidade: input.dataValidade,
            valorTotal: input.valorTotal,
            observacoes: input.observacoes?.trim() || undefined,
            ativo: true,
            criadoEm: agora,
            atualizadoEm: agora,
          };
          setData((d) => ({ ...d, pacotesSessoes: [pacote, ...d.pacotesSessoes] }));
          return pacote;
        },
        updatePacoteSessoes: (id, patch) => {
          const atual = data.pacotesSessoes.find((pacote) => pacote.id === id);
          if (!atual) throw new Error("Pacote não encontrado.");
          const atualizado: PacoteSessoes = {
            ...atual,
            ...patch,
            nome: patch.nome?.trim() || atual.nome,
            observacoes:
              patch.observacoes === undefined
                ? atual.observacoes
                : patch.observacoes.trim() || undefined,
            atualizadoEm: new Date().toISOString(),
          };
          validarDadosPacote(atualizado);
          const realizadasNoApp = data.sessoes.filter(
            (sessao) => sessao.pacoteId === id && sessao.status === "realizada",
          ).length;
          if (
            atualizado.utilizadasAntesDoVoltage + realizadasNoApp >
            atualizado.quantidadeContratada
          ) {
            throw new Error(
              "A quantidade contratada não pode ficar menor que as sessões já utilizadas.",
            );
          }
          const vinculadasAtivas = data.sessoes.filter(
            (sessao) =>
              sessao.pacoteId === id &&
              (sessao.status === "agendada" || sessao.status === "realizada"),
          );
          validarDatasNoPacote(
            atualizado,
            vinculadasAtivas.map((sessao) => sessao.data),
          );
          setData((d) => ({
            ...d,
            pacotesSessoes: d.pacotesSessoes.map((pacote) =>
              pacote.id === id ? atualizado : pacote,
            ),
          }));
        },
        removePacoteSessoes: (id) => {
          if (data.sessoes.some((sessao) => sessao.pacoteId === id)) {
            throw new Error(
              "Este pacote possui sessões vinculadas. Encerre-o para preservar o histórico.",
            );
          }
          setData((d) => ({
            ...d,
            pacotesSessoes: d.pacotesSessoes.filter((pacote) => pacote.id !== id),
          }));
        },
        solicitacoesDoAluno: (alunoId) =>
          data.solicitacoesSubstituicao
            .filter((solicitacao) => solicitacao.alunoId === alunoId)
            .sort(
              (a, b) =>
                Number(a.status !== "pendente") - Number(b.status !== "pendente") ||
                b.criadoEm.localeCompare(a.criadoEm),
            ),
        solicitacaoPendenteExercicio: (alunoId, treinoId, divisaoId, exercicioId) =>
          data.solicitacoesSubstituicao.find(
            (solicitacao) =>
              solicitacao.alunoId === alunoId &&
              solicitacao.treinoId === treinoId &&
              solicitacao.divisaoId === divisaoId &&
              solicitacao.exercicioId === exercicioId &&
              solicitacao.status === "pendente",
          ),
        addSolicitacaoSubstituicao: (input) => {
          validarSolicitacaoSubstituicao(input);
          const treino = data.treinos.find(
            (item) => item.id === input.treinoId && item.alunoId === input.alunoId,
          );
          const divisao = treino?.divisoes.find((item) => item.id === input.divisaoId);
          const exercicio = divisao?.exercicios.find((item) => item.id === input.exercicioId);
          if (!treino || !divisao || !exercicio) {
            throw new Error("O exercício não está mais disponível nesta planilha.");
          }
          const duplicada = data.solicitacoesSubstituicao.some(
            (solicitacao) =>
              solicitacao.alunoId === input.alunoId &&
              solicitacao.treinoId === input.treinoId &&
              solicitacao.divisaoId === input.divisaoId &&
              solicitacao.exercicioId === input.exercicioId &&
              solicitacao.status === "pendente",
          );
          if (duplicada) throw new Error("Já existe uma solicitação pendente para este exercício.");
          const solicitacao: SolicitacaoSubstituicao = {
            id: uid("substituicao"),
            alunoId: input.alunoId,
            treinoId: input.treinoId,
            divisaoId: input.divisaoId,
            exercicioId: input.exercicioId,
            exercicioNomeSnapshot: exercicio.nome,
            motivo: input.motivo,
            detalhes: input.detalhes?.trim() || undefined,
            status: "pendente",
            criadoEm: new Date().toISOString(),
          };
          setData((d) => ({
            ...d,
            solicitacoesSubstituicao: [solicitacao, ...d.solicitacoesSubstituicao],
          }));
          return solicitacao;
        },
        aprovarSolicitacaoSubstituicao: (id, substituto, respostaPersonal) => {
          validarExercicioSubstituto(substituto);
          const solicitacao = data.solicitacoesSubstituicao.find((item) => item.id === id);
          if (!solicitacao || solicitacao.status !== "pendente") {
            throw new Error("Esta solicitação não está mais pendente.");
          }
          const treino = data.treinos.find((item) => item.id === solicitacao.treinoId);
          const divisao = treino?.divisoes.find((item) => item.id === solicitacao.divisaoId);
          if (!divisao?.exercicios.some((item) => item.id === solicitacao.exercicioId)) {
            throw new Error("O exercício original não existe mais na planilha.");
          }
          const snapshot: ExercicioSubstitutoInput = {
            nome: substituto.nome.trim(),
            bibliotecaId: substituto.bibliotecaId,
            series: substituto.series.trim(),
            repeticoes: substituto.repeticoes.trim(),
            carga: substituto.carga.trim(),
            descanso: substituto.descanso.trim(),
            observacoes: substituto.observacoes?.trim() || undefined,
          };
          const agora = new Date().toISOString();
          setData((d) => ({
            ...d,
            treinos: d.treinos.map((item) =>
              item.id === solicitacao.treinoId
                ? {
                    ...item,
                    atualizadoEm: agora,
                    divisoes: item.divisoes.map((divisaoAtual) =>
                      divisaoAtual.id === solicitacao.divisaoId
                        ? {
                            ...divisaoAtual,
                            exercicios: divisaoAtual.exercicios.map((exercicio) =>
                              exercicio.id === solicitacao.exercicioId
                                ? { ...exercicio, ...snapshot }
                                : exercicio,
                            ),
                          }
                        : divisaoAtual,
                    ),
                  }
                : item,
            ),
            solicitacoesSubstituicao: d.solicitacoesSubstituicao.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "aprovada",
                    respondidaEm: agora,
                    respostaPersonal: respostaPersonal?.trim() || undefined,
                    substituto: snapshot,
                  }
                : item,
            ),
          }));
          return true;
        },
        recusarSolicitacaoSubstituicao: (id, respostaPersonal) => {
          if (!respostaPersonal.trim()) {
            throw new Error("Explique ao aluno por que a troca não será feita.");
          }
          const solicitacao = data.solicitacoesSubstituicao.find((item) => item.id === id);
          if (!solicitacao || solicitacao.status !== "pendente") {
            throw new Error("Esta solicitação não está mais pendente.");
          }
          setData((d) => ({
            ...d,
            solicitacoesSubstituicao: d.solicitacoesSubstituicao.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "recusada",
                    respondidaEm: new Date().toISOString(),
                    respostaPersonal: respostaPersonal.trim(),
                  }
                : item,
            ),
          }));
        },
        videosDoAluno: (alunoId) =>
          data.videosExecucao
            .filter((video) => video.alunoId === alunoId)
            .sort(
              (a, b) =>
                Number(a.status !== "pendente") - Number(b.status !== "pendente") ||
                b.criadoEm.localeCompare(a.criadoEm),
            ),
        addVideoExecucao: (input) => {
          validarVideoExecucao(input);
          if (!data.alunos.some((aluno) => aluno.id === input.alunoId)) {
            throw new Error("Aluno do vídeo não encontrado.");
          }
          if (input.treinoId) {
            const treino = data.treinos.find(
              (item) => item.id === input.treinoId && item.alunoId === input.alunoId,
            );
            if (!treino) throw new Error("A planilha relacionada ao vídeo não foi encontrada.");
          }
          const video: VideoExecucao = {
            id: uid("video"),
            alunoId: input.alunoId,
            treinoId: input.treinoId,
            divisaoId: input.divisaoId,
            exercicioId: input.exercicioId,
            exercicioNomeSnapshot: input.exercicioNomeSnapshot.trim(),
            arquivoNome: input.arquivoNome.trim(),
            mimeType: input.mimeType,
            tamanhoBytes: input.tamanhoBytes,
            duracaoSegundos: input.duracaoSegundos,
            observacoesAluno: input.observacoesAluno?.trim() || undefined,
            status: "pendente",
            criadoEm: new Date().toISOString(),
          };
          setData((d) => ({ ...d, videosExecucao: [video, ...d.videosExecucao] }));
          return video;
        },
        revisarVideoExecucao: (id, comentarioPersonal) => {
          if (comentarioPersonal.trim().length < 3) {
            throw new Error("Escreva um comentário para o aluno antes de revisar.");
          }
          const video = data.videosExecucao.find((item) => item.id === id);
          if (!video) throw new Error("Vídeo não encontrado.");
          setData((d) => ({
            ...d,
            videosExecucao: d.videosExecucao.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "revisado",
                    revisadoEm: new Date().toISOString(),
                    comentarioPersonal: comentarioPersonal.trim(),
                  }
                : item,
            ),
          }));
        },
        configuracaoHabitosDoAluno: (alunoId) =>
          data.configuracoesHabitos.find((configuracao) => configuracao.alunoId === alunoId),
        registrosHabitosDoAluno: (alunoId) =>
          data.registrosHabitos
            .filter((registro) => registro.alunoId === alunoId)
            .sort(
              (a, b) =>
                b.data.localeCompare(a.data) || b.atualizadoEm.localeCompare(a.atualizadoEm),
            ),
        registroHabitosDoDia: (alunoId, dataRegistro) => {
          validarDataLocalHabitos(dataRegistro);
          return data.registrosHabitos.find(
            (registro) =>
              registro.alunoId === alunoId && registro.data === dataRegistro,
          );
        },
        salvarConfiguracaoHabitos: (alunoId, input) => {
          if (!data.alunos.some((aluno) => aluno.id === alunoId)) {
            throw new Error("Aluno da configuração de hábitos não encontrado.");
          }
          const existente = data.configuracoesHabitos.find(
            (configuracao) => configuracao.alunoId === alunoId,
          );
          const normalizada = normalizarConfiguracaoHabitos(input, existente);
          const agora = new Date().toISOString();
          const configuracao: ConfiguracaoHabitos = {
            alunoId,
            habitosAtivos: normalizada.habitosAtivos,
            metas: normalizada.metas,
            criadoEm: existente?.criadoEm ?? agora,
            atualizadoEm: agora,
          };
          setData((d) => {
            const atual = d.configuracoesHabitos.find((item) => item.alunoId === alunoId);
            const valor = atual
              ? { ...configuracao, criadoEm: atual.criadoEm }
              : configuracao;
            return {
              ...d,
              configuracoesHabitos: atual
                ? d.configuracoesHabitos.map((item) =>
                    item.alunoId === alunoId ? valor : item,
                  )
                : [valor, ...d.configuracoesHabitos],
            };
          });
          return configuracao;
        },
        salvarRegistroHabitos: (input) => {
          if (!data.alunos.some((aluno) => aluno.id === input.alunoId)) {
            throw new Error("Aluno do registro de hábitos não encontrado.");
          }
          const dataRegistro = validarDataLocalHabitos(input.data);
          if (dataRegistro > dataLocalHoje()) {
            throw new Error("Não é possível registrar hábitos em uma data futura.");
          }
          const valores = normalizarValoresHabitos(input.valores);
          if (Object.keys(valores).length === 0) {
            throw new Error("Informe pelo menos um hábito antes de salvar o dia.");
          }
          const existente = data.registrosHabitos.find(
            (registro) =>
              registro.alunoId === input.alunoId && registro.data === dataRegistro,
          );
          const configuracaoAtual = data.configuracoesHabitos.find(
            (configuracao) => configuracao.alunoId === input.alunoId,
          );
          const snapshotBase =
            existente?.configuracaoSnapshot ?? normalizarConfiguracaoHabitos(configuracaoAtual);
          const configuracaoSnapshot = {
            habitosAtivos: [...snapshotBase.habitosAtivos],
            metas: { ...snapshotBase.metas },
          };
          const agora = new Date().toISOString();
          const registro: RegistroHabitosDiario = {
            id: existente?.id ?? uid("habitos"),
            alunoId: input.alunoId,
            data: dataRegistro,
            valores,
            configuracaoSnapshot,
            criadoEm: existente?.criadoEm ?? agora,
            atualizadoEm: agora,
          };
          setData((d) => {
            const atual = d.registrosHabitos.find(
              (item) => item.alunoId === input.alunoId && item.data === dataRegistro,
            );
            const valor: RegistroHabitosDiario = atual
              ? {
                  ...registro,
                  id: atual.id,
                  criadoEm: atual.criadoEm,
                  configuracaoSnapshot: atual.configuracaoSnapshot,
                }
              : registro;
            return {
              ...d,
              registrosHabitos: atual
                ? d.registrosHabitos.map((item) => (item.id === atual.id ? valor : item))
                : [valor, ...d.registrosHabitos],
            };
          });
          return registro;
        },
        planosDoAluno: (alunoId) =>
          ordenarPlanos(data.planosAlimentares.filter((plano) => plano.alunoId === alunoId)),
        planoAtivoDoAluno: (alunoId) =>
          ordenarPlanos(
            data.planosAlimentares.filter(
              (plano) => plano.alunoId === alunoId && plano.status === "ativo",
            ),
          )[0],
        addPlanoAlimentar: (alunoId, input) => {
          if (!data.alunos.some((aluno) => aluno.id === alunoId)) {
            throw new Error("Aluno do plano alimentar não encontrado.");
          }
          const agora = new Date().toISOString();
          const plano: PlanoAlimentar = {
            ...normalizarPlanoInput(input),
            id: uid("plano"),
            alunoId,
            status: "ativo",
            criadoEm: agora,
            atualizadoEm: agora,
          };
          setData((d) => ({ ...d, planosAlimentares: [plano, ...d.planosAlimentares] }));
          return plano;
        },
        updatePlanoAlimentar: (id, input) => {
          const existente = data.planosAlimentares.find((plano) => plano.id === id);
          if (!existente) throw new Error("Plano alimentar não encontrado.");
          const atualizado: PlanoAlimentar = {
            ...normalizarPlanoInput(input),
            id: existente.id,
            alunoId: existente.alunoId,
            status: existente.status,
            criadoEm: existente.criadoEm,
            atualizadoEm: new Date().toISOString(),
            arquivadoEm: existente.arquivadoEm,
          };
          setData((d) => ({
            ...d,
            planosAlimentares: d.planosAlimentares.map((plano) =>
              plano.id === id ? atualizado : plano,
            ),
          }));
          return atualizado;
        },
        arquivarPlanoAlimentar: (id) => {
          const existente = data.planosAlimentares.find((plano) => plano.id === id);
          if (!existente) throw new Error("Plano alimentar não encontrado.");
          const agora = new Date().toISOString();
          const arquivado: PlanoAlimentar = {
            ...existente,
            status: "arquivado",
            atualizadoEm: agora,
            arquivadoEm: agora,
          };
          setData((d) => ({
            ...d,
            planosAlimentares: d.planosAlimentares.map((plano) =>
              plano.id === id ? arquivado : plano,
            ),
          }));
          return arquivado;
        },
        reativarPlanoAlimentar: (id) => {
          const existente = data.planosAlimentares.find((plano) => plano.id === id);
          if (!existente) throw new Error("Plano alimentar não encontrado.");
          const reativado: PlanoAlimentar = {
            ...existente,
            status: "ativo",
            atualizadoEm: new Date().toISOString(),
            arquivadoEm: undefined,
          };
          setData((d) => ({
            ...d,
            planosAlimentares: d.planosAlimentares.map((plano) =>
              plano.id === id ? reativado : plano,
            ),
          }));
          return reativado;
        },
        registrosRefeicoesDoAluno: (alunoId) =>
          data.registrosRefeicoes
            .filter((registro) => registro.alunoId === alunoId)
            .sort((a, b) => b.data.localeCompare(a.data)),
        registroRefeicoesDoDia: (alunoId, dataDia) =>
          data.registrosRefeicoes.find(
            (registro) => registro.alunoId === alunoId && registro.data === dataDia,
          ),
        updateAlimentoBanco: (id, input) => {
          const existente = data.bancoAlimentos.find((alimento) => alimento.id === id);
          if (!existente) throw new Error("Alimento não encontrado.");
          const atualizado: AlimentoBanco = {
            ...normalizarAlimentoBancoInput(input),
            id: existente.id,
            criadoEm: existente.criadoEm,
          };
          setData((d) => ({
            ...d,
            bancoAlimentos: d.bancoAlimentos.map((alimento) =>
              alimento.id === id ? atualizado : alimento,
            ),
          }));
          return atualizado;
        },
        getAlimentoBanco: (id) => data.bancoAlimentos.find((alimento) => alimento.id === id),
  
        // ── catálogo de personais ─────────────────────────────────────────
        perfilPublicoPorEmail: (email) => {
          const chave = email.trim().toLowerCase();
          return data.perfisPublicos.find((perfil) => perfil.email.toLowerCase() === chave);
        },
        perfilPublicoPorId: (id) => data.perfisPublicos.find((perfil) => perfil.id === id),
        salvarPerfilPublico: (input) => {
          const dados = normalizarPerfilPublicoInput(input);
          const chave = dados.email.toLowerCase();
          const existente = data.perfisPublicos.find(
            (perfil) => perfil.email.toLowerCase() === chave,
          );
          const agora = new Date().toISOString();
          // Um perfil por conta: salvar de novo atualiza o que já existe.
          const perfil: PersonalPublico = {
            ...dados,
            id: existente?.id ?? uid("perfil"),
            nota: existente?.nota,
            totalAvaliacoes: existente?.totalAvaliacoes,
            criadoEm: existente?.criadoEm ?? agora,
            atualizadoEm: agora,
          };
          setData((d) => ({
            ...d,
            perfisPublicos: existente
              ? d.perfisPublicos.map((item) => (item.id === perfil.id ? perfil : item))
              : [perfil, ...d.perfisPublicos],
          }));
          return perfil;
        },
        checkinsDoAluno: (alunoId) =>
          data.checkinsSemanais
            .filter((checkin) => checkin.alunoId === alunoId)
            .sort(
              (a, b) =>
                b.semanaInicio.localeCompare(a.semanaInicio) ||
                b.respondidoEm.localeCompare(a.respondidoEm),
            ),
        checkinDaSemana: (alunoId, semanaInicio) =>
          data.checkinsSemanais.find(
            (checkin) =>
              checkin.alunoId === alunoId && checkin.semanaInicio === semanaInicio,
          ),
        salvarCheckinSemanal: (input) => {
          validarCheckinSemanal(input);
          if (!data.alunos.some((aluno) => aluno.id === input.alunoId)) {
            throw new Error("Aluno do check-in não encontrado.");
          }
          const existente = data.checkinsSemanais.find(
            (checkin) =>
              checkin.alunoId === input.alunoId &&
              checkin.semanaInicio === input.semanaInicio,
          );
          const checkin: CheckinSemanal = {
            id: existente?.id ?? uid("checkin"),
            alunoId: input.alunoId,
            semanaInicio: input.semanaInicio,
            respondidoEm: new Date().toISOString(),
            energia: input.energia,
            sono: input.sono,
            horasSono: input.horasSono,
            estresse: input.estresse,
            alimentacao: input.alimentacao,
            dor: input.dor,
            localDor: input.localDor?.trim() || undefined,
            pesoKg: input.pesoKg,
            observacoes: input.observacoes?.trim() || undefined,
          };
          setData((d) => ({
            ...d,
            checkinsSemanais: existente
              ? d.checkinsSemanais.map((item) =>
                  item.id === existente.id ? checkin : item,
                )
              : [checkin, ...d.checkinsSemanais],
          }));
          return checkin;
        },
        revisarCheckinSemanal: (id, comentario) => {
          if (!data.checkinsSemanais.some((checkin) => checkin.id === id)) return false;
          setData((d) => ({
            ...d,
            checkinsSemanais: d.checkinsSemanais.map((checkin) =>
              checkin.id === id
                ? {
                    ...checkin,
                    revisadoEm: new Date().toISOString(),
                    comentarioPersonal: comentario?.trim() || undefined,
                  }
                : checkin,
            ),
          }));
          return true;
        },
        lembretesDoAluno: (alunoId) =>
          data.lembretesWhatsApp
            .filter((lembrete) => lembrete.alunoId === alunoId)
            .sort(
              (a, b) =>
                (a.dataReferencia ?? "9999-12-31").localeCompare(
                  b.dataReferencia ?? "9999-12-31",
                ) || b.criadoEm.localeCompare(a.criadoEm),
            ),
        sincronizarLembretesWhatsApp: (hoje) => {
          const candidatos = gerarCandidatosLembrete(
            {
              alunos: data.alunos.filter(naCarteiraDoPersonal),
              sessoes: data.sessoes,
              avaliacoes: data.avaliacoes,
              pagamentos: data.pagamentos,
              checkinsSemanais: data.checkinsSemanais,
              programasTreino: data.programasTreino,
            },
            hoje,
          );
          const existentesPorChave = new Map(
            data.lembretesWhatsApp.flatMap((lembrete) =>
              lembrete.chaveAutomatica
                ? [[lembrete.chaveAutomatica, lembrete] as const]
                : [],
            ),
          );
          const novosCandidatos = candidatos.filter(
            (candidato) => !existentesPorChave.has(candidato.chaveAutomatica),
          );
          const candidatosPorChave = new Map(
            candidatos.map((candidato) => [candidato.chaveAutomatica, candidato]),
          );
          const agora = new Date().toISOString();
          const novos: LembreteWhatsApp[] = novosCandidatos.map((candidato) => ({
            ...candidato,
            id: uid("lembrete"),
            status: "pendente",
            criadoEm: agora,
          }));
  
          setData((d) => {
            let mudou = novos.length > 0;
            const atuais = d.lembretesWhatsApp.map((lembrete) => {
              if (lembrete.origem !== "automatica" || !lembrete.chaveAutomatica) {
                return lembrete;
              }
              const candidato = candidatosPorChave.get(lembrete.chaveAutomatica);
              if (!candidato && lembrete.status === "pendente") {
                mudou = true;
                return {
                  ...lembrete,
                  status: "dispensado" as const,
                  dispensadoEm: agora,
                };
              }
              if (
                candidato &&
                lembrete.status === "pendente" &&
                (lembrete.titulo !== candidato.titulo ||
                  lembrete.mensagem !== candidato.mensagem ||
                  lembrete.dataReferencia !== candidato.dataReferencia)
              ) {
                mudou = true;
                return {
                  ...lembrete,
                  titulo: candidato.titulo,
                  mensagem: candidato.mensagem,
                  dataReferencia: candidato.dataReferencia,
                  relacionadoId: candidato.relacionadoId,
                };
              }
              return lembrete;
            });
            return mudou ? { ...d, lembretesWhatsApp: [...novos, ...atuais] } : d;
          });
          return novos.length;
        },
        addLembreteWhatsApp: (input) => {
          if (!data.alunos.some((aluno) => aluno.id === input.alunoId)) {
            throw new Error("Aluno do lembrete não encontrado.");
          }
          if (!input.titulo.trim() || !input.mensagem.trim()) {
            throw new Error("Título e mensagem são obrigatórios.");
          }
          if (
            input.dataReferencia &&
            !/^\d{4}-\d{2}-\d{2}$/.test(input.dataReferencia)
          ) {
            throw new Error("A data de referência é inválida.");
          }
          const lembrete: LembreteWhatsApp = {
            id: uid("lembrete"),
            alunoId: input.alunoId,
            tipo: input.tipo,
            titulo: input.titulo.trim(),
            mensagem: input.mensagem.trim(),
            dataReferencia: input.dataReferencia,
            status: "pendente",
            origem: "manual",
            relacionadoId: input.relacionadoId,
            criadoEm: new Date().toISOString(),
          };
          setData((d) => ({
            ...d,
            lembretesWhatsApp: [lembrete, ...d.lembretesWhatsApp],
          }));
          return lembrete;
        },
        historicoDoAluno: (alunoId) =>
          data.historicoExercicios
            .filter((h) => h.alunoId === alunoId)
            .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)),
        ultimoHistoricoExercicio: (alunoId, exercicio) =>
          data.historicoExercicios
            .filter((h) => h.alunoId === alunoId && mesmoExercicio(h, exercicio))
            .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))[0],
  
        pagamentosDaCompetencia: (comp) =>
          data.pagamentos.filter((p) => p.competencia === comp),
        gerarCobrancas: (comp) => {
          const jaCobrado = new Set(
            data.pagamentos.filter((p) => p.competencia === comp).map((p) => p.alunoId),
          );
          const novas: Pagamento[] = data.alunos
            .filter((a) => a.ativo && (a.mensalidade ?? 0) > 0 && !jaCobrado.has(a.id))
            .map((a) => ({
              id: uid("pag"),
              alunoId: a.id,
              competencia: comp,
              valor: a.mensalidade!,
              vencimento: vencimentoDe(comp, a.diaVencimento ?? 5),
              status: "pendente" as const,
              criadoEm: new Date().toISOString(),
            }));
          if (novas.length > 0) {
            setData((d) => ({ ...d, pagamentos: [...d.pagamentos, ...novas] }));
          }
          return novas.length;
        },
  
        getExercicioBiblioteca: (id) => data.biblioteca.find((b) => b.id === id),
  
        treinosDoAluno: (alunoId) => data.treinos.filter((t) => t.alunoId === alunoId),
        getTreino: (id) => data.treinos.find((t) => t.id === id),
        duplicarTreino: (id) => {
          const origem = data.treinos.find((t) => t.id === id);
          if (!origem) return undefined;
          const copia: Treino = {
            ...origem,
            id: uid("treino"),
            nome: `${origem.nome} — cópia`,
            ativo: false,
            duplicadoDeTreinoId: origem.id,
            divisoes: clonarDivisoes(origem.divisoes),
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
          };
          setData((d) => ({ ...d, treinos: [copia, ...d.treinos] }));
          return copia;
        },
  
        criarTemplateDeTreino: (treinoId, nome) => {
          const treino = data.treinos.find((t) => t.id === treinoId);
          if (!treino) return undefined;
          const agora = new Date().toISOString();
          const template: TemplateTreino = {
            id: uid("template"),
            nome: nome?.trim() || treino.nome,
            descricao: treino.descricao,
            divisoes: clonarDivisoes(treino.divisoes),
            criadoEm: agora,
            atualizadoEm: agora,
          };
          setData((d) => ({ ...d, templatesTreino: [template, ...d.templatesTreino] }));
          return template;
        },
        duplicarTemplateTreino: (id) => {
          const origem = data.templatesTreino.find((template) => template.id === id);
          if (!origem) return undefined;
          const agora = new Date().toISOString();
          const copia: TemplateTreino = {
            ...origem,
            id: uid("template"),
            nome: `${origem.nome} — cópia`,
            divisoes: clonarDivisoes(origem.divisoes),
            criadoEm: agora,
            atualizadoEm: agora,
          };
          setData((d) => ({ ...d, templatesTreino: [copia, ...d.templatesTreino] }));
          return copia;
        },
        aplicarTemplateTreino: (templateId, alunoIds, opcoes) => {
          const template = data.templatesTreino.find((item) => item.id === templateId);
          const idsValidos = new Set(data.alunos.filter((aluno) => alunoIds.includes(aluno.id)).map((aluno) => aluno.id));
          if (!template || idsValidos.size === 0) return [];
          const agora = new Date().toISOString();
          const novos = Array.from(idsValidos).map<Treino>((alunoId) => ({
            id: uid("treino"),
            alunoId,
            nome: template.nome,
            descricao: template.descricao,
            ativo: true,
            templateOrigemId: template.id,
            divisoes: clonarDivisoes(template.divisoes),
            criadoEm: agora,
            atualizadoEm: agora,
          }));
          setData((d) => {
            const treinosAtuais = opcoes?.desativarAnteriores !== false
              ? d.treinos.map((treino) =>
                  idsValidos.has(treino.alunoId) ? { ...treino, ativo: false } : treino,
                )
              : d.treinos;
            return { ...d, treinos: [...novos, ...treinosAtuais] };
          });
          return novos;
        },
        programasDoAluno: (alunoId) =>
          data.programasTreino
            .filter((programa) => programa.alunoId === alunoId)
            .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
        renovarProgramaTreino: (id, input) => {
          const origem = data.programasTreino.find((programa) => programa.id === id);
          if (!origem) return undefined;
          const agora = new Date().toISOString();
          const renovado: ProgramaTreino = {
            ...origem,
            id: uid("programa"),
            nome: input.nome.trim() || `${origem.nome} — renovação`,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
            status: input.ativar === false ? "rascunho" : "ativo",
            renovadoDeProgramaId: origem.id,
            fases: origem.fases.map((fase, index) => ({
              ...structuredClone(fase),
              id: uid("fase"),
              ordem: index,
              treinoIds: [...fase.treinoIds],
            })),
            criadoEm: agora,
            atualizadoEm: agora,
          };
          setData((d) => ({
            ...d,
            programasTreino: [
              renovado,
              ...d.programasTreino.map((programa) => {
                if (programa.id === origem.id) {
                  return { ...programa, status: "concluido" as const, atualizadoEm: agora };
                }
                if (
                  renovado.status === "ativo" &&
                  programa.alunoId === origem.alunoId &&
                  programa.status === "ativo"
                ) {
                  return { ...programa, status: "rascunho" as const, atualizadoEm: agora };
                }
                return programa;
              }),
            ],
          }));
          return renovado;
        },
        sugestoesDoAluno: (alunoId) =>
          data.sugestoesProgressao
            .filter((sugestao) => sugestao.alunoId === alunoId)
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
        gerarSugestoesProgressao: (alunoId) => {
          const origensExistentes = new Set(
            data.sugestoesProgressao.map((sugestao) => sugestao.historicoOrigemId),
          );
          const agora = new Date().toISOString();
          const novas: SugestaoProgressao[] = sugestoesMaisRecentes(
            data.historicoExercicios,
            alunoId,
          )
            .filter((sugestao) => !origensExistentes.has(sugestao.historicoOrigemId))
            .map((sugestao) => ({
              id: uid("sugestao"),
              alunoId,
              historicoOrigemId: sugestao.historicoOrigemId,
              treinoId: sugestao.treinoId,
              divisaoId: sugestao.divisaoId,
              exercicioId: sugestao.exercicioId,
              bibliotecaId: sugestao.bibliotecaId,
              exercicioNomeSnapshot: sugestao.nome,
              cargaAtualKg: sugestao.cargaAtualKg,
              cargaSugeridaKg: sugestao.cargaSugeridaKg,
              rpeMedio: sugestao.rpeMedio,
              motivo: sugestao.motivo,
              status: "pendente",
              criadoEm: agora,
            }));
          if (novas.length > 0) {
            setData((d) => ({
              ...d,
              sugestoesProgressao: [...novas, ...d.sugestoesProgressao],
            }));
          }
          return novas.length;
        },
        aceitarSugestaoProgressao: (id) => {
          const sugestao = data.sugestoesProgressao.find(
            (item) => item.id === id && item.status === "pendente",
          );
          if (!sugestao) return false;
          const treinoAlvo = data.treinos.find(
            (treino) =>
              treino.alunoId === sugestao.alunoId &&
              (treino.id === sugestao.treinoId || treino.ativo) &&
              treino.divisoes.some((divisao) =>
                (!sugestao.divisaoId || divisao.id === sugestao.divisaoId) &&
                divisao.exercicios.some((exercicio) =>
                  exercicioCorrespondeSugestao(exercicio, sugestao),
                ),
              ),
          );
          if (!treinoAlvo) return false;
  
          const agora = new Date().toISOString();
          setData((d) => ({
            ...d,
            treinos: d.treinos.map((treino) =>
              treino.id === treinoAlvo.id
                ? {
                    ...treino,
                    atualizadoEm: agora,
                    divisoes: treino.divisoes.map((divisao) =>
                      sugestao.divisaoId && divisao.id !== sugestao.divisaoId
                        ? divisao
                        : {
                            ...divisao,
                            exercicios: divisao.exercicios.map((exercicio) =>
                              exercicioCorrespondeSugestao(exercicio, sugestao)
                                ? { ...exercicio, carga: `${sugestao.cargaSugeridaKg}kg` }
                                : exercicio,
                            ),
                          },
                    ),
                  }
                : treino,
            ),
            sugestoesProgressao: d.sugestoesProgressao.map((item) =>
              item.id === id
                ? { ...item, status: "aceita", resolvidoEm: agora }
                : item,
            ),
          }));
          return true;
        },
    }),
    [data],
  );

  // Objeto completo montado uma vez por mudança de dado. Se cada `useStore()`
  // fizesse esse merge, o custo seria multiplicado pelo número de consumidores.
  const tudo = useMemo<StoreContextValue>(
    () => ({ ...consultas, ...acoes }),
    [consultas, acoes],
  );

  return (
    <AcoesContext.Provider value={acoes}>
      <StoreContext.Provider value={tudo}>{children}</StoreContext.Provider>
    </AcoesContext.Provider>
  );
}

/** Dados + ações. Re-renderiza a cada mudança de dado — use quando você lê algo. */
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}

/**
 * Só as ações de escrita. Quem usa isto **não** re-renderiza quando o dado muda,
 * porque o objeto de ações nunca troca de identidade. Prefira em formulários,
 * botões e modais que só gravam.
 */
export function useAcoes(): StoreAcoes {
  const ctx = useContext(AcoesContext);
  if (!ctx) throw new Error("useAcoes precisa estar dentro de <StoreProvider>");
  return ctx;
}

export type { Divisao };
