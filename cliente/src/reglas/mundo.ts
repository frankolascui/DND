// ============================================================
// REGLAS DEL MUNDO
// Qué acciones se pueden intentar y qué pasa si salen bien.
// Este archivo lo usan el SERVIDOR (que es quien manda) y el
// cliente cuando juegas solo, sin servidor. Al ser el mismo
// código en los dos sitios, las reglas no pueden diferir.
// ============================================================
import type { Habilidad } from "./habilidades";
import { bonoHabilidad, type Personaje } from "./personaje";
import { tiradaContraDificultad, type ResultadoTirada } from "./dados";

export type Efecto = "abrir" | "pocion" | "pista";

export interface Accion {
  id: string;
  texto: string;
  habilidad: Habilidad;
  dificultad: number;
  efecto: Efecto;
  mensajeExito: string;
  mensajeFallo: string;
}

export interface ObjetoMundo {
  id: string;
  nombre: string;
  tipo: "cofre" | "puerta" | "pnj";
  columna: number;
  fila: number;
  oro?: number; // el "?" significa que este campo es opcional
  acciones: Accion[];
}

/** Lo que el mundo recuerda de cada jugador. */
export interface EstadoJugador {
  oro: number;
  pociones: number;
  pocionRecibida: boolean;
  pistaRecibida: boolean;
}

/**
 * Qué objetos están abiertos. Basta con que tenga get y set:
 * así sirve un Map normal (modo solo) y un MapSchema de Colyseus
 * (servidor). Esto es una interface usada como "contrato".
 */
export interface Abiertos {
  get(id: string): boolean | undefined;
  set(id: string, valor: boolean): unknown;
}

/** Las acciones que tiene sentido intentar AHORA con este objeto. */
export function accionesDisponibles(objeto: ObjetoMundo, abiertos: Abiertos, jugador: EstadoJugador): Accion[] {
  if (objeto.tipo !== "pnj") {
    return abiertos.get(objeto.id) ? [] : objeto.acciones;
  }
  return objeto.acciones.filter((a) => {
    if (a.efecto === "pocion") return !jugador.pocionRecibida;
    if (a.efecto === "pista") return !jugador.pistaRecibida;
    return true;
  });
}

export interface ResultadoIntento {
  objetoId: string;
  accionId: string;
  tirada: ResultadoTirada;
  mensaje: string;
}

/**
 * Tira el dado para una acción. Devuelve el resultado y, aparte,
 * una función `aplicar` que hace los cambios en el mundo. Las
 * separamos para poder aplicarlos cuando el dado termine de girar.
 * Si la acción no está disponible, devuelve null.
 */
export function resolverIntento(
  objeto: ObjetoMundo, accionId: string, personaje: Personaje, abiertos: Abiertos, jugador: EstadoJugador,
): { resultado: ResultadoIntento; aplicar: () => void } | null {
  const accion = accionesDisponibles(objeto, abiertos, jugador).find((a) => a.id === accionId);
  if (!accion) return null;

  const tirada = tiradaContraDificultad(bonoHabilidad(personaje, accion.habilidad), accion.dificultad);
  const resultado: ResultadoIntento = {
    objetoId: objeto.id,
    accionId,
    tirada,
    mensaje: tirada.exito ? accion.mensajeExito : accion.mensajeFallo,
  };

  const aplicar = () => {
    if (!tirada.exito) return;
    // Volvemos a comprobar: quizá otro jugador abrió el cofre mientras giraba el dado.
    if (accion.efecto === "abrir") {
      if (abiertos.get(objeto.id)) return;
      abiertos.set(objeto.id, true);
      jugador.oro += objeto.oro ?? 0; // "??" = si no hay oro, usa 0
    } else if (accion.efecto === "pocion") {
      jugador.pociones += 1;
      jugador.pocionRecibida = true;
    } else if (accion.efecto === "pista") {
      jugador.pistaRecibida = true;
    }
  };

  return { resultado, aplicar };
}
