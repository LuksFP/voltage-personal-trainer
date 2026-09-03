# Supabase no Voltage — onde parou e o que falta

Atualizado em 2026-09-03.

## Onde parou

O login e a persistência estão **codados, testados e no GitHub** (`7b98561`).
Falta **um passo manual no painel** pra tudo funcionar de ponta a ponta, e o
deploy de produção.

### Projeto

| | |
|---|---|
| Projeto Supabase | `voltage` — ref `odllfinbpcwzqkinkuaf`, região `sa-east-1` |
| Org | LuksFP (`ejoklkmjzfrzfjzxobut`) |
| Produção | https://personal-trainer-ten-steel.vercel.app (projeto Vercel `nexio4/personal-trainer`) |
| Repositório | `LuksFP/voltage-personal-trainer` |

As três chaves estão no `.env.local` (fora do git) e nas envs de **Production**
e **Development** da Vercel. Preview não foi configurado de propósito: o projeto
da Vercel **não tem repositório Git conectado**, todo deploy sai da CLI, então
preview por branch não existe.

### O que já funciona

**Login (Fase 0)** — `0781ac7`
- Sessão real do Supabase Auth, com Google. Login e cadastro são a mesma ação.
- `personais` ganhou as colunas do perfil (`bio`, `pix_*`, `documento`).
- Trigger `on_auth_user_created` cria a linha de perfil junto com o usuário.
  Sem ela o personal entra autenticado e sem perfil, e a FK de `alunos`
  derruba tudo que ele tentar salvar.
- `middleware.ts` virou `proxy.ts` (no Next 16 o nome antigo está deprecado —
  ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
- O proxy **só renova a sessão, sem gate de rota**: `/app` e `/portal` são do
  aluno, e a sessão de demonstração vive no localStorage, invisível no
  servidor — um redirect cego mandaria a demo pro login pra sempre. Quem faz o
  gate de interface é o `AppFrame`; quem protege o dado é a RLS.

**Dados na nuvem (Fase 1)** — `7b98561`
- Tabela `app_estado`: **um documento JSONB por personal**, RLS pelo dono.
- A store hidrata da nuvem e grava nela com debounce de 900 ms
  (`src/lib/nuvem.ts` + os dois `useEffect` do `StoreProvider`).
- Status visível no Shell (`StatusSync`): *Salvo na sua conta*, *Salvando…*,
  *Só neste navegador* (demo), conflito e queda de conexão.

Por que documento em vez das 25 tabelas relacionais: a store sempre carregou
tudo de uma vez e gravou o objeto inteiro num `setItem` só, então espelhar esse
formato liga as 20 rotas sem encostar nos 60 componentes. As tabelas
relacionais **continuam no banco**, prontas pra quando o portal do aluno e os
relatórios no servidor justificarem a migração fina.

### Armadilhas já tratadas (não reintroduzir)

- **Hidratar antes do auth resolver** faz a tela nascer com o seed e a gravação
  salvar esse seed por cima da nuvem. Por isso o efeito retorna cedo enquanto
  `authCarregando`.
- **Erro de rede não pode liberar gravação**: uma sessão offline gravando por
  cima apagaria o que está salvo. Nesse caso carrega o cache e trava a escrita.
- **Duas abas/aparelhos**: antes de cada gravação confere se alguém escreveu
  depois desta aba carregar; se sim, para e pede recarga.
- **Chave de cache por conta**, senão dois personais no mesmo navegador veem os
  alunos um do outro.
- **`aluno_e_meu`**: `authenticated` PRECISA do EXECUTE — sem ele as 16 policies
  que chamam a função passam a dar *erro de permissão* em vez de negar a linha.
- A primeira entrada numa conta **promove a base que já está no navegador**, em
  vez de começar do seed.

## Próximos passos

### 1. Habilitar o Google (BLOQUEIA tudo)

Hoje `/auth/v1/authorize?provider=google` responde
`"Unsupported provider: provider is not enabled"`. Sem isso o botão de login
não sai do lugar — só a demonstração funciona.

- **Google Cloud Console** → Credenciais → ID do cliente OAuth (Aplicativo da
  Web). URI de redirecionamento autorizado, exatamente:
  `https://odllfinbpcwzqkinkuaf.supabase.co/auth/v1/callback`
- **Supabase → Authentication → Providers → Google**: ativar e colar Client ID
  e Secret.
- **Supabase → Authentication → URL Configuration**:
  - Site URL: `https://personal-trainer-ten-steel.vercel.app`
  - Redirect URLs: `http://localhost:3000/auth/callback`,
    `https://personal-trainer-ten-steel.vercel.app/auth/callback`

### 2. Testar o login de ponta a ponta e subir

`npx vercel --prod`. O e2e em uso tem 16 checagens; hoje passam 15, e a 16ª é
justamente o clique no Google.

### 3. Antes de entregar pro personal testar de verdade

- **Trocar o seed por conta nova vazia.** Hoje uma conta nova herda os alunos
  fictícios do seed — confuso pra quem vai cadastrar aluno real.
- **Conferir o tamanho do documento.** JSONB por personal aguenta bem um
  personal com dezenas de alunos, mas foto e vídeo em base64 inflam rápido.
  Se aparecer lentidão, mover mídia pro Supabase Storage é o primeiro corte.

### 4. Depois (não bloqueia o teste)

- **Portal do aluno gravando** (`/portal/[codigo]`): hoje o portal escreve no
  localStorage do navegador do personal. Pra funcionar no celular do aluno
  precisa de route handler com `SUPABASE_SERVICE_ROLE_KEY` validando
  `portal_token` — a chave já está no `.env.local` e na Vercel.
- **App do aluno** (`/app`): mesma situação, ainda é local.
- **Rotacionar a service_role**: ela passou pelo histórico de um chat.
- **Migração fina pras tabelas relacionais**, quando relatório no servidor ou
  vínculo aluno↔personal entre contas justificar.

## Keepalive

`.github/workflows/supabase-keepalive.yml` faz um SELECT trivial a cada 3 dias
(o plano free pausa com ~7 dias sem requisição). O mesmo job atualiza um selo
commitado: sem isso o GitHub desabilita o `schedule` após 60 dias sem commits,
que foi o que derrubou o keepalive do `fintech-simulator`. Secrets
`SUPABASE_URL` e `SUPABASE_ANON_KEY` já estão no repositório.
