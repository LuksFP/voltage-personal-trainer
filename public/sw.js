/* Service worker do Voltage.

   São dois PWAs neste domínio — o painel do personal (/) e o app do aluno
   (/app) — e um service worker só, porque o escopo do registro é a raiz.

   Estratégia deliberadamente conservadora: os dados vivem no localStorage (não
   passam por aqui), então o SW só precisa garantir que a casca abra sem rede —
   treinar (ou dar aula) na academia com sinal ruim.

   - navegação: rede primeiro, cai pra casca do LADO CERTO quando offline
   - estático (_next/static, ícones): cache primeiro, são versionados
   - resto: passa direto
*/

const CACHE = "voltage-v2";
const CASCA_ALUNO = "/app";
const CASCA_PERSONAL = "/";

/** Offline, cada lado cai na sua própria casca: o aluno nunca vê o painel. */
function cascaDe(pathname) {
  return pathname === "/app" || pathname.startsWith("/app/") ? CASCA_ALUNO : CASCA_PERSONAL;
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([CASCA_ALUNO, CASCA_PERSONAL, "/icons/icon-192.png"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const casca = cascaDe(url.pathname);
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(casca, copia));
          return resposta;
        })
        .catch(() => caches.match(casca).then((cacheado) => cacheado ?? Response.error())),
    );
    return;
  }

  const estatico =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  if (!estatico) return;

  evento.respondWith(
    caches.match(request).then(
      (cacheado) =>
        cacheado ??
        fetch(request).then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
          return resposta;
        }),
    ),
  );
});
