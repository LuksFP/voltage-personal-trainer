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
import { useAuth } from "@/lib/auth";
import { Avatar, Badge, Button, Card, cx } from "@/components/ui";
import { CobrancaPixModal } from "@/components/CobrancaPixModal";
import { ReciboModal } from "@/components/ReciboModal";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  WalletIcon,
} from "@/components/icons";
import { hojeIso } from "@/lib/data";

// Ordem de exibição: atrasados primeiro, depois pendentes, pagos por último.
const ordem: Record<StatusEfetivo, number> = { atrasado: 0, pendente: 1, pago: 2 };

export default function FinanceiroPage() {
  const { alunos, pagamentos, gerarCobrancas, marcarPago, marcarPendente, removePagamento } =
    useStore();
  const { personal } = useAuth();
  const [comp, setComp] = useState(competenciaAtual());
  const [aviso, setAviso] = useState<string | null>(null);
  // Cobrança aberta no modal do Pix e recibo aberto depois de receber.
  const [cobrando, setCobrando] = useState<Pagamento | null>(null);
  const [recibo, setRecibo] = useState<Pagamento | null>(null);

  const receber = (p: Pagamento) => {
    marcarPago(p.id, { metodo: "Pix" });
    setCobrando(null);
    // O recibo já sai pronto com os dados do pagamento que acabou de entrar.
    setRecibo({ ...p, status: "pago", pagoEm: hojeIso(), metodo: "Pix" });
  };

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

      {/* Sem chave Pix o botão "Cobrar" só sabe pedir a configuração. */}
      {!personal?.pixChave && (
        <div className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <WalletIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Cadastre sua chave Pix</p>
              <p className="text-sm text-muted">
                Com a chave salva, cada cobrança vira um copia-e-cola com valor e mês, pronto
                pro WhatsApp.
              </p>
            </div>
          </div>
          <Link href="/perfil" className="shrink-0">
            <Button variant="outline">Configurar Pix</Button>
          </Link>
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
              onCobrar={() => setCobrando(p)}
              onReceber={() => receber(p)}
              onRecibo={() => setRecibo(p)}
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

      <CobrancaPixModal
        pagamento={cobrando}
        alunoNome={cobrando ? nome(cobrando.alunoId) : ""}
        telefone={cobrando ? aluno(cobrando.alunoId)?.telefone : undefined}
        onClose={() => setCobrando(null)}
        onRecebido={() => cobrando && receber(cobrando)}
      />
      <ReciboModal
        pagamento={recibo}
        alunoNome={recibo ? nome(recibo.alunoId) : ""}
        telefone={recibo ? aluno(recibo.alunoId)?.telefone : undefined}
        onClose={() => setRecibo(null)}
      />
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

function LinhaPagamento({
  pagamento: p,
  status,
  nome,
  onCobrar,
  onReceber,
  onRecibo,
  onDesfazer,
  onRemover,
}: {
  pagamento: Pagamento;
  status: StatusEfetivo;
  nome: string;
  onCobrar: () => void;
  onReceber: () => void;
  onRecibo: () => void;
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
        {status !== "pago" && (
          <button
            onClick={onCobrar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
            title="Gerar cobrança Pix"
          >
            <WalletIcon className="h-4 w-4" />
            Cobrar
          </button>
        )}
        {status === "pago" ? (
          <>
            <button
              onClick={onRecibo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              Recibo
            </button>
            <button
              onClick={onDesfazer}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Desfazer
            </button>
          </>
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
