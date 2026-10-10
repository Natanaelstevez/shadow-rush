export function isWall(level, tx, ty) {
if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) return true;
return level.isWall(tx, ty);
}
export function circleHitsGrid(level, x, y, radius) {
const x0 = Math.floor(x - radius);
const x1 = Math.floor(x + radius);
const y0 = Math.floor(y - radius);
const y1 = Math.floor(y + radius);
for (let ty = y0; ty <= y1; ty++) {
for (let tx = x0; tx <= x1; tx++) {
if (!isWall(level, tx, ty)) continue;
const nearX = x < tx ? tx : (x > tx + 1 ? tx + 1 : x);
const nearY = y < ty ? ty : (y > ty + 1 ? ty + 1 : y);
const dx = x - nearX;
const dy = y - nearY;
if (dx * dx + dy * dy < radius * radius) return true;
}
}
return false;
}
export function castRay(level, x, y, dirX, dirY, max) {
let tx = Math.floor(x);
let ty = Math.floor(y);
const stepX = dirX > 0 ? 1 : -1;
const stepY = dirY > 0 ? 1 : -1;
const deltaX = dirX !== 0 ? Math.abs(1 / dirX) : Infinity;
const deltaY = dirY !== 0 ? Math.abs(1 / dirY) : Infinity;
let nextX = deltaX === Infinity ? Infinity : (dirX > 0 ? tx + 1 - x : x - tx) * deltaX;
let nextY = deltaY === Infinity ? Infinity : (dirY > 0 ? ty + 1 - y : y - ty) * deltaY;
let t = 0;
while (true) {
if (nextX < nextY) {
t = nextX;
nextX += deltaX;
tx += stepX;
} else {
t = nextY;
nextY += deltaY;
ty += stepY;
}
if (t > max) return max;
if (isWall(level, tx, ty)) return t;
}
}
export function moveWithCollision(level, entity, dx, dy) {
const radius = entity.radius;
let x = entity.x;
let y = entity.y;
let hitX = false;
let hitY = false;
if (dx !== 0) {
const nx = x + dx;
if (circleHitsGrid(level, nx, y, radius)) hitX = true;
else x = nx;
}
if (dy !== 0) {
const ny = y + dy;
if (circleHitsGrid(level, x, ny, radius)) hitY = true;
else y = ny;
}
entity.x = x;
entity.y = y;
entity.hitX = hitX;
entity.hitY = hitY;
return entity;
}
