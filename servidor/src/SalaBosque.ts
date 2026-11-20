// ============================================================
// SALA DEL BOSQUE
// Una "sala" (room) es una partida. Hasta 4 jugadores comparten
// la misma sala y ven el mismo mundo. El servidor es la autoridad:
// él tira los dados y decide qué cambia.
// ============================================================
import { Room, type Client } from "colyseus";
import { EstadoBosque, Jugador } from "./estado.ts";
import { personajeDesdeEleccion, type Eleccion, type Personaje } from "../../cliente/src/reglas/personaje.ts";
import { resolverIntento } from "../../cliente/src/reglas/mundo.ts";
import { buscarObjeto } from "../../cliente/src/mundo/objetos.ts";
import { ANCHO_MUNDO, ALTO_MUNDO, INICIO, aPixel } from "../../cliente/src/mundo/mapa.ts";

const DISTANCIA_MAXIMA = 60;   // un poco más que en el cliente, por el retraso de red
const RETRASO_EFECTO = 1600;   // ms: lo que tarda el dado en girar en pantalla

export class SalaBosque extends Room<{ state: EstadoBosque }> {
  maxClients = 4;
  state = new EstadoBosque();

  // Los personajes completos se quedan SOLO en el servidor (no se sincronizan).
  private personajes = new Map<string, Personaje>();

  onCreate(): void {
    // El cliente avisa de dónde está. Comprobamos que sean números dentro del mapa.
    this.onMessage("mover", (client, datos: { x: number; y: number }) => {
      const jugador = this.state.jugadores.get(client.sessionId);
      if (!jugador) return;
      if (!Number.isFinite(datos?.x) || !Number.isFinite(datos?.y)) return;
      jugador.x = Math.max(0, Math.min(ANCHO_MUNDO, datos.x));
      jugador.y = Math.max(0, Math.min(ALTO_MUNDO, datos.y));
    });

    // El cliente pide intentar una acción. AQUÍ se tira el dado.
    this.onMessage("intentar", (client, datos: { objetoId: string; accionId: string }) => {
      this.intentar(client, datos);
    });
  }

  // Se ejecuta cuando alguien entra. `opciones` es lo que envió el cliente al unirse.
  onJoin(client: Client, opciones: { eleccion: Eleccion; x: number; y: number }): void {
    const personaje = personajeDesdeEleccion(opciones?.eleccion);
    if (!personaje) {
      // Personaje que no cumple las reglas: lo echamos.
      throw new Error("Personaje no válido");
    }
    this.personajes.set(client.sessionId, personaje);

    const jugador = new Jugador();
    jugador.nombre = personaje.nombre;
    jugador.clase = personaje.clase.nombre;
    jugador.x = Number(opciones.x) || aPixel(INICIO.columna);
    jugador.y = Number(opciones.y) || aPixel(INICIO.fila);
    jugador.oro = 0;
    jugador.pociones = 0;
    jugador.pocionRecibida = false;
    jugador.pistaRecibida = false;
    this.state.jugadores.set(client.sessionId, jugador);
    console.log(`${personaje.nombre} (${personaje.clase.nombre}) entra en el bosque`);
  }

  onLeave(client: Client): void {
    this.state.jugadores.delete(client.sessionId);
    this.personajes.delete(client.sessionId);
  }

  private intentar(client: Client, datos: { objetoId: string; accionId: string }): void {
    const jugador = this.state.jugadores.get(client.sessionId);
    const personaje = this.personajes.get(client.sessionId);
    const objeto = buscarObjeto(datos?.objetoId);
    const rechazar = (motivo: string) => client.send("resultado", { rechazado: motivo });

    if (!jugador || !personaje || !objeto) return rechazar("Eso no existe.");

    // Anti-trampas: ¿de verdad estás al lado del objeto?
    const distancia = Math.hypot(jugador.x - aPixel(objeto.columna), jugador.y - aPixel(objeto.fila));
    if (distancia > DISTANCIA_MAXIMA) return rechazar("Estás demasiado lejos.");

    const intento = resolverIntento(objeto, datos.accionId, personaje, this.state.abiertos, jugador);
    if (!intento) return rechazar("Eso ya no se puede hacer.");

    // 1) Le mandamos el resultado al jugador para que su dado gire hasta ese número.
    client.send("resultado", intento.resultado);
    // 2) Cuando el dado ya se ha parado en su pantalla, cambiamos el mundo para todos.
    this.clock.setTimeout(intento.aplicar, RETRASO_EFECTO);
  }
}
