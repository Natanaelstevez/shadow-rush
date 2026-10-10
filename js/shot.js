import { CONFIG } from './config.js';
import { Pool } from './utils.js';
import { isWall } from './collision.js';
export class Shots {
constructor() {
this.live = [];
this.pool = new Pool(
() => ({ x: 0, y: 0, dx: 0, dy: 0, life: 0 }),
(dardo) => { dardo.life = 0; }
);
this._screen = { x: 0, y: 0 };
}
fire(x, y, haciaX, haciaY) {
const dx = haciaX - x;
const dy = haciaY - y;
const largo = Math.sqrt(dx * dx + dy * dy);
if (!(largo > 0.0001)) return;
const dardo = this.pool.obtain();
dardo.x = x;
dardo.y = y;
dardo.dx = dx / largo;
dardo.dy = dy / largo;
dardo.life = CONFIG.SHOT.LIFE;
this.live.push(dardo);
}
clear() {
while (this.live.length) this.pool.release(this.live.pop());
}
update(dt, level, player, onHit) {
if (!this.live.length) return;
const avance = CONFIG.SHOT.SPEED * dt;
const partes = Math.max(1, Math.ceil(avance / CONFIG.SHOT.STEP));
const paso = avance / partes;
const radio = player.radius + CONFIG.SHOT.RADIUS;
const r2 = radio * radio;
for (let i = this.live.length - 1; i >= 0; i--) {
const dardo = this.live[i];
dardo.life -= dt;
let muerto = dardo.life <= 0;
for (let s = 0; s < partes && !muerto; s++) {
dardo.x += dardo.dx * paso;
dardo.y += dardo.dy * paso;
if (isWall(level, Math.floor(dardo.x), Math.floor(dardo.y))) {
muerto = true;
break;
}
const px = player.x - dardo.x;
const py = player.y - dardo.y;
if (px * px + py * py <= r2) {
this.live.splice(i, 1);
this.pool.release(dardo);
onHit();
return;
}
}
if (muerto) {
this.live.splice(i, 1);
this.pool.release(dardo);
}
}
}
draw(ctx, camera, tilePx) {
if (!this.live.length) return;
const largo = Math.max(3, tilePx * CONFIG.SHOT.RADIUS * 3.5);
ctx.strokeStyle = CONFIG.PALETTE.DANGER;
ctx.lineWidth = Math.max(1, tilePx * 0.08);
ctx.beginPath();
for (let i = 0; i < this.live.length; i++) {
const dardo = this.live[i];
const p = camera.tileToScreen(dardo.x, dardo.y, this._screen);
ctx.moveTo(p.x, p.y);
ctx.lineTo(p.x + dardo.dx * largo, p.y + dardo.dy * largo);
}
ctx.stroke();
}
}
