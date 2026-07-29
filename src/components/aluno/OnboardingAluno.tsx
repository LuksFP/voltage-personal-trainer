"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  LOCAIS,
  NIVEIS,
  gerarPlano,
  type EsportePratica,
  type LocalTreino,
  type NivelAluno,
  type PreferenciasTreino,
} from "@/lib/gerador-treino";
import { EscolherEsporte } from "@/components/EscolherEsporte";
import type { NovaContaAluno } from "@/lib/aluno-app";
import type { Objetivo } from "@/lib/types";
import { cx } from "@/components/ui";
import {
  ArrowLeftIcon,
  CheckIcon,
  DumbbellIcon,
  FlameIcon,
  HeartPulseIcon,
  TargetIcon,
  TrendUpIcon,
} from "@/components/icons";

/* Objetivos que o aluno pode escolher sozinho. Reabilitação fica de fora
   de propósito: exige acompanhamento profissional. */
const OBJETIVOS: { id: Objetivo; label: string; detalhe: string; icon: typeof TargetIcon }[] = [
  { id: "Hipertrofia", label: "Ganhar massa", detalhe: "Volume e carga progressiva", icon: DumbbellIcon },
  { id: "Emagrecimento", label: "Emagrecer", detalhe: "Mais repetição, menos descanso, cardio no fim", icon: FlameIcon },
  { id: "Força", label: "Ficar mais forte", detalhe: "Poucas repetições, carga alta, descanso longo", icon: TrendUpIcon },
  { id: "Condicionamento", label: "Condicionamento", detalhe: "Ritmo alto, fôlego e resistência", icon: HeartPulseIcon },
  { id: "Saúde geral", label: "Saúde e disposição", detalhe: "Equilibrado, sem exagero de volume", icon: TargetIcon },
];

const DIAS_OPCOES: { dias: number; rotulo: string }[] = [
  { dias: 2, rotulo: "Corpo todo, 2 treinos" },
  { dias: 3, rotulo: "Divisão em 3 treinos" },
  { dias: 4, rotulo: "Divisão em 4 treinos" },
  { dias: 5, rotulo: "Divisão em 5 treinos" },
  { dias: 6, rotulo: "Divisão em 6 treinos" },
];

const TOTAL_ETAPAS = 6;

interface Rascunho {
  nome: string;
  objetivo?: Objetivo;
  nivel?: NivelAluno;
  dias?: number;
  local?: LocalTreino;
  /** Sem esporte = só musculação. */
  esporte?: EsportePratica;
}

function Opcao({
  selecionada,
  titulo,
  detalhe,
  onClick,
  icon: Icon,
}: {
  selecionada: boolean;
  titulo: string;
  detalhe?: string;
  onClick: () => void;
  icon?: typeof TargetIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionada}
      className={cx(
        "group flex w-full items-center gap-3 border-l-2 py-3.5 pl-4 pr-3 text-left transition-colors",
        selecionada
          ? "border-volt bg-volt/8"
          : "border-line hover:border-accent/50 hover:bg-surface-2/60",
      )}
    >
      {Icon && (
        <Icon
          className={cx(
            "h-5 w-5 shrink-0 transition-colors",
            selecionada ? "text-volt" : "text-muted group-hover:text-accent",
          )}
        />
      )}
      <span className="min-w-0 flex-1">
        <span className={cx("block font-semibold", selecionada && "text-volt")}>{titulo}</span>
        {detalhe && <span className="mt-0.5 block text-sm text-muted">{detalhe}</span>}
      </span>
      {selecionada && <CheckIcon className="h-4 w-4 shrink-0 text-volt" />}
    </button>
  );
}

export function OnboardingAluno({
  aoConcluir,
}: {
  aoConcluir: (dados: NovaContaAluno) => void;
}) {
  const { biblioteca } = useStore();
  const [etapa, setEtapa] = useState(1);
  const [rascunho, setRascunho] = useState<Rascunho>({ nome: "" });
  const [erro, setErro] = useState<string | null>(null);

  const preferencias = useMemo<PreferenciasTreino | null>(() => {
    const { objetivo, nivel, dias, local, esporte } = rascunho;
    if (!objetivo || !nivel || dias == null || !local) return null;
    // Esporte sem nome (clicou em "Outro" e não digitou) não conta.
    const praticado =
      esporte && esporte.nome.trim() ? { ...esporte, nome: esporte.nome.trim() } : undefined;
    return { objetivo, nivel, dias, local, esporte: praticado };
  }, [rascunho]);

  // Prévia real: o mesmo gerador que vai criar a planilha de verdade.
  const previa = useMemo(
    () => (preferencias ? gerarPlano(preferencias, biblioteca, 0) : null),
    [preferencias, biblioteca],
  );

  const avancar = () => {
    if (etapa === 1 && rascunho.nome.trim().length < 2) {
      setErro("Escreve teu nome pra eu não te chamar de 'aluno'.");
      return;
    }
    if (etapa === 5 && rascunho.esporte && rascunho.esporte.nome.trim().length < 2) {
      setErro("Escreve qual esporte — ou marca 'Só musculação'.");
      return;
    }
    setErro(null);
    setEtapa((atual) => Math.min(TOTAL_ETAPAS + 1, atual + 1));
  };

  const voltar = () => {
    setErro(null);
    setEtapa((atual) => Math.max(1, atual - 1));
  };

  const concluir = () => {
    if (!preferencias) return;
    aoConcluir({ nome: rascunho.nome, preferencias });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Numeral gigante estourando a margem — quebra o grid de propósito. */}
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -right-8 top-16 select-none text-[13rem] font-bold leading-none text-volt/[0.06]"
      >
        {Math.min(etapa, TOTAL_ETAPAS)}
      </span>

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-8 pt-7">
        {/* rail de progresso: fica colado na esquerda, fora do eixo central */}
        <div className="mb-8 flex items-center gap-3">
          {etapa > 1 ? (
            <button
              type="button"
              onClick={voltar}
              className="-ml-1 grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Voltar uma etapa"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-volt text-ink">
              <DumbbellIcon className="h-5 w-5" />
            </span>
          )}
          <div className="flex flex-1 gap-1">
            {Array.from({ length: TOTAL_ETAPAS }, (_, i) => (
              <span
                key={i}
                className={cx(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < etapa ? "bg-volt" : "bg-surface-2",
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex-1">
          {etapa === 1 && (
            <section>
              <h1 className="font-display text-4xl font-bold leading-[1.05]">
                Bora montar
                <br />
                <span className="text-volt">seu treino.</span>
              </h1>
              <p className="mt-3 text-muted">
                Seis perguntas rápidas e você sai daqui com a planilha pronta. Sem personal, sem
                mensalidade.
              </p>
              <label htmlFor="nome-aluno" className="mt-8 block text-sm font-semibold text-muted">
                Como te chamam?
              </label>
              <input
                id="nome-aluno"
                autoFocus
                value={rascunho.nome}
                onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && avancar()}
                placeholder="Seu nome"
                className="font-display mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-3xl font-semibold outline-none transition-colors placeholder:text-muted/40 focus:border-volt"
              />
              {erro && <p className="mt-2 text-sm font-semibold text-danger">{erro}</p>}
            </section>
          )}

          {etapa === 2 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Etapa 2</p>
              <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
                O que você quer com o treino?
              </h1>
              <div className="mt-6 space-y-1">
                {OBJETIVOS.map((item) => (
                  <Opcao
                    key={item.id}
                    icon={item.icon}
                    titulo={item.label}
                    detalhe={item.detalhe}
                    selecionada={rascunho.objetivo === item.id}
                    onClick={() => {
                      setRascunho((r) => ({ ...r, objetivo: item.id }));
                      setEtapa(3);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {etapa === 3 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Etapa 3</p>
              <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
                Há quanto tempo você treina?
              </h1>
              <p className="mt-2 text-sm text-muted">
                Isso define o volume — quantos exercícios e séries por treino.
              </p>
              <div className="mt-6 space-y-1">
                {NIVEIS.map((item) => (
                  <Opcao
                    key={item.id}
                    titulo={item.label}
                    detalhe={item.detalhe}
                    selecionada={rascunho.nivel === item.id}
                    onClick={() => {
                      setRascunho((r) => ({ ...r, nivel: item.id }));
                      setEtapa(4);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {etapa === 4 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Etapa 4</p>
              <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
                Quantos dias por semana?
              </h1>
              <p className="mt-2 text-sm text-muted">
                Vale ser honesto. Treino que cabe na rotina é treino que acontece.
              </p>
              <div className="mt-6 space-y-1">
                {DIAS_OPCOES.map((item) => (
                  <Opcao
                    key={item.dias}
                    titulo={`${item.dias} dias`}
                    detalhe={item.rotulo}
                    selecionada={rascunho.dias === item.dias}
                    onClick={() => {
                      setRascunho((r) => ({ ...r, dias: item.dias }));
                      setEtapa(5);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {etapa === 5 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Etapa 5</p>
              <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
                Você pratica algum esporte?
              </h1>
              <p className="mt-2 text-sm text-muted">
                Luta, natação, corrida, bola de fim de semana. A academia entra pra somar com
                isso — não pra competir com isso.
              </p>
              <div className="mt-6">
                <EscolherEsporte
                  valor={rascunho.esporte}
                  diasTreino={rascunho.dias ?? 3}
                  aoMudar={(esporte) => {
                    setErro(null);
                    setRascunho((r) => ({ ...r, esporte }));
                  }}
                />
              </div>
              {erro && <p className="mt-3 text-sm font-semibold text-danger">{erro}</p>}
            </section>
          )}

          {etapa === 6 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Etapa 6</p>
              <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
                Onde você vai treinar?
              </h1>
              <p className="mt-2 text-sm text-muted">
                Em casa, monto tudo com peso corporal e halteres.
              </p>
              <div className="mt-6 space-y-1">
                {LOCAIS.map((item) => (
                  <Opcao
                    key={item.id}
                    titulo={item.label}
                    detalhe={item.detalhe}
                    selecionada={rascunho.local === item.id}
                    onClick={() => {
                      setRascunho((r) => ({ ...r, local: item.id }));
                      setEtapa(7);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {etapa === 7 && previa && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Pronto</p>
              <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
                {rascunho.nome.split(" ")[0]}, seu treino tá montado.
              </h1>
              <p className="mt-2 text-sm text-muted">{previa.descricao}</p>

              <div className="mt-6 divide-y divide-line border-y border-line">
                {previa.divisoes.map((divisao) => (
                  <div key={divisao.id} className="py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display font-semibold">{divisao.nome}</p>
                      <span className="shrink-0 text-xs font-semibold text-muted">
                        {divisao.exercicios.length} exercícios
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">
                      {divisao.exercicios.map((ex) => ex.nome).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm text-muted">
                Dá pra trocar exercício, mudar carga e gerar outro treino depois. Nada aqui é
                definitivo.
              </p>
            </section>
          )}
        </div>

        {/* rodapé de ação: só nas etapas que não avançam sozinhas */}
        {(etapa === 1 || etapa === 5 || etapa === 7) && (
          <div className="pt-6">
            <button
              type="button"
              onClick={etapa === 7 ? concluir : avancar}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-volt px-5 py-3.5 font-display text-base font-bold text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {etapa === 7 ? (
                <>
                  <CheckIcon className="h-5 w-5" /> Começar a treinar
                </>
              ) : etapa === 5 && !rascunho.esporte ? (
                "Só faço musculação"
              ) : (
                "Continuar"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
