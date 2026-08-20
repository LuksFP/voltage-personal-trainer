"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, Field, Input } from "@/components/ui";
import { CheckIcon, TargetIcon } from "@/components/icons";
import { hojeIso } from "@/lib/data";

/* Faixas largas de propósito: é filtro contra dedo errado (7 kg, 700 kg),
   não julgamento sobre o corpo de ninguém. */
const LIMITES = {
  peso: { min: 25, max: 350, rotulo: "peso" },
  percentualGordura: { min: 2, max: 70, rotulo: "percentual de gordura" },
  cintura: { min: 30, max: 250, rotulo: "cintura" },
  braco: { min: 15, max: 90, rotulo: "braço" },
  coxa: { min: 25, max: 120, rotulo: "coxa" },
} as const;

type Campo = keyof typeof LIMITES;

const MEDIDAS_EXTRAS: { campo: Campo; label: string; sufixo: string }[] = [
  { campo: "percentualGordura", label: "% de gordura", sufixo: "%" },
  { campo: "cintura", label: "Cintura", sufixo: "cm" },
  { campo: "braco", label: "Braço", sufixo: "cm" },
  { campo: "coxa", label: "Coxa", sufixo: "cm" },
];

function numero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Check-in corporal do próprio aluno.
 *
 * A aba Evolução sempre soube desenhar o gráfico de peso e medidas — mas os
 * dados só entravam por avaliação física do personal. Quem treina sozinho
 * ficava com a tela vazia pra sempre. Aqui ele registra o próprio número, no
 * mesmo formato de sempre: vira `Avaliacao`, alimenta o gráfico, o comparativo
 * e — se um dia contratar um personal — o histórico já vai junto.
 */
export function RegistrarMedidas({ alunoId }: { alunoId: string }) {
  const { addAvaliacao, avaliacoesDoAluno, getAluno, updateAluno } = useStore();
  const aluno = getAluno(alunoId);
  const avaliacoes = avaliacoesDoAluno(alunoId);
  const ultima = avaliacoes.at(-1);

  const [aberto, setAberto] = useState(false);
  const [extras, setExtras] = useState(false);
  const [valores, setValores] = useState<Record<Campo, string>>({
    peso: "",
    percentualGordura: "",
    cintura: "",
    braco: "",
    coxa: "",
  });
  const [meta, setMeta] = useState(aluno?.pesoMeta?.toString() ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const alterar = (campo: Campo, texto: string) =>
    setValores((atual) => ({ ...atual, [campo]: texto }));

  const salvar = () => {
    setErro(null);
    const registro: Partial<Record<Campo, number>> = {};
    for (const campo of Object.keys(LIMITES) as Campo[]) {
      const valor = numero(valores[campo]);
      if (valor === null) continue;
      const { min, max, rotulo } = LIMITES[campo];
      if (valor < min || valor > max) {
        setErro(`Confere o ${rotulo}: esperava algo entre ${min} e ${max}.`);
        return;
      }
      registro[campo] = valor;
    }
    if (Object.keys(registro).length === 0) {
      setErro("Preencha pelo menos o peso.");
      return;
    }

    const pesoMeta = numero(meta);
    if (pesoMeta !== null && (pesoMeta < LIMITES.peso.min || pesoMeta > LIMITES.peso.max)) {
      setErro("A meta de peso parece fora da faixa.");
      return;
    }
    if (pesoMeta !== null && pesoMeta !== aluno?.pesoMeta) {
      updateAluno(alunoId, { pesoMeta });
    }

    addAvaliacao(alunoId, { data: hojeIso(), ...registro });
    setValores({ peso: "", percentualGordura: "", cintura: "", braco: "", coxa: "" });
    setAberto(false);
    setExtras(false);
    setSalvo(true);
    window.setTimeout(() => setSalvo(false), 2600);
  };

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setAberto(true)}>
          <TargetIcon className="h-4 w-4" /> Registrar peso e medidas
        </Button>
        {salvo ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            <CheckIcon className="h-4 w-4" /> Anotado
          </span>
        ) : (
          ultima?.peso !== undefined && (
            <span className="text-sm text-muted">
              Último: {ultima.peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
            </span>
          )
        )}
      </div>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="font-display text-lg font-semibold">Como você está hoje</h3>
      <p className="mt-1 text-sm text-muted">
        Só o peso já basta. Medida de fita muda mais devagar que a balança — e conta
        uma história melhor.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Peso" hint="kg">
          <Input
            inputMode="decimal"
            autoFocus
            value={valores.peso}
            onChange={(evento) => alterar("peso", evento.target.value)}
            placeholder="78,4"
          />
        </Field>
        <Field label="Meta de peso" hint="Opcional">
          <Input
            inputMode="decimal"
            value={meta}
            onChange={(evento) => setMeta(evento.target.value)}
            placeholder="74"
          />
        </Field>
      </div>

      {extras ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MEDIDAS_EXTRAS.map((item) => (
            <Field key={item.campo} label={item.label} hint={item.sufixo}>
              <Input
                inputMode="decimal"
                value={valores[item.campo]}
                onChange={(evento) => alterar(item.campo, evento.target.value)}
              />
            </Field>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExtras(true)}
          className="mt-3 text-sm font-semibold text-accent hover:underline"
        >
          + medidas de fita
        </button>
      )}

      {erro && (
        <p role="alert" className="mt-4 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={salvar}>Salvar</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
        >
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
