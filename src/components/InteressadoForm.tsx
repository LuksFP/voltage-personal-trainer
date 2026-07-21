"use client";

import { useState } from "react";
import type { Objetivo } from "@/lib/types";
import { OBJETIVOS } from "./AlunoForm";
import { Button, Field, Input, Select, Textarea } from "./ui";

export type OrigemInteressadoForm =
  | "instagram"
  | "indicacao"
  | "google"
  | "whatsapp"
  | "site"
  | "evento"
  | "outro";

export type InteressadoFormValues = {
  nome: string;
  telefone: string;
  email: string;
  objetivo: Objetivo | "";
  origem: OrigemInteressadoForm | "";
  origemDetalhe: string;
  observacoes: string;
};

type InteressadoFormErros = Partial<
  Record<"nome" | "contato" | "email" | "origem" | "origemDetalhe", string>
>;

export const ORIGENS_INTERESSADO: ReadonlyArray<{
  value: OrigemInteressadoForm;
  label: string;
}> = [
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
];

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validar(values: InteressadoFormValues): InteressadoFormErros {
  const erros: InteressadoFormErros = {};
  if (values.nome.trim().length < 2) {
    erros.nome = "Informe o nome do interessado.";
  }
  if (!values.telefone.trim() && !values.email.trim()) {
    erros.contato = "Informe pelo menos um telefone ou e-mail.";
  }
  if (values.email.trim() && !emailValido(values.email.trim())) {
    erros.email = "Digite um e-mail válido.";
  }
  if (!values.origem) {
    erros.origem = "Selecione a origem do contato.";
  }
  if (
    (values.origem === "indicacao" || values.origem === "outro") &&
    !values.origemDetalhe.trim()
  ) {
    erros.origemDetalhe =
      values.origem === "indicacao"
        ? "Informe quem fez a indicação."
        : "Descreva a origem do contato.";
  }
  return erros;
}

function ErrorMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-semibold text-danger">
      {message}
    </p>
  );
}

export function InteressadoForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Cadastrar interessado",
  submitting = false,
}: {
  initial?: Partial<InteressadoFormValues>;
  onSubmit: (values: InteressadoFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<InteressadoFormValues>({
    nome: initial?.nome ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    objetivo: initial?.objetivo ?? "",
    origem: initial?.origem ?? "",
    origemDetalhe: initial?.origemDetalhe ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [erros, setErros] = useState<InteressadoFormErros>({});

  const set = <K extends keyof InteressadoFormValues>(
    key: K,
    value: InteressadoFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErros((current) => {
      if (key === "telefone" || key === "email") {
        return { ...current, contato: undefined, email: undefined };
      }
      if (key === "nome") return { ...current, nome: undefined };
      if (key === "origemDetalhe") return { ...current, origemDetalhe: undefined };
      return current;
    });
  };

  const pedeDetalhe = values.origem === "indicacao" || values.origem === "outro";

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const proximosErros = validar(values);
        setErros(proximosErros);
        if (Object.keys(proximosErros).length > 0 || submitting) return;
        onSubmit({
          ...values,
          nome: values.nome.trim(),
          telefone: values.telefone.trim(),
          email: values.email.trim(),
          origemDetalhe: pedeDetalhe ? values.origemDetalhe.trim() : "",
          observacoes: values.observacoes.trim(),
        });
      }}
    >
      <Field label="Nome do interessado">
        <Input
          autoFocus
          value={values.nome}
          onChange={(event) => set("nome", event.target.value)}
          placeholder="Ex.: Marina Alves"
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "interessado-nome-erro" : undefined}
        />
        <ErrorMessage id="interessado-nome-erro" message={erros.nome} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input
            value={values.telefone}
            onChange={(event) => set("telefone", event.target.value)}
            placeholder="(91) 99999-0000"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(erros.contato)}
            aria-describedby={erros.contato ? "interessado-contato-erro" : undefined}
          />
        </Field>
        <Field label="E-mail">
          <Input
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            placeholder="contato@email.com"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(erros.contato || erros.email)}
            aria-describedby={
              erros.email
                ? "interessado-email-erro"
                : erros.contato
                  ? "interessado-contato-erro"
                  : undefined
            }
          />
          <ErrorMessage id="interessado-email-erro" message={erros.email} />
        </Field>
      </div>
      <ErrorMessage id="interessado-contato-erro" message={erros.contato} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Objetivo">
          <Select
            value={values.objetivo}
            onChange={(event) => {
              const objetivo = OBJETIVOS.find((item) => item === event.target.value) ?? "";
              set("objetivo", objetivo);
            }}
          >
            <option value="">Selecione…</option>
            {OBJETIVOS.map((objetivo) => (
              <option key={objetivo} value={objetivo}>
                {objetivo}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Origem do contato">
          <Select
            value={values.origem}
            onChange={(event) => {
              const origem =
                ORIGENS_INTERESSADO.find((item) => item.value === event.target.value)?.value ?? "";
              setValues((current) => ({
                ...current,
                origem,
                origemDetalhe:
                  origem === "indicacao" || origem === "outro" ? current.origemDetalhe : "",
              }));
              setErros((current) => ({
                ...current,
                origem: undefined,
                origemDetalhe: undefined,
              }));
            }}
            aria-invalid={Boolean(erros.origem)}
            aria-describedby={erros.origem ? "interessado-origem-select-erro" : undefined}
          >
            <option value="">Selecione…</option>
            {ORIGENS_INTERESSADO.map((origem) => (
              <option key={origem.value} value={origem.value}>
                {origem.label}
              </option>
            ))}
          </Select>
          <ErrorMessage id="interessado-origem-select-erro" message={erros.origem} />
        </Field>
      </div>

      {pedeDetalhe && (
        <Field label={values.origem === "indicacao" ? "Quem indicou?" : "Detalhe da origem"}>
          <Input
            value={values.origemDetalhe}
            onChange={(event) => set("origemDetalhe", event.target.value)}
            placeholder={
              values.origem === "indicacao"
                ? "Nome do aluno ou parceiro"
                : "Ex.: feira, academia, panfleto"
            }
            aria-invalid={Boolean(erros.origemDetalhe)}
            aria-describedby={erros.origemDetalhe ? "interessado-origem-erro" : undefined}
          />
          <ErrorMessage id="interessado-origem-erro" message={erros.origemDetalhe} />
        </Field>
      )}

      <Field label="Observações" hint="Contexto, disponibilidade ou necessidades mencionadas">
        <Textarea
          value={values.observacoes}
          onChange={(event) => set("observacoes", event.target.value)}
          rows={3}
          placeholder="Anotações sobre o primeiro contato"
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
