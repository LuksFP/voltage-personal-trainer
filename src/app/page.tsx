"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ultimoBackup } from "@/lib/backup";
import { Badge, Card } from "@/components/ui";
import {
  CalendarIcon,
  ChartIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  DumbbellIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const { alunos, treinos, sessoes, avaliacoes } = useStore();

  const ativos = alunos.filter((a) => a.ativo);
  const hojeIso = isoLocal(new Date());

  // Empurrãozinho de backup: só quando há dado real e nunca se exportou nada.
  const [semBackup] = useState(() => ultimoBackup() === null);
  const [avisoDispensado, setAvisoDispensado] = useState(false);
  const mostrarAvisoBackup = semBackup && !avisoDispensado && alunos.length > 0;

  const sessoesHoje = sessoes
    .filter((s) => s.data === hojeIso)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // Distribuição de alunos ativos por modalidade (ordenada por quantidade).
  const porModalidade = (() => {
    const mapa = new Map<string, number>();
    for (const a of ativos) {
      const k = a.modalidade?.trim() || "Sem modalidade";
      mapa.set(k, (mapa.get(k) ?? 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd);
  })();
  const maxModalidade = Math.max(1, ...porModalidade.map((m) => m.qtd));

  // Alunos ativos sem nenhuma planilha ativa.
  const semTreino = ativos.filter(
    (a) => !treinos.some((t) => t.alunoId === a.id && t.ativo),
  );

  const recentes = [...alunos]
    .sort((a, b) => +new Date(b.criadoEm) - +new Date(a.criadoEm))
    .slice(0, 4);

  const nomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "Aluno removido";

  return (
    <div className="space-y-8">
      {/* Cabeçalho quebrando o grid: título grande + ação deslocada */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Painel</p>
          <h1 className="font-display mt-1 text-4xl font-bold leading-none sm:text-5xl">
            Bom treino,
            <br />
            <span className="text-muted">vamos ao trabalho.</span>
          </h1>
        </div>
        <Link
          href="/agenda"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-volt px-5 py-3 text-sm font-semibold text-ink shadow-[0_10px_30px_-10px_rgba(198,242,78,0.8)] transition-transform hover:-translate-y-0.5"
        >
          Ver agenda de hoje
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </header>

      {/* Aviso de backup — some após dispensar ou fazer o primeiro backup */}
      {mostrarAvisoBackup && (
        <div className="flex flex-col gap-3 rounded-xl2 border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center">
          <DownloadIcon className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Você ainda não fez backup</p>
            <p className="text-sm text-muted">
              Seus dados ficam só neste navegador. Exporte um backup para não perder nada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/perfil"
              className="rounded-lg bg-volt px-3.5 py-2 text-sm font-semibold text-ink"
            >
              Fazer backup
            </Link>
            <button
              onClick={() => setAvisoDispensado(true)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
              aria-label="Dispensar aviso"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats — grid assimétrico (primeiro card maior) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          className="sm:col-span-2 lg:col-span-2"
          big
          icon={<UsersIcon className="h-5 w-5" />}
          value={ativos.length}
          label="Alunos ativos"
          sub={`${alunos.length} no total`}
        />
        <Stat
          icon={<CalendarIcon className="h-5 w-5" />}
          value={sessoesHoje.length}
          label="Sessões hoje"
          sub={`${sessoesHoje.filter((s) => s.status === "realizada").length} realizadas`}
        />
        <Stat
          icon={<DumbbellIcon className="h-5 w-5" />}
          value={treinos.length}
          label="Planilhas montadas"
        />
      </div>

      {/* Agenda de hoje + Por modalidade */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
              <ClockIcon className="h-5 w-5 text-accent" />
              Agenda de hoje
            </h2>
            <Link href="/agenda" className="text-sm font-semibold text-muted hover:text-accent">
              Abrir agenda
            </Link>
          </div>

          {sessoesHoje.length === 0 ? (
            <Card className="px-5 py-10 text-center text-sm text-muted">
              Nenhuma sessão agendada para hoje.
            </Card>
          ) : (
            <div className="space-y-2">
              {sessoesHoje.map((s) => (
                <Card key={s.id} className="flex items-center gap-3 p-3.5">
                  <span className="font-display w-14 shrink-0 text-lg font-bold text-accent">
                    {s.hora}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{nomeAluno(s.alunoId)}</p>
                    {s.foco && <p className="truncate text-sm text-muted">{s.foco}</p>}
                  </div>
                  {s.status === "realizada" && <Badge tone="volt">Feito</Badge>}
                  {s.status === "faltou" && <Badge tone="off">Faltou</Badge>}
                  {s.status === "agendada" && <Badge tone="neutral">Agendada</Badge>}
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
              <ChartIcon className="h-5 w-5 text-accent" />
              Por modalidade
            </h2>
            <Link href="/relatorios" className="text-sm font-semibold text-muted hover:text-accent">
              Ver relatórios
            </Link>
          </div>

          {porModalidade.length === 0 ? (
            <Card className="px-5 py-10 text-center text-sm text-muted">
              Sem alunos ativos ainda.
            </Card>
          ) : (
            <Card className="space-y-3 p-5">
              {porModalidade.map((m) => (
                <div key={m.nome}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold">{m.nome}</span>
                    <span className="text-muted">{m.qtd}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-volt"
                      style={{ width: `${(m.qtd / maxModalidade) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>

      {/* Precisa de atenção: ativos sem planilha */}
      {semTreino.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">Precisa de atenção</h2>
            <Badge tone="off">{semTreino.length} sem treino</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {semTreino.map((a) => (
              <Link key={a.id} href={`/alunos/${a.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-danger/40">
                  <Avatar nome={a.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nome}</p>
                    <p className="truncate text-sm text-muted">
                      {a.modalidade ?? a.objetivo ?? "Sem objetivo"} · sem planilha ativa
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-muted" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Alunos recentes */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Alunos recentes</h2>
          <Link href="/alunos" className="text-sm font-semibold text-muted hover:text-accent">
            Ver todos
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {recentes.map((a) => {
            const nTreinos = treinos.filter((t) => t.alunoId === a.id).length;
            const nAvaliacoes = avaliacoes.filter((av) => av.alunoId === a.id).length;
            return (
              <Link key={a.id} href={`/alunos/${a.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                  <Avatar nome={a.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nome}</p>
                    <p className="truncate text-sm text-muted">
                      {a.modalidade ?? a.objetivo ?? "Sem objetivo definido"} · {nTreinos} treino
                      {nTreinos === 1 ? "" : "s"} · {nAvaliacoes} avaliaç
                      {nAvaliacoes === 1 ? "ão" : "ões"}
                    </p>
                  </div>
                  {a.ativo ? <Badge tone="volt">Ativo</Badge> : <Badge tone="off">Inativo</Badge>}
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  sub,
  big,
  className,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  sub?: string;
  big?: boolean;
  className?: string;
}) {
  return (
    <Card className={`relative overflow-hidden p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-muted">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-accent">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className={`font-display mt-3 font-bold leading-none ${big ? "text-6xl" : "text-4xl"}`}>{value}</p>
      {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
    </Card>
  );
}

export function Avatar({ nome }: { nome: string }) {
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
      {initials}
    </div>
  );
}
