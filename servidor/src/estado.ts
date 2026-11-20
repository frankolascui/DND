// ============================================================
// ESTADO DE LA SALA
// Lo que se define aquí con schema() se SINCRONIZA solo: cada vez
// que el servidor cambia un valor, Colyseus manda el cambio a todos
// los navegadores conectados. No hay que enviarlo a mano.
// ============================================================
import { schema, t, type SchemaType } from "@colyseus/schema";

export const Jugador = schema({
  nombre: t.string(),
  clase: t.string(),
  x: t.number(),
  y: t.number(),
  oro: t.number(),
  pociones: t.number(),
  pocionRecibida: t.boolean(),
  pistaRecibida: t.boolean(),
}, "Jugador");
export type Jugador = SchemaType<typeof Jugador>;

export const EstadoBosque = schema({
  // Un "map" es como un diccionario: clave (texto) -> valor.
  jugadores: t.map(Jugador),     // id de conexión -> jugador
  abiertos: t.map("boolean"),    // id de objeto -> ¿está abierto?
}, "EstadoBosque");
export type EstadoBosque = SchemaType<typeof EstadoBosque>;
