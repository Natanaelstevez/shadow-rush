import { CONFIG } from './config.js';
import { validate } from './level.js';
function _mulberry32(semilla) {
let a = semilla >>> 0;
return function () {
a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
export function seedDeNivel(semilla, nivel) {
return (semilla + nivel * 7919) >>> 0;
}
const _DX = [1, -1, 0, 0];
const _DY = [0, 0, 1, -1];
let _bfsTalla = 0;
let _bfsDist = null;
let _bfsDesde = null;
let _bfsCola = null;
let _distP = null;
let _distE = null;
function _asegurarBfs(celdas) {
if (_bfsTalla >= celdas) return;
_bfsTalla = celdas;
_bfsDist = new Int32Array(celdas);
_bfsDesde = new Int32Array(celdas);
_bfsCola = new Int32Array(celdas);
_distP = new Int32Array(celdas);
_distE = new Int32Array(celdas);
}
function _bfs(solid, w, h, inicio) {
const celdas = w * h;
_asegurarBfs(celdas);
const dist = _bfsDist;
const desde = _bfsDesde;
const cola = _bfsCola;
dist.fill(-1, 0, celdas);
dist[inicio] = 0;
desde[inicio] = -1;
let cabeza = 0;
let fin = 0;
cola[fin++] = inicio;
let lejana = inicio;
while (cabeza < fin) {
const actual = cola[cabeza++];
const x = actual % w;
const y = (actual - x) / w;
const d = dist[actual];
for (let i = 0; i < 4; i++) {
const nx = x + _DX[i];
const ny = y + _DY[i];
if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
const vecino = ny * w + nx;
if (solid[vecino] === 1 || dist[vecino] !== -1) continue;
dist[vecino] = d + 1;
desde[vecino] = actual;
if (d + 1 > dist[lejana]) lejana = vecino;
cola[fin++] = vecino;
}
}
return lejana;
}
function _laberinto(solid, w, h, azar) {
const pila = [1 * w + 1];
solid[1 * w + 1] = 0;
while (pila.length > 0) {
const actual = pila[pila.length - 1];
const x = actual % w;
const y = (actual - x) / w;
const candidatas = [];
for (let i = 0; i < 4; i++) {
const nx = x + _DX[i] * 2;
const ny = y + _DY[i] * 2;
if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
const vecino = ny * w + nx;
if (solid[vecino] === 1) candidatas.push(vecino);
}
if (candidatas.length === 0) {
pila.pop();
continue;
}
const elegida = candidatas[Math.floor(azar() * candidatas.length)];
const ex = elegida % w;
const ey = (elegida - ex) / w;
solid[((y + ey) / 2) * w + (x + ex) / 2] = 0;
solid[elegida] = 0;
pila.push(elegida);
}
}
function _bucles(solid, w, h, azar) {
const prob = CONFIG.INFINITE.BUCLES;
for (let y = 1; y < h - 1; y++) {
for (let x = 1; x < w - 1; x++) {
if (solid[y * w + x] === 1 && (x + y) % 2 === 1) {
const separa = (x % 2 === 1)
? solid[(y - 1) * w + x] === 0 && solid[(y + 1) * w + x] === 0
: solid[y * w + x - 1] === 0 && solid[y * w + x + 1] === 0;
if (separa && azar() < prob) solid[y * w + x] = 0;
}
}
}
}
function _pasoDe(nivel) {
const pasos = CONFIG.INFINITE.PASOS;
for (let i = 0; i < pasos.length; i++) {
if (nivel <= pasos[i].hasta) return pasos[i];
}
return pasos[pasos.length - 1];
}
function _barajar(lista, azar) {
for (let i = lista.length - 1; i > 0; i--) {
const j = Math.floor(azar() * (i + 1));
const aux = lista[i];
lista[i] = lista[j];
lista[j] = aux;
}
}
function _recorridoMinimo(n, distP, distE, entre) {
const visitadas = [false, false, false];
let mejor = Infinity;
function probar(paso, ultima, acumulado) {
if (acumulado >= mejor) return;
if (paso === n) {
mejor = Math.min(mejor, acumulado + distE[ultima]);
return;
}
for (let i = 0; i < n; i++) {
if (visitadas[i]) continue;
visitadas[i] = true;
probar(paso + 1, i, acumulado + (ultima < 0 ? distP[i] : entre[ultima][i]));
visitadas[i] = false;
}
}
probar(0, -1, 0);
return mejor;
}
function _intento(semilla, nivel) {
const azar = _mulberry32(semilla);
const paso = _pasoDe(nivel);
const w = paso.w;
const h = paso.h;
const celdas = w * h;
const solid = new Uint8Array(celdas);
solid.fill(1);
_laberinto(solid, w, h, azar);
_bucles(solid, w, h, azar);
const p = _bfs(solid, w, h, 1 * w + 1);
const e = _bfs(solid, w, h, p);
const D = _bfsDist[e];
if (D < CONFIG.INFINITE.CAMINO_MIN) return null;
_distP.set(_bfsDist);
_bfs(solid, w, h, e);
_distE.set(_bfsDist);
const separacion = Math.max(6, D / 4);
let candidatas = [];
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1) continue;
const dP = _distP[i];
if (dP < 6 || dP < 0.45 * D || dP > 0.85 * D) continue;
if (_distE[i] < 3) continue;
candidatas.push(i);
}
_barajar(candidatas, azar);
const llaves = [];
while (llaves.length < paso.llaves && candidatas.length > 0) {
const elegida = candidatas.pop();
llaves.push(elegida);
if (llaves.length === paso.llaves) break;
_bfs(solid, w, h, elegida);
const restantes = [];
for (let i = 0; i < candidatas.length; i++) {
if (_bfsDist[candidatas[i]] >= separacion) restantes.push(candidatas[i]);
}
candidatas = restantes;
}
if (llaves.length < paso.llaves) return null;
const ocupada = new Uint8Array(celdas);
ocupada[p] = 1;
ocupada[e] = 1;
for (let i = 0; i < llaves.length; i++) ocupada[llaves[i]] = 1;
const patrulleros = [];
for (let n = 0; n < paso.patrulleros; n++) {
const lejanas = [];
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || ocupada[i] === 1) continue;
if (_distP[i] >= 4) lejanas.push(i);
}
let celda;
if (lejanas.length > 0) {
celda = lejanas[Math.floor(azar() * lejanas.length)];
} else {
const libres = [];
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || ocupada[i] === 1) continue;
libres.push(i);
}
if (libres.length === 0) return null;
celda = libres[Math.floor(azar() * libres.length)];
}
ocupada[celda] = 1;
_bfs(solid, w, h, celda);
const metas = [];
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || i === celda) continue;
const d = _bfsDist[i];
if (d >= 4 && d <= 12) metas.push(i);
}
if (metas.length === 0) {
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || i === celda) continue;
if (_bfsDist[i] >= 2) metas.push(i);
}
}
if (metas.length === 0) return null;
const meta = metas[Math.floor(azar() * metas.length)];
const ruta = [];
for (let idx = meta; idx !== -1; idx = _bfsDesde[idx]) ruta.push(idx);
ruta.reverse();
const largo = ruta.length - 1;
const puntos = 2 + Math.floor(azar() * 3);
const salto = Math.max(1, Math.round(largo / (puntos - 1)));
const patrol = [];
for (let i = 0; i < puntos; i++) {
const idx = ruta[Math.min(largo, salto * i)];
const x = idx % w;
const punto = [x + 0.5, (idx - x) / w + 0.5];
const anterior = patrol[patrol.length - 1];
if (!anterior || anterior[0] !== punto[0] || anterior[1] !== punto[1]) {
patrol.push(punto);
}
}
const x = celda % w;
patrulleros.push({ type: 'guard', x: x + 0.5, y: (celda - x) / w + 0.5, patrol });
}
const centinelas = [];
const cruces = [];
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || ocupada[i] === 1) continue;
const x = i % w;
const y = (i - x) / w;
let vecinos = 0;
for (let d = 0; d < 4; d++) {
const nx = x + _DX[d];
const ny = y + _DY[d];
if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
if (solid[ny * w + nx] === 0) vecinos++;
}
if (vecinos >= 3) cruces.push(i);
}
_barajar(cruces, azar);
for (let n = 0; n < paso.centinelas && n < cruces.length; n++) {
const celda = cruces[n];
ocupada[celda] = 1;
const x = celda % w;
centinelas.push({ type: 'guard', x: x + 0.5, y: (celda - x) / w + 0.5 });
}
for (let n = centinelas.length; n < paso.centinelas; n++) {
let celda = -1;
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || ocupada[i] === 1) continue;
celda = i;
break;
}
if (celda === -1) return null;
ocupada[celda] = 1;
const x = celda % w;
centinelas.push({ type: 'guard', x: x + 0.5, y: (celda - x) / w + 0.5 });
}
const coleccionables = [];
for (let i = 0; i < llaves.length; i++) {
const celda = llaves[i];
const x = celda % w;
coleccionables.push({ type: 'key', x: x + 0.5, y: (celda - x) / w + 0.5, value: 100 });
}
const cuantosGemas = Math.min(8, 3 + Math.floor(nivel / 2));
const cuantosTiempo = nivel >= 18 ? 2 : (nivel >= 12 ? 1 : 0);
const libres = [];
for (let i = 0; i < celdas; i++) {
if (solid[i] === 1 || ocupada[i] === 1) continue;
libres.push(i);
}
_barajar(libres, azar);
const total = Math.min(libres.length, cuantosGemas + cuantosTiempo);
for (let n = 0; n < total; n++) {
const celda = libres[n];
const x = celda % w;
const punto = { x: x + 0.5, y: (celda - x) / w + 0.5 };
if (n < cuantosTiempo) {
coleccionables.push({ type: 'time', x: punto.x, y: punto.y, value: 0 });
} else if (azar() < 0.5) {
coleccionables.push({ type: 'gem', x: punto.x, y: punto.y, value: 100 });
} else {
coleccionables.push({ type: 'cash', x: punto.x, y: punto.y, value: 60 });
}
}
const nLlaves = llaves.length;
const distP = [];
const distE = [];
for (let i = 0; i < nLlaves; i++) {
distP.push(_distP[llaves[i]]);
distE.push(_distE[llaves[i]]);
}
const entre = [];
for (let i = 0; i < nLlaves; i++) {
_bfs(solid, w, h, llaves[i]);
const fila = [];
for (let j = 0; j < nLlaves; j++) fila.push(_bfsDist[llaves[j]]);
entre.push(fila);
}
const recorrido = _recorridoMinimo(nLlaves, distP, distE, entre);
const margen = 1.30 - (Math.min(nivel, 20) - 1) * 0.25 / 19;
const parTime = Math.max(
CONFIG.INFINITE.PAR_MIN,
Math.round(recorrido / CONFIG.PLAYER.CROUCH_SPEED * margen)
);
const mapa = [];
for (let y = 0; y < h; y++) {
let fila = '';
for (let x = 0; x < w; x++) {
const idx = y * w + x;
if (idx === p) fila += 'P';
else if (idx === e) fila += 'E';
else fila += solid[idx] === 1 ? '#' : '.';
}
mapa.push(fila);
}
const def = {
id: 21,
name: 'Infinito {n}',
chapter: 3,
parTime,
hint: nivel === 1
? 'Capítulo 3: un laberinto nuevo cada vez, generado con la semilla de la corrida. No hay final: el récord cuenta niveles superados.'
: '',
guard: { chase: paso.chase, sight: paso.sight, fire: paso.fire },
map: mapa,
enemies: patrulleros.concat(centinelas),
collectibles: coleccionables
};
const revision = validate(def);
if (!revision.ok || revision.warnings.length > 0) return null;
return def;
}
export function holePlaceholder() {
return {
id: 21,
name: 'Infinito {n}',
chapter: 3,
parTime: 30,
map: ['#######', '#P...E#', '#######'],
enemies: [],
collectibles: []
};
}
export function generateInfiniteDef(semilla, nivel) {
const base = seedDeNivel(semilla, nivel);
for (let k = 0; k < CONFIG.INFINITE.INTENTOS; k++) {
const def = _intento((base + k * 104729) >>> 0, nivel);
if (def) return def;
}
return holePlaceholder();
}
