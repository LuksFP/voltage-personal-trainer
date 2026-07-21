"use client";

import { useState } from "react";
import {
  PERGUNTAS_PARQ,
  respostasPositivasParQ,
  type SalvarRascunhoAnamneseInput,
} from "@/lib/anamnese";
import { useStore } from "@/lib/store";
import type {
  AnamneseDigital,
  ConsentimentosAnamnese,
  PerguntaParQId,
  RespostaParQ,
} from "@/lib/types";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronRightIcon,
  HeartPulseIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { Button, Input, Textarea, cx } from "@/components/ui";

interface RespostaFormulario {
  resposta: boolean | null;
  detalhe: string;
}

interface EstadoFormulario {
  contatoNome: string;
  contatoTelefone: string;
  contatoParentesco: string;
  historicoCondicoes: string;
  lesoes: string;
  medicamentos: string;
  restricoes: string;
  respostas: Record<PerguntaParQId, RespostaFormulario>;
  consentimentos: ConsentimentosAnamnese;
  assinaturaNome: string;
}

function respostasIniciais(anamnese?: AnamneseDigital): EstadoFormulario["respostas"] {
  return Object.fromEntries(
    PERGUNTAS_PARQ.map((pergunta) => {
      const existente = anamnese?.respostasParq.find(
        (resposta) => resposta.perguntaId === pergunta.id,
      );
      return [
        pergunta.id,
        { resposta: existente?.resposta ?? null, detalhe: existente?.detalhe ?? "" },
      ];
    }),
  ) as EstadoFormulario["respostas"];
}

function estadoInicial(anamnese?: AnamneseDigital): EstadoFormulario {
  return {
    contatoNome: anamnese?.contatoEmergencia.nome ?? "",
    contatoTelefone: anamnese?.contatoEmergencia.telefone ?? "",
    contatoParentesco: anamnese?.contatoEmergencia.parentesco ?? "",
    historicoCondicoes: anamnese?.historicoCondicoes ?? "",
    lesoes: anamnese?.lesoes ?? "",
    medicamentos: anamnese?.medicamentos ?? "",
    restricoes: anamnese?.restricoes ?? "",
    respostas: respostasIniciais(anamnese),
    consentimentos: anamnese?.consentimentos ?? {
      veracidadeInformacoes: false,
      cienciaTriagemNaoEDiagnosticoNemLiberacao: false,
      tratamentoLocalDados: false,
    },
    assinaturaNome: anamnese?.assinaturaNome ?? "",
  };
}

function payloadDoFormulario(form: EstadoFormulario): SalvarRascunhoAnamneseInput {
  const respostasParq: RespostaParQ[] = PERGUNTAS_PARQ.flatMap((pergunta) => {
    const resposta = form.respostas[pergunta.id];
    if (resposta.resposta === null) return [];
    return [
      {
        perguntaId: pergunta.id,
        resposta: resposta.resposta,
        detalhe: resposta.detalhe.trim() || undefined,
      },
    ];
  });
  return {
    contatoEmergencia: {
      nome: form.contatoNome,
      telefone: form.contatoTelefone,
      parentesco: form.contatoParentesco || undefined,
    },
    historicoCondicoes: form.historicoCondicoes,
    lesoes: form.lesoes,
    medicamentos: form.medicamentos,
    restricoes: form.restricoes,
    respostasParq,
    consentimentos: form.consentimentos,
    assinaturaNome: form.assinaturaNome,
  };
}

function statusAnamnese(anamnese?: AnamneseDigital): {
  titulo: string;
  detalhe: string;
  tom: string;
} {
  if (!anamnese) {
    return {
      titulo: "Anamnese pendente",
      detalhe: "Leva alguns minutos e ajuda seu personal a adaptar o treino.",
      tom: "bg-volt text-ink",
    };
  }
  if (anamnese.status === "rascunho") {
    return {
      titulo: "Anamnese em rascunho",
      detalhe: "Continue de onde parou e envie quando estiver completa.",
      tom: "bg-orange-400/15 text-orange-300",
    };
  }
  if (anamnese.status === "enviada") {
    return {
      titulo: "Anamnese enviada",
      detalhe: "Seu personal recebeu as respostas e fará a revisão.",
      tom: "bg-accent/15 text-accent",
    };
  }
  return {
    titulo: "Anamnese revisada",
    detalhe: "As informações já foram verificadas pelo seu personal.",
    tom: "bg-accent/15 text-accent",
  };
}

export function AnamnesePortal({ alunoId }: { alunoId: string }) {
  const {
    anamneseDoAluno,
    salvarRascunhoAnamnese,
    enviarAnamnese,
    reabrirAnamnese,
  } = useStore();
  const anamnese = anamneseDoAluno(alunoId);
  const [aberto, setAberto] = useState(!anamnese || anamnese.status === "rascunho");
  const status = statusAnamnese(anamnese);
  const positivas = anamnese ? respostasPositivasParQ(anamnese.respostasParq).length : 0;

  return (
    <section className="overflow-hidden rounded-xl2 border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={aberto}
      >
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", status.tom)}>
          <ShieldCheckIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block font-semibold">{status.titulo}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{status.detalhe}</span>
          {positivas > 0 && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-1 text-[10px] font-semibold text-orange-300">
              <AlertTriangleIcon className="h-3 w-3" /> {positivas} resposta
              {positivas === 1 ? "" : "s"} para conversar
            </span>
          )}
        </span>
        <ChevronRightIcon
          className={cx(
            "mt-2 h-5 w-5 shrink-0 text-muted transition-transform",
            aberto && "rotate-90",
          )}
        />
      </button>

      {!aberto && anamnese?.status === "revisada" && anamnese.observacaoPersonal && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
            Observação do personal
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{anamnese.observacaoPersonal}</p>
        </div>
      )}

      {aberto && anamnese && anamnese.status !== "rascunho" ? (
        <div className="space-y-3 border-t border-line p-4">
          {anamnese.status === "revisada" && anamnese.observacaoPersonal && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Observação do personal
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {anamnese.observacaoPersonal}
              </p>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted">
            Para corrigir alguma informação, reabra o formulário. Depois será necessário salvar,
            assinar e enviar novamente ao personal.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => reabrirAnamnese(alunoId)}
          >
            Atualizar respostas
          </Button>
        </div>
      ) : aberto ? (
        <FormularioAnamnese
          key={anamnese?.atualizadoEm ?? "nova"}
          alunoId={alunoId}
          anamnese={anamnese}
          salvar={salvarRascunhoAnamnese}
          enviar={enviarAnamnese}
          onConcluir={() => setAberto(false)}
        />
      ) : null}
    </section>
  );
}

function FormularioAnamnese({
  alunoId,
  anamnese,
  salvar,
  enviar,
  onConcluir,
}: {
  alunoId: string;
  anamnese?: AnamneseDigital;
  salvar: ReturnType<typeof useStore>["salvarRascunhoAnamnese"];
  enviar: ReturnType<typeof useStore>["enviarAnamnese"];
  onConcluir: () => void;
}) {
  const [form, setForm] = useState<EstadoFormulario>(() => estadoInicial(anamnese));
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const mudar = <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setAlterado(true);
    setMensagem(null);
  };

  const salvarRascunho = () => {
    try {
      salvar(alunoId, payloadDoFormulario(form));
      setAlterado(false);
      setErro(null);
      setMensagem("Rascunho salvo neste aparelho.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o rascunho.");
    }
  };

  const enviarAoPersonal = () => {
    if (alterado) {
      setErro("Salve as alterações antes de enviar a anamnese.");
      return;
    }
    try {
      enviar(alunoId);
      setErro(null);
      setMensagem(null);
      onConcluir();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar a anamnese.");
    }
  };

  const respondidas = Object.values(form.respostas).filter(
    (resposta) => resposta.resposta !== null,
  ).length;
  const positivas = Object.values(form.respostas).filter(
    (resposta) => resposta.resposta === true,
  ).length;
  const temRascunhoSalvo = Boolean(anamnese) && !alterado;

  return (
    <div className="space-y-6 border-t border-line p-4">
      <div>
        <p className="flex items-center gap-2 font-display font-semibold">
          <PhoneIcon className="h-4 w-4 text-accent" /> Contato de emergência
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Nome completo
            </span>
            <Input value={form.contatoNome} onChange={(e) => mudar("contatoNome", e.target.value)} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Telefone
            </span>
            <Input
              inputMode="tel"
              value={form.contatoTelefone}
              onChange={(e) => mudar("contatoTelefone", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Relação
            </span>
            <Input
              value={form.contatoParentesco}
              onChange={(e) => mudar("contatoParentesco", e.target.value)}
              placeholder="Ex.: mãe"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="flex items-center gap-2 font-display font-semibold">
          <HeartPulseIcon className="h-4 w-4 text-accent" /> Histórico de saúde
        </p>
        <p className="mt-1 text-xs text-muted">
          Preencha todos os campos. Quando não houver nada a declarar, escreva “nenhum”.
        </p>
        <div className="mt-3 space-y-3">
          <CampoSaude
            label="Condições e histórico"
            value={form.historicoCondicoes}
            onChange={(valor) => mudar("historicoCondicoes", valor)}
            placeholder="Diagnósticos, cirurgias ou condições relevantes — ou “nenhum”."
          />
          <CampoSaude
            label="Lesões e desconfortos"
            value={form.lesoes}
            onChange={(valor) => mudar("lesoes", valor)}
            placeholder="Local, quando ocorreu e situação atual — ou “nenhum”."
          />
          <CampoSaude
            label="Medicamentos em uso"
            value={form.medicamentos}
            onChange={(valor) => mudar("medicamentos", valor)}
            placeholder="Nome e finalidade informada — ou “nenhum”."
          />
          <CampoSaude
            label="Restrições ou orientações"
            value={form.restricoes}
            onChange={(valor) => mudar("restricoes", valor)}
            placeholder="Movimentos, intensidade ou orientação profissional — ou “nenhum”."
          />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display font-semibold">Triagem PAR-Q</p>
            <p className="mt-1 text-xs text-muted">Responda sim ou não às sete perguntas.</p>
          </div>
          <span className="text-xs font-semibold text-muted">{respondidas}/7</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {PERGUNTAS_PARQ.map((pergunta, indice) => {
            const atual = form.respostas[pergunta.id];
            return (
              <div
                key={pergunta.id}
                className={cx(
                  "rounded-xl border p-3",
                  atual.resposta === true
                    ? "border-orange-400/35 bg-orange-400/6"
                    : "border-line bg-bg/25",
                )}
              >
                <p className="text-sm font-medium leading-relaxed">
                  <span className="mr-1 text-xs font-bold text-accent">{indice + 1}.</span>{" "}
                  {pergunta.texto}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[false, true].map((valor) => (
                    <button
                      key={String(valor)}
                      type="button"
                      onClick={() => {
                        setForm((estado) => ({
                          ...estado,
                          respostas: {
                            ...estado.respostas,
                            [pergunta.id]: { ...estado.respostas[pergunta.id], resposta: valor },
                          },
                        }));
                        setAlterado(true);
                        setMensagem(null);
                      }}
                      className={cx(
                        "rounded-lg border py-2 text-xs font-semibold transition-colors",
                        atual.resposta === valor
                          ? valor
                            ? "border-orange-400 bg-orange-400/12 text-orange-300"
                            : "border-accent bg-accent/10 text-accent"
                          : "border-line text-muted",
                      )}
                      aria-pressed={atual.resposta === valor}
                    >
                      {valor ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
                {atual.resposta === true && (
                  <Textarea
                    value={atual.detalhe}
                    onChange={(event) => {
                      setForm((estado) => ({
                        ...estado,
                        respostas: {
                          ...estado.respostas,
                          [pergunta.id]: {
                            ...estado.respostas[pergunta.id],
                            detalhe: event.target.value,
                          },
                        },
                      }));
                      setAlterado(true);
                    }}
                    rows={2}
                    placeholder="Conte um pouco mais para seu personal."
                    className="mt-2"
                  />
                )}
              </div>
            );
          })}
        </div>
        {positivas > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-400/25 bg-orange-400/7 p-3 text-orange-300">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              {positivas} resposta{positivas === 1 ? "" : "s"} positiva
              {positivas === 1 ? "" : "s"}. Isso não é diagnóstico nem bloqueio automático;
              alinhe com seu personal antes de aumentar a exigência.
            </p>
          </div>
        )}
      </div>

      <div>
        <p className="flex items-center gap-2 font-display font-semibold">
          <ShieldCheckIcon className="h-4 w-4 text-accent" /> Declarações e assinatura
        </p>
        <div className="mt-3 space-y-2">
          <Consentimento
            checked={form.consentimentos.veracidadeInformacoes}
            onChange={(checked) =>
              mudar("consentimentos", {
                ...form.consentimentos,
                veracidadeInformacoes: checked,
              })
            }
          >
            Declaro que as informações são verdadeiras e avisarei se houver mudanças.
          </Consentimento>
          <Consentimento
            checked={form.consentimentos.cienciaTriagemNaoEDiagnosticoNemLiberacao}
            onChange={(checked) =>
              mudar("consentimentos", {
                ...form.consentimentos,
                cienciaTriagemNaoEDiagnosticoNemLiberacao: checked,
              })
            }
          >
            Entendo que esta triagem não substitui diagnóstico, avaliação ou liberação de um
            profissional de saúde.
          </Consentimento>
          <Consentimento
            checked={form.consentimentos.tratamentoLocalDados}
            onChange={(checked) =>
              mudar("consentimentos", {
                ...form.consentimentos,
                tratamentoLocalDados: checked,
              })
            }
          >
            Autorizo o registro local destes dados no Voltage para acompanhamento do treino.
          </Consentimento>
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Assinatura — nome completo
          </span>
          <Input
            value={form.assinaturaNome}
            onChange={(event) => mudar("assinaturaNome", event.target.value)}
            placeholder="Digite seu nome completo"
          />
        </label>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      {mensagem && <p className="text-sm font-semibold text-accent">{mensagem}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={salvarRascunho}>
          Salvar rascunho
        </Button>
        <Button type="button" onClick={enviarAoPersonal} disabled={!temRascunhoSalvo}>
          <CheckIcon className="h-4 w-4" /> Enviar ao personal
        </Button>
      </div>
      {alterado && anamnese && (
        <p className="text-center text-[10px] text-muted">
          Salve as alterações para liberar o envio.
        </p>
      )}
    </div>
  );
}

function CampoSaude({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        placeholder={placeholder}
      />
    </label>
  );
}

function Consentimento({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-bg/25 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-xs leading-relaxed text-muted">{children}</span>
    </label>
  );
}
