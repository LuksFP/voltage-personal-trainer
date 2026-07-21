const LIMITE_DESCANSO_SEGUNDOS = 3_600;
const NUMERO = "(\\d+(?:[.,]\\d+)?)";
const UNIDADE_MINUTO = "min(?:uto)?s?";
const UNIDADE_SEGUNDO = "(?:s|seg(?:undo)?s?)";

function normalizarNumero(valor: string): number {
  return Number(valor.replace(",", "."));
}

function validarSegundos(valor: number): number | null {
  if (!Number.isFinite(valor)) return null;
  const segundos = Math.round(valor);
  return segundos > 0 && segundos <= LIMITE_DESCANSO_SEGUNDOS ? segundos : null;
}

function parseValorUnico(texto: string): number | null {
  const relogio = /^(\d+):([0-5]?\d)$/.exec(texto);
  if (relogio) {
    const minutos = Number(relogio[1]);
    const segundos = Number(relogio[2]);
    return validarSegundos(minutos * 60 + segundos);
  }

  const minutosComSegundos = new RegExp(
    `^${NUMERO}\\s*${UNIDADE_MINUTO}(?:\\s*(?:e\\s*)?${NUMERO}\\s*${UNIDADE_SEGUNDO})?$`,
  ).exec(texto);
  if (minutosComSegundos) {
    const minutos = normalizarNumero(minutosComSegundos[1]);
    const segundos = minutosComSegundos[2]
      ? normalizarNumero(minutosComSegundos[2])
      : 0;
    return validarSegundos(minutos * 60 + segundos);
  }

  const apenasSegundos = new RegExp(`^${NUMERO}\\s*${UNIDADE_SEGUNDO}$`).exec(texto);
  if (apenasSegundos) {
    return validarSegundos(normalizarNumero(apenasSegundos[1]));
  }

  const numeroSimples = new RegExp(`^${NUMERO}$`).exec(texto);
  return numeroSimples ? validarSegundos(normalizarNumero(numeroSimples[1])) : null;
}

/**
 * Converte prescrições comuns de descanso em segundos para uso no timer.
 * Em faixas como "60-90s", usa o limite superior (o valor à direita).
 */
export function parseDescansoSegundos(texto: string): number | null {
  const normalizado = texto
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "");
  if (!normalizado) return null;

  const faixa = /^(.*?)\s*(?:-|\s+a\s+)\s*(.+)$/.exec(normalizado);
  if (faixa) {
    // Valida também o início para não aceitar entradas como "qualquer coisa-90s".
    if (parseValorUnico(faixa[1].trim()) === null) return null;
    return parseValorUnico(faixa[2].trim());
  }

  return parseValorUnico(normalizado);
}
