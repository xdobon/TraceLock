/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= laboratorio: codificar y decodificar ================= */
/* Utilidades sobre bytes. Rápidas (tabla y tramos) porque también se usan con binarios de varios MB. */
const HEX2=Array.from({length:256},(_,i)=>i.toString(16).padStart(2,'0'));
function hexDeBytes(b){
  const partes=[];
  for(let i=0;i<b.length;i+=65536){
    const n=Math.min(65536,b.length-i),s=new Array(n);
    for(let j=0;j<n;j++)s[j]=HEX2[b[i+j]];
    partes.push(s.join(' '));
  }
  return partes.join(' ');
}
function base64DeBytes(b){
  // Por tramos: String.fromCharCode(...bytes) revienta la pila a partir de ~100 KB.
  let s='';
  for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));
  return btoa(s);
}
const latin1=(b)=>new TextDecoder('latin1').decode(b);   // 1 byte = 1 carácter, sin pérdida
function extraerIocs(t){
  const u=[...new Set(t.match(RE_URL)||[])],ip=[...new Set(t.match(RE_IP)||[])],
    m=[...new Set(t.match(RE_MAIL)||[])];
  return 'URLs ('+u.length+')\n'+u.join('\n')+'\n\nIPs ('+ip.length+')\n'+ip.join('\n')+
    '\n\nCorreos ('+m.length+')\n'+m.join('\n');
}
/* Volcado estilo xxd, solo para ENSEÑAR un binario: no es la entrada de ninguna operación. */
function volcadoHex(b,max){
  const n=Math.min(b.length,max),l=[];
  for(let o=0;o<n;o+=16){
    const t=b.subarray(o,Math.min(o+16,n));
    let h='',a='';
    for(let i=0;i<16;i++){h+=(i<t.length?HEX2[t[i]]:'  ')+(i===7?'  ':' ');
      if(i<t.length)a+=(t[i]>=32&&t[i]<127)?String.fromCharCode(t[i]):'.';}
    l.push(o.toString(16).padStart(8,'0')+'  '+h+' '+a);
  }
  return l.join('\n');
}
/* ¿Se puede tratar como texto sin perder información? null = binario. */
function labCodificacionTexto(buf,parcial){
  if(buf.length>=2&&buf[0]===0xFF&&buf[1]===0xFE)return 'utf-16le';
  if(buf.length>=2&&buf[0]===0xFE&&buf[1]===0xFF)return 'utf-16be';
  // stream:true si está truncado, para no confundir un carácter partido al final con basura
  try{new TextDecoder('utf-8',{fatal:true}).decode(buf,{stream:!!parcial});}catch(_){return null;}
  let ctl=0;const n=Math.min(buf.length,65536);
  for(let i=0;i<n;i++){const c=buf[i];if(c<9||(c>13&&c<32))ctl++;}
  return n&&ctl/n>0.01?null:'utf-8';   // UTF-8 válido pero lleno de NUL y controles: binario
}
const OPERACIONES={
 'base64-decode':{n:'Decodificar Base64',f:(t)=>new TextDecoder().decode(
    Uint8Array.from(atob(t.replace(/\s/g,'')),(c)=>c.charCodeAt(0)))},
 'base64-encode':{n:'Codificar en Base64',f:(t)=>base64DeBytes(new TextEncoder().encode(t)),b:base64DeBytes},
 'base64url-decode':{n:'Decodificar Base64 URL',f:(t)=>new TextDecoder().decode(
    Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/').replace(/\s/g,'')
      .padEnd(Math.ceil(t.length/4)*4,'=')),(c)=>c.charCodeAt(0)))},
 'hex-decode':{n:'Decodificar hexadecimal',f:(t)=>new TextDecoder().decode(
    Uint8Array.from(t.replace(/[^0-9a-fA-F]/g,'').match(/../g)||[],(h)=>parseInt(h,16)))},
 'hex-encode':{n:'Codificar en hexadecimal',f:(t)=>hexDeBytes(new TextEncoder().encode(t)),b:hexDeBytes},
 'url-decode':{n:'Decodificar URL',f:(t)=>decodeURIComponent(t.replace(/\+/g,' '))},
 'url-encode':{n:'Codificar URL',f:(t)=>encodeURIComponent(t)},
 'html-decode':{n:'Decodificar entidades HTML',f:(t)=>t.replace(/&#x([0-9a-f]+);/gi,
    (_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')},
 'unicode-decode':{n:'Decodificar escapes \\u',f:(t)=>t.replace(/\\u\{?([0-9a-fA-F]{1,6})\}?/g,
    (_,h)=>String.fromCodePoint(parseInt(h,16)))},
 'rot13':{n:'ROT13',f:(t)=>t.replace(/[a-zA-Z]/g,(c)=>String.fromCharCode(
    (c<='Z'?90:122)>=c.charCodeAt(0)+13?c.charCodeAt(0)+13:c.charCodeAt(0)-13))},
 'reverse':{n:'Invertir el texto',f:(t)=>[...t].reverse().join('')},
 'defang':{n:'Neutralizar (hxxp, [.])',f:(t)=>t.replace(/https?:\/\//gi,(m)=>m.replace(/^http/i,'hxxp'))
    .replace(/\./g,'[.]').replace(/@/g,'[@]')},
 'refang':{n:'Devolver a su forma real',f:(t)=>t.replace(/hxxp/gi,'http')
    .replace(/\[\.\]/g,'.').replace(/\[@\]/g,'@').replace(/\[:\]/g,':')},
 'jwt':{n:'Decodificar JWT',f:(t)=>{
    const p=t.trim().split('.');
    if(p.length<2)throw new Error('No parece un JWT: faltan las partes separadas por puntos.');
    const dec=(x)=>JSON.parse(new TextDecoder().decode(Uint8Array.from(
      atob(x.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(x.length/4)*4,'=')),(c)=>c.charCodeAt(0))));
    return 'CABECERA\n'+JSON.stringify(dec(p[0]),null,2)+'\n\nCONTENIDO\n'+JSON.stringify(dec(p[1]),null,2)+
      '\n\nFIRMA\n'+(p[2]||'(sin firma)')+'\n\nLa firma no se comprueba: no hay clave con la que validarla.';}},
 'json-format':{n:'Formatear JSON',f:(t)=>JSON.stringify(JSON.parse(t),null,2)},
 'lineas-unicas':{n:'Líneas únicas y ordenadas',f:(t)=>[...new Set(t.split(/\r?\n/)
    .map((x)=>x.trim()).filter(Boolean))].sort().join('\n')},
 'extraer-iocs':{n:'Extraer indicadores del texto',f:extraerIocs,b:(b)=>extraerIocs(latin1(b))},
 'sha256':{n:'Huella SHA-256',f:(t)=>sha256Texto(t),b:(b)=>new Sha256().update(b).hex()},
 'md5':{n:'Huella MD5',f:(t)=>new Md5().update(new TextEncoder().encode(t)).hex(),b:(b)=>new Md5().update(b).hex()},
 'minusculas':{n:'Pasar a minúsculas',f:(t)=>t.toLowerCase()},
 'sin-espacios':{n:'Quitar espacios y saltos',f:(t)=>t.replace(/\s+/g,'')},
};

const OP_METADATOS='__metadatos__';
const OP_CORREO='__correo__';
/* El cuadro Resultado solo MUESTRA; el resultado íntegro vive en LAB_ULTIMO. Pintar
   varios MB en un <textarea> cuesta segundos de maquetación (bastante más en Firefox). */
const LAB_VISTA_MAX=256*1024;
let LAB_ULTIMO=null;   // {op, fuente, salida}
/* Evidencia binaria cargada: se opera sobre sus BYTES, nunca sobre un texto decodificado.
   Decodificar un JPG como UTF-8 sustituye cientos de miles de bytes por U+FFFD: el hash, el
   hexadecimal o el Base64 resultantes ya no serían los del fichero. */
let LAB_BIN=null;      // {id, nombre, tipo, bytes, total, parcial}
const labFuente=()=>LAB_BIN||$('#lab-in').value;
const opsBinarias=()=>Object.values(OPERACIONES).filter((o)=>o.b).map((o)=>'«'+o.n+'»').join(', ');
const ceder=()=>new Promise((r)=>setTimeout(r,0));

function labOpNombre(op){
  return op===OP_METADATOS?'Leer metadatos del fichero':(OPERACIONES[op]||{}).n||'';
}

window.labDescribir=()=>{
  const op=$('#lab-op').value, ev=$('#lab-ev').value;
  const d=$('#lab-desc');
  if(!op){d.textContent='Elige una operación.';return;}
  if(op===OP_CORREO){
    const e=ev&&EST.ev.find((x)=>x.id===ev);
    d.textContent=!e
      ? 'Analizar correo necesita una evidencia: elígela en el desplegable de la izquierda.'
      : /\.(eml|msg)$/i.test(e.nombre)
        ? 'Se analizará '+e.nombre+': cabeceras, cadena de entrega, autenticación, URLs, adjuntos e '+
          'indicios de suplantación. No usa el cuadro de Entrada.'
        : e.nombre+' no es un .eml ni un .msg, así que no se puede analizar como correo.';
    return;
  }
  if(op===OP_METADATOS){
    d.textContent=ev
      ? 'Se leerá el fichero original de '+ev+' tal cual está en la carpeta del caso y se mostrarán sus '+
        'metadatos abajo. No usa el cuadro de Entrada.'
      : 'Leer metadatos necesita una evidencia: elígela en el desplegable de la izquierda.';
    return;
  }
  if(LAB_BIN){
    d.textContent=OPERACIONES[op].b
      ?'Se aplicará «'+labOpNombre(op)+'» sobre los bytes reales de '+LAB_BIN.nombre+' ('+LAB_BIN.tipo+').'
      :'«'+labOpNombre(op)+'» trabaja sobre texto y no se aplica a un binario. Con este fichero sirven: '+opsBinarias()+'.';
    return;}
  d.textContent='Se aplicará «'+labOpNombre(op)+'» sobre el contenido del cuadro Entrada.';
};

/* Analizar correo vive en el Laboratorio: es una lectura más sobre una evidencia, como los
   metadatos. Antes era un botón por fila en Evidencias, donde solo aparecía en .eml y .msg. */
window.labAnalizarCorreo=async()=>{
  const id=$('#lab-ev').value;
  if(!id){alert('Elige primero una evidencia en el desplegable.');return;}
  const e=EST.ev.find((x)=>x.id===id);
  if(!/\.(eml|msg)$/i.test(e.nombre)){
    alert(e.nombre+' no es un .eml ni un .msg, así que no se puede analizar como correo.');return;}
  await analizarEv(id);
};

window.labCargarEvidencia=async()=>{
  const id=$('#lab-ev').value;
  const eraBinario=!!LAB_BIN;
  LAB_BIN=null;LAB_ULTIMO=null;$('#lab-in').readOnly=false;
  if(eraBinario){$('#lab-in').value='';$('#lab-out').value='';}
  labDescribir();
  META=null;pintarMetadatos();
  if(!id){$('#lab-aviso').innerHTML='';return;}
  const e=EST.ev.find((x)=>x.id===id);
  if(!dirEv||!e.copiado){
    $('#lab-aviso').innerHTML='<div class="aviso rojo">Esa evidencia no se copió a la carpeta del caso, '+
      'así que no puede cargarse su contenido. Puedes seguir pegando texto a mano en Entrada.</div>';
    return;}
  try{
    const h=await resolverFichero(dirEv,e.archivo);
    const f=await h.getFile();
    if(f.size>4*1024*1024&&!confirm('La evidencia ocupa '+bytesTxt(f.size)+
      '. Solo se cargarán los primeros 4 MB en el laboratorio. ¿Continuar?'))return;
    const parcial=f.size>4*1024*1024;
    const buf=new Uint8Array(await f.slice(0,4*1024*1024).arrayBuffer());
    const cod=labCodificacionTexto(buf,parcial);
    $('#lab-out').value='';
    if(!cod){
      const firma=detectarFirma(buf);
      LAB_BIN={id,nombre:e.nombre,tipo:firma.t,bytes:buf,total:f.size,parcial};
      $('#lab-in').readOnly=true;
      $('#lab-in').value=volcadoHex(buf,4096)+(buf.length>4096?'\n…':'');
      $('#lab-aviso').innerHTML='<div class="aviso"><b>'+esc(e.nombre)+' es binario ('+esc(firma.t)+').</b> '+
        'Las operaciones se aplican a sus bytes reales; Entrada solo muestra un volcado de los primeros 4 KB y '+
        'no se puede editar. Sirven: '+esc(opsBinarias())+'.'+
        (/JPEG|PNG|GIF|TIFF|BMP|PDF|ZIP|OLE2|MZ/.test(firma.t)?' Para este tipo de fichero, lo más útil suele ser «Leer metadatos».':'')+
        (parcial?' Solo se han cargado los primeros 4 MB.':'')+'</div>';
      labDescribir();
      return;
    }
    $('#lab-in').value=new TextDecoder(cod).decode(buf);
    $('#lab-aviso').innerHTML=parcial
      ?'<div class="aviso">Cargados solo los primeros 4 MB de '+esc(e.nombre)+'.</div>':'';
  }catch(err){alert(explicarError(err,'evidencias/'+e.archivo));}
};

function labEjecutar(){
  const op=$('#lab-op').value;
  if(!op||op===OP_METADATOS||op===OP_CORREO)return {salida:$('#lab-out').value,op};
  if(LAB_BIN){
    const o=OPERACIONES[op];
    if(!o.b)return {salida:'',op,error:'«'+o.n+'» trabaja sobre texto y '+LAB_BIN.nombre+' es binario ('+
      LAB_BIN.tipo+'). Aplicarla exigiría decodificarlo como texto y el resultado ya no correspondería al fichero. '+
      'Con un binario sirven: '+opsBinarias()+'.'};
    try{ return {salida:o.b(LAB_BIN.bytes),op}; }
    catch(e){ return {salida:'',op,error:'«'+o.n+'» ha fallado: '+e.message}; }
  }
  const entrada=$('#lab-in').value;
  if(!entrada.trim())return {salida:'',op,error:'No hay nada en Entrada sobre lo que operar.'};
  try{ return {salida:OPERACIONES[op].f(entrada),op}; }
  catch(e){ return {salida:'',op,error:'«'+labOpNombre(op)+'» ha fallado: '+e.message}; }
}

function labPintarSalida(r){
  const s=r.salida||'';
  $('#lab-out').value=s.length>LAB_VISTA_MAX?s.slice(0,LAB_VISTA_MAX):s;
  $('#lab-aviso').innerHTML=r.error?`<div class="aviso rojo">${esc(r.error)}</div>`
    :s.length>LAB_VISTA_MAX?`<div class="aviso">El resultado tiene ${s.length.toLocaleString('es')} caracteres: se muestran los primeros `+
      `${LAB_VISTA_MAX.toLocaleString('es')}. <button class="secundario" onclick="labBajarSalida()">Descargar completo</button></div>`:'';
}
window.labBajarSalida=()=>{if(LAB_ULTIMO)bajar('laboratorio_resultado.txt',LAB_ULTIMO.salida,'text/plain;charset=utf-8');};

window.labEjecutarUI=async()=>{
  const op=$('#lab-op').value;
  if(!op){alert('Elige qué quieres hacer.');return;}
  if(op===OP_METADATOS){await labMetadatos();return;}
  if(op===OP_CORREO){await labAnalizarCorreo();return;}
  META=null;pintarMetadatos();
  $('#lab-aviso').innerHTML='<div class="aviso">Procesando…</div>';
  await ceder();   // deja pintar el aviso antes de bloquear el hilo con el cálculo
  const fuente=labFuente();
  const r=labEjecutar();
  LAB_ULTIMO=r.error?null:{op,fuente,salida:r.salida};
  labPintarSalida(r);
};

/* «Registrar en el expediente» se retiró de la interfaz: el laboratorio es un banco de pruebas.
   Los asientos LAB_TRANSFORMACION de casos anteriores se siguen leyendo y mostrando. La lectura de
   metadatos conserva su propio botón «Anotar la lectura». */

function pintarLab(){
  const sel=$('#lab-op');
  if(sel.innerHTML.length<10)
    sel.innerHTML='<option value="">Elige una operación…</option>'+
      `<option value="${OP_METADATOS}">Leer metadatos del fichero</option>`+
      `<option value="${OP_CORREO}">Analizar correo (.eml o .msg)</option>`+
      Object.entries(OPERACIONES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');
  const evs=EST.ev.filter((e)=>e.copiado), actual=$('#lab-ev').value;
  $('#lab-ev').innerHTML='<option value="">Sin evidencia: escribo el texto a mano</option>'+
    evs.map((e)=>`<option value="${esc(e.id)}"${e.id===actual?' selected':''}>${esc(e.id+' · '+e.nombre)}</option>`).join('');
  labDescribir();
}

