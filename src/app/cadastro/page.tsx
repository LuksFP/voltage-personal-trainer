"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";
import { Button, Field, Input } from "@/components/ui";

export default function CadastroPage() {
  const { cadastrar } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 2) return setErro("Informe seu nome.");
    if (senha.length < 4) return setErro("A senha precisa ter ao menos 4 caracteres.");
    const r = cadastrar(nome, email, senha);
    if (r.ok) router.replace("/");
    else setErro(r.erro ?? "Não foi possível criar a conta.");
  };

  return (
    <AuthScreen titulo="Criar sua conta">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Seu nome">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: João Personal"
            autoComplete="name"
            required
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Crie uma senha"
            autoComplete="new-password"
            required
          />
        </Field>

        {erro && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Button type="submit" className="w-full">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-ink underline decoration-volt decoration-2 underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </AuthScreen>
  );
}
