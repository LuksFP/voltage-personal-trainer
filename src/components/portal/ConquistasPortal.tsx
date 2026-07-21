"use client";

import { MedalhaCard } from "@/components/ConquistasAluno";
import { FlameIcon, MedalIcon, TargetIcon, TrophyIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { gerarGamificacaoAluno, type MedalhaGamificacao } from "@/lib/gamificacao";
import { useStore } from "@/lib/store";

function maisRecentes(a: MedalhaGamificacao, b: MedalhaGamificacao): number {
  return (b.desbloqueadaEm ?? "").localeCompare(a.desbloqueadaEm ?? "") ||
    a.titulo.localeCompare(b.titulo, "pt-BR");
}

function proximas(a: MedalhaGamificacao, b: MedalhaGamificacao): number {
  const faltaA = Math.max(0, a.alvo - a.progressoAtual) / Math.max(1, a.alvo);
  const faltaB = Math.max(0, b.alvo - b.progressoAtual) / Math.max(1, b.alvo);
  return faltaA - faltaB || a.alvo - b.alvo || a.titulo.localeCompare(b.titulo, "pt-BR");
}

export function ConquistasPortal({
  alunoId,
  modo = "resumo",
}: {
  alunoId: string;
  modo?: "resumo" | "catalogo";
}) {
  const { sessoes, historicoExercicios, metasAluno } = useStore();
  const gamificacao = gerarGamificacaoAluno({
    alunoId,
    sessoes,
    historicoExercicios,
    metas: metasAluno,
  });
  const desbloqueadas = gamificacao.medalhas
    .filter((medalha) => medalha.desbloqueada)
    .sort(maisRecentes);
  const emAndamento = gamificacao.medalhas
    .filter((medalha) => !medalha.desbloqueada)
    .sort(proximas);

  if (modo === "catalogo") {
    return (
      <section className="space-y-3" aria-labelledby="catalogo-medalhas-titulo">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Marcos do percurso
          </p>
          <h2 id="catalogo-medalhas-titulo" className="font-display mt-1 text-xl font-semibold">
            Suas medalhas
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Cada uma nasce dos seus treinos, recordes e metas. Não há pontos nem comparação.
          </p>
        </div>

        {desbloqueadas.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Desbloqueadas · {desbloqueadas.length}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {desbloqueadas.map((medalha) => (
                <MedalhaCard key={medalha.id} medalha={medalha} />
              ))}
            </div>
          </div>
        )}

        {emAndamento.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Próximos marcos
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {emAndamento.map((medalha) => (
                <MedalhaCard key={medalha.id} medalha={medalha} />
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const destaques = desbloqueadas.length === 0
    ? emAndamento.slice(0, 1)
    : [...desbloqueadas.slice(0, 2), ...emAndamento.slice(0, 1)];

  return (
    <section className="space-y-3" aria-labelledby="conquistas-portal-titulo">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Sem disputa, só progresso
          </p>
          <h2 id="conquistas-portal-titulo" className="font-display mt-1 flex items-center gap-2 text-xl font-semibold">
            <MedalIcon className="h-5 w-5 text-accent" /> Conquistas
          </h2>
        </div>
        <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
          {desbloqueadas.length} medalha{desbloqueadas.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ResumoPortal
          icon={<FlameIcon className="h-4 w-4" />}
          valor={gamificacao.sequenciaTreinos.atual}
          label="em sequência"
        />
        <ResumoPortal
          icon={<TrophyIcon className="h-4 w-4" />}
          valor={gamificacao.recordesPessoais.length}
          label="recordes"
        />
        <ResumoPortal
          icon={<TargetIcon className="h-4 w-4" />}
          valor={gamificacao.metasConcluidas}
          label="metas"
        />
      </div>

      <div className="space-y-2">
        {destaques.map((medalha) => (
          <MedalhaCard key={medalha.id} medalha={medalha} compacta />
        ))}
      </div>

      {gamificacao.sequenciaTreinos.totalRealizados === 0 && (
        <p className="rounded-xl border border-line bg-surface/45 px-4 py-3 text-xs leading-relaxed text-muted">
          Seu primeiro marco começa no primeiro treino concluído.
        </p>
      )}
    </section>
  );
}

function ResumoPortal({
  icon,
  valor,
  label,
}: {
  icon: React.ReactNode;
  valor: number;
  label: string;
}) {
  return (
    <Card className="min-w-0 p-3">
      <span className="text-accent">{icon}</span>
      <p className="font-display mt-2 text-2xl font-bold">{valor}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted">{label}</p>
    </Card>
  );
}
