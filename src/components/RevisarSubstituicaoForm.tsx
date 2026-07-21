"use client";

import { useState } from "react";
import { useStore, type ExercicioSubstitutoInput } from "@/lib/store";
import type { SolicitacaoSubstituicao } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "./ui";

const motivoLabel = {
  "equipamento-indisponivel": "Equipamento indisponível",
  dor: "Dor ou desconforto",
  dificuldade: "Dificuldade na execução",
  outro: "Outro motivo",
} as const;

export function RevisarSubstituicaoForm({
  solicitacao,
  onApprove,
  onReject,
  onCancel,
}: {
  solicitacao: SolicitacaoSubstituicao;
  onApprove: (substituto: ExercicioSubstitutoInput, resposta?: string) => void;
  onReject: (resposta: string) => void;
  onCancel: () => void;
}) {
  const { getTreino, biblioteca } = useStore();
  const treino = getTreino(solicitacao.treinoId);
  const divisao = treino?.divisoes.find((item) => item.id === solicitacao.divisaoId);
  const atual = divisao?.exercicios.find((item) => item.id === solicitacao.exercicioId);
  const [bibliotecaId, setBibliotecaId] = useState("");
  const [nome, setNome] = useState("");
  const [series, setSeries] = useState(atual?.series ?? "3");
  const [repeticoes, setRepeticoes] = useState(atual?.repeticoes ?? "10-12");
  const [carga, setCarga] = useState(atual?.carga ?? "");
  const [descanso, setDescanso] = useState(atual?.descanso ?? "60s");
  const [observacoes, setObservacoes] = useState(atual?.observacoes ?? "");
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const canApprove =
    Boolean(atual) && nome.trim() !== "" && series.trim() !== "" && repeticoes.trim() !== "" && descanso.trim() !== "";

  const aprovar = () => {
    if (!canApprove) return;
    try {
      setErro(null);
      onApprove(
        {
          nome: nome.trim(),
          bibliotecaId: bibliotecaId || undefined,
          series: series.trim(),
          repeticoes: repeticoes.trim(),
          carga: carga.trim(),
          descanso: descanso.trim(),
          observacoes: observacoes.trim() || undefined,
        },
        resposta.trim() || undefined,
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível responder ao pedido.");
    }
  };

  const recusar = () => {
    if (resposta.trim().length < 3) {
      setErro("Escreva uma orientação para o aluno antes de recusar.");
      return;
    }
    try {
      setErro(null);
      onReject(resposta.trim());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível responder ao pedido.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-500/25 bg-orange-500/8 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-300">
          {motivoLabel[solicitacao.motivo]}
        </p>
        <p className="mt-1 font-semibold">{solicitacao.exercicioNomeSnapshot}</p>
        {solicitacao.detalhes && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{solicitacao.detalhes}</p>
        )}
      </div>

      {!atual && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          O exercício original não existe mais na planilha. Você ainda pode orientar e recusar este pedido.
        </p>
      )}

      <Field label="Escolher da biblioteca">
        <Select
          value={bibliotecaId}
          onChange={(event) => {
            const id = event.target.value;
            setBibliotecaId(id);
            const item = biblioteca.find((exercicio) => exercicio.id === id);
            if (item) {
              setNome(item.nome);
              if (item.instrucoes && !observacoes.trim()) setObservacoes(item.instrucoes);
            }
          }}
          autoFocus
        >
          <option value="">Digitar exercício manualmente</option>
          {biblioteca
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} — {item.grupo}
              </option>
            ))}
        </Select>
      </Field>

      <Field label="Exercício substituto">
        <Input
          value={nome}
          onChange={(event) => {
            setNome(event.target.value);
            if (bibliotecaId) setBibliotecaId("");
          }}
          placeholder="Ex.: Supino com halteres"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Séries">
          <Input value={series} onChange={(event) => setSeries(event.target.value)} />
        </Field>
        <Field label="Repetições">
          <Input value={repeticoes} onChange={(event) => setRepeticoes(event.target.value)} />
        </Field>
        <Field label="Carga">
          <Input value={carga} onChange={(event) => setCarga(event.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Descanso">
          <Input value={descanso} onChange={(event) => setDescanso(event.target.value)} />
        </Field>
      </div>

      <Field label="Observações do novo exercício" hint="Opcional — será salva na planilha">
        <Textarea rows={2} value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
      </Field>

      <Field
        label="Resposta ao aluno"
        hint="Obrigatória para recusar; opcional ao aprovar"
      >
        <Textarea
          rows={3}
          value={resposta}
          onChange={(event) => setResposta(event.target.value)}
          placeholder="Ex.: troquei por uma opção que não exige banco inclinado."
        />
      </Field>

      {erro && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" onClick={recusar}>Recusar com orientação</Button>
        <Button onClick={aprovar} disabled={!canApprove}>Aprovar e trocar</Button>
      </div>
    </div>
  );
}
