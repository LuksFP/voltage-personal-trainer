"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { analisarExercicios, volumeTotalPorData } from "@/lib/progressao";
import { LineChart, type ChartPoint } from "./LineChart";
import { Badge, Button, Card, Select, cx } from "./ui";
import { ChartIcon, CheckIcon, TargetIcon, TrendUpIcon, XIcon } from "./icons";

type Metrica = "carga" | "volume" | "e1rm" | "rpe";

const METRICAS: { id: Metrica; label: string; unidade: string }[] = [
  { id: "carga", label: "Carga", unidade: " kg" },
  { id: "volume", label: "Volume", unidade: " kg" },
  { id: "e1rm", label: "e1RM", unidade: " kg" },
  { id: "rpe", label: "RPE", unidade: "" },
];

function dataCurta(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function numero(valor: number, casas = 0): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function Progressao({ alunoId }: { alunoId: string }) {
  const {
    historicoExercicios,
    sugestoesDoAluno,
    gerarSugestoesProgressao,
    aceitarSugestaoProgressao,
    ignorarSugestaoProgressao,
  } = useStore();
  const analises = useMemo(
    () => analisarExercicios(historicoExercicios, alunoId),
    [historicoExercicios, alunoId],
  );
  const volumeTotal = useMemo(
    () => volumeTotalPorData(historicoExercicios, alunoId),
    [historicoExercicios, alunoId],
  );
  const legados = historicoExercicios.filter(
    (historico) => historico.alunoId === alunoId && historico.formato === "resumo-legado",
  ).length;
  const sugestoes = sugestoesDoAluno(alunoId);
  const pendentes = sugestoes.filter((sugestao) => sugestao.status === "pendente");
  const [chaveSelecionada, setChaveSelecionada] = useState<string>("");
  const [metrica, setMetrica] = useState<Metrica>("carga");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const selecionada =
    analises.find((analise) => analise.chave === chaveSelecionada) ?? analises[0];

  const totalVolumeKg = volumeTotal.reduce((total, ponto) => total + ponto.volumeKg, 0);
  const cargaRecorde = analises.length
    ? Math.max(...analises.map((analise) => analise.cargaMaxKg))
    : 0;
  const e1rmRecorde = analises.length
    ? Math.max(...analises.map((analise) => analise.e1rmMaxKg))
    : 0;

  const pontosGrafico: ChartPoint[] = selecionada
    ? selecionada.pontos.slice(-12).map((ponto) => ({
        label: dataCurta(ponto.data),
        value:
          metrica === "carga"
            ? ponto.cargaKg
            : metrica === "volume"
              ? ponto.volumeKg
              : metrica === "e1rm"
                ? ponto.e1rmKg
                : ponto.rpeMedio,
      }))
    : [];
  const metricaAtual = METRICAS.find((item) => item.id === metrica) ?? METRICAS[0];

  const atualizarSugestoes = () => {
    const criadas = gerarSugestoesProgressao(alunoId);
    setMensagem(
      criadas > 0
        ? `${criadas} sugestão${criadas === 1 ? "" : "ões"} criada${criadas === 1 ? "" : "s"}.`
        : "As sugestões já estão atualizadas com os últimos treinos.",
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
            <TrendUpIcon className="h-5 w-5 text-accent" />
            Progressão de carga
          </h2>
          <p className="mt-1 text-sm text-muted">
            Volume, recordes e sugestões calculados a partir das séries confirmadas.
          </p>
        </div>
        <Button variant="outline" onClick={atualizarSugestoes} disabled={analises.length === 0}>
          <TrendUpIcon className="h-4 w-4" />
          Atualizar sugestões
        </Button>
      </div>

      {mensagem && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          <span>{mensagem}</span>
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar mensagem">
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <ResumoCard
          label="Volume acumulado"
          valor={`${numero(totalVolumeKg)} kg`}
          detalhe={`${volumeTotal.length} dia${volumeTotal.length === 1 ? "" : "s"} com volume exato`}
        />
        <ResumoCard
          label="Maior carga"
          valor={`${numero(cargaRecorde, 1)} kg`}
          detalhe="Recorde entre exercícios"
        />
        <ResumoCard
          label="Maior e1RM"
          valor={`${numero(e1rmRecorde, 1)} kg`}
          detalhe="Estimativa de uma repetição máxima"
        />
      </div>

      {analises.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-accent">
            <ChartIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Ainda não há séries numéricas para analisar</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              Depois que o aluno registrar carga, repetições e RPE por série, os gráficos e
              recordes aparecem aqui.
            </p>
          </div>
          {legados > 0 && (
            <Badge>{legados} registro{legados === 1 ? "" : "s"} legado{legados === 1 ? "" : "s"}</Badge>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-surface-2/40 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="block min-w-0 flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Exercício
                </span>
                <Select
                  value={selecionada?.chave ?? ""}
                  onChange={(event) => setChaveSelecionada(event.target.value)}
                >
                  {analises.map((analise) => (
                    <option key={analise.chave} value={analise.chave}>
                      {analise.nome}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex overflow-x-auto rounded-xl border border-line bg-surface p-1">
                {METRICAS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMetrica(item.id)}
                    className={cx(
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      metrica === item.id
                        ? "bg-volt text-ink"
                        : "text-muted hover:text-text",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selecionada && (
            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                <Recorde label="Carga máxima" valor={`${numero(selecionada.cargaMaxKg, 1)} kg`} />
                <Recorde label="Maior volume" valor={`${numero(selecionada.volumeMaxKg)} kg`} />
                <Recorde label="Melhor e1RM" valor={`${numero(selecionada.e1rmMaxKg, 1)} kg`} />
              </div>
              <div className="rounded-xl border border-line bg-surface-2/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {metricaAtual.label} por execução
                </p>
                <LineChart points={pontosGrafico} unit={metricaAtual.unidade} />
              </div>
              <div className="overflow-hidden rounded-xl border border-line">
                <div className="hidden grid-cols-5 gap-3 bg-surface-2/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                  <span>Data</span>
                  <span>Carga</span>
                  <span>Volume</span>
                  <span>e1RM</span>
                  <span>RPE médio</span>
                </div>
                <div className="divide-y divide-[var(--color-line)]">
                  {[...selecionada.pontos].reverse().slice(0, 8).map((ponto) => (
                    <div
                      key={ponto.historicoId}
                      className="grid grid-cols-2 gap-2 px-3 py-2.5 text-sm sm:grid-cols-5"
                    >
                      <span className="font-semibold">{dataCurta(ponto.data)}</span>
                      <span className="text-muted">{numero(ponto.cargaKg, 1)} kg</span>
                      <span className="text-muted">{numero(ponto.volumeKg)} kg</span>
                      <span className="text-muted">{numero(ponto.e1rmKg, 1)} kg</span>
                      <span className="text-muted">{numero(ponto.rpeMedio, 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {legados > 0 && (
                <p className="text-xs text-muted">
                  {legados} registro{legados === 1 ? " antigo foi preservado" : "s antigos foram preservados"},
                  mas não entra{legados === 1 ? "" : "m"} nos cálculos por não conter séries reais.
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Próximo treino</h3>
          {pendentes.length > 0 && <Badge tone="volt">{pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}</Badge>}
        </div>
        {pendentes.length === 0 ? (
          <Card className="px-5 py-6 text-center text-sm text-muted">
            {analises.length === 0
              ? "As sugestões aparecem após o primeiro treino detalhado."
              : "Clique em “Atualizar sugestões” para analisar as execuções mais recentes."}
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pendentes.map((sugestao) => (
              <Card key={sugestao.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{sugestao.exercicioNomeSnapshot}</p>
                    <p className="mt-1 font-display text-2xl font-bold">
                      {numero(sugestao.cargaAtualKg, 1)}
                      <span className="mx-2 text-muted">→</span>
                      <span className="text-accent">{numero(sugestao.cargaSugeridaKg, 1)} kg</span>
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                    RPE {numero(sugestao.rpeMedio, 1)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{sugestao.motivo}</p>
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const aplicada = aceitarSugestaoProgressao(sugestao.id);
                      setMensagem(
                        aplicada
                          ? `Carga de ${sugestao.exercicioNomeSnapshot} atualizada na planilha.`
                          : "A planilha de origem não foi encontrada. Revise o treino ativo.",
                      );
                    }}
                  >
                    <CheckIcon className="h-4 w-4" /> Aplicar
                  </Button>
                  <Button variant="ghost" onClick={() => ignorarSugestaoProgressao(sugestao.id)}>
                    <XIcon className="h-4 w-4" /> Ignorar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResumoCard({ label, valor, detalhe }: { label: string; valor: string; detalhe: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold text-accent">{valor}</p>
      <p className="mt-1 text-xs text-muted">{detalhe}</p>
    </Card>
  );
}

function Recorde({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/30 p-3">
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <TargetIcon className="h-3.5 w-3.5 text-accent" /> {label}
      </p>
      <p className="font-display mt-1 text-lg font-bold">{valor}</p>
    </div>
  );
}
