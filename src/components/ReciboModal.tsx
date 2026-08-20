"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { linkWhatsapp } from "@/lib/compartilhar";
import { formatBRL, labelCompetencia } from "@/lib/pagamentos";
import { dataDoRecibo, imprimirRecibo, numeroRecibo, reciboParaTexto } from "@/lib/recibo";
import type { Pagamento } from "@/lib/types";
import { Modal } from "./Modal";
import { Button } from "./ui";
import { DownloadIcon, WhatsappIcon } from "./icons";
import { fmtData } from "@/lib/data";

/**
 * Recibo do pagamento recebido. Abre sozinho quando o personal marca "Recebido"
 * e volta a abrir pelo botão "Recibo" na linha do pagamento.
 */
export function ReciboModal({
  pagamento,
  alunoNome,
  telefone,
  onClose,
}: {
  pagamento: Pagamento | null;
  alunoNome: string;
  telefone?: string;
  onClose: () => void;
}) {
  const { personal } = useAuth();
  const [copiado, setCopiado] = useState(false);

  const dados = pagamento
    ? {
        pagamento,
        alunoNome,
        personalNome: personal?.nome ?? "Personal trainer",
        personalDocumento: personal?.documento,
      }
    : null;

  const copiar = async () => {
    if (!dados) return;
    try {
      await navigator.clipboard.writeText(reciboParaTexto(dados));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <Modal
      open={pagamento !== null}
      onClose={() => {
        setCopiado(false);
        onClose();
      }}
      title="Recibo pronto"
    >
      {dados && pagamento && (
        <div className="space-y-5">
          <div className="rounded-xl2 border border-accent/30 bg-accent/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Recibo {numeroRecibo(pagamento)}
            </p>
            <p className="font-display mt-1 text-3xl font-bold leading-none">
              {formatBRL(pagamento.valor)}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {alunoNome} · {labelCompetencia(pagamento.competencia)} · pago em{" "}
              {fmtData(dataDoRecibo(pagamento))}
              {pagamento.metodo ? ` · ${pagamento.metodo}` : ""}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={linkWhatsapp(reciboParaTexto(dados), telefone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-volt px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong"
            >
              <WhatsappIcon className="h-4 w-4" />
              Enviar no WhatsApp
            </a>
            <Button variant="outline" onClick={() => imprimirRecibo(dados)}>
              <DownloadIcon className="h-4 w-4" />
              Imprimir / PDF
            </Button>
          </div>

          <button
            onClick={copiar}
            className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            {copiado ? "Texto copiado ✓" : "Copiar texto do recibo"}
          </button>
        </div>
      )}
    </Modal>
  );
}
