"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { AlimentoBanco, PlanoAlimentar } from "@/lib/types";
import {
  contarAlimentos,
  distribuicaoMacros,
  temMetasDefinidas,
  totaisDoPlano,
  type CriarPlanoAlimentarInput,
} from "@/lib/nutricao";
import { Modal } from "./Modal";
import { PlanoAlimentarForm } from "./PlanoAlimentarForm";
import { PlanoAlimentarView } from "./PlanoAlimentarView";
import { MacrosPlanoVsMeta } from "./MacrosPlanoVsMeta";
import { ListaDeCompras } from "./ListaDeCompras";
import { AdesaoRefeicoes } from "./AdesaoRefeicoes";
import { Badge, Button, Card } from "./ui";
import { LeafIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";

export function NutricaoAluno({ alunoId }: { alunoId: string }) {
  const {
    getAluno,
    planosDoAluno,
    addPlanoAlimentar,
    updatePlanoAlimentar,
    arquivarPlanoAlimentar,
    reativarPlanoAlimentar,
    removePlanoAlimentar,
    bancoAlimentos,
  } = useStore();
  const telefone = getAluno(alunoId)?.telefone;
  const planos = planosDoAluno(alunoId);
  const ativos = planos.filter((plano) => plano.status === "ativo");
  const arquivados = planos.filter((plano) => plano.status === "arquivado");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<PlanoAlimentar | null>(null);
  const [arquivadosAbertos, setArquivadosAbertos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fecharForm = () => {
    setFormAberto(false);
    setEditando(null);
    setErro(null);
  };

  const salvar = (input: CriarPlanoAlimentarInput) => {
    try {
      if (editando) updatePlanoAlimentar(editando.id, input);
      else addPlanoAlimentar(alunoId, input);
      fecharForm();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o plano.");
    }
  };

  const executar = (acao: () => void) => {
    try {
      setErro(null);
      acao();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar o plano.");
    }
  };

  const excluir = (plano: PlanoAlimentar) => {
    if (!confirm(`Excluir definitivamente o plano “${plano.titulo}”?`)) return;
    executar(() => removePlanoAlimentar(plano.id));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-bold">
            <LeafIcon className="h-5 w-5 text-accent" />
            Nutrição
          </h2>
          <p className="mt-1 text-sm text-muted">
            Plano alimentar com metas de macros e refeições — visível no portal do aluno.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditando(null);
            setFormAberto(true);
            setErro(null);
          }}
        >
          <PlusIcon className="h-4 w-4" /> Novo plano
        </Button>
      </div>

      {erro && !formAberto && (
        <p className="rounded-xl border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}

      {ativos.length === 0 ? (
        <Card className="px-5 py-8 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
            <LeafIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 font-display font-semibold">Nenhum plano ativo</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Monte um plano com as refeições do dia e as metas de proteína, carbo e gordura. O aluno
            passa a ver tudo pelo portal.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ativos.map((plano) => (
            <PlanoCard
              key={plano.id}
              plano={plano}
              banco={bancoAlimentos}
              telefone={telefone}
              onEditar={() => {
                setEditando(plano);
                setFormAberto(true);
                setErro(null);
              }}
              onArquivar={() => executar(() => arquivarPlanoAlimentar(plano.id))}
              onExcluir={() => excluir(plano)}
            />
          ))}
        </div>
      )}

      {arquivados.length > 0 && (
        <div className="rounded-xl2 border border-line bg-surface/45">
          <button
            type="button"
            onClick={() => setArquivadosAbertos((aberto) => !aberto)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            aria-expanded={arquivadosAbertos}
          >
            <span>
              <span className="font-display text-sm font-semibold">Planos arquivados</span>
              <span className="ml-2 text-xs text-muted">{arquivados.length}</span>
            </span>
            <span className="text-xs font-semibold text-accent">
              {arquivadosAbertos ? "Ocultar" : "Ver histórico"}
            </span>
          </button>
          {arquivadosAbertos && (
            <div className="space-y-3 border-t border-line p-3">
              {arquivados.map((plano) => (
                <PlanoCard
                  key={plano.id}
                  plano={plano}
                  banco={bancoAlimentos}
                  telefone={telefone}
                  onReativar={() => executar(() => reativarPlanoAlimentar(plano.id))}
                  onExcluir={() => excluir(plano)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={formAberto}
        onClose={fecharForm}
        title={editando ? "Editar plano alimentar" : "Novo plano alimentar"}
      >
        <PlanoAlimentarForm
          key={editando?.id ?? "novo"}
          plano={editando ?? undefined}
          banco={bancoAlimentos}
          onSubmit={salvar}
          onCancel={fecharForm}
        />
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      </Modal>
    </section>
  );
}

function PlanoCard({
  plano,
  banco,
  telefone,
  onEditar,
  onArquivar,
  onReativar,
  onExcluir,
}: {
  plano: PlanoAlimentar;
  banco: AlimentoBanco[];
  telefone?: string;
  onEditar?: () => void;
  onArquivar?: () => void;
  onReativar?: () => void;
  onExcluir: () => void;
}) {
  const [aberto, setAberto] = useState(plano.status === "ativo");
  const [mostrarCompras, setMostrarCompras] = useState(false);
  const fatias = distribuicaoMacros(plano.metas);
  const totalAlimentos = contarAlimentos(plano);
  const calculado = totaisDoPlano(plano, banco);

  return (
    <Card className={plano.status === "arquivado" ? "opacity-80" : undefined}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display truncate font-semibold">{plano.titulo}</h3>
              {plano.status === "arquivado" && <Badge>Arquivado</Badge>}
              {plano.metas.calorias !== undefined && (
                <Badge tone="volt">{plano.metas.calorias} kcal</Badge>
              )}
            </div>
            {plano.objetivo && (
              <p className="mt-1 truncate text-xs text-muted">{plano.objetivo}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              {plano.refeicoes.length}{" "}
              {plano.refeicoes.length === 1 ? "refeição" : "refeições"} · {totalAlimentos}{" "}
              {totalAlimentos === 1 ? "item" : "itens"}
              {plano.aguaLitros ? ` · ${plano.aguaLitros} L de água` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="shrink-0 text-xs font-semibold text-accent hover:underline"
            aria-expanded={aberto}
          >
            {aberto ? "Recolher" : "Ver plano"}
          </button>
        </div>

        {temMetasDefinidas(plano.metas) && fatias.length > 0 && (
          <div className="mt-4">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
              {fatias.map((fatia) => (
                <div
                  key={fatia.chave}
                  className={
                    fatia.chave === "proteinas"
                      ? "bg-volt"
                      : fatia.chave === "carboidratos"
                        ? "bg-sky-400"
                        : "bg-orange-400"
                  }
                  style={{ width: `${fatia.percentual}%` }}
                  title={`${fatia.rotulo}: ${fatia.gramas} g`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {fatias.map((fatia) => (
                <span key={fatia.chave} className="inline-flex items-center gap-1.5">
                  <span
                    className={
                      "h-2 w-2 rounded-full " +
                      (fatia.chave === "proteinas"
                        ? "bg-volt"
                        : fatia.chave === "carboidratos"
                          ? "bg-sky-400"
                          : "bg-orange-400")
                    }
                  />
                  {fatia.rotulo} <span className="font-semibold text-text">{fatia.gramas} g</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {calculado.itensCalculados > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-accent">
              Total calculado
            </span>
            <span className="text-sm">
              <span className="font-display font-bold">{calculado.macros.kcal} kcal</span>
              <span className="ml-2 text-xs text-muted">
                P {calculado.macros.proteinas} · C {calculado.macros.carboidratos} · G{" "}
                {calculado.macros.gorduras}
              </span>
            </span>
            {plano.metas.calorias !== undefined && (
              <span className="w-full text-xs text-muted sm:w-auto">
                meta {plano.metas.calorias} kcal ·{" "}
                <span
                  className={
                    calculado.macros.kcal > plano.metas.calorias
                      ? "font-semibold text-orange-300"
                      : "font-semibold text-accent"
                  }
                >
                  {calculado.macros.kcal >= plano.metas.calorias ? "+" : ""}
                  {calculado.macros.kcal - plano.metas.calorias} kcal
                </span>
              </span>
            )}
            {calculado.itensAvulsos > 0 && (
              <span className="w-full text-[11px] text-muted">
                {calculado.itensAvulsos}{" "}
                {calculado.itensAvulsos === 1 ? "item avulso não somado" : "itens avulsos não somados"}
              </span>
            )}
          </div>
        )}

        {aberto && (
          <div className="mt-4 space-y-4 border-t border-line pt-4">
            {plano.status === "ativo" && <AdesaoRefeicoes alunoId={plano.alunoId} plano={plano} />}

            <MacrosPlanoVsMeta plano={plano} banco={banco} />

            <div>
              <button
                type="button"
                onClick={() => setMostrarCompras((v) => !v)}
                className="text-xs font-semibold text-accent hover:underline"
                aria-expanded={mostrarCompras}
              >
                {mostrarCompras ? "Ocultar lista de compras" : "🛒 Lista de compras"}
              </button>
              {mostrarCompras && (
                <div className="mt-3">
                  <ListaDeCompras plano={plano} banco={banco} telefone={telefone} />
                </div>
              )}
            </div>

            <PlanoAlimentarView plano={plano} banco={banco} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-line bg-surface-2/25 px-3 py-2">
        {onEditar && (
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onEditar}>
            <PencilIcon className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
        {onArquivar && (
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onArquivar}>
            Arquivar
          </Button>
        )}
        {onReativar && (
          <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onReativar}>
            Reativar
          </Button>
        )}
        <button
          type="button"
          onClick={onExcluir}
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label={`Excluir ${plano.titulo}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
