// ============================================================
// COMPRA POR PUNTOS (regla de D&D)
// Tienes 27 puntos. Todas las puntuaciones empiezan en 8 y subir
// cada una cuesta lo que dice la tabla. Los números altos cuestan
// más: pasar de 13 a 14 cuesta 2 puntos, no 1.
// ============================================================
import { ATRIBUTOS, type Atributo } from "./habilidades";

export const PUNTOS_TOTALES = 27;
export const PUNTUACION_MINIMA = 8;
export const PUNTUACION_MAXIMA = 15;

// Coste TOTAL de tener cada puntuación (no el coste de subir 1).
const COSTE: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export type Puntuaciones = Record<Atributo, number>;

export function costeDe(puntuacion: number): number {
  return COSTE[puntuacion];
}

/** Puntos gastados en total. */
export function puntosGastados(p: Puntuaciones): number {
  let suma = 0;
  for (const atributo of ATRIBUTOS) {
    suma += costeDe(p[atributo]);
  }
  return suma;
}

export function puntosRestantes(p: Puntuaciones): number {
  return PUNTOS_TOTALES - puntosGastados(p);
}

/** ¿Se puede subir este atributo 1 punto sin pasarse? */
export function puedeSubir(p: Puntuaciones, atributo: Atributo): boolean {
  const actual = p[atributo];
  if (actual >= PUNTUACION_MAXIMA) return false;
  const costeExtra = costeDe(actual + 1) - costeDe(actual);
  return costeExtra <= puntosRestantes(p);
}

export function puedeBajar(p: Puntuaciones, atributo: Atributo): boolean {
  return p[atributo] > PUNTUACION_MINIMA;
}

/** Todo a 8: el punto de partida. */
export function puntuacionesIniciales(): Puntuaciones {
  return { fuerza: 8, destreza: 8, constitucion: 8, inteligencia: 8, sabiduria: 8, carisma: 8 };
}
