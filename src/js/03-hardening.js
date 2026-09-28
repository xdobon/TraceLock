/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ===== hardening ===== */
const almacenamiento=(()=>{
  try{const k='__tl_probe__';sessionStorage.setItem(k,'1');sessionStorage.removeItem(k);return sessionStorage;}
  catch(_){return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}};}
})();
const RE_ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const RE_H=/^[0-9a-f]{64}$/i;
const asientoValido=(a)=>!!a&&typeof a==='object'&&!Array.isArray(a)
  &&Number.isInteger(a.seq)&&a.seq>0
  &&RE_ISO.test(String(a.ts||''))
  &&typeof a.tipo==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(a.tipo)
  &&typeof a.actor==='string'&&a.actor.length<=512
  &&!!a.datos&&typeof a.datos==='object'&&!Array.isArray(a.datos)
  &&RE_H.test(String(a.hash||''))
  &&(a.prev==='GENESIS'||RE_H.test(String(a.prev||'')));
function parsearRegistro(texto){
  const lineas=String(texto??'').split('\n').filter((x)=>x.trim()),arr=[];
  for(let i=0;i<lineas.length;i++){
    let a; try{a=JSON.parse(lineas[i]);}catch(_){throw new Error('REGISTRO_JSON_LINEA_'+(i+1));}
    if(!asientoValido(a))throw new Error('REGISTRO_ESQUEMA_LINEA_'+(i+1));
    arr.push(a);
  }
  return arr;
}

/* El registro del disco es JSONL (un asiento por línea), pero el modo sin carpeta
   guardó durante un tiempo el array completo con JSON.stringify(ASIENTOS). Ese
   formato heredado se sigue leyendo aquí para no dejar tirado a quien tenga un
   registro a medias en el navegador; al primer anotar() se reescribe ya en JSONL.
   La validación por asiento es exactamente la misma: aceptar el formato viejo no
   relaja el esquema. */
function parsearRegistroAlmacen(texto){
  const t=String(texto??'').trim();
  if(!t)return [];
  if(t.startsWith('[')){
    let arr; try{arr=JSON.parse(t);}catch(_){throw new Error('REGISTRO_JSON_ALMACEN');}
    if(!Array.isArray(arr))throw new Error('REGISTRO_ESQUEMA_ALMACEN');
    arr.forEach((a,i)=>{if(!asientoValido(a))throw new Error('REGISTRO_ESQUEMA_ALMACEN_'+(i+1));});
    return arr;
  }
  return parsearRegistro(t);
}
let REGISTRO_ERROR='';
let ULTIMO_ANCLA=null;
function claveAncla(){return 'tracelock:ancla:'+(dirCaso?.name||'sin-caso');}
function cargarAnclaRegistro(){
  if(!dirCaso){ULTIMO_ANCLA=null;return;}
  try{const a=JSON.parse(almacenamiento.getItem(claveAncla())||'null');ULTIMO_ANCLA=(a&&Number.isInteger(a.n)&&a.n>0&&RE_H.test(String(a.sello||'')))?a:null;}catch(_){ULTIMO_ANCLA=null;}
}
function guardarAnclaRegistro(){
  if(!dirCaso||!ASIENTOS.length)return;
  const a=ASIENTOS.at(-1); if(!asientoValido(a))return;
  ULTIMO_ANCLA={n:ASIENTOS.length,sello:String(a.hash)};
  try{almacenamiento.setItem(claveAncla(),JSON.stringify(ULTIMO_ANCLA));}catch(_){}
}
function comprobarAnclaRegistro(){
  cargarAnclaRegistro();
  if(!dirCaso||!ULTIMO_ANCLA)return true;
  if(ASIENTOS.length<ULTIMO_ANCLA.n)return false;
  return String(ASIENTOS[ULTIMO_ANCLA.n-1]?.hash||'')===ULTIMO_ANCLA.sello;
}

/* Para lo que se interpola dentro de onclick="fn('...')" no basta con escapar HTML:
   el navegador decodifica las entidades ANTES de que JavaScript lea la cadena, así que
   una comilla simple escapada como entidad seguiría cerrando el literal. Hay que
   escaparla para JavaScript y después para HTML, en ese orden. */
const escJs=(t)=>esc(String(t==null?'':t)
  .replace(/\\/g,'\\\\').replace(/'/g,"\\'")
  .replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\u2028|\u2029/g,''));
const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const dosCifras=(n)=>String(n).padStart(2,'0');
// Fecha suelta 'AAAA-MM-DD' -> 'DD-MM-AAAA'
const fmtFecha=(f)=>{if(!f)return '—';const p=String(f).split('-');
  return p.length===3?p[2]+'-'+p[1]+'-'+p[0]:String(f);};
// 'AAAA-MM-DD' -> {dia:'martes', fecha:'17-02-2026'}
const fmtDiaLargo=(f)=>{if(!f)return{dia:'',fecha:'sin fecha'};
  const p=String(f).split('-');
  if(p.length!==3)return{dia:'',fecha:String(f)};
  const d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));
  return{dia:isNaN(d)?'':DIAS[d.getUTCDay()],fecha:p[2]+'-'+p[1]+'-'+p[0]};};
// Marca ISO -> 'DD-MM-AAAA HH:MM:SS' en UTC
const fmtUTC=(i)=>{if(!i)return '—';const d=new Date(i);
  return dosCifras(d.getUTCDate())+'-'+dosCifras(d.getUTCMonth()+1)+'-'+d.getUTCFullYear()+
    ' '+dosCifras(d.getUTCHours())+':'+dosCifras(d.getUTCMinutes())+':'+dosCifras(d.getUTCSeconds());};
/* Fecha y hora en dos líneas dentro de una misma celda. La hora va en un <div class="sub">
   para que quede debajo y en el nivel secundario, como el resto de segundas líneas de tabla. */
const fmtUTCdosLineas=(i)=>{if(!i)return '—';const t=fmtUTC(i).split(' ');
  return t[0]+'<div class="sub">'+t[1]+'</div>';};
const fmtLocal=(i)=>{if(!i)return '—';const d=new Date(i);
  return dosCifras(d.getDate())+'-'+dosCifras(d.getMonth()+1)+'-'+d.getFullYear()+
    ' '+dosCifras(d.getHours())+':'+dosCifras(d.getMinutes());};
const bytesTxt=(b)=>{if(b<1024)return b+' B';const u=['KB','MB','GB','TB'];let i=-1,n=b;
  do{n/=1024;i++}while(n>=1024&&i<u.length-1);return n.toFixed(n<10?1:0)+' '+u[i];};
const dur=(a,b)=>{const s=Math.max(0,Math.round((new Date(b)-new Date(a))/1000));
  return String((s/3600)|0).padStart(2,'0')+':'+String(((s%3600)/60)|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};

const DATOS_DEFECTO={
  organizacion:'',
  analistas:[],
  clientes:[],
  fases:['Notificacion','Contencion','Analisis','Mitigacion','Recuperacion','Cierre'],
  riesgos:['Bajo','Medio','Alto'],
  metodosAdquisicion:['Exportacion desde SIEM','Exportacion desde EDR','Imagen forense de disco',
    'Volcado de memoria','Descarga desde consola cloud','Copia manual facilitada por el cliente',
    'Captura de trafico','Entregado por el cliente'],
  husos:['UTC','Europe/Madrid','America/Lima','Local del sistema origen','Sin determinar']};
let DATOS=JSON.parse(JSON.stringify(DATOS_DEFECTO));
const FASES=()=>DATOS.fases;
const SOPORTA_FSA=typeof window.showDirectoryPicker==='function';

let dirCaso=null, dirEv=null, hRegistro=null, bytesRegistro=0;
let ASIENTOS=[], EST=null, RELOJ=null, SONDEO=null;
let ULTIMO_SELO_EXTERNO=null;
const ANCLA_PREFIX='TraceLock-External-Anchor-v1';
const analista=()=>$('#analista').value.trim()||'sin identificar';

