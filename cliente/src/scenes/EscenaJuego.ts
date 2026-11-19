// ============================================================
// ESCENA DE JUEGO
// Una "escena" en Phaser es una pantalla del juego. Phaser llama
// por nosotros a estos métodos:
//   init(datos) -> al arrancar, con los datos que nos pasen
//   create()    -> una vez, al empezar: montamos el mundo
//   update()    -> unas 60 veces por segundo: el "bucle de juego"
//
// Desde la fase 2 la escena NO tira los dados ni decide nada: se
// lo pide a la "conexión" (servidor, o reglas locales si juegas solo).
// ============================================================
import Phaser from "phaser";
import { MAPA, TAMANO_TILE, ARBOL, AGUA, aPixel } from "../mundo/mapa";
import { OBJETOS } from "../mundo/objetos";
import { describirTirada } from "../reglas/dados";
import { bonoHabilidad, esCompetente, type Personaje } from "../reglas/personaje";
import { accionesDisponibles, type Accion, type ObjetoMundo } from "../reglas/mundo";
import { DadoVisual, type ResultadoVisual } from "../ui/DadoVisual";
import { MenuAcciones, type OpcionMenu } from "../ui/MenuAcciones";
import { conectar } from "../red/conectar";
import type { Conexion, VistaJugador } from "../red/Conexion";

const VELOCIDAD = 120;            // píxeles por segundo
const DISTANCIA_INTERACCION = 44; // qué tan cerca hay que estar de un objeto
const ENVIO_CADA_MS = 50;         // cada cuánto le decimos al servidor dónde estamos

/** Otro jugador que vemos en pantalla. */
interface OtroJugador {
  sprite: Phaser.GameObjects.Image;
  etiqueta: Phaser.GameObjects.Text;
  destinoX: number;
  destinoY: number;
}

export class EscenaJuego extends Phaser.Scene {
  private personaje!: Personaje;
  private conexion: Conexion | null = null; // null mientras nos conectamos

  private jugador!: Phaser.Physics.Arcade.Sprite;
  private teclas!: Record<"W" | "A" | "S" | "D" | "E", Phaser.Input.Keyboard.Key>;
  private sprites = new Map<string, Phaser.Physics.Arcade.Image>(); // id de objeto -> sprite
  private otros = new Map<string, OtroJugador>();                   // id de jugador -> dibujo
  private ultimoEnvio = 0;
  private ultimaPosicion = { x: 0, y: 0 };

  private textoEstado!: Phaser.GameObjects.Text;
  private textoAyuda!: Phaser.GameObjects.Text;
  private textoAviso!: Phaser.GameObjects.Text;
  private dado!: DadoVisual;
  private menu!: MenuAcciones;

  constructor() {
    super("EscenaJuego");
  }

  init(datos: { personaje: Personaje }): void {
    this.personaje = datos.personaje;
    this.conexion = null;
    this.sprites = new Map();
    this.otros = new Map();
  }

  create(): void {
    this.crearTexturas();
    const capa = this.crearMapa();
    this.jugador = this.physics.add.sprite(aPixel(2), aPixel(7), "jugador").setCollideWorldBounds(true);
    this.physics.add.collider(this.jugador, capa);
    this.crearObjetos();

    this.crearInterfaz();
    this.menu = new MenuAcciones(this);
    this.dado = new DadoVisual(this);
    this.teclas = this.input.keyboard!.addKeys("W,A,S,D,E") as typeof this.teclas;

    // Conectarse lleva un rato. "then" = "cuando termine, haz esto".
    this.textoEstado.setText("Conectando...");
    conectar(this.personaje, this.jugador.x, this.jugador.y).then((c) => this.alConectar(c));
  }

  private alConectar(conexion: Conexion): void {
    this.conexion = conexion;
    // Le decimos a la conexión qué hacer cuando algo cambie en el mundo.
    conexion.escuchar({
      alCambiarJugador: (id, j) => this.alCambiarJugador(id, j),
      alQuitarJugador: (id) => this.alQuitarJugador(id),
      alAbrirObjeto: (id) => this.alAbrirObjeto(id),
    });
    this.avisar(conexion.modo === "online" ? "Conectado al servidor." : "Sin servidor: juegas en modo solo.");
    this.actualizarEstado();
  }

  // ---------- update: se ejecuta en cada fotograma ----------
  update(tiempo: number): void {
    const J = Phaser.Input.Keyboard.JustDown;
    this.moverOtros();
    if (!this.conexion) return; // aún conectando

    if (this.dado.estaActivo()) {
      this.jugador.setVelocity(0, 0);
      if (J(this.teclas.E)) this.dado.pulsar();
      return;
    }
    if (this.menu.estaActivo()) {
      this.jugador.setVelocity(0, 0);
      if (J(this.teclas.W)) this.menu.mover(-1);
      if (J(this.teclas.S)) this.menu.mover(1);
      if (J(this.teclas.E)) this.menu.elegir();
      return;
    }

    this.moverJugador();
    this.enviarPosicion(tiempo);
    if (J(this.teclas.E)) this.interactuar();
    this.actualizarAyuda();
  }

  // ---------- Movimiento ----------
  private moverJugador(): void {
    let x = 0;
    let y = 0;
    if (this.teclas.A.isDown) x -= 1;
    if (this.teclas.D.isDown) x += 1;
    if (this.teclas.W.isDown) y -= 1;
    if (this.teclas.S.isDown) y += 1;
    const direccion = new Phaser.Math.Vector2(x, y).normalize();
    this.jugador.setVelocity(direccion.x * VELOCIDAD, direccion.y * VELOCIDAD);
  }

  /** Manda nuestra posición, pero solo si nos hemos movido y como mucho cada 50 ms. */
  private enviarPosicion(tiempo: number): void {
    if (tiempo - this.ultimoEnvio < ENVIO_CADA_MS) return;
    const { x, y } = this.jugador;
    if (Math.abs(x - this.ultimaPosicion.x) < 1 && Math.abs(y - this.ultimaPosicion.y) < 1) return;
    this.conexion!.mover(x, y); // el "!" = "sé que aquí no es null"
    this.ultimoEnvio = tiempo;
    this.ultimaPosicion = { x, y };
  }

  /**
   * Los demás jugadores no saltan de golpe a su nueva posición: cada
   * fotograma recorren un 20 % de lo que les falta (interpolación).
   */
  private moverOtros(): void {
    for (const otro of this.otros.values()) {
      otro.sprite.x += (otro.destinoX - otro.sprite.x) * 0.2;
      otro.sprite.y += (otro.destinoY - otro.sprite.y) * 0.2;
      otro.etiqueta.setPosition(otro.sprite.x, otro.sprite.y - 20);
    }
  }

  // ---------- Avisos de la conexión ----------
  private alCambiarJugador(id: string, j: VistaJugador): void {
    if (id === this.conexion?.miId) {
      this.actualizarEstado();
      return;
    }
    let otro = this.otros.get(id);
    if (!otro) {
      // Primera vez que lo vemos: le creamos un dibujo y un nombre encima.
      const sprite = this.add.image(j.x, j.y, "otro-jugador");
      const etiqueta = this.add.text(j.x, j.y - 20, `${j.nombre} (${j.clase})`, {
        fontSize: "10px", color: "#ffffff", backgroundColor: "#00000088",
      }).setOrigin(0.5);
      otro = { sprite, etiqueta, destinoX: j.x, destinoY: j.y };
      this.otros.set(id, otro);
      this.avisar(`${j.nombre} ha entrado en el bosque.`);
    }
    otro.destinoX = j.x;
    otro.destinoY = j.y;
    this.actualizarEstado();
  }

  private alQuitarJugador(id: string): void {
    const otro = this.otros.get(id);
    if (!otro) return;
    otro.sprite.destroy();
    otro.etiqueta.destroy();
    this.otros.delete(id);
    this.actualizarEstado();
  }

  private alAbrirObjeto(objetoId: string): void {
    const sprite = this.sprites.get(objetoId);
    const objeto = OBJETOS.find((o) => o.id === objetoId);
    if (!sprite || !objeto) return;
    if (objeto.tipo === "cofre") sprite.setTexture("cofre-abierto");
    if (objeto.tipo === "puerta") sprite.destroy(); // la puerta desaparece y se puede pasar
  }

  // ---------- Interactuar ----------
  private interactuar(): void {
    const objeto = this.masCercano();
    if (!objeto) return;
    const acciones = this.accionesDe(objeto);
    if (acciones.length === 0) {
      this.avisar(`${objeto.nombre}: no hay nada más que hacer aquí.`);
      return;
    }
    const opciones: OpcionMenu[] = acciones.map((accion) => ({
      texto: this.textoOpcion(accion),
      alElegir: () => this.lanzar(objeto, accion),
    }));
    opciones.push({ texto: "Dejarlo", alElegir: () => {} });
    this.menu.abrir(objeto.nombre, opciones);
  }

  private accionesDe(objeto: ObjetoMundo): Accion[] {
    const conexion = this.conexion!;
    // Un "adaptador": la regla pide algo con get/set; le damos uno que lee de la conexión.
    const abiertos = { get: (id: string) => conexion.estaAbierto(id), set: () => {} };
    return accionesDisponibles(objeto, abiertos, conexion.miEstado());
  }

  /** "Forzar la tapa · Atletismo +4 ✓ · CD 10" */
  private textoOpcion(accion: Accion): string {
    const bono = bonoHabilidad(this.personaje, accion.habilidad);
    const signo = bono >= 0 ? "+" : "";
    const comp = esCompetente(this.personaje, accion.habilidad) ? " ✓" : "";
    return `${accion.texto} · ${accion.habilidad} ${signo}${bono}${comp} · CD ${accion.dificultad}`;
  }

  private lanzar(objeto: ObjetoMundo, accion: Accion): void {
    this.dado.mostrar(`${accion.texto} (CD ${accion.dificultad})\nd20 + ${accion.habilidad}`, async (): Promise<ResultadoVisual> => {
      // "await" espera la respuesta del servidor (o de las reglas locales).
      const respuesta = await this.conexion!.intentar(objeto.id, accion.id);
      if ("rechazado" in respuesta) {
        return { valor: null, texto: respuesta.rechazado, color: "#cccccc" };
      }
      const t = respuesta.tirada;
      return {
        valor: t.dado,
        texto: describirTirada(t, accion.habilidad) + "\n" + respuesta.mensaje,
        color: t.exito ? "#8ef08e" : "#f08e8e",
      };
    });
  }

  /** El objeto más cercano a tiro, o null. */
  private masCercano(): ObjetoMundo | null {
    let mejor: ObjetoMundo | null = null;
    let mejorDistancia = DISTANCIA_INTERACCION;
    for (const objeto of OBJETOS) {
      if (objeto.tipo === "puerta" && this.conexion?.estaAbierto(objeto.id)) continue;
      const d = Phaser.Math.Distance.Between(this.jugador.x, this.jugador.y, aPixel(objeto.columna), aPixel(objeto.fila));
      if (d < mejorDistancia) {
        mejor = objeto;
        mejorDistancia = d;
      }
    }
    return mejor;
  }

  // ---------- Los objetos del mundo ----------
  private crearObjetos(): void {
    const textura = { cofre: "cofre", puerta: "puerta", pnj: "ermitano" };
    for (const objeto of OBJETOS) {
      const sprite = this.physics.add.staticImage(aPixel(objeto.columna), aPixel(objeto.fila), textura[objeto.tipo]);
      this.physics.add.collider(this.jugador, sprite);
      this.sprites.set(objeto.id, sprite);
    }
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

    // Los demás jugadores, en azul, para distinguirlos de ti.
    g.fillStyle(0xf2d16b).fillRect(6, 2, 12, 10);
    g.fillStyle(0x2f7ab0).fillRect(4, 12, 16, 12);
    g.generateTexture("otro-jugador", 24, 24);
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

  // ---------- Interfaz ----------
  private crearInterfaz(): void {
    const estilo = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 4, y: 2 } };
    this.textoEstado = this.add.text(8, 6, "", estilo).setDepth(50);
    this.textoAyuda = this.add.text(320, 470, "", estilo).setOrigin(0.5, 1).setDepth(50);
    this.textoAviso = this.add.text(320, 40, "", { ...estilo, fontSize: "14px" }).setOrigin(0.5, 0).setDepth(50).setVisible(false);
  }

  private actualizarEstado(): void {
    if (!this.conexion) return;
    const p = this.personaje;
    const e = this.conexion.miEstado();
    const modo = this.conexion.modo === "online" ? `Online (${this.conexion.numeroJugadores()}/4)` : "Solo";
    this.textoEstado.setText(
      `${p.nombre} · ${p.clase.nombre} · PG ${p.pg}/${p.pgMaximos} · CA ${p.ca} · Oro ${e.oro} · Pociones ${e.pociones} · ${modo}`,
    );
  }

  private actualizarAyuda(): void {
    const objeto = this.masCercano();
    this.textoAyuda.setText(objeto ? `E: interactuar con ${objeto.nombre}` : "WASD para moverte · E para interactuar");
  }

  private avisar(texto: string): void {
    this.textoAviso.setText(texto).setVisible(true);
    this.time.delayedCall(2500, () => this.textoAviso.setVisible(false));
  }
}
