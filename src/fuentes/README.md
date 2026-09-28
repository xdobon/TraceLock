# Fuentes incrustadas

`pliant.woff` y `azeret.woff` son subconjuntos de las fuentes variables de Google Fonts
(**Pliant** para la interfaz y **Azeret Mono** para datos monoespaciados), licenciadas bajo la
SIL Open Font License 1.1 (`Pliant-OFL.txt`, `AzeretMono-OFL.txt`).

Se incrustan en `tracelock.html` como `data:` URI, así que la aplicación **no hace ninguna
petición externa** y funciona igual sin conexión. La política de seguridad del propio fichero solo
permite `font-src data:`, de modo que cargarlas desde un servidor externo no funcionaría.

## Cómo se generaron

Subconjunto con `fontTools`: latín básico y extendido, puntuación y los símbolos que usa la
interfaz. En Pliant se fija el eje de anchura (`wdth=100`) y se conserva el de peso (100–900).

```
pyftsubset Pliant-VariableFont_wdth,wght.ttf \
  --unicodes='U+0020-007E,U+00A0-00FF,U+0100-017F,U+0192,U+2000-206F,U+20AC,U+2190,U+2192,U+21B5,U+2212,U+2248,U+2260,U+25B8,U+25BE' \
  --layout-features=kern,liga,tnum,calt --drop-tables+=DSIG --no-hinting --desubroutinize \
  --flavor=woff --output-file=pliant.woff
```

Se usa **woff** y no woff2 porque el entorno donde se generaron no tenía el codificador Brotli.
Regenerarlas en woff2 ahorraría unos 15 KB del fichero final; el formato es compatible con todos
los navegadores que TraceLock soporta.

## Símbolos que no traen

Ninguna de las dos incluye ✓ ni ✗ (se usan en la preparación para el cierre y en los vínculos de
indicadores): el navegador los muestra con la fuente del sistema.
