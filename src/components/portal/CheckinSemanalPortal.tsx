"use client";

import { useState } from "react";
import { fimDaSemana, inicioDaSemana } from "@/lib/checkins";
import { useStore } from "@/lib/store";
import type { EscalaTreino, NivelDor } from "@/lib/types";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { Input, Select, Textarea, cx } from "@/components/ui";
import { fmtDiaMesCurto } from "@/lib/data";

const ESCALA = [1, 2, 3, 4, 5] as const satisfies readonly EscalaTreino[];
const NIVEIS_DOR: NivelDor[] = ["Sem dor", "Leve", "Moderada", "Forte"];

function numeroOpcional(valor: string, minimo: number, maximo: number): number | undefined {
  if (!valor.trim()) return undefined;
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo
    ? numero
    : undefined;
}

export function CheckinSemanalPortal({
  alunoId,
  hoje,
}: {
  alunoId: string;
  hoje: string;
}) {
  const { checkinDaSemana, salvarCheckinSemanal } = useStore();
  const semanaInicio = inicioDaSemana(hoje);
  const existente = checkinDaSemana(alunoId, semanaInicio);
  const [editando, setEditando] = useState(!existente);
  const [energia, setEnergia] = useState<EscalaTreino | null>(existente?.energia ?? null);
  const [sono, setSono] = useState<EscalaTreino | null>(existente?.sono ?? null);
  const [horasSono, setHorasSono] = useState(
    existente?.horasSono !== undefined ? String(existente.horasSono) : "",
  );
  const [estresse, setEstresse] = useState<EscalaTreino | null>(existente?.estresse ?? null);
  const [alimentacao, setAlimentacao] = useState<EscalaTreino | null>(
    existente?.alimentacao ?? null,
  );
  const [dor, setDor] = useState<NivelDor>(existente?.dor ?? "Sem dor");
  const [localDor, setLocalDor] = useState(existente?.localDor ?? "");
  const [peso, setPeso] = useState(
    existente?.pesoKg !== undefined ? String(existente.pesoKg) : "",
  );
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const completo = energia !== null && sono !== null && estresse !== null && alimentacao !== null;

  const salvar = () => {
    if (!completo || energia === null || sono === null || estresse === null || alimentacao === null) {
      setErro("Responda as quatro escalas para enviar o check-in.");
      return;
    }
    const pesoKg = numeroOpcional(peso, 20, 400);
    const horas = numeroOpcional(horasSono, 0, 24);
    if (peso.trim() && pesoKg === undefined) {
      setErro("Informe um peso entre 20 e 400 kg.");
      return;
    }
    if (horasSono.trim() && horas === undefined) {
      setErro("Informe as horas de sono entre 0 e 24.");
      return;
    }

    try {
      salvarCheckinSemanal({
        alunoId,
        semanaInicio,
        energia,
        sono,
        horasSono: horas,
        estresse,
        alimentacao,
        dor,
        localDor: dor === "Sem dor" ? undefined : localDor.trim() || undefined,
        pesoKg,
        observacoes: observacoes.trim() || undefined,
      });
      setErro(null);
      setSalvo(true);
      setEditando(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o check-in.");
    }
  };

  return (
    <section className="overflow-hidden rounded-xl2 border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setEditando((atual) => !atual)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={editando}
      >
        <span
          className={cx(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
            existente || salvo ? "bg-accent/15 text-accent" : "bg-volt text-ink",
          )}
        >
          <CheckIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold">Check-in da semana</span>
          <span className="mt-0.5 block text-xs text-muted">
            {fmtDiaMesCurto(semanaInicio)} a {fmtDiaMesCurto(fimDaSemana(semanaInicio))}
            {existente || salvo ? " · enviado" : " · leva menos de 2 minutos"}
          </span>
        </span>
        <ChevronRightIcon
          className={cx(
            "h-5 w-5 shrink-0 text-muted transition-transform",
            editando && "rotate-90",
          )}
        />
      </button>

      {!editando && existente && (
        <div className="border-t border-line px-4 py-3">
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            <ResumoMetrica label="Energia" valor={existente.energia} />
            <ResumoMetrica label="Sono" valor={existente.sono} />
            <ResumoMetrica label="Estresse" valor={existente.estresse} destaque={existente.estresse >= 4} />
            <ResumoMetrica label="Alimentação" valor={existente.alimentacao} />
            <span
              className={cx(
                "rounded-full px-2.5 py-1",
                existente.dor === "Moderada" || existente.dor === "Forte"
                  ? "bg-danger/10 text-danger"
                  : "bg-surface-2 text-muted",
              )}
            >
              {existente.dor}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {existente.revisadoEm
              ? "Seu personal já revisou este check-in."
              : "Seu personal será avisado e poderá acompanhar suas respostas."}
          </p>
        </div>
      )}

      {editando && (
        <div className="space-y-5 border-t border-line p-4">
          <EscalaCampo
            label="Como está sua energia?"
            baixo="Muito baixa"
            alto="Ótima"
            value={energia}
            onChange={setEnergia}
          />
          <EscalaCampo
            label="Como foi seu sono?"
            baixo="Ruim"
            alto="Excelente"
            value={sono}
            onChange={setSono}
          />
          <EscalaCampo
            label="Como está seu estresse?"
            baixo="Baixo"
            alto="Muito alto"
            value={estresse}
            onChange={setEstresse}
            invertida
          />
          <EscalaCampo
            label="Como foi sua alimentação?"
            baixo="Desregulada"
            alto="Muito boa"
            value={alimentacao}
            onChange={setAlimentacao}
          />

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                Horas de sono
              </span>
              <Input
                inputMode="decimal"
                value={horasSono}
                onChange={(event) => setHorasSono(event.target.value)}
                placeholder="Ex.: 7,5"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                Peso atual
              </span>
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={peso}
                  onChange={(event) => setPeso(event.target.value)}
                  placeholder="Ex.: 78,4"
                  className="pr-10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                  kg
                </span>
              </div>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Dor ou desconforto
            </span>
            <Select
              value={dor}
              onChange={(event) => {
                const valor = NIVEIS_DOR.find((nivel) => nivel === event.target.value);
                setDor(valor ?? "Sem dor");
              }}
            >
              {NIVEIS_DOR.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </Select>
          </label>

          {dor !== "Sem dor" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                Onde está doendo?
              </span>
              <Input
                value={localDor}
                onChange={(event) => setLocalDor(event.target.value)}
                placeholder="Ex.: joelho direito ao agachar"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Observações
            </span>
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Conte algo que seu personal precisa saber nesta semana."
            />
          </label>

          {erro && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              {erro}
            </p>
          )}

          <div className="flex gap-2">
            {existente && (
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="flex-1 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={!completo}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-volt px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong disabled:pointer-events-none disabled:opacity-40"
            >
              <CheckIcon className="h-4 w-4" />
              {existente ? "Atualizar" : "Enviar check-in"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function EscalaCampo({
  label,
  baixo,
  alto,
  value,
  onChange,
  invertida = false,
}: {
  label: string;
  baixo: string;
  alto: string;
  value: EscalaTreino | null;
  onChange: (value: EscalaTreino) => void;
  invertida?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {ESCALA.map((numero) => (
          <button
            key={numero}
            type="button"
            onClick={() => onChange(numero)}
            aria-pressed={value === numero}
            className={cx(
              "h-10 rounded-lg border text-sm font-bold transition-colors",
              value === numero
                ? invertida && numero >= 4
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-volt bg-volt text-ink"
                : "border-line bg-surface-2/40 text-muted hover:border-accent/60",
            )}
          >
            {numero}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
        <span>{baixo}</span>
        <span>{alto}</span>
      </div>
    </fieldset>
  );
}

function ResumoMetrica({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: EscalaTreino;
  destaque?: boolean;
}) {
  return (
    <span
      className={cx(
        "rounded-full px-2.5 py-1",
        destaque ? "bg-danger/10 text-danger" : "bg-surface-2 text-muted",
      )}
    >
      {label} {valor}/5
    </span>
  );
}
