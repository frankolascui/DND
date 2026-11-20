// ============================================================
// CONEXIÓN ONLINE (servidor Colyseus)
// Colyseus nos mantiene una copia del estado del servidor
// (room.state) y nos avisa de cada cambio con "callbacks".
// ============================================================
import { Callbacks, type Room } from "@colyseus/sdk";
import type { Conexion, EventosConexion, RespuestaIntento, VistaJugador } from "./Conexion";
import type { EstadoJugador } from "../reglas/mundo";

export class ConexionOnline implements Conexion {
  readonly modo = "online";
  private sala: Room;
  // Si hay una tirada esperando respuesta, aquí guardamos cómo "resolver" su promesa.
  private esperandoResultado: ((r: RespuestaIntento) => void) | null = null;

  constructor(sala: Room) {
    this.sala = sala;
    // El servidor nos contesta a cada "intentar" con un mensaje "resultado".
    sala.onMessage("resultado", (respuesta: RespuestaIntento) => {
      this.esperandoResultado?.(respuesta);
      this.esperandoResultado = null;
    });
  }

  get miId(): string {
    return this.sala.sessionId;
  }

  escuchar(eventos: EventosConexion): void {
    const cb = Callbacks.get(this.sala);

    // Cada vez que se añade un jugador a la sala...
    // (El SDK no conoce la forma de nuestro estado, así que le decimos con "as" qué es cada cosa.)
    cb.onAdd("jugadores", (valor, clave) => {
      const jugador = valor as VistaJugador;
      const id = clave as string;
      eventos.alCambiarJugador(id, jugador);
      // ...y cada vez que cambia cualquiera de sus campos.
      cb.onChange(jugador, () => eventos.alCambiarJugador(id, jugador));
    });
    cb.onRemove("jugadores", (_valor, clave) => eventos.alQuitarJugador(clave as string));

    cb.onAdd("abiertos", (_valor, clave) => eventos.alAbrirObjeto(clave as string));
  }

  mover(x: number, y: number): void {
    this.sala.send("mover", { x, y });
  }

  intentar(objetoId: string, accionId: string): Promise<RespuestaIntento> {
    // Una Promise es "un valor que llegará más tarde". La resolvemos cuando
    // llegue el mensaje "resultado" del servidor.
    return new Promise((resolver) => {
      this.esperandoResultado = resolver;
      this.sala.send("intentar", { objetoId, accionId });
    });
  }

  estaAbierto(objetoId: string): boolean {
    return this.sala.state.abiertos?.get(objetoId) === true;
  }

  miEstado(): EstadoJugador {
    const yo = this.sala.state.jugadores?.get(this.miId);
    return yo ?? { oro: 0, pociones: 0, pocionRecibida: false, pistaRecibida: false };
  }

  numeroJugadores(): number {
    return this.sala.state.jugadores?.size ?? 1;
  }
}
