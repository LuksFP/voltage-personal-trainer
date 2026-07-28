"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAlunoApp } from "@/lib/aluno-app";
import {
  MODALIDADE_LABEL,
  cidadesDisponiveis,
  filtrarPersonais,
  iniciaisDoNome,
  precoBase,
  precoEmReais,
  type FiltroCatalogo,
  type OrdenacaoCatalogo,
} from "@/lib/catalogo";
import type { ModalidadeAtendimento, Objetivo, PersonalPublico } from "@/lib/types";
import { PersonalDetalhe } from "./PersonalDetalhe";
import { cx } from "@/components/ui";
import { CheckIcon, SearchIcon, StarIcon, XIcon } from "@/components/icons";

const ESPECIALIDADES: Objetivo[] = [
  "Hipertrofia",
  "Emagrecimento",
  "Força",
  "Condicionamento",
  "Reabilitação",
  "Saúde geral",
];

const MODALIDADES_FILTRO: { id: ModalidadeAtendimento; label: string }[] = [
  { id: "presencial", label: "Presencial" },
  { id: "online", label: "Online" },
];

const ORDENACOES: { id: OrdenacaoCatalogo; label: string }[] = [
  { id: "relevancia", label: "Melhor avaliados" },
  { id: "preco", label: "Menor preço" },
  { id: "experiencia", label: "Mais experientes" },
];

function Pilula({
  ativa,
  children,
  onClick,
}: {
  ativa: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={cx(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        ativa
          ? "border-volt bg-volt text-ink"
          : "border-line text-muted hover:border-accent/50 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "font-display grid shrink-0 place-items-center rounded-2xl bg-surface-2 font-bold text-accent",
        tamanho === "lg" ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg",
      )}
    >
      {iniciaisDoNome(nome)}
    </span>
  );
}

function CartaoPersonal({
  perfil,
  jaPediu,
  onAbrir,
}: {
  perfil: PersonalPublico;
  jaPediu: boolean;
  onAbrir: () => void;
}) {
  const preco = precoBase(perfil);
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full items-start gap-3.5 border-b border-line py-4 text-left transition-colors hover:bg-surface-2/40"
    >
      <Avatar nome={perfil.nome} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display truncate font-semibold">{perfil.nome}</span>
          {perfil.nota != null ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-volt">
              <StarIcon className="h-3.5 w-3.5" />
              {perfil.nota.toFixed(1).replace(".", ",")}
            </span>
          ) : (
            <span className="shrink-0 text-xs font-semibold text-muted">Sem avaliação</span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {perfil.cidade} · {MODALIDADE_LABEL[perfil.modalidade]}
        </span>
        <span className="mt-1.5 line-clamp-2 block text-sm text-muted">{perfil.bio}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {perfil.especialidades.slice(0, 2).map((especialidade) => (
            <span
              key={especialidade}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted"
            >
              {especialidade}
            </span>
          ))}
          {preco != null && (
            <span className="text-[11px] font-bold text-accent">
              a partir de {precoEmReais(preco)}
            </span>
          )}
          {jaPediu && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">
              <CheckIcon className="h-3 w-3" /> Você já chamou
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export function CatalogoPersonais() {
  const { perfisPublicos } = useStore();
  const { conta, pedidos, personal } = useAlunoApp();
  const [aberto, setAberto] = useState<PersonalPublico | null>(null);
  const [filtro, setFiltro] = useState<FiltroCatalogo>(() => ({
    especialidade: conta?.preferencias.objetivo,
    ordenacao: "relevancia",
  }));

  const cidades = useMemo(() => cidadesDisponiveis(perfisPublicos), [perfisPublicos]);
  const resultados = useMemo(
    () => filtrarPersonais(perfisPublicos, filtro),
    [perfisPublicos, filtro],
  );
  const pedidoPor = useMemo(
    () => new Set(pedidos.map((pedido) => pedido.personalPublicoId)),
    [pedidos],
  );

  const limpar = () =>
    setFiltro({ ordenacao: filtro.ordenacao });
  const temFiltro =
    filtro.texto || filtro.cidade || filtro.modalidade || filtro.especialidade;

  if (aberto) {
    return <PersonalDetalhe perfil={aberto} aoVoltar={() => setAberto(null)} />;
  }

  return (
    <section>
      {personal && (
        <div className="mb-7 flex items-center gap-3.5 border-l-2 border-volt pl-4">
          <Avatar nome={personal.nome} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-volt">Seu personal</p>
            <p className="font-display truncate text-lg font-semibold">{personal.nome}</p>
            <button
              type="button"
              onClick={() => setAberto(personal)}
              className="mt-0.5 text-sm font-semibold text-accent hover:underline"
            >
              Ver perfil
            </button>
          </div>
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Catálogo</p>
        <h1 className="font-display mt-1 text-3xl font-bold leading-tight">
          {personal ? "Outros personais" : "Quer ajuda de um personal?"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {personal
            ? "Dá pra conversar com quem você quiser. Seu acompanhamento atual só muda quando você decidir."
            : "Treinar sozinho funciona. Mas se você travou, quer corrigir execução ou tem alguma limitação, alguém olhando muda o jogo."}
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={filtro.texto ?? ""}
          onChange={(e) => setFiltro((atual) => ({ ...atual, texto: e.target.value }))}
          placeholder="Nome, bairro, especialidade…"
          aria-label="Buscar personal"
          className="w-full rounded-xl border border-line bg-surface/70 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
        />
      </div>

      {/* filtros em trilho horizontal — cabe no polegar, não vira formulário */}
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {MODALIDADES_FILTRO.map((item) => (
          <Pilula
            key={item.id}
            ativa={filtro.modalidade === item.id}
            onClick={() =>
              setFiltro((atual) => ({
                ...atual,
                modalidade: atual.modalidade === item.id ? undefined : item.id,
              }))
            }
          >
            {item.label}
          </Pilula>
        ))}
        {cidades.map((cidade) => (
          <Pilula
            key={cidade}
            ativa={filtro.cidade === cidade}
            onClick={() =>
              setFiltro((atual) => ({
                ...atual,
                cidade: atual.cidade === cidade ? undefined : cidade,
              }))
            }
          >
            {cidade}
          </Pilula>
        ))}
      </div>

      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
        {ESPECIALIDADES.map((especialidade) => (
          <Pilula
            key={especialidade}
            ativa={filtro.especialidade === especialidade}
            onClick={() =>
              setFiltro((atual) => ({
                ...atual,
                especialidade:
                  atual.especialidade === especialidade ? undefined : especialidade,
              }))
            }
          >
            {especialidade}
          </Pilula>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted">
          {resultados.length} personal{resultados.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          {temFiltro && (
            <button
              type="button"
              onClick={limpar}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-text"
            >
              <XIcon className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
          <select
            value={filtro.ordenacao ?? "relevancia"}
            onChange={(e) =>
              setFiltro((atual) => ({
                ...atual,
                ordenacao: e.target.value as OrdenacaoCatalogo,
              }))
            }
            aria-label="Ordenar resultados"
            className="rounded-lg border border-line bg-surface/70 px-2 py-1.5 text-xs font-semibold outline-none focus:border-accent/60"
          >
            {ORDENACOES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {resultados.length === 0 ? (
        <div className="mt-6 rounded-xl2 border border-line bg-surface/70 px-4 py-8 text-center">
          <p className="font-display text-lg font-semibold">Ninguém com esse perfil</p>
          <p className="mt-1 text-sm text-muted">
            Tenta afrouxar os filtros — talvez outra cidade ou atendimento online.
          </p>
          {temFiltro && (
            <button
              type="button"
              onClick={limpar}
              className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold hover:text-accent"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 border-t border-line">
          {resultados.map((perfil) => (
            <CartaoPersonal
              key={perfil.id}
              perfil={perfil}
              jaPediu={pedidoPor.has(perfil.id)}
              onAbrir={() => setAberto(perfil)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
