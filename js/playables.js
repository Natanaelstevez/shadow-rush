import { CONFIG } from './config.js';
export class Playables {
constructor(sdk) {
const real = sdk || (typeof globalThis.ytgame !== 'undefined' ? globalThis.ytgame : null);
this.active = !!(real && real.IN_PLAYABLES_ENV === true);
this.sdk = this.active ? real : null;
this.version = this.sdk && typeof real.SDK_VERSION === 'string' ? real.SDK_VERSION : null;
}
firstFrameReady() {
this._call('game', 'firstFrameReady');
}
gameReady() {
this._call('game', 'gameReady');
}
async read() {
if (!this.sdk) return null;
try {
const texto = await this.sdk.game.loadData();
return typeof texto === 'string' ? texto : null;
} catch (err) {
this.logWarning();
return null;
}
}
async write(text) {
if (!this.sdk || typeof text !== 'string') return;
if (text.length > CONFIG.PLAYABLES.MAX_SAVE_BYTES) {
this.logWarning();
return;
}
if (typeof text.isWellFormed === 'function' && !text.isWellFormed()) {
this.logWarning();
return;
}
try {
await this.sdk.game.saveData(text);
} catch (err) {
this.logWarning();
}
}
onPause(callback) {
return this._on('system', 'onPause', callback);
}
onResume(callback) {
return this._on('system', 'onResume', callback);
}
async sendScore(value) {
if (!this.sdk) return;
if (!Number.isSafeInteger(value) || value < 0) return;
try {
await this.sdk.engagement.sendScore({ value });
} catch (err) {
this.logWarning();
}
}
audioEnabled() {
if (!this.sdk) return true;
try {
return this.sdk.system.isAudioEnabled() !== false;
} catch (err) {
return true;
}
}
onAudioEnabledChange(callback) {
return this._on('system', 'onAudioEnabledChange', callback);
}
async language() {
if (!this.sdk) return null;
try {
const etiqueta = await this.sdk.system.getLanguage();
return typeof etiqueta === 'string' ? etiqueta : null;
} catch (err) {
return null;
}
}
logError() {
this._call('health', 'logError');
}
logWarning() {
this._call('health', 'logWarning');
}
_call(grupo, nombre) {
if (!this.sdk) return;
try {
const fn = this.sdk[grupo] && this.sdk[grupo][nombre];
if (typeof fn === 'function') fn.call(this.sdk[grupo]);
} catch (err) {
}
}
_on(grupo, nombre, callback) {
const nada = () => {};
if (!this.sdk || typeof callback !== 'function') return nada;
try {
const fn = this.sdk[grupo] && this.sdk[grupo][nombre];
if (typeof fn !== 'function') return nada;
const quitar = fn.call(this.sdk[grupo], callback);
return typeof quitar === 'function' ? quitar : nada;
} catch (err) {
return nada;
}
}
}
