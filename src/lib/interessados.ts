import type {
  Aluno,
  AulaExperimentalInteressado,
  CanalContatoInteressado,
  Interessado,
  Objetivo,
  OrigemInteressado,
  RegistroContatoInteressado,
  StatusAulaExperimental,
  StatusInteressado,
} from "./types";
import { paraIso } from "@/lib/data";

export const ORIGENS_INTERESSADO = [
  "instagram",
  "indicacao",
  "google",
  "whatsapp",
  "site",
  "evento",
  "catalogo",
  "outro",
] as const satisfies readonly OrigemInteressado[];

export const STATUS_INTERESSADO = [
  "novo",
  "em-contato",
  "experimental-agendada",
  "experimental-realizada",
  "proposta",
  "convertido",
  "perdido",
] as const satisfies readonly StatusInteressado[];

export const CANAIS_CONTATO_INTERESSADO = [
  "whatsapp",
  "ligacao",
  "email",
  "presencial",
  "outro",
] as const satisfies readonly CanalContatoInteressado[];

export const STATUS_AULA_EXPERIMENTAL = [
  "agendada",
  "realizada",
  "faltou",
  "cancelada",
] as const satisfies readonly StatusAulaExperimental[];

const OBJETIVOS: readonly Objetivo[] = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Força",
  "Reabilitação",
  "Saúde geral",
];

export const ORIGEM_INTERESSADO_LABEL: Record<OrigemInteressado, string> = {
  instagram: "Instagram",
  indicacao: "Indicação",
  google: "Google",
  whatsapp: "WhatsApp",
  site: "Site",
  evento: "Evento",
  catalogo: "Catálogo do app",
  outro: "Outro",
};

export const STATUS_INTERESSADO_LABEL: Record<StatusInteressado, string> = {
  novo: "Novo",
  "em-contato": "Em contato",
  "experimental-agendada": "Experimental agendada",
  "experimental-realizada": "Experimental realizada",
  proposta: "Proposta",
  convertido: "Convertido",
  perdido: "Perdido",
};

export const CANAL_CONTATO_INTERESSADO_LABEL: Record<
  CanalContatoInteressado,
  string
> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  email: "E-mail",
  presencial: "Presencial",
  outro: "Outro",
};

export const STATUS_AULA_EXPERIMENTAL_LABEL: Record<
  StatusAulaExperimental,
  string
> = {
  agendada: "Agendada",
  realizada: "Realizada",
  faltou: "Faltou",
  cancelada: "Cancelada",
};

export type CriarInteressadoInput = Pick<
  Interessado,
  | "nome"
  | "telefone"
  | "email"
  | "objetivo"
  | "origem"
  | "origemDetalhe"
  | "personalPublicoId"
  | "contaAppAlunoId"
  | "proximoFollowUp"
  | "observacoes"
>;

export type AtualizarInteressadoInput = Partial<CriarInteressadoInput>;

export interface RegistrarContatoInteressadoInput {
  canal: CanalContatoInteressado;
  observacao: string;
  realizadoEm?: string;
  /** Omitir ou enviar vazio encerra o follow-up atual sem criar outro. */
  proximoFollowUp?: string;
}

export type AgendarAulaExperimentalInput = Pick<
  AulaExperimentalInteressado,
  "data" | "hora" | "observacoes"
>;

export type AtualizarAulaExperimentalInput = Partial<AulaExperimentalInteressado>;

export type CriarAlunoConversaoInput = Omit<
  Aluno,
  "id" | "criadoEm" | "ativo"
> & {
  ativo?: boolean;
};

export type ConverterInteressadoDominioInput = Partial<CriarAlunoConversaoInput>;

export interface ResultadoConversaoInteressado {
  aluno: Aluno;
  interessado: Interessado;
  /** true quando o cadastro veio do app e foi assumido (não é um aluno novo). */
  adotado: boolean;
}

export type SituacaoFollowUp =
  | "atrasado"
  | "hoje"
  | "futuro"
  | "sem-follow-up"
  | "encerrado";

export interface MetricasPipelineInteressados {
  total: number;
  ativos: number;
  convertidos: number;
  perdidos: number;
  followUpsAtrasados: number;
  followUpsHoje: number;
  taxaConversaoPercentual: number;
  porStatus: Record<StatusInteressado, number>;
}

type UnknownRecord = Record<string, unknown>;

const STATUS_ENCERRADOS: readonly StatusInteressado[] = ["convertido", "perdido"];

const ORDEM_PIPELINE: Record<StatusInteressado, number> = {
  novo: 0,
  "em-contato": 1,
  "experimental-agendada": 2,
  "experimental-realizada": 3,
  proposta: 4,
  convertido: 5,
  perdido: 6,
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textoObrigatorio(
  value: string,
  campo: string,
  maximo: number,
): string {
  const normalizado = value.trim().replace(/\s+/g, " ");
  if (!normalizado) throw new Error(`Informe ${campo}.`);
  if (normalizado.length > maximo) {
    throw new Error(`${campo} deve ter no máximo ${maximo} caracteres.`);
  }
  return normalizado;
}

function textoOpcional(
  value: string | undefined,
  campo: string,
  maximo: number,
): string | undefined {
  if (value === undefined) return undefined;
  const normalizado = value.trim().replace(/\s+/g, " ");
  if (!normalizado) return undefined;
  if (normalizado.length > maximo) {
    throw new Error(`${campo} deve ter no máximo ${maximo} caracteres.`);
  }
  return normalizado;
}

export function ehOrigemInteressado(value: unknown): value is OrigemInteressado {
  return ORIGENS_INTERESSADO.some((origem) => origem === value);
}

export function ehStatusInteressado(value: unknown): value is StatusInteressado {
  return STATUS_INTERESSADO.some((status) => status === value);
}

export function ehCanalContatoInteressado(
  value: unknown,
): value is CanalContatoInteressado {
  return CANAIS_CONTATO_INTERESSADO.some((canal) => canal === value);
}

export function ehStatusAulaExperimental(
  value: unknown,
): value is StatusAulaExperimental {
  return STATUS_AULA_EXPERIMENTAL.some((status) => status === value);
}

function ehObjetivo(value: unknown): value is Objetivo {
  return OBJETIVOS.some((objetivo) => objetivo === value);
}

export function validarDataInteressado(value: string, campo = "a data"): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!partes) throw new Error(`Informe ${campo} no formato AAAA-MM-DD.`);
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new Error(`Informe ${campo} válida.`);
  }
  return value;
}

export function validarHoraInteressado(value: string): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("Informe um horário válido.");
  }
  return value;
}

export function validarDataHoraInteressado(value: string, campo: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${campo} precisa ser uma data e hora válidas.`);
  }
  return value;
}

export function normalizarTelefoneInteressado(
  value: string | undefined,
): string | undefined {
  const telefone = textoOpcional(value, "o telefone", 30);
  if (telefone === undefined) return undefined;
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 8 || digitos.length > 15) {
    throw new Error("Informe um telefone com 8 a 15 dígitos.");
  }
  return telefone;
}

export function chaveTelefoneInteressado(value: string | undefined): string | undefined {
  const digitos = value?.replace(/\D/g, "");
  return digitos ? digitos : undefined;
}

export function normalizarEmailInteressado(
  value: string | undefined,
): string | undefined {
  const email = textoOpcional(value, "o e-mail", 254)?.toLowerCase();
  if (email === undefined) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }
  return email;
}

export function chaveEmailInteressado(value: string | undefined): string | undefined {
  const email = value?.trim().toLowerCase();
  return email || undefined;
}

function validarOrigemDetalhe(
  origem: OrigemInteressado,
  origemDetalhe: string | undefined,
): void {
  if (origem === "outro" && origemDetalhe === undefined) {
    throw new Error("Detalhe a origem do interessado.");
  }
}

export function normalizarCriarInteressadoInput(
  input: CriarInteressadoInput,
): CriarInteressadoInput {
  if (!ehOrigemInteressado(input.origem)) throw new Error("A origem informada é inválida.");
  if (input.objetivo !== undefined && !ehObjetivo(input.objetivo)) {
    throw new Error("O objetivo informado é inválido.");
  }

  const nome = textoObrigatorio(input.nome, "o nome do interessado", 120);
  const telefone = normalizarTelefoneInteressado(input.telefone);
  const email = normalizarEmailInteressado(input.email);
  const origemDetalhe = textoOpcional(input.origemDetalhe, "o detalhe da origem", 160);
  const proximoFollowUp = input.proximoFollowUp?.trim()
    ? validarDataInteressado(input.proximoFollowUp.trim(), "a data do follow-up")
    : undefined;
  const observacoes = textoOpcional(input.observacoes, "as observações", 2_000);
  const personalPublicoId = textoOpcional(input.personalPublicoId, "o perfil do catálogo", 160);
  const contaAppAlunoId = textoOpcional(input.contaAppAlunoId, "a conta do app", 160);
  validarOrigemDetalhe(input.origem, origemDetalhe);

  return {
    nome,
    ...(telefone ? { telefone } : {}),
    ...(email ? { email } : {}),
    ...(input.objetivo ? { objetivo: input.objetivo } : {}),
    origem: input.origem,
    ...(origemDetalhe ? { origemDetalhe } : {}),
    ...(personalPublicoId ? { personalPublicoId } : {}),
    ...(contaAppAlunoId ? { contaAppAlunoId } : {}),
    ...(proximoFollowUp ? { proximoFollowUp } : {}),
    ...(observacoes ? { observacoes } : {}),
  };
}

function lerPropriedade<T extends object, K extends keyof T>(
  value: T,
  key: K,
): { presente: true; valor: T[K] } | { presente: false } {
  return Object.prototype.hasOwnProperty.call(value, key)
    ? { presente: true, valor: value[key] }
    : { presente: false };
}

export function aplicarAtualizacaoInteressado(
  interessado: Interessado,
  input: AtualizarInteressadoInput,
  atualizadoEm: string,
): Interessado {
  assegurarInteressadoAtivo(interessado, "editar");
  validarDataHoraInteressado(atualizadoEm, "A atualização");

  const nomeInput = lerPropriedade(input, "nome");
  const telefoneInput = lerPropriedade(input, "telefone");
  const emailInput = lerPropriedade(input, "email");
  const objetivoInput = lerPropriedade(input, "objetivo");
  const origemInput = lerPropriedade(input, "origem");
  const origemDetalheInput = lerPropriedade(input, "origemDetalhe");
  const followUpInput = lerPropriedade(input, "proximoFollowUp");
  const observacoesInput = lerPropriedade(input, "observacoes");
  if (nomeInput.presente && nomeInput.valor === undefined) {
    throw new Error("Informe o nome do interessado.");
  }
  if (origemInput.presente && origemInput.valor === undefined) {
    throw new Error("A origem informada é inválida.");
  }
  let nome = interessado.nome;
  if (nomeInput.presente && nomeInput.valor !== undefined) {
    nome = textoObrigatorio(nomeInput.valor, "o nome do interessado", 120);
  }
  let origem = interessado.origem;
  if (origemInput.presente && origemInput.valor !== undefined) {
    origem = origemInput.valor;
  }

  const candidato: CriarInteressadoInput = {
    nome,
    telefone: telefoneInput.presente
      ? normalizarTelefoneInteressado(telefoneInput.valor)
      : interessado.telefone,
    email: emailInput.presente
      ? normalizarEmailInteressado(emailInput.valor)
      : interessado.email,
    objetivo: objetivoInput.presente
      ? objetivoInput.valor
      : interessado.objetivo,
    origem,
    origemDetalhe: origemDetalheInput.presente
      ? textoOpcional(origemDetalheInput.valor, "o detalhe da origem", 160)
      : interessado.origemDetalhe,
    proximoFollowUp: followUpInput.presente
      ? followUpInput.valor
      : interessado.proximoFollowUp,
    observacoes: observacoesInput.presente
      ? textoOpcional(observacoesInput.valor, "as observações", 2_000)
      : interessado.observacoes,
  };
  const normalizado = normalizarCriarInteressadoInput(candidato);

  return {
    ...interessado,
    ...normalizado,
    telefone: normalizado.telefone,
    email: normalizado.email,
    objetivo: normalizado.objetivo,
    origemDetalhe: normalizado.origemDetalhe,
    proximoFollowUp: normalizado.proximoFollowUp,
    observacoes: normalizado.observacoes,
    atualizadoEm,
  };
}

export function interessadoEncerrado(interessado: Pick<Interessado, "status">): boolean {
  return STATUS_ENCERRADOS.some((status) => status === interessado.status);
}

export function assegurarInteressadoAtivo(
  interessado: Pick<Interessado, "status">,
  acao: string,
): void {
  if (interessado.status === "convertido") {
    throw new Error(`Não é possível ${acao} um interessado já convertido.`);
  }
  if (interessado.status === "perdido") {
    throw new Error(`Reative o interessado antes de ${acao}.`);
  }
}

export function aplicarStatusInteressado(
  interessado: Interessado,
  status: StatusInteressado,
  atualizadoEm: string,
): Interessado {
  assegurarInteressadoAtivo(interessado, "alterar o status de");
  if (!ehStatusInteressado(status)) throw new Error("O status informado é inválido.");
  if (status === "convertido") {
    throw new Error("Use a conversão para transformar o interessado em aluno.");
  }
  if (status === "perdido") {
    throw new Error("Informe o motivo ao marcar o interessado como perdido.");
  }
  if (
    status === "experimental-agendada" &&
    interessado.aulaExperimental?.status !== "agendada"
  ) {
    throw new Error("Agende a aula experimental antes de usar este status.");
  }
  if (
    status === "experimental-realizada" &&
    interessado.aulaExperimental?.status !== "realizada"
  ) {
    throw new Error("Marque a aula como realizada antes de usar este status.");
  }
  validarDataHoraInteressado(atualizadoEm, "A atualização");
  return { ...interessado, status, atualizadoEm };
}

export function adicionarContatoInteressado(
  interessado: Interessado,
  input: RegistrarContatoInteressadoInput,
  dados: { id: string; agora: string },
): Interessado {
  assegurarInteressadoAtivo(interessado, "registrar contato para");
  if (!ehCanalContatoInteressado(input.canal)) {
    throw new Error("O canal de contato informado é inválido.");
  }
  const registro: RegistroContatoInteressado = {
    id: textoObrigatorio(dados.id, "o identificador do contato", 160),
    canal: input.canal,
    observacao: textoObrigatorio(input.observacao, "a observação do contato", 1_000),
    realizadoEm: validarDataHoraInteressado(
      input.realizadoEm?.trim() || dados.agora,
      "A data do contato",
    ),
  };
  if (interessado.historicoContatos.some((item) => item.id === registro.id)) {
    throw new Error("Já existe um contato com este identificador.");
  }
  const proximoFollowUp = input.proximoFollowUp?.trim()
    ? validarDataInteressado(input.proximoFollowUp.trim(), "a data do próximo follow-up")
    : undefined;

  return {
    ...interessado,
    status: interessado.status === "novo" ? "em-contato" : interessado.status,
    historicoContatos: [registro, ...interessado.historicoContatos],
    proximoFollowUp,
    atualizadoEm: dados.agora,
  };
}

function normalizarAulaExperimental(
  aula: AulaExperimentalInteressado,
): AulaExperimentalInteressado {
  if (!ehStatusAulaExperimental(aula.status)) {
    throw new Error("O status da aula experimental é inválido.");
  }
  const data = validarDataInteressado(aula.data.trim(), "a data da aula experimental");
  const hora = validarHoraInteressado(aula.hora.trim());
  const observacoes = textoOpcional(
    aula.observacoes,
    "as observações da aula experimental",
    1_000,
  );
  return {
    data,
    hora,
    status: aula.status,
    ...(observacoes ? { observacoes } : {}),
  };
}

function statusDoResultadoDaAula(
  status: StatusAulaExperimental,
): Extract<
  StatusInteressado,
  "em-contato" | "experimental-agendada" | "experimental-realizada"
> {
  if (status === "agendada") return "experimental-agendada";
  if (status === "realizada") return "experimental-realizada";
  return "em-contato";
}

export function aplicarAgendamentoAulaExperimental(
  interessado: Interessado,
  input: AgendarAulaExperimentalInput,
  atualizadoEm: string,
): Interessado {
  assegurarInteressadoAtivo(interessado, "agendar uma aula para");
  const aulaExperimental = normalizarAulaExperimental({ ...input, status: "agendada" });
  validarDataHoraInteressado(atualizadoEm, "A atualização");
  return {
    ...interessado,
    aulaExperimental,
    status: "experimental-agendada",
    atualizadoEm,
  };
}

export function aplicarAtualizacaoAulaExperimental(
  interessado: Interessado,
  input: AtualizarAulaExperimentalInput,
  atualizadoEm: string,
): Interessado {
  assegurarInteressadoAtivo(interessado, "atualizar a aula de");
  if (!interessado.aulaExperimental) {
    throw new Error("Este interessado não possui aula experimental agendada.");
  }
  const aulaExperimental = normalizarAulaExperimental({
    ...interessado.aulaExperimental,
    ...input,
  });
  validarDataHoraInteressado(atualizadoEm, "A atualização");
  return {
    ...interessado,
    aulaExperimental,
    status: statusDoResultadoDaAula(aulaExperimental.status),
    atualizadoEm,
  };
}

export function aplicarPerdaInteressado(
  interessado: Interessado,
  motivo: string,
  atualizadoEm: string,
): Interessado {
  assegurarInteressadoAtivo(interessado, "marcar como perdido");
  const motivoPerda = textoObrigatorio(motivo, "o motivo da perda", 500);
  validarDataHoraInteressado(atualizadoEm, "A atualização");
  return {
    ...interessado,
    status: "perdido",
    motivoPerda,
    proximoFollowUp: undefined,
    convertidoAlunoId: undefined,
    convertidoEm: undefined,
    atualizadoEm,
  };
}

export function aplicarReativacaoInteressado(
  interessado: Interessado,
  atualizadoEm: string,
): Interessado {
  if (interessado.status === "convertido") {
    throw new Error("Um interessado convertido já possui vínculo com um aluno.");
  }
  if (interessado.status !== "perdido") {
    throw new Error("Somente um interessado perdido pode ser reativado.");
  }
  validarDataHoraInteressado(atualizadoEm, "A atualização");
  return {
    ...interessado,
    status: "em-contato",
    motivoPerda: undefined,
    convertidoAlunoId: undefined,
    convertidoEm: undefined,
    atualizadoEm,
  };
}

function textoOpcionalAluno(value: string | undefined): string | undefined {
  const normalizado = value?.trim().replace(/\s+/g, " ");
  return normalizado || undefined;
}

function normalizarAlunoDaConversao(
  interessado: Interessado,
  input: ConverterInteressadoDominioInput,
  /** Cadastro já existente (aluno que veio do app) — vale mais que o lead. */
  adotado?: Aluno,
): CriarAlunoConversaoInput {
  const doApp: ConverterInteressadoDominioInput = adotado
    ? {
        ...(adotado.telefone ? { telefone: adotado.telefone } : {}),
        ...(adotado.email ? { email: adotado.email } : {}),
        ...(adotado.objetivo ? { objetivo: adotado.objetivo } : {}),
        ...(adotado.modalidade ? { modalidade: adotado.modalidade } : {}),
      }
    : {};
  const mesclado: ConverterInteressadoDominioInput = {
    nome: interessado.nome,
    telefone: interessado.telefone,
    email: interessado.email,
    objetivo: interessado.objetivo,
    observacoes: interessado.observacoes,
    ...doApp,
    ...input,
  };
  const nome = mesclado.nome?.trim().replace(/\s+/g, " ");
  if (!nome) throw new Error("Informe o nome do novo aluno.");
  if (nome.length > 120) throw new Error("O nome deve ter no máximo 120 caracteres.");

  const telefone = normalizarTelefoneInteressado(mesclado.telefone);
  const email = normalizarEmailInteressado(mesclado.email);
  if (!telefone && !email) {
    throw new Error("Informe ao menos um telefone ou e-mail antes da conversão.");
  }
  if (
    mesclado.pesoMeta !== undefined &&
    (!Number.isFinite(mesclado.pesoMeta) ||
      mesclado.pesoMeta < 20 ||
      mesclado.pesoMeta > 400)
  ) {
    throw new Error("A meta de peso precisa estar entre 20 e 400 kg.");
  }
  if (
    mesclado.mensalidade !== undefined &&
    (!Number.isFinite(mesclado.mensalidade) || mesclado.mensalidade < 0)
  ) {
    throw new Error("A mensalidade não pode ser negativa.");
  }
  if (
    mesclado.diaVencimento !== undefined &&
    (!Number.isInteger(mesclado.diaVencimento) ||
      mesclado.diaVencimento < 1 ||
      mesclado.diaVencimento > 28)
  ) {
    throw new Error("O dia de vencimento precisa estar entre 1 e 28.");
  }

  const modalidade = textoOpcionalAluno(mesclado.modalidade);
  const observacoes = textoOpcionalAluno(mesclado.observacoes);
  return {
    nome,
    ...(telefone ? { telefone } : {}),
    ...(email ? { email } : {}),
    ...(mesclado.objetivo ? { objetivo: mesclado.objetivo } : {}),
    ...(modalidade ? { modalidade } : {}),
    ...(mesclado.pesoMeta !== undefined ? { pesoMeta: mesclado.pesoMeta } : {}),
    ...(mesclado.mensalidade !== undefined
      ? { mensalidade: mesclado.mensalidade }
      : {}),
    ...(mesclado.diaVencimento !== undefined
      ? { diaVencimento: mesclado.diaVencimento }
      : {}),
    ...(observacoes ? { observacoes } : {}),
    ativo: mesclado.ativo ?? true,
  };
}

function validarContatoAlunoDuplicado(
  alunos: readonly Aluno[],
  dados: Pick<CriarAlunoConversaoInput, "telefone" | "email">,
  /** Id do próprio cadastro adotado — não conta como duplicata dele mesmo. */
  ignorarId?: string,
): void {
  const candidatos = ignorarId ? alunos.filter((aluno) => aluno.id !== ignorarId) : alunos;
  const telefone = chaveTelefoneInteressado(dados.telefone);
  const email = chaveEmailInteressado(dados.email);
  const telefoneDuplicado =
    telefone !== undefined &&
    candidatos.some((aluno) => chaveTelefoneInteressado(aluno.telefone) === telefone);
  const emailDuplicado =
    email !== undefined &&
    candidatos.some((aluno) => chaveEmailInteressado(aluno.email) === email);
  if (telefoneDuplicado && emailDuplicado) {
    throw new Error("Já existe um aluno com este telefone e e-mail.");
  }
  if (telefoneDuplicado) throw new Error("Já existe um aluno com este telefone.");
  if (emailDuplicado) throw new Error("Já existe um aluno com este e-mail.");
}

/**
 * Conversão pura e atômica do ponto de vista do domínio. O store aplica os dois
 * objetos retornados no mesmo `setData`, sem etapa intermediária observável.
 *
 * Quando o lead veio do app (`contaAppAlunoId`) e o cadastro ainda existe, ele é
 * **adotado**: mesmo id, mesmo histórico de treino/sessões, agora com o vínculo
 * ao personal. Sem isso a conversão criaria um segundo cadastro do mesmo aluno.
 */
export function converterInteressadoParaAluno(
  interessado: Interessado,
  input: ConverterInteressadoDominioInput,
  alunos: readonly Aluno[],
  dados: { alunoId: string; agora: string; personalEmail?: string },
): ResultadoConversaoInteressado {
  assegurarInteressadoAtivo(interessado, "converter");
  validarDataHoraInteressado(dados.agora, "A conversão");
  const alunoId = textoObrigatorio(dados.alunoId, "o identificador do aluno", 160);
  const adotado = interessado.contaAppAlunoId
    ? alunos.find((item) => item.id === interessado.contaAppAlunoId)
    : undefined;
  if (!adotado && alunos.some((aluno) => aluno.id === alunoId)) {
    throw new Error("Já existe um aluno com o identificador gerado.");
  }
  const normalizado = normalizarAlunoDaConversao(interessado, input, adotado);
  validarContatoAlunoDuplicado(alunos, normalizado, adotado?.id);
  const personalEmail =
    normalizarEmailInteressado(dados.personalEmail) ?? adotado?.personalEmail;
  const aluno: Aluno = {
    ...(adotado ?? {}),
    ...normalizado,
    id: adotado?.id ?? alunoId,
    criadoEm: adotado?.criadoEm ?? dados.agora,
    ativo: normalizado.ativo ?? true,
    ...(personalEmail ? { personalEmail } : {}),
  };
  const convertido: Interessado = {
    ...interessado,
    nome: aluno.nome,
    telefone: aluno.telefone,
    email: aluno.email,
    objetivo: aluno.objetivo,
    observacoes: aluno.observacoes,
    status: "convertido",
    proximoFollowUp: undefined,
    motivoPerda: undefined,
    convertidoAlunoId: aluno.id,
    convertidoEm: dados.agora,
    atualizadoEm: dados.agora,
  };
  return { aluno, interessado: convertido, adotado: adotado !== undefined };
}

function resolverHoje(hoje: Date | string): string {
  return typeof hoje === "string"
    ? validarDataInteressado(hoje, "a data de referência")
    : paraIso(hoje);
}

export function situacaoFollowUp(
  interessado: Pick<Interessado, "status" | "proximoFollowUp">,
  hoje: Date | string = new Date(),
): SituacaoFollowUp {
  if (interessado.status === "convertido" || interessado.status === "perdido") {
    return "encerrado";
  }
  if (!interessado.proximoFollowUp) return "sem-follow-up";
  const referencia = resolverHoje(hoje);
  const data = validarDataInteressado(
    interessado.proximoFollowUp,
    "a data do próximo follow-up",
  );
  if (data < referencia) return "atrasado";
  if (data === referencia) return "hoje";
  return "futuro";
}

export function followUpAtrasado(
  interessado: Pick<Interessado, "status" | "proximoFollowUp">,
  hoje: Date | string = new Date(),
): boolean {
  return situacaoFollowUp(interessado, hoje) === "atrasado";
}

export function followUpHoje(
  interessado: Pick<Interessado, "status" | "proximoFollowUp">,
  hoje: Date | string = new Date(),
): boolean {
  return situacaoFollowUp(interessado, hoje) === "hoje";
}

function prioridadeFollowUp(interessado: Interessado, hoje: string): number {
  const situacao = situacaoFollowUp(interessado, hoje);
  if (situacao === "atrasado") return 0;
  if (situacao === "hoje") return 1;
  if (situacao === "futuro") return 2;
  if (situacao === "sem-follow-up") return 3;
  return 4;
}

export function ordenarInteressados(
  interessados: readonly Interessado[],
  hoje: Date | string = new Date(),
): Interessado[] {
  const referencia = resolverHoje(hoje);
  return [...interessados].sort((a, b) => {
    const followUp = prioridadeFollowUp(a, referencia) - prioridadeFollowUp(b, referencia);
    if (followUp !== 0) return followUp;
    const dataFollowUp = (a.proximoFollowUp ?? "9999-12-31").localeCompare(
      b.proximoFollowUp ?? "9999-12-31",
    );
    if (dataFollowUp !== 0) return dataFollowUp;
    const pipeline = ORDEM_PIPELINE[a.status] - ORDEM_PIPELINE[b.status];
    if (pipeline !== 0) return pipeline;
    const atualizacao = b.atualizadoEm.localeCompare(a.atualizadoEm);
    if (atualizacao !== 0) return atualizacao;
    return a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
  });
}

export function calcularMetricasPipeline(
  interessados: readonly Interessado[],
  hoje: Date | string = new Date(),
): MetricasPipelineInteressados {
  const referencia = resolverHoje(hoje);
  const porStatus: Record<StatusInteressado, number> = {
    novo: 0,
    "em-contato": 0,
    "experimental-agendada": 0,
    "experimental-realizada": 0,
    proposta: 0,
    convertido: 0,
    perdido: 0,
  };
  let followUpsAtrasados = 0;
  let followUpsHoje = 0;
  for (const interessado of interessados) {
    porStatus[interessado.status] += 1;
    const situacao = situacaoFollowUp(interessado, referencia);
    if (situacao === "atrasado") followUpsAtrasados += 1;
    if (situacao === "hoje") followUpsHoje += 1;
  }
  const convertidos = porStatus.convertido;
  const perdidos = porStatus.perdido;
  const encerrados = convertidos + perdidos;
  return {
    total: interessados.length,
    ativos: interessados.length - encerrados,
    convertidos,
    perdidos,
    followUpsAtrasados,
    followUpsHoje,
    taxaConversaoPercentual:
      encerrados === 0 ? 0 : Math.round((convertidos / encerrados) * 1_000) / 10,
    porStatus,
  };
}

function isNonBlankString(value: unknown, maximo: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximo;
}

function isOptionalNonBlankString(value: unknown, maximo: number): boolean {
  return value === undefined || isNonBlankString(value, maximo);
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isDataLocal(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return validarDataInteressado(value) === value;
  } catch {
    return false;
  }
}

function isHoraLocal(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isRegistroContato(value: unknown): value is RegistroContatoInteressado {
  return (
    isRecord(value) &&
    isNonBlankString(value.id, 160) &&
    ehCanalContatoInteressado(value.canal) &&
    isNonBlankString(value.observacao, 1_000) &&
    isIsoDateTime(value.realizadoEm)
  );
}

function isAulaExperimental(value: unknown): value is AulaExperimentalInteressado {
  return (
    isRecord(value) &&
    isDataLocal(value.data) &&
    isHoraLocal(value.hora) &&
    ehStatusAulaExperimental(value.status) &&
    isOptionalNonBlankString(value.observacoes, 1_000)
  );
}

/** Validação estrutural usada na fronteira de persistência e importação. */
export function isInteressado(value: unknown): value is Interessado {
  if (
    !isRecord(value) ||
    !isNonBlankString(value.id, 160) ||
    !isNonBlankString(value.nome, 120) ||
    !isOptionalNonBlankString(value.telefone, 30) ||
    !isOptionalNonBlankString(value.email, 254) ||
    (value.telefone !== undefined &&
      (typeof value.telefone !== "string" ||
        (chaveTelefoneInteressado(value.telefone)?.length ?? 0) < 8 ||
        (chaveTelefoneInteressado(value.telefone)?.length ?? 16) > 15)) ||
    (value.email !== undefined &&
      (typeof value.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))) ||
    (value.objetivo !== undefined && !ehObjetivo(value.objetivo)) ||
    !ehOrigemInteressado(value.origem) ||
    !isOptionalNonBlankString(value.origemDetalhe, 160) ||
    (value.origem === "outro" && !isNonBlankString(value.origemDetalhe, 160)) ||
    !isOptionalNonBlankString(value.personalPublicoId, 160) ||
    !isOptionalNonBlankString(value.contaAppAlunoId, 160) ||
    !ehStatusInteressado(value.status) ||
    (value.proximoFollowUp !== undefined && !isDataLocal(value.proximoFollowUp)) ||
    !Array.isArray(value.historicoContatos) ||
    !value.historicoContatos.every(isRegistroContato) ||
    new Set(value.historicoContatos.map((registro) => registro.id)).size !==
      value.historicoContatos.length ||
    (value.aulaExperimental !== undefined && !isAulaExperimental(value.aulaExperimental)) ||
    !isOptionalNonBlankString(value.observacoes, 2_000) ||
    !isOptionalNonBlankString(value.motivoPerda, 500) ||
    !isOptionalNonBlankString(value.convertidoAlunoId, 160) ||
    (value.convertidoEm !== undefined && !isIsoDateTime(value.convertidoEm)) ||
    !isIsoDateTime(value.criadoEm) ||
    !isIsoDateTime(value.atualizadoEm)
  ) {
    return false;
  }

  if (
    value.status === "experimental-agendada" &&
    (!isAulaExperimental(value.aulaExperimental) ||
      value.aulaExperimental.status !== "agendada")
  ) {
    return false;
  }
  if (
    value.status === "experimental-realizada" &&
    (!isAulaExperimental(value.aulaExperimental) ||
      value.aulaExperimental.status !== "realizada")
  ) {
    return false;
  }
  if (value.status === "convertido") {
    return (
      isNonBlankString(value.convertidoAlunoId, 160) &&
      isIsoDateTime(value.convertidoEm) &&
      value.motivoPerda === undefined &&
      value.proximoFollowUp === undefined
    );
  }
  if (value.status === "perdido") {
    return (
      isNonBlankString(value.motivoPerda, 500) &&
      value.convertidoAlunoId === undefined &&
      value.convertidoEm === undefined &&
      value.proximoFollowUp === undefined
    );
  }
  return (
    value.motivoPerda === undefined &&
    value.convertidoAlunoId === undefined &&
    value.convertidoEm === undefined
  );
}
