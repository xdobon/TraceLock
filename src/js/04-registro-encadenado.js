/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= registro encadenado ================= */
async function cargarRegistro(){
  REGISTRO_ERROR='';
  if(dirCaso){
    const f=await hRegistro.getFile(),t=await f.text();
    bytesRegistro=f.size;marcaRegistro=f.lastModified;
    ASIENTOS=parsearRegistro(t);
    if(!comprobarAnclaRegistro())REGISTRO_ERROR='El registro es más corto o cambió un asiento ya observado; revisar el caso antes de continuar.';
    else guardarAnclaRegistro();
  }else{
    // Sin carpeta el registro vive en el almacén del navegador. Si estuviera
    // corrupto no debe impedir arrancar la aplicación: se avisa y se sigue con el
    // registro vacío, porque el caso real está en disco y se recupera al abrirlo.
    try{
      ASIENTOS=parsearRegistroAlmacen(almacenamiento.getItem('ir-registro'));
    }catch(e){
      ASIENTOS=[];
      REGISTRO_ERROR='El registro guardado en esta pestaña no se ha podido leer ('+e.message+'). '+
        'Se ha descartado. Abre la carpeta del caso para recuperar el expediente real.';
      console.warn(REGISTRO_ERROR);
    }
  }
}

function explicarError(err,fichero){
  const n=err&&err.name;
  if(n==='NoModificationAllowedError'||n==='InvalidStateError')
    return 'No se puede escribir en '+fichero+'. Suele pasar cuando el fichero ha quedado en solo '+
      'lectura: los scripts de proteccion solo deben marcar la carpeta evidencias, nunca '+
      'registro.jsonl. Quita el atributo con «attrib -R» (o «chmod 644») y repite la accion.';
  if(n==='NotFoundError')
    return 'No se encuentra '+fichero+' en la carpeta del caso. Comprueba que no se ha movido o renombrado.';
  if(n==='NotAllowedError'||n==='SecurityError')
    return 'El navegador ha retirado el permiso sobre la carpeta del caso. Vuelve a pulsar «Abrir carpeta del caso».';
  return 'Error al acceder a '+fichero+': '+(err&&err.message?err.message:err);
}

// Ninguna excepcion debe quedar en silencio: un boton que no hace nada es peor que un error.
window.addEventListener('unhandledrejection',(e)=>{
  if(e.reason&&e.reason.message==='sin carpeta de caso')return;
  alert('La accion no se ha completado.\n\n'+(e.reason&&e.reason.message?e.reason.message:e.reason));
});

function exigeCarpeta(){
  if(SOPORTA_FSA&&!dirCaso){alert('Abre primero la carpeta del caso: sin ella no se guardaría nada en disco.');return false;}
  return true;
}

/* ---------- pruebas gráficas de las acciones ----------
   Van a su propia carpeta, separadas de evidencias/: no son evidencia del incidente
   sino constancia de lo que hizo el equipo, y mezclarlas confunde las dos cosas. */
let dirAcciones=null;

async function carpetaAcciones(){
  if(dirAcciones)return dirAcciones;
  if(!dirCaso)throw new Error('sin carpeta de caso');
  dirAcciones=await dirCaso.getDirectoryHandle('acciones',{create:true});
  return dirAcciones;
}

async function guardarPruebas(hitoId,ficheros){
  if(!ficheros||!ficheros.length)return [];
  const dir=await carpetaAcciones();
  const salida=[];
  let n=ASIENTOS.reduce((a,x)=>a+((x.datos&&x.datos.id===hitoId&&x.datos.pruebas)
    ?x.datos.pruebas.length:0),0);
  for(const f of ficheros){
    n++;
    let archivo=hitoId+'__'+String(n).padStart(2,'0')+'__'+sanear(f.name);
    for(let i=0;i<50;i++){
      let ocupado=false;
      try{ await dir.getFileHandle(archivo); ocupado=true; }catch(e){}
      if(!ocupado)break;
      n++;
      archivo=hitoId+'__'+String(n).padStart(2,'0')+'__'+sanear(f.name);
    }
    const destino=await dir.getFileHandle(archivo,{create:true});
    const w=await destino.createWritable();
    const huellas=await hashearFichero(f,w,null);
    await w.close();
    salida.push({nombre:f.name,archivo,bytes:f.size,tipo:f.type||'',
      sha256:huellas.sha256,md5:huellas.md5,
      modificadoOrigen:new Date(f.lastModified).toISOString()});
  }
  return salida;
}

const CAMPO_PRUEBAS={id:'pruebas',etiqueta:'Pruebas gráficas de la acción',tipo:'imagenes',
  ancho:'grid-column:span 2'};

window.verPrueba=async function(archivo,titulo,huella){
  try{
    const dir=await carpetaAcciones();
    const f=await (await dir.getFileHandle(archivo)).getFile();
    const url=URL.createObjectURL(f);
    $('#visor').innerHTML=`<img src="${url}" alt="${esc(titulo||archivo)}">
      <div class="pie">${esc(titulo||'')}<span class="mono">${esc(archivo)} · ${bytesTxt(f.size)}
        · SHA-256 ${esc(huella||'')}</span></div>
      <button class="secundario" onclick="cerrarVisor()">Cerrar</button>`;
    $('#visor').classList.remove('oculto');
    $('#visor').dataset.url=url;
  }catch(e){alert('No se ha podido abrir la prueba: '+explicarError(e,'acciones/'+archivo));}
};
window.cerrarVisor=()=>{
  const u=$('#visor').dataset.url;
  if(u)URL.revokeObjectURL(u);
  $('#visor').classList.add('oculto');
  $('#visor').innerHTML='';
};

const chipsPruebas=(lista,titulo)=>(lista||[]).map((x)=>
  `<button class="prueba-img" onclick="verPrueba('${escJs(x.archivo)}','${escJs(titulo||'')}','${escJs(x.sha256)}')">
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4">
      <rect x="2" y="3" width="12" height="10" rx="2"/><circle cx="6" cy="6.6" r="1.2"/>
      <path d="m3 11 3.2-3 2.3 2.2L11 8l2 2.4"/></svg>${esc(x.nombre)}</button>`).join('');

/* ---------- sincronización con el fichero en disco ----------
   El registro solo crece por el final, así que si otro analista ha anotado algo
   basta con releerlo: los asientos ajenos y los propios se ordenan solos. Antes de
   cada escritura se comprueba el tamaño real del fichero para anexar al final de
   verdad y encadenar sobre el último asiento que hay en disco, no sobre el que
   tenemos en memoria. */
let sincronizando=false, marcaRegistro=0;

async function sincronizar(silencioso){
  if(!dirCaso||sincronizando)return false;
  sincronizando=true;
  try{
    const f=await hRegistro.getFile();
    if(f.size===bytesRegistro&&f.lastModified===marcaRegistro){if(!comprobarAnclaRegistro())throw new Error('REGISTRO_ANCLA_INVALIDO');return true;}
    const t=await f.text();
    const leidos=parsearRegistro(t);
    const antes=ASIENTOS.length;
    ASIENTOS=leidos;
    bytesRegistro=f.size;
    marcaRegistro=f.lastModified;
    if(!silencioso&&leidos.length>antes){
      const ajenos=leidos.slice(antes).filter((a)=>a.actor!==analista());
      if(ajenos.length)avisoSincronia(leidos.length-antes,
        [...new Set(ajenos.map((a)=>a.actor))]);
    }
    return true;
  }catch(e){
    console.warn('No se ha podido sincronizar el registro: '+e.message);
    return false;
  }finally{ sincronizando=false; }
}

function avisoSincronia(n,quienes){
  const c=$('#sincronia');
  c.innerHTML='<b>'+n+(n===1?' asiento nuevo':' asientos nuevos')+'</b>'+
    (quienes.length?' de '+esc(quienes.join(', ')):'')+
    '<div class="sub">El caso se ha recargado desde el fichero.</div>';
  c.classList.remove('oculto');
  clearTimeout(avisoSincronia.t);
  avisoSincronia.t=setTimeout(()=>c.classList.add('oculto'),9000);
}

/* Los identificadores se generan contando lo que hay en memoria, así que dos
   analistas podrían elegir el mismo. Al escribir se comprueba contra el fichero ya
   sincronizado y se reasigna si hace falta, pero solo en los asientos que crean algo:
   los que se refieren a un elemento existente deben conservar su identificador. */
const TIPOS_CREACION={EVIDENCIA_REGISTRADA:'EV-',HITO_CREADO:'H-',
  PREGUNTA_ABIERTA:'P-',CRONO_ENTRADA:'C-'};

/* Cola de escritura: los asientos se escriben de uno en uno aunque se pidan a la vez (la
   verificación automática anota en segundo plano mientras el analista trabaja). Sin ella,
   dos llamadas simultáneas leerían el mismo último asiento y ambas escribirían el mismo
   número de secuencia con el mismo «prev», bifurcando la cadena. */
let COLA_ANOTAR=Promise.resolve();
function anotar(tipo,datos){
  const p=COLA_ANOTAR.then(()=>anotarAhora(tipo,datos));
  COLA_ANOTAR=p.catch(()=>{});
  return p;
}
async function anotarAhora(tipo,datos){
  if(!exigeCarpeta())throw new Error('sin carpeta de caso');
  if(dirCaso){const ok=await sincronizar(true);if(ok!==true||REGISTRO_ERROR)throw new Error(REGISTRO_ERROR||'REGISTRO_NO_SINCRONIZADO');}

  datos=datos||{};
  const pref=TIPOS_CREACION[tipo];
  if(pref&&datos.id&&ASIENTOS.some((a)=>a.tipo===tipo&&a.datos&&a.datos.id===datos.id)){
    const nuevo=idNuevo(pref,tipo);
    console.warn('El identificador '+datos.id+' ya existía en el registro; se reasigna a '+nuevo);
    datos=Object.assign({},datos,{id:nuevo,idPrevisto:datos.id});
  }

  const ult=ASIENTOS[ASIENTOS.length-1];
  const base={schema:SCHEMA,seq:ASIENTOS.length+1,ts:new Date().toISOString(),tipo,
    actor:analista(),datos,prev:ult?ult.hash:'GENESIS'};
  const a=Object.assign({},base,{hash:sha256Texto(JSON.stringify(base))});
  const linea=JSON.stringify(a)+'\n';
  // El asiento se persiste ANTES de tocar el estado en memoria: si la escritura
  // falla, el registro en disco y el de memoria no pueden quedar descuadrados.
  if(dirCaso){
    try{
      const w=await hRegistro.createWritable({keepExistingData:true});
      await w.write({type:'write',position:bytesRegistro,data:linea});
      await w.close();
      const f=await hRegistro.getFile();
      const vt=await f.text();
      if(!vt.endsWith(linea))throw new Error('REGISTRO_CAMBIO_CONCURRENTE');
      bytesRegistro=f.size;
      marcaRegistro=f.lastModified;
    }catch(err){
      throw new Error(explicarError(err,'registro.jsonl'));
    }
  }else{
    // Mismo formato que el fichero de disco (JSONL), no un array JSON: así lo que
    // se guarda aquí y lo que se guarda en registro.jsonl se leen con el mismo parser.
    almacenamiento.setItem('ir-registro',
      ASIENTOS.concat([a]).map((x)=>JSON.stringify(x)).join('\n')+'\n');
  }
  ASIENTOS.push(a);guardarAnclaRegistro();
  refrescar();
  return a;
}

function casoIdActual(){
  const ap=ASIENTOS.find((a)=>a.tipo==='CASO_ABIERTO');
  if(ap&&ap.datos&&ap.datos.caseId)return String(ap.datos.caseId);
  const seed=(dirCaso?dirCaso.name:'caso')+'|'+(ap?ap.ts:'0');
  return 'CASE-'+sha256Texto(seed).slice(0,20);
}

function manifestEvidencias(){
  return (EST&&EST.ev?EST.ev:[]).map((e)=>({id:e.id,nombre:e.nombre||'',bytes:Number(e.bytes)||0,sha256:String(e.sha256||''),
    originalHash:String(e.originalHash||e.sha256||''),archivo:String(e.archivo||''),custodio:String(e.custodioActual||e.custodio||'')}))
    .sort((a,b)=>a.id.localeCompare(b.id));
}

function identidadAncla(){
  const c=verificarCadena();
  return {format:ANCLA_PREFIX,schema:SCHEMA,tool:VERSION,caseId:casoIdActual(),caseName:dirCaso?dirCaso.name:'',
    generatedAt:new Date().toISOString(),events:c.integra?c.n:ASIENTOS.length,lastHash:c.integra?(c.sello||''):null,
    chainValid:!!c.integra,evidenceCount:EST&&EST.ev?EST.ev.length:0,evidence:manifestEvidencias()};
}

function hashAnclaPayload(x){
  const c=Object.assign({},x);delete c.anchorHash;
  return sha256Texto(JSON.stringify(c));
}

async function generarSelloExterno(){
  if(!exigeCarpeta()||!ASIENTOS.length){alert('Abre un caso con actividad antes de generar un sello.');return;}
  const c=verificarCadena();
  if(!c.integra){alert('No se puede generar un sello externo mientras la cadena del caso esté rota.');return;}
  const ahora=new Date().toISOString();
  const anchorId='ANC-'+c.n+'-'+c.sello.slice(0,12);
  const evento=await anotar('ANCLA_EXTERNA_GENERADA',{anchorId,events:c.n,lastHash:c.sello,generatedBy:analista()});
  const seal={...identidadAncla(),anchorId,anchorEvent:evento.seq,generatedAt:ahora};
  seal.anchorHash=hashAnclaPayload(seal);
  ULTIMO_SELO_EXTERNO=seal;
  const contenido=JSON.stringify(seal,null,2);
  bajar('sello_externo_'+seal.caseId+'.json',contenido,'application/json');
  bajar('sello_externo_'+seal.caseId+'.txt',ANCLA_PREFIX+'\nCase ID: '+seal.caseId+'\nCase: '+seal.caseName+'\nEvents: '+seal.events+'\nLast hash: '+seal.lastHash+'\nAnchor hash: '+seal.anchorHash+'\nGenerated: '+seal.generatedAt+'\n\nStore this file OUTSIDE the case folder. It is an external integrity anchor, not an authentication mechanism.', 'text/plain;charset=utf-8');
  pintarSelloEstado();
  alert('Sello externo generado. Guarda el JSON fuera de la carpeta del caso (ticket, repositorio protegido o almacenamiento independiente).');
}

async function verificarSelloDesdeFichero(f){
  try{
    const sello=JSON.parse(await f.text());
    if(sello.format!==ANCLA_PREFIX)throw new Error('El fichero no es un sello TraceLock compatible.');
    if(sello.anchorHash!==hashAnclaPayload(sello))throw new Error('El sello externo está alterado.');
    const c=verificarCadena();
    const n=Number(sello.events), hashEsperado=String(sello.lastHash||'');
    const baseOk=sello.caseId===casoIdActual()&&Number.isInteger(n)&&n>0&&ASIENTOS.length>=n
      &&c.integra&&String(ASIENTOS[n-1]?.hash||'')===hashEsperado;
    const evidActual=manifestEvidencias();
    const porId=new Map(evidActual.map((x)=>[x.id,x]));
    const evidMetaOk=Array.isArray(sello.evidence)&&sello.evidence.every((x)=>{const e=porId.get(x.id);return !!e&&e.sha256===x.sha256&&e.bytes===x.bytes;});
    let evidFicherosOk=true, evidFicherosComprobados=0;
    if(dirEv&&Array.isArray(sello.evidence)){
      const barra=$('#progreso');barra.style.display='block';
      try{
        for(const x of sello.evidence){
          const e=porId.get(x.id); if(!e||!e.archivo){evidFicherosOk=false;break;}
          const ff=await (await resolverFichero(dirEv,e.archivo)).getFile();
          const h=await hashearFichero(ff,null,(p)=>{barra.firstElementChild.style.width=(p*100)+'%';});
          evidFicherosComprobados++;
          if(h.sha256!==x.sha256||ff.size!==x.bytes){evidFicherosOk=false;break;}
        }
      }finally{barra.style.display='none';barra.firstElementChild.style.width='0';}
    }
    const ok=!!(baseOk&&evidMetaOk&&evidFicherosOk);
    ULTIMO_SELO_EXTERNO=Object.assign({},sello,{_verification:{ok,baseOk,evidMetaOk,evidFicherosOk,evidFicherosComprobados,checkedAt:new Date().toISOString()}});
    pintarSelloEstado();
    alert(ok
      ? 'SELLO EXTERNO VÁLIDO\n\nLa cadena actual conserva el estado anclado y las evidencias verificadas mantienen hash y tamaño.'
      : 'SELLO EXTERNO NO COINCIDE\n\nRevisa cadena, registro, evidencias y almacenamiento antes de considerar íntegro el expediente.');
  }catch(e){alert('No se ha podido verificar el sello: '+e.message);}
}

function pintarSelloEstado(){
  const c=$('#sello'),e=$('#sello-externo');
  if(!e||!c)return;
  if(!ULTIMO_SELO_EXTERNO){e.textContent='no cargado';e.className='';c.title='Sin anclaje externo cargado';return;}
  const a=ULTIMO_SELO_EXTERNO,n=Number(a.events),chain=verificarCadena();
  const ok=chain.integra&&Number.isInteger(n)&&n>0&&ASIENTOS.length>=n&&String(ASIENTOS[n-1]?.hash||'')===String(a.lastHash||'')
    &&(!a._verification||a._verification.ok!==false);
  e.textContent=ok?(ASIENTOS.length===n?'válido / conservado':'válido / con actividad posterior'):'NO COINCIDE';
  e.className=ok?'sello-externo-ok':'sello-externo-mal';
  c.title=ok?'Anclaje externo conservado':'El anclaje externo no coincide con el estado actual';
  c.style.color=ok?'var(--feedback-success-text)':'var(--feedback-error-text)';
}

function verificarCadena(){
  let prev='GENESIS';
  for(let i=0;i<ASIENTOS.length;i++){
    const a=ASIENTOS[i],c=Object.assign({},a);delete c.hash;
    if(a.seq!==i+1)return{integra:false,en:i+1,motivo:'numeración alterada'};
    if(a.prev!==prev)return{integra:false,en:a.seq,motivo:'enlace roto con el asiento anterior'};
    if(sha256Texto(JSON.stringify(c))!==a.hash)return{integra:false,en:a.seq,motivo:'contenido del asiento alterado'};
    prev=a.hash;
  }
  return{integra:true,n:ASIENTOS.length,sello:prev};
}

