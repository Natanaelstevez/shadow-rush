import { CONFIG } from './config.js';
import { clamp, lerp, dist } from './utils.js';
import { castRay } from './collision.js';
import { inCone, hasLineOfSight } from './vision.js';
import { ScreenCopy } from './copy.js';
const LIVE_TYPES = ['static', 'switchable'];
export class LightField {
constructor(level) {
this.level = level;
this.w = level.w;
this.h = level.h;
this.values = new Float32Array(this.w * this.h);
this._onStart = level.lights.map((light) => light.on !== false);
const scale = CONFIG.LIGHT.BUFFER_SCALE;
this.bufW = Math.max(1, Math.round(this.w * CONFIG.WORLD.TILE * scale));
this.bufH = Math.max(1, Math.round(this.h * CONFIG.WORLD.TILE * scale));
this._canvas = null;
this._pixels = null;
this._bufferCtx = null;
this._needsPaint = true;
this._copy = new ScreenCopy(level, this._paintScaled.bind(this));
this.guards = [];
this._origin = { x: 0, y: 0 };
this._dirty = false;
this._accumulator = 0;
this._recompute();
}
isOn(light) {
if (light.on === false) return false;
return LIVE_TYPES.indexOf(light.type) !== -1;
}
sample(x, y) {
const w = this.w;
const px = clamp(x - 0.5, 0, w - 1);
const py = clamp(y - 0.5, 0, this.h - 1);
const x0 = Math.floor(px);
const y0 = Math.floor(py);
const x1 = Math.min(x0 + 1, w - 1);
const y1 = Math.min(y0 + 1, this.h - 1);
const v = this.values;
return clamp(
lerp(
lerp(v[y0 * w + x0], v[y0 * w + x1], px - x0),
lerp(v[y1 * w + x0], v[y1 * w + x1], px - x0),
py - y0
),
0, 1
);
}
markDirty() {
this._dirty = true;
}
setGuards(list) {
this.guards = list || [];
this.markDirty();
}
toggle(device) {
let changed = 0;
for (const target of device.targets) {
for (const light of this.level.lights) {
if (light.id !== target) continue;
light.on = light.on === false;
changed++;
}
}
if (changed > 0) this.markDirty();
return changed;
}
reset() {
const lights = this.level.lights;
for (let i = 0; i < lights.length; i++) {
lights[i].on = this._onStart[i];
}
this._dirty = false;
this._accumulator = 0;
this._recompute();
this._needsPaint = true;
}
update(dt) {
if (!this._dirty && this.guards.length === 0) return;
this._accumulator += dt;
const step = 1 / CONFIG.LIGHT.UPDATE_HZ;
if (this._accumulator < step) return;
this._accumulator = 0;
this._dirty = false;
this._recompute();
this._needsPaint = true;
}
_recompute() {
const levels = CONFIG.LIGHT.LEVELS;
const values = this.values;
values.fill(CONFIG.LIGHT.AMBIENT);
for (const light of this.level.lights) {
if (!this.isOn(light)) continue;
const intensity = levels[light.level] || 0;
if (intensity <= 0 || !(light.radius > 0)) continue;
const x0 = Math.max(0, Math.floor(light.x - light.radius));
const x1 = Math.min(this.w - 1, Math.floor(light.x + light.radius));
const y0 = Math.max(0, Math.floor(light.y - light.radius));
const y1 = Math.min(this.h - 1, Math.floor(light.y + light.radius));
for (let ty = y0; ty <= y1; ty++) {
for (let tx = x0; tx <= x1; tx++) {
const cx = tx + 0.5;
const cy = ty + 0.5;
const d = dist(light.x, light.y, cx, cy);
if (d > light.radius) continue;
if (!this._reaches(light, cx, cy, d)) continue;
const t = d / light.radius;
const value = intensity * (1 - t * t);
const i = ty * this.w + tx;
if (value > values[i]) values[i] = value;
}
}
}
this._guardLights(values);
}
_guardLights(values) {
const G = CONFIG.LIGHT.GUARD_LIGHT;
for (const guard of this.guards) {
const range = guard.visionRange;
if (!(range > 0)) continue;
const x0 = Math.max(0, Math.floor(guard.x - range));
const x1 = Math.min(this.w - 1, Math.floor(guard.x + range));
const y0 = Math.max(0, Math.floor(guard.y - range));
const y1 = Math.min(this.h - 1, Math.floor(guard.y + range));
for (let ty = y0; ty <= y1; ty++) {
for (let tx = x0; tx <= x1; tx++) {
const cx = tx + 0.5;
const cy = ty + 0.5;
if (!inCone(guard, cx, cy)) continue;
const d = dist(guard.x, guard.y, cx, cy);
if (!hasLineOfSight(this.level, guard.x, guard.y, cx, cy)) continue;
const t = d / range;
const value = Math.min(G.CAP, G.INTENSITY * (1 - t * t));
const i = ty * this.w + tx;
if (value > values[i]) values[i] = value;
}
}
}
}
_reaches(light, x, y, d) {
if (d < 1e-6) return true;
return castRay(this.level, light.x, light.y, (x - light.x) / d, (y - light.y) / d, d) >= d;
}
draw(ctx, camera, view) {
if (!this._canvas) this._createBuffer();
if (this._needsPaint) {
this._paint();
this._needsPaint = false;
this._copy.invalidate();
}
if (this._copy.draw(ctx, camera, view, camera.tilePx)) return;
const t = camera.tilePx;
const origin = camera.tileToScreen(0, 0, this._origin);
const smoothing = ctx.imageSmoothingEnabled;
ctx.imageSmoothingEnabled = true;
ctx.drawImage(this._canvas, origin.x, origin.y, this.w * t, this.h * t);
ctx.imageSmoothingEnabled = smoothing;
}
_paintScaled(c, rect, scale, tilePx) {
const paso = tilePx > 0 ? tilePx : CONFIG.WORLD.TILE;
const kx = this.bufW / (this.w * paso);
const ky = this.bufH / (this.h * paso);
c.imageSmoothingEnabled = true;
c.drawImage(this._canvas,
rect.x * kx, rect.y * ky, rect.w * kx, rect.h * ky,
0, 0, rect.w * scale, rect.h * scale);
}
_createBuffer() {
const canvas = document.createElement('canvas');
canvas.width = this.bufW;
canvas.height = this.bufH;
this._canvas = canvas;
this._bufferCtx = canvas.getContext('2d');
this._pixels = this._bufferCtx.createImageData(this.bufW, this.bufH);
}
_paint() {
const data = this._pixels.data;
const max = CONFIG.LIGHT.VEIL_MAX;
const w = this.w;
const cellX = w / this.bufW;
const cellY = this.h / this.bufH;
let i = 0;
for (let by = 0; by < this.bufH; by++) {
const sy = Math.min(this.h - 1, (by + 0.5) * cellY);
const y0 = Math.floor(sy);
const y1 = Math.min(y0 + 1, this.h - 1);
const fy = sy - y0;
for (let bx = 0; bx < this.bufW; bx++) {
const sx = Math.min(w - 1, (bx + 0.5) * cellX);
const x0 = Math.floor(sx);
const x1 = Math.min(x0 + 1, w - 1);
const fx = sx - x0;
const v = this.values;
const light = clamp(
lerp(
lerp(v[y0 * w + x0], v[y0 * w + x1], fx),
lerp(v[y1 * w + x0], v[y1 * w + x1], fx),
fy
),
0, 1
);
data[i] = 0;
data[i + 1] = 0;
data[i + 2] = 0;
data[i + 3] = ((1 - light) * max * 255) | 0;
i += 4;
}
}
this._bufferCtx.putImageData(this._pixels, 0, 0);
}
}
