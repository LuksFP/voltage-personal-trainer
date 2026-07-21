"use client";

import { useState } from "react";
import type { AlimentoBanco, CategoriaAlimento, UnidadeMedidaAlimento } from "@/lib/types";
import {
  baseParaUnidade,
  CATEGORIAS_ALIMENTO,
  UNIDADES_ALIMENTO,
  type CriarAlimentoBancoInput,
} from "@/lib/alimentos";
import { caloriasDosMacros } from "@/lib/nutricao";
import { Button, Field, Input, Select } from "./ui";

interface AlimentoFormValues {
  nome: string;
  categoria: CategoriaAlimento;
  unidade: UnidadeMedidaAlimento;
  base: string;
  kcal: string;
  proteinas: string;
  carboidratos: string;
  gorduras: string;
  marca: string;
}

function num(valor: number | undefined): string {
  return valor === undefined ? "" : String(valor);
}

function parseNum(texto: string): number {
  const limpo = texto.trim().replace(",", ".");
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : 0;
}

function inicial(alimento?: AlimentoBanco): AlimentoFormValues {
  if (alimento) {
    return {
      nome: alimento.nome,
      categoria: alimento.categoria,
      unidade: alimento.unidade,
      base: String(alimento.base),
      kcal: num(alimento.kcal),
      proteinas: num(alimento.proteinas),
      carboidratos: num(alimento.carboidratos),
      gorduras: num(alimento.gorduras),
      marca: alimento.marca ?? "",
    };
  }
  return {
    nome: "",
    categoria: "proteina",
    unidade: "g",
    base: "100",
    kcal: "",
    proteinas: "",
    carboidratos: "",
    gorduras: "",
    marca: "",
  };
}

export function AlimentoBancoForm({
  alimento,
  onSubmit,
  onCancel,
}: {
  alimento?: AlimentoBanco;
  onSubmit: (input: CriarAlimentoBancoInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AlimentoFormValues>(() => inicial(alimento));
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = (patch: Partial<AlimentoFormValues>) =>
    setForm((atual) => ({ ...atual, ...patch }));

  const mudarUnidade = (unidade: UnidadeMedidaAlimento) =>
    setForm((atual) => ({ ...atual, unidade, base: String(baseParaUnidade(unidade)) }));

  const kcalDosMacros = caloriasDosMacros({
    proteinas: parseNum(form.proteinas) || undefined,
    carboidratos: parseNum(form.carboidratos) || undefined,
    gorduras: parseNum(form.gorduras) || undefined,
  });

  const confirmar = () => {
    if (!form.nome.trim()) {
      setErro("Informe o nome do alimento.");
      return;
    }
    if (parseNum(form.base) <= 0) {
      setErro("A porção de referência precisa ser maior que zero.");
      return;
    }
    setErro(null);
    onSubmit({
      nome: form.nome,
      categoria: form.categoria,
      unidade: form.unidade,
      base: parseNum(form.base),
      kcal: parseNum(form.kcal),
      proteinas: parseNum(form.proteinas),
      carboidratos: parseNum(form.carboidratos),
      gorduras: parseNum(form.gorduras),
      marca: form.marca || undefined,
    });
  };

  const sufixoBase = form.unidade === "unidade" ? "un" : form.unidade;

  return (
    <div className="space-y-5">
      <Field label="Nome do alimento">
        <Input
          value={form.nome}
          onChange={(event) => atualizar({ nome: event.target.value })}
          placeholder="Ex.: Peito de frango grelhado"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Categoria">
          <Select
            value={form.categoria}
            onChange={(event) => atualizar({ categoria: event.target.value as CategoriaAlimento })}
          >
            {CATEGORIAS_ALIMENTO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unidade de medida">
          <Select
            value={form.unidade}
            onChange={(event) => mudarUnidade(event.target.value as UnidadeMedidaAlimento)}
          >
            {UNIDADES_ALIMENTO.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Valores nutricionais por porção"
        hint={`Os macros abaixo se referem a ${form.base || "100"} ${sufixoBase}.`}
      >
        <div className="relative max-w-[10rem]">
          <Input
            type="number"
            min="0"
            step="1"
            value={form.base}
            onChange={(event) => atualizar({ base: event.target.value })}
            className="pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
            {sufixoBase}
          </span>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MacroInput label="Calorias" sufixo="kcal" value={form.kcal} onChange={(v) => atualizar({ kcal: v })} />
        <MacroInput label="Proteínas" sufixo="g" value={form.proteinas} onChange={(v) => atualizar({ proteinas: v })} />
        <MacroInput label="Carboidratos" sufixo="g" value={form.carboidratos} onChange={(v) => atualizar({ carboidratos: v })} />
        <MacroInput label="Gorduras" sufixo="g" value={form.gorduras} onChange={(v) => atualizar({ gorduras: v })} />
      </div>

      {kcalDosMacros !== null && kcalDosMacros > 0 && (
        <p className="text-xs text-muted">
          Macros somam <span className="font-semibold text-text">{kcalDosMacros} kcal</span> — confira
          se bate com as calorias informadas.
        </p>
      )}

      <Field label="Marca" hint="Opcional.">
        <Input
          value={form.marca}
          onChange={(event) => atualizar({ marca: event.target.value })}
          placeholder="Ex.: Growth, Piracanjuba…"
        />
      </Field>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirmar}>
          {alimento ? "Salvar alterações" : "Adicionar alimento"}
        </Button>
      </div>
    </div>
  );
}

function MacroInput({
  label,
  sufixo,
  value,
  onChange,
}: {
  label: string;
  sufixo: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="pr-9"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
          {sufixo}
        </span>
      </div>
    </Field>
  );
}
