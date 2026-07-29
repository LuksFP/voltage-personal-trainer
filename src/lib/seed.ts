import type {
  AlimentoBanco,
  Aluno,
  Avaliacao,
  ExercicioBiblioteca,
  GrupoMuscular,
  HistoricoExercicio,
  Pagamento,
  PersonalPublico,
  PlanoAlimentar,
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
    esporte: "Jiu-Jitsu",
    esporteDias: [1, 3, 5],
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
    esporte: "Corrida",
    esporteDias: [2, 4, 6],
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
    {
      id: "s1",
      alunoId: "a1",
      data: dia(0),
      hora: "07:00",
      duracaoMin: 60,
      foco: "Treino A — Peito/Tríceps",
      status: "realizada",
      feedback: {
        dificuldade: 4,
        energia: 3,
        dor: "Leve",
        observacoes: "Supino pesado no final, sem piora no ombro.",
      },
      criadoEm,
    },
    { id: "s2", alunoId: "a5", data: dia(0), hora: "18:00", duracaoMin: 75, foco: "Pegada + core", status: "realizada", criadoEm },
    { id: "s3", alunoId: "a2", data: dia(1), hora: "06:00", duracaoMin: 50, foco: "Circuito metabólico", status: "agendada", criadoEm },
    { id: "s4", alunoId: "a1", data: dia(2), hora: "07:00", duracaoMin: 60, foco: "Treino B — Costas/Bíceps", status: "agendada", criadoEm },
    { id: "s5", alunoId: "a5", data: dia(2), hora: "18:00", duracaoMin: 75, foco: "Sparring + cardio", status: "agendada", criadoEm },
    { id: "s6", alunoId: "a2", data: dia(3), hora: "06:00", duracaoMin: 50, foco: "Full body", status: "agendada", criadoEm },
    { id: "s7", alunoId: "a1", data: dia(4), hora: "07:00", duracaoMin: 60, foco: "Treino C — Pernas/Ombro", status: "agendada", criadoEm },
  ];
}

export function historicoExerciciosSeed(): HistoricoExercicio[] {
  const hoje = new Date();
  const diffSegunda = (hoje.getDay() + 6) % 7;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - diffSegunda);
  const data = isoLocal(segunda);
  const criadoEm = new Date().toISOString();

  return [
    {
      id: "hist_s1_e1",
      alunoId: "a1",
      sessaoId: "s1",
      treinoId: "t1",
      treinoNome: "Treino ABC — Hipertrofia",
      divisaoId: "d1",
      divisaoNome: "A — Peito e Tríceps",
      exercicioId: "e1",
      nome: "Supino reto com barra",
      formato: "resumo-legado",
      resumoLegado: {
        series: "4",
        repeticoes: "8",
        carga: "62kg",
        descanso: "90s",
      },
      data,
      criadoEm,
    },
    {
      id: "hist_s1_e2",
      alunoId: "a1",
      sessaoId: "s1",
      treinoId: "t1",
      treinoNome: "Treino ABC — Hipertrofia",
      divisaoId: "d1",
      divisaoNome: "A — Peito e Tríceps",
      exercicioId: "e2",
      nome: "Supino inclinado com halteres",
      formato: "resumo-legado",
      resumoLegado: {
        series: "3",
        repeticoes: "10",
        carga: "24kg",
        descanso: "75s",
      },
      data,
      criadoEm,
    },
    {
      id: "hist_s1_e4",
      alunoId: "a1",
      sessaoId: "s1",
      treinoId: "t1",
      treinoNome: "Treino ABC — Hipertrofia",
      divisaoId: "d1",
      divisaoNome: "A — Peito e Tríceps",
      exercicioId: "e4",
      nome: "Tríceps corda",
      formato: "resumo-legado",
      resumoLegado: {
        series: "4",
        repeticoes: "12",
        carga: "27kg",
        descanso: "60s",
      },
      data,
      criadoEm,
    },
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

/* ---------- Catálogo de personais (perfis públicos) ---------- */
// Personais fictícios da Baixada Santista para o catálogo não abrir vazio.
// O perfil do personal logado é criado por ele em /perfil e entra nesta lista.
export const perfisPublicosSeed: PersonalPublico[] = [
  {
    id: "pp1",
    email: "camila.arruda@voltage.app",
    nome: "Camila Arruda",
    bio: "Trabalho com quem está voltando a treinar depois de anos parado. Primeiro mês é sobre criar o hábito, não sobre pegar carga.",
    especialidades: ["Emagrecimento", "Saúde geral"],
    modalidade: "presencial",
    cidade: "Guarujá",
    bairros: ["Pitangueiras", "Astúrias", "Enseada"],
    precoMensal: 320,
    precoAvulso: 90,
    cref: "CREF 4/12345-G",
    anosExperiencia: 8,
    nota: 4.9,
    totalAvaliacoes: 34,
    aceitandoAlunos: true,
    criadoEm: "2026-03-02T12:00:00.000Z",
    atualizadoEm: "2026-07-10T12:00:00.000Z",
  },
  {
    id: "pp2",
    email: "diego.tavares@voltage.app",
    nome: "Diego Tavares",
    bio: "Powerlifting e força pura. Se o seu objetivo é agachar, supinar e levantar terra mais pesado do que ano passado, a gente se entende.",
    especialidades: ["Força", "Hipertrofia"],
    modalidade: "presencial",
    cidade: "Santos",
    bairros: ["Gonzaga", "Boqueirão"],
    precoMensal: 450,
    precoAvulso: 120,
    cref: "CREF 4/23871-G",
    anosExperiencia: 12,
    nota: 4.7,
    totalAvaliacoes: 51,
    aceitandoAlunos: true,
    criadoEm: "2026-01-15T12:00:00.000Z",
    atualizadoEm: "2026-06-28T12:00:00.000Z",
  },
  {
    id: "pp3",
    email: "juliana.paes@voltage.app",
    nome: "Juliana Paes Ribeiro",
    bio: "Consultoria online com ajuste de planilha toda semana. Atendo quem treina em casa ou em academia sem estrutura.",
    especialidades: ["Hipertrofia", "Emagrecimento"],
    modalidade: "online",
    cidade: "São Vicente",
    precoMensal: 180,
    cref: "CREF 4/33902-G",
    anosExperiencia: 5,
    nota: 4.8,
    totalAvaliacoes: 27,
    aceitandoAlunos: true,
    criadoEm: "2026-04-20T12:00:00.000Z",
    atualizadoEm: "2026-07-19T12:00:00.000Z",
  },
  {
    id: "pp4",
    email: "marcos.beltrao@voltage.app",
    nome: "Marcos Beltrão",
    bio: "Corrida e condicionamento na orla. Monto periodização pra primeira prova de 10k e acompanho presencial ou por chamada.",
    especialidades: ["Condicionamento", "Saúde geral"],
    modalidade: "ambos",
    cidade: "Praia Grande",
    bairros: ["Boqueirão", "Aviação"],
    precoMensal: 260,
    precoAvulso: 70,
    cref: "CREF 4/41220-G",
    anosExperiencia: 6,
    nota: 4.6,
    totalAvaliacoes: 18,
    aceitandoAlunos: true,
    criadoEm: "2026-02-11T12:00:00.000Z",
    atualizadoEm: "2026-07-05T12:00:00.000Z",
  },
  {
    id: "pp5",
    email: "renata.kobayashi@voltage.app",
    nome: "Renata Kobayashi",
    bio: "Pós-lesão e volta ao treino com dor. Trabalho junto com fisioterapeuta e respeito o laudo — sem heroísmo.",
    especialidades: ["Reabilitação", "Saúde geral"],
    modalidade: "presencial",
    cidade: "Santos",
    bairros: ["Ponta da Praia", "Aparecida"],
    precoMensal: 520,
    precoAvulso: 150,
    cref: "CREF 4/50118-G",
    anosExperiencia: 15,
    nota: 5,
    totalAvaliacoes: 42,
    aceitandoAlunos: false,
    criadoEm: "2025-11-08T12:00:00.000Z",
    atualizadoEm: "2026-07-22T12:00:00.000Z",
  },
  {
    id: "pp6",
    email: "thiago.nunes@voltage.app",
    nome: "Thiago Nunes",
    bio: "Primeiro treino é grátis e sem enrolação. Foco em quem tem pouco tempo: sessões de 45 minutos que cabem no intervalo do trabalho.",
    especialidades: ["Hipertrofia", "Condicionamento"],
    modalidade: "ambos",
    cidade: "Guarujá",
    bairros: ["Vicente de Carvalho"],
    precoMensal: 210,
    precoAvulso: 60,
    anosExperiencia: 3,
    aceitandoAlunos: true,
    criadoEm: "2026-06-30T12:00:00.000Z",
    atualizadoEm: "2026-07-24T12:00:00.000Z",
  },
];

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
    ["Flexão inclinada", "Peso corporal", "Mãos apoiadas num banco/sofá; versão mais leve da flexão, ótima pra começar."],
    ["Crucifixo no chão com halteres", "Halteres", "Deitado no chão, abra os braços até o cotovelo tocar o piso e feche contraindo o peito."],
  ],
  Costas: [
    ["Barra fixa", "Peso corporal", "Pegada pronada, puxe o queixo acima da barra, desça controlando."],
    ["Puxada frente", "Polia", "Puxe a barra até o peito, escápulas para baixo e para trás."],
    ["Remada curvada", "Barra", "Tronco inclinado, puxe a barra ao abdômen mantendo a coluna neutra."],
    ["Remada baixa", "Polia", "Puxe o triângulo ao abdômen, aperte as escápulas no fim."],
    ["Remada unilateral", "Halter", "Apoio no banco, puxe o halter à cintura, cotovelo rente ao corpo."],
    ["Remada na mesa", "Peso corporal", "Deite sob uma mesa firme, segure a borda e puxe o peito até ela, corpo reto."],
    ["Remada curvada com halteres", "Halteres", "Tronco inclinado, puxe os dois halteres à cintura, escápulas juntas no fim."],
  ],
  Pernas: [
    ["Agachamento livre", "Barra", "Desça até coxas paralelas, joelhos alinhados aos pés, tronco firme."],
    ["Leg press 45º", "Máquina", "Desça controlando até 90°, empurre sem travar o joelho."],
    ["Cadeira extensora", "Máquina", "Estenda os joelhos, segure 1s no topo, desça devagar."],
    ["Mesa flexora", "Máquina", "Flexione os joelhos trazendo o calcanhar ao glúteo."],
    ["Afundo", "Halteres", "Passo à frente, desça o joelho de trás, empurre com a perna da frente."],
    ["Agachamento livre sem peso", "Peso corporal", "Pés na largura dos ombros, desça até coxas paralelas mantendo o calcanhar no chão."],
    ["Agachamento búlgaro", "Peso corporal", "Pé de trás apoiado num banco, desça na perna da frente até 90°."],
    ["Stiff com halteres", "Halteres", "Joelhos semiflexionados, desça os halteres rente à perna alongando o posterior."],
  ],
  Glúteos: [
    ["Elevação pélvica", "Barra", "Apoie as costas no banco, suba o quadril contraindo o glúteo no topo."],
    ["Cadeira abdutora", "Máquina", "Abra as pernas contra a resistência, controle a volta."],
    ["Coice na polia", "Polia", "Estenda o quadril para trás, contraia o glúteo, sem arquear a lombar."],
    ["Ponte de glúteo no chão", "Peso corporal", "Deitado, pés no chão, suba o quadril e aperte o glúteo 1s no topo."],
    ["Coice de quatro apoios", "Peso corporal", "De quatro, estenda uma perna para trás sem arquear a lombar."],
  ],
  Ombro: [
    ["Desenvolvimento com halteres", "Halteres", "Empurre acima da cabeça sem travar, desça até a linha das orelhas."],
    ["Elevação lateral", "Halteres", "Suba os braços até a linha dos ombros, cotovelo levemente flexionado."],
    ["Elevação frontal", "Halteres", "Suba à frente até a altura dos ombros, sem balançar o tronco."],
    ["Remada alta", "Barra", "Puxe a barra ao queixo com os cotovelos altos."],
    ["Flexão pique", "Peso corporal", "Quadril alto formando um V, desça a cabeça em direção ao chão empurrando com o ombro."],
  ],
  Bíceps: [
    ["Rosca direta", "Barra", "Cotovelos fixos ao lado do corpo, suba a barra contraindo o bíceps."],
    ["Rosca alternada", "Halteres", "Alterne os braços, gire o punho (supinação) ao subir."],
    ["Rosca scott", "Banco Scott", "Apoie os braços no banco, suba controlando sem impulso."],
    ["Rosca martelo", "Halteres", "Punho neutro (polegar pra cima), suba sem balançar o corpo."],
  ],
  Tríceps: [
    ["Tríceps corda", "Polia", "Estenda os cotovelos abrindo a corda no fim do movimento."],
    ["Tríceps testa", "Barra W", "Desça a barra até a testa, estenda apenas o cotovelo."],
    ["Mergulho no banco", "Peso corporal", "Desça o corpo flexionando os cotovelos, suba estendendo."],
    ["Flexão fechada", "Peso corporal", "Mãos na largura do peito, cotovelos rente ao corpo ao descer."],
  ],
  Abdômen: [
    ["Prancha", "Peso corporal", "Antebraços no chão, corpo reto, segure contraindo o abdômen."],
    ["Abdominal supra", "Peso corporal", "Suba os ombros do chão contraindo o abdômen, sem puxar o pescoço."],
    ["Elevação de pernas", "Peso corporal", "Deitado, suba as pernas estendidas até 90°, desça sem tocar o chão."],
    ["Prancha lateral", "Peso corporal", "Apoio no antebraço e no pé, quadril alto, segure sem deixar cair."],
    ["Abdominal remador", "Peso corporal", "Suba tronco e joelhos ao mesmo tempo, encontrando-se no meio."],
  ],
  Panturrilha: [
    ["Panturrilha em pé", "Máquina", "Suba na ponta dos pés ao máximo, desça alongando."],
    ["Panturrilha sentado", "Máquina", "Foco no sóleo, suba e desça controlando a amplitude."],
    ["Panturrilha no degrau", "Peso corporal", "Ponta do pé num degrau, desça o calcanhar alongando e suba ao máximo."],
  ],
  Cardio: [
    ["Corrida na esteira", "Esteira", "Mantenha ritmo constante; ajuste inclinação conforme o objetivo."],
    ["Bike ergométrica", "Bike", "Cadência estável, ajuste a carga para manter a FC alvo."],
    ["Pular corda", "Corda", "Saltos curtos na ponta dos pés, punhos girando a corda."],
    ["Remo ergômetro", "Remo", "Empurre com as pernas, puxe com as costas, retorne controlando."],
    ["Polichinelo", "Peso corporal", "Abra e feche pernas e braços em ritmo constante, aterrissando leve."],
    ["Escalador", "Peso corporal", "Na prancha alta, traga os joelhos ao peito alternando rápido."],
  ],
  "Corpo todo": [
    ["Burpee", "Peso corporal", "Agache, prancha, flexão, salte para cima explodindo."],
    ["Kettlebell swing", "Kettlebell", "Balanço com o quadril (não com os braços) até a altura do peito."],
    ["Agachamento com salto", "Peso corporal", "Agache e salte explodindo; aterrisse na ponta dos pés amortecendo."],
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
        diasSemana: [1, 4],
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
        diasSemana: [2, 5],
        exercicios: [
          { id: "e5", nome: "Barra fixa", series: "4", repeticoes: "máx", carga: "corporal", descanso: "90s" },
          { id: "e6", nome: "Remada curvada", series: "4", repeticoes: "8-10", carga: "50kg", descanso: "90s" },
          { id: "e7", nome: "Rosca direta", series: "3", repeticoes: "10-12", carga: "14kg", descanso: "60s" },
        ],
      },
      {
        id: "d3",
        nome: "C — Pernas e Ombro",
        diasSemana: [3, 6],
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

// Banco de alimentos: macros por porção de referência (100 g/ml, ou 1 unidade).
// Valores aproximados de tabelas nutricionais (TACO/USDA), suficientes p/ planejar.
export const bancoAlimentosSeed: AlimentoBanco[] = (
  [
    // id, nome, categoria, unidade, base, kcal, P, C, G
    ["ab-frango", "Peito de frango grelhado", "proteina", "g", 100, 165, 31, 0, 3.6],
    ["ab-patinho", "Patinho moído (cozido)", "proteina", "g", 100, 200, 26, 0, 10],
    ["ab-ovo", "Ovo inteiro", "proteina", "unidade", 1, 72, 6.3, 0.4, 4.8],
    ["ab-tilapia", "Tilápia grelhada", "proteina", "g", 100, 128, 26, 0, 2.7],
    ["ab-salmao", "Salmão grelhado", "proteina", "g", 100, 208, 20, 0, 13],
    ["ab-atum", "Atum em água (lata)", "proteina", "g", 100, 116, 26, 0, 1],
    ["ab-arroz", "Arroz branco cozido", "carboidrato", "g", 100, 130, 2.7, 28, 0.3],
    ["ab-arroz-int", "Arroz integral cozido", "carboidrato", "g", 100, 124, 2.6, 26, 1],
    ["ab-feijao", "Feijão carioca cozido", "carboidrato", "g", 100, 76, 4.8, 13.6, 0.5],
    ["ab-batata-doce", "Batata-doce cozida", "carboidrato", "g", 100, 86, 1.6, 20, 0.1],
    ["ab-batata", "Batata inglesa cozida", "carboidrato", "g", 100, 86, 1.7, 20, 0.1],
    ["ab-macarrao", "Macarrão cozido", "carboidrato", "g", 100, 158, 5.8, 31, 0.9],
    ["ab-aveia", "Aveia em flocos", "carboidrato", "g", 100, 389, 17, 66, 7],
    ["ab-pao", "Pão integral", "carboidrato", "g", 100, 247, 13, 41, 3.4],
    ["ab-tapioca", "Tapioca (goma)", "carboidrato", "g", 100, 358, 0, 89, 0],
    ["ab-cuscuz", "Cuscuz de milho", "carboidrato", "g", 100, 112, 3.8, 23, 0.6],
    ["ab-banana", "Banana", "fruta", "g", 100, 89, 1.1, 23, 0.3],
    ["ab-maca", "Maçã", "fruta", "g", 100, 52, 0.3, 14, 0.2],
    ["ab-brocolis", "Brócolis cozido", "vegetal", "g", 100, 35, 2.4, 7, 0.4],
    ["ab-leite", "Leite integral", "laticinio", "ml", 100, 61, 3.2, 4.8, 3.3],
    ["ab-iogurte", "Iogurte natural integral", "laticinio", "g", 100, 61, 3.5, 4.7, 3.3],
    ["ab-queijo-minas", "Queijo minas frescal", "laticinio", "g", 100, 264, 17, 3, 20],
    ["ab-requeijao", "Requeijão", "laticinio", "g", 100, 264, 10, 4, 23],
    ["ab-pasta-amendoim", "Pasta de amendoim", "gordura", "g", 100, 588, 25, 20, 50],
    ["ab-castanha", "Castanha-do-pará", "gordura", "g", 100, 656, 14, 12, 66],
    ["ab-azeite", "Azeite de oliva", "gordura", "ml", 100, 884, 0, 0, 100],
    ["ab-whey", "Whey protein", "suplemento", "g", 100, 400, 80, 8, 6],
    ["ab-mel", "Mel", "outro", "g", 100, 304, 0.3, 82, 0],
  ] as const
).map(([id, nome, categoria, unidade, base, kcal, proteinas, carboidratos, gorduras]) => ({
  id,
  nome,
  categoria,
  unidade,
  base,
  kcal,
  proteinas,
  carboidratos,
  gorduras,
  criadoEm: "2026-05-01T10:00:00.000Z",
}));

export function planosAlimentaresSeed(): PlanoAlimentar[] {
  return [
    {
      id: "plano-seed-1",
      alunoId: "a1",
      titulo: "Hipertrofia — superávit leve",
      objetivo: "Ganho de massa mantendo definição, ~300 kcal acima da manutenção.",
      status: "ativo",
      metas: { calorias: 2700, proteinas: 165, carboidratos: 320, gorduras: 75 },
      aguaLitros: 3.5,
      refeicoes: [
        {
          id: "ref-seed-1",
          nome: "Café da manhã",
          horario: "07:30",
          alimentos: [
            { id: "alim-seed-1", nome: "Ovo inteiro", quantidade: "3 un", bancoId: "ab-ovo", quantidadeNum: 3 },
            { id: "alim-seed-2", nome: "Aveia em flocos", quantidade: "60 g", bancoId: "ab-aveia", quantidadeNum: 60 },
            { id: "alim-seed-3", nome: "Banana", quantidade: "100 g", bancoId: "ab-banana", quantidadeNum: 100 },
          ],
        },
        {
          id: "ref-seed-2",
          nome: "Almoço",
          horario: "12:30",
          alimentos: [
            { id: "alim-seed-4", nome: "Arroz branco cozido", quantidade: "150 g", bancoId: "ab-arroz", quantidadeNum: 150 },
            { id: "alim-seed-5", nome: "Peito de frango grelhado", quantidade: "180 g", bancoId: "ab-frango", quantidadeNum: 180 },
            { id: "alim-seed-6", nome: "Feijão carioca cozido", quantidade: "80 g", bancoId: "ab-feijao", quantidadeNum: 80 },
            { id: "alim-seed-7", nome: "Salada à vontade", quantidade: "livre", observacao: "Priorizar folhas verdes." },
          ],
        },
        {
          id: "ref-seed-3",
          nome: "Pré-treino",
          horario: "16:30",
          alimentos: [
            { id: "alim-seed-8", nome: "Pão integral", quantidade: "50 g", bancoId: "ab-pao", quantidadeNum: 50 },
            { id: "alim-seed-9", nome: "Pasta de amendoim", quantidade: "15 g", bancoId: "ab-pasta-amendoim", quantidadeNum: 15 },
          ],
        },
        {
          id: "ref-seed-4",
          nome: "Pós-treino / Jantar",
          horario: "20:00",
          alimentos: [
            { id: "alim-seed-10", nome: "Batata-doce cozida", quantidade: "200 g", bancoId: "ab-batata-doce", quantidadeNum: 200 },
            { id: "alim-seed-11", nome: "Patinho moído (cozido)", quantidade: "150 g", bancoId: "ab-patinho", quantidadeNum: 150 },
            { id: "alim-seed-12", nome: "Whey protein", quantidade: "30 g", bancoId: "ab-whey", quantidadeNum: 30, observacao: "Caso não bata a proteína do dia." },
          ],
        },
      ],
      observacoes: "Refeição livre 1x na semana. Ajustar carboidrato do pré-treino conforme energia.",
      criadoEm: "2026-06-01T10:00:00.000Z",
      atualizadoEm: "2026-06-20T09:00:00.000Z",
    },
  ];
}
