/**
 * Pix copia-e-cola (BR Code estático, padrão EMV® QRCPS do Banco Central).
 *
 * Tudo aqui é função pura: monta a string que o aluno cola no app do banco.
 * Não fala com API nenhuma — o Pix é do personal, o dinheiro cai direto na
 * conta dele e o Voltage só registra que a cobrança foi paga.
 */

export type TipoChavePix = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

export interface ChavePixValida {
  ok: true;
  tipo: TipoChavePix;
  /** Chave no formato que vai dentro do BR Code (só dígitos, +55…, minúscula). */
  valor: string;
}

export interface ChavePixInvalida {
  ok: false;
  erro: string;
}

export type ResultadoChavePix = ChavePixValida | ChavePixInvalida;

export const TIPOS_CHAVE_PIX: TipoChavePix[] = [
  "cpf",
  "cnpj",
  "telefone",
  "email",
  "aleatoria",
];

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_ALEATORIA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function rotuloTipoChave(tipo: TipoChavePix): string {
  const rotulos: Record<TipoChavePix, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    telefone: "Celular",
    email: "E-mail",
    aleatoria: "Chave aleatória",
  };
  return rotulos[tipo];
}

function telefoneComDdi(digitos: string): ChavePixValida | ChavePixInvalida {
  if (digitos.length === 10 || digitos.length === 11) {
    return { ok: true, tipo: "telefone", valor: `+55${digitos}` };
  }
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    return { ok: true, tipo: "telefone", valor: `+${digitos}` };
  }
  return { ok: false, erro: "Celular inválido. Use DDD + número." };
}

/**
 * Descobre o tipo da chave e devolve no formato aceito pelos bancos.
 * Aceita o que o personal digitar (com máscara, espaços, maiúsculas).
 *
 * 11 dígitos crus são ambíguos (CPF ou celular): o palpite usa o 9 do celular,
 * e o personal pode corrigir passando `tipoForcado`.
 */
export function normalizarChavePix(
  entrada: string,
  tipoForcado?: TipoChavePix,
): ResultadoChavePix {
  const bruta = entrada.trim();
  if (!bruta) return { ok: false, erro: "Informe sua chave Pix." };
  const digitos = bruta.replace(/\D/g, "");

  if (tipoForcado) {
    switch (tipoForcado) {
      case "email":
        return RE_EMAIL.test(bruta)
          ? { ok: true, tipo: "email", valor: bruta.toLowerCase() }
          : { ok: false, erro: "E-mail inválido." };
      case "aleatoria":
        return RE_ALEATORIA.test(bruta.toLowerCase())
          ? { ok: true, tipo: "aleatoria", valor: bruta.toLowerCase() }
          : { ok: false, erro: "Chave aleatória inválida (36 caracteres com hífens)." };
      case "cpf":
        return digitos.length === 11
          ? { ok: true, tipo: "cpf", valor: digitos }
          : { ok: false, erro: "CPF precisa ter 11 dígitos." };
      case "cnpj":
        return digitos.length === 14
          ? { ok: true, tipo: "cnpj", valor: digitos }
          : { ok: false, erro: "CNPJ precisa ter 14 dígitos." };
      case "telefone":
        return telefoneComDdi(digitos);
    }
  }

  if (RE_EMAIL.test(bruta)) {
    const valor = bruta.toLowerCase();
    if (valor.length > 77) return { ok: false, erro: "E-mail longo demais para uma chave Pix." };
    return { ok: true, tipo: "email", valor };
  }
  if (RE_ALEATORIA.test(bruta.toLowerCase())) {
    return { ok: true, tipo: "aleatoria", valor: bruta.toLowerCase() };
  }
  if (bruta.startsWith("+") || /[()]/.test(bruta)) return telefoneComDdi(digitos);
  if (digitos.length === 14) return { ok: true, tipo: "cnpj", valor: digitos };
  if (digitos.length === 11) {
    // CPF pontuado (000.000.000-00) é inequívoco; 11 dígitos crus começando
    // com DDD + 9 são quase sempre celular.
    const pontuadoComoCpf = /\d{3}\.\d{3}\.\d{3}-\d{2}/.test(bruta);
    if (!pontuadoComoCpf && digitos[2] === "9") {
      return { ok: true, tipo: "telefone", valor: `+55${digitos}` };
    }
    return { ok: true, tipo: "cpf", valor: digitos };
  }
  if (digitos.length === 10) return telefoneComDdi(digitos);
  if (digitos.length === 12 || digitos.length === 13) return telefoneComDdi(digitos);

  return {
    ok: false,
    erro: "Chave inválida. Use CPF, CNPJ, celular, e-mail ou chave aleatória.",
  };
}

/** Só o que o BR Code aceita: ASCII sem acento, sem quebra de linha. */
function ascii(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos combinantes
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

/** Campo TLV: id (2) + tamanho (2, com zero à esquerda) + valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** CRC16/CCITT-FALSE — polinômio 0x1021, inicial 0xFFFF, sem reflexão. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** TxID: só letras e números, até 25 caracteres. "***" quando não há. */
export function normalizarTxid(txid: string | undefined): string {
  const limpo = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  return limpo || "***";
}

export interface DadosPix {
  chave: string;
  tipoChave?: TipoChavePix;
  /** Nome de quem recebe (aparece no app do aluno). */
  nome: string;
  cidade: string;
  /** Em reais. Omitido ou 0 deixa o aluno digitar o valor. */
  valor?: number;
  /** Identificador da cobrança — cai no extrato do personal. */
  txid?: string;
  /** Texto curto que o app do banco mostra junto da cobrança. */
  descricao?: string;
}

export interface PixGerado {
  ok: true;
  /** String do copia-e-cola (é também o conteúdo do QR Code). */
  codigo: string;
  tipoChave: TipoChavePix;
}

export type ResultadoPix = PixGerado | ChavePixInvalida;

/**
 * Monta o copia-e-cola. Estático (reutilizável): se o aluno perder a mensagem,
 * o mesmo código continua valendo.
 */
export function gerarPixCopiaECola(dados: DadosPix): ResultadoPix {
  const chave = normalizarChavePix(dados.chave, dados.tipoChave);
  if (!chave.ok) return chave;

  const nome = ascii(dados.nome, 25) || "PERSONAL";
  const cidade = ascii(dados.cidade, 15) || "BRASIL";

  // O campo 26 inteiro cabe em 99 caracteres; a descrição usa o que sobrar.
  const gui = campo("00", "br.gov.bcb.pix");
  const chaveTlv = campo("01", chave.valor);
  const sobra = 99 - gui.length - chaveTlv.length - 4;
  const descricao = sobra >= 5 ? ascii(dados.descricao ?? "", sobra) : "";
  const conta = gui + chaveTlv + (descricao ? campo("02", descricao) : "");

  const partes = [
    campo("00", "01"), // versão do payload
    campo("01", "11"), // estático: pode ser pago mais de uma vez
    campo("26", conta),
    campo("52", "0000"), // categoria do recebedor: não informada
    campo("53", "986"), // BRL
  ];

  if (dados.valor != null && dados.valor > 0) {
    partes.push(campo("54", dados.valor.toFixed(2)));
  }

  partes.push(
    campo("58", "BR"),
    campo("59", nome),
    campo("60", cidade),
    campo("62", campo("05", normalizarTxid(dados.txid))),
  );

  const semCrc = `${partes.join("")}6304`;
  return { ok: true, codigo: `${semCrc}${crc16(semCrc)}`, tipoChave: chave.tipo };
}
