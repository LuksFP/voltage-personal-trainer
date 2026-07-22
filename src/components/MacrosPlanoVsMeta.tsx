import type { AlimentoBanco, PlanoAlimentar } from "@/lib/types";
import { compararPlanoComMeta, type ComparacaoMacro } from "@/lib/nutricao";
import { cx } from "./ui";

const COR_MACRO: Record<ComparacaoMacro["chave"], string> = {
  kcal: "bg-accent",
  proteinas: "bg-volt",
  carboidratos: "bg-sky-400",
  gorduras: "bg-orange-400",
};

// Verde perto da meta (90–110%), âmbar fora disso.
function tonalidade(percentual?: number): "ok" | "fora" | "neutro" {
  if (percentual === undefined) return "neutro";
  return percentual >= 90 && percentual <= 110 ? "ok" : "fora";
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: n >= 100 ? 0 : 1 });
}

// Compara o total montado do plano com as metas de macro, por linha.
export function MacrosPlanoVsMeta({
  plano,
  banco,
}: {
  plano: PlanoAlimentar;
  banco: AlimentoBanco[];
}) {
  const { linhas, temMeta, itensCalculados } = compararPlanoComMeta(plano, banco);

  // Sem meta OU sem alimento vinculado calculável: não há o que comparar.
  if (!temMeta || itensCalculados === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-2/25 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          Plano montado × meta
        </p>
        <p className="text-[10px] text-muted">{itensCalculados} alimento(s) calculado(s)</p>
      </div>
      <div className="space-y-2.5">
        {linhas.map((linha) => {
          const estado = tonalidade(linha.percentual);
          const largura =
            linha.meta && linha.meta > 0
              ? Math.min(100, (linha.planejado / linha.meta) * 100)
              : 0;
          return (
            <div key={linha.chave}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-text">{linha.rotulo}</span>
                <span className="tabular-nums text-muted">
                  <span className="font-semibold text-text">{fmt(linha.planejado)}</span>
                  {linha.meta !== undefined ? (
                    <>
                      {" / "}
                      {fmt(linha.meta)} {linha.unidade}
                      <span
                        className={cx(
                          "ml-1.5 font-bold",
                          estado === "ok"
                            ? "text-accent"
                            : estado === "fora"
                              ? "text-orange-400"
                              : "text-muted",
                        )}
                      >
                        {linha.percentual}%
                      </span>
                    </>
                  ) : (
                    <span className="ml-1">{linha.unidade} · sem meta</span>
                  )}
                </span>
              </div>
              {linha.meta !== undefined && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cx(
                      "h-full rounded-full transition-all",
                      estado === "fora" ? "bg-orange-400" : COR_MACRO[linha.chave],
                    )}
                    style={{ width: `${largura}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
