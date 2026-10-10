import { CONFIG } from './config.js';
import { clamp } from './utils.js';
const MARGIN = 0.25;
const STEP = 32;
export class ScreenCopy {
constructor(level, paint) {
this.level = level;
this.paint = paint;
this.canvas = null;
this._ctx = null;
this._rect = null;
this._tilePx = 0;
this._dpr = 0;
this._origin = { x: 0, y: 0 };
}
invalidate() {
this._rect = null;
}
draw(ctx, camera, view, tilePx) {
const dpr = view.dpr || 1;
const origin = camera.tileToScreen(0, 0, this._origin);
const w = this.level.w * tilePx;
const h = this.level.h * tilePx;
const vx0 = clamp(-origin.x, 0, w);
const vy0 = clamp(-origin.y, 0, h);
const vx1 = clamp(-origin.x + view.w, 0, w);
const vy1 = clamp(-origin.y + view.h, 0, h);
const rect = this._rect;
const cubre = rect &&
vx0 >= rect.x - 0.5 && vy0 >= rect.y - 0.5 &&
vx1 <= rect.x + rect.w + 0.5 && vy1 <= rect.y + rect.h + 0.5;
if (!cubre || tilePx !== this._tilePx || dpr !== this._dpr) {
const nueva = this._window(vx0, vy0, vx1, vy1, view, tilePx, dpr);
if (!nueva) {
this._rect = null;
return false;
}
this._prepare(nueva, dpr);
this.paint(this._ctx, nueva, dpr, tilePx);
this._rect = nueva;
this._tilePx = tilePx;
this._dpr = dpr;
}
const smoothing = ctx.imageSmoothingEnabled;
ctx.imageSmoothingEnabled = false;
ctx.drawImage(this.canvas,
origin.x + this._rect.x, origin.y + this._rect.y,
this._rect.w, this._rect.h);
ctx.imageSmoothingEnabled = smoothing;
return true;
}
_window(vx0, vy0, vx1, vy1, view, tilePx, dpr) {
const w = this.level.w * tilePx;
const h = this.level.h * tilePx;
const mx = view.w * MARGIN;
const my = view.h * MARGIN;
const x0 = clamp(Math.floor((vx0 - mx) / STEP) * STEP, 0, w);
const y0 = clamp(Math.floor((vy0 - my) / STEP) * STEP, 0, h);
const x1 = clamp(Math.ceil((vx1 + mx) / STEP) * STEP, 0, w);
const y1 = clamp(Math.ceil((vy1 + my) / STEP) * STEP, 0, h);
if (x1 - x0 < 1 || y1 - y0 < 1) return null;
const pw = Math.max(1, Math.round((x1 - x0) * dpr));
const ph = Math.max(1, Math.round((y1 - y0) * dpr));
if (pw * ph > CONFIG.RENDER.MAX_BUFFER_PIXELS) return null;
return { x: x0, y: y0, w: pw / dpr, h: ph / dpr };
}
_prepare(rect, dpr) {
const pw = Math.round(rect.w * dpr);
const ph = Math.round(rect.h * dpr);
if (!this.canvas) {
this.canvas = document.createElement('canvas');
this._ctx = this.canvas.getContext('2d');
}
if (this.canvas.width !== pw || this.canvas.height !== ph) {
this.canvas.width = pw;
this.canvas.height = ph;
}
this._ctx.clearRect(0, 0, pw, ph);
}
}
