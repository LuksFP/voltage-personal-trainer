-- Aplicada em 2026-09-03 (versão 20260903043144). Arquivo escrito depois,
-- para o repositório continuar sendo a fonte da verdade do schema.
--
-- aluno_e_meu() é SECURITY DEFINER e sustenta a RLS de 16 tabelas. O revoke
-- abaixo tira o acesso de quem não está logado; `authenticated` PRECISA do
-- EXECUTE, senão toda policy que chama a função passa a dar erro de permissão
-- em vez de simplesmente negar a linha.
revoke execute on function public.aluno_e_meu(uuid) from anon;
