import type { StoreData } from "./store";
import { CURRENT_SCHEMA_VERSION, migrarStoreData } from "./persistencia";

const APP = "voltage";
const FORMATO_VERSAO = 2;

export interface Backup {
  app: typeof APP;
  formatoVersao: number;
  schemaVersion: number;
  exportadoEm: string;
  dados: StoreData;
}

/** Serializa a base atual em JSON de backup (identado, legível). */
export function montarBackup(dados: StoreData): string {
  const backup: Backup = {
    app: APP,
    formatoVersao: FORMATO_VERSAO,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportadoEm: new Date().toISOString(),
    dados,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Lê e valida o texto de um arquivo de backup.
 * Lança Error com mensagem amigável se o formato for inválido.
 */
export function parseBackup(texto: string): StoreData {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error("Arquivo não é um JSON válido.");
  }

  if (typeof obj !== "object" || obj === null) {
    throw new Error("Conteúdo do backup inválido.");
  }
  const raw = obj as Record<string, unknown>;

  if (raw.app !== undefined && raw.app !== APP) {
    throw new Error("Este arquivo não é um backup do Voltage.");
  }

  // Aceita tanto o formato com envelope { app, dados } quanto o objeto de dados cru.
  const dados = raw.dados ?? raw;
  if (
    typeof dados !== "object" ||
    dados === null ||
    !Array.isArray((dados as Record<string, unknown>).alunos) ||
    !Array.isArray((dados as Record<string, unknown>).treinos)
  ) {
    throw new Error("Backup não contém 'alunos' e 'treinos'.");
  }

  return migrarStoreData(dados, {
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
  });
}

const LAST_BACKUP_KEY = "pt.lastBackup.v1";

export function registrarBackupFeito(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    /* storage indisponível */
  }
}

export function ultimoBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}
