// ============================================================
// MENÚ DE ACCIONES
// Una lista de opciones que se recorre con W/S y se elige con E.
// Es como vamos a respetar la regla "solo WASD + interactuar":
// en lugar de muchos botones, un menú. En la fase 3 este mismo
// menú servirá para elegir la acción en combate.
// ============================================================
import Phaser from "phaser";

export interface OpcionMenu {
  texto: string;         // lo que se ve, por ejemplo "Forzar (Atletismo +4)"
  alElegir: () => void;  // qué pasa al pulsar E sobre ella
}

export class MenuAcciones {
  private escena: Phaser.Scene;
  private opciones: OpcionMenu[] = [];
  private seleccion = 0;   // índice de la opción marcada
  private activo = false;
  private fondo: Phaser.GameObjects.Rectangle;
  private titulo: Phaser.GameObjects.Text;
  private lineas: Phaser.GameObjects.Text;

  constructor(escena: Phaser.Scene) {
    this.escena = escena;
    const { width, height } = escena.scale;
    this.fondo = escena.add.rectangle(width / 2, height - 90, 560, 140, 0x000000, 0.8)
      .setStrokeStyle(2, 0xe9dcff).setDepth(25000).setScrollFactor(0);
    this.titulo = escena.add.text(width / 2, height - 152, "", { fontSize: "15px", color: "#ffd84a" })
      .setOrigin(0.5, 0).setDepth(25001).setScrollFactor(0);
    this.lineas = escena.add.text(width / 2 - 262, height - 128, "", { fontSize: "14px", color: "#ffffff", lineSpacing: 6 })
      .setDepth(25001).setScrollFactor(0);
    this.cerrar();
  }

  estaActivo(): boolean {
    return this.activo;
  }

  abrir(titulo: string, opciones: OpcionMenu[]): void {
    this.opciones = opciones;
    this.seleccion = 0;
    this.activo = true;
    this.titulo.setText(titulo + "   (W/S elegir · E aceptar)");
    for (const o of [this.fondo, this.titulo, this.lineas]) o.setVisible(true);
    this.dibujar();
  }

  cerrar(): void {
    this.activo = false;
    for (const o of [this.fondo, this.titulo, this.lineas]) o.setVisible(false);
  }

  /** Mueve la selección: -1 arriba, +1 abajo. Da la vuelta al llegar al final. */
  mover(direccion: number): void {
    const n = this.opciones.length;
    // El "% n" (resto de dividir) hace que de la última se pase a la primera.
    this.seleccion = (this.seleccion + direccion + n) % n;
    this.dibujar();
  }

  elegir(): void {
    const opcion = this.opciones[this.seleccion];
    this.cerrar();          // primero cerramos, por si la opción abre otra cosa
    opcion.alElegir();
  }

  private dibujar(): void {
    const texto = this.opciones
      .map((o, i) => (i === this.seleccion ? "▶ " : "   ") + o.texto)
      .join("\n");
    this.lineas.setText(texto);
  }
}
