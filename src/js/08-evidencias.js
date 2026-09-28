/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= evidencias ================= */
const zona=$('#zona');
zona.onclick=()=>$('#fichero').click();
zona.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#fichero').click();}};
zona.ondragover=(e)=>{e.preventDefault();zona.classList.add('activa');};
zona.ondragleave=()=>zona.classList.remove('activa');
zona.ondrop=(e)=>{e.preventDefault();zona.classList.remove('activa');evSeleccionar([...e.dataTransfer.files]);};
$('#fichero').onchange=(e)=>{evSeleccionar([...e.target.files]);e.target.value='';};

/* ---------- selección pendiente de alta ----------
   Soltar o elegir ficheros ya no los da de alta: quedan en la lista del formulario hasta pulsar
   «Añadir», para poder revisar antes los datos de adquisición. El alta en sí (procesar) no cambia. */
let EV_PENDIENTES=[];
function evSeleccionar(fs){
  for(const f of fs)
    if(!EV_PENDIENTES.some((x)=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified))
      EV_PENDIENTES.push(f);
  pintarEvSeleccion();
}
function pintarEvSeleccion(){
  $('#ev-seleccion').innerHTML=EV_PENDIENTES.map((f,i)=>`<span class="chip-fichero">${esc(f.name)}
    <i>${bytesTxt(f.size)}</i><button type="button" onclick="evQuitarSeleccion(${i})"
      aria-label="Quitar ${esc(f.name)}" title="Quitar">${icono('close')}</button></span>`).join('');
}
window.evQuitarSeleccion=(i)=>{EV_PENDIENTES.splice(i,1);pintarEvSeleccion();};
$('#ev-add').onclick=async()=>{
  if(!EV_PENDIENTES.length){
    alert('Arrastra o selecciona al menos un fichero en «Evidencia».');zona.focus();return;}
  const lista=EV_PENDIENTES.slice();
  $('#ev-add').disabled=true;
  try{ if(await procesar(lista)){EV_PENDIENTES=[];pintarEvSeleccion();cerrarForm('ev-form');} }
  finally{ $('#ev-add').disabled=false; }
};
$('#ev-cancelar').onclick=()=>{EV_PENDIENTES=[];pintarEvSeleccion();cerrarForm('ev-form');};

const TROZO=4*1024*1024;

async function hashearFichero(f,alDestino,onProg){
  const h=new Sha256(), m=new Md5();let off=0;
  while(off<f.size){
    const buf=new Uint8Array(await f.slice(off,off+TROZO).arrayBuffer());
    h.update(buf);m.update(buf);
    if(alDestino)await alDestino.write(buf);
    off+=TROZO;
    if(onProg)onProg(Math.min(off,f.size)/f.size);
  }
  return {sha256:h.hex(),md5:m.hex()};
}

const sanear=(n)=>String(n).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/^\.+/,'_').slice(0,180)||'sin_nombre';

/* Campos que TraceLock no puede deducir leyendo el propio fichero: sin ellos no se
   da de alta la evidencia. (El resto — hash, tamaño, tipo, fecha de modificación —
   se calcula solo y no se pide.) */
const CAMPOS_ADQ_OBLIGATORIOS=[
  ['ev-origen','Origen de la evidencia'],
  ['ev-metodo','Método de adquisición'],
  ['ev-adquirida-por','Adquirida por'],
  ['ev-equipo','Equipo o soporte'],
  ['ev-ubicacion','Ubicación'],
];
// El asterisco sale de esta misma lista: lo que se marca y lo que se exige no pueden divergir.
CAMPOS_ADQ_OBLIGATORIOS.forEach(([id])=>marcarObligatorio(id));
marcarObligatorio('tr-a');marcarObligatorio('tr-motivo');

// Separada de validarDatosAdquisicion() para poder probar la lógica de bloqueo
// sin disparar alert()/focus() — eso permite cubrirla en las autopruebas sin
// depender de que algo cierre un diálogo nativo.
function campoAdquisicionFaltante(){
  for(const par of CAMPOS_ADQ_OBLIGATORIOS){
    if(!$('#'+par[0]).value.trim())return par;
  }
  return null;
}

function validarDatosAdquisicion(){
  const falta=campoAdquisicionFaltante();
  if(falta){
    alert('Falta «'+falta[1]+'». Es un dato que TraceLock no puede deducir del fichero, '+
      'así que hace falta indicarlo antes de dar de alta la evidencia.');
    $('#'+falta[0]).focus();
    return false;
  }
  return true;
}

async function procesar(ficheros){
  if(!exigeCarpeta())return false;
  if(!ficheros.length)return false;
  if(!validarDatosAdquisicion())return false;
  if(!await puertaProteccion())return false;
  const barra=$('#progreso');
  for(const f of ficheros){
    barra.style.display='block';
    try{
      const okSync=await sincronizar(true);
      if(okSync!==true)throw new Error('No se ha podido sincronizar el caso antes de incorporar la evidencia.');
      let id=idNuevo('EV-','EVIDENCIA_REGISTRADA');
      let archivo=id+'__'+sanear(f.name),archivoOriginal=archivo;
      let dirOriginales=dirEv;
      if(dirEv){
        dirOriginales=await dirEv.getDirectoryHandle('originales',{create:true});
        for(let i=0;i<50;i++){
          let ocupado=false;
          try{ await dirOriginales.getFileHandle(archivo); ocupado=true; }catch(e){}
          if(!ocupado)break;
          id='EV-'+String(parseInt(id.slice(3),10)+1).padStart(4,'0');
          archivo=id+'__'+sanear(f.name);
        }
        archivoOriginal='originales/'+archivo;
      }
      let w=null,destino=null;
      if(dirOriginales){destino=await dirOriginales.getFileHandle(archivo,{create:true});w=await destino.createWritable();}
      const huellas=await hashearFichero(f,w,(p)=>{barra.firstElementChild.style.width=(p*100)+'%';});
      if(w)await w.close();
      const mtimeCopia=destino?(await destino.getFile()).lastModified:null;
      const digest=huellas.sha256;
      const dup=EST.ev.find((e)=>e.sha256===digest);
      const hashOrigen=$('#ev-hash-origen').value.trim().toLowerCase().replace(/[^0-9a-f]/g,'');
      const coincideOrigen=hashOrigen?(hashOrigen===digest):null;
      const adqEl=$('#ev-adquirida-el').value;
      await anotar('EVIDENCIA_REGISTRADA',{id,nombre:f.name,archivo:dirEv?archivoOriginal:null,
        originalHash:digest,originalBytes:f.size,bytes:f.size,sha256:digest,md5:huellas.md5,tipoMime:f.type||'',
        workingArchivo:null,workingHash:null,workingBytes:null,
        modificadoOrigen:new Date(f.lastModified).toISOString(),
        custodio:analista(),origen:$('#ev-origen').value.trim(),metodo:$('#ev-metodo').value.trim(),
        adquiridaPor:$('#ev-adquirida-por').value.trim(),
        // Si no se indica, se toma el momento del alta: es lo único que TraceLock
        // puede determinar por sí mismo sobre "cuándo", así que sirve de valor por
        // defecto razonable, pero no sustituye a una fecha real de adquisición si se conoce.
        adquiridaEl:adqEl?new Date(adqEl).toISOString():new Date().toISOString(),
        adquiridaElAuto:!adqEl,
        testigo:$('#ev-testigo').value.trim(),
        equipo:$('#ev-equipo').value.trim(),serie:$('#ev-serie').value.trim(),
        usuarioEquipo:$('#ev-usuario').value.trim(),ubicacion:$('#ev-ubicacion').value.trim(),
        estadoSistema:$('#ev-estado-sistema').value,
        hashOrigen:hashOrigen||null,coincideOrigen,
        copiado:!!dirEv,duplicadoDe:dup?dup.id:null,mtimeCopia});
      /* Antes se anotaba aquí una «verificación de incorporación» que comparaba la huella consigo
         misma (sha256Actual y sha256Registrado eran el mismo valor), así que toda evidencia nueva
         salía como «Verificada» sin que nadie hubiera vuelto a leer el fichero. Se quita: una
         evidencia recién dada de alta queda «Sin verificar» hasta la primera verificación real
         (manual con «Verificar», o la automática al abrir el caso), que relee la copia del disco. */
      // La copia de trabajo se crea aquí mismo, no solo cuando se abre un análisis
      // concreto (correo, etc.): así el original queda intacto en evidencias/originales/
      // y evidencias/trabajo/ existe desde el alta, no solo para los tipos de fichero
      // que tienen un analizador dedicado.
      if(dirEv){
        try{
          const eRecien=EST.ev.find((x)=>x.id===id);
          if(eRecien)await asegurarCopiaTrabajo(eRecien);
        }catch(errCopia){
          console.warn('No se ha podido crear la copia de trabajo de '+id+': '+errCopia.message);
          alert('La evidencia '+id+' se ha dado de alta correctamente, pero no se ha podido crear '+
            'su copia de trabajo: '+errCopia.message+'\n\nEl original está a salvo en evidencias/originales/; '+
            'puedes reintentar la copia más tarde.');
        }
      }
      if(coincideOrigen===false)
        alert('ATENCIÓN en '+f.name+':\n\nLa huella declarada en origen no coincide con la calculada.\n\n'+
          'Declarada: '+hashOrigen+'\nCalculada: '+digest+'\n\n'+
          'El alta queda registrada con la discrepancia anotada. No borres nada: documenta por qué difiere.');
    }catch(e){alert('No se pudo registrar '+f.name+': '+e.message);}
    barra.style.display='none';barra.firstElementChild.style.width='0';
  }
  return true;
}

/* ---------- aviso de protección de solo lectura pendiente ----------
   attrib/chmod no se puede aplicar desde el navegador (limitación de la File
   System Access API, no de TraceLock), así que la protección es un paso manual
   fuera de la app. Lo que sí puede hacer TraceLock es no dejar que pase
   desapercibido: cada alta nueva deja el caso "sin proteger" hasta que el
   analista confirma que ha aplicado el comando, y esa confirmación queda
   anotada como cualquier otro evento — autodeclarada, igual que el resto del
   modelo de confianza (ver THREAT_MODEL.md). */
function pintarAvisoProteccion(){
  const c=$('#aviso-proteccion');
  const pend=(EST.proteccion&&EST.proteccion.sinProteger)||[];
  if(!dirEv||!pend.length){c.classList.add('oculto');c.innerHTML='';return;}
  // Si el analista lo ha cerrado, no vuelve hasta que cambie la lista de pendientes.
  const clave='proteccion:'+pend.map((e)=>e.id).join(',');
  if(AVISOS_CERRADOS.has(clave)){c.classList.add('oculto');c.innerHTML='';return;}
  c.className='aviso rojo';c.dataset.aviso=clave;
  c.innerHTML='<b class="aviso-tit">'+pend.length+(pend.length===1?' evidencia':' evidencias')+' sin proteger en disco.</b>'+
    '<div class="aviso-txt">'+esc(pend.map((e)=>e.id).join(', '))+
    '. El navegador no puede aplicar el atributo de solo lectura: baja hasta '+
    '«Dejar las evidencias en solo lectura», aplícalo desde el Explorador o con el comando y confírmalo con el botón '+
    'correspondiente.</div>';
}

const METODOS_PROTECCION=['Explorador de Windows: Propiedades, Solo lectura','Comando attrib (Windows)',
  'Comando chmod (Linux/macOS)','Script proteger.cmd o proteger.sh'];
// Evidencias copiadas a la carpeta que siguen sin proteger. Las que no se copiaron (modo
// reducido) no tienen fichero que proteger y no deben bloquear nada.
const pendientesDeProteger=()=>((EST.proteccion&&EST.proteccion.sinProteger)||[]).filter((e)=>e.copiado);

async function confirmarProteccion(desdePuerta){
  if(!exigeCarpeta())return false;
  const pend=pendientesDeProteger();
  if(!pend.length){alert('No hay evidencias pendientes de proteger.');return false;}
  // Se anota CÓMO se aplicó: el acta de evidencias debe reflejar el método real, no uno supuesto.
  const d=await pedir('Anotar la protección de las evidencias',[
    {id:'metodo',etiqueta:'Cómo se ha aplicado',tipo:'select',requerido:true,
     opciones:METODOS_PROTECCION,valor:METODOS_PROTECCION[0],ancho:'grid-column:span 2'}],
    'Confírmalo solo si ya lo has aplicado: se anota en el registro que las evidencias dadas de alta hasta '+
    'ahora quedan en solo lectura. La protección no se hereda a los ficheros que se añadan después.');
  if(!d)return false;
  const hastaSeq=Math.max(...EST.ev.map((e)=>e.seq));
  await anotar('EVIDENCIAS_PROTEGIDAS',{metodo:d.metodo,hastaSeq,confirmadoPor:analista()});
  if(!desdePuerta)alert('Anotado. Recuerda: si añades evidencia nueva, vuelve a aplicar la protección y a confirmarla — '+
    'la protección no se hereda automáticamente a los ficheros que se añadan después.');
  return true;
}
$('#confirmar-proteccion').onclick=()=>confirmarProteccion(false);

/* Puerta antes de cada alta. TraceLock no puede leer el atributo de solo lectura desde el
   navegador, así que no «valida» nada: obliga a decidir y deja constancia de la decisión.
   Hay una salida justificada a propósito: sin ella, un entorno donde no se puede aplicar la
   protección bloquearía el caso entero, y la única forma de avanzar sería confirmar algo
   falso — que es peor que un pendiente declarado. */
const DECISIONES_PUERTA=['Ya la he aplicado: anotarlo y continuar',
  'No se puede aplicar ahora: continuar dejando constancia'];
async function puertaProteccion(){
  if(!dirEv)return true;
  const pend=pendientesDeProteger();
  if(!pend.length)return true;
  const ids=pend.slice(0,10).map((e)=>e.id).join(', ')+(pend.length>10?' y '+(pend.length-10)+' más':'');
  const d=await pedir('Hay evidencias sin proteger',[
    {id:'decision',etiqueta:'Antes de dar de alta más evidencias',tipo:'select',requerido:true,
     opciones:DECISIONES_PUERTA,valor:DECISIONES_PUERTA[0],ancho:'grid-column:span 2'}],
    ids+(pend.length===1?' sigue':' siguen')+' en lectura/escritura. Aplica la protección desde el Explorador o con el comando antes de '+
    'continuar; si necesitas ver las instrucciones, cancela y baja a «Dejar las evidencias en solo lectura». '+
    'TraceLock no puede comprobar el atributo: lo que elijas queda anotado en el registro con tu nombre.');
  if(!d)return false;
  if(d.decision===DECISIONES_PUERTA[0])return await confirmarProteccion(true);
  const m=await pedir('Continuar sin proteger',[
    {id:'motivo',etiqueta:'Por qué no se puede aplicar ahora',tipo:'textarea',requerido:true,
     pista:'Unidad de red que no admite el atributo, equipo sin acceso a las propiedades…',
     ancho:'grid-column:span 2'}],
    'Se anota en el registro que '+ids+(pend.length===1?' sigue':' siguen')+' sin proteger y por qué. No se dan por protegidas: '+
    'el aviso volverá en la próxima alta y constará en la preparación para el cierre.');
  if(!m)return false;
  await anotar('PROTECCION_APLAZADA',{pendientes:pend.map((e)=>e.id),motivo:m.motivo});
  return true;
}

let trActual=null;
window.transferirEv=function(id){
  if(!exigeCarpeta())return;
  const e=EST.ev.find((x)=>x.id===id);
  trActual=id;
  $('#tr-evidencia').textContent=e.id+' · '+e.nombre;
  $('#tr-de').value=e.custodioActual||e.custodio;
  $('#tr-a').value='';$('#tr-motivo').value='';$('#tr-obs').value='';$('#tr-hash').value='';
  $('#modal-tr').classList.remove('oculto');
  $('#tr-a').focus();
};
$('#tr-cancelar').onclick=()=>$('#modal-tr').classList.add('oculto');
$('#tr-cerrar').onclick=()=>$('#tr-cancelar').onclick();
$('#modal-tr').onclick=(ev)=>{if(ev.target===$('#modal-tr'))$('#modal-tr').classList.add('oculto');};
$('#tr-guardar').onclick=async()=>{
  const destino=$('#tr-a').value.trim(), motivo=$('#tr-motivo').value.trim();
  if(!destino){alert('Indica quién recibe la evidencia.');$('#tr-a').focus();return;}
  if(!motivo){alert('El motivo de la transferencia es obligatorio: es lo que da sentido al asiento.');
    $('#tr-motivo').focus();return;}
  const e=EST.ev.find((x)=>x.id===trActual);
  await anotar('EVIDENCIA_TRANSFERIDA',{id:trActual,origen:e.custodioActual||e.custodio,destino,
    medio:$('#tr-medio').value,motivo,
    hashCopia:$('#tr-hash').value.trim().toLowerCase().replace(/[^0-9a-f]/g,'')||null,
    observaciones:$('#tr-obs').value.trim()});
  $('#modal-tr').classList.add('oculto');
};

window.verificarEv=async function(id){
  const e=EST.ev.find((x)=>x.id===id);
  if(!dirEv||!e.copiado){alert('Esta evidencia no se copió a la carpeta, no hay nada que reverificar.');return;}
  const barra=$('#progreso');
  let digest;
  // Paso 1: leer y hashear. Un fichero en solo lectura se lee sin problema.
  try{
    const f=await (await resolverFichero(dirEv,e.archivo)).getFile();
    barra.style.display='block';
    let hechos=0;
    digest=await sha256Fichero(f,(n)=>{hechos+=n;barra.firstElementChild.style.width=(hechos/f.size*100)+'%';});
  }catch(err){
    alert('No se ha podido leer la evidencia '+id+'.\n\n'+explicarError(err,'evidencias/'+e.archivo));
    return;
  }finally{
    barra.style.display='none';barra.firstElementChild.style.width='0';
  }
  const coincide=digest===e.sha256;
  // Paso 2: anotar el resultado. Si esto falla, el resultado ya está calculado
  // y se muestra igualmente: la verificación no se pierde por un problema de escritura.
  try{
    await anotar('EVIDENCIA_VERIFICADA',{id,sha256Actual:digest,sha256Registrado:e.sha256,coincide});
  }catch(err){
    alert('La evidencia '+id+' '+(coincide?'SÍ coincide':'NO coincide')+' con la huella del alta.\n\n'+
      'SHA-256 actual: '+digest+'\n\nPero el resultado no ha podido anotarse en el registro:\n'+err.message);
    return;
  }
  alert(coincide
    ? 'Evidencia '+id+': la huella coincide con la del alta. Verificación anotada en el registro.'
    : 'Evidencia '+id+': la huella NO coincide con la del alta. El fichero almacenado ha cambiado.\n\n'+
      'Registrada: '+e.sha256+'\nActual: '+digest);
};

window.verCadenaCustodia=function(id){
  const e=EST.ev.find((x)=>x.id===id); if(!e)return;
  $('#custodia-evidencia').textContent=e.id+' · '+e.nombre;
  const eventos=ASIENTOS.filter((a)=>{const d=a.datos||{};return d.id===id&&['EVIDENCIA_REGISTRADA','EVIDENCIA_VERIFICADA','EVIDENCIA_TRANSFERIDA','EVIDENCIA_TRABAJO_CREADO','EVIDENCIA_ARCHIVADA'].includes(a.tipo);});
  const v=e.verif&&e.verif.length?e.verif.at(-1):null;
  let h=`<div class="custodia-resumen">
    <div class="custodia-kpi"><b>ID de evidencia</b><span>${esc(e.id)}</span></div>
    <div class="custodia-kpi"><b>Hash original</b><span>${esc(e.originalHash||e.sha256||'—')}</span></div>
    <div class="custodia-kpi"><b>Responsable actual</b><span>${esc(e.custodioActual||e.custodio||'—')}</span></div>
    <div class="custodia-kpi"><b>Integridad</b><span>${v?(v.coincide?'COINCIDE':'NO COINCIDE'):'pendiente'}</span></div>
  </div><h3>Eventos</h3>`;
  h+=eventos.map(a=>{const d=a.datos||{},accion={EVIDENCIA_REGISTRADA:'Incorporación / adquisición en el expediente',EVIDENCIA_VERIFICADA:'Verificación de integridad',EVIDENCIA_TRANSFERIDA:'Transferencia',EVIDENCIA_TRABAJO_CREADO:'Creación de copia de trabajo',EVIDENCIA_ARCHIVADA:'Archivo de la evidencia'}[a.tipo]||a.tipo;
    const extra=a.tipo==='EVIDENCIA_TRANSFERIDA'?esc((d.origen||'')+' → '+(d.destino||'')):a.tipo==='EVIDENCIA_VERIFICADA'?esc((d.coincide?'SHA-256 coincide':'SHA-256 NO coincide')+' · '+(d.sha256Actual||'')):a.tipo==='EVIDENCIA_TRABAJO_CREADO'?esc('original '+(d.originalHash||'')+' → trabajo '+(d.workingHash||'')):'';
    return `<div class="custodia-linea"><b>${esc(accion)}</b><div class="sub">${esc(fmtUTC(a.ts))} · ${esc(a.actor)}</div><div class="sub">${extra}${d.motivo?' · '+esc(d.motivo):''}${d.observaciones?' · '+esc(d.observaciones):''}</div></div>`;}).join('');
  h+=`<p class="ayuda">TraceLock documenta trazabilidad criptográfica y documental. La identidad del actor, el control de acceso, el método de adquisición y el almacenamiento inmutable dependen del procedimiento y del entorno en el que se guarda el expediente.</p>`;
  $('#custodia-contenido').innerHTML=h; $('#modal-custodia').classList.remove('oculto');
};
$('#custodia-cerrar').onclick=()=>$('#modal-custodia').classList.add('oculto');
$('#modal-custodia').onclick=(ev)=>{if(ev.target===$('#modal-custodia'))$('#modal-custodia').classList.add('oculto');};

async function asegurarCopiaTrabajo(e){
  if(e.workingArchivo&&dirEv){
    try{await resolverFichero(dirEv,e.workingArchivo);return e.workingArchivo;}catch(_){}
  }
  if(!dirEv||!e.archivo)throw new Error('La evidencia no tiene una copia original en el expediente.');
  const src=await (await resolverFichero(dirEv,e.archivo)).getFile();
  const trabajo=await dirEv.getDirectoryHandle('trabajo',{create:true});
  const workName=e.id+'__'+sanear(e.nombre);
  const dest=await trabajo.getFileHandle(workName,{create:true});const w=await dest.createWritable();
  const huellas=await hashearFichero(src,w);await w.close();
  e.workingArchivo='trabajo/'+workName;e.workingHash=huellas.sha256;e.workingBytes=src.size;
  await anotar('EVIDENCIA_TRABAJO_CREADO',{id:e.id,originalHash:e.originalHash||e.sha256,workingHash:huellas.sha256,archivo:e.workingArchivo,bytes:src.size});
  return e.workingArchivo;
}

function pintarEv(){
  pintarAvisoProteccion();
  // Recuento bajo el título: evidencias subidas y cuántas tienen su última verificación correcta.
  const verif=EST.ev.filter((e)=>{const v=e.verif[e.verif.length-1];return v&&v.coincide;}).length;
  // Mismo formato que la línea bajo el título del Resumen: una línea, punto medio, peso normal.
  $('#ev-resumen').innerHTML=`Nº de evidencias: ${EST.ev.length}<span class="sep-punto"> · </span>Verificadas: ${verif}/${EST.ev.length}`;
  if(!EST.ev.length){$('#tabla-ev').innerHTML='<div class="vacio">Todavía no hay evidencias registradas.</div>';return;}
  // Anchos fijos: Fichero y SHA-256 un 15 % más estrechos que con el reparto automático
  // (24,3 → 20,5 y 18,2 → 15,5) y ese espacio repartido entre Adquisición e Integridad.
  $('#tabla-ev').innerHTML=`<table class="tabla-ev"><colgroup><col style="width:8%"><col style="width:20.5%">
    <col style="width:8.5%"><col style="width:15.5%"><col style="width:14.5%"><col style="width:12%">
    <col style="width:14.5%"><col style="width:6.5%"></colgroup><thead><tr><th>Id</th><th>Fichero</th><th>Tamaño</th>
    <th>SHA-256</th><th>Adquisición</th><th>Responsable</th><th>Integridad</th><th></th></tr></thead><tbody>`+
    EST.ev.map((e)=>{const v=e.verif[e.verif.length-1];
      const marca=!v?'<span class="est pend">Sin verificar</span>'
        :v.coincide?'<span class="est ok">Verificada</span>':'<span class="est mal">No coincide</span>';
      return `<tr><td class="idcol">${esc(e.id)}</td>
        <td>${esc(e.nombre)}
          ${e.duplicadoDe?`<div class="est curso">Mismo contenido que ${esc(e.duplicadoDe)}</div>`:''}
          ${e.copiado?'':'<div class="est mal">No copiada a la carpeta</div>'}
          ${e.origen?`<div class="sub">${esc(e.origen)}</div>`:''}</td>
        <td class="mono">${bytesTxt(e.bytes)}</td>
        <td class="mono">${esc(e.sha256)}
          ${e.md5?`<div class="sub mono">MD5 ${esc(e.md5)}</div>`:''}
          ${e.hashOrigen?`<div class="${e.coincideOrigen?'est ok':'est mal'}" style="margin-top:5px">${
            e.coincideOrigen?'Coincide con el origen':'No coincide con el origen'}</div>`:''}</td>
        <td class="mono col-adq">${fmtUTCdosLineas(e.adquiridaEl||e.ts)}
          <div class="sub">${esc(e.adquiridaPor||e.custodio)}${e.adquiridaElAuto?' · fecha del alta':''}</div>
          ${(e.equipo||e.serie||e.ubicacion||e.usuarioEquipo||e.estadoSistema)?`<details class="ficha">
            <summary class="sub">ficha del soporte</summary>
            ${[['Equipo',e.equipo],['Nº de serie',e.serie],['Usuario',e.usuarioEquipo],
               ['Ubicación',e.ubicacion],['Estado',e.estadoSistema],['Testigo',e.testigo]]
              .filter((x)=>x[1]).map((x)=>`<div class="sub">${x[0]}: ${esc(x[1])}</div>`).join('')}
          </details>`:''}</td>
        <td>${esc(e.custodioActual||e.custodio)}
          ${e.transferencias.length?`<details class="ficha">
            <summary class="sub">${e.transferencias.length} ${e.transferencias.length===1?'transferencia':'transferencias'}</summary>
            ${e.transferencias.map((t)=>`<div class="sub" style="margin-top:5px">
              ${fmtUTC(t.ts)}<br>${esc(t.origen)} → <b>${esc(t.destino)}</b><br>
              ${esc(t.medio)}${t.motivo?' · '+esc(t.motivo):''}
              ${t.hashCopia?`<br><span class="mono">copia ${esc(t.hashCopia)}</span>`:''}
              ${t.observaciones?'<br>'+esc(t.observaciones):''}</div>`).join('')}
          </details>`:'<div class="sub">sin transferencias</div>'}</td>
        <td>${marca}${v?`<div class="sub mono">${fmtUTCdosLineas(v.ts)}</div>`:''}</td>
        <td class="col-acciones">${menuAcciones('Acciones de la evidencia',[
          ['Verificar',`verificarEv('${escJs(e.id)}')`],
          ['Transferir',`transferirEv('${escJs(e.id)}')`],
          ['Trazabilidad',`verCadenaCustodia('${escJs(e.id)}')`]])}</td></tr>`;
    }).join('')+'</tbody></table>';
}

