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
  const { alunos, treinos, avaliacoes, sessoes, substituirTudo } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [ultimo, setUltimo] = useState<string | null>(() => ultimoBackup());

  const exportar = () => {
    const json = montarBackup({ alunos, treinos, avaliacoes, sessoes });
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
      const resumo = `${dados.alunos.length} alunos, ${dados.treinos.length} treinos, ${dados.avaliacoes.length} avaliações e ${dados.sessoes.length} sessões`;
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

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Alunos", n: alunos.length },
          { label: "Treinos", n: treinos.length },
          { label: "Avaliações", n: avaliacoes.length },
          { label: "Sessões", n: sessoes.length },
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
