// ============================================================
// CLASES
// Datos de las 4 clases del MVP, basados en el SRD 5.2 de D&D
// (licencia CC-BY-4.0). Simplificado para el prototipo.
// ============================================================
import type { Atributo, Habilidad } from "./habilidades";
import type { Puntuaciones } from "./compraPorPuntos";

export type NombreClase = "Guerrero" | "Pícaro" | "Mago" | "Clérigo";

export interface DatosClase {
  nombre: NombreClase;
  descripcion: string;
  dadoDeGolpe: number;              // d10 -> 10
  atributoClave: Atributo;
  salvaciones: Atributo[];          // tiradas de salvación competentes
  habilidades: Habilidad[];         // habilidades competentes (fijas en el MVP)
  armadura: { base: number; maxDestreza: number }; // CA = base + DES (con tope)
  rasgo: string;
  recomendado: Puntuaciones;        // reparto sugerido (gasta los 27 puntos)
}

export const CLASES: DatosClase[] = [
  {
    nombre: "Guerrero",
    descripcion: "Aguanta golpes y los devuelve. Ideal para empezar.",
    dadoDeGolpe: 10,
    atributoClave: "fuerza",
    salvaciones: ["fuerza", "constitucion"],
    habilidades: ["Atletismo", "Intimidación"],
    armadura: { base: 16, maxDestreza: 0 },   // cota de malla
    rasgo: "Segundo aliento: recupera 1d10 + nivel PG una vez por descanso.",
    recomendado: { fuerza: 15, destreza: 13, constitucion: 14, inteligencia: 8, sabiduria: 12, carisma: 10 },
  },
  {
    nombre: "Pícaro",
    descripcion: "Sigilo, cerraduras y golpes certeros.",
    dadoDeGolpe: 8,
    atributoClave: "destreza",
    salvaciones: ["destreza", "inteligencia"],
    habilidades: ["Juego de manos", "Sigilo", "Percepción", "Engaño"],
    armadura: { base: 11, maxDestreza: 10 },  // armadura de cuero
    rasgo: "Ataque furtivo: +1d6 de daño con ventaja o con un aliado al lado.",
    recomendado: { fuerza: 8, destreza: 15, constitucion: 14, inteligencia: 12, sabiduria: 10, carisma: 13 },
  },
  {
    nombre: "Mago",
    descripcion: "Frágil, pero domina la magia arcana.",
    dadoDeGolpe: 6,
    atributoClave: "inteligencia",
    salvaciones: ["inteligencia", "sabiduria"],
    habilidades: ["Arcanos", "Investigación"],
    armadura: { base: 10, maxDestreza: 10 },  // sin armadura
    rasgo: "Conjuros de mago: 2 espacios de nivel 1.",
    recomendado: { fuerza: 8, destreza: 14, constitucion: 13, inteligencia: 15, sabiduria: 12, carisma: 10 },
  },
  {
    nombre: "Clérigo",
    descripcion: "Cura y protege al grupo con magia divina.",
    dadoDeGolpe: 8,
    atributoClave: "sabiduria",
    salvaciones: ["sabiduria", "carisma"],
    habilidades: ["Medicina", "Perspicacia"],
    armadura: { base: 14, maxDestreza: 2 },   // cota de escamas
    rasgo: "Conjuros de clérigo, incluida curación.",
    recomendado: { fuerza: 14, destreza: 8, constitucion: 13, inteligencia: 10, sabiduria: 15, carisma: 12 },
  },
];
