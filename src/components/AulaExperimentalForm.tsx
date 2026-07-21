"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea } from "./ui";

export type AulaExperimentalFormValues = {
  data: string;
  hora: string;
  observacoes: string;
};

type AulaExperimentalErros = Partial<Record<"data" | "hora", string>>;

function hojeLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function AulaExperimentalForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Agendar aula experimental",
  submitting = false,
}: {
  initial?: Partial<AulaExperimentalFormValues>;
  onSubmit: (values: AulaExperimentalFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<AulaExperimentalFormValues>({
    data: initial?.data ?? hojeLocal(),
    hora: initial?.hora ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [erros, setErros] = useState<AulaExperimentalErros>({});

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const proximosErros: AulaExperimentalErros = {};
        if (!values.data) proximosErros.data = "Escolha a data da aula.";
        if (!values.hora) proximosErros.hora = "Escolha o horário da aula.";
        setErros(proximosErros);
        if (Object.keys(proximosErros).length > 0 || submitting) return;
        onSubmit({ ...values, observacoes: values.observacoes.trim() });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data">
          <Input
            autoFocus
            type="date"
            min={hojeLocal()}
            value={values.data}
            onChange={(event) => {
              setValues((current) => ({ ...current, data: event.target.value }));
              setErros((current) => ({ ...current, data: undefined }));
            }}
            aria-invalid={Boolean(erros.data)}
            aria-describedby={erros.data ? "experimental-data-erro" : undefined}
          />
          {erros.data && (
            <p
              id="experimental-data-erro"
              role="alert"
              className="mt-1 text-xs font-semibold text-danger"
            >
              {erros.data}
            </p>
          )}
        </Field>

        <Field label="Horário">
          <Input
            type="time"
            value={values.hora}
            onChange={(event) => {
              setValues((current) => ({ ...current, hora: event.target.value }));
              setErros((current) => ({ ...current, hora: undefined }));
            }}
            aria-invalid={Boolean(erros.hora)}
            aria-describedby={erros.hora ? "experimental-hora-erro" : undefined}
          />
          {erros.hora && (
            <p
              id="experimental-hora-erro"
              role="alert"
              className="mt-1 text-xs font-semibold text-danger"
            >
              {erros.hora}
            </p>
          )}
        </Field>
      </div>

      <Field label="Observações" hint="Opcional — objetivo, restrição ou combinação feita">
        <Textarea
          value={values.observacoes}
          onChange={(event) =>
            setValues((current) => ({ ...current, observacoes: event.target.value }))
          }
          rows={3}
          placeholder="Ex.: primeira experiência com musculação; chegar 10 min antes"
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Agendando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
