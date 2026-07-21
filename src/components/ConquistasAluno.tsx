"use client";

import { useState, type ReactNode } from "react";
import {
  gerarGamificacaoAluno,
  type CategoriaMedalha,
  type MedalhaGamificacao,
  type RecordePessoalExercicio,
} from "@/lib/gamificacao";
import { useStore } from "@/lib/store";
import {
  ChartIcon,
  DumbbellIcon,
  FlameIcon,
  MedalIcon,
  TargetIcon,
  TrophyIcon,
} from "./icons";
import { Button, Card, cx } from "./ui";

function numero(valor: number, casas = 0): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function dataCurta(valor: string): string {
  const normalizada = valor.length === 10 ? `${valor}T12:00:00` : valor;
  return new Date(normalizada).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function progressoMedalha(medalha: MedalhaGamificacao): number {
  if (medalha.desbloqueada) return 100;
  if (medalha.alvo <= 0) return 0;
  return Math.max(0, Math.min(100, (medalha.progressoAtual / medalha.alvo) * 100));
}

function iconeCategoria(categoria: CategoriaMedalha): ReactNode {
  if (categoria === "treinos") return <DumbbellIcon className="h-4 w-4" />;
  if (categoria === "sequencia") return <FlameIcon className="h-4 w-4" />;
  if (categoria === "recordes") return <TrophyIcon className="h-4 w-4" />;
  return <TargetIcon className="h-4 w-4" />;
}

export function ConquistasAluno({ alunoId }: { alunoId: string }) {
  const { sessoes, historicoExercicios, metasAluno } = useStore();
  const gamificacao = gerarGamificacaoAluno({
    alunoId,
    sessoes,
    historicoExercicios,
    metas: metasAluno,
  });
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const desbloqueadas = gamificacao.medalhas.filter((medalha) => medalha.desbloqueada);
  const emAndamento = gamificacao.medalhas.filter((medalha) => !medalha.desbloqueada);
  const medalhasVisiveis = mostrarTodas
    ? gamificacao.medalhas
    : desbloqueadas.length === 0
      ? emAndamento.slice(0, 1)
      : [...desbloqueadas, ...emAndamento.slice(0, Math.max(1, 6 - desbloqueadas.length))].slice(0, 6);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold">
            <MedalIcon className="h-5 w-5 text-accent" />
            Conquistas
          </h2>
          <p className="mt-1 text-sm text-muted">
            Consistência, marcas pessoais e metas — sem disputa e sem ranking.
          </p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
          {desbloqueadas.length} de {gamificacao.medalhas.length} medalhas
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResumoConquista
          icon={<FlameIcon className="h-5 w-5" />}
          valor={gamificacao.sequenciaTreinos.atual}
          label="treinos seguidos"
          detalhe={`Melhor sequência: ${gamificacao.sequenciaTreinos.melhor}`}
        />
        <ResumoConquista
          icon={<TrophyIcon className="h-5 w-5" />}
          valor={gamificacao.recordesPessoais.length}
          label="recordes atuais"
          detalhe={`${gamificacao.sequenciaTreinos.totalRealizados} treinos concluídos`}
        />
        <ResumoConquista
          icon={<TargetIcon className="h-5 w-5" />}
          valor={gamificacao.metasConcluidas}
          label="metas concluídas"
          detalhe="Marcadas como alcançadas"
        />
      </div>

      {gamificacao.recordesPessoais.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="font-display flex items-center gap-2 text-sm font-semibold">
              <ChartIcon className="h-4 w-4 text-accent" /> Marcas pessoais
            </p>
            <span className="text-xs text-muted">Melhor e1RM por exercício</span>
          </div>
          <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {gamificacao.recordesPessoais.slice(0, 3).map((recorde) => (
              <MarcaPessoal key={recorde.chave} recorde={recorde} />
            ))}
          </div>
        </Card>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold">Medalhas de progresso</h3>
            <p className="mt-0.5 text-xs text-muted">
              Desbloqueadas automaticamente pelos registros do aluno.
            </p>
          </div>
          {gamificacao.medalhas.length > medalhasVisiveis.length && (
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => setMostrarTodas((valor) => !valor)}
            >
              {mostrarTodas ? "Mostrar menos" : "Ver todas"}
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {medalhasVisiveis.map((medalha) => (
            <MedalhaCard key={medalha.id} medalha={medalha} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ResumoConquista({
  icon,
  valor,
  label,
  detalhe,
}: {
  icon: ReactNode;
  valor: number;
  label: string;
  detalhe: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="font-display text-3xl font-bold">{valor}</span>
      </div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{detalhe}</p>
    </Card>
  );
}

function MarcaPessoal({ recorde }: { recorde: RecordePessoalExercicio }) {
  return (
    <div className="min-w-0 p-4">
      <p className="truncate text-sm font-semibold">{recorde.nome}</p>
      <p className="font-display mt-1 text-2xl font-bold text-accent">
        {numero(recorde.e1rmKg, 1)} kg
      </p>
      <p className="mt-1 text-xs text-muted">
        {numero(recorde.cargaKg, 1)} kg × {recorde.repeticoes} · {dataCurta(recorde.data)}
      </p>
    </div>
  );
}

export function MedalhaCard({
  medalha,
  compacta = false,
}: {
  medalha: MedalhaGamificacao;
  compacta?: boolean;
}) {
  const percentual = progressoMedalha(medalha);
  return (
    <Card
      className={cx(
        "p-4",
        medalha.desbloqueada && "border-accent/30 bg-accent/[0.045]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            medalha.desbloqueada ? "bg-volt text-ink" : "bg-surface-2 text-muted",
          )}
        >
          {iconeCategoria(medalha.categoria)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display truncate font-semibold">{medalha.titulo}</p>
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                medalha.desbloqueada
                  ? "bg-accent/12 text-accent"
                  : "bg-surface-2 text-muted",
              )}
            >
              {medalha.desbloqueada ? "Desbloqueada" : "Em andamento"}
            </span>
          </div>
          {!compacta && <p className="mt-1 text-xs leading-relaxed text-muted">{medalha.descricao}</p>}
        </div>
      </div>
      {medalha.desbloqueada ? (
        medalha.desbloqueadaEm && (
          <p className="mt-3 text-[11px] text-muted">Alcançada em {dataCurta(medalha.desbloqueadaEm)}</p>
        )
      ) : (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-muted">
            <span>{medalha.progressoAtual} de {medalha.alvo}</span>
            <span>{numero(percentual)}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label={`Progresso de ${medalha.titulo}`}
            aria-valuemin={0}
            aria-valuemax={medalha.alvo}
            aria-valuenow={Math.min(medalha.progressoAtual, medalha.alvo)}
          >
            <div className="h-full rounded-full bg-volt" style={{ width: `${percentual}%` }} />
          </div>
        </div>
      )}
    </Card>
  );
}
