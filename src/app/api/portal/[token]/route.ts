import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fatiaDoAluno, mesclarFatia } from "@/lib/portal-fatia";
import { migrarStoreData } from "@/lib/persistencia";
import { baseVazia, ehTokenPortal } from "@/lib/portal-token";

/**
 * O portal do aluno, do lado do servidor.
 *
 * O aluno não tem login: chega com o token do link e mais nada. O caminho é
 * sempre o mesmo — troca o token pelo par (personal, aluno) na `portal_acesso`,
 * abre o documento daquele personal e devolve SÓ a fatia daquele aluno. A
 * service role fica presa aqui dentro; o celular nunca vê o documento inteiro.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Formato conferido antes de ir ao banco: token de verdade é hex de 32.
  // Sem isso, qualquer lixo na URL vira consulta.
  if (!ehTokenPortal(token)) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: acesso, error: erroAcesso } = await supabase
    .from("portal_acesso")
    .select("personal_id, aluno_id")
    .eq("token", token)
    .maybeSingle();

  if (erroAcesso) {
    return NextResponse.json({ erro: "Não foi possível abrir o portal." }, { status: 503 });
  }
  // Token que não existe e aluno que não está mais no documento devolvem a
  // mesma resposta de propósito: quem tem um link velho não descobre por aqui
  // se a conta existe, se foi apagada ou se o token só está errado.
  if (!acesso) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  const { data: estado, error: erroEstado } = await supabase
    .from("app_estado")
    .select("dados, atualizado_em")
    .eq("personal_id", acesso.personal_id)
    .maybeSingle();

  if (erroEstado) {
    return NextResponse.json({ erro: "Não foi possível abrir o portal." }, { status: 503 });
  }
  if (!estado) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  let dados;
  try {
    dados = migrarStoreData(estado.dados, baseVazia());
  } catch {
    return NextResponse.json({ erro: "Não foi possível abrir o portal." }, { status: 503 });
  }

  const fatia = fatiaDoAluno(dados, acesso.aluno_id);
  if (!fatia) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  return NextResponse.json(
    { dados: fatia, atualizadoEm: estado.atualizado_em },
    // Treino e histórico mudam a cada sessão, e a resposta é de UMA pessoa:
    // cache aqui serviria dado de aluno errado pra quem vier depois.
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * O aluno gravando: série marcada, check-in, hábito, vídeo, pedido de troca.
 *
 * O celular manda a fatia dele inteira e o servidor a costura de volta no
 * documento do personal (`mesclarFatia`). A costura relê do documento tudo que
 * não é daquele aluno, então nada que venha no corpo alcança outro aluno nem a
 * parte financeira — mesmo que o corpo seja forjado à mão.
 *
 * Concorrência: personal e aluno gravam a MESMA linha. Por isso a escrita
 * confere o `atualizado_em` que leu e, se alguém escreveu no meio, refaz a
 * costura em cima do documento novo em vez de sobrescrever — a fatia do aluno
 * é pequena e independente do resto, então repetir é seguro.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!ehTokenPortal(token)) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }
  if (typeof corpo !== "object" || corpo === null || !("dados" in corpo)) {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: acesso, error: erroAcesso } = await supabase
    .from("portal_acesso")
    .select("personal_id, aluno_id")
    .eq("token", token)
    .maybeSingle();

  if (erroAcesso) {
    return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 503 });
  }
  if (!acesso) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  let fatia;
  try {
    // Valida o que veio do celular com o mesmo validador do resto do app: o
    // corpo é dado de fora, e daqui ele entra no documento do personal.
    fatia = migrarStoreData((corpo as { dados: unknown }).dados, baseVazia());
  } catch {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  // Duas tentativas: a segunda cobre o caso de o personal ter salvo entre a
  // leitura e a gravação. Se perder de novo, o celular tenta na próxima.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const { data: estado, error: erroEstado } = await supabase
      .from("app_estado")
      .select("dados, atualizado_em")
      .eq("personal_id", acesso.personal_id)
      .maybeSingle();

    if (erroEstado) {
      return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 503 });
    }
    if (!estado) {
      return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
    }

    let documento;
    try {
      documento = migrarStoreData(estado.dados, baseVazia());
    } catch {
      return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 503 });
    }

    if (!documento.alunos.some((aluno) => aluno.id === acesso.aluno_id)) {
      return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
    }

    const mesclado = mesclarFatia(documento, acesso.aluno_id, fatia);

    const { data: gravado, error: erroGravacao } = await supabase
      .from("app_estado")
      .update({ dados: mesclado, atualizado_em: new Date().toISOString() })
      .eq("personal_id", acesso.personal_id)
      // A trava: só grava se ninguém mexeu depois da leitura acima.
      .eq("atualizado_em", estado.atualizado_em)
      .select("atualizado_em")
      .maybeSingle();

    if (erroGravacao) {
      return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 503 });
    }
    if (gravado) {
      return NextResponse.json(
        { atualizadoEm: gravado.atualizado_em },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return NextResponse.json(
    { erro: "O treino foi alterado enquanto você salvava. Tente de novo." },
    { status: 409 },
  );
}
