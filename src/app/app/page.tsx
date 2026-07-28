import { permanentRedirect } from "next/navigation";

// O app do aluno passou a morar na raiz. Esta rota fica de pé porque é o
// start_url dos PWAs já instalados e o endereço que circulou por link.
export default function AppLegadoPage() {
  permanentRedirect("/");
}
