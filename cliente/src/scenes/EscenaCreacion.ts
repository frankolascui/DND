// ============================================================
// ESCENA DE CREACIÓN DE PERSONAJE
// Controles: W/S para cambiar de fila, A/D para cambiar el valor,
// E para empezar. Cada vez que algo cambia, volvemos a calcular
// el personaje y redibujamos todo (así nunca se desincroniza).
// ============================================================
import Phaser from "phaser";
import { CLASES } from "../reglas/clases";
import { ORIGENES } from "../reglas/origenes";
import { ATRIBUTOS, ABREVIATURA } from "../reglas/habilidades";
import {
  type Puntuaciones, PUNTOS_TOTALES, costeDe, puntosRestantes, puedeSubir, puedeBajar,
} from "../reglas/compraPorPuntos";
import { crearPersonaje } from "../reglas/personaje";
import { modificador } from "../reglas/dados";

const NOMBRES = ["Aren", "Brisa", "Coral", "Dain", "Eira", "Fenn"];

// Las filas del menú, en orden. Las de atributos usan el nombre del atributo.
type Fila = "nombre" | "clase" | "origen" | (typeof ATRIBUTOS)[number] | "empezar";
const FILAS: Fila[] = ["nombre", "clase", "origen", ...ATRIBUTOS, "empezar"];

function conSigno(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export class EscenaCreacion extends Phaser.Scene {
  private fila = 0;
  private indiceNombre = 0;
  private indiceClase = 0;
  private indiceOrigen = 0;
  private puntuaciones!: Puntuaciones;
  private aviso = "";

  private textoIzquierda!: Phaser.GameObjects.Text;
  private textoDerecha!: Phaser.GameObjects.Text;
  private teclas!: Record<"W" | "A" | "S" | "D" | "E", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("EscenaCreacion");
  }

  create(): void {
    // Empezamos con el reparto recomendado de la primera clase.
    this.puntuaciones = { ...CLASES[this.indiceClase].recomendado };

    this.add.text(320, 14, "Crea tu personaje", { fontSize: "22px", color: "#ffd84a" }).setOrigin(0.5, 0);
    this.add.text(320, 452, "W/S: fila · A/D: cambiar · E: empezar", { fontSize: "12px", color: "#bbbbbb" }).setOrigin(0.5, 0);
    this.textoIzquierda = this.add.text(24, 56, "", { fontSize: "14px", color: "#ffffff", lineSpacing: 8 });
    this.textoDerecha = this.add.text(340, 56, "", {
      fontSize: "12px", color: "#dddddd", lineSpacing: 4, wordWrap: { width: 280 },
    });

    this.teclas = this.input.keyboard!.addKeys("W,A,S,D,E") as typeof this.teclas;
    this.dibujar();
  }

  update(): void {
    const J = Phaser.Input.Keyboard.JustDown;
    if (J(this.teclas.W)) this.moverFila(-1);
    if (J(this.teclas.S)) this.moverFila(1);
    if (J(this.teclas.A)) this.cambiarValor(-1);
    if (J(this.teclas.D)) this.cambiarValor(1);
    if (J(this.teclas.E)) this.empezar();
  }

  private moverFila(direccion: number): void {
    this.fila = (this.fila + direccion + FILAS.length) % FILAS.length;
    this.aviso = "";
    this.dibujar();
  }

  /** A = -1, D = +1. Lo que cambia depende de la fila en la que estés. */
  private cambiarValor(delta: number): void {
    const fila = FILAS[this.fila];
    const ciclo = (i: number, n: number) => (i + delta + n) % n;

    if (fila === "nombre") {
      this.indiceNombre = ciclo(this.indiceNombre, NOMBRES.length);
    } else if (fila === "clase") {
      this.indiceClase = ciclo(this.indiceClase, CLASES.length);
      // Al cambiar de clase cargamos su reparto recomendado.
      this.puntuaciones = { ...CLASES[this.indiceClase].recomendado };
    } else if (fila === "origen") {
      this.indiceOrigen = ciclo(this.indiceOrigen, ORIGENES.length);
    } else if (fila !== "empezar") {
      // Es un atributo: subir o bajar respetando la compra por puntos.
      if (delta > 0 && puedeSubir(this.puntuaciones, fila)) this.puntuaciones[fila] += 1;
      if (delta < 0 && puedeBajar(this.puntuaciones, fila)) this.puntuaciones[fila] -= 1;
    }
    this.aviso = "";
    this.dibujar();
  }

  private empezar(): void {
    if (FILAS[this.fila] !== "empezar") {
      this.aviso = "Baja hasta \"Empezar aventura\" y pulsa E.";
      this.dibujar();
      return;
    }
    const personaje = this.personajeActual();
    // Pasamos el personaje a la otra escena como "datos de inicio".
    this.scene.start("EscenaJuego", { personaje });
  }

  private personajeActual() {
    return crearPersonaje(NOMBRES[this.indiceNombre], CLASES[this.indiceClase], ORIGENES[this.indiceOrigen], this.puntuaciones);
  }

  private dibujar(): void {
    const p = this.personajeActual();
    const cursor = (f: Fila) => (FILAS[this.fila] === f ? "▶ " : "  ");

    const lineas: string[] = [];
    lineas.push(`${cursor("nombre")}Nombre:  ◀ ${p.nombre} ▶`);
    lineas.push(`${cursor("clase")}Clase:   ◀ ${p.clase.nombre} ▶`);
    lineas.push(`${cursor("origen")}Origen:  ◀ ${p.origen.nombre} ▶`);
    lineas.push("");
    lineas.push(`  Puntos: ${puntosRestantes(this.puntuaciones)} de ${PUNTOS_TOTALES} libres`);
    for (const a of ATRIBUTOS) {
      const v = this.puntuaciones[a];
      const clave = a === p.clase.atributoClave ? " ★" : "";
      lineas.push(`${cursor(a)}${ABREVIATURA[a]}  ${String(v).padStart(2)}  (${conSigno(modificador(v))})  coste ${costeDe(v)}${clave}`);
    }
    lineas.push("");
    lineas.push(`${cursor("empezar")}[ Empezar aventura ]`);
    if (this.aviso) lineas.push("", this.aviso);
    this.textoIzquierda.setText(lineas.join("\n"));

    this.textoDerecha.setText([
      `${p.clase.nombre}: ${p.clase.descripcion}`,
      `Dado de golpe d${p.clase.dadoDeGolpe} · ★ = atributo clave`,
      `Rasgo: ${p.clase.rasgo}`,
      "",
      `${p.origen.nombre}: ${p.origen.descripcion}`,
      `Característica: ${p.origen.caracteristica}`,
      "",
      `PG: ${p.pgMaximos}   CA: ${p.ca}   Vidas: ${p.vidas}`,
      "",
      "Competente en (+2):",
      p.competencias.join(", "),
    ].join("\n"));
  }
}
