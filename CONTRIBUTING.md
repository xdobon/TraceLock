# Contribuir a TraceLock

Gracias por dedicarle tiempo. Antes de nada:

- Si es un **fallo de seguridad**, no abras un issue: sigue el proceso de
  `SECURITY.md`.
- Si vas a proponer un cambio de comportamiento no trivial (no un typo o
  un fix pequeño), abre antes un issue para discutir el enfoque — este
  proyecto tiene decisiones de diseño deliberadas (ver `THREAT_MODEL.md`
  y el `CHANGELOG.md`) que conviene no chocar sin querer.

## El código está modularizado — reglas obligatorias

El fuente vive en `src/` (ver `README-build.md` para la estructura
completa). Reglas que hay que respetar sí o sí:

1. **Nunca edites `tracelock.html` a mano.** Es un artefacto
   generado. Cualquier cambio ahí se pierde en el siguiente `node build.js`.
2. **El orden de `src/js/manifest.json` importa.** Varios módulos asumen
   que algo definido antes ya existe en el ámbito global (por ejemplo,
   casi todo depende de `esc()`/`escJs()` de `03-hardening.js`, y de
   `SCHEMA`/`ASIENTOS` de `04-registro-encadenado.js`). Si añades un
   módulo nuevo, colócalo en el manifest en la posición donde
   funcionalmente le corresponde, no al final por comodidad.
3. **Un módulo, una responsabilidad.** Si tu cambio no encaja bien en
   ninguno de los 33 módulos existentes, es una señal de que quizá
   merece su propio fichero — mejor eso que mezclar responsabilidades
   dentro de un módulo que ya tiene otra.

## Flujo de trabajo

```bash
# 1. Edita el módulo correspondiente en src/js/, src/css/ o src/html/
# 2. Reconstruye el HTML final
node build.js

# 3. Abre tracelock.html en Chrome o Edge
#    (File System Access API no funciona en Firefox/Safari; ver THREAT_MODEL.md)

# 4. Corre las autopruebas embebidas: menú de la app → Autodiagnóstico
#    Si algo falla, tu cambio no está listo para PR.
```

Antes de abrir el PR, comprueba que:

- [ ] `node build.js` termina sin errores.
- [ ] El autodiagnóstico interno pasa sin fallos nuevos.
- [ ] No has tocado `tracelock.html` directamente (debe ser
  reproducible desde `src/` + `build.js`).
- [ ] Si tu cambio afecta a algo descrito en `THREAT_MODEL.md`, has
  actualizado ese documento en el mismo PR — no lo dejes desactualizado.
- [ ] Has añadido una entrada nueva en `CHANGELOG.md` (arriba del todo,
  con el mismo formato que las anteriores: qué se pidió, qué se hizo, por
  qué, cómo se verificó, qué queda pendiente).

## CI

El workflow de GitHub Actions (`.github/workflows/ci.yml`) reconstruye el
proyecto y ejecuta las autopruebas de forma automática en cada PR contra
`main`. Un PR con el check en rojo no se revisa hasta que esté en verde.

## Estilo de código

El proyecto no usa framework ni build de transpilación — JavaScript plano,
compatible con Chromium reciente, sin dependencias externas. Mantén esa
restricción: no propongas añadir una librería para algo que se puede
resolver con 15 líneas propias, es una decisión de diseño consciente del
proyecto (ver `README-build.md`), no un descuido.
