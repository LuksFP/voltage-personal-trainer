"use client";

import { useState } from "react";
import type { ExercicioBiblioteca, MedidaCorporalMeta, MetaAluno } from "@/lib/types";
import { Button, Field, Input, Select } from "./ui";

export type TipoMetaFormulario = MetaAluno["tipo"];

export interface MetaAlunoFormValues {
  tipo: TipoMetaFormulario;
  titulo: string;
  dataInicio: string;
  prazo: string;
  valorInicial: number;
  valorAlvo: number;
  medida?: MedidaCorporalMeta;
  exercicioNomeSnapshot?: string;
  bibliotecaId?: string;
}

function dataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function prazoPadrao(): string {
  const data = new Date();
  data.setDate(data.getDate() + 84);
  return dataLocal(data);
}

function inicialDaMeta(meta?: MetaAluno): MetaAlunoFormValues {
  if (meta) {
    return {
      tipo: meta.tipo,
      titulo: meta.titulo,
      dataInicio: meta.dataInicio,
      prazo: meta.prazo,
      valorInicial: meta.valorInicial,
      valorAlvo: meta.valorAlvo,
      medida: meta.tipo === "medida-corporal" ? meta.medida : undefined,
      exercicioNomeSnapshot:
        meta.tipo === "carga-exercicio" ? meta.exercicioNomeSnapshot : undefined,
      bibliotecaId: meta.tipo === "carga-exercicio" ? meta.bibliotecaId : undefined,
    };
  }
  return {
    tipo: "peso",
    titulo: "Meta de peso",
    dataInicio: dataLocal(new Date()),
    prazo: prazoPadrao(),
    valorInicial: 80,
    valorAlvo: 75,
  };
}

const PADROES: Record<
  TipoMetaFormulario,
  Pick<MetaAlunoFormValues, "titulo" | "valorInicial" | "valorAlvo">
> = {
  peso: { titulo: "Meta de peso", valorInicial: 80, valorAlvo: 75 },
  "medida-corporal": { titulo: "Reduzir cintura", valorInicial: 90, valorAlvo: 85 },
  "frequencia-semanal": { titulo: "Frequência semanal", valorInicial: 0, valorAlvo: 3 },
  "carga-exercicio": { titulo: "Carga-alvo", valorInicial: 40, valorAlvo: 60 },
};

const MEDIDAS: { value: MedidaCorporalMeta; label: string }[] = [
  { value: "percentualGordura", label: "% de gordura" },
  { value: "cintura", label: "Cintura" },
  { value: "quadril", label: "Quadril" },
  { value: "peito", label: "Peito" },
  { value: "braco", label: "Braço" },
  { value: "coxa", label: "Coxa" },
];

function unidade(form: MetaAlunoFormValues): string {
  if (form.tipo === "frequencia-semanal") return "sessões/semana";
  if (form.tipo === "medida-corporal") return form.medida === "percentualGordura" ? "%" : "cm";
  return "kg";
}

export function MetaAlunoForm({
  meta,
  biblioteca,
  onSubmit,
  onCancel,
}: {
  meta?: MetaAluno;
  biblioteca: ExercicioBiblioteca[];
  onSubmit: (values: MetaAlunoFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MetaAlunoFormValues>(() => inicialDaMeta(meta));
  const [erro, setErro] = useState<string | null>(null);

  const mudarTipo = (tipo: TipoMetaFormulario) => {
    const padrao = PADROES[tipo];
    setForm((atual) => ({
      ...atual,
      tipo,
      ...padrao,
      medida: tipo === "medida-corporal" ? "cintura" : undefined,
      exercicioNomeSnapshot: tipo === "carga-exercicio" ? "" : undefined,
      bibliotecaId: undefined,
    }));
  };

  const confirmar = () => {
    if (!form.titulo.trim()) {
      setErro("Dê um título para a meta.");
      return;
    }
    if (!form.dataInicio || !form.prazo || form.prazo < form.dataInicio) {
      setErro("O prazo precisa ser igual ou posterior à data de início.");
      return;
    }
    if (!Number.isFinite(form.valorInicial) || !Number.isFinite(form.valorAlvo)) {
      setErro("Informe valores inicial e alvo válidos.");
      return;
    }
    if (form.valorInicial === form.valorAlvo) {
      setErro("O valor-alvo precisa ser diferente do valor inicial.");
      return;
    }
    if (form.tipo === "carga-exercicio" && !form.exercicioNomeSnapshot?.trim()) {
      setErro("Escolha ou informe o exercício da carga-alvo.");
      return;
    }
    setErro(null);
    onSubmit({
      ...form,
      titulo: form.titulo.trim(),
      exercicioNomeSnapshot: form.exercicioNomeSnapshot?.trim() || undefined,
    });
  };

  const sufixo = unidade(form);

  return (
    <div className="space-y-5">
      <Field label="Tipo de meta">
        <Select
          value={form.tipo}
          onChange={(event) => mudarTipo(event.target.value as TipoMetaFormulario)}
          disabled={Boolean(meta)}
        >
          <option value="peso">Peso</option>
          <option value="medida-corporal">Medida corporal</option>
          <option value="frequencia-semanal">Frequência semanal</option>
          <option value="carga-exercicio">Carga de exercício</option>
        </Select>
      </Field>

      <Field label="Título">
        <Input
          value={form.titulo}
          onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
          placeholder="Ex.: Reduzir cintura em 5 cm"
        />
      </Field>

      {form.tipo === "medida-corporal" && (
        <Field label="Medida acompanhada">
          <Select
            value={form.medida ?? "cintura"}
            onChange={(event) =>
              setForm((atual) => ({
                ...atual,
                medida: event.target.value as MedidaCorporalMeta,
              }))
            }
          >
            {MEDIDAS.map((medida) => (
              <option key={medida.value} value={medida.value}>
                {medida.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {form.tipo === "carga-exercicio" && (
        <div className="space-y-3">
          <Field label="Vincular à biblioteca" hint="O vínculo deixa o acompanhamento estável mesmo se o nome mudar.">
            <Select
              value={form.bibliotecaId ?? ""}
              onChange={(event) => {
                const item = biblioteca.find((exercicio) => exercicio.id === event.target.value);
                setForm((atual) => ({
                  ...atual,
                  bibliotecaId: item?.id,
                  exercicioNomeSnapshot: item?.nome ?? atual.exercicioNomeSnapshot,
                }));
              }}
            >
              <option value="">Sem vínculo</option>
              {biblioteca.map((exercicio) => (
                <option key={exercicio.id} value={exercicio.id}>
                  {exercicio.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome do exercício">
            <Input
              value={form.exercicioNomeSnapshot ?? ""}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  exercicioNomeSnapshot: event.target.value,
                  bibliotecaId: undefined,
                }))
              }
              placeholder="Ex.: Agachamento livre"
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor inicial">
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              value={form.valorInicial}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, valorInicial: Number(event.target.value) }))
              }
              className="pr-20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
              {sufixo}
            </span>
          </div>
        </Field>
        <Field label="Valor-alvo">
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              value={form.valorAlvo}
              onChange={(event) =>
                setForm((atual) => ({ ...atual, valorAlvo: Number(event.target.value) }))
              }
              className="pr-20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
              {sufixo}
            </span>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Início">
          <Input
            type="date"
            value={form.dataInicio}
            onChange={(event) => setForm((atual) => ({ ...atual, dataInicio: event.target.value }))}
          />
        </Field>
        <Field label="Prazo">
          <Input
            type="date"
            value={form.prazo}
            onChange={(event) => setForm((atual) => ({ ...atual, prazo: event.target.value }))}
          />
        </Field>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirmar}>
          {meta ? "Salvar alterações" : "Criar meta"}
        </Button>
      </div>
    </div>
  );
}
