// ============================================================
// CONECTAR
// Intenta entrar en el servidor. Si no hay servidor (por ejemplo
// en GitHub Pages) o tarda demasiado, juega en modo solo.
// ============================================================
import { Client } from "@colyseus/sdk";
import type { Conexion } from "./Conexion";
import { ConexionLocal } from "./ConexionLocal";
import { ConexionOnline } from "./ConexionOnline";
import { eleccionDe, type Personaje } from "../reglas/personaje";

/**
 * Dirección del servidor:
 *  - si al construir se define VITE_SERVIDOR_URL, se usa esa;
 *  - si estás en localhost (programando), ws://localhost:2567;
 *  - si no, no hay servidor y se juega solo.
 */
function urlServidor(): string | null {
  const configurada = import.meta.env.VITE_SERVIDOR_URL as string | undefined;
  if (configurada) return configurada;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "ws://localhost:2567";
  return null;
}

/** Espera como mucho `ms` milisegundos; si no, falla. */
function conLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, fallar) => setTimeout(() => fallar(new Error("Tiempo agotado")), ms)),
  ]);
}

export async function conectar(personaje: Personaje, x: number, y: number): Promise<Conexion> {
  const url = urlServidor();
  if (url) {
    try {
      const cliente = new Client(url);
      const sala = await conLimite(cliente.joinOrCreate("bosque", { eleccion: eleccionDe(personaje), x, y }), 3000);
      return new ConexionOnline(sala);
    } catch (error) {
      // "try/catch": si algo de dentro del try falla, saltamos aquí en vez de romper el juego.
      console.warn("No se pudo conectar al servidor; se juega en modo solo.", error);
    }
  }
  return new ConexionLocal(personaje, x, y);
}
