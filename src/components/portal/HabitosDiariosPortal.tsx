"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { calcularSequenciasHabitos, resumoHabitosDoDia } from "@/lib/habitos";
import { useStore } from "@/lib/store";
import type {
  ConfiguracaoHabitos,
  HabitoDiario,
  RegistroHabitosDiario,
  ValoresHabitosDiarios,
} from "@/lib/types";
import {
  ActivityIcon,
  CheckIcon,
  ClockIcon,
  DropletIcon,
  FlameIcon,
  FootstepsIcon,
  HabitsIcon,
  LeafIcon,
  MoonIcon,
} from "@/components/icons";
import { Button, Input, cx } from "@/components/ui";
import { somarDias } from "@/lib/data";

type Icone = ComponentType<SVGProps<SVGSVGElement>>;

const ROTULOS: Record<HabitoDiario, { titulo: string; unidade: string; icon: Icone }> = {
  agua: { titulo: "Água", unidade: "ml", icon: DropletIcon },
  passos: { titulo: "Passos", unidade: "passos", icon: FootstepsIcon },
  sono: { titulo: "Sono", unidade: "h", icon: MoonIcon },
  alongamento: { titulo: "Alongamento", unidade: "min", icon: ActivityIcon },
  cardio: { titulo: "Cardio", unidade: "min", icon: ClockIcon },
  alimentacao: { titulo: "Alimentação", unidade: "%", icon: LeafIcon },
};

interface FormularioHabitos {
  aguaMl: string;
  passos: string;
  sonoHoras: string;
  alongamentoMinutos: string;
  cardioMinutos: string;
  adesaoAlimentarPercentual: number | null;
}

function numeroInicial(valor: number | undefined): string {
  return valor === undefined ? "" : String(valor).replace(".", ",");
}

function formularioInicial(registro?: RegistroHabitosDiario): FormularioHabitos {
  return {
    aguaMl: numeroInicial(registro?.valores.aguaMl),
    passos: numeroInicial(registro?.valores.passos),
    sonoHoras: numeroInicial(registro?.valores.sonoHoras),
    alongamentoMinutos: numeroInicial(registro?.valores.alongamentoMinutos),
    cardioMinutos: numeroInicial(registro?.valores.cardioMinutos),
    adesaoAlimentarPercentual: registro?.valores.adesaoAlimentarPercentual ?? null,
  };
}

function parseNumero(valor: string, inteiro = false): number | undefined {
  const limpo = valor.trim().replace(",", ".");
  if (!limpo) return undefined;
  const numero = Number(limpo);
  if (!Number.isFinite(numero) || numero < 0) return undefined;
  return inteiro ? Math.round(numero) : numero;
}

function diasRecentes(hoje: string): string[] {
  return Array.from({ length: 7 }, (_, indice) => somarDias(hoje, indice - 6));
}

function diaCurto(dataIso: string): string {
  return new Date(`${dataIso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "narrow" });
}

function metaDoHabito(configuracao: ConfiguracaoHabitos, habito: HabitoDiario): number {
  const chave: Record<HabitoDiario, keyof ConfiguracaoHabitos["metas"]> = {
    agua: "aguaMl",
    passos: "passos",
    sono: "sonoHoras",
    alongamento: "alongamentoMinutos",
    cardio: "cardioMinutos",
    alimentacao: "adesaoAlimentarPercentual",
  };
  return configuracao.metas[chave[habito]];
}

function formatarMeta(habito: HabitoDiario, valor: number): string {
  if (habito === "agua") {
    return valor >= 1000
      ? `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`
      : `${valor.toLocaleString("pt-BR")} ml`;
  }
  if (habito === "passos") return valor.toLocaleString("pt-BR");
  if (habito === "sono") return `${valor.toLocaleString("pt-BR")} h`;
  if (habito === "alimentacao") return `${valor.toLocaleString("pt-BR")}%`;
  return `${valor.toLocaleString("pt-BR")} min`;
}

export function HabitosDiariosPortal({ alunoId, hoje }: { alunoId: string; hoje: string }) {
  const {
    configuracaoHabitosDoAluno,
    registrosHabitosDoAluno,
    registroHabitosDoDia,
    salvarRegistroHabitos,
  } = useStore();
  const configuracao = configuracaoHabitosDoAluno(alunoId);
  const registros = registrosHabitosDoAluno(alunoId);
  const registroHoje = registroHabitosDoDia(alunoId, hoje);

  if (!configuracao || configuracao.habitosAtivos.length === 0) {
    return (
      <section className="rounded-xl2 border border-line bg-surface/70 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
            <HabitsIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display font-semibold">Hábitos diários</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Seu personal ainda não definiu as metas diárias. Quando definir, você registra tudo
              por aqui.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <FormularioHabitosPortal
      key={`${configuracao.atualizadoEm}:${registroHoje?.atualizadoEm ?? hoje}`}
      alunoId={alunoId}
      hoje={hoje}
      configuracao={configuracao}
      registros={registros}
      registroHoje={registroHoje}
      onSalvar={salvarRegistroHabitos}
    />
  );
}

function FormularioHabitosPortal({
  alunoId,
  hoje,
  configuracao,
  registros,
  registroHoje,
  onSalvar,
}: {
  alunoId: string;
  hoje: string;
  configuracao: ConfiguracaoHabitos;
  registros: RegistroHabitosDiario[];
  registroHoje?: RegistroHabitosDiario;
  onSalvar: ReturnType<typeof useStore>["salvarRegistroHabitos"];
}) {
  const [form, setForm] = useState<FormularioHabitos>(() => formularioInicial(registroHoje));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmacao, setConfirmacao] = useState(false);
  const resumo = resumoHabitosDoDia(registroHoje, configuracao, hoje);
  const sequencias = calcularSequenciasHabitos(registros, hoje);
  const datas = useMemo(() => diasRecentes(hoje), [hoje]);

  const mudar = (campo: keyof FormularioHabitos, valor: string | number | null) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setConfirmacao(false);
  };

  const salvar = () => {
    const valores: ValoresHabitosDiarios = {
      aguaMl: parseNumero(form.aguaMl),
      passos: parseNumero(form.passos, true),
      sonoHoras: parseNumero(form.sonoHoras),
      alongamentoMinutos: parseNumero(form.alongamentoMinutos, true),
      cardioMinutos: parseNumero(form.cardioMinutos, true),
      adesaoAlimentarPercentual: form.adesaoAlimentarPercentual ?? undefined,
    };
    const ativosPreenchidos = configuracao.habitosAtivos.filter((habito) => {
      const chave: Record<HabitoDiario, keyof ValoresHabitosDiarios> = {
        agua: "aguaMl",
        passos: "passos",
        sono: "sonoHoras",
        alongamento: "alongamentoMinutos",
        cardio: "cardioMinutos",
        alimentacao: "adesaoAlimentarPercentual",
      };
      return valores[chave[habito]] !== undefined;
    });
    if (ativosPreenchidos.length === 0) {
      setErro("Preencha pelo menos um hábito antes de salvar.");
      return;
    }

    setSalvando(true);
    try {
      onSalvar({ alunoId, data: hoje, valores });
      setErro(null);
      setConfirmacao(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar seus hábitos.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl2 border border-line bg-surface/70">
      <div className="border-b border-line bg-surface-2/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt text-ink">
              <HabitsIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Hoje</p>
              <h2 className="font-display text-lg font-semibold">Seus hábitos</h2>
              <p className="mt-0.5 text-xs text-muted">
                {resumo.metasAtingidas} de {resumo.totalHabitosAtivos} metas concluídas
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
              <FlameIcon className="h-3.5 w-3.5" />
              {sequencias.global.atual} dia{sequencias.global.atual === 1 ? "" : "s"}
            </span>
            <p className="mt-1 text-[10px] text-muted">melhor: {sequencias.global.melhor}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg/70">
          <div
            className="h-full rounded-full bg-volt transition-[width]"
            style={{ width: `${resumo.percentualGeral}%` }}
          />
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {configuracao.habitosAtivos
            .filter((habito) => habito !== "alimentacao")
            .map((habito) => {
              const definicao = ROTULOS[habito];
              const Icon = definicao.icon;
              const campo: Record<Exclude<HabitoDiario, "alimentacao">, keyof FormularioHabitos> = {
                agua: "aguaMl",
                passos: "passos",
                sono: "sonoHoras",
                alongamento: "alongamentoMinutos",
                cardio: "cardioMinutos",
              };
              const chave = campo[habito];
              const progresso = resumo.progressoPorHabito[habito];
              return (
                <label
                  key={habito}
                  className={cx(
                    "rounded-xl border p-3 transition-colors",
                    progresso.atingido
                      ? "border-accent/35 bg-accent/7"
                      : "border-line bg-bg/30 focus-within:border-accent/45",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                      {definicao.titulo}
                    </span>
                    {progresso.atingido && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                  </span>
                  <span className="mt-2 flex items-end gap-1">
                    <Input
                      inputMode={habito === "passos" ? "numeric" : "decimal"}
                      value={String(form[chave])}
                      onChange={(event) => mudar(chave, event.target.value)}
                      placeholder="0"
                      className="!rounded-lg !border-0 !bg-transparent !p-0 font-display !text-lg font-semibold focus:!bg-transparent"
                      aria-label={definicao.titulo}
                    />
                    <span className="pb-0.5 text-[10px] font-semibold text-muted">
                      {definicao.unidade}
                    </span>
                  </span>
                  <span className="mt-1 block text-[10px] text-muted">
                    meta {formatarMeta(habito, metaDoHabito(configuracao, habito))}
                  </span>
                </label>
              );
            })}
        </div>

        {configuracao.habitosAtivos.includes("alimentacao") && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <LeafIcon className="h-3.5 w-3.5 text-accent" /> Alimentação
              </p>
              <p className="text-[10px] text-muted">
                meta {configuracao.metas.adesaoAlimentarPercentual}%
              </p>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5" role="group" aria-label="Adesão alimentar">
              {[
                { valor: 0, label: "Fora" },
                { valor: 50, label: "Parcial" },
                { valor: 80, label: "Quase" },
                { valor: 100, label: "Conforme" },
              ].map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => mudar("adesaoAlimentarPercentual", opcao.valor)}
                  className={cx(
                    "rounded-lg border px-1 py-2 text-[10px] font-semibold transition-colors",
                    form.adesaoAlimentarPercentual === opcao.valor
                      ? "border-accent bg-accent/12 text-accent"
                      : "border-line text-muted hover:border-accent/35",
                  )}
                  aria-pressed={form.adesaoAlimentarPercentual === opcao.valor}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Últimos 7 dias</p>
            <p className="text-[10px] text-muted">um dia completo mantém a sequência</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {datas.map((data) => {
              const registro = registros.find((item) => item.data === data);
              const resumoDia = resumoHabitosDoDia(registro, configuracao, data);
              return (
                <div key={data} className="text-center" title={`${resumoDia.percentualGeral}% concluído`}>
                  <span
                    className={cx(
                      "mx-auto grid h-7 w-7 place-items-center rounded-full border text-[9px] font-bold",
                      resumoDia.completo
                        ? "border-accent bg-volt text-ink"
                        : registro
                          ? "border-accent/30 bg-accent/8 text-accent"
                          : "border-line bg-bg/30 text-muted",
                    )}
                  >
                    {registro ? resumoDia.metasAtingidas : "·"}
                  </span>
                  <span className="mt-1 block text-[9px] uppercase text-muted">{diaCurto(data)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        <Button type="button" onClick={salvar} disabled={salvando} className="w-full">
          <CheckIcon className="h-4 w-4" />
          {salvando ? "Salvando…" : registroHoje ? "Atualizar hoje" : "Salvar hábitos de hoje"}
        </Button>
        {confirmacao && (
          <p className="text-center text-xs font-semibold text-accent">Progresso de hoje atualizado.</p>
        )}
      </div>
    </section>
  );
}
