# Caso de ejemplo: IR-2026-031 · Phishing con robo de sesión

Un caso completo de TraceLock para ver cómo queda un expediente real sin tener que montar uno.
**Todo es ficticio:** la entidad, las personas, los dominios (`.example`, reservados por la RFC 2606)
y las direcciones IP (rangos de documentación de la RFC 5737). No corresponde a ningún incidente real.

```
ejemplos/
├── IR-2026-031-Phishing-Finanzas/   ← la carpeta del caso, tal como la deja TraceLock
├── sello-externo/                   ← el sello externo, fuera de la carpeta del caso (como debe ser)
└── generador/                       ← los scripts con los que se ha generado el caso
```

## El escenario

El 9 de septiembre de 2026, una usuaria del departamento financiero de *Entidad Ejemplo S.A.* recibe
un correo de supuesta factura pendiente. El enlace lleva a un portal falso de inicio de sesión que
funciona como proxy inverso: la usuaria introduce su contraseña y aprueba la MFA, y el atacante
reutiliza la sesión desde otra IP durante unos 16 minutos, hasta que el CSIRT la revoca.

El caso lo llevan dos analistas, **Ana Martín** y **Luis Ortega**, entre el 9 y el 11 de septiembre.

## Qué contiene

- **4 evidencias** con sus originales y copias de trabajo: el correo (`.eml`), la exportación de
  inicios de sesión de Entra ID (`.csv`, con hash de origen declarado), el log del proxy (`.log`, en
  hora local) y la captura del portal falso que hizo la usuaria (`.png`).
- **81 asientos** en `registro.jsonl`: apertura con plantilla de phishing, altas, protección de
  evidencias (incluido un aplazamiento justificado), análisis del correo, 17 indicadores (6 valorados,
  con roles, vínculos y una consulta externa documentada), una operación de laboratorio, lectura de
  metadatos, cronología con dos husos horarios y una rectificación, tres técnicas ATT&CK,
  clasificación CCN-STIC 817, RSIT y CISA, una nota pasada a pregunta, una transferencia de la evidencia
  con verificación al recibirla, seguimiento y bloqueo de hitos, una captura adjunta a un hito, el
  sello externo y una verificación automática.

El caso está **a propósito a medio cerrar**: quedan preguntas abiertas, hitos pendientes e
indicadores sin valorar, para que la **preparación para el cierre** tenga algo que enseñar.

## Cómo abrirlo

1. Descarga o clona el repositorio y **copia la carpeta `IR-2026-031-Phishing-Finanzas`** a otro sitio.
   Al abrirlo, TraceLock añade asientos al registro (como mínimo, el resumen de la verificación
   automática): si trabajas sobre la copia, el original del repositorio queda intacto.
2. Abre `tracelock.html` con **Chrome o Edge**, pulsa **Abrir un caso** y elige la copia.

## Qué merece la pena probar

- **La verificación automática.** Al abrirlo verás que la comprobación rápida señala las cuatro
  evidencias: al descargarlas, sus fechas de modificación ya no son las del alta. La verificación
  completa del hash confirma después que el contenido coincide y deja un asiento con las fechas
  nuevas. Es exactamente el comportamiento esperado.
- **El sello externo.** Menú **Descargar → Evidencias → Verificar sello externo** y elige el JSON de
  `sello-externo/`. Debe salir *válido, con actividad posterior*: el sello se generó el 10 de
  septiembre y después hubo más asientos.
- **La trazabilidad de EV-0001** (acción *Trazabilidad*): alta, verificación, copia de
  trabajo, transferencia a Luis Ortega y su verificación al recibirla.
- **El análisis del correo** de EV-0001: indicios de suplantación, cadena de entrega, URLs.
- **El laboratorio**: *Leer metadatos* sobre EV-0004 o *Extraer indicadores* sobre EV-0003.
- **Rompe algo a propósito.** Cambia un carácter de `registro.jsonl` o de una evidencia en
  `evidencias/originales/` y vuelve a abrir el caso.

## Cosas a tener en cuenta

- **Los asientos de protección forman parte del escenario.** En tu copia los ficheros no están en solo
  lectura: el atributo no viaja con Git.
- **El primer asiento dice `HeadlessChrome` en el campo `host`.** El caso no se ha escrito a mano:
  se ha generado conduciendo la propia aplicación (las mismas funciones que usa un analista) con el
  reloj de la página simulado para reconstruir los tres días. Los scripts están en `generador/`.
- **No edites estos ficheros con un editor que cambie los saltos de línea.** El repositorio los
  marca como binarios en `.gitattributes` para que Git no los convierta a CRLF en Windows: si lo
  hiciera, las huellas dejarían de coincidir y la verificación marcaría las evidencias como alteradas.

## Regenerarlo

Con Node, Playwright y Python:

```
node build.js
python3 -m http.server 8123 --directory dist      # en otra terminal
python3 ejemplos/generador/crear-evidencias.py
node ejemplos/generador/capturas.js
node ejemplos/generador/generar-caso.js
```

Sale un caso equivalente pero no idéntico: cambian el identificador del caso y la huella de las
capturas, porque dependen de la fecha y de las fuentes del equipo que las genera.

---

Caso de ejemplo creado por Xavier Dobon para TraceLock. Licencia Apache 2.0.
