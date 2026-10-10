import { CONFIG } from './config.js';
import { clamp } from './utils.js';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const BUTTONS = {
pause: { id: 'pause', label: 'PAUSA', x: 0, y: 0, w: 0, h: 0 },
crouch: { id: 'crouch', label: 'AGACHARSE', x: 0, y: 0, w: 0, h: 0 },
action: { id: 'action', label: 'ACCIONAR', x: 0, y: 0, w: 0, h: 0 },
next: { id: 'next', label: 'SEGUIR', x: 0, y: 0, w: 0, h: 0 },
repeat: { id: 'repeat', label: 'REPETIR', x: 0, y: 0, w: 0, h: 0 },
levels: { id: 'levels', label: 'NIVELES', x: 0, y: 0, w: 0, h: 0 },
menu: { id: 'menu', label: 'MENU', x: 0, y: 0, w: 0, h: 0 },
play: { id: 'play', label: 'JUGAR', x: 0, y: 0, w: 0, h: 0 },
resume: { id: 'resume', label: 'SEGUIR', x: 0, y: 0, w: 0, h: 0 },
restart: { id: 'restart', label: 'REINICIAR', x: 0, y: 0, w: 0, h: 0 },
back: { id: 'back', label: 'VOLVER', x: 0, y: 0, w: 0, h: 0 },
music: { id: 'music', label: 'MUSICA', x: 0, y: 0, w: 0, h: 0 },
sfx: { id: 'sfx', label: 'EFECTOS', x: 0, y: 0, w: 0, h: 0 }
};
const HINT_TIME = 7;
export class UI {
constructor(texts) {
this.texts = texts || null;
this._fondo = null;
this._fondoListo = false;
if (typeof Image === 'function') {
const imagen = new Image();
imagen.onload = () => { this._fondoListo = true; };
imagen.src = 'assets/fondo-menu.jpg';
this._fondo = imagen;
}
this.screen = 'MENU';
this.buttons = [];
this.zones = [];
this.hoverCell = -1;
this.pressed = null;
this.hovered = null;
this.touch = false;
this.notice = '';
this.noticeLeft = 0;
this.action = null;
this.pickedIndex = -1;
this._origin = { x: 0, y: 0 };
}
setScreen(name) {
this.screen = name;
this.pressed = null;
this.hovered = null;
this.buttons.length = 0;
this.zones.length = 0;
}
say(texto) {
this.notice = texto;
this.noticeLeft = 2.2;
}
update(dt, game) {
this._layout(game);
if (this.noticeLeft > 0) {
this.noticeLeft -= dt;
if (this.noticeLeft <= 0) this.notice = '';
}
}
_layout(game) {
const w = game.view.w;
const h = game.view.h;
const pad = Math.max(10, Math.round(h * 0.02));
const bw = Math.max(64, Math.round(Math.min(w, h) * 0.16));
const bh = Math.max(34, Math.round(h * 0.075));
const gap = Math.max(8, Math.round(pad * 0.6));
const pause = BUTTONS.pause;
pause.w = Math.round(bw * 0.8);
pause.h = Math.round(bh * 0.8);
pause.x = w - pause.w - pad;
pause.y = pad;
const crouch = BUTTONS.crouch;
crouch.w = bw;
crouch.h = bh;
crouch.x = w - bw - pad;
crouch.y = h - bh - pad;
const action = BUTTONS.action;
action.w = bw;
action.h = bh;
action.x = w - bw - pad;
action.y = crouch.y - bh - gap;
this.buttons.length = 0;
this.zones.length = 0;
if (this.screen === 'PLAYING') {
if (this.touch) {
this.buttons.push(crouch, action);
this.zones.push(crouch, action);
}
this.buttons.push(pause);
this.zones.push(pause);
return;
}
if (this.screen === 'MENU') {
this._center(BUTTONS.play, w, h, 0, bw * 1.6, bh);
this._center(BUTTONS.levels, w, h, bh + gap, bw * 1.6, bh);
BUTTONS.music.label = this._t('MUSICA {estado}', {
estado: this._t(game.audio.musicOn ? 'SI' : 'NO')
});
BUTTONS.sfx.label = this._t('EFECTOS {estado}', {
estado: this._t(game.audio.sfxOn ? 'SI' : 'NO')
});
this._center(BUTTONS.music, w, h, (bh + gap) * 2 + 16, bw * 1.2, bh);
this._center(BUTTONS.sfx, w, h, (bh + gap) * 3 + 16, bw * 1.2, bh);
this.buttons.push(BUTTONS.play, BUTTONS.levels, BUTTONS.music, BUTTONS.sfx);
this.zones.push(BUTTONS.play, BUTTONS.levels, BUTTONS.music, BUTTONS.sfx);
return;
}
if (this.screen === 'LEVELS') {
this._center(BUTTONS.back, w, h, 0, bw * 1.6, bh);
BUTTONS.back.y = h - bh - pad;
this.buttons.push(BUTTONS.back);
this.zones.push(BUTTONS.back);
return;
}
if (this.screen === 'PAUSED') {
BUTTONS.music.label = this._t('MUSICA {estado}', {
estado: this._t(game.audio.musicOn ? 'SI' : 'NO')
});
BUTTONS.sfx.label = this._t('EFECTOS {estado}', {
estado: this._t(game.audio.sfxOn ? 'SI' : 'NO')
});
this._center(BUTTONS.resume, w, h, -bh * 1.5 - gap, bw * 1.6, bh);
this._center(BUTTONS.restart, w, h, -bh * 0.5, bw * 1.6, bh);
this._center(BUTTONS.levels, w, h, bh * 0.5, bw * 1.6, bh);
this._center(BUTTONS.music, w, h, bh * 1.6 + gap, bw * 1.2, bh);
this._center(BUTTONS.sfx, w, h, bh * 2.6 + gap * 2, bw * 1.2, bh);
this.buttons.push(BUTTONS.resume, BUTTONS.restart, BUTTONS.levels,
BUTTONS.music, BUTTONS.sfx);
this.zones.push(BUTTONS.resume, BUTTONS.restart, BUTTONS.levels,
BUTTONS.music, BUTTONS.sfx);
return;
}
if (this.screen === 'RESULT') {
this._center(BUTTONS.next, w, h, 140, bw * 1.6, bh);
this._center(BUTTONS.repeat, w, h, 140 + bh + gap, bw * 1.6, bh);
this._center(BUTTONS.levels, w, h, 140 + (bh + gap) * 2, bw * 1.6, bh);
this.buttons.push(BUTTONS.next, BUTTONS.repeat, BUTTONS.levels);
this.zones.push(BUTTONS.next, BUTTONS.repeat, BUTTONS.levels);
return;
}
}
_center(boton, w, h, dy, bw, bh) {
boton.w = bw;
boton.h = bh;
boton.x = Math.round((w - bw) * 0.5);
boton.y = Math.round(h * 0.5 + dy);
}
handlePointer(x, y, isDown, pointerType, game) {
if (pointerType && pointerType !== 'mouse') this.touch = true;
if (isDown) {
this.pressed = this._hit(x, y);
this.hovered = this.pressed;
if (this.pressed) return true;
const casilla = this._hitCell(x, y, game);
if (casilla >= 0) this.pickedIndex = casilla;
return casilla >= 0;
}
const soltado = this.pressed;
this.pressed = null;
if (!soltado) return false;
if (this._hit(x, y) !== soltado) return true;
this._fire(soltado, game);
return true;
}
_hit(x, y) {
for (const boton of this.buttons) {
if (x < boton.x || y < boton.y) continue;
if (x > boton.x + boton.w || y > boton.y + boton.h) continue;
return boton;
}
return null;
}
_hitCell(x, y, game) {
if (this.screen !== 'LEVELS' || !game) return -1;
const caja = this._grid(game);
if (x < caja.x || y < caja.y || x > caja.x + caja.w || y > caja.y + caja.h) return -1;
const col = Math.floor((x - caja.x) / (caja.cw + caja.gap));
const fila = Math.floor((y - caja.y) / (caja.ch + caja.gap));
const total = game.levels.length;
const indice = fila * caja.cols + col;
if (col < 0 || col >= caja.cols || fila < 0 || indice >= total) return -1;
return game.isUnlocked(indice) ? indice : -1;
}
_fire(boton, game) {
if (!game) return;
switch (boton.id) {
case 'play':
this.action = 'play';
break;
case 'levels':
this.action = 'levels';
break;
case 'menu':
this.action = 'menu';
break;
case 'back':
this.action = 'back';
break;
case 'resume':
this.action = 'resume';
break;
case 'restart':
case 'repeat':
this.action = 'restart';
break;
case 'next':
this.action = 'next';
break;
case 'crouch':
this.action = 'crouch';
break;
case 'action':
this.action = 'interact';
break;
case 'music':
case 'sfx':
this.action = boton.id;
break;
case 'pause':
this.action = 'pause';
break;
default:
this.action = null;
}
}
draw(ctx, game) {
this._layout(game);
ctx.textBaseline = 'middle';
ctx.textAlign = 'left';
ctx.lineWidth = 2;
if (this.screen === 'PLAYING') {
this._drawHud(ctx, game);
return;
}
if (this.screen === 'MENU') this._drawMenu(ctx, game);
else if (this.screen === 'LEVELS') this._drawLevels(ctx, game);
else if (this.screen === 'PAUSED') this._drawPaused(ctx, game);
else if (this.screen === 'RESULT') this._drawResult(ctx, game);
this._drawButtons(ctx);
}
_veil(ctx, game, alpha) {
ctx.globalAlpha = alpha;
ctx.fillStyle = CONFIG.PALETTE.BG;
ctx.fillRect(0, 0, game.view.w, game.view.h);
ctx.globalAlpha = 1;
}
_title(ctx, game, texto, dy) {
ctx.textAlign = 'center';
ctx.fillStyle = CONFIG.PALETTE.AMBER;
ctx.font = 'bold 32px ' + MONO;
ctx.fillText(this._t(texto), game.view.w * 0.5, game.view.h * 0.5 + dy);
ctx.textAlign = 'left';
}
_line(ctx, game, texto, dy, color) {
ctx.textAlign = 'center';
ctx.fillStyle = color || CONFIG.PALETTE.TEXT;
ctx.font = '16px ' + MONO;
ctx.fillText(this._t(texto), game.view.w * 0.5, game.view.h * 0.5 + dy);
ctx.textAlign = 'left';
}
_t(texto, datos) {
return this.texts ? this.texts.t(texto, datos) : texto;
}
_nombre(game, nivel) {
if (nivel.chapter === 3) {
const inf = game.infinite;
return this._t(nivel.name, { n: inf.defNivel > 0 ? inf.defNivel : inf.nivel });
}
return this._t(nivel.name);
}
_imagenFondo(ctx, game) {
if (!this._fondoListo) return;
const ancho = this._fondo.naturalWidth;
const alto = this._fondo.naturalHeight;
if (!ancho || !alto) return;
const escala = Math.max(game.view.w / ancho, game.view.h / alto);
const w = ancho * escala;
const h = alto * escala;
ctx.globalAlpha = 0.3;
ctx.drawImage(this._fondo, (game.view.w - w) * 0.5, (game.view.h - h) * 0.5, w, h);
ctx.globalAlpha = 1;
}
_drawMenu(ctx, game) {
this._veil(ctx, game, 1);
this._imagenFondo(ctx, game);
this._title(ctx, game, 'SHADOW RUSH', -110);
this._line(ctx, game, 'Veinte niveles de sigilo, luz y sombra.', -70);
const hechos = game.completedCount ? game.completedCount() : 0;
const total = game.campaignCount ? game.campaignCount() : game.levels.length - 1;
this._line(ctx, game, hechos > 0
? this._t('Niveles completados: {n} de {total}',
{ n: hechos, total })
: 'Todavia no has completado ningun nivel.', -44);
}
_drawPaused(ctx, game) {
this._veil(ctx, game, 0.72);
this._title(ctx, game, 'PAUSA', -110);
this._line(ctx, game, game.level ? this._nombre(game, game.level) : '', -74);
}
_drawResult(ctx, game) {
this._veil(ctx, game, 0.55);
const nivel = game.level;
const estrellas = this.stars(game);
this._title(ctx, game, 'NIVEL COMPLETADO', -140);
this._line(ctx, game, nivel ? this._nombre(game, nivel).toUpperCase() : '', -104);
ctx.textAlign = 'center';
ctx.fillStyle = CONFIG.PALETTE.AMBER;
ctx.font = 'bold 30px ' + MONO;
ctx.fillText('★'.repeat(estrellas) + '☆'.repeat(3 - estrellas),
game.view.w * 0.5, game.view.h * 0.5 - 62);
ctx.textAlign = 'left';
this._line(ctx, game, this._t('TIEMPO {t} s   PAR {p} s',
{ t: game.elapsed.toFixed(1), p: nivel.parTime }), -24);
const partes = game.scoreParts || { objetos: 0, tiempo: 0, marca: 0, sigilo: 0, vidas: 0, nivel: 0 };
this._line(ctx, game, this._t('OBJETOS {n}', { n: partes.objetos }), -2);
this._line(ctx, game, this._t('TIEMPO {n}', { n: partes.tiempo + partes.marca }), 20);
this._line(ctx, game, this._t('SIN QUE TE VEAN {n}', { n: partes.sigilo }), 42);
this._line(ctx, game, this._t('VIDAS {n}', { n: partes.vidas }), 64);
this._line(ctx, game, this._t('NIVEL {n}', { n: partes.nivel }), 86);
if (nivel.chapter === 3) {
this._line(ctx, game, this._t('TOTAL {n}   ∞ {m}',
{ n: game.score, m: game.infinite.record }), 112);
} else {
this._line(ctx, game, this._t('TOTAL {n}   MEJOR {m}',
{ n: game.score, m: game.bestScore() }), 112);
}
}
stars(game) {
return game.stars();
}
_grid(game) {
const w = game.view.w;
const h = game.view.h;
const cols = w > h ? 5 : 3;
const filas = Math.ceil(game.levels.length / cols);
const margen = Math.round(w * 0.08);
const hueco = Math.max(8, Math.round(w * 0.015));
const cw = Math.floor((w - margen * 2 - hueco * (cols - 1)) / cols);
const ch = Math.min(Math.round(cw * 0.8), Math.floor((h * 0.62 - hueco * (filas - 1)) / filas));
return {
x: Math.round((w - (cw * cols + hueco * (cols - 1))) * 0.5),
y: Math.round(h * 0.22),
w: cw * cols + hueco * (cols - 1),
h: ch * filas + hueco * (filas - 1),
cols, cw, ch, gap: hueco
};
}
_drawLevels(ctx, game) {
this._veil(ctx, game, 1);
this._title(ctx, game, 'NIVELES', -Math.round(game.view.h * 0.36));
const caja = this._grid(game);
ctx.font = 'bold 14px ' + MONO;
ctx.textAlign = 'center';
for (let i = 0; i < game.levels.length; i++) {
const def = game.levels[i];
const col = i % caja.cols;
const fila = Math.floor(i / caja.cols);
const x = caja.x + col * (caja.cw + caja.gap);
const y = caja.y + fila * (caja.ch + caja.gap);
const actual = i === game.levelIndex;
const abierto = game.isUnlocked(i);
const estrellas = game.starsOf(def.id);
const infinito = i === game.levels.length - 1;
const nombre = infinito ? this._nombre(game, def) : this._t(def.name);
const marca = abierto
? (infinito
? (game.infinite.record > 0 ? '∞ ' + game.infinite.record : '· · ·')
: (estrellas > 0 ? '★'.repeat(estrellas) : '· · ·'))
: this._t('BLOQUEADO');
ctx.globalAlpha = abierto ? 0.16 : 0.07;
ctx.fillStyle = actual ? CONFIG.PALETTE.AMBER : CONFIG.PALETTE.TEXT;
ctx.fillRect(x, y, caja.cw, caja.ch);
ctx.globalAlpha = abierto ? (actual ? 1 : 0.6) : 0.25;
ctx.strokeStyle = actual ? CONFIG.PALETTE.AMBER : CONFIG.PALETTE.WALL_EDGE;
ctx.strokeRect(x, y, caja.cw, caja.ch);
ctx.globalAlpha = abierto ? 1 : 0.4;
ctx.fillStyle = actual ? CONFIG.PALETTE.AMBER : CONFIG.PALETTE.TEXT;
ctx.fillText(String(def.id), x + caja.cw * 0.5, y + caja.ch * 0.32);
ctx.font = '11px ' + MONO;
ctx.fillText(nombre, x + caja.cw * 0.5, y + caja.ch * 0.6);
ctx.fillStyle = CONFIG.PALETTE.AMBER;
ctx.fillText(marca, x + caja.cw * 0.5, y + caja.ch * 0.84);
ctx.font = 'bold 14px ' + MONO;
}
ctx.textAlign = 'left';
this._line(ctx, game, 'Toca un nivel para jugarlo.', caja.y + caja.h + 26 - game.view.h * 0.5);
}
_drawHud(ctx, game) {
const nivel = game.level;
if (!nivel) return;
const pad = Math.max(10, Math.round(game.view.h * 0.02));
const vidas = Math.max(0, game.lives);
ctx.font = 'bold 21px ' + MONO;
ctx.fillStyle = CONFIG.PALETTE.DANGER;
ctx.fillText('♥'.repeat(vidas) + '♡'.repeat(Math.max(0, CONFIG.GAME.LIVES - vidas)),
pad, pad + 18);
ctx.font = 'bold 15px ' + MONO;
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.fillText(nivel.id + ' · ' + this._nombre(game, nivel), pad, pad + 44);
const objetivos = nivel.objectives.length;
const recogidos = objetivos - this._missing(game);
const llaves = nivel.keys.length;
let cogidas = 0;
for (const llave of nivel.keys) {
if (llave.collected) cogidas++;
}
ctx.fillText(
llaves > 1
? this._t('LLAVES {n}/{total}', { n: cogidas, total: llaves })
: (llaves === 1
? this._t(cogidas ? 'LLAVE COGIDA' : 'SIN LLAVE')
: (objetivos > 0
? this._t('OBJETIVO {n}/{total}', { n: recogidos, total: objetivos })
: this._t('SALIDA LIBRE'))),
pad, pad + 64
);
ctx.textAlign = 'center';
ctx.font = 'bold 20px ' + MONO;
ctx.fillStyle = CONFIG.PALETTE.AMBER;
ctx.fillText(this._t('PUNTOS {n}', { n: game.score }), game.view.w * 0.5, pad + 84);
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.textAlign = 'left';
const restante = (game.timeLimit || 0) - game.elapsed;
ctx.textAlign = 'center';
ctx.font = 'bold 38px ' + MONO;
ctx.fillStyle = restante <= CONFIG.GAME.TIME_WARN_S
? CONFIG.PALETTE.DANGER
: CONFIG.PALETTE.TEXT;
ctx.fillText(this._clock(game), game.view.w * 0.5, pad + 54);
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.textAlign = 'left';
if (nivel.hint && game.elapsed < HINT_TIME) {
ctx.globalAlpha = clamp((HINT_TIME - game.elapsed) / 1.5, 0, 1);
ctx.textAlign = 'center';
ctx.fillStyle = CONFIG.PALETTE.TEXT;
const pista = this._t(nivel.hint);
const ancho = game.view.w - pad * 2;
let fuente = 15;
ctx.font = fuente + 'px ' + MONO;
const medido = ctx.measureText(pista).width;
if (medido > ancho) {
fuente = Math.max(9, (fuente * ancho) / medido);
ctx.font = fuente + 'px ' + MONO;
}
ctx.fillText(pista, game.view.w * 0.5, game.view.h - pad - 22);
ctx.textAlign = 'left';
ctx.globalAlpha = 1;
}
if (this.notice) {
ctx.globalAlpha = clamp(this.noticeLeft / 0.6, 0, 1);
ctx.textAlign = 'center';
ctx.font = 'bold 17px ' + MONO;
ctx.fillStyle = CONFIG.PALETTE.AMBER;
ctx.fillText(this.notice, game.view.w * 0.5, game.view.h * 0.5 + 46);
ctx.textAlign = 'left';
ctx.globalAlpha = 1;
}
this._drawButtons(ctx);
}
_missing(game) {
let faltan = 0;
for (const item of game.level.objectives) {
if (!item.collected) faltan++;
}
return faltan;
}
_clock(game) {
const restante = Math.max(0, (game.timeLimit || 0) - game.elapsed);
const pasado = game.elapsed > game.level.parTime;
return (pasado ? '!' : '') + restante.toFixed(1) + 's';
}
_drawButtons(ctx) {
for (const boton of this.buttons) {
this._drawButton(ctx, boton);
}
}
_drawButton(ctx, boton) {
const activo = boton === this.pressed;
const encima = boton === this.hovered;
ctx.globalAlpha = activo ? 0.42 : (encima ? 0.3 : 0.18);
ctx.fillStyle = boton === BUTTONS.action ? CONFIG.PALETTE.SWITCH : CONFIG.PALETTE.TEXT;
ctx.fillRect(boton.x, boton.y, boton.w, boton.h);
ctx.globalAlpha = activo ? 1 : 0.7;
ctx.strokeStyle = CONFIG.PALETTE.TEXT;
ctx.strokeRect(boton.x, boton.y, boton.w, boton.h);
ctx.globalAlpha = 1;
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.font = 'bold 12px ' + MONO;
ctx.textAlign = 'center';
ctx.fillText(this._t(boton.label), boton.x + boton.w * 0.5, boton.y + boton.h * 0.5);
ctx.textAlign = 'left';
}
}
