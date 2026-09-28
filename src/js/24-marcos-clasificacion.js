/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= marcos de clasificación ================= */

/* Reference Security Incident Taxonomy (RSIT), grupo de trabajo TF-CSIRT y ENISA,
   versión 1003 del fichero humanv1 del repositorio oficial. */
const RSIT=[
 ['Abusive Content','Contenido abusivo',[
   ['Spam','Correo masivo no solicitado, o recursos que sostienen su infraestructura'],
   ['Harmful Speech','Acoso, discriminación o amenazas contra una o varias personas'],
   ['(Child) Sexual Exploitation/Sexual/Violent Content','Explotación sexual infantil, contenido sexual o apología de la violencia']]],
 ['Malicious Code','Código dañino',[
   ['Infected System','Sistema infectado por código dañino'],
   ['C2 Server','Servidor de mando y control contactado por sistemas infectados'],
   ['Malware Distribution','URI usada para distribuir código dañino'],
   ['Malware Configuration','URI que aloja un fichero de configuración de código dañino']]],
 ['Information Gathering','Obtención de información',[
   ['Scanning','Peticiones dirigidas a descubrir debilidades: escaneo de puertos, consultas DNS'],
   ['Sniffing','Observación y registro del tráfico de red'],
   ['Social Engineering','Obtención de información de una persona por medios no técnicos']]],
 ['Intrusion Attempts','Intentos de intrusión',[
   ['Exploitation of Known Vulnerabilities','Intento de explotar una vulnerabilidad con identificador conocido, tipo CVE'],
   ['Login Attempts','Intentos repetidos de autenticación por fuerza bruta'],
   ['New Attack Signature','Ataque mediante un exploit desconocido']]],
 ['Intrusions','Intrusiones',[
   ['Privileged Account Compromise','Compromiso con privilegios administrativos'],
   ['Unprivileged Account Compromise','Compromiso mediante una cuenta sin privilegios'],
   ['Application Compromise','Compromiso de una aplicación explotando una vulnerabilidad'],
   ['System Compromise','Compromiso de un sistema: accesos o comandos no autorizados'],
   ['Burglary','Intrusión física en un edificio o centro de datos']]],
 ['Availability','Disponibilidad',[
   ['Denial of Service','Denegación de servicio'],
   ['Distributed Denial of Service','Denegación de servicio distribuida'],
   ['Misconfiguration','Configuración errónea que provoca indisponibilidad'],
   ['Sabotage','Daño intencionado a un sistema o componente para interrumpir un servicio'],
   ['Outage','Caída por causas como fallo de climatización o desastre natural']]],
 ['Information Content Security','Seguridad del contenido de la información',[
   ['Unauthorised Access to Information','Acceso no autorizado a información'],
   ['Unauthorised Modification of Information','Modificación no autorizada, incluidos cifrado por ransomware y desfiguraciones'],
   ['Data Loss','Pérdida de datos por fallo de soporte o robo físico'],
   ['Leak of Confidential Information','Fuga de información confidencial: credenciales o datos personales']]],
 ['Fraud','Fraude',[
   ['Unauthorised Use of Resources','Uso de recursos para fines no autorizados'],
   ['Copyright','Distribución de material protegido por derechos de autor'],
   ['Masquerade','Suplantación de la identidad de otra entidad para obtener un beneficio'],
   ['Phishing','Suplantación para inducir a la víctima a revelar credenciales']]],
 ['Vulnerable','Vulnerable',[
   ['Weak Cryptography','Servicios accesibles con criptografía débil'],
   ['DDoS Amplifier','Servicios abusables para amplificación de denegación de servicio'],
   ['Potentially Unwanted Accessible Services','Servicios expuestos no deseados: Telnet, RDP, VNC'],
   ['Information disclosure','Servicios que exponen información sensible'],
   ['Vulnerable System','Sistema vulnerable a determinados ataques']]],
 ['Other','Otros',[
   ['Uncategorised','Incidentes que no encajan en ninguna clase'],
   ['Undetermined','Clasificación desconocida o sin determinar']]],
];

/* Esquema de notificación de CISA, alineado con la NIST SP 800-61 Rev. 2.
   La revisión 2 fue retirada en abril de 2025 y sustituida por la Rev. 3, que ya no
   incluye estas tablas; el esquema sigue vigente a través de la guía de CISA. */
const NIST_VECTORES=[
 ['Unknown','Causa del ataque sin identificar'],
 ['Attrition','Métodos de fuerza bruta para comprometer, degradar o destruir'],
 ['Web','Ataque ejecutado desde un sitio o aplicación web'],
 ['Email/Phishing','Ataque ejecutado mediante un mensaje de correo o su adjunto'],
 ['External/Removable Media','Ataque ejecutado desde un soporte extraíble o periférico'],
 ['Impersonation/Spoofing','Sustitución de contenido o servicio legítimo por uno malicioso'],
 ['Improper Usage','Violación de la política de uso aceptable por un usuario autorizado'],
 ['Loss or Theft of Equipment','Pérdida o robo de un dispositivo o soporte'],
 ['Other','El método no encaja en ningún otro vector']];

const NIST_FUNCIONAL=[
 ['NO IMPACT','Sin impacto'],
 ['NO IMPACT TO SERVICES','Sin impacto sobre servicios ni entrega a clientes'],
 ['MINIMAL IMPACT TO NON-CRITICAL SERVICES','Impacto pequeño sobre sistemas no críticos'],
 ['MINIMAL IMPACT TO CRITICAL SERVICES','Impacto mínimo pero sobre un sistema crítico'],
 ['SIGNIFICANT IMPACT TO NON-CRITICAL SERVICES','Impacto significativo sobre un servicio no crítico'],
 ['DENIAL OF NON-CRITICAL SERVICES','Un sistema no crítico queda denegado o destruido'],
 ['SIGNIFICANT IMPACT TO CRITICAL SERVICES','Impacto significativo sobre un sistema crítico'],
 ['DENIAL OF CRITICAL SERVICES/LOSS OF CONTROL','Un sistema crítico queda indisponible']];

const NIST_INFORMACION=[
 ['NO IMPACT','Sin impacto conocido sobre los datos'],
 ['SUSPECTED BUT NOT IDENTIFIED','Se sospecha pérdida de datos, sin confirmación directa'],
 ['PRIVACY DATA BREACH','Comprometida la confidencialidad de datos personales o de salud'],
 ['PROPRIETARY INFORMATION BREACH','Comprometida información propietaria no clasificada'],
 ['DESTRUCTION OF NON-CRITICAL SYSTEMS','Técnicas destructivas contra un sistema no crítico'],
 ['CRITICAL SYSTEMS DATA BREACH','Exfiltrados datos de un sistema crítico'],
 ['CORE CREDENTIAL COMPROMISE','Exfiltradas credenciales de dominio o de sistemas críticos'],
 ['DESTRUCTION OF CRITICAL SYSTEM','Técnicas destructivas contra un sistema crítico']];

const NIST_RECUPERACION=[
 ['REGULAR','Tiempo de recuperación previsible con los recursos existentes'],
 ['SUPPLEMENTED','Previsible, pero requiere recursos adicionales'],
 ['EXTENDED','Imprevisible: hacen falta recursos adicionales y ayuda externa'],
 ['NOT RECOVERABLE','La recuperación no es posible']];

const NIST_UBICACION=['LEVEL 1 - BUSINESS DEMILITARIZED ZONE','LEVEL 2 - BUSINESS NETWORK',
 'LEVEL 3 - BUSINESS NETWORK MANAGEMENT','LEVEL 4 - CRITICAL SYSTEM DMZ',
 'LEVEL 5 - CRITICAL SYSTEM MANAGEMENT','LEVEL 6 - CRITICAL SYSTEMS','LEVEL 7 - SAFETY SYSTEMS','UNKNOWN'];

const MARCOS=[
 {id:'ccn',nombre:'CCN-STIC 817 (ENS)',asiento:'CLASIFICACION_CCN',
  pie:'Guía del Esquema Nacional de Seguridad para gestión de ciberincidentes. Es la que determina la obligación de notificar al CCN-CERT y el plazo de cierre.'},
 {id:'rsit',nombre:'ENISA · RSIT',asiento:'CLASIFICACION_RSIT',
  pie:'Reference Security Incident Taxonomy del grupo de trabajo de TF-CSIRT y ENISA. Es la lengua común entre CSIRT europeos; clasifica el tipo de incidente y no define escalas de gravedad.'},
 {id:'nist',nombre:'NIST 800-61 r2 · CISA',asiento:'CLASIFICACION_NIST',
  pie:'Esquema de notificación de CISA alineado con la NIST SP 800-61 Rev. 2. No clasifica el tipo de incidente sino su repercusión: vector de ataque, impacto funcional, impacto en la información y recuperabilidad.'}];

let marcoActivo='ccn';

const clasifDe=(tipoAsiento)=>{
  for(let i=ASIENTOS.length-1;i>=0;i--)
    if(ASIENTOS[i].tipo===tipoAsiento)
      return Object.assign({},ASIENTOS[i].datos,{ts:ASIENTOS[i].ts,actor:ASIENTOS[i].actor});
  return null;
};

window.marcoIr=(id)=>{marcoActivo=id;pintarClasificacion();};

/* ---------- RSIT ---------- */
const RSIT_PLANOS=RSIT.flatMap(([cl,es,ts])=>ts.map(([t,d])=>
  ({etiqueta:cl+' · '+t,clase:cl,claseEs:es,tipo:t,desc:d})));

window.clasificarRsit=async function(){
  if(!exigeCarpeta())return;
  const previa=clasifDe('CLASIFICACION_RSIT');
  const d=await pedir('Clasificar según RSIT',[
    {id:'tipo',etiqueta:'Clasificación y ejemplo de incidente',tipo:'select',requerido:true,
     ancho:'grid-column:span 2',opciones:RSIT_PLANOS.map((x)=>x.etiqueta),
     valor:previa?previa.clase+' · '+previa.tipoIncidente:RSIT_PLANOS[0].etiqueta},
    {id:'motivo',etiqueta:'Justificación',tipo:'textarea',requerido:true,ancho:'grid-column:span 2',
     valor:previa?previa.motivo:'',pista:'Qué observado encaja con esa clase'}],
    'La RSIT clasifica la naturaleza del incidente por su intención. No tiene escalas de peligrosidad ni de impacto: para eso están los otros dos marcos.');
  if(!d)return;
  const t=RSIT_PLANOS.find((x)=>x.etiqueta===d.tipo);
  await anotar('CLASIFICACION_RSIT',{clase:t.clase,claseEs:t.claseEs,tipoIncidente:t.tipo,
    descripcion:t.desc,motivo:d.motivo});
};

/* ---------- NIST / CISA ---------- */
window.clasificarNist=async function(){
  if(!exigeCarpeta())return;
  const p=clasifDe('CLASIFICACION_NIST');
  const d=await pedir('Valorar según el esquema de CISA',[
    {id:'vector',etiqueta:'Vector de ataque',tipo:'select',requerido:true,
     opciones:NIST_VECTORES.map((x)=>x[0]),valor:p?p.vector:'Unknown'},
    {id:'ubicacion',etiqueta:'Ubicación de la actividad observada',tipo:'select',
     opciones:NIST_UBICACION,valor:p?p.ubicacion:'UNKNOWN'},
    {id:'funcional',etiqueta:'Impacto funcional',tipo:'select',requerido:true,ancho:'grid-column:span 2',
     opciones:NIST_FUNCIONAL.map((x)=>x[0]),valor:p?p.funcional:'NO IMPACT'},
    {id:'informacion',etiqueta:'Impacto en la información (puede ser más de uno)',tipo:'checks',
     ancho:'grid-column:span 2',opciones:NIST_INFORMACION.map((x)=>x[0]),valor:p?p.informacion:''},
    {id:'recuperacion',etiqueta:'Recuperabilidad',tipo:'select',requerido:true,
     opciones:NIST_RECUPERACION.map((x)=>x[0]),valor:p?p.recuperacion:'REGULAR'},
    {id:'sistemas',etiqueta:'Sistemas, registros y usuarios afectados',valor:p?p.sistemas:''},
    {id:'motivo',etiqueta:'Justificación',tipo:'textarea',requerido:true,ancho:'grid-column:span 2',
     valor:p?p.motivo:''}],
    'Este esquema no dice qué tipo de incidente es, sino cuánto repercute. Los niveles se toman de la guía de notificación de CISA, que mantiene la clasificación de la NIST SP 800-61 Rev. 2 pese a que esa revisión fue retirada en abril de 2025.');
  if(!d)return;
  await anotar('CLASIFICACION_NIST',{vector:d.vector,ubicacion:d.ubicacion,funcional:d.funcional,
    informacion:d.informacion,recuperacion:d.recuperacion,sistemas:d.sistemas,motivo:d.motivo});
};

function pintarMarcoRsit(){
  const c=clasifDe('CLASIFICACION_RSIT');
  let h=c?`<div class="rejilla">
      <div class="tarjeta"><h3>Clasificación vigente</h3><table><tbody>
        <tr><th style="width:170px">Classification</th><td>${esc(c.clase)} <span class="sub">· ${esc(c.claseEs||'')}</span></td></tr>
        <tr><th>Incident example</th><td>${esc(c.tipoIncidente)}</td></tr>
        <tr><th>Definición</th><td class="desenlace">${esc(c.descripcion||'')}</td></tr>
        <tr><th>Clasificado por</th><td>${esc(c.actor)} · ${fmtUTC(c.ts)}</td></tr>
      </tbody></table></div>
      <div class="tarjeta"><h3>Justificación</h3>
        <div class="desenlace">${esc(c.motivo)}</div></div></div>`
    :'<div class="vacio" style="margin-bottom:22px">Sin clasificar según RSIT.</div>';
  h+=`<div class="tarjeta"><h3>Taxonomía de referencia</h3>
    <table><thead><tr><th style="width:220px">Classification</th><th style="width:250px">Incident example</th>
    <th>Descripción</th></tr></thead><tbody>`+
    // La fila clasificada se resalta con una clase, no con un outline: el outline sobre un <tr>
    // dibujaba una línea que parecía un separador de grupo dentro de la clase.
    RSIT.flatMap(([cl,es,ts])=>ts.map((t,i)=>`<tr${c&&c.clase===cl&&c.tipoIncidente===t[0]?' class="fila-activa"':''}>
      ${i===0?`<th rowspan="${ts.length}">${esc(cl)}<div class="sub">${esc(es)}</div></th>`:''}
      <td>${esc(t[0])}</td><td class="desenlace">${esc(t[1])}</td></tr>`)).join('')+
    `</tbody></table></div>`;
  return h;
}

function pintarMarcoNist(){
  const c=clasifDe('CLASIFICACION_NIST');
  const nivel=(lista,v)=>lista.findIndex((x)=>x[0]===v);
  let h=c?`<div class="kpis">
      <div class="kpi"><div class="et">Vector de ataque</div><div class="num chico">${esc(c.vector)}</div>
        <div class="pie">${esc((NIST_VECTORES.find((x)=>x[0]===c.vector)||[])[1]||'')}</div></div>
      <div class="kpi ${nivel(NIST_FUNCIONAL,c.funcional)>=6?'alerta':nivel(NIST_FUNCIONAL,c.funcional)>=3?'atencion':''}">
        <div class="et">Impacto funcional</div><div class="num chico">${esc(c.funcional)}</div>
        <div class="pie">nivel ${nivel(NIST_FUNCIONAL,c.funcional)+1} de 8</div></div>
      <div class="kpi ${/CREDENTIAL|DESTRUCTION|CRITICAL/.test(c.informacion)?'alerta':c.informacion&&c.informacion!=='NO IMPACT'?'atencion':''}">
        <div class="et">Impacto en la información</div>
        <div class="num chico">${esc((c.informacion||'sin indicar').split(',')[0])}</div>
        <div class="pie">${(c.informacion||'').split(',').length>1?(c.informacion.split(',').length-1)+' categorías más':'&nbsp;'}</div></div>
      <div class="kpi ${c.recuperacion==='NOT RECOVERABLE'?'alerta':c.recuperacion==='EXTENDED'?'atencion':''}">
        <div class="et">Recuperabilidad</div><div class="num chico">${esc(c.recuperacion)}</div>
        <div class="pie">${esc((NIST_RECUPERACION.find((x)=>x[0]===c.recuperacion)||[])[1]||'')}</div></div>
    </div>
    <div class="rejilla">
      <div class="tarjeta"><h3>Detalle</h3><table><tbody>
        <tr><th style="width:210px">Ubicación observada</th><td>${esc(c.ubicacion||'UNKNOWN')}</td></tr>
        <tr><th>Impacto en la información</th><td class="desenlace">${esc(c.informacion||'sin indicar')}</td></tr>
        <tr><th>Sistemas afectados</th><td>${esc(c.sistemas||'sin indicar')}</td></tr>
        <tr><th>Valorado por</th><td>${esc(c.actor)} · ${fmtUTC(c.ts)}</td></tr>
      </tbody></table></div>
      <div class="tarjeta"><h3>Justificación</h3><div class="desenlace">${esc(c.motivo)}</div></div>
    </div>`
    :'<div class="vacio" style="margin-bottom:22px">Sin valorar según el esquema de CISA.</div>';

  const tabla=(t,lista,sel)=>`<div class="tarjeta" style="margin-bottom:20px"><h3>${t}</h3>
    <table><thead><tr><th style="width:330px">Nivel</th><th>Descripción</th></tr></thead><tbody>`+
    lista.map(([a,b])=>`<tr${sel&&String(sel).includes(a)?' class="fila-activa"':''}>
      <td class="mono">${esc(a)}</td><td class="desenlace">${esc(b)}</td></tr>`).join('')+
    `</tbody></table></div>`;
  h+=tabla('Vectores de ataque',NIST_VECTORES,c&&c.vector);
  h+=tabla('Impacto funcional',NIST_FUNCIONAL,c&&c.funcional);
  h+=tabla('Impacto en la información',NIST_INFORMACION,c&&c.informacion);
  h+=tabla('Recuperabilidad',NIST_RECUPERACION,c&&c.recuperacion);
  return h;
}

