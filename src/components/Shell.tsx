"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { StatusSync } from "./StatusSync";
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  DumbbellIcon,
  GridIcon,
  LeafIcon,
  TemplateIcon,
  UsersIcon,
  UserPlusIcon,
  WalletIcon,
  WhatsappIcon,
} from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "./ui";

const nav = [
  { href: "/", label: "Painel", icon: GridIcon },
  { href: "/alunos", label: "Alunos", icon: UsersIcon },
  { href: "/interessados", label: "Interessados", icon: UserPlusIcon },
  { href: "/biblioteca", label: "Biblioteca", icon: BookIcon },
  { href: "/alimentos", label: "Alimentos", icon: LeafIcon },
  { href: "/modelos", label: "Modelos", icon: TemplateIcon },
  { href: "/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/lembretes", label: "Lembretes", icon: WhatsappIcon },
  { href: "/financeiro", label: "Financeiro", icon: WalletIcon },
  { href: "/relatorios", label: "Relatórios", icon: ChartIcon },
];

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate: () => void }) {
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : (pathname ?? "").startsWith(href);

  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cx(
            "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
            isActive(href)
              ? "bg-accent/15 text-accent"
              : "text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openMobile, setOpenMobile] = useState(false);

  return (
    <div className="flex min-h-screen w-full max-w-[1600px]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <Brand />
        <div className="mt-8">
          <NavLinks pathname={pathname} onNavigate={() => setOpenMobile(false)} />
        </div>
        <div className="mt-auto space-y-3">
          <ThemeToggle full />
          <TrainerCard />
        </div>
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setOpenMobile((v) => !v)}
              className="rounded-lg border border-line px-3 py-2 text-sm text-muted"
            >
              Menu
            </button>
          </div>
        </header>

        {openMobile && (
          <div className="border-b border-line px-4 py-3 lg:hidden">
            <NavLinks pathname={pathname} onNavigate={() => setOpenMobile(false)} />
          </div>
        )}

        <main className="flex-1 px-5 py-7 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-volt text-ink">
        <DumbbellIcon className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        Volt<span className="text-accent">age</span>
      </span>
    </Link>
  );
}

function TrainerCard() {
  const { personal, sair } = useAuth();
  const iniciais = (personal?.nome ?? "PT")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-xl2 border border-line bg-surface p-4">
      <Link href="/perfil" className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 font-display font-bold text-accent">
          {iniciais}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{personal?.nome ?? "Seu Perfil"}</p>
          <p className="truncate text-xs text-muted">Personal Trainer</p>
        </div>
      </Link>
      <button
        onClick={() => void sair()}
        className="mt-3 w-full rounded-lg border border-line py-2 text-xs font-semibold text-muted transition-colors hover:border-danger/50 hover:text-danger"
      >
        Sair
      </button>

      <div className="mt-3 border-t border-line pt-3">
        <StatusSync />
      </div>
    </div>
  );
}
