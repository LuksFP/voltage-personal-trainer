import type { StoreData } from "./store";

const APP = "voltage";
const VERSAO = 1;

export interface Backup {
  app: typeof APP;
  versao: number;
  exportadoEm: string;
  dados: StoreData;
}

/** Serializa a base atual em JSON de backup (identado, legível). */
export function montarBackup(dados: StoreData): string {
  const backup: Backup = {
    app: APP,
    versao: VERSAO,
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

  // Aceita tanto o formato com envelope { app, dados } quanto o objeto de dados cru.
  const dados = (raw.dados ?? raw) as Record<string, unknown>;

  const arr = (v: unknown) => (Array.isArray(v) ? v : null);
  const alunos = arr(dados.alunos);
  const treinos = arr(dados.treinos);
  if (!alunos || !treinos) {
    throw new Error("Backup não contém 'alunos' e 'treinos'.");
  }

  return {
    alunos: alunos as StoreData["alunos"],
    treinos: treinos as StoreData["treinos"],
    avaliacoes: (arr(dados.avaliacoes) ?? []) as StoreData["avaliacoes"],
    sessoes: (arr(dados.sessoes) ?? []) as StoreData["sessoes"],
    pagamentos: (arr(dados.pagamentos) ?? []) as StoreData["pagamentos"],
    biblioteca: (arr(dados.biblioteca) ?? []) as StoreData["biblioteca"],
  };
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
