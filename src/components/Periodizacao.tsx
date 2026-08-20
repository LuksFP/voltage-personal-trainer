"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  dataFimComMesmaDuracao,
  diferencaDias,
  duracaoProgramaSemanas,
  formatarDataCurta,
  intervaloFase,
  proximoDiaDoPrograma,
} from "@/lib/periodizacao";
import type { FasePrograma, ProgramaTreino, StatusPrograma, Treino } from "@/lib/types";
import { Modal } from "./Modal";
import { Badge, Button, Card, Field, Input, Textarea, cx } from "./ui";
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
} from "./icons";
import { hojeIso } from "@/lib/data";

type ProgramaFormValues = Pick<
  ProgramaTreino,
  "nome" | "objetivo" | "dataInicio" | "dataFim"
>;

type FaseFormValues = Omit<FasePrograma, "id" | "ordem">;

const STATUS_LABEL: Record<StatusPrograma, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<StatusPrograma, "neutral" | "volt" | "off"> = {
  rascunho: "neutral",
  ativo: "volt",
  concluido: "neutral",
  cancelado: "off",
};

function progressoDoPrograma(programa: ProgramaTreino): number {
  const hoje = hojeIso();
  if (hoje <= programa.dataInicio) return 0;
  if (hoje >= programa.dataFim) return 100;
  const total = Math.max(1, diferencaDias(programa.dataInicio, programa.dataFim));
  return Math.round((diferencaDias(programa.dataInicio, hoje) / total) * 100);
}

export function Periodizacao({ alunoId }: { alunoId: string }) {
  const {
    programasDoAluno,
    treinosDoAluno,
    addProgramaTreino,
    updateProgramaTreino,
    ativarProgramaTreino,
    renovarProgramaTreino,
    removeProgramaTreino,
    addFasePrograma,
    updateFasePrograma,
    moverFasePrograma,
    removeFasePrograma,
  } = useStore();
  const programas = programasDoAluno(alunoId);
  const treinos = treinosDoAluno(alunoId);
  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<ProgramaTreino | null>(null);
  const [renovando, setRenovando] = useState<ProgramaTreino | null>(null);
  const [faseModal, setFaseModal] = useState<{
    programa: ProgramaTreino;
    fase?: FasePrograma;
  } | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const criarPrograma = (values: ProgramaFormValues) => {
    const programa = addProgramaTreino(alunoId, values);
    setNovoOpen(false);
    setMensagem(`Programa “${programa.nome}” criado como rascunho.`);
  };

  const salvarPrograma = (values: ProgramaFormValues) => {
    if (!editando) return;
    updateProgramaTreino(editando.id, values);
    setEditando(null);
    setMensagem(`Programa “${values.nome}” atualizado.`);
  };

  const renovar = (values: ProgramaFormValues & { ativar: boolean }) => {
    if (!renovando) return;
    const novo = renovarProgramaTreino(renovando.id, {
      nome: values.nome,
      dataInicio: values.dataInicio,
      dataFim: values.dataFim,
      ativar: values.ativar,
    });
    if (novo && values.objetivo !== renovando.objetivo) {
      updateProgramaTreino(novo.id, { objetivo: values.objetivo });
    }
    setRenovando(null);
    if (novo) {
      setMensagem(
        `Renovação “${novo.nome}” criada com ${novo.fases.length} fase${
          novo.fases.length === 1 ? "" : "s"
        } clonada${novo.fases.length === 1 ? "" : "s"}.`,
      );
    }
  };

  const salvarFase = (values: FaseFormValues) => {
    if (!faseModal) return;
    if (faseModal.fase) {
      updateFasePrograma(faseModal.programa.id, faseModal.fase.id, values);
      setMensagem(`Fase “${values.nome}” atualizada.`);
    } else {
      addFasePrograma(faseModal.programa.id, values);
      setMensagem(`Fase “${values.nome}” adicionada ao programa.`);
    }
    setFaseModal(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Periodização</h2>
          <p className="mt-1 text-sm text-muted">
            Organize ciclos, fases e planilhas por semana, com datas e renovação.
          </p>
        </div>
        <Button variant="outline" onClick={() => setNovoOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Novo programa
        </Button>
      </div>

      {mensagem && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm"
        >
          <span className="flex items-start gap-2 font-semibold text-accent">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {mensagem}
          </span>
          <button type="button" onClick={() => setMensagem(null)} className="text-xs text-muted">
            Fechar
          </button>
        </div>
      )}

      {programas.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <CalendarIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Nenhum programa planejado</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              Crie um ciclo, distribua as fases nas semanas e vincule as planilhas do aluno.
            </p>
          </div>
          <Button onClick={() => setNovoOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Criar primeiro programa
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {programas.map((programa) => (
            <ProgramaCard
              key={programa.id}
              programa={programa}
              treinos={treinos}
              onEdit={() => setEditando(programa)}
              onRenew={() => setRenovando(programa)}
              onActivate={() => {
                ativarProgramaTreino(programa.id);
                setMensagem(`Programa “${programa.nome}” definido como ativo.`);
              }}
              onStatus={(status) => {
                updateProgramaTreino(programa.id, { status });
                setMensagem(`Programa “${programa.nome}” marcado como ${STATUS_LABEL[status].toLowerCase()}.`);
              }}
              onRemove={() => {
                if (!confirm(`Excluir o programa “${programa.nome}” e todas as fases?`)) return;
                removeProgramaTreino(programa.id);
                setMensagem(`Programa “${programa.nome}” excluído.`);
              }}
              onAddFase={() => setFaseModal({ programa })}
              onEditFase={(fase) => setFaseModal({ programa, fase })}
              onMoveFase={(faseId, direcao) =>
                moverFasePrograma(programa.id, faseId, direcao)
              }
              onRemoveFase={(fase) => {
                if (!confirm(`Remover a fase “${fase.nome}”?`)) return;
                removeFasePrograma(programa.id, fase.id);
              }}
            />
          ))}
        </div>
      )}

      <Modal open={novoOpen} onClose={() => setNovoOpen(false)} title="Novo programa">
        <ProgramaForm onSubmit={criarPrograma} onCancel={() => setNovoOpen(false)} />
      </Modal>

      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title="Editar programa"
      >
        {editando && (
          <ProgramaForm
            initial={editando}
            onSubmit={salvarPrograma}
            onCancel={() => setEditando(null)}
          />
        )}
      </Modal>

      <Modal
        open={renovando !== null}
        onClose={() => setRenovando(null)}
        title="Renovar programa"
      >
        {renovando && (
          <RenovacaoForm
            programa={renovando}
            onSubmit={renovar}
            onCancel={() => setRenovando(null)}
          />
        )}
      </Modal>

      <Modal
        open={faseModal !== null}
        onClose={() => setFaseModal(null)}
        title={faseModal?.fase ? "Editar fase" : "Nova fase"}
      >
        {faseModal && (
          <FaseForm
            programa={faseModal.programa}
            treinos={treinos}
            initial={faseModal.fase}
            onSubmit={salvarFase}
            onCancel={() => setFaseModal(null)}
          />
        )}
      </Modal>
    </section>
  );
}

function ProgramaCard({
  programa,
  treinos,
  onEdit,
  onRenew,
  onActivate,
  onStatus,
  onRemove,
  onAddFase,
  onEditFase,
  onMoveFase,
  onRemoveFase,
}: {
  programa: ProgramaTreino;
  treinos: Treino[];
  onEdit: () => void;
  onRenew: () => void;
  onActivate: () => void;
  onStatus: (status: StatusPrograma) => void;
  onRemove: () => void;
  onAddFase: () => void;
  onEditFase: (fase: FasePrograma) => void;
  onMoveFase: (faseId: string, direcao: "cima" | "baixo") => void;
  onRemoveFase: (fase: FasePrograma) => void;
}) {
  const [aberto, setAberto] = useState(programa.status === "ativo");
  const fases = [...programa.fases].sort((a, b) => a.ordem - b.ordem);
  const semanas = duracaoProgramaSemanas(programa);
  const progresso = progressoDoPrograma(programa);
  const hoje = hojeIso();
  const faseAtual = fases.find((fase) => {
    const intervalo = intervaloFase(programa, fase);
    return hoje >= intervalo.inicio && hoje <= intervalo.fim;
  });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-surface-2/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-semibold">{programa.nome}</h3>
              <Badge tone={STATUS_TONE[programa.status]}>{STATUS_LABEL[programa.status]}</Badge>
              <Badge>{semanas} semana{semanas === 1 ? "" : "s"}</Badge>
            </div>
            {programa.objetivo && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <TargetIcon className="h-4 w-4 text-accent" />
                {programa.objetivo}
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              {formatarDataCurta(programa.dataInicio)} — {formatarDataCurta(programa.dataFim)}
              {faseAtual ? ` · Agora: ${faseAtual.nome}` : ""}
            </p>
            <div className="mt-3 max-w-xl">
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-muted">
                <span>Progresso do período</span>
                <span>{progresso}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-volt" style={{ width: `${progresso}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {programa.status !== "ativo" && programa.status !== "cancelado" && (
              <Button variant="outline" onClick={onActivate} className="!px-3 !py-2">
                Ativar
              </Button>
            )}
            <Button variant="outline" onClick={onRenew} className="!px-3 !py-2">
              <CopyIcon className="h-4 w-4" />
              Renovar
            </Button>
            <Button variant="ghost" onClick={onEdit} className="!px-2.5" aria-label="Editar programa">
              <PencilIcon className="h-4 w-4" />
            </Button>
            {programa.status !== "concluido" && programa.status !== "cancelado" && (
              <Button
                variant="ghost"
                onClick={() => onStatus("concluido")}
                className="!px-2.5"
                aria-label="Concluir programa"
                title="Marcar como concluído"
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
            )}
            {programa.status !== "cancelado" && (
              <Button
                variant="ghost"
                onClick={() => confirm("Cancelar este programa?") && onStatus("cancelado")}
                className="!px-2.5 text-danger"
                aria-label="Cancelar programa"
              >
                ✕
              </Button>
            )}
            <Button variant="danger" onClick={onRemove} className="!px-2.5" aria-label="Excluir programa">
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className={cx(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors sm:px-5",
          aberto ? "bg-surface-2/20 text-accent" : "text-muted hover:bg-surface-2/30 hover:text-text",
        )}
        aria-expanded={aberto}
      >
        <span>{aberto ? "Ocultar fases" : "Ver fases"}</span>
        <span className="text-xs text-muted">
          {fases.length} fase{fases.length === 1 ? "" : "s"}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-line p-4 sm:p-5">
          {fases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <p className="text-sm font-semibold">Programa sem fases</p>
              <p className="mt-1 text-xs text-muted">
                Crie fases para distribuir objetivos e planilhas ao longo das semanas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fases.map((fase, index) => (
                <FaseCard
                  key={fase.id}
                  fase={fase}
                  programa={programa}
                  treinos={treinos}
                  atual={fase.id === faseAtual?.id}
                  primeira={index === 0}
                  ultima={index === fases.length - 1}
                  onEdit={() => onEditFase(fase)}
                  onMove={(direcao) => onMoveFase(fase.id, direcao)}
                  onRemove={() => onRemoveFase(fase)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onAddFase}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar fase
          </button>
        </div>
      )}
    </Card>
  );
}

function FaseCard({
  fase,
  programa,
  treinos,
  atual,
  primeira,
  ultima,
  onEdit,
  onMove,
  onRemove,
}: {
  fase: FasePrograma;
  programa: ProgramaTreino;
  treinos: Treino[];
  atual: boolean;
  primeira: boolean;
  ultima: boolean;
  onEdit: () => void;
  onMove: (direcao: "cima" | "baixo") => void;
  onRemove: () => void;
}) {
  const intervalo = intervaloFase(programa, fase);
  const semanasPrograma = duracaoProgramaSemanas(programa);
  const foraDoPeriodo = fase.semanaInicial > semanasPrograma || intervalo.fim < intervalo.inicio;
  const vinculados = fase.treinoIds
    .map((id) => treinos.find((treino) => treino.id === id))
    .filter((treino): treino is Treino => treino !== undefined);

  return (
    <div
      className={cx(
        "grid gap-3 rounded-xl border p-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start",
        atual ? "border-accent/50 bg-accent/5" : "border-line bg-surface/50",
      )}
    >
      <div className="grid h-10 min-w-10 place-items-center rounded-lg bg-surface-2 px-2 text-center">
        <span className="font-display text-xs font-bold text-accent">S{fase.semanaInicial}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{fase.nome}</p>
          {atual && <Badge tone="volt">Fase atual</Badge>}
          {foraDoPeriodo && <Badge tone="off">Fora do período</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted">
          Semanas {fase.semanaInicial}–{fase.semanaInicial + fase.duracaoSemanas - 1} · {" "}
          {formatarDataCurta(intervalo.inicio)} a {formatarDataCurta(intervalo.fim)}
        </p>
        {fase.objetivo && <p className="mt-2 text-sm text-muted">{fase.objetivo}</p>}
        {vinculados.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vinculados.map((treino) => (
              <Badge key={treino.id} tone={treino.ativo ? "volt" : "neutral"}>
                {treino.nome}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-muted">Nenhuma planilha vinculada</p>
        )}
        {fase.observacoes && (
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted">
            {fase.observacoes}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onMove("cima")}
          disabled={primeira}
          className="rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 disabled:opacity-30"
          aria-label="Mover fase para cima"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove("baixo")}
          disabled={ultima}
          className="rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 disabled:opacity-30"
          aria-label="Mover fase para baixo"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent"
          aria-label="Editar fase"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
          aria-label="Remover fase"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ProgramaForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ProgramaFormValues;
  onSubmit: (values: ProgramaFormValues) => void;
  onCancel: () => void;
}) {
  const hoje = hojeIso();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [objetivo, setObjetivo] = useState(initial?.objetivo ?? "");
  const [dataInicio, setDataInicio] = useState(initial?.dataInicio ?? hoje);
  const [dataFim, setDataFim] = useState(
    initial?.dataFim ?? dataFimComMesmaDuracao({ dataInicio: hoje, dataFim: hoje }, hoje),
  );
  const erro = dataInicio && dataFim && dataFim < dataInicio ? "O término deve ser posterior ao início." : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!nome.trim() || !dataInicio || !dataFim || erro) return;
        onSubmit({ nome: nome.trim(), objetivo: objetivo.trim() || undefined, dataInicio, dataFim });
      }}
    >
      <Field label="Nome do programa">
        <Input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Ex.: Ciclo de hipertrofia — 12 semanas"
          autoFocus
        />
      </Field>
      <Field label="Objetivo" hint="Opcional. Ex.: ganhar força nos básicos e aumentar volume.">
        <Textarea
          value={objetivo}
          onChange={(event) => setObjetivo(event.target.value)}
          rows={2}
          placeholder="Objetivo principal do ciclo…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início">
          <Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
        </Field>
        <Field label="Término">
          <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
        </Field>
      </div>
      {dataInicio && dataFim && !erro && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          Duração: {duracaoProgramaSemanas({ dataInicio, dataFim })} semana(s).
        </p>
      )}
      {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!nome.trim() || !dataInicio || !dataFim || Boolean(erro)}>
          {initial ? "Salvar alterações" : "Criar programa"}
        </Button>
      </div>
    </form>
  );
}

function RenovacaoForm({
  programa,
  onSubmit,
  onCancel,
}: {
  programa: ProgramaTreino;
  onSubmit: (values: ProgramaFormValues & { ativar: boolean }) => void;
  onCancel: () => void;
}) {
  const novoInicio = proximoDiaDoPrograma(programa);
  const [nome, setNome] = useState(`${programa.nome} — renovação`);
  const [objetivo, setObjetivo] = useState(programa.objetivo ?? "");
  const [dataInicio, setDataInicio] = useState(novoInicio);
  const [dataFim, setDataFim] = useState(dataFimComMesmaDuracao(programa, novoInicio));
  const [ativar, setAtivar] = useState(true);
  const erro = dataFim < dataInicio ? "O término deve ser posterior ao início." : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!nome.trim() || erro) return;
        onSubmit({
          nome: nome.trim(),
          objetivo: objetivo.trim() || undefined,
          dataInicio,
          dataFim,
          ativar,
        });
      }}
    >
      <p className="rounded-xl border border-line bg-surface-2/40 p-3 text-sm text-muted">
        As {programa.fases.length} fases e os vínculos com planilhas serão clonados. O programa
        atual será marcado como concluído.
      </p>
      <Field label="Nome da renovação">
        <Input value={nome} onChange={(event) => setNome(event.target.value)} autoFocus />
      </Field>
      <Field label="Objetivo">
        <Textarea value={objetivo} onChange={(event) => setObjetivo(event.target.value)} rows={2} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Novo início">
          <Input
            type="date"
            value={dataInicio}
            onChange={(event) => {
              const inicio = event.target.value;
              setDataInicio(inicio);
              if (inicio) setDataFim(dataFimComMesmaDuracao(programa, inicio));
            }}
          />
        </Field>
        <Field label="Novo término">
          <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input
          type="checkbox"
          checked={ativar}
          onChange={(event) => setAtivar(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-volt)]"
        />
        <span>
          <span className="block text-sm font-semibold">Ativar a renovação agora</span>
          <span className="mt-0.5 block text-xs text-muted">
            Desativa outro programa ativo deste aluno.
          </span>
        </span>
      </label>
      {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!nome.trim() || Boolean(erro)}>
          Renovar programa
        </Button>
      </div>
    </form>
  );
}

function FaseForm({
  programa,
  treinos,
  initial,
  onSubmit,
  onCancel,
}: {
  programa: ProgramaTreino;
  treinos: Treino[];
  initial?: FasePrograma;
  onSubmit: (values: FaseFormValues) => void;
  onCancel: () => void;
}) {
  const proximaSemana = useMemo(
    () =>
      Math.max(
        1,
        ...programa.fases.map((fase) => fase.semanaInicial + fase.duracaoSemanas),
      ),
    [programa.fases],
  );
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [objetivo, setObjetivo] = useState(initial?.objetivo ?? "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [semanaInicial, setSemanaInicial] = useState(initial?.semanaInicial ?? proximaSemana);
  const [duracaoSemanas, setDuracaoSemanas] = useState(initial?.duracaoSemanas ?? 4);
  const [treinoIds, setTreinoIds] = useState<Set<string>>(
    () => new Set(initial?.treinoIds ?? []),
  );
  const semanasPrograma = duracaoProgramaSemanas(programa);
  const fimDaFase = semanaInicial + duracaoSemanas - 1;

  const alternarTreino = (id: string) => {
    setTreinoIds((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(id)) proximos.delete(id);
      else proximos.add(id);
      return proximos;
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!nome.trim()) return;
        onSubmit({
          nome: nome.trim(),
          objetivo: objetivo.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          semanaInicial: Math.max(1, semanaInicial),
          duracaoSemanas: Math.max(1, duracaoSemanas),
          treinoIds: Array.from(treinoIds),
        });
      }}
    >
      <Field label="Nome da fase">
        <Input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Ex.: Base, Intensificação, Deload"
          autoFocus
        />
      </Field>
      <Field label="Objetivo da fase">
        <Input
          value={objetivo}
          onChange={(event) => setObjetivo(event.target.value)}
          placeholder="Ex.: aumentar volume e consolidar técnica"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Semana inicial">
          <Input
            type="number"
            min={1}
            value={semanaInicial}
            onChange={(event) => setSemanaInicial(Math.max(1, Number(event.target.value) || 1))}
          />
        </Field>
        <Field label="Duração (semanas)">
          <Input
            type="number"
            min={1}
            value={duracaoSemanas}
            onChange={(event) => setDuracaoSemanas(Math.max(1, Number(event.target.value) || 1))}
          />
        </Field>
      </div>
      <p
        className={cx(
          "rounded-lg px-3 py-2 text-xs",
          fimDaFase > semanasPrograma
            ? "bg-danger/10 font-semibold text-danger"
            : "bg-surface-2 text-muted",
        )}
      >
        Ocupa as semanas {semanaInicial}–{fimDaFase} de {semanasPrograma}. {" "}
        {formatarDataCurta(intervaloFase(programa, { semanaInicial, duracaoSemanas }).inicio)} a {" "}
        {formatarDataCurta(intervaloFase(programa, { semanaInicial, duracaoSemanas }).fim)}.
      </p>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Planilhas da fase</p>
        {treinos.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
            Este aluno ainda não tem planilhas. Você pode salvar a fase e vincular depois.
          </p>
        ) : (
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
            {treinos.map((treino) => (
              <label
                key={treino.id}
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  treinoIds.has(treino.id) ? "bg-accent/10" : "hover:bg-surface-2",
                )}
              >
                <input
                  type="checkbox"
                  checked={treinoIds.has(treino.id)}
                  onChange={() => alternarTreino(treino.id)}
                  className="h-4 w-4 accent-[var(--color-volt)]"
                />
                <span className="min-w-0 flex-1 truncate font-semibold">{treino.nome}</span>
                {treino.ativo && <Badge tone="volt">Ativa</Badge>}
              </label>
            ))}
          </div>
        )}
      </div>

      <Field label="Observações">
        <Textarea
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          rows={3}
          placeholder="Volume, intensidade, cuidados e critérios para avançar…"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!nome.trim()}>
          {initial ? "Salvar fase" : "Adicionar fase"}
        </Button>
      </div>
    </form>
  );
}
