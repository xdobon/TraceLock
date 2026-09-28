# Changelog

Cambios relevantes de TraceLock para quien lo usa. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según
[SemVer](https://semver.org/lang/es/).

## [1.1.0] — 2026-09-27

Primera versión publicada.

### Expediente y registro
- Todo el caso vive en una carpeta local: evidencias, registro y adjuntos. Sin servidor ni instalación:
  un único fichero HTML.
- Registro de actividad encadenado con SHA-256: cada asiento lleva la huella del anterior, de modo que
  cualquier modificación posterior es detectable. Sello externo para anclar el estado de la cadena
  fuera de la carpeta del caso.
- Nada se borra: rectificar o eliminar hechos, hitos y preguntas deja constancia del motivo, y el
  asiento original permanece en el registro.

### Evidencias y trazabilidad
- Alta con copia original y copia de trabajo, huella SHA-256 por bloques y cotejo con la huella
  declarada en origen.
- Verificación automática de las evidencias al abrir el caso y verificación bajo demanda.
- Guía de protección de solo lectura para Windows, Linux y macOS, con aviso y control antes de nuevas
  altas mientras haya evidencias sin proteger.
- Transferencias registradas entre personas u organismos y acta de evidencias.

### Análisis
- Análisis de correo (EML/MSG) con extracción automática de indicadores.
- Repositorio de IOCs con rol, valoración justificada, vínculos entre indicadores y grafo de
  relaciones.
- Técnicas MITRE ATT&CK con evidencia y nivel de confianza.
- Laboratorio local de decodificación y lectura de metadatos.

### Gestión del incidente
- Clasificación según CCN-STIC 817, con taxonomías RSIT y NIST/CISA.
- Cronología del ataque con husos horarios, hitos por fase con tiempos automáticos, preguntas
  abiertas y notas.
- Resumen del caso con preparación para el cierre.

### Entrega
- Documentos en Word y PDF: acta de evidencias, relación de indicadores, situación del caso e
  informe de respuesta al incidente. Exportaciones CSV y del registro en JSONL.
- Interfaz en español e inglés. Autodiagnóstico integrado.

### Documentación
- Manual de usuario (`docs/MANUAL.md`, también en Word y PDF) organizado en apartados numerados con
  índice, capturas y tablas con leyenda. Incluye cómo y por qué importar el catálogo de MITRE ATT&CK,
  el análisis de correo dentro del Laboratorio, y las transferencias y el sello externo dentro de
  Evidencias.
- Manual de usuario en inglés (`docs/MANUAL.en.md`, también en Word y PDF).

### Límites conocidos
- **Carpeta compartida:** el trabajo simultáneo de varios analistas sobre la misma carpeta usa un
  control optimista que reduce el riesgo de sobrescrituras, pero no es un bloqueo (ver `THREAT_MODEL.md`).
- **Navegador:** funcionalidad completa en Chrome y Edge. Firefox trabaja en modo reducido (calcula
  huellas, pero no copia ficheros y el registro vive en la pestaña).
- **Identidad del analista:** es declarativa. Los asientos llevan el nombre indicado, pero no hay firma
  criptográfica por analista (ver `THREAT_MODEL.md`).
- **Protección de solo lectura:** es un paso manual fuera de la aplicación; TraceLock no puede
  comprobar el atributo y registra la confirmación del analista.
- **Traducción:** la versión en inglés de la taxonomía CCN-STIC 817 no es una traducción oficial. Los
  documentos exportados se generan en español.
