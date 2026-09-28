# Proceso de release

TraceLock verifica la integridad del expediente del usuario mediante
hashes SHA-256. Sería inconsistente publicar el propio artefacto sin la
misma disciplina: cada release debe llevar su hash, y ese hash debe poder
verificarse de forma independiente.

## Antes de cada release

1. `node build.js` — reconstruye `tracelock.html` desde `src/`.
2. `node tests/run-autopruebas.js` — confirma que las autopruebas
   embebidas pasan sobre el artefacto reconstruido.
3. Calcula el checksum:
   ```bash
   sha256sum tracelock.html
   ```


## Al publicar el release en GitHub

Adjunta como *release assets*, además del propio `tracelock.html`:

- `tracelock.html.sha256` (salida de `sha256sum`, en texto plano)

Y en la descripción del release, incluye el hash en texto plano para que
se pueda copiar sin descargar nada:

```
SHA-256: <hash>
```

## Cómo puede verificarlo quien se lo descargue

```bash
# reconstruir desde el código fuente y comparar
git clone <repo>
cd tracelock
node build.js
sha256sum tracelock.html
# comparar contra el hash publicado en el release

# o, si solo tiene el .html descargado y el .asc:
gpg --verify tracelock.html.asc tracelock.html
```

## Nota sobre reproducibilidad

El build (`build.js`) es una concatenación determinista de ficheros de
texto en un orden fijo (`src/js/manifest.json`): no depende de la fecha,
del entorno ni de ninguna dependencia externa con versión variable. Dos
personas distintas, en dos máquinas distintas, ejecutando `node build.js`
sobre el mismo commit deben obtener exactamente el mismo `tracelock.html`
byte a byte. Eso es lo que hace útil el checksum: no es "confía en que
publiqué el hash correcto", es "compruébalo tú mismo reconstruyendo desde
el código".
