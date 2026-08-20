import type { Pagamento } from "./types";
import { formatBRL, labelCompetencia } from "./pagamentos";
import { fmtData, fmtPorExtenso } from "@/lib/data";

/**
 * Recibo de mensalidade: sai pronto assim que o personal marca "Recebido".
 * Serve tanto como texto de WhatsApp quanto como papel (imprimir / salvar PDF).
 */

export interface DadosRecibo {
  pagamento: Pagamento;
  alunoNome: string;
  personalNome: string;
  /** Documento de quem emite (CPF/CNPJ), quando o personal preencheu. */
  personalDocumento?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Número estável do recibo: mesma cobrança sempre gera o mesmo número, mesmo
 * depois de recarregar a página ou restaurar um backup.
 */
export function numeroRecibo(pagamento: Pagamento): string {
  const sufixo = pagamento.id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase()
    .padStart(4, "0");
  return `${pagamento.competencia.replace("-", "")}-${sufixo}`;
}

/** Data que o recibo declara como pagamento (cai pro vencimento se faltar). */
export function dataDoRecibo(pagamento: Pagamento): string {
  return pagamento.pagoEm ?? pagamento.vencimento;
}

/** Recibo em texto, pronto pro WhatsApp (usa *negrito* que o app renderiza). */
export function reciboParaTexto({
  pagamento,
  alunoNome,
  personalNome,
  personalDocumento,
}: DadosRecibo): string {
  const linhas = [
    `🧾 *Recibo ${numeroRecibo(pagamento)}*`,
    "",
    `Recebi de *${alunoNome}* a quantia de *${formatBRL(pagamento.valor)}*, referente à mensalidade de ${labelCompetencia(pagamento.competencia)}.`,
    "",
    `Pago em: ${fmtData(dataDoRecibo(pagamento))}`,
  ];
  if (pagamento.metodo) linhas.push(`Forma de pagamento: ${pagamento.metodo}`);
  linhas.push(
    "",
    `${personalNome}${personalDocumento ? ` · ${personalDocumento}` : ""}`,
    "— enviado via Voltage",
  );
  return linhas.join("\n");
}

/**
 * Abre a janela de impressão com o recibo formatado (Salvar como PDF).
 * Segue o mesmo caminho do treino impresso: HTML simples, sem dependência.
 */
export function imprimirRecibo(dados: DadosRecibo): void {
  const { pagamento, alunoNome, personalNome, personalDocumento } = dados;
  const numero = numeroRecibo(pagamento);

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${esc(numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #16190f; margin: 32px; }
  .folha { max-width: 640px; margin: 0 auto; border: 1px solid #d8ddcd; border-radius: 12px; padding: 28px 32px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16190f; padding-bottom: 12px; }
  .marca { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6b7563; }
  h1 { margin: 4px 0 0; font-size: 22px; }
  .numero { text-align: right; font-size: 12px; color: #555; }
  .numero strong { display: block; font-size: 15px; color: #16190f; }
  .valor { margin: 24px 0 4px; font-size: 34px; font-weight: 700; letter-spacing: -0.5px; }
  .valor span { font-size: 15px; font-weight: 500; color: #6b7563; }
  .corpo { margin: 18px 0 0; font-size: 14px; line-height: 1.7; }
  .corpo strong { font-weight: 700; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 24px 0 0; font-size: 13px; }
  dt { color: #6b7563; }
  dd { margin: 0; font-weight: 600; }
  .assinatura { margin-top: 48px; border-top: 1px solid #16190f; padding-top: 8px; font-size: 13px; text-align: center; width: 280px; margin-left: auto; margin-right: auto; }
  .assinatura span { display: block; color: #6b7563; font-size: 12px; }
  footer { margin-top: 28px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { margin: 12mm; } .folha { border: none; padding: 0; } }
</style></head>
<body>
  <div class="folha">
    <header>
      <div>
        <p class="marca">Voltage · Recibo</p>
        <h1>Recibo de pagamento</h1>
      </div>
      <div class="numero">Nº<strong>${esc(numero)}</strong></div>
    </header>

    <p class="valor">${esc(formatBRL(pagamento.valor))} <span>recebidos</span></p>

    <p class="corpo">
      Recebi de <strong>${esc(alunoNome)}</strong> a quantia de
      <strong>${esc(formatBRL(pagamento.valor))}</strong>, referente à mensalidade de
      <strong>${esc(labelCompetencia(pagamento.competencia))}</strong>, dando plena quitação
      do período.
    </p>

    <dl>
      <dt>Pago em</dt><dd>${esc(fmtPorExtenso(dataDoRecibo(pagamento)))}</dd>
      <dt>Vencimento</dt><dd>${esc(fmtData(pagamento.vencimento))}</dd>
      ${pagamento.metodo ? `<dt>Forma de pagamento</dt><dd>${esc(pagamento.metodo)}</dd>` : ""}
    </dl>

    <div class="assinatura">
      ${esc(personalNome)}
      <span>${personalDocumento ? esc(personalDocumento) : "Personal trainer"}</span>
    </div>

    <footer>Gerado por Voltage — Gestão de Personal Trainer</footer>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return; // popup bloqueado
  win.document.write(html);
  win.document.close();
}
