import type { Pagamento } from "./types";

// Status mostrado ao personal: "pago" | "pendente" (ainda no prazo) | "atrasado" (venceu sem pagar).
export type StatusEfetivo = "pago" | "pendente" | "atrasado";

const nf = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(n: number): string {
  return nf.format(n);
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "2026-07"
export function competencia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function competenciaAtual(): string {
  return competencia(new Date());
}

// Desloca uma competência em `delta` meses (ex.: -1 = mês anterior).
export function deslocarCompetencia(comp: string, delta: number): string {
  const [y, m] = comp.split("-").map(Number);
  return competencia(new Date(y, m - 1 + delta, 1));
}

// "julho de 2026"
export function labelCompetencia(comp: string): string {
  const [y, m] = comp.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

// "jul/26" — rótulo curto para gráficos e chips.
export function labelCurto(comp: string): string {
  const [y, m] = comp.split("-").map(Number);
  const mes = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${mes}/${String(y).slice(2)}`;
}

// Data de vencimento (YYYY-MM-DD) de uma competência dado o dia do mês.
export function vencimentoDe(comp: string, diaVencimento: number): string {
  const [y, m] = comp.split("-").map(Number);
  const dia = Math.min(Math.max(diaVencimento || 1, 1), 28);
  return iso(new Date(y, m - 1, dia));
}

export function statusEfetivo(p: Pagamento, hoje: Date = new Date()): StatusEfetivo {
  if (p.status === "pago") return "pago";
  return p.vencimento < iso(hoje) ? "atrasado" : "pendente";
}
