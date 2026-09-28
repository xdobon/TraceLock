/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= plantillas por tipo de caso ================= */
const PLANTILLAS_BASE={
 'Compromiso de equipo':{
  hitos:[['Notificacion','Confirmar la alerta e identificar el equipo y su usuario habitual'],
   ['Contencion','Documentar el aislamiento de red del equipo y la conservación del estado'],
   ['Adquisicion de evidencias','Preservar memoria volátil antes de apagar o reiniciar'],
   ['Adquisicion de evidencias','Adquirir imagen del disco o triaje forense en caliente'],
   ['Analisis','Reconstruir la ejecución inicial y el mecanismo de persistencia'],
   ['Analisis','Revisar cuentas locales, credenciales cacheadas y movimiento lateral desde el equipo'],
   ['Analisis','Buscar los indicadores obtenidos en el resto del parque'],
   ['Erradicacion','Eliminar artefactos y persistencias, o reinstalar el equipo'],
   ['Recuperacion','Verificar ausencia de reinfección con monitorización reforzada'],
   ['Cierre','Documentar alcance, causa raíz y medidas']],
  preguntas:['¿Cuál es la primera actividad anómala observada en el equipo?',
   '¿Se preservó la memoria antes de aislar o apagar?',
   '¿Qué credenciales estaban presentes o cacheadas en el equipo?',
   '¿Hay indicios de movimiento lateral hacia otros sistemas?',
   '¿El equipo tenía acceso a recursos compartidos o a datos sensibles?']},
 'Exfiltración de información':{
  hitos:[['Notificacion','Confirmar el indicio de salida de información y su origen'],
   ['Contencion','Documentar el bloqueo del canal de salida y la revocación de accesos implicados'],
   ['Adquisicion de evidencias','Preservar registros de red, proxy, DLP y del servicio implicado'],
   ['Analisis','Determinar qué información salió, en qué volumen y en qué ventana temporal'],
   ['Analisis','Identificar el destino de la salida y si se conserva copia en el exterior'],
   ['Analisis','Clasificar la información afectada: personal, especialmente protegida o propietaria'],
   ['Notificaciones','Valorar con el DPD y con los responsables jurídicos las obligaciones de notificación'],
   ['Mitigacion','Documentar cambios de credenciales, secretos y claves comprometidos'],
   ['Cierre','Registrar alcance acreditado y alcance no descartable']],
  preguntas:['¿Qué evidencias acreditan la salida y cuáles solo la hacen posible?',
   '¿Qué volumen de información y de qué tipo se ha visto afectado?',
   '¿Contiene datos personales o especialmente protegidos?',
   '¿Cuánto tiempo estuvo abierto el canal de salida?',
   '¿La retención de registros cubre toda la ventana de exposición?',
   '¿Se ha solicitado la retirada de la copia en el destino?']},
 'Phishing':{
  hitos:[['Notificacion','Conservar el mensaje original y registrar su origen'],
   ['Analisis','Revisar identidad, autenticación, URLs y adjuntos'],
   ['Contencion','Determinar destinatarios, clics y credenciales expuestas'],
   ['Mitigacion','Documentar retirada del correo y bloqueo de indicadores confirmados'],
   ['Cierre','Verificar alcance y registrar conclusiones']],
  preguntas:['¿Qué destinatarios recibieron el mensaje?',
   '¿Se abrió un enlace, adjunto o QR?',
   '¿Se introdujeron credenciales o se aprobó una solicitud MFA?']},
 'Fraude por correo (BEC)':{
  hitos:[['Notificacion','Conservar la conversación y la solicitud de pago'],
   ['Analisis','Reconstruir cambios de interlocutor, Reply-To y datos de pago'],
   ['Contencion','Verificar la solicitud con el contacto por un canal conocido'],
   ['Analisis','Revisar accesos, reglas de buzón y reenvíos'],
   ['Cierre','Documentar alcance, acciones y resultado']],
  preguntas:['¿Se efectuó alguna transferencia o cambio de cuenta?',
   '¿Qué cuenta o identidad se suplantó?',
   '¿Hay reglas de reenvío o acceso ajeno al buzón?']},
 'Ransomware':{
  hitos:[['Notificacion','Inventariar activos afectados y preservar evidencias'],
   ['Contencion','Documentar aislamiento de sistemas afectados'],
   ['Analisis','Reconstruir acceso inicial y movimiento lateral'],
   ['Analisis','Evaluar indicios de exfiltración y alcance'],
   ['Recuperacion','Verificar restauración desde copias comprobadas'],
   ['Cierre','Registrar causa, controles y lecciones aprendidas']],
  preguntas:['¿Cuándo ocurrió la primera actividad observada?',
   '¿Existen copias recuperables y verificadas?',
   '¿Qué evidencias respaldan o descartan la exfiltración?']},
 'Cuenta comprometida':{
  hitos:[['Notificacion','Conservar alertas y registros de autenticación'],
   ['Contencion','Documentar revocación de sesiones y recuperación de acceso'],
   ['Analisis','Revisar MFA, aplicaciones consentidas, reglas y reenvíos'],
   ['Analisis','Identificar recursos accedidos y acciones realizadas'],
   ['Cierre','Verificar recuperación y registrar medidas']],
  preguntas:['¿Cuál es el último acceso legítimo conocido?',
   '¿Qué sesiones, tokens o aplicaciones conservaron acceso?',
   '¿Qué cuentas y datos quedaron afectados?']}
};

/* Los playbooks propios se guardan en esta pestaña (sessionStorage) y se suman a los que vienen de
   serie. Si uno personalizado usa el mismo nombre que uno base, lo sustituye. */
let PLANTILLAS=Object.assign({},PLANTILLAS_BASE);

function cargarPlaybooks(){
  PLANTILLAS=Object.assign({},PLANTILLAS_BASE);
  let propios=[];
  try{ propios=JSON.parse(almacenamiento.getItem('tl-playbooks')||'[]'); }catch(e){ propios=[]; }
  for(const p of propios){
    if(!p||!p.nombre||!Array.isArray(p.hitos))continue;
    PLANTILLAS[p.nombre]={hitos:p.hitos.filter((h)=>Array.isArray(h)&&h.length>=2),
      preguntas:Array.isArray(p.preguntas)?p.preguntas:[],propio:true,
      descripcion:p.descripcion||''};
  }
  return propios;
}
cargarPlaybooks();

window.aplicarPlantilla=async function(){
  if(!exigeCarpeta())return;
  const nombres=Object.keys(PLANTILLAS);
  const d=await pedir('Aplicar plantilla de caso',[
    {id:'tipo',etiqueta:'Tipo de caso',tipo:'select',opciones:nombres,valor:nombres[0],requerido:true},
    {id:'responsable',etiqueta:'Responsable de los hitos',valor:analista(),requerido:true}],
    'Se crean hitos pendientes y preguntas abiertas. No arranca ningún reloj ni ejecuta nada sobre sistemas externos: es una lista de trabajo, no un automatismo.');
  if(!d)return;
  if(EST.procedimientos.includes(d.tipo)){
    alert('La plantilla «'+d.tipo+'» ya está aplicada en este caso. Añade los hitos que falten a mano.');
    return;}
  const p=PLANTILLAS[d.tipo];
  await anotar('PROCEDIMIENTO_APLICADO',{nombre:d.tipo,hitos:p.hitos.length,preguntas:p.preguntas.length});
  for(const [fase,hito] of p.hitos)
    await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase,hito,
      propietario:d.responsable,riesgo:'Medio',notas:'Plantilla: '+d.tipo,iniciado:false});
  for(const q of p.preguntas)
    await anotar('PREGUNTA_ABIERTA',{id:idNuevo('P-','PREGUNTA_ABIERTA'),pregunta:q,
      dirigidaA:'',origen:'Plantilla: '+d.tipo});
  alert('Plantilla «'+d.tipo+'» aplicada: '+p.hitos.length+' hitos pendientes y '+
    p.preguntas.length+' preguntas abiertas.');
};

