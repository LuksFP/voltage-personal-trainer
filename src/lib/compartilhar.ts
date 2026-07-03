import type { Treino } from "./types";

/**
 * Formata uma planilha de treino como texto pronto para WhatsApp
 * (usa *negrito* e _itálico_ que o WhatsApp renderiza).
 */
export function treinoParaTexto(treino: Treino, alunoNome?: string): string {
  const linhas: string[] = [`🏋️ *${treino.nome}*`];
  if (alunoNome) linhas.push(`Aluno: ${alunoNome}`);
  if (treino.descricao) linhas.push(treino.descricao);
  linhas.push("");

  for (const div of treino.divisoes) {
    linhas.push(`*${div.nome}*`);
    if (div.exercicios.length === 0) {
      linhas.push("_(sem exercícios)_");
    } else {
      div.exercicios.forEach((ex, i) => {
        const detalhes = [`${ex.series}x${ex.repeticoes}`];
        if (ex.carga) detalhes.push(ex.carga);
        if (ex.descanso) detalhes.push(`desc ${ex.descanso}`);
        let linha = `${i + 1}. ${ex.nome} — ${detalhes.join(" · ")}`;
        if (ex.observacoes) linha += ` (${ex.observacoes})`;
        linhas.push(linha);
      });
    }
    linhas.push("");
  }

  linhas.push("— enviado via Voltage");
  return linhas.join("\n");
}

/**
 * Monta o link wa.me. Normaliza telefone BR (adiciona 55 quando faltando).
 * Sem telefone → abre o WhatsApp para o personal escolher o contato.
 */
export function linkWhatsapp(texto: string, telefone?: string): string {
  const num = (telefone ?? "").replace(/\D/g, "");
  const comDdi = num.length === 10 || num.length === 11 ? `55${num}` : num;
  const base = comDdi ? `https://wa.me/${comDdi}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}
