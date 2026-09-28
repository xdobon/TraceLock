# Iconos

Iconos de [Iconoir](https://iconoir.com) (licencia MIT, `LICENSE-iconoir.txt`), retícula 24×24 y
grosor 1,5. Normalizados para usar `currentColor`, de modo que heredan el color del texto y
funcionan igual en modo noche y en modo día sin duplicar nada.

`build.js` los junta en un sprite `<svg>` oculto al principio del `<body>` y se usan así:

```html
<svg class="ic"><use href="#ic-check"/></svg>
```

El identificador es `ic-` más el nombre del fichero. El tamaño se controla con CSS (`.ic`, y las
variantes `.ic-sm` y `.ic-lg`), no con atributos en el marcado.

Van incrustados en el propio fichero porque la CSP de TraceLock no permite recursos externos:
la vía del `<link>` a un CDN que documenta Iconoir no funcionaría aquí.

## Pares correlacionados

| Sin círculo | Con círculo |
|---|---|
| `check` | `success` |
| `close` | `error` |
| `exclamation` | `info-circle` (no es su par: `exclamation` son los trazos de `warning-circle` sin el círculo, para usarlo dentro de `.tick`) |

## Añadir uno nuevo

Descargar el SVG de iconoir.com, dejarlo en esta carpeta con el nombre en minúsculas y guiones, y
sustituir `#000000` por `currentColor`. `build.js` lo recoge solo.
