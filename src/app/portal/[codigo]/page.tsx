"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Treino } from "@/lib/types";
import { resumoDoPacote } from "@/lib/pacotes";
import {
  escolherTreinoDoDia,
  rotuloDias,
  ultimaDivisaoConcluida,
} from "@/lib/dias-treino";
import { TreinoEmAndamento } from "@/components/portal/TreinoEmAndamento";
import { CheckinSemanalPortal } from "@/components/portal/CheckinSemanalPortal";
import { HabitosDiariosPortal } from "@/components/portal/HabitosDiariosPortal";
import { RelatorioSemanalPortal } from "@/components/portal/RelatorioSemanalPortal";
import { AnamnesePortal } from "@/components/portal/AnamnesePortal";
import { MetasPortal } from "@/components/portal/MetasPortal";
import { NutricaoPortal } from "@/components/portal/NutricaoPortal";
import { ConquistasPortal } from "@/components/portal/ConquistasPortal";
import { PortalResumo } from "@/components/portal/PortalResumo";
import { PortalEvolucao } from "@/components/portal/PortalEvolucao";
import { PortalHistorico } from "@/components/portal/PortalHistorico";
import { cx } from "@/components/ui";
import {
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  DumbbellIcon,
  GridIcon,
  TargetIcon,
} from "@/components/icons";

type AbaPortal = "inicio" | "treino" | "evolucao" | "historico";

const ABAS: { id: AbaPortal; label: string; icon: typeof GridIcon }[] = [
  { id: "inicio", label: "Início", icon: GridIcon },
  { id: "treino", label: "Treino", icon: DumbbellIcon },
  { id: "evolucao", label: "Evolução", icon: ChartIcon },
  { id: "historico", label: "Histórico", icon: CalendarIcon },
];

function isoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
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
  const { getAluno, treinosDoAluno, sessoes, pacotesDoAluno, metasDoAluno } = useStore();
  const aluno = getAluno(params.codigo);
  const hoje = isoLocal(new Date());
  const [aba, setAba] = useState<AbaPortal>("inicio");

  const treinoAtivo = useMemo<Treino | undefined>(() => {
    if (!aluno) return undefined;
    const treinos = treinosDoAluno(aluno.id);
    return treinos.find((treino) => treino.ativo) ?? treinos[0];
  }, [aluno, treinosDoAluno]);

  const diaSemana = new Date().getDay();
  const escolhaTreino = useMemo(() => {
    const ultima = aluno ? ultimaDivisaoConcluida(sessoes, aluno.id) : null;
    return escolherTreinoDoDia(treinoAtivo?.divisoes ?? [], diaSemana, ultima);
  }, [aluno, sessoes, treinoAtivo, diaSemana]);

  const divisaoDeHoje =
    escolhaTreino.tipo === "agendado" || escolhaTreino.tipo === "rodizio"
      ? escolhaTreino.divisao
      : undefined;
  const treinoHojeConcluido = Boolean(
    aluno &&
      divisaoDeHoje &&
      sessoes.some(
        (s) =>
          s.alunoId === aluno.id &&
          s.data === hoje &&
          s.status === "realizada" &&
          (s.divisaoId === divisaoDeHoje.id || s.foco === divisaoDeHoje.nome),
      ),
  );

  const proximas = useMemo(() => {
    if (!aluno) return [];
    return sessoes
      .filter(
        (sessao) =>
          sessao.alunoId === aluno.id && sessao.status === "agendada" && sessao.data >= hoje,
      )
      .sort(
        (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
      )
      .slice(0, 3);
  }, [aluno, sessoes, hoje]);
  const pacotes = aluno ? pacotesDoAluno(aluno.id) : [];
  const pacoteAtual =
    pacotes.find((pacote) => resumoDoPacote(pacote, sessoes, hoje).status === "ativo") ??
    pacotes[0];
  const resumoPacote = pacoteAtual ? resumoDoPacote(pacoteAtual, sessoes, hoje) : undefined;
  const temMetaPesoAtiva = aluno
    ? metasDoAluno(aluno.id).some((meta) => meta.status === "ativa" && meta.tipo === "peso")
    : false;

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

  const primeiroNome = aluno.nome.split(" ")[0];

  return (
    <div className="min-h-screen pb-16">
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

      <main className="mx-auto max-w-lg space-y-6 px-5 py-7">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Olá</p>
          <h1 className="font-display mt-1 text-4xl font-bold leading-none">{primeiroNome} 👋</h1>
          {aluno.pesoMeta != null && !temMetaPesoAtiva && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold text-muted">
              <TargetIcon className="h-4 w-4 text-accent" />
              Meta de peso: {aluno.pesoMeta} kg
            </p>
          )}
        </div>

        <nav
          className="sticky top-[65px] z-[9] grid grid-cols-4 gap-1 rounded-xl border border-line bg-bg/90 p-1.5 shadow-lg shadow-black/10 backdrop-blur-md"
          aria-label="Seções do portal"
        >
          {ABAS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id)}
                className={cx(
                  "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold transition-colors",
                  aba === item.id
                    ? "bg-volt text-ink"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
                aria-current={aba === item.id ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {aba === "inicio" && (
          <div className="space-y-7">
            <PortalResumo
              alunoId={aluno.id}
              hoje={hoje}
              onAbrirEvolucao={() => setAba("evolucao")}
            />

            <ConquistasPortal alunoId={aluno.id} />

            <MetasPortal alunoId={aluno.id} />

            <NutricaoPortal alunoId={aluno.id} hoje={hoje} />

            <AnamnesePortal alunoId={aluno.id} />

            <RelatorioSemanalPortal alunoId={aluno.id} />

            <HabitosDiariosPortal alunoId={aluno.id} hoje={hoje} />

            {pacoteAtual && resumoPacote && (
              <section className="rounded-xl2 border border-accent/25 bg-accent/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-accent">
                      Seu pacote
                    </p>
                    <h2 className="font-display mt-1 text-lg font-semibold">{pacoteAtual.nome}</h2>
                    <p className="mt-1 text-xs text-muted">
                      Válido até {pacoteAtual.dataValidade.split("-").reverse().join("/")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-accent">{resumoPacote.restantes}</p>
                    <p className="text-xs font-semibold text-muted">
                      aula{resumoPacote.restantes === 1 ? "" : "s"} restante
                      {resumoPacote.restantes === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-volt"
                    style={{ width: `${Math.min(100, resumoPacote.percentual)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {resumoPacote.realizadas} de {resumoPacote.contratadas} realizadas
                  {resumoPacote.agendadasFuturas > 0
                    ? ` · ${resumoPacote.agendadasFuturas} já agendada${resumoPacote.agendadasFuturas === 1 ? "" : "s"}`
                    : ""}
                </p>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                  <CalendarIcon className="h-5 w-5 text-accent" />
                  Próximos treinos
                </h2>
                <button
                  type="button"
                  onClick={() => setAba("treino")}
                  className="text-xs font-semibold text-accent"
                >
                  Abrir treino
                </button>
              </div>
              {proximas.length === 0 ? (
                <div className="rounded-xl2 border border-line bg-surface/70 px-4 py-6 text-center text-sm text-muted">
                  Nenhum treino agendado por enquanto.
                </div>
              ) : (
                <div className="space-y-2">
                  {proximas.map((sessao) => (
                    <button
                      type="button"
                      onClick={() => setAba("treino")}
                      key={sessao.id}
                      className="flex w-full items-center gap-3 rounded-xl2 border border-line bg-surface/70 p-3.5 text-left transition-colors hover:border-accent/35"
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-center leading-none">
                        <span className="font-display text-base font-bold text-accent">
                          {sessao.hora}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold capitalize">
                          {sessao.data === hoje ? "Hoje" : dataExtenso(sessao.data)}
                        </p>
                        {sessao.foco && <p className="truncate text-sm text-muted">{sessao.foco}</p>}
                      </div>
                      {sessao.status === "realizada" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                          <CheckIcon className="h-3.5 w-3.5" /> Feito
                        </span>
                      )}
                      {sessao.status === "cancelada" && (
                        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                          Cancelada
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <CheckinSemanalPortal alunoId={aluno.id} hoje={hoje} />
          </div>
        )}

        {aba === "treino" && (
          <section>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Treino em andamento</p>
              <h2 className="font-display mt-1 flex items-center gap-2 text-2xl font-semibold">
                <DumbbellIcon className="h-5 w-5 text-accent" />
                {treinoAtivo ? treinoAtivo.nome : "Seu treino"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Registre cada série. Seu progresso fica salvo neste aparelho até concluir.
              </p>
            </div>

            {!treinoAtivo || treinoAtivo.divisoes.length === 0 ? (
              <div className="rounded-xl2 border border-line bg-surface/70 px-4 py-8 text-center text-sm text-muted">
                Seu personal ainda não montou seu treino. Assim que montar, aparece aqui.
              </div>
            ) : (
              <>
                {/* ── Card "Treino de hoje" ─────────────────────────── */}
                {divisaoDeHoje ? (
                  <div
                    className={cx(
                      "mb-4 rounded-xl2 border p-5",
                      treinoHojeConcluido
                        ? "border-accent/30 bg-accent/8"
                        : "border-volt/40 bg-gradient-to-br from-volt/12 to-transparent",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-accent">
                        {treinoHojeConcluido
                          ? "Treino de hoje concluído"
                          : escolhaTreino.tipo === "rodizio"
                            ? "Próximo no rodízio"
                            : "Treino de hoje"}
                      </p>
                      {escolhaTreino.tipo === "agendado" &&
                        rotuloDias(divisaoDeHoje.diasSemana) && (
                          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">
                            {rotuloDias(divisaoDeHoje.diasSemana)}
                          </span>
                        )}
                    </div>
                    <h3 className="font-display mt-1.5 text-2xl font-bold leading-tight">
                      {divisaoDeHoje.nome}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {divisaoDeHoje.exercicios.length} exercício
                      {divisaoDeHoje.exercicios.length === 1 ? "" : "s"}
                      {escolhaTreino.tipo === "rodizio" && " · sugerido pelo seu histórico"}
                    </p>
                    {treinoHojeConcluido ? (
                      <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2 text-sm font-semibold text-accent">
                        <CheckIcon className="h-4 w-4" /> Mandou bem! Treino registrado hoje.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("treino-hoje")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-volt px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5"
                      >
                        <DumbbellIcon className="h-4 w-4" />
                        Começar treino
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl2 border border-line bg-surface/70 px-4 py-6 text-center">
                    <p className="font-display text-lg font-semibold">Dia de descanso 🌙</p>
                    <p className="mt-1 text-sm text-muted">
                      Hoje não há treino agendado. Recupere bem — se quiser adiantar, é só abrir
                      um treino abaixo.
                    </p>
                  </div>
                )}

                {/* ── Divisões: a de hoje aberta e primeiro ─────────── */}
                <div className="space-y-3">
                  {[...treinoAtivo.divisoes]
                    .sort((a, b) => {
                      const ordem = (id: string) => (id === divisaoDeHoje?.id ? 0 : 1);
                      return ordem(a.id) - ordem(b.id);
                    })
                    .map((divisao) => {
                      const ehHoje = divisao.id === divisaoDeHoje?.id;
                      return (
                        <div
                          key={divisao.id}
                          id={ehHoje ? "treino-hoje" : undefined}
                          className="scroll-mt-32"
                        >
                          <TreinoEmAndamento
                            alunoId={aluno.id}
                            treinoId={treinoAtivo.id}
                            treinoNome={treinoAtivo.nome}
                            divisao={divisao}
                            hoje={hoje}
                            aberturaInicial={ehHoje && !treinoHojeConcluido}
                          />
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </section>
        )}

        {aba === "evolucao" && (
          <div className="space-y-7">
            <PortalEvolucao alunoId={aluno.id} />
            <ConquistasPortal alunoId={aluno.id} modo="catalogo" />
          </div>
        )}

        {aba === "historico" && <PortalHistorico alunoId={aluno.id} hoje={hoje} />}

        <p className="pt-4 text-center text-xs text-muted">
          Feito com Voltage · fale com seu personal para dúvidas
        </p>
      </main>
    </div>
  );
}
