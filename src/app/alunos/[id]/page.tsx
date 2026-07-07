"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "../../page";
import { Badge, Button, Card } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { AlunoForm, type AlunoFormValues } from "@/components/AlunoForm";
import { parseDiaVencimento, parseMensalidade, parsePesoMeta } from "../page";
import { TreinoBuilder } from "@/components/TreinoBuilder";
import { Evolucao } from "@/components/Evolucao";
import { ProximasSessoes } from "@/components/ProximasSessoes";
import { linkWhatsapp } from "@/lib/compartilhar";
import type { Aluno } from "@/lib/types";
import {
  ArrowLeftIcon,
  CopyIcon,
  PencilIcon,
  PhoneIcon,
  TargetIcon,
  TrashIcon,
  WhatsappIcon,
} from "@/components/icons";

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
      mensalidade: parseMensalidade(v.mensalidade),
      diaVencimento: parseDiaVencimento(v.diaVencimento),
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

      <PortalAcesso aluno={aluno} />

      <ProximasSessoes alunoId={aluno.id} />

      <Evolucao alunoId={aluno.id} />

      <TreinoBuilder alunoId={aluno.id} />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar aluno">
        <AlunoForm initial={aluno} onSubmit={salvarEdicao} onCancel={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}

function PortalAcesso({ aluno }: { aluno: Aluno }) {
  const [copiado, setCopiado] = useState(false);
  // Link absoluto do portal. O card só monta após a hidratação do store (client),
  // então window já existe aqui; o fallback cobre qualquer render sem window.
  const [link] = useState(() =>
    typeof window !== "undefined"
      ? `${window.location.origin}/portal/${aluno.id}`
      : `/portal/${aluno.id}`,
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };

  const enviar = () => {
    const primeiro = aluno.nome.split(" ")[0];
    const texto = `Oi ${primeiro}! Este é o seu acesso ao Voltage para ver seu treino e sua agenda pelo celular: ${link}`;
    window.open(linkWhatsapp(texto, aluno.telefone), "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent">
          <PhoneIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-semibold">Portal do aluno</h2>
          <p className="mt-0.5 text-sm text-muted">
            {aluno.nome.split(" ")[0]} acessa o próprio treino e a agenda pelo celular, e marca os
            treinos feitos.
          </p>
          <div className="mt-3 truncate rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-muted">
            {link}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={copiar}>
              <CopyIcon className="h-4 w-4" />
              {copiado ? "Link copiado ✓" : "Copiar link"}
            </Button>
            <Button onClick={enviar}>
              <WhatsappIcon className="h-4 w-4" />
              Enviar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </Card>
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
