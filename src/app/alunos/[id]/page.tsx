"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "../../page";
import { Badge, Button, Card } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { AlunoForm, type AlunoFormValues } from "@/components/AlunoForm";
import { parsePesoMeta } from "../page";
import { TreinoBuilder } from "@/components/TreinoBuilder";
import { Evolucao } from "@/components/Evolucao";
import { ProximasSessoes } from "@/components/ProximasSessoes";
import { ArrowLeftIcon, PencilIcon, PhoneIcon, TargetIcon, TrashIcon } from "@/components/icons";

export default function AlunoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getAluno, updateAluno, removeAluno } = useStore();
  const aluno = getAluno(params.id);

  const [editOpen, setEditOpen] = useState(false);

  if (!aluno) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-display text-xl font-semibold">Aluno não encontrado</p>
        <p className="mt-2 text-sm text-muted">Ele pode ter sido removido.</p>
        <Link href="/alunos" className="mt-6 inline-block">
          <Button variant="outline">Voltar para alunos</Button>
        </Link>
      </div>
    );
  }

  const salvarEdicao = (v: AlunoFormValues) => {
    updateAluno(aluno.id, {
      nome: v.nome,
      telefone: v.telefone || undefined,
      email: v.email || undefined,
      objetivo: v.objetivo || undefined,
      modalidade: v.modalidade || undefined,
      pesoMeta: parsePesoMeta(v.pesoMeta),
      observacoes: v.observacoes || undefined,
      ativo: v.ativo,
    });
    setEditOpen(false);
  };

  const excluir = () => {
    if (confirm(`Excluir ${aluno.nome} e todas as planilhas dele?`)) {
      removeAluno(aluno.id);
      router.push("/alunos");
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/alunos" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-accent">
        <ArrowLeftIcon className="h-4 w-4" />
        Alunos
      </Link>

      {/* Cabeçalho do aluno */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="scale-125 pl-2">
            <Avatar nome={aluno.nome} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold sm:text-4xl">{aluno.nome}</h1>
              {aluno.ativo ? <Badge tone="volt">Ativo</Badge> : <Badge tone="off">Inativo</Badge>}
              {aluno.modalidade && <Badge tone="neutral">{aluno.modalidade}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted">
              Aluno desde{" "}
              {new Date(aluno.criadoEm).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="danger" onClick={excluir} aria-label="Excluir aluno">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Info do aluno */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={<TargetIcon className="h-5 w-5" />} label="Objetivo" value={aluno.objetivo ?? "—"} />
        <InfoCard label="Modalidade" value={aluno.modalidade ?? "—"} />
        <InfoCard icon={<PhoneIcon className="h-5 w-5" />} label="Contato" value={aluno.telefone ?? aluno.email ?? "—"} />
        <InfoCard label="E-mail" value={aluno.email ?? "—"} />
      </div>

      {aluno.observacoes && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Observações</p>
          <p className="mt-1.5 text-sm leading-relaxed">{aluno.observacoes}</p>
        </Card>
      )}

      <ProximasSessoes alunoId={aluno.id} />

      <Evolucao alunoId={aluno.id} />

      <TreinoBuilder alunoId={aluno.id} />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar aluno">
        <AlunoForm initial={aluno} onSubmit={salvarEdicao} onCancel={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon && <span className="text-accent">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 truncate font-semibold">{value}</p>
    </Card>
  );
}
