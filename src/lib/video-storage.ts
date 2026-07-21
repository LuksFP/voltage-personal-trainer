const BANCO_VIDEOS = "voltage-videos";
const VERSAO_BANCO_VIDEOS = 1;
const COLECAO_VIDEOS = "videos";

function validarId(id: string): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("O identificador do vídeo é inválido.");
  }
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "QuotaExceededError"
  );
}

function erroDaOperacao(acao: string, causa: unknown): Error {
  if (isQuotaExceededError(causa)) {
    return new Error("Não há espaço disponível para salvar o vídeo neste navegador.");
  }
  return new Error(`Não foi possível ${acao} no armazenamento local de vídeos.`);
}

function obterIndexedDB(): IDBFactory {
  try {
    const indexedDB = globalThis.indexedDB;
    if (typeof indexedDB !== "undefined") return indexedDB;
  } catch {
    // Alguns contextos privados/sandboxed bloqueiam até o acesso à API.
  }
  throw new Error("O armazenamento local de vídeos não está disponível neste navegador.");
}

function abrirBanco(): Promise<IDBDatabase> {
  const indexedDB = obterIndexedDB();

  return new Promise((resolve, reject) => {
    let finalizado = false;
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(BANCO_VIDEOS, VERSAO_BANCO_VIDEOS);
    } catch (causa) {
      reject(erroDaOperacao("abrir", causa));
      return;
    }

    const falhar = (erro: Error) => {
      if (finalizado) return;
      finalizado = true;
      reject(erro);
    };

    request.onupgradeneeded = () => {
      const banco = request.result;
      if (!banco.objectStoreNames.contains(COLECAO_VIDEOS)) {
        banco.createObjectStore(COLECAO_VIDEOS);
      }
    };

    request.onerror = () => {
      falhar(erroDaOperacao("abrir", request.error));
    };

    request.onblocked = () => {
      falhar(
        new Error(
          "O armazenamento de vídeos está bloqueado. Feche outras abas do Voltage e tente novamente.",
        ),
      );
    };

    request.onsuccess = () => {
      const banco = request.result;
      if (finalizado) {
        banco.close();
        return;
      }
      finalizado = true;
      banco.onversionchange = () => banco.close();
      resolve(banco);
    };
  });
}

async function executarTransacao<T>(
  modo: IDBTransactionMode,
  acao: string,
  criarRequisicao: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const banco = await abrirBanco();

  try {
    return await new Promise<T>((resolve, reject) => {
      let transacao: IDBTransaction;
      let request: IDBRequest<T>;

      try {
        transacao = banco.transaction(COLECAO_VIDEOS, modo);
        request = criarRequisicao(transacao.objectStore(COLECAO_VIDEOS));
      } catch (causa) {
        reject(erroDaOperacao(acao, causa));
        return;
      }

      let resultado: { valor: T } | null = null;

      request.onsuccess = () => {
        resultado = { valor: request.result };
      };
      request.onerror = () => {
        reject(erroDaOperacao(acao, request.error));
      };
      transacao.onerror = () => {
        reject(erroDaOperacao(acao, transacao.error));
      };
      transacao.onabort = () => {
        reject(erroDaOperacao(acao, transacao.error));
      };
      transacao.oncomplete = () => {
        const concluido = resultado;
        if (concluido === null) {
          reject(erroDaOperacao(acao, null));
          return;
        }
        resolve(concluido.valor);
      };
    });
  } finally {
    banco.close();
  }
}

export async function salvarVideoLocal(id: string, video: Blob): Promise<void> {
  validarId(id);
  if (!isBlob(video)) throw new Error("O arquivo de vídeo é inválido.");

  await executarTransacao<IDBValidKey>("readwrite", "salvar o vídeo", (store) =>
    store.put(video, id),
  );
}

export async function carregarVideoLocal(id: string): Promise<Blob | null> {
  validarId(id);
  const resultado = await executarTransacao<unknown>("readonly", "carregar o vídeo", (store) =>
    store.get(id),
  );

  if (resultado === undefined) return null;
  if (!isBlob(resultado)) {
    throw new Error("O arquivo de vídeo salvo neste navegador está inválido.");
  }
  return resultado;
}

export async function removerVideoLocal(id: string): Promise<void> {
  validarId(id);
  await executarTransacao<undefined>("readwrite", "remover o vídeo", (store) =>
    store.delete(id),
  );
}

export async function listarIdsVideosLocais(): Promise<string[]> {
  const chaves = await executarTransacao<IDBValidKey[]>(
    "readonly",
    "listar os vídeos",
    (store) => store.getAllKeys(),
  );
  const ids: string[] = [];
  for (const chave of chaves) {
    if (typeof chave !== "string") {
      throw new Error("O índice local de vídeos está inválido.");
    }
    ids.push(chave);
  }
  return ids;
}
