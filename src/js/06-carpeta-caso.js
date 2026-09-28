/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= carpeta del caso ================= */
/* ---------- memoria del último caso abierto ----------
   El identificador de la carpeta solo puede guardarse en IndexedDB: es un objeto del
   navegador, no una ruta, y no sobrevive a JSON. Al recargar, el permiso vuelve a
   'prompt' y el navegador exige un gesto del usuario para restituirlo, así que la
   reanudación es un clic, no un automatismo. */
const BD_NOMBRE='tracelock', BD_ALMACEN='carpetas';
const CLAVE_HANDLE='ultimo', CLAVE_PREF='reanudar-activo';

/* Persistir el handle es lo único que permite reanudar el caso con un solo clic tras
   recargar. Tiene un coste: bajo file:// varios navegadores comparten IndexedDB entre
   documentos locales, así que otro HTML abierto desde el mismo equipo podría leer el
   handle y, con ello, el nombre de la carpeta del caso. El acceso real seguiría
   necesitando que el usuario acepte un diálogo de permiso del navegador, pero la fuga
   del nombre y la posibilidad de provocar ese diálogo son reales.
   Por eso queda DESACTIVADO por defecto y es el analista quien lo habilita en Ajustes.
   Ver THREAT_MODEL.md. */
function abrirBD(){
  return new Promise((res,rej)=>{
    let p; try{p=indexedDB.open(BD_NOMBRE,1);}catch(e){return rej(e);}
    p.onupgradeneeded=()=>{if(!p.result.objectStoreNames.contains(BD_ALMACEN))p.result.createObjectStore(BD_ALMACEN);};
    p.onsuccess=()=>res(p.result);
    p.onerror=()=>rej(p.error||new Error('IndexedDB no disponible'));
  });
}
function bdOperar(modo,fn){
  return abrirBD().then((db)=>new Promise((res,rej)=>{
    const tx=db.transaction(BD_ALMACEN,modo), st=tx.objectStore(BD_ALMACEN);
    let salida; try{salida=fn(st);}catch(e){db.close();return rej(e);}
    tx.oncomplete=()=>{db.close();res(salida&&typeof salida==='object'&&'result' in salida?salida.result:salida);};
    tx.onerror=()=>{db.close();rej(tx.error);};
  })).catch((e)=>{console.warn('IndexedDB: '+(e&&e.message?e.message:e));return null;});
}

const reanudarActivo=async()=>(await bdOperar('readonly',(st)=>st.get(CLAVE_PREF)))===true;
const fijarReanudarActivo=async(v)=>{
  await bdOperar('readwrite',(st)=>{st.put(!!v,CLAVE_PREF);if(!v)st.delete(CLAVE_HANDLE);});
};
const recordarCaso=async(handle)=>{
  if(!handle||!await reanudarActivo())return;
  await bdOperar('readwrite',(st)=>st.put(handle,CLAVE_HANDLE));
};
const casoRecordado=async()=>{
  if(!await reanudarActivo())return null;
  const h=await bdOperar('readonly',(st)=>st.get(CLAVE_HANDLE));
  return (h&&typeof h.queryPermission==='function')?h:null;
};
const olvidarCaso=async()=>{await bdOperar('readwrite',(st)=>st.delete(CLAVE_HANDLE));};

/* ---------- preferencia de reanudación (Ajustes) ---------- */
reanudarActivo().then((v)=>{$('#aj-reanudar').checked=v;});

$('#aj-reanudar').onchange=async(e)=>{
  const activo=e.target.checked;
  await fijarReanudarActivo(activo);
  // Si se activa con un caso ya abierto, se recuerda ese mismo: si no, habría que
  // cerrarlo y volver a abrirlo para que la opción surtiera efecto.
  if(activo&&dirCaso)await recordarCaso(dirCaso);
  alert(activo
    ? 'Activado. Al recargar la página verás «Reanudar '+(dirCaso?dirCaso.name:'el último caso')+'» '+
      'y bastará un clic: el navegador pedirá permiso sobre esa carpeta, pero no tendrás que buscarla.'
    : 'Desactivado. Se ha borrado la carpeta recordada de este navegador.');
};

$('#aj-olvidar-carpeta').onclick=async()=>{
  await olvidarCaso();
  almacenamiento.removeItem('tl-ultimo-caso');
  $('#p-reanudar').classList.add('oculto');
  alert('Se ha olvidado la carpeta recordada.');
};

window.olvidarUltimoCaso=async()=>{
  await olvidarCaso();
  almacenamiento.removeItem('tl-ultimo-caso');
  $('#p-reanudar').classList.add('oculto');
  $('#portada-olvidar').innerHTML='';
};

async function proponerReanudar(){
  const nombre=almacenamiento.getItem('tl-ultimo-caso');
  const handle=await casoRecordado();
  if(!nombre&&!handle)return;
  const caja=$('#p-reanudar');
  $('#p-reanudar-nombre').textContent=(handle&&handle.name)||nombre||'el último caso';
  if(handle){
    let permiso='prompt';
    try{ permiso=await handle.queryPermission({mode:'readwrite'}); }catch(e){}
    if(permiso==='granted'){
      $('#p-reanudar-pie').textContent='El permiso sobre la carpeta sigue vigente. Se abre directamente.';
      caja.onclick=()=>reanudar(handle);
      caja.classList.remove('oculto');
      // con el permiso ya concedido no hace falta molestar al analista
      reanudar(handle);
      return;
    }
    $('#p-reanudar-pie').textContent='Pulsa para volver a abrirlo. El navegador pedirá de nuevo permiso '+
      'sobre la carpeta: por seguridad no lo conserva entre recargas, pero no tendrás que buscarla.';
    caja.onclick=()=>reanudar(handle);
  }else{
    $('#p-reanudar-pie').textContent=await reanudarActivo()
      ? 'No se ha podido recuperar la carpeta recordada, solo su nombre. Pulsa para abrir el '+
        'selector y elegirla de nuevo.'
      : 'Solo se recuerda el nombre. Para reanudar con un clic sin volver a buscar la carpeta, '+
        'activa «Recordar la carpeta del caso» en Ajustes. Pulsa para abrir el selector.';
    caja.onclick=()=>$('#p-abrir').click();
  }
  caja.classList.remove('oculto');
  $('#portada-olvidar').innerHTML=
    '<button onclick="olvidarUltimoCaso()">Olvidar este caso y no volver a proponerlo</button>';
}

/* Quién trabaja en el caso: se pide al abrir un caso existente (al crear uno ya va en el
   formulario). Cada asiento del registro lleva este nombre como autor, así que no puede quedar
   vacío. Propone el último usado en esta pestaña. */
async function identificarAnalista(){
  const d=await pedir('¿Quién trabaja en el caso?',[
    {id:'analista',etiqueta:'Analista',valor:almacenamiento.getItem('ir-analista')||'',requerido:true,
     pista:'Nombre y apellidos',
     lista:(typeof DATOS!=='undefined'&&Array.isArray(DATOS.analistas))?DATOS.analistas:[]}],
    'Tu nombre figura como autor de cada acción que se anota en el registro del caso.');
  if(!d)return false;
  $('#analista').value=d.analista.trim();
  almacenamiento.setItem('ir-analista',d.analista.trim());
  if(typeof pintarUsuario==='function')pintarUsuario();
  return true;
}

async function reanudar(handle){
  try{
    let permiso=await handle.queryPermission({mode:'readwrite'});
    if(permiso!=='granted')permiso=await handle.requestPermission({mode:'readwrite'});
    if(permiso!=='granted'){
      alert('No se ha concedido permiso sobre la carpeta, así que el caso no puede reanudarse.');
      return;
    }
    await handle.getFileHandle('registro.jsonl');
    if(!await identificarAnalista())return;
    await engancharCaso(handle);
  }catch(e){
    if(e.name==='NotFoundError'){
      alert('La carpeta recordada ya no contiene un caso: puede haberse movido, renombrado o borrado.\n\n'+
        'Ábrelo a mano desde «Abrir un caso».');
      await window.olvidarUltimoCaso();
    }else if(e.name!=='AbortError')alert('No se ha podido reanudar el caso: '+e.message);
  }
}

async function engancharCaso(handle){
  dirCaso=handle;
  dirEv=await dirCaso.getDirectoryHandle('evidencias',{create:true});
  hRegistro=await dirCaso.getFileHandle('registro.jsonl',{create:true});
  await cargarRegistro();
  await cargarDatosBase();
  $('#carpeta').textContent='Carpeta: '+dirCaso.name+'/';
  $('#caso-actual').textContent=dirCaso.name;
  $('#portada').classList.add('oculto');
  almacenamiento.setItem('tl-ultimo-caso',handle.name);
  await recordarCaso(handle);
  refrescar();
  verificacionAutomatica();
}

$('#abrir').onclick=()=>$('#portada').classList.remove('oculto');

$('#p-abrir').onclick=async()=>{
  if(!SOPORTA_FSA){alert('Este navegador no permite escribir en una carpeta local. Usa Chrome o Edge.');return;}
  let h;
  try{ h=await window.showDirectoryPicker({mode:'readwrite',id:'tl-caso'}); }
  catch(e){ if(e.name!=='AbortError')alert('No se pudo abrir la carpeta: '+e.message); return; }
  let tieneRegistro=false;
  try{ await h.getFileHandle('registro.jsonl'); tieneRegistro=true; }catch(e){}
  if(!tieneRegistro&&!confirm('La carpeta «'+h.name+'» no contiene ningún caso: no hay registro.jsonl.\n\n'+
      '¿Quieres usarla igualmente y empezar un caso en ella?'))return;
  if(!await identificarAnalista())return;
  try{
    await engancharCaso(h);
    if(!ASIENTOS.length)await anotar('CASO_ABIERTO',{carpeta:h.name});
  }catch(e){alert('No se pudo abrir el caso: '+e.message);}
};

$('#p-crear').onclick=async()=>{
  if(!SOPORTA_FSA){alert('Este navegador no permite escribir en una carpeta local. Usa Chrome o Edge.');return;}
  // el selector exige un gesto reciente del usuario, asi que va antes de los formularios
  let padre;
  try{ padre=await window.showDirectoryPicker({mode:'readwrite',id:'tl-padre'}); }
  catch(e){ if(e.name!=='AbortError')alert('No se pudo abrir la carpeta: '+e.message); return; }

  const ahora=new Date();
  const local=new Date(ahora.getTime()-ahora.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const uno=await pedir('Crear caso · datos del incidente',[
    {id:'nombre',etiqueta:'Nombre o referencia del caso',requerido:true,
     pista:'TICKET-12345, INC-2026-014…'},
    {id:'analista',etiqueta:'Analista que abre el caso',requerido:true,valor:analista()},
    {id:'cliente',etiqueta:'Entidad afectada',
     lista:DATOS.clientes.map((c)=>c.nombre||c),
     pista:'Escribe el nombre o elige de la lista'},
    {id:'tlp',etiqueta:'Marcado TLP del caso',tipo:'select',
     opciones:['TLP:AMBER+STRICT','TLP:AMBER','TLP:GREEN','TLP:CLEAR','TLP:RED'],valor:'TLP:AMBER'},
    {id:'deteccion',etiqueta:'Fecha y hora de detección',tipo:'datetime-local',valor:local,requerido:true},
    {id:'descripcion',etiqueta:'Motivo de apertura',tipo:'textarea',requerido:true,
     ancho:'grid-column:span 2',pista:'Qué se ha observado y quién lo comunica'}],
    'La carpeta se creará dentro de «'+padre.name+'». La fecha de detección es la que se usará para '+
    'calcular el plazo de cierre, no la de creación del caso.');
  if(!uno)return;

  const dos=await pedir('Crear caso · clasificación y plantilla',[
    {id:'tipo',etiqueta:'Tipo de ciberincidente (CCN-STIC 817)',tipo:'select',ancho:'grid-column:span 2',
     opciones:['Sin clasificar todavía'].concat(TIPOS_PLANOS.map((t)=>t.etiqueta))},
    {id:'categoria',etiqueta:'Categoría ENS más alta afectada',tipo:'select',
     opciones:['Sin determinar','BÁSICA','MEDIA','ALTA']},
    {id:'equipos',etiqueta:'Equipos afectados conocidos',tipo:'number',valor:'0'},
    {id:'esfuerzo',etiqueta:'Esfuerzo estimado de resolución',tipo:'select',
     opciones:['menos de 1 jornada-persona','entre 1 y 10 jornadas-persona',
       'entre 10 y 20 jornadas-persona','entre 20 y 50 jornadas-persona','más de 50 jornadas-persona']},
    {id:'plantilla',etiqueta:'Plantilla de trabajo',tipo:'select',
     opciones:['Ninguna'].concat(Object.keys(PLANTILLAS))}],
    'Una jornada-persona equivale a una jornada de trabajo ininterrumpido de un trabajador medio, que es '+
    'la unidad con la que la guía gradúa el impacto. La clasificación que se guarde ahora queda marcada '+
    'como provisional: se asignan los niveles que sugiere la guía, sin justificar. Complétala en la '+
    'pestaña Clasificación antes de cerrar el caso.');
  if(!dos)return;

  const slug=uno.nombre.replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'-').slice(0,60)||'caso';
  let carpeta;
  try{
    carpeta=await padre.getDirectoryHandle(slug,{create:true});
    let ocupada=false;
    try{ await carpeta.getFileHandle('registro.jsonl'); ocupada=true; }catch(e){}
    if(ocupada){alert('Ya existe un caso en «'+slug+'». Ábrelo desde la portada en lugar de crearlo.');return;}
    await engancharCaso(carpeta);
  }catch(e){alert('No se pudo crear la carpeta del caso: '+e.message);return;}

  almacenamiento.setItem('ir-analista',uno.analista);
  $('#analista').value=uno.analista;

  const caseId='CASE-'+sha256Texto(slug+'|'+Date.now()+'|'+Math.random()).slice(0,20);
  await anotar('CASO_ABIERTO',{caseId,carpeta:slug,nombre:uno.nombre,tlp:uno.tlp,
    deteccion:new Date(uno.deteccion).toISOString(),descripcion:uno.descripcion,
    version:VERSION,schema:SCHEMA,host:navigator.userAgent.slice(0,120)});
  if(uno.cliente){
    $('#cliente').value=uno.cliente;
    almacenamiento.setItem('ir-cliente',uno.cliente);
    await anotar('CASO_CLIENTE',{cliente:uno.cliente});
  }
  if(dos.tipo&&dos.tipo!=='Sin clasificar todavía'){
    const t=TIPOS_PLANOS.find((x)=>x.etiqueta===dos.tipo);
    const si=impactoSugerido(dos.categoria,dos.equipos,dos.esfuerzo);
    await anotar('CLASIFICACION_CCN',{clase:t.clase,tipoIncidente:t.tipo,
      peligrosidadSugerida:t.sug,peligrosidad:t.sug,
      motivoPeligrosidad:'Provisional: nivel sugerido por la guía en la apertura del caso, pendiente de justificar.',
      impactoSugerido:si,impacto:si,
      motivoImpacto:'Provisional: nivel deducido de la categoría, los equipos afectados y el esfuerzo estimado, pendiente de justificar.',
      origen:'Sin determinar',categoria:dos.categoria,equipos:dos.equipos,esfuerzo:dos.esfuerzo,
      dimensiones:'',provisional:true,revision:'clasificación provisional en la apertura'});
  }
  if(dos.plantilla&&dos.plantilla!=='Ninguna'){
    const p=PLANTILLAS[dos.plantilla];
    await anotar('PROCEDIMIENTO_APLICADO',{nombre:dos.plantilla,hitos:p.hitos.length,preguntas:p.preguntas.length});
    for(const [fase,hito] of p.hitos)
      await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase,hito,
        propietario:uno.analista,riesgo:'Medio',notas:'Plantilla: '+dos.plantilla,iniciado:false});
    for(const q of p.preguntas)
      await anotar('PREGUNTA_ABIERTA',{id:idNuevo('P-','PREGUNTA_ABIERTA'),pregunta:q,dirigidaA:''});
  }
  alert('Caso «'+uno.nombre+'» creado en '+padre.name+'/'+slug+'.\n\n'+
    'Recuerda dejar cada evidencia en solo lectura justo después de darla de alta: en Evidencias, '+
    'tarjeta «Dejar las evidencias en solo lectura».');
};

