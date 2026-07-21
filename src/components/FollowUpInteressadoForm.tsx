"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Textarea } from "./ui";

export type CanalFollowUpInteressadoForm =
  | "whatsapp"
  | "ligacao"
  | "email"
  | "presencial"
  | "outro";

export type FollowUpInteressadoFormValues = {
  canal: CanalFollowUpInteressadoForm;
  observacao: string;
  proximoFollowUp: string;
};

export const CANAIS_FOLLOW_UP: ReadonlyArray<{
  value: CanalFollowUpInteressadoForm;
  label: string;
}> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "presencial", label: "Presencial" },
  { value: "outro", label: "Outro" },
];

export function FollowUpInteressadoForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
}: {
  initial?: Partial<FollowUpInteressadoFormValues>;
  onSubmit: (values: FollowUpInteressadoFormValues) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<FollowUpInteressadoFormValues>({
    canal: initial?.canal ?? "whatsapp",
    observacao: initial?.observacao ?? "",
    proximoFollowUp: initial?.proximoFollowUp ?? "",
  });
  const [observacaoErro, setObservacaoErro] = useState("");

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!values.observacao.trim()) {
          setObservacaoErro("Registre um resumo do contato realizado.");
          return;
        }
        if (submitting) return;
        setObservacaoErro("");
        onSubmit({
          canal: values.canal,
          observacao: values.observacao.trim(),
          proximoFollowUp: values.proximoFollowUp,
        });
      }}
    >
      <Field label="Canal do contato">
        <Select
          value={values.canal}
          onChange={(event) => {
            const canal =
              CANAIS_FOLLOW_UP.find((item) => item.value === event.target.value)?.value ??
              "whatsapp";
            setValues((current) => ({ ...current, canal }));
          }}
        >
          {CANAIS_FOLLOW_UP.map((canal) => (
            <option key={canal.value} value={canal.value}>
              {canal.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Resumo do follow-up" hint="O contato será registrado como realizado agora">
        <Textarea
          autoFocus
          value={values.observacao}
          onChange={(event) => {
            setValues((current) => ({ ...current, observacao: event.target.value }));
            setObservacaoErro("");
          }}
          rows={4}
          placeholder="Ex.: confirmou interesse e pediu retorno após o dia 15"
          aria-invalid={Boolean(observacaoErro)}
          aria-describedby={observacaoErro ? "follow-up-observacao-erro" : undefined}
        />
        {observacaoErro && (
          <p
            id="follow-up-observacao-erro"
            role="alert"
            className="mt-1 text-xs font-semibold text-danger"
          >
            {observacaoErro}
          </p>
        )}
      </Field>

      <Field label="Próximo contato" hint="Opcional — cria a próxima data de acompanhamento">
        <Input
          type="date"
          value={values.proximoFollowUp}
          onChange={(event) =>
            setValues((current) => ({ ...current, proximoFollowUp: event.target.value }))
          }
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Registrando…" : "Registrar contato agora"}
        </Button>
      </div>
    </form>
  );
}
