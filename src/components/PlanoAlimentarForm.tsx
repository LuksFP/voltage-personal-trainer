"use client";

import { useMemo, useState } from "react";
import type { AlimentoBanco, PlanoAlimentar } from "@/lib/types";
import {
  caloriasDosMacros,
  divergenciaCalorias,
  indexarBanco,
  macrosDoItem,
  type CriarPlanoAlimentarInput,
} from "@/lib/nutricao";
import { ordenarAlimentosBanco, sufixoUnidade } from "@/lib/alimentos";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { PlusIcon, TrashIcon } from "./icons";

interface AlimentoFormValues {
  chave: string;
  bancoId: string; // "" = alimento avulso (texto livre)
  quantidadeNum: string; // quantidade numérica quando vinculado ao banco
  nome: string;
  quantidade: string;
  observacao: string;
}

interface RefeicaoFormValues {
  chave: string;
  nome: string;
  horario: string;
  alimentos: AlimentoFormValues[];
  observacao: string;
}

interface PlanoFormValues {
  titulo: string;
  objetivo: string;
  calorias: string;
  proteinas: string;
  carboidratos: string;
  gorduras: string;
  aguaLitros: string;
  refeicoes: RefeicaoFormValues[];
  observacoes: string;
}

function numeroTexto(valor: number | undefined): string {
  return valor === undefined ? "" : String(valor);
}

function parseNumero(texto: string): number | undefined {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return undefined;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : undefined;
}

// Chave só pro React identificar a linha (refeição/alimento) — nunca vai pro store.
// Fica fora do componente porque o estado inicial é montado durante o render, e
// ler um ref nessa hora é proibido.
let sequenciaChave = 0;
function novaChave(): string {
  sequenciaChave += 1;
  return `f${sequenciaChave}`;
}

function inicialDoPlano(plano: PlanoAlimentar | undefined): PlanoFormValues {
  if (plano) {
    return {
      titulo: plano.titulo,
      objetivo: plano.objetivo ?? "",
      calorias: numeroTexto(plano.metas.calorias),
      proteinas: numeroTexto(plano.metas.proteinas),
      carboidratos: numeroTexto(plano.metas.carboidratos),
      gorduras: numeroTexto(plano.metas.gorduras),
      aguaLitros: numeroTexto(plano.aguaLitros),
      observacoes: plano.observacoes ?? "",
      refeicoes: plano.refeicoes.map((refeicao) => ({
        chave: novaChave(),
        nome: refeicao.nome,
        horario: refeicao.horario ?? "",
        observacao: refeicao.observacao ?? "",
        alimentos: refeicao.alimentos.map((alimento) => ({
          chave: novaChave(),
          bancoId: alimento.bancoId ?? "",
          quantidadeNum: alimento.quantidadeNum !== undefined ? String(alimento.quantidadeNum) : "",
          nome: alimento.nome,
          quantidade: alimento.quantidade,
          observacao: alimento.observacao ?? "",
        })),
      })),
    };
  }
  return {
    titulo: "",
    objetivo: "",
    calorias: "",
    proteinas: "",
    carboidratos: "",
    gorduras: "",
    aguaLitros: "",
    observacoes: "",
    refeicoes: [
      {
        chave: novaChave(),
        nome: "Café da manhã",
        horario: "",
        observacao: "",
        alimentos: [{ chave: novaChave(), bancoId: "", quantidadeNum: "", nome: "", quantidade: "", observacao: "" }],
      },
    ],
  };
}

export function PlanoAlimentarForm({
  plano,
  banco,
  onSubmit,
  onCancel,
}: {
  plano?: PlanoAlimentar;
  banco: AlimentoBanco[];
  onSubmit: (input: CriarPlanoAlimentarInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PlanoFormValues>(() => inicialDoPlano(plano));
  const [erro, setErro] = useState<string | null>(null);

  const bancoOrdenado = useMemo(() => ordenarAlimentosBanco(banco), [banco]);
  const bancoPorId = useMemo(() => indexarBanco(banco), [banco]);

  const macrosPreenchidos = {
    calorias: parseNumero(form.calorias),
    proteinas: parseNumero(form.proteinas),
    carboidratos: parseNumero(form.carboidratos),
    gorduras: parseNumero(form.gorduras),
  };
  const kcalDosMacros = caloriasDosMacros(macrosPreenchidos);
  const divergencia = divergenciaCalorias(macrosPreenchidos);

  const atualizar = (patch: Partial<PlanoFormValues>) =>
    setForm((atual) => ({ ...atual, ...patch }));

  const atualizarRefeicao = (chave: string, patch: Partial<RefeicaoFormValues>) =>
    setForm((atual) => ({
      ...atual,
      refeicoes: atual.refeicoes.map((refeicao) =>
        refeicao.chave === chave ? { ...refeicao, ...patch } : refeicao,
      ),
    }));

  const atualizarAlimento = (
    refChave: string,
    alimChave: string,
    patch: Partial<AlimentoFormValues>,
  ) =>
    setForm((atual) => ({
      ...atual,
      refeicoes: atual.refeicoes.map((refeicao) =>
        refeicao.chave === refChave
          ? {
              ...refeicao,
              alimentos: refeicao.alimentos.map((alimento) =>
                alimento.chave === alimChave ? { ...alimento, ...patch } : alimento,
              ),
            }
          : refeicao,
      ),
    }));

  const addRefeicao = () =>
    setForm((atual) => ({
      ...atual,
      refeicoes: [
        ...atual.refeicoes,
        {
          chave: novaChave(),
          nome: "",
          horario: "",
          observacao: "",
          alimentos: [{ chave: novaChave(), bancoId: "", quantidadeNum: "", nome: "", quantidade: "", observacao: "" }],
        },
      ],
    }));

  const removerRefeicao = (chave: string) =>
    setForm((atual) => ({
      ...atual,
      refeicoes: atual.refeicoes.filter((refeicao) => refeicao.chave !== chave),
    }));

  const addAlimento = (refChave: string) =>
    setForm((atual) => ({
      ...atual,
      refeicoes: atual.refeicoes.map((refeicao) =>
        refeicao.chave === refChave
          ? {
              ...refeicao,
              alimentos: [
                ...refeicao.alimentos,
                { chave: novaChave(), bancoId: "", quantidadeNum: "", nome: "", quantidade: "", observacao: "" },
              ],
            }
          : refeicao,
      ),
    }));

  const removerAlimento = (refChave: string, alimChave: string) =>
    setForm((atual) => ({
      ...atual,
      refeicoes: atual.refeicoes.map((refeicao) =>
        refeicao.chave === refChave
          ? {
              ...refeicao,
              alimentos: refeicao.alimentos.filter((alimento) => alimento.chave !== alimChave),
            }
          : refeicao,
      ),
    }));

  const confirmar = () => {
    if (!form.titulo.trim()) {
      setErro("Dê um título para o plano alimentar.");
      return;
    }
    const refeicoes = form.refeicoes
      .map((refeicao) => ({
        nome: refeicao.nome,
        horario: refeicao.horario || undefined,
        observacao: refeicao.observacao || undefined,
        alimentos: refeicao.alimentos
          .map((alimento) => {
            const doBanco = alimento.bancoId ? bancoPorId.get(alimento.bancoId) : undefined;
            if (doBanco) {
              const qtd = parseNumero(alimento.quantidadeNum);
              return {
                bancoId: doBanco.id,
                quantidadeNum: qtd,
                nome: doBanco.nome,
                quantidade: qtd ? `${qtd} ${sufixoUnidade(doBanco.unidade)}` : "",
                observacao: alimento.observacao || undefined,
              };
            }
            return {
              nome: alimento.nome,
              quantidade: alimento.quantidade,
              observacao: alimento.observacao || undefined,
            };
          })
          .filter((alimento) => alimento.nome.trim()),
      }))
      .filter((refeicao) => refeicao.nome.trim() && refeicao.alimentos.length > 0);

    if (refeicoes.length === 0) {
      setErro("Adicione ao menos uma refeição com um alimento nomeado.");
      return;
    }

    setErro(null);
    onSubmit({
      titulo: form.titulo,
      objetivo: form.objetivo || undefined,
      metas: macrosPreenchidos,
      aguaLitros: parseNumero(form.aguaLitros),
      observacoes: form.observacoes || undefined,
      refeicoes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field label="Título do plano">
          <Input
            value={form.titulo}
            onChange={(event) => atualizar({ titulo: event.target.value })}
            placeholder="Ex.: Cutting — Fase 1"
          />
        </Field>
        <Field label="Objetivo" hint="Opcional — a estratégia por trás do plano.">
          <Input
            value={form.objetivo}
            onChange={(event) => atualizar({ objetivo: event.target.value })}
            placeholder="Ex.: Déficit leve mantendo massa magra"
          />
        </Field>
      </div>

      <div>
        <p className="font-display text-sm font-semibold">Metas diárias</p>
        <p className="mt-0.5 text-xs text-muted">
          Preencha só o que orienta. Calorias e água são opcionais.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Calorias">
            <SufixoInput
              value={form.calorias}
              onChange={(valor) => atualizar({ calorias: valor })}
              sufixo="kcal"
            />
          </Field>
          <Field label="Proteínas">
            <SufixoInput
              value={form.proteinas}
              onChange={(valor) => atualizar({ proteinas: valor })}
              sufixo="g"
            />
          </Field>
          <Field label="Carboidratos">
            <SufixoInput
              value={form.carboidratos}
              onChange={(valor) => atualizar({ carboidratos: valor })}
              sufixo="g"
            />
          </Field>
          <Field label="Gorduras">
            <SufixoInput
              value={form.gorduras}
              onChange={(valor) => atualizar({ gorduras: valor })}
              sufixo="g"
            />
          </Field>
        </div>
        {kcalDosMacros !== null && (
          <p className="mt-2 text-xs text-muted">
            Macros somam <span className="font-semibold text-text">{kcalDosMacros} kcal</span>
            {divergencia !== null && Math.abs(divergencia) > 15 && (
              <span className="ml-1 text-orange-300">
                ({divergencia > 0 ? "+" : ""}
                {divergencia}% vs. a meta de calorias)
              </span>
            )}
          </p>
        )}
        <div className="mt-3 max-w-[12rem]">
          <Field label="Meta de água">
            <SufixoInput
              value={form.aguaLitros}
              onChange={(valor) => atualizar({ aguaLitros: valor })}
              sufixo="L"
              step="0.1"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold">Refeições</p>
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={addRefeicao}>
            <PlusIcon className="h-3.5 w-3.5" /> Refeição
          </Button>
        </div>

        {form.refeicoes.map((refeicao, indice) => (
          <div key={refeicao.chave} className="rounded-xl2 border border-line bg-surface/40 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label={`Refeição ${indice + 1}`}>
                  <Input
                    value={refeicao.nome}
                    onChange={(event) =>
                      atualizarRefeicao(refeicao.chave, { nome: event.target.value })
                    }
                    placeholder="Ex.: Almoço"
                  />
                </Field>
              </div>
              <div className="w-24">
                <Field label="Horário">
                  <Input
                    type="time"
                    value={refeicao.horario}
                    onChange={(event) =>
                      atualizarRefeicao(refeicao.chave, { horario: event.target.value })
                    }
                  />
                </Field>
              </div>
              {form.refeicoes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removerRefeicao(refeicao.chave)}
                  className="mb-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label={`Remover ${refeicao.nome || `refeição ${indice + 1}`}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {refeicao.alimentos.map((alimento) => (
                <LinhaAlimento
                  key={alimento.chave}
                  alimento={alimento}
                  banco={bancoOrdenado}
                  bancoPorId={bancoPorId}
                  podeRemover={refeicao.alimentos.length > 1}
                  onChange={(patch) => atualizarAlimento(refeicao.chave, alimento.chave, patch)}
                  onRemover={() => removerAlimento(refeicao.chave, alimento.chave)}
                />
              ))}
              <button
                type="button"
                onClick={() => addAlimento(refeicao.chave)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Alimento
              </button>
            </div>
          </div>
        ))}
      </div>

      <Field label="Observações gerais" hint="Refeição livre, suplementos, orientações.">
        <Textarea
          value={form.observacoes}
          onChange={(event) => atualizar({ observacoes: event.target.value })}
          rows={2}
          placeholder="Ex.: 1 refeição livre por semana."
        />
      </Field>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirmar}>
          {plano ? "Salvar alterações" : "Criar plano"}
        </Button>
      </div>
    </div>
  );
}

function SufixoInput({
  value,
  onChange,
  sufixo,
  step = "1",
}: {
  value: string;
  onChange: (valor: string) => void;
  sufixo: string;
  step?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="—"
        className="pr-12"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
        {sufixo}
      </span>
    </div>
  );
}

function XIconInline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinhaAlimento({
  alimento,
  banco,
  bancoPorId,
  podeRemover,
  onChange,
  onRemover,
}: {
  alimento: AlimentoFormValues;
  banco: AlimentoBanco[];
  bancoPorId: Map<string, AlimentoBanco>;
  podeRemover: boolean;
  onChange: (patch: Partial<AlimentoFormValues>) => void;
  onRemover: () => void;
}) {
  const doBanco = alimento.bancoId ? bancoPorId.get(alimento.bancoId) : undefined;
  const qtd = parseNumero(alimento.quantidadeNum);
  const macros =
    doBanco && qtd
      ? macrosDoItem({ id: "x", nome: doBanco.nome, quantidade: "", bancoId: doBanco.id, quantidadeNum: qtd }, bancoPorId)
      : null;

  return (
    <div className="rounded-lg border border-line bg-surface-2/40 p-2">
      <div className="flex items-center gap-2">
        <Select
          value={alimento.bancoId}
          onChange={(event) => onChange({ bancoId: event.target.value })}
          className="min-w-0 flex-1"
        >
          <option value="">Alimento avulso (texto livre)</option>
          {banco.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </Select>
        {podeRemover && (
          <button
            type="button"
            onClick={onRemover}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            aria-label="Remover alimento"
          >
            <XIconInline />
          </button>
        )}
      </div>

      {doBanco ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative w-28 shrink-0">
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={alimento.quantidadeNum}
              onChange={(event) => onChange({ quantidadeNum: event.target.value })}
              placeholder="0"
              className="pr-9"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
              {sufixoUnidade(doBanco.unidade)}
            </span>
          </div>
          {macros ? (
            <span className="min-w-0 text-xs text-muted">
              <span className="font-semibold text-text">{macros.kcal} kcal</span> · P {macros.proteinas} · C{" "}
              {macros.carboidratos} · G {macros.gorduras}
            </span>
          ) : (
            <span className="text-xs text-muted">Informe a quantidade</span>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={alimento.nome}
            onChange={(event) => onChange({ nome: event.target.value })}
            placeholder="Nome do alimento"
            className="min-w-0 flex-[2] rounded-lg border border-line bg-surface/60 px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
          />
          <input
            value={alimento.quantidade}
            onChange={(event) => onChange({ quantidade: event.target.value })}
            placeholder="Quantidade (ex.: 1 concha)"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface/60 px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
          />
        </div>
      )}
    </div>
  );
}
