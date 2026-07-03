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
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;
}

export type StatusSessao = "agendada" | "realizada" | "faltou";

// Sessão de treino agendada com um aluno.
export interface Sessao {
  id: string;
  alunoId: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracaoMin?: number;
  foco?: string; // ex.: "Treino A", "Sparring", "Corrida longa"
  status: StatusSessao;
  criadoEm: string;
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
}

export interface Divisao {
  id: string;
  nome: string; // ex.: "A — Peito e Tríceps"
  exercicios: Exercicio[];
}

export interface Treino {
  id: string;
  alunoId: string;
  nome: string; // ex.: "Treino ABC — Hipertrofia"
  descricao?: string;
  ativo: boolean;
  divisoes: Divisao[];
  criadoEm: string;
}
