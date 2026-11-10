// sw.js — Hub Bioflora
// Service worker mínimo, só para o app poder ser instalado na tela inicial.
// Sempre busca a versão mais nova na rede (o Hub usa carimbo de hora para evitar
// cache velho). A cópia guardada só entra quando está SEM internet.
const CACHE = 'hub-bioflora-offline-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // Supabase, CDNs e fontes: sempre direto
  e.respondWith(
    fetch(req)
      .then(resp => {
        if(resp && resp.ok){ const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});

// Avisos (push) do Cliente Fiel: pedidos de resgate para a equipe e respostas para o cliente.
self.addEventListener('push', (e) => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { title: 'Bioflora', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Bioflora', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || undefined, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for(const c of lista){ if(c.url.split('#')[0] === alvo.split('#')[0] && 'focus' in c) return c.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
