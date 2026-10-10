import { CONFIG } from './config.js';
import { clamp } from './utils.js';
const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight'];
const ACTION_KEYS = {
KeyE: 'interact',
ShiftLeft: 'sprint',
ShiftRight: 'sprint',
KeyC: 'crouch',
Escape: 'pause',
KeyR: 'retry'
};
export class Input {
constructor() {
this.intent = { x: 0, y: 0, crouch: false, sprint: false };
this.actions = {
interact: false,
crouch: false,
sprint: false,
pause: false,
retry: false
};
this.joystick = {
active: false,
originX: 0,
originY: 0,
knobX: 0,
knobY: 0,
radius: CONFIG.INPUT.JOYSTICK_RADIUS
};
this.pointer = { x: 0, y: 0, down: false, type: 'mouse' };
this._element = null;
this._target = null;
this._keys = new Set();
this._pending = new Set();
this._pointerId = null;
this._pointerType = 'mouse';
this._pointerDown = false;
this._pointerX = 0;
this._pointerY = 0;
this._tapX = 0;
this._tapY = 0;
this._tapTime = 0;
this._clock = 0;
this._rect = { left: 0, top: 0 };
this._world = { x: 0, y: 0 };
this._onKeyDown = (event) => {
const code = event.code;
if (code.startsWith('Arrow') || code === 'Space') event.preventDefault();
this._keys.add(code);
if (event.repeat) return;
const action = ACTION_KEYS[code];
if (!action) return;
if (action === 'crouch') {
this.actions.crouch = !this.actions.crouch;
return;
}
if (action === 'sprint') {
this.actions.sprint = true;
return;
}
this.actions[action] = true;
this._pending.add(action);
};
this._onKeyUp = (event) => {
this._keys.delete(event.code);
if (ACTION_KEYS[event.code] === 'sprint') {
this.actions.sprint = SPRINT_KEYS.some((k) => this._keys.has(k));
}
};
this._onBlur = () => {
this._keys.clear();
this.actions.sprint = false;
this._releasePointer();
};
this._onPointerDown = (event) => {
if (event.pointerType === 'mouse' && event.button === 2) {
this.actions.crouch = !this.actions.crouch;
return;
}
if (event.pointerType === 'mouse' && event.button !== 0) return;
if (this._pointerId !== null) return;
const rect = this._element.getBoundingClientRect();
this._rect.left = rect.left;
this._rect.top = rect.top;
this._pointerId = event.pointerId;
this._pointerType = event.pointerType || 'mouse';
this._pointerDown = true;
this._pointerX = event.clientX - rect.left;
this._pointerY = event.clientY - rect.top;
this.pointer.x = this._pointerX;
this.pointer.y = this._pointerY;
this.pointer.down = true;
this.pointer.type = this._pointerType;
this._tapX = this._pointerX;
this._tapY = this._pointerY;
this._tapTime = this._clock;
if (this._pointerType !== 'mouse') {
this.joystick.active = true;
this.joystick.originX = this._pointerX;
this.joystick.originY = this._pointerY;
this.joystick.knobX = this._pointerX;
this.joystick.knobY = this._pointerY;
}
if (this._element.setPointerCapture) {
try {
this._element.setPointerCapture(event.pointerId);
} catch (err) {
}
}
event.preventDefault();
};
this._onPointerMove = (event) => {
if (event.pointerId !== this._pointerId) return;
this._pointerX = event.clientX - this._rect.left;
this._pointerY = event.clientY - this._rect.top;
this.pointer.x = this._pointerX;
this.pointer.y = this._pointerY;
if (this.joystick.active) {
const R = this.joystick.radius;
let dx = this._pointerX - this.joystick.originX;
let dy = this._pointerY - this.joystick.originY;
const d = Math.sqrt(dx * dx + dy * dy);
if (d > R) {
dx = (dx / d) * R;
dy = (dy / d) * R;
}
this.joystick.knobX = this.joystick.originX + dx;
this.joystick.knobY = this.joystick.originY + dy;
}
};
this._onPointerUp = (event) => {
if (event.pointerId !== this._pointerId) return;
const I = CONFIG.INPUT;
const dx = this._pointerX - this._tapX;
const dy = this._pointerY - this._tapY;
const moved = Math.sqrt(dx * dx + dy * dy);
if (this._clock - this._tapTime <= I.TAP_TIME && moved <= I.TAP_DIST) {
this._pending.add('interact');
}
this._releasePointer();
};
this._onContextMenu = (event) => {
event.preventDefault();
};
}
attach(element, target) {
if (this._element) return;
this._element = element;
this._target = target || (typeof window !== 'undefined' ? window : element);
element.addEventListener('pointerdown', this._onPointerDown);
element.addEventListener('pointermove', this._onPointerMove);
element.addEventListener('pointerup', this._onPointerUp);
element.addEventListener('pointercancel', this._onPointerUp);
element.addEventListener('contextmenu', this._onContextMenu);
this._target.addEventListener('keydown', this._onKeyDown);
this._target.addEventListener('keyup', this._onKeyUp);
this._target.addEventListener('blur', this._onBlur);
}
detach() {
if (!this._element) return;
this._element.removeEventListener('pointerdown', this._onPointerDown);
this._element.removeEventListener('pointermove', this._onPointerMove);
this._element.removeEventListener('pointerup', this._onPointerUp);
this._element.removeEventListener('pointercancel', this._onPointerUp);
this._element.removeEventListener('contextmenu', this._onContextMenu);
this._target.removeEventListener('keydown', this._onKeyDown);
this._target.removeEventListener('keyup', this._onKeyUp);
this._target.removeEventListener('blur', this._onBlur);
this._element = null;
this._target = null;
this._keys.clear();
this._pending.clear();
this._releasePointer();
}
_releasePointer() {
this._pointerId = null;
this._pointerDown = false;
this._tapTime = 0;
this.joystick.active = false;
this.pointer.down = false;
}
update(dt, camera, player) {
const I = CONFIG.INPUT;
this._clock += dt;
let ix = 0;
let iy = 0;
if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) iy -= 1;
if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) iy += 1;
if (this._keys.has('KeyA') || this._keys.has('ArrowLeft')) ix -= 1;
if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) ix += 1;
const kMag = Math.sqrt(ix * ix + iy * iy);
if (kMag > 0) {
this.intent.x = ix / kMag;
this.intent.y = iy / kMag;
} else if (this._pointerDown && this._pointerType === 'mouse' && camera && player) {
const w = camera.screenToTile(this._pointerX, this._pointerY, this._world);
const dx = w.x - player.x;
const dy = w.y - player.y;
const d = Math.sqrt(dx * dx + dy * dy);
if (d > I.POINTER_DEAD_ZONE) {
const mag = clamp((d - I.POINTER_DEAD_ZONE) / I.POINTER_FULL_RANGE, 0, 1);
this.intent.x = (dx / d) * mag;
this.intent.y = (dy / d) * mag;
} else {
this.intent.x = 0;
this.intent.y = 0;
}
} else if (this._pointerDown) {
const R = this.joystick.radius;
const dx = this.joystick.knobX - this.joystick.originX;
const dy = this.joystick.knobY - this.joystick.originY;
const d = Math.sqrt(dx * dx + dy * dy);
const travel = d / R;
if (travel > I.STICK_DEAD_ZONE) {
const mag = clamp((travel - I.STICK_DEAD_ZONE) / (1 - I.STICK_DEAD_ZONE), 0, 1);
const tx = (dx / d) * mag;
const ty = (dy / d) * mag;
const blend = 1 - Math.exp(-I.STICK_SMOOTH * dt);
this.intent.x += (tx - this.intent.x) * blend;
this.intent.y += (ty - this.intent.y) * blend;
} else {
this.intent.x = 0;
this.intent.y = 0;
}
} else {
this.intent.x = 0;
this.intent.y = 0;
}
this.intent.crouch = this.actions.crouch;
this.intent.sprint = this.actions.sprint;
}
consumePress(action) {
if (!this._pending.has(action)) return false;
this._pending.delete(action);
return true;
}
endFrame() {
this._pending.clear();
this.actions.interact = false;
this.actions.pause = false;
this.actions.retry = false;
}
}
