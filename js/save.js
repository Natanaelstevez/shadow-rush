import { CONFIG } from './config.js';
export class LocalStorageBackend {
constructor(key) {
this.key = key;
this.available = false;
try {
const storage = globalThis.localStorage;
if (storage) {
storage.getItem(key);
this.available = true;
}
} catch (err) {
this.available = false;
}
}
async read() {
if (!this.available) return null;
try {
return globalThis.localStorage.getItem(this.key);
} catch (err) {
return null;
}
}
async write(text) {
if (!this.available) return;
try {
globalThis.localStorage.setItem(this.key, text);
} catch (err) {
}
}
}
export class SaveManager {
constructor(backend) {
this.backend = backend;
this.data = this._fresh();
this.ready = false;
this._pending = false;
this._writing = false;
this._timer = null;
}
_fresh() {
return {
version: CONFIG.SAVE.VERSION,
levels: {},
audio: { music: 1, sfx: 1 }
};
}
async load() {
let texto = null;
try {
texto = await this.backend.read();
} catch (err) {
texto = null;
}
this.data = this._fresh();
if (texto) {
try {
const leido = JSON.parse(texto);
this.data = this._migrate(leido);
} catch (err) {
this.data = this._fresh();
}
}
this.ready = true;
return this.data;
}
async save() {
if (this._timer !== null) clearTimeout(this._timer);
this._timer = setTimeout(() => {
this._timer = null;
this.flush();
}, CONFIG.SAVE.DEBOUNCE_MS);
}
async flush() {
if (this._timer !== null) {
clearTimeout(this._timer);
this._timer = null;
}
if (this._writing) {
this._pending = true;
return;
}
this._writing = true;
try {
await this.backend.write(JSON.stringify(this.data));
} catch (err) {
}
this._writing = false;
if (this._pending) {
this._pending = false;
await this.flush();
}
}
get(path, fallback) {
const partes = path.split('.');
let actual = this.data;
for (const parte of partes) {
if (actual === null || typeof actual !== 'object') return fallback;
actual = actual[parte];
if (actual === undefined) return fallback;
}
return actual;
}
set(path, value) {
const partes = path.split('.');
let actual = this.data;
for (let i = 0; i < partes.length - 1; i++) {
const parte = partes[i];
if (actual[parte] === null || typeof actual[parte] !== 'object') actual[parte] = {};
actual = actual[parte];
}
actual[partes[partes.length - 1]] = value;
}
starsOf(id) {
const valor = this.get('levels.' + id + '.stars', 0);
return typeof valor === 'number' ? valor : 0;
}
isDone(id) {
return this.starsOf(id) > 0;
}
countDone() {
const levels = this.data.levels;
let n = 0;
for (const id in levels) {
const nivel = levels[id];
if (nivel && nivel.stars > 0) n++;
}
return n;
}
bestScore() {
let total = 0;
for (const id in this.data.levels) {
const nivel = this.data.levels[id];
if (nivel && typeof nivel.score === 'number' && isFinite(nivel.score)) {
total += Math.max(0, nivel.score);
}
}
return Math.round(total);
}
_migrate(datos) {
if (!datos || typeof datos !== 'object') return this._fresh();
const version = typeof datos.version === 'number' ? datos.version : 0;
if (version > CONFIG.SAVE.VERSION) return this._fresh();
const levels = datos.levels && typeof datos.levels === 'object' ? datos.levels : {};
const audio = datos.audio && typeof datos.audio === 'object' ? datos.audio : {};
const limpio = {
version: CONFIG.SAVE.VERSION,
levels: {},
audio: {
music: audio.music === 0 ? 0 : 1,
sfx: audio.sfx === 0 ? 0 : 1
}
};
for (const id in levels) {
const nivel = levels[id];
if (!nivel || typeof nivel !== 'object') continue;
limpio.levels[id] = {
stars: this._numero(nivel.stars, 0),
time: this._numero(nivel.time, 0),
score: this._numero(nivel.score, 0),
gems: this._numero(nivel.gems, 0),
detections: this._numero(nivel.detections, 0)
};
}
const infinito = datos.infinite && typeof datos.infinite === 'object' ? datos.infinite : {};
const semilla = this._numero(infinito.semilla, 0);
const nivelInfinito = this._numero(infinito.nivel, 0);
if (Number.isInteger(semilla) && semilla >= 1 &&
Number.isInteger(nivelInfinito) && nivelInfinito >= 1) {
limpio.infinite = {
semilla,
nivel: nivelInfinito,
record: this._numero(infinito.record, 0)
};
}
return limpio;
}
_numero(valor, respaldo) {
if (typeof valor !== 'number' || !isFinite(valor) || valor < 0) return respaldo;
return valor;
}
}
