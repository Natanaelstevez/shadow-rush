import { CONFIG, STATE } from './config.js';
import { Game } from './game.js';
import { Playables } from './playables.js';
import { LocalStorageBackend } from './save.js';
import { Texts } from './text.js';
import { fitCanvas } from './utils.js';
const canvas = document.getElementById('game');
if (!canvas) {
throw new Error('[Shadow Rush] No se encontro el canvas con identificador game');
}
const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) {
throw new Error('[Shadow Rush] Este navegador no soporta Canvas 2D');
}
const playables = new Playables();
const texts = new Texts();
const game = new Game(canvas, playables.active ? playables : new LocalStorageBackend(CONFIG.SAVE.KEY), texts);
let lastW = 0;
let lastH = 0;
let lastDpr = 0;
function resize() {
const w = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
const h = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight));
const size = fitCanvas(
w,
h,
window.devicePixelRatio || 1,
CONFIG.RENDER.MAX_DPR,
CONFIG.RENDER.MAX_CANVAS_PIXELS
);
if (w === lastW && h === lastH && size.dpr === lastDpr) return;
lastW = w;
lastH = h;
lastDpr = size.dpr;
canvas.width = size.width;
canvas.height = size.height;
game.resize(w, h, size.dpr);
}
if (typeof ResizeObserver === 'function') {
new ResizeObserver(resize).observe(canvas);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
let lastTime = 0;
let accumulator = 0;
let frameAnnounced = false;
let readyAnnounced = false;
function frame(now) {
requestAnimationFrame(frame);
let dt = (now - lastTime) / 1000;
lastTime = now;
if (!(dt > 0)) dt = 0;
if (dt > CONFIG.GAME.MAX_FRAME_DT) dt = CONFIG.GAME.MAX_FRAME_DT;
game.perf.fps += ((dt > 0 ? 1 / dt : 0) - game.perf.fps) * 0.08;
if (game.paused) {
game.endFrame();
return;
}
accumulator += dt;
let steps = 0;
while (accumulator >= CONFIG.GAME.FIXED_DT && steps < CONFIG.GAME.MAX_STEPS) {
game.update(CONFIG.GAME.FIXED_DT);
accumulator -= CONFIG.GAME.FIXED_DT;
steps++;
}
if (steps === CONFIG.GAME.MAX_STEPS) accumulator = 0;
game.endFrame();
game.perf.steps = steps;
game.perf.dtMs = dt * 1000;
ctx.setTransform(game.view.dpr, 0, 0, game.view.dpr, 0, 0);
game.render(ctx);
if (!frameAnnounced && game.state !== STATE.BOOT) {
frameAnnounced = true;
playables.firstFrameReady();
}
if (frameAnnounced && !readyAnnounced && game.state === STATE.MENU) {
readyAnnounced = true;
playables.gameReady();
}
}
resize();
game.init().then(async () => {
if (playables.active) {
const etiqueta = await Promise.race([
playables.language(),
new Promise((listo) => setTimeout(() => listo(null), CONFIG.TEXT.WAIT_MS))
]);
texts.setLanguage(etiqueta);
}
sendScore(game.bestScore());
game.setState(STATE.MENU);
});
canvas.addEventListener('pointerdown', () => game.audio.unlock(), { once: true });
canvas.addEventListener('click', () => game.audio.unlock(), { once: true });
window.addEventListener('keydown', () => game.audio.unlock(), { once: true });
game.audio.setEnabled(playables.audioEnabled());
playables.onAudioEnabledChange((on) => game.audio.setEnabled(on));
playables.onPause(() => game.setSystemPaused(true));
playables.onResume(() => game.setSystemPaused(false));
let scoreSent = -1;
const sendScore = (valor) => {
if (!(valor > 0) || valor === scoreSent) return;
scoreSent = valor;
playables.sendScore(valor);
};
game.emitter.on('score', sendScore);
if (CONFIG.RENDER.SHOW_DEBUG) {
window.__shadowRush = {
game,
playables,
CONFIG,
STATE,
load: (index) => game._loadIndex(index)
};
}
requestAnimationFrame((now) => {
lastTime = now;
requestAnimationFrame(frame);
});
