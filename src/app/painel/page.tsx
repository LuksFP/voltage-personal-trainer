import { redirect } from "next/navigation";

// O painel do personal voltou pra raiz. Este endereço fica de pé só pra não
// quebrar links salvos — redirect temporário de propósito, pra o navegador não
// cachear o desvio se o painel mudar de lugar de novo.
export default function PainelLegadoPage() {
  redirect("/");
}
