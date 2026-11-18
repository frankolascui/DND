# DND

RPG web en pixel art donde cada acción se resuelve tirando dados con reglas de D&D 5.ª edición, con progresión por talentos y un mapa que se vuelve más peligroso con la profundidad.

- Juego publicado: https://frankolascui.github.io/dnd/
- Guía del código: [cliente/GUIA.md](cliente/GUIA.md)

## Arrancar en local

```bash
cd cliente
npm install
npm run dev
```

## Estructura

- `cliente/`: el juego en el navegador (Phaser 3 + TypeScript + Vite).
- `servidor/`: llegará en la fase 2 (Node + Colyseus).

Reglas basadas en el SRD 5.2 de D&D, publicado bajo licencia CC-BY-4.0.
