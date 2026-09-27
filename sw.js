const CACHE = 'quran-pak-abu-bakar-v3';
const TAFSIR_CACHE = 'quran-pak-abu-bakar-tafseer-v1';
const APP_SHELL = ['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(Promise.all([caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)), caches.open(TAFSIR_CACHE)]).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Synthetic offline Tafsir records are stored directly by the app.
  if (url.origin === self.location.origin && url.pathname.startsWith('/__offline_tafsir__/')) {
    event.respondWith(caches.match(event.request, { cacheName: TAFSIR_CACHE }).then(r => r || new Response('', {status:404})));
    return;
  }
  // Same-origin app shell: cache first, then network and cache the update.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res => { const copy=res.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); return res; }).catch(()=>caches.match('./index.html'))));
    return;
  }
  // API/audio: network first, cache successful responses for later offline use.
  if (['api.alquran.cloud','quranapi.pages.dev','cdn.islamic.network','everyayah.com','cdn.jsdelivr.net','raw.githubusercontent.com','rawcdn.githack.com','cdn.statically.io'].includes(url.hostname)) {
    event.respondWith(fetch(event.request).then(res => { if(res && (res.ok || res.type==='opaque')) { const copy=res.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); } return res; }).catch(()=>caches.match(event.request).then(r=>r || new Response('',{status:503,statusText:'Offline'}))));
  }
});
