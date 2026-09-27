const VERSION = 'quran-pak-abu-bakar-v6';
const APP_CACHE = `${VERSION}-app`;
const API_CACHE = `${VERSION}-api`;
const TAFSIR_CACHE = `${VERSION}-tafsir`;
const SHELL = ['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
const API_HOSTS = new Set([
  'api.alquran.cloud','quranapi.pages.dev','everyayah.com','cdn.islamic.network',
  'cdn.jsdelivr.net','raw.githubusercontent.com','rawcdn.githack.com','cdn.statically.io'
]);
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const c=await caches.open(APP_CACHE);
    await Promise.allSettled(SHELL.map(u=>c.add(u)));
    await caches.open(API_CACHE); await caches.open(TAFSIR_CACHE);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keep=new Set([APP_CACHE,API_CACHE,TAFSIR_CACHE]);
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>!keep.has(k)).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
async function cacheNetwork(req, cacheName){
  const cache=await caches.open(cacheName);
  try{
    const res=await fetch(req);
    if(res && (res.ok || res.type==='opaque')) { try{await cache.put(req,res.clone())}catch(_){} }
    return res;
  }catch(e){
    const hit=await cache.match(req); if(hit) return hit;
    throw e;
  }
}
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cache=await caches.open(APP_CACHE);
      const hit=await cache.match(req); if(hit) return hit;
      try{ const res=await fetch(req); if(res.ok) cache.put(req,res.clone()); return res; }
      catch(_){ return cache.match('./index.html'); }
    })());
    return;
  }
  if(API_HOSTS.has(url.hostname)){
    const tafsir = url.pathname.includes('/tafsir/editions/');
    event.respondWith(cacheNetwork(req, tafsir ? TAFSIR_CACHE : API_CACHE).catch(()=>new Response('',{status:503,statusText:'Offline'})));
  }
});
