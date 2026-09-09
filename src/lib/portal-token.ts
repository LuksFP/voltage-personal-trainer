import { CURRENT_SCHEMA_VERSION } from "./persistencia";
import type { StoreData } from "./store";

/** Token do portal: 128 bits em hex, como `gerarTokenPortal` emite. */
export function ehTokenPortal(valor: string): boolean {
  return /^[0-9a-f]{32}$/.test(valor);
}

/**
 * Base vazia pro `migrarStoreData` completar o que faltar no documento.
 *
 * Vazia de verdade, sem nenhum seed: no servidor os padrões existem só pra
 * coleção que ainda não foi gravada não vir `undefined`. Enfiar seed aqui
 * faria o portal do aluno mostrar exercício e alimento que o personal nunca
 * cadastrou.
 */
export function baseVazia(): StoreData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    alunos: [],
    interessados: [],
    anamneses: [],
    metasAluno: [],
    treinos: [],
    avaliacoes: [],
    sessoes: [],
    pagamentos: [],
    biblioteca: [],
    historicoExercicios: [],
    templatesTreino: [],
    programasTreino: [],
    sugestoesProgressao: [],
    checkinsSemanais: [],
    lembretesWhatsApp: [],
    pacotesSessoes: [],
    solicitacoesSubstituicao: [],
    videosExecucao: [],
    configuracoesHabitos: [],
    registrosHabitos: [],
    planosAlimentares: [],
    registrosRefeicoes: [],
    bancoAlimentos: [],
    perfisPublicos: [],
  };
}
