"use client";

import { useState } from "react";
import {
  calcularProgressoMeta,
  type CriarMetaAlunoInput,
  type ProgressoMetaAluno,
} from "@/lib/metas";
import { useStore } from "@/lib/store";
import type { MedidaCorporalMeta, MetaAluno } from "@/lib/types";
import { Modal } from "./Modal";
import { MetaAlunoForm, type MetaAlunoFormValues } from "./MetaAlunoForm";
import {
  AlertTriangleIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
  TrophyIcon,
} from "./icons";
import { Badge, Button, Card, cx } from "./ui";
import { hojeIso } from "@/lib/data";

const ROTULOS_MEDIDA: Record<MedidaCorporalMeta, string> = {
  percentualGordura: "% de gordura",
  cintura: "cintura",
  quadril: "quadril",
  peito: "peito",
  braco: "braço",
  coxa: "coxa",
};

function inputDaMeta(values: MetaAlunoFormValues): CriarMetaAlunoInput {
  const base = {
    titulo: values.titulo,
    dataInicio: values.dataInicio,
    prazo: values.prazo,
    valorInicial: values.valorInicial,
    valorAlvo: values.valorAlvo,
  };

  if (values.tipo === "peso") return { ...base, tipo: "peso", unidade: "kg" };
  if (values.tipo === "frequencia-semanal") {
    return { ...base, tipo: "frequencia-semanal", unidade: "sessoes/semana" };
  }
  if (values.tipo === "carga-exercicio") {
    return {
      ...base,
      tipo: "carga-exercicio",
      unidade: "kg",
      exercicioNomeSnapshot: values.exercicioNomeSnapshot ?? "",
      bibliotecaId: values.bibliotecaId,
    };
  }

  const medida = values.medida ?? "cintura";
  if (medida === "percentualGordura") {
    return {
      ...base,
      tipo: "medida-corporal",
      medida,
      unidade: "%",
    };
  }
  return {
    ...base,
    tipo: "medida-corporal",
    medida,
    unidade: "cm",
  };
}

function unidadeVisivel(meta: MetaAluno): string {
  return meta.unidade === "sessoes/semana" ? "sessões/semana" : meta.unidade;
}

function formatarValor(valor: number, unidade: string): string {
  const casas = Number.isInteger(valor) ? 0 : 1;
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: 1,
  })} ${unidade}`;
}

function formatarData(data: string): string {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function descricaoMeta(meta: MetaAluno): string {
  if (meta.tipo === "peso") return "Peso corporal";
  if (meta.tipo === "medida-corporal") return `Medida de ${ROTULOS_MEDIDA[meta.medida]}`;
  if (meta.tipo === "frequencia-semanal") return "Treinos realizados na semana atual";
  return `Melhor carga · ${meta.exercicioNomeSnapshot}`;
}

function textoPrazo(meta: MetaAluno, progresso: ProgressoMetaAluno): string {
  if (meta.status === "concluida") {
    return meta.concluidaEm
      ? `Concluída em ${new Date(meta.concluidaEm).toLocaleDateString("pt-BR")}`
      : "Meta concluída";
  }
  if (meta.status === "arquivada") return "Meta arquivada";
  if (progresso.prazoVencido) return `Prazo encerrado em ${formatarData(meta.prazo)}`;
  return `Prazo: ${formatarData(meta.prazo)}`;
}

export function MetasAluno({ alunoId }: { alunoId: string }) {
  const {
    metasDoAluno,
    addMetaAluno,
    updateMetaAluno,
    concluirMetaAluno,
    reativarMetaAluno,
    arquivarMetaAluno,
    removeMetaAluno,
    avaliacoes,
    sessoes,
    historicoExercicios,
    biblioteca,
  } = useStore();
  const metas = metasDoAluno(alunoId);
  const ativas = metas.filter((meta) => meta.status === "ativa");
  const historico = metas.filter((meta) => meta.status !== "ativa");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<MetaAluno | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const referencia = hojeIso();

  const progressos = new Map(
    metas.map((meta) => [
      meta.id,
      calcularProgressoMeta(
        meta,
        { avaliacoes, sessoes, historicoExercicios },
        referencia,
      ),
    ]),
  );

  const fecharForm = () => {
    setFormAberto(false);
    setEditando(null);
    setErro(null);
  };

  const salvar = (values: MetaAlunoFormValues) => {
    try {
      const input = inputDaMeta(values);
      if (editando) updateMetaAluno(editando.id, input);
      else addMetaAluno(alunoId, input);
      fecharForm();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a meta.");
    }
  };

  const executar = (acao: () => void) => {
    try {
      setErro(null);
      acao();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a meta.");
    }
  };

  const excluir = (meta: MetaAluno) => {
    if (!confirm(`Excluir definitivamente a meta “${meta.titulo}”?`)) return;
    executar(() => removeMetaAluno(meta.id));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold">
            <TargetIcon className="h-5 w-5 text-accent" />
            Metas de evolução
          </h2>
          <p className="mt-1 text-sm text-muted">
            Peso, medidas, frequência e carga-alvo calculados pelos registros reais.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditando(null);
            setFormAberto(true);
            setErro(null);
          }}
        >
          <PlusIcon className="h-4 w-4" /> Nova meta
        </Button>
      </div>

      {erro && !formAberto && (
        <p className="rounded-xl border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}

      {ativas.length === 0 ? (
        <Card className="px-5 py-8 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
            <TargetIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 font-display font-semibold">Nenhuma meta ativa</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Crie um alvo com prazo. A evolução passa a acompanhar avaliações, frequência ou séries
            registradas, conforme o tipo escolhido.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ativas.map((meta) => (
            <MetaCard
              key={meta.id}
              meta={meta}
              progresso={progressos.get(meta.id)!}
              onEditar={() => {
                setEditando(meta);
                setFormAberto(true);
                setErro(null);
              }}
              onConcluir={() => executar(() => concluirMetaAluno(meta.id))}
              onArquivar={() => executar(() => arquivarMetaAluno(meta.id))}
              onExcluir={() => excluir(meta)}
            />
          ))}
        </div>
      )}

      {historico.length > 0 && (
        <div className="rounded-xl2 border border-line bg-surface/45">
          <button
            type="button"
            onClick={() => setHistoricoAberto((aberto) => !aberto)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            aria-expanded={historicoAberto}
          >
            <span>
              <span className="font-display text-sm font-semibold">Concluídas e arquivadas</span>
              <span className="ml-2 text-xs text-muted">{historico.length}</span>
            </span>
            <span className="text-xs font-semibold text-accent">
              {historicoAberto ? "Ocultar" : "Ver histórico"}
            </span>
          </button>
          {historicoAberto && (
            <div className="grid gap-3 border-t border-line p-3 lg:grid-cols-2">
              {historico.map((meta) => (
                <MetaCard
                  key={meta.id}
                  meta={meta}
                  progresso={progressos.get(meta.id)!}
                  onReativar={() => executar(() => reativarMetaAluno(meta.id))}
                  onExcluir={() => excluir(meta)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={formAberto}
        onClose={fecharForm}
        title={editando ? "Editar meta" : "Nova meta de evolução"}
      >
        <MetaAlunoForm
          key={editando?.id ?? "nova"}
          meta={editando ?? undefined}
          biblioteca={biblioteca}
          onSubmit={salvar}
          onCancel={fecharForm}
        />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>
    </section>
  );
}

function MetaCard({
  meta,
  progresso,
  onEditar,
  onConcluir,
  onArquivar,
  onReativar,
  onExcluir,
}: {
  meta: MetaAluno;
  progresso: ProgressoMetaAluno;
  onEditar?: () => void;
  onConcluir?: () => void;
  onArquivar?: () => void;
  onReativar?: () => void;
  onExcluir: () => void;
}) {
  const unidade = unidadeVisivel(meta);
  const percentual = meta.status === "concluida" ? 100 : progresso.percentual;
  const semRegistro = progresso.valorAtual === null;

  return (
    <Card
      className={cx(
        "overflow-hidden",
        progresso.prazoVencido && "border-orange-400/30",
        meta.status === "concluida" && "border-accent/30",
        meta.status === "arquivada" && "opacity-75",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display truncate font-semibold">{meta.titulo}</h3>
              {meta.status === "concluida" && <Badge tone="volt">Concluída</Badge>}
              {meta.status === "arquivada" && <Badge>Arquivada</Badge>}
              {progresso.prazoVencido && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
                  <AlertTriangleIcon className="h-3.5 w-3.5" /> Prazo vencido
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-muted">{descricaoMeta(meta)}</p>
          </div>
          <span
            className={cx(
              "font-display shrink-0 text-2xl font-bold",
              meta.status === "concluida" ? "text-accent" : "text-text",
            )}
          >
            {percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cx(
              "h-full rounded-full transition-[width] duration-500",
              progresso.prazoVencido ? "bg-orange-400" : "bg-volt",
            )}
            style={{ width: `${percentual}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Inicial</p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatarValor(meta.valorInicial, unidade)}
            </p>
          </div>
          <span className="text-muted">→</span>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Alvo</p>
            <p className="mt-0.5 text-sm font-semibold text-accent">
              {formatarValor(meta.valorAlvo, unidade)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Valor atual</p>
            <p className={cx("mt-0.5 text-sm font-semibold", semRegistro && "text-muted")}>
              {semRegistro
                ? "Aguardando registro"
                : formatarValor(progresso.valorAtual!, unidade)}
            </p>
          </div>
          <p
            className={cx(
              "text-right text-xs",
              progresso.prazoVencido ? "text-orange-300" : "text-muted",
            )}
          >
            {textoPrazo(meta, progresso)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-line bg-surface-2/25 px-3 py-2">
        {onEditar && (
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onEditar}>
            <PencilIcon className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
        {onConcluir && (
          <Button
            type="button"
            variant="ghost"
            className="px-2.5 py-1.5 text-xs text-accent"
            onClick={onConcluir}
          >
            <CheckIcon className="h-3.5 w-3.5" /> Concluir
          </Button>
        )}
        {onArquivar && (
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onArquivar}>
            Arquivar
          </Button>
        )}
        {onReativar && (
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onReativar}>
            <TrophyIcon className="h-3.5 w-3.5" /> Reativar
          </Button>
        )}
        <button
          type="button"
          onClick={onExcluir}
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label={`Excluir ${meta.titulo}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
