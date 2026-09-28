# TraceLock

**Gestión de incidentes y trazabilidad de evidencias en un único fichero HTML.**
Sin instalación, sin servidor y sin que ninguna evidencia salga de tu equipo.

Todo el caso vive en una carpeta de tu disco: las evidencias con su huella, quién las tiene, cada
verificación, lo que ha hecho el equipo y un registro encadenado por hash que permite detectar
cualquier modificación posterior.

![Resumen de un caso en TraceLock](docs/img/02-resumen.png)

## Empezar en dos minutos

1. Descarga `tracelock.html` de la [última release](../../releases) y comprueba su SHA-256
   contra el publicado.
2. Ábrelo con **Chrome o Edge** (son los únicos navegadores que permiten a una página escribir en
   una carpeta local).
3. Pulsa **Abrir un caso** y elige una copia de `ejemplos/IR-2026-031-Phishing-Finanzas/` para ver un
   expediente completo, o **Crear un caso** para empezar el tuyo.

Antes de trabajar con un caso real, ejecuta el **autodiagnóstico** (Ajustes): comprueba que esa copia
del fichero funciona como debe, sin instalar nada.

## Qué hace

- **Trazabilidad de evidencias.** Alta con SHA-256 y MD5 calculados por bloques, datos de adquisición
  obligatorios, cotejo con el hash declarado en origen, copia de trabajo automática, transferencias
  registradas y acta exportable.
- **Registro encadenado.** Cada asiento lleva la huella del anterior. Nada se borra: las
  rectificaciones se añaden. Un sello externo, guardado fuera de la carpeta, detecta también las
  reconstrucciones completas del registro.
- **Verificación automática.** Al abrir el caso se comprueban todas las evidencias en segundo plano,
  sin bloquear la interfaz.
- **Análisis de correo.** `.eml` y `.msg`: cabeceras, cadena de entrega, autenticación, URLs,
  adjuntos e indicios de suplantación. El HTML nunca se inserta en la página.
- **Indicadores.** Se recogen solos del análisis, se valoran con justificación obligatoria y se
  relacionan en un grafo de «qué comprometió qué».
- **Clasificación.** CCN-STIC 817 (con obligación de notificar y plazo de cierre), RSIT de ENISA y el
  esquema de CISA, cada uno con su justificación e historial.
- **Coordinación.** Hitos con horas selladas al pulsar, cronología del ataque con huso y fuente,
  preguntas abiertas, notas rápidas y técnicas MITRE ATT&CK.
- **Entrega.** Acta de evidencias, relación de indicadores, situación del caso e informe de respuesta al incidente
  en Word y PDF, además de exportaciones en CSV y JSONL.
- **Laboratorio.** Transformaciones locales (Base64, hexadecimal, JWT, indicadores, huellas) y
  lectura de metadatos, que se puede anotar en el expediente.

## Qué **no** hace

Escrito aquí a propósito, porque en respuesta a incidentes importa más que la lista de funciones:

- **No sustituye al acta de adquisición.** Dar de alta una evidencia documenta su entrada en este
  sistema, no cómo se obtuvo del equipo original.
- **No es prueba autónoma ante terceros.** Las horas salen del reloj de tu equipo y nadie las
  certifica; el nombre del analista es declarado, no autenticado.
- **No impide modificar ficheros, solo lo detecta.**
- **No sustituye a un bloqueador de escritura ni a un almacenamiento inmutable.** La separación entre
  original y copia de trabajo es lógica y documental.

Detalle completo en [`THREAT_MODEL.md`](THREAT_MODEL.md).

## Requisitos

| Navegador | Qué puedes hacer |
|---|---|
| **Chrome o Edge** | Todo. |
| **Firefox** | Modo reducido: calcula huellas, pero no copia ficheros y el registro vive en la pestaña. |

La única conexión externa es la descarga de las fuentes tipográficas. Sin conexión funciona igual,
con la fuente del sistema.

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/MANUAL.md`](docs/MANUAL.md) | Manual de usuario completo, con capturas. |
| [`docs/MANUAL.en.md`](docs/MANUAL.en.md) | User manual in English. |
| [`ejemplos/README.md`](ejemplos/README.md) | Caso de ejemplo ficticio, listo para abrir. |
| [`THREAT_MODEL.md`](THREAT_MODEL.md) | Qué protege, qué no y bajo qué supuestos. |
| [`SECURITY.md`](SECURITY.md) | Cómo reportar una vulnerabilidad. |
| [`README-build.md`](README-build.md) | Cómo se ensambla el fichero único desde `src/`. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Cómo contribuir. |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de cambios y decisiones. |

## Desarrollo

```bash
npm install             # instala Playwright y descarga Chromium
npm run build           # ensambla src/ en tracelock.html
npm run test:todo       # construye y pasa todas las pruebas
```

| Comando | Qué comprueba |
|---|---|
| `npm test` | Las 41 autopruebas que viajan dentro del propio HTML. |
| `npm run test:i18n` | Que no queda texto sin traducir con la interfaz en inglés. |
| `npm run test:ejemplo` | Que el caso de ejemplo abre con la cadena íntegra y las huellas correctas. |
| `npm run test:fuzz` | Que los lectores de correo, OLE2, ZIP, PDF e imágenes aguantan entradas malformadas. No entra en `test:todo`: tarda más y se ejecuta al tocar un lector. |

`tracelock.html` se genera desde `src/` y se versiona en el repositorio para que se pueda
descargar sin compilar nada. Si cambias `src/`, reconstruye antes de enviar los cambios.

## Estado y límites conocidos

TraceLock se ha utilizado en incidentes reales y se ha probado a fondo en Chromium (autopruebas,
medición de rendimiento con un caso de 3,1 GB y validación del caso de ejemplo). El trabajo simultáneo
de varios analistas sobre una misma carpeta compartida tiene las limitaciones que describe
[`THREAT_MODEL.md`](THREAT_MODEL.md). Los límites abiertos están en el
[`CHANGELOG.md`](CHANGELOG.md#límites-conocidos). Si lo usas, abre una issue con lo que encuentres.

## Autoría y licencia

TraceLock es obra de **Xavier Dobon**. Se distribuye bajo la licencia Apache 2.0: ver
[`LICENSE`](LICENSE) y [`NOTICE`](NOTICE), que recoge también las licencias de los iconos y las
fuentes de terceros que incluye.
