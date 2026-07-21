"use client";

import { useMemo, useState } from "react";
import { EstruturaTreinoEditor } from "@/components/EstruturaTreinoEditor";
import { Modal } from "@/components/Modal";
import {
  BookIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";
import { Badge, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Aluno, TemplateTreino } from "@/lib/types";

function normalizarBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dataAtualizacao(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ModelosPage() {
  const {
    alunos,
    templatesTreino,
    addTemplateTreino,
    duplicarTemplateTreino,
    removeTemplateTreino,
    aplicarTemplateTreino,
  } = useStore();

  const [busca, setBusca] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [aplicando, setAplicando] = useState<TemplateTreino | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const [desativarAnteriores, setDesativarAnteriores] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const alunosAtivos = useMemo(
    () =>
      alunos
        .filter((aluno) => aluno.ativo)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [alunos],
  );

  const modelosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return templatesTreino;

    return templatesTreino.filter((template) => {
      const conteudo = [
        template.nome,
        template.descricao ?? "",
        ...template.divisoes.flatMap((divisao) => [
          divisao.nome,
          ...divisao.exercicios.map((exercicio) => exercicio.nome),
        ]),
      ].join(" ");
      return normalizarBusca(conteudo).includes(termo);
    });
  }, [busca, templatesTreino]);

  const abrirNovo = () => {
    setNovoNome("");
    setNovaDescricao("");
    setNovoOpen(true);
  };

  const criarModelo = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    addTemplateTreino(nome, novaDescricao.trim() || undefined);
    setNovoOpen(false);
    setBusca("");
    setMensagem(`Modelo “${nome}” criado. Agora você pode montar as divisões e exercícios.`);
  };

  const abrirAplicacao = (template: TemplateTreino) => {
    setAplicando(template);
    setSelecionados(new Set());
    setDesativarAnteriores(true);
  };

  const alternarAluno = (alunoId: string) => {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(alunoId)) proximos.delete(alunoId);
      else proximos.add(alunoId);
      return proximos;
    });
  };

  const todosSelecionados =
    alunosAtivos.length > 0 && alunosAtivos.every((aluno) => selecionados.has(aluno.id));

  const alternarTodos = () => {
    setSelecionados(
      todosSelecionados ? new Set() : new Set(alunosAtivos.map((aluno) => aluno.id)),
    );
  };

  const aplicarEmLote = () => {
    if (!aplicando || selecionados.size === 0) return;
    const criados = aplicarTemplateTreino(aplicando.id, Array.from(selecionados), {
      desativarAnteriores,
    });
    setAplicando(null);
    setSelecionados(new Set());
    setMensagem(
      `Modelo “${aplicando.nome}” aplicado a ${criados.length} aluno${
        criados.length === 1 ? "" : "s"
      }.`,
    );
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Templates de treino
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
            {templatesTreino.length}{" "}
            {templatesTreino.length === 1 ? "modelo reutilizável" : "modelos reutilizáveis"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Monte uma vez, duplique quando precisar e aplique a vários alunos sem compartilhar
            alterações entre as planilhas.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <PlusIcon className="h-4 w-4" />
          Novo modelo
        </Button>
      </header>

      {mensagem && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text"
        >
          <div className="flex items-start gap-2.5">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>{mensagem}</p>
          </div>
          <button
            type="button"
            onClick={() => setMensagem(null)}
            className="shrink-0 text-xs font-semibold text-muted hover:text-text"
            aria-label="Fechar mensagem"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por modelo, divisão ou exercício…"
          className="pl-10"
          aria-label="Buscar modelos de treino"
        />
      </div>

      {modelosFiltrados.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-accent">
            <BookIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">
              {templatesTreino.length === 0
                ? "Crie sua biblioteca de modelos"
                : "Nenhum modelo encontrado"}
            </p>
            <p className="mt-1 max-w-md text-sm text-muted">
              {templatesTreino.length === 0
                ? "Comece com uma estrutura vazia ou salve uma planilha de aluno como modelo."
                : "Tente buscar por outro nome, divisão ou exercício."}
            </p>
          </div>
          {templatesTreino.length === 0 && (
            <Button onClick={abrirNovo}>
              <PlusIcon className="h-4 w-4" />
              Criar primeiro modelo
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {modelosFiltrados.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onApply={() => abrirAplicacao(template)}
              onDuplicate={() => {
                const copia = duplicarTemplateTreino(template.id);
                if (copia) {
                  setBusca("");
                  setMensagem(`Modelo “${template.nome}” duplicado como “${copia.nome}”.`);
                }
              }}
              onRemove={() => {
                if (!confirm(`Excluir o modelo “${template.nome}”? As planilhas já aplicadas não serão alteradas.`)) return;
                removeTemplateTreino(template.id);
                setMensagem(`Modelo “${template.nome}” excluído.`);
              }}
            />
          ))}
        </div>
      )}

      <Modal open={novoOpen} onClose={() => setNovoOpen(false)} title="Novo modelo de treino">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            criarModelo();
          }}
        >
          <Field label="Nome">
            <Input
              value={novoNome}
              onChange={(event) => setNovoNome(event.target.value)}
              placeholder="Ex.: ABC — Hipertrofia iniciante"
              autoFocus
            />
          </Field>
          <Field label="Descrição" hint="Opcional. Ajuda a identificar quando usar este modelo.">
            <Textarea
              value={novaDescricao}
              onChange={(event) => setNovaDescricao(event.target.value)}
              rows={3}
              placeholder="Objetivo, nível, frequência e observações gerais…"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setNovoOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!novoNome.trim()}>
              Criar modelo
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={aplicando !== null}
        onClose={() => setAplicando(null)}
        title={aplicando ? `Aplicar “${aplicando.nome}”` : "Aplicar modelo"}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Escolha os alunos</p>
              <p className="text-xs text-muted">Somente alunos ativos aparecem nesta lista.</p>
            </div>
            {alunosAtivos.length > 0 && (
              <button
                type="button"
                onClick={alternarTodos}
                className="shrink-0 text-xs font-semibold text-accent hover:underline"
              >
                {todosSelecionados ? "Limpar seleção" : "Selecionar todos"}
              </button>
            )}
          </div>

          {alunosAtivos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <UsersIcon className="mx-auto h-6 w-6 text-muted" />
              <p className="mt-2 text-sm font-semibold">Nenhum aluno ativo</p>
              <p className="mt-1 text-xs text-muted">
                Ative ou cadastre um aluno antes de aplicar este modelo.
              </p>
            </div>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
              {alunosAtivos.map((aluno) => (
                <AlunoSelecionavel
                  key={aluno.id}
                  aluno={aluno}
                  selecionado={selecionados.has(aluno.id)}
                  onToggle={() => alternarAluno(aluno.id)}
                />
              ))}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2/40 p-3.5">
            <input
              type="checkbox"
              checked={desativarAnteriores}
              onChange={(event) => setDesativarAnteriores(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-volt)]"
            />
            <span>
              <span className="block text-sm font-semibold">Desativar planilhas atuais</span>
              <span className="mt-0.5 block text-xs text-muted">
                Mantém o histórico, mas deixa este modelo como a planilha ativa dos alunos
                selecionados.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              <span className="font-display font-bold text-accent">{selecionados.size}</span>{" "}
              selecionado{selecionados.size === 1 ? "" : "s"}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAplicando(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={aplicarEmLote} disabled={selecionados.size === 0}>
                Aplicar modelo
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TemplateCard({
  template,
  onApply,
  onDuplicate,
  onRemove,
}: {
  template: TemplateTreino;
  onApply: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const {
    updateTemplateTreino,
    addDivisaoTemplate,
    updateDivisaoTemplate,
    removeDivisaoTemplate,
    addExercicioTemplate,
    updateExercicioTemplate,
    removeExercicioTemplate,
    addBlocoTemplate,
    updateBlocoTemplate,
    removeBlocoTemplate,
  } = useStore();
  const [editandoDados, setEditandoDados] = useState(false);
  const [estruturaAberta, setEstruturaAberta] = useState(template.divisoes.length === 0);
  const [nome, setNome] = useState(template.nome);
  const [descricao, setDescricao] = useState(template.descricao ?? "");

  const totalExercicios = template.divisoes.reduce(
    (total, divisao) => total + divisao.exercicios.length,
    0,
  );

  const iniciarEdicao = () => {
    setNome(template.nome);
    setDescricao(template.descricao ?? "");
    setEditandoDados(true);
  };

  const cancelarEdicao = () => {
    setNome(template.nome);
    setDescricao(template.descricao ?? "");
    setEditandoDados(false);
  };

  const salvarDados = () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    updateTemplateTreino(template.id, {
      nome: nomeLimpo,
      descricao: descricao.trim(),
    });
    setEditandoDados(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-surface-2/40 p-4 sm:p-5">
        {editandoDados ? (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <Field label="Nome do modelo">
                <Input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Escape") cancelarEdicao();
                  }}
                />
              </Field>
              <Field label="Descrição">
                <Textarea
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  rows={2}
                  placeholder="Objetivo, nível e frequência recomendada…"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
              <Button type="button" onClick={salvarDados} disabled={!nome.trim()}>
                Salvar dados
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold">{template.nome}</h2>
                <Badge tone="volt">
                  {template.divisoes.length} divisõe{template.divisoes.length === 1 ? "" : "s"}
                </Badge>
                <Badge>
                  {totalExercicios} exercício{totalExercicios === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-muted">
                {template.descricao || "Sem descrição. Adicione objetivo, nível ou frequência recomendada."}
              </p>
              <p className="mt-2 text-xs text-muted/70">
                Atualizado em {dataAtualizacao(template.atualizadoEm)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button type="button" variant="outline" onClick={onApply} className="!px-3">
                <UsersIcon className="h-4 w-4" />
                Aplicar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={iniciarEdicao}
                className="!px-2.5"
                aria-label={`Editar dados de ${template.nome}`}
                title="Editar nome e descrição"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onDuplicate}
                className="!px-2.5"
                aria-label={`Duplicar ${template.nome}`}
                title="Duplicar modelo"
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onRemove}
                className="!px-2.5"
                aria-label={`Excluir ${template.nome}`}
                title="Excluir modelo"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setEstruturaAberta((aberta) => !aberta)}
        className={cx(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors sm:px-5",
          estruturaAberta ? "bg-surface-2/20 text-accent" : "text-muted hover:bg-surface-2/30 hover:text-text",
        )}
        aria-expanded={estruturaAberta}
      >
        <span>
          {estruturaAberta ? "Ocultar estrutura" : totalExercicios === 0 ? "Montar estrutura" : "Editar estrutura"}
        </span>
        <span className="text-xs font-medium text-muted">
          {template.divisoes.length} divisõe{template.divisoes.length === 1 ? "" : "s"} ·{" "}
          {totalExercicios} exercício{totalExercicios === 1 ? "" : "s"}
        </span>
      </button>

      {estruturaAberta && (
        <div className="border-t border-line">
          <EstruturaTreinoEditor
            divisoes={template.divisoes}
            onAddDivisao={(nomeDivisao) => addDivisaoTemplate(template.id, nomeDivisao)}
            onUpdateDivisao={(divisaoId, nomeDivisao) =>
              updateDivisaoTemplate(template.id, divisaoId, nomeDivisao)
            }
            onRemoveDivisao={(divisaoId) => removeDivisaoTemplate(template.id, divisaoId)}
            onAddExercicio={(divisaoId, exercicio) =>
              addExercicioTemplate(template.id, divisaoId, exercicio)
            }
            onUpdateExercicio={(divisaoId, exercicio) =>
              updateExercicioTemplate(template.id, divisaoId, exercicio)
            }
            onRemoveExercicio={(divisaoId, exercicioId) =>
              removeExercicioTemplate(template.id, divisaoId, exercicioId)
            }
            onAddBloco={(divisaoId, bloco) =>
              addBlocoTemplate(template.id, divisaoId, bloco)
            }
            onUpdateBloco={(divisaoId, bloco) =>
              updateBlocoTemplate(template.id, divisaoId, bloco)
            }
            onRemoveBloco={(divisaoId, blocoId) =>
              removeBlocoTemplate(template.id, divisaoId, blocoId)
            }
          />
        </div>
      )}
    </Card>
  );
}

function AlunoSelecionavel({
  aluno,
  selecionado,
  onToggle,
}: {
  aluno: Aluno;
  selecionado: boolean;
  onToggle: () => void;
}) {
  const iniciais = aluno.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <label
      className={cx(
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        selecionado ? "bg-accent/10" : "hover:bg-surface-2/60",
      )}
    >
      <input
        type="checkbox"
        checked={selecionado}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-[var(--color-volt)]"
      />
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-xs font-bold text-accent">
        {iniciais}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{aluno.nome}</span>
        <span className="block truncate text-xs text-muted">
          {aluno.objetivo ?? aluno.modalidade ?? "Sem objetivo informado"}
        </span>
      </span>
      {selecionado && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
    </label>
  );
}
