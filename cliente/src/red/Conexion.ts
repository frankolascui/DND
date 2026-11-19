// ============================================================
// CONEXIÓN
// La escena no sabe si está jugando sola o contra un servidor:
// habla con un objeto que cumple esta interface. Hay dos versiones:
//   - ConexionLocal:  todo ocurre en tu navegador (GitHub Pages)
//   - ConexionOnline: habla con el servidor Colyseus
// Cambiar una por otra no obliga a tocar la escena. Esto se llama
// "programar contra una interface" (polimorfismo).
// ============================================================
import type { EstadoJugador, ResultadoIntento } from "../reglas/mundo";

/** Lo que la escena necesita saber de cada jugador para dibujarlo. */
export interface VistaJugador extends EstadoJugador {
  nombre: string;
  clase: string;
  x: number;
  y: number;
}

/** O un resultado, o un motivo de rechazo. */
export type RespuestaIntento = ResultadoIntento | { rechazado: string };

/** Avisos que la conexión le da a la escena cuando algo cambia. */
export interface EventosConexion {
  alCambiarJugador: (id: string, jugador: VistaJugador) => void;
  alQuitarJugador: (id: string) => void;
  alAbrirObjeto: (objetoId: string) => void;
}

export interface Conexion {
  readonly modo: "solo" | "online";
  readonly miId: string;
  escuchar(eventos: EventosConexion): void;
  mover(x: number, y: number): void;
  intentar(objetoId: string, accionId: string): Promise<RespuestaIntento>;
  estaAbierto(objetoId: string): boolean;
  miEstado(): EstadoJugador;
  numeroJugadores(): number;
}
