import type { StoreData } from "./store";

/**
 * O recorte do documento do personal que pode descer pro celular do aluno.
 *
 * A regra é positiva, não negativa: cada coleção precisa aparecer aqui e dizer
 * por que vai. Assim, coleção nova nasce fora do portal — o erro do TypeScript
 * ao faltar uma chave é justamente o lembrete de decidir.
 *
 * O que NÃO desce, e por quê:
 * - `alunos` vira só ele. O aluno não pode receber a carteira inteira do
 *   personal — nome, telefone e e-mail dos outros — só porque tem um link.
 * - `pagamentos`, `interessados` e `lembretesWhatsApp` são a operação do
 *   negócio: dinheiro, leads e o que o personal pretende cobrar de quem.
 * - `templatesTreino` e `perfisPublicos` são material do personal e o catálogo
 *   do app do aluno; o portal não usa nenhum dos dois.
 *
 * O que desce inteiro são os dois catálogos (`biblioteca`, `bancoAlimentos`):
 * não têm nada de pessoal e o portal precisa deles pra mostrar "como fazer" um
 * exercício e pra montar a refeição.
 */
export function fatiaDoAluno(dados: StoreData, alunoId: string): StoreData | null {
  const aluno = dados.alunos.find((a) => a.id === alunoId);
  if (!aluno) return null;

  const doAluno = <T extends { alunoId: string }>(itens: T[]): T[] =>
    itens.filter((item) => item.alunoId === alunoId);

  return {
    schemaVersion: dados.schemaVersion,
    alunos: [aluno],
    interessados: [],
    anamneses: doAluno(dados.anamneses),
    metasAluno: doAluno(dados.metasAluno),
    treinos: doAluno(dados.treinos),
    avaliacoes: doAluno(dados.avaliacoes),
    sessoes: doAluno(dados.sessoes),
    pagamentos: [],
    biblioteca: dados.biblioteca,
    historicoExercicios: doAluno(dados.historicoExercicios),
    templatesTreino: [],
    programasTreino: doAluno(dados.programasTreino),
    sugestoesProgressao: doAluno(dados.sugestoesProgressao),
    checkinsSemanais: doAluno(dados.checkinsSemanais),
    lembretesWhatsApp: [],
    pacotesSessoes: doAluno(dados.pacotesSessoes),
    solicitacoesSubstituicao: doAluno(dados.solicitacoesSubstituicao),
    videosExecucao: doAluno(dados.videosExecucao),
    configuracoesHabitos: doAluno(dados.configuracoesHabitos),
    registrosHabitos: doAluno(dados.registrosHabitos),
    planosAlimentares: doAluno(dados.planosAlimentares),
    registrosRefeicoes: doAluno(dados.registrosRefeicoes),
    bancoAlimentos: dados.bancoAlimentos,
    perfisPublicos: [],
  };
}

/**
 * Devolve o documento do personal com a fatia do aluno trocada pela versão que
 * veio do celular.
 *
 * Este é o ponto que torna o portal seguro sem RLS. O celular manda a fatia
 * inteira dele, mas o servidor **relê do documento tudo que não é dele**: os
 * outros alunos, o dinheiro, os leads. Não existe campo que o aluno possa
 * mandar pra alcançar essas coleções — elas nem são lidas do que ele enviou.
 *
 * Dentro da própria fatia, cada item ainda é conferido: qualquer registro com
 * `alunoId` de outra pessoa é descartado em vez de gravado. Sem isso, bastaria
 * o aluno trocar um `alunoId` no corpo da requisição pra escrever no histórico
 * de um colega.
 *
 * O cadastro (`alunos`) também não vem do celular: o aluno não renomeia a si
 * mesmo nem muda a própria mensalidade pelo portal.
 */
export function mesclarFatia(
  documento: StoreData,
  alunoId: string,
  fatia: StoreData,
): StoreData {
  const trocar = <T extends { alunoId: string }>(atuais: T[], vindos: T[]): T[] => [
    ...atuais.filter((item) => item.alunoId !== alunoId),
    ...vindos.filter((item) => item.alunoId === alunoId),
  ];

  return {
    ...documento,
    anamneses: trocar(documento.anamneses, fatia.anamneses),
    metasAluno: trocar(documento.metasAluno, fatia.metasAluno),
    treinos: trocar(documento.treinos, fatia.treinos),
    avaliacoes: trocar(documento.avaliacoes, fatia.avaliacoes),
    sessoes: trocar(documento.sessoes, fatia.sessoes),
    historicoExercicios: trocar(documento.historicoExercicios, fatia.historicoExercicios),
    programasTreino: trocar(documento.programasTreino, fatia.programasTreino),
    sugestoesProgressao: trocar(documento.sugestoesProgressao, fatia.sugestoesProgressao),
    checkinsSemanais: trocar(documento.checkinsSemanais, fatia.checkinsSemanais),
    pacotesSessoes: trocar(documento.pacotesSessoes, fatia.pacotesSessoes),
    solicitacoesSubstituicao: trocar(
      documento.solicitacoesSubstituicao,
      fatia.solicitacoesSubstituicao,
    ),
    videosExecucao: trocar(documento.videosExecucao, fatia.videosExecucao),
    configuracoesHabitos: trocar(documento.configuracoesHabitos, fatia.configuracoesHabitos),
    registrosHabitos: trocar(documento.registrosHabitos, fatia.registrosHabitos),
    planosAlimentares: trocar(documento.planosAlimentares, fatia.planosAlimentares),
    registrosRefeicoes: trocar(documento.registrosRefeicoes, fatia.registrosRefeicoes),
  };
}
