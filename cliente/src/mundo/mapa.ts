// ============================================================
// MAPA
// Un mapa de tiles es una cuadrícula: cada número dice qué
// baldosa (tile) va en esa casilla. Más adelante lo dibujaremos
// con el editor Tiled; de momento lo escribimos a mano.
// ============================================================

export const TAMANO_TILE = 32; // cada casilla mide 32x32 píxeles

// Qué significa cada número:
export const SUELO = 0; // hierba, se puede pisar
export const ARBOL = 1; // bloquea el paso
export const AGUA = 2;  // bloquea el paso

// 20 columnas x 15 filas = 640x480 píxeles.
export const MAPA: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,1,1,0,0,0,2,2,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,2,2,0,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,2,2,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Objetos con los que se puede interactuar (posición en casillas).
export interface DatosCofre {
  columna: number;
  fila: number;
  dificultad: number;
  oro: number;
}

export const COFRES: DatosCofre[] = [
  { columna: 3, fila: 2, dificultad: 10, oro: 5 },   // fácil, cerca del inicio
  { columna: 17, fila: 2, dificultad: 14, oro: 15 }, // más lejos, más difícil
  { columna: 17, fila: 12, dificultad: 16, oro: 40 }, // tras la puerta cerrada
];

// La puerta cierra el hueco del muro de árboles en (13, 12).
export const PUERTA = { columna: 13, fila: 12, dificultad: 13 };

// El ermitaño, el primer PNJ.
export const ERMITANO = { columna: 9, fila: 5 };
