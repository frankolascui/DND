// ============================================================
// ESCENA DE JUEGO
// Una "escena" en Phaser es una pantalla del juego. Phaser llama
// por nosotros a estos métodos:
//   init(datos) -> al arrancar, con los datos que nos pasen
//   create()    -> una vez, al empezar: montamos el mundo
//   update()    -> unas 60 veces por segundo: el "bucle de juego"
// ============================================================
import Phaser from "phaser";
import { MAPA, TAMANO_TILE, ARBOL, AGUA, COFRES, PUERTA, ERMITANO } from "../mundo/mapa";
import { tiradaContraDificultad, describirTirada } from "../reglas/dados";
import { bonoHabilidad, esCompetente, type Personaje } from "../reglas/personaje";
import type { Habilidad } from "../reglas/habilidades";
import { DadoVisual } from "../ui/DadoVisual";
import { MenuAcciones, type OpcionMenu } from "../ui/MenuAcciones";

const VELOCIDAD = 120;            // píxeles por segundo
const DISTANCIA_INTERACCION = 44; // qué tan cerca hay que estar de un objeto

/**
 * Una opción que se resuelve con una tirada de habilidad.
 * Los mensajes se calculan sin cambiar nada; los cambios del mundo
 * van en `efectoExito`, que se ejecuta cuando el dado se para.
 */
interface Prueba {
  accion: string;        // "Forzar", "Persuadir"...
  habilidad: Habilidad;
  dificultad: number;
  mensajeExito: string;
  mensajeFallo: string;
  efectoExito?: () => void;
}

/** Cualquier cosa del mundo con la que se puede interactuar. */
interface Interactuable {
  nombre: string;
  objeto: Phaser.GameObjects.Image;
  // Una función, porque las opciones cambian (un cofre abierto ya no ofrece "Forzar").
  // Si devuelve una lista vacía, no hay nada que hacer con él.
  pruebas: () => Prueba[];
}

export class EscenaJuego extends Phaser.Scene {
  private personaje!: Personaje;
  private oro = 0;
  private pociones = 0;

  private jugador!: Phaser.Physics.Arcade.Sprite;
  private teclas!: Record<"W" | "A" | "S" | "D" | "E", Phaser.Input.Keyboard.Key>;
  private interactuables: Interactuable[] = [];
  private textoEstado!: Phaser.GameObjects.Text;
  private textoAyuda!: Phaser.GameObjects.Text;
  private textoAviso!: Phaser.GameObjects.Text;
  private dado!: DadoVisual;
  private menu!: MenuAcciones;

  constructor() {
    super("EscenaJuego");
  }

  // Recibimos el personaje que se creó en EscenaCreacion.
  init(datos: { personaje: Personaje }): void {
    this.personaje = datos.personaje;
    this.interactuables = [];
    this.oro = 0;
    this.pociones = 0;
  }

  create(): void {
    this.crearTexturas();
    const capa = this.crearMapa();
    this.crearJugador();
    this.physics.add.collider(this.jugador, capa);

    this.crearCofres();
    this.crearPuerta();
    this.crearErmitano();

    this.crearInterfaz();
    this.menu = new MenuAcciones(this);
    this.dado = new DadoVisual(this);

    this.teclas = this.input.keyboard!.addKeys("W,A,S,D,E") as typeof this.teclas;
  }

  // ---------- update: se ejecuta en cada fotograma ----------
  update(): void {
    const J = Phaser.Input.Keyboard.JustDown;

    // 1) Si el dado está en pantalla, la E es para el dado.
    if (this.dado.estaActivo()) {
      this.jugador.setVelocity(0, 0);
      if (J(this.teclas.E)) this.dado.pulsar();
      return;
    }

    // 2) Si el menú está abierto, W/S mueven la selección y E elige.
    if (this.menu.estaActivo()) {
      this.jugador.setVelocity(0, 0);
      if (J(this.teclas.W)) this.menu.mover(-1);
      if (J(this.teclas.S)) this.menu.mover(1);
      if (J(this.teclas.E)) this.menu.elegir();
      return;
    }

    // 3) Si no, te mueves por el mundo.
    this.moverJugador();
    if (J(this.teclas.E)) this.interactuar();
    this.actualizarAyuda();
  }

  // ---------- Movimiento con WASD ----------
  private moverJugador(): void {
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

  // ---------- Interactuar: abre el menú de acciones ----------
  private interactuar(): void {
    const objetivo = this.masCercano();
    if (!objetivo) return;
    const pruebas = objetivo.pruebas();
    if (pruebas.length === 0) {
      this.avisar(`${objetivo.nombre}: no hay nada más que hacer aquí.`);
      return;
    }

    // Convertimos cada prueba en una opción de menú.
    const opciones: OpcionMenu[] = pruebas.map((prueba) => ({
      texto: this.textoOpcion(prueba),
      alElegir: () => this.lanzarPrueba(prueba),
    }));
    opciones.push({ texto: "Dejarlo", alElegir: () => {} }); // no hace nada: solo cierra

    this.menu.abrir(objetivo.nombre, opciones);
  }

  /** "Forzar · Atletismo +4 (competente) · CD 13" */
  private textoOpcion(prueba: Prueba): string {
    const bono = bonoHabilidad(this.personaje, prueba.habilidad);
    const signo = bono >= 0 ? "+" : "";
    const comp = esCompetente(this.personaje, prueba.habilidad) ? " ✓" : "";
    return `${prueba.accion} · ${prueba.habilidad} ${signo}${bono}${comp} · CD ${prueba.dificultad}`;
  }

  private lanzarPrueba(prueba: Prueba): void {
    const bono = bonoHabilidad(this.personaje, prueba.habilidad);
    this.dado.mostrar(`${prueba.accion} (CD ${prueba.dificultad})\nd20 + ${prueba.habilidad}`, () => {
      const r = tiradaContraDificultad(bono, prueba.dificultad);
      return {
        valor: r.dado,
        texto: describirTirada(r, prueba.habilidad) + "\n" + (r.exito ? prueba.mensajeExito : prueba.mensajeFallo),
        color: r.exito ? "#8ef08e" : "#f08e8e",
        alRevelar: () => {
          if (r.exito) prueba.efectoExito?.();
          this.actualizarEstado();
        },
      };
    });
  }

  /** El interactuable más cercano a tiro, o null. */
  private masCercano(): Interactuable | null {
    let mejor: Interactuable | null = null;
    let mejorDistancia = DISTANCIA_INTERACCION;
    for (const it of this.interactuables) {
      if (!it.objeto.active) continue; // la puerta abierta ya no existe
      const d = Phaser.Math.Distance.Between(this.jugador.x, this.jugador.y, it.objeto.x, it.objeto.y);
      if (d < mejorDistancia) {
        mejor = it;
        mejorDistancia = d;
      }
    }
    return mejor;
  }

  // ---------- Los objetos del mundo ----------

  /** Pasa de casilla a píxel (centro de la casilla). */
  private aPixel(casilla: number): number {
    return casilla * TAMANO_TILE + TAMANO_TILE / 2;
  }

  private crearCofres(): void {
    for (const datos of COFRES) {
      const sprite = this.physics.add.staticImage(this.aPixel(datos.columna), this.aPixel(datos.fila), "cofre");
      this.physics.add.collider(this.jugador, sprite);
      let abierto = false;

      const abrir = () => {
        abierto = true;
        sprite.setTexture("cofre-abierto");
        this.oro += datos.oro;
      };

      // Dos formas de abrir el mismo cofre: a la fuerza o con maña.
      // Con maña es 2 puntos más fácil, pero solo es buena idea si eres hábil.
      this.interactuables.push({
        nombre: `Cofre (${datos.oro > 20 ? "pesado" : "pequeño"})`,
        objeto: sprite,
        pruebas: () => abierto ? [] : [
          {
            accion: "Forzar la tapa", habilidad: "Atletismo", dificultad: datos.dificultad,
            mensajeExito: `¡Crac! Dentro hay ${datos.oro} monedas de oro.`,
            mensajeFallo: "La tapa no cede.", efectoExito: abrir,
          },
          {
            accion: "Abrir la cerradura", habilidad: "Juego de manos", dificultad: datos.dificultad - 2,
            mensajeExito: `Clic. Dentro hay ${datos.oro} monedas de oro.`,
            mensajeFallo: "La ganzúa resbala.", efectoExito: abrir,
          },
        ],
      });
    }
  }

  private crearPuerta(): void {
    const puerta = this.physics.add.staticImage(this.aPixel(PUERTA.columna), this.aPixel(PUERTA.fila), "puerta");
    this.physics.add.collider(this.jugador, puerta);
    const abrir = () => puerta.destroy(); // destruirla = quitarla del mundo

    this.interactuables.push({
      nombre: "Puerta de madera atrancada",
      objeto: puerta,
      pruebas: () => [
        {
          accion: "Empujar con el hombro", habilidad: "Atletismo", dificultad: PUERTA.dificultad,
          mensajeExito: "La puerta se abre de golpe.", mensajeFallo: "Te duele el hombro.", efectoExito: abrir,
        },
        {
          accion: "Buscar un mecanismo", habilidad: "Investigación", dificultad: PUERTA.dificultad,
          mensajeExito: "Encuentras el pestillo oculto.", mensajeFallo: "No ves nada raro.", efectoExito: abrir,
        },
      ],
    });
  }

  private crearErmitano(): void {
    const sprite = this.physics.add.staticImage(this.aPixel(ERMITANO.columna), this.aPixel(ERMITANO.fila), "ermitano");
    this.physics.add.collider(this.jugador, sprite);
    // El estado del PNJ: lo que ya ha pasado en la conversación.
    let haDadoPocion = false;
    let haDadoPista = false;

    const darPocion = () => {
      haDadoPocion = true;
      this.pociones += 1;
    };

    this.interactuables.push({
      nombre: "El ermitaño",
      objeto: sprite,
      pruebas: () => {
        const lista: Prueba[] = [];
        if (!haDadoPocion) {
          lista.push({
            accion: "Pedirle ayuda", habilidad: "Persuasión", dificultad: 12,
            mensajeExito: "\"Toma, una poción. Cuídate en el bosque.\"",
            mensajeFallo: "\"No me fío de ti. Vuelve más tarde.\"", efectoExito: darPocion,
          });
          lista.push({
            accion: "Amenazarle", habilidad: "Intimidación", dificultad: 14,
            mensajeExito: "Te da una poción temblando. No le has caído bien.",
            mensajeFallo: "Se ríe de ti.", efectoExito: darPocion,
          });
        }
        if (!haDadoPista) {
          lista.push({
            accion: "Leerle las intenciones", habilidad: "Perspicacia", dificultad: 10,
            mensajeExito: "Mira de reojo al sureste: tras la puerta hay algo valioso.",
            mensajeFallo: "No sabes qué piensa.", efectoExito: () => { haDadoPista = true; },
          });
        }
        return lista;
      },
    });
  }

  // ---------- Montaje del mundo ----------

  /** Aún no hay pixel art: dibujamos formas sencillas y las guardamos como texturas. */
  private crearTexturas(): void {
    if (this.textures.exists("tiles")) return; // ya creadas en una partida anterior
    const g = this.add.graphics();
    const t = TAMANO_TILE;

    // Tileset: tres baldosas en fila -> [hierba][árbol][agua]
    g.fillStyle(0x3f7a3a).fillRect(0, 0, t, t);
    g.fillStyle(0x2f5f2b).fillRect(6, 8, 4, 4).fillRect(20, 18, 4, 4);
    g.fillStyle(0x3f7a3a).fillRect(t, 0, t, t);
    g.fillStyle(0x5a3a1e).fillRect(t + 13, 20, 6, 12);
    g.fillStyle(0x1f4a1c).fillCircle(t + 16, 13, 12);
    g.fillStyle(0x2b5fa8).fillRect(t * 2, 0, t, t);
    g.fillStyle(0x4a7fc8).fillRect(t * 2 + 5, 10, 10, 2).fillRect(t * 2 + 16, 22, 10, 2);
    g.generateTexture("tiles", t * 3, t);
    g.clear();

    g.fillStyle(0xf2d16b).fillRect(6, 2, 12, 10);
    g.fillStyle(0x7a3fb0).fillRect(4, 12, 16, 12);
    g.generateTexture("jugador", 24, 24);
    g.clear();

    g.fillStyle(0xd8d8d8).fillRect(6, 0, 12, 6);    // pelo blanco
    g.fillStyle(0xe8c39e).fillRect(6, 4, 12, 8);    // cara
    g.fillStyle(0x6d6a4a).fillRect(3, 12, 18, 14);  // túnica
    g.generateTexture("ermitano", 24, 26);
    g.clear();

    g.fillStyle(0x7a4a22).fillRect(0, 0, t, t);
    g.fillStyle(0x4f2e12).fillRect(0, 10, t, 3).fillRect(0, 22, t, 3);
    g.fillStyle(0xd9b23a).fillRect(24, 14, 4, 4);
    g.generateTexture("puerta", t, t);
    g.clear();

    g.fillStyle(0x8a5a2b).fillRect(2, 8, 24, 18);
    g.fillStyle(0xd9b23a).fillRect(12, 14, 4, 6);
    g.generateTexture("cofre", 28, 28);
    g.clear();
    g.fillStyle(0x8a5a2b).fillRect(2, 14, 24, 12);
    g.fillStyle(0x5a3a1e).fillRect(2, 4, 24, 6);
    g.fillStyle(0xffe066).fillRect(6, 12, 16, 4);
    g.generateTexture("cofre-abierto", 28, 28);

    g.destroy();
  }

  private crearMapa(): Phaser.Tilemaps.TilemapLayer {
    const mapa = this.make.tilemap({ data: MAPA, tileWidth: TAMANO_TILE, tileHeight: TAMANO_TILE });
    const tileset = mapa.addTilesetImage("tiles", "tiles", TAMANO_TILE, TAMANO_TILE, 0, 0)!;
    const capa = mapa.createLayer(0, tileset, 0, 0)!;
    capa.setCollision([ARBOL, AGUA]);
    return capa;
  }

  private crearJugador(): void {
    this.jugador = this.physics.add.sprite(this.aPixel(2), this.aPixel(7), "jugador");
    this.jugador.setCollideWorldBounds(true);
  }

  // ---------- Interfaz ----------
  private crearInterfaz(): void {
    const estilo = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 4, y: 2 } };
    this.textoEstado = this.add.text(8, 6, "", estilo).setDepth(50);
    this.textoAyuda = this.add.text(320, 470, "", estilo).setOrigin(0.5, 1).setDepth(50);
    this.textoAviso = this.add.text(320, 40, "", { ...estilo, fontSize: "14px" }).setOrigin(0.5, 0).setDepth(50).setVisible(false);
    this.actualizarEstado();
  }

  private actualizarEstado(): void {
    const p = this.personaje;
    this.textoEstado.setText(
      `${p.nombre} · ${p.clase.nombre} nv ${p.nivel} · PG ${p.pg}/${p.pgMaximos} · CA ${p.ca} · Vidas ${p.vidas} · Oro ${this.oro} · Pociones ${this.pociones}`,
    );
  }

  private actualizarAyuda(): void {
    const objetivo = this.masCercano();
    this.textoAyuda.setText(objetivo ? `E: interactuar con ${objetivo.nombre}` : "WASD para moverte · E para interactuar");
  }

  private avisar(texto: string): void {
    this.textoAviso.setText(texto).setVisible(true);
    this.time.delayedCall(2500, () => this.textoAviso.setVisible(false));
  }
}
