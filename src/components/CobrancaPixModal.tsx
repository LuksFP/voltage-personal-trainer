"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { linkWhatsapp } from "@/lib/compartilhar";
import { formatBRL, labelCompetencia } from "@/lib/pagamentos";
import { gerarPixCopiaECola } from "@/lib/pix";
import type { Pagamento } from "@/lib/types";
import { Modal } from "./Modal";
import { Button } from "./ui";
import { CheckIcon, WhatsappIcon } from "./icons";
import { fmtData } from "@/lib/data";

/** TxID cai no extrato do personal: mês + fim do id da cobrança. */
function txidDaCobranca(p: Pagamento): string {
  return `VLT${p.competencia.replace("-", "")}${p.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4)}`;
}

export function mensagemCobrancaPix(
  p: Pagamento,
  alunoNome: string,
  codigo: string,
  personalNome?: string,
): string {
  const primeiro = alunoNome.split(" ")[0];
  return [
    `Oi ${primeiro}! Segue a mensalidade de ${labelCompetencia(p.competencia)}: *${formatBRL(p.valor)}* (vence ${fmtData(p.vencimento)}).`,
    "",
    "Pix copia e cola:",
    codigo,
    "",
    `Assim que cair eu te mando o recibo. 💪${personalNome ? `\n— ${personalNome}` : ""}`,
  ].join("\n");
}

export function CobrancaPixModal({
  pagamento,
  alunoNome,
  telefone,
  onClose,
  onRecebido,
}: {
  pagamento: Pagamento | null;
  alunoNome: string;
  telefone?: string;
  onClose: () => void;
  onRecebido: () => void;
}) {
  const { personal } = useAuth();
  const [copiado, setCopiado] = useState(false);

  const pix = useMemo(() => {
    if (!pagamento || !personal?.pixChave) return null;
    return gerarPixCopiaECola({
      chave: personal.pixChave,
      tipoChave: personal.pixTipo,
      nome: personal.pixNome ?? personal.nome,
      cidade: personal.pixCidade ?? "",
      valor: pagamento.valor,
      txid: txidDaCobranca(pagamento),
      descricao: `Mensalidade ${labelCompetencia(pagamento.competencia)}`,
    });
  }, [pagamento, personal]);

  const codigo = pix?.ok ? pix.codigo : null;

  const copiar = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
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
      title="Cobrar no Pix"
    >
      {!pagamento ? null : !personal?.pixChave ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Cadastre sua chave Pix no perfil e o código de cobrança passa a sair pronto aqui,
            já com o valor e o mês da mensalidade.
          </p>
          <Link href="/perfil">
            <Button className="w-full">Cadastrar chave Pix</Button>
          </Link>
        </div>
      ) : !codigo ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-danger">
            {pix && !pix.ok ? pix.erro : "Não consegui montar o código."}
          </p>
          <Link href="/perfil">
            <Button variant="outline" className="w-full">
              Revisar dados do Pix
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl2 border border-line bg-surface-2/50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              {alunoNome} · {labelCompetencia(pagamento.competencia)}
            </p>
            <p className="font-display mt-1 text-3xl font-bold leading-none text-accent">
              {formatBRL(pagamento.valor)}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              Vence {fmtData(pagamento.vencimento)} · cai na sua conta
              {personal.pixCidade ? ` (${personal.pixCidade})` : ""}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">Pix copia e cola</p>
            <p className="max-h-32 overflow-y-auto break-all rounded-xl border border-line bg-surface-2/40 p-3 font-mono text-[11px] leading-relaxed text-muted">
              {codigo}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={copiar}>
              {copiado ? "Copiado ✓" : "Copiar código"}
            </Button>
            <a
              href={linkWhatsapp(
                mensagemCobrancaPix(pagamento, alunoNome, codigo, personal.nome),
                telefone,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-volt px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong"
            >
              <WhatsappIcon className="h-4 w-4" />
              Mandar no WhatsApp
            </a>
          </div>

          <button
            onClick={onRecebido}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <CheckIcon className="h-4 w-4" />
            Já caiu — marcar como recebido
          </button>
        </div>
      )}
    </Modal>
  );
}
