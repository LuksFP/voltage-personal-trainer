import type { StoreData } from "./store";

type DadosRelatorio = Pick<
  StoreData,
  "alunos" | "treinos" | "avaliacoes" | "sessoes" | "pagamentos"
>;

// Janela de período do relatório. "tudo" = sem corte de data.
export type Periodo = "30d" | "90d" | "365d" | "tudo";

export const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: "30d", label: "30 dias" },
  { valor: "90d", label: "90 dias" },
  { valor: "365d", label: "12 meses" },
  { valor: "tudo", label: "Tudo" },
];

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Data ISO (YYYY-MM-DD) de corte do período, ou null para "tudo".
function desdeIso(periodo: Periodo, hoje: Date): string | null {
  if (periodo === "tudo") return null;
  const dias = periodo === "30d" ? 30 : periodo === "90d" ? 90 : 365;
  const d = new Date(hoje);
  d.setDate(d.getDate() - (dias - 1));
  return isoLocal(d);
}

// Normaliza qualquer ISO (com ou sem hora) para só o dia, para comparar como string.
const dia = (iso: string) => iso.slice(0, 10);

export interface RankItem {
  alunoId: string;
  nome: string;
  valor: number;
}

export interface PontoMes {
  label: string; // "jul"
  chave: string; // "2026-07"
  realizadas: number;
  faltas: number;
}

export interface PontoReceita {
  label: string; // "jul"
  value: number; // R$ recebido no mês (por data de pagamento)
}

export interface Distribuicao {
  nome: string;
  qtd: number;
}

export interface Relatorio {
  alunosAtivos: number;
  alunosTotal: number;
  novosNoPeriodo: number;
  sessoesRealizadas: number;
  sessoesFaltou: number;
  sessoesAgendadas: number;
  comparecimento: number | null; // % (0-100) ou null se não houve sessão concluída/faltada
  avaliacoesNoPeriodo: number;
  coberturaTreino: number; // % de ativos com planilha ativa
  coberturaAvaliacao: number; // % de ativos com ao menos 1 avaliação
  ativosSemTreino: { id: string; nome: string; modalidade?: string }[];
  ativosSemAvaliacao: { id: string; nome: string; modalidade?: string }[];
  porObjetivo: Distribuicao[];
  porModalidade: Distribuicao[];
  maisAssiduos: RankItem[];
  maisFaltosos: RankItem[];
  serieMensal: PontoMes[]; // sempre os últimos 6 meses (independe do filtro)
  // Financeiro
  recebidoNoPeriodo: number; // R$ efetivamente pagos no período (por data de pagamento)
  emAberto: number; // R$ de todas as cobranças ainda não pagas (independe do filtro)
  previstoMensal: number; // R$ soma das mensalidades dos ativos
  receitaMensal: PontoReceita[]; // últimos 6 meses de recebimento
}

function distribuir(valores: (string | undefined)[], vazioLabel: string): Distribuicao[] {
  const mapa = new Map<string, number>();
  for (const v of valores) {
    const k = v?.trim() || vazioLabel;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd);
}

// Últimos `n` meses (incluindo o atual) com contagem de sessões realizadas/faltas.
function serieUltimosMeses(data: DadosRelatorio, hoje: Date, n: number): PontoMes[] {
  const meses: PontoMes[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    let realizadas = 0;
    let faltas = 0;
    for (const s of data.sessoes) {
      if (!dia(s.data).startsWith(chave)) continue;
      if (s.status === "realizada") realizadas++;
      else if (s.status === "faltou") faltas++;
    }
    meses.push({ label, chave, realizadas, faltas });
  }
  return meses;
}

export function calcularRelatorio(
  data: DadosRelatorio,
  periodo: Periodo,
  hoje: Date = new Date(),
): Relatorio {
  const desde = desdeIso(periodo, hoje);
  const noPeriodo = (iso: string) => desde === null || dia(iso) >= desde;

  const ativos = data.alunos.filter((a) => a.ativo);
  const idsComTreinoAtivo = new Set(
    data.treinos.filter((t) => t.ativo).map((t) => t.alunoId),
  );
  const idsComAvaliacao = new Set(data.avaliacoes.map((av) => av.alunoId));

  // Sessões dentro do período
  const sessoesPeriodo = data.sessoes.filter((s) => noPeriodo(s.data));
  let sessoesRealizadas = 0;
  let sessoesFaltou = 0;
  let sessoesAgendadas = 0;
  const realizadasPorAluno = new Map<string, number>();
  const faltasPorAluno = new Map<string, number>();
  for (const s of sessoesPeriodo) {
    if (s.status === "realizada") {
      sessoesRealizadas++;
      realizadasPorAluno.set(s.alunoId, (realizadasPorAluno.get(s.alunoId) ?? 0) + 1);
    } else if (s.status === "faltou") {
      sessoesFaltou++;
      faltasPorAluno.set(s.alunoId, (faltasPorAluno.get(s.alunoId) ?? 0) + 1);
    } else {
      sessoesAgendadas++;
    }
  }
  const concluidas = sessoesRealizadas + sessoesFaltou;
  const comparecimento = concluidas > 0 ? (sessoesRealizadas / concluidas) * 100 : null;

  const nomeDe = (id: string) => data.alunos.find((a) => a.id === id)?.nome ?? "Aluno removido";
  const ranking = (mapa: Map<string, number>): RankItem[] =>
    Array.from(mapa.entries())
      .map(([alunoId, valor]) => ({ alunoId, nome: nomeDe(alunoId), valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

  const pct = (parte: number, total: number) =>
    total === 0 ? 0 : Math.round((parte / total) * 100);

  // Financeiro
  const recebidoNoPeriodo = data.pagamentos
    .filter((p) => p.status === "pago" && p.pagoEm && noPeriodo(p.pagoEm))
    .reduce((s, p) => s + p.valor, 0);
  const emAberto = data.pagamentos
    .filter((p) => p.status !== "pago")
    .reduce((s, p) => s + p.valor, 0);
  const previstoMensal = ativos.reduce((s, a) => s + (a.mensalidade ?? 0), 0);

  // Receita recebida por mês (por data de pagamento), últimos 6 meses.
  const receitaMensal: PontoReceita[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const value = data.pagamentos
      .filter((p) => p.status === "pago" && p.pagoEm && dia(p.pagoEm).startsWith(chave))
      .reduce((s, p) => s + p.valor, 0);
    receitaMensal.push({ label, value });
  }

  return {
    alunosAtivos: ativos.length,
    alunosTotal: data.alunos.length,
    novosNoPeriodo: data.alunos.filter((a) => noPeriodo(a.criadoEm)).length,
    sessoesRealizadas,
    sessoesFaltou,
    sessoesAgendadas,
    comparecimento,
    avaliacoesNoPeriodo: data.avaliacoes.filter((av) => noPeriodo(av.data)).length,
    coberturaTreino: pct(ativos.filter((a) => idsComTreinoAtivo.has(a.id)).length, ativos.length),
    coberturaAvaliacao: pct(ativos.filter((a) => idsComAvaliacao.has(a.id)).length, ativos.length),
    ativosSemTreino: ativos
      .filter((a) => !idsComTreinoAtivo.has(a.id))
      .map((a) => ({ id: a.id, nome: a.nome, modalidade: a.modalidade })),
    ativosSemAvaliacao: ativos
      .filter((a) => !idsComAvaliacao.has(a.id))
      .map((a) => ({ id: a.id, nome: a.nome, modalidade: a.modalidade })),
    porObjetivo: distribuir(ativos.map((a) => a.objetivo), "Sem objetivo"),
    porModalidade: distribuir(ativos.map((a) => a.modalidade), "Sem modalidade"),
    maisAssiduos: ranking(realizadasPorAluno),
    maisFaltosos: ranking(faltasPorAluno),
    serieMensal: serieUltimosMeses(data, hoje, 6),
    recebidoNoPeriodo,
    emAberto,
    previstoMensal,
    receitaMensal,
  };
}
