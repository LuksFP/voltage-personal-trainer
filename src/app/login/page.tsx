"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { entrar, entrarDemo } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const r = entrar(email, senha);
    if (r.ok) router.replace("/");
    else setErro(r.erro ?? "Não foi possível entrar.");
  };

  return (
    <AuthScreen titulo="Entrar na sua conta">
      <form onSubmit={submit} className="space-y-4">
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
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>

        {erro && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>

      <div className="mt-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={() => {
          entrarDemo();
          router.replace("/");
        }}
      >
        Entrar como demonstração
      </Button>

      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-semibold text-ink underline decoration-volt decoration-2 underline-offset-4"
        >
          Criar conta
        </Link>
      </p>
    </AuthScreen>
  );
}
