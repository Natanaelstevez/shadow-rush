export const TAU = Math.PI * 2;
export function clamp(v, min, max) {
return v < min ? min : (v > max ? max : v);
}
export function lerp(a, b, t) {
return a + (b - a) * t;
}
export function dist(ax, ay, bx, by) {
const dx = bx - ax;
const dy = by - ay;
return Math.sqrt(dx * dx + dy * dy);
}
export function dist2(ax, ay, bx, by) {
const dx = bx - ax;
const dy = by - ay;
return dx * dx + dy * dy;
}
export function degToRad(deg) {
return deg * Math.PI / 180;
}
export function normalizeAngle(a) {
while (a > Math.PI) a -= Math.PI * 2;
while (a < -Math.PI) a += Math.PI * 2;
return a;
}
export function angleDiff(a, b) {
return normalizeAngle(b - a);
}
export function fitCanvas(cssW, cssH, devicePixelRatio, maxDpr, maxPixels) {
const area = cssW * cssH;
let dpr = Math.min(devicePixelRatio || 1, maxDpr);
if (area * dpr * dpr > maxPixels) {
dpr = Math.sqrt(maxPixels / area);
}
return {
width: Math.max(1, Math.round(cssW * dpr)),
height: Math.max(1, Math.round(cssH * dpr)),
dpr
};
}
export class RNG {
constructor(seed = 1) {
this.seed = seed >>> 0;
}
next() {
this.seed = (this.seed + 0x6D2B79F5) >>> 0;
let t = this.seed;
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
range(min, max) {
return min + this.next() * (max - min);
}
int(min, max) {
return Math.floor(this.range(min, max + 1));
}
}
export class Pool {
constructor(factory, reset = null) {
this._factory = factory;
this._reset = reset;
this._free = [];
}
obtain() {
const obj = this._free.pop();
return obj !== undefined ? obj : this._factory();
}
release(obj) {
if (this._reset) this._reset(obj);
this._free.push(obj);
}
get size() {
return this._free.length;
}
}
export class Emitter {
constructor() {
this._listeners = new Map();
}
on(event, fn) {
let list = this._listeners.get(event);
if (!list) {
list = [];
this._listeners.set(event, list);
}
list.push(fn);
return fn;
}
off(event, fn) {
const list = this._listeners.get(event);
if (!list) return;
const i = list.indexOf(fn);
if (i >= 0) list.splice(i, 1);
}
emit(event, payload) {
const list = this._listeners.get(event);
if (!list) return;
for (let i = 0; i < list.length; i++) {
list[i](payload);
}
}
count(event) {
const list = this._listeners.get(event);
return list ? list.length : 0;
}
}
