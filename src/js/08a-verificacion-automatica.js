/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= verificación automática de evidencias =================
   Al abrir un caso se comprueban solas las evidencias en dos pasadas:
   1. Rápida (tamaño y fecha de modificación de cada original): milisegundos, detecta casi
      cualquier escritura accidental. No detecta a quien altere un fichero y restaure su
      fecha a propósito; para eso está la segunda.
   2. Completa (SHA-256) en segundo plano, sin bloquear la interfaz: las que la rápida señaló
      primero, luego el resto de menor a mayor. Hasta VERIF_UMBRAL_NATIVO se usa el SHA-256
      nativo del navegador, que no ocupa el hilo de la interfaz pero carga el fichero entero
      en memoria; por encima, el SHA-256 propio por trozos de 1 MB, que cede el hilo entre
      trozo y trozo (~9 ms cada uno, por debajo de un fotograma).
   Umbral medido (caso de 282 evidencias, 3,1 GB): con 256 MB la pasada tardó 33 s pero la
   interfaz llegó a tener parones de 370 ms y +220 MB de memoria al cargar ficheros grandes
   enteros; con 32 MB, 38 s, parones máximos de 110 ms y +30 MB. Se queda en 32 MB.
   Solo se anotan en el registro las discrepancias (una EVIDENCIA_VERIFICADA por evidencia) y
   un resumen por pasada completa (VERIFICACION_AUTOMATICA), para no inflar el registro con
   un asiento por evidencia en cada apertura. */
let VERIF_UMBRAL_NATIVO=32*1024*1024;   // let: las pruebas de rendimiento lo cambian
const VERIF_TROZO=1024*1024;
let VERIF=null;              // pasada en curso
let VERIF_GENERACION=0;      // cambia al abrir otro caso: la pasada anterior se abandona

const hexDeBuffer=(buf)=>{const b=new Uint8Array(buf);let s='';
  for(let i=0;i<b.length;i++)s+=(b[i]<16?'0':'')+b[i].toString(16);return s;};

/* SHA-256 de un File sin bloquear la interfaz. onProg recibe los bytes procesados en cada paso.
   Devuelve null si debeParar() se cumple a mitad. */
async function sha256Fichero(f,onProg,debeParar,forzarJS){
  if(!forzarJS&&f.size<=VERIF_UMBRAL_NATIVO&&window.crypto&&crypto.subtle){
    const d=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());
    if(onProg)onProg(f.size);
    return hexDeBuffer(d);
  }
  const h=new Sha256();
  for(let off=0;off<f.size;off+=VERIF_TROZO){
    if(debeParar&&debeParar())return null;
    // el await de la lectura ya devuelve el control al navegador entre trozo y trozo
    const buf=new Uint8Array(await f.slice(off,off+VERIF_TROZO).arrayBuffer());
    h.update(buf);
    if(onProg)onProg(buf.length);
  }
  return h.hex();
}

const bytesEv=(e)=>e.originalBytes!=null?e.originalBytes:e.bytes;
const hashEv=(e)=>e.originalHash||e.sha256;

async function comprobacionRapida(lista){
  const r={cambiadas:new Set(),fechas:{}};
  for(const e of lista){
    try{
      const f=await (await resolverFichero(dirEv,e.archivo)).getFile();
      r.fechas[e.id]=f.lastModified;
      if(f.size!==bytesEv(e)||(e.mtimeRef!=null&&f.lastModified!==e.mtimeRef))r.cambiadas.add(e.id);
    }catch(err){r.cambiadas.add(e.id);}
  }
  return r;
}

async function verificacionAutomatica(){
  if(!dirEv||!EST.ev)return;
  const gen=++VERIF_GENERACION;
  const lista=EST.ev.filter((e)=>e.copiado&&e.archivo);
  if(!lista.length){VERIF=null;pintarVerif();return;}
  const t0=performance.now();
  VERIF={fase:'rapida',total:lista.length,hechos:0,bytesTotal:lista.reduce((s,e)=>s+(bytesEv(e)||0),0),
    bytesHechos:0,discrepancias:[],noLeidas:[],cambiadas:0,inicio:Date.now()};
  pintarVerif();
  const rapida=await comprobacionRapida(lista);
  if(gen!==VERIF_GENERACION)return;
  VERIF.cambiadas=rapida.cambiadas.size;
  VERIF.msRapida=Math.round(performance.now()-t0);
  VERIF.fase='completa';
  pintarVerif();
  // primero lo que la rápida señaló; después de menor a mayor, para que el grueso quede hecho pronto
  const orden=[...lista].sort((a,b)=>(rapida.cambiadas.has(b.id)-rapida.cambiadas.has(a.id))||(bytesEv(a)-bytesEv(b)));
  const hastaSeq=Math.max(...lista.map((e)=>e.seq));
  const mtimes={};
  let ultimoPintado=0;
  for(const e of orden){
    if(gen!==VERIF_GENERACION)return;
    VERIF.actual=e.id;
    let actual=null,f=null;
    try{
      f=await (await resolverFichero(dirEv,e.archivo)).getFile();
      actual=await sha256Fichero(f,(n)=>{VERIF.bytesHechos+=n;
        const ahora=performance.now();if(ahora-ultimoPintado>250){ultimoPintado=ahora;pintarVerif();}},
        ()=>gen!==VERIF_GENERACION);
      if(actual===null)return;
    }catch(err){VERIF.noLeidas.push(e.id);}
    VERIF.hechos++;
    if(actual!==null&&actual!==hashEv(e)){VERIF.discrepancias.push(e.id);pintarVerif();}
    else if(actual!==null&&f&&e.mtimeRef!==f.lastModified)mtimes[e.id]=f.lastModified;
    if(actual!==hashEv(e)){
      // Cada discrepancia es un asiento propio: es lo que el acta de evidencias tiene que reflejar.
      try{await anotar('EVIDENCIA_VERIFICADA',{id:e.id,sha256Actual:actual,sha256Registrado:hashEv(e),
        coincide:false,tipoVerificacion:'verificación automática',
        motivo:actual===null?'no se ha podido leer el fichero':'la huella no coincide con la del alta'});}catch(err){}
    }
  }
  if(gen!==VERIF_GENERACION)return;
  VERIF.fase='hecha';VERIF.fin=Date.now();VERIF.ms=Math.round(performance.now()-t0);
  try{await anotar('VERIFICACION_AUTOMATICA',{hastaSeq,total:lista.length,
    correctas:lista.length-VERIF.discrepancias.length-VERIF.noLeidas.length,
    discrepancias:VERIF.discrepancias,noLeidas:VERIF.noLeidas,bytes:VERIF.bytesTotal,duracionMs:VERIF.ms,mtimes});}
  catch(err){console.warn('No se ha podido anotar el resumen de la verificación: '+err.message);}
  pintarVerif();
  if(VERIF.discrepancias.length||VERIF.noLeidas.length)
    alert('La verificación automática ha encontrado evidencias que no coinciden con su alta: '+
      VERIF.discrepancias.concat(VERIF.noLeidas).join(', ')+'.\n\nHa quedado anotado en el registro. '+
      'No las modifiques ni las borres: documenta qué ha pasado antes de seguir.');
}

function pintarVerif(){
  const c=$('#verif-estado');
  if(!c)return;
  if(!VERIF){c.classList.add('oculto');c.innerHTML='';return;}
  c.classList.remove('oculto');
  const v=VERIF;
  if(v.fase==='rapida'){
    // ~150 ms en el caso medido: un indicador que aparece y desaparece solo distrae
    if(Date.now()-v.inicio<1000){c.classList.add('oculto');setTimeout(pintarVerif,1000);return;}
    c.innerHTML='Comprobando evidencias…';return;}
  if(v.fase==='completa'){
    const pct=v.bytesTotal?Math.floor(v.bytesHechos/v.bytesTotal*100):0;
    // La barra va por bytes, no por ficheros: en el caso medido, 250 de 282 evidencias (el 89 %)
    // se verificaron en 2 s y eran solo el 5 % del trabajo.
    // El ritmo se mide sobre los últimos ~8 s, no desde el principio: los ficheros pequeños van
    // por el SHA-256 nativo y los grandes por el propio, más lento, y la media acumulada daba
    // estimaciones un 35 % optimistas en la prueba.
    const ahora=Date.now();(v.muestras??=[]).push([ahora,v.bytesHechos]);
    while(v.muestras.length>2&&ahora-v.muestras[0][0]>8000)v.muestras.shift();
    const [t0,b0]=v.muestras[0],ritmo=ahora>t0?(v.bytesHechos-b0)/((ahora-t0)/1000):0;
    const seg=(ahora-v.inicio)/1000, resto=ritmo>0?(v.bytesTotal-v.bytesHechos)/ritmo:0;
    const eta=seg<10||pct<3||!resto?'':resto<60?' · quedan unos '+Math.max(5,Math.round(resto/5)*5)+' s'
      :' · quedan unos '+Math.round(resto/60)+' min';
    const malYa=v.discrepancias.length+v.noLeidas.length;
    c.innerHTML=(malYa?`<b class="sello-externo-mal">${malYa} ${malYa===1?'evidencia no coincide':'evidencias no coinciden'} con su alta</b> · `:'')+
      `Verificando evidencias: ${v.hechos} de ${v.total} · ${bytesTxt(v.bytesHechos)} de ${bytesTxt(v.bytesTotal)}${eta}`+
      `<span class="verif-barra" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
    c.setAttribute('aria-valuenow',pct);
    return;
  }
  const mal=v.discrepancias.length+v.noLeidas.length;
  c.innerHTML=mal
    ?`<b class="sello-externo-mal">${mal} ${mal===1?'evidencia no coincide':'evidencias no coinciden'} con su alta</b>`
    :`Evidencias verificadas: ${v.total} correctas, ${fmtUTC(new Date(v.fin).toISOString()).slice(11,16)}`;
}
$('#verif-estado').onclick=()=>irA('ev');
