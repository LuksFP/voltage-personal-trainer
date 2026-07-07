"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Divisao, Treino } from "@/lib/types";
import { cx } from "@/components/ui";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  DumbbellIcon,
  PlayIcon,
  TargetIcon,
} from "@/components/icons";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dataExtenso(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export default function PortalPage() {
  const params = useParams<{ codigo: string }>();
  const { getAluno, treinosDoAluno, sessoes } = useStore();
  const aluno = getAluno(params.codigo);

  const hoje = isoLocal(new Date());

  const treinoAtivo = useMemo<Treino | undefined>(() => {
    if (!aluno) return undefined;
    const ts = treinosDoAluno(aluno.id);
    return ts.find((t) => t.ativo) ?? ts[0];
  }, [aluno, treinosDoAluno]);

  const proximas = useMemo(() => {
    if (!aluno) return [];
    return sessoes
      .filter((s) => s.alunoId === aluno.id && s.status !== "faltou" && s.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora))
      .slice(0, 3);
  }, [aluno, sessoes, hoje]);

  if (!aluno) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-accent">
            <DumbbellIcon className="h-7 w-7" />
          </span>
          <p className="font-display mt-4 text-xl font-semibold">Link inválido</p>
          <p className="mt-2 text-sm text-muted">
            Este acesso não existe mais. Peça um novo link ao seu personal.
          </p>
        </div>
      </div>
    );
  }

  const primeiro = aluno.nome.split(" ")[0];

  return (
    <div className="min-h-screen pb-16">
      {/* Topo */}
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-volt text-ink">
              <DumbbellIcon className="h-4 w-4" />
            </span>
            <span className="font-display font-bold tracking-tight">
              Volt<span className="text-accent">age</span>
            </span>
          </span>
          <span className="text-sm font-semibold text-muted">Portal do aluno</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-5 py-7">
        {/* Saudação */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Olá</p>
          <h1 className="font-display mt-1 text-4xl font-bold leading-none">{primeiro} 👋</h1>
          {aluno.pesoMeta != null && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold text-muted">
              <TargetIcon className="h-4 w-4 text-accent" />
              Meta de peso: {aluno.pesoMeta} kg
            </p>
          )}
        </div>

        {/* Próximas sessões */}
        <section>
          <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-semibold">
            <CalendarIcon className="h-5 w-5 text-accent" />
            Próximos treinos
          </h2>
          {proximas.length === 0 ? (
            <div className="rounded-xl2 border border-line bg-surface/70 px-4 py-6 text-center text-sm text-muted">
              Nenhum treino agendado por enquanto.
            </div>
          ) : (
            <div className="space-y-2">
              {proximas.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl2 border border-line bg-surface/70 p-3.5"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-center leading-none">
                    <span className="font-display text-base font-bold text-accent">{s.hora}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold capitalize">
                      {s.data === hoje ? "Hoje" : dataExtenso(s.data)}
                    </p>
                    {s.foco && <p className="truncate text-sm text-muted">{s.foco}</p>}
                  </div>
                  {s.status === "realizada" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                      <CheckIcon className="h-3.5 w-3.5" /> Feito
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Treino */}
        <section>
          <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-semibold">
            <DumbbellIcon className="h-5 w-5 text-accent" />
            {treinoAtivo ? treinoAtivo.nome : "Seu treino"}
          </h2>

          {!treinoAtivo || treinoAtivo.divisoes.length === 0 ? (
            <div className="rounded-xl2 border border-line bg-surface/70 px-4 py-8 text-center text-sm text-muted">
              Seu personal ainda não montou seu treino. Assim que montar, aparece aqui.
            </div>
          ) : (
            <div className="space-y-3">
              {treinoAtivo.divisoes.map((d, i) => (
                <DivisaoCard
                  key={d.id}
                  alunoId={aluno.id}
                  divisao={d}
                  hoje={hoje}
                  aberturaInicial={i === 0}
                />
              ))}
            </div>
          )}
        </section>

        <p className="pt-4 text-center text-xs text-muted">
          Feito com Voltage · fale com seu personal para dúvidas
        </p>
      </main>
    </div>
  );
}

function DivisaoCard({
  alunoId,
  divisao,
  hoje,
  aberturaInicial,
}: {
  alunoId: string;
  divisao: Divisao;
  hoje: string;
  aberturaInicial: boolean;
}) {
  const { sessoes, addSessao, getExercicioBiblioteca } = useStore();
  const [aberto, setAberto] = useState(aberturaInicial);
  const [feitos, setFeitos] = useState<Set<string>>(new Set());

  // Já registrou este treino hoje?
  const concluidoHoje = sessoes.some(
    (s) =>
      s.alunoId === alunoId &&
      s.data === hoje &&
      s.status === "realizada" &&
      s.foco === divisao.nome,
  );

  const toggle = (id: string) =>
    setFeitos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const total = divisao.exercicios.length;
  const done = divisao.exercicios.filter((e) => feitos.has(e.id)).length;

  const concluir = () => {
    const agora = new Date();
    addSessao({
      alunoId,
      data: hoje,
      hora: `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`,
      foco: divisao.nome,
      status: "realizada",
    });
  };

  return (
    <div className="overflow-hidden rounded-xl2 border border-line bg-surface/70">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="h-5 w-1.5 shrink-0 rounded-full bg-volt" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{divisao.nome}</p>
          <p className="text-xs text-muted">
            {total} exercício{total === 1 ? "" : "s"}
            {concluidoHoje ? " · feito hoje ✓" : done > 0 ? ` · ${done}/${total} marcados` : ""}
          </p>
        </div>
        <ChevronRightIcon
          className={cx("h-5 w-5 shrink-0 text-muted transition-transform", aberto && "rotate-90")}
        />
      </button>

      {aberto && (
        <div className="border-t border-line">
          <ul className="divide-y divide-line">
            {divisao.exercicios.map((ex) => {
              const bib = ex.bibliotecaId ? getExercicioBiblioteca(ex.bibliotecaId) : undefined;
              const marcado = feitos.has(ex.id);
              return (
                <li key={ex.id} className="flex items-start gap-3 p-4">
                  <button
                    onClick={() => toggle(ex.id)}
                    className={cx(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors",
                      marcado
                        ? "border-volt bg-volt text-ink"
                        : "border-line text-transparent hover:border-accent/60",
                    )}
                    aria-label={marcado ? "Desmarcar" : "Marcar como feito"}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cx("font-semibold", marcado && "text-muted line-through")}>
                      {ex.nome}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
                      <span className="font-semibold text-text">
                        {ex.series} × {ex.repeticoes}
                      </span>
                      {ex.carga && <span>· {ex.carga}</span>}
                      <span className="inline-flex items-center gap-1">
                        · <ClockIcon className="h-3.5 w-3.5" />
                        {ex.descanso}
                      </span>
                    </p>
                    {ex.observacoes && <p className="mt-0.5 text-xs text-muted">{ex.observacoes}</p>}
                    {bib?.videoUrl && (
                      <a
                        href={bib.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                        Como fazer
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="p-4">
            {concluidoHoje ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/10 py-3 text-sm font-semibold text-accent">
                <CheckIcon className="h-4 w-4" />
                Treino registrado hoje
              </div>
            ) : (
              <button
                onClick={concluir}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-volt py-3 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong"
              >
                <CheckIcon className="h-4 w-4" />
                Concluir treino de hoje
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
