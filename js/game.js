import { CONFIG, STATE, PLAYER_STATE } from './config.js';
import { Emitter, Pool, TAU, clamp } from './utils.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { createEnemy } from './enemy.js';
import { parseLevel, validateAll } from './level.js';
import { LightField } from './lighting.js';
import { UI } from './ui.js';
import { SaveManager, LocalStorageBackend } from './save.js';
import { AudioManager } from './audio.js';
import { generateInfiniteDef, holePlaceholder } from './generator.js';
import { LEVELS } from '../data/levels.js';
import { ScreenCopy } from './copy.js';
import { Shots } from './shot.js';
export class Game {
constructor(canvas, backend, texts) {
this.canvas = canvas;
this.texts = texts || null;
this.state = STATE.BOOT;
this.paused = false;
this.view = { w: 0, h: 0, dpr: 1 };
this.elapsed = 0;
this.emitter = new Emitter();
this.perf = { fps: 0, steps: 0, dtMs: 0 };
this.input = new Input();
this.input.attach(canvas);
this.level = null;
this.camera = null;
this.player = null;
this.enemies = [];
this.shots = new Shots();
this._shotHit = () => this.emitter.emit('caught');
this.levelIndex = 0;
this._origin = { x: 0, y: 0 };
this._enemyCtx = { level: null, player: null, lightField: null, emitter: this.emitter, shots: this.shots };
this.lightField = null;
this.ui = new UI(texts);
this.levels = LEVELS.concat([holePlaceholder()]);
this.infinite = { semilla: 0, nivel: 1, record: 0, defNivel: -1, defSemilla: -1 };
this.save = new SaveManager(backend || new LocalStorageBackend(CONFIG.SAVE.KEY));
this.audio = new AudioManager();
this._pointerDown = false;
this._noiseListeners = [];
this._noiseEvent = { x: 0, y: 0, radius: 0, strength: 0 };
this._noiseTimer = 0;
this._rings = [];
this._ringPool = new Pool(() => ({ x: 0, y: 0, radius: 0, age: 0, life: 0 }));
this.detections = 0;
this.score = 0;
this.objectivesMet = true;
this.atExit = false;
this._retryTimer = 0;
this.emitter.on('caught', () => this._onCaught());
this.emitter.on('state', () => this._musicForState());
this.emitter.on('alert', () => this.audio.music('tense'));
this.emitter.on('shot', () => this.audio.sfx('shot'));
this.emitter.on('calm', () => this.audio.music('level'));
this.emitter.on('detect', () => this.audio.sfx('detect'));
this.emitter.on('alert', () => this.audio.sfx('alert'));
this._stepDist = 0;
if (CONFIG.RENDER.SHOW_DEBUG) this._reportLevelData();
this._startLevel(0);
}
resize(w, h, dpr) {
this.view.w = w;
this.view.h = h;
this.view.dpr = dpr;
if (this.camera) this.camera.fit(w, h);
}
setState(next) {
if (next === this.state) return;
const previous = this.state;
this.state = next;
this.ui.setScreen(next);
this.emitter.emit('state', { previous, current: next });
}
endFrame() {
this.input.endFrame();
}
setSystemPaused(on) {
const quiere = !!on;
if (this.paused === quiere) return;
this.paused = quiere;
if (quiere) {
this.audio.silence();
this.save.flush();
return;
}
this._musicForState();
}
_musicForState() {
if (this.state === STATE.PLAYING) this.audio.music('level');
else if (this.state === STATE.RESULT) this.audio.silence();
else if (this.state === STATE.MENU || this.state === STATE.LEVELS) this.audio.music('menu');
}
noise(x, y, radius, strength) {
const event = this._noiseEvent;
event.x = x;
event.y = y;
event.radius = radius;
event.strength = strength;
this.emitter.emit('noise', event);
this._addRing(x, y, radius);
}
update(dt) {
this.ui.update(dt, this);
this._updatePointer();
if (this.state === STATE.MENU || this.state === STATE.LEVELS) {
this._updateUi();
if (this.state === STATE.MENU && this.input.consumePress('interact')) this._playNext();
return;
}
if (this.state === STATE.PAUSED) {
if (this.input.consumePress('pause')) {
this.setState(STATE.PLAYING);
return;
}
this._updateUi();
return;
}
if (this.state === STATE.PLAYING) {
this.elapsed += dt;
if (this.elapsed >= this.timeLimit) this._onTimeout();
}
if (this.state === STATE.DETECTED) {
this._updateDetected(dt);
return;
}
if (this.state === STATE.RESULT) {
this._updateUi();
if (this.state !== STATE.RESULT) return;
this._updateResult();
return;
}
if (this.state !== STATE.PLAYING) return;
this.input.update(dt, this.camera, this.player);
if (this.input.consumePress('pause')) {
this.setState(STATE.PAUSED);
return;
}
this._updateUi();
this.player.update(dt, this.input.intent, this.level, null);
if (this.input.consumePress('retry')) {
this.restart();
return;
}
this._updateInteract();
this.lightField.update(dt);
this._updateItems();
this._updateMines();
this._updateExit();
this._updateNoise(dt);
this._enemyCtx.player = this.player;
for (let i = 0; i < this.enemies.length; i++) {
this.enemies[i].update(dt, this._enemyCtx);
}
this.shots.update(dt, this.level, this.player, this._shotHit);
this._updateRings(dt);
this.camera.update(dt, this.player);
}
render(ctx) {
const { w, h } = this.view;
ctx.fillStyle = CONFIG.PALETTE.BG;
ctx.fillRect(0, 0, w, h);
const congelado = this.state === STATE.PLAYING ||
this.state === STATE.DETECTED ||
this.state === STATE.PAUSED ||
this.state === STATE.RESULT;
if (this.level && congelado) {
this._drawLevel(ctx);
this._drawRings(ctx);
for (let i = 0; i < this.enemies.length; i++) {
this.enemies[i].draw(ctx, this.camera);
}
this.player.draw(ctx, this.camera);
if (this.state === STATE.PLAYING) this._drawJoystick(ctx);
}
if (this.state === STATE.DETECTED) this._drawCaught(ctx);
this.ui.draw(ctx, this);
if (CONFIG.RENDER.SHOW_DEBUG && this.level && congelado) {
this._drawDebug(ctx);
}
}
_updateNoise(dt) {
const N = CONFIG.NOISE;
const player = this.player;
this._stepDist += player.speed * dt;
if (this._stepDist >= 1.1) {
this._stepDist = 0;
this.audio.sfx('step', { gain: player.sprinting ? 1.4 : 1 });
}
if (!player.sprinting || player.speed < N.MIN_SPEED) {
this._noiseTimer = 0;
return;
}
this._noiseTimer -= dt;
if (this._noiseTimer > 0) return;
this._noiseTimer = N.SPRINT_INTERVAL;
this.noise(player.x, player.y, N.SPRINT_RADIUS, N.RUN_STRENGTH);
}
_addRing(x, y, radius) {
const ring = this._ringPool.obtain();
ring.x = x;
ring.y = y;
ring.radius = radius;
ring.age = 0;
ring.life = CONFIG.NOISE.RING_LIFE;
this._rings.push(ring);
}
_updateRings(dt) {
for (let i = this._rings.length - 1; i >= 0; i--) {
const ring = this._rings[i];
ring.age += dt;
if (ring.age < ring.life) continue;
const last = this._rings.pop();
if (i < this._rings.length) this._rings[i] = last;
this._ringPool.release(ring);
}
}
_drawRings(ctx) {
if (this._rings.length === 0) return;
const t = this.camera.tilePx;
const origin = this.camera.tileToScreen(0, 0, this._origin);
ctx.strokeStyle = CONFIG.PALETTE.TEXT;
ctx.lineWidth = 2;
for (const ring of this._rings) {
const progress = ring.age / ring.life;
ctx.globalAlpha = 0.5 * (1 - progress);
ctx.beginPath();
ctx.arc(
origin.x + ring.x * t,
origin.y + ring.y * t,
ring.radius * t * (0.15 + 0.85 * progress),
0, TAU
);
ctx.stroke();
}
ctx.globalAlpha = 1;
}
_drawLevel(ctx) {
const cam = this.camera;
const level = this.level;
const t = cam.tilePx;
const origin = cam.tileToScreen(0, 0, this._origin);
if (this._copyLevel !== level) {
this._copyLevel = level;
this._groundCopy = new ScreenCopy(level, (c, rect, scale) =>
this._ground(c, rect, scale));
}
if (!this._groundCopy.draw(ctx, cam, this.view, t)) {
this._paintGround(ctx, origin.x, origin.y, t, cam, 1, null);
}
if (this.lightField) this.lightField.draw(ctx, cam, this.view);
const nivelW = this.level.w * t;
const nivelH = this.level.h * t;
const finX = origin.x + nivelW;
const finY = origin.y + nivelH;
ctx.fillStyle = 'rgba(0, 0, 0, ' + CONFIG.LIGHT.VEIL_MAX + ')';
if (origin.y > 0) ctx.fillRect(0, 0, this.view.w, origin.y);
if (finY < this.view.h) ctx.fillRect(0, finY, this.view.w, this.view.h - finY);
if (origin.x > 0) ctx.fillRect(0, origin.y, origin.x, nivelH);
if (finX < this.view.w) ctx.fillRect(finX, origin.y, this.view.w - finX, nivelH);
this._drawMarkers(ctx, origin, t);
this.shots.draw(ctx, cam, t);
ctx.strokeStyle = CONFIG.PALETTE.WALL_EDGE;
ctx.lineWidth = 2;
ctx.strokeRect(origin.x - 1, origin.y - 1, level.w * t + 2, level.h * t + 2);
}
_ground(c, rect, scale) {
this._paintGround(c, -rect.x, -rect.y, this.camera.tilePx, null, scale, rect);
}
_paintGround(ctx, ox, oy, t, cam, scale, clip) {
const level = this.level;
ctx.fillStyle = CONFIG.PALETTE.FLOOR;
ctx.fillRect(ox * scale, oy * scale, level.w * t * scale, level.h * t * scale);
ctx.beginPath();
for (let ty = 0; ty < level.h; ty++) {
const y = oy + ty * t;
if (clip && (y + t <= clip.y || y >= clip.y + clip.h)) continue;
for (let tx = 0; tx < level.w; tx++) {
if (!level.isWall(tx, ty)) continue;
const x = ox + tx * t;
if (clip && (x + t <= clip.x || x >= clip.x + clip.w)) continue;
if (cam && !cam.isVisible(tx, ty, 1)) continue;
ctx.rect(x * scale, y * scale, t * scale, t * scale);
}
}
ctx.fillStyle = CONFIG.PALETTE.WALL;
ctx.fill();
ctx.strokeStyle = CONFIG.PALETTE.WALL_EDGE;
ctx.lineWidth = scale;
ctx.stroke();
}
_drawMarkers(ctx, origin, t) {
const level = this.level;
const P = CONFIG.PALETTE;
if (level.exit) {
const x = origin.x + level.exit.x * t;
const y = origin.y + level.exit.y * t;
const inset = t * 0.14;
const size = t - inset * 2;
const abierta = this._exitOpen();
const x0 = x - t * 0.5 + inset;
const y0 = y - t * 0.5 + inset;
if (abierta) {
const latido = 0.55 + Math.sin(this.elapsed * 4) * 0.2;
ctx.globalAlpha = 0.3 * latido;
ctx.fillStyle = P.EXIT;
ctx.fillRect(x0, y0, size, size);
ctx.globalAlpha = 1;
}
const hueco = abierta ? size * 0.34 : 0;
const hoja = size * 0.5 - hueco * 0.5;
ctx.globalAlpha = abierta ? 0.85 : 1;
ctx.fillStyle = P.WALL_EDGE;
ctx.fillRect(x0, y0, hoja, size);
ctx.fillRect(x0 + size - hoja, y0, hoja, size);
ctx.strokeStyle = P.EXIT;
ctx.lineWidth = 2;
ctx.strokeRect(x0, y0, size, size);
ctx.strokeRect(x0 + hoja, y0, hueco, size);
if (!abierta) {
ctx.fillStyle = P.EXIT;
ctx.beginPath();
ctx.arc(x, y, Math.max(1.5, size * 0.09), 0, TAU);
ctx.fill();
}
ctx.globalAlpha = 1;
}
for (const item of level.collectibles) {
if (item.collected) continue;
const x = origin.x + item.x * t;
const y = origin.y + item.y * t;
const r = t * 0.16;
const llave = item.type === 'key';
const color = llave ? P.EXIT : P.COLLECTIBLE;
if (llave) {
const latido = 0.7 + Math.sin(this.elapsed * 3) * 0.3;
ctx.save();
ctx.translate(x, y);
ctx.rotate(-0.6);
ctx.globalAlpha = 0.4 * latido;
ctx.strokeStyle = color;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(0, 0, r * 2.1, 0, TAU);
ctx.stroke();
ctx.globalAlpha = 1;
ctx.strokeStyle = color;
ctx.lineWidth = Math.max(1.5, r * 0.34);
ctx.beginPath();
ctx.arc(0, -r * 0.8, r * 0.6, 0, TAU);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(0, -r * 0.2);
ctx.lineTo(0, r * 1.3);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(0, r * 0.7);
ctx.lineTo(r * 0.55, r * 0.7);
ctx.moveTo(0, r * 1.15);
ctx.lineTo(r * 0.42, r * 1.15);
ctx.stroke();
ctx.restore();
continue;
}
if (item.required || llave) {
ctx.globalAlpha = 0.35;
ctx.strokeStyle = color;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(x, y, r * 1.9, 0, TAU);
ctx.stroke();
ctx.globalAlpha = 1;
}
if (item.type === 'life') {
ctx.fillStyle = P.DANGER;
ctx.beginPath();
ctx.arc(x - r * 0.45, y - r * 0.3, r * 0.55, 0, TAU);
ctx.fill();
ctx.beginPath();
ctx.arc(x + r * 0.45, y - r * 0.3, r * 0.55, 0, TAU);
ctx.fill();
ctx.beginPath();
ctx.moveTo(x - r * 0.95, y - r * 0.2);
ctx.lineTo(x, y + r);
ctx.lineTo(x + r * 0.95, y - r * 0.2);
ctx.closePath();
ctx.fill();
continue;
}
if (item.type === 'time') {
ctx.strokeStyle = P.EXIT;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(x, y, r * 0.95, 0, TAU);
ctx.stroke();
ctx.fillStyle = P.EXIT;
ctx.beginPath();
ctx.arc(x, y, r * 0.32, 0, TAU);
ctx.fill();
continue;
}
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(x, y - r);
ctx.lineTo(x + r, y);
ctx.lineTo(x, y + r);
ctx.lineTo(x - r, y);
ctx.closePath();
ctx.fill();
}
for (const mine of level.mines) {
const x = origin.x + mine.x * t;
const y = origin.y + mine.y * t;
const r = t * 0.2;
ctx.globalAlpha = mine.triggered ? 0.22 : 0.55;
ctx.fillStyle = P.SHADOW;
ctx.beginPath();
ctx.arc(x, y, r, 0, TAU);
ctx.fill();
ctx.globalAlpha = mine.triggered ? 0.3 : 1;
ctx.strokeStyle = P.DANGER;
ctx.lineWidth = 2;
ctx.stroke();
ctx.fillStyle = P.DANGER;
for (let k = 0; k < 4; k++) {
const a = (TAU * k) / 4;
ctx.fillRect(x + Math.cos(a) * r * 0.6 - 1, y + Math.sin(a) * r * 0.6 - 1, 2, 2);
}
ctx.globalAlpha = 1;
}
const aMano = this.player ? this._switchNear(this.player.x, this.player.y) : null;
for (const device of level.switches) {
const x = origin.x + device.x * t;
const y = origin.y + device.y * t;
const r = t * 0.17;
if (device === aMano) {
ctx.globalAlpha = 0.32;
ctx.fillStyle = P.SWITCH;
ctx.beginPath();
ctx.arc(x, y, r * 2.2, 0, TAU);
ctx.fill();
}
ctx.globalAlpha = 1;
ctx.fillStyle = P.SWITCH;
ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
for (const light of level.lights) {
const x = origin.x + light.x * t;
const y = origin.y + light.y * t;
const viva = this.lightField ? this.lightField.isOn(light) : true;
if (viva) {
ctx.globalAlpha = 0.10;
ctx.strokeStyle = P.AMBER;
ctx.lineWidth = 1;
ctx.beginPath();
ctx.arc(x, y, light.radius * t, 0, TAU);
ctx.stroke();
}
ctx.globalAlpha = viva ? 0.75 : 0.30;
ctx.fillStyle = viva ? P.AMBER : P.TEXT;
ctx.beginPath();
ctx.arc(x, y, Math.max(2, t * 0.07), 0, TAU);
ctx.fill();
ctx.globalAlpha = 1;
}
}
_drawJoystick(ctx) {
const j = this.input.joystick;
if (!j.active) return;
ctx.globalAlpha = 0.28;
ctx.strokeStyle = CONFIG.PALETTE.TEXT;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(j.originX, j.originY, j.radius, 0, TAU);
ctx.stroke();
ctx.globalAlpha = 0.45;
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.beginPath();
ctx.arc(j.knobX, j.knobY, j.radius * CONFIG.INPUT.KNOB_RATIO, 0, TAU);
ctx.fill();
ctx.globalAlpha = 1;
}
_drawCaught(ctx) {
const t = clamp(this._retryTimer / CONFIG.GAME.RETRY_DELAY, 0, 1);
ctx.globalAlpha = 0.15 + 0.45 * t;
ctx.fillStyle = CONFIG.PALETTE.DANGER;
ctx.fillRect(0, 0, this.view.w, this.view.h);
ctx.globalAlpha = 1;
}
_drawDebug(ctx) {
const { w, h, dpr } = this.view;
ctx.save();
ctx.translate(0, 78);
ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.fillText(
'FPS ' + this.perf.fps.toFixed(0) +
'  ' + this.state +
'  ' + w + 'x' + h + ' @' + dpr + 'x' +
'  PASOS ' + this.perf.steps,
12, 10
);
const level = this.level;
const cam = this.camera;
if (level && cam) {
ctx.fillText(
'NIVEL ' + level.id + ' ' + level.name +
'  ' + level.w + 'x' + level.h +
'  CAMARA ' + cam.mode + ' ' + cam.scale.toFixed(2) + 'x ' +
Math.round(cam.tilePx) + 'px/casilla',
12, 28
);
let encendidas = 0;
if (this.lightField) {
for (const light of level.lights) if (this.lightField.isOn(light)) encendidas++;
}
ctx.fillText(
'ENEMIGOS ' + this.enemies.length +
'  LUCES ' + level.lights.length + ' ENCENDIDAS ' + encendidas +
'  INTERRUPTORES ' + level.switches.length +
'  COLECCIONABLES ' + level.collectibles.length +
'  DETECCIONES ' + this.detections,
12, 46
);
let recogidos = 0;
for (const item of level.collectibles) if (item.collected) recogidos++;
ctx.fillText(
'OBJETIVOS ' + (this.objectivesMet ? 'COMPLETOS' : 'FALTAN') +
'  OBJETOS ' + recogidos + '/' + level.collectibles.length +
'  PUNTOS ' + this.score +
'  TIEMPO ' + this.elapsed.toFixed(1) + '/' + level.parTime.toFixed(0),
12, 82
);
}
const p = this.player;
if (!p) return;
const i = this.input.intent;
ctx.fillText(
'JUGADOR ' + p.x.toFixed(2) + ', ' + p.y.toFixed(2) +
'  VEL ' + p.speed.toFixed(2) +
'  ' + p.state + (p.sprinting ? '+CORRER' : '') +
'  INTENCION ' + i.x.toFixed(2) + ', ' + i.y.toFixed(2) +
'  TOPE ' + (p.hitX || p.hitY ? 'SI' : 'NO') +
'  LUZ ' + (this.lightField ? this.lightField.sample(p.x, p.y).toFixed(2) : '--'),
12, 64
);
for (let e = 0; e < this.enemies.length && e < 3; e++) {
const enemy = this.enemies[e];
ctx.fillText(
'ENEMIGO ' + e + ' ' + enemy.type.toUpperCase() +
'  ' + (enemy.state === null ? 'INERTE' : enemy.state) +
'  ' + enemy.x.toFixed(2) + ', ' + enemy.y.toFixed(2) +
(enemy.detection === undefined
? ''
: '  DET ' + enemy.detection.toFixed(2) +
'  VIS ' + enemy.lastVisibility.toFixed(2)),
12, 100 + e * 18
);
}
ctx.restore();
}
_startLevel(index) {
this.levelIndex = clamp(index | 0, 0, this.levels.length - 1);
this.level = parseLevel(this.levels[this.levelIndex]);
this.lives = CONFIG.GAME.LIVES;
const rapido = this.level.enemies.find((e) => e.type === 'guard');
const persecucion = rapido && rapido.chaseSpeed ? rapido.chaseSpeed : CONFIG.GUARD.CHASE_SPEED;
const margen = clamp(
CONFIG.GAME.TIME_LIMIT_EASY -
(persecucion - CONFIG.GAME.TIME_LIMIT_SLOW) * CONFIG.GAME.TIME_LIMIT_PER_CHASE,
CONFIG.GAME.TIME_LIMIT_HARD,
CONFIG.GAME.TIME_LIMIT_EASY
);
this.timeLimit = Math.round(this.level.parTime * margen);
this._tiempoAgotado = false;
this.lightField = new LightField(this.level);
this.shots.clear();
this._enemyCtx.level = this.level;
this._enemyCtx.lightField = this.lightField;
for (const warning of this.level.warnings) {
console.warn('[Shadow Rush] ' + this.level.name + ': ' + warning);
}
this.camera = new Camera(this.level);
this.camera.fit(this.view.w, this.view.h);
this.detections = 0;
this.score = 0;
this.elapsed = 0;
this._recienCargado = true;
this._restartLevel();
}
_restartLevel() {
this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
this._retryTimer = 0;
if (this.lives <= 0) {
const anterior = this.levelIndex - 1;
if (anterior >= 0 && this.level.chapter !== 3) {
this.audio.sfx('fail');
this.ui.say(this._t('¡VUELVES AL NIVEL ANTERIOR!'));
this._loadIndex(anterior);
return;
}
this.lives = CONFIG.GAME.LIVES;
this.elapsed = 0;
this.detections = 0;
this.objectivesMet = true;
this.audio.sfx('fail');
} else if (this._tiempoAgotado) {
this._tiempoAgotado = false;
this.elapsed = 0;
this.detections = 0;
this.objectivesMet = true;
this.audio.sfx('fail');
}
this._startEnemies();
for (const mine of this.level.mines) mine.triggered = false;
this.lightField.reset();
this.shots.clear();
if (this.level.chapter !== 3) this._scatterItems(!this._recienCargado);
this._recienCargado = false;
for (const item of this.level.collectibles) item.collected = false;
this.objectivesMet = this._objectivesMet();
this.score = 0;
this.atExit = false;
this.camera.snap(this.player);
}
_t(texto, datos) {
return this.texts ? this.texts.t(texto, datos) : texto;
}
_onCaught() {
if (this.state !== STATE.PLAYING) return;
this.detections++;
this.lives = Math.max(0, this.lives - 1);
this.player.state = PLAYER_STATE.DETECTED;
this._retryTimer = CONFIG.GAME.RETRY_DELAY;
this.audio.sfx('fail');
this.setState(STATE.DETECTED);
}
_onTimeout() {
if (this.state !== STATE.PLAYING) return;
this.lives = Math.max(0, this.lives - 1);
this._tiempoAgotado = true;
this.player.state = PLAYER_STATE.DETECTED;
this._retryTimer = CONFIG.GAME.RETRY_DELAY;
this.audio.sfx('fail');
this.ui.say(this._t('¡SE ACABÓ EL TIEMPO!'));
this.setState(STATE.DETECTED);
}
_updateDetected(dt) {
this._retryTimer -= dt;
if (this._retryTimer > 0) return;
this._restartLevel();
this.setState(STATE.PLAYING);
}
_updateMines() {
const range = CONFIG.LEVEL.MINE_RANGE;
const r2 = range * range;
for (const mine of this.level.mines) {
if (mine.triggered) continue;
const dx = mine.x - this.player.x;
const dy = mine.y - this.player.y;
if (dx * dx + dy * dy > r2) continue;
mine.triggered = true;
for (const def of mine.guards) {
const guardia = createEnemy(def, this.level);
this.enemies.push(guardia);
if (typeof guardia.hearNoise !== 'function') continue;
const listener = (event) =>
guardia.hearNoise(event.x, event.y, event.radius, event.strength);
this.emitter.on('noise', listener);
this._noiseListeners.push(listener);
}
this.audio.sfx('mine');
this._addRing(mine.x, mine.y, 6);
this.ui.say(this._t('¡REFUERZOS!'));
}
}
_updateItems() {
const range = CONFIG.LEVEL.COLLECT_RANGE;
const r2 = range * range;
for (const item of this.level.collectibles) {
if (item.collected) continue;
const dx = item.x - this.player.x;
const dy = item.y - this.player.y;
if (dx * dx + dy * dy > r2) continue;
item.collected = true;
this.score += item.value;
this.objectivesMet = this._objectivesMet();
this._addRing(item.x, item.y, range * 3);
if (item.type === 'life') this.lives++;
if (item.type === 'time') {
this.elapsed = Math.max(0, this.elapsed - CONFIG.LEVEL.TIME_BONUS_S);
}
this.audio.sfx(item.type === 'life' || item.type === 'time' ? 'life' : 'pickup');
}
}
_objectivesMet() {
for (const item of this.level.objectives) {
if (!item.collected) return false;
}
return true;
}
_scatterItems(soloCorazon) {
const nivel = this.level;
const dist = this._distanciasDesdeInicio();
const w = nivel.w;
const salida = nivel.exit;
const ex = salida ? Math.floor(salida.x) : -1;
const ey = salida ? Math.floor(salida.y) : -1;
const libres = [];
for (let y = 1; y < nivel.h - 1; y++) {
for (let x = 1; x < w - 1; x++) {
if (nivel.isWall(x, y)) continue;
if (x === ex && y === ey) continue;
if (dist[y * w + x] < 6) continue;
if (nivel.mines.some((m) => Math.floor(m.x) === x && Math.floor(m.y) === y)) continue;
libres.push([x + 0.5, y + 0.5]);
}
}
if (!libres.length) return;
for (let i = libres.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
const cambio = libres[i];
libres[i] = libres[j];
libres[j] = cambio;
}
const ocupadas = (x, y) => nivel.collectibles.some((otro) =>
otro !== null && Math.abs(otro.x - x) < 1.5 && Math.abs(otro.y - y) < 1.5);
let hueco = 0;
for (const item of nivel.collectibles) {
const llave = item.type === 'key';
const corazon = item.type === 'life';
if (!corazon && !(llave && !soloCorazon)) continue;
const puesto = nivel.collectibles.indexOf(item);
const antesX = item.x;
const antesY = item.y;
nivel.collectibles[puesto] = null;
for (let k = hueco; k < libres.length; k++) {
const c = libres[k];
if (ocupadas(c[0], c[1])) continue;
item.x = c[0];
item.y = c[1];
libres[k] = libres[hueco];
libres[hueco] = c;
hueco++;
break;
}
nivel.collectibles[puesto] = item;
if (item.x === antesX && item.y === antesY) continue;
}
}
_distanciasDesdeInicio() {
const nivel = this.level;
const w = nivel.w;
const h = nivel.h;
const dist = new Int16Array(w * h).fill(-1);
const cola = [];
const inicio = nivel.playerStart;
const sx = Math.floor(inicio.x);
const sy = Math.floor(inicio.y);
dist[sy * w + sx] = 0;
cola.push(sy * w + sx);
const vecinos = [[1, 0], [-1, 0], [0, 1], [0, -1]];
for (let i = 0; i < cola.length; i++) {
const celda = cola[i];
const x = celda % w;
const y = (celda / w) | 0;
for (const [dx, dy] of vecinos) {
const nx = x + dx;
const ny = y + dy;
if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
const j = ny * w + nx;
if (dist[j] !== -1 || nivel.isWall(nx, ny)) continue;
dist[j] = dist[celda] + 1;
cola.push(j);
}
}
return dist;
}
_exitOpen() {
const llaves = this.level.keys;
if (llaves.length) {
for (const llave of llaves) if (!llave.collected) return false;
return true;
}
return this.objectivesMet;
}
_updateExit() {
const exit = this.level.exit;
if (!exit) return;
const range = CONFIG.LEVEL.EXIT_RANGE;
const dx = exit.x - this.player.x;
const dy = exit.y - this.player.y;
this.atExit = (dx * dx + dy * dy) <= range * range;
if (!this.atExit) return;
if (this._exitOpen()) {
this._onComplete();
return;
}
this.ui.say(this._missingLabel());
}
_onComplete() {
if (this.state !== STATE.PLAYING) return;
this.player.state = PLAYER_STATE.COMPLETE;
this.audio.sfx('complete');
this._recordRun();
const S = CONFIG.SCORE;
const par = this.level.parTime || 0;
const bajoPar = this.elapsed <= par;
this.scoreParts = {
objetos: this.score,
tiempo: Math.round(Math.max(0, par - this.elapsed) * S.PER_SECOND),
marca: bajoPar ? S.UNDER_PAR : 0,
sigilo: Math.max(0, S.NO_DETECTIONS - this.detections * S.PER_DETECTION),
vidas: Math.max(0, this.lives) * S.PER_LIFE,
nivel: S.COMPLETE
};
this.score = this.scoreParts.objetos + this.scoreParts.tiempo + this.scoreParts.marca +
this.scoreParts.sigilo + this.scoreParts.vidas + this.scoreParts.nivel;
this.setState(STATE.RESULT);
}
_missingLabel() {
const t = (texto, datos) => (this.texts ? this.texts.t(texto, datos) : texto);
for (const llave of this.level.keys) {
if (!llave.collected) return t('FALTA {nombre}', { nombre: t('LA LLAVE') });
}
const LABELS = { document: 'EL DOCUMENTO', gem: 'LA GEMA', cash: 'EL DINERO' };
let faltan = 0;
let nombre = 'EL OBJETIVO';
for (const item of this.level.objectives) {
if (item.collected) continue;
faltan++;
if (faltan === 1) nombre = LABELS[item.type] || 'EL OBJETIVO';
}
return faltan > 1
? t('FALTAN {n} OBJETIVOS', { n: faltan })
: t('FALTA {nombre}', { nombre: t(nombre) });
}
_updateResult() {
if (this.input.consumePress('interact')) {
this._advance();
return;
}
if (this.input.consumePress('retry')) this.restart();
}
async init() {
await this.save.load();
this.audio.setMusic(this.save.get('audio.music', 1) === 1);
this.audio.setSfx(this.save.get('audio.sfx', 1) === 1);
const infinito = this.save.get('infinite', null);
if (infinito) {
this.infinite.semilla = infinito.semilla;
this.infinite.nivel = infinito.nivel;
this.infinite.record = infinito.record;
}
return this;
}
stars() {
const nivel = this.level;
if (!nivel) return 0;
const enTiempo = this.elapsed <= nivel.parTime;
const sinVerse = this.detections <= nivel.maxDetections;
if (enTiempo && sinVerse) return 3;
if (enTiempo || sinVerse) return 2;
return 1;
}
starsOf(id) {
return this.save.starsOf(id);
}
isUnlocked(index) {
if (index <= 0) return true;
return this.save.isDone(this.levels[index - 1].id);
}
completedCount() {
return this.save.countDone();
}
campaignCount() {
return LEVELS.length;
}
bestScore() {
return this.save.bestScore();
}
_firstPending() {
for (let i = 0; i < this.levels.length; i++) {
if (!this.save.isDone(this.levels[i].id)) return i;
}
return this.levels.length - 1;
}
_nuevaCorrida() {
const inf = this.infinite;
if (inf.semilla > 0) return;
inf.semilla = (Math.floor(Math.random() * 0xFFFFFFFF) + 1) >>> 0;
inf.nivel = 1;
inf.record = Math.max(0, inf.record);
this._guardarInfinito();
}
_guardarInfinito() {
const inf = this.infinite;
this.save.set('infinite', { semilla: inf.semilla, nivel: inf.nivel, record: inf.record });
this.save.save();
}
_asegurarDefInfinito() {
const inf = this.infinite;
if (inf.semilla <= 0) this._nuevaCorrida();
if (inf.defNivel === inf.nivel && inf.defSemilla === inf.semilla) return;
this.levels[this.levels.length - 1] = generateInfiniteDef(inf.semilla, inf.nivel);
inf.defNivel = inf.nivel;
inf.defSemilla = inf.semilla;
}
_recordRun() {
if (this.level.chapter === 3) {
const inf = this.infinite;
const n = inf.defNivel;
if (n > 0) {
inf.nivel = Math.max(inf.nivel, n + 1);
inf.record = Math.max(inf.record, n);
}
this._guardarInfinito();
return;
}
const id = 'levels.' + this.level.id;
const save = this.save;
const estrellas = this.stars();
if (estrellas > save.get(id + '.stars', 0)) save.set(id + '.stars', estrellas);
const mejor = save.get(id + '.time', 0);
if (mejor === 0 || this.elapsed < mejor) save.set(id + '.time', this.elapsed);
if (this.score > save.get(id + '.score', 0)) save.set(id + '.score', this.score);
let gemas = 0;
for (const item of this.level.collectibles) if (item.collected) gemas++;
if (gemas > save.get(id + '.gems', 0)) save.set(id + '.gems', gemas);
const visto = save.get(id + '.detections', -1);
if (visto < 0 || this.detections < visto) save.set(id + '.detections', this.detections);
save.save();
this.emitter.emit('score', save.bestScore());
}
_playNext() {
this._loadIndex(this._firstPending());
}
_updatePointer() {
const p = this.input.pointer;
if (p.down === this._pointerDown) return;
this._pointerDown = p.down;
if (!this.ui.handlePointer(p.x, p.y, p.down, p.type, this)) return;
this.input.joystick.active = false;
this.input.consumePress('interact');
}
_updateUi() {
const ui = this.ui;
if (ui.pickedIndex >= 0) {
const indice = ui.pickedIndex;
ui.pickedIndex = -1;
this._loadIndex(indice);
return;
}
const accion = ui.action;
ui.action = null;
switch (accion) {
case 'play': this._playNext(); break;
case 'levels': this.setState(STATE.LEVELS); break;
case 'menu':
case 'back': this.setState(STATE.MENU); break;
case 'resume': this.setState(STATE.PLAYING); break;
case 'restart': this.restart(); break;
case 'next': this._advance(); break;
case 'pause':
this.setState(this.state === STATE.PAUSED ? STATE.PLAYING : STATE.PAUSED);
break;
case 'crouch':
this.input.actions.crouch = !this.input.actions.crouch;
break;
case 'music':
this.audio.setMusic(!this.audio.musicOn);
this.save.set('audio.music', this.audio.musicOn ? 1 : 0);
this.save.save();
break;
case 'sfx':
this.audio.setSfx(!this.audio.sfxOn);
this.save.set('audio.sfx', this.audio.sfxOn ? 1 : 0);
this.save.save();
break;
case 'interact':
this._tryInteract();
break;
default: break;
}
}
_advance() {
const next = this.levelIndex + 1;
if (next >= this.levels.length) {
this._loadIndex(this.levels.length - 1);
return;
}
this._loadIndex(next);
}
async loadLevel(id) {
const index = this.levels.findIndex((def) => def.id === id);
if (index < 0) return false;
this._loadIndex(index);
return true;
}
_loadIndex(index) {
if (index === this.levels.length - 1) this._asegurarDefInfinito();
this._startLevel(index);
this.setState(STATE.PLAYING);
this.input.endFrame();
}
restart() {
if (!this.level) return;
this._restartLevel();
this.elapsed = 0;
this.setState(STATE.PLAYING);
}
_updateInteract() {
if (!this.input.consumePress('interact')) return;
this._tryInteract();
}
_tryInteract() {
const device = this._switchNear(this.player.x, this.player.y);
if (!device) return;
this.lightField.toggle(device);
this.audio.sfx('interact');
}
_switchNear(x, y) {
const range = CONFIG.LEVEL.INTERACT_RANGE;
let best = null;
let bestD2 = range * range;
for (const device of this.level.switches) {
const dx = device.x - x;
const dy = device.y - y;
const d2 = dx * dx + dy * dy;
if (d2 > bestD2) continue;
bestD2 = d2;
best = device;
}
return best;
}
_startEnemies() {
for (const listener of this._noiseListeners) this.emitter.off('noise', listener);
this._noiseListeners.length = 0;
this.enemies.length = 0;
for (const def of this.level.enemies) {
const enemy = createEnemy(def, this.level);
this.enemies.push(enemy);
if (typeof enemy.hearNoise !== 'function') continue;
const listener = (event) => enemy.hearNoise(event.x, event.y, event.radius, event.strength);
this.emitter.on('noise', listener);
this._noiseListeners.push(listener);
}
this._enemyCtx.level = this.level;
this._enemyCtx.player = this.player;
if (this.lightField) this.lightField.setGuards(this.enemies);
for (const ring of this._rings) this._ringPool.release(ring);
this._rings.length = 0;
this._noiseTimer = 0;
}
_reportLevelData() {
const report = validateAll(LEVELS);
for (const warning of report.warnings) console.warn('[Shadow Rush] ' + warning);
for (const error of report.errors) console.error('[Shadow Rush] ' + error);
if (report.errors.length === 0 && report.warnings.length === 0) {
console.info('[Shadow Rush] ' + LEVELS.length + ' niveles validados, sin errores ni avisos.');
}
}
}
