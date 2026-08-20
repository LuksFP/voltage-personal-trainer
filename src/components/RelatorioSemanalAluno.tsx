"use client";

import { useMemo, useState, type ReactNode } from "react";
import { gerarRelatorioSemanal, semanaPadraoRelatorioSemanal, type AlertaRelatorioSemanal, type ComparacaoMetricaSemanal, type RelatorioSemanal } from "@/lib/relatorio-semanal";
import { linkWhatsapp } from "@/lib/compartilhar";
import { useStore } from "@/lib/store";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ChartIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  DumbbellIcon,
  FlameIcon,
  ReportIcon,
  TargetIcon,
  TrophyIcon,
  WhatsappIcon,
} from "./icons";
import { Badge, Button, Card, cx } from "./ui";
import { fmtDiaMesCurto, somarDias } from "@/lib/data";

function formatarNumero(valor: number, casas = 0): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarVolume(valor: number | null): string {
  if (valor === null) return "—";
  return valor >= 1000 ? `${formatarNumero(valor / 1000, 1)} t` : `${formatarNumero(valor)} kg`;
}

function variacao(
  comparacao: ComparacaoMetricaSemanal,
  modo: "numero" | "pontos" | "percentual" = "numero",
): string {
  if (comparacao.delta === null) return "sem base anterior";
  if (Math.abs(comparacao.delta) < 0.05) return "igual à semana anterior";
  const sinal = comparacao.delta > 0 ? "+" : "";
  if (modo === "pontos") return `${sinal}${formatarNumero(comparacao.delta)} p.p. vs. anterior`;
  if (modo === "percentual" && comparacao.variacaoPercentual !== null) {
    const valor = comparacao.variacaoPercentual;
    return `${valor > 0 ? "+" : ""}${formatarNumero(valor)}% vs. anterior`;
  }
  return `${sinal}${formatarNumero(comparacao.delta, comparacao.delta % 1 === 0 ? 0 : 1)} vs. anterior`;
}

function tomAlerta(alerta: AlertaRelatorioSemanal): string {
  if (alerta.prioridade === "alta") return "border-danger/35 bg-danger/8 text-danger";
  if (alerta.prioridade === "media") return "border-orange-400/30 bg-orange-400/7 text-orange-300";
  return "border-line bg-surface-2/40 text-muted";
}

export function RelatorioSemanalAluno({ alunoId }: { alunoId: string }) {
  const store = useStore();
  const [semanaInicio, setSemanaInicio] = useState(() => semanaPadraoRelatorioSemanal());
  const [copiado, setCopiado] = useState(false);
  const semanaAtual = useMemo(
    () => somarDias(semanaPadraoRelatorioSemanal(), 7),
    [],
  );
  const relatorio = useMemo(
    () =>
      gerarRelatorioSemanal({
        alunoId,
        semanaInicio,
        alunos: store.alunos,
        sessoes: store.sessoes,
        historicoExercicios: store.historicoExercicios,
        checkinsSemanais: store.checkinsSemanais,
        configuracoesHabitos: store.configuracoesHabitos,
        registrosHabitos: store.registrosHabitos,
        videosExecucao: store.videosExecucao,
        solicitacoesSubstituicao: store.solicitacoesSubstituicao,
      }),
    [
      alunoId,
      semanaInicio,
      store.alunos,
      store.sessoes,
      store.historicoExercicios,
      store.checkinsSemanais,
      store.configuracoesHabitos,
      store.registrosHabitos,
      store.videosExecucao,
      store.solicitacoesSubstituicao,
    ],
  );
  const aluno = store.alunos.find((item) => item.id === alunoId);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(relatorio.textos.personal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  };

  const enviar = () => {
    window.open(
      linkWhatsapp(relatorio.textos.whatsapp, aluno?.telefone),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReportIcon className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Relatório semanal</h2>
            <Badge tone={relatorio.periodo.parcial ? "neutral" : "volt"}>
              {relatorio.periodo.parcial ? "Parcial" : "Fechada"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Frequência, evolução de cargas, recuperação, dores e pontos de atenção calculados
            automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copiar}>
            {copiado ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar resumo"}
          </Button>
          <Button type="button" onClick={enviar} disabled={!aluno?.telefone}>
            <WhatsappIcon className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line bg-surface-2/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-volt text-ink">
              <ReportIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                {relatorio.periodo.parcial ? "Semana em andamento" : "Semana concluída"}
              </p>
              <p className="font-display text-lg font-semibold">
                {fmtDiaMesCurto(relatorio.periodo.inicio)} — {fmtDiaMesCurto(relatorio.periodo.fim)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Atualizado a partir dos registros atuais</p>
            </div>
          </div>
          <div className="flex items-center gap-1 self-start rounded-xl border border-line bg-bg/40 p-1">
            <button
              type="button"
              onClick={() => setSemanaInicio((atual) => somarDias(atual, -7))}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Semana anterior"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <span className="min-w-24 px-2 text-center text-xs font-semibold text-muted">
              {relatorio.periodo.parcial ? "Semana atual" : "Histórico"}
            </span>
            <button
              type="button"
              onClick={() => setSemanaInicio((atual) => somarDias(atual, 7))}
              disabled={semanaInicio >= semanaAtual}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Próxima semana"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-line sm:grid-cols-3 lg:grid-cols-5">
          <KpiRelatorio
            icon={<DumbbellIcon className="h-4 w-4" />}
            label="Treinos"
            valor={relatorio.sessoes.realizadas}
            detalhe={variacao(relatorio.comparacao.treinosRealizados)}
          />
          <KpiRelatorio
            icon={<TargetIcon className="h-4 w-4" />}
            label="Comparecimento"
            valor={
              relatorio.sessoes.comparecimentoPercentual === null
                ? "—"
                : `${formatarNumero(relatorio.sessoes.comparecimentoPercentual)}%`
            }
            detalhe={variacao(relatorio.comparacao.comparecimento, "pontos")}
          />
          <KpiRelatorio
            icon={<ChartIcon className="h-4 w-4" />}
            label="Séries de trabalho"
            valor={relatorio.treino.seriesTrabalho}
            detalhe={variacao(relatorio.comparacao.seriesTrabalho)}
          />
          <KpiRelatorio
            icon={<FlameIcon className="h-4 w-4" />}
            label="Volume externo"
            valor={formatarVolume(relatorio.treino.volumeExterno.kg)}
            detalhe={variacao(relatorio.comparacao.volumeExterno, "percentual")}
          />
          <KpiRelatorio
            icon={<TargetIcon className="h-4 w-4" />}
            label="RPE médio"
            valor={
              relatorio.treino.rpeMedio === null
                ? "—"
                : formatarNumero(relatorio.treino.rpeMedio, 1)
            }
            detalhe={`${relatorio.treino.volumeExterno.cobertura.percentual}% das séries com volume exato`}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-display font-semibold">Pontos de atenção</p>
                {relatorio.alertas.length > 0 ? (
                  <span className="text-xs font-semibold text-muted">
                    {relatorio.alertas.length} sinal{relatorio.alertas.length === 1 ? "" : "is"}
                  </span>
                ) : (
                  <Badge tone="volt">Tudo em dia</Badge>
                )}
              </div>
              {relatorio.alertas.length === 0 ? (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm text-muted">
                  Nenhum ponto de atenção automático nesta semana.
                </div>
              ) : (
                <div className="space-y-2">
                  {relatorio.alertas.map((alerta) => (
                    <AlertaItem key={alerta.id} alerta={alerta} />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-bg/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Resumo automático
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{relatorio.textos.personal}</p>
            </div>
          </div>

          <div className="space-y-3">
            <ResumoBemEstar relatorio={relatorio} />
            <ResumoRecordes relatorio={relatorio} />
          </div>
        </div>
      </Card>
    </section>
  );
}

function KpiRelatorio({
  icon,
  label,
  valor,
  detalhe,
  className,
}: {
  icon: ReactNode;
  label: string;
  valor: ReactNode;
  detalhe: string;
  className?: string;
}) {
  return (
    <div className={cx("border-b border-r border-line p-4 last:border-r-0 lg:border-b-0", className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <span className="text-accent">{icon}</span> {label}
      </p>
      <p className="font-display mt-2 text-3xl font-bold">{valor}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted">{detalhe}</p>
    </div>
  );
}

function AlertaItem({ alerta }: { alerta: AlertaRelatorioSemanal }) {
  return (
    <div className={cx("flex items-start gap-2.5 rounded-xl border p-3", tomAlerta(alerta))}>
      <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{alerta.titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed opacity-80">{alerta.descricao}</p>
      </div>
    </div>
  );
}

function ResumoBemEstar({ relatorio }: { relatorio: RelatorioSemanal }) {
  const bem = relatorio.bemEstar;
  return (
    <div className="rounded-xl border border-line bg-bg/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display font-semibold">Recuperação e hábitos</p>
        {bem.respondido ? <Badge tone="volt">Check-in feito</Badge> : <Badge tone="neutral">Sem check-in</Badge>}
      </div>
      {bem.respondido ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricaPequena label="Energia" valor={`${bem.energia}/5`} />
          <MetricaPequena label="Sono" valor={`${bem.sono}/5`} />
          <MetricaPequena label="Estresse" valor={`${bem.estresse}/5`} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Nenhuma resposta semanal para contextualizar a carga.</p>
      )}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-2/45 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Hábitos</p>
          <p className="mt-0.5 text-sm font-semibold">
            {relatorio.habitos.diasRegistrados}/{relatorio.habitos.diasNoPeriodo} dias registrados
          </p>
        </div>
        <p className="font-display text-xl font-bold text-accent">
          {relatorio.habitos.percentualGeralMedio === null
            ? "—"
            : `${formatarNumero(relatorio.habitos.percentualGeralMedio)}%`}
        </p>
      </div>
    </div>
  );
}

function ResumoRecordes({ relatorio }: { relatorio: RelatorioSemanal }) {
  return (
    <div className="rounded-xl border border-line bg-bg/25 p-4">
      <div className="flex items-center gap-2">
        <TrophyIcon className="h-4 w-4 text-accent" />
        <p className="font-display font-semibold">Recordes da semana</p>
      </div>
      {relatorio.recordesE1RM.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Nenhum novo e1RM detectado com os registros disponíveis.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {relatorio.recordesE1RM.slice(0, 3).map((recorde) => (
            <div key={recorde.chave} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2/45 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{recorde.nome}</p>
                <p className="text-[10px] text-muted">
                  {recorde.primeiraMarca
                    ? "primeira marca registrada"
                    : `+${formatarNumero(recorde.ganhoKg ?? 0, 1)} kg estimados`}
                </p>
              </div>
              <p className="font-display shrink-0 text-lg font-bold text-accent">
                {formatarNumero(recorde.e1rmKg, 1)} kg
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricaPequena({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-surface-2/45 px-2.5 py-2 text-center">
      <p className="text-[9px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-0.5 text-lg font-bold">{valor}</p>
    </div>
  );
}
