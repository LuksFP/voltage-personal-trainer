"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { calcularAlertasPersonal, type AlertaPersonal, type TipoAlertaPersonal } from "@/lib/alertas";
import { acaoDoAlerta, filaDeTarefas, mensagemDoAlerta, rotuloTipoAlerta } from "@/lib/acoes-alerta";
import { linkWhatsapp } from "@/lib/compartilhar";
import { Avatar, Badge, Button, Card, cx } from "./ui";
import { Modal } from "./Modal";
import { SessaoForm, type SessaoFormPayload } from "./SessaoForm";
import { CheckIcon, WhatsappIcon } from "./icons";

const INTERVALOS_SEM_TREINO = [7, 14, 30] as const;
type IntervaloSemTreino = (typeof INTERVALOS_SEM_TREINO)[number];

const FILTROS: { valor: TipoAlertaPersonal | "todos"; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todas" },
  { valor: "dor", rotulo: "Dor" },
  { valor: "sem-treino", rotulo: "Sem planilha" },
  { valor: "sem-presenca", rotulo: "Sumidos" },
  { valor: "feedback-ruim", rotulo: "Feedback" },
  { valor: "sem-evolucao", rotulo: "Carga" },
];

const VISIVEIS_INICIAIS = 6;

/**
 * Alerta que vira tarefa: cada linha traz a mensagem pronta pro WhatsApp e o
 * próximo passo (montar planilha, remarcar, ajustar treino).
 */
export function TarefasDoPersonal() {
  const { alunos, treinos, sessoes, historicoExercicios, agendarSessoes } = useStore();
  const [diasSemTreino, setDiasSemTreino] = useState<IntervaloSemTreino>(14);
  const [filtro, setFiltro] = useState<TipoAlertaPersonal | "todos">("todos");
  const [expandido, setExpandido] = useState(false);
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [agendarPara, setAgendarPara] = useState<AlertaPersonal | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const alertas = useMemo(
    () =>
      calcularAlertasPersonal(
        { alunos, treinos, sessoes, historicoExercicios },
        { diasSemTreino, diasFeedback: 14, diasEvolucao: 45 },
      ),
    [alunos, treinos, sessoes, historicoExercicios, diasSemTreino],
  );

  const fila = useMemo(() => filaDeTarefas(alertas), [alertas]);
  const chave = (a: AlertaPersonal) => `${a.tipo}-${a.alunoId}`;

  const contagem = (valor: TipoAlertaPersonal | "todos") =>
    valor === "todos" ? fila.length : fila.filter((a) => a.tipo === valor).length;

  const filtrada = filtro === "todos" ? fila : fila.filter((a) => a.tipo === filtro);
  const pendentes = filtrada.filter((a) => !feitas.has(chave(a)));
  const visiveis = expandido ? pendentes : pendentes.slice(0, VISIVEIS_INICIAIS);
  const telefone = (id: string) => alunos.find((a) => a.id === id)?.telefone;

  const concluir = (a: AlertaPersonal) =>
    setFeitas((atual) => new Set(atual).add(chave(a)));

  const salvarSessao = (v: SessaoFormPayload) => {
    try {
      // Aqui só nasce sessão nova, então o escopo de recorrência não se aplica.
      agendarSessoes(
        {
          alunoId: v.alunoId,
          data: v.data,
          hora: v.hora,
          duracaoMin: v.duracaoMin,
          foco: v.foco,
          pacoteId: v.pacoteId,
        },
        { semanas: v.recorrenciaSemanas, permitirConflito: v.permitirConflito },
      );
      if (agendarPara) concluir(agendarPara);
      setAgendarPara(null);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível agendar.");
    }
  };

  return (
    <section aria-labelledby="tarefas-titulo">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="tarefas-titulo" className="font-display text-xl font-semibold">
              Tarefas do dia
            </h2>
            {pendentes.length > 0 ? (
              <Badge tone="off">
                {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge tone="volt">Tudo em dia</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Feedback e dor olham os últimos 14 dias; carga, os últimos 45.
          </p>
        </div>
        <div className="inline-flex self-start rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
          {INTERVALOS_SEM_TREINO.map((dias) => (
            <button
              key={dias}
              onClick={() => setDiasSemTreino(dias)}
              className={cx(
                "rounded-lg px-3 py-1.5 transition-colors",
                diasSemTreino === dias ? "bg-volt text-ink" : "text-muted hover:text-text",
              )}
              title={`Considerar sumido quem não treina há ${dias} dias`}
            >
              {dias}d
            </button>
          ))}
        </div>
      </div>

      {fila.length > 0 && (
        <div className="mb-3 flex snap-x gap-2 overflow-x-auto pb-1">
          {FILTROS.filter((f) => f.valor === "todos" || contagem(f.valor) > 0).map((f) => (
            <button
              key={f.valor}
              onClick={() => {
                setFiltro(f.valor);
                setExpandido(false);
              }}
              className={cx(
                "shrink-0 snap-start rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                filtro === f.valor
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-line text-muted hover:text-text",
              )}
            >
              {f.rotulo} · {contagem(f.valor)}
            </button>
          ))}
        </div>
      )}

      {erro && (
        <p className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {erro}
        </p>
      )}

      {pendentes.length === 0 ? (
        <Card className="flex items-center gap-3 px-5 py-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
            <CheckIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted">
            {fila.length === 0
              ? "Nenhum aluno pedindo atenção agora."
              : "Você resolveu todas as tarefas desse filtro."}
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {visiveis.map((alerta) => (
            <LinhaTarefa
              key={chave(alerta)}
              alerta={alerta}
              telefone={telefone(alerta.alunoId)}
              onAgendar={() => setAgendarPara(alerta)}
              onConcluir={() => concluir(alerta)}
            />
          ))}
        </Card>
      )}

      {pendentes.length > VISIVEIS_INICIAIS && (
        <button
          onClick={() => setExpandido((v) => !v)}
          className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          {expandido
            ? "Mostrar menos"
            : `Ver todas as ${pendentes.length} tarefas`}
        </button>
      )}

      <Modal
        open={agendarPara !== null}
        onClose={() => setAgendarPara(null)}
        title={agendarPara ? `Remarcar ${agendarPara.nome}` : "Remarcar"}
      >
        {agendarPara && (
          <SessaoForm
            defaultAlunoId={agendarPara.alunoId}
            bloquearAluno
            onSubmit={salvarSessao}
            onCancel={() => setAgendarPara(null)}
          />
        )}
      </Modal>
    </section>
  );
}

function LinhaTarefa({
  alerta,
  telefone,
  onAgendar,
  onConcluir,
}: {
  alerta: AlertaPersonal;
  telefone?: string;
  onAgendar: () => void;
  onConcluir: () => void;
}) {
  const acao = acaoDoAlerta(alerta);

  return (
    <div className="flex flex-wrap items-start gap-3 p-4">
      <Avatar nome={alerta.nome} />

      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/alunos/${alerta.alunoId}`} className="font-semibold hover:text-accent">
            {alerta.nome}
          </Link>
          <Badge tone={alerta.prioridade === "alta" ? "off" : "neutral"}>
            {rotuloTipoAlerta(alerta.tipo)}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{alerta.detalhe}</p>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <a
          href={linkWhatsapp(mensagemDoAlerta(alerta), telefone)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onConcluir}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-volt px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong sm:flex-none"
          title="Mandar mensagem pronta"
        >
          <WhatsappIcon className="h-4 w-4" />
          Falar
        </a>

        {acao.tipo === "agendar" ? (
          <Button variant="outline" onClick={onAgendar} className="flex-1 sm:flex-none">
            {acao.rotulo}
          </Button>
        ) : (
          <Link href={`/alunos/${alerta.alunoId}`} className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full">
              {acao.rotulo}
            </Button>
          </Link>
        )}

        <button
          onClick={onConcluir}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          title="Já resolvi"
          aria-label={`Marcar tarefa de ${alerta.nome} como resolvida`}
        >
          <CheckIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
