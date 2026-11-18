// ============================================================
// ESCENA DE JUEGO
// Una "escena" en Phaser es una pantalla del juego. Tiene dos
// momentos clave que Phaser llama por nosotros:
//   create()  -> una vez, al empezar: montamos el mundo
//   update()  -> unas 60 veces por segundo: el "bucle de juego"
// ============================================================
import Phaser from "phaser";
import { MAPA, TAMANO_TILE, ARBOL, AGUA, COFRES } from "../mundo/mapa";
import { personajeDePrueba } from "../mundo/personaje";
import { tiradaContraDificultad, describirTirada, modificador } from "../reglas/dados";

const VELOCIDAD = 120;          // píxeles por segundo
const DISTANCIA_INTERACCION = 44; // qué tan cerca hay que estar de un cofre

// Un cofre en el juego: su dibujo + si ya está abierto + su dificultad.
interface Cofre {
  sprite: Phaser.Physics.Arcade.Image;
  abierto: boolean;
  dificultad: number;
}

export class EscenaJuego extends Phaser.Scene {
  // El "!" le dice a TypeScript: "tranquilo, esto lo relleno en create()".
  private jugador!: Phaser.Physics.Arcade.Sprite;
  private teclas!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; E: Phaser.Input.Keyboard.Key };
  private cofres: Cofre[] = [];
  private textoTirada!: Phaser.GameObjects.Text;
  private textoAyuda!: Phaser.GameObjects.Text;

  constructor() {
    super("EscenaJuego"); // nombre de la escena
  }

  create(): void {
    this.crearTexturas();
    const capa = this.crearMapa();
    this.crearJugador();
    this.crearCofres();

    // Que el jugador choque con árboles y agua, y con los cofres.
    this.physics.add.collider(this.jugador, capa);
    for (const cofre of this.cofres) {
      this.physics.add.collider(this.jugador, cofre.sprite);
    }

    this.crearInterfaz();

    // Pedimos a Phaser que vigile estas teclas.
    this.teclas = this.input.keyboard!.addKeys("W,A,S,D,E") as typeof this.teclas;
  }

  // ---------- update: se ejecuta en cada fotograma ----------
  update(): void {
    this.moverJugador();

    // JustDown = "se acaba de pulsar en este fotograma" (no "se mantiene").
    if (Phaser.Input.Keyboard.JustDown(this.teclas.E)) {
      this.interactuar();
    }

    this.actualizarAyuda();
  }

  // ---------- Movimiento con WASD ----------
  private moverJugador(): void {
    // Calculamos una dirección: x va de -1 (izquierda) a 1 (derecha),
    // y va de -1 (arriba) a 1 (abajo). En pantalla, la y crece hacia abajo.
    let x = 0;
    let y = 0;
    if (this.teclas.A.isDown) x -= 1;
    if (this.teclas.D.isDown) x += 1;
    if (this.teclas.W.isDown) y -= 1;
    if (this.teclas.S.isDown) y += 1;

    // Normalizar: sin esto, en diagonal irías ~1,41 veces más rápido.
    const direccion = new Phaser.Math.Vector2(x, y).normalize();
    this.jugador.setVelocity(direccion.x * VELOCIDAD, direccion.y * VELOCIDAD);
  }

  // ---------- Interactuar: aquí se tira el d20 ----------
  private interactuar(): void {
    const cofre = this.cofreMasCercano();
    if (!cofre) {
      this.mostrarTirada("No hay nada con lo que interactuar.", "#cccccc");
      return;
    }
    if (cofre.abierto) {
      this.mostrarTirada("Este cofre ya está abierto.", "#cccccc");
      return;
    }

    // La regla del juego: d20 + modificador de Fuerza contra la dificultad del cofre.
    // Fuerza 15 -> modificador +2.
    const modFuerza = modificador(personajeDePrueba.atributos.fuerza);
    const resultado = tiradaContraDificultad(modFuerza, cofre.dificultad);

    if (resultado.exito) {
      cofre.abierto = true;
      cofre.sprite.setTexture("cofre-abierto");
    }

    const color = resultado.exito ? "#8ef08e" : "#f08e8e";
    this.mostrarTirada("Intentas forzar el cofre...\n" + describirTirada(resultado, "Fuerza"), color);
  }

  /** Devuelve el cofre más cercano si está a tiro, o null si no hay ninguno. */
  private cofreMasCercano(): Cofre | null {
    let mejor: Cofre | null = null;
    let mejorDistancia = DISTANCIA_INTERACCION;
    for (const cofre of this.cofres) {
      const d = Phaser.Math.Distance.Between(this.jugador.x, this.jugador.y, cofre.sprite.x, cofre.sprite.y);
      if (d < mejorDistancia) {
        mejor = cofre;
        mejorDistancia = d;
      }
    }
    return mejor;
  }

  // ---------- Montaje del mundo ----------

  /**
   * Aún no tenemos pixel art, así que dibujamos cuadrados de colores
   * y los guardamos como "texturas" (imágenes) con un nombre.
   */
  private crearTexturas(): void {
    const g = this.add.graphics();
    const t = TAMANO_TILE;

    // Tileset: tres baldosas en fila -> [hierba][árbol][agua]
    g.fillStyle(0x3f7a3a).fillRect(0, 0, t, t);                 // 0 hierba
    g.fillStyle(0x2f5f2b).fillRect(6, 8, 4, 4).fillRect(20, 18, 4, 4);
    g.fillStyle(0x3f7a3a).fillRect(t, 0, t, t);                 // 1 árbol
    g.fillStyle(0x5a3a1e).fillRect(t + 13, 20, 6, 12);
    g.fillStyle(0x1f4a1c).fillCircle(t + 16, 13, 12);
    g.fillStyle(0x2b5fa8).fillRect(t * 2, 0, t, t);             // 2 agua
    g.fillStyle(0x4a7fc8).fillRect(t * 2 + 5, 10, 10, 2).fillRect(t * 2 + 16, 22, 10, 2);
    g.generateTexture("tiles", t * 3, t);
    g.clear();

    // Jugador
    g.fillStyle(0xf2d16b).fillRect(6, 2, 12, 10);   // cabeza
    g.fillStyle(0x7a3fb0).fillRect(4, 12, 16, 12);  // cuerpo
    g.generateTexture("jugador", 24, 24);
    g.clear();

    // Cofre cerrado y abierto
    g.fillStyle(0x8a5a2b).fillRect(2, 8, 24, 18);
    g.fillStyle(0xd9b23a).fillRect(12, 14, 4, 6);
    g.generateTexture("cofre", 28, 28);
    g.clear();
    g.fillStyle(0x8a5a2b).fillRect(2, 14, 24, 12);
    g.fillStyle(0x5a3a1e).fillRect(2, 4, 24, 6);
    g.fillStyle(0xffe066).fillRect(6, 12, 16, 4);
    g.generateTexture("cofre-abierto", 28, 28);

    g.destroy(); // ya no necesitamos el "pincel"
  }

  private crearMapa(): Phaser.Tilemaps.TilemapLayer {
    const mapa = this.make.tilemap({ data: MAPA, tileWidth: TAMANO_TILE, tileHeight: TAMANO_TILE });
    const tileset = mapa.addTilesetImage("tiles", "tiles", TAMANO_TILE, TAMANO_TILE, 0, 0)!;
    const capa = mapa.createLayer(0, tileset, 0, 0)!;
    capa.setCollision([ARBOL, AGUA]); // estos números bloquean el paso
    return capa;
  }

  private crearJugador(): void {
    // Empieza en la casilla (2, 7). Multiplicamos por el tamaño para pasar a píxeles
    // y sumamos medio tile para quedar en el centro de la casilla.
    const x = 2 * TAMANO_TILE + TAMANO_TILE / 2;
    const y = 7 * TAMANO_TILE + TAMANO_TILE / 2;
    this.jugador = this.physics.add.sprite(x, y, "jugador");
    this.jugador.setCollideWorldBounds(true);
  }

  private crearCofres(): void {
    for (const datos of COFRES) {
      const x = datos.columna * TAMANO_TILE + TAMANO_TILE / 2;
      const y = datos.fila * TAMANO_TILE + TAMANO_TILE / 2;
      const sprite = this.physics.add.staticImage(x, y, "cofre");
      this.cofres.push({ sprite, abierto: false, dificultad: datos.dificultad });
      // Etiqueta con la dificultad encima del cofre.
      this.add.text(x, y - 22, `CD ${datos.dificultad}`, { fontSize: "10px", color: "#ffffff" }).setOrigin(0.5);
    }
  }

  // ---------- Interfaz (textos en pantalla) ----------
  private crearInterfaz(): void {
    const p = personajeDePrueba;
    const modFue = modificador(p.atributos.fuerza);
    this.add.text(8, 6, `${p.nombre} · ${p.clase} nv ${p.nivel} · Vidas ${p.vidas} · FUE ${p.atributos.fuerza} (${modFue >= 0 ? "+" : ""}${modFue})`, {
      fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 4, y: 2 },
    });
    this.textoAyuda = this.add.text(320, 470, "", { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 4, y: 2 } }).setOrigin(0.5, 1);
    this.textoTirada = this.add.text(320, 40, "", {
      fontSize: "14px", color: "#ffffff", align: "center", backgroundColor: "#000000bb", padding: { x: 8, y: 6 },
    }).setOrigin(0.5, 0).setVisible(false);
  }

  private actualizarAyuda(): void {
    const cofre = this.cofreMasCercano();
    if (cofre && !cofre.abierto) {
      this.textoAyuda.setText("Pulsa E para forzar el cofre (d20 + Fuerza)");
    } else {
      this.textoAyuda.setText("WASD para moverte · E para interactuar");
    }
  }

  private mostrarTirada(texto: string, color: string): void {
    this.textoTirada.setText(texto).setColor(color).setVisible(true);
    // Ocultar el mensaje a los 3 segundos. Si llega otro antes, reiniciamos el reloj.
    this.time.removeAllEvents();
    this.time.delayedCall(3000, () => this.textoTirada.setVisible(false));
  }
}
