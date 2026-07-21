import type { AlimentoBanco, PlanoAlimentar } from "@/lib/types";
import { indexarBanco, macrosDoItem, totaisDaRefeicao } from "@/lib/nutricao";
import { DropletIcon } from "./icons";

// Exibição somente-leitura das refeições de um plano. Reaproveitada no detalhe do
// aluno (personal) e no portal (aluno). Mostra macros calculados quando o alimento
// está vinculado ao banco.
export function PlanoAlimentarView({
  plano,
  banco,
}: {
  plano: PlanoAlimentar;
  banco: AlimentoBanco[];
}) {
  const bancoPorId = indexarBanco(banco);

  return (
    <div className="space-y-3">
      {plano.refeicoes.map((refeicao) => {
        const totalRef = totaisDaRefeicao(refeicao, bancoPorId);
        return (
          <div key={refeicao.id} className="rounded-xl border border-line bg-surface-2/30 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-sm font-semibold">{refeicao.nome}</p>
              {refeicao.horario && (
                <span className="text-xs font-semibold text-accent">{refeicao.horario}</span>
              )}
            </div>
            <ul className="mt-2 space-y-1.5">
              {refeicao.alimentos.map((alimento) => {
                const macros = macrosDoItem(alimento, bancoPorId);
                return (
                  <li key={alimento.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="text-text">{alimento.nome}</span>
                      {alimento.observacao && (
                        <span className="ml-1.5 text-xs text-muted">— {alimento.observacao}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      {alimento.quantidade && (
                        <span className="text-xs font-semibold text-muted">{alimento.quantidade}</span>
                      )}
                      {macros && (
                        <span className="block text-[11px] text-muted">{macros.kcal} kcal</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {totalRef.itensCalculados > 0 && (
              <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
                Subtotal:{" "}
                <span className="font-semibold text-text">{totalRef.macros.kcal} kcal</span> · P{" "}
                {totalRef.macros.proteinas} · C {totalRef.macros.carboidratos} · G{" "}
                {totalRef.macros.gorduras}
              </p>
            )}
            {refeicao.observacao && (
              <p className="mt-2 text-xs italic text-muted">{refeicao.observacao}</p>
            )}
          </div>
        );
      })}

      {plano.aguaLitros && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <DropletIcon className="h-4 w-4 text-sky-400" />
          Meta de água:{" "}
          <span className="font-semibold text-text">{plano.aguaLitros} L por dia</span>
        </p>
      )}

      {plano.observacoes && (
        <div className="rounded-xl border border-line bg-surface/40 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Observações</p>
          <p className="mt-1 text-sm leading-relaxed">{plano.observacoes}</p>
        </div>
      )}
    </div>
  );
}
