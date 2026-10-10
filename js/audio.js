import { CONFIG } from './config.js';
const RECIPES = {
step: { wave: 'noise', from: 0, to: 0, time: 0.07, gain: 0.16, filter: 900 },
pickup: { wave: 'triangle', from: 660, to: 1320, time: 0.16, gain: 0.5 },
interact: { wave: 'square', from: 220, to: 140, time: 0.1, gain: 0.35 },
detect: { wave: 'sawtooth', from: 330, to: 560, time: 0.22, gain: 0.4 },
alert: { wave: 'square', from: 440, to: 880, time: 0.3, gain: 0.5 },
shot: { wave: 'noise', from: 0, to: 0, time: 0.12, gain: 0.34, filter: 2600 },
mine: { wave: 'noise', from: 0, to: 0, time: 0.4, gain: 0.5, filter: 700 },
life: { wave: 'triangle', from: 784, to: 1568, time: 0.4, gain: 0.5 },
complete: { wave: 'triangle', from: 523, to: 1046, time: 0.5, gain: 0.55 },
fail: { wave: 'sawtooth', from: 300, to: 90, time: 0.5, gain: 0.5 }
};
const TRACKS = {
menu: { step: 0.9, notes: [0, 3, 7, 3, -2, 0, 5, 0], wave: 'triangle', gain: 0.16 },
level: { step: 0.7, notes: [-5, 0, -3, 2, -5, 0, 4, 2], wave: 'sine', gain: 0.12 },
tense: { step: 0.45, notes: [0, 1, 0, -1], wave: 'sawtooth', gain: 0.14 }
};
export class AudioManager {
constructor() {
this.ctx = null;
this.master = null;
this.musicBus = null;
this.sfxBus = null;
this.noise = null;
this.unlocked = false;
this.enabled = true;
this.musicOn = true;
this.sfxOn = true;
this.track = null;
this._trackIndex = 0;
this._timer = null;
}
async unlock() {
if (this.unlocked) return;
try {
const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
if (!Ctor) return;
const ctx = new Ctor();
const A = CONFIG.AUDIO;
this.master = ctx.createGain();
this.master.gain.value = this.enabled ? A.MASTER : 0;
this.master.connect(ctx.destination);
this.musicBus = ctx.createGain();
this.musicBus.gain.value = this.musicOn ? A.MUSIC : 0;
this.musicBus.connect(this.master);
this.sfxBus = ctx.createGain();
this.sfxBus.gain.value = this.sfxOn ? A.SFX : 0;
this.sfxBus.connect(this.master);
this.ctx = ctx;
this.noise = this._makeNoise(ctx);
this.unlocked = true;
if (ctx.state === 'suspended') await ctx.resume();
const sordo = ctx.createBufferSource();
sordo.buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
sordo.connect(this.master);
sordo.start(0);
this._startTrack();
} catch (err) {
this.unlocked = false;
}
}
_makeNoise(ctx) {
const largo = Math.floor(ctx.sampleRate);
const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
const datos = buffer.getChannelData(0);
for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
return buffer;
}
setEnabled(enabled) {
this.enabled = !!enabled;
if (this.master) this.master.gain.value = this.enabled ? CONFIG.AUDIO.MASTER : 0;
if (this.enabled) this._startTrack();
}
setBus(name, gain) {
const bus = name === 'music' ? this.musicBus : (name === 'sfx' ? this.sfxBus : this.master);
if (!bus) return;
bus.gain.value = Math.max(0, Math.min(1, gain));
}
setMusic(on) {
this.musicOn = !!on;
this.setBus('music', this.musicOn ? CONFIG.AUDIO.MUSIC : 0);
if (this.musicOn) this._startTrack();
else this._stopTrack();
}
setSfx(on) {
this.sfxOn = !!on;
this.setBus('sfx', this.sfxOn ? CONFIG.AUDIO.SFX : 0);
}
sfx(name, options) {
if (!this.unlocked || !this.enabled || !this.sfxOn) return;
const receta = RECIPES[name];
if (!receta) return;
const escala = options && typeof options.gain === 'number' ? options.gain : 1;
const ctx = this.ctx;
const ahora = ctx.currentTime;
const fin = ahora + receta.time;
const fuente = receta.wave === 'noise'
? ctx.createBufferSource()
: ctx.createOscillator();
const volumen = ctx.createGain();
volumen.gain.setValueAtTime(0, ahora);
volumen.gain.linearRampToValueAtTime(receta.gain * escala, ahora + 0.01);
volumen.gain.exponentialRampToValueAtTime(0.0001, fin);
if (receta.wave === 'noise') {
fuente.buffer = this.noise;
const filtro = ctx.createBiquadFilter();
filtro.type = 'lowpass';
filtro.frequency.value = receta.filter || 1000;
fuente.connect(filtro);
filtro.connect(volumen);
} else {
fuente.type = receta.wave;
fuente.frequency.setValueAtTime(receta.from, ahora);
fuente.frequency.linearRampToValueAtTime(receta.to, fin);
fuente.connect(volumen);
}
volumen.connect(this.sfxBus);
fuente.start(ahora);
fuente.stop(fin + 0.02);
}
music(name) {
if (this.track === name) return;
const parar = !name || name === 'none';
const pieza = parar ? null : TRACKS[name];
if (!parar && !pieza) return;
this._stopTrack();
this.track = parar ? null : name;
if (pieza) this._startTrack();
}
_startTrack() {
if (this._timer !== null) return;
const pieza = TRACKS[this.track];
if (!pieza) return;
if (!this.unlocked || !this.enabled || !this.musicOn) return;
this._trackIndex = 0;
this._tick();
this._timer = setInterval(() => this._tick(), pieza.step * 1000);
}
_tick() {
const pieza = TRACKS[this.track];
if (!pieza || !this.unlocked || !this.enabled || !this.musicOn) return;
const ctx = this.ctx;
const ahora = ctx.currentTime + 0.05;
const semitonos = pieza.notes[this._trackIndex % pieza.notes.length];
this._trackIndex++;
const osc = ctx.createOscillator();
const vol = ctx.createGain();
const dur = pieza.step * 1.6;
osc.type = pieza.wave;
osc.frequency.value = 440 * Math.pow(2, semitonos / 12);
vol.gain.setValueAtTime(0, ahora);
vol.gain.linearRampToValueAtTime(pieza.gain, ahora + 0.08);
vol.gain.exponentialRampToValueAtTime(0.0001, ahora + dur);
osc.connect(vol);
vol.connect(this.musicBus);
osc.start(ahora);
osc.stop(ahora + dur + 0.02);
}
_stopTrack() {
if (this._timer !== null) {
clearInterval(this._timer);
this._timer = null;
}
}
silence() {
this._stopTrack();
this.track = null;
}
}
