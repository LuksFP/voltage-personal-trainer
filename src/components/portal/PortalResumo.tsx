"use client";

import { useStore } from "@/lib/store";
import { analisarExercicios } from "@/lib/progressao";
import { Card } from "@/components/ui";
import { ChartIcon, CheckIcon, TargetIcon, TrendUpIcon } from "@/components/icons";

function subtrairDias(iso: string, dias: number): string {
  const data = new Date(`${iso}T12:00:00`);
  data.setDate(data.getDate() - dias);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function inicioSemana(iso: string): string {
  const data = new Date(`${iso}T12:00:00`);
  const deslocamento = (data.getDay() + 6) % 7;
  data.setDate(data.getDate() - deslocamento);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function PortalResumo({
  alunoId,
  hoje,
  onAbrirEvolucao,
}: {
  alunoId: string;
  hoje: string;
  onAbrirEvolucao: () => void;
}) {
  const { sessoes, historicoExercicios, avaliacoesDoAluno, getAluno } = useStore();
  const realizadas = sessoes.filter(
    (sessao) => sessao.alunoId === alunoId && sessao.status === "realizada",
  );
  const semana = realizadas.filter((sessao) => sessao.data >= inicioSemana(hoje)).length;
  const ultimos30 = realizadas.filter(
    (sessao) => sessao.data >= subtrairDias(hoje, 29) && sessao.data <= hoje,
  ).length;
  const analises = analisarExercicios(historicoExercicios, alunoId);
  const avaliacoes = avaliacoesDoAluno(alunoId);
  const pesos = avaliacoes.filter((avaliacao) => avaliacao.peso !== undefined);
  const pesoAtual = pesos.at(-1)?.peso;
  const pesoInicial = pesos[0]?.peso;
  const meta = getAluno(alunoId)?.pesoMeta;
  const distanciaTotal =
    meta !== undefined && pesoInicial !== undefined ? Math.abs(meta - pesoInicial) : undefined;
  const progresso =
    meta !== undefined && pesoAtual !== undefined && distanciaTotal !== undefined
      ? distanciaTotal === 0
        ? 100
        : Math.max(0, Math.min(100, ((distanciaTotal - Math.abs(meta - pesoAtual)) / distanciaTotal) * 100))
      : undefined;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Seu ritmo</p>
        <h2 className="font-display mt-1 text-xl font-semibold">Resumo do progresso</h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ResumoNumero
          icon={<CheckIcon className="h-4 w-4" />}
          valor={semana}
          label="esta semana"
        />
        <ResumoNumero
          icon={<ChartIcon className="h-4 w-4" />}
          valor={ultimos30}
          label="nos últimos 30d"
        />
        <ResumoNumero
          icon={<TrendUpIcon className="h-4 w-4" />}
          valor={analises.length}
          label="exercícios medidos"
        />
      </div>

      {meta !== undefined && (
        <button type="button" onClick={onAbrirEvolucao} className="block w-full text-left">
          <Card className="p-4 transition-colors hover:border-accent/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
                  <TargetIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Meta corporal</p>
                  <p className="text-xs text-muted">
                    {pesoAtual !== undefined ? `${pesoAtual.toLocaleString("pt-BR")} kg agora` : "Aguardando avaliação"}
                    {` · meta ${meta.toLocaleString("pt-BR")} kg`}
                  </p>
                </div>
              </div>
              <span className="font-display text-lg font-bold text-accent">
                {progresso !== undefined ? `${Math.round(progresso)}%` : "—"}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-volt transition-[width]"
                style={{ width: `${progresso ?? 0}%` }}
              />
            </div>
          </Card>
        </button>
      )}
    </section>
  );
}

function ResumoNumero({
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
      <p className="mt-0.5 text-[10px] leading-tight text-muted">{label}</p>
    </Card>
  );
}
