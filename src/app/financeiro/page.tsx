"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Pagamento } from "@/lib/types";
import {
  competenciaAtual,
  deslocarCompetencia,
  formatBRL,
  labelCompetencia,
  statusEfetivo,
  type StatusEfetivo,
} from "@/lib/pagamentos";
import { Avatar, Badge, Button, Card, cx } from "@/components/ui";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  WhatsappIcon,
} from "@/components/icons";

// Ordem de exibição: atrasados primeiro, depois pendentes, pagos por último.
const ordem: Record<StatusEfetivo, number> = { atrasado: 0, pendente: 1, pago: 2 };

export default function FinanceiroPage() {
  const { alunos, pagamentos, gerarCobrancas, marcarPago, marcarPendente, removePagamento } =
    useStore();
  const [comp, setComp] = useState(competenciaAtual());
  const [aviso, setAviso] = useState<string | null>(null);

  const aluno = (id: string) => alunos.find((a) => a.id === id);
  const nome = (id: string) => aluno(id)?.nome ?? "Aluno removido";

  const doMes = useMemo(
    () => pagamentos.filter((p) => p.competencia === comp),
    [pagamentos, comp],
  );

  const linhas = useMemo(() => {
    return [...doMes]
      .map((p) => ({ p, st: statusEfetivo(p) }))
      .sort((a, b) => ordem[a.st] - ordem[b.st] || a.p.vencimento.localeCompare(b.p.vencimento));
  }, [doMes]);

  const totais = useMemo(() => {
    let recebido = 0;
    let atrasado = 0;
    let pendente = 0;
    for (const { p, st } of linhas) {
      if (st === "pago") recebido += p.valor;
      else if (st === "atrasado") atrasado += p.valor;
      else pendente += p.valor;
    }
    return { recebido, atrasado, pendente, total: recebido + atrasado + pendente };
  }, [linhas]);

  // Alunos ativos com mensalidade ainda não cobrados neste mês.
  const cobrados = new Set(doMes.map((p) => p.alunoId));
  const aCobrar = alunos.filter(
    (a) => a.ativo && (a.mensalidade ?? 0) > 0 && !cobrados.has(a.id),
  );
  const semMensalidade = alunos.filter((a) => a.ativo && !(a.mensalidade ?? 0));

  const handleGerar = () => {
    const n = gerarCobrancas(comp);
    setAviso(
      n === 0
        ? "Nenhuma cobrança nova — todos os alunos ativos com mensalidade já têm cobrança neste mês."
        : `${n} cobrança${n === 1 ? "" : "s"} gerada${n === 1 ? "" : "s"} para ${labelCompetencia(comp)}.`,
    );
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho + navegação de mês */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Financeiro</p>
          <h1 className="font-display mt-1 text-4xl font-bold leading-none sm:text-5xl">
            Mensalidades
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setComp((c) => deslocarCompetencia(c, -1));
              setAviso(null);
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted hover:text-text"
            aria-label="Mês anterior"
          >
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </button>
          <div className="min-w-[10rem] rounded-xl border border-line bg-surface px-4 py-2.5 text-center">
            <span className="flex items-center justify-center gap-2 text-sm font-semibold capitalize">
              <CalendarIcon className="h-4 w-4 text-accent" />
              {labelCompetencia(comp)}
            </span>
          </div>
          <button
            onClick={() => {
              setComp((c) => deslocarCompetencia(c, 1));
              setAviso(null);
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted hover:text-text"
            aria-label="Próximo mês"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiDinheiro
          className="lg:col-span-2"
          big
          label="Recebido no mês"
          valor={totais.recebido}
          tone="volt"
          sub={`de ${formatBRL(totais.total)} previstos`}
        />
        <KpiDinheiro label="Em aberto" valor={totais.pendente} tone="neutral" />
        <KpiDinheiro label="Atrasado" valor={totais.atrasado} tone="danger" />
      </div>

      {/* Ação: gerar cobranças */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Gerar cobranças de {labelCompetencia(comp)}</p>
          <p className="text-sm text-muted">
            {aCobrar.length > 0
              ? `${aCobrar.length} aluno${aCobrar.length === 1 ? "" : "s"} ativo${aCobrar.length === 1 ? "" : "s"} com mensalidade ainda sem cobrança neste mês.`
              : "Todos os alunos ativos com mensalidade já têm cobrança neste mês."}
          </p>
        </div>
        <Button onClick={handleGerar} disabled={aCobrar.length === 0} className="shrink-0">
          <PlusIcon className="h-4 w-4" />
          Gerar cobranças
        </Button>
      </div>

      {aviso && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          {aviso}
        </div>
      )}

      {/* Lista de cobranças */}
      {linhas.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">Sem cobranças em {labelCompetencia(comp)}</p>
          <p className="mt-2 text-sm text-muted">
            Gere as cobranças do mês ou defina a mensalidade dos alunos no cadastro.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {linhas.map(({ p, st }) => (
            <LinhaPagamento
              key={p.id}
              pagamento={p}
              status={st}
              nome={nome(p.alunoId)}
              telefone={aluno(p.alunoId)?.telefone}
              competencia={comp}
              onReceber={() => marcarPago(p.id, { metodo: "Pix" })}
              onDesfazer={() => marcarPendente(p.id)}
              onRemover={() => removePagamento(p.id)}
            />
          ))}
        </Card>
      )}

      {/* Alunos ativos sem mensalidade configurada */}
      {semMensalidade.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">Sem mensalidade definida</h2>
            <Badge tone="off">{semMensalidade.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {semMensalidade.map((a) => (
              <Link key={a.id} href={`/alunos/${a.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                  <Avatar nome={a.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nome}</p>
                    <p className="truncate text-sm text-muted">Defina o valor no cadastro</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-muted" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiDinheiro({
  label,
  valor,
  sub,
  tone,
  big,
  className,
}: {
  label: string;
  valor: number;
  sub?: string;
  tone: "volt" | "neutral" | "danger";
  big?: boolean;
  className?: string;
}) {
  const cor =
    tone === "volt" ? "text-accent" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <Card className={cx("p-5", className)}>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className={cx("font-display mt-2 font-bold leading-none", cor, big ? "text-5xl" : "text-3xl")}>
        {formatBRL(valor)}
      </p>
      {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
    </Card>
  );
}

function whatsappLink(telefone: string, nome: string, competencia: string, valor: number): string {
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  const primeiro = nome.split(" ")[0];
  const msg = `Oi ${primeiro}! Passando pra lembrar da mensalidade de ${labelCompetencia(competencia)} (${formatBRL(valor)}). Qualquer dúvida é só chamar. 💪`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

function LinhaPagamento({
  pagamento: p,
  status,
  nome,
  telefone,
  competencia,
  onReceber,
  onDesfazer,
  onRemover,
}: {
  pagamento: Pagamento;
  status: StatusEfetivo;
  nome: string;
  telefone?: string;
  competencia: string;
  onReceber: () => void;
  onDesfazer: () => void;
  onRemover: () => void;
}) {
  const venc = new Date(`${p.vencimento}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <Avatar nome={nome} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{nome}</p>
        <p className="truncate text-sm text-muted">
          {formatBRL(p.valor)} · vence {venc}
          {status === "pago" && p.metodo ? ` · ${p.metodo}` : ""}
        </p>
      </div>

      {status === "pago" && <Badge tone="volt">Pago</Badge>}
      {status === "pendente" && <Badge tone="neutral">Pendente</Badge>}
      {status === "atrasado" && <Badge tone="off">Atrasado</Badge>}

      <div className="flex items-center gap-1">
        {status !== "pago" && telefone && (
          <a
            href={whatsappLink(telefone, nome, competencia, p.valor)}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-accent"
            title="Cobrar no WhatsApp"
            aria-label="Cobrar no WhatsApp"
          >
            <WhatsappIcon className="h-5 w-5" />
          </a>
        )}
        {status === "pago" ? (
          <button
            onClick={onDesfazer}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Desfazer
          </button>
        ) : (
          <button
            onClick={onReceber}
            className="inline-flex items-center gap-1.5 rounded-lg bg-volt px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong"
          >
            <CheckIcon className="h-4 w-4" />
            Receber
          </button>
        )}
        <button
          onClick={onRemover}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          title="Remover cobrança"
          aria-label="Remover cobrança"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
