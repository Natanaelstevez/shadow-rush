import { CONFIG } from './config.js';
import { clamp, dist, degToRad, angleDiff } from './utils.js';
import { castRay } from './collision.js';
export function hasLineOfSight(level, x0, y0, x1, y1) {
const d = dist(x0, y0, x1, y1);
if (d < 1e-6) return true;
return castRay(level, x0, y0, (x1 - x0) / d, (y1 - y0) / d, d) >= d;
}
export function inCone(guard, x, y) {
const range = guard.visionRange;
if (!(range > 0)) return false;
const dx = x - guard.x;
const dy = y - guard.y;
const d2 = dx * dx + dy * dy;
if (d2 > range * range) return false;
if (d2 < 1e-12) return true;
const half = degToRad(guard.visionAngle) * 0.5;
return Math.abs(angleDiff(guard.angle, Math.atan2(dy, dx))) <= half;
}
export function computeVisibility(player, guard, level, lightValue) {
if (!inCone(guard, player.x, player.y)) return 0;
if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
const range = guard.visionRange;
const d = dist(guard.x, guard.y, player.x, player.y);
const half = degToRad(guard.visionAngle) * 0.5;
const tAngle = half > 0
? clamp(
Math.abs(angleDiff(guard.angle, Math.atan2(player.y - guard.y, player.x - guard.x))) / half,
0, 1
)
: 0;
const tDist = clamp(d / range, 0, 1);
const factorDist = 1 - tDist * tDist;
const factorAngle = 1 - tAngle * tAngle * tAngle;
const factorState = typeof player.isVisibleTo === 'function' ? player.isVisibleTo(lightValue) : 1;
let visibility = factorDist * factorAngle * factorState;
const V = CONFIG.VISION;
if (d <= V.CLOSE_RANGE && visibility < V.CLOSE_MAX) visibility = V.CLOSE_MAX;
return visibility;
}
export function updateDetection(guard, visibility, dt) {
const V = CONFIG.VISION;
const time = guard.detectionTime > 0 ? guard.detectionTime : V.DETECTION_TIME;
if (visibility > 0) {
guard.detection = clamp(guard.detection + (visibility * dt) / time, 0, 1);
} else {
guard.detection = clamp(guard.detection - dt / V.RECOVERY_TIME, 0, 1);
}
}
export function buildCone(level, guard, out, rays) {
const capacity = (out.length / 2) | 0;
if (capacity < 2) return 0;
let count = rays | 0;
if (count > capacity) count = capacity;
if (count < 2) count = 2;
const range = guard.visionRange;
const half = degToRad(guard.visionAngle) * 0.5;
const from = guard.angle - half;
const step = (half * 2) / (count - 1);
for (let i = 0; i < count; i++) {
const a = from + step * i;
const dirX = Math.cos(a);
const dirY = Math.sin(a);
const r = castRay(level, guard.x, guard.y, dirX, dirY, range);
out[i * 2] = guard.x + dirX * r;
out[i * 2 + 1] = guard.y + dirY * r;
}
return count;
}
