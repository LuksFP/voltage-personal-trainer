"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { linkWhatsapp } from "@/lib/compartilhar";
import type { Sessao, StatusSessao } from "@/lib/types";
import { Badge, Card, cx } from "./ui";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  DumbbellIcon,
  WhatsappIcon,
  XIcon,
} from "./icons";
import { paraIso } from "@/lib/data";

function agoraHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "em 40 min", "agora", "há 1h20" — o personal lê no meio do treino. */
function distanciaDoAgora(hora: string, agora: string): string {
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const delta = min(hora) - min(agora);
  if (Math.abs(delta) <= 10) return "agora";
  const abs = Math.abs(delta);
  const texto = abs >= 60 ? `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}` : `${abs} min`;
  return delta > 0 ? `em ${texto}` : `há ${texto}`;
}

function mensagemDeAviso(nome: string, hora: string): string {
  return `Oi ${nome.split(" ")[0]}! Confirmando nosso treino de hoje às ${hora}. Até já! 💪`;
}

/**
 * O bloco que abre o painel: o dia de trabalho do personal em pé na academia.
 * Presença, falta e planilha ficam a um toque — o resto do painel é leitura.
 */
export function HojeDoPersonal() {
  const { sessoes, alunos, treinos, updateSessao } = useStore();
  const [erro, setErro] = useState<string | null>(null);

  const agora = useMemo(() => new Date(), []);
  const hojeIso = paraIso(agora);
  const horaAgora = agoraHHMM(agora);

  const doDia = useMemo(
    () =>
      sessoes
        .filter((s) => s.data === hojeIso && s.status !== "cancelada")
        .sort((a, b) => a.hora.localeCompare(b.hora)),
    [sessoes, hojeIso],
  );

  const aluno = (id: string) => alunos.find((a) => a.id === id);
  const nomeAluno = (id: string) => aluno(id)?.nome ?? "Aluno removido";
  const treinoAtivo = (alunoId: string) => treinos.find((t) => t.alunoId === alunoId && t.ativo);

  const pendentes = doDia.filter((s) => s.status === "agendada");
  const feitas = doDia.filter((s) => s.status === "realizada").length;
  // A próxima é a primeira ainda agendada; passada a hora, ela continua sendo
  // a próxima (é justamente a que o personal precisa marcar).
  const proxima = pendentes[0];
  const demais = doDia.filter((s) => s.id !== proxima?.id);

  const marcar = (s: Sessao, status: StatusSessao) => {
    try {
      setErro(null);
      updateSessao(s.id, { status: s.status === status ? "agendada" : status });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar a sessão.");
    }
  };

  return (
    <section aria-labelledby="hoje-titulo">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="hoje-titulo" className="font-display flex items-center gap-2 text-xl font-semibold">
            <ClockIcon className="h-5 w-5 text-accent" />
            Hoje
          </h2>
          <p className="text-sm text-muted">
            {doDia.length === 0
              ? "Nenhuma sessão marcada"
              : `${feitas} de ${doDia.length} feita${doDia.length === 1 ? "" : "s"}${
                  pendentes.length > 0 ? ` · ${pendentes.length} na fila` : ""
                }`}
          </p>
        </div>
        <Link
          href="/agenda"
          className="shrink-0 text-sm font-semibold text-muted hover:text-accent"
        >
          Agenda
        </Link>
      </div>

      {erro && (
        <p className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      {doDia.length === 0 ? (
        <Card className="flex items-center gap-3 px-5 py-6">
          <CalendarIcon className="h-5 w-5 shrink-0 text-muted" />
          <p className="flex-1 text-sm text-muted">
            Dia livre de sessões. Bom momento para revisar planilhas.
          </p>
          <Link href="/agenda" className="text-sm font-semibold text-accent">
            Marcar
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {proxima && (
            <SessaoDestaque
              sessao={proxima}
              nome={nomeAluno(proxima.alunoId)}
              telefone={aluno(proxima.alunoId)?.telefone}
              temTreino={Boolean(treinoAtivo(proxima.alunoId))}
              distancia={distanciaDoAgora(proxima.hora, horaAgora)}
              onPresenca={() => marcar(proxima, "realizada")}
              onFalta={() => marcar(proxima, "faltou")}
            />
          )}

          {demais.length > 0 && (
            <Card className="divide-y divide-line">
              {demais.map((s) => (
                <LinhaSessao
                  key={s.id}
                  sessao={s}
                  nome={nomeAluno(s.alunoId)}
                  onPresenca={() => marcar(s, "realizada")}
                  onFalta={() => marcar(s, "faltou")}
                />
              ))}
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

function SessaoDestaque({
  sessao,
  nome,
  telefone,
  temTreino,
  distancia,
  onPresenca,
  onFalta,
}: {
  sessao: Sessao;
  nome: string;
  telefone?: string;
  temTreino: boolean;
  distancia: string;
  onPresenca: () => void;
  onFalta: () => void;
}) {
  return (
    <Card className="overflow-hidden border-accent/30">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div className="shrink-0 text-center">
          <p className="font-display text-3xl font-bold leading-none text-accent sm:text-4xl">
            {sessao.hora}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {distancia}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{nome}</p>
          <p className="truncate text-sm text-muted">
            {[sessao.foco, sessao.duracaoMin ? `${sessao.duracaoMin} min` : null]
              .filter(Boolean)
              .join(" · ") || "Sessão agendada"}
          </p>
          {!temTreino && (
            <p className="mt-1.5 text-xs font-semibold text-danger">Sem planilha ativa</p>
          )}
        </div>
      </div>

      {/* Alvos grandes: isso é usado em pé, com uma mão só. */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
        <button
          onClick={onPresenca}
          className="flex items-center justify-center gap-2 bg-volt py-3.5 text-sm font-bold text-ink transition-colors hover:bg-volt-strong"
        >
          <CheckIcon className="h-4 w-4" />
          Presença
        </button>
        <button
          onClick={onFalta}
          className="flex items-center justify-center gap-2 bg-surface py-3.5 text-sm font-semibold text-muted transition-colors hover:text-danger"
        >
          <XIcon className="h-4 w-4" />
          Faltou
        </button>
        <Link
          href={`/alunos/${sessao.alunoId}`}
          className="flex items-center justify-center gap-2 bg-surface py-3.5 text-sm font-semibold text-muted transition-colors hover:text-accent"
        >
          <DumbbellIcon className="h-4 w-4" />
          Planilha
        </Link>
        <a
          href={linkWhatsapp(mensagemDeAviso(nome, sessao.hora), telefone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-surface py-3.5 text-sm font-semibold text-muted transition-colors hover:text-accent"
        >
          <WhatsappIcon className="h-4 w-4" />
          Avisar
        </a>
      </div>
    </Card>
  );
}

function LinhaSessao({
  sessao,
  nome,
  onPresenca,
  onFalta,
}: {
  sessao: Sessao;
  nome: string;
  onPresenca: () => void;
  onFalta: () => void;
}) {
  const feita = sessao.status === "realizada";
  const faltou = sessao.status === "faltou";

  return (
    <div className={cx("flex items-center gap-3 p-3.5", (feita || faltou) && "opacity-70")}>
      <span className="font-display w-12 shrink-0 text-base font-bold text-accent">
        {sessao.hora}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{nome}</p>
        {sessao.foco && <p className="truncate text-sm text-muted">{sessao.foco}</p>}
      </div>

      {feita && <Badge tone="volt">Feito</Badge>}
      {faltou && <Badge tone="off">Faltou</Badge>}

      <div className="flex items-center gap-1">
        <button
          onClick={onPresenca}
          className={cx(
            "grid h-9 w-9 place-items-center rounded-lg transition-colors",
            feita ? "bg-volt text-ink" : "text-muted hover:bg-surface-2 hover:text-accent",
          )}
          aria-label={`Marcar presença de ${nome}`}
          title="Presença"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onFalta}
          className={cx(
            "grid h-9 w-9 place-items-center rounded-lg transition-colors",
            faltou ? "bg-danger/20 text-danger" : "text-muted hover:bg-surface-2 hover:text-danger",
          )}
          aria-label={`Marcar falta de ${nome}`}
          title="Faltou"
        >
          <XIcon className="h-4 w-4" />
        </button>
        <Link
          href={`/alunos/${sessao.alunoId}`}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          aria-label={`Abrir ${nome}`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
