"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { calcularRelatorio, PERIODOS, type Periodo, type RankItem } from "@/lib/relatorios";
import { formatBRL } from "@/lib/pagamentos";
import { BarChart } from "@/components/BarChart";
import { LineChart } from "@/components/LineChart";
import { ResumoRelatoriosSemanais } from "@/components/ResumoRelatoriosSemanais";
import { Badge, Card, cx } from "@/components/ui";
import { Avatar } from "@/app/page";
import {
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  ChevronRightIcon,
  TargetIcon,
  TrendUpIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";

export default function RelatoriosPage() {
  const { alunos, treinos, avaliacoes, sessoes, pagamentos } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>("90d");

  const r = useMemo(
    () =>
      calcularRelatorio(
        { alunos, treinos, avaliacoes, sessoes, pagamentos },
        periodo,
      ),
    [alunos, treinos, avaliacoes, sessoes, pagamentos, periodo],
  );

  const labelPeriodo = PERIODOS.find((p) => p.valor === periodo)?.label.toLowerCase();
  const semDados = alunos.length === 0;

  return (
    <div className="space-y-8">
      {/* Cabeçalho + seletor de período */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Relatórios</p>
          <h1 className="font-display mt-1 text-4xl font-bold leading-none sm:text-5xl">
            Como vai
            <br />
            <span className="text-muted">a operação.</span>
          </h1>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={cx(
                "rounded-lg px-3 py-1.5 transition-colors",
                periodo === p.valor ? "bg-volt text-ink" : "text-muted hover:text-text",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <ResumoRelatoriosSemanais />

      {semDados ? (
        <Card className="px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">Ainda sem dados</p>
          <p className="mt-2 text-sm text-muted">
            Cadastre alunos e registre sessões para ver seus relatórios aqui.
          </p>
          <Link
            href="/alunos"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-volt px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Cadastrar aluno
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </Card>
      ) : (
        <>
          {/* KPIs — grid assimétrico, destaque no comparecimento */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              className="lg:col-span-2"
              big
              icon={<CheckIcon className="h-5 w-5" />}
              value={r.comparecimento === null ? "—" : `${Math.round(r.comparecimento)}%`}
              label="Comparecimento"
              sub={
                r.comparecimento === null
                  ? "Sem sessões concluídas no período"
                  : `${r.sessoesRealizadas} realizadas · ${r.sessoesFaltou} faltas`
              }
            />
            <Kpi
              icon={<UsersIcon className="h-5 w-5" />}
              value={r.alunosAtivos}
              label="Alunos ativos"
              sub={`+${r.novosNoPeriodo} em ${labelPeriodo}`}
            />
            <Kpi
              icon={<CalendarIcon className="h-5 w-5" />}
              value={r.sessoesRealizadas}
              label="Sessões dadas"
              sub={`${r.sessoesAgendadas} ainda agendadas`}
            />
          </div>

          {/* Sessões por mês + cobertura */}
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
                  <ChartIcon className="h-5 w-5 text-accent" />
                  Sessões por mês
                </h2>
                <span className="text-xs font-semibold text-muted">últimos 6 meses</span>
              </div>
              <Card className="p-5">
                <BarChart dados={r.serieMensal} />
              </Card>
            </section>

            <section>
              <h2 className="font-display mb-4 flex items-center gap-2 text-xl font-semibold">
                <TargetIcon className="h-5 w-5 text-accent" />
                Cobertura
              </h2>
              <div className="space-y-4">
                <Progresso
                  label="Alunos com planilha ativa"
                  pct={r.coberturaTreino}
                  detalhe={`${r.ativosSemTreino.length} sem treino`}
                />
                <Progresso
                  label="Alunos com avaliação física"
                  pct={r.coberturaAvaliacao}
                  detalhe={`${r.ativosSemAvaliacao.length} sem avaliação`}
                />
                <Card className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <TrendUpIcon className="h-4 w-4 text-accent" />
                    Avaliações no período
                  </div>
                  <span className="font-display text-2xl font-bold">{r.avaliacoesNoPeriodo}</span>
                </Card>
              </div>
            </section>
          </div>

          {/* Financeiro */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
                <WalletIcon className="h-5 w-5 text-accent" />
                Financeiro
              </h2>
              <Link
                href="/financeiro"
                className="text-sm font-semibold text-muted hover:text-accent"
              >
                Abrir financeiro
              </Link>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Card className="p-5">
                <p className="mb-3 text-sm font-semibold text-muted">
                  Recebido por mês · últimos 6 meses
                </p>
                <LineChart points={r.receitaMensal} unit="" />
              </Card>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <Kpi
                  icon={<CheckIcon className="h-5 w-5" />}
                  value={formatBRL(r.recebidoNoPeriodo)}
                  label={`Recebido em ${labelPeriodo}`}
                />
                <Kpi
                  icon={<WalletIcon className="h-5 w-5" />}
                  value={formatBRL(r.emAberto)}
                  label="Em aberto"
                />
                <Kpi
                  icon={<TrendUpIcon className="h-5 w-5" />}
                  value={formatBRL(r.previstoMensal)}
                  label="Previsto/mês"
                />
              </div>
            </div>
          </section>

          {/* Rankings */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Ranking
              titulo="Mais assíduos"
              vazio="Nenhuma sessão realizada no período."
              itens={r.maisAssiduos}
              sufixo={(n) => `${n} sessõe${n === 1 ? "" : "s"}`}
              tone="volt"
            />
            <Ranking
              titulo="Mais faltas"
              vazio="Nenhuma falta registrada. 👏"
              itens={r.maisFaltosos}
              sufixo={(n) => `${n} falta${n === 1 ? "" : "s"}`}
              tone="off"
            />
          </div>

          {/* Distribuições */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Distribuicao titulo="Por objetivo" itens={r.porObjetivo} />
            <Distribuicao titulo="Por modalidade" itens={r.porModalidade} />
          </div>

          {/* Ativos que precisam de atenção */}
          {r.ativosSemTreino.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold">Sem planilha ativa</h2>
                <Badge tone="off">{r.ativosSemTreino.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {r.ativosSemTreino.map((a) => (
                  <Link key={a.id} href={`/alunos/${a.id}`}>
                    <Card className="flex items-center gap-4 p-4 transition-colors hover:border-danger/40">
                      <Avatar nome={a.nome} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{a.nome}</p>
                        <p className="truncate text-sm text-muted">
                          {a.modalidade ?? "Sem modalidade"} · monte um treino
                        </p>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-muted" />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  value,
  label,
  sub,
  big,
  className,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  big?: boolean;
  className?: string;
}) {
  return (
    <Card className={cx("relative overflow-hidden p-5", className)}>
      <div className="flex items-center gap-2 text-muted">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-accent">
          {icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className={cx("font-display mt-3 font-bold leading-none", big ? "text-6xl" : "text-4xl")}>
        {value}
      </p>
      {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
    </Card>
  );
}

function Progresso({ label, pct, detalhe }: { label: string; pct: number; detalhe: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-display text-lg font-bold text-accent">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-volt transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{detalhe}</p>
    </Card>
  );
}

function Ranking({
  titulo,
  itens,
  vazio,
  sufixo,
  tone,
}: {
  titulo: string;
  itens: RankItem[];
  vazio: string;
  sufixo: (n: number) => string;
  tone: "volt" | "off";
}) {
  const maxV = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <section>
      <h2 className="font-display mb-4 text-xl font-semibold">{titulo}</h2>
      {itens.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">{vazio}</Card>
      ) : (
        <Card className="divide-y divide-line">
          {itens.map((it, i) => (
            <Link
              key={it.alunoId}
              href={`/alunos/${it.alunoId}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
            >
              <span className="font-display w-5 shrink-0 text-sm font-bold text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{it.nome}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cx("h-full rounded-full", tone === "volt" ? "bg-volt" : "bg-danger")}
                    style={{ width: `${(it.valor / maxV) * 100}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-muted">{sufixo(it.valor)}</span>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}

function Distribuicao({ titulo, itens }: { titulo: string; itens: { nome: string; qtd: number }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.qtd));
  return (
    <section>
      <h2 className="font-display mb-4 text-xl font-semibold">{titulo}</h2>
      {itens.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">Sem alunos ativos.</Card>
      ) : (
        <Card className="space-y-3 p-5">
          {itens.map((m) => (
            <div key={m.nome}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold">{m.nome}</span>
                <span className="text-muted">{m.qtd}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-volt"
                  style={{ width: `${(m.qtd / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
