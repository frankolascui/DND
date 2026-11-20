// ============================================================
// PIXEL ART
// Todo el arte del juego se dibuja aquí con código, píxel a píxel.
// Cada dibujo mide 16x16 "píxeles de arte" y se pinta al doble
// (cada píxel de arte = un cuadrado de 2x2 en pantalla), así que
// en pantalla mide 32x32.
//
// Los personajes y objetos se escriben como texto: cada carácter
// es un color según una "paleta" (por ejemplo, "k" = contorno).
// Cambia una letra y cambia el dibujo.
// ============================================================
import Phaser from "phaser";
import {
  NUMERO_DE_BALDOSAS, HIERBA, ARBOL, AGUA, CAMINO, FLORES, HIERBA_ALTA, ROCA,
  ARBUSTO, PUENTE, HIERBA_OSCURA, HIERBA_2, HIERBA_OSCURA_2,
} from "../mundo/mapa";

const ESCALA = 2;   // 1 píxel de arte = 2x2 píxeles de pantalla
const LADO = 16;    // los dibujos miden 16x16 píxeles de arte

/** Una función que pinta un píxel de arte en (x, y) con un color. */
type Pincel = (x: number, y: number, color: string) => void;
type Paleta = Record<string, string>;

// ------------------------------------------------------------
// Herramientas
// ------------------------------------------------------------

/** Crea una textura vacía de `cuadros` dibujos de ancho y devuelve un pincel para cada cuadro. */
function lienzo(escena: Phaser.Scene, clave: string, cuadros: number) {
  const textura = escena.textures.createCanvas(clave, LADO * ESCALA * cuadros, LADO * ESCALA)!;
  const ctx = textura.getContext();
  const pincelDe = (cuadro: number): Pincel => (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect((cuadro * LADO + x) * ESCALA, y * ESCALA, ESCALA, ESCALA);
  };
  return { textura, pincelDe };
}

/** Pinta un dibujo escrito como texto. Los caracteres que no están en la paleta son transparentes. */
function pintarFilas(pincel: Pincel, filas: string[], paleta: Paleta): void {
  filas.forEach((fila, y) => {
    if (fila.length !== LADO) console.warn(`Fila ${y} mide ${fila.length}, no ${LADO}:`, fila);
    [...fila].forEach((caracter, x) => {
      const color = paleta[caracter];
      if (color) pincel(x, y, color);
    });
  });
}

/** Rellena todo el cuadro de un color. */
function rellenar(pincel: Pincel, color: string): void {
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) pincel(x, y, color);
}

/**
 * Números "aleatorios" que siempre salen iguales para la misma semilla.
 * Así la hierba tiene manchas desordenadas, pero no cambia cada vez que recargas.
 */
function aleatorio(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Un sprite simétrico: escribimos la mitad izquierda y la reflejamos. */
function simetrico(mitades: string[]): string[] {
  return mitades.map((mitad) => mitad + [...mitad].reverse().join(""));
}

// ------------------------------------------------------------
// Baldosas del mapa
// ------------------------------------------------------------

function hierba(p: Pincel, base: string, oscuro: string, claro: string, semilla: number): void {
  rellenar(p, base);
  const azar = aleatorio(semilla);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(azar() * LADO);
    const y = Math.floor(azar() * (LADO - 1));
    p(x, y, oscuro);
    p(x, y + 1, oscuro); // briznas de 1x2
  }
  for (let i = 0; i < 6; i++) p(Math.floor(azar() * LADO), Math.floor(azar() * LADO), claro);
}

const VERDE = { base: "#4f8f43", oscuro: "#3f7a37", claro: "#6aa957" };
const VERDE_OSCURO = { base: "#2f5236", oscuro: "#24412b", claro: "#3f6a45" };

const ARBOL_DIBUJO = [
  "................",
  ".....kkkkkk.....",
  "...kkGGGGGGkk...",
  "..kGGhhGGGGGGk..",
  ".kGGhhGGGGgGGGk.",
  ".kGGGGGGGgGGGGk.",
  "kGGGGGgGGGGGGgGk",
  "kGgGGGGGGGgGGGGk",
  "kGGGGgGGGGGGgGGk",
  ".kGGGGGGgGGGGGk.",
  ".kgGGGgGGGGGgGk.",
  "..kkgGGGGGgGkk..",
  "....kkkttkkk....",
  ".....sstTtss....",
  "......stTts.....",
  "................",
];

const ROCA_DIBUJO = [
  "................",
  "................",
  "................",
  "................",
  "......kkkk......",
  "....kkRRRRkk....",
  "...kRRrrRRRRk...",
  "..kRRrrRRRRRRk..",
  "..kRRRRRRRRdRk..",
  ".kRRRRRRRdRRRRk.",
  ".kRRRRRRRRRRdRk.",
  ".kdRRRRRdRRRRdk.",
  "..kddddddddddk..",
  "...sskkkkkkss...",
  "................",
  "................",
];

const ARBUSTO_DIBUJO = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "......kkkk......",
  "....kkGGGGkk....",
  "...kGGhGGGGGk...",
  "..kGhhGGGrGGGk..",
  "..kGGGGGGGGGGk..",
  ".kGGrGGGGGgGGGk.",
  ".kGGGGgGGGGGrGk.",
  "..kgGGGGGgGGGk..",
  "...sskkkkkkss...",
  "................",
  "................",
];

function pintarBaldosas(escena: Phaser.Scene): void {
  const { textura, pincelDe } = lienzo(escena, "tiles", NUMERO_DE_BALDOSAS);
  const sobreHierba = (p: Pincel, semilla: number) => hierba(p, VERDE.base, VERDE.oscuro, VERDE.claro, semilla);

  sobreHierba(pincelDe(HIERBA), 1);
  sobreHierba(pincelDe(HIERBA_2), 2);
  hierba(pincelDe(HIERBA_OSCURA), VERDE_OSCURO.base, VERDE_OSCURO.oscuro, VERDE_OSCURO.claro, 3);
  hierba(pincelDe(HIERBA_OSCURA_2), VERDE_OSCURO.base, VERDE_OSCURO.oscuro, VERDE_OSCURO.claro, 4);

  // Árbol, roca y arbusto: solo el dibujo, con fondo transparente
  // (van en la capa de decoración, encima del suelo).
  const paletaPlantas: Paleta = {
    k: "#1d3b20", G: "#2f6b34", g: "#24552a", h: "#4f9a4a", t: "#6b4426", T: "#4e301a",
    s: "#00000040", r: "#c0392b",
  };
  pintarFilas(pincelDe(ARBOL), ARBOL_DIBUJO, paletaPlantas);
  pintarFilas(pincelDe(ARBUSTO), ARBUSTO_DIBUJO, paletaPlantas);
  pintarFilas(pincelDe(ROCA), ROCA_DIBUJO, { k: "#3a3d42", R: "#8a9098", r: "#b3b9c0", d: "#666b72", s: "#00000040" });

  // Flores: florecitas de colores en forma de cruz (fondo transparente).
  const pFlores = pincelDe(FLORES);
  const colores = ["#f4d03f", "#ffffff", "#e74c3c", "#c39bd3", "#f4d03f"];
  [[3, 3], [11, 2], [7, 8], [2, 12], [12, 11]].forEach(([x, y], i) => {
    pFlores(x, y, colores[i]); pFlores(x - 1, y, colores[i]); pFlores(x + 1, y, colores[i]);
    pFlores(x, y - 1, colores[i]); pFlores(x, y + 1, colores[i]); pFlores(x, y, "#f39c12");
  });

  // Hierba alta: muchas briznas largas (fondo transparente).
  const pAlta = pincelDe(HIERBA_ALTA);
  const azarAlta = aleatorio(10);
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(azarAlta() * LADO);
    const y = 4 + Math.floor(azarAlta() * 10);
    const color = azarAlta() < 0.5 ? "#2f6b2c" : "#7dbb5f";
    for (let k = 0; k < 3; k++) pAlta(x, y + k, color);
  }

  // Agua: azul con olas más claras.
  const pAgua = pincelDe(AGUA);
  rellenar(pAgua, "#2f6fb5");
  const azarAgua = aleatorio(11);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(azarAgua() * 12);
    const y = Math.floor(azarAgua() * LADO);
    for (let k = 0; k < 4; k++) pAgua(x + k, y, "#5b9be0");
  }
  for (let i = 0; i < 4; i++) pAgua(Math.floor(azarAgua() * LADO), Math.floor(azarAgua() * LADO), "#bfe0ff");

  // Camino de tierra con piedrecitas.
  const pCamino = pincelDe(CAMINO);
  rellenar(pCamino, "#b8925a");
  const azarCamino = aleatorio(12);
  for (let i = 0; i < 14; i++) pCamino(Math.floor(azarCamino() * LADO), Math.floor(azarCamino() * LADO), "#9c7744");
  for (let i = 0; i < 8; i++) pCamino(Math.floor(azarCamino() * LADO), Math.floor(azarCamino() * LADO), "#d6b37a");

  // Puente: agua debajo y tablones verticales encima.
  const pPuente = pincelDe(PUENTE);
  rellenar(pPuente, "#2f6fb5");
  for (let y = 1; y < 15; y++) {
    for (let x = 0; x < LADO; x++) {
      const juntura = x % 4 === 3;
      pPuente(x, y, juntura ? "#5a3a1e" : "#8a5a2b");
    }
  }
  for (let x = 0; x < LADO; x++) {
    pPuente(x, 1, "#4a2f17");   // barandillas
    pPuente(x, 14, "#4a2f17");
  }

  textura.refresh(); // le dice a Phaser que el dibujo ha cambiado
}

// ------------------------------------------------------------
// Personajes
// ------------------------------------------------------------

// Cuerpo con casco o capucha (guerrero, pícaro, clérigo): mitad izquierda.
const CUERPO_NORMAL = simetrico([
  "........",
  "....kkkk",
  "...khhhh",
  "..khhhhh",
  "..khssss",
  "..khsess",
  "..khssss",
  "...kSsss",
  "..kkaaaa",
  ".kaaaAaa",
  ".ksaaAgg",
  ".kkaaAaa",
  "..kaaaaa",
]);

// Cuerpo con sombrero picudo y barba (mago, ermitaño).
const CUERPO_SOMBRERO = simetrico([
  ".......k",
  "......kh",
  ".....khh",
  "....khhh",
  ".kkkkkkk",
  "...ksess",
  "...kssss",
  "...kwwww",
  "..kaawww",
  ".kaaaaww",
  ".ksaaaAg",
  ".kaaaaAa",
  ".kaaaaaa",
]);

// Piernas: 3 cuadros -> quieto, paso A, paso B.
const PIERNAS_NORMAL = [
  ["....kbbkkbbk....", "....kbbkkbbk....", "....kkk..kkk...."],
  ["....kbbkkbbk....", "....kbbk.kkk....", "....kkk........."],
  ["....kbbkkbbk....", "....kkk.kbbk....", ".........kkk...."],
];
const PIERNAS_TUNICA = [
  ["..kAAAAAAAAAAk..", "...kbbk..kbbk...", "...kkk....kkk..."],
  ["..kAAAAAAAAAAk..", "...kbbk..kkk....", "...kkk.........."],
  ["..kAAAAAAAAAAk..", "....kkk..kbbk...", "..........kkk..."],
];

/** Píxeles extra de cada clase (el arma). [x, y, letra de la paleta] */
type Detalle = [number, number, string][];
const espada: Detalle = [[14, 3, "m"], [14, 4, "m"], [14, 5, "m"], [14, 6, "m"], [14, 7, "m"], [14, 8, "m"], [13, 9, "g"], [14, 9, "g"], [15, 9, "g"], [14, 10, "b"]];
const daga: Detalle = [[14, 8, "m"], [14, 9, "m"], [14, 10, "b"]];
const baston: Detalle = [[14, 1, "j"], [13, 2, "j"], [15, 2, "j"], [14, 2, "J"], ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((y): [number, number, string] => [14, y, "b"])];
const maza: Detalle = [[14, 6, "g"], [13, 7, "g"], [14, 7, "g"], [15, 7, "g"], [14, 8, "b"], [14, 9, "b"], [14, 10, "b"]];

interface DatosSprite {
  cuerpo: string[];
  piernas: string[][];
  paleta: Paleta;
  detalle: Detalle;
}

const PIEL: Paleta = { k: "#1b1b24", s: "#f1c27d", S: "#c99a5c", e: "#1b1b24", m: "#d5dde5", J: "#7fe3ff", j: "#2a8fb8" };

export const SPRITES: Record<string, DatosSprite> = {
  guerrero: {
    cuerpo: CUERPO_NORMAL, piernas: PIERNAS_NORMAL, detalle: espada,
    paleta: { ...PIEL, h: "#aeb8c2", a: "#b03a2e", A: "#7a2620", g: "#d9b23a", b: "#5b3a24" },
  },
  picaro: {
    cuerpo: CUERPO_NORMAL, piernas: PIERNAS_NORMAL, detalle: daga,
    paleta: { ...PIEL, h: "#2f5d3a", a: "#3d6b45", A: "#24402b", g: "#8a6a3a", b: "#3a2a1e" },
  },
  mago: {
    cuerpo: CUERPO_SOMBRERO, piernas: PIERNAS_TUNICA, detalle: baston,
    paleta: { ...PIEL, h: "#3b4fb3", a: "#4458c4", A: "#2c3a8a", w: "#e8e8e8", g: "#d9b23a", b: "#6b4426" },
  },
  clerigo: {
    cuerpo: CUERPO_NORMAL, piernas: PIERNAS_NORMAL, detalle: maza,
    paleta: { ...PIEL, h: "#e8dcc0", a: "#f0ead8", A: "#c9bc95", g: "#d9b23a", b: "#6b4426" },
  },
  ermitano: {
    cuerpo: CUERPO_SOMBRERO, piernas: PIERNAS_TUNICA, detalle: baston.map(([x, y]): [number, number, string] => [x, y, "b"]),
    paleta: { ...PIEL, h: "#6d6a4a", a: "#7a6a50", A: "#55493a", w: "#dddddd", g: "#a08850", b: "#6b4426" },
  },
};

/** De "Pícaro" a "picaro": quita tildes y pasa a minúsculas. */
export function claveSprite(nombreClase: string): string {
  return nombreClase.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function pintarPersonajes(escena: Phaser.Scene): void {
  for (const [clave, datos] of Object.entries(SPRITES)) {
    const { textura, pincelDe } = lienzo(escena, clave, 3);
    for (let cuadro = 0; cuadro < 3; cuadro++) {
      const p = pincelDe(cuadro);
      pintarFilas(p, [...datos.cuerpo, ...datos.piernas[cuadro]], datos.paleta);
      for (const [x, y, letra] of datos.detalle) p(x, y, datos.paleta[letra]);
      // Registramos cada cuadro con un nombre ("0", "1", "2") para animarlo.
      textura.add(String(cuadro), 0, cuadro * LADO * ESCALA, 0, LADO * ESCALA, LADO * ESCALA);
    }
    textura.refresh();
    // Animación de caminar: paso A, quieto, paso B, quieto...
    escena.anims.create({
      key: `${clave}-andar`,
      frames: ["1", "0", "2", "0"].map((frame) => ({ key: clave, frame })),
      frameRate: 8,
      repeat: -1, // -1 = repetir para siempre
    });
  }
}

// ------------------------------------------------------------
// Objetos: cofres, puerta y sombra
// ------------------------------------------------------------

const COFRE = [
  "................",
  "................",
  "................",
  "................",
  "..kkkkkkkkkkkk..",
  ".kMMMMMMMMMMMMk.",
  ".kmmmmmmmmmmmmk.",
  ".kmmmmmmmmmmmmk.",
  ".kkkkkkggkkkkkk.",
  ".kMMMMMgyyMMMMk.",
  ".kmmmmmggmmmmmk.",
  ".kmmmmmmmmmmmmk.",
  ".kmmmmmmmmmmmmk.",
  ".kkkkkkkkkkkkkk.",
  "..ssssssssssss..",
  "................",
];
const COFRE_ABIERTO = [
  "................",
  "..kkkkkkkkkkkk..",
  ".kMMMMMMMMMMMMk.",
  ".kmmmmmmmmmmmmk.",
  ".kkkkkkkkkkkkkk.",
  ".kddddddddddddk.",
  ".kyyYyyyYyyYyyk.",
  ".kYyyyYyyyyyYyk.",
  ".kkkkkkkkkkkkkk.",
  ".kMMMMMggMMMMMk.",
  ".kmmmmmggmmmmmk.",
  ".kmmmmmmmmmmmmk.",
  ".kmmmmmmmmmmmmk.",
  ".kkkkkkkkkkkkkk.",
  "..ssssssssssss..",
  "................",
];
const PUERTA = [
  "kkkkkkkkkkkkkkkk",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMmmmk",
  "kiiiiiiiiiiiiiik",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMgymk",
  "kMmmmkMmmmkMggmk",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMmmmk",
  "kiiiiiiiiiiiiiik",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMmmmk",
  "kMmmmkMmmmkMmmmk",
  "kkkkkkkkkkkkkkkk",
];

function pintarObjetos(escena: Phaser.Scene): void {
  const paleta: Paleta = {
    k: "#2b1a0e", M: "#a8713a", m: "#8a5a2b", g: "#d9b23a", y: "#ffe066", Y: "#f39c12",
    d: "#1b1208", i: "#5c6670", s: "#00000044",
  };
  for (const [clave, filas] of [["cofre", COFRE], ["cofre-abierto", COFRE_ABIERTO], ["puerta", PUERTA]] as const) {
    const { textura, pincelDe } = lienzo(escena, clave, 1);
    pintarFilas(pincelDe(0), filas as unknown as string[], paleta);
    textura.refresh();
  }
  // Sombra ovalada bajo los personajes.
  const sombra = escena.add.graphics();
  sombra.fillStyle(0x000000, 0.3).fillEllipse(12, 4, 22, 8);
  sombra.generateTexture("sombra", 24, 8);
  sombra.destroy();
}

/** Crea todas las texturas una sola vez (si ya existen, no hace nada). */
export function crearArte(escena: Phaser.Scene): void {
  if (escena.textures.exists("tiles")) return;
  pintarBaldosas(escena);
  pintarPersonajes(escena);
  pintarObjetos(escena);
}
