import { CONFIG, PLAYER_STATE } from './config.js';
import { clamp, angleDiff, normalizeAngle, TAU } from './utils.js';
import { moveWithCollision } from './collision.js';
export class Player {
constructor(tx = 0, ty = 0) {
this._screen = { x: 0, y: 0 };
this.reset(tx, ty);
}
reset(tx, ty) {
const P = CONFIG.PLAYER;
this.x = tx;
this.y = ty;
this.vx = 0;
this.vy = 0;
this.radius = P.RADIUS;
this.facing = 0;            /* radianes, 0 apunta a la derecha */
this.state = PLAYER_STATE.NORMAL;
this.sprinting = false;
this.speed = 0;             /* magnitud actual, para animar */
this.bob = 0;               /* fase de la animación de caminar */
this.hitX = false;
this.hitY = false;
}
maxSpeed() {
const P = CONFIG.PLAYER;
if (this.state === PLAYER_STATE.CROUCH) return P.CROUCH_SPEED;
if (this.sprinting) return P.SPRINT_SPEED;
return P.SPEED;
}
update(dt, intent, level, lightField) {
const P = CONFIG.PLAYER;
this.state = intent.crouch ? PLAYER_STATE.CROUCH : PLAYER_STATE.NORMAL;
this.sprinting = !!intent.sprint && !intent.crouch;
const ix = intent.x;
const iy = intent.y;
const mag = Math.sqrt(ix * ix + iy * iy);
let targetVx = 0;
let targetVy = 0;
if (mag > 0.0001) {
const speed = this.maxSpeed();
const k = mag > 1 ? speed / mag : speed;
targetVx = ix * k;
targetVy = iy * k;
}
const rate = mag > 0.0001 ? P.ACCEL : P.FRICTION;
const blend = 1 - Math.exp(-rate * dt);
this.vx += (targetVx - this.vx) * blend;
this.vy += (targetVy - this.vy) * blend;
if (level) {
moveWithCollision(level, this, this.vx * dt, this.vy * dt);
if (this.hitX) this.vx = 0;
if (this.hitY) this.vy = 0;
} else {
this.x += this.vx * dt;
this.y += this.vy * dt;
this.hitX = false;
this.hitY = false;
}
const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
this.speed = sp;
if (sp > P.TURN_MIN_SPEED) {
const target = Math.atan2(this.vy, this.vx);
this.facing = normalizeAngle(
this.facing + angleDiff(this.facing, target) * (1 - Math.exp(-P.FACING_RATE * dt))
);
}
this.bob += sp * P.BOB_RATE * dt;
if (this.bob > TAU) this.bob -= TAU;
}
isVisibleTo(lightValue) {
const E = CONFIG.PLAYER.EXPOSURE;
let exposure = E[this.state];
if (exposure === undefined) exposure = 1;
if (this.sprinting && this.state === PLAYER_STATE.NORMAL) exposure = E.SPRINT;
return clamp(lightValue, 0, 1) * exposure;
}
draw(ctx, camera) {
const P = CONFIG.PLAYER;
const s = CONFIG.WORLD.TILE * camera.scale;
const p = camera.tileToScreen(this.x, this.y, this._screen);
const r = this.radius * s;
const ratio = clamp(this.speed / P.SPEED, 0, P.SPRINT_SPEED / P.SPEED);
const crouch = this.state === PLAYER_STATE.CROUCH;
const a = this.facing;
ctx.beginPath();
ctx.ellipse(p.x, p.y + r * 0.5, r * 0.92, r * 0.4, 0, 0, TAU);
ctx.fillStyle = CONFIG.PALETTE.SHADOW;
ctx.fill();
const lean = P.LEAN * s * ratio;
const bobY = Math.sin(this.bob) * P.BOB_AMPLITUDE * s * ratio;
const bx = p.x + Math.cos(a) * lean;
const by = p.y + Math.sin(a) * lean + bobY;
ctx.save();
ctx.translate(bx, by);
ctx.rotate(a);
if (crouch) ctx.scale(0.78, 0.78);
if (ratio > 0.05) {
const llama = r * (0.45 + ratio * 1.0);
ctx.globalAlpha = 0.45 + ratio * 0.45;
ctx.fillStyle = CONFIG.PALETTE.AMBER;
ctx.beginPath();
ctx.moveTo(-r * 1.05, -r * 0.32);
ctx.lineTo(-r * 1.05 - llama, 0);
ctx.lineTo(-r * 1.05, r * 0.32);
ctx.closePath();
ctx.fill();
ctx.globalAlpha = 1;
}
ctx.beginPath();
ctx.moveTo(r * 1.35, 0);
ctx.quadraticCurveTo(r * 0.5, -r * 0.86, -r * 1.0, -r * 0.54);
ctx.quadraticCurveTo(-r * 1.28, 0, -r * 1.0, r * 0.54);
ctx.quadraticCurveTo(r * 0.5, r * 0.86, r * 1.35, 0);
ctx.closePath();
ctx.fillStyle = CONFIG.PALETTE.PLAYER_BODY;
ctx.fill();
ctx.lineWidth = Math.max(1.5, r * 0.16);
ctx.strokeStyle = CONFIG.PALETTE.PLAYER;
ctx.stroke();
ctx.beginPath();
ctx.ellipse(r * 0.42, 0, r * 0.36, r * 0.28, 0, 0, TAU);
ctx.fillStyle = CONFIG.PALETTE.PLAYER;
ctx.fill();
ctx.restore();
}
}
