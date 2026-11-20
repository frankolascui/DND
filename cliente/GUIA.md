# Guía del juego, paso a paso

Ahora mismo el juego hace esto: creas tu personaje con las reglas de D&D (clase, origen y compra por puntos), y luego exploras un bosque con WASD. Con **E** interactúas con cofres, una puerta y un PNJ. Cada acción es una prueba de habilidad que se resuelve con un d20 animado.

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
    ├── main.ts                 Configura Phaser y lista las escenas
    ├── scenes/
    │   ├── EscenaCreacion.ts   Pantalla de creación de personaje
    │   └── EscenaJuego.ts      El mundo: moverse, interactuar, tirar
    ├── ui/
    │   ├── DadoVisual.ts       El d20 animado
    │   └── MenuAcciones.ts     Menú de opciones con W/S + E
    ├── mundo/
    │   └── mapa.ts             El mapa, los cofres, la puerta y el PNJ
    └── reglas/                 Solo cuentas, nada de gráficos
        ├── dados.ts            Tirar dados, modificador, d20 contra CD
        ├── habilidades.ts      Los 6 atributos y las 18 habilidades
        ├── compraPorPuntos.ts  La regla de los 27 puntos
        ├── clases.ts           Guerrero, Pícaro, Mago y Clérigo
        ├── origenes.ts         Leñador, Contrabandista y Acólito
        └── personaje.ts        Crea el personaje y calcula PG, CA y bonos
```

**La idea más importante:** `reglas/` no sabe nada de gráficos ni de Phaser y `scenes/` no sabe hacer cuentas de dados. Esto se llama *separar responsabilidades*. Gracias a eso, en la fase 2 moveremos `dados.ts` al servidor sin tocarlo, porque el servidor es quien debe tirar los dados para que nadie haga trampas.

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

### Tipos con varias opciones

```ts
export type NombreClase = "Guerrero" | "Pícaro" | "Mago" | "Clérigo";
```

El `|` significa "o". Si escribes `"Bardo"`, TypeScript da error porque no está en la lista. Lo usamos para clases, atributos y habilidades.

### `mundo/mapa.ts`: el mapa

El mapa es un **array de arrays** (una tabla): cada fila es un array de números y cada número es una casilla. `0` es hierba, `1` árbol y `2` agua. `MAPA[fila][columna]` te da la casilla. Prueba a cambiar un 0 por un 1 y verás aparecer un árbol.

`COFRES`, `PUERTA` y `ERMITANO` dicen dónde está cada cosa, en casillas. Los cofres más lejanos tienen más CD y más oro: es un adelanto del "mapa por profundidad".

### `main.ts`: la configuración

Crea el juego con un objeto `config`: tamaño 640×480, `pixelArt: true` para que los píxeles no se vean borrosos, física `arcade` (cajas que chocan) y la lista de escenas. La primera de la lista (la de creación de personaje) es la que arranca.

### `scenes/EscenaJuego.ts`: el juego en sí

Es una **clase** que *hereda* (`extends`) de `Phaser.Scene`. Heredar significa que recibe todo lo que una escena de Phaser ya sabe hacer, y nosotros solo añadimos lo nuestro. Phaser llama por nosotros a estos métodos:

1. **`init(datos)`**, al arrancar, con el personaje que le pasa la escena de creación.
2. **`create()`**, una vez al empezar: crea las texturas (cuadrados de colores, porque aún no hay pixel art), el mapa, el jugador, los cofres, las colisiones y los textos.
3. **`update()`**, unas 60 veces por segundo. Esto es el **bucle de juego**: leer teclas, mover, comprobar si se pulsó E y actualizar la ayuda.

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

Lo que pasa al pulsar E se explica en la sección 5.

### `ui/DadoVisual.ts`: el dado animado

Cuando intentas algo, aparece un d20 en el centro. Pulsas E (o haces clic) y gira hasta pararse en el resultado.

**La idea clave: el dado no decide nada.** El resultado lo calcula `tiradaContraDificultad` en `reglas/dados.ts` *en el momento del lanzamiento*, y el dibujo solo gira hasta ese número. Separar "qué pasa" de "cómo se ve" es lo que nos permitirá que, en la fase 2, el servidor tire el dado y tu pantalla solo lo anime.

El dado es una **máquina de estados**: solo puede estar en uno de cuatro estados, y cada pulsación de E hace algo distinto según el estado en que esté.

```text
oculto --(acción)--> esperando --(E)--> girando --(se para)--> resultado --(E)--> oculto
```

Conceptos nuevos:

- **Callback (función que se pasa a otra función).** En `interactuar()` hacemos `this.dado.mostrar(titulo, () => { ... })`. Esa función flecha *no se ejecuta ahí*: el dado la guarda y la llama cuando la lanzas. Igual con `alRevelar`, que abre el cofre justo cuando el dado se para, para que haya suspense.
- **Tween.** Es una animación de un valor de A a B en un tiempo dado. `addCounter` cuenta de 0 a 1 en 1,4 segundos con `ease: "Cubic.Out"` (rápido al principio, lento al final). En cada paso giramos el dado y cambiamos el número al azar, cada vez más despacio.
- **Container.** Agrupa la forma y el número para que giren juntos.
- **`?.` (encadenamiento opcional).** `resultado.alRevelar?.()` significa: "si existe `alRevelar`, llámala; si no, no hagas nada".

En `update()` de la escena hay un `if (this.dado.estaActivo())` al principio: mientras el dado está en pantalla, el jugador no se mueve y la E se la queda el dado.

## 5. Fase 1: personaje y reglas de D&D

### Cómo se calcula una prueba de habilidad

```text
d20 + modificador del atributo + competencia (si eres competente)  ≥  CD
```

Ejemplo con un pícaro de DES 15 que abre una cerradura (Juego de manos, CD 8): modificador de DES +2, competente +2, así que tira d20 + 4. Le basta con sacar un 4 o más. Un guerrero de DES 13 sin competencia tiraría d20 + 1.

Esto lo hace `bonoHabilidad()` en `reglas/personaje.ts`:

1. `ATRIBUTO_DE[habilidad]` dice de qué atributo depende (Juego de manos → destreza).
2. `modificador(...)` convierte la puntuación en modificador.
3. Si la habilidad está en `p.competencias`, se suma `bonificadorCompetencia(nivel)` (+2 en nivel 1).

Regla de la casa: en D&D el 20 natural automático es para ataques; aquí también lo aplicamos a las pruebas para que el dado sea más emocionante. Se puede quitar en `tiradaContraDificultad`.

### Compra por puntos (`reglas/compraPorPuntos.ts`)

Todas las puntuaciones empiezan en 8 y tienes 27 puntos. La tabla `COSTE` guarda el coste **total** de cada puntuación (15 cuesta 9). Para saber si puedes subir de 13 a 14 restamos `COSTE[14] - COSTE[13] = 2` y miramos si te quedan 2 puntos. Al cambiar de clase se carga un reparto recomendado que gasta los 27.

Conceptos: `Record<Atributo, number>` es un objeto con una clave por atributo. TypeScript se queja si falta alguno.

### Clases y orígenes (`clases.ts`, `origenes.ts`)

Son **datos**, no código: una lista de objetos. Añadir una clase nueva es añadir un objeto a la lista, sin tocar la lógica. Esto se llama programar "dirigido por datos" y es como trabajan casi todos los juegos.

`crearPersonaje()` lo junta todo:

- PG = dado de golpe + modificador de CON (pícaro con CON 14: 8 + 2 = 10).
- CA = base de la armadura + DES con tope (pícaro con cuero: 11 + 2 = 13).
- Competencias = las de la clase + las del origen, sin repetir. Para eso usamos un `Set`.

### La pantalla de creación (`EscenaCreacion.ts`)

Cada fila es un elemento del array `FILAS`. W/S cambian `this.fila`, y A/D cambian el valor de esa fila. Después de **cualquier** cambio se llama a `dibujar()`, que vuelve a calcular el personaje desde cero y repinta los textos. Es más sencillo que ir actualizando cada número por separado, y evita que se desincronicen.

Al pulsar E en "Empezar aventura": `this.scene.start("EscenaJuego", { personaje })`. El segundo argumento llega a `init(datos)` de la otra escena. Así se pasan datos entre escenas.

### Interactuables y el menú (`EscenaJuego.ts`, `MenuAcciones.ts`)

Cofres, puerta y ermitaño cumplen la misma `interface Interactuable`: un nombre, un objeto en el mapa y una función `pruebas()` que devuelve qué se puede intentar **ahora**. Por ejemplo, un cofre abierto devuelve `[]` y el ermitaño deja de ofrecer la poción cuando ya te la ha dado.

Cada `Prueba` dice la habilidad, la CD, los mensajes y un `efectoExito` (abrir, dar oro, quitar la puerta). El efecto se ejecuta solo cuando el dado se para.

El `update()` ahora tiene tres "modos", en orden: dado en pantalla → menú abierto → moverse. Cada modo termina con `return` para que no se mezclen.

Las variables `abierto`, `haDadoPocion`... viven dentro de `crearCofres()` o `crearErmitano()`, pero las funciones flecha de dentro las siguen recordando aunque esa función ya haya terminado. Eso se llama **clausura** (closure).

## 6. Fase 2: el servidor multijugador

### Cómo arrancarlo todo

Hacen falta **dos terminales**, una para el servidor y otra para el juego:

```bash
# Terminal 1: el servidor
cd servidor
npm install
npm run dev        # escucha en ws://localhost:2567

# Terminal 2: el juego
cd cliente
npm install
npm run dev        # abre http://localhost:5173
```

Abre `http://localhost:5173` en **dos pestañas**, crea un personaje en cada una y verás al otro moverse en azul. Si abres un cofre en una pestaña, en la otra también aparece abierto.

Si no arrancas el servidor (o en GitHub Pages, donde no hay servidor), el juego entra en **modo solo** y funciona igual. Arriba a la derecha pone `Online (2/4)` o `Solo`.

### Quién manda: el servidor

```text
Tú pulsas E ──"intentar cofre-1 / forzar"──▶ SERVIDOR
                                              ├─ ¿existe el objeto? ¿estás cerca? ¿se puede hacer?
                                              ├─ tira d20 + bono (con TU personaje, calculado por él)
Tu dado gira ◀──────"resultado: 14"───────────┤
                                              └─ 1,6 s después: abre el cofre en el estado
Todos ven el cofre abierto ◀── sincronización automática del estado
```

El cliente **nunca** dice "he sacado un 20". Solo dice qué quiere intentar. Por eso no se puede hacer trampa tocando el código del navegador. Por la misma razón, al unirte mandas tu *elección* (clase, origen y puntuaciones) y el servidor vuelve a calcular el personaje con `personajeDesdeEleccion()`. Si alguien envía un 18 en Fuerza o se gasta más de 27 puntos, el servidor lo rechaza.

Una concesión: la posición la sigue decidiendo el cliente, y el servidor solo comprueba que esté dentro del mapa. Validar el movimiento contra los árboles es más trabajo y, por ahora, no aporta mucho.

### Archivos nuevos

```text
servidor/src/
├── index.ts          Arranca Colyseus y registra la sala "bosque"
├── estado.ts         Lo que se sincroniza: jugadores y objetos abiertos
└── SalaBosque.ts     La partida: entrar, salir, "mover", "intentar"
cliente/src/
├── reglas/mundo.ts   Qué acciones hay y qué hace cada una (lo usan los dos)
├── mundo/objetos.ts  Cofres, puerta y ermitaño como datos
└── red/
    ├── Conexion.ts       La interface: lo que la escena puede pedir
    ├── ConexionOnline.ts Hablar con el servidor
    ├── ConexionLocal.ts  Jugar solo, con las mismas reglas
    └── conectar.ts       Intenta el servidor; si falla, modo solo
```

**El servidor importa las reglas del cliente** (`../../cliente/src/reglas/...`). Así solo existe una versión de las reglas, y no pueden ser distintas en un lado y en otro.

### Conceptos nuevos

- **Estado sincronizado (`schema`)**: en `estado.ts` describimos los datos con `schema({ x: t.number(), ... })`. Cuando el servidor hace `jugador.x = 100`, Colyseus envía ese cambio, y solo ese, a todos. En el cliente lo recibimos con `Callbacks.get(sala).onAdd(...)` y `onChange(...)`.
- **Mensajes**: `sala.send("intentar", {...})` en el cliente, y `this.onMessage("intentar", ...)` en el servidor. Para contestar a un solo jugador se usa `client.send("resultado", ...)`.
- **Promise, `async` y `await`**: el resultado del servidor tarda unos milisegundos. `intentar()` devuelve una *Promise*, una promesa de que el valor llegará. Dentro de una función `async`, `await` espera a que llegue sin congelar el juego. Lo ves en `DadoVisual.girar()` y en `EscenaJuego.lanzar()`.
- **Interface con dos implementaciones**: `ConexionLocal` y `ConexionOnline` cumplen la misma `interface Conexion`. La escena no sabe cuál tiene, y no le hace falta.
- **`try / catch`**: en `conectar.ts`, si el servidor no responde, el error se "atrapa" y pasamos al modo solo en vez de romper el juego.
- **Interpolación**: los demás jugadores no saltan a su nueva posición. Cada fotograma recorren el 20 % de lo que les falta, y así se mueven suaves aunque las posiciones lleguen cada 50 ms.
- **Retraso del efecto**: el servidor manda el resultado al momento, pero cambia el mundo 1,6 s después (`this.clock.setTimeout`), cuando el dado ya se ha parado. Así el cofre no se abre antes de que veas el número.

## 7. Mapa grande y pixel art

### El mapa se escribe como texto

En `mundo/mapa.ts`, el mapa es una lista de 30 líneas de 40 caracteres. Cada carácter es una casilla:

| Carácter | Casilla | ¿Bloquea? |
| --- | --- | --- |
| `.` | hierba | no |
| `d` | hierba oscura (la Hondonada) | no |
| `=` | camino | no |
| `p` | puente | no |
| `~` | agua | sí |
| `T` | árbol | sí |
| `o` | roca | sí |
| `b` | arbusto | sí |
| `,` | flores | no |
| `"` | hierba alta | no |

Para cambiar el mapa, cambia letras. Por ejemplo, pon una `T` en mitad del camino y aparecerá un árbol que corta el paso.

Distribución: al oeste está el claro de inicio y el ermitaño. En el centro, el lago y el río, que **solo se cruza por el puente**. Al este, la Hondonada (hierba oscura), con el cofre de CD 14 y el recinto cerrado por la puerta.

### Dos capas

El texto se convierte en dos tablas de números, como dos hojas de papel transparente una encima de otra:

- `MAPA` (suelo): hierba, agua, camino, puente.
- `DECORACION` (encima): árboles, rocas, arbustos, flores y hierba alta, con el fondo transparente.

Así el mismo árbol vale para la hierba clara y para la oscura. Para saber qué suelo hay debajo de un árbol, `sueloDe()` mira a los vecinos y elige el color más común.

### Pixel art hecho con código (`ui/pixelArt.ts`)

No hay ningún archivo de imagen: todo se dibuja con código al arrancar.

- Los dibujos miden 16×16 "píxeles de arte" y cada uno se pinta como un cuadrado de 2×2 en pantalla (`ESCALA = 2`).
- Los personajes y objetos se escriben como **texto con paleta**: `"kGGhhGGk"` significa contorno, verde, verde, brillo... Cada letra es un color de la `Paleta`.
- Los personajes son simétricos. Solo escribimos la mitad izquierda y `simetrico()` la refleja.
- Cada clase usa el mismo cuerpo con otra paleta y otra arma (`espada`, `daga`, `baston`, `maza`).
- La hierba, el agua y el camino usan manchas "aleatorias" con semilla fija (`aleatorio(semilla)`). Parecen desordenadas, pero salen siempre iguales.

### Animación

Cada personaje tiene 3 cuadros: quieto, paso A y paso B. `anims.create` monta la animación `guerrero-andar` (A, quieto, B, quieto...) a 8 cuadros por segundo. En `animar()`:

- si te mueves, se reproduce la animación; si no, se queda en el cuadro "quieto";
- si vas a la izquierda, `setFlipX(true)` dibuja el personaje en espejo;
- `setDepth(y)` hace que lo que está más abajo en pantalla se dibuje delante (pseudo-3D).

### Cámara

El mundo mide 1280×960 y la pantalla 640×480, así que `cameras.main.startFollow(jugador)` hace que la cámara siga al jugador. Los textos de la interfaz, el menú y el dado llevan `setScrollFactor(0)` para quedarse quietos en pantalla.

## 8. Ejercicios para ti (de fácil a difícil)

1. Crea un guerrero y un pícaro y compara qué bono tiene cada uno en "Abrir la cerradura". ¿Por qué es distinto?
2. Añade un cuarto cofre en `COFRES` con CD 20 y 100 de oro.
3. Cambia `VELOCIDAD` y mira el efecto.
4. Añade al cofre una tercera opción: "Romperlo con magia" con Arcanos.
5. Añade la regla de **ventaja**: una función `tiradaConVentaja` que tire dos d20 y se quede con el mayor.
6. Añade un cuarto origen en `origenes.ts` (por ejemplo, "Cazador" con Percepción y Supervivencia).
7. Haz que el ermitaño ofrezca una opción de Engaño CD 13.
8. Cambia `DURACION_GIRO` en `DadoVisual.ts` o el color del dado (busca `0x6b2fb3`).

9. (Fase 2) Haz que el servidor escriba en la terminal cada tirada: quién, qué y cuánto sacó (pista: `console.log` en `SalaBosque.intentar`).
10. (Fase 2) Muestra a los demás jugadores un aviso cuando alguien abre un cofre (pista: `this.broadcast(...)` en el servidor y `sala.onMessage(...)` en el cliente).

11. (Arte) Cambia el color de la túnica del pícaro en `SPRITES.picaro.paleta`.
12. (Mapa) Abre un segundo puente en el río, más al sur.
13. (Arte) Diseña un sombrero distinto para el clérigo cambiando las primeras filas de un cuerpo nuevo.

Si te atascas en alguno, pregúntame y lo resolvemos juntos.
