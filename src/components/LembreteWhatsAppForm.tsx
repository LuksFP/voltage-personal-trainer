"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Aluno, TipoLembreteWhatsApp } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { hojeIso } from "@/lib/data";

const TIPOS: { value: TipoLembreteWhatsApp; label: string }[] = [
  { value: "treino", label: "Treino" },
  { value: "avaliacao", label: "Avaliação" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "checkin", label: "Check-in" },
  { value: "renovacao", label: "Renovação de planilha" },
];

function modelo(tipo: TipoLembreteWhatsApp, aluno?: Aluno): { titulo: string; mensagem: string } {
  const nome = aluno?.nome.trim().split(/\s+/)[0] || "tudo bem";
  const saudacao = `Olá, ${nome}!`;
  if (tipo === "treino") {
    return {
      titulo: "Lembrete de treino",
      mensagem: `${saudacao} Passando para lembrar do nosso próximo treino. Se precisar ajustar o horário, me avise por aqui.`,
    };
  }
  if (tipo === "avaliacao") {
    return {
      titulo: "Agendar avaliação física",
      mensagem: `${saudacao} Está na hora de atualizarmos sua avaliação física para acompanhar sua evolução. Qual dia funciona melhor para você?`,
    };
  }
  if (tipo === "mensalidade") {
    return {
      titulo: "Lembrete de mensalidade",
      mensagem: `${saudacao} Passando para lembrar da sua mensalidade. Se o pagamento já foi realizado, por favor desconsidere.`,
    };
  }
  if (tipo === "checkin") {
    return {
      titulo: "Check-in semanal",
      mensagem: `${saudacao} Seu check-in semanal está disponível. Responda por aqui: {{portal}}`,
    };
  }
  return {
    titulo: "Renovação de planilha",
    mensagem: `${saudacao} Seu programa está chegando ao fim. Vamos alinhar a próxima fase e renovar sua planilha?`,
  };
}

export function LembreteWhatsAppForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { alunos, addLembreteWhatsApp } = useStore();
  const ativos = alunos.filter((aluno) => aluno.ativo).sort((a, b) => a.nome.localeCompare(b.nome));
  const [alunoId, setAlunoId] = useState(ativos[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoLembreteWhatsApp>("avaliacao");
  const inicial = modelo("avaliacao", ativos[0]);
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [mensagem, setMensagem] = useState(inicial.mensagem);
  const [dataReferencia, setDataReferencia] = useState(hojeIso());
  const [erro, setErro] = useState<string | null>(null);

  const trocarModelo = (novoTipo: TipoLembreteWhatsApp, novoAlunoId: string) => {
    const aluno = ativos.find((item) => item.id === novoAlunoId);
    const novoModelo = modelo(novoTipo, aluno);
    setTitulo(novoModelo.titulo);
    setMensagem(novoModelo.mensagem);
  };

  const salvar = (event: React.FormEvent) => {
    event.preventDefault();
    if (!alunoId || !titulo.trim() || !mensagem.trim()) return;
    try {
      addLembreteWhatsApp({
        alunoId,
        tipo,
        titulo,
        mensagem,
        dataReferencia: dataReferencia || undefined,
      });
      onCreated();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar o lembrete.");
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Field label="Aluno">
        <Select
          value={alunoId}
          onChange={(event) => {
            const novoAlunoId = event.target.value;
            setAlunoId(novoAlunoId);
            trocarModelo(tipo, novoAlunoId);
          }}
          autoFocus
        >
          <option value="">Selecione…</option>
          {ativos.map((aluno) => (
            <option key={aluno.id} value={aluno.id}>
              {aluno.nome}{aluno.telefone ? "" : " — sem telefone"}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select
            value={tipo}
            onChange={(event) => {
              const novoTipo =
                TIPOS.find((item) => item.value === event.target.value)?.value ?? "avaliacao";
              setTipo(novoTipo);
              trocarModelo(novoTipo, alunoId);
            }}
          >
            {TIPOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data de referência">
          <Input
            type="date"
            value={dataReferencia}
            onChange={(event) => setDataReferencia(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Título interno" hint="O aluno recebe apenas a mensagem abaixo">
        <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
      </Field>

      <Field
        label="Mensagem"
        hint={
          tipo === "checkin"
            ? "{{portal}} será substituído pelo link individual do aluno."
            : `${mensagem.length} caracteres`
        }
      >
        <Textarea
          rows={5}
          value={mensagem}
          onChange={(event) => setMensagem(event.target.value)}
          placeholder="Escreva a mensagem que será aberta no WhatsApp."
        />
      </Field>

      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!alunoId || !titulo.trim() || !mensagem.trim()}>
          Criar lembrete
        </Button>
      </div>
    </form>
  );
}
