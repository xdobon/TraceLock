# Modelo de amenaza

Este documento existe para que nadie —ni quien lo usa, ni quien lo evalúa
antes de adoptarlo, ni quien lo audita— tenga que inferir los límites de
TraceLock a partir de avisos sueltos en la interfaz. Es la referencia
única y explícita.

## Qué es TraceLock

Una consola portátil y local-first para gestión, documentación,
trazabilidad e integridad de expedientes de respuesta a incidentes,
basada en una carpeta de caso, sin infraestructura que desplegar.

## Qué NO es (por diseño, no por limitación técnica temporal)

- No es un SIEM, un EDR ni un SOAR.
- No es una plataforma de gestión de identidad (IAM).
- No es una herramienta de adquisición forense.
- No es una autoridad de sellado de tiempo ni una PKI.
- No emite ni gestiona claves privadas.
- No garantiza, por sí sola, la validez forense de la trazabilidad de evidencias:
  eso depende también de procedimientos y controles externos a la
  herramienta (quién tiene acceso a la carpeta, cómo se transporta la
  evidencia física, qué dice el procedimiento legal aplicable). La
  formulación correcta es: **integridad y trazabilidad
  criptográficamente verificables del expediente y de los eventos de
  sus evidencias.**

## Modelo de confianza

| Supuesto | Detalle |
|---|---|
| Confidencialidad del almacenamiento | **Fuera del alcance de TraceLock.** Depende de los permisos de la carpeta/disco donde se guarde el caso. TraceLock no cifra nada en reposo ni gestiona control de acceso. |
| Reloj | Las marcas de tiempo (`ts`) salen del reloj local del equipo que anota. No hay sellado de tiempo externo (RFC 3161 o similar) todavía. |
| Identidad del analista | El campo `actor` es autodeclarado, sin autenticación. Cualquiera con acceso de escritura puede anotar en nombre de cualquier nombre que escriba. |
| Integridad del registro frente a manipulación | El encadenado SHA-256 (`prev`/`hash`) permite **detectar** una alteración posterior de asientos ya escritos, más el ancla de estado conocido para detectar truncados. No la **impide**: alguien con acceso de escritura y herramientas externas al margen de TraceLock puede reescribir el fichero. La cadena hace evidente esa reescritura al verificarla, no evita que ocurra. |
| Sello externo | Ancla el estado de la cadena en un punto en el tiempo, guardado fuera de la carpeta del caso. Permite detectar que el registro actual difiere de un estado previamente anclado. No es una firma digital: no acredita *quién* generó el sello, solo que su contenido no ha cambiado desde que se generó (`anchorHash`). |
| Protección de solo lectura de las evidencias | El navegador no puede aplicar `attrib`/`chmod`, así que es un paso manual fuera de TraceLock (propiedades de la carpeta en el Explorador, comando `attrib`/`chmod` o scripts descargables; estos últimos pueden estar bloqueados por la directiva del equipo, y la aplicación no intenta sortear ese bloqueo). La app rastrea, de forma autodeclarada (evento `EVIDENCIAS_PROTEGIDAS`, confirmado por el analista), hasta qué evidencia se aplicó la protección la última vez, y avisa en la vista de Evidencias mientras haya alguna posterior sin proteger. Además, no deja dar de alta evidencias nuevas mientras haya pendientes sin que el analista decida: confirmar la protección (con el método usado) o continuar dejando constancia justificada (evento `PROTECCION_APLAZADA`, que no las da por protegidas). Es un control de proceso, no una garantía técnica: el atributo no se puede leer desde el navegador y nada impide confirmar sin haberlo aplicado; la confirmación queda firmada con el nombre del analista. |
| Verificación automática de evidencias | Al abrir el caso se compara el tamaño y la fecha de modificación de cada original con los del alta, y después se recalcula su SHA-256 en segundo plano. Detecta alteraciones posteriores al alta; no las impide. La comprobación rápida no detecta a quien modifique un fichero y restaure su fecha a propósito: eso lo detecta el hash completo. Solo se anotan las discrepancias y un resumen por pasada completa; una pasada interrumpida (pestaña cerrada) no deja constancia. |
| Concurrencia en carpeta compartida | Modelo optimista: se comprueba tamaño/`lastModified` antes de escribir y se verifica después de escribir. Reduce el riesgo de sobrescritura silenciosa entre analistas, pero no es un lock real: en carreras muy ajustadas, un analista puede recibir un error y tener que reintentar. |
| Navegador | Escritura y reverificación en disco solo con navegadores compatibles con File System Access API (Chromium: Chrome, Edge). En otros navegadores (Firefox) la app degrada al almacenamiento del navegador, perdiendo persistencia en disco y reverificación de ficheros. |
| Recordar la carpeta del caso entre recargas | **Desactivado por defecto**, opción explícita en Ajustes. Al recargar, el navegador retira siempre el permiso sobre la carpeta y exige un gesto del usuario para restituirlo: eso no se puede evitar, así que reanudar cuesta como mínimo un clic, con la opción activada o sin ella. Lo que la opción cambia es si se persiste el handle de la carpeta en IndexedDB para que ese clic sea aceptar un aviso en vez de volver a buscar la carpeta. Coste: bajo `file://` varios navegadores comparten IndexedDB entre documentos locales, así que otro HTML abierto en el mismo equipo podría leer el handle — es decir, el nombre de la carpeta del caso — y provocar un aviso de permiso sobre ella. El acceso efectivo seguiría requiriendo que alguien acepte ese aviso, pero la fuga del nombre y la posibilidad de inducir el diálogo son reales. Por eso la decisión se deja al analista y no se toma por él. |
| Robustez ante evidencias malformadas | Hay límites y validación estructural para reducir el riesgo de que un fichero corrupto o adversarial (MIME anidado, ZIP/OOXML desproporcionado, XML inválido, JSON inesperado) derribe la interfaz o provoque comportamiento inesperado. No es un sandbox de ejecución: sigue siendo JavaScript en el mismo contexto que el resto de la app. |

## Vectores considerados y su mitigación actual

- **XSS almacenado vía `registro.jsonl`**: mitigado — todo lo que viene de
  disco se trata como no confiable, se valida al cargar y se escapa antes
  de interpolar en HTML/atributos (`esc()`/`escJs()`).
- **CSV Injection en exportaciones**: mitigado para exportación "humana"
  (Excel); se conserva el valor original sin neutralizar en exportaciones
  de IOCs para uso operativo — decisión consciente, no descuido.
- **ReDoS en extracción de correos/URLs**: mitigado mediante expresiones
  regulares endurecidas.
- **Truncado o reconstrucción del registro**: mitigado mediante el ancla
  de estado conocido; ver limitación de "integridad frente a
  manipulación" arriba — detecta, no impide.
- **Carreras de escritura en carpeta compartida**: mitigado de forma
  optimista, ver tabla.
- **CSP**: declarada, pero con `script-src 'unsafe-inline'` y
  `style-src 'unsafe-inline'` — decisión pendiente de revisar (ver
  `CHANGELOG.md`). Mientras existan, la CSP no bloquea la ejecución de un
  `<script>` inyectado si algún vector de XSS no cubierto llegase a
  colarse; su valor actual es sobre todo restringir red y recursos
  externos (`connect-src 'none'`, sin fuentes remotas).

## Qué falta para un "nivel 3" de madurez

Firma digital de los eventos por actor + identidad criptográfica +
verificación independiente mediante un `verify.html` separado, que no
comparta código con la app principal. Evolución natural, no implementada
todavía.
