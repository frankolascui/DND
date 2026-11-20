// ============================================================
// MAPA
// El mapa se escribe como TEXTO: cada carácter es una casilla.
// Así se puede "dibujar" a mano y se ve de un vistazo. Al final
// del archivo lo convertimos en números, que es lo que entiende
// el tilemap de Phaser.
// ============================================================

export const TAMANO_TILE = 32; // cada casilla mide 32x32 píxeles en pantalla

// Índice de cada baldosa dentro del tileset (ver ui/pixelArt.ts).
export const HIERBA = 0;
export const ARBOL = 1;
export const AGUA = 2;
export const CAMINO = 3;
export const FLORES = 4;
export const HIERBA_ALTA = 5;
export const ROCA = 6;
export const ARBUSTO = 7;
export const PUENTE = 8;
export const HIERBA_OSCURA = 9;
export const HIERBA_2 = 10;        // variante, para que la hierba no se vea repetida
export const HIERBA_OSCURA_2 = 11;
export const NUMERO_DE_BALDOSAS = 12;

/** Las baldosas que no se pueden atravesar. */
export const BLOQUEAN = [ARBOL, AGUA, ROCA, ARBUSTO];

// Leyenda: qué carácter es qué baldosa.
const LEYENDA: Record<string, number> = {
  ".": HIERBA,
  "T": ARBOL,
  "~": AGUA,
  "=": CAMINO,
  ",": FLORES,
  '"': HIERBA_ALTA,
  "o": ROCA,
  "b": ARBUSTO,
  "p": PUENTE,
  "d": HIERBA_OSCURA,   // la Hondonada: la zona profunda, más peligrosa
};

// 40 columnas x 30 filas = 1280x960 píxeles. La cámara sigue al jugador.
// Oeste: el claro de inicio y la cabaña del ermitaño (cerca del camino).
// Centro: el lago y el río, que solo se cruza por el puente.
// Este: la Hondonada (hierba oscura) y el recinto con la puerta.
// (Comillas simples porque la hierba alta usa el carácter ".)
const TEXTO_MAPA = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TT.TTTTT....TTT..T.TT.T..dTTTdddddTTddTT',
  'TT..,.....o."o....,~~~~~.bd"d"ddddddddTT',
  'TT.,...".o,,,....~~~~~~~~~dddddddddddddT',
  'TT,........=..,.~~~~~~~~~~ddddd"d.ddddTT',
  'T.....b....=....~~~~~~~~~~ddoddddddddddT',
  'T......"...=.....~~~~~~~~~ddddodddTTdddT',
  'TT.........=....o..~~~~~.ddddddddoTTTdTT',
  'TT.......".=..."......~~.dddbdddddTTT"dT',
  'T.====================pp==============TT',
  'TT.....b....,b.TT...".~~.dd=dddddd""ddTT',
  'TT............TTT.....~~.dd=ddddd"d"ddTT',
  'T..........,...........~~dd=dddddd"dddTT',
  'TT...."........,..,....~~dd=ddddddddddTT',
  'TT.b,...o.,,......b"...~~dd=dd"ddddddddT',
  'T.........b".b...o,"...~~dd=dddddddddddT',
  'T......................~~dT="ddbdd"ddddT',
  'T......,.........,.."..~~TT=ddddd"ddddTT',
  'T.TTT...TT..TTT...TTT,.~~TT=dodddddddddT',
  'T..T....TTTT.T....T...~~.dT=dddddddTdddT',
  'TT...."...TTTT...TTT..~~.dd=dddTTTTTTTTT',
  'TT..,....T.T.T...T..,,~~.dd=dddTdddddTdT',
  'TT.b..,...,T.T....,T",~~.dd=dTTTdddddTTT',
  'TT.,.".,...,...,......~~.dd=ddTTdddddTTT',
  'TT......,".o.....,...,~~.dd====.ddd.dTTT',
  'TT"TT.,b.........,..,"~~.ddddddTdddddTTT',
  'TTT.T....o....".....,.~~.dddd"dTdddddTTT',
  'TT..T..b.............o~~,"dddddTdddddTdT',
  'TTT.TT.T.TTTT..TTTT.T.~~TTdTddTTTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

// Dónde aparece el jugador (en casillas).
export const INICIO = { columna: 3, fila: 9 };

// Los caracteres que son DECORACIÓN (van encima del suelo, con fondo transparente).
const DECORACIONES = new Set(["T", ",", '"', "o", "b"]);
const VACIO = -1; // en un tilemap de Phaser, -1 = no hay baldosa

/**
 * El mapa se dibuja en DOS CAPAS, como hojas de papel transparente:
 *   - SUELO: hierba, hierba oscura, agua, camino, puente.
 *   - DECORACION: árboles, rocas, arbustos, flores... encima del suelo.
 * Así un árbol de la Hondonada tiene hierba oscura debajo, y uno del
 * bosque, hierba clara, con el mismo dibujo de árbol.
 */
function sueloDe(texto: string[], c: number, f: number): number {
  const caracter = texto[f][c];
  const esHierba = caracter === "." || DECORACIONES.has(caracter);
  if (!esHierba) return LEYENDA[caracter] ?? HIERBA;
  // Bajo una decoración (o en una casilla suelta) miramos a los vecinos (hasta 2 casillas):
  // si la mayoría es hierba oscura, esta casilla también lo es.
  let oscuros = 0;
  let claros = 0;
  for (let df = -2; df <= 2; df++) {
    for (let dc = -2; dc <= 2; dc++) {
      const vecino = texto[f + df]?.[c + dc];
      if (vecino === "d") oscuros++;
      if (vecino === ".") claros++;
    }
  }
  return oscuros > claros ? HIERBA_OSCURA : HIERBA;
}

function convertirSuelo(texto: string[]): number[][] {
  return texto.map((fila, f) =>
    [...fila].map((_, c) => {
      const baldosa = sueloDe(texto, c, f);
      // Variante según la posición: (c * 7 + f * 13) % 5 da siempre lo
      // mismo para la misma casilla, pero parece aleatorio.
      const variar = (c * 7 + f * 13) % 5 === 0;
      if (variar && baldosa === HIERBA) return HIERBA_2;
      if (variar && baldosa === HIERBA_OSCURA) return HIERBA_OSCURA_2;
      return baldosa;
    }),
  );
}

function convertirDecoracion(texto: string[]): number[][] {
  return texto.map((fila) => [...fila].map((caracter) => (DECORACIONES.has(caracter) ? LEYENDA[caracter] : VACIO)));
}

export const MAPA: number[][] = convertirSuelo(TEXTO_MAPA);          // capa de suelo
export const DECORACION: number[][] = convertirDecoracion(TEXTO_MAPA); // capa de encima
export const ANCHO_MUNDO = MAPA[0].length * TAMANO_TILE;
export const ALTO_MUNDO = MAPA.length * TAMANO_TILE;

/** Pasa de casilla a píxel (centro de la casilla). */
export function aPixel(casilla: number): number {
  return casilla * TAMANO_TILE + TAMANO_TILE / 2;
}
