
import { inicioDaSemana } from "./checkins";
import type {
  Aluno,
  Avaliacao,
  CheckinSemanal,
  LembreteWhatsApp,
  Pagamento,
  ProgramaTreino,
  Sessao,
  TipoLembreteWhatsApp,
} from "./types";
import { paraIso } from "@/lib/data";
import { somarDias } from "./data";

const JANELA_COBRANCA_ANTECEDENCIA_DIAS = 3;
const JANELA_RENOVACAO_ANTECEDENCIA_DIAS = 14;
const JANELA_RENOVACAO_ATRASO_DIAS = 30;

export interface DadosGeracaoLembretes {
  alunos: readonly Aluno[];
  sessoes: readonly Sessao[];
  avaliacoes: readonly Avaliacao[];
  pagamentos: readonly Pagamento[];
  checkinsSemanais: readonly CheckinSemanal[];
  programasTreino: readonly ProgramaTreino[];
}

export type CandidatoLembreteWhatsApp = Omit<
  LembreteWhatsApp,
  | "id"
  | "status"
  | "origem"
  | "chaveAutomatica"
  | "criadoEm"
  | "enviadoEm"
  | "dispensadoEm"
> & {
  origem: "automatica";
  chaveAutomatica: string;
};

const ORDEM_TIPO: Record<TipoLembreteWhatsApp, number> = {
  mensalidade: 0,
  treino: 1,
  checkin: 2,
  renovacao: 3,
  avaliacao: 4,
};

function dataIsoValida(valor: string): string | null {
  const dataIso = valor.slice(0, 10);
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso);
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return dataIso;
}

function normalizarHoje(hoje: Date | string | undefined): string {
  if (typeof hoje === "string") {
    const exata = dataIsoValida(hoje);
    if (exata && hoje.length === 10) return exata;
    const data = new Date(hoje);
    if (Number.isNaN(data.getTime())) throw new Error("A data de referência é inválida.");
    return paraIso(data);
  }
  const data = hoje ? new Date(hoje.getTime()) : new Date();
  if (Number.isNaN(data.getTime())) throw new Error("A data de referência é inválida.");
  return paraIso(data);
}

function diferencaEmDias(inicio: string, fim: string): number | null {
  const inicioIso = dataIsoValida(inicio);
  const fimIso = dataIsoValida(fim);
  if (!inicioIso || !fimIso) return null;
  return Math.round(
    (Date.parse(`${fimIso}T00:00:00.000Z`) - Date.parse(`${inicioIso}T00:00:00.000Z`)) /
      86_400_000,
  );
}

function formatarData(dataIso: string): string {
  const valida = dataIsoValida(dataIso);
  if (!valida) return dataIso;
  const [ano, mes, dia] = valida.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function saudacao(aluno: Aluno): string {
  const primeiroNome = aluno.nome.trim().split(/\s+/)[0];
  return primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!";
}

function candidatosDeTreino(
  alunos: ReadonlyMap<string, Aluno>,
  sessoes: readonly Sessao[],
  hoje: string,
): CandidatoLembreteWhatsApp[] {
  const amanha = somarDias(hoje, 1);
  return sessoes.flatMap((sessao) => {
    const aluno = alunos.get(sessao.alunoId);
    if (
      !aluno ||
      sessao.status !== "agendada" ||
      (sessao.data !== hoje && sessao.data !== amanha)
    ) {
      return [];
    }

    const quando = sessao.data === hoje ? "hoje" : "amanhã";
    const foco = sessao.foco?.trim();
    return [
      {
        alunoId: aluno.id,
        tipo: "treino",
        titulo: `Treino de ${quando}`,
        mensagem: `${saudacao(aluno)} Passando para lembrar do seu treino ${quando}, às ${sessao.hora}${foco ? ` (${foco})` : ""}. Até lá!`,
        dataReferencia: sessao.data,
        origem: "automatica",
        chaveAutomatica: `treino:${sessao.id}:${sessao.data}`,
        relacionadoId: sessao.id,
      },
    ];
  });
}

function candidatosDeAvaliacao(
  alunos: ReadonlyMap<string, Aluno>,
  avaliacoes: readonly Avaliacao[],
  hoje: string,
): CandidatoLembreteWhatsApp[] {
  const avaliacoesPorAluno = new Map<string, Avaliacao[]>();
  for (const avaliacao of avaliacoes) {
    const data = dataIsoValida(avaliacao.data);
    if (!data || data > hoje || !alunos.has(avaliacao.alunoId)) continue;
    const lista = avaliacoesPorAluno.get(avaliacao.alunoId) ?? [];
    lista.push(avaliacao);
    avaliacoesPorAluno.set(avaliacao.alunoId, lista);
  }

  const competencia = hoje.slice(0, 7);
  return Array.from(alunos.values()).flatMap((aluno) => {
    const avaliacoesDoAluno = avaliacoesPorAluno.get(aluno.id) ?? [];
    const ultima = avaliacoesDoAluno.sort((a, b) => b.data.localeCompare(a.data))[0];
    const diasDesdeUltima = ultima ? diferencaEmDias(ultima.data, hoje) : null;
    if (ultima && diasDesdeUltima !== null && diasDesdeUltima < 30) return [];

    return [
      {
        alunoId: aluno.id,
        tipo: "avaliacao",
        titulo: ultima ? "Renovar avaliação física" : "Agendar avaliação física",
        mensagem: ultima
          ? `${saudacao(aluno)} Já faz pelo menos 30 dias desde sua última avaliação física. Vamos agendar uma atualização?`
          : `${saudacao(aluno)} Vamos agendar sua avaliação física inicial para acompanhar sua evolução?`,
        dataReferencia: hoje,
        origem: "automatica",
        chaveAutomatica: `avaliacao:${aluno.id}:${competencia}`,
        relacionadoId: ultima?.id,
      },
    ];
  });
}

function candidatosDeMensalidade(
  alunos: ReadonlyMap<string, Aluno>,
  pagamentos: readonly Pagamento[],
  hoje: string,
): CandidatoLembreteWhatsApp[] {
  return pagamentos.flatMap((pagamento) => {
    const aluno = alunos.get(pagamento.alunoId);
    const diasAteVencimento = diferencaEmDias(hoje, pagamento.vencimento);
    if (
      !aluno ||
      pagamento.status !== "pendente" ||
      diasAteVencimento === null ||
      diasAteVencimento > JANELA_COBRANCA_ANTECEDENCIA_DIAS
    ) {
      return [];
    }

    const valor = formatarMoeda(pagamento.valor);
    const vencimento = formatarData(pagamento.vencimento);
    let referencia: string;
    if (diasAteVencimento < 0) referencia = `está pendente desde ${vencimento}`;
    else if (diasAteVencimento === 0) referencia = "vence hoje";
    else if (diasAteVencimento === 1) referencia = `vence amanhã (${vencimento})`;
    else referencia = `vence em ${diasAteVencimento} dias (${vencimento})`;

    return [
      {
        alunoId: aluno.id,
        tipo: "mensalidade",
        titulo: diasAteVencimento < 0 ? "Mensalidade em atraso" : "Lembrete de mensalidade",
        mensagem: `${saudacao(aluno)} Sua mensalidade de ${valor} ${referencia}. Se o pagamento já foi realizado, por favor desconsidere esta mensagem.`,
        dataReferencia: pagamento.vencimento,
        origem: "automatica",
        chaveAutomatica: `mensalidade:${pagamento.id}`,
        relacionadoId: pagamento.id,
      },
    ];
  });
}

function candidatosDeCheckin(
  alunos: ReadonlyMap<string, Aluno>,
  checkins: readonly CheckinSemanal[],
  hoje: string,
): CandidatoLembreteWhatsApp[] {
  const semanaInicio = inicioDaSemana(hoje);
  const respondidos = new Set(
    checkins
      .filter((checkin) => checkin.semanaInicio === semanaInicio)
      .map((checkin) => checkin.alunoId),
  );
  return Array.from(alunos.values()).flatMap((aluno) =>
    respondidos.has(aluno.id)
      ? []
      : [
          {
            alunoId: aluno.id,
            tipo: "checkin",
            titulo: "Check-in semanal pendente",
            mensagem: `${saudacao(aluno)} Seu check-in semanal está disponível. Responda por aqui: {{portal}}`,
            dataReferencia: semanaInicio,
            origem: "automatica",
            chaveAutomatica: `checkin:${aluno.id}:${semanaInicio}`,
          },
        ],
  );
}

function candidatosDeRenovacao(
  alunos: ReadonlyMap<string, Aluno>,
  programas: readonly ProgramaTreino[],
  hoje: string,
): CandidatoLembreteWhatsApp[] {
  return programas.flatMap((programa) => {
    const aluno = alunos.get(programa.alunoId);
    const diasAteFim = diferencaEmDias(hoje, programa.dataFim);
    if (
      !aluno ||
      programa.status !== "ativo" ||
      diasAteFim === null ||
      diasAteFim > JANELA_RENOVACAO_ANTECEDENCIA_DIAS ||
      diasAteFim < -JANELA_RENOVACAO_ATRASO_DIAS
    ) {
      return [];
    }

    const dataFim = formatarData(programa.dataFim);
    let referencia: string;
    if (diasAteFim < 0) referencia = `venceu em ${dataFim}`;
    else if (diasAteFim === 0) referencia = "termina hoje";
    else if (diasAteFim === 1) referencia = `termina amanhã (${dataFim})`;
    else referencia = `termina em ${diasAteFim} dias (${dataFim})`;

    return [
      {
        alunoId: aluno.id,
        tipo: "renovacao",
        titulo: diasAteFim < 0 ? "Programa vencido" : "Renovação de programa",
        mensagem: `${saudacao(aluno)} Seu programa “${programa.nome}” ${referencia}. Vamos alinhar sua próxima fase?`,
        dataReferencia: programa.dataFim,
        origem: "automatica",
        chaveAutomatica: `renovacao:${programa.id}:${programa.dataFim}`,
        relacionadoId: programa.id,
      },
    ];
  });
}

/** Gera lembretes automáticos idempotentes; a chave é estável por evento/período. */
export function gerarCandidatosLembrete(
  dados: DadosGeracaoLembretes,
  hoje?: Date | string,
): CandidatoLembreteWhatsApp[] {
  const dataHoje = normalizarHoje(hoje);
  const alunosAtivos = new Map(
    dados.alunos.filter((aluno) => aluno.ativo).map((aluno) => [aluno.id, aluno] as const),
  );
  const candidatos = [
    ...candidatosDeTreino(alunosAtivos, dados.sessoes, dataHoje),
    ...candidatosDeAvaliacao(alunosAtivos, dados.avaliacoes, dataHoje),
    ...candidatosDeMensalidade(alunosAtivos, dados.pagamentos, dataHoje),
    ...candidatosDeCheckin(alunosAtivos, dados.checkinsSemanais, dataHoje),
    ...candidatosDeRenovacao(alunosAtivos, dados.programasTreino, dataHoje),
  ];

  const unicos = Array.from(
    new Map(candidatos.map((candidato) => [candidato.chaveAutomatica, candidato])).values(),
  );
  return unicos.sort((a, b) => {
    const porData = (a.dataReferencia ?? "9999-12-31").localeCompare(
      b.dataReferencia ?? "9999-12-31",
    );
    if (porData !== 0) return porData;
    const porTipo = ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo];
    return porTipo !== 0 ? porTipo : a.chaveAutomatica.localeCompare(b.chaveAutomatica);
  });
}
