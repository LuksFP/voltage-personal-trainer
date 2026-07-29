"use client";

import { useStore } from "@/lib/store";
import type { EsportePratica } from "@/lib/gerador-treino";
import { DIAS_LONGOS } from "@/lib/dias-treino";
import { CheckIcon, FlameIcon } from "@/components/icons";
import { cx } from "@/components/ui";

/**
 * Registro do treino do esporte no app do aluno.
 *
 * Quem luta ou nada três vezes por semana treinou — mesmo sem abrir a planilha
 * de musculação. Sem isso, a sequência quebrava e a meta da semana mentia. A
 * sessão gravada é a mesma entidade do treino da academia, então cai sozinha no
 * histórico, na sequência e nos relatórios do personal (quando houver).
 */
export function SessaoEsporte({
  alunoId,
  esporte,
  hoje,
}: {
  alunoId: string;
  esporte: EsportePratica;
  hoje: string;
}) {
  const { sessoes, addSessao, removeSessao } = useStore();
  const nome = esporte.nome;

  const registrada = sessoes.find(
    (sessao) =>
      sessao.alunoId === alunoId &&
      sessao.data === hoje &&
      sessao.status === "realizada" &&
      sessao.foco === nome,
  );
  const diaMarcado = esporte.dias.includes(new Date(`${hoje}T00:00:00`).getDay());

  const registrar = () => {
    const agora = new Date();
    addSessao({
      alunoId,
      data: hoje,
      hora: `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`,
      foco: nome,
      status: "realizada",
    });
  };

  return (
    <section
      className={cx(
        "flex items-center gap-3 border-l-2 py-1 pl-4",
        registrada ? "border-accent" : diaMarcado ? "border-volt" : "border-line",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">{nome}</p>
        <p className="mt-0.5 text-sm text-muted">
          {registrada
            ? `Registrado às ${registrada.hora}. Conta na sua semana.`
            : diaMarcado
              ? `${DIAS_LONGOS[new Date(`${hoje}T00:00:00`).getDay()]} é seu dia de ${nome.toLowerCase()}.`
              : `Treinou ${nome.toLowerCase()} fora da rotina? Marque aqui.`}
        </p>
      </div>
      {registrada ? (
        <button
          type="button"
          onClick={() => removeSessao(registrada.id)}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-danger"
        >
          Desfazer
        </button>
      ) : (
        <button
          type="button"
          onClick={registrar}
          className={cx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5",
            diaMarcado ? "bg-volt text-ink" : "bg-surface-2 text-text",
          )}
        >
          {diaMarcado ? <FlameIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
          Fiz hoje
        </button>
      )}
    </section>
  );
}
