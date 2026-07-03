"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Sessao, StatusSessao } from "@/lib/types";
import { Badge, Button, Card } from "./ui";
import { Modal } from "./Modal";
import { SessaoForm, type SessaoFormPayload } from "./SessaoForm";
import { CalendarIcon, CheckIcon, PlusIcon, XIcon } from "./icons";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rotuloData(iso: string, hojeIso: string): string {
  if (iso === hojeIso) return "Hoje";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  if (iso === isoLocal(amanha)) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function ProximasSessoes({ alunoId }: { alunoId: string }) {
  const { sessoes, addSessao, updateSessao } = useStore();
  const [formOpen, setFormOpen] = useState(false);

  const hojeIso = isoLocal(new Date());
  const proximas = sessoes
    .filter((s) => s.alunoId === alunoId && s.data >= hojeIso)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(0, 5);

  const salvar = (v: SessaoFormPayload) => {
    addSessao(v);
    setFormOpen(false);
  };
  const marcar = (s: Sessao, status: StatusSessao) =>
    updateSessao(s.id, { status: s.status === status ? "agendada" : status });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2 text-xl font-bold">
          <CalendarIcon className="h-5 w-5 text-accent" />
          Próximas sessões
        </h2>
        <div className="flex items-center gap-2">
          <Link href="/agenda" className="text-sm font-semibold text-muted hover:text-accent">
            Agenda
          </Link>
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Agendar
          </Button>
        </div>
      </div>

      {proximas.length === 0 ? (
        <Card className="px-5 py-8 text-center text-sm text-muted">
          Nenhuma sessão agendada. Clique em <span className="font-semibold text-text">Agendar</span>{" "}
          para marcar a próxima.
        </Card>
      ) : (
        <div className="space-y-2">
          {proximas.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-3.5">
              <div className="w-24 shrink-0">
                <p className="text-sm font-bold capitalize">{rotuloData(s.data, hojeIso)}</p>
                <p className="font-display text-lg font-bold leading-none text-accent">{s.hora}</p>
              </div>
              <div className="min-w-0 flex-1">
                {s.foco && <p className="truncate font-semibold">{s.foco}</p>}
                {s.duracaoMin != null && <p className="text-xs text-muted">{s.duracaoMin} min</p>}
              </div>
              {s.status === "realizada" ? (
                <Badge tone="volt">Feito</Badge>
              ) : s.status === "faltou" ? (
                <Badge tone="off">Faltou</Badge>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => marcar(s, "realizada")}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-accent"
                    aria-label="Marcar realizada"
                    title="Realizada"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => marcar(s, "faltou")}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                    aria-label="Marcar falta"
                    title="Faltou"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Agendar sessão">
        <SessaoForm
          defaultAlunoId={alunoId}
          bloquearAluno
          onSubmit={salvar}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </section>
  );
}
