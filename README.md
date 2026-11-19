# DND

RPG web en pixel art donde cada acción se resuelve tirando dados con reglas de D&D 5.ª edición, con progresión por talentos y un mapa que se vuelve más peligroso con la profundidad.

- Juego publicado: https://frankolascui.github.io/dnd/
- Guía del código: [cliente/GUIA.md](cliente/GUIA.md)

## Arrancar en local

En dos terminales:

```bash
cd servidor && npm install && npm run dev   # servidor multijugador (ws://localhost:2567)
cd cliente && npm install && npm run dev    # juego (http://localhost:5173)
```

Sin servidor, el juego funciona en modo solo (así se publica en GitHub Pages).

## Estructura

- `cliente/`: el juego en el navegador (Phaser 3 + TypeScript + Vite).
- `servidor/`: servidor multijugador (Node + Colyseus). Tira los dados y guarda el estado del mundo.

Reglas basadas en el SRD 5.2 de D&D, publicado bajo licencia CC-BY-4.0.
