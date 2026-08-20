/**
 * Validações de entrada do store. Cada uma lança `Error` com a mensagem que a
 * tela mostra pro personal — por isso o texto importa tanto quanto a regra.
 *
 * Puras de propósito: nada aqui lê ou escreve estado.
 */
import type { Interessado, PacoteSessoes, Sessao } from "./types";
import { inicioDaSemana } from "./data";
import { gerarDatasRecorrentes } from "./agenda";
import { resumoDoPacote } from "./pacotes";
import type {
  CriarSolicitacaoSubstituicaoInput,
  CriarVideoExecucaoInput,
  ExercicioSubstitutoInput,
  PacoteSessoesInput,
  RegistrarTreinoRealizadoInput,
  SalvarCheckinSemanalInput,
  SessaoAgendamentoInput,
} from "./store-tipos";


export function interessadoObrigatorio(
  interessados: readonly Interessado[],
  id: string,
): Interessado {
  const interessado = interessados.find((item) => item.id === id);
  if (!interessado) throw new Error("Interessado não encontrado.");
  return interessado;
}


export function validarRegistroTreino(input: RegistrarTreinoRealizadoInput): void {
  if (!input.operacaoId.trim()) throw new Error("Identificador da execução ausente.");
  if (!input.alunoId.trim() || !input.data || !input.hora) {
    throw new Error("Aluno, data e hora são obrigatórios.");
  }
  if (input.exercicios.length === 0) {
    throw new Error("Conclua ao menos uma série antes de registrar o treino.");
  }

  for (const exercicio of input.exercicios) {
    if (!exercicio.nome.trim() || exercicio.seriesExecutadas.length === 0) {
      throw new Error("Todo exercício registrado precisa ter ao menos uma série concluída.");
    }
    const ordens = new Set<number>();
    for (const serie of exercicio.seriesExecutadas) {
      if (!Number.isInteger(serie.ordem) || serie.ordem < 1 || ordens.has(serie.ordem)) {
        throw new Error("A ordem das séries precisa ser única e positiva.");
      }
      ordens.add(serie.ordem);
      if (
        serie.rpe !== undefined &&
        (!Number.isFinite(serie.rpe) || serie.rpe < 1 || serie.rpe > 10)
      ) {
        throw new Error("O RPE de cada série deve estar entre 1 e 10.");
      }
      if (
        serie.resultado.metrica === "repeticoes" &&
        (!Number.isInteger(serie.resultado.repeticoes) || serie.resultado.repeticoes < 1)
      ) {
        throw new Error("As repetições concluídas devem ser um número inteiro positivo.");
      }
      if (
        serie.resultado.metrica === "tempo" &&
        (!Number.isFinite(serie.resultado.duracaoSegundos) ||
          serie.resultado.duracaoSegundos <= 0)
      ) {
        throw new Error("A duração da série deve ser positiva.");
      }
      if (
        (serie.carga.modo === "externa" || serie.carga.modo === "assistida") &&
        (!Number.isFinite(serie.carga.valorKg) || serie.carga.valorKg < 0)
      ) {
        throw new Error("A carga da série não pode ser negativa.");
      }
    }
  }
}


export function validarCheckinSemanal(input: SalvarCheckinSemanalInput): void {
  if (!input.alunoId.trim()) throw new Error("Aluno do check-in não informado.");
  if (inicioDaSemana(input.semanaInicio) !== input.semanaInicio) {
    throw new Error("A semana do check-in precisa começar em uma segunda-feira.");
  }
  const escalas = [input.energia, input.sono, input.estresse, input.alimentacao];
  if (escalas.some((valor) => !Number.isInteger(valor) || valor < 1 || valor > 5)) {
    throw new Error("As escalas do check-in precisam estar entre 1 e 5.");
  }
  if (input.horasSono !== undefined && (!Number.isFinite(input.horasSono) || input.horasSono < 0 || input.horasSono > 24)) {
    throw new Error("As horas de sono precisam estar entre 0 e 24.");
  }
  if (input.pesoKg !== undefined && (!Number.isFinite(input.pesoKg) || input.pesoKg < 20 || input.pesoKg > 400)) {
    throw new Error("O peso precisa estar entre 20 e 400 kg.");
  }
  if (!(["Sem dor", "Leve", "Moderada", "Forte"] as const).includes(input.dor)) {
    throw new Error("O nível de dor informado é inválido.");
  }
}


export function diferencaDiasIso(origem: string, destino: string): number {
  const inicio = Date.parse(`${origem}T00:00:00Z`);
  const fim = Date.parse(`${destino}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
    throw new Error("A data da sessão é inválida.");
  }
  return Math.round((fim - inicio) / 86_400_000);
}


export function validarAgendamento(input: SessaoAgendamentoInput): void {
  if (!input.alunoId.trim()) throw new Error("Selecione um aluno.");
  gerarDatasRecorrentes(input.data, 1);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora)) {
    throw new Error("Informe um horário válido.");
  }
  if (
    input.duracaoMin !== undefined &&
    (!Number.isFinite(input.duracaoMin) || input.duracaoMin < 1 || input.duracaoMin > 1440)
  ) {
    throw new Error("A duração precisa estar entre 1 e 1440 minutos.");
  }
}


export function validarDadosPacote(input: PacoteSessoesInput): void {
  if (!input.nome.trim()) throw new Error("Informe um nome para o pacote.");
  if (
    !Number.isInteger(input.quantidadeContratada) ||
    input.quantidadeContratada < 1 ||
    input.quantidadeContratada > 500
  ) {
    throw new Error("A quantidade contratada precisa estar entre 1 e 500 sessões.");
  }
  if (
    !Number.isInteger(input.utilizadasAntesDoVoltage) ||
    input.utilizadasAntesDoVoltage < 0 ||
    input.utilizadasAntesDoVoltage > input.quantidadeContratada
  ) {
    throw new Error("O uso anterior precisa estar entre zero e a quantidade contratada.");
  }
  gerarDatasRecorrentes(input.dataInicio, 1);
  gerarDatasRecorrentes(input.dataValidade, 1);
  if (input.dataValidade < input.dataInicio) {
    throw new Error("A validade não pode terminar antes do início do pacote.");
  }
  if (
    input.valorTotal !== undefined &&
    (!Number.isFinite(input.valorTotal) || input.valorTotal < 0)
  ) {
    throw new Error("O valor total do pacote não pode ser negativo.");
  }
}


export function pacoteDoVinculo(
  pacoteId: string,
  alunoId: string,
  pacotes: readonly PacoteSessoes[],
): PacoteSessoes {
  const pacote = pacotes.find((item) => item.id === pacoteId);
  if (!pacote || pacote.alunoId !== alunoId) {
    throw new Error("O pacote selecionado não pertence a este aluno.");
  }
  if (!pacote.ativo) throw new Error("Este pacote está encerrado.");
  return pacote;
}


export function validarDatasNoPacote(pacote: PacoteSessoes, datas: readonly string[]): void {
  const foraDaVigencia = datas.find(
    (data) => data < pacote.dataInicio || data > pacote.dataValidade,
  );
  if (foraDaVigencia) {
    throw new Error(
      `A sessão de ${foraDaVigencia.split("-").reverse().join("/")} fica fora da validade do pacote.`,
    );
  }
}


export function validarReservaDoPacote(
  pacoteId: string | undefined,
  alunoId: string,
  candidatas: readonly Pick<Sessao, "id" | "data" | "status">[],
  sessoes: readonly Sessao[],
  pacotes: readonly PacoteSessoes[],
  idsIgnorados = new Set<string>(),
): void {
  if (!pacoteId) return;
  const pacote = pacoteDoVinculo(pacoteId, alunoId, pacotes);
  validarDatasNoPacote(
    pacote,
    candidatas.map((sessao) => sessao.data),
  );

  const resumo = resumoDoPacote(
    pacote,
    sessoes.filter((sessao) => !idsIgnorados.has(sessao.id)),
  );
  const reservadas = sessoes.filter(
    (sessao) =>
      !idsIgnorados.has(sessao.id) &&
      sessao.pacoteId === pacote.id &&
      sessao.status === "agendada",
  ).length;
  const novasReservas = candidatas.filter((sessao) => sessao.status === "agendada").length;
  const novosConsumos = candidatas.filter((sessao) => sessao.status === "realizada").length;
  const disponiveis = Math.max(0, resumo.restantes - reservadas);
  if (novasReservas + novosConsumos > disponiveis) {
    throw new Error(
      disponiveis === 0
        ? "O pacote não tem sessões disponíveis. Cancele uma reserva ou renove o pacote."
        : `O pacote só tem ${disponiveis} ${
            disponiveis === 1 ? "sessão disponível" : "sessões disponíveis"
          }.`,
    );
  }
}


export function validarMudancaSessaoComPacote(
  sessao: Sessao,
  sessoes: readonly Sessao[],
  pacotes: readonly PacoteSessoes[],
): void {
  if (!sessao.pacoteId || (sessao.status !== "agendada" && sessao.status !== "realizada")) {
    return;
  }
  validarReservaDoPacote(
    sessao.pacoteId,
    sessao.alunoId,
    [sessao],
    sessoes,
    pacotes,
    new Set([sessao.id]),
  );
}


export function validarSolicitacaoSubstituicao(
  input: CriarSolicitacaoSubstituicaoInput,
): void {
  if (
    !(["equipamento-indisponivel", "dor", "dificuldade", "outro"] as const).includes(
      input.motivo,
    )
  ) {
    throw new Error("O motivo da substituição é inválido.");
  }
  if (!input.detalhes?.trim() || input.detalhes.trim().length < 3) {
    throw new Error("Explique brevemente por que precisa trocar este exercício.");
  }
}


export function validarExercicioSubstituto(substituto: ExercicioSubstitutoInput): void {
  if (!substituto.nome.trim()) throw new Error("Informe o exercício substituto.");
  if (!substituto.series.trim() || !substituto.repeticoes.trim()) {
    throw new Error("Informe séries e repetições do exercício substituto.");
  }
  if (!substituto.descanso.trim()) throw new Error("Informe o descanso do exercício substituto.");
}


export function validarVideoExecucao(input: CriarVideoExecucaoInput): void {
  if (!input.alunoId.trim() || !input.exercicioNomeSnapshot.trim()) {
    throw new Error("Aluno e exercício do vídeo são obrigatórios.");
  }
  if (!input.arquivoNome.trim() || !input.mimeType.startsWith("video/")) {
    throw new Error("Selecione um arquivo de vídeo válido.");
  }
  if (
    !Number.isInteger(input.tamanhoBytes) ||
    input.tamanhoBytes <= 0 ||
    input.tamanhoBytes > 100 * 1024 * 1024
  ) {
    throw new Error("O vídeo precisa ter até 100 MB.");
  }
  if (
    input.duracaoSegundos !== undefined &&
    (!Number.isFinite(input.duracaoSegundos) ||
      input.duracaoSegundos <= 0 ||
      input.duracaoSegundos > 21_600)
  ) {
    throw new Error("A duração informada para o vídeo é inválida.");
  }
}


export function erroDeConflito(quantidade: number): Error {
  return new Error(
    quantidade === 1
      ? "Existe outra sessão nesse horário. Revise o conflito ou confirme o encaixe."
      : `${quantidade} ocorrências entram em conflito com a agenda. Revise ou confirme os encaixes.`,
  );
}
