import { CONFIG } from './config.js';
export const TILE_TYPES = Object.freeze({
WALL: Object.freeze({ name: 'muro', chars: '#', solid: true, marker: null }),
FLOOR: Object.freeze({ name: 'suelo', chars: '.', solid: false, marker: null }),
PLAYER_START: Object.freeze({ name: 'inicio', chars: 'P', solid: false, marker: 'playerStart' }),
EXIT: Object.freeze({ name: 'salida', chars: 'E', solid: false, marker: 'exit' }),
COLLECTIBLE: Object.freeze({ name: 'coleccionable', chars: 'o', solid: false, marker: 'collectible' }),
SWITCH: Object.freeze({ name: 'interruptor', chars: '1234', solid: false, marker: 'switch' }),
LIGHT: Object.freeze({ name: 'luz', chars: 'abcd', solid: false, marker: 'light' })
});
const CHAR_TO_TYPE = new Map();
for (const type of Object.values(TILE_TYPES)) {
for (const ch of type.chars) CHAR_TO_TYPE.set(ch, type);
}
const SWITCH_IDS = { 1: 'S1', 2: 'S2', 3: 'S3', 4: 'S4' };
const LIGHT_IDS = { a: 'L1', b: 'L2', c: 'L3', d: 'L4' };
const ENEMY_TYPES = ['guard', 'floodlight', 'sentry'];
const LIGHT_TYPES = ['static', 'switchable', 'rotating', 'sensor'];
const SWITCH_MODES = ['toggle', 'hold'];
const COLLECTIBLE_TYPES = ['gem', 'document', 'cash', 'key', 'life', 'time'];
const RESERVED_FIELDS = ['doors', 'cameras', 'sensors'];
const MARK_TOLERANCE = 0.5;
const NEIGHBOUR_X = [1, -1, 0, 0];
const NEIGHBOUR_Y = [0, 0, 1, -1];
let _searchSize = 0;
let _searchDist = null;
let _searchFrom = null;
let _searchQueue = null;
function ensureSearchBuffers(size) {
if (_searchSize >= size) return;
_searchSize = size;
_searchDist = new Int16Array(size);
_searchFrom = new Int32Array(size);
_searchQueue = new Int32Array(size);
}
function search(level, sx, sy, gx, gy) {
const w = level.w;
const h = level.h;
const solid = level.solid;
const size = w * h;
ensureSearchBuffers(size);
const dist = _searchDist;
const from = _searchFrom;
const queue = _searchQueue;
dist.fill(-1, 0, size);
const start = sy * w + sx;
const goal = gy * w + gx;
dist[start] = 0;
from[start] = -1;
let head = 0;
let tail = 0;
queue[tail++] = start;
while (head < tail) {
const index = queue[head++];
const x = index % w;
const y = (index - x) / w;
const d = dist[index];
for (let i = 0; i < 4; i++) {
const nx = x + NEIGHBOUR_X[i];
const ny = y + NEIGHBOUR_Y[i];
if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
const next = ny * w + nx;
if (solid[next] === 1 || dist[next] !== -1) continue;
dist[next] = d + 1;
from[next] = index;
if (next === goal) return d + 1;
queue[tail++] = next;
}
}
return -1;
}
export function pathLength(level, ax, ay, bx, by) {
const w = level.w;
const h = level.h;
const sx = Math.floor(ax);
const sy = Math.floor(ay);
const gx = Math.floor(bx);
const gy = Math.floor(by);
if (sx < 0 || sy < 0 || sx >= w || sy >= h) return -1;
if (gx < 0 || gy < 0 || gx >= w || gy >= h) return -1;
if (sx === gx && sy === gy) return 0;
return search(level, sx, sy, gx, gy);
}
export function findPath(level, ax, ay, bx, by, out) {
const w = level.w;
const h = level.h;
const sx = Math.floor(ax);
const sy = Math.floor(ay);
const gx = Math.floor(bx);
const gy = Math.floor(by);
if (sx < 0 || sy < 0 || sx >= w || sy >= h) return -1;
if (gx < 0 || gy < 0 || gx >= w || gy >= h) return -1;
if (sx === gx && sy === gy) return 0;
if (search(level, sx, sy, gx, gy) < 0) return -1;
const start = sy * w + sx;
const goal = gy * w + gx;
const size = w * h;
let count = 0;
let index = goal;
while (index !== start) {
if (index < 0 || count >= size) return -1;
out[count++] = index;
index = _searchFrom[index];
}
for (let i = 0, j = count - 1; i < j; i++, j--) {
const swap = out[i];
out[i] = out[j];
out[j] = swap;
}
return count;
}
function isSolidAt(found, x, y) {
const tx = Math.floor(x);
const ty = Math.floor(y);
if (tx < 0 || ty < 0 || tx >= found.w || ty >= found.h) return true;
return found.solid[ty * found.w + tx] === 1;
}
function scanMap(map, report) {
const h = map.length;
const w = map[0].length;
const solid = new Uint8Array(w * h);
const found = {
w,
h,
solid,
playerStarts: [],
exits: [],
collectibles: [],
switches: [],
lights: []
};
for (let ty = 0; ty < h; ty++) {
const row = map[ty];
for (let tx = 0; tx < w; tx++) {
const ch = row.charAt(tx);
const type = CHAR_TO_TYPE.get(ch);
if (!type) {
report.warnings.push(
'carácter desconocido «' + ch + '» en la casilla ' + tx + ',' + ty + ': se trata como suelo'
);
continue;
}
if (type.solid) {
solid[ty * w + tx] = 1;
continue;
}
const x = tx + 0.5;
const y = ty + 0.5;
switch (type.marker) {
case 'playerStart':
found.playerStarts.push({ x, y });
break;
case 'exit':
found.exits.push({ x, y });
break;
case 'collectible':
found.collectibles.push({ x, y });
break;
case 'switch':
found.switches.push({ id: SWITCH_IDS[ch], x, y, marked: true });
break;
case 'light':
found.lights.push({ id: LIGHT_IDS[ch], x, y, marked: true });
break;
default:
break;
}
}
}
return found;
}
function markDistance(mark, x, y) {
if (!mark) return Infinity;
return Math.hypot(mark.x - x, mark.y - y);
}
function makeLight(def, mark) {
const D = CONFIG.LEVEL.LIGHT;
const position = mark || def;
return {
id: def.id || (mark ? mark.id : null),
x: position.x,
y: position.y,
radius: typeof def.radius === 'number' ? def.radius : D.RADIUS,
level: typeof def.level === 'number' ? def.level : D.LEVEL,
type: typeof def.type === 'string' ? def.type : (mark ? 'switchable' : 'static'),
on: def.on !== false,
angle: typeof def.angle === 'number' ? def.angle : 0,
arc: typeof def.arc === 'number' ? def.arc : D.ARC,
speed: typeof def.speed === 'number' ? def.speed : D.SPEED
};
}
function makeSwitch(def, mark) {
const position = mark || def;
return {
id: def.id || (mark ? mark.id : null),
x: position.x,
y: position.y,
targets: Array.isArray(def.targets) ? def.targets.slice() : [],
mode: typeof def.mode === 'string' ? def.mode : 'toggle',
label: typeof def.label === 'string' && def.label ? def.label : CONFIG.LEVEL.SWITCH_LABEL
};
}
function makeCollectible(def, mark) {
const position = mark || def;
return {
type: typeof def.type === 'string' ? def.type : 'gem',
x: position.x,
y: position.y,
value: typeof def.value === 'number' ? def.value : CONFIG.LEVEL.COLLECTIBLE_VALUE,
required: def.required === true,
collected: false
};
}
function mergeElements(declared, marks, report, kind, make) {
const list = [];
const used = new Array(marks.length).fill(false);
for (const def of declared) {
const id = def.id;
let index = -1;
for (let i = 0; i < marks.length; i++) {
if (used[i]) continue;
const mark = marks[i];
const match = id
? mark.id === id
: Math.floor(mark.x) === Math.floor(def.x) && Math.floor(mark.y) === Math.floor(def.y);
if (match) {
index = i;
break;
}
}
if (index === -1) {
list.push(make(def, null));
continue;
}
used[index] = true;
const mark = marks[index];
if (id && markDistance(mark, def.x, def.y) > MARK_TOLERANCE) {
report.warnings.push(
kind + ' ' + id + ': el mapa la coloca en ' + mark.x + ',' + mark.y +
' y el array en ' + def.x + ',' + def.y + '; manda el mapa'
);
}
list.push(make({ ...def, x: mark.x, y: mark.y, id: def.id || mark.id }, mark));
}
for (let i = 0; i < marks.length; i++) {
if (!used[i]) list.push(make({}, marks[i]));
}
return list;
}
function checkLight(light, report) {
const where = 'luz ' + (light.id || 'sin identificador');
if (!Number.isFinite(light.x) || !Number.isFinite(light.y)) {
report.errors.push(where + ': le falta la posición');
}
if (!(light.radius > 0)) {
report.errors.push(where + ': el radio debe ser mayor que cero');
}
if (!Number.isInteger(light.level) || light.level < 0 || light.level >= CONFIG.LIGHT.LEVELS.length) {
report.errors.push(where + ': el nivel de luz debe ser un entero de 0 a ' + (CONFIG.LIGHT.LEVELS.length - 1));
}
if (LIGHT_TYPES.indexOf(light.type) === -1) {
report.errors.push(where + ': tipo desconocido «' + light.type + '»');
}
}
function checkSwitch(device, report, found) {
const where = 'interruptor ' + (device.id || 'sin identificador');
if (!Number.isFinite(device.x) || !Number.isFinite(device.y)) {
report.errors.push(where + ': le falta la posición');
}
if (SWITCH_MODES.indexOf(device.mode) === -1) {
report.errors.push(where + ': modo desconocido «' + device.mode + '»');
}
if (isSolidAt(found, device.x, device.y)) {
report.warnings.push(where + ': está dentro de un muro y no se podría accionar');
}
}
function checkCollectible(item, report, found) {
const where = 'coleccionable en ' + item.x + ',' + item.y;
if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) {
report.errors.push(where + ': le falta la posición');
}
if (COLLECTIBLE_TYPES.indexOf(item.type) === -1) {
report.errors.push(where + ': tipo desconocido «' + item.type + '»');
}
if (!(item.value >= 0)) {
report.errors.push(where + ': el valor no puede ser negativo');
}
if (isSolidAt(found, item.x, item.y)) {
report.warnings.push(where + ': está dentro de un muro y no se podría recoger');
}
}
function checkGuard(def, report) {
if (def.guard === undefined) return;
if (!def.guard || typeof def.guard !== 'object') {
report.errors.push('guard: tiene que ser un objeto con los números del nivel');
return;
}
for (const campo of ['speed', 'chase', 'sight', 'fire', 'range']) {
const valor = def.guard[campo];
if (valor === undefined) continue;
if (!Number.isFinite(valor) || valor < 0) {
report.errors.push('guard.' + campo + ': tiene que ser un número que no sea negativo');
}
}
}
function makeEnemy(def, report, found, index, guard) {
const G = CONFIG.GUARD;
const V = CONFIG.VISION;
const where = 'enemigo ' + (index + 1);
const g = guard && typeof guard === 'object' ? guard : {};
const delNivel = (clave, respaldo) => (Number.isFinite(g[clave]) ? g[clave] : respaldo);
const enemy = {
type: def.type,
x: def.x,
y: def.y,
angle: typeof def.angle === 'number' ? def.angle : CONFIG.LEVEL.ENEMY.ANGLE,
patrol: [],
waitTime: typeof def.waitTime === 'number' ? def.waitTime : G.WAIT_TIME,
speed: typeof def.speed === 'number' ? def.speed : delNivel('speed', G.SPEED),
chaseSpeed: typeof def.chaseSpeed === 'number' ? def.chaseSpeed : delNivel('chase', G.CHASE_SPEED),
visionRange: typeof def.visionRange === 'number' ? def.visionRange : delNivel('sight', V.RANGE),
visionAngle: typeof def.visionAngle === 'number' ? def.visionAngle : V.ANGLE,
detectionTime: typeof def.detectionTime === 'number' ? def.detectionTime : V.DETECTION_TIME,
fireEvery: typeof def.fireEvery === 'number' ? def.fireEvery : delNivel('fire', 0),
fireRange: typeof def.fireRange === 'number' ? def.fireRange : delNivel('range', G.FIRE_RANGE)
};
if (ENEMY_TYPES.indexOf(enemy.type) === -1) {
report.errors.push(where + ': tipo desconocido «' + enemy.type + '»');
}
if (enemy.type === 'floodlight') {
report.warnings.push(where + ': el tipo floodlight no tiene comportamiento propio todavía');
}
if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) {
report.errors.push(where + ': le falta la posición');
return enemy;
}
if (isSolidAt(found, enemy.x, enemy.y)) {
report.errors.push(where + ': está fuera del mapa o dentro de un muro');
}
if (Array.isArray(def.patrol)) {
enemy.patrol = def.patrol.map((point) => [point[0], point[1]]);
if (enemy.patrol.length < 2) {
report.warnings.push(where + ': la patrulla tiene menos de dos puntos; será un centinela y girará sobre sí mismo');
}
for (const point of enemy.patrol) {
if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
report.errors.push(where + ': un punto de la patrulla no es un par de números');
continue;
}
if (isSolidAt(found, point[0], point[1])) {
report.warnings.push(where + ': el punto ' + point[0] + ',' + point[1] + ' de la patrulla está dentro de un muro');
}
}
let fromX = enemy.x;
let fromY = enemy.y;
for (let i = 0; i < enemy.patrol.length; i++) {
const point = enemy.patrol[i];
if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) break;
if (!isSolidAt(found, fromX, fromY) && !isSolidAt(found, point[0], point[1]) &&
pathLength(found, fromX, fromY, point[0], point[1]) < 0) {
report.warnings.push(
where + ': no hay camino hasta el punto ' + point[0] + ',' + point[1] +
' de la patrulla; se quedará donde está'
);
break;
}
fromX = point[0];
fromY = point[1];
}
}
return enemy;
}
function analyze(def, report) {
if (!def || typeof def !== 'object') {
report.errors.push('el nivel no es un objeto');
return null;
}
if (!Number.isInteger(def.id)) {
report.errors.push('falta el campo obligatorio id, o no es un número entero');
}
if (typeof def.name !== 'string' || def.name === '') {
report.errors.push('falta el campo obligatorio name');
}
if (typeof def.parTime !== 'number' || !(def.parTime > 0)) {
report.errors.push('falta el campo obligatorio parTime, o no es un número positivo');
}
if (!Array.isArray(def.map) || def.map.length === 0) {
report.errors.push('falta el campo obligatorio map, o está vacío');
return null;
}
const w = typeof def.map[0] === 'string' ? def.map[0].length : 0;
let rectangular = w > 0;
for (let i = 0; i < def.map.length; i++) {
const row = def.map[i];
if (typeof row !== 'string' || row.length !== w) {
report.errors.push(
'el mapa no es rectangular: la fila ' + i + ' mide ' +
(typeof row === 'string' ? row.length : 'nada') + ' y la primera mide ' + w
);
rectangular = false;
}
}
if (!rectangular) return null;
const found = scanMap(def.map, report);
if (found.playerStarts.length !== 1) {
report.errors.push('el mapa debe tener exactamente un P, y tiene ' + found.playerStarts.length);
}
if (found.exits.length !== 1) {
report.errors.push('el mapa debe tener exactamente un E, y tiene ' + found.exits.length);
}
const playerStart = found.playerStarts[0] || null;
const exit = found.exits[0] || null;
const startSolid = playerStart ? isSolidAt(found, playerStart.x, playerStart.y) : true;
const exitSolid = exit ? isSolidAt(found, exit.x, exit.y) : true;
if (playerStart && startSolid) report.errors.push('el inicio está dentro de un muro');
if (exit && exitSolid) report.errors.push('la salida está dentro de un muro');
const lights = mergeElements(
Array.isArray(def.lights) ? def.lights : [], found.lights, report, 'luz', makeLight
);
const switches = mergeElements(
Array.isArray(def.switches) ? def.switches : [], found.switches, report, 'interruptor', makeSwitch
);
const collectibles = mergeElements(
Array.isArray(def.collectibles) ? def.collectibles : [], found.collectibles, report, 'coleccionable', makeCollectible
);
for (const light of lights) checkLight(light, report);
for (const device of switches) checkSwitch(device, report, found);
for (const item of collectibles) checkCollectible(item, report, found);
for (const device of switches) {
for (const target of device.targets) {
if (!lights.some((light) => light.id === target)) {
report.warnings.push('el interruptor ' + device.id + ' apunta a ' + target + ', que no existe en el nivel');
}
}
}
for (const pair of [['luz', lights], ['interruptor', switches]]) {
const seenIds = new Set();
for (const item of pair[1]) {
if (!item.id) continue;
if (seenIds.has(item.id)) {
report.warnings.push('hay más de un ' + pair[0] + ' con el identificador ' + item.id);
}
seenIds.add(item.id);
}
}
checkGuard(def, report);
const enemies = [];
if (Array.isArray(def.enemies)) {
for (let i = 0; i < def.enemies.length; i++) {
enemies.push(makeEnemy(def.enemies[i] || {}, report, found, i, def.guard));
}
}
for (const field of RESERVED_FIELDS) {
if (Array.isArray(def[field]) && def[field].length > 0) {
report.warnings.push('el nivel usa el campo reservado ' + field + '; se valida pero se ignora hasta su fase');
}
}
if (playerStart && exit && !startSolid && !exitSolid) {
const path = pathLength(found, playerStart.x, playerStart.y, exit.x, exit.y);
if (path < 0) {
report.errors.push('la salida no se puede alcanzar desde el inicio');
} else {
const minTime = path / CONFIG.PLAYER.SPEED;
if (typeof def.parTime === 'number' && def.parTime < minTime) {
report.warnings.push(
'parTime es ' + def.parTime + ' s y el recorrido más corto son ' + path +
' casillas, que a ' + CONFIG.PLAYER.SPEED + ' casillas por segundo son ' +
minTime.toFixed(1) + ' s'
);
}
}
for (const item of collectibles) {
if (!item.required) continue;
const hasta = pathLength(found, playerStart.x, playerStart.y, item.x, item.y);
const desde = pathLength(found, item.x, item.y, exit.x, exit.y);
if (hasta < 0 || desde < 0) {
report.errors.push(
'el objetivo obligatorio de ' + item.x + ', ' + item.y + ' no se puede recoger y volver a salir'
);
}
}
}
const mines = [];
if (Array.isArray(def.mines)) {
for (let i = 0; i < def.mines.length; i++) {
const mine = def.mines[i] || {};
const guards = [];
if (Array.isArray(mine.guards)) {
for (let g = 0; g < mine.guards.length; g++) {
guards.push(makeEnemy(mine.guards[g] || {}, report, found, i * 10 + g + 1, def.guard));
}
} else {
report.errors.push('mina ' + (i + 1) + ': no declara los guardias que llama');
}
if (!Number.isFinite(mine.x) || !Number.isFinite(mine.y)) {
report.errors.push('mina ' + (i + 1) + ': le falta la posición');
} else if (isSolidAt(found, mine.x, mine.y)) {
report.errors.push('mina ' + (i + 1) + ': está dentro de un muro');
}
mines.push({ x: mine.x, y: mine.y, guards, triggered: false });
}
}
return { found, playerStart, exit, lights, switches, collectibles, enemies, mines };
}
export class Level {
constructor(def, data, warnings) {
this.id = def.id;
this.name = def.name;
this.chapter = Number.isInteger(def.chapter) ? def.chapter : 1;
this.parTime = def.parTime;
this.maxDetections = Number.isInteger(def.maxDetections) ? def.maxDetections : 0;
this.hint = typeof def.hint === 'string' ? def.hint : '';
this.w = data.found.w;
this.h = data.found.h;
this.tileSize = CONFIG.WORLD.TILE;
this.grid = def.map.slice();
this.solid = data.found.solid;
this.playerStart = data.playerStart;
this.exit = data.exit;
this.collectibles = data.collectibles;
this.switches = data.switches;
this.lights = data.lights;
this.enemies = data.enemies;
this.mines = data.mines;
this.doors = Array.isArray(def.doors) ? def.doors.slice() : [];
this.cameras = Array.isArray(def.cameras) ? def.cameras.slice() : [];
this.sensors = Array.isArray(def.sensors) ? def.sensors.slice() : [];
this.objectives = this.collectibles.filter((item) => item.required);
this.keys = this.collectibles.filter((item) => item.type === 'key');
this.warnings = warnings;
}
isWall(tx, ty) {
if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
return this.solid[ty * this.w + tx] === 1;
}
tileAt(tx, ty) {
if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return '';
return this.grid[ty].charAt(tx);
}
}
export function validate(def) {
const report = { errors: [], warnings: [] };
analyze(def, report);
return { ok: report.errors.length === 0, errors: report.errors, warnings: report.warnings };
}
export function validateAll(defs) {
const errors = [];
const warnings = [];
const seen = new Map();
for (const def of defs) {
const label = def && typeof def.name === 'string' && def.name ? def.name : 'nivel sin identificar';
const report = validate(def);
for (const error of report.errors) errors.push(label + ': ' + error);
for (const warning of report.warnings) warnings.push(label + ': ' + warning);
if (def && def.id !== undefined) {
if (seen.has(def.id)) {
errors.push(label + ': el id ' + def.id + ' ya lo usa ' + seen.get(def.id));
} else {
seen.set(def.id, label);
}
}
}
return { ok: errors.length === 0, errors, warnings };
}
export function parseLevel(def) {
const report = { errors: [], warnings: [] };
const data = analyze(def, report);
if (report.errors.length > 0 || !data) {
const name = def && typeof def.name === 'string' ? def.name : 'sin nombre';
throw new Error(
'[Shadow Rush] El nivel «' + name + '» tiene ' + report.errors.length + ' errores:\n  - ' +
report.errors.join('\n  - ')
);
}
return new Level(def, data, report.warnings);
}
