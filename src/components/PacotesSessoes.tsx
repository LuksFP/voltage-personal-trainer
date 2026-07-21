"use client";

import { useState } from "react";
import { useStore, type PacoteSessoesInput } from "@/lib/store";
import { resumoDoPacote, type StatusPacoteSessoes } from "@/lib/pacotes";
import type { PacoteSessoes } from "@/lib/types";
import { Modal } from "./Modal";
import { PacoteSessoesForm } from "./PacoteSessoesForm";
import { Badge, Button, Card } from "./ui";
import { CalendarIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";

const statusLabel: Record<StatusPacoteSessoes, string> = {
  ativo: "Ativo",
  esgotado: "Esgotado",
  expirado: "Expirado",
  encerrado: "Encerrado",
};

function dataBr(iso: string): string {
  return iso.split("-").reverse().join("/");
}

function dinheiro(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function validadeTexto(dias: number): string {
  if (dias < 0) return `venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "vence hoje";
  return `${dias} dia${dias === 1 ? "" : "s"} para vencer`;
}

export function PacotesSessoes({ alunoId }: { alunoId: string }) {
  const {
    pacotesDoAluno,
    sessoes,
    addPacoteSessoes,
    updatePacoteSessoes,
    encerrarPacoteSessoes,
    reativarPacoteSessoes,
    removePacoteSessoes,
  } = useStore();
  const pacotes = pacotesDoAluno(alunoId);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PacoteSessoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const fechar = () => {
    setFormOpen(false);
    setEditando(null);
  };

  const salvar = (input: PacoteSessoesInput) => {
    if (editando) updatePacoteSessoes(editando.id, input);
    else addPacoteSessoes(alunoId, input);
    fechar();
  };

  const encerrar = (pacote: PacoteSessoes) => {
    const reservas = sessoes.filter(
      (sessao) => sessao.pacoteId === pacote.id && sessao.status === "agendada",
    ).length;
    const detalhe =
      reservas > 0
        ? ` As ${reservas} ${reservas === 1 ? "sessão agendada" : "sessões agendadas"} serão desvinculadas.`
        : "";
    if (confirm(`Encerrar o pacote “${pacote.nome}”?${detalhe}`)) encerrarPacoteSessoes(pacote.id);
  };

  const excluir = (pacote: PacoteSessoes) => {
    if (!confirm(`Excluir definitivamente o pacote “${pacote.nome}”?`)) return;
    try {
      setErro(null);
      removePacoteSessoes(pacote.id);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir o pacote.");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold">
            <CalendarIcon className="h-5 w-5 text-accent" />
            Pacotes de sessões
          </h2>
          <p className="mt-1 text-sm text-muted">
            Controle aulas contratadas, utilizadas, reservadas e validade.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditando(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Novo pacote
        </Button>
      </div>

      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      {pacotes.length === 0 ? (
        <Card className="px-5 py-8 text-center">
          <p className="text-sm font-semibold">Nenhum pacote cadastrado</p>
          <p className="mt-1 text-sm text-muted">
            Crie um pacote para acompanhar o saldo de aulas deste aluno.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pacotes.map((pacote) => {
            const resumo = resumoDoPacote(pacote, sessoes);
            const progresso = Math.min(100, resumo.percentual);
            const vinculadas = sessoes.filter((sessao) => sessao.pacoteId === pacote.id).length;
            const tone =
              resumo.status === "ativo"
                ? "volt"
                : resumo.status === "esgotado" || resumo.status === "expirado"
                  ? "off"
                  : "neutral";
            return (
              <Card key={pacote.id} className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-display text-lg font-semibold">{pacote.nome}</h3>
                        <Badge tone={tone}>{statusLabel[resumo.status]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {dataBr(pacote.dataInicio)} até {dataBr(pacote.dataValidade)} ·{" "}
                        {validadeTexto(resumo.diasParaValidade)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditando(pacote);
                        setFormOpen(true);
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-accent"
                      aria-label={`Editar ${pacote.nome}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <SaldoNumero label="Contratadas" valor={resumo.contratadas} />
                    <SaldoNumero label="Realizadas" valor={resumo.realizadas} />
                    <SaldoNumero label="Restantes" valor={resumo.restantes} destaque />
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${resumo.excedentes > 0 ? "bg-danger" : "bg-volt"}`}
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
                    <span>{resumo.percentual.toLocaleString("pt-BR")}% utilizado</span>
                    <span>
                      {resumo.agendadasFuturas} futura{resumo.agendadasFuturas === 1 ? "" : "s"} reservada
                      {resumo.agendadasFuturas === 1 ? "" : "s"}
                    </span>
                  </div>

                  {resumo.excedentes > 0 && (
                    <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                      {resumo.excedentes} aula{resumo.excedentes === 1 ? "" : "s"} acima do contratado.
                    </p>
                  )}
                  {pacote.utilizadasAntesDoVoltage > 0 && (
                    <p className="mt-3 text-xs text-muted">
                      Inclui {pacote.utilizadasAntesDoVoltage} aula
                      {pacote.utilizadasAntesDoVoltage === 1 ? "" : "s"} realizada
                      {pacote.utilizadasAntesDoVoltage === 1 ? "" : "s"} antes do cadastro.
                    </p>
                  )}
                  {pacote.valorTotal !== undefined && (
                    <p className="mt-2 text-xs text-muted">
                      Valor: <span className="font-semibold text-text">{dinheiro(pacote.valorTotal)}</span>
                      {pacote.quantidadeContratada > 0
                        ? ` · ${dinheiro(pacote.valorTotal / pacote.quantidadeContratada)} por aula`
                        : ""}
                    </p>
                  )}
                  {pacote.observacoes && (
                    <p className="mt-3 rounded-lg bg-surface-2/60 px-3 py-2 text-xs leading-relaxed text-muted">
                      {pacote.observacoes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-line bg-surface-2/25 px-4 py-2.5">
                  <span className="mr-auto text-[11px] text-muted">
                    {vinculadas} {vinculadas === 1 ? "sessão" : "sessões"} no histórico
                  </span>
                  {pacote.ativo ? (
                    <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => encerrar(pacote)}>
                      Encerrar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => reativarPacoteSessoes(pacote.id)}
                    >
                      Reativar
                    </Button>
                  )}
                  <button
                    onClick={() => excluir(pacote)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label={`Excluir ${pacote.nome}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={fechar}
        title={editando ? "Editar pacote" : "Novo pacote de sessões"}
      >
        <PacoteSessoesForm initial={editando ?? undefined} onSubmit={salvar} onCancel={fechar} />
      </Modal>
    </section>
  );
}

function SaldoNumero({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${destaque ? "border-accent/30 bg-accent/8" : "border-line bg-surface"}`}>
      <p className={`font-display text-2xl font-bold ${destaque ? "text-accent" : ""}`}>{valor}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
