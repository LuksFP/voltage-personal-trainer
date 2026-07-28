"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAlunoApp } from "@/lib/aluno-app";
import { MODALIDADE_LABEL, precoEmReais } from "@/lib/catalogo";
import type { PersonalPublico } from "@/lib/types";
import { Avatar } from "./CatalogoPersonais";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import {
  ArrowLeftIcon,
  CheckIcon,
  ShieldCheckIcon,
  StarIcon,
  TargetIcon,
} from "@/components/icons";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
      <span className="text-sm text-muted">{rotulo}</span>
      <span className="text-right text-sm font-semibold">{valor}</span>
    </div>
  );
}

export function PersonalDetalhe({
  perfil,
  aoVoltar,
}: {
  perfil: PersonalPublico;
  aoVoltar: () => void;
}) {
  const { addInteressado } = useStore();
  const { conta, pedidos, registrarPedido, personal, vinculado } = useAlunoApp();
  const pedidoExistente = pedidos.find((item) => item.personalPublicoId === perfil.id);
  const eMeuPersonal = personal?.id === perfil.id;
  const vinculadoAOutro = vinculado && !eMeuPersonal;

  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = () => {
    if (!conta) return;
    setErro(null);
    if (!telefone.trim()) {
      setErro("Informe um telefone — é por onde ele vai te responder.");
      return;
    }
    setEnviando(true);
    try {
      const interessado = addInteressado({
        nome: conta.nome,
        telefone: telefone.trim(),
        objetivo: conta.preferencias.objetivo,
        origem: "catalogo",
        origemDetalhe: `Catálogo do app — ${perfil.nome}`,
        personalPublicoId: perfil.id,
        // Faz o personal assumir este cadastro em vez de criar outro.
        contaAppAlunoId: conta.alunoId,
        observacoes:
          [
            `Veio pelo app: treina ${conta.preferencias.dias}x por semana`,
            conta.preferencias.local === "casa" ? "em casa" : "na academia",
            `nível ${conta.preferencias.nivel}.`,
            mensagem.trim(),
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
      registrarPedido({
        personalPublicoId: perfil.id,
        interessadoId: interessado.id,
        em: new Date().toISOString(),
      });
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não consegui enviar seu pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section>
      <button
        type="button"
        onClick={aoVoltar}
        className="-ml-1 mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Voltar ao catálogo
      </button>

      <div className="flex items-start gap-4">
        <Avatar nome={perfil.nome} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight">{perfil.nome}</h1>
          <p className="mt-1 text-sm text-muted">
            {perfil.cidade} · {MODALIDADE_LABEL[perfil.modalidade]}
          </p>
          {perfil.nota != null ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-volt">
              <StarIcon className="h-4 w-4" />
              {perfil.nota.toFixed(1).replace(".", ",")}
              <span className="font-semibold text-muted">
                ({perfil.totalAvaliacoes} avaliações)
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">Ainda sem avaliações no app</p>
          )}
        </div>
      </div>

      {!perfil.aceitandoAlunos && (
        <p className="mt-4 rounded-xl2 border border-line bg-surface-2/50 px-4 py-3 text-sm text-muted">
          No momento a agenda está cheia. Você pode mandar mensagem mesmo assim — vai entrar na
          fila de espera.
        </p>
      )}

      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed">{perfil.bio}</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {perfil.especialidades.map((especialidade) => (
          <span
            key={especialidade}
            className="inline-flex items-center gap-1 rounded-full bg-volt/10 px-2.5 py-1 text-xs font-semibold text-volt"
          >
            <TargetIcon className="h-3.5 w-3.5" />
            {especialidade}
          </span>
        ))}
      </div>

      <div className="mt-6">
        {perfil.precoMensal != null && (
          <Linha rotulo="Mensal" valor={`${precoEmReais(perfil.precoMensal)}/mês`} />
        )}
        {perfil.precoAvulso != null && (
          <Linha rotulo="Aula avulsa" valor={precoEmReais(perfil.precoAvulso)} />
        )}
        {perfil.anosExperiencia != null && (
          <Linha rotulo="Experiência" valor={`${perfil.anosExperiencia} anos`} />
        )}
        {perfil.bairros && perfil.bairros.length > 0 && (
          <Linha rotulo="Atende em" valor={perfil.bairros.join(", ")} />
        )}
        {perfil.cref && <Linha rotulo="Registro" valor={perfil.cref} />}
      </div>

      {perfil.cref && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
          <ShieldCheckIcon className="h-4 w-4 text-accent" />
          CREF informado pelo profissional
        </p>
      )}

      {/* ── contato ─────────────────────────────────────────── */}
      <div className="mt-8 border-t border-line pt-6">
        {eMeuPersonal ? (
          <div className="rounded-xl2 border border-volt/40 bg-volt/8 p-4">
            <p className="inline-flex items-center gap-2 font-semibold text-volt">
              <CheckIcon className="h-5 w-5" /> É com {perfil.nome.split(" ")[0]} que você treina
            </p>
            <p className="mt-1 text-sm text-muted">
              Ele monta a sua planilha e acompanha o que você marca no app. Para encerrar, vá em
              Perfil.
            </p>
          </div>
        ) : pedidoExistente ? (
          <div className="rounded-xl2 border border-accent/30 bg-accent/8 p-4">
            <p className="inline-flex items-center gap-2 font-semibold text-accent">
              <CheckIcon className="h-5 w-5" /> Pedido enviado
            </p>
            <p className="mt-1 text-sm text-muted">
              {perfil.nome.split(" ")[0]} recebeu seu contato em{" "}
              {new Date(pedidoExistente.em).toLocaleDateString("pt-BR")} e responde por aqui ou
              pelo seu telefone. Enquanto isso, segue treinando.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-semibold">Pedir uma aula experimental</h2>
            <p className="mt-1 text-sm text-muted">
              Seu objetivo e sua rotina de treino vão junto — não precisa repetir tudo.
            </p>
            {vinculadoAOutro && (
              <p className="mt-4 rounded-xl2 border border-line bg-surface-2/50 px-4 py-3 text-sm text-muted">
                Hoje quem te acompanha é{" "}
                <strong className="text-text">{personal?.nome ?? "seu personal"}</strong>. Você
                pode conversar com outro sem problema — o acompanhamento atual só termina quando
                você encerrar no Perfil.
              </p>
            )}
            <div className="mt-4 space-y-4">
              <Field label="Seu telefone" hint="É por aqui que ele responde">
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(13) 90000-0000"
                  inputMode="tel"
                  required
                />
              </Field>
              <Field label="Quer falar alguma coisa?" hint="Opcional">
                <Textarea
                  rows={3}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Ex.: tenho dor no joelho ao agachar, queria ajuda com a execução."
                />
              </Field>
              {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}
              <Button
                onClick={enviar}
                disabled={enviando}
                className={cx("w-full", enviando && "opacity-60")}
              >
                {enviando ? "Enviando…" : `Chamar ${perfil.nome.split(" ")[0]}`}
              </Button>
              <p className="text-center text-xs text-muted">
                Agora ele vê só nome, telefone e objetivo. Se vocês fecharem, ele passa a montar
                seu treino e a acompanhar seus registros.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
