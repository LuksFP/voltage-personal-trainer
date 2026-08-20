"use client";

import { useStore } from "@/lib/store";
import { resumoDaExecucao, volumeExato } from "@/lib/historico-exercicios";
import { Card } from "@/components/ui";
import { CalendarIcon, CheckIcon, ClockIcon, DumbbellIcon } from "@/components/icons";
import { somarDias } from "@/lib/data";

function dataCompleta(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PortalHistorico({ alunoId, hoje }: { alunoId: string; hoje: string }) {
  const { sessoes, historicoExercicios } = useStore();
  const realizadas = sessoes
    .filter((sessao) => sessao.alunoId === alunoId && sessao.status === "realizada")
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
  const ultimos30 = realizadas.filter((sessao) => sessao.data >= somarDias(hoje, -(29)));
  const minutos = ultimos30.reduce((total, sessao) => total + (sessao.duracaoMin ?? 0), 0);
  const registros = historicoExercicios.filter((registro) => registro.alunoId === alunoId);
  const volume30 = registros
    .filter((registro) => registro.data >= somarDias(hoje, -(29)))
    .reduce((total, registro) => total + (volumeExato(registro) ?? 0), 0);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Histórico</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Treinos concluídos</h2>
        <p className="mt-1 text-sm text-muted">Suas sessões, cargas e feedbacks mais recentes.</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Numero label="treinos em 30d" valor={String(ultimos30.length)} icon={<CheckIcon className="h-4 w-4" />} />
        <Numero
          label="tempo treinado"
          valor={minutos >= 60 ? `${Math.floor(minutos / 60)}h${minutos % 60 ? ` ${minutos % 60}m` : ""}` : `${minutos}m`}
          icon={<ClockIcon className="h-4 w-4" />}
        />
        <Numero
          label="volume em 30d"
          valor={volume30 > 0 ? `${Math.round(volume30 / 100) / 10}t` : "—"}
          icon={<DumbbellIcon className="h-4 w-4" />}
        />
      </div>

      {realizadas.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">
          Seu primeiro treino concluído aparecerá aqui.
        </Card>
      ) : (
        <section className="space-y-2">
          {realizadas.slice(0, 20).map((sessao) => {
            const exercicios = registros.filter((registro) => registro.sessaoId === sessao.id);
            const series = exercicios.reduce(
              (total, registro) =>
                total + (registro.formato === "por-serie" ? registro.seriesExecutadas.length : 0),
              0,
            );
            return (
              <details key={sessao.id} className="group rounded-xl2 border border-line bg-surface/70">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{sessao.foco ?? "Sessão de treino"}</p>
                    <p className="mt-0.5 text-xs capitalize text-muted">
                      {dataCompleta(sessao.data)} · {sessao.hora}
                    </p>
                  </div>
                  <span className="text-right text-[10px] text-muted">
                    {exercicios.length > 0 ? `${exercicios.length} ex. · ${series} séries` : `${sessao.duracaoMin ?? "—"} min`}
                  </span>
                </summary>
                <div className="border-t border-line px-4 py-3">
                  {exercicios.length > 0 ? (
                    <div className="divide-y divide-[var(--color-line)]">
                      {exercicios.map((exercicio) => {
                        const resumo = resumoDaExecucao(exercicio);
                        return (
                          <div key={exercicio.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                            <span className="truncate font-semibold">{exercicio.nome}</span>
                            <span className="shrink-0 text-muted">
                              {resumo.series}×{resumo.repeticoes}
                              {resumo.carga ? ` · ${resumo.carga}` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Esta sessão não possui séries detalhadas.</p>
                  )}
                  {sessao.feedback && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3 text-[10px] font-semibold text-muted">
                      <span className="rounded-full bg-surface-2 px-2 py-1">Dificuldade {sessao.feedback.dificuldade}/5</span>
                      <span className="rounded-full bg-surface-2 px-2 py-1">Energia {sessao.feedback.energia}/5</span>
                      <span className="rounded-full bg-surface-2 px-2 py-1">{sessao.feedback.dor}</span>
                    </div>
                  )}
                  {sessao.feedback?.observacoes && (
                    <p className="mt-2 text-xs leading-relaxed text-muted">{sessao.feedback.observacoes}</p>
                  )}
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Numero({ label, valor, icon }: { label: string; valor: string; icon: React.ReactNode }) {
  return (
    <Card className="min-w-0 p-3">
      <span className="text-accent">{icon}</span>
      <p className="font-display mt-2 truncate text-xl font-bold">{valor}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted">{label}</p>
    </Card>
  );
}
