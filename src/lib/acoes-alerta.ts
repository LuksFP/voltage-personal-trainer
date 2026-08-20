import type { AlertaPersonal, AlertasPersonal, TipoAlertaPersonal } from "./alertas";

/**
 * Traduz o alerta em tarefa: o que dizer pro aluno e qual é o próximo passo
 * dentro do app. Sem isso o painel só aponta o problema e para por aí.
 */

export type AcaoAlerta =
  | { tipo: "aluno"; rotulo: string }
  | { tipo: "agendar"; rotulo: string };

const ROTULOS: Record<TipoAlertaPersonal, string> = {
  "sem-treino": "Sem planilha",
  "sem-presenca": "Sumido",
  "feedback-ruim": "Feedback ruim",
  dor: "Dor",
  "sem-evolucao": "Carga parada",
};

// Alta prioridade primeiro; dentro do mesmo nível, a ordem é a do impacto.
const PESO_TIPO: Record<TipoAlertaPersonal, number> = {
  dor: 0,
  "sem-treino": 1,
  "sem-presenca": 2,
  "feedback-ruim": 3,
  "sem-evolucao": 4,
};

export function rotuloTipoAlerta(tipo: TipoAlertaPersonal): string {
  return ROTULOS[tipo];
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

/** Mensagem de WhatsApp pronta, no tom de quem acompanha o aluno de perto. */
export function mensagemDoAlerta(alerta: AlertaPersonal): string {
  const nome = primeiroNome(alerta.nome);
  switch (alerta.tipo) {
    case "sem-treino":
      return `Oi ${nome}! Vou montar sua planilha nova. Me confirma quais dias da semana você consegue treinar e onde (academia ou casa)?`;
    case "sem-presenca":
      return `Oi ${nome}! Senti sua falta nos últimos treinos. Tá tudo certo? Me diz um dia dessa semana que dá pra você e eu já deixo marcado.`;
    case "feedback-ruim":
      return `Oi ${nome}! Vi seu feedback do último treino. Me conta o que pesou mais que eu ajusto a carga e o volume pra essa semana.`;
    case "dor":
      return `Oi ${nome}! Vi que você marcou dor no último treino. Onde exatamente doeu e em qual exercício? Já vou adaptar seu treino até melhorar.`;
    case "sem-evolucao":
      return `Oi ${nome}! Suas cargas estão paradas há algumas semanas. Vou revisar sua progressão — me diz se os últimos treinos estão vindo fáceis ou pesados.`;
  }
}

/** Próximo passo dentro do app (o botão ao lado do WhatsApp). */
export function acaoDoAlerta(alerta: AlertaPersonal): AcaoAlerta {
  switch (alerta.tipo) {
    case "sem-treino":
      return { tipo: "aluno", rotulo: "Montar planilha" };
    case "sem-presenca":
      return { tipo: "agendar", rotulo: "Remarcar" };
    case "feedback-ruim":
    case "dor":
      return { tipo: "aluno", rotulo: "Ajustar treino" };
    case "sem-evolucao":
      return { tipo: "aluno", rotulo: "Rever cargas" };
  }
}

/**
 * Junta os cinco baldes de alerta numa fila só, do mais urgente pro menos.
 * Um aluno pode aparecer mais de uma vez — são tarefas diferentes.
 */
export function filaDeTarefas(grupos: AlertasPersonal): AlertaPersonal[] {
  return [
    ...grupos.dor,
    ...grupos.semTreino,
    ...grupos.semPresenca,
    ...grupos.feedbackRuim,
    ...grupos.semEvolucao,
  ]
    .sort((a, b) => {
      const porPrioridade =
        (a.prioridade === "alta" ? 0 : 1) - (b.prioridade === "alta" ? 0 : 1);
      if (porPrioridade !== 0) return porPrioridade;
      const porTipo = PESO_TIPO[a.tipo] - PESO_TIPO[b.tipo];
      return porTipo !== 0 ? porTipo : a.nome.localeCompare(b.nome);
    });
}
