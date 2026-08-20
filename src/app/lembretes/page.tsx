"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { linkWhatsapp } from "@/lib/compartilhar";
import type {
  LembreteWhatsApp,
  StatusLembreteWhatsApp,
  TipoLembreteWhatsApp,
} from "@/lib/types";
import { LembreteWhatsAppForm } from "@/components/LembreteWhatsAppForm";
import { Modal } from "@/components/Modal";
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  DumbbellIcon,
  PlusIcon,
  TargetIcon,
  TemplateIcon,
  WalletIcon,
  WhatsappIcon,
  XIcon,
} from "@/components/icons";
import { Badge, Button, Card, cx } from "@/components/ui";
import { fmtDataHora, fmtDiaMesAno } from "@/lib/data";

const STATUS: { value: StatusLembreteWhatsApp; label: string }[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "enviado", label: "Enviados" },
  { value: "dispensado", label: "Dispensados" },
];

const TIPO_KEYS: TipoLembreteWhatsApp[] = [
  "treino",
  "avaliacao",
  "mensalidade",
  "checkin",
  "renovacao",
];

const TIPOS: Record<
  TipoLembreteWhatsApp,
  { label: string; icon: typeof DumbbellIcon; classe: string }
> = {
  treino: { label: "Treino", icon: DumbbellIcon, classe: "text-accent bg-accent/10" },
  avaliacao: { label: "Avaliação", icon: TargetIcon, classe: "text-sky-400 bg-sky-500/10" },
  mensalidade: { label: "Mensalidade", icon: WalletIcon, classe: "text-orange-400 bg-orange-500/10" },
  checkin: { label: "Check-in", icon: CheckIcon, classe: "text-violet-400 bg-violet-500/10" },
  renovacao: { label: "Renovação", icon: TemplateIcon, classe: "text-cyan-400 bg-cyan-500/10" },
};

function dataCurta(iso?: string): string | null {
  return iso ? fmtDiaMesAno(iso) : null;
}

function dataHora(iso?: string): string | null {
  return iso ? fmtDataHora(iso) : null;
}

export default function LembretesPage() {
  const {
    alunos,
    lembretesWhatsApp,
    sincronizarLembretesWhatsApp,
    marcarLembreteWhatsAppEnviado,
    dispensarLembreteWhatsApp,
    reativarLembreteWhatsApp,
  } = useStore();
  const [status, setStatus] = useState<StatusLembreteWhatsApp>("pendente");
  const [tipo, setTipo] = useState<TipoLembreteWhatsApp | "todos">("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [mensagemFila, setMensagemFila] = useState<string | null>(null);
  const sincronizou = useRef(false);

  useEffect(() => {
    if (sincronizou.current || alunos.length === 0) return;
    sincronizou.current = true;
    sincronizarLembretesWhatsApp();
  }, [alunos.length, sincronizarLembretesWhatsApp]);

  const contagens = useMemo(
    () => ({
      pendente: lembretesWhatsApp.filter((lembrete) => lembrete.status === "pendente").length,
      enviado: lembretesWhatsApp.filter((lembrete) => lembrete.status === "enviado").length,
      dispensado: lembretesWhatsApp.filter((lembrete) => lembrete.status === "dispensado").length,
    }),
    [lembretesWhatsApp],
  );

  const visiveis = useMemo(
    () =>
      lembretesWhatsApp
        .filter(
          (lembrete) =>
            lembrete.status === status && (tipo === "todos" || lembrete.tipo === tipo),
        )
        .sort(
          (a, b) =>
            (a.dataReferencia ?? "9999-12-31").localeCompare(
              b.dataReferencia ?? "9999-12-31",
            ) || b.criadoEm.localeCompare(a.criadoEm),
        ),
    [lembretesWhatsApp, status, tipo],
  );

  const alunoDo = (lembrete: LembreteWhatsApp) =>
    alunos.find((aluno) => aluno.id === lembrete.alunoId);

  const mensagemFinal = (lembrete: LembreteWhatsApp) =>
    lembrete.mensagem.replaceAll(
      "{{portal}}",
      `${window.location.origin}/portal/${lembrete.alunoId}`,
    );

  const enviar = (lembrete: LembreteWhatsApp) => {
    const aluno = alunoDo(lembrete);
    if (!aluno?.telefone) return;
    window.open(
      linkWhatsapp(mensagemFinal(lembrete), aluno.telefone),
      "_blank",
      "noopener,noreferrer",
    );
    marcarLembreteWhatsAppEnviado(lembrete.id);
  };

  const copiar = async (lembrete: LembreteWhatsApp) => {
    try {
      await navigator.clipboard.writeText(mensagemFinal(lembrete));
      setCopiadoId(lembrete.id);
      setTimeout(() => setCopiadoId(null), 1600);
    } catch {
      setMensagemFila("Não foi possível copiar a mensagem neste navegador.");
    }
  };

  const atualizarFila = () => {
    const novos = sincronizarLembretesWhatsApp();
    setMensagemFila(
      novos > 0
        ? `${novos} novo${novos === 1 ? " lembrete adicionado" : "s lembretes adicionados"}.`
        : "Fila atualizada. Nenhum lembrete novo agora.",
    );
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">WhatsApp</p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">Central de lembretes</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            O Voltage identifica o que precisa ser lembrado, prepara a mensagem e deixa o envio sob
            sua confirmação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={atualizarFila}>
            Atualizar fila
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Novo lembrete
          </Button>
        </div>
      </header>

      {mensagemFila && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          <span>{mensagemFila}</span>
          <button type="button" onClick={() => setMensagemFila(null)} aria-label="Fechar aviso">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {STATUS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatus(item.value)}
            className={cx(
              "rounded-xl2 border p-4 text-left transition-colors",
              status === item.value
                ? "border-accent bg-accent/8"
                : "border-line bg-surface/70 hover:border-accent/35",
            )}
          >
            <span className="font-display text-3xl font-bold">{contagens[item.value]}</span>
            <span className="mt-1 block text-sm font-semibold text-muted">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTipo("todos")}
          className={cx(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            tipo === "todos" ? "bg-volt text-ink" : "bg-surface-2 text-muted",
          )}
        >
          Todos
        </button>
        {TIPO_KEYS.map((chave) => {
          const config = TIPOS[chave];
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setTipo(chave)}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                tipo === chave ? "bg-volt text-ink" : "bg-surface-2 text-muted",
              )}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <WhatsappIcon className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold">Nada nesta fila</p>
          <p className="mt-1 text-sm text-muted">
            {status === "pendente"
              ? "Os próximos lembretes automáticos aparecerão aqui."
              : "Nenhum lembrete com este filtro."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visiveis.map((lembrete) => (
            <LembreteCard
              key={lembrete.id}
              lembrete={lembrete}
              aluno={alunoDo(lembrete)}
              copiado={copiadoId === lembrete.id}
              onEnviar={() => enviar(lembrete)}
              onCopiar={() => copiar(lembrete)}
              onDispensar={() => dispensarLembreteWhatsApp(lembrete.id)}
              onReativar={() => reativarLembreteWhatsApp(lembrete.id)}
            />
          ))}
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Como a fila automática funciona</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Entram treinos de hoje e amanhã, avaliações atrasadas, mensalidades próximas ou
              vencidas, check-ins pendentes e programas perto da renovação. O WhatsApp só abre
              quando você confirma o envio.
            </p>
          </div>
        </div>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Novo lembrete">
        <LembreteWhatsAppForm
          onCreated={() => {
            setFormOpen(false);
            setStatus("pendente");
            setMensagemFila("Lembrete manual adicionado à fila.");
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}

function LembreteCard({
  lembrete,
  aluno,
  copiado,
  onEnviar,
  onCopiar,
  onDispensar,
  onReativar,
}: {
  lembrete: LembreteWhatsApp;
  aluno?: { nome: string; telefone?: string; id: string };
  copiado: boolean;
  onEnviar: () => void;
  onCopiar: () => void;
  onDispensar: () => void;
  onReativar: () => void;
}) {
  const config = TIPOS[lembrete.tipo];
  const Icon = config.icon;
  const referencia = dataCurta(lembrete.dataReferencia);
  const statusData =
    lembrete.status === "enviado"
      ? dataHora(lembrete.enviadoEm)
      : lembrete.status === "dispensado"
        ? dataHora(lembrete.dispensadoEm)
        : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-line bg-surface-2/30 p-4">
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", config.classe)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display font-semibold">{lembrete.titulo}</p>
            <Badge tone={lembrete.origem === "automatica" ? "volt" : "neutral"}>
              {lembrete.origem === "automatica" ? "Automático" : "Manual"}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-muted">
            {aluno?.nome ?? "Aluno removido"}
            {referencia ? ` · ${referencia}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <p className="whitespace-pre-wrap rounded-xl bg-surface-2/45 px-3 py-2.5 text-sm leading-relaxed text-muted">
          {lembrete.mensagem.replace("{{portal}}", "link do portal do aluno")}
        </p>
        {!aluno?.telefone && (
          <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-400">
            Cadastre o telefone do aluno para abrir a conversa no WhatsApp. {aluno && (
              <Link href={`/alunos/${aluno.id}`} className="underline">Abrir cadastro</Link>
            )}
          </p>
        )}
        {statusData && (
          <p className="text-xs text-muted">
            {lembrete.status === "enviado" ? "Enviado" : "Dispensado"} em {statusData}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(lembrete.status === "pendente" || lembrete.status === "enviado") && (
            <Button type="button" onClick={onEnviar} disabled={!aluno?.telefone}>
              <WhatsappIcon className="h-4 w-4" />
              {lembrete.status === "enviado" ? "Enviar novamente" : "Enviar no WhatsApp"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCopiar}>
            <CopyIcon className="h-4 w-4" />
            {copiado ? "Copiado ✓" : "Copiar"}
          </Button>
          {lembrete.status === "pendente" ? (
            <Button type="button" variant="ghost" onClick={onDispensar} className="ml-auto">
              Dispensar
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onReativar} className="ml-auto">
              Voltar para pendentes
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
