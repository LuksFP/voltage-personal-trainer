"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Button, Card, Input, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { AlunoForm, type AlunoFormValues } from "@/components/AlunoForm";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "@/components/icons";

type Filtro = "todos" | "ativos" | "inativos";

// "78" ou "77,5" → número; vazio/inválido → undefined
export function parsePesoMeta(s: string): number | undefined {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? undefined : n;
}

// Mensalidade: número >= 0 (mesma lógica decimal do peso).
export function parseMensalidade(s: string): number | undefined {
  const n = parsePesoMeta(s);
  return n != null && n >= 0 ? n : undefined;
}

// Dia de vencimento: inteiro entre 1 e 28 (evita meses curtos).
export function parseDiaVencimento(s: string): number | undefined {
  const n = Number(s.trim());
  if (!Number.isInteger(n)) return undefined;
  return n >= 1 && n <= 28 ? n : undefined;
}

export default function AlunosPage() {
  const { alunos, treinos, addAluno } = useStore();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [modalidade, setModalidade] = useState("todas");
  const [novoOpen, setNovoOpen] = useState(false);

  // Modalidades distintas presentes na base, em ordem alfabética.
  const modalidades = useMemo(
    () =>
      Array.from(new Set(alunos.map((a) => a.modalidade).filter((m): m is string => !!m))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [alunos],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return alunos
      .filter((a) => (filtro === "todos" ? true : filtro === "ativos" ? a.ativo : !a.ativo))
      .filter((a) => (modalidade === "todas" ? true : a.modalidade === modalidade))
      .filter((a) => (termo ? a.nome.toLowerCase().includes(termo) : true))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, busca, filtro, modalidade]);

  const handleAdd = (v: AlunoFormValues) => {
    addAluno({
      nome: v.nome,
      telefone: v.telefone || undefined,
      email: v.email || undefined,
      objetivo: v.objetivo || undefined,
      modalidade: v.modalidade || undefined,
      esporte: v.esporte || undefined,
      esporteDias: v.esporte ? v.esporteDias : undefined,
      pesoMeta: parsePesoMeta(v.pesoMeta),
      mensalidade: parseMensalidade(v.mensalidade),
      diaVencimento: parseDiaVencimento(v.diaVencimento),
      observacoes: v.observacoes || undefined,
      ativo: v.ativo,
    });
    setNovoOpen(false);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Alunos</p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
            {alunos.length} aluno{alunos.length === 1 ? "" : "s"} na sua base
          </h1>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Novo aluno
        </Button>
      </header>

      {/* Barra de busca + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome…"
          className="sm:max-w-xs"
        />
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {(["ativos", "inativos", "todos"] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors ${
                filtro === f ? "bg-volt text-ink" : "text-muted hover:text-text"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {modalidades.length > 0 && (
          <Select
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value)}
            className="sm:max-w-[12rem]"
            aria-label="Filtrar por modalidade"
          >
            <option value="todas">Todas as modalidades</option>
            {modalidades.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <EmptyState onAdd={() => setNovoOpen(true)} temAlgum={alunos.length > 0} />
      ) : (
        <div className="grid gap-3">
          {lista.map((a) => {
            const nTreinos = treinos.filter((t) => t.alunoId === a.id).length;
            return (
              <Link key={a.id} href={`/alunos/${a.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                  <Avatar nome={a.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{a.nome}</p>
                      {a.contaApp && <Badge tone="app">App</Badge>}
                      {a.modalidade && <Badge tone="volt">{a.modalidade}</Badge>}
                      {!a.ativo && <Badge tone="off">Inativo</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {a.objetivo ?? "Sem objetivo"} · {a.telefone ?? "sem telefone"}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-display text-lg font-bold text-accent">{nTreinos}</p>
                    <p className="text-xs text-muted">treino{nTreinos === 1 ? "" : "s"}</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-muted" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={novoOpen} onClose={() => setNovoOpen(false)} title="Novo aluno">
        <AlunoForm onSubmit={handleAdd} onCancel={() => setNovoOpen(false)} />
      </Modal>
    </div>
  );
}

function EmptyState({ onAdd, temAlgum }: { onAdd: () => void; temAlgum: boolean }) {
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-accent">
        <UsersIcon className="h-7 w-7" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold">
          {temAlgum ? "Nenhum aluno com esse filtro" : "Cadastre seu primeiro aluno"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {temAlgum ? "Ajuste a busca ou o filtro acima." : "Comece adicionando quem você acompanha."}
        </p>
      </div>
      {!temAlgum && (
        <Button onClick={onAdd}>
          <PlusIcon className="h-4 w-4" />
          Novo aluno
        </Button>
      )}
    </Card>
  );
}
