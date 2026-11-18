// ============================================================
// PERSONAJE
// Los seis atributos clásicos de D&D. Cada uno es una puntuación
// (normalmente entre 8 y 15 al empezar). El modificador que se suma
// a las tiradas se calcula con modificador() en reglas/dados.ts.
// ============================================================

export interface Atributos {
  fuerza: number;       // FUE: golpear, forzar, cargar
  destreza: number;     // DES: esquivar, sigilo, cerraduras, huir
  constitucion: number; // CON: puntos de golpe, resistir venenos
  inteligencia: number; // INT: magia de mago, saber, runas
  sabiduria: number;    // SAB: percepción, intuición, magia de clérigo
  carisma: number;      // CAR: persuadir, intimidar, engañar
}

// Un "type" con varias opciones de texto: solo se admiten estas clases.
export type Clase = "Guerrero" | "Pícaro" | "Mago" | "Clérigo";

export interface Personaje {
  nombre: string;
  clase: Clase;
  nivel: number;
  vidas: number;
  atributos: Atributos;
}

// Reparto de compra por puntos (27 puntos), típico de un guerrero.
export const personajeDePrueba: Personaje = {
  nombre: "Aventurera",
  clase: "Guerrero",
  nivel: 1,
  vidas: 3,
  atributos: {
    fuerza: 15,
    destreza: 13,
    constitucion: 14,
    inteligencia: 8,
    sabiduria: 12,
    carisma: 10,
  },
};
