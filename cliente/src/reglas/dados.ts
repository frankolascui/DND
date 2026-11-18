// ============================================================
// REGLAS DE DADOS
// Este archivo no sabe nada de Phaser ni de gráficos: solo hace
// cuentas. Así, en la fase 2 lo podremos mover al servidor tal cual.
// ============================================================

/**
 * Tira un dado de `caras` caras y devuelve un número entre 1 y `caras`.
 *
 * Math.random() da un decimal entre 0 (incluido) y 1 (sin incluir).
 * Lo multiplicamos por las caras, lo redondeamos hacia abajo con
 * Math.floor y sumamos 1 para que el rango sea 1..caras y no 0..caras-1.
 */
export function tirarDado(caras: number): number {
  return Math.floor(Math.random() * caras) + 1;
}

/**
 * Una "interface" describe la forma que tiene un objeto: qué campos
 * tiene y de qué tipo es cada uno. TypeScript nos avisa si olvidamos
 * alguno o si ponemos un texto donde va un número.
 */
export interface ResultadoTirada {
  dado: number;        // lo que salió en el d20 (1..20)
  modificador: number; // el atributo que se suma (por ejemplo Fuerza +2)
  total: number;       // dado + modificador
  dificultad: number;  // la CD que había que igualar o superar
  exito: boolean;      // ¿lo conseguiste?
  critico: boolean;    // ¿salió un 20 natural?
  pifia: boolean;      // ¿salió un 1 natural?
}

/**
 * La regla central del juego: d20 + modificador >= dificultad.
 * Un 20 natural siempre acierta y un 1 natural siempre falla.
 */
export function tiradaContraDificultad(modificador: number, dificultad: number): ResultadoTirada {
  const dado = tirarDado(20);
  const total = dado + modificador;
  const critico = dado === 20;
  const pifia = dado === 1;

  // El orden importa: primero miramos los casos especiales.
  let exito: boolean;
  if (critico) {
    exito = true;
  } else if (pifia) {
    exito = false;
  } else {
    exito = total >= dificultad;
  }

  return { dado, modificador, total, dificultad, exito, critico, pifia };
}

/** Convierte un resultado en una frase para mostrar en pantalla. */
export function describirTirada(r: ResultadoTirada, atributo: string): string {
  const signo = r.modificador >= 0 ? "+" : "-";
  const cuenta = `d20 (${r.dado}) ${signo} ${Math.abs(r.modificador)} ${atributo} = ${r.total}  contra CD ${r.dificultad}`;
  if (r.critico) return `${cuenta}\n¡CRÍTICO! 20 natural.`;
  if (r.pifia) return `${cuenta}\n¡PIFIA! 1 natural.`;
  return `${cuenta}\n${r.exito ? "Éxito." : "Fallo."}`;
}

/**
 * Regla de D&D: un atributo tiene una PUNTUACIÓN (por ejemplo 15) y de
 * ella sale un MODIFICADOR, que es lo que se suma a la tirada.
 *   puntuación 10-11 -> +0,  12-13 -> +1,  14-15 -> +2,  8-9 -> -1 ...
 * Fórmula: (puntuación - 10) / 2, redondeando hacia abajo.
 */
export function modificador(puntuacion: number): number {
  return Math.floor((puntuacion - 10) / 2);
}
