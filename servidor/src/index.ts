// ============================================================
// PUNTO DE ENTRADA DEL SERVIDOR
// Arranca Colyseus y registra la sala "bosque".
// ============================================================
import { defineServer, defineRoom } from "colyseus";
import { SalaBosque } from "./SalaBosque.ts";

const PUERTO = Number(process.env.PORT) || 2567;

const servidor = defineServer({
  rooms: {
    bosque: defineRoom(SalaBosque),
  },
});

servidor.listen(PUERTO).then(() => {
  console.log(`Servidor del bosque escuchando en ws://localhost:${PUERTO}`);
});
