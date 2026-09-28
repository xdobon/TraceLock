# Estructura del proyecto y build

TraceLock se distribuye como **un único fichero `.html`** sin dependencias ni
servidor: eso no cambia. Lo que cambia es que el código fuente ya no vive
dentro de ese único fichero, para poder revisarlo y versionarlo con sentido
en GitHub (PRs legibles, diffs por módulo, historial por sección).

```
tracelock/
├── build.js                 ← script de ensamblado (Node, sin dependencias)
├── package.json
├── src/
│   ├── html/
│   │   ├── 01-cabecera.html                  (DOCTYPE, <head>, meta CSP, apertura <style>)
│   │   ├── 02-cuerpo-y-apertura-script.html   (cierre </style>, <body>, marcado, apertura <script>)
│   │   └── 03-cierre.html                     (cierre </script></body></html>)
│   ├── colores/
│   │   └── colores.json                       (paleta: fuente única de los colores)
│   ├── css/
│   │   └── estilos.css                        (contenido íntegro de <style>)
│   └── js/
│       ├── manifest.json                      (orden de ensamblado — es la fuente de verdad)
│       ├── 01-sha256.js
│       ├── 02-estado-utilidades.js
│       ├── ... (35 módulos en total, uno por sección funcional)
│       └── 33-arranque.js
├── tracelock.html            ← fichero final, en la raíz: el que se distribuye y se abre con doble clic
└── dist/                     (solo local, fuera del repositorio)
    └── tracelock-dev.html    ← la misma aplicación con el panel de colores
```

## Cómo se hizo el corte

Los 35 módulos de `src/js/` respetan los separadores de sección que ya
existían en el código original (`/* ================= ... ================= */`).
No se ha movido ni reescrito ninguna línea de lógica: es un corte mecánico
por límites de sección, verificado byte a byte contra el original (ver
`CHANGELOG.md`).

## Cómo reconstruir `tracelock.html`

```bash
node build.js
# o, si prefieres pasar por npm:
npm run build
```

No hace falta `npm install`: `build.js` no tiene dependencias, solo usa
`fs`/`path` del propio Node. Node únicamente hace falta para *generar* el
fichero en desarrollo — el usuario final sigue sin necesitar Node, servidor
ni build propio: abre `tracelock.html` y ya está.

## Cómo añadir o mover código

1. Edita el módulo correspondiente en `src/js/` (o crea uno nuevo si la
   sección lo justifica).
2. Si creas un módulo nuevo, añádelo a `src/js/manifest.json` en la posición
   donde deba ejecutarse — el orden del array **es** el orden de ensamblado,
   y varias funciones dependen de que ciertas constantes ya existan (por
   ejemplo, casi todo depende de `esc()`/`escJs()` definidos en
   `03-hardening.js`, y de `SCHEMA`/`ASIENTOS` en `04-registro-encadenado.js`).
3. Ejecuta `node build.js` y prueba `tracelock.html` en el navegador.
4. Las autopruebas embebidas (`ejecutarAutopruebas()`, dentro de
   `32-autodiagnostico.js`) siguen funcionando igual sobre el fichero
   reconstruido: son el primer filtro antes de dar un cambio por bueno.

## Qué falta para que esto sea un pipeline "de verdad"

Esto es un build casero, no una toolchain. Deliberadamente no se ha añadido
webpack/esbuild/rollup ni transpilado nada: no aporta nada aquí y añadiría
una dependencia externa a un proyecto cuyo valor es precisamente no
necesitar instalar nada. Si el proyecto crece, lo siguiente natural sería:

- Un lint (p. ej. ESLint con config plana) corriendo sobre `src/js/*.js`.
- Ejecutar `ejecutarAutopruebas()` en un runner de Node (jsdom o similar)
  dentro de GitHub Actions en cada PR, en vez de solo manualmente en el
  navegador.
- Publicar `tracelock.html` como *release asset* versionado, sin
  comprometerlo directamente en `main` junto al código fuente (o, si se
  prefiere tenerlo en el repo para acceso directo, dejarlo claro en el
  README de cara al usuario final: "descarga el último release", no "clona
  el repo y busca el HTML").

## Panel de colores (versión de desarrollo)

`node build.js` genera además `dist/tracelock-dev.html`: la misma aplicación con un panel para editar
en vivo los colores de `src/colores/colores.json` (`src/dev/panel-colores.js`). Es una herramienta de
diseño: no se distribuye y está excluida del repositorio en `.gitignore`. Para llevar un cambio de
color al código, exporta `colores.json` desde el panel y sustituye el de `src/colores/`.
