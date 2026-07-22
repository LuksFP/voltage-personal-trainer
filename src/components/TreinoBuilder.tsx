"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Aluno, Treino } from "@/lib/types";
import { treinoParaTexto, linkWhatsapp } from "@/lib/compartilhar";
import { imprimirTreino } from "@/lib/imprimir";
import { Badge, Button, Card, Input } from "./ui";
import { Modal } from "./Modal";
import { EstruturaTreinoEditor } from "./EstruturaTreinoEditor";
import {
  CopyIcon,
  DumbbellIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  TemplateIcon,
  TrashIcon,
  WhatsappIcon,
} from "./icons";

export function TreinoBuilder({ alunoId }: { alunoId: string }) {
  const {
    treinosDoAluno,
    addTreino,
    getAluno,
    templatesTreino,
    aplicarTemplateTreino,
  } = useStore();
  const treinos = treinosDoAluno(alunoId);
  const aluno = getAluno(alunoId);

  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [escolhendoModelo, setEscolhendoModelo] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const criar = () => {
    addTreino(alunoId, nomeNovo.trim() || "Nova planilha");
    setNomeNovo("");
    setCriando(false);
    setMensagem("Planilha criada e definida como ativa.");
  };

  const aplicarModelo = (templateId: string, nome: string) => {
    const criados = aplicarTemplateTreino(templateId, [alunoId]);
    if (criados.length === 0) return;
    setEscolhendoModelo(false);
    setMensagem(`Modelo “${nome}” aplicado e definido como treino ativo.`);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold">Planilhas de treino</h2>
        {!criando && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEscolhendoModelo(true)}>
              <TemplateIcon className="h-4 w-4" />
              Usar modelo
            </Button>
            <Button variant="outline" onClick={() => setCriando(true)}>
              <PlusIcon className="h-4 w-4" />
              Nova planilha
            </Button>
          </div>
        )}
      </div>

      {mensagem && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          <span>{mensagem}</span>
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar aviso">
            ✕
          </button>
        </div>
      )}

      {criando && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={nomeNovo}
            onChange={(event) => setNomeNovo(event.target.value)}
            placeholder="Nome da planilha (ex.: Treino ABC — Hipertrofia)"
            autoFocus
            onKeyDown={(event) => event.key === "Enter" && criar()}
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button onClick={criar}>Criar</Button>
          </div>
        </Card>
      )}

      {treinos.length === 0 && !criando ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
            <DumbbellIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold">Nenhuma planilha ainda</p>
            <p className="mt-1 text-sm text-muted">Crie uma ficha ou aplique um modelo pronto.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => setEscolhendoModelo(true)}>
              <TemplateIcon className="h-4 w-4" />
              Usar modelo
            </Button>
            <Button onClick={() => setCriando(true)}>
              <PlusIcon className="h-4 w-4" />
              Nova planilha
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {treinos.map((treino) => (
            <TreinoCard
              key={treino.id}
              treino={treino}
              aluno={aluno}
              onMensagem={setMensagem}
            />
          ))}
        </div>
      )}

      <Modal
        open={escolhendoModelo}
        onClose={() => setEscolhendoModelo(false)}
        title="Aplicar modelo de treino"
      >
        {templatesTreino.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
            <TemplateIcon className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-3 text-sm font-semibold">Nenhum modelo criado</p>
            <p className="mt-1 text-xs text-muted">
              Salve uma planilha como modelo ou crie um na seção Modelos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="mb-3 text-sm text-muted">
              O modelo será clonado e se tornará a planilha ativa deste aluno.
            </p>
            {templatesTreino.map((template) => {
              const total = template.divisoes.reduce(
                (sum, divisao) => sum + divisao.exercicios.length,
                0,
              );
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => aplicarModelo(template.id, template.nome)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{template.nome}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {template.divisoes.length} divisões · {total} exercícios
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-accent">Aplicar</span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </section>
  );
}

function TreinoCard({
  treino,
  aluno,
  onMensagem,
}: {
  treino: Treino;
  aluno?: Aluno;
  onMensagem: (mensagem: string) => void;
}) {
  const {
    updateTreino,
    ativarTreino,
    removeTreino,
    duplicarTreino,
    criarTemplateDeTreino,
    addDivisao,
    updateDivisao,
    setDivisaoDias,
    removeDivisao,
    addExercicio,
    updateExercicio,
    removeExercicio,
    addBlocoTreino,
    updateBlocoTreino,
    removeBlocoTreino,
  } = useStore();
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(treino.nome);
  const [copiado, setCopiado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const totalExercicios = treino.divisoes.reduce(
    (sum, divisao) => sum + divisao.exercicios.length,
    0,
  );
  const semExercicios = totalExercicios === 0;

  const salvarNome = () => {
    updateTreino(treino.id, { nome: nome.trim() || treino.nome });
    setEditandoNome(false);
  };

  const enviarWhatsapp = () => {
    const texto = treinoParaTexto(treino, aluno?.nome);
    window.open(linkWhatsapp(texto, aluno?.telefone), "_blank", "noopener,noreferrer");
  };

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(treinoParaTexto(treino, aluno?.nome));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } finally {
      setMenuAberto(false);
    }
  };

  const duplicar = () => {
    const copia = duplicarTreino(treino.id);
    if (copia) onMensagem(`“${copia.nome}” criada como rascunho independente.`);
    setMenuAberto(false);
  };

  const salvarComoModelo = () => {
    const modelo = criarTemplateDeTreino(treino.id);
    if (modelo) onMensagem(`“${modelo.nome}” salvo na biblioteca de modelos.`);
    setMenuAberto(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-surface-2/40 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {editandoNome ? (
            <div className="flex gap-2">
              <Input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                autoFocus
                onKeyDown={(event) => event.key === "Enter" && salvarNome()}
              />
              <Button onClick={salvarNome}>OK</Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditandoNome(true)}
              className="group flex max-w-full items-center gap-2 text-left"
            >
              <h3 className="truncate font-display text-lg font-semibold">{treino.nome}</h3>
              <PencilIcon className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          )}
          {treino.descricao && <p className="mt-1 text-sm text-muted">{treino.descricao}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={treino.ativo ? "volt" : "neutral"}>
              {treino.ativo ? "Ativa" : "Rascunho"}
            </Badge>
            <Badge>
              {treino.divisoes.length} divisõe{treino.divisoes.length === 1 ? "" : "s"}
            </Badge>
            <Badge>
              {totalExercicios} exercício{totalExercicios === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          {!treino.ativo && (
            <Button
              variant="outline"
              onClick={() => {
                ativarTreino(treino.id);
                onMensagem(`“${treino.nome}” agora é a planilha ativa.`);
              }}
              className="!px-3"
            >
              Tornar ativa
            </Button>
          )}
          <Button
            variant="outline"
            onClick={enviarWhatsapp}
            disabled={semExercicios}
            className="!px-3"
            title={semExercicios ? "Adicione exercícios para compartilhar" : "Enviar no WhatsApp"}
          >
            <WhatsappIcon className="h-4 w-4" />
            <span className="hidden md:inline">WhatsApp</span>
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              className="!px-2.5"
              aria-label="Mais ações da planilha"
              aria-expanded={menuAberto}
            >
              <MoreIcon className="h-4 w-4" />
            </Button>
            {menuAberto && (
              <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-2xl">
                <MenuAction onClick={duplicar} icon={<CopyIcon className="h-4 w-4" />}>
                  Duplicar planilha
                </MenuAction>
                <MenuAction
                  onClick={salvarComoModelo}
                  icon={<TemplateIcon className="h-4 w-4" />}
                >
                  Salvar como modelo
                </MenuAction>
                <MenuAction
                  onClick={copiarTexto}
                  disabled={semExercicios}
                  icon={<CopyIcon className="h-4 w-4" />}
                >
                  Copiar texto
                </MenuAction>
                <MenuAction
                  onClick={() => {
                    imprimirTreino(treino, aluno);
                    setMenuAberto(false);
                  }}
                  disabled={semExercicios}
                  icon={<PrinterIcon className="h-4 w-4" />}
                >
                  Imprimir / PDF
                </MenuAction>
                <div className="my-1 border-t border-line" />
                <MenuAction
                  danger
                  onClick={() => {
                    if (confirm(`Excluir a planilha “${treino.nome}”?`)) removeTreino(treino.id);
                    setMenuAberto(false);
                  }}
                  icon={<TrashIcon className="h-4 w-4" />}
                >
                  Excluir planilha
                </MenuAction>
              </div>
            )}
          </div>
        </div>
      </div>

      {copiado && (
        <p className="border-b border-line bg-accent/10 px-4 py-1.5 text-center text-xs font-semibold text-accent">
          Treino copiado para a área de transferência ✓
        </p>
      )}

      <EstruturaTreinoEditor
        alunoId={treino.alunoId}
        divisoes={treino.divisoes}
        onAddDivisao={(nomeDivisao) => addDivisao(treino.id, nomeDivisao)}
        onUpdateDivisao={(divisaoId, nomeDivisao) =>
          updateDivisao(treino.id, divisaoId, nomeDivisao)
        }
        onSetDias={(divisaoId, dias) => setDivisaoDias(treino.id, divisaoId, dias)}
        onRemoveDivisao={(divisaoId) => removeDivisao(treino.id, divisaoId)}
        onAddExercicio={(divisaoId, exercicio) =>
          addExercicio(treino.id, divisaoId, exercicio)
        }
        onUpdateExercicio={(divisaoId, exercicio) =>
          updateExercicio(treino.id, divisaoId, exercicio)
        }
        onRemoveExercicio={(divisaoId, exercicioId) =>
          removeExercicio(treino.id, divisaoId, exercicioId)
        }
        onAddBloco={(divisaoId, bloco) =>
          addBlocoTreino(treino.id, divisaoId, bloco)
        }
        onUpdateBloco={(divisaoId, bloco) =>
          updateBlocoTreino(treino.id, divisaoId, bloco)
        }
        onRemoveBloco={(divisaoId, blocoId) =>
          removeBlocoTreino(treino.id, divisaoId, blocoId)
        }
      />
    </Card>
  );
}

function MenuAction({
  children,
  icon,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        danger ? "text-danger hover:bg-danger/10" : "text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
