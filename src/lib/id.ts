/**
 * Identificador local das entidades. O prefixo faz o id dizer o que ele é
 * (`aluno_k3f9x2`), o que ajuda muito na hora de ler um backup na mão.
 *
 * `Math.random` basta enquanto os dados vivem em um navegador só. Quando o
 * Supabase entrar, quem gera id passa a ser o banco.
 */
export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
