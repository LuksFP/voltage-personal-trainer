"use client";

import { useState } from "react";
import { LeafIcon } from "@/components/icons";
import { PlanoAlimentarView } from "@/components/PlanoAlimentarView";
import { MacrosPlanoVsMeta } from "@/components/MacrosPlanoVsMeta";
import { ListaDeCompras } from "@/components/ListaDeCompras";
import { distribuicaoMacros, temMetasDefinidas, totaisDoPlano } from "@/lib/nutricao";
import { useStore } from "@/lib/store";

const CORES_MACRO: Record<string, string> = {
  proteinas: "bg-volt",
  carboidratos: "bg-sky-400",
  gorduras: "bg-orange-400",
};

export function NutricaoPortal({ alunoId }: { alunoId: string }) {
  const store = useStore();
  const plano = store.planoAtivoDoAluno(alunoId);
  const [mostrarCompras, setMostrarCompras] = useState(false);

  if (!plano) return null;

  const fatias = distribuicaoMacros(plano.metas);
  const calculado = totaisDoPlano(plano, store.bancoAlimentos);

  return (
    <section className="space-y-3" aria-labelledby="nutricao-portal-titulo">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Plano alimentar
          </p>
          <h2 id="nutricao-portal-titulo" className="font-display mt-1 text-xl font-semibold">
            Sua dieta
          </h2>
        </div>
        {plano.metas.calorias !== undefined && (
          <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            {plano.metas.calorias} kcal/dia
          </span>
        )}
      </div>

      <article className="overflow-hidden rounded-xl2 border border-line bg-surface/70 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
            <LeafIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display truncate text-base font-semibold">{plano.titulo}</h3>
            {plano.objetivo && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{plano.objetivo}</p>
            )}
          </div>
        </div>

        {temMetasDefinidas(plano.metas) && fatias.length > 0 && (
          <div className="mt-4">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
              {fatias.map((fatia) => (
                <div
                  key={fatia.chave}
                  className={CORES_MACRO[fatia.chave]}
                  style={{ width: `${fatia.percentual}%` }}
                  title={`${fatia.rotulo}: ${fatia.gramas} g`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {fatias.map((fatia) => (
                <span key={fatia.chave} className="inline-flex items-center gap-1.5">
                  <span className={"h-2 w-2 rounded-full " + CORES_MACRO[fatia.chave]} />
                  {fatia.rotulo}{" "}
                  <span className="font-semibold text-text">{fatia.gramas} g</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {calculado.itensCalculados > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-accent">
              Total do dia
            </span>
            <span className="text-sm">
              <span className="font-display font-bold">{calculado.macros.kcal} kcal</span>
              <span className="ml-2 text-xs text-muted">
                P {calculado.macros.proteinas} · C {calculado.macros.carboidratos} · G{" "}
                {calculado.macros.gorduras}
              </span>
            </span>
          </div>
        )}

        <div className="mt-4">
          <MacrosPlanoVsMeta plano={plano} banco={store.bancoAlimentos} />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setMostrarCompras((v) => !v)}
            className="text-xs font-semibold text-accent hover:underline"
            aria-expanded={mostrarCompras}
          >
            {mostrarCompras ? "Ocultar lista de compras" : "🛒 Minha lista de compras"}
          </button>
          {mostrarCompras && (
            <div className="mt-3">
              <ListaDeCompras plano={plano} banco={store.bancoAlimentos} />
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <PlanoAlimentarView plano={plano} banco={store.bancoAlimentos} />
        </div>
      </article>
    </section>
  );
}
