// ============================================================
// PERSONAJE
// Junta puntuaciones + clase + origen y calcula lo que sale de
// ellos: PG, CA, competencias y el bono de cada habilidad.
// ============================================================
import { modificador } from "./dados";
import { ATRIBUTO_DE, ATRIBUTOS, type Atributo, type Habilidad } from "./habilidades";
import { type Puntuaciones, PUNTUACION_MINIMA, PUNTUACION_MAXIMA, puntosRestantes } from "./compraPorPuntos";
import { CLASES, type DatosClase } from "./clases";
import { ORIGENES, type DatosOrigen } from "./origenes";

export interface Personaje {
  nombre: string;
  clase: DatosClase;
  origen: DatosOrigen;
  nivel: number;
  vidas: number;
  atributos: Puntuaciones;
  pgMaximos: number;
  pg: number;
  ca: number;
  competencias: Habilidad[];
}

/** Bonificador de competencia según nivel: +2 (1-4), +3 (5-8), +4 (9-12)... */
export function bonificadorCompetencia(nivel: number): number {
  return 2 + Math.floor((nivel - 1) / 4);
}

export function crearPersonaje(nombre: string, clase: DatosClase, origen: DatosOrigen, atributos: Puntuaciones): Personaje {
  const modCon = modificador(atributos.constitucion);
  const modDes = modificador(atributos.destreza);

  // Nivel 1: el máximo del dado de golpe + modificador de CON.
  const pgMaximos = Math.max(1, clase.dadoDeGolpe + modCon);

  // CA = base de la armadura + DES (con el tope que permita la armadura).
  const ca = clase.armadura.base + Math.min(modDes, clase.armadura.maxDestreza);

  // Juntamos las habilidades de la clase y del origen sin repetir.
  // Un "Set" es una colección que no admite duplicados.
  const competencias = [...new Set([...clase.habilidades, ...origen.habilidades])];

  return {
    nombre, clase, origen, nivel: 1, vidas: 3, atributos,
    pgMaximos, pg: pgMaximos, ca, competencias,
  };
}

export function esCompetente(p: Personaje, habilidad: Habilidad): boolean {
  return p.competencias.includes(habilidad);
}

/** Lo que se suma al d20 en una prueba de habilidad. */
export function bonoHabilidad(p: Personaje, habilidad: Habilidad): number {
  const atributo: Atributo = ATRIBUTO_DE[habilidad];
  let bono = modificador(p.atributos[atributo]);
  if (esCompetente(p, habilidad)) {
    bono += bonificadorCompetencia(p.nivel);
  }
  return bono;
}

// ------------------------------------------------------------
// Lo que el jugador ELIGE en la pantalla de creación. Es lo que
// se envía al servidor: solo nombres y números, nada calculado.
// El servidor vuelve a calcular el personaje a partir de esto,
// así nadie puede mandarle "tengo CA 40".
// ------------------------------------------------------------
export interface Eleccion {
  nombre: string;
  clase: string;
  origen: string;
  atributos: Puntuaciones;
}

/** Comprueba que la elección cumple las reglas y crea el personaje. Si no, null. */
export function personajeDesdeEleccion(e: Eleccion): Personaje | null {
  const clase = CLASES.find((c) => c.nombre === e.clase);
  const origen = ORIGENES.find((o) => o.nombre === e.origen);
  if (!clase || !origen || typeof e.nombre !== "string" || e.nombre.length > 20) return null;

  for (const atributo of ATRIBUTOS) {
    const v = e.atributos?.[atributo];
    // Number.isInteger descarta textos, decimales y valores que falten.
    if (!Number.isInteger(v) || v < PUNTUACION_MINIMA || v > PUNTUACION_MAXIMA) return null;
  }
  if (puntosRestantes(e.atributos) < 0) return null; // se ha gastado más de 27

  return crearPersonaje(e.nombre, clase, origen, e.atributos);
}

/** El camino inverso: de un personaje a su elección (para enviarla). */
export function eleccionDe(p: Personaje): Eleccion {
  return { nombre: p.nombre, clase: p.clase.nombre, origen: p.origen.nombre, atributos: p.atributos };
}
