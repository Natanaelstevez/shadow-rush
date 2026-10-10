import { CONFIG } from './config.js';
const EN = {
'PAUSA': 'PAUSE',
'AGACHARSE': 'CROUCH',
'ACCIONAR': 'USE',
'SEGUIR': 'CONTINUE',
'REPETIR': 'RETRY',
'NIVELES': 'LEVELS',
'JUGAR': 'PLAY',
'REINICIAR': 'RESTART',
'VOLVER': 'BACK',
'MUSICA': 'MUSIC',
'MUSICA {estado}': 'MUSIC {estado}',
'EFECTOS': 'EFFECTS',
'EFECTOS {estado}': 'EFFECTS {estado}',
'SI': 'YES',
'NO': 'NO',
'Veinte niveles de sigilo, luz y sombra.': 'Twenty levels of stealth, light and shadow.',
'Niveles completados: {n} de {total}': 'Levels completed: {n} of {total}',
'Todavia no has completado ningun nivel.': 'You have not completed a level yet.',
'NIVEL COMPLETADO': 'LEVEL COMPLETE',
'TIEMPO {t} s   PAR {p} s': 'TIME {t} s   PAR {p} s',
'PUNTOS {n}': 'SCORE {n}',
'PUNTOS {n}   MEJOR {m}': 'SCORE {n}   BEST {m}',
'OBJETOS {n}': 'ITEMS {n}',
'TIEMPO {n}': 'TIME {n}',
'SIN QUE TE VEAN {n}': 'UNSEEN {n}',
'VIDAS {n}': 'LIVES {n}',
'NIVEL {n}': 'LEVEL {n}',
'TOTAL {n}   MEJOR {m}': 'TOTAL {n}   BEST {m}',
'TOTAL {n}   ∞ {m}': 'TOTAL {n}   ∞ {m}',
'BLOQUEADO': 'LOCKED',
'Toca un nivel para jugarlo.': 'Tap a level to play it.',
'OBJETIVO {n}/{total}': 'OBJECTIVE {n}/{total}',
'SALIDA LIBRE': 'EXIT OPEN',
'SIN LLAVE': 'NO KEY',
'LLAVE COGIDA': 'KEY FOUND',
'LLAVES {n}/{total}': 'KEYS {n}/{total}',
'¡REFUERZOS!': 'REINFORCEMENTS!',
'¡SE ACABÓ EL TIEMPO!': 'TIME IS UP!',
'¡VUELVES AL NIVEL ANTERIOR!': 'BACK TO THE PREVIOUS LEVEL!',
'EL DOCUMENTO': 'THE DOCUMENT',
'LA GEMA': 'THE GEM',
'EL DINERO': 'THE CASH',
'LA LLAVE': 'THE KEY',
'EL OBJETIVO': 'THE OBJECTIVE',
'FALTA {nombre}': '{nombre} IS MISSING',
'FALTAN {n} OBJETIVOS': '{n} OBJECTIVES LEFT',
'Primer contacto': 'First contact',
'A oscuras': 'In the dark',
'A cubierto': 'In cover',
'A la luz': 'In the light',
'Dos turnos': 'Two shifts',
'El centinela': 'The sentry',
'Tres focos': 'Three beams',
'Sin margen': 'No margin',
'El otro extremo': 'The other end',
'La fuga': 'The escape',
'La azotea': 'The rooftop',
'Doble turno': 'Double shift',
'El archivo': 'The archive',
'Sin salida': 'No way out',
'Último trabajo': 'Last job',
'La colmena': 'The hive',
'Fuego cruzado': 'Crossfire',
'El enjambre': 'The swarm',
'Sin respiro': 'No respite',
'La última puerta': 'The last door',
'Infinito {n}': 'Infinite {n}',
'Muévete con el puntero, con WASD o con las flechas, y llega a la salida sin que te vea el ovni.':
'Move with the pointer, WASD or the arrow keys, and reach the exit without the UFO seeing you.',
'No hay más luz que el foco del ovni: donde llega su mirada te ve, y fuera de ella eres invisible.':
'The only light here is the torch of the UFO: inside its beam he sees you, outside it you are invisible.',
'A partir de aquí los ovnis disparan. Los muros paran los dardos: úsalos de escudo. Y correr se oye.':
'From here on the UFOs shoot. Walls stop the darts: use them as cover. And running can be heard.',
'Agachado te ven menos y desde más lejos. Este laberinto tiene una llave, y sin ella la salida no abre.':
'Crouched, they see you less and from further away. This maze has a key, and the exit will not open without it.',
'Dos ovnis recorren el laberinto en sentidos distintos, y disparan. Hay que esperar el momento.':
'Two UFOs cross the maze in opposite directions, and they shoot. Wait for the moment.',
'Uno de los ovnis no patrulla: se queda barriendo con la mirada desde su cruce. Pásale por detrás.':
'One of the UFOs does not patrol: it stands at its crossing sweeping its gaze. Slip behind it.',
'Tres ovnis barriendo los pasillos. Su foco es la única luz: mira dónde apunta antes de cruzar.':
'Three UFOs sweeping the corridors. Their beam is the only light: watch where it points before you cross.',
'Los ovnis corren más que tú y disparan más seguido. La llave está en el rincón más lejano.':
'The UFOs run faster than you and shoot more often. The key is in the furthest corner.',
'Cuatro ovnis en un laberinto grande y la llave al otro extremo. Los muros son tu única ventaja.':
'Four UFOs in a big maze and the key at the other end. The walls are your only advantage.',
'Todo a la vez, y ahora con dos llaves: cinco ovnis y ni un rincón tranquilo.':
'Everything at once, and now with two keys: five UFOs and not a quiet corner.',
'Capítulo 2. Dos llaves, más ovnis, y menos tiempo entre disparo y disparo.':
'Chapter 2. Two keys, more UFOs, and less time between shots.',
'Dos llaves y ovnis que disparan casi sin respirar.':
'Two keys and UFOs that hardly pause between shots.',
'Tres llaves, y ninguna cerca de otra. El laberinto más enrevesado del capítulo.':
'Three keys, none of them near another. The most tangled maze of the chapter.',
'Siete ovnis y tres llaves. Aquí no vale correr: hay que saber por dónde se pasa.':
'Seven UFOs and three keys. Running is not enough here: you have to know the way through.',
'Todo a la vez y más: tres llaves y diez ovnis. El último trabajo.':
'Everything at once and more: three keys and ten UFOs. The last job.',
'Siete ovnis y dos centinelas en el mismo laberinto. Aquí no hay ruta limpia: hay que abrirse paso.':
'Seven UFOs and two sentries in the same maze. There is no clean route here: you have to push through.',
'Ocho ovnis y un disparo cada menos de un segundo. El muro que te tapa de uno te deja a la vista de otro.':
'Eight UFOs and a shot every half second. The wall that hides you from one leaves you in the open for another.',
'Nueve ovnis: ya no caben en una esquina del mapa, están en todas. Y tres llaves que buscar.':
'Nine UFOs: they no longer fit in one corner of the map, they are everywhere. And three keys to find.',
'Diez ovnis, tres centinelas y un reloj que no perdona. No hay un solo tramo tranquilo.':
'Ten UFOs, three sentries and a clock that forgives nothing. Not one quiet stretch.',
'Once ovnis y tres centinelas, y corren más que tú. La última puerta del archivo.':
'Eleven UFOs and three sentries, and they run faster than you. The last door in the archive.',
'Capítulo 3: un laberinto nuevo cada vez, generado con la semilla de la corrida. No hay final: el récord cuenta niveles superados.':
'Chapter 3: a new maze every time, generated from the run seed. There is no end: the record counts levels beaten.'
};
export const LANGUAGES = Object.freeze(['es', 'en']);
export function pickLanguage(tag, actual) {
const antes = LANGUAGES.indexOf(actual) >= 0 ? actual : CONFIG.TEXT.DEFAULT;
if (typeof tag !== 'string' || tag === '') return antes;
return tag.toLowerCase().startsWith('es') ? 'es' : 'en';
}
export class Texts {
constructor(language) {
this.language = typeof language === 'string' && LANGUAGES.indexOf(language) >= 0
? language
: CONFIG.TEXT.DEFAULT;
}
setLanguage(tag) {
this.language = pickLanguage(tag, this.language);
return this.language;
}
t(texto, datos) {
const plantilla = this.language === 'es' ? texto : (EN[texto] || texto);
if (!datos) return plantilla;
return plantilla.replace(/\{(\w+)\}/g, (hueco, clave) =>
Object.prototype.hasOwnProperty.call(datos, clave) ? String(datos[clave]) : hueco);
}
}
