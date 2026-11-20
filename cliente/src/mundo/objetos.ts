// ============================================================
// OBJETOS DEL MUNDO
// Todo lo que hay en el bosque con lo que se puede interactuar,
// escrito como DATOS. Lo leen el cliente (para dibujarlos y
// mostrar el menú) y el servidor (para validar y tirar dados).
// ============================================================
import type { ObjetoMundo } from "../reglas/mundo";

export const OBJETOS: ObjetoMundo[] = [
  {
    id: "cofre-1", nombre: "Cofre pequeño", tipo: "cofre", columna: 5, fila: 3, oro: 5,
    acciones: [
      { id: "forzar", texto: "Forzar la tapa", habilidad: "Atletismo", dificultad: 10, efecto: "abrir",
        mensajeExito: "¡Crac! Dentro hay 5 monedas de oro.", mensajeFallo: "La tapa no cede." },
      { id: "cerradura", texto: "Abrir la cerradura", habilidad: "Juego de manos", dificultad: 8, efecto: "abrir",
        mensajeExito: "Clic. Dentro hay 5 monedas de oro.", mensajeFallo: "La ganzúa resbala." },
    ],
  },
  {
    id: "cofre-2", nombre: "Cofre pequeño", tipo: "cofre", columna: 33, fila: 4, oro: 15,
    acciones: [
      { id: "forzar", texto: "Forzar la tapa", habilidad: "Atletismo", dificultad: 14, efecto: "abrir",
        mensajeExito: "¡Crac! Dentro hay 15 monedas de oro.", mensajeFallo: "La tapa no cede." },
      { id: "cerradura", texto: "Abrir la cerradura", habilidad: "Juego de manos", dificultad: 12, efecto: "abrir",
        mensajeExito: "Clic. Dentro hay 15 monedas de oro.", mensajeFallo: "La ganzúa resbala." },
    ],
  },
  {
    id: "cofre-3", nombre: "Cofre pesado", tipo: "cofre", columna: 35, fila: 24, oro: 40,
    acciones: [
      { id: "forzar", texto: "Forzar la tapa", habilidad: "Atletismo", dificultad: 16, efecto: "abrir",
        mensajeExito: "¡Crac! Dentro hay 40 monedas de oro.", mensajeFallo: "La tapa no cede." },
      { id: "cerradura", texto: "Abrir la cerradura", habilidad: "Juego de manos", dificultad: 14, efecto: "abrir",
        mensajeExito: "Clic. Dentro hay 40 monedas de oro.", mensajeFallo: "La ganzúa resbala." },
    ],
  },
  {
    id: "puerta-1", nombre: "Puerta de madera atrancada", tipo: "puerta", columna: 31, fila: 24,
    acciones: [
      { id: "empujar", texto: "Empujar con el hombro", habilidad: "Atletismo", dificultad: 13, efecto: "abrir",
        mensajeExito: "La puerta se abre de golpe.", mensajeFallo: "Te duele el hombro." },
      { id: "mecanismo", texto: "Buscar un mecanismo", habilidad: "Investigación", dificultad: 13, efecto: "abrir",
        mensajeExito: "Encuentras el pestillo oculto.", mensajeFallo: "No ves nada raro." },
    ],
  },
  {
    id: "ermitano", nombre: "El ermitaño", tipo: "pnj", columna: 12, fila: 4,
    acciones: [
      { id: "pedir", texto: "Pedirle ayuda", habilidad: "Persuasión", dificultad: 12, efecto: "pocion",
        mensajeExito: "\"Toma, una poción. Cuídate en el bosque.\"", mensajeFallo: "\"No me fío de ti. Vuelve más tarde.\"" },
      { id: "amenazar", texto: "Amenazarle", habilidad: "Intimidación", dificultad: 14, efecto: "pocion",
        mensajeExito: "Te da una poción temblando. No le has caído bien.", mensajeFallo: "Se ríe de ti." },
      { id: "leer", texto: "Leerle las intenciones", habilidad: "Perspicacia", dificultad: 10, efecto: "pista",
        mensajeExito: "Mira de reojo al sureste: tras la puerta hay algo valioso.", mensajeFallo: "No sabes qué piensa." },
    ],
  },
];

export function buscarObjeto(id: string): ObjetoMundo | undefined {
  return OBJETOS.find((o) => o.id === id);
}
