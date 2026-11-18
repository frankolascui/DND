import { defineConfig } from "vite";

// base "./" hace que las rutas sean relativas. Así el juego funciona
// tanto en local como en GitHub Pages (que lo sirve en /dnd/).
export default defineConfig({
  base: "./",
});
