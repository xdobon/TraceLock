/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= exportación ================= */
function bajar(nombre,contenido,tipo){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([contenido],{type:tipo||'text/plain;charset=utf-8'}));
  a.download=nombre;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
const csvSeguro=(v)=>{
  let t=String(v==null?'':v).replace(/[\r\n]+/g,' ');
  if(/^[=+\-@]/.test(t))t="'"+t;
  return '"'+t.replace(/"/g,'""')+'"';
};
const csv=(filas)=>'\uFEFF'+filas.map((f)=>f.map(csvSeguro).join(';')).join('\r\n');

$('#exp-custodia').onclick=()=>bajar('acta_evidencias.csv',csv([
  ['N.','Evidencia / origen','Metodo de adquisicion','Adquirida por','Fecha de adquisicion (UTC)',
   'Alta en el sistema (UTC)','Hash SHA-256 original','SHA-256 copia de trabajo','MD5','SHA-256 declarado en origen','Coteja con el origen',
   'Equipo','N. de serie','Usuario del equipo','Ubicacion','Estado del sistema','Testigo',
   'Responsable actual','Transferencias','Ubicacion del fichero','Tamano (bytes)'],
  ...EST.ev.map((e)=>[e.id,e.nombre+(e.origen?' - '+e.origen:''),e.metodo,
    e.adquiridaPor||e.custodio,fmtUTC(e.adquiridaEl)||'',fmtUTC(e.ts),e.originalHash||e.sha256,e.workingHash||'',e.md5||'',
    e.hashOrigen||'',e.hashOrigen?(e.coincideOrigen?'si':'NO'):'no declarado',
    e.equipo||'',e.serie||'',e.usuarioEquipo||'',e.ubicacion||'',e.estadoSistema||'',e.testigo||'',
    e.custodioActual||e.custodio,e.transferencias.length,
    e.archivo?'evidencias/'+e.archivo:'',e.bytes])]),'text/csv');

$('#exp-custodiahist').onclick=()=>bajar('historial_transferencias.csv',csv([
  ['Evidencia','Fecha (UTC)','Entrega','Recibe','Medio','Motivo','SHA-256 de la copia entregada','Observaciones','Anotado por'],
  ...EST.ev.flatMap((e)=>e.transferencias.map((t)=>[e.id,fmtUTC(t.ts),t.origen,t.destino,t.medio,
    t.motivo,t.hashCopia||'',t.observaciones||'',t.actor]))]),'text/csv');

$('#exp-sello').onclick=()=>generarSelloExterno();
$('#imp-sello').onclick=()=>$('#f-sello').click();
$('#f-sello').onchange=async(e)=>{const f=e.target.files[0];e.target.value='';if(f)await verificarSelloDesdeFichero(f);};

$('#exp-hitos').onclick=()=>bajar('hitos.csv',csv([
  ['ID','Fase','Hito','Estado','Riesgo','Propietario','Inicio (UTC)','Fin (UTC)','Duracion','Resultado','Seguimiento','Pruebas graficas'],
  ...EST.hi.map((h)=>[h.id,h.fase,h.hito,h.estado,h.riesgo,h.propietario,fmtUTC(h.inicio),fmtUTC(h.fin),
    h.inicio&&h.fin?dur(h.inicio,h.fin):'',h.resultado||'',
    h.seg.map((s)=>fmtUTC(s.ts)+' '+s.texto).join(' | '),
    (h.pruebas||[]).map((x)=>'acciones/'+x.archivo+' sha256='+x.sha256).join(' | ')])]),'text/csv');

$('#exp-crono').onclick=()=>bajar('cronologia.csv',csv([
  ['Fecha','Hora','Huso horario','Hecho observado','Fuente de la evidencia'],
  ...EST.cr.slice().sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora))
    .map((c)=>[fmtFecha(c.fecha),c.hora,c.zona,c.accion,c.fuente])]),'text/csv');

$('#exp-preg').onclick=()=>bajar('preguntas_abiertas.csv',csv([
  ['ID','Pregunta','Dirigida a','Estado','Abierta desde (UTC)','Respuesta'],
  ...EST.pr.map((p)=>[p.id,p.pregunta,p.dirigidaA,p.estado,fmtUTC(p.ts),p.respuesta||''])]),'text/csv');

$('#exp-tt').onclick=()=>bajar('total_timeline.csv',csv([
  ['#','Registrado (UTC)','Registrado (local)','Categoria','Accion','Referencia','Detalle','Analista','Fecha del hecho'],
  ...filasTt().map((r)=>[r.seq,fmtUTC(r.ts),fmtLocal(r.ts),r.cat,r.accion,r.ref,r.detalle,r.actor,r.fechaHecho])
]),'text/csv');

$('#exp-registro').onclick=()=>bajar('registro.jsonl',ASIENTOS.map((a)=>JSON.stringify(a)).join('\n')+'\n');

/* Comandos de protección. Solo tocan FICHEROS dentro de evidencias/, nunca carpetas ni el
   registro: así TraceLock puede seguir escribiendo en el registro y dando de alta evidencias
   nuevas con las anteriores protegidas.
   - Windows: sin /S, attrib solo afectaba a evidencias\ (vacía: todo está en originales\ y
     trabajo\), así que proteger.cmd no protegía nada.
   - Linux/macOS: «chmod 444 evidencias/*» aplicaba 444 a las CARPETAS originales/ y trabajo/, que
     perdían el permiso de acceso: dejaba de poderse leer ninguna evidencia (ni verificarla) y de
     darse de alta nada. Comprobado en Linux antes de corregirlo. */
const CMD_PROTEGER_WIN='attrib +R "evidencias\\*" /S';
const CMD_DESPROTEGER_WIN='attrib -R "evidencias\\*" /S';
const CMD_PROTEGER_NIX='find evidencias -type f -exec chmod a-w {} +';
const CMD_DESPROTEGER_NIX='find evidencias -type f -exec chmod u+w {} +';
$('#prot-win').onclick=()=>bajar('proteger.cmd','@echo off\r\nrem Ejecutar dentro de la carpeta del caso: deja las evidencias en solo lectura.\r\n'+
  'cd /d "%~dp0"\r\nif not exist evidencias (echo No hay carpeta evidencias junto a este script.& pause & exit /b 1)\r\n'+
  CMD_PROTEGER_WIN+'\r\necho Evidencias marcadas como solo lectura. Comprobacion:\r\nattrib "evidencias\\*" /S\r\npause\r\n');
$('#desprot-win').onclick=()=>bajar('desproteger.cmd','@echo off\r\nrem Retira el solo lectura de las evidencias. Guardar DENTRO de la carpeta del caso.\r\n'+
  'cd /d "%~dp0"\r\nif exist registro.jsonl attrib -R registro.jsonl\r\nif exist datos-base.json attrib -R datos-base.json\r\n'+
  'if exist evidencias '+CMD_DESPROTEGER_WIN+'\r\necho Solo lectura retirado.\r\npause\r\n');
function copiarTexto(t,ok){
  navigator.clipboard.writeText(t).then(()=>alert(ok),
    ()=>{$('#cmd-proteger').textContent=t;
      alert('El navegador ha bloqueado el portapapeles. El comando está en pantalla, cópialo a mano:\n\n'+t);});
}
$('#copiar-attrib').onclick=()=>copiarTexto(CMD_PROTEGER_WIN,
  'Comando copiado. Pégalo en un cmd abierto dentro de la carpeta del caso.');
$('#copiar-attrib-off').onclick=()=>copiarTexto(CMD_DESPROTEGER_WIN,
  'Comando de reversión copiado. Ejecútalo solo si necesitas volver a escribir sobre una evidencia ya protegida.');
// Linux y macOS usan el mismo comando (find + chmod), cada uno con sus botones.
for(const so of ['linux','mac']){
  $('#copiar-nix-'+so).onclick=()=>copiarTexto(CMD_PROTEGER_NIX,
    'Comando copiado. Ejecútalo en una terminal abierta dentro de la carpeta del caso.');
  $('#copiar-nix-off-'+so).onclick=()=>copiarTexto(CMD_DESPROTEGER_NIX,
    'Comando de reversión copiado. Ejecútalo solo si necesitas volver a escribir sobre una evidencia ya protegida.');
}
const bajarProtegerSh=()=>bajar('proteger.sh','#!/bin/sh\n# Deja las evidencias en solo lectura. Guardar DENTRO de la carpeta del caso.\n'+
  'cd "$(dirname "$0")" || exit 1\n[ -d evidencias ] || { echo "No hay carpeta evidencias junto a este script."; exit 1; }\n'+
  CMD_PROTEGER_NIX+'\necho "Evidencias en solo lectura."\n');
const bajarDesprotegerSh=()=>bajar('desproteger.sh','#!/bin/sh\n# Retira el solo lectura de las evidencias. Guardar DENTRO de la carpeta del caso.\n'+
  'cd "$(dirname "$0")" || exit 1\n[ -f registro.jsonl ] && chmod u+w registro.jsonl\n[ -f datos-base.json ] && chmod u+w datos-base.json\n'+
  '[ -d evidencias ] && '+CMD_DESPROTEGER_NIX+'\necho "Solo lectura retirado."\n');
$('#prot-nix').onclick=bajarProtegerSh;$('#prot-mac').onclick=bajarProtegerSh;
$('#desprot-nix').onclick=bajarDesprotegerSh;$('#desprot-mac').onclick=bajarDesprotegerSh;

/* ---------- selector de sistema operativo ----------
   Tres pestañas (Windows, Linux, macOS): al pulsar una se muestran sus instrucciones; pulsar la
   que ya está abierta la cierra. Se marca con «este equipo» la que corresponde al navegador, como
   pista: la carpeta del caso puede estar en otro equipo, así que no se abre sola. */
function elegirSo(so){
  const ya=$('#so-tab-'+so).getAttribute('aria-selected')==='true';
  $$('.so-btn').forEach((b)=>b.setAttribute('aria-selected',String(!ya&&b.dataset.so===so)));
  $$('.so-panel').forEach((p)=>p.classList.toggle('oculto',ya||p.id!=='so-'+so));
}
$$('.so-btn').forEach((b)=>b.onclick=()=>elegirSo(b.dataset.so));
$('.so-opciones').onkeydown=(e)=>{
  const bs=[...$$('.so-btn')], i=bs.indexOf(document.activeElement);
  if(i<0||!['ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();bs[(i+(e.key==='ArrowRight'?1:bs.length-1))%bs.length].focus();
};
(()=>{const ua=navigator.userAgent;
  const so=/Windows/.test(ua)?'win':/Mac OS X|Macintosh/.test(ua)?'mac':/Linux|X11/.test(ua)?'linux':null;
  if(so)$('#so-tab-'+so+' .so-este').classList.remove('oculto');})();

