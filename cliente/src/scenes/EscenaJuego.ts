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
import {
  MAPA, DECORACION, TAMANO_TILE, BLOQUEAN, HIERBA_OSCURA, HIERBA_OSCURA_2, ANCHO_MUNDO, ALTO_MUNDO, INICIO, aPixel,
} from "../mundo/mapa";
import { crearArte, claveSprite } from "../ui/pixelArt";
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
  sprite: Phaser.GameObjects.Sprite;
  sombra: Phaser.GameObjects.Image;
  clave: string; // qué dibujo usa ("guerrero", "mago"...)
  etiqueta: Phaser.GameObjects.Text;
  destinoX: number;
  destinoY: number;
}

export class EscenaJuego extends Phaser.Scene {
  private personaje!: Personaje;
  private conexion: Conexion | null = null; // null mientras nos conectamos

  private jugador!: Phaser.Physics.Arcade.Sprite;
  private sombra!: Phaser.GameObjects.Image;
  private clave = "guerrero";    // el dibujo de nuestra clase
  private zonaActual = "";
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
    crearArte(this); // dibuja todas las texturas (ui/pixelArt.ts)
    const capas = this.crearMapa();
    this.crearJugador();
    for (const capa of capas) this.physics.add.collider(this.jugador, capa);
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
    this.comprobarZona();
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
    this.animar(this.jugador, x !== 0 || y !== 0, x);
    this.colocarSombra(this.jugador, this.sombra);
  }

  /** Si se mueve, reproduce la animación de andar; si no, se queda en el cuadro "quieto". */
  private animar(sprite: Phaser.GameObjects.Sprite, moviendose: boolean, dx: number): void {
    const clave = sprite.texture.key;
    if (moviendose) {
      sprite.anims.play(`${clave}-andar`, true); // true = no reiniciar si ya estaba sonando
      if (dx !== 0) sprite.setFlipX(dx < 0);    // mirar a la izquierda = dibujo en espejo
    } else {
      sprite.anims.stop();
      sprite.setFrame("0");
    }
    // Profundidad = posición y: lo que está más abajo se dibuja delante.
    sprite.setDepth(sprite.y);
  }

  private colocarSombra(sprite: Phaser.GameObjects.Sprite, sombra: Phaser.GameObjects.Image): void {
    sombra.setPosition(sprite.x, sprite.y + 14).setDepth(sprite.y - 1);
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
      const dx = (otro.destinoX - otro.sprite.x) * 0.2;
      const dy = (otro.destinoY - otro.sprite.y) * 0.2;
      otro.sprite.x += dx;
      otro.sprite.y += dy;
      this.animar(otro.sprite, Math.abs(dx) + Math.abs(dy) > 0.3, Math.abs(dx) > 0.1 ? dx : 0);
      this.colocarSombra(otro.sprite, otro.sombra);
      otro.etiqueta.setPosition(otro.sprite.x, otro.sprite.y - 24).setDepth(10000);
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
      const clave = claveSprite(j.clase);
      const sombra = this.add.image(j.x, j.y + 14, "sombra");
      const sprite = this.add.sprite(j.x, j.y, clave, "0");
      const etiqueta = this.add.text(j.x, j.y - 24, `${j.nombre} (${j.clase})`, {
        fontSize: "10px", color: "#9fd3ff", backgroundColor: "#00000088", padding: { x: 2, y: 1 },
      }).setOrigin(0.5);
      otro = { sprite, sombra, clave, etiqueta, destinoX: j.x, destinoY: j.y };
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
    otro.sombra.destroy();
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
      const x = aPixel(objeto.columna);
      const y = aPixel(objeto.fila);
      if (objeto.tipo === "pnj") this.add.image(x, y + 14, "sombra").setDepth(y - 1);
      // El ermitaño es una hoja de 3 cuadros: usamos el cuadro "0" (quieto).
      const sprite = this.physics.add.staticImage(x, y, textura[objeto.tipo], objeto.tipo === "pnj" ? "0" : undefined);
      sprite.setDepth(y);
      this.physics.add.collider(this.jugador, sprite);
      this.sprites.set(objeto.id, sprite);
    }
  }

  // ---------- Montaje del mundo ----------

  private crearJugador(): void {
    this.clave = claveSprite(this.personaje.clase.nombre);
    const x = aPixel(INICIO.columna);
    const y = aPixel(INICIO.fila);
    this.sombra = this.add.image(x, y + 14, "sombra");
    this.jugador = this.physics.add.sprite(x, y, this.clave, "0").setCollideWorldBounds(true);
    // La "caja" que choca es solo la de los pies: así puedes pasar pegado a un árbol.
    this.jugador.body!.setSize(16, 10).setOffset(8, 22);

    // El mundo es más grande que la pantalla: la cámara sigue al jugador.
    this.physics.world.setBounds(0, 0, ANCHO_MUNDO, ALTO_MUNDO);
    this.cameras.main.setBounds(0, 0, ANCHO_MUNDO, ALTO_MUNDO);
    this.cameras.main.startFollow(this.jugador, true, 0.15, 0.15); // 0.15 = suavizado
    this.cameras.main.setRoundPixels(true); // evita que el pixel art se vea borroso
    this.cameras.main.fadeIn(600);
  }

  /** Avisa cuando entras en otra zona del mapa. */
  private comprobarZona(): void {
    const columna = Math.floor(this.jugador.x / TAMANO_TILE);
    const fila = Math.floor(this.jugador.y / TAMANO_TILE);
    const baldosa = MAPA[fila]?.[columna];
    const zona = baldosa === HIERBA_OSCURA || baldosa === HIERBA_OSCURA_2 ? "La Hondonada" : "El Bosque Ceniciento";
    if (zona === this.zonaActual) return;
    // La primera vez (al empezar) también lo anunciamos.
    this.zonaActual = zona;
    this.avisar(zona === "La Hondonada" ? "La Hondonada: aquí todo es más difícil." : zona);
  }

  /** Dos capas: el suelo y, encima, la decoración. Las dos chocan con lo que BLOQUEAN. */
  private crearMapa(): Phaser.Tilemaps.TilemapLayer[] {
    return [MAPA, DECORACION].map((datos, i) => {
      const mapa = this.make.tilemap({ data: datos, tileWidth: TAMANO_TILE, tileHeight: TAMANO_TILE });
      const tileset = mapa.addTilesetImage("tiles", "tiles", TAMANO_TILE, TAMANO_TILE, 0, 0)!;
      const capa = mapa.createLayer(0, tileset, 0, 0)!;
      capa.setCollision(BLOQUEAN);
      capa.setDepth(i === 0 ? -2 : -1); // siempre por debajo de personajes y objetos
      return capa;
    });
  }


  // ---------- Interfaz ----------
  private crearInterfaz(): void {
    const estilo = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 4, y: 2 } };
    // setScrollFactor(0) = "pegado a la pantalla": no se mueve con la cámara.
    // Profundidad 20000: por encima de todo el mundo (cuya profundidad es su y, como mucho 960).
    this.textoEstado = this.add.text(8, 6, "", estilo).setScrollFactor(0).setDepth(20000);
    this.textoAyuda = this.add.text(320, 470, "", estilo).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20000);
    this.textoAviso = this.add.text(320, 40, "", { ...estilo, fontSize: "14px" })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(20000).setVisible(false);
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
