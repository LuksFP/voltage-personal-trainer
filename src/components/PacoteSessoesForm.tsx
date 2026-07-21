"use client";

import { useState } from "react";
import type { PacoteSessoes } from "@/lib/types";
import type { PacoteSessoesInput } from "@/lib/store";
import { Button, Field, Input, Textarea } from "./ui";

function isoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function validadePadrao(): string {
  const data = new Date();
  data.setDate(data.getDate() + 90);
  return isoLocal(data);
}

export function PacoteSessoesForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: PacoteSessoes;
  onSubmit: (data: PacoteSessoesInput) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "Pacote presencial");
  const [quantidade, setQuantidade] = useState(
    String(initial?.quantidadeContratada ?? 12),
  );
  const [usoAnterior, setUsoAnterior] = useState(
    String(initial?.utilizadasAntesDoVoltage ?? 0),
  );
  const [dataInicio, setDataInicio] = useState(initial?.dataInicio ?? isoLocal(new Date()));
  const [dataValidade, setDataValidade] = useState(
    initial?.dataValidade ?? validadePadrao(),
  );
  const [valor, setValor] = useState(
    initial?.valorTotal !== undefined ? String(initial.valorTotal) : "",
  );
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const quantidadeNumero = Number(quantidade);
  const usoAnteriorNumero = Number(usoAnterior);
  const valorNumero = valor.trim() === "" ? undefined : Number(valor.replace(",", "."));
  const quantidadeValida =
    Number.isInteger(quantidadeNumero) && quantidadeNumero >= 1 && quantidadeNumero <= 500;
  const usoValido =
    Number.isInteger(usoAnteriorNumero) &&
    usoAnteriorNumero >= 0 &&
    usoAnteriorNumero <= quantidadeNumero;
  const datasValidas = dataInicio !== "" && dataValidade >= dataInicio;
  const valorValido = valorNumero === undefined || (Number.isFinite(valorNumero) && valorNumero >= 0);
  const canSubmit =
    nome.trim() !== "" && quantidadeValida && usoValido && datasValidas && valorValido;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      setErro(null);
      onSubmit({
        nome: nome.trim(),
        quantidadeContratada: quantidadeNumero,
        utilizadasAntesDoVoltage: usoAnteriorNumero,
        dataInicio,
        dataValidade,
        valorTotal: valorNumero,
        observacoes: observacoes.trim() || undefined,
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o pacote.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome do pacote">
        <Input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Ex.: 12 aulas — trimestral"
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Aulas contratadas" hint="Entre 1 e 500">
          <Input
            type="number"
            min={1}
            max={500}
            step={1}
            value={quantidade}
            onChange={(event) => setQuantidade(event.target.value)}
          />
        </Field>
        <Field
          label="Já utilizadas"
          hint="Aulas feitas antes de cadastrar este pacote no Voltage"
        >
          <Input
            type="number"
            min={0}
            max={quantidadeValida ? quantidadeNumero : undefined}
            step={1}
            value={usoAnterior}
            onChange={(event) => setUsoAnterior(event.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Início">
          <Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
        </Field>
        <Field label="Validade">
          <Input
            type="date"
            min={dataInicio}
            value={dataValidade}
            onChange={(event) => setDataValidade(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Valor total (R$)" hint="Opcional">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="Ex.: 900,00"
        />
      </Field>

      <Field label="Observações" hint="Opcional — regras, forma de pagamento ou condições">
        <Textarea
          rows={3}
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          placeholder="Ex.: reposições com aviso de 12 horas"
        />
      </Field>

      {!quantidadeValida && (
        <p className="text-xs font-semibold text-danger">
          Informe entre 1 e 500 aulas contratadas.
        </p>
      )}
      {!usoValido && (
        <p className="text-xs font-semibold text-danger">
          O uso anterior precisa ficar entre zero e a quantidade contratada.
        </p>
      )}
      {!datasValidas && (
        <p className="text-xs font-semibold text-danger">
          A validade não pode terminar antes do início.
        </p>
      )}
      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {initial ? "Salvar alterações" : "Criar pacote"}
        </Button>
      </div>
    </form>
  );
}
