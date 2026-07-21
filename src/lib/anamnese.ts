import type {
  AnamneseDigital,
  ConsentimentosAnamnese,
  ContatoEmergenciaAnamnese,
  PerguntaParQId,
  RespostaParQ,
} from "./types";

export interface PerguntaParQ {
  id: PerguntaParQId;
  texto: string;
}

/**
 * Perguntas próprias e objetivas para triagem inicial. Elas cobrem os temas
 * usuais do PAR-Q sem reproduzir o texto de nenhum formulário de terceiros.
 */
export const PERGUNTAS_PARQ = [
  {
    id: "condicao-cardiovascular",
    texto:
      "Você tem alguma condição cardiovascular conhecida ou recebeu orientação para só se exercitar com acompanhamento de saúde?",
  },
  {
    id: "desconforto-peito-atividade",
    texto: "Já sentiu desconforto ou pressão no peito enquanto fazia esforço físico?",
  },
  {
    id: "desconforto-peito-repouso",
    texto:
      "No último mês, sentiu desconforto ou pressão no peito mesmo sem fazer esforço?",
  },
  {
    id: "tontura-desmaio",
    texto: "Teve tontura intensa, perda de equilíbrio ou desmaio recentemente?",
  },
  {
    id: "problema-osseo-articular",
    texto:
      "Há alguma condição em ossos, articulações ou músculos que possa piorar com exercício?",
  },
  {
    id: "medicacao-cardiovascular",
    texto: "Usa medicamento prescrito relacionado ao coração ou à pressão arterial?",
  },
  {
    id: "outro-impedimento",
    texto:
      "Existe outro motivo de saúde para evitar ou adaptar exercícios antes de uma avaliação profissional?",
  },
] as const satisfies readonly PerguntaParQ[];

export const PERGUNTA_PARQ_IDS: readonly PerguntaParQId[] = PERGUNTAS_PARQ.map(
  (pergunta) => pergunta.id,
);

export type SalvarRascunhoAnamneseInput = Pick<
  AnamneseDigital,
  | "contatoEmergencia"
  | "historicoCondicoes"
  | "lesoes"
  | "medicamentos"
  | "restricoes"
  | "respostasParq"
  | "consentimentos"
  | "assinaturaNome"
>;

export interface PontoAtencaoAnamnese {
  id: string;
  origem:
    | "parq"
    | "historico-condicoes"
    | "lesoes"
    | "medicamentos"
    | "restricoes";
  titulo: string;
  detalhe?: string;
  perguntaId?: PerguntaParQId;
}

function textoObrigatorioComoTipo(valor: unknown, campo: string): string {
  if (typeof valor !== "string") throw new Error(`${campo} precisa ser um texto.`);
  return valor.trim();
}

function textoOpcional(valor: unknown, campo: string): string | undefined {
  if (valor === undefined) return undefined;
  const texto = textoObrigatorioComoTipo(valor, campo);
  return texto || undefined;
}

export function ehPerguntaParQId(valor: unknown): valor is PerguntaParQId {
  return (
    typeof valor === "string" &&
    PERGUNTA_PARQ_IDS.some((perguntaId) => perguntaId === valor)
  );
}

function normalizarContato(
  contato: ContatoEmergenciaAnamnese,
): ContatoEmergenciaAnamnese {
  if (typeof contato !== "object" || contato === null) {
    throw new Error("O contato de emergência é inválido.");
  }
  return {
    nome: textoObrigatorioComoTipo(contato.nome, "O nome do contato de emergência"),
    telefone: textoObrigatorioComoTipo(
      contato.telefone,
      "O telefone do contato de emergência",
    ),
    parentesco: textoOpcional(contato.parentesco, "O parentesco do contato de emergência"),
  };
}

function normalizarConsentimentos(
  consentimentos: ConsentimentosAnamnese,
): ConsentimentosAnamnese {
  if (typeof consentimentos !== "object" || consentimentos === null) {
    throw new Error("Os consentimentos da anamnese são inválidos.");
  }
  const valores = [
    consentimentos.veracidadeInformacoes,
    consentimentos.cienciaTriagemNaoEDiagnosticoNemLiberacao,
    consentimentos.tratamentoLocalDados,
  ];
  if (valores.some((valor) => typeof valor !== "boolean")) {
    throw new Error("Cada consentimento precisa ser marcado como aceito ou não aceito.");
  }
  return { ...consentimentos };
}

function normalizarRespostas(respostas: readonly RespostaParQ[]): RespostaParQ[] {
  if (!Array.isArray(respostas)) throw new Error("As respostas da triagem são inválidas.");

  const porPergunta = new Map<PerguntaParQId, RespostaParQ>();
  for (const item of respostas) {
    if (typeof item !== "object" || item === null || !ehPerguntaParQId(item.perguntaId)) {
      throw new Error("A triagem contém uma pergunta desconhecida.");
    }
    if (porPergunta.has(item.perguntaId)) {
      throw new Error("Cada pergunta da triagem pode ter somente uma resposta.");
    }
    if (typeof item.resposta !== "boolean") {
      throw new Error("Cada pergunta da triagem precisa de uma resposta de sim ou não.");
    }
    porPergunta.set(item.perguntaId, {
      perguntaId: item.perguntaId,
      resposta: item.resposta,
      detalhe: textoOpcional(item.detalhe, "O detalhe da resposta"),
    });
  }

  return PERGUNTA_PARQ_IDS.flatMap((perguntaId) => {
    const resposta = porPergunta.get(perguntaId);
    return resposta ? [resposta] : [];
  });
}

/** Normaliza um rascunho sem exigir que ele já esteja completo. */
export function normalizarRascunhoAnamnese(
  input: SalvarRascunhoAnamneseInput,
): SalvarRascunhoAnamneseInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Os dados da anamnese são inválidos.");
  }
  return {
    contatoEmergencia: normalizarContato(input.contatoEmergencia),
    historicoCondicoes: textoObrigatorioComoTipo(
      input.historicoCondicoes,
      "O histórico e as condições de saúde",
    ),
    lesoes: textoObrigatorioComoTipo(input.lesoes, "As lesões"),
    medicamentos: textoObrigatorioComoTipo(input.medicamentos, "Os medicamentos"),
    restricoes: textoObrigatorioComoTipo(input.restricoes, "As restrições"),
    respostasParq: normalizarRespostas(input.respostasParq),
    consentimentos: normalizarConsentimentos(input.consentimentos),
    assinaturaNome: textoObrigatorioComoTipo(input.assinaturaNome, "A assinatura"),
  };
}

/** Valida todos os requisitos antes de mudar o status para `enviada`. */
export function validarAnamneseParaEnvio(
  anamnese: Pick<
    AnamneseDigital,
    | "contatoEmergencia"
    | "historicoCondicoes"
    | "lesoes"
    | "medicamentos"
    | "restricoes"
    | "respostasParq"
    | "consentimentos"
    | "assinaturaNome"
  >,
): void {
  const normalizada = normalizarRascunhoAnamnese(anamnese);
  if (!normalizada.contatoEmergencia.nome || !normalizada.contatoEmergencia.telefone) {
    throw new Error("Informe nome e telefone do contato de emergência.");
  }
  const camposTextuais = [
    normalizada.historicoCondicoes,
    normalizada.lesoes,
    normalizada.medicamentos,
    normalizada.restricoes,
  ];
  if (camposTextuais.some((campo) => !campo)) {
    throw new Error(
      'Preencha histórico, lesões, medicamentos e restrições; use "nenhum" quando não houver.',
    );
  }
  if (normalizada.respostasParq.length !== PERGUNTAS_PARQ.length) {
    throw new Error("Responda às sete perguntas da triagem antes de enviar.");
  }
  if (
    !normalizada.consentimentos.veracidadeInformacoes ||
    !normalizada.consentimentos.cienciaTriagemNaoEDiagnosticoNemLiberacao ||
    !normalizada.consentimentos.tratamentoLocalDados
  ) {
    throw new Error("Os três consentimentos precisam ser aceitos antes do envio.");
  }
  if (!normalizada.assinaturaNome) {
    throw new Error("Digite o nome do aluno como assinatura antes de enviar.");
  }
}

export function respostasPositivasParQ(
  respostas: readonly RespostaParQ[],
): RespostaParQ[] {
  return respostas.filter((item) => item.resposta);
}

function textoDeclaraAusencia(texto: string): boolean {
  const normalizado = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/g, "")
    .replace(/\s+/g, " ");
  return (
    /^(nenhum|nenhuma|nenhuns|nenhumas)( atualmente| no momento)?$/.test(normalizado) ||
    /^(nao|n\/a|nao se aplica)$/.test(normalizado) ||
    /^sem (historico|condicoes|lesoes|medicamentos|restricoes)( conhecid[oa]s?| atuais)?$/.test(
      normalizado,
    )
  );
}

/**
 * Consolida respostas positivas e campos de saúde preenchidos. É uma fila de
 * leitura para o personal, não um diagnóstico nem uma liberação para exercício.
 */
export function pontosAtencaoAnamnese(
  anamnese: Pick<
    AnamneseDigital,
    "historicoCondicoes" | "lesoes" | "medicamentos" | "restricoes" | "respostasParq"
  >,
): PontoAtencaoAnamnese[] {
  const perguntas = new Map(PERGUNTAS_PARQ.map((pergunta) => [pergunta.id, pergunta]));
  const pontos: PontoAtencaoAnamnese[] = anamnese.respostasParq.flatMap((resposta) => {
    if (!resposta.resposta) return [];
    const pergunta = perguntas.get(resposta.perguntaId);
    if (!pergunta) return [];
    return [
      {
        id: `parq:${resposta.perguntaId}`,
        origem: "parq" as const,
        titulo: pergunta.texto,
        detalhe: resposta.detalhe?.trim() || undefined,
        perguntaId: resposta.perguntaId,
      },
    ];
  });

  const campos = [
    {
      origem: "historico-condicoes" as const,
      titulo: "Histórico ou condição de saúde informado",
      detalhe: anamnese.historicoCondicoes,
    },
    { origem: "lesoes" as const, titulo: "Lesão informada", detalhe: anamnese.lesoes },
    {
      origem: "medicamentos" as const,
      titulo: "Uso de medicamento informado",
      detalhe: anamnese.medicamentos,
    },
    {
      origem: "restricoes" as const,
      titulo: "Restrição informada",
      detalhe: anamnese.restricoes,
    },
  ];

  for (const campo of campos) {
    const detalhe = campo.detalhe.trim();
    if (!detalhe || textoDeclaraAusencia(detalhe)) continue;
    pontos.push({
      id: campo.origem,
      origem: campo.origem,
      titulo: campo.titulo,
      detalhe,
    });
  }

  return pontos;
}
