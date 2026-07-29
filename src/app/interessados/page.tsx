"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlunoForm, type AlunoFormValues } from "@/components/AlunoForm";
import { AulaExperimentalForm, type AulaExperimentalFormValues } from "@/components/AulaExperimentalForm";
import { FollowUpInteressadoForm, type FollowUpInteressadoFormValues } from "@/components/FollowUpInteressadoForm";
import { InteressadoForm, type InteressadoFormValues } from "@/components/InteressadoForm";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  PhoneIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
  WhatsappIcon,
  XIcon,
} from "@/components/icons";
import { Modal } from "@/components/Modal";
import { Badge, Button, Card, Input, Select, Textarea, cx } from "@/components/ui";
import { linkWhatsapp } from "@/lib/compartilhar";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type {
  Interessado,
  OrigemInteressado,
  StatusAulaExperimental,
  StatusInteressado,
} from "@/lib/types";
import { parseDiaVencimento, parseMensalidade, parsePesoMeta } from "../alunos/page";

type Visao = "pipeline" | "historico";
type ColunaPipeline = "novos" | "conversa" | "experimental" | "proposta";

const ORIGENS: { value: OrigemInteressado; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
];

const ORIGEM_LABEL = Object.fromEntries(
  ORIGENS.map((origem) => [origem.value, origem.label]),
) as Record<OrigemInteressado, string>;

const STATUS_LABEL: Record<StatusInteressado, string> = {
  novo: "Novo",
  "em-contato": "Em conversa",
  "experimental-agendada": "Experimental agendada",
  "experimental-realizada": "Experimental realizada",
  proposta: "Proposta",
  convertido: "Convertido",
  perdido: "Não avançou",
};

const AULA_LABEL: Record<StatusAulaExperimental, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  faltou: "Não compareceu",
  cancelada: "Cancelada",
};

const COLUNAS: {
  id: ColunaPipeline;
  titulo: string;
  descricao: string;
  statuses: StatusInteressado[];
}[] = [
  { id: "novos", titulo: "Novos", descricao: "Ainda sem contato registrado", statuses: ["novo"] },
  { id: "conversa", titulo: "Em conversa", descricao: "Contato e qualificação", statuses: ["em-contato"] },
  {
    id: "experimental",
    titulo: "Aula experimental",
    descricao: "Agendada ou já realizada",
    statuses: ["experimental-agendada", "experimental-realizada"],
  },
  { id: "proposta", titulo: "Proposta", descricao: "Decisão e matrícula", statuses: ["proposta"] },
];

function hojeLocal(): string {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDias(dataIso: string, dias: number): string {
  const data = new Date(`${dataIso}T12:00:00`);
  data.setDate(data.getDate() + dias);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataBr(dataIso: string): string {
  return new Date(`${dataIso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dataHoraBr(dataIso: string): string {
  return new Date(dataIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ativo(interessado: Interessado): boolean {
  return interessado.status !== "convertido" && interessado.status !== "perdido";
}

function urgencia(interessado: Interessado, hoje: string): number {
  if (interessado.proximoFollowUp && interessado.proximoFollowUp < hoje) return 0;
  if (interessado.proximoFollowUp === hoje) return 1;
  if (
    interessado.aulaExperimental?.status === "agendada" &&
    interessado.aulaExperimental.data >= hoje
  ) {
    return 2;
  }
  return 3;
}

function ordenarPipeline(lista: Interessado[], hoje: string): Interessado[] {
  return [...lista].sort(
    (a, b) =>
      urgencia(a, hoje) - urgencia(b, hoje) ||
      (a.proximoFollowUp ?? "9999-12-31").localeCompare(b.proximoFollowUp ?? "9999-12-31") ||
      b.atualizadoEm.localeCompare(a.atualizadoEm) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

export default function InteressadosPage() {
  const {
    interessados,
    interessadoPorId,
    interessadosOrdenados,
    addInteressado,
    updateInteressado,
    alterarStatusInteressado,
    registrarContatoInteressado,
    agendarAulaExperimental,
    atualizarAulaExperimental,
    marcarInteressadoPerdido,
    reativarInteressado,
    converterInteressado,
    removeInteressado,
    getAluno,
  } = useStore();
  const { personal } = useAuth();
  const hoje = hojeLocal();
  const [visao, setVisao] = useState<Visao>("pipeline");
  const [colunaMobile, setColunaMobile] = useState<ColunaPipeline>("novos");
  const [busca, setBusca] = useState("");
  const [origem, setOrigem] = useState<OrigemInteressado | "todas">("todas");
  const [formId, setFormId] = useState<string | "novo" | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [followUpId, setFollowUpId] = useState<string | null>(null);
  const [experimentalId, setExperimentalId] = useState<string | null>(null);
  const [conversaoId, setConversaoId] = useState<string | null>(null);
  const [perdidoId, setPerdidoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const todos = interessadosOrdenados();
  const termoBusca = busca.trim().toLocaleLowerCase("pt-BR");
  const filtrados = todos.filter((interessado) => {
    if (origem !== "todas" && interessado.origem !== origem) return false;
    if (!termoBusca) return true;
    return [interessado.nome, interessado.telefone, interessado.email]
      .filter(Boolean)
      .some((valor) => valor!.toLocaleLowerCase("pt-BR").includes(termoBusca));
  });

  const ativos = interessados.filter(ativo);
  const followUpsVencidos = ativos.filter(
    (item) => item.proximoFollowUp && item.proximoFollowUp < hoje,
  ).length;
  const followUpsHoje = ativos.filter((item) => item.proximoFollowUp === hoje).length;
  const limiteExperimental = somarDias(hoje, 7);
  const experimentaisProximas = ativos.filter(
    (item) =>
      item.aulaExperimental?.status === "agendada" &&
      item.aulaExperimental.data >= hoje &&
      item.aulaExperimental.data <= limiteExperimental,
  ).length;
  const limite30 = somarDias(hoje, -29);
  const convertidos30 = interessados.filter(
    (item) =>
      item.status === "convertido" &&
      item.convertidoEm !== undefined &&
      item.convertidoEm.slice(0, 10) >= limite30,
  ).length;
  const perdidos30 = interessados.filter(
    (item) => item.status === "perdido" && item.atualizadoEm.slice(0, 10) >= limite30,
  ).length;
  const decisoes30 = convertidos30 + perdidos30;
  const conversao30 = decisoes30 > 0 ? Math.round((convertidos30 / decisoes30) * 100) : null;

  const fecharAcoes = () => {
    setFormId(null);
    setFollowUpId(null);
    setExperimentalId(null);
    setConversaoId(null);
    setPerdidoId(null);
    setErro(null);
  };

  const executar = (acao: () => void) => {
    try {
      setErro(null);
      acao();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    }
  };

  const abrirAcao = (
    tipo: "editar" | "followup" | "experimental" | "converter" | "perdido",
    id: string,
  ) => {
    setDetalheId(null);
    setErro(null);
    if (tipo === "editar") setFormId(id);
    if (tipo === "followup") setFollowUpId(id);
    if (tipo === "experimental") setExperimentalId(id);
    if (tipo === "converter") setConversaoId(id);
    if (tipo === "perdido") setPerdidoId(id);
  };

  const salvarInteressado = (values: InteressadoFormValues) => {
    executar(() => {
      if (!values.origem) throw new Error("Selecione a origem do contato.");
      const input = {
        nome: values.nome,
        telefone: values.telefone || undefined,
        email: values.email || undefined,
        objetivo: values.objetivo || undefined,
        origem: values.origem,
        origemDetalhe: values.origemDetalhe || undefined,
        observacoes: values.observacoes || undefined,
      };
      if (formId && formId !== "novo") updateInteressado(formId, input);
      else addInteressado(input);
      fecharAcoes();
    });
  };

  const salvarFollowUp = (values: FollowUpInteressadoFormValues) => {
    if (!followUpId) return;
    executar(() => {
      registrarContatoInteressado(followUpId, {
        canal: values.canal,
        observacao: values.observacao,
        proximoFollowUp: values.proximoFollowUp || undefined,
      });
      fecharAcoes();
    });
  };

  const salvarExperimental = (values: AulaExperimentalFormValues) => {
    if (!experimentalId) return;
    executar(() => {
      agendarAulaExperimental(experimentalId, {
        data: values.data,
        hora: values.hora,
        observacoes: values.observacoes || undefined,
      });
      fecharAcoes();
    });
  };

  const converter = (values: AlunoFormValues) => {
    if (!conversaoId) return;
    executar(() => {
      const aluno = converterInteressado(conversaoId, {
        // Fecha o vínculo: é o que faz a conta de app entrar na carteira.
        personalEmail: personal?.email,
        nome: values.nome,
        telefone: values.telefone || undefined,
        email: values.email || undefined,
        objetivo: values.objetivo || undefined,
        modalidade: values.modalidade || undefined,
        esporte: values.esporte || undefined,
        esporteDias: values.esporte ? values.esporteDias : undefined,
        pesoMeta: parsePesoMeta(values.pesoMeta),
        mensalidade: parseMensalidade(values.mensalidade),
        diaVencimento: parseDiaVencimento(values.diaVencimento),
        observacoes: values.observacoes || undefined,
        ativo: values.ativo,
      });
      fecharAcoes();
      setVisao("historico");
      setDetalheId(interessados.find((item) => item.id === conversaoId)?.id ?? null);
      window.setTimeout(() => {
        const link = document.querySelector<HTMLAnchorElement>(`a[href="/alunos/${aluno.id}"]`);
        link?.focus();
      }, 100);
    });
  };

  const formInteressado = formId && formId !== "novo" ? interessadoPorId(formId) : undefined;
  const followUpInteressado = followUpId ? interessadoPorId(followUpId) : undefined;
  const experimentalInteressado = experimentalId ? interessadoPorId(experimentalId) : undefined;
  const conversaoInteressado = conversaoId ? interessadoPorId(conversaoId) : undefined;
  const perdidoInteressado = perdidoId ? interessadoPorId(perdidoId) : undefined;
  const detalhe = detalheId ? interessadoPorId(detalheId) : undefined;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">CRM</p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
            Oportunidades em acompanhamento
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Do primeiro contato à matrícula, com origem, experimental e próximo passo visíveis.
          </p>
        </div>
        <Button onClick={() => setFormId("novo")}>
          <PlusIcon className="h-4 w-4" /> Novo interessado
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          icon={<UserPlusIcon className="h-5 w-5" />}
          valor={String(ativos.length)}
          label="Leads ativos"
          detalhe={`${interessados.length} na base total`}
        />
        <KpiCard
          icon={<ClockIcon className="h-5 w-5" />}
          valor={String(followUpsVencidos + followUpsHoje)}
          label="Follow-ups agora"
          detalhe={`${followUpsVencidos} vencido${followUpsVencidos === 1 ? "" : "s"} · ${followUpsHoje} hoje`}
          alerta={followUpsVencidos > 0}
        />
        <KpiCard
          icon={<CalendarIcon className="h-5 w-5" />}
          valor={String(experimentaisProximas)}
          label="Experimentais em 7d"
          detalhe="Aulas agendadas"
        />
        <KpiCard
          icon={<TargetIcon className="h-5 w-5" />}
          valor={conversao30 === null ? "—" : `${conversao30}%`}
          label="Conversão em 30d"
          detalhe={`${convertidos30} de ${decisoes30} decisões`}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar nome, telefone ou e-mail…"
            className="sm:w-80"
          />
          <Select
            value={origem}
            onChange={(event) => setOrigem(event.target.value as OrigemInteressado | "todas")}
            className="sm:w-48"
            aria-label="Filtrar por origem"
          >
            <option value="todas">Todas as origens</option>
            {ORIGENS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
        </div>
        <div className="inline-flex self-start rounded-xl border border-line bg-surface p-1">
          {(["pipeline", "historico"] as Visao[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setVisao(item)}
              className={cx(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                visao === item ? "bg-volt text-ink" : "text-muted hover:text-text",
              )}
            >
              {item === "pipeline" ? "Pipeline" : "Histórico"}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p className="rounded-xl border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}

      {interessados.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-accent">
            <UserPlusIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Nenhum interessado ainda</p>
            <p className="mt-1 text-sm text-muted">
              Cadastre a primeira conversa para acompanhar até a matrícula.
            </p>
          </div>
          <Button onClick={() => setFormId("novo")}>
            <PlusIcon className="h-4 w-4" /> Novo interessado
          </Button>
        </Card>
      ) : visao === "pipeline" ? (
        <Pipeline
          lista={filtrados.filter(ativo)}
          hoje={hoje}
          colunaMobile={colunaMobile}
          onColunaMobile={setColunaMobile}
          onAbrir={(id) => {
            setErro(null);
            setDetalheId(id);
          }}
        />
      ) : (
        <HistoricoInteressados
          lista={filtrados.filter((item) => !ativo(item))}
          getAluno={getAluno}
          onAbrir={(id) => {
            setErro(null);
            setDetalheId(id);
          }}
        />
      )}

      <Modal
        open={formId !== null}
        onClose={fecharAcoes}
        title={formInteressado ? "Editar interessado" : "Novo interessado"}
      >
        <InteressadoForm
          initial={formInteressado}
          onSubmit={salvarInteressado}
          onCancel={fecharAcoes}
        />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>

      <Modal
        open={followUpId !== null}
        onClose={fecharAcoes}
        title={followUpInteressado ? `Registrar contato · ${followUpInteressado.nome}` : "Registrar contato"}
      >
        <FollowUpInteressadoForm onSubmit={salvarFollowUp} onCancel={fecharAcoes} />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>

      <Modal
        open={experimentalId !== null}
        onClose={fecharAcoes}
        title={experimentalInteressado?.aulaExperimental ? "Reagendar experimental" : "Agendar experimental"}
      >
        <AulaExperimentalForm
          initial={experimentalInteressado?.aulaExperimental}
          onSubmit={salvarExperimental}
          onCancel={fecharAcoes}
        />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>

      <Modal
        open={conversaoId !== null}
        onClose={fecharAcoes}
        title="Converter em aluno"
      >
        {conversaoInteressado?.contaAppAlunoId && (
          <p className="mb-4 rounded-xl2 border border-volt/40 bg-volt/8 px-4 py-3 text-sm">
            <strong className="font-semibold">Esse lead já treina pelo app.</strong> Ao converter,
            você assume o cadastro que já existe — com o histórico de treinos e séries dele — em vez
            de criar outro. A partir daí a planilha que você montar aparece no app dele.
          </p>
        )}
        {conversaoInteressado && (
          <AlunoForm
            initial={{
              nome: conversaoInteressado.nome,
              telefone: conversaoInteressado.telefone,
              email: conversaoInteressado.email,
              objetivo: conversaoInteressado.objetivo,
              observacoes: conversaoInteressado.observacoes,
              ativo: true,
            }}
            onSubmit={converter}
            onCancel={fecharAcoes}
            submitLabel="Converter em aluno"
          />
        )}
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>

      <Modal open={perdidoId !== null} onClose={fecharAcoes} title="Encerrar oportunidade">
        {perdidoInteressado && (
          <EncerrarForm
            nome={perdidoInteressado.nome}
            onCancel={fecharAcoes}
            onSubmit={(motivo) =>
              executar(() => {
                marcarInteressadoPerdido(perdidoInteressado.id, motivo);
                fecharAcoes();
                setVisao("historico");
              })
            }
          />
        )}
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>

      <Modal
        open={detalhe !== undefined}
        onClose={() => {
          setDetalheId(null);
          setErro(null);
        }}
        title={detalhe?.nome ?? "Interessado"}
      >
        {detalhe && (
          <DetalheInteressado
            interessado={detalhe}
            alunoExiste={Boolean(detalhe.convertidoAlunoId && getAluno(detalhe.convertidoAlunoId))}
            hoje={hoje}
            onEditar={() => abrirAcao("editar", detalhe.id)}
            onFollowUp={() => abrirAcao("followup", detalhe.id)}
            onExperimental={() => abrirAcao("experimental", detalhe.id)}
            onConverter={() => abrirAcao("converter", detalhe.id)}
            onPerdido={() => abrirAcao("perdido", detalhe.id)}
            onStatus={(status) => executar(() => alterarStatusInteressado(detalhe.id, status))}
            onAulaStatus={(status) =>
              executar(() => atualizarAulaExperimental(detalhe.id, { status }))
            }
            onReativar={() => executar(() => reativarInteressado(detalhe.id))}
            onExcluir={() => {
              if (!confirm(`Excluir definitivamente “${detalhe.nome}” do CRM?`)) return;
              executar(() => {
                removeInteressado(detalhe.id);
                setDetalheId(null);
              });
            }}
          />
        )}
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>
    </div>
  );
}

function KpiCard({
  icon,
  valor,
  label,
  detalhe,
  alerta,
}: {
  icon: ReactNode;
  valor: string;
  label: string;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <Card className={cx("p-4", alerta && "border-danger/30")}>
      <div className="flex items-start justify-between gap-3">
        <span className={cx("text-accent", alerta && "text-danger")}>{icon}</span>
        <span className={cx("font-display text-3xl font-bold", alerta && "text-danger")}>{valor}</span>
      </div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted">{detalhe}</p>
    </Card>
  );
}

function Pipeline({
  lista,
  hoje,
  colunaMobile,
  onColunaMobile,
  onAbrir,
}: {
  lista: Interessado[];
  hoje: string;
  colunaMobile: ColunaPipeline;
  onColunaMobile: (coluna: ColunaPipeline) => void;
  onAbrir: (id: string) => void;
}) {
  const porColuna = (coluna: (typeof COLUNAS)[number]) =>
    ordenarPipeline(lista.filter((item) => coluna.statuses.includes(item.status)), hoje);

  return (
    <section className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 lg:hidden">
        {COLUNAS.map((coluna) => {
          const quantidade = porColuna(coluna).length;
          return (
            <button
              key={coluna.id}
              type="button"
              onClick={() => onColunaMobile(coluna.id)}
              className={cx(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                colunaMobile === coluna.id ? "bg-volt text-ink" : "text-muted",
              )}
            >
              {coluna.titulo} · {quantidade}
            </button>
          );
        })}
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-4">
        {COLUNAS.map((coluna) => (
          <Coluna key={coluna.id} coluna={coluna} lista={porColuna(coluna)} hoje={hoje} onAbrir={onAbrir} />
        ))}
      </div>

      <div className="lg:hidden">
        {COLUNAS.filter((coluna) => coluna.id === colunaMobile).map((coluna) => (
          <Coluna key={coluna.id} coluna={coluna} lista={porColuna(coluna)} hoje={hoje} onAbrir={onAbrir} />
        ))}
      </div>
    </section>
  );
}

function Coluna({
  coluna,
  lista,
  hoje,
  onAbrir,
}: {
  coluna: (typeof COLUNAS)[number];
  lista: Interessado[];
  hoje: string;
  onAbrir: (id: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-xl2 border border-line bg-surface/35 p-2.5">
      <div className="flex items-start justify-between gap-2 px-1.5 pb-3 pt-1">
        <div>
          <h2 className="font-display text-sm font-semibold">{coluna.titulo}</h2>
          <p className="mt-0.5 text-[10px] text-muted">{coluna.descricao}</p>
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
          {lista.length}
        </span>
      </div>
      <div className="space-y-2">
        {lista.map((interessado) => (
          <InteressadoCard key={interessado.id} interessado={interessado} hoje={hoje} onAbrir={onAbrir} />
        ))}
        {lista.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-3 py-7 text-center text-xs text-muted">
            Nenhum interessado nesta etapa.
          </div>
        )}
      </div>
    </div>
  );
}

function InteressadoCard({
  interessado,
  hoje,
  onAbrir,
}: {
  interessado: Interessado;
  hoje: string;
  onAbrir: (id: string) => void;
}) {
  const followUpVencido = Boolean(
    interessado.proximoFollowUp && interessado.proximoFollowUp < hoje,
  );
  const followUpHoje = interessado.proximoFollowUp === hoje;
  const whatsapp = () => {
    const primeiroNome = interessado.nome.split(" ")[0];
    window.open(
      linkWhatsapp(`Oi ${primeiroNome}! Tudo bem? Aqui é o seu personal.`, interessado.telefone),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Card className="overflow-hidden bg-surface">
      <button
        type="button"
        onClick={() => onAbrir(interessado.id)}
        className="block w-full p-3.5 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{interessado.nome}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {interessado.objetivo ?? "Objetivo não informado"}
            </p>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge>{ORIGEM_LABEL[interessado.origem]}</Badge>
          {interessado.origemDetalhe && (
            <span className="max-w-full truncate rounded-full bg-surface-2 px-2 py-1 text-[10px] text-muted">
              {interessado.origemDetalhe}
            </span>
          )}
        </div>
        {interessado.proximoFollowUp && (
          <p
            className={cx(
              "mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold",
              followUpVencido
                ? "bg-danger/10 text-danger"
                : followUpHoje
                  ? "bg-accent/10 text-accent"
                  : "bg-surface-2 text-muted",
            )}
          >
            <ClockIcon className="h-3.5 w-3.5" />
            {followUpVencido ? "Vencido · " : followUpHoje ? "Hoje · " : "Próximo · "}
            {dataBr(interessado.proximoFollowUp)}
          </p>
        )}
        {interessado.aulaExperimental && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
            <CalendarIcon className="h-3.5 w-3.5 text-accent" />
            {dataBr(interessado.aulaExperimental.data)} · {interessado.aulaExperimental.hora}
          </p>
        )}
      </button>
      <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
        <button
          type="button"
          onClick={whatsapp}
          disabled={!interessado.telefone}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted hover:bg-surface-2 hover:text-accent disabled:opacity-35"
        >
          <WhatsappIcon className="h-3.5 w-3.5" /> WhatsApp
        </button>
        <button
          type="button"
          onClick={() => onAbrir(interessado.id)}
          className="ml-auto rounded-lg px-2 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/10"
        >
          Abrir
        </button>
      </div>
    </Card>
  );
}

function HistoricoInteressados({
  lista,
  getAluno,
  onAbrir,
}: {
  lista: Interessado[];
  getAluno: (id: string) => unknown;
  onAbrir: (id: string) => void;
}) {
  if (lista.length === 0) {
    return (
      <Card className="px-5 py-10 text-center text-sm text-muted">
        Nenhuma oportunidade encerrada com os filtros atuais.
      </Card>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {lista.map((interessado) => (
        <Card key={interessado.id} className="flex items-center gap-4 p-4">
          <span
            className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              interessado.status === "convertido"
                ? "bg-accent/12 text-accent"
                : "bg-surface-2 text-muted",
            )}
          >
            {interessado.status === "convertido" ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <XIcon className="h-5 w-5" />
            )}
          </span>
          <button type="button" onClick={() => onAbrir(interessado.id)} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{interessado.nome}</p>
              <Badge tone={interessado.status === "convertido" ? "volt" : "neutral"}>
                {STATUS_LABEL[interessado.status]}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {ORIGEM_LABEL[interessado.origem]}
              {interessado.motivoPerda ? ` · ${interessado.motivoPerda}` : ""}
            </p>
          </button>
          {interessado.convertidoAlunoId && getAluno(interessado.convertidoAlunoId) ? (
            <Link
              href={`/alunos/${interessado.convertidoAlunoId}`}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-accent"
            >
              Abrir aluno
            </Link>
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-muted" />
          )}
        </Card>
      ))}
    </div>
  );
}

function DetalheInteressado({
  interessado,
  alunoExiste,
  hoje,
  onEditar,
  onFollowUp,
  onExperimental,
  onConverter,
  onPerdido,
  onStatus,
  onAulaStatus,
  onReativar,
  onExcluir,
}: {
  interessado: Interessado;
  alunoExiste: boolean;
  hoje: string;
  onEditar: () => void;
  onFollowUp: () => void;
  onExperimental: () => void;
  onConverter: () => void;
  onPerdido: () => void;
  onStatus: (status: StatusInteressado) => void;
  onAulaStatus: (status: StatusAulaExperimental) => void;
  onReativar: () => void;
  onExcluir: () => void;
}) {
  const encerrado = !ativo(interessado);
  const followUpVencido = interessado.proximoFollowUp && interessado.proximoFollowUp < hoje;
  const whatsapp = () => {
    window.open(
      linkWhatsapp(`Oi ${interessado.nome.split(" ")[0]}! Tudo bem?`, interessado.telefone),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-surface-2/35 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={interessado.status === "convertido" ? "volt" : interessado.status === "perdido" ? "off" : "neutral"}>
              {STATUS_LABEL[interessado.status]}
            </Badge>
            <Badge>{ORIGEM_LABEL[interessado.origem]}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold">{interessado.objetivo ?? "Objetivo não informado"}</p>
          <p className="mt-1 text-xs text-muted">
            Criado em {dataHoraBr(interessado.criadoEm)}
          </p>
        </div>
        {!encerrado && (
          <Button type="button" variant="outline" className="px-3 py-2" onClick={onEditar}>
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={whatsapp}
          disabled={!interessado.telefone}
          className="flex items-center gap-3 rounded-xl border border-line p-3 text-left disabled:opacity-40"
        >
          <WhatsappIcon className="h-4 w-4 text-accent" />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase text-muted">Telefone</span>
            <span className="block truncate text-sm font-semibold">{interessado.telefone ?? "Não informado"}</span>
          </span>
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <PhoneIcon className="h-4 w-4 text-accent" />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase text-muted">E-mail</span>
            <span className="block truncate text-sm font-semibold">{interessado.email ?? "Não informado"}</span>
          </span>
        </div>
      </div>

      {interessado.proximoFollowUp && !encerrado && (
        <div className={cx("rounded-xl border p-3", followUpVencido ? "border-danger/30 bg-danger/8" : "border-accent/25 bg-accent/5")}>
          <p className={cx("flex items-center gap-2 text-sm font-semibold", followUpVencido ? "text-danger" : "text-accent")}>
            <ClockIcon className="h-4 w-4" />
            {followUpVencido ? "Follow-up vencido" : interessado.proximoFollowUp === hoje ? "Follow-up hoje" : "Próximo follow-up"}
          </p>
          <p className="mt-1 text-xs text-muted">{dataBr(interessado.proximoFollowUp)}</p>
        </div>
      )}

      {interessado.aulaExperimental && (
        <div className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display flex items-center gap-2 font-semibold">
                <CalendarIcon className="h-4 w-4 text-accent" /> Aula experimental
              </p>
              <p className="mt-2 text-sm font-semibold">
                {dataBr(interessado.aulaExperimental.data)} · {interessado.aulaExperimental.hora}
              </p>
              <p className="mt-0.5 text-xs text-muted">{AULA_LABEL[interessado.aulaExperimental.status]}</p>
              {interessado.aulaExperimental.observacoes && (
                <p className="mt-2 text-xs leading-relaxed text-muted">{interessado.aulaExperimental.observacoes}</p>
              )}
            </div>
            {!encerrado && interessado.aulaExperimental.status === "agendada" && (
              <div className="flex flex-wrap gap-1">
                <Button type="button" className="px-2.5 py-1.5 text-xs" onClick={() => onAulaStatus("realizada")}>
                  Realizada
                </Button>
                <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => onAulaStatus("faltou")}>
                  Faltou
                </Button>
                <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => onAulaStatus("cancelada")}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {!encerrado && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Próxima ação</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={onFollowUp}>
              <PhoneIcon className="h-4 w-4" /> Registrar contato
            </Button>
            <Button type="button" variant="outline" onClick={onExperimental}>
              <CalendarIcon className="h-4 w-4" />
              {interessado.aulaExperimental ? "Reagendar" : "Agendar experimental"}
            </Button>
            {interessado.status === "novo" && (
              <Button type="button" onClick={() => onStatus("em-contato")}>
                Iniciar conversa <ChevronRightIcon className="h-4 w-4" />
              </Button>
            )}
            {interessado.status === "experimental-realizada" && (
              <Button type="button" onClick={() => onStatus("proposta")}>
                Avançar para proposta <ChevronRightIcon className="h-4 w-4" />
              </Button>
            )}
            {(interessado.status === "em-contato" || interessado.status === "proposta" || interessado.status === "experimental-realizada") && (
              <Button type="button" onClick={onConverter}>
                <UsersIcon className="h-4 w-4" /> Converter em aluno
              </Button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Histórico de contatos</p>
          <span className="text-xs text-muted">{interessado.historicoContatos.length}</span>
        </div>
        {interessado.historicoContatos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
            Nenhum contato registrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {[...interessado.historicoContatos].reverse().slice(0, 6).map((contato) => (
              <div key={contato.id} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold capitalize">{contato.canal}</span>
                  <span className="text-[10px] text-muted">{dataHoraBr(contato.realizadoEm)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{contato.observacao}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {interessado.observacoes && (
        <p className="rounded-xl bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-muted">
          {interessado.observacoes}
        </p>
      )}

      {interessado.status === "convertido" && interessado.convertidoAlunoId && (
        <div className="rounded-xl border border-accent/25 bg-accent/6 p-4">
          <p className="font-semibold text-accent">Matrícula concluída</p>
          <p className="mt-1 text-xs text-muted">
            {interessado.convertidoEm ? `Convertido em ${dataHoraBr(interessado.convertidoEm)}.` : "Aluno criado."}
          </p>
          {alunoExiste && (
            <Link
              href={`/alunos/${interessado.convertidoAlunoId}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-volt px-3 py-2 text-xs font-semibold text-ink"
            >
              Abrir perfil do aluno <ChevronRightIcon className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {interessado.status === "perdido" && (
        <div className="rounded-xl border border-line bg-surface-2/30 p-4">
          <p className="font-semibold">Oportunidade encerrada</p>
          <p className="mt-1 text-xs text-muted">{interessado.motivoPerda ?? "Sem motivo registrado."}</p>
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={onReativar}>
            Reabrir oportunidade
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        {!encerrado && (
          <Button type="button" variant="ghost" className="text-muted" onClick={onPerdido}>
            Não avançou
          </Button>
        )}
        <Button type="button" variant="danger" className="ml-auto" onClick={onExcluir}>
          <TrashIcon className="h-4 w-4" /> Excluir
        </Button>
      </div>
    </div>
  );
}

function EncerrarForm({
  nome,
  onCancel,
  onSubmit,
}: {
  nome: string;
  onCancel: () => void;
  onSubmit: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Registre por que {nome.split(" ")[0]} não avançou. Isso ajuda a entender a qualidade das origens.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Motivo</span>
        <Textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          rows={3}
          placeholder="Ex.: momento financeiro, horário incompatível, sem retorno…"
          autoFocus
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="danger" disabled={motivo.trim().length < 3} onClick={() => onSubmit(motivo.trim())}>
          Encerrar oportunidade
        </Button>
      </div>
    </div>
  );
}
