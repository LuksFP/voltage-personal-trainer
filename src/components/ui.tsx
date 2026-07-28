"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Button ---------- */
type Variant = "primary" | "ghost" | "outline" | "danger";
export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary:
      "bg-volt text-ink hover:bg-volt-strong active:translate-y-px shadow-[0_6px_20px_-8px_rgba(198,242,78,0.7)]",
    ghost: "text-muted hover:text-text hover:bg-surface-2",
    outline: "border border-line text-text hover:border-accent/60 hover:text-accent",
    danger: "text-danger hover:bg-danger/10",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------- Field wrappers ---------- */
/**
 * `grupo` troca o <label> por um grupo rotulado. Use quando o conteúdo não é um
 * único controle (várias pílulas, checkboxes): dentro de um <label>, o texto
 * inteiro vira o nome acessível do primeiro botão do grupo.
 */
export function Field({
  label,
  children,
  hint,
  grupo = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  grupo?: boolean;
}) {
  const rotulo = <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>;
  const dica = hint ? <span className="text-xs text-muted/70">{hint}</span> : null;

  if (grupo) {
    return (
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5">{rotulo}</legend>
        {children}
        {dica}
      </fieldset>
    );
  }

  return (
    <label className="flex flex-col gap-1.5">
      {rotulo}
      {children}
      {dica}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted/60 outline-none transition-colors focus:border-accent/70 focus:bg-surface-2";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, "resize-none", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldBase, "appearance-none", props.className)} />;
}

/* ---------- Badge ---------- */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "volt" | "off" | "app";
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    volt: "bg-accent/15 text-accent",
    off: "bg-danger/10 text-danger",
    app: "bg-volt/15 text-volt",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

/* ---------- Card ---------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl2 border border-line bg-surface/70 backdrop-blur-sm", className)}>{children}</div>
  );
}

/* ---------- Avatar ---------- */
/** Iniciais do aluno/personal no painel. O app do aluno tem o seu próprio,
 *  maior e quadrado — este é o redondo das listas. */
export function Avatar({ nome }: { nome: string }) {
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
      {initials}
    </div>
  );
}

export { cx };
