# Guía del prototipo, paso a paso

Este prototipo hace tres cosas: dibuja un mapa de casillas (tiles), te deja mover un personaje con WASD y, al pulsar **E** junto a un cofre, tira un d20 con las reglas de D&D para intentar forzarlo.

## 1. Cómo arrancarlo en tu ordenador

Necesitas [Node.js](https://nodejs.org) (versión 20 o superior). Node es lo que permite ejecutar JavaScript fuera del navegador y trae `npm`, el gestor de paquetes.

```bash
cd cliente
npm install      # descarga Phaser, TypeScript y Vite en la carpeta node_modules
npm run dev      # arranca un servidor local
```

Abre en el navegador la dirección que aparece (normalmente `http://localhost:5173`). Si cambias un archivo y lo guardas, la página se recarga sola.

## 2. Las piezas

| Herramienta | Para qué sirve |
| --- | --- |
| **TypeScript** | Es JavaScript con *tipos*: le dices que `fuerza` es un número y te avisa si por error le pones un texto. Detecta errores antes de ejecutar. |
| **Phaser 3** | Motor de juegos 2D para el navegador. Se encarga de dibujar, leer el teclado, la física y el bucle de juego. |
| **Vite** | Convierte el TypeScript en JavaScript que entiende el navegador y sirve la página mientras programas. |

## 3. Estructura de carpetas

```text
cliente/
├── index.html              La página web. Solo carga src/main.ts
├── package.json            Lista de dependencias y comandos (npm run dev, build)
├── tsconfig.json           Configuración de TypeScript (modo estricto)
├── vite.config.ts          Configuración de Vite (rutas relativas para GitHub Pages)
└── src/
    ├── main.ts             Configura Phaser y arranca la escena
    ├── scenes/
    │   └── EscenaJuego.ts  Todo lo que pasa en pantalla
    ├── mundo/
    │   ├── mapa.ts         El mapa como cuadrícula de números y los cofres
    │   └── personaje.ts    Atributos de D&D, clase y el personaje de prueba
    └── reglas/
        └── dados.ts        Tirar dados, modificadores y la regla d20 vs CD
```

**La idea más importante:** `reglas/` no sabe nada de gráficos y `scenes/` no sabe hacer cuentas de dados. Esto se llama *separar responsabilidades*. Gracias a eso, en la fase 2 moveremos `dados.ts` al servidor sin tocarlo, porque el servidor es quien debe tirar los dados para que nadie haga trampas.

## 4. Archivo por archivo

### `reglas/dados.ts`: las reglas

```ts
export function tirarDado(caras: number): number {
  return Math.floor(Math.random() * caras) + 1;
}
```

- `export` permite que otros archivos usen esta función con `import`.
- `(caras: number): number` significa: recibe un número y devuelve un número.
- `Math.random()` da un decimal entre 0 y 0,999... Multiplicado por 20 da 0 a 19,99. `Math.floor` lo deja en 0 a 19, y el `+ 1` lo pasa a 1 a 20.

```ts
export function modificador(puntuacion: number): number {
  return Math.floor((puntuacion - 10) / 2);
}
```

Es la regla de D&D: Fuerza 15 da (15 − 10) / 2 = 2,5, redondeado hacia abajo, **+2**. Fuerza 8 da −1.

`tiradaContraDificultad(modificador, dificultad)` aplica la regla del juego: tira el d20, suma el modificador, mira si es 20 o 1 natural y compara con la CD. Devuelve un objeto `ResultadoTirada`. Esa `interface` es un "molde" que dice qué campos tiene el resultado.

### `mundo/personaje.ts`: los datos del personaje

Define los seis atributos (`fuerza`, `destreza`, `constitucion`, `inteligencia`, `sabiduria`, `carisma`) y el tipo `Clase`:

```ts
export type Clase = "Guerrero" | "Pícaro" | "Mago" | "Clérigo";
```

El `|` significa "o". Si escribes `clase: "Bardo"`, TypeScript da error porque no está en la lista. `personajeDePrueba` es una guerrera con un reparto válido de compra por puntos (27 puntos).

### `mundo/mapa.ts`: el mapa

El mapa es un **array de arrays** (una tabla): cada fila es un array de números y cada número es una casilla. `0` es hierba, `1` árbol y `2` agua. `MAPA[fila][columna]` te da la casilla. Prueba a cambiar un 0 por un 1 y verás aparecer un árbol.

`COFRES` es una lista de objetos con su posición en casillas y su CD. Cuanto más lejos, más difícil: es un adelanto del "mapa por profundidad".

### `main.ts`: la configuración

Crea el juego con un objeto `config`: tamaño 640×480, `pixelArt: true` para que los píxeles no se vean borrosos, física `arcade` (cajas que chocan) y la escena que arranca.

### `scenes/EscenaJuego.ts`: el juego en sí

Es una **clase** que *hereda* (`extends`) de `Phaser.Scene`. Heredar significa que recibe todo lo que una escena de Phaser ya sabe hacer, y nosotros solo añadimos lo nuestro. Phaser llama por nosotros a dos métodos:

1. **`create()`**, una vez al empezar: crea las texturas (cuadrados de colores, porque aún no hay pixel art), el mapa, el jugador, los cofres, las colisiones y los textos.
2. **`update()`**, unas 60 veces por segundo. Esto es el **bucle de juego**: leer teclas, mover, comprobar si se pulsó E y actualizar la ayuda.

Movimiento con WASD (`moverJugador`):

```ts
let x = 0;
if (this.teclas.A.isDown) x -= 1;
if (this.teclas.D.isDown) x += 1;
// igual con W y S para la y
const direccion = new Phaser.Math.Vector2(x, y).normalize();
this.jugador.setVelocity(direccion.x * VELOCIDAD, direccion.y * VELOCIDAD);
```

`normalize()` hace que la flecha de dirección mida siempre 1. Sin eso, en diagonal irías un 41 % más rápido (por Pitágoras: √(1² + 1²) ≈ 1,41).

Interactuar (`interactuar`):

1. Busca el cofre más cercano a menos de 44 píxeles (`cofreMasCercano`).
2. Si no hay ninguno, o ya está abierto, lo dice y sale con `return`.
3. Si no, calcula el modificador de Fuerza y llama a `tiradaContraDificultad`.
4. Si hay éxito, marca el cofre como abierto y cambia su dibujo.
5. Muestra la cuenta completa en pantalla, en verde o en rojo, durante 3 segundos.

## 5. Ejercicios para ti (de fácil a difícil)

1. Cambia la `fuerza` de la guerrera a 8 y comprueba que ahora el modificador sale −1.
2. Añade un cuarto cofre en `COFRES` con CD 20.
3. Cambia `VELOCIDAD` y mira el efecto.
4. Haz que el cofre de CD 18 se abra con Destreza en vez de Fuerza (pista: añade un campo `atributo` a `DatosCofre`).
5. Añade la regla de **ventaja**: una función `tiradaConVentaja` que tire dos d20 y se quede con el mayor.

Si te atascas en alguno, pregúntame y lo resolvemos juntos.
