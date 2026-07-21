import type { Treino } from "./types";
import { detalhesDoBloco, tituloDoBloco, unidadesDaDivisao } from "./blocos-treino";

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
      let numeroExercicio = 1;
      const unidades = unidadesDaDivisao(div);
      unidades.forEach((unidade, indiceUnidade) => {
        if (unidade.bloco) {
          const detalhes = detalhesDoBloco(unidade.bloco);
          const configuracao = [tituloDoBloco(unidade.bloco), ...detalhes].join(" · ");
          linhas.push(`_${configuracao}_`);
        }

        unidade.exercicios.forEach((ex) => {
          const detalhes = [`${ex.series}x${ex.repeticoes}`];
          if (ex.carga) detalhes.push(ex.carga);
          if (ex.descanso) detalhes.push(`desc ${ex.descanso}`);
          let linha = `${numeroExercicio}. ${ex.nome} — ${detalhes.join(" · ")}`;
          if (ex.observacoes) linha += ` (${ex.observacoes})`;
          linhas.push(linha);
          numeroExercicio += 1;
        });

        if (unidade.bloco && indiceUnidade < unidades.length - 1) linhas.push("");
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
