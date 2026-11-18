// ============================================================
// PERSONAJE
// Junta puntuaciones + clase + origen y calcula lo que sale de
// ellos: PG, CA, competencias y el bono de cada habilidad.
// ============================================================
import { modificador } from "./dados";
import { ATRIBUTO_DE, type Atributo, type Habilidad } from "./habilidades";
import type { Puntuaciones } from "./compraPorPuntos";
import type { DatosClase } from "./clases";
import type { DatosOrigen } from "./origenes";

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
