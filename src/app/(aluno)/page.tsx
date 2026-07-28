"use client";

import { useAlunoApp } from "@/lib/aluno-app";
import { OnboardingAluno } from "@/components/aluno/OnboardingAluno";
import { AlunoAppHome } from "@/components/aluno/AlunoAppHome";
import { Button } from "@/components/ui";
import { DumbbellIcon } from "@/components/icons";

export default function AppDoAlunoPage() {
  const { situacao, conta, criarConta, recriarPerfil, apagarConta } = useAlunoApp();

  if (situacao === "carregando") {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-volt text-ink">
          <DumbbellIcon className="h-6 w-6" />
        </span>
      </div>
    );
  }

  if (situacao === "sem-conta") {
    return <OnboardingAluno aoConcluir={criarConta} />;
  }

  // O perfil vive no store do aparelho: restaurar um backup ou limpar os dados
  // do navegador derruba o vínculo, mas as preferências ficam salvas na conta.
  if (situacao === "perfil-perdido") {
    return (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Ops</p>
          <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
            Não achei seu perfil neste aparelho.
          </h1>
          <p className="mt-3 text-muted">
            Seus dados de treino foram apagados ou substituídos, mas ainda tenho suas
            preferências{conta ? `, ${conta.nome.split(" ")[0]}` : ""}. Posso montar seu treino de
            novo — o histórico anterior não volta.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={recriarPerfil}>Montar meu treino de novo</Button>
            <Button variant="ghost" onClick={apagarConta}>
              Começar do zero
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AlunoAppHome />;
}
