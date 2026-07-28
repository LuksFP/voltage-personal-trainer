"use client";

import { useState } from "react";
import { useAlunoApp } from "@/lib/aluno-app";
import {
  LOCAIS,
  NIVEIS,
  type LocalTreino,
  type NivelAluno,
  type PreferenciasTreino,
} from "@/lib/gerador-treino";
import type { Objetivo } from "@/lib/types";
import { Button, Field, Select } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SwapIcon, TrashIcon } from "@/components/icons";

const OBJETIVOS: Objetivo[] = [
  "Hipertrofia",
  "Emagrecimento",
  "Força",
  "Condicionamento",
  "Saúde geral",
];

export function PerfilAlunoApp() {
  const {
    conta,
    personal,
    vinculado,
    desvincular,
    gerarOutroTreino,
    atualizarPreferencias,
    apagarConta,
  } = useAlunoApp();
  const [rascunho, setRascunho] = useState<PreferenciasTreino | null>(
    conta ? conta.preferencias : null,
  );
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!conta || !rascunho) return null;

  const mudou =
    rascunho.objetivo !== conta.preferencias.objetivo ||
    rascunho.nivel !== conta.preferencias.nivel ||
    rascunho.dias !== conta.preferencias.dias ||
    rascunho.local !== conta.preferencias.local;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Perfil</p>
        <h1 className="font-display mt-1 text-3xl font-bold leading-tight">{conta.nome}</h1>
        <p className="mt-1 text-sm text-muted">
          Treinando desde {new Date(conta.criadaEm).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {vinculado && (
        <section className="border-l-2 border-volt pl-4">
          <p className="text-xs font-bold uppercase tracking-widest text-volt">Acompanhamento</p>
          <p className="font-display mt-1 text-xl font-semibold">
            {personal?.nome ?? "Seu personal"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Quem monta seu treino agora é ele. Precisa trocar um exercício? Peça direto na tela do
            treino que o pedido chega pra ele.
          </p>
          {confirmandoSaida ? (
            <div className="mt-4 rounded-xl2 border border-danger/30 bg-danger/8 p-4">
              <p className="font-semibold">Encerrar o acompanhamento?</p>
              <p className="mt-1 text-sm text-muted">
                Você volta a montar os próprios treinos. O que você já treinou continua no seu
                histórico.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    desvincular();
                    setConfirmandoSaida(false);
                    setAviso("Acompanhamento encerrado. Gere um treino quando quiser.");
                  }}
                >
                  Encerrar
                </Button>
                <Button variant="ghost" onClick={() => setConfirmandoSaida(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoSaida(true)}
              className="mt-3 text-sm font-semibold text-muted hover:text-danger"
            >
              Encerrar acompanhamento
            </button>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Seu plano</h2>

        <Field label="Objetivo">
          <Select
            value={rascunho.objetivo}
            onChange={(e) =>
              setRascunho({ ...rascunho, objetivo: e.target.value as Objetivo })
            }
          >
            {OBJETIVOS.map((objetivo) => (
              <option key={objetivo} value={objetivo}>
                {objetivo}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nível">
          <Select
            value={rascunho.nivel}
            onChange={(e) => setRascunho({ ...rascunho, nivel: e.target.value as NivelAluno })}
          >
            {NIVEIS.map((nivel) => (
              <option key={nivel.id} value={nivel.id}>
                {nivel.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Dias por semana">
          <Select
            value={String(rascunho.dias)}
            onChange={(e) => setRascunho({ ...rascunho, dias: Number(e.target.value) })}
          >
            {[2, 3, 4, 5, 6].map((dias) => (
              <option key={dias} value={dias}>
                {dias} dias
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Onde treina">
          <Select
            value={rascunho.local}
            onChange={(e) => setRascunho({ ...rascunho, local: e.target.value as LocalTreino })}
          >
            {LOCAIS.map((local) => (
              <option key={local.id} value={local.id}>
                {local.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!mudou}
            onClick={() => {
              atualizarPreferencias(rascunho);
              setAviso(
                vinculado
                  ? "Plano atualizado. Seu personal vê a mudança no seu cadastro."
                  : "Plano atualizado — treino novo montado.",
              );
            }}
          >
            {vinculado ? "Salvar plano" : "Salvar e montar treino novo"}
          </Button>
          {!vinculado && (
            <Button
              variant="outline"
              onClick={() => {
                gerarOutroTreino();
                setAviso("Treino novo gerado com os mesmos objetivos.");
              }}
            >
              <SwapIcon className="h-4 w-4" /> Gerar outro treino
            </Button>
          )}
        </div>
        {aviso && <p className="text-sm font-semibold text-accent">{aviso}</p>}
        <p className="text-sm text-muted">
          {vinculado
            ? "Com personal, a planilha é montada por ele — esses dados servem pra ele te conhecer."
            : "O treino anterior continua no histórico — trocar de plano não apaga o que você já fez."}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Aparência</h2>
        <ThemeToggle full />
      </section>

      <section className="border-t border-line pt-6">
        {confirmandoApagar ? (
          <div className="rounded-xl2 border border-danger/30 bg-danger/8 p-4">
            <p className="font-semibold">Apagar sua conta deste aparelho?</p>
            <p className="mt-1 text-sm text-muted">
              Some tudo: treinos, histórico de séries e conquistas. Não dá pra desfazer.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" onClick={apagarConta}>
                Apagar mesmo assim
              </Button>
              <Button variant="ghost" onClick={() => setConfirmandoApagar(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmandoApagar(true)}>
            <TrashIcon className="h-4 w-4" /> Apagar minha conta
          </Button>
        )}
      </section>
    </div>
  );
}
