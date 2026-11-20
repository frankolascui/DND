// ============================================================
// DADO VISUAL
// Un d20 que aparece en el centro de la pantalla. El jugador lo
// "lanza" pulsando E (o haciendo clic) y gira hasta pararse.
//
// MUY IMPORTANTE: este archivo NO decide el resultado. El número
// lo decide el servidor (o las reglas, si juegas solo) y aquí solo
// se anima: el servidor dice "salió un 14" y el dado gira hasta el 14.
// ============================================================
import Phaser from "phaser";

// En qué momento está el dado. Es una "máquina de estados" sencilla:
//   oculto -> esperando -> girando -> resultado -> oculto
type EstadoDado = "oculto" | "esperando" | "girando" | "resultado";

// Lo que devuelve quien pide la tirada: el número, el texto a mostrar
// y (opcional) qué hacer cuando el dado se pare.
export interface ResultadoVisual {
  valor: number | null; // null = no hubo tirada (por ejemplo, el servidor la rechazó)
  texto: string;
  color: string;
  alRevelar?: () => void;
}

const RADIO = 56;            // tamaño del dado en píxeles
const DURACION_GIRO = 1400;  // milisegundos que dura el giro

export class DadoVisual {
  private escena: Phaser.Scene;
  private estado: EstadoDado = "oculto";
  private tirar: (() => Promise<ResultadoVisual>) | null = null;

  // Piezas que se dibujan
  private velo: Phaser.GameObjects.Rectangle;   // oscurece el fondo
  private dado: Phaser.GameObjects.Container;   // el dado (forma + número)
  private numero: Phaser.GameObjects.Text;
  private titulo: Phaser.GameObjects.Text;
  private explicacion: Phaser.GameObjects.Text;

  constructor(escena: Phaser.Scene) {
    this.escena = escena;
    const { width, height } = escena.scale;
    const cx = width / 2;
    const cy = height / 2 - 20;

    this.velo = escena.add.rectangle(cx, height / 2, width, height, 0x000000, 0.55);

    // El dado es un "Container": un grupo de objetos que se mueven y giran juntos.
    const forma = escena.add.graphics();
    this.dibujarD20(forma);
    this.numero = escena.add.text(0, 4, "20", {
      fontSize: "30px", fontStyle: "bold", color: "#ffffff",
    }).setOrigin(0.5);
    this.dado = escena.add.container(cx, cy, [forma, this.numero]);

    // Se puede hacer clic en el dado, además de pulsar E.
    this.dado.setSize(RADIO * 2, RADIO * 2).setInteractive({ useHandCursor: true });
    this.dado.on("pointerdown", () => this.pulsar());

    this.titulo = escena.add.text(cx, cy - RADIO - 34, "", {
      fontSize: "16px", color: "#ffffff", align: "center",
    }).setOrigin(0.5);
    this.explicacion = escena.add.text(cx, cy + RADIO + 20, "", {
      fontSize: "14px", color: "#ffffff", align: "center",
      backgroundColor: "#000000bb", padding: { x: 8, y: 6 },
    }).setOrigin(0.5, 0);

    // Que siempre se dibuje por encima de todo lo demás.
    // Por encima de todo y pegado a la pantalla (no se mueve con la cámara).
    for (const obj of [this.velo, this.dado, this.titulo, this.explicacion]) {
      obj.setDepth(30000).setScrollFactor(0);
    }
    this.ocultar();
  }

  /** ¿Está el dado en pantalla? Mientras lo esté, el jugador no se mueve. */
  estaActivo(): boolean {
    return this.estado !== "oculto";
  }

  /**
   * Muestra el dado esperando a que el jugador lo lance.
   * `tirar` es una función que se ejecutará en el momento del lanzamiento.
   * Devuelve una Promise porque el resultado puede tardar (viene del servidor).
   */
  mostrar(titulo: string, tirar: () => Promise<ResultadoVisual>): void {
    this.tirar = tirar;
    this.estado = "esperando";
    this.titulo.setText(titulo);
    this.explicacion.setText("Pulsa E o haz clic en el dado para lanzarlo").setColor("#ffffff");
    this.numero.setText("?").setColor("#ffffff");
    this.dado.setRotation(0).setScale(1);
    for (const obj of [this.velo, this.dado, this.titulo, this.explicacion]) {
      obj.setVisible(true);
    }
    // Un pequeño "latido" para invitar a pulsar.
    this.escena.tweens.add({
      targets: this.dado, scale: 1.08, duration: 450, yoyo: true, repeat: -1, ease: "Sine.InOut",
    });
  }

  /** Lo llama la escena cuando se pulsa E. Hace algo distinto según el estado. */
  pulsar(): void {
    if (this.estado === "esperando") {
      this.girar();
    } else if (this.estado === "resultado") {
      this.ocultar();
    }
    // Si está girando, ignoramos la pulsación: hay que esperar a que pare.
  }

  // "async" permite usar "await": esperar a que llegue el resultado sin congelar el juego.
  private async girar(): Promise<void> {
    if (!this.tirar) return;
    this.estado = "girando";
    this.escena.tweens.killTweensOf(this.dado); // paramos el latido
    this.dado.setScale(1);
    this.explicacion.setText("Lanzando...");
    const resultado = await this.tirar(); // aquí se tira el dado DE VERDAD (o se pide al servidor)
    if (this.estado !== "girando") return; // por si se cerró mientras esperábamos
    this.explicacion.setText("");

    let ultimoCambio = 0;
    // addCounter cuenta de 0 a 1 durante DURACION_GIRO. "Cubic.Out" hace
    // que empiece rápido y frene al final, como un dado de verdad.
    this.escena.tweens.addCounter({
      from: 0,
      to: 1,
      duration: DURACION_GIRO,
      ease: "Cubic.Out",
      onUpdate: (tween) => {
        const progreso = tween.getValue() ?? 0;
        this.dado.setRotation(progreso * Math.PI * 6); // 3 vueltas completas
        // Cambiamos el número cada poco tiempo; cada vez más despacio.
        const ahora = this.escena.time.now;
        if (ahora - ultimoCambio > 40 + 220 * progreso) {
          this.numero.setText(String(Phaser.Math.Between(1, 20)));
          ultimoCambio = ahora;
        }
      },
      onComplete: () => this.revelar(resultado),
    });
  }

  private revelar(resultado: ResultadoVisual): void {
    this.estado = "resultado";
    this.dado.setRotation(0);
    this.numero.setText(resultado.valor === null ? "—" : String(resultado.valor));
    // 20 en dorado, 1 en rojo, el resto en blanco.
    const colorNumero = resultado.valor === 20 ? "#ffd84a" : resultado.valor === 1 ? "#ff5a5a" : "#ffffff";
    this.numero.setColor(colorNumero);
    this.explicacion.setText(resultado.texto + "\n\n(E para continuar)").setColor(resultado.color);

    // Efecto de "golpe" al pararse.
    this.escena.tweens.add({ targets: this.dado, scale: { from: 1.35, to: 1 }, duration: 250, ease: "Back.Out" });
    this.escena.cameras.main.shake(120, 0.004);

    resultado.alRevelar?.(); // "?." = llámala solo si existe
  }

  private ocultar(): void {
    this.estado = "oculto";
    this.tirar = null;
    this.escena.tweens.killTweensOf(this.dado);
    for (const obj of [this.velo, this.dado, this.titulo, this.explicacion]) {
      obj.setVisible(false);
    }
  }

  /**
   * Dibuja la silueta clásica de un d20 visto de frente: un hexágono
   * con un triángulo dentro y líneas que unen sus esquinas.
   */
  private dibujarD20(g: Phaser.GameObjects.Graphics): void {
    // Las 6 esquinas del hexágono. Un círculo tiene 2π radianes; las
    // repartimos en 6 partes y empezamos arriba (-π/2).
    const hex: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const angulo = -Math.PI / 2 + (i * Math.PI) / 3;
      hex.push(new Phaser.Math.Vector2(Math.cos(angulo) * RADIO, Math.sin(angulo) * RADIO));
    }
    // Triángulo central (cara frontal), apuntando hacia arriba.
    const r = RADIO * 0.58;
    const tri = [0, 1, 2].map((i) => {
      const angulo = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return new Phaser.Math.Vector2(Math.cos(angulo) * r, Math.sin(angulo) * r);
    });

    g.fillStyle(0x6b2fb3).fillPoints(hex, true);      // cuerpo morado
    g.fillStyle(0x8a4fd6).fillPoints(tri, true);      // cara frontal más clara
    g.lineStyle(3, 0xe9dcff);
    g.strokePoints(hex, true);
    g.strokePoints(tri, true);
    // Líneas que unen el triángulo con las esquinas del hexágono.
    g.lineStyle(2, 0xc9b3f0);
    const uniones: [number, number[]][] = [[0, [5, 0, 1]], [1, [1, 2, 3]], [2, [3, 4, 5]]];
    for (const [t, esquinas] of uniones) {
      for (const e of esquinas) {
        g.lineBetween(tri[t].x, tri[t].y, hex[e].x, hex[e].y);
      }
    }
  }
}
