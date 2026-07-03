"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Shell } from "./Shell";
import { DumbbellIcon } from "./icons";

const ROTAS_PUBLICAS = ["/login", "/cadastro"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { personal, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publica = ROTAS_PUBLICAS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!personal && !publica) router.replace("/login");
    if (personal && publica) router.replace("/");
  }, [personal, loading, publica, router]);

  // Enquanto hidrata a sessão, evita "flash" de conteúdo protegido
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-volt text-ink">
          <DumbbellIcon className="h-6 w-6" />
        </span>
      </div>
    );
  }

  if (publica) return <>{children}</>;

  if (!personal) return null; // redirecionando para /login

  return <Shell>{children}</Shell>;
}
