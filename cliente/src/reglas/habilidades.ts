// ============================================================
// HABILIDADES (skills) de D&D
// Cada habilidad depende de un atributo. Si eres "competente" en
// ella, sumas además tu bonificador de competencia.
// ============================================================

// "keyof" + "typeof" no hacen falta aquí: escribimos la lista a mano
// para que se lea bien.
export type Atributo = "fuerza" | "destreza" | "constitucion" | "inteligencia" | "sabiduria" | "carisma";

export const ATRIBUTOS: Atributo[] = ["fuerza", "destreza", "constitucion", "inteligencia", "sabiduria", "carisma"];

// Abreviaturas para mostrar en pantalla.
export const ABREVIATURA: Record<Atributo, string> = {
  fuerza: "FUE",
  destreza: "DES",
  constitucion: "CON",
  inteligencia: "INT",
  sabiduria: "SAB",
  carisma: "CAR",
};

export type Habilidad =
  | "Atletismo"
  | "Acrobacias" | "Juego de manos" | "Sigilo"
  | "Arcanos" | "Historia" | "Investigación" | "Naturaleza" | "Religión"
  | "Medicina" | "Percepción" | "Perspicacia" | "Supervivencia" | "Trato con animales"
  | "Engaño" | "Interpretación" | "Intimidación" | "Persuasión";

// Record<A, B> = "un objeto cuyas claves son A y cuyos valores son B".
// TypeScript comprueba que no falte ninguna habilidad.
export const ATRIBUTO_DE: Record<Habilidad, Atributo> = {
  "Atletismo": "fuerza",
  "Acrobacias": "destreza",
  "Juego de manos": "destreza",
  "Sigilo": "destreza",
  "Arcanos": "inteligencia",
  "Historia": "inteligencia",
  "Investigación": "inteligencia",
  "Naturaleza": "inteligencia",
  "Religión": "inteligencia",
  "Medicina": "sabiduria",
  "Percepción": "sabiduria",
  "Perspicacia": "sabiduria",
  "Supervivencia": "sabiduria",
  "Trato con animales": "sabiduria",
  "Engaño": "carisma",
  "Interpretación": "carisma",
  "Intimidación": "carisma",
  "Persuasión": "carisma",
};
