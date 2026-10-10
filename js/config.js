export const STATE = Object.freeze({
BOOT: 'BOOT',
MENU: 'MENU',
LEVELS: 'LEVELS',
PLAYING: 'PLAYING',
PAUSED: 'PAUSED',
DETECTED: 'DETECTED',
RESULT: 'RESULT'
});
export const PLAYER_STATE = Object.freeze({
NORMAL: 'NORMAL',
CROUCH: 'CROUCH',
HIDDEN: 'HIDDEN',
DETECTED: 'DETECTED',
COMPLETE: 'COMPLETE'
});
function deepFreeze(value) {
if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
return value;
}
for (const key of Object.keys(value)) {
deepFreeze(value[key]);
}
return Object.freeze(value);
}
export const CONFIG = deepFreeze({
WORLD: { TILE: 48 },
LEVEL: {
COLLECTIBLE_VALUE: 100,
SWITCH_LABEL: 'ACCIONAR',
INTERACT_RANGE: 1.4,
COLLECT_RANGE: 0.55,
MINE_RANGE: 0.5,
TIME_BONUS_S: 15,
EXIT_RANGE: 0.5,
LIGHT: {
RADIUS: 4,
LEVEL: 3,
ARC: 360,
SPEED: 30
},
ENEMY: {
ANGLE: 0
}
},
PLAYER: {
SPEED: 3.0,
CROUCH_SPEED: 1.5,
SPRINT_SPEED: 4.6,
RADIUS: 0.32,
ACCEL: 18,
FRICTION: 22,
TURN_MIN_SPEED: 0.2,
FACING_RATE: 14,
BOB_RATE: 5.0,
BOB_AMPLITUDE: 0.055,
LEAN: 0.06,
EXPOSURE: {
NORMAL: 1.0,
SPRINT: 1.3,
CROUCH: 0.6,
HIDDEN: 0.25,
DETECTED: 1.0,
COMPLETE: 1.0
}
},
GUARD: {
SPEED: 1.8,
CHASE_SPEED: 4.2,
TURN_SPEED: 140,
RADIUS: 0.34,
WAIT_TIME: 1.4,
ARRIVE_RADIUS: 0.12,
LOOK_TIME: 2.0,
LOOK_SWEEP: 60,
LOOK_LERP: 6,
STUCK_TIME: 0.8,
SENTRY_SWEEP: 60,
SENTRY_RATE: 0.8,
CATCH_RADIUS: 0.66,
CHASE_REPATH: 0.3,
FIRE_RANGE: 7,
FIRE_WINDUP: 0.4
},
SHOT: {
SPEED: 11,
LIFE: 1.6,
RADIUS: 0.14,
STEP: 0.1
},
NOISE: {
SPRINT_RADIUS: 5,
SPRINT_INTERVAL: 0.4,
MIN_SPEED: 0.5,
RUN_STRENGTH: 1.0,
RING_LIFE: 0.55
},
VISION: {
RANGE: 6,
ANGLE: 70,
DETECTION_TIME: 0.7,
RECOVERY_TIME: 3.5,
ALERT_TIME: 7.0,
CLOSE_RANGE: 1.2,
CLOSE_MAX: 0.6,
TH_SUSPICIOUS: 0.35,
TH_ALERT: 0.70,
CONE_RAYS: 28
},
LIGHT: {
LEVELS: [0, 0.3, 0.6, 1.0],
BUFFER_SCALE: 0.25,
UPDATE_HZ: 15,
AMBIENT: 0.0,
VEIL_MAX: 0.60,
GUARD_LIGHT: {
INTENSITY: 1.35,
CAP: 1.0
}
},
CAMERA: {
MODE_AUTO: true,
FOLLOW_LERP: 6,
FIT_MARGIN: 0.5,
TILE_MIN_PX: 18,
TILE_MAX_PX: 72
},
INPUT: {
STICK_DEAD_ZONE: 0.15,
STICK_SMOOTH: 30,
TAP_TIME: 0.25,
TAP_DIST: 12,
POINTER_DEAD_ZONE: 0.25,
POINTER_FULL_RANGE: 2.0,
JOYSTICK_RADIUS: 54,
KNOB_RATIO: 0.4
},
PALETTE: {
BG: '#0d0912',
GRID: 'rgba(170, 130, 220, 0.06)',
FLOOR: '#171021',
WALL: '#241a33',
WALL_EDGE: '#372a4d',
AMBER: '#f0b429',
TEXT: '#a99bc4',
DANGER: '#e5484d',
PLAYER: '#5fd3c0',
PLAYER_BODY: '#123038',
GUARD_BODY: '#3a161c',
GUARD_CAP: '#5c222b',
SHADOW: 'rgba(0, 0, 0, 0.35)',
EXIT: '#f0b429',
COLLECTIBLE: '#9db8ff',
SWITCH: '#c98bff'
},
RENDER: {
MAX_DPR: 2,
MAX_CANVAS_PIXELS: 16777216,
MAX_BUFFER_PIXELS: 4194304,
SHOW_DEBUG: false
},
AUDIO: {
MASTER: 0.8,
MUSIC: 0.5,
SFX: 0.8
},
SCORE: {
COMPLETE: 300,        /* terminar el nivel, pase lo que pase */
PER_SECOND: 10,       /* cada segundo que sobra del parTime */
UNDER_PAR: 500,       /* terminarlo dentro de la marca de calidad */
NO_DETECTIONS: 500,   /* el techo del bonus de sigilo */
PER_DETECTION: 150,   /* lo que resta cada vez que te ven, hasta cero */
PER_LIFE: 100         /* cada vida que te queda al salir */
},
SAVE: {
KEY: 'shadow-rush-save',
VERSION: 1,
DEBOUNCE_MS: 400
},
PLAYABLES: {
MAX_SAVE_BYTES: 3145728
},
TEXT: {
DEFAULT: 'es',
WAIT_MS: 800
},
GAME: {
FIXED_DT: 1 / 60,
MAX_STEPS: 5,
RETRY_DELAY: 0.25,
MAX_FRAME_DT: 0.25,
LIVES: 3,
TIME_LIMIT_EASY: 1.4,
TIME_LIMIT_HARD: 1.05,
TIME_LIMIT_SLOW: 3.6,
TIME_LIMIT_PER_CHASE: 0.219,
TIME_WARN_S: 12
},
INFINITE: {
BUCLES: 0.08,
CAMINO_MIN: 20,
PAR_MIN: 30,
INTENTOS: 20,
PASOS: [
{ hasta: 2, w: 21, h: 15, patrulleros: 3, centinelas: 0, llaves: 1, chase: 3.60, sight: 5.5, fire: 0 },
{ hasta: 5, w: 21, h: 15, patrulleros: 4, centinelas: 0, llaves: 1, chase: 3.85, sight: 6.0, fire: 0.05 },
{ hasta: 8, w: 23, h: 17, patrulleros: 5, centinelas: 1, llaves: 2, chase: 4.20, sight: 6.5, fire: 0.10 },
{ hasta: 11, w: 25, h: 17, patrulleros: 7, centinelas: 1, llaves: 2, chase: 4.55, sight: 7.0, fire: 0.20 },
{ hasta: 14, w: 27, h: 19, patrulleros: 8, centinelas: 2, llaves: 2, chase: 4.85, sight: 7.5, fire: 0.25 },
{ hasta: 17, w: 29, h: 19, patrulleros: 10, centinelas: 2, llaves: 3, chase: 5.25, sight: 8.0, fire: 0.35 },
{ hasta: 19, w: 31, h: 21, patrulleros: 11, centinelas: 3, llaves: 3, chase: 5.60, sight: 8.5, fire: 0.40 },
{ hasta: Infinity, w: 33, h: 21, patrulleros: 11, centinelas: 3, llaves: 3, chase: 5.80, sight: 9.0, fire: 0.45 }
]
}
});
