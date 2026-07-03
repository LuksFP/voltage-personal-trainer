import type { Aluno, Treino } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Abre uma janela com o treino formatado para impressão / salvar como PDF.
 * Usa o diálogo de impressão do navegador (Salvar como PDF).
 */
export function imprimirTreino(treino: Treino, aluno?: Aluno): void {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const divisoes = treino.divisoes
    .map((d) => {
      const linhas =
        d.exercicios.length === 0
          ? `<tr><td colspan="5" class="vazio">Sem exercícios</td></tr>`
          : d.exercicios
              .map(
                (ex) => `<tr>
                  <td class="ex">${esc(ex.nome)}${
                    ex.observacoes ? `<span class="obs">${esc(ex.observacoes)}</span>` : ""
                  }</td>
                  <td class="c">${esc(ex.series)}</td>
                  <td class="c">${esc(ex.repeticoes)}</td>
                  <td class="c">${esc(ex.carga || "—")}</td>
                  <td class="c">${esc(ex.descanso || "—")}</td>
                </tr>`,
              )
              .join("");
      return `<section class="div">
        <h2>${esc(d.nome)}</h2>
        <table>
          <thead><tr><th>Exercício</th><th class="c">Séries</th><th class="c">Reps</th><th class="c">Carga</th><th class="c">Desc.</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(treino.nome)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #16190f; margin: 32px; }
  header { border-bottom: 3px solid #16190f; padding-bottom: 12px; margin-bottom: 20px; }
  .marca { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6b7563; }
  h1 { margin: 4px 0 6px; font-size: 24px; }
  .meta { font-size: 13px; color: #444; }
  .descricao { margin: 12px 0 0; font-size: 13px; color: #333; }
  .div { margin-top: 22px; page-break-inside: avoid; }
  .div h2 { font-size: 15px; margin: 0 0 8px; padding-left: 8px; border-left: 4px solid #7aa32b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #f0f2ea; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #555; }
  td { padding: 7px 8px; border-bottom: 1px solid #e2e5da; vertical-align: top; }
  td.c, th.c { text-align: center; }
  td.ex { font-weight: 600; }
  td.ex .obs { display: block; font-weight: 400; font-size: 11px; color: #777; margin-top: 2px; }
  td.vazio { color: #999; font-style: italic; }
  footer { margin-top: 28px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <header>
    <p class="marca">Voltage · Treino</p>
    <h1>${esc(treino.nome)}</h1>
    <p class="meta">${aluno ? `Aluno: <strong>${esc(aluno.nome)}</strong> · ` : ""}Emitido em ${hoje}</p>
    ${treino.descricao ? `<p class="descricao">${esc(treino.descricao)}</p>` : ""}
  </header>
  ${divisoes}
  <footer>Gerado por Voltage — Gestão de Personal Trainer</footer>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return; // popup bloqueado
  win.document.write(html);
  win.document.close();
}
