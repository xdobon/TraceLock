# Política de seguridad

TraceLock es una herramienta pensada para usarse durante la respuesta a
incidentes de seguridad. Un fallo de seguridad en la propia herramienta
(XSS, bypass de la CSP, un vector que permita alterar el registro sin que
la cadena de hashes lo detecte, etc.) tiene más impacto que en un proyecto
cualquiera, así que se agradece especialmente que se reporte en privado
antes de hacerlo público.

## Cómo reportar una vulnerabilidad

**No abras un issue público ni un PR para reportar una vulnerabilidad.**

Usa **GitHub Security Advisories**: pestaña "Security" → "Report a
vulnerability" de este repositorio. Queda privado entre tú y los
mantenedores hasta que se publique un aviso coordinado.

No hay canal de correo ni clave PGP: los avisos de seguridad de GitHub
son privados entre quien informa y el mantenedor, y evitan mantener un
buzón que podría quedar desatendido.

Incluye, si es posible:

- Versión de TraceLock afectada (o commit/hash del `tracelock.html`
  usado).
- Navegador y sistema operativo.
- Pasos para reproducir, o una prueba de concepto mínima.
- Impacto que crees que tiene (¿permite leer datos de otro caso?,
  ¿permite alterar el registro sin que se detecte?, ¿ejecución de código
  arbitrario?).

## Qué esperar

- Confirmación de recepción: en un plazo razonable (objetivo: 72 horas).
- Una valoración inicial de severidad y, si se acepta, un plan de
  corrección con plazo estimado.
- Crédito público en el changelog/release notes una vez publicado el
  arreglo, salvo que prefieras permanecer anónimo — indícalo en el
  reporte.

No hay programa de recompensas (bug bounty): es un proyecto personal, no
una empresa con presupuesto para eso. El reconocimiento es la única
compensación que se puede ofrecer por ahora.

## Alcance

Entra dentro del alcance de esta política cualquier problema en el propio
código de TraceLock: XSS, bypass de la Content-Security-Policy,
manipulación del registro que no quede reflejada en la verificación de la
cadena o del sello externo, fugas de datos entre casos, ReDoS, o
deserialización insegura de playbooks/informes importados.

**Fuera de alcance**, porque son limitaciones de diseño ya documentadas y
no vulnerabilidades:

- Que el registro se pueda editar por alguien con acceso de escritura al
  fichero y herramientas externas al margen de TraceLock — el modelo de
  integridad está pensado para *detectar* esa alteración a posteriori
  (cadena de hashes + sello externo), no para impedirla técnicamente.
  Ver `THREAT_MODEL.md`.
- Que la confidencialidad del expediente dependa de los permisos de la
  carpeta o disco donde se guarde — TraceLock no cifra ni gestiona
  control de acceso sobre el almacenamiento subyacente.
- Que las marcas de tiempo dependan del reloj local del equipo.
- Que la identidad del analista (`actor`) sea autodeclarada, sin
  autenticación.

Si tienes dudas sobre si algo entra en el alcance, repórtalo de todas
formas por el canal privado y se valora caso a caso — es mejor un falso
positivo que un problema real sin reportar.
