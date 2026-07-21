"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import {
  METAS_HABITOS_PADRAO,
  calcularSequenciasHabitos,
  resumoHabitosDoDia,
} from "@/lib/habitos";
import { useStore } from "@/lib/store";
import type {
  ConfiguracaoHabitos,
  HabitoDiario,
  MetasHabitos,
  RegistroHabitosDiario,
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
  PencilIcon,
  TrashIcon,
} from "./icons";
import { Badge, Button, Card, Input, cx } from "./ui";

type Icone = ComponentType<SVGProps<SVGSVGElement>>;

const ORDEM_HABITOS: HabitoDiario[] = [
  "agua",
  "passos",
  "sono",
  "alongamento",
  "cardio",
  "alimentacao",
];

const DEFINICOES: Record<
  HabitoDiario,
  { titulo: string; descricao: string; unidade: string; meta: keyof MetasHabitos; icon: Icone }
> = {
  agua: {
    titulo: "Água",
    descricao: "Hidratação diária",
    unidade: "ml",
    meta: "aguaMl",
    icon: DropletIcon,
  },
  passos: {
    titulo: "Passos",
    descricao: "Movimento fora do treino",
    unidade: "passos",
    meta: "passos",
    icon: FootstepsIcon,
  },
  sono: {
    titulo: "Sono",
    descricao: "Horas dormidas",
    unidade: "horas",
    meta: "sonoHoras",
    icon: MoonIcon,
  },
  alongamento: {
    titulo: "Alongamento",
    descricao: "Mobilidade e recuperação",
    unidade: "min",
    meta: "alongamentoMinutos",
    icon: ActivityIcon,
  },
  cardio: {
    titulo: "Cardio",
    descricao: "Atividade cardiovascular",
    unidade: "min",
    meta: "cardioMinutos",
    icon: ClockIcon,
  },
  alimentacao: {
    titulo: "Alimentação",
    descricao: "Adesão ao combinado",
    unidade: "%",
    meta: "adesaoAlimentarPercentual",
    icon: LeafIcon,
  },
};

type MetasFormulario = Record<keyof MetasHabitos, string>;

function metasFormulario(metas: MetasHabitos): MetasFormulario {
  return {
    aguaMl: String(metas.aguaMl),
    passos: String(metas.passos),
    sonoHoras: String(metas.sonoHoras).replace(".", ","),
    alongamentoMinutos: String(metas.alongamentoMinutos),
    cardioMinutos: String(metas.cardioMinutos),
    adesaoAlimentarPercentual: String(metas.adesaoAlimentarPercentual),
  };
}

function parseMeta(valor: string, inteiro: boolean): number | null {
  const numero = Number(valor.trim().replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return inteiro ? Math.round(numero) : numero;
}

function dataDeslocada(dataIso: string, deslocamento: number): string {
  const data = new Date(`${dataIso}T12:00:00`);
  data.setDate(data.getDate() + deslocamento);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function hojeLocal(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(dataIso: string): { dia: string; semana: string } {
  const data = new Date(`${dataIso}T12:00:00`);
  return {
    dia: data.toLocaleDateString("pt-BR", { day: "2-digit" }),
    semana: data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
  };
}

function formatarValor(valor: number, habito: HabitoDiario): string {
  if (habito === "passos") return valor.toLocaleString("pt-BR");
  if (habito === "agua" && valor >= 1000) {
    return `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;
  }
  return `${valor.toLocaleString("pt-BR")} ${DEFINICOES[habito].unidade}`;
}

export function HabitosAluno({ alunoId }: { alunoId: string }) {
  const {
    configuracaoHabitosDoAluno,
    registrosHabitosDoAluno,
    salvarConfiguracaoHabitos,
    removerConfiguracaoHabitos,
  } = useStore();
  const configuracao = configuracaoHabitosDoAluno(alunoId);
  const registros = registrosHabitosDoAluno(alunoId);
  const hoje = hojeLocal();
  const [configurando, setConfigurando] = useState(!configuracao);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HabitsIcon className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Hábitos diários</h2>
            {configuracao && <Badge tone="volt">{configuracao.habitosAtivos.length} ativos</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            Metas de água, passos, sono, alongamento, cardio e adesão alimentar.
          </p>
        </div>
        {configuracao && !configurando && (
          <Button type="button" variant="outline" onClick={() => setConfigurando(true)}>
            <PencilIcon className="h-4 w-4" /> Configurar metas
          </Button>
        )}
      </div>

      {configurando ? (
        <ConfiguracaoHabitosForm
          key={configuracao?.atualizadoEm ?? "nova"}
          alunoId={alunoId}
          configuracao={configuracao}
          onSalvar={() => setConfigurando(false)}
          onCancelar={configuracao ? () => setConfigurando(false) : undefined}
          salvar={salvarConfiguracaoHabitos}
          remover={() => {
            if (
              confirm(
                "Desativar o acompanhamento diário? Os registros anteriores serão preservados.",
              )
            ) {
              removerConfiguracaoHabitos(alunoId);
              setConfigurando(true);
            }
          }}
        />
      ) : configuracao ? (
        <PainelHabitos configuracao={configuracao} registros={registros} hoje={hoje} />
      ) : null}
    </section>
  );
}

function ConfiguracaoHabitosForm({
  alunoId,
  configuracao,
  onSalvar,
  onCancelar,
  salvar,
  remover,
}: {
  alunoId: string;
  configuracao?: ConfiguracaoHabitos;
  onSalvar: () => void;
  onCancelar?: () => void;
  salvar: ReturnType<typeof useStore>["salvarConfiguracaoHabitos"];
  remover: () => void;
}) {
  const [ativos, setAtivos] = useState<HabitoDiario[]>(
    configuracao?.habitosAtivos ?? ORDEM_HABITOS,
  );
  const [metas, setMetas] = useState<MetasFormulario>(() =>
    metasFormulario(configuracao?.metas ?? METAS_HABITOS_PADRAO),
  );
  const [erro, setErro] = useState<string | null>(null);

  const alternar = (habito: HabitoDiario) => {
    setAtivos((atuais) =>
      atuais.includes(habito)
        ? atuais.filter((item) => item !== habito)
        : ORDEM_HABITOS.filter((item) => item === habito || atuais.includes(item)),
    );
  };

  const confirmar = () => {
    if (ativos.length === 0) {
      setErro("Ative pelo menos um hábito para acompanhar.");
      return;
    }

    const valores: Partial<MetasHabitos> = {};
    for (const habito of ORDEM_HABITOS) {
      const definicao = DEFINICOES[habito];
      const valor = parseMeta(
        metas[definicao.meta],
        habito !== "sono",
      );
      if (valor === null) {
        setErro(`Informe uma meta válida para ${definicao.titulo.toLowerCase()}.`);
        return;
      }
      valores[definicao.meta] = valor;
    }

    try {
      salvar(alunoId, { habitosAtivos: ativos, metas: valores });
      setErro(null);
      onSalvar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as metas.");
    }
  };

  return (
    <Card className="overflow-hidden border-accent/25">
      <div className="border-b border-line bg-accent/5 p-4 sm:p-5">
        <p className="font-display font-semibold">
          {configuracao ? "Ajustar acompanhamento" : "Ativar hábitos diários"}
        </p>
        <p className="mt-1 text-sm text-muted">
          Escolha o que faz sentido para este aluno. As mudanças valem somente para os próximos
          registros.
        </p>
      </div>

      <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {ORDEM_HABITOS.map((habito) => {
          const definicao = DEFINICOES[habito];
          const Icon = definicao.icon;
          const ativo = ativos.includes(habito);
          return (
            <div
              key={habito}
              className={cx(
                "rounded-xl border p-3.5 transition-colors",
                ativo ? "border-accent/35 bg-accent/6" : "border-line bg-bg/25 opacity-65",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => alternar(habito)}
                  className="flex min-w-0 items-start gap-2.5 text-left"
                  aria-pressed={ativo}
                >
                  <span
                    className={cx(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                      ativo ? "bg-volt text-ink" : "bg-surface-2 text-muted",
                    )}
                  >
                    {ativo ? <CheckIcon className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{definicao.titulo}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{definicao.descricao}</span>
                  </span>
                </button>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                  Meta diária
                </span>
                <div className="relative">
                  <Input
                    inputMode={habito === "sono" ? "decimal" : "numeric"}
                    value={metas[definicao.meta]}
                    onChange={(event) =>
                      setMetas((atuais) => ({ ...atuais, [definicao.meta]: event.target.value }))
                    }
                    disabled={!ativo}
                    className="pr-16"
                    aria-label={`Meta de ${definicao.titulo}`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                    {definicao.unidade}
                  </span>
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {erro && <p className="px-4 pb-3 text-sm text-danger sm:px-5">{erro}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4 sm:px-5">
        <div>
          {configuracao && (
            <Button type="button" variant="danger" onClick={remover}>
              <TrashIcon className="h-4 w-4" /> Desativar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancelar && (
            <Button type="button" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          )}
          <Button type="button" onClick={confirmar}>
            <CheckIcon className="h-4 w-4" /> Salvar metas
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PainelHabitos({
  configuracao,
  registros,
  hoje,
}: {
  configuracao: ConfiguracaoHabitos;
  registros: RegistroHabitosDiario[];
  hoje: string;
}) {
  const sequencias = calcularSequenciasHabitos(registros, hoje);
  const datas = useMemo(
    () => Array.from({ length: 14 }, (_, indice) => dataDeslocada(hoje, indice - 13)),
    [hoje],
  );
  const ultimosSete = datas.slice(-7);
  const registrosPorData = new Map(registros.map((registro) => [registro.data, registro]));
  const diasCompletos = ultimosSete.filter((data) => {
    const registro = registrosPorData.get(data);
    return registro ? resumoHabitosDoDia(registro, configuracao, data).completo : false;
  }).length;
  const registrosRecentes = ultimosSete.filter((data) => registrosPorData.has(data)).length;

  return (
    <Card className="overflow-hidden">
      <div className="grid border-b border-line sm:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-volt text-ink">
            <FlameIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Sequência atual</p>
            <p className="font-display mt-0.5 text-3xl font-bold">
              {sequencias.global.atual} <span className="text-base font-semibold text-muted">dias</span>
            </p>
            <p className="text-xs text-muted">Melhor sequência: {sequencias.global.melhor} dias</p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line sm:border-l sm:border-t-0">
          <div className="p-5">
            <p className="font-display text-3xl font-bold text-accent">{diasCompletos}/7</p>
            <p className="mt-1 text-xs text-muted">dias com todas as metas</p>
          </div>
          <div className="border-l border-line p-5">
            <p className="font-display text-3xl font-bold">{registrosRecentes}</p>
            <p className="mt-1 text-xs text-muted">dias registrados na semana</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-5">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-display font-semibold">Últimos 14 dias</p>
              <p className="mt-0.5 text-xs text-muted">Conclusão diária das metas ativas em cada data.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-volt" /> completo</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-accent/30" /> parcial</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 lg:grid-cols-14">
            {datas.map((data) => {
              const registro = registrosPorData.get(data);
              const resumo = resumoHabitosDoDia(registro, configuracao, data);
              const rotulo = formatarData(data);
              return (
                <div
                  key={data}
                  className={cx(
                    "rounded-xl border px-1.5 py-2.5 text-center",
                    resumo.completo
                      ? "border-accent/40 bg-accent/9"
                      : registro
                        ? "border-accent/20 bg-accent/4"
                        : "border-line bg-bg/25",
                  )}
                  title={
                    registro
                      ? `${resumo.metasAtingidas} de ${resumo.totalHabitosAtivos} metas`
                      : "Sem registro"
                  }
                >
                  <p className="text-[9px] font-semibold uppercase text-muted">{rotulo.semana}</p>
                  <p className="font-display mt-0.5 text-sm font-bold">{rotulo.dia}</p>
                  <span
                    className={cx(
                      "mx-auto mt-2 block h-1.5 w-6 rounded-full",
                      resumo.completo
                        ? "bg-volt"
                        : registro
                          ? "bg-accent/35"
                          : "bg-surface-2",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 font-display font-semibold">Consistência por hábito</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {configuracao.habitosAtivos.map((habito) => {
              const definicao = DEFINICOES[habito];
              const Icon = definicao.icon;
              const diasAtingidos = ultimosSete.filter((data) => {
                const registro = registrosPorData.get(data);
                return registro
                  ? resumoHabitosDoDia(registro, configuracao, data).progressoPorHabito[habito]
                      .atingido
                  : false;
              }).length;
              return (
                <div key={habito} className="rounded-xl border border-line bg-bg/25 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-accent" /> {definicao.titulo}
                    </span>
                    <span className="text-xs font-bold text-accent">{diasAtingidos}/7</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted">meta</p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {formatarValor(configuracao.metas[definicao.meta], habito)}
                      </p>
                    </div>
                    <p className="text-right text-[10px] text-muted">
                      sequência<br />
                      <strong className="text-xs text-text">{sequencias.porHabito[habito].atual} dias</strong>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
