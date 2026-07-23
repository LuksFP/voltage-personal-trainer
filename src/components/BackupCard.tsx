"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  montarBackup,
  parseBackup,
  registrarBackupFeito,
  ultimoBackup,
} from "@/lib/backup";
import { Button, Card } from "./ui";
import { DownloadIcon, UploadIcon } from "./icons";

type Msg = { tom: "ok" | "erro"; texto: string } | null;

export function BackupCard() {
  const {
    schemaVersion,
    alunos,
    interessados,
    anamneses,
    metasAluno,
    treinos,
    avaliacoes,
    sessoes,
    pagamentos,
    biblioteca,
    historicoExercicios,
    templatesTreino,
    programasTreino,
    sugestoesProgressao,
    checkinsSemanais,
    lembretesWhatsApp,
    pacotesSessoes,
    solicitacoesSubstituicao,
    videosExecucao,
    configuracoesHabitos,
    registrosHabitos,
    planosAlimentares,
    registrosRefeicoes,
    bancoAlimentos,
    substituirTudo,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [ultimo, setUltimo] = useState<string | null>(() => ultimoBackup());

  const exportar = () => {
    const json = montarBackup({
      schemaVersion,
      alunos,
      interessados,
      anamneses,
      metasAluno,
      treinos,
      avaliacoes,
      sessoes,
      pagamentos,
      biblioteca,
      historicoExercicios,
      templatesTreino,
      programasTreino,
      sugestoesProgressao,
      checkinsSemanais,
      lembretesWhatsApp,
      pacotesSessoes,
      solicitacoesSubstituicao,
      videosExecucao,
      configuracoesHabitos,
      registrosHabitos,
      planosAlimentares,
      registrosRefeicoes,
      bancoAlimentos,
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voltage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    registrarBackupFeito();
    setUltimo(ultimoBackup());
    setMsg({ tom: "ok", texto: "Backup exportado com sucesso." });
  };

  const importar = async (file: File | undefined) => {
    if (!file) return;
    try {
      const texto = await file.text();
      const dados = parseBackup(texto);
      const resumo = `${dados.alunos.length} alunos, ${dados.interessados.length} interessados, ${dados.anamneses.length} anamneses, ${dados.metasAluno.length} metas, ${dados.treinos.length} treinos, ${dados.templatesTreino.length} modelos, ${dados.programasTreino.length} programas, ${dados.pacotesSessoes.length} pacotes, ${dados.sugestoesProgressao.length} sugestões, ${dados.solicitacoesSubstituicao.length} solicitações de substituição, ${dados.videosExecucao.length} vídeos de execução, ${dados.configuracoesHabitos.length} acompanhamentos de hábitos, ${dados.registrosHabitos.length} dias de hábitos, ${dados.planosAlimentares.length} planos alimentares, ${dados.bancoAlimentos.length} alimentos, ${dados.checkinsSemanais.length} check-ins, ${dados.lembretesWhatsApp.length} lembretes, ${dados.avaliacoes.length} avaliações, ${dados.sessoes.length} sessões, ${dados.pagamentos.length} cobranças e ${dados.historicoExercicios.length} registros de exercício`;
      if (
        !confirm(
          `Importar ${resumo}?\n\nIsto substitui TODOS os dados atuais deste navegador. Recomendado exportar um backup antes.`,
        )
      ) {
        return;
      }
      substituirTudo(dados);
      setMsg({ tom: "ok", texto: `Importado: ${resumo}.` });
    } catch (err) {
      setMsg({
        tom: "erro",
        texto: err instanceof Error ? err.message : "Não foi possível importar.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Dados e backup</h2>
      <p className="mt-1 text-sm text-muted">
        Seus dados ficam salvos só neste navegador. Exporte um backup com frequência para não
        perder nada.
      </p>
      <p className="mt-1 text-xs text-muted">
        Arquivos de vídeo locais não entram no backup JSON; apenas seus metadados.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {[
          { label: "Alunos", n: alunos.length },
          { label: "Interessados", n: interessados.length },
          { label: "Anamneses", n: anamneses.length },
          { label: "Metas", n: metasAluno.length },
          { label: "Treinos", n: treinos.length },
          { label: "Avaliações", n: avaliacoes.length },
          { label: "Sessões", n: sessoes.length },
          { label: "Cobranças", n: pagamentos.length },
          { label: "Exercícios", n: biblioteca.length },
          { label: "Histórico", n: historicoExercicios.length },
          { label: "Modelos", n: templatesTreino.length },
          { label: "Programas", n: programasTreino.length },
          { label: "Sugestões", n: sugestoesProgressao.length },
          { label: "Check-ins", n: checkinsSemanais.length },
          { label: "Lembretes", n: lembretesWhatsApp.length },
          { label: "Pacotes", n: pacotesSessoes.length },
          { label: "Substituições", n: solicitacoesSubstituicao.length },
          { label: "Vídeos", n: videosExecucao.length },
          { label: "Metas de hábitos", n: configuracoesHabitos.length },
          { label: "Dias de hábitos", n: registrosHabitos.length },
          { label: "Planos alimentares", n: planosAlimentares.length },
          { label: "Banco de alimentos", n: bancoAlimentos.length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-3 text-center">
            <p className="font-display text-2xl font-bold">{s.n}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={exportar} className="flex-1">
          <DownloadIcon className="h-4 w-4" />
          Exportar backup (.json)
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
          <UploadIcon className="h-4 w-4" />
          Importar backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => importar(e.target.files?.[0])}
        />
      </div>

      {msg && (
        <p
          className={`mt-3 text-sm font-semibold ${
            msg.tom === "ok" ? "text-accent" : "text-danger"
          }`}
        >
          {msg.texto}
        </p>
      )}
      {ultimo && (
        <p className="mt-3 text-xs text-muted">
          Último backup exportado em{" "}
          {new Date(ultimo).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </Card>
  );
}
