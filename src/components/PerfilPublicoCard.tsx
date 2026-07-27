"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { MODALIDADES, precoEmReais } from "@/lib/catalogo";
import type { ModalidadeAtendimento, Objetivo } from "@/lib/types";
import { Button, Card, Field, Input, Select, Textarea, cx } from "./ui";
import { CheckIcon, SearchIcon, UserPlusIcon } from "./icons";

const ESPECIALIDADES: Objetivo[] = [
  "Hipertrofia",
  "Emagrecimento",
  "Força",
  "Condicionamento",
  "Reabilitação",
  "Saúde geral",
];

function numeroOuIndefinido(valor: string): number | undefined {
  const limpo = valor.trim().replace(",", ".");
  if (!limpo) return undefined;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : undefined;
}

export function PerfilPublicoCard() {
  const { personal } = useAuth();
  const { perfilPublicoPorEmail, salvarPerfilPublico, removerPerfilPublico, interessados } =
    useStore();
  const perfil = personal ? perfilPublicoPorEmail(personal.email) : undefined;

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(perfil?.nome ?? personal?.nome ?? "");
  const [bio, setBio] = useState(perfil?.bio ?? personal?.bio ?? "");
  const [cidade, setCidade] = useState(perfil?.cidade ?? "");
  const [bairros, setBairros] = useState((perfil?.bairros ?? []).join(", "));
  const [modalidade, setModalidade] = useState<ModalidadeAtendimento>(
    perfil?.modalidade ?? "presencial",
  );
  const [especialidades, setEspecialidades] = useState<Objetivo[]>(
    perfil?.especialidades ?? ["Hipertrofia"],
  );
  const [precoMensal, setPrecoMensal] = useState(perfil?.precoMensal?.toString() ?? "");
  const [precoAvulso, setPrecoAvulso] = useState(perfil?.precoAvulso?.toString() ?? "");
  const [cref, setCref] = useState(perfil?.cref ?? "");
  const [anos, setAnos] = useState(perfil?.anosExperiencia?.toString() ?? "");
  const [aceitando, setAceitando] = useState(perfil?.aceitandoAlunos ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  if (!personal) return null;

  const leadsDoCatalogo = interessados.filter((item) => item.origem === "catalogo").length;

  const alternarEspecialidade = (objetivo: Objetivo) =>
    setEspecialidades((atuais) =>
      atuais.includes(objetivo)
        ? atuais.filter((item) => item !== objetivo)
        : [...atuais, objetivo],
    );

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro(null);
    try {
      salvarPerfilPublico({
        email: personal.email,
        nome,
        bio,
        cidade,
        bairros: bairros
          .split(",")
          .map((bairro) => bairro.trim())
          .filter(Boolean),
        modalidade,
        especialidades,
        precoMensal: numeroOuIndefinido(precoMensal),
        precoAvulso: numeroOuIndefinido(precoAvulso),
        cref: cref.trim() || undefined,
        anosExperiencia: numeroOuIndefinido(anos),
        aceitandoAlunos: aceitando,
      });
      setEditando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não consegui salvar seu perfil.");
    }
  };

  /* ---------- ainda não tem perfil ---------- */
  if (!perfil && !editando) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-volt/12 text-volt">
            <SearchIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Apareça no catálogo do app</h2>
            <p className="mt-1 text-sm text-muted">
              Alunos que baixam o Voltage e treinam sozinhos podem te procurar por cidade,
              especialidade e preço. Quem te chamar cai direto em{" "}
              <Link href="/interessados" className="font-semibold text-accent">
                Interessados
              </Link>
              .
            </p>
            <Button className="mt-4" onClick={() => setEditando(true)}>
              <UserPlusIcon className="h-4 w-4" /> Criar meu perfil público
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  /* ---------- perfil publicado ---------- */
  if (perfil && !editando) {
    return (
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Meu perfil no catálogo
            </p>
            <h2 className="font-display mt-1 text-lg font-semibold">{perfil.nome}</h2>
            <p className="text-sm text-muted">
              {perfil.cidade} ·{" "}
              {MODALIDADES.find((item) => item.id === perfil.modalidade)?.label}
            </p>
          </div>
          <span
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              perfil.aceitandoAlunos
                ? "bg-accent/15 text-accent"
                : "bg-surface-2 text-muted",
            )}
          >
            {perfil.aceitandoAlunos ? "Aceitando alunos" : "Agenda cheia"}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted">{perfil.bio}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {perfil.especialidades.map((especialidade) => (
            <span
              key={especialidade}
              className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted"
            >
              {especialidade}
            </span>
          ))}
          {perfil.precoMensal != null && (
            <span className="rounded-full bg-volt/10 px-2.5 py-1 text-xs font-bold text-volt">
              {precoEmReais(perfil.precoMensal)}/mês
            </span>
          )}
        </div>

        <p className="mt-4 text-sm text-muted">
          {leadsDoCatalogo === 0
            ? "Nenhum aluno te chamou pelo catálogo ainda."
            : `${leadsDoCatalogo} contato${leadsDoCatalogo === 1 ? "" : "s"} vindo${leadsDoCatalogo === 1 ? "" : "s"} do catálogo — veja em `}
          {leadsDoCatalogo > 0 && (
            <Link href="/interessados" className="font-semibold text-accent">
              Interessados
            </Link>
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setEditando(true)}>
            Editar perfil
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              salvarPerfilPublico({
                email: personal.email,
                nome: perfil.nome,
                bio: perfil.bio,
                cidade: perfil.cidade,
                bairros: perfil.bairros,
                modalidade: perfil.modalidade,
                especialidades: perfil.especialidades,
                precoMensal: perfil.precoMensal,
                precoAvulso: perfil.precoAvulso,
                cref: perfil.cref,
                anosExperiencia: perfil.anosExperiencia,
                aceitandoAlunos: !perfil.aceitandoAlunos,
              })
            }
          >
            {perfil.aceitandoAlunos ? "Marcar agenda cheia" : "Voltar a aceitar alunos"}
          </Button>
          <Button variant="danger" onClick={() => removerPerfilPublico(perfil.id)}>
            Sair do catálogo
          </Button>
          {salvo && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
              <CheckIcon className="h-4 w-4" /> Salvo
            </span>
          )}
        </div>
      </Card>
    );
  }

  /* ---------- formulário ---------- */
  return (
    <Card className="p-6">
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Meu perfil no catálogo
          </p>
          <h2 className="font-display mt-1 text-lg font-semibold">
            É isso que o aluno vê antes de te chamar
          </h2>
        </div>

        <Field label="Nome que aparece">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>

        <Field
          label="Sua apresentação"
          hint="Fale de quem você atende bem, não de você. É o que faz o aluno clicar."
        >
          <Textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ex.: Atendo quem está voltando a treinar depois de anos parado…"
            required
          />
        </Field>

        <Field label="Especialidades" hint="Marque no que você é forte">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ESPECIALIDADES.map((objetivo) => {
              const ativa = especialidades.includes(objetivo);
              return (
                <button
                  key={objetivo}
                  type="button"
                  onClick={() => alternarEspecialidade(objetivo)}
                  aria-pressed={ativa}
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                    ativa
                      ? "border-volt bg-volt text-ink"
                      : "border-line text-muted hover:border-accent/50 hover:text-text",
                  )}
                >
                  {objetivo}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Como atende">
            <Select
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value as ModalidadeAtendimento)}
            >
              {MODALIDADES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cidade">
            <Input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Guarujá"
              required
            />
          </Field>
        </div>

        <Field label="Bairros que atende" hint="Separe por vírgula (opcional)">
          <Input
            value={bairros}
            onChange={(e) => setBairros(e.target.value)}
            placeholder="Pitangueiras, Astúrias"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor mensal (R$)" hint="Opcional">
            <Input
              value={precoMensal}
              onChange={(e) => setPrecoMensal(e.target.value)}
              inputMode="decimal"
              placeholder="320"
            />
          </Field>
          <Field label="Aula avulsa (R$)" hint="Opcional">
            <Input
              value={precoAvulso}
              onChange={(e) => setPrecoAvulso(e.target.value)}
              inputMode="decimal"
              placeholder="90"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CREF" hint="Passa confiança pra quem não te conhece">
            <Input
              value={cref}
              onChange={(e) => setCref(e.target.value)}
              placeholder="CREF 4/12345-G"
            />
          </Field>
          <Field label="Anos de experiência" hint="Opcional">
            <Input
              value={anos}
              onChange={(e) => setAnos(e.target.value)}
              inputMode="numeric"
              placeholder="8"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={aceitando}
            onChange={(e) => setAceitando(e.target.checked)}
            className="h-4 w-4 accent-volt"
          />
          Estou aceitando alunos novos
        </label>

        {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit">Publicar no catálogo</Button>
          {perfil && (
            <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
