"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAlunoApp } from "@/lib/aluno-app";
import {
  escolherTreinoDoDia,
  rotuloDias,
  ultimaDivisaoConcluida,
} from "@/lib/dias-treino";
import type { Treino } from "@/lib/types";
import { TreinoEmAndamento } from "@/components/portal/TreinoEmAndamento";
import { ConquistasPortal } from "@/components/portal/ConquistasPortal";
import { EditarTreino } from "./EditarTreino";
import { RegistrarMedidas } from "./RegistrarMedidas";
import { SessaoEsporte } from "./SessaoEsporte";
import { PortalEvolucao } from "@/components/portal/PortalEvolucao";
import { PortalHistorico } from "@/components/portal/PortalHistorico";
import { PerfilAlunoApp } from "./PerfilAlunoApp";
import { CatalogoPersonais } from "./CatalogoPersonais";
import { InstalarApp } from "@/components/InstalarApp";
import { cx } from "@/components/ui";
import {
  ChartIcon,
  CheckIcon,
  DumbbellIcon,
  FlameIcon,
  GridIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/icons";
import { paraIso } from "@/lib/data";
import { somarDias } from "@/lib/data";

type Aba = "hoje" | "treino" | "evolucao" | "personais" | "perfil";

const ABAS: { id: Aba; label: string; icon: typeof GridIcon }[] = [
  { id: "hoje", label: "Hoje", icon: GridIcon },
  { id: "treino", label: "Treino", icon: DumbbellIcon },
  { id: "evolucao", label: "Evolução", icon: ChartIcon },
  { id: "personais", label: "Personais", icon: SearchIcon },
  { id: "perfil", label: "Perfil", icon: UsersIcon },
];

/** Dias seguidos (contando de hoje pra trás) em que houve treino. */
function calcularSequencia(datas: Set<string>, hoje: string): number {
  let sequencia = 0;
  // Se ainda não treinou hoje, a sequência pode estar viva desde ontem.
  let cursor = datas.has(hoje) ? hoje : somarDias(hoje, -(1));
  while (datas.has(cursor)) {
    sequencia += 1;
    cursor = somarDias(cursor, -(1));
  }
  return sequencia;
}

export function AlunoAppHome() {
  const { conta, aluno, personal, vinculado } = useAlunoApp();
  const { treinosDoAluno, sessoes } = useStore();
  const [aba, setAba] = useState<Aba>("hoje");
  const [editandoTreino, setEditandoTreino] = useState(false);
  const hoje = paraIso(new Date());

  const treinoAtivo = useMemo<Treino | undefined>(() => {
    if (!aluno) return undefined;
    const treinos = treinosDoAluno(aluno.id);
    return treinos.find((treino) => treino.ativo) ?? treinos[0];
  }, [aluno, treinosDoAluno]);

  const diaSemana = new Date().getDay();
  const escolha = useMemo(() => {
    const ultima = aluno ? ultimaDivisaoConcluida(sessoes, aluno.id) : null;
    return escolherTreinoDoDia(treinoAtivo?.divisoes ?? [], diaSemana, ultima);
  }, [aluno, sessoes, treinoAtivo, diaSemana]);

  const divisaoDeHoje =
    escolha.tipo === "agendado" || escolha.tipo === "rodizio" ? escolha.divisao : undefined;

  const realizadas = useMemo(
    () =>
      aluno
        ? sessoes.filter((s) => s.alunoId === aluno.id && s.status === "realizada")
        : [],
    [aluno, sessoes],
  );

  const concluidoHoje =
    divisaoDeHoje != null &&
    realizadas.some(
      (s) =>
        s.data === hoje && (s.divisaoId === divisaoDeHoje.id || s.foco === divisaoDeHoje.nome),
    );

  const sequencia = useMemo(
    () => calcularSequencia(new Set(realizadas.map((s) => s.data)), hoje),
    [realizadas, hoje],
  );

  const treinosNaSemana = useMemo(() => {
    const inicio = somarDias(hoje, -(6));
    return realizadas.filter((s) => s.data >= inicio).length;
  }, [realizadas, hoje]);

  if (!conta || !aluno) return null;

  const primeiroNome = conta.nome.split(" ")[0];
  const esporte = conta.preferencias.esporte;
  const diaDeEsporte = esporte?.dias.includes(diaSemana) ?? false;
  // Quem faz esporte tem mais dias de treino na semana do que dias de academia.
  const meta = conta.preferencias.dias + (esporte?.dias.length ?? 0);

  return (
    <div className="min-h-screen pb-24">
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
          {sequencia > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-volt/12 px-3 py-1.5 text-sm font-bold text-volt">
              <FlameIcon className="h-4 w-4" />
              {sequencia} dia{sequencia === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-7">
        {aba === "hoje" && (
          <div className="space-y-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long" })}
              </p>
              <h1 className="font-display mt-1 text-4xl font-bold leading-none">
                {primeiroNome}
              </h1>
              {vinculado && (
                <button
                  type="button"
                  onClick={() => setAba("personais")}
                  className="mt-2 text-sm text-muted transition-colors hover:text-text"
                >
                  Acompanhado por{" "}
                  <span className="font-semibold text-volt">
                    {personal?.nome ?? "seu personal"}
                  </span>
                </button>
              )}
            </div>

            {/* Bloco do dia — assimétrico de propósito, sem virar mais um card igual */}
            {divisaoDeHoje ? (
              <section
                className={cx(
                  "relative overflow-hidden rounded-xl2 border p-5",
                  concluidoHoje
                    ? "border-accent/30 bg-accent/8"
                    : "border-volt/40 bg-gradient-to-br from-volt/12 to-transparent",
                )}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  {concluidoHoje
                    ? "Treino de hoje concluído"
                    : escolha.tipo === "rodizio"
                      ? "Próximo no rodízio"
                      : "Treino de hoje"}
                </p>
                <h2 className="font-display mt-1.5 text-3xl font-bold leading-tight">
                  {divisaoDeHoje.nome}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {divisaoDeHoje.exercicios.length} exercícios
                  {rotuloDias(divisaoDeHoje.diasSemana)
                    ? ` · ${rotuloDias(divisaoDeHoje.diasSemana)}`
                    : ""}
                </p>
                {concluidoHoje ? (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2 text-sm font-semibold text-accent">
                    <CheckIcon className="h-4 w-4" /> Feito. Amanhã tem mais.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAba("treino")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-volt px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5"
                  >
                    <DumbbellIcon className="h-4 w-4" />
                    Treinar agora
                  </button>
                )}
              </section>
            ) : (
              <section className="rounded-xl2 border border-line bg-surface/70 px-4 py-6 text-center">
                <p className="font-display text-lg font-semibold">
                  {diaDeEsporte ? `Hoje é dia de ${esporte?.nome}` : "Dia de descanso 🌙"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {diaDeEsporte
                    ? "A academia fica de fora hoje de propósito — o esporte já é o treino."
                    : "Hoje não tem treino marcado. Se quiser adiantar, é só abrir a aba Treino."}
                </p>
              </section>
            )}

            {esporte && <SessaoEsporte alunoId={aluno.id} esporte={esporte} hoje={hoje} />}

            {/* Semana: barra simples, não é card */}
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Sua semana</h2>
                <span className="text-sm font-semibold text-muted">
                  {treinosNaSemana} de {meta}
                </span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: meta }, (_, i) => (
                  <span
                    key={i}
                    className={cx(
                      "h-2 flex-1 rounded-full",
                      i < treinosNaSemana ? "bg-volt" : "bg-surface-2",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">
                {treinosNaSemana >= meta
                  ? "Meta da semana batida. Isso aí."
                  : `Faltam ${meta - treinosNaSemana} treino${meta - treinosNaSemana === 1 ? "" : "s"} pra fechar a semana.`}
                {/* Sem a conta aberta, o "de 6" parece meta só de academia. */}
                {esporte && (
                  <> Sua meta soma {conta.preferencias.dias} na academia e {esporte.dias.length}{" "}
                  de {esporte.nome}.</>
                )}
              </p>
            </section>

            <ConquistasPortal alunoId={aluno.id} />

            <InstalarApp />
          </div>
        )}

        {aba === "treino" && editandoTreino && treinoAtivo && (
          <EditarTreino
            treino={treinoAtivo}
            preferencias={conta.preferencias}
            aoFechar={() => setEditandoTreino(false)}
          />
        )}

        {aba === "treino" && !editandoTreino && (
          <section>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  Sua planilha da academia
                </p>
                <h1 className="font-display mt-1 text-2xl font-semibold">
                  {treinoAtivo?.nome ?? "Treino"}
                </h1>
                {/* Objetivo é da musculação — sem isso, quem faz esporte lê o
                    "— Força" do nome como se fosse a meta no esporte dele. */}
                {!vinculado && (
                  <p className="mt-1 text-sm text-muted">
                    Objetivo na academia: <span className="text-text">{conta.preferencias.objetivo}</span>
                    {esporte && <> · ajustada pro seu {esporte.nome}</>}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted">
                  {vinculado
                    ? `Montado por ${personal?.nome ?? "seu personal"}. Ele vê o que você marca aqui — inclusive os pedidos de troca.`
                    : "Marque cada série conforme for fazendo. O descanso dispara sozinho."}
                </p>
              </div>
              {/* Com personal, quem mexe na planilha é ele. */}
              {!vinculado && treinoAtivo && (
                <button
                  type="button"
                  onClick={() => setEditandoTreino(true)}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-accent"
                >
                  Ajustar
                </button>
              )}
            </div>

            {!treinoAtivo || treinoAtivo.divisoes.length === 0 ? (
              <div className="rounded-xl2 border border-line bg-surface/70 px-4 py-8 text-center text-sm text-muted">
                Nenhum treino montado ainda. Vá em Perfil e gere um.
              </div>
            ) : (
              <div className="space-y-3">
                {[...treinoAtivo.divisoes]
                  .sort((a, b) => {
                    const ordem = (id: string) => (id === divisaoDeHoje?.id ? 0 : 1);
                    return ordem(a.id) - ordem(b.id);
                  })
                  .map((divisao) => (
                    <TreinoEmAndamento
                      key={divisao.id}
                      alunoId={aluno.id}
                      treinoId={treinoAtivo.id}
                      treinoNome={treinoAtivo.nome}
                      divisao={divisao}
                      hoje={hoje}
                      aberturaInicial={divisao.id === divisaoDeHoje?.id && !concluidoHoje}
                      semPersonal={!vinculado}
                      preferencias={conta.preferencias}
                    />
                  ))}
              </div>
            )}
          </section>
        )}

        {aba === "evolucao" && (
          <div className="space-y-7">
            <RegistrarMedidas alunoId={aluno.id} />
            <PortalEvolucao alunoId={aluno.id} semPersonal={!vinculado} />
            <PortalHistorico alunoId={aluno.id} hoje={hoje} />
            <ConquistasPortal alunoId={aluno.id} modo="catalogo" />
          </div>
        )}

        {aba === "personais" && <CatalogoPersonais />}

        {aba === "perfil" && <PerfilAlunoApp />}
      </main>

      {/* Navegação fixa embaixo — é app, não site */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur-md"
        aria-label="Seções do app"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 py-2">
          {ABAS.map((item) => {
            const Icon = item.icon;
            const ativa = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id)}
                aria-current={ativa ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition-colors",
                  ativa ? "text-volt" : "text-muted hover:text-text",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
