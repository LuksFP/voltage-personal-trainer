"use client";

import { useState } from "react";
import type { AlimentoBanco, PlanoAlimentar } from "@/lib/types";
import { listaDeCompras, listaDeComprasTexto } from "@/lib/nutricao";
import { Button } from "./ui";
import { CheckIcon, CopyIcon } from "./icons";

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Lista de compras agregada do plano. Itens vinculados ao banco somam a
// quantidade; avulsos aparecem com suas quantidades em texto.
export function ListaDeCompras({
  plano,
  banco,
  telefone,
}: {
  plano: PlanoAlimentar;
  banco: AlimentoBanco[];
  telefone?: string;
}) {
  const grupos = listaDeCompras(plano, banco);
  const [copiado, setCopiado] = useState(false);

  if (grupos.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface-2/25 px-3 py-4 text-center text-sm text-muted">
        Nenhum alimento no plano ainda.
      </p>
    );
  }

  const texto = `🛒 Lista de compras — ${plano.titulo}\n\n${listaDeComprasTexto(grupos)}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const zap = telefone?.replace(/\D/g, "");
  const linkWhats = zap
    ? `https://wa.me/${zap.length <= 11 ? "55" + zap : zap}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copiar} className="!px-3 !py-2 text-xs">
          {copiado ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          {copiado ? "Copiado!" : "Copiar lista"}
        </Button>
        <a
          href={linkWhats}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-accent/50"
        >
          Enviar no WhatsApp
        </a>
      </div>

      <div className="space-y-3">
        {grupos.map((grupo) => (
          <div key={grupo.categoria} className="rounded-xl border border-line bg-surface-2/25 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
              {grupo.rotulo}
            </p>
            <ul className="mt-2 space-y-1.5">
              {grupo.itens.map((item) => (
                <li
                  key={item.chave}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 text-text">{item.nome}</span>
                  <span className="shrink-0 text-right text-xs font-semibold text-muted">
                    {item.vinculado && item.quantidadeTotal !== undefined
                      ? `${fmt(item.quantidadeTotal)} ${item.unidade ?? ""}`.trim()
                      : item.detalhes.length > 0
                        ? item.detalhes.join(" + ")
                        : item.ocorrencias > 1
                          ? `${item.ocorrencias}×`
                          : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
