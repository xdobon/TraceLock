# Manual de usuario de TraceLock

*Autor: Xavier Dobon · Licencia Apache 2.0*

TraceLock es una consola de gestión de incidentes y de trazabilidad de evidencias. Se usa con tres
piezas: el fichero `tracelock.html`, una carpeta de caso y un navegador compatible. Todo el caso vive
en esa carpeta de tu disco: las evidencias, quién las tiene, cuándo se han verificado, lo que ha hecho
el equipo y un registro encadenado que permite detectar cualquier modificación posterior. No hay
servidor, base de datos ni instalación.

El código fuente del proyecto está dividido en módulos (JavaScript, estilos, iconos, tipografías y
colores) que se ensamblan en `tracelock.html` al compilar; el funcionamiento se describe en
`README-build.md`. Para usar la herramienta solo necesitas ese fichero compilado.

Este manual explica cómo se trabaja con la aplicación, qué hace cada apartado y, sobre todo, qué
conviene tener en cuenta para que el expediente resultante sea defendible.

## Contenido

- [1 Qué es y qué no es TraceLock](#1-qué-es-y-qué-no-es-tracelock)
- [2 Requisitos](#2-requisitos)
- [3 Conceptos básicos](#3-conceptos-básicos)
- [4 La carpeta del caso](#4-la-carpeta-del-caso)
- [5 Primeros pasos](#5-primeros-pasos)
  - [5.1 Crear un caso](#51-crear-un-caso)
  - [5.2 Abrir un caso existente](#52-abrir-un-caso-existente)
  - [5.3 Reanudar tras recargar la página](#53-reanudar-tras-recargar-la-página)
  - [5.4 Caso de ejemplo](#54-caso-de-ejemplo)
  - [5.5 Identifícate](#55-identifícate)
- [6 La pantalla principal](#6-la-pantalla-principal)
- [7 Expediente](#7-expediente)
  - [7.1 Resumen](#71-resumen)
  - [7.2 Clasificación](#72-clasificación)
  - [7.3 MITRE ATT&CK](#73-mitre-attck)
- [8 Coordinar](#8-coordinar)
  - [8.1 Cronología](#81-cronología)
  - [8.2 Hitos](#82-hitos)
  - [8.3 Preguntas abiertas](#83-preguntas-abiertas)
  - [8.4 Notas](#84-notas)
  - [8.5 Total timeline](#85-total-timeline)
- [9 Investigar](#9-investigar)
  - [9.1 Evidencias](#91-evidencias)
    - [9.1.1 Dar de alta evidencias](#911-dar-de-alta-evidencias)
    - [9.1.2 La tabla de evidencias](#912-la-tabla-de-evidencias)
    - [9.1.3 Transferencias](#913-transferencias)
    - [9.1.4 Protección de solo lectura](#914-protección-de-solo-lectura)
    - [9.1.5 Verificación automática](#915-verificación-automática)
    - [9.1.6 Sello externo](#916-sello-externo)
  - [9.2 IOCs](#92-iocs)
  - [9.3 Grafo](#93-grafo)
  - [9.4 Laboratorio](#94-laboratorio)
    - [9.4.1 Operaciones](#941-operaciones)
    - [9.4.2 Análisis de correo](#942-análisis-de-correo)
    - [9.4.3 Lectura de metadatos](#943-lectura-de-metadatos)
- [10 Entregar](#10-entregar)
  - [10.1 Exportar](#101-exportar)
  - [10.2 Registro de actividad](#102-registro-de-actividad)
- [11 Búsqueda, Guía y Ajustes](#11-búsqueda-guía-y-ajustes)
  - [11.1 Búsqueda](#111-búsqueda)
  - [11.2 Guía y capacidades](#112-guía-y-capacidades)
  - [11.3 Ajustes](#113-ajustes)
- [12 Trabajo en equipo](#12-trabajo-en-equipo)
- [13 Flujo de trabajo recomendado](#13-flujo-de-trabajo-recomendado)
- [14 Cosas a tener en cuenta](#14-cosas-a-tener-en-cuenta)
  - [14.1 Límites de lo que TraceLock acredita](#141-límites-de-lo-que-tracelock-acredita)
  - [14.2 Lo que se guarda en el navegador (y se pierde al cerrar la pestaña)](#142-lo-que-se-guarda-en-el-navegador-y-se-pierde-al-cerrar-la-pestaña)
  - [14.3 Modo reducido (Firefox)](#143-modo-reducido-firefox)
  - [14.4 Privacidad](#144-privacidad)
  - [14.5 Idioma](#145-idioma)
- [15 Solución de problemas](#15-solución-de-problemas)
- [16 Glosario](#16-glosario)

---

## 1 Qué es y qué no es TraceLock

TraceLock sirve como **cuaderno de trabajo riguroso y trazable** de un incidente y como base para
redactar el informe. Registra la entrada de cada evidencia con su huella SHA-256 y sus datos de
adquisición; anota cada verificación, cada transferencia y cada actuación del equipo con su hora y su
autor; y encadena todos esos asientos de forma que cualquier alteración posterior del registro se
detecta.

Hay cosas que TraceLock **no** hace, y conviene tenerlas claras desde el principio:

- **No sustituye al acta de adquisición.** Dar de alta una evidencia documenta su entrada en este
  sistema, no cómo se obtuvo del equipo original. Si la herramienta de adquisición te da un hash,
  anótalo: es lo que ata la copia al soporte original.
- **No es una prueba autónoma ante terceros.** Las horas salen del reloj de tu equipo y nadie las
  certifica, y el nombre del analista lo escribe cada uno: no hay autenticación. Para eso harían
  falta sellado de tiempo cualificado e identidad verificable.
- **No impide modificar ficheros, solo lo detecta.** Quien tenga acceso de escritura a la carpeta
  puede cambiar cosas; TraceLock te avisará, pero no puede evitarlo.
- **No sustituye a un bloqueador de escritura ni a un almacenamiento inmutable.** La separación entre
  original y copia de trabajo es lógica y documental.

## 2 Requisitos

TraceLock se abre mediante el fichero `tracelock.html`. Se abre con doble clic y no instala nada.

| Navegador | Qué puedes hacer |
|---|---|
| **Chrome o Edge** | Todo. Son los únicos que permiten a una página escribir en una carpeta local. |
| **Firefox** | Modo reducido: se calculan las huellas, pero los ficheros no se copian a ninguna carpeta y el registro se guarda en la pestaña. Ver [14.3 Modo reducido (Firefox)](#143-modo-reducido-firefox). |

*Tabla 1 – Compatibilidad por navegador*

TraceLock no hace ninguna conexión externa: las tipografías y los iconos van incrustados en el propio
fichero y su política de seguridad bloquea cualquier petición de red. Funciona igual sin conexión, y
ninguna evidencia ni dato del caso sale de tu equipo. Las únicas salidas son las que tú decides, como
abrir un enlace de consulta de un indicador (ver [9.2 IOCs](#92-iocs)).

## 3 Conceptos básicos

**Asiento.** Cada cosa que ocurre en el caso (dar de alta una evidencia, iniciar un hito, valorar un
indicador…) se escribe como una línea en el fichero `registro.jsonl`. Esa línea es un asiento: lleva
número de orden, hora, autor, tipo y datos.

**Registro encadenado.** Cada asiento incluye la huella SHA-256 del anterior. Si alguien cambia,
borra o reordena una línea, la cadena se rompe y la aplicación lo señala en la barra de estado. Todo
lo que ves en pantalla se reconstruye leyendo ese registro: no hay más estado que ese.

**Nada se borra.** Una rectificación de la cronología, la retirada de una técnica ATT&CK o la
anulación de un vínculo entre indicadores se añaden como asientos nuevos. El original sigue en el
registro.

**Sello externo.** Una foto del estado del registro y de las evidencias que se descarga como fichero
JSON para guardarla fuera de la carpeta del caso. Sirve para detectar lo que el encadenado por sí solo
no detecta: que alguien reconstruya el registro entero desde cero o lo recorte por el final. Cómo se
genera y se comprueba: [9.1.6 Sello externo](#916-sello-externo).

**Evidencia original y copia de trabajo.** Al dar de alta un fichero se guardan dos copias: la
original, que no debe tocarse, y otra de trabajo.

## 4 La carpeta del caso

Un caso es una carpeta. Copiarla es llevarse el expediente completo.

```
IR-2026-031-Phishing-Finanzas/
├── registro.jsonl          ← el registro encadenado: la fuente de verdad del caso
├── datos-base.json         ← listas de apoyo (analistas, clientes, fases…), editable
├── evidencias/
│   ├── originales/         ← copia íntegra de cada evidencia tal como entró
│   └── trabajo/            ← copia de trabajo de cada evidencia
└── acciones/               ← capturas de pantalla adjuntas a los hitos
```

`acciones/` está separada de `evidencias/` a propósito: las capturas documentan lo que hizo el equipo,
no son evidencia del incidente.

**`datos-base.json`** se crea automáticamente la primera vez con valores por defecto. Puedes editarlo
con cualquier editor de texto para ajustar las listas que ofrece la aplicación:

| Clave | Para qué sirve |
|---|---|
| `organizacion` | Nombre de tu organización. |
| `analistas` | Nombres que se sugieren en los campos de analista. |
| `clientes` | Entidades que se sugieren al crear un caso. |
| `fases` | Fases de los hitos (por defecto: Notificación, Contención, Análisis, Mitigación, Recuperación, Cierre). |
| `riesgos` | Niveles de riesgo de los hitos (Bajo, Medio, Alto). |
| `metodosAdquisicion` | Métodos que se sugieren al dar de alta evidencias. |
| `husos` | Husos horarios disponibles en la cronología. |

*Tabla 2 – Claves de datos-base.json*

Si cambias las fases, ten en cuenta que las plantillas de caso usan las fases por nombre.

## 5 Primeros pasos

![Pantalla de inicio](img/01-portada.png)

*Imagen 1 – Pantalla de inicio*

Al abrir el fichero verás dos opciones.

### 5.1 Crear un caso

1. Pulsa **Crear un caso** y elige la carpeta donde quieres guardarlo. Dentro se creará la carpeta
   del caso.
2. **Datos del incidente:** nombre o referencia del caso, analista que lo abre, entidad afectada,
   marcado TLP, fecha y hora de detección y motivo de apertura. La fecha de detección es la que se
   usa para calcular el plazo de cierre, no la fecha en que creas el caso.
3. **Clasificación y plantilla:** tipo de ciberincidente según CCN-STIC 817, categoría ENS más alta
   afectada, equipos afectados, esfuerzo estimado de resolución y, si quieres, una plantilla de
   trabajo.

La clasificación que se guarda en este paso queda marcada como **provisional**: la aplicación asigna
los niveles que sugiere la guía, sin justificación. Complétala en **Clasificación** antes de cerrar
el caso.

### 5.2 Abrir un caso existente

Pulsa **Abrir un caso** y selecciona la carpeta. El estado se reconstruye leyendo el registro, así que
lo retomas exactamente donde lo dejaste. Al abrirlo, TraceLock comprueba además las evidencias en
segundo plano (ver [9.1.5 Verificación automática](#915-verificación-automática)).

### 5.3 Reanudar tras recargar la página

Al recargar, el navegador retira el permiso sobre la carpeta: es una medida suya que no se puede
evitar. Si activas **Recordar la carpeta del caso** en Ajustes, la pantalla de inicio mostrará
**Reanudar** y bastará con aceptar el aviso de permiso, sin volver a buscar la carpeta. Lee la
advertencia de ese ajuste antes de activarlo (ver [11.3 Ajustes](#113-ajustes)).

### 5.4 Caso de ejemplo

En la carpeta `ejemplos/` del repositorio hay un caso completo y ficticio (un phishing con robo de
sesión, llevado por dos analistas durante tres días) para ver cómo queda un expediente real antes de
crear el tuyo. Copia la carpeta del caso a otro sitio y ábrela: su `README.md` explica qué contiene y
qué merece la pena probar. Las capturas de este manual están tomadas de ese caso.

### 5.5 Identifícate

Al abrir un caso, TraceLock te pide tu nombre (al crearlo, va en el propio formulario). Cada asiento
se firma con ese nombre, que aparece en el botón de la cabecera. No hay contraseña: es una firma declarada, no una autenticación.

## 6 La pantalla principal

![Resumen del caso](img/02-resumen.png)

*Imagen 2 – Resumen del caso*

**Cabecera.** De izquierda a derecha: el nombre del caso abierto con el botón de icono **Cambiar
de caso**, el buscador del expediente, el menú **Descargar** y el menú con tu nombre.

**Acciones de página.** Las acciones principales de cada sección (por ejemplo **Añadir evidencia**,
**Añadir hecho**, **Aplicar plantilla** o **Descargar CSV**) aparecen a la derecha del título como
botones redondos con su nombre debajo. Algunas abren un desplegable, como **Otras exportaciones**.

**Formularios.** Los formularios de alta (evidencias, hechos, hitos, preguntas, IOCs y notas) se abren
desde su acción, dentro de una tarjeta con su título y un botón de cerrar. Se cierran solos al añadir,
y también con **Cancelar** o con la **X**. Los campos obligatorios llevan un asterisco (*). Las
ventanas modales se cierran con la **X** de la esquina, con **Escape** o pulsando fuera.

**Tooltips.** El icono **i** junto a un título explica ese apartado con más detalle.

- **Descargar** agrupa las descargas rápidas. En **Evidencias**: el acta de evidencias y el historial
  de transferencias en CSV, y la generación y verificación del sello externo. En **Seguimiento**:
  hitos, cronología, preguntas y total timeline en CSV. En **Expediente**: el registro completo.
- El menú con tu nombre contiene la entidad afectada, los **Ajustes** y la **Guía y capacidades**.

**Barra de estado**, justo debajo:

- **Cadena íntegra · N asientos** en verde, o el número de asiento donde se rompe en rojo.
- **Sello:** la huella del último asiento.
- **Anclaje externo:** si has cargado un sello externo y si coincide con el estado actual.
- **Indicador de verificación** de evidencias, mientras se está ejecutando o si ha encontrado algo.
  Pulsándolo vas a Evidencias.

**Navegación lateral**, en cuatro grupos que siguen el orden natural del trabajo: **Expediente**,
**Coordinar**, **Investigar** y **Entregar**. Se puede plegar con la flecha de la parte superior.

## 7 Expediente

El expediente da la visión de conjunto del caso: su estado calculado a partir del registro, la
clasificación del incidente según los marcos que apliquen y las técnicas del atacante expresadas con
MITRE ATT&CK.

### 7.1 Resumen

Todo lo que aparece aquí se calcula leyendo el registro: no se introduce ni se guarda nada desde esta
pantalla. Cada tarjeta lleva al apartado correspondiente al pulsarla.

- **Indicadores de cabecera:** cuántos días lleva abierto el caso, la última actividad del equipo, la
  clasificación CCN, las evidencias almacenadas, su integridad, los hitos abiertos, los IOCs y las
  preguntas sin respuesta.
- **Clasificación CCN-STIC 817**, **Hitos por fase** (con la duración media de los hitos terminados
  y la cobertura de la cronología del ataque), **Integridad de las evidencias** y **Preguntas abiertas
  por antigüedad**.
- **Preparación para el cierre:** una lista de comprobaciones de completitud del expediente
  (clasificación justificada, evidencias verificadas y protegidas, datos de adquisición completos,
  hitos cerrados, indicadores valorados, cronología con huso y fuente, registro íntegro, sello
  externo…). Muestra primero lo **pendiente** y después lo **completado**, y se puede plegar.

> Son comprobaciones de completitud del expediente, no una valoración del incidente. Que estén todas
> en verde no significa que el caso pueda cerrarse.

### 7.2 Clasificación

![Clasificación del incidente](img/07-clasificacion.png)

*Imagen 3 – Clasificación del incidente*

No todas las entidades se rigen por el mismo marco, así que el incidente puede clasificarse en varios
a la vez. Cada uno conserva su justificación y su historial.

**CCN-STIC 817 (ENS).** Es el que determina la obligación de notificar al CCN-CERT y el plazo de
cierre. Pulsa **Clasificar o reclasificar**:

1. **Paso 1:** tipo de ciberincidente (tabla 1 de la guía), origen de la amenaza, categoría ENS más
   alta afectada, equipos afectados, dimensiones de seguridad afectadas y esfuerzo de resolución en
   jornadas-persona.
2. **Paso 2:** nivel de peligrosidad y de impacto, cada uno con su **justificación obligatoria**. La
   aplicación te muestra lo que sugiere la guía para los datos del paso 1. Es orientativo: no tiene en
   cuenta criterios reputacionales, de seguridad nacional o de infraestructuras críticas. Revísalo y
   justifica el nivel que asignes.

Según el nivel de peligrosidad (tabla 6 de la guía CCN-STIC 817):

| Peligrosidad | Notificación obligatoria | Plazo de cierre |
|---|---|---|
| Bajo | No | 15 días naturales |
| Medio | No | 30 días naturales |
| Alto | Sí | 45 días naturales |
| Muy alto | Sí | 90 días naturales |
| Crítico | Sí | 120 días naturales |

*Tabla 3 – Notificación y plazo de cierre según la peligrosidad (CCN-STIC 817)*

El plazo cuenta desde la fecha de detección indicada al crear el caso; si no se indicó, desde el
primer asiento. La obligación de notificar se aplica a las entidades del ámbito del ENS y se canaliza
por LUCIA; las entidades privadas fuera del ENS notifican a INCIBE-CERT. Cada reclasificación se añade
al historial; la que cuenta al cierre es la última.

**ENISA · RSIT.** La taxonomía de referencia de los CSIRT europeos: clasifica la naturaleza del
incidente por su intención. No tiene escalas de gravedad.

**NIST 800-61 r2 · CISA.** No clasifica el tipo de incidente sino cuánto afecta: vector de ataque,
impacto funcional, impacto en la información y recuperabilidad.

### 7.3 MITRE ATT&CK

Lo que hizo el atacante, expresado con el vocabulario de ATT&CK Enterprise. Cada técnica se registra
con **la evidencia que la sostiene, el nivel de confianza** (confirmada, probable o posible) **y el
hecho concreto que se observó**, no la descripción genérica de la técnica.

- **Registrar técnica:** si has importado el catálogo, el campo autocompleta identificadores y
  nombres; si no, es texto libre.
- **Importar catálogo** (opcional): TraceLock solo lleva incorporadas las 14 tácticas de la matriz,
  no la lista de técnicas. Sin catálogo puedes registrar técnicas igualmente, pero el identificador
  y el nombre se escriben a mano y nada comprueba que existan: un identificador mal tecleado se
  guarda tal cual. Si importas `enterprise-attack.json`, el fichero oficial que MITRE publica en su
  repositorio de GitHub
  ([mitre-attack/attack-stix-data](https://github.com/mitre-attack/attack-stix-data)), el campo
  autocompleta con los identificadores y nombres oficiales. No va incluido porque ocupa decenas de
  MB, MITRE lo actualiza dos veces al año y TraceLock no se conecta a internet para descargarlo.
  Solo se conserva mientras la pestaña esté abierta (ver
  [14.2](#142-lo-que-se-guarda-en-el-navegador-y-se-pierde-al-cerrar-la-pestaña)).
- **Retirar** (botón × de cada fila) pide el motivo; el registro original se conserva.
- **Descargar CSV** descarga la tabla de técnicas.
- La vista muestra la **cobertura por táctica** de las 14 tácticas de la matriz, con el color según la
  confianza.

## 8 Coordinar

Aquí se organiza el trabajo del equipo y se reconstruye lo ocurrido: la cronología del ataque, los
hitos de la respuesta, las preguntas pendientes, las notas rápidas y una vista con toda la actividad
del caso en orden.

### 8.1 Cronología

![Cronología del ataque](img/05-cronologia.png)

*Imagen 4 – Cronología del ataque*

Los hechos del **ataque**, reconstruidos a partir de las evidencias. No confundir con el registro de
actividad, que recoge lo que hace el equipo.

Cada entrada lleva fecha, hora de inicio (y de fin, opcional), **huso horario**, **fuente** (el log,
artefacto o sistema del que sale) y el hecho observado, descrito sin juicios. Indica la fuente real
del dato, no la nota de la que lo sacaste.

- **Añadir hecho** abre el formulario de una entrada nueva.
- Hay dos vistas: **línea de tiempo** y **tabla**. Se exporta con las columnas de la tabla de línea
  temporal del informe.
- **Rectificar** (lápiz) corrige una entrada (fecha, hora, huso) pidiendo el motivo. La entrada original
  permanece en el registro: una rectificación añade, nunca sustituye.
- **Eliminar** (×) pide el motivo y saca el hecho de la cronología y de lo que se exporta. No se borra:
  pasa al apartado plegable **Hechos eliminados**, con quién, cuándo y por qué.

Elegir bien el huso importa: si un log está en hora local del sistema de origen y lo mezclas con otro
en UTC sin indicarlo, la cronología será incorrecta. Si no lo sabes, elige **Sin determinar**; la
preparación para el cierre lo señalará.

### 8.2 Hitos

![Hitos del incidente](img/04-hitos.png)

*Imagen 5 – Hitos del incidente*

Las actuaciones del equipo, por fase, con propietario y riesgo. **Las horas no se teclean**: la de
inicio se toma al iniciar el hito y la de fin al pulsar **Hito finalizado**.

- **Añadir nuevo hito** abre el formulario. El campo **Estado** es obligatorio: **Iniciar ahora**
  arranca el reloj en ese momento y **Pendiente** lo deja planificado sin reloj hasta que lo inicies.
  **Cancelar** cierra el formulario.
- La tabla muestra lo esencial; **pulsa un hito** para ver el detalle completo: riesgo, horas,
  duración, resultado o bloqueo y el hilo de seguimiento. Desde ahí puedes **añadir seguimiento**,
  **editar** o **eliminar** el hito. Los eliminados quedan en el apartado plegable **Hitos eliminados**.
- Las acciones van en el menú de tres puntos y dependen del estado: pendiente (iniciar, editar,
  eliminar), en proceso (finalizar, seguimiento, bloquear, editar), bloqueado (reanudar, seguimiento,
  editar) y terminado (seguimiento, editar, eliminar). **Editar** no toca horas ni estado; **Eliminar**
  pide el motivo y el hito queda solo en el registro.
- Al **finalizar** se pide el resultado, al **bloquear** qué falta y de quién depende, y el
  **seguimiento** es una anotación fechada. En esos tres casos puedes adjuntar
  **capturas de pantalla** de la acción: se guardan en `acciones/` con su huella y se pueden ver desde
  el registro.
- **Aplicar plantilla** crea de golpe los hitos pendientes y las preguntas abiertas de un tipo
  de caso. Vienen de serie: compromiso de equipo, exfiltración de información, phishing, fraude por
  correo (BEC), ransomware y cuenta comprometida. Puedes cargar las tuyas en Ajustes. Una plantilla
  no arranca ningún reloj ni ejecuta nada en sistemas externos: es una lista de trabajo.

### 8.3 Preguntas abiertas

Lo que falta por aclarar y a quién se le ha pedido. Se crean con **Añadir pregunta**; mientras no se
responden aparecen como **Sin responder**. Formúlalas como preguntas cerradas, que se puedan
dar por respondidas. Cerrarlas todas antes de dar por cerrado el incidente evita que las dudas acaben
resolviéndose como suposiciones en el informe. El resumen las ordena por antigüedad. En el menú de
tres puntos de cada una: **Responder** (solo si está sin responder), **Editar** y **Eliminar** (con
motivo). Las eliminadas quedan en el apartado plegable **Preguntas eliminadas**.

### 8.4 Notas

![Notas](img/11-notas.png)

*Imagen 6 – Notas*

Para escribir deprisa durante una llamada o una reunión.

- **Añadir nueva nota** abre el borrador.
- **Borrador:** papel sucio. **No entra en el registro** y solo se guarda en esta pestaña del
  navegador. **Marcar hora** inserta la hora actual donde estás escribiendo.
- **Guardar como nota:** la nota queda anotada en el registro, con su hora y su autor, tal cual la
  has escrito. Revísala antes si contiene datos que no quieras en el expediente.
- Desde el menú de una nota guardada puedes **Pasar a Cronología**, **Pasar a Hito** o **Pasar a
  Pregunta**, **Copiar** su texto o **Pasar a borrador**.

> El borrador se pierde al cerrar la pestaña. Si contiene algo que importa, guárdalo como nota antes.

### 8.5 Total timeline

Todo lo ocurrido en el caso en un solo hilo: altas y verificaciones de evidencias, hitos y su
seguimiento, cronología, preguntas, indicadores… en el orden del registro, es decir, **cuándo se hizo
cada cosa**. **Filtrar** combina un buscador de texto y las categorías; **Ordenar por** elige más
reciente o menos reciente primero. Se ve como línea de tiempo o como tabla y se exporta en CSV.

## 9 Investigar

Esta sección cubre el trabajo sobre el material del incidente: el alta, la protección y la
verificación de las evidencias, los indicadores y sus relaciones, y el laboratorio para transformar
datos y analizar correos y metadatos.

### 9.1 Evidencias

![Registro de evidencias](img/03-evidencias.png)

*Imagen 7 – Registro de evidencias*

Aquí se da de alta cada evidencia y se documenta todo lo que le ocurre después: su protección, sus
verificaciones, quién la tiene en cada momento y el sello que ancla su estado fuera de la carpeta
del caso. Bajo el título aparecen el número de evidencias y cuántas están verificadas.

#### 9.1.1 Dar de alta evidencias

1. Pulsa **Añadir evidencia** y, en el formulario, suelta los ficheros en **Evidencia** o pulsa la
   zona para seleccionarlos. Quedan en espera, no se dan de alta todavía.
2. Rellena los **datos de adquisición**. Se aplican a los ficheros que sueltes a continuación.
   - Obligatorios, marcados con un **\*** rojo: **origen** de la evidencia, **método** de
     adquisición, **adquirida por**, **equipo o soporte** y **ubicación**. Son los que TraceLock no
     puede deducir leyendo el fichero; sin ellos no se da de alta la evidencia.
   - Opcionales: fecha y hora de adquisición (si se deja en blanco se toma la del alta), testigo,
     número de serie, usuario del equipo, estado del sistema y **SHA-256 declarado en origen**.
3. Pulsa **Añadir**. **Cancelar** cierra el formulario y descarta los ficheros en espera.

Para cada fichero, TraceLock:

- lo copia a `evidencias/originales/` mientras calcula su SHA-256 y su MD5 por bloques, sin cargarlo
  entero en memoria;
- crea la copia de trabajo en `evidencias/trabajo/`;
- si indicaste un hash de origen, lo coteja y, si no coincide, lo registra con la discrepancia
  anotada (no borres nada: documenta por qué difiere);
- avisa si el contenido es idéntico al de otra evidencia ya registrada;
- anota el alta en el registro.

Una evidencia recién dada de alta aparece como **Sin verificar** hasta su primera verificación real:
la automática al abrir el caso o la que lances con **Verificar**.

Lo que se puede deducir (huella, tamaño, tipo, fecha de modificación del propio fichero) se calcula
solo y no se pregunta.

**Si hay evidencias sin proteger**, antes del alta aparece un aviso que te obliga a decidir: confirmar
que ya aplicaste la protección o continuar dejando constancia del motivo (ver
[9.1.4 Protección de solo lectura](#914-protección-de-solo-lectura)).

![Aviso de evidencias sin proteger](img/13-puerta-proteccion.png)

*Imagen 8 – Aviso de evidencias sin proteger*

#### 9.1.2 La tabla de evidencias

Cada evidencia muestra su huella, datos de adquisición, responsable actual e integridad. Sus acciones
están en el menú de tres puntos de la última columna:

- **Verificar:** recalcula el SHA-256 del original y lo compara con el del alta. El resultado se anota.
- **Transferir:** registra que la evidencia pasa a otra persona u organismo (ver
  [9.1.3 Transferencias](#913-transferencias)).
- **Trazabilidad:** muestra toda la historia de la evidencia: alta, verificaciones,
  transferencias, copia de trabajo y archivo.

#### 9.1.3 Transferencias

La acción **Transferir** registra quién entrega, quién recibe (**\***),
el medio de entrega, el **motivo** (**\***), observaciones y, si se entrega una copia distinta, su
SHA-256. **Una transferencia no se puede deshacer:** si te equivocas, registra la transferencia inversa
explicando el error.

#### 9.1.4 Protección de solo lectura

El navegador no puede cambiar permisos del sistema de ficheros, así que dejar las evidencias en solo
lectura es un paso manual fuera de TraceLock. Conviene hacerlo **justo después de cada alta**: cada
fichero nuevo entra en lectura y escritura.

Elige tu sistema operativo en los tres botones (**Windows**, **Linux**, **macOS**); el del navegador
aparece marcado como «este equipo». Cada uno despliega sus instrucciones:

- **Windows.** Opción 1, Explorador (recomendada): botón derecho sobre `evidencias` → **Propiedades** →
  **Solo lectura** → Aceptar → **Aplicar cambios a esta carpeta, subcarpetas y archivos**. No ejecuta
  nada, así que funciona aunque el equipo bloquee scripts. Opción 2, comando en `cmd`:
  `attrib +R "evidencias\*" /S` (comprobar: `attrib "evidencias\*" /S`, cada línea empieza por R).
- **Linux.** Terminal abierta en la carpeta del caso: `find evidencias -type f -exec chmod a-w {} +`.
  Solo toca ficheros, nunca carpetas. Comprobar: `ls -lR evidencias`, cada fichero `-r--r--r--`.
- **macOS.** Opción 1, Finder: selecciona los ficheros de `evidencias/originales` (y luego `trabajo`),
  **⌥⌘I** y marca **Bloqueado**. Opción 2, el mismo comando que en Linux desde Terminal.
- En cada sistema hay botones para copiar el comando y el de revertir, y **scripts descargables**
  (`proteger.cmd` o `proteger.sh` y sus inversos) solo si tu equipo permite ejecutarlos. En equipos
  gestionados es habitual que la directiva de seguridad los bloquee: es un control intencionado.

La protección solo afecta a los ficheros que ya están en `evidencias/`: puedes seguir trabajando y
dando de alta evidencias nuevas sin revertirla. Solo hace falta revertirla si necesitas volver a
escribir sobre una evidencia ya protegida, algo que TraceLock no hace en el uso normal.

Después pulsa **Protección aplicada** e indica **cómo** la aplicaste.

Si no puedes aplicarla, puedes continuar dejando constancia del motivo, pero la evidencia seguirá
contando como no protegida.

> TraceLock no puede comprobar el atributo de solo lectura: la confirmación es tu palabra, firmada con
> tu nombre. Y el atributo protege contra modificaciones accidentales, no contra alguien que quiera
> alterar una evidencia: cualquiera con acceso lo quita en dos clics. Lo que acredita la integridad es
> la verificación de la huella.

#### 9.1.5 Verificación automática

![Indicador de verificación con una discrepancia](img/12-verificacion.png)

*Imagen 9 – Indicador de verificación con una discrepancia*

Cada vez que abres o reanudas un caso, TraceLock comprueba las evidencias sin que tengas que hacer
nada:

1. **Comprobación rápida:** compara el tamaño y la fecha de modificación de cada original con los
   registrados. Tarda milisegundos y detecta casi cualquier escritura accidental.
2. **Verificación completa:** recalcula el SHA-256 de todos los originales en segundo plano. Primero
   los que la comprobación rápida ha señalado; después, de menor a mayor tamaño.

Mientras tanto puedes seguir trabajando. La barra de estado muestra el progreso **por volumen de
datos** (no por número de ficheros, que engaña: los pequeños acaban enseguida y los grandes son la
mayor parte del trabajo) y, pasados unos segundos, el tiempo que queda. Como referencia, en las
pruebas un caso de 282 evidencias y 3,1 GB tardó unos 40 segundos; el tiempo crece en proporción al
volumen y, en una unidad de red, lo marca sobre todo la velocidad de la red.

Si una evidencia no coincide, el indicador se pone en rojo en cuanto se detecta, la discrepancia se
anota en el registro y al terminar recibes un aviso. **No modifiques ni borres esa evidencia:
documenta qué ha pasado antes de seguir.** Si todo coincide, se anota un resumen de la verificación.

Si cierras la pestaña a mitad, esa verificación no queda anotada; se repetirá la próxima vez que
abras el caso.

#### 9.1.6 Sello externo

En **Descargar → Evidencias → Generar sello externo** se descargan un JSON y un
resumen en texto con el estado del registro (número de asientos y huella del último) y la lista de
evidencias con sus huellas y tamaños. La generación queda anotada en el registro. **Guarda el JSON
fuera de la carpeta del caso**: en el ticket, en un repositorio protegido o en un almacenamiento
independiente. Si lo dejas dentro, quien pueda rehacer la carpeta podría rehacer también el sello.

Para comprobarlo, **Verificar sello externo** y elige el JSON. TraceLock comprueba que el propio sello
no está alterado, que la cadena actual conserva el estado anclado y que las evidencias mantienen su
huella y su tamaño. Si hay actividad posterior al sello, lo indica sin darlo por fallido. No se puede
generar un sello mientras la cadena esté rota.

El sello no es una firma de identidad ni un sellado de tiempo de un tercero: es un ancla de
integridad.

### 9.2 IOCs

![IOCs](img/06-iocs.png)

*Imagen 10 – Repositorio de indicadores (IOCs)*

El repositorio de indicadores del caso. Se recogen solos al analizar un correo, atados a la evidencia
de la que salen, y también puedes **añadirlos a mano** (quedan marcados como tales).

En pantalla se muestran **neutralizados** (`hxxps://`, `ejemplo[.]com`) para que no se abran por
accidente; las exportaciones llevan el valor real, para poder usarlo en bloqueos.

Sobre cada indicador, desde el menú de tres puntos de la última columna:

- **Valorar:** pendiente, benigno, sospechoso o malicioso, con **justificación y fuente
  obligatorias**. Una valoración sin motivo no se puede defender en el informe.
- **Rol:** activo legítimo (infraestructura normal de la entidad que aparece en el caso sin estar
  comprometida), sistema afectado o indicador de ataque. Un indicador valorado como malicioso se trata
  por defecto como indicador de ataque, salvo que fijes otro rol.
- **Vincular:** crea una relación con otro artefacto, que se lee de este al elegido. Las relaciones
  de ataque (ha comprometido, se comunica con, ha entregado) y las de contexto (usa, pertenece a, se
  conecta a, aloja, resuelve a, se autentica en, administra) se dibujan distintas en el grafo.
- **Consultar:** enlaces a VirusTotal, urlscan o AbuseIPDB que abres tú.
- **Documentar:** anota el resultado de una consulta externa, con proveedor, fecha, resultado y
  referencia.

> Al abrir un enlace de consulta, el indicador se revela a ese servicio. Una URL puede contener
> identificadores de sesión, direcciones de correo o datos personales del afectado: revísala antes. En
> urlscan, un análisis puede quedar visible para terceros. TraceLock no envía nada por sí mismo ni
> guarda credenciales de ningún servicio.

**Añadir IOC** abre el formulario de alta manual. **Copiar los relevantes** copia los sospechosos y
maliciosos sin neutralizar; **CSV** exporta todos.

La tabla muestra tipo, valor, rol y procedencia. **Pulsa un IOC** para ver su detalle: vínculos (con la
opción de quitarlos), justificación y consultas. Abajo, **Editar** cambia a la vez la valoración y el rol,
y el menú de tres puntos tiene las mismas acciones que la tabla.

### 9.3 Grafo

![Grafo de relaciones](img/10-grafo.png)

*Imagen 11 – Grafo de relaciones*

Está dentro de IOCs: el conmutador **Tabla / Grafo** cambia entre la tabla y el grafo. Muestra qué
indicador ha comprometido qué sistema, a partir de los IOCs, sus roles y sus vínculos. Cada nodo lleva
el icono de su tipo y el color de su papel (víctima, atacante, activo legítimo o sin asignar), según
la leyenda inferior. Las flechas continuas son relaciones de ataque; las discontinuas, de contexto.

- Arrastra un nodo para colocarlo: se queda fijo donde lo sueltes. Doble clic lo libera.
- Arrastra el fondo para desplazarte y usa la rueda para acercar o alejar.
- Los botones de la derecha: **Reorganizar**, **Ajustar vista**, **Acercar** y **Alejar**.
- Pulsar un nodo abre su ficha (la misma información que su fila de la tabla); se cierra al pulsar fuera.
- El buscador resalta lo que coincide mientras escribes y ofrece resultados: elegir uno lo centra y
  abre su ficha.

Los vínculos no se crean aquí, sino con la acción **Vincular** de cada IOC, en la tabla o en su ficha.

### 9.4 Laboratorio

![Laboratorio](img/08-laboratorio.png)

*Imagen 12 – Laboratorio*

Transformaciones y lecturas sobre texto o sobre evidencias, todas en tu equipo: nada se envía a
ningún servicio. Incluye las operaciones de codificación, decodificación y extracción, el análisis
de correos y la lectura de metadatos de ficheros.

#### 9.4.1 Operaciones

1. Elige una evidencia en el desplegable o escribe el texto a mano en **Entrada**.
2. Elige la operación y pulsa **Ejecutar**.
3. Las operaciones no se anotan en el registro. Si un resultado va a sostener una conclusión,
   documéntalo donde corresponda (cronología, seguimiento de un hito o nota). La lectura de metadatos
   sí se puede anotar, con **Anotar la lectura**.

Operaciones disponibles: decodificar y codificar Base64, hexadecimal y URL; decodificar Base64 URL y
entidades HTML; decodificar escapes `\u`; ROT13; invertir el texto; neutralizar y restaurar
indicadores; decodificar JWT (sin comprobar la firma); formatear JSON; líneas únicas ordenadas;
extraer indicadores; huellas SHA-256 y MD5; minúsculas; y quitar espacios y saltos de línea. Sobre
evidencias, además, **analizar correo** y **leer metadatos** (ver [9.4.2](#942-análisis-de-correo) y
[9.4.3](#943-lectura-de-metadatos)).

**Ficheros binarios.** Si la evidencia elegida no es texto (una imagen, un ejecutable, un documento
de Office…), TraceLock trabaja sobre **sus bytes reales**: Entrada muestra solo un volcado hexadecimal
de los primeros 4 KB y no se puede editar. Con un binario solo se permiten las operaciones que tienen
sentido sobre bytes (SHA-256, MD5, hexadecimal, Base64 y extraer indicadores). Las de texto se
bloquean, porque aplicarlas exigiría convertir el fichero en texto y el resultado dejaría de
corresponder a él. Para una imagen o un documento, lo más útil suele ser **Leer metadatos**.

**Límites.** Se cargan como máximo los primeros 4 MB de una evidencia. Si el resultado es muy grande,
el cuadro Resultado muestra el principio y ofrece **Descargar completo**.

#### 9.4.2 Análisis de correo

Lee ficheros `.eml` y `.msg` y muestra: cabeceras principales, cadena de entrega (saltos `Received`
con sus retardos), resultados de autenticación, URLs, direcciones IP, servidores, adjuntos, direcciones
de correo y la lista de **indicios a revisar** (Reply-To o Return-Path distinto del From, nombre visible
que no corresponde a la dirección real, dominios punycode, acortadores, doble extensión, carácter de
inversión de texto…).

Para lanzarlo, elige en el desplegable una evidencia `.eml` o `.msg` y la operación **Analizar
correo (.eml o .msg)**. No usa el cuadro Entrada: trabaja sobre el fichero original de la evidencia.

Los indicadores que encuentra pasan automáticamente al apartado **IOCs**, atados a esa evidencia.

- El HTML del correo **nunca se inserta en la página**: no se ejecuta nada ni se cargan imágenes.
- Los resultados de SPF, DKIM y DMARC son los que escribió el servidor receptor. Solo son fiables si
  confías en la infraestructura que los añadió; TraceLock no los comprueba.
- Los `.msg` de borradores o de elementos enviados no suelen llevar cabeceras de transporte. Si es tu
  caso, reenvía el mensaje como adjunto o guárdalo como `.eml` desde Outlook.

#### 9.4.3 Lectura de metadatos

**Leer metadatos** analiza el original tal como está en la carpeta del caso: tipo real según su firma
frente a la extensión declarada, entropía, EXIF y coordenadas GPS de imágenes, propiedades y autor de
documentos Office y PDF (con avisos de macros, JavaScript, acciones automáticas u objetos embebidos),
cabeceras de ejecutables y fechas internas. Los metadatos los escribe la herramienta que creó el
fichero y pueden faltar, estar mal o haber sido alterados: trátalos como un indicio más, nunca como un
hecho probado.

## 10 Entregar

Todo lo necesario para sacar el caso de TraceLock: los documentos que se generan con los datos del
expediente y el registro de actividad tal como se ha escrito.

### 10.1 Exportar

![Exportar documentos](img/09-exportar.png)

*Imagen 13 – Exportar documentos*

Documentos generados con los datos del caso en el momento de pulsar, en **Word** (editable) o **PDF**
(se abre una vista preparada para imprimir y el navegador la guarda como PDF):

| Documento | Contenido |
|---|---|
| **Acta de evidencias** | Evidencias con huellas, datos de adquisición, responsable actual, transferencias y discrepancias con la huella de origen. |
| **Relación de indicadores** | Indicadores extraídos y añadidos a mano, con estado, justificación y consultas externas documentadas. |
| **Situación del caso** | Cifras, hitos por fase con sus tiempos, preguntas y comprobaciones de completitud. |
| **Informe de respuesta al incidente** | Estructura propia basada en el ciclo de gestión de incidentes (NIST SP 800-61, ISO/IEC 27035 y CCN-STIC 817): control del documento, ocho capítulos (síntesis, identificación, clasificación y comunicaciones, hallazgos, alcance del compromiso, respuesta, base probatoria y mejora) y anexos. Lo que el expediente conoce se rellena solo y el resto lleva indicaciones de qué debe redactar el analista. |

*Tabla 4 – Documentos exportables*

Los **informes personalizados** que definas en Ajustes aparecen como una tarjeta más.

La acción **Otras exportaciones** abre un desplegable con los datos en bruto para otras herramientas:
acta de evidencias, historial de transferencias, hitos, cronología, IOCs, preguntas y total timeline en
CSV, y el registro completo en JSONL.

Los valores de los indicadores salen **sin neutralizar**. Los documentos se generan siempre en
español y sobre fondo blanco, con independencia del idioma de la interfaz.

### 10.2 Registro de actividad

Los asientos del caso tal cual, del más reciente al más antiguo: es el fichero `registro.jsonl` sin
interpretar. Cada línea lleva la huella de la anterior.

## 11 Búsqueda, Guía y Ajustes

Herramientas disponibles desde cualquier pantalla: el buscador del expediente, la guía de uso y los
ajustes de la aplicación.

### 11.1 Búsqueda

El buscador de la cabecera busca a la vez en evidencias, indicadores, hitos, cronología, preguntas,
clasificación y registro. Todas las palabras se combinan con «y». Para acotar por tipo, añade
`tipo:` seguido de `evidencia`, `indicador`, `hito`, `cronología`, `pregunta`, `clasificación` o
`registro`. Por ejemplo: `tipo:hito bloqueado`.

### 11.2 Guía y capacidades

Un resumen de cómo se trabaja con TraceLock, qué hace cada función, con qué condiciones y qué no debe
esperarse de ella. Merece la pena leerla una vez.

### 11.3 Ajustes

- **Idioma:** español o inglés. El inglés solo cambia lo que se muestra: los datos del caso, lo que
  escriben los analistas y los documentos exportados siguen en español, y el registro guarda siempre
  los valores originales.
- **Recordar la carpeta del caso:** permite reanudar con un clic tras recargar. Está desactivado por
  defecto porque, al abrir el fichero como `file://`, otro HTML abierto en el mismo equipo podría
  llegar a leer el nombre de la carpeta y provocar un aviso de permiso sobre ella. Acceder de verdad
  seguiría exigiendo que alguien acepte ese aviso, pero si trabajas con expedientes sensibles en un
  equipo compartido, déjalo desactivado.
- **Playbooks:** plantillas de caso propias. Descarga el ejemplo, edítalo y cárgalo. Si una propia
  tiene el mismo nombre que una de serie, la sustituye.
- **Informes personalizados:** documentos propios que combinan texto fijo, apartados para que los
  rellene el analista y bloques de datos que la consola rellena sola. La lista de bloques disponibles
  está en el propio ajuste.
- **Autodiagnóstico:** comprueba que tu copia del fichero funciona como debe (huellas contra vectores
  publicados, encadenado del registro, escapado de datos de ficheros analizados, lectores de formatos,
  catálogos normativos…). Las pruebas viajan dentro del HTML: ejecútalo en cada equipo nuevo y antes
  de trabajar con un caso real. **Si alguna prueba falla, no uses esa copia para un caso real** hasta
  saber por qué: puede estar modificada o corrupta.

## 12 Trabajo en equipo

Varios analistas pueden trabajar sobre la misma carpeta de caso, por ejemplo en una unidad compartida,
cada uno con su copia de `tracelock.html`.

- Cada uno debe poner **su nombre** al abrir el caso: es lo que distingue quién hizo qué.
- La aplicación revisa el registro cada pocos segundos e incorpora lo que hayan anotado los demás. Te
  avisa de cuántos asientos nuevos han llegado y de quién.
- Antes de escribir, comprueba que nadie haya escrito entre medias y verifica lo escrito después.
  Reduce mucho el riesgo de sobrescrituras, pero no es un bloqueo real: en carreras muy ajustadas, uno
  de los analistas puede recibir un error y tener que repetir la acción.

## 13 Flujo de trabajo recomendado

1. **Antes de empezar:** ejecuta el autodiagnóstico en Ajustes si es un equipo nuevo o una copia
   nueva del fichero. Al abrir el caso, identifícate con tu nombre.
2. **Crea el caso** con la fecha de detección real y, si encaja, una plantilla.
3. **Da de alta las evidencias** con sus datos de adquisición y, siempre que exista, el hash de
   origen. **Protégelas** justo después y confírmalo.
4. **Analiza:** correos, laboratorio, metadatos. Si un resultado del laboratorio sostiene una
   conclusión, documéntalo en la cronología, en el seguimiento de un hito o en una nota.
5. **Valora los indicadores** con su justificación, asígnales rol y vincúlalos. Documenta las
   consultas externas.
6. **Construye la cronología** con huso y fuente en cada hecho, y registra las técnicas ATT&CK
   observadas.
7. **Coordina** con hitos (iniciados y finalizados en el momento, con capturas cuando aporten) y
   preguntas abiertas. Usa el borrador de notas durante las llamadas y guárdalo como nota.
8. **Clasifica y justifica** según CCN-STIC 817, y según RSIT y CISA si aplican. Revisa si hay
   obligación de notificar y el plazo de cierre.
9. **Antes de cerrar:** revisa la preparación para el cierre, deja que termine la verificación de
   evidencias, genera el sello externo y guárdalo fuera de la carpeta, y exporta los documentos.

## 14 Cosas a tener en cuenta

Límites y comportamientos de la herramienta que conviene conocer antes de trabajar un caso real: qué
acredita y qué no, qué se pierde al cerrar la pestaña, cómo funciona en Firefox, qué implica para la
privacidad y qué cambia con el idioma.

### 14.1 Límites de lo que TraceLock acredita

- **Horas:** salen del reloj del equipo; nadie las certifica. Si el reloj está mal, las horas del
  registro también.
- **Identidad:** el nombre del analista es declarado. No hay autenticación.
- **Registro:** detecta modificaciones, no las impide. Quien pueda escribir en el fichero puede
  recalcular toda la cadena; el sello externo, guardado fuera, es lo que lo delata.
- **Solo lectura:** protege contra accidentes, no contra manipulaciones, y no se hereda a los ficheros
  que se añaden después.
- **Comprobación rápida:** no detecta a quien modifique un fichero y restaure su fecha a propósito. La
  verificación completa del hash sí.

### 14.2 Lo que se guarda en el navegador (y se pierde al cerrar la pestaña)

Por seguridad, TraceLock guarda sus preferencias en el almacenamiento de la **pestaña**, no en el del
navegador. Sobreviven a una recarga, pero **se pierden al cerrar la pestaña o el navegador**:

- el **borrador de notas**;
- el idioma;
- los **playbooks e informes personalizados** que hayas cargado;
- el **catálogo ATT&CK** importado;
- en modo reducido (Firefox), **el propio registro del caso**.

Guarda los ficheros de playbooks, informes y catálogo en un sitio accesible para volver a cargarlos, y
pasa el borrador a nota antes de cerrar. La única excepción es **Recordar la carpeta del caso**, que sí
persiste.

### 14.3 Modo reducido (Firefox)

Firefox no permite a una página escribir en una carpeta local. En ese caso, TraceLock calcula las
huellas de las evidencias pero **no las copia a ninguna parte**, no puede volver a verificarlas y el
registro vive en la pestaña. **Exporta el registro antes de cerrar**. Para trabajar un caso real, usa
Chrome o Edge.

### 14.4 Privacidad

- Las consultas externas de indicadores revelan el indicador al servicio que abras.
- Las notas guardadas y los motivos que escribes quedan en el registro para siempre: no hay forma de
  borrarlos sin romper la cadena.
- El análisis de correos no carga imágenes remotas ni ejecuta nada.

### 14.5 Idioma

La interfaz en inglés traduce la pantalla, no el expediente. Los documentos exportados salen en
español: tenlo en cuenta antes de entregar un expediente a un destinatario que no lea español.

## 15 Solución de problemas

**«Abre primero la carpeta del caso».** Estás en Chrome o Edge sin un caso abierto. Abre o crea uno.

**«El navegador ha retirado el permiso sobre la carpeta del caso».** Ocurre tras recargar o tras un
tiempo. Pulsa de nuevo en abrir el caso (o en Reanudar, si tienes activado recordar la carpeta).

**«No se puede escribir en registro.jsonl».** El fichero se ha quedado en solo lectura. La protección de
evidencias no toca el registro, así que suele deberse a una protección aplicada a mano sobre toda la
carpeta o con una versión antigua de los scripts. Quítale el atributo (`attrib -R registro.jsonl` en
Windows o `chmod u+w registro.jsonl` en Linux y macOS) e inténtalo de nuevo.

**TraceLock no puede leer las evidencias en Linux o macOS.** Comprueba que la protección se aplicó
solo a los ficheros y no a las carpetas: el comando de TraceLock (`find … -type f`) no toca carpetas.
Si alguien quitó permisos a `originales/` o `trabajo/`, recupéralos con
`chmod 755 evidencias/originales evidencias/trabajo` dentro de la carpeta del caso.

**`proteger.cmd` no se ejecuta.** Si Windows muestra «Windows protegió su PC», es la marca de fichero
descargado: puedes quitarla en Propiedades → Desbloquear. Si dice que lo impide una directiva o lo
bloquea el antivirus, es una restricción de tu organización: usa la opción del Explorador o la del
comando.

**«Cadena rota en el asiento N».** Alguien o algo ha modificado el registro a partir de ese asiento.
**No sigas trabajando sobre esa carpeta** hasta aclararlo: compara con una copia anterior, con el sello
externo si lo tienes, y documenta lo ocurrido.

**«El registro es más corto que antes o ha cambiado un asiento ya observado».** El fichero ha perdido
líneas o alguna ha cambiado mientras lo tenías abierto. Revisa el caso antes de continuar.

**La verificación automática encuentra evidencias que no coinciden.** El fichero original ha cambiado
desde el alta. No lo modifiques ni lo borres. Averigua qué ha pasado (una herramienta que escribió en
él, una restauración de copia de seguridad, un error de sincronización…) y documéntalo.

**«datos-base.json no es JSON válido».** Hay un error de sintaxis en el fichero, normalmente una coma
de más o una comilla sin cerrar. Corrígelo con un editor o bórralo para que se regenere con los
valores por defecto.

**El autodiagnóstico falla.** No uses esa copia del fichero con un caso real. Descarga una copia limpia
y vuelve a ejecutarlo.

## 16 Glosario

**Alta.** Entrada de una evidencia en el expediente.

**Asiento.** Cada línea del registro: una acción con su hora, autor y datos.

**Copia de trabajo.** Duplicado de la evidencia original sobre el que se puede trabajar.

**Responsable de la evidencia.** Persona u organismo que tiene la evidencia en cada momento; cambia
con cada transferencia.

**Huella (hash).** Resumen criptográfico de un fichero. SHA-256 es la que usa TraceLock para acreditar
la integridad; MD5 se registra solo por compatibilidad con otras herramientas.

**Neutralizar (defang).** Escribir un indicador de forma que no se pueda abrir por accidente:
`hxxps://ejemplo[.]com`.

**Playbook o plantilla de caso.** Conjunto predefinido de hitos y preguntas para un tipo de incidente.

**Sello externo o anclaje.** Foto del estado del registro y de las evidencias que se guarda fuera de
la carpeta del caso para detectar reconstrucciones o recortes del registro.

**TLP.** Traffic Light Protocol: marcado que indica con quién se puede compartir la información del
caso (RED, AMBER+STRICT, AMBER, GREEN, CLEAR).
