"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Sessao, StatusSessao } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { SessaoForm, type SessaoFormPayload } from "@/components/SessaoForm";
import { CancelarSessaoForm } from "@/components/CancelarSessaoForm";
import { conflitosDaSessao } from "@/lib/agenda";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(base: Date): Date {
  const diff = (base.getDay() + 6) % 7;
  const m = new Date(base);
  m.setHours(12, 0, 0, 0);
  m.setDate(base.getDate() - diff);
  return m;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function AgendaPage() {
  const {
    sessoes,
    alunos,
    pacotesSessoes,
    updateSessao,
    removeSessao,
    agendarSessoes,
    updateSessaoRecorrente,
    cancelarSessao,
  } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Sessao | null>(null);
  const [cancelando, setCancelando] = useState<Sessao | null>(null);
  const [dataPadrao, setDataPadrao] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);

  const hojeIso = isoLocal(new Date());
  const segunda = useMemo(() => addDays(mondayOf(new Date()), weekOffset * 7), [weekOffset]);

  const dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(segunda, i);
        const iso = isoLocal(d);
        return {
          iso,
          nome: DIAS[i],
          numero: d.getDate(),
          mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          hoje: iso === hojeIso,
          sessoes: sessoes
            .filter((s) => s.data === iso)
            .sort((a, b) => a.hora.localeCompare(b.hora)),
        };
      }),
    [segunda, sessoes, hojeIso],
  );

  const daSemana = dias.flatMap((d) => d.sessoes);
  const realizadas = daSemana.filter((s) => s.status === "realizada").length;
  const canceladas = daSemana.filter((s) => s.status === "cancelada").length;
  const agendadas = daSemana.filter((s) => s.status === "agendada").length;
  const idsComConflito = new Set(
    sessoes.flatMap((sessao) =>
      conflitosDaSessao(sessao, sessoes).flatMap((conflitante) => [sessao.id, conflitante.id]),
    ),
  );

  const rotuloSemana = `${segunda.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${addDays(
    segunda,
    6,
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`.replace(/\./g, "");

  const nomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "Aluno removido";
  const modalidadeAluno = (id: string) => alunos.find((a) => a.id === id)?.modalidade;

  const abrirNova = (data?: string) => {
    setEditando(null);
    setDataPadrao(data);
    setFormOpen(true);
  };
  const abrirEdicao = (s: Sessao) => {
    setEditando(s);
    setDataPadrao(undefined);
    setFormOpen(true);
  };
  const fechar = () => {
    setFormOpen(false);
    setEditando(null);
    setDataPadrao(undefined);
  };

  const salvar = (v: SessaoFormPayload) => {
    const {
      recorrenciaSemanas,
      escopoRecorrencia,
      permitirConflito,
      ...sessao
    } = v;
    if (editando) {
      updateSessaoRecorrente(
        editando.id,
        sessao,
        escopoRecorrencia,
        permitirConflito,
      );
    } else {
      agendarSessoes(sessao, {
        semanas: recorrenciaSemanas,
        permitirConflito,
      });
    }
    fechar();
  };

  const marcar = (s: Sessao, status: StatusSessao) => {
    try {
      setErro(null);
      updateSessao(s.id, { status: s.status === status ? "agendada" : status });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a sessão.");
    }
  };

  const excluir = (s: Sessao) => {
    if (confirm(`Excluir a sessão de ${nomeAluno(s.alunoId)} às ${s.hora}?`)) removeSessao(s.id);
  };

  const confirmarCancelamento = (
    sessao: Sessao,
    opcoes: Parameters<typeof cancelarSessao>[1],
  ) => {
    cancelarSessao(sessao.id, opcoes);
    setCancelando(null);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Agenda</p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
            {daSemana.length} sessõe{daSemana.length === 1 ? "" : "s"} na semana
          </h1>
          <p className="mt-1 text-sm text-muted">
            {realizadas} realizada{realizadas === 1 ? "" : "s"} · {agendadas} agendada
            {agendadas === 1 ? "" : "s"}
            {canceladas > 0 ? ` · ${canceladas} cancelada${canceladas === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Button onClick={() => abrirNova()}>
          <PlusIcon className="h-4 w-4" />
          Nova sessão
        </Button>
      </header>

      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      {/* Navegação da semana */}
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-1.5">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:text-text"
          aria-label="Semana anterior"
        >
          ‹ Anterior
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{rotuloSemana}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-accent"
            >
              Hoje
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:text-text"
          aria-label="Próxima semana"
        >
          Próxima ›
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid gap-3 lg:grid-cols-7">
        {dias.map((d) => (
          <div
            key={d.iso}
            className={`rounded-xl2 border p-3 ${
              d.hoje ? "border-accent/50 bg-accent/5" : "border-line bg-surface/50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    d.hoje ? "text-accent" : "text-muted"
                  }`}
                >
                  {d.nome}
                </p>
                <p className="font-display text-lg font-bold leading-none">
                  {d.numero}
                  <span className="ml-1 text-xs font-semibold text-muted">{d.mes}</span>
                </p>
              </div>
              <button
                onClick={() => abrirNova(d.iso)}
                className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-accent/60 hover:text-accent"
                aria-label={`Agendar em ${d.nome} ${d.numero}`}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {d.sessoes.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted/60">—</p>
              ) : (
                d.sessoes.map((s) => (
                  <SessaoCard
                    key={s.id}
                    sessao={s}
                    nome={nomeAluno(s.alunoId)}
                    modalidade={modalidadeAluno(s.alunoId)}
                    pacote={
                      s.pacoteId
                        ? pacotesSessoes.find((pacote) => pacote.id === s.pacoteId)?.nome
                        : undefined
                    }
                    onMarcar={marcar}
                    onEditar={abrirEdicao}
                    onCancelar={setCancelando}
                    onExcluir={excluir}
                    temConflito={idsComConflito.has(s.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {alunos.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <CalendarIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-base font-semibold">Cadastre um aluno primeiro</p>
            <p className="mt-1 text-sm text-muted">Você agenda sessões para os seus alunos.</p>
          </div>
          <Link href="/alunos">
            <Button>Ir para alunos</Button>
          </Link>
        </Card>
      )}

      <Modal open={formOpen} onClose={fechar} title={editando ? "Editar sessão" : "Nova sessão"}>
        <SessaoForm
          initial={editando ?? undefined}
          defaultData={dataPadrao}
          onSubmit={salvar}
          onCancel={fechar}
        />
      </Modal>

      <Modal
        open={cancelando !== null}
        onClose={() => setCancelando(null)}
        title="Cancelar ou repor sessão"
      >
        {cancelando && (
          <CancelarSessaoForm
            sessao={cancelando}
            onSubmit={(opcoes) => confirmarCancelamento(cancelando, opcoes)}
            onCancel={() => setCancelando(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function SessaoCard({
  sessao,
  nome,
  modalidade,
  pacote,
  onMarcar,
  onEditar,
  onCancelar,
  onExcluir,
  temConflito,
}: {
  sessao: Sessao;
  nome: string;
  modalidade?: string;
  pacote?: string;
  onMarcar: (s: Sessao, status: StatusSessao) => void;
  onEditar: (s: Sessao) => void;
  onCancelar: (s: Sessao) => void;
  onExcluir: (s: Sessao) => void;
  temConflito: boolean;
}) {
  const borda =
    temConflito
      ? "border-orange-500/55"
      : sessao.status === "realizada"
      ? "border-accent/40"
      : sessao.status === "faltou"
        ? "border-danger/40 opacity-70"
        : sessao.status === "cancelada"
          ? "border-line opacity-55"
        : "border-line";

  return (
    <div className={`rounded-lg border bg-surface p-2.5 ${borda}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-xs font-bold">
          <ClockIcon className="h-3.5 w-3.5 text-accent" />
          {sessao.hora}
        </span>
        {sessao.status === "realizada" && <Badge tone="volt">Feito</Badge>}
        {sessao.status === "faltou" && <Badge tone="off">Faltou</Badge>}
        {sessao.status === "cancelada" && <Badge tone="neutral">Cancelada</Badge>}
      </div>

      <p className="mt-1 truncate text-sm font-semibold">{nome}</p>
      {(modalidade || sessao.foco) && (
        <p className="truncate text-xs text-muted">
          {[modalidade, sessao.foco].filter(Boolean).join(" · ")}
        </p>
      )}
      {sessao.duracaoMin != null && (
        <p className="text-xs text-muted/70">{sessao.duracaoMin} min</p>
      )}
      <div className="mt-1 flex flex-wrap gap-1">
        {sessao.recorrenciaId && (
          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
            Semanal · #{sessao.recorrenciaOrdem}
          </span>
        )}
        {sessao.origemReposicaoId && (
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
            Reposição
          </span>
        )}
        {sessao.pacoteId && (
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
            {pacote ?? "Pacote"}
          </span>
        )}
        {temConflito && (
          <span className="rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-400">
            Conflito
          </span>
        )}
      </div>
      {sessao.status === "cancelada" && sessao.motivoCancelamento && (
        <p className="mt-1 line-clamp-2 text-[10px] text-muted">{sessao.motivoCancelamento}</p>
      )}
      {sessao.status === "cancelada" && sessao.reposicaoSessaoId && (
        <p className="mt-1 text-[10px] font-semibold text-accent">Reposição agendada</p>
      )}

      <div className="mt-2 flex items-center gap-1 border-t border-line/60 pt-2">
        {sessao.status !== "cancelada" && (
          <>
            <button
              onClick={() => onMarcar(sessao, "realizada")}
              className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                sessao.status === "realizada"
                  ? "bg-volt text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-accent"
              }`}
              aria-label="Marcar como realizada"
              title="Realizada"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onMarcar(sessao, "faltou")}
              className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                sessao.status === "faltou"
                  ? "bg-danger/20 text-danger"
                  : "text-muted hover:bg-surface-2 hover:text-danger"
              }`}
              aria-label="Marcar falta"
              title="Faltou"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {sessao.status !== "cancelada" && (
            <button
              onClick={() => onEditar(sessao)}
              className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
              aria-label="Editar sessão"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {sessao.status === "agendada" && (
            <button
              onClick={() => onCancelar(sessao)}
              className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"
              aria-label="Cancelar ou repor sessão"
              title="Cancelar ou repor"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onExcluir(sessao)}
            className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-danger"
            aria-label="Excluir sessão"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
