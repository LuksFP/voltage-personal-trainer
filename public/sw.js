/* Service worker do Voltage.

   Estratégia deliberadamente conservadora: os dados do aluno vivem no
   localStorage (não passam por aqui), então o SW só precisa garantir que a
   casca do app abra sem rede — treinar na academia com sinal ruim.

   - navegação: rede primeiro, cai pro cache quando offline
   - estático (_next/static, ícones): cache primeiro, são versionados
   - resto: passa direto
*/

const CACHE = "voltage-v1";
const CASCA = "/app";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([CASCA, "/icons/icon-192.png"])),
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
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(CASCA, copia));
          return resposta;
        })
        .catch(() => caches.match(CASCA).then((cache) => cache ?? Response.error())),
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
