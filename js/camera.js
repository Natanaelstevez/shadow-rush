import { CONFIG } from './config.js';
import { clamp } from './utils.js';
export class Camera {
constructor(level) {
this.level = level;
this.mode = 'fit';
this.x = level.w * 0.5;
this.y = level.h * 0.5;
this.scale = 1;
this.tilePx = CONFIG.WORLD.TILE;
this.viewW = 1;
this.viewH = 1;
this.offsetX = 0;
this.offsetY = 0;
this._targetX = this.x;
this._targetY = this.y;
this.minTx = 0;
this.maxTx = 0;
this.minTy = 0;
this.maxTy = 0;
this._sync();
}
fit(viewW, viewH) {
const tile = CONFIG.WORLD.TILE;
const C = CONFIG.CAMERA;
const level = this.level;
this.viewW = Math.max(1, viewW);
this.viewH = Math.max(1, viewH);
const margin = C.FIT_MARGIN * tile;
const mapW = level.w * tile;
const mapH = level.h * tile;
const minScale = C.TILE_MIN_PX / tile;
const maxScale = C.TILE_MAX_PX / tile;
const fitScale = Math.min(
(this.viewW - margin * 2) / mapW,
(this.viewH - margin * 2) / mapH,
maxScale
);
if (!C.MODE_AUTO) {
this.mode = 'follow';
} else if (fitScale >= minScale) {
this.mode = 'fit';
this.scale = fitScale;
} else {
this.mode = 'follow';
}
if (this.mode === 'follow') {
this.scale = clamp((this.viewH - margin * 2) / mapH, minScale, maxScale);
}
if (this.mode === 'fit') {
this._targetX = level.w * 0.5;
this._targetY = level.h * 0.5;
this.x = this._targetX;
this.y = this._targetY;
}
this._sync();
}
update(dt, player) {
if (this.mode !== 'follow' || !player) return;
this._computeTarget(player);
const k = 1 - Math.exp(-CONFIG.CAMERA.FOLLOW_LERP * dt);
this.x += (this._targetX - this.x) * k;
this.y += (this._targetY - this.y) * k;
this._sync();
}
snap(player) {
if (this.mode !== 'follow' || !player) return;
this._computeTarget(player);
this.x = this._targetX;
this.y = this._targetY;
this._sync();
}
_computeTarget(player) {
const level = this.level;
const halfW = this.viewW / (2 * this.tilePx);
const halfH = this.viewH / (2 * this.tilePx);
this._targetX = level.w * 0.5 < halfW
? level.w * 0.5
: clamp(player.x, halfW, level.w - halfW);
this._targetY = level.h * 0.5 < halfH
? level.h * 0.5
: clamp(player.y, halfH, level.h - halfH);
}
tileToScreen(tx, ty, out) {
out.x = this.offsetX + tx * this.tilePx;
out.y = this.offsetY + ty * this.tilePx;
return out;
}
screenToTile(sx, sy, out) {
out.x = (sx - this.offsetX) / this.tilePx;
out.y = (sy - this.offsetY) / this.tilePx;
return out;
}
isVisible(tx, ty, margin) {
const m = margin || 0;
return tx + 1 > this.minTx - m && tx < this.maxTx + m &&
ty + 1 > this.minTy - m && ty < this.maxTy + m;
}
_sync() {
this.tilePx = CONFIG.WORLD.TILE * this.scale;
this.offsetX = Math.round(this.viewW * 0.5 - this.x * this.tilePx);
this.offsetY = Math.round(this.viewH * 0.5 - this.y * this.tilePx);
this.minTx = (0 - this.offsetX) / this.tilePx;
this.maxTx = (this.viewW - this.offsetX) / this.tilePx;
this.minTy = (0 - this.offsetY) / this.tilePx;
this.maxTy = (this.viewH - this.offsetY) / this.tilePx;
}
}
