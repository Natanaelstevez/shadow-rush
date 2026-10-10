import { CONFIG } from './config.js';
import { TAU, clamp, dist2, degToRad, normalizeAngle, angleDiff } from './utils.js';
import { moveWithCollision } from './collision.js';
import { findPath } from './level.js';
import { buildCone, computeVisibility, hasLineOfSight, updateDetection } from './vision.js';
export const GUARD_STATE = Object.freeze({
PATROL: 'PATROL',
SUSPICIOUS: 'SUSPICIOUS',
ALERT: 'ALERT',
CHASE: 'CHASE',
SEARCH: 'SEARCH'
});
export class Enemy {
constructor(def, level) {
this.type = def.type;
this.level = level;
this.x = def.x;
this.y = def.y;
this.angle = degToRad(def.angle);
this.radius = CONFIG.GUARD.RADIUS;
this.state = null;
this._screen = { x: 0, y: 0 };
}
update(dt, ctx) {
}
isAlerted() {
return this.state === GUARD_STATE.SUSPICIOUS ||
this.state === GUARD_STATE.ALERT ||
this.state === GUARD_STATE.CHASE;
}
draw(ctx, camera) {
const s = CONFIG.WORLD.TILE * camera.scale;
const p = camera.tileToScreen(this.x, this.y, this._screen);
const r = this.radius * s;
const P = CONFIG.PALETTE;
const a = this.angle;
ctx.beginPath();
ctx.ellipse(p.x, p.y + r * 0.5, r * 0.92, r * 0.4, 0, 0, TAU);
ctx.fillStyle = P.SHADOW;
ctx.fill();
const outline = this.isAlerted() ? P.AMBER : P.DANGER;
ctx.save();
ctx.translate(p.x, p.y);
ctx.rotate(a);
ctx.beginPath();
ctx.ellipse(0, 0, r * 1.15, r * 0.86, 0, 0, TAU);
ctx.fillStyle = P.GUARD_BODY;
ctx.fill();
ctx.lineWidth = Math.max(1.5, r * 0.16);
ctx.strokeStyle = outline;
ctx.stroke();
ctx.beginPath();
ctx.arc(0, 0, r * 0.5, 0, TAU);
ctx.fillStyle = P.GUARD_CAP;
ctx.fill();
ctx.strokeStyle = outline;
ctx.stroke();
ctx.fillStyle = outline;
for (let i = 0; i < 4; i++) {
const ang = i * (TAU / 4) + Math.PI / 4;
ctx.beginPath();
ctx.arc(Math.cos(ang) * r * 0.98, Math.sin(ang) * r * 0.72, r * 0.13, 0, TAU);
ctx.fill();
}
ctx.beginPath();
ctx.moveTo(r * 1.0, -r * 0.18);
ctx.lineTo(r * 1.5, 0);
ctx.lineTo(r * 1.0, r * 0.18);
ctx.closePath();
ctx.fillStyle = P.AMBER;
ctx.fill();
ctx.restore();
}
}
const _conePoints = new Float32Array(CONFIG.VISION.CONE_RAYS * 2);
export class Guard extends Enemy {
constructor(def, level) {
super(def, level);
this.speed = def.speed;
this.chaseSpeed = def.chaseSpeed;
this.waitTime = def.waitTime;
this.fireEvery = def.fireEvery;
this.fireRange = def.fireRange;
this._fireIn = CONFIG.GUARD.FIRE_WINDUP;
this.visionRange = def.visionRange;
this.visionAngle = def.visionAngle;
this.detectionTime = def.detectionTime;
this.state = GUARD_STATE.PATROL;
this.detection = 0;
this.patrol = def.patrol;
this.patrolIndex = 0;
this._path = [];
this._pathCount = 0;
this._pathStep = 0;
this._moving = false;
this._wait = 0;
this._stuck = 0;
this._sentry = this.patrol.length < 2;
this._time = 0;
this._baseAngle = this.angle;
this._look = 0;
this._lookTotal = 0;
this._lookBase = this.angle;
this._lookTarget = this.angle;
this.lastVisibility = 0;
this._seenX = this.x;
this._seenY = this.y;
this._byNoise = false;
this._repath = 0;
if (this._sentry) {
this.patrolIndex = 0;
} else if (dist2(this.x, this.y, this.patrol[0][0], this.patrol[0][1]) <=
CONFIG.GUARD.ARRIVE_RADIUS * CONFIG.GUARD.ARRIVE_RADIUS) {
this.patrolIndex = 1 % this.patrol.length;
this._wait = this.waitTime;
}
}
update(dt, ctx) {
this._time += dt;
this._emitter = ctx ? ctx.emitter : null;
this._updateVision(dt, ctx);
switch (this.state) {
case GUARD_STATE.PATROL:
this._updatePatrol(dt);
break;
case GUARD_STATE.SUSPICIOUS:
this._updateSuspicious(dt);
break;
case GUARD_STATE.ALERT:
this._updateAlert(dt);
break;
case GUARD_STATE.CHASE:
this._updateChase(dt, ctx);
break;
case GUARD_STATE.SEARCH:
this._updateSearch(dt);
break;
}
}
_updateVision(dt, ctx) {
const V = CONFIG.VISION;
const player = ctx ? ctx.player : null;
if (!player) {
this.lastVisibility = 0;
return;
}
const light = ctx.lightField ? ctx.lightField.sample(player.x, player.y) : 1;
const visibility = computeVisibility(player, this, this.level, light);
this.lastVisibility = visibility;
updateDetection(this, visibility, dt);
if (visibility > 0) {
this._seenX = player.x;
this._seenY = player.y;
}
const det = this.detection;
if (this.state === GUARD_STATE.CHASE) {
if (det < V.TH_ALERT) this._enter(GUARD_STATE.SEARCH);
return;
}
if (det >= 1 && visibility > 0) {
this._enter(this._sentry ? GUARD_STATE.ALERT : GUARD_STATE.CHASE);
return;
}
if (det >= V.TH_ALERT) {
this._enter(GUARD_STATE.ALERT);
return;
}
if (det >= V.TH_SUSPICIOUS) {
if (this.state === GUARD_STATE.PATROL) this._enter(GUARD_STATE.SUSPICIOUS);
return;
}
if (this.state === GUARD_STATE.ALERT || this.state === GUARD_STATE.CHASE) {
this._enter(GUARD_STATE.SEARCH);
} else if (this.state === GUARD_STATE.SUSPICIOUS && !this._byNoise) {
this._enter(GUARD_STATE.PATROL);
}
}
_enter(state) {
if (this.state === state) return;
this.state = state;
this._moving = false;
this._wait = 0;
this._look = 0;
if (state === GUARD_STATE.CHASE) this._fireIn = CONFIG.GUARD.FIRE_WINDUP;
this._repath = 0;
this._byNoise = false;
if (this._emitter) {
if (state === GUARD_STATE.SUSPICIOUS) this._emitter.emit('detect', this);
else if (state === GUARD_STATE.ALERT || state === GUARD_STATE.CHASE) this._emitter.emit('alert', this);
else if (state === GUARD_STATE.PATROL) this._emitter.emit('calm', this);
}
if (state === GUARD_STATE.PATROL) {
this.detection = 0;
return;
}
if (state === GUARD_STATE.SEARCH) {
this._lookTotal = CONFIG.VISION.ALERT_TIME;
this._lookBase = this.angle;
this._lookTarget = this.angle;
this._moving = this._plan(this._seenX, this._seenY);
if (!this._moving) this._look = this._lookTotal;
}
}
hearNoise(x, y, radius, strength) {
if (this.state === GUARD_STATE.ALERT || this.state === GUARD_STATE.CHASE) {
return false;
}
if (dist2(this.x, this.y, x, y) > radius * radius) return false;
this._enter(GUARD_STATE.SUSPICIOUS);
this._byNoise = true;
this._lookTotal = CONFIG.GUARD.LOOK_TIME * (0.5 + 0.5 * clamp(strength, 0, 1));
this._lookTarget = Math.atan2(y - this.y, x - this.x);
if (this._sentry) {
this._look = this._lookTotal;
return true;
}
this._moving = this._plan(x, y);
if (!this._moving) {
this._look = this._lookTotal;
}
return true;
}
_updatePatrol(dt) {
const G = CONFIG.GUARD;
if (this._sentry) {
this.angle = normalizeAngle(
this._baseAngle + degToRad(G.SENTRY_SWEEP) * Math.sin(this._time * G.SENTRY_RATE)
);
return;
}
if (!this._moving) {
const next = this.patrol[this.patrolIndex];
this._turnTowards(Math.atan2(next[1] - this.y, next[0] - this.x), dt);
this._wait -= dt;
if (this._wait > 0) return;
if (this._plan(next[0], next[1])) this._moving = true;
return;
}
if (this._followPath(dt, this.speed)) this._advancePatrol();
}
_updateSuspicious(dt) {
const G = CONFIG.GUARD;
if (!this._byNoise) {
const dx = this._seenX - this.x;
const dy = this._seenY - this.y;
if (dx * dx + dy * dy > 1e-9) this._turnTowards(Math.atan2(dy, dx), dt);
return;
}
if (this._look > 0) {
this._look -= dt;
this._lookBase = normalizeAngle(
this._lookBase + angleDiff(this._lookBase, this._lookTarget) * (1 - Math.exp(-G.LOOK_LERP * dt))
);
const t = 1 - Math.max(this._look, 0) / this._lookTotal;
this.angle = normalizeAngle(this._lookBase + degToRad(G.LOOK_SWEEP) * Math.sin(t * TAU));
if (this._look <= 0) this._resumePatrol();
return;
}
if (!this._moving) {
this._resumePatrol();
return;
}
if (!this._followPath(dt, this.speed)) return;
this._moving = false;
this._look = this._lookTotal;
this._lookBase = this.angle;
this._lookTarget = this.angle;
}
_updateAlert(dt) {
const dx = this._seenX - this.x;
const dy = this._seenY - this.y;
if (dx * dx + dy * dy > 1e-9) this._turnTowards(Math.atan2(dy, dx), dt);
}
_updateChase(dt, ctx) {
this._repath -= dt;
if (!this._moving || this._repath <= 0) {
this._moving = this._plan(this._seenX, this._seenY);
this._repath = CONFIG.GUARD.CHASE_REPATH;
}
if (this._moving && this._followPath(dt, this.chaseSpeed)) {
this._moving = false;
}
this._checkCatch(ctx);
this._tryFire(dt, ctx);
if (!this._moving && this.lastVisibility <= 0) this._enter(GUARD_STATE.SEARCH);
}
_tryFire(dt, ctx) {
if (!this.fireEvery || !ctx.shots) return;
this._fireIn -= dt;
if (this._fireIn > 0) return;
const player = ctx.player;
const dx = player.x - this.x;
const dy = player.y - this.y;
if (dx * dx + dy * dy > this.fireRange * this.fireRange) return;
if (!hasLineOfSight(ctx.level, this.x, this.y, player.x, player.y)) return;
this._fireIn = this.fireEvery;
ctx.shots.fire(this.x, this.y, player.x, player.y);
ctx.emitter.emit('shot', this);
}
_updateSearch(dt) {
if (this._moving) {
if (this._followPath(dt, this.speed)) this._moving = false;
return;
}
if (this._look > 0) {
this._look -= dt;
const t = 1 - Math.max(this._look, 0) / this._lookTotal;
this.angle = normalizeAngle(
this._lookBase + degToRad(CONFIG.GUARD.LOOK_SWEEP) * Math.sin(t * TAU)
);
if (this._look <= 0) this._resumePatrol();
return;
}
this._lookTotal = CONFIG.VISION.ALERT_TIME;
this._look = this._lookTotal;
this._lookBase = this.angle;
this._lookTarget = this.angle;
}
_checkCatch(ctx) {
const player = ctx ? ctx.player : null;
if (!player) return;
const reach = CONFIG.GUARD.CATCH_RADIUS;
if (dist2(this.x, this.y, player.x, player.y) > reach * reach) return;
if (ctx.emitter) ctx.emitter.emit('caught', this);
}
_resumePatrol() {
if (this._sentry) {
this._baseAngle = this.angle;
this._time = 0;
}
this._enter(GUARD_STATE.PATROL);
}
_advancePatrol() {
this._moving = false;
this._wait = this.waitTime;
this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
}
_plan(x, y) {
this._pathCount = findPath(this.level, this.x, this.y, x, y, this._path);
this._pathStep = 0;
this._stuck = 0;
return this._pathCount >= 0;
}
_followPath(dt, speed) {
if (this._stuck > CONFIG.GUARD.STUCK_TIME) {
this._stuck = 0;
return true;
}
const w = this.level.w;
while (this._pathStep < this._pathCount) {
const index = this._path[this._pathStep];
const tx = (index % w) + 0.5;
const ty = Math.floor(index / w) + 0.5;
if (!this._walkTowards(dt, tx, ty, speed)) return false;
this._pathStep++;
}
return true;
}
_walkTowards(dt, tx, ty, speed) {
const G = CONFIG.GUARD;
const dx = tx - this.x;
const dy = ty - this.y;
const d2 = dx * dx + dy * dy;
if (d2 <= G.ARRIVE_RADIUS * G.ARRIVE_RADIUS) return true;
const d = Math.sqrt(d2);
const step = Math.min(speed * dt, d);
const beforeX = this.x;
const beforeY = this.y;
moveWithCollision(this.level, this, (dx / d) * step, (dy / d) * step);
if (this.x === beforeX && this.y === beforeY) {
if (d < 0.5) return true;
this._stuck += dt;
} else {
this._stuck = 0;
}
this._turnTowards(Math.atan2(dy, dx), dt);
return false;
}
_turnTowards(target, dt) {
const rate = degToRad(CONFIG.GUARD.TURN_SPEED) * dt;
const diff = angleDiff(this.angle, target);
this.angle = normalizeAngle(this.angle + clamp(diff, -rate, rate));
}
draw(ctx, camera) {
this._drawCone(ctx, camera);
super.draw(ctx, camera);
this._drawBar(ctx, camera);
if (!CONFIG.RENDER.SHOW_DEBUG) return;
const w = this.level.w;
const t = camera.tilePx;
const origin = this._origin || (this._origin = { x: 0, y: 0 });
camera.tileToScreen(0, 0, origin);
ctx.strokeStyle = CONFIG.PALETTE.DANGER;
ctx.lineWidth = 2;
ctx.globalAlpha = 0.16;
if (this._pathStep < this._pathCount) {
ctx.beginPath();
ctx.moveTo(this._screen.x, this._screen.y);
for (let i = this._pathStep; i < this._pathCount; i++) {
const index = this._path[i];
ctx.lineTo(
origin.x + ((index % w) + 0.5) * t,
origin.y + (Math.floor(index / w) + 0.5) * t
);
}
ctx.stroke();
}
ctx.globalAlpha = 0.45;
for (const point of this.patrol) {
ctx.beginPath();
ctx.arc(origin.x + point[0] * t, origin.y + point[1] * t, Math.max(2, t * 0.05), 0, TAU);
ctx.fillStyle = CONFIG.PALETTE.DANGER;
ctx.fill();
}
ctx.globalAlpha = 1;
}
_drawCone(ctx, camera) {
const count = buildCone(this.level, this, _conePoints, CONFIG.VISION.CONE_RAYS);
if (count < 2) return;
const p = camera.tileToScreen(this.x, this.y, this._screen);
const origin = this._origin || (this._origin = { x: 0, y: 0 });
camera.tileToScreen(0, 0, origin);
const t = camera.tilePx;
const alert = this.state === GUARD_STATE.ALERT || this.state === GUARD_STATE.CHASE;
ctx.beginPath();
ctx.moveTo(p.x, p.y);
for (let i = 0; i < count; i++) {
ctx.lineTo(origin.x + _conePoints[i * 2] * t, origin.y + _conePoints[i * 2 + 1] * t);
}
ctx.closePath();
ctx.globalAlpha = alert ? 0.22 : 0.09;
ctx.fillStyle = alert ? CONFIG.PALETTE.DANGER : CONFIG.PALETTE.AMBER;
ctx.fill();
ctx.globalAlpha = 1;
}
_drawBar(ctx, camera) {
const detection = this.detection;
if (detection <= 0.01) return;
const V = CONFIG.VISION;
const t = camera.tilePx;
const w = t * 0.9;
const h = Math.max(3, t * 0.08);
const x = this._screen.x - w * 0.5;
const y = this._screen.y - t * 0.75;
ctx.globalAlpha = 0.75;
ctx.fillStyle = CONFIG.PALETTE.BG;
ctx.fillRect(x, y, w, h);
ctx.fillStyle = detection >= V.TH_ALERT ? CONFIG.PALETTE.DANGER : CONFIG.PALETTE.AMBER;
ctx.fillRect(x, y, w * detection, h);
const tick = Math.max(1, h * 0.2);
ctx.fillStyle = CONFIG.PALETTE.TEXT;
ctx.fillRect(x + w * V.TH_SUSPICIOUS - tick * 0.5, y, tick, h);
ctx.fillRect(x + w * V.TH_ALERT - tick * 0.5, y, tick, h);
ctx.globalAlpha = 1;
}
}
export function createEnemy(def, level) {
if (def.type === 'guard') return new Guard(def, level);
return new Enemy(def, level);
}
