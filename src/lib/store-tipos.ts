/**
 * Tipos de entrada do store — o formato que as telas mandam pra cá.
 *
 * Separados do `store.tsx` porque as validações e os helpers puros também
 * precisam deles: sem esse arquivo, `store-validacoes.ts` teria que importar
 * do `store.tsx`, que importa de volta as validações.
 *
 * São `Pick`/`Omit` das entidades de propósito: o que a tela envia é sempre um
 * recorte do que fica salvo (sem `id`, sem carimbo de data, sem campo derivado).
 */
import type {
  CheckinSemanal,
  Exercicio,
  LembreteWhatsApp,
  PacoteSessoes,
  RegistroHabitosDiario,
  SerieExecutada,
  Sessao,
  SolicitacaoSubstituicao,
  VideoExecucao,
} from "./types";
import type { ConfiguracaoHabitosInput } from "./habitos";

export type BlocoTreinoInput =
  | { tipo: "individual"; exercicioIds: string[] }
  | {
      tipo: "superset";
      exercicioIds: string[];
      rounds: number;
      descansoEntreRoundsSeg: number;
    }
  | {
      tipo: "circuito";
      exercicioIds: string[];
      rounds: number;
      trabalhoSeg?: number;
      transicaoSeg?: number;
      descansoEntreRoundsSeg: number;
    };

export interface AplicarTemplateOpcoes {
  desativarAnteriores?: boolean;
}

export type ExercicioHistoricoFiltro = Pick<Exercicio, "nome" | "bibliotecaId">;

export type SerieExecutadaInput = Omit<SerieExecutada, "id">;

export type SalvarCheckinSemanalInput = Omit<
  CheckinSemanal,
  "id" | "respondidoEm" | "revisadoEm" | "comentarioPersonal"
>;

export type SessaoAgendamentoInput = Pick<Sessao, "alunoId" | "data" | "hora"> &
  Partial<Pick<Sessao, "duracaoMin" | "foco" | "treinoId" | "divisaoId" | "pacoteId">>;

export type PacoteSessoesInput = Pick<
  PacoteSessoes,
  | "nome"
  | "quantidadeContratada"
  | "utilizadasAntesDoVoltage"
  | "dataInicio"
  | "dataValidade"
  | "valorTotal"
  | "observacoes"
>;

export type CriarSolicitacaoSubstituicaoInput = Pick<
  SolicitacaoSubstituicao,
  | "alunoId"
  | "treinoId"
  | "divisaoId"
  | "exercicioId"
  | "exercicioNomeSnapshot"
  | "motivo"
  | "detalhes"
>;

export type ExercicioSubstitutoInput = NonNullable<SolicitacaoSubstituicao["substituto"]>;

export type CriarVideoExecucaoInput = Omit<
  VideoExecucao,
  "id" | "status" | "criadoEm" | "revisadoEm" | "comentarioPersonal"
>;

export type SalvarConfiguracaoHabitosInput = ConfiguracaoHabitosInput;

export interface SalvarRegistroHabitosInput {
  alunoId: string;
  data: string;
  valores: RegistroHabitosDiario["valores"];
}

export type EscopoRecorrenciaSessao = "esta" | "esta-e-proximas";

export interface CancelarSessaoOpcoes {
  escopo?: EscopoRecorrenciaSessao;
  motivo?: string;
  reposicao?: Pick<Sessao, "data" | "hora">;
  permitirConflito?: boolean;
}

export type CriarLembreteWhatsAppInput = Pick<
  LembreteWhatsApp,
  "alunoId" | "tipo" | "titulo" | "mensagem" | "dataReferencia" | "relacionadoId"
>;

export interface RegistroExercicioPorSerieInput {
  treinoId?: string;
  treinoNome?: string;
  divisaoId?: string;
  divisaoNome?: string;
  exercicioId?: string;
  bibliotecaId?: string;
  nome: string;
  descansoPlanejado?: string;
  seriesExecutadas: SerieExecutadaInput[];
}

export interface RegistrarTreinoRealizadoInput {
  operacaoId: string;
  sessaoAgendadaId?: string;
  alunoId: string;
  data: string;
  hora: string;
  duracaoMin?: number;
  foco?: string;
  treinoId?: string;
  divisaoId?: string;
  feedback?: Sessao["feedback"];
  exercicios: RegistroExercicioPorSerieInput[];
}
