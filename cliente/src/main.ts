// ============================================================
// PUNTO DE ENTRADA
// Aquí solo configuramos Phaser y le decimos qué escena arrancar.
// ============================================================
import Phaser from "phaser";
import { EscenaCreacion } from "./scenes/EscenaCreacion";
import { EscenaJuego } from "./scenes/EscenaJuego";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,          // usa WebGL si se puede, si no Canvas
  width: 640,
  height: 480,
  pixelArt: true,             // no difumina los píxeles al escalar
  backgroundColor: "#1d2b1f",
  physics: {
    default: "arcade",        // física sencilla: cajas que chocan
    arcade: { debug: false },
  },
  // La primera de la lista es la que arranca.
  scene: [EscenaCreacion, EscenaJuego],
};

new Phaser.Game(config);
