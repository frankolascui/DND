// ============================================================
// ORÍGENES
// Lo que hacía tu personaje antes de ser aventurero. Da dos
// habilidades competentes y una pequeña característica.
// Nombres propios del juego.
// ============================================================
import type { Habilidad } from "./habilidades";

export interface DatosOrigen {
  nombre: string;
  descripcion: string;
  habilidades: Habilidad[];
  caracteristica: string;
}

export const ORIGENES: DatosOrigen[] = [
  {
    nombre: "Leñador",
    descripcion: "Creciste talando el bosque.",
    habilidades: ["Atletismo", "Supervivencia"],
    caracteristica: "Conoces los senderos: ves atajos en el bosque.",
  },
  {
    nombre: "Contrabandista",
    descripcion: "Moviste mercancía donde nadie miraba.",
    habilidades: ["Juego de manos", "Engaño"],
    caracteristica: "Sabes dónde se esconden las cosas de valor.",
  },
  {
    nombre: "Acólito",
    descripcion: "Serviste en un santuario.",
    habilidades: ["Religión", "Persuasión"],
    caracteristica: "Los santuarios te curan un poco más al descansar.",
  },
];
