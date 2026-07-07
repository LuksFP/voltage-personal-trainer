import type {
  Aluno,
  Avaliacao,
  ExercicioBiblioteca,
  GrupoMuscular,
  Pagamento,
  Sessao,
  Treino,
} from "./types";
import { competenciaAtual, deslocarCompetencia, vencimentoDe } from "./pagamentos";

export const alunosSeed: Aluno[] = [
  {
    id: "a1",
    nome: "Rafael Menezes",
    telefone: "(13) 99812-4477",
    email: "rafael.menezes@email.com",
    objetivo: "Hipertrofia",
    modalidade: "Musculação",
    pesoMeta: 84,
    mensalidade: 260,
    diaVencimento: 5,
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
    mensalidade: 340,
    diaVencimento: 10,
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
    mensalidade: 220,
    diaVencimento: 15,
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
    mensalidade: 240,
    diaVencimento: 20,
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

/**
 * Cobranças de exemplo ancoradas no mês atual: o mês anterior quitado
 * (com uma pendência que aparece como "atrasado") e o mês corrente em aberto.
 */
export function pagamentosSeed(): Pagamento[] {
  const criadoEm = new Date().toISOString();
  const atual = competenciaAtual();
  const anterior = deslocarCompetencia(atual, -1);

  // [alunoId, valor, diaVencimento]
  const config: [string, number, number][] = [
    ["a1", 260, 5],
    ["a5", 340, 10],
    ["a2", 220, 15],
    ["a3", 240, 20],
  ];

  const pag = (
    alunoId: string,
    comp: string,
    valor: number,
    dia: number,
    status: "pago" | "pendente",
    metodo?: string,
  ): Pagamento => {
    const vencimento = vencimentoDe(comp, dia);
    return {
      id: `pag_${comp}_${alunoId}`,
      alunoId,
      competencia: comp,
      valor,
      vencimento,
      status,
      ...(status === "pago" ? { pagoEm: vencimento, metodo: metodo ?? "Pix" } : {}),
      criadoEm,
    };
  };

  const out: Pagamento[] = [];
  for (const [id, valor, dia] of config) {
    // mês anterior: todos pagos, exceto o a3 (fica pendente e vira "atrasado")
    out.push(pag(id, anterior, valor, dia, id === "a3" ? "pendente" : "pago"));
    // mês atual: só o a1 já pagou; o resto segue em aberto
    out.push(pag(id, atual, valor, dia, id === "a1" ? "pago" : "pendente"));
  }
  return out;
}

/* ---------- Biblioteca de exercícios (catálogo inicial) ---------- */
// Link de vídeo demonstrativo: busca no YouTube pelo nome (sempre válido, não quebra).
const yt = (nome: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nome} execução`)}`;

// [nome, equipamento, instruções] por grupo muscular.
const catalogo: Record<GrupoMuscular, [string, string, string][]> = {
  Peito: [
    ["Supino reto com barra", "Barra", "Desça a barra até o peito controlando; empurre sem travar o cotovelo."],
    ["Supino inclinado com halteres", "Halteres", "Banco a 30-45°, desça até alinhar com o peito, foco no peitoral superior."],
    ["Crossover", "Polia", "Puxe as polias juntando as mãos à frente, contraia o peito no fim."],
    ["Crucifixo na máquina", "Máquina", "Abra e feche controlando, sem estender demais o ombro."],
    ["Flexão de braço", "Peso corporal", "Corpo alinhado, desça até quase tocar o chão, suba estendendo os cotovelos."],
  ],
  Costas: [
    ["Barra fixa", "Peso corporal", "Pegada pronada, puxe o queixo acima da barra, desça controlando."],
    ["Puxada frente", "Polia", "Puxe a barra até o peito, escápulas para baixo e para trás."],
    ["Remada curvada", "Barra", "Tronco inclinado, puxe a barra ao abdômen mantendo a coluna neutra."],
    ["Remada baixa", "Polia", "Puxe o triângulo ao abdômen, aperte as escápulas no fim."],
    ["Remada unilateral", "Halter", "Apoio no banco, puxe o halter à cintura, cotovelo rente ao corpo."],
  ],
  Pernas: [
    ["Agachamento livre", "Barra", "Desça até coxas paralelas, joelhos alinhados aos pés, tronco firme."],
    ["Leg press 45º", "Máquina", "Desça controlando até 90°, empurre sem travar o joelho."],
    ["Cadeira extensora", "Máquina", "Estenda os joelhos, segure 1s no topo, desça devagar."],
    ["Mesa flexora", "Máquina", "Flexione os joelhos trazendo o calcanhar ao glúteo."],
    ["Afundo", "Halteres", "Passo à frente, desça o joelho de trás, empurre com a perna da frente."],
  ],
  Glúteos: [
    ["Elevação pélvica", "Barra", "Apoie as costas no banco, suba o quadril contraindo o glúteo no topo."],
    ["Cadeira abdutora", "Máquina", "Abra as pernas contra a resistência, controle a volta."],
    ["Coice na polia", "Polia", "Estenda o quadril para trás, contraia o glúteo, sem arquear a lombar."],
  ],
  Ombro: [
    ["Desenvolvimento com halteres", "Halteres", "Empurre acima da cabeça sem travar, desça até a linha das orelhas."],
    ["Elevação lateral", "Halteres", "Suba os braços até a linha dos ombros, cotovelo levemente flexionado."],
    ["Elevação frontal", "Halteres", "Suba à frente até a altura dos ombros, sem balançar o tronco."],
    ["Remada alta", "Barra", "Puxe a barra ao queixo com os cotovelos altos."],
  ],
  Bíceps: [
    ["Rosca direta", "Barra", "Cotovelos fixos ao lado do corpo, suba a barra contraindo o bíceps."],
    ["Rosca alternada", "Halteres", "Alterne os braços, gire o punho (supinação) ao subir."],
    ["Rosca scott", "Banco Scott", "Apoie os braços no banco, suba controlando sem impulso."],
  ],
  Tríceps: [
    ["Tríceps corda", "Polia", "Estenda os cotovelos abrindo a corda no fim do movimento."],
    ["Tríceps testa", "Barra W", "Desça a barra até a testa, estenda apenas o cotovelo."],
    ["Mergulho no banco", "Peso corporal", "Desça o corpo flexionando os cotovelos, suba estendendo."],
  ],
  Abdômen: [
    ["Prancha", "Peso corporal", "Antebraços no chão, corpo reto, segure contraindo o abdômen."],
    ["Abdominal supra", "Peso corporal", "Suba os ombros do chão contraindo o abdômen, sem puxar o pescoço."],
    ["Elevação de pernas", "Peso corporal", "Deitado, suba as pernas estendidas até 90°, desça sem tocar o chão."],
  ],
  Panturrilha: [
    ["Panturrilha em pé", "Máquina", "Suba na ponta dos pés ao máximo, desça alongando."],
    ["Panturrilha sentado", "Máquina", "Foco no sóleo, suba e desça controlando a amplitude."],
  ],
  Cardio: [
    ["Corrida na esteira", "Esteira", "Mantenha ritmo constante; ajuste inclinação conforme o objetivo."],
    ["Bike ergométrica", "Bike", "Cadência estável, ajuste a carga para manter a FC alvo."],
    ["Pular corda", "Corda", "Saltos curtos na ponta dos pés, punhos girando a corda."],
    ["Remo ergômetro", "Remo", "Empurre com as pernas, puxe com as costas, retorne controlando."],
  ],
  "Corpo todo": [
    ["Burpee", "Peso corporal", "Agache, prancha, flexão, salte para cima explodindo."],
    ["Kettlebell swing", "Kettlebell", "Balanço com o quadril (não com os braços) até a altura do peito."],
  ],
};

export const bibliotecaSeed: ExercicioBiblioteca[] = Object.entries(catalogo).flatMap(
  ([grupo, itens]) =>
    itens.map(([nome, equipamento, instrucoes], i): ExercicioBiblioteca => ({
      id: `bib_${grupo}_${i}`.toLowerCase().replace(/\s+/g, ""),
      nome,
      grupo: grupo as GrupoMuscular,
      equipamento,
      instrucoes,
      videoUrl: yt(nome),
      criadoEm: "2026-05-01T00:00:00.000Z",
    })),
);

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
