/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= guía y capacidades ================= */
function pintarGuia(){
  $('#guia').innerHTML=`
  <div class="rejilla">
    <div class="tarjeta"><h3>Empezar</h3><div class="ayuda">
      <p>Escribe tu nombre en Analista, crea un caso o abre una carpeta existente, y añade evidencias
      arrastrándolas. A partir de ahí todo queda anotado solo.</p>
      <p>Un caso vive entero en su carpeta: <code>evidencias/</code>, <code>registro.jsonl</code> y
      <code>datos-base.json</code>. Copiando esa carpeta te llevas el expediente completo.</p></div></div>
    <div class="tarjeta"><h3>Investigar</h3><div class="ayuda">
      <p>Analiza correos <code>.eml</code> y <code>.msg</code> para extraer cabeceras, cadena de entrega
      e indicadores. Valora cada indicador con su justificación y documenta las consultas externas.</p>
      <p>El grafo muestra cómo se relacionan evidencias, indicadores, hitos y personas. El laboratorio
      encadena transformaciones reproducibles sobre texto.</p></div></div>
    <div class="tarjeta"><h3>Coordinar</h3><div class="ayuda">
      <p>Los hitos sellan su hora de inicio y de fin al pulsar, nunca a mano. Las preguntas abiertas
      son lo que decide si un caso puede cerrarse.</p>
      <p>La cronología recoge los hechos del ataque con su huso horario y su fuente; el total timeline,
      lo que ha hecho el equipo.</p></div></div>
    <div class="tarjeta"><h3>Verificar y entregar</h3><div class="ayuda">
      <p>Cada asiento lleva la huella del anterior: alterar una línea rompe la cadena y se señala arriba.
      Verifica las evidencias antes de exportar y ancla el sello fuera del sistema.</p>
      <p>Exporta el acta de evidencias, los indicadores, la situación o el informe completo en Word o PDF.</p></div></div>
  </div>

  <div class="tarjeta" style="margin-bottom:20px"><h3>Capacidades y condiciones</h3>
  <table><thead><tr><th style="width:230px">Función</th><th>Qué hace y qué necesita</th></tr></thead><tbody>`+
  [['Carpeta del caso','Requiere la File System Access API: Chrome o Edge. En Firefox la aplicación avisa y pasa a modo reducido, sin copiar ficheros.'],
   ['Huellas','SHA-256 y MD5 implementados en JavaScript y calculados por bloques de 4 MB, sin cargar el fichero en memoria. Unos 70 MB/s.'],
   ['Registro','Encadenado por hash. Detecta cualquier alteración posterior, pero no la impide: quien tenga escritura sobre el fichero puede recalcular la cadena entera.'],
   ['Verificación automática','Al abrir el caso se comprueban solos el tamaño y la fecha de todos los originales (instantáneo) y después su SHA-256 completo en segundo plano, sin bloquear la interfaz. Solo se anotan las discrepancias y un resumen por pasada. Si se cierra la pestaña a mitad, esa pasada no queda anotada.'],
   ['Solo lectura','El navegador no puede cambiar permisos. Se aplica desde las propiedades de la carpeta en el Explorador de Windows o con el comando attrib; es posterior al alta y hay que repetirlo tras cada evidencia nueva — la vista de Evidencias avisa mientras quede alguna sin proteger.'],
   ['Correo .eml','Cabeceras, MIME multiparte, base64 y quoted-printable, palabras codificadas y adjuntos.'],
   ['Correo .msg','Lector propio del contenedor OLE2. Los borradores y elementos enviados suelen carecer de cabeceras de transporte y se avisa de ello.'],
   ['Indicadores','Se extraen del análisis de correo y quedan atados a su evidencia. En pantalla siempre neutralizados; en las exportaciones, con su valor real.'],
   ['Consultas externas','VirusTotal, urlscan y AbuseIPDB son enlaces que abres tú. La consola no envía nada ni guarda credenciales.'],
   ['Clasificación','Taxonomía, peligrosidad e impacto según CCN-STIC 817, edición de junio de 2018, con las obligaciones de notificación de su Tabla 6.'],
   ['Laboratorio','Eliges una evidencia, indicas qué quieres hacer (decodificar base64, leer metadatos, extraer indicadores…) y lo ejecutas. Al registrar la operación se anotan las huellas de entrada y salida, no su contenido.'],
   ['Documentos','El DOCX se genera con un compresor ZIP propio; el PDF lo produce el navegador desde una vista preparada para imprimir.'],
   ['Red','La única petición externa es la tipografía de Google Fonts. Sin conexión, cae a la fuente del sistema.']]
  .map(([a,b])=>`<tr><th>${esc(a)}</th><td class="desenlace">${esc(b)}</td></tr>`).join('')+
  `</tbody></table></div>

  <div class="tarjeta"><h3>Lo que esta herramienta no es</h3>
  <div class="ayuda">
    <p>Las marcas de tiempo salen del reloj de este equipo y no las atestigua nadie. El nombre del
    analista es autodeclarado: no hay autenticación. El alta de una evidencia documenta su entrada en
    este sistema, no su adquisición original.</p>
    <p>Sirve como registro de trabajo riguroso y trazable, y como base para redactar el informe. No
    sustituye al acta de adquisición ni constituye por sí sola prueba autónoma ante un tercero. Para
    eso hacen falta un sellado de tiempo cualificado y una identidad verificable.</p>
  </div></div>`;
}

