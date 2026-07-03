import type { Aluno, Avaliacao, Sessao, Treino } from "./types";

export const alunosSeed: Aluno[] = [
  {
    id: "a1",
    nome: "Rafael Menezes",
    telefone: "(13) 99812-4477",
    email: "rafael.menezes@email.com",
    objetivo: "Hipertrofia",
    modalidade: "Musculação",
    pesoMeta: 84,
    observacoes: "Sente desconforto no ombro direito em desenvolvimento acima da cabeça.",
    ativo: true,
    criadoEm: "2026-05-12T10:00:00.000Z",
  },
  {
    id: "a5",
    nome: "Lucas Yamamoto",
    telefone: "(13) 99655-3021",
    email: "lucas.yamamoto@email.com",
    objetivo: "Condicionamento",
    modalidade: "Jiu-Jitsu",
    pesoMeta: 77.5,
    observacoes: "Faixa roxa, compete pela federação. Foco em pegada, core e cardio para as lutas.",
    ativo: true,
    criadoEm: "2026-06-25T18:00:00.000Z",
  },
  {
    id: "a2",
    nome: "Camila Torres",
    telefone: "(13) 99700-1188",
    email: "camila.torres@email.com",
    objetivo: "Emagrecimento",
    modalidade: "Musculação",
    observacoes: "Treina 4x na semana, prefere início da manhã.",
    ativo: true,
    criadoEm: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "a3",
    nome: "Diego Farias",
    telefone: "(13) 98123-9090",
    objetivo: "Força",
    modalidade: "CrossFit",
    ativo: true,
    criadoEm: "2026-06-20T14:30:00.000Z",
  },
  {
    id: "a4",
    nome: "Beatriz Lopes",
    email: "bia.lopes@email.com",
    objetivo: "Condicionamento",
    modalidade: "Corrida",
    observacoes: "Corredora, foco em membros inferiores e core.",
    ativo: false,
    criadoEm: "2026-04-02T08:00:00.000Z",
  },
];

export const avaliacoesSeed: Avaliacao[] = [
  // Rafael — hipertrofia, ganhando peso e reduzindo gordura
  {
    id: "av1",
    alunoId: "a1",
    data: "2026-05-12",
    peso: 78.4,
    percentualGordura: 19.2,
    cintura: 88,
    peito: 100,
    braco: 36,
    coxa: 57,
    observacoes: "Avaliação inicial.",
    criadoEm: "2026-05-12T10:00:00.000Z",
  },
  {
    id: "av2",
    alunoId: "a1",
    data: "2026-06-12",
    peso: 79.6,
    percentualGordura: 18.1,
    cintura: 87,
    peito: 102,
    braco: 37,
    coxa: 58,
    criadoEm: "2026-06-12T10:00:00.000Z",
  },
  {
    id: "av3",
    alunoId: "a1",
    data: "2026-07-01",
    peso: 80.8,
    percentualGordura: 17.3,
    cintura: 86,
    peito: 103,
    braco: 38,
    coxa: 59,
    observacoes: "Boa evolução de força no supino.",
    criadoEm: "2026-07-01T10:00:00.000Z",
  },
  // Lucas — jiu-jitsu, cortando peso para categoria mantendo massa
  {
    id: "av4",
    alunoId: "a5",
    data: "2026-06-25",
    peso: 82.5,
    percentualGordura: 14.0,
    cintura: 82,
    criadoEm: "2026-06-25T18:00:00.000Z",
  },
  {
    id: "av5",
    alunoId: "a5",
    data: "2026-07-02",
    peso: 80.9,
    percentualGordura: 12.8,
    cintura: 80,
    observacoes: "Faltam 3 semanas para a competição.",
    criadoEm: "2026-07-02T18:00:00.000Z",
  },
];

// Data local (YYYY-MM-DD) — evita deslocamento de fuso do toISOString.
function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Sessões de exemplo ancoradas na segunda-feira da semana atual,
 * para a agenda já mostrar dados relevantes em qualquer data.
 */
export function sessoesSeed(): Sessao[] {
  const hoje = new Date();
  const diffSegunda = (hoje.getDay() + 6) % 7; // 0=Dom → volta ao dia útil
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - diffSegunda);

  const dia = (n: number) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + n);
    return isoLocal(d);
  };
  const criadoEm = new Date().toISOString();

  return [
    { id: "s1", alunoId: "a1", data: dia(0), hora: "07:00", duracaoMin: 60, foco: "Treino A — Peito/Tríceps", status: "realizada", criadoEm },
    { id: "s2", alunoId: "a5", data: dia(0), hora: "18:00", duracaoMin: 75, foco: "Pegada + core", status: "realizada", criadoEm },
    { id: "s3", alunoId: "a2", data: dia(1), hora: "06:00", duracaoMin: 50, foco: "Circuito metabólico", status: "agendada", criadoEm },
    { id: "s4", alunoId: "a1", data: dia(2), hora: "07:00", duracaoMin: 60, foco: "Treino B — Costas/Bíceps", status: "agendada", criadoEm },
    { id: "s5", alunoId: "a5", data: dia(2), hora: "18:00", duracaoMin: 75, foco: "Sparring + cardio", status: "agendada", criadoEm },
    { id: "s6", alunoId: "a2", data: dia(3), hora: "06:00", duracaoMin: 50, foco: "Full body", status: "agendada", criadoEm },
    { id: "s7", alunoId: "a1", data: dia(4), hora: "07:00", duracaoMin: 60, foco: "Treino C — Pernas/Ombro", status: "agendada", criadoEm },
  ];
}

export const treinosSeed: Treino[] = [
  {
    id: "t1",
    alunoId: "a1",
    nome: "Treino ABC — Hipertrofia",
    descricao: "Divisão de 3 dias focada em volume.",
    ativo: true,
    criadoEm: "2026-05-15T10:00:00.000Z",
    divisoes: [
      {
        id: "d1",
        nome: "A — Peito e Tríceps",
        exercicios: [
          { id: "e1", nome: "Supino reto com barra", series: "4", repeticoes: "8-10", carga: "60kg", descanso: "90s" },
          { id: "e2", nome: "Supino inclinado com halteres", series: "3", repeticoes: "10-12", carga: "22kg", descanso: "75s" },
          { id: "e3", nome: "Crossover", series: "3", repeticoes: "12-15", carga: "15kg", descanso: "60s" },
          { id: "e4", nome: "Tríceps corda", series: "4", repeticoes: "12", carga: "25kg", descanso: "60s" },
        ],
      },
      {
        id: "d2",
        nome: "B — Costas e Bíceps",
        exercicios: [
          { id: "e5", nome: "Barra fixa", series: "4", repeticoes: "máx", carga: "corporal", descanso: "90s" },
          { id: "e6", nome: "Remada curvada", series: "4", repeticoes: "8-10", carga: "50kg", descanso: "90s" },
          { id: "e7", nome: "Rosca direta", series: "3", repeticoes: "10-12", carga: "14kg", descanso: "60s" },
        ],
      },
      {
        id: "d3",
        nome: "C — Pernas e Ombro",
        exercicios: [
          { id: "e8", nome: "Agachamento livre", series: "4", repeticoes: "8-10", carga: "80kg", descanso: "120s" },
          { id: "e9", nome: "Leg press 45º", series: "4", repeticoes: "12", carga: "180kg", descanso: "90s" },
          { id: "e10", nome: "Desenvolvimento máquina", series: "3", repeticoes: "12", carga: "30kg", descanso: "75s", observacoes: "Amplitude parcial por causa do ombro." },
        ],
      },
    ],
  },
  {
    id: "t2",
    alunoId: "a2",
    nome: "Full Body — Emagrecimento",
    descricao: "Circuito metabólico, 3x por semana.",
    ativo: true,
    criadoEm: "2026-06-03T09:00:00.000Z",
    divisoes: [
      {
        id: "d4",
        nome: "Circuito único",
        exercicios: [
          { id: "e11", nome: "Agachamento com halter", series: "3", repeticoes: "15", carga: "12kg", descanso: "45s" },
          { id: "e12", nome: "Remada baixa", series: "3", repeticoes: "15", carga: "35kg", descanso: "45s" },
          { id: "e13", nome: "Prancha", series: "3", repeticoes: "40s", carga: "corporal", descanso: "30s" },
        ],
      },
    ],
  },
];
