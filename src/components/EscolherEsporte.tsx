"use client";

import { useState } from "react";
import {
  ESPORTES,
  esporteInfo,
  semanaApertada,
  type EsportePratica,
} from "@/lib/gerador-treino";
import { DIAS_CURTOS, DIAS_LONGOS } from "@/lib/dias-treino";
import { cx } from "@/components/ui";

/**
 * Escolha do esporte que o aluno pratica além da academia.
 *
 * Não é enfeite de cadastro: o gerador usa isso pra fugir dos dias em que ele
 * já treina, reforçar o que o esporte não trabalha e aliviar o que ele já
 * castiga. Por isso a tela mostra, em texto, o que vai mudar na planilha.
 */
export function EscolherEsporte({
  valor,
  diasTreino,
  aoMudar,
}: {
  valor: EsportePratica | undefined;
  /** Quantos dias de musculação por semana — usado pra avisar de semana cheia. */
  diasTreino: number;
  aoMudar: (esporte: EsportePratica | undefined) => void;
}) {
  // "Outro" fica aberto enquanto o nome digitado não bate com a lista.
  const [outro, setOutro] = useState(
    () => Boolean(valor && !esporteInfo(valor.nome)),
  );
  const info = esporteInfo(valor?.nome);
  const apertada = semanaApertada(diasTreino, valor?.dias);

  const escolher = (nome: string) => {
    setOutro(false);
    aoMudar({ nome, dias: valor?.dias ?? [] });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <Chip ativo={!valor} onClick={() => { setOutro(false); aoMudar(undefined); }}>
          Só musculação
        </Chip>
        {ESPORTES.map((esporte) => (
          <Chip
            key={esporte.nome}
            ativo={valor?.nome === esporte.nome}
            onClick={() => escolher(esporte.nome)}
          >
            {esporte.nome}
          </Chip>
        ))}
        <Chip
          ativo={outro}
          onClick={() => {
            setOutro(true);
            aoMudar({ nome: "", dias: valor?.dias ?? [] });
          }}
        >
          Outro
        </Chip>
      </div>

      {outro && (
        <input
          autoFocus
          value={valor?.nome ?? ""}
          onChange={(evento) =>
            aoMudar({ nome: evento.target.value, dias: valor?.dias ?? [] })
          }
          placeholder="Qual esporte?"
          aria-label="Nome do esporte"
          className="mt-3 w-full border-b-2 border-line bg-transparent pb-2 text-xl font-semibold outline-none transition-colors placeholder:text-muted/40 focus:border-volt"
        />
      )}

      {valor && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-muted">Em que dias você treina?</p>
          <div className="mt-2 flex gap-1">
            {DIAS_CURTOS.map((rotulo, dia) => {
              const ativo = valor.dias.includes(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() =>
                    aoMudar({
                      ...valor,
                      dias: ativo
                        ? valor.dias.filter((item) => item !== dia)
                        : [...valor.dias, dia].sort((a, b) => a - b),
                    })
                  }
                  aria-pressed={ativo}
                  aria-label={DIAS_LONGOS[dia]}
                  title={DIAS_LONGOS[dia]}
                  className={cx(
                    "h-10 flex-1 rounded-lg text-sm font-bold transition-colors",
                    ativo
                      ? "bg-volt text-ink"
                      : "bg-surface-2 text-muted hover:bg-surface-2/70 hover:text-text",
                  )}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>

          {info ? (
            <p className="mt-4 border-l-2 border-volt pl-3 text-sm text-muted">{info.resumo}</p>
          ) : (
            valor.nome.trim().length > 1 && (
              <p className="mt-4 border-l-2 border-line pl-3 text-sm text-muted">
                Não conheço {valor.nome.trim()} pra ajustar a ênfase, mas já deixo os dias de
                academia longe dos seus treinos.
              </p>
            )
          )}

          {apertada && (
            <p className="mt-3 text-sm font-semibold text-danger">
              Com {valor.dias.length} dias de {valor.nome.trim() || "esporte"} e {diasTreino} de
              academia, vai sobrar dia com os dois. Dá pra fazer — só não faça perna pesada antes
              do treino.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cx(
        "rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
        ativo
          ? "border-volt bg-volt text-ink"
          : "border-line text-muted hover:border-accent/50 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
