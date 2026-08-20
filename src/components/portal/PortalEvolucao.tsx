"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { analisarExercicios } from "@/lib/progressao";
import { LineChart, type ChartPoint } from "@/components/LineChart";
import { Card, cx } from "@/components/ui";
import { ChartIcon, TargetIcon, TrendUpIcon } from "@/components/icons";
import { fmtDiaMesCurto } from "@/lib/data";

const MEDIDAS = [
  { key: "peso", label: "Peso", unit: " kg" },
  { key: "percentualGordura", label: "% gordura", unit: "%" },
  { key: "cintura", label: "Cintura", unit: " cm" },
  { key: "braco", label: "Braço", unit: " cm" },
  { key: "coxa", label: "Coxa", unit: " cm" },
] as const;

type Medida = (typeof MEDIDAS)[number]["key"];

function numero(valor: number, casas = 1): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

export function PortalEvolucao({
  alunoId,
  semPersonal = false,
}: {
  alunoId: string;
  /** Sem personal, os números do corpo são registrados pelo próprio aluno. */
  semPersonal?: boolean;
}) {
  const { avaliacoesDoAluno, historicoExercicios, getAluno } = useStore();
  const avaliacoes = avaliacoesDoAluno(alunoId);
  const analises = analisarExercicios(historicoExercicios, alunoId);
  const [metrica, setMetrica] = useState<Medida>("peso");
  const disponiveis = MEDIDAS.filter((medida) =>
    avaliacoes.some((avaliacao) => avaliacao[medida.key] !== undefined),
  );
  const ativa = disponiveis.find((medida) => medida.key === metrica) ?? disponiveis[0];
  const pontos: ChartPoint[] = ativa
    ? avaliacoes
        .filter((avaliacao) => avaliacao[ativa.key] !== undefined)
        .map((avaliacao) => ({
          label: fmtDiaMesCurto(avaliacao.data),
          value: avaliacao[ativa.key] as number,
        }))
    : [];
  const metaPeso = getAluno(alunoId)?.pesoMeta;
  const pesos = avaliacoes.filter((avaliacao) => avaliacao.peso !== undefined);
  const pesoInicial = pesos[0]?.peso;
  const pesoAtual = pesos.at(-1)?.peso;
  const distanciaTotal =
    metaPeso !== undefined && pesoInicial !== undefined
      ? Math.abs(metaPeso - pesoInicial)
      : undefined;
  const progresso =
    metaPeso !== undefined && pesoAtual !== undefined && distanciaTotal !== undefined
      ? distanciaTotal === 0
        ? 100
        : Math.max(
            0,
            Math.min(
              100,
              ((distanciaTotal - Math.abs(metaPeso - pesoAtual)) / distanciaTotal) * 100,
            ),
          )
      : undefined;
  const recordes = [...analises]
    .sort((a, b) => b.e1rmMaxKg - a.e1rmMaxKg || b.cargaMaxKg - a.cargaMaxKg)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Evolução</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Seu corpo e seus recordes</h2>
        <p className="mt-1 text-sm text-muted">
          {semPersonal
            ? "O que você anotou do seu corpo e o que saiu das séries concluídas."
            : "Dados registrados pelo seu personal e resultados das séries concluídas."}
        </p>
      </section>

      {metaPeso !== undefined && (
        <Card className="border-accent/25 bg-accent/8 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
                <TargetIcon className="h-4 w-4" /> Meta de peso
              </p>
              <p className="font-display mt-2 text-3xl font-bold">
                {pesoAtual !== undefined ? `${numero(pesoAtual)} kg` : "Sem avaliação"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Objetivo: {numero(metaPeso)} kg
                {pesoInicial !== undefined ? ` · início ${numero(pesoInicial)} kg` : ""}
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-accent">
              {progresso !== undefined ? `${Math.round(progresso)}%` : "—"}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-volt" style={{ width: `${progresso ?? 0}%` }} />
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
          <ChartIcon className="h-5 w-5 text-accent" /> Evolução corporal
        </h3>
        {disponiveis.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-muted">
            {semPersonal
              ? "Registre seu peso aí em cima e o gráfico começa a existir."
              : "A evolução corporal aparece depois da primeira avaliação física."}
          </Card>
        ) : (
          <Card className="p-4">
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
              {disponiveis.map((medida) => (
                <button
                  key={medida.key}
                  type="button"
                  onClick={() => setMetrica(medida.key)}
                  className={cx(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                    ativa?.key === medida.key
                      ? "bg-volt text-ink"
                      : "bg-surface-2 text-muted",
                  )}
                >
                  {medida.label}
                </button>
              ))}
            </div>
            {ativa && pontos.length >= 2 ? (
              <LineChart
                points={pontos}
                unit={ativa.unit}
                target={ativa.key === "peso" ? metaPeso : undefined}
              />
            ) : ativa ? (
              <div className="rounded-xl bg-surface-2/40 px-4 py-7 text-center">
                <p className="font-display text-3xl font-bold text-accent">
                  {numero(pontos[0]?.value ?? 0)}{ativa.unit}
                </p>
                <p className="mt-1 text-xs text-muted">Registre outra avaliação para formar o gráfico.</p>
              </div>
            ) : null}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
          <TrendUpIcon className="h-5 w-5 text-accent" /> Recordes pessoais
        </h3>
        {recordes.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-muted">
            Seus recordes aparecem quando você concluir séries com carga e repetições.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {recordes.map((recorde) => (
              <Card key={recorde.chave} className="p-3.5">
                <p className="truncate text-sm font-semibold">{recorde.nome}</p>
                <p className="font-display mt-2 text-2xl font-bold text-accent">
                  {numero(recorde.cargaMaxKg)} kg
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  melhor carga · e1RM {numero(recorde.e1rmMaxKg)} kg
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
