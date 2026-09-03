"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Avaliacao } from "@/lib/types";
import { Button, Card, Select, cx } from "./ui";
import { Modal } from "./Modal";
import { LineChart, type ChartPoint } from "./LineChart";
import { AvaliacaoForm, type AvaliacaoFormPayload } from "./AvaliacaoForm";
import { ChartIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";

const MEDIDAS = [
  { key: "peso", label: "Peso", unit: " kg" },
  { key: "percentualGordura", label: "% Gordura", unit: "%" },
  { key: "cintura", label: "Cintura", unit: " cm" },
  { key: "quadril", label: "Quadril", unit: " cm" },
  { key: "peito", label: "Peito", unit: " cm" },
  { key: "braco", label: "Braço", unit: " cm" },
  { key: "coxa", label: "Coxa", unit: " cm" },
] as const;

type MedidaKey = (typeof MEDIDAS)[number]["key"];

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function fmtData(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function Evolucao({ alunoId }: { alunoId: string }) {
  const { getAluno, avaliacoesDoAluno, addAvaliacao, updateAvaliacao, removeAvaliacao } = useStore();
  const avaliacoes = avaliacoesDoAluno(alunoId); // já vem ordenado por data asc
  const pesoMeta = getAluno(alunoId)?.pesoMeta;

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Avaliacao | null>(null);
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);

  // Avaliações que têm fotos — para o comparativo antes/depois.
  const comFotos = avaliacoes.filter((av) => av.fotos && av.fotos.length > 0);
  const [comparaAntesId, setComparaAntesId] = useState<string | null>(null);
  const [comparaDepoisId, setComparaDepoisId] = useState<string | null>(null);
  // Seleção do usuário com fallback para primeira × última avaliação com foto.
  const antesAv = comFotos.find((av) => av.id === comparaAntesId) ?? comFotos[0];
  const depoisAv =
    comFotos.find((av) => av.id === comparaDepoisId) ?? comFotos[comFotos.length - 1];
  const comparar =
    comFotos.length >= 2 && antesAv && depoisAv && antesAv.id !== depoisAv.id
      ? { antes: antesAv, depois: depoisAv }
      : null;
  // Deltas de medida entre as duas avaliações comparadas.
  const deltas = comparar
    ? MEDIDAS.flatMap((m) => {
        const antes = comparar.antes[m.key];
        const depois = comparar.depois[m.key];
        if (antes == null || depois == null) return [];
        return [{ ...m, antes, depois, delta: depois - antes }];
      })
    : [];

  // Métricas que têm pelo menos um registro (para tiles) e ≥2 (para o gráfico).
  // Sem useMemo: o React Compiler memoiza automaticamente.
  const disponiveis = MEDIDAS.filter((m) => avaliacoes.some((av) => av[m.key] != null));
  const plotaveis = MEDIDAS.filter(
    (m) => avaliacoes.filter((av) => av[m.key] != null).length >= 2,
  );

  const [metrica, setMetrica] = useState<MedidaKey>("peso");
  const metricaAtiva = plotaveis.find((m) => m.key === metrica) ?? plotaveis[0];

  const pontos: ChartPoint[] = metricaAtiva
    ? avaliacoes
        .filter((av) => av[metricaAtiva.key] != null)
        .map((av) => ({ label: fmtData(av.data), value: av[metricaAtiva.key] as number }))
    : [];

  // Peso atual (último registrado) e distância até a meta.
  const seriePeso = avaliacoes.filter((av) => av.peso != null);
  const pesoAtual = seriePeso.length ? (seriePeso[seriePeso.length - 1].peso as number) : undefined;
  const faltaMeta = pesoMeta != null && pesoAtual != null ? pesoAtual - pesoMeta : undefined;

  const abrirNova = () => {
    setEditando(null);
    setFormOpen(true);
  };
  const abrirEdicao = (av: Avaliacao) => {
    setEditando(av);
    setFormOpen(true);
  };

  const salvar = (payload: AvaliacaoFormPayload) => {
    if (editando) updateAvaliacao(editando.id, payload);
    else addAvaliacao(alunoId, payload);
    setFormOpen(false);
    setEditando(null);
  };

  const excluir = (av: Avaliacao) => {
    if (confirm(`Excluir a avaliação de ${fmtData(av.data)}?`)) removeAvaliacao(av.id);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2 text-xl font-bold">
          <ChartIcon className="h-5 w-5 text-accent" />
          Evolução
        </h2>
        <Button variant="outline" onClick={abrirNova}>
          <PlusIcon className="h-4 w-4" />
          Nova avaliação
        </Button>
      </div>

      {avaliacoes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <ChartIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-base font-semibold">Nenhuma avaliação ainda</p>
            <p className="mt-1 text-sm text-muted">
              Registre peso e medidas para acompanhar a evolução ao longo do tempo.
            </p>
          </div>
          <Button onClick={abrirNova}>
            <PlusIcon className="h-4 w-4" />
            Registrar primeira avaliação
          </Button>
        </Card>
      ) : (
        <>
          {/* Tiles: último valor + variação vs. anterior */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {disponiveis.map((m) => {
              const serie = avaliacoes.filter((av) => av[m.key] != null);
              const atual = serie[serie.length - 1][m.key] as number;
              const anterior =
                serie.length >= 2 ? (serie[serie.length - 2][m.key] as number) : undefined;
              const delta = anterior != null ? atual - anterior : undefined;
              return (
                <Card key={m.key} className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {m.label}
                  </p>
                  <p className="font-display mt-1 text-2xl font-bold">
                    {fmt(atual)}
                    <span className="text-sm font-semibold text-muted">{m.unit}</span>
                  </p>
                  {delta != null && Math.abs(delta) >= 0.05 ? (
                    <p
                      className={`mt-0.5 text-xs font-semibold ${
                        delta > 0 ? "text-accent" : "text-danger"
                      }`}
                    >
                      {delta > 0 ? "▲" : "▼"} {fmt(Math.abs(delta))}
                      {m.unit} vs. anterior
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted/70">sem variação</p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Gráfico com seletor de métrica */}
          {metricaAtiva && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap gap-1">
                {plotaveis.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetrica(m.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      metricaAtiva.key === m.key
                        ? "bg-volt text-ink"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <LineChart
                points={pontos}
                unit={metricaAtiva.unit}
                target={metricaAtiva.key === "peso" ? pesoMeta : undefined}
              />
              {metricaAtiva.key === "peso" && pesoMeta != null && (
                <p className="mt-2 text-center text-sm text-muted">
                  Meta <span className="font-semibold text-text">{fmt(pesoMeta)} kg</span>
                  {faltaMeta != null &&
                    (Math.abs(faltaMeta) < 0.05 ? (
                      <span className="font-semibold text-accent"> · meta atingida 🎯</span>
                    ) : (
                      <>
                        {" · faltam "}
                        <span className="font-semibold text-text">
                          {fmt(Math.abs(faltaMeta))} kg
                        </span>
                        {faltaMeta > 0 ? " para baixar" : " para ganhar"}
                      </>
                    ))}
                </p>
              )}
            </Card>
          )}

          {/* Comparativo antes/depois */}
          {comparar && (
            <Card className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Antes e depois
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    rot: "Antes",
                    av: comparar.antes,
                    valor: comparaAntesId ?? comparar.antes.id,
                    onSelect: setComparaAntesId,
                  },
                  {
                    rot: "Depois",
                    av: comparar.depois,
                    valor: comparaDepoisId ?? comparar.depois.id,
                    onSelect: setComparaDepoisId,
                  },
                ].map(({ rot, av, valor, onSelect }) => (
                  <div key={rot} className="overflow-hidden rounded-xl border border-line">
                    <button
                      type="button"
                      onClick={() => setFotoAberta(av.fotos![0])}
                      className="block w-full text-left"
                    >
                      <div className="aspect-[3/4] w-full bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={av.fotos![0]} alt={rot} className="h-full w-full object-cover" />
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="text-xs font-semibold">{rot}</span>
                      <Select
                        value={valor}
                        onChange={(e) => onSelect(e.target.value)}
                        aria-label={`Data ${rot.toLowerCase()}`}
                        tamanho="sm"
                        className="min-w-0 max-w-[70%]"
                      >
                        {comFotos.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {fmtData(opt.data)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {deltas.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {deltas.map((d) => {
                    const parado = Math.abs(d.delta) < 0.05;
                    return (
                      <div
                        key={d.key}
                        className="rounded-lg bg-surface-2/50 px-2.5 py-2"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {d.label}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold">
                          {fmt(d.antes)} → {fmt(d.depois)}
                          {d.unit.trim()}
                        </p>
                        <p
                          className={cx(
                            "text-xs font-bold",
                            parado ? "text-muted" : "text-accent",
                          )}
                        >
                          {parado
                            ? "sem mudança"
                            : `${d.delta > 0 ? "▲ +" : "▼ "}${fmt(d.delta)}${d.unit.trim()}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Histórico */}
          <div className="space-y-2">
            {[...avaliacoes].reverse().map((av) => (
              <Card key={av.id} className="flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {new Date(`${av.data.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {disponiveis
                      .filter((m) => av[m.key] != null)
                      .map((m) => `${m.label} ${fmt(av[m.key] as number)}${m.unit}`)
                      .join(" · ")}
                  </p>
                  {av.observacoes && (
                    <p className="mt-1 text-sm text-muted/80">{av.observacoes}</p>
                  )}
                  {av.fotos && av.fotos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {av.fotos.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFotoAberta(src)}
                          className="h-14 w-14 overflow-hidden rounded-md border border-line"
                          aria-label={`Ver foto ${i + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => abrirEdicao(av)}
                    aria-label="Editar avaliação"
                    className="px-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => excluir(av)}
                    aria-label="Excluir avaliação"
                    className="px-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditando(null);
        }}
        title={editando ? "Editar avaliação" : "Nova avaliação física"}
      >
        <AvaliacaoForm
          initial={editando ?? undefined}
          onSubmit={salvar}
          onCancel={() => {
            setFormOpen(false);
            setEditando(null);
          }}
        />
      </Modal>

      <Modal open={fotoAberta !== null} onClose={() => setFotoAberta(null)} title="Foto de progresso">
        {fotoAberta && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoAberta}
            alt="Foto de progresso"
            className="mx-auto max-h-[70vh] w-auto rounded-xl"
          />
        )}
      </Modal>
    </section>
  );
}
