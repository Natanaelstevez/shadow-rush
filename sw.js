const CACHE = 'shadow-rush-v1';
const MINIMO = ['./', 'index.html', 'css/style.css', 'js/main.js', 'manifest.webmanifest'];
self.addEventListener('install', (evento) => {
evento.waitUntil(
caches.open(CACHE)
.then((copia) => copia.addAll(MINIMO))
.then(() => self.skipWaiting())
.catch(() => self.skipWaiting())
);
});
self.addEventListener('activate', (evento) => {
evento.waitUntil(
caches.keys()
.then((nombres) => Promise.all(
nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))
))
.then(() => self.clients.claim())
);
});
self.addEventListener('fetch', (evento) => {
const peticion = evento.request;
if (peticion.method !== 'GET') return;
if (new URL(peticion.url).origin !== self.location.origin) return;
evento.respondWith(
fetch(peticion)
.then((respuesta) => {
if (respuesta && respuesta.ok) {
const copia = respuesta.clone();
caches.open(CACHE).then((c) => c.put(peticion, copia)).catch(() => {});
}
return respuesta;
})
.catch(() => caches.match(peticion).then((guardada) => guardada || caches.match('index.html')))
);
});
