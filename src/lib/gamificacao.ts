import type {
  HistoricoExercicio,
  MetaAluno,
  SerieExecutada,
  Sessao,
} from "./types";

/**
 * Semântica da gamificação leve:
 *
 * - sequência é uma sequência de presenças, não de dias do calendário. Cada
 *   sessão `realizada` soma uma unidade e uma `faltou` zera a sequência;
 * - sessões canceladas ou ainda agendadas não entram na linha do tempo. Assim,
 *   uma agenda futura (ou uma sessão passada ainda não resolvida) não pune o
 *   aluno sem uma falta explícita;
 * - cada exercício possui no máximo um recorde atual. Históricos são unidos
 *   quando compartilham o `bibliotecaId` ou o nome normalizado, evitando
 *   duplicidade durante migrações/renomeações;
 * - um recorde usa somente séries de trabalho, carga externa e repetições. A
 *   estimativa de 1RM segue Epley: carga * (1 + repetições / 30);
 * - medalhas são derivadas dos dados existentes. Não há pontos, ranking nem
 *   estado adicional para persistir.
 */

export interface EntradaGamificacaoAluno {
  alunoId: string;
  sessoes: readonly Sessao[];
  historicoExercicios: readonly HistoricoExercicio[];
  metas: readonly MetaAluno[];
}

export interface SequenciaTreinos {
  atual: number;
  melhor: number;
  totalRealizados: number;
  /** Data civil da sessão resolvida mais recente (`realizada` ou `faltou`). */
  ultimaSessaoConsideradaEm?: string;
}

export interface RecordePessoalExercicio {
  /** Identidade canônica (`biblioteca:<id>` ou `nome:<nome normalizado>`). */
  chave: string;
  nome: string;
  bibliotecaId?: string;
  e1rmKg: number;
  cargaKg: number;
  repeticoes: number;
  data: string;
  /** Instante da série, quando registrado; caso contrário, a data civil. */
  atingidoEm: string;
  historicoId: string;
  serieId: string;
}

export type NivelMedalha = "bronze" | "prata" | "ouro";
export type CategoriaMedalha = "treinos" | "sequencia" | "recordes" | "metas";

export type MedalhaGamificacaoId =
  | "treino-primeiro"
  | "treinos-5"
  | "treinos-10"
  | "treinos-25"
  | "treinos-50"
  | "sequencia-3"
  | "sequencia-5"
  | "sequencia-10"
  | "recorde-primeiro"
  | "recordes-5"
  | "meta-primeira"
  | "metas-3";

export interface MedalhaGamificacao {
  id: MedalhaGamificacaoId;
  categoria: CategoriaMedalha;
  titulo: string;
  descricao: string;
  nivel: NivelMedalha;
  desbloqueada: boolean;
  /** Valor real da métrica, sem limitar ao alvo da medalha. */
  progressoAtual: number;
  alvo: number;
  /** Omitido quando o marco existe, mas a data exata não pode ser derivada. */
  desbloqueadaEm?: string;
}

export interface GamificacaoAluno {
  alunoId: string;
  sequenciaTreinos: SequenciaTreinos;
  recordesPessoais: RecordePessoalExercicio[];
  metasConcluidas: number;
  medalhas: MedalhaGamificacao[];
}

interface ResultadoSequencias {
  sequencia: SequenciaTreinos;
  datasMarcosTreinos: ReadonlyMap<number, string>;
  datasMarcosSequencia: ReadonlyMap<number, string>;
}

interface CandidatoRecorde {
  tokensIdentidade: string[];
  nome: string;
  bibliotecaId?: string;
  e1rmKg: number;
  cargaKg: number;
  repeticoes: number;
  data: string;
  atingidoEm: string;
  historicoCriadoEm: string;
  historicoId: string;
  serieId: string;
  serieOrdem: number;
}

interface ResultadoRecordes {
  recordes: RecordePessoalExercicio[];
  datasMarcos: ReadonlyMap<number, string>;
}

interface DefinicaoMedalha {
  id: MedalhaGamificacaoId;
  categoria: CategoriaMedalha;
  titulo: string;
  descricao: string;
  nivel: NivelMedalha;
  alvo: number;
}

const MARCOS_TREINOS = [1, 5, 10, 25, 50] as const;
const MARCOS_SEQUENCIA = [3, 5, 10] as const;
const MARCOS_RECORDES = [1, 5] as const;
const MARCOS_METAS = [1, 3] as const;

const DEFINICOES_MEDALHAS: readonly DefinicaoMedalha[] = [
  {
    id: "treino-primeiro",
    categoria: "treinos",
    titulo: "Primeiro passo",
    descricao: "Concluiu o primeiro treino.",
    nivel: "bronze",
    alvo: 1,
  },
  {
    id: "treinos-5",
    categoria: "treinos",
    titulo: "Ritmo criado",
    descricao: "Concluiu 5 treinos.",
    nivel: "bronze",
    alvo: 5,
  },
  {
    id: "treinos-10",
    categoria: "treinos",
    titulo: "Consistência",
    descricao: "Concluiu 10 treinos.",
    nivel: "prata",
    alvo: 10,
  },
  {
    id: "treinos-25",
    categoria: "treinos",
    titulo: "Rotina sólida",
    descricao: "Concluiu 25 treinos.",
    nivel: "prata",
    alvo: 25,
  },
  {
    id: "treinos-50",
    categoria: "treinos",
    titulo: "Constância de longo prazo",
    descricao: "Concluiu 50 treinos.",
    nivel: "ouro",
    alvo: 50,
  },
  {
    id: "sequencia-3",
    categoria: "sequencia",
    titulo: "Em sequência",
    descricao: "Realizou 3 sessões seguidas sem falta.",
    nivel: "bronze",
    alvo: 3,
  },
  {
    id: "sequencia-5",
    categoria: "sequencia",
    titulo: "Compromisso",
    descricao: "Realizou 5 sessões seguidas sem falta.",
    nivel: "prata",
    alvo: 5,
  },
  {
    id: "sequencia-10",
    categoria: "sequencia",
    titulo: "Presença constante",
    descricao: "Realizou 10 sessões seguidas sem falta.",
    nivel: "ouro",
    alvo: 10,
  },
  {
    id: "recorde-primeiro",
    categoria: "recordes",
    titulo: "Primeira marca",
    descricao: "Registrou o primeiro recorde pessoal calculável.",
    nivel: "bronze",
    alvo: 1,
  },
  {
    id: "recordes-5",
    categoria: "recordes",
    titulo: "Evolução mensurável",
    descricao: "Construiu recordes em 5 exercícios diferentes.",
    nivel: "ouro",
    alvo: 5,
  },
  {
    id: "meta-primeira",
    categoria: "metas",
    titulo: "Meta alcançada",
    descricao: "Concluiu a primeira meta.",
    nivel: "bronze",
    alvo: 1,
  },
  {
    id: "metas-3",
    categoria: "metas",
    titulo: "Objetivos em movimento",
    descricao: "Concluiu 3 metas.",
    nivel: "ouro",
    alvo: 3,
  },
];

function compararTexto(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compararSessoes(a: Sessao, b: Sessao): number {
  return (
    compararTexto(a.data, b.data) ||
    compararTexto(a.hora, b.hora) ||
    compararTexto(a.criadoEm, b.criadoEm) ||
    compararTexto(a.id, b.id)
  );
}

function calcularSequencias(
  sessoes: readonly Sessao[],
  alunoId: string,
): ResultadoSequencias {
  const resolvidas = sessoes
    .filter(
      (sessao) =>
        sessao.alunoId === alunoId &&
        (sessao.status === "realizada" || sessao.status === "faltou"),
    )
    .sort(compararSessoes);

  const datasMarcosTreinos = new Map<number, string>();
  const datasMarcosSequencia = new Map<number, string>();
  let atual = 0;
  let melhor = 0;
  let totalRealizados = 0;

  for (const sessao of resolvidas) {
    if (sessao.status === "faltou") {
      atual = 0;
      continue;
    }

    totalRealizados += 1;
    atual += 1;
    melhor = Math.max(melhor, atual);

    if (MARCOS_TREINOS.includes(totalRealizados as (typeof MARCOS_TREINOS)[number])) {
      datasMarcosTreinos.set(totalRealizados, sessao.data);
    }
    if (MARCOS_SEQUENCIA.includes(atual as (typeof MARCOS_SEQUENCIA)[number])) {
      datasMarcosSequencia.set(atual, sessao.data);
    }
  }

  const ultimaSessao = resolvidas.at(-1);
  const sequencia: SequenciaTreinos = {
    atual,
    melhor,
    totalRealizados,
    ...(ultimaSessao ? { ultimaSessaoConsideradaEm: ultimaSessao.data } : {}),
  };

  return { sequencia, datasMarcosTreinos, datasMarcosSequencia };
}

function normalizarNomeExercicio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function valorPositivoFinito(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0;
}

function serieElegivelParaRecorde(
  serie: SerieExecutada,
): serie is SerieExecutada & {
  resultado: { metrica: "repeticoes"; repeticoes: number };
  carga: { modo: "externa"; valorKg: number };
} {
  return (
    serie.tipo === "trabalho" &&
    serie.resultado.metrica === "repeticoes" &&
    serie.carga.modo === "externa" &&
    valorPositivoFinito(serie.resultado.repeticoes) &&
    valorPositivoFinito(serie.carga.valorKg)
  );
}

function candidatosDeRecorde(
  historicos: readonly HistoricoExercicio[],
  alunoId: string,
): CandidatoRecorde[] {
  const candidatos: CandidatoRecorde[] = [];

  for (const historico of historicos) {
    if (historico.alunoId !== alunoId || historico.formato !== "por-serie") continue;

    const nome = historico.nome.trim() || "Exercício";
    const nomeNormalizado = normalizarNomeExercicio(historico.nome);
    const bibliotecaId = historico.bibliotecaId?.trim() || undefined;
    const tokensIdentidade = [
      ...(bibliotecaId ? [`biblioteca:${bibliotecaId}`] : []),
      ...(nomeNormalizado ? [`nome:${nomeNormalizado}`] : []),
    ];
    if (tokensIdentidade.length === 0) continue;

    for (const serie of historico.seriesExecutadas) {
      if (!serieElegivelParaRecorde(serie)) continue;
      const e1rmKg = serie.carga.valorKg * (1 + serie.resultado.repeticoes / 30);
      if (!valorPositivoFinito(e1rmKg)) continue;

      candidatos.push({
        tokensIdentidade,
        nome,
        ...(bibliotecaId ? { bibliotecaId } : {}),
        e1rmKg,
        cargaKg: serie.carga.valorKg,
        repeticoes: serie.resultado.repeticoes,
        data: historico.data,
        atingidoEm: serie.concluidaEm?.trim() || historico.data,
        historicoCriadoEm: historico.criadoEm,
        historicoId: historico.id,
        serieId: serie.id,
        serieOrdem: serie.ordem,
      });
    }
  }

  return candidatos;
}

function componentesDeIdentidade(candidatos: readonly CandidatoRecorde[]): Map<string, string> {
  const pais = new Map<string, string>();

  const encontrar = (token: string): string => {
    const pai = pais.get(token);
    if (pai === undefined) {
      pais.set(token, token);
      return token;
    }
    if (pai === token) return token;
    const raiz = encontrar(pai);
    pais.set(token, raiz);
    return raiz;
  };

  const unir = (a: string, b: string): void => {
    const raizA = encontrar(a);
    const raizB = encontrar(b);
    if (raizA === raizB) return;
    // A raiz lexical torna o componente independente da ordem de entrada.
    if (compararTexto(raizA, raizB) <= 0) pais.set(raizB, raizA);
    else pais.set(raizA, raizB);
  };

  for (const candidato of candidatos) {
    const [primeiro, ...demais] = candidato.tokensIdentidade;
    if (!primeiro) continue;
    encontrar(primeiro);
    for (const token of demais) unir(primeiro, token);
  }

  for (const token of pais.keys()) encontrar(token);
  return pais;
}

function compararCandidatosCronologicamente(
  a: CandidatoRecorde,
  b: CandidatoRecorde,
): number {
  return (
    compararTexto(a.data, b.data) ||
    compararTexto(a.atingidoEm, b.atingidoEm) ||
    compararTexto(a.historicoCriadoEm, b.historicoCriadoEm) ||
    compararTexto(a.historicoId, b.historicoId) ||
    a.serieOrdem - b.serieOrdem ||
    compararTexto(a.serieId, b.serieId)
  );
}

function compararCandidatosPorRecorde(a: CandidatoRecorde, b: CandidatoRecorde): number {
  return (
    b.e1rmKg - a.e1rmKg ||
    b.cargaKg - a.cargaKg ||
    b.repeticoes - a.repeticoes ||
    compararCandidatosCronologicamente(a, b)
  );
}

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

function calcularRecordes(
  historicos: readonly HistoricoExercicio[],
  alunoId: string,
): ResultadoRecordes {
  const candidatos = candidatosDeRecorde(historicos, alunoId);
  const componentes = componentesDeIdentidade(candidatos);
  const grupos = new Map<string, CandidatoRecorde[]>();

  for (const candidato of candidatos) {
    const primeiroToken = candidato.tokensIdentidade[0];
    if (!primeiroToken) continue;
    const raiz = componentes.get(primeiroToken) ?? primeiroToken;
    const grupo = grupos.get(raiz) ?? [];
    grupo.push(candidato);
    grupos.set(raiz, grupo);
  }

  const primeirasMarcas: CandidatoRecorde[] = [];
  const recordes = [...grupos.values()].map((grupo): RecordePessoalExercicio => {
    const ordenadosPorRecorde = [...grupo].sort(compararCandidatosPorRecorde);
    const melhor = ordenadosPorRecorde[0];
    if (!melhor) throw new Error("Grupo de recordes vazio.");

    const primeiraMarca = [...grupo].sort(compararCandidatosCronologicamente)[0];
    if (primeiraMarca) primeirasMarcas.push(primeiraMarca);

    const bibliotecaIds = [...new Set(grupo.flatMap((item) => item.bibliotecaId ?? []))].sort(
      compararTexto,
    );
    const nomesNormalizados = [
      ...new Set(grupo.map((item) => normalizarNomeExercicio(item.nome)).filter(Boolean)),
    ].sort(compararTexto);
    const bibliotecaId = bibliotecaIds[0];
    const chave = bibliotecaId
      ? `biblioteca:${bibliotecaId}`
      : `nome:${nomesNormalizados[0] ?? normalizarNomeExercicio(melhor.nome)}`;

    return {
      chave,
      nome: melhor.nome,
      ...(bibliotecaId ? { bibliotecaId } : {}),
      e1rmKg: arredondar(melhor.e1rmKg),
      cargaKg: arredondar(melhor.cargaKg),
      repeticoes: melhor.repeticoes,
      data: melhor.data,
      atingidoEm: melhor.atingidoEm,
      historicoId: melhor.historicoId,
      serieId: melhor.serieId,
    };
  });

  recordes.sort(
    (a, b) => a.nome.localeCompare(b.nome, "pt-BR") || compararTexto(a.chave, b.chave),
  );
  primeirasMarcas.sort(compararCandidatosCronologicamente);

  const datasMarcos = new Map<number, string>();
  for (const marco of MARCOS_RECORDES) {
    const marca = primeirasMarcas[marco - 1];
    if (marca) datasMarcos.set(marco, marca.atingidoEm);
  }

  return { recordes, datasMarcos };
}

function metasConcluidasDoAluno(metas: readonly MetaAluno[], alunoId: string): MetaAluno[] {
  return metas.filter(
    (meta) =>
      meta.alunoId === alunoId &&
      (meta.status === "concluida" || Boolean(meta.concluidaEm?.trim())),
  );
}

function datasMarcosMetas(metasConcluidas: readonly MetaAluno[]): ReadonlyMap<number, string> {
  const resultado = new Map<number, string>();
  const todasPossuemData = metasConcluidas.every((meta) => Boolean(meta.concluidaEm?.trim()));
  if (!todasPossuemData) return resultado;

  const datas = metasConcluidas
    .map((meta) => meta.concluidaEm)
    .filter((data): data is string => Boolean(data))
    .sort(compararTexto);
  for (const marco of MARCOS_METAS) {
    const data = datas[marco - 1];
    if (data) resultado.set(marco, data);
  }
  return resultado;
}

function valorDaCategoria(
  categoria: CategoriaMedalha,
  sequencia: SequenciaTreinos,
  totalRecordes: number,
  totalMetas: number,
): number {
  switch (categoria) {
    case "treinos":
      return sequencia.totalRealizados;
    case "sequencia":
      // Uma medalha já conquistada não volta a bloquear depois de uma falta.
      return sequencia.melhor;
    case "recordes":
      return totalRecordes;
    case "metas":
      return totalMetas;
  }
}

function dataDaMedalha(
  definicao: DefinicaoMedalha,
  datasTreinos: ReadonlyMap<number, string>,
  datasSequencia: ReadonlyMap<number, string>,
  datasRecordes: ReadonlyMap<number, string>,
  datasMetas: ReadonlyMap<number, string>,
): string | undefined {
  switch (definicao.categoria) {
    case "treinos":
      return datasTreinos.get(definicao.alvo);
    case "sequencia":
      return datasSequencia.get(definicao.alvo);
    case "recordes":
      return datasRecordes.get(definicao.alvo);
    case "metas":
      return datasMetas.get(definicao.alvo);
  }
}

/**
 * Gera todo o estado de gamificação de um aluno sem mutar as coleções recebidas.
 * A ordem das entradas não influencia os resultados nem os desempates.
 */
export function gerarGamificacaoAluno(input: EntradaGamificacaoAluno): GamificacaoAluno {
  const resultadoSequencias = calcularSequencias(input.sessoes, input.alunoId);
  const resultadoRecordes = calcularRecordes(input.historicoExercicios, input.alunoId);
  const metasConcluidas = metasConcluidasDoAluno(input.metas, input.alunoId);
  const datasMetas = datasMarcosMetas(metasConcluidas);

  const medalhas = DEFINICOES_MEDALHAS.map((definicao): MedalhaGamificacao => {
    const progressoAtual = valorDaCategoria(
      definicao.categoria,
      resultadoSequencias.sequencia,
      resultadoRecordes.recordes.length,
      metasConcluidas.length,
    );
    const desbloqueada = progressoAtual >= definicao.alvo;
    const desbloqueadaEm = desbloqueada
      ? dataDaMedalha(
          definicao,
          resultadoSequencias.datasMarcosTreinos,
          resultadoSequencias.datasMarcosSequencia,
          resultadoRecordes.datasMarcos,
          datasMetas,
        )
      : undefined;

    return {
      ...definicao,
      desbloqueada,
      progressoAtual,
      ...(desbloqueadaEm ? { desbloqueadaEm } : {}),
    };
  });

  return {
    alunoId: input.alunoId,
    sequenciaTreinos: resultadoSequencias.sequencia,
    recordesPessoais: resultadoRecordes.recordes,
    metasConcluidas: metasConcluidas.length,
    medalhas,
  };
}
