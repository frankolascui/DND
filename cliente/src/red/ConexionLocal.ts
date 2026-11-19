// ============================================================
// CONEXIÓN LOCAL (jugar solo, sin servidor)
// Usa exactamente las mismas reglas que el servidor
// (reglas/mundo.ts), pero aquí mismo, en el navegador.
// ============================================================
import type { Conexion, EventosConexion, RespuestaIntento, VistaJugador } from "./Conexion";
import { resolverIntento, type EstadoJugador } from "../reglas/mundo";
import { buscarObjeto } from "../mundo/objetos";
import type { Personaje } from "../reglas/personaje";

export class ConexionLocal implements Conexion {
  readonly modo = "solo";
  readonly miId = "yo";
  private abiertos = new Map<string, boolean>();
  private yo: VistaJugador;
  private eventos: EventosConexion | null = null;
  private personaje: Personaje;

  constructor(personaje: Personaje, x: number, y: number) {
    this.personaje = personaje;
    this.yo = {
      nombre: personaje.nombre, clase: personaje.clase.nombre, x, y,
      oro: 0, pociones: 0, pocionRecibida: false, pistaRecibida: false,
    };
  }

  escuchar(eventos: EventosConexion): void {
    this.eventos = eventos;
    eventos.alCambiarJugador(this.miId, this.yo);
  }

  mover(x: number, y: number): void {
    this.yo.x = x;
    this.yo.y = y;
  }

  async intentar(objetoId: string, accionId: string): Promise<RespuestaIntento> {
    const objeto = buscarObjeto(objetoId);
    if (!objeto) return { rechazado: "Eso no existe." };
    const intento = resolverIntento(objeto, accionId, this.personaje, this.abiertos, this.yo);
    if (!intento) return { rechazado: "Eso ya no se puede hacer." };

    // Igual que el servidor: aplicamos los cambios cuando el dado ya ha girado.
    setTimeout(() => {
      const estabaAbierto = this.abiertos.get(objetoId);
      intento.aplicar();
      if (!estabaAbierto && this.abiertos.get(objetoId)) this.eventos?.alAbrirObjeto(objetoId);
      this.eventos?.alCambiarJugador(this.miId, this.yo);
    }, 1600);
    return intento.resultado;
  }

  estaAbierto(objetoId: string): boolean {
    return this.abiertos.get(objetoId) === true;
  }

  miEstado(): EstadoJugador {
    return this.yo;
  }

  numeroJugadores(): number {
    return 1;
  }
}
