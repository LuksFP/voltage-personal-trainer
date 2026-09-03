"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Avatar, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { BackupCard } from "@/components/BackupCard";
import { PerfilPublicoCard } from "@/components/PerfilPublicoCard";
import { RecebimentoPixCard } from "@/components/RecebimentoPixCard";

export default function PerfilPage() {
  const { personal, atualizarPerfil, sair } = useAuth();
  const { alunos, treinos } = useStore();

  const [nome, setNome] = useState(personal?.nome ?? "");
  const [email, setEmail] = useState(personal?.email ?? "");
  const [bio, setBio] = useState(personal?.bio ?? "");
  const [salvo, setSalvo] = useState(false);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    void atualizarPerfil({ nome: nome.trim(), email: email.trim(), bio: bio.trim() || undefined });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Perfil</p>
        <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">Sua conta</h1>
      </header>

      <div className="flex items-center gap-4">
        <div className="scale-125 pl-2">
          <Avatar nome={personal?.nome ?? "PT"} />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{personal?.nome}</p>
          <p className="text-sm text-muted">
            {alunos.length} aluno{alunos.length === 1 ? "" : "s"} · {treinos.length} planilha
            {treinos.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={salvar} className="space-y-4">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Bio" hint="Uma frase sobre seu trabalho (opcional)">
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Ex.: Treinador focado em hipertrofia e reeducação postural." />
          </Field>
          <div className="flex items-center justify-between pt-1">
            <Button type="button" variant="danger" onClick={() => void sair()}>
              Sair da conta
            </Button>
            <div className="flex items-center gap-3">
              {salvo && <span className="text-sm font-semibold text-accent">Salvo ✓</span>}
              <Button type="submit">Salvar</Button>
            </div>
          </div>
        </form>
      </Card>

      <RecebimentoPixCard />

      <PerfilPublicoCard />

      <BackupCard />
    </div>
  );
}
