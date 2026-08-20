import type { Sessao, StatusSessao } from "./types";
import { dataUtc, somarDias } from "./data";

const HORA_24H = /^(\d{2}):(\d{2})$/;
export const DURACAO_PADRAO_SESSAO_MIN = 60;

export type SessaoComparavel = Pick<Sessao, "data" | "hora" | "duracaoMin"> &
  Partial<Pick<Sessao, "id">> & {
    status?: StatusSessao;
  };

export interface ConflitoAgenda<
  Candidata extends SessaoComparavel = SessaoComparavel,
  Existente extends SessaoComparavel = SessaoComparavel,
> {
  candidata: Candidata;
  existente: Existente;
}

function minutosDaHora(hora: string): number {
  const partes = HORA_24H.exec(hora);
  if (!partes) throw new Error("Use um horário no formato HH:MM.");
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) throw new Error("O horário informado é inválido.");
  return horas * 60 + minutos;
}

function duracaoDaSessao(sessao: SessaoComparavel): number {
  const duracao = sessao.duracaoMin ?? DURACAO_PADRAO_SESSAO_MIN;
  if (!Number.isFinite(duracao) || duracao <= 0) {
    throw new Error("A duração da sessão deve ser um número positivo.");
  }
  return duracao;
}

function inicioAbsolutoEmMinutos(sessao: SessaoComparavel): number {
  return dataUtc(sessao.data).getTime() / 60_000 + minutosDaHora(sessao.hora);
}

/** Gera ocorrências semanais, incluindo a data inicial, com limite de 52 sessões. */
export function gerarDatasRecorrentes(data: string, quantidade: number): string[] {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 52) {
    throw new Error("A recorrência deve ter entre 1 e 52 sessões.");
  }
  // Valida a data mesmo quando houver apenas uma ocorrência.
  dataUtc(data);
  return Array.from({ length: quantidade }, (_, indice) => somarDias(data, indice * 7));
}

/**
 * Compara intervalos semiabertos [início, fim): 08:00–09:00 e 09:00–10:00
 * são adjacentes, não conflitantes. Sessões canceladas e a mesma sessão são ignoradas.
 */
export function sessoesSeSobrepoem(
  primeira: SessaoComparavel,
  segunda: SessaoComparavel,
): boolean {
  if (primeira.status === "cancelada" || segunda.status === "cancelada") return false;
  if (primeira.id && segunda.id && primeira.id === segunda.id) return false;

  const inicioPrimeira = inicioAbsolutoEmMinutos(primeira);
  const inicioSegunda = inicioAbsolutoEmMinutos(segunda);
  const fimPrimeira = inicioPrimeira + duracaoDaSessao(primeira);
  const fimSegunda = inicioSegunda + duracaoDaSessao(segunda);
  return inicioPrimeira < fimSegunda && inicioSegunda < fimPrimeira;
}

export function conflitosDaSessao<Existente extends SessaoComparavel>(
  candidata: SessaoComparavel,
  existentes: readonly Existente[],
): Existente[] {
  return existentes.filter((existente) => sessoesSeSobrepoem(candidata, existente));
}

export function conflitosEntreCandidatosEExistentes<
  Candidata extends SessaoComparavel,
  Existente extends SessaoComparavel,
>(
  candidatas: readonly Candidata[],
  existentes: readonly Existente[],
): ConflitoAgenda<Candidata, Existente>[] {
  return candidatas.flatMap((candidata) =>
    conflitosDaSessao(candidata, existentes).map((existente) => ({
      candidata,
      existente,
    })),
  );
}
