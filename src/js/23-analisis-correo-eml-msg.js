/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= análisis de correo (.eml y .msg) ================= */

/* ---------- utilidades binarias ---------- */
const u16=(v,o)=>v.getUint16(o,true), u32=(v,o)=>v.getUint32(o,true);

/* ---------- lector CFB / OLE2, el contenedor de los .msg ---------- */
function leerCFB(buf){
  const v=new DataView(buf), b=new Uint8Array(buf);
  if(b.length<512) throw new Error('El fichero es demasiado pequeño para ser un .msg valido.');
  const firma=[0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1];
  for(let i=0;i<8;i++) if(b[i]!==firma[i]) throw new Error('No es un contenedor OLE2 (.msg)');
  const tamSector=1<<u16(v,30), tamMini=1<<u16(v,32);
  if(tamSector<128||tamSector>65536||tamMini<8||tamMini>tamSector)
    throw new Error('Cabecera OLE2 con tamaños de sector no validos: el fichero esta corrupto.');
  const nSectores=Math.floor(b.length/tamSector);
  const nFat=u32(v,44), dirIni=u32(v,48), corteMini=u32(v,56);
  const miniFatIni=u32(v,60), nMiniFat=u32(v,64);
  const difatIni=u32(v,68), nDifat=u32(v,72);
  const desp=(s)=>(s+1)*tamSector;

  // DIFAT: 109 entradas en la cabecera y el resto encadenadas
  const difat=[];
  for(let i=0;i<109;i++){const s=u32(v,76+i*4); if(s<0xFFFFFFFA)difat.push(s);}
  let sec=difatIni, restan=nDifat;
  while(sec<0xFFFFFFFA&&restan-->0){
    if(desp(sec)+tamSector>b.length)break;
    const base=desp(sec), porSector=(tamSector/4)-1;
    for(let i=0;i<porSector;i++){const s=u32(v,base+i*4); if(s<0xFFFFFFFA)difat.push(s);}
    sec=u32(v,base+porSector*4);
  }
  // FAT
  const fat=new Uint32Array(difat.length*(tamSector/4));
  let k=0;
  for(const s of difat.slice(0,Math.max(nFat,difat.length))){
    const base=desp(s);
    if(base+tamSector>b.length)break;
    for(let i=0;i<tamSector/4;i++) fat[k++]=u32(v,base+i*4);
  }
  const cadena=(ini,tabla,tope)=>{const c=[],vistos=new Set();let s=ini;
    const limite=tope||nSectores;
    while(s<0xFFFFFFFA){
      if(s>=limite||vistos.has(s))break;   // fuera de la tabla o bucle en la cadena
      vistos.add(s);c.push(s);s=tabla?tabla[s]:0xFFFFFFFE;
      if(s===undefined)break;
    }
    return c;};
  const juntar=(secs,tam,base)=>{
    const out=new Uint8Array(tam);let p=0;
    for(const s of secs){
      const ini=base?base(s):desp(s);
      const n=Math.min(tam-p,base?tamMini:tamSector,Math.max(0,b.length-ini));
      if(n<=0)break;
      out.set(b.subarray(ini,ini+n),p);p+=n;
    }
    return out;};

  // directorio
  if(desp(dirIni)+tamSector>b.length)
    throw new Error('El directorio del contenedor apunta fuera del fichero: el .msg esta truncado o corrupto.');
  const dirSecs=cadena(dirIni,fat);
  const entradas=[];
  for(const s of dirSecs){
    for(let e=0;e<tamSector/128;e++){
      const o=desp(s)+e*128;
      if(o+128>b.length)break;
      const tipo=b[o+66];
      if(tipo!==1&&tipo!==2&&tipo!==5)continue;      // entrada libre o basura
      const largo=Math.min(u16(v,o+64),64);          // el campo de nombre son 64 bytes, ni uno mas
      if(largo<2)continue;
      let n='';
      for(let i=0;i<largo-2;i+=2) n+=String.fromCharCode(u16(v,o+i));
      const tam=u32(v,o+120)+u32(v,o+124)*4294967296;
      if(tam>b.length)continue;                      // flujo mayor que el propio fichero
      entradas.push({nombre:n,tipo,inicio:u32(v,o+116),tam});
    }
  }
  const raiz=entradas.find((e)=>e.tipo===5);
  // mini-FAT y mini-flujo
  let miniFat=null,miniFlujo=null;
  if(raiz&&raiz.tam>0&&nMiniFat>0){
    const mfSecs=cadena(miniFatIni,fat);
    miniFat=new Uint32Array(mfSecs.length*(tamSector/4));
    let j=0;
    for(const s of mfSecs){const base=desp(s);
      if(base+tamSector>b.length)break;
      for(let i=0;i<tamSector/4;i++) miniFat[j++]=u32(v,base+i*4);}
    miniFlujo=juntar(cadena(raiz.inicio,fat),raiz.tam);
  }
  const leer=(e)=>{
    if(e.tam===0)return new Uint8Array(0);
    if(e.tam<corteMini&&miniFlujo){
      const c=cadena(e.inicio,miniFat,miniFat.length),out=new Uint8Array(e.tam);let p=0;
      for(const s of c){const n=Math.min(e.tam-p,tamMini);
        if(n<=0)break;out.set(miniFlujo.subarray(s*tamMini,s*tamMini+n),p);p+=n;}
      return out;
    }
    return juntar(cadena(e.inicio,fat),e.tam);
  };
  return {entradas,leer};
}

/* ---------- .msg: propiedades MAPI dentro del CFB ---------- */
function leerMSG(buf){
  const cfb=leerCFB(buf);
  const prop=(etiqueta)=>{
    for(const t of ['001F','001E','0102']){
      const e=cfb.entradas.find((x)=>x.tipo===2&&
        x.nombre.toUpperCase()==='__SUBSTG1.0_'+etiqueta+t);
      if(e){const d=cfb.leer(e);
        if(t==='001F')return new TextDecoder('utf-16le').decode(d);
        if(t==='001E')return new TextDecoder('windows-1252').decode(d);
        return d;}
    }
    return null;
  };
  const cabeceras=prop('007D');
  const cuerpo=prop('1000');
  const htmlBruto=prop('1013');
  const html=htmlBruto&&htmlBruto.byteLength?new TextDecoder('utf-8').decode(htmlBruto):'';
  const adjuntos=cfb.entradas.filter((e)=>e.tipo===2&&
      /^__SUBSTG1\.0_3707(001F|001E)$/i.test(e.nombre))
    .map((e)=>({nombre:e.nombre.toUpperCase().endsWith('001F')
      ?new TextDecoder('utf-16le').decode(cfb.leer(e))
      :new TextDecoder('windows-1252').decode(cfb.leer(e)),bytes:null}));
  if(!cabeceras&&!cuerpo&&!html)
    throw new Error('El .msg no contiene cabeceras de transporte ni cuerpo legibles. '+
      'Suele ocurrir con borradores y con elementos enviados. Reenvia el mensaje como adjunto '+
      'o guardalo como .eml desde Outlook (Archivo, Guardar como, tipo Formato de correo).');
  return {cabecerasCrudas:cabeceras||'',texto:cuerpo||'',html,
    adjuntos,asunto:prop('0037')||'',remitente:prop('0C1F')||prop('5D01')||''};
}

/* ---------- .eml: cabeceras y MIME ---------- */
function decodificarPalabras(t){
  return String(t).replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g,(_,cs,cod,dato)=>{
    try{
      let bytes;
      if(cod.toUpperCase()==='B'){
        const bin=atob(dato.replace(/\s/g,''));
        bytes=Uint8Array.from(bin,(c)=>c.charCodeAt(0));
      }else{
        const s=dato.replace(/_/g,' ').replace(/=([0-9A-Fa-f]{2})/g,
          (_m,h)=>String.fromCharCode(parseInt(h,16)));
        bytes=Uint8Array.from(s,(c)=>c.charCodeAt(0));
      }
      return new TextDecoder(cs.toLowerCase()).decode(bytes);
    }catch(e){return _;}
  }).replace(/\?=\s+=\?/g,'?==?');
}

function partirCabeceras(txt){
  const corte=txt.search(/\r?\n\r?\n/);
  // El tope solo recorta lo que se ANALIZA como cabeceras; el cuerpo se conserva entero.
  const bloque=(corte<0?txt:txt.slice(0,corte)).slice(0,CAB_MAX);
  const cuerpo=corte<0?'':txt.slice(corte).replace(/^\r?\n\r?\n/,'');
  const lineas=bloque.split(/\r?\n/), cab=[];
  for(const l of lineas){
    if(/^[ \t]/.test(l)&&cab.length){cab[cab.length-1].valor+=' '+l.trim();continue;}
    const i=l.indexOf(':');
    if(i>0)cab.push({nombre:l.slice(0,i).trim(),valor:l.slice(i+1).trim()});
  }
  return {cab,cuerpo};
}

const buscarCab=(cab,n)=>{const e=cab.find((c)=>c.nombre.toLowerCase()===n.toLowerCase());
  return e?e.valor:'';};
const todasCab=(cab,n)=>cab.filter((c)=>c.nombre.toLowerCase()===n.toLowerCase()).map((c)=>c.valor);

function decodificarCuerpo(txt,cod,charset){
  try{
    let bytes;
    if(/base64/i.test(cod)){
      const bin=atob(txt.replace(/[^A-Za-z0-9+/=]/g,''));
      bytes=Uint8Array.from(bin,(c)=>c.charCodeAt(0));
    }else if(/quoted-printable/i.test(cod)){
      const s=txt.replace(/=\r?\n/g,'').replace(/=([0-9A-Fa-f]{2})/g,
        (_m,h)=>String.fromCharCode(parseInt(h,16)));
      bytes=Uint8Array.from(s,(c)=>c.charCodeAt(0)&0xff);
    }else{
      return txt;
    }
    return new TextDecoder((charset||'utf-8').toLowerCase()).decode(bytes);
  }catch(e){return txt;}
}

function recorrerMIME(cab,cuerpo,salida,profundidad=0){
  if(profundidad>32)throw new Error('MIME_PROFUNDIDAD_MAXIMA');
  const ct=buscarCab(cab,'content-type')||'text/plain';
  const cod=buscarCab(cab,'content-transfer-encoding');
  const disp=buscarCab(cab,'content-disposition');
  const charset=(ct.match(/charset="?([^;"\s]+)/i)||[])[1];
  const nombre=(disp.match(/filename\*?="?([^;"]+)/i)||ct.match(/name="?([^;"]+)/i)||[])[1];

  if(/^multipart\//i.test(ct)){
    const b=(ct.match(/boundary="?([^;"]+)"?/i)||[])[1];
    if(!b){salida.textos.push(cuerpo);return;}
    const partes=cuerpo.split(new RegExp('\\r?\\n?--'+b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    for(const p of partes.slice(1)){
      if(/^--/.test(p.trim()))break;
      const sub=partirCabeceras(p.replace(/^\r?\n/,''));
      recorrerMIME(sub.cab,sub.cuerpo,salida,profundidad+1);
    }
    return;
  }
  if(nombre||/attachment/i.test(disp)){
    salida.adjuntos.push({nombre:decodificarPalabras(nombre||'sin nombre'),
      tipo:ct.split(';')[0].trim(),bytes:Math.round(cuerpo.replace(/\s/g,'').length*
        (/base64/i.test(cod)?0.75:1))});
    return;
  }
  const texto=decodificarCuerpo(cuerpo,cod,charset);
  if(/^text\/html/i.test(ct))salida.htmls.push(texto);
  else salida.textos.push(texto);
}

function leerEML(txt){
  const {cab,cuerpo}=partirCabeceras(txt);
  const salida={textos:[],htmls:[],adjuntos:[]};
  recorrerMIME(cab,cuerpo,salida);
  return {cab,texto:salida.textos.join('\n'),html:salida.htmls.join('\n'),
    adjuntos:salida.adjuntos};
}

/* ---------- extracción de indicadores ---------- */
// {1,2048}: una sola «URL» de varios MB (cadena sin espacios) tardaba segundos en procesarse
// y no es una URL utilizable. Se corta ahí y se avisa.
const RE_URL=/\b(?:https?|ftps?):\/\/[^\s"'<>()\[\]{}]{1,2048}/gi;
const RE_WWW=/(?:https?:\/\/)?(?:www\.)?(?:[A-Za-z0-9-]{1,63}\.){1,8}[A-Za-z]{2,24}(?::\d{1,5})?(?:\/[^\s<>]{0,4096})?/gi;
const RE_IP=/\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
const RE_MAIL=/[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9-]{1,63}\.){1,8}[A-Za-z]{2,24}(?![A-Za-z0-9-])/g;
const ACORTADORES=['bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','is.gd','buff.ly',
  'rebrand.ly','cutt.ly','shorturl.at','rb.gy','lnkd.in','tiny.cc'];
const EXT_RIESGO=['exe','scr','com','pif','bat','cmd','js','jse','vbs','vbe','wsf','wsh',
  'hta','jar','ps1','msi','lnk','iso','img','vhd','reg','dll','docm','xlsm','pptm','xll','one'];

const esPrivada=(ip)=>{const p=ip.split('.').map(Number);
  return p[0]===10||p[0]===127||(p[0]===192&&p[1]===168)||
    (p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===169&&p[1]===254)||p[0]===0;};

const defang=(s)=>String(s).replace(/^http/i,'hxxp').replace(/\./g,'[.]').replace(/@/g,'[@]');
const dominioDe=(u)=>{try{return new URL(u.startsWith('http')?u:'http://'+u).hostname;}
  catch(e){return (u.match(/^(?:https?:\/\/)?([^/:\s]+)/i)||[])[1]||u;}};

/* Tope de la zona de cabeceras. Un mensaje legítimo no llega a 1 MB de cabeceras; sin tope, un
   fichero con 5 MB en una sola cabecera (o 200.000 cabeceras) tardaba segundos en procesarse. */
const CAB_MAX=1024*1024;
function analizarCorreo(nombreFichero,datos){
  const esMsg=/\.msg$/i.test(nombreFichero);
  let msg;
  if(esMsg){
    const m=leerMSG(datos.buffer||datos);
    const {cab}=partirCabeceras(m.cabecerasCrudas+'\n\n');
    msg={cab,texto:m.texto,html:m.html,adjuntos:m.adjuntos,
      sinCabeceras:!m.cabecerasCrudas,asunto:m.asunto};
  }else{
    msg=leerEML(new TextDecoder('utf-8').decode(datos));
  }
  const cab=msg.cab;
  const val=(n)=>decodificarPalabras(buscarCab(cab,n));
  const cabRecortada=!esMsg&&(datos.length>CAB_MAX)&&(new TextDecoder('utf-8').decode(datos.subarray(0,CAB_MAX)).search(/\r?\n\r?\n/)<0);

  // cadena Received, del más antiguo al más reciente
  const recibidos=todasCab(cab,'received').slice().reverse().map((r,i)=>{
    const de=(r.match(/from\s+([^\s;()]+)/i)||[])[1]||'';
    const por=(r.match(/\bby\s+([^\s;()]+)/i)||[])[1]||'';
    const ips=(r.match(RE_IP)||[]);
    const fecha=(r.split(';').pop()||'').trim();
    const t=Date.parse(fecha);
    return {salto:i+1,de,por,ips,fecha,t:isNaN(t)?null:t,crudo:r};
  });
  for(let i=1;i<recibidos.length;i++){
    const a=recibidos[i-1].t,b=recibidos[i].t;
    recibidos[i].demora=(a&&b)?Math.round((b-a)/1000):null;
  }

  // autenticación
  const autRaw=todasCab(cab,'authentication-results')
    .concat(todasCab(cab,'arc-authentication-results')).join(' ; ');
  const sacar=(k)=>{const m=autRaw.match(new RegExp(k+'=([a-z]+)','i'));return m?m[1].toLowerCase():null;};
  const auten={spf:sacar('spf'),dkim:sacar('dkim'),dmarc:sacar('dmarc'),
    recibidoSpf:(buscarCab(cab,'received-spf').match(/^\s*(\w+)/)||[])[1]||null};

  // texto sobre el que buscar indicadores
  const doc=msg.html?new DOMParser().parseFromString(msg.html,'text/html'):null;
  const textoHtml=doc?(doc.body?doc.body.textContent:''):'';
  const todo=[msg.texto,textoHtml].join('\n');
  const crudoCab=cab.map((c)=>c.nombre+': '+c.valor).join('\n');

  // URLs
  const urls=new Map();
  const meterUrl=(u,origen,textoAncla)=>{
    u=u.replace(/[.,;:)\]"'>]+$/,'');
    if(!u||u.length>2000)return;
    const clave=u.toLowerCase();
    if(!urls.has(clave))urls.set(clave,{url:u,dominio:dominioDe(u),origenes:new Set(),anclas:new Set()});
    urls.get(clave).origenes.add(origen);
    if(textoAncla)urls.get(clave).anclas.add(textoAncla);
  };
  (msg.texto.match(RE_URL)||[]).forEach((u)=>meterUrl(u,'cuerpo texto'));
  (msg.texto.match(RE_WWW)||[]).forEach((u)=>meterUrl(u,'cuerpo texto'));
  if(doc){
    doc.querySelectorAll('a[href]').forEach((a)=>
      meterUrl(a.getAttribute('href'),'enlace HTML',(a.textContent||'').trim().slice(0,120)));
    doc.querySelectorAll('img[src]').forEach((i)=>meterUrl(i.getAttribute('src'),'imagen remota'));
    (textoHtml.match(RE_URL)||[]).forEach((u)=>meterUrl(u,'cuerpo HTML'));
  }
  const listaUrls=[...urls.values()].map((u)=>{
    const avisos=[];
    const host=u.dominio||'';
    if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))avisos.push('destino es una IP');
    if(/^xn--/i.test(host)||/\.xn--/i.test(host))avisos.push('dominio punycode');
    if(ACORTADORES.includes(host.toLowerCase()))avisos.push('acortador');
    if(/^http:/i.test(u.url))avisos.push('sin cifrar');
    if(/@/.test(u.url.replace(/^https?:\/\//i,'').split('/')[0]))avisos.push('usuario en la URL');
    for(const t of u.anclas){
      const th=dominioDe(t);
      if(/^(?:https?:\/\/|www\.)/i.test(t)&&th&&host&&th.toLowerCase()!==host.toLowerCase())
        avisos.push('el texto del enlace apunta a '+th);
    }
    return {...u,origenes:[...u.origenes],anclas:[...u.anclas],avisos};
  });

  // IPs
  const ips=new Map();
  const meterIp=(ip,origen)=>{
    if(!ips.has(ip))ips.set(ip,{ip,privada:esPrivada(ip),origenes:new Set()});
    ips.get(ip).origenes.add(origen);
  };
  recibidos.forEach((r)=>r.ips.forEach((ip)=>meterIp(ip,'cadena Received (salto '+r.salto+')')));
  ['x-originating-ip','x-sender-ip','x-originating-email','x-source-ip'].forEach((h)=>{
    (buscarCab(cab,h).match(RE_IP)||[]).forEach((ip)=>meterIp(ip,h));});
  (todo.match(RE_IP)||[]).forEach((ip)=>meterIp(ip,'cuerpo'));
  const listaIps=[...ips.values()].map((i)=>({...i,origenes:[...i.origenes]}));

  // servidores de la cadena
  const servidores=[...new Set(recibidos.flatMap((r)=>[r.de,r.por]).filter(Boolean))];

  // direcciones. Message-ID, References e In-Reply-To tienen forma de dirección
  // (<id@dominio>) pero no lo son: sin quitarlas, cada identificador de mensaje salía como IOC.
  const cabSinIds=crudoCab.replace(/^(message-id|references|in-reply-to|thread-index|x-ms-exchange-[\w-]*)[ \t]*:.*(\r?\n[ \t].*)*/gim,'');
  const correos=[...new Set((cabSinIds+'\n'+todo).match(RE_MAIL)||[])];

  // adjuntos
  const adjuntos=msg.adjuntos.map((a)=>{
    const partes=String(a.nombre).toLowerCase().split('.');
    const ext=partes.length>1?partes.pop():'';
    const avisos=[];
    if(EXT_RIESGO.includes(ext))avisos.push('extensión ejecutable o con macros');
    if(partes.length>1&&EXT_RIESGO.includes(partes[partes.length-1]))avisos.push('doble extensión');
    if(/\u202E/.test(a.nombre))avisos.push('carácter de inversión de texto (RLO)');
    return {...a,ext,avisos};
  });

  // discrepancias de identidad
  const dom=(s)=>{const m=String(s).match(/@([A-Za-z0-9.-]+)/);return m?m[1].toLowerCase():'';};
  const de=val('from'), responderA=val('reply-to'), retorno=val('return-path');
  const indicios=[];
  if(retorno&&dom(retorno)&&dom(de)&&dom(retorno)!==dom(de))
    indicios.push('Return-Path ('+dom(retorno)+') no coincide con From ('+dom(de)+')');
  if(cabRecortada)indicios.push('la zona de cabeceras supera 1 MB sin línea en blanco: '+
    'se han analizado solo las primeras, el fichero puede estar mal formado o manipulado');
  if(responderA&&dom(responderA)&&dom(de)&&dom(responderA)!==dom(de))
    indicios.push('Reply-To ('+dom(responderA)+') no coincide con From ('+dom(de)+')');
  const nombreVisible=de.replace(/<[^>]*>/,'');
  const correoEnNombre=(nombreVisible.match(RE_MAIL)||[])[0];
  if(correoEnNombre&&dom(correoEnNombre)&&dom(de)&&dom(correoEnNombre)!==dom(de))
    indicios.push('el nombre visible muestra '+correoEnNombre+' pero la dirección real es de '+dom(de));
  if(auten.spf&&auten.spf!=='pass')indicios.push('SPF: '+auten.spf);
  if(auten.dkim&&auten.dkim!=='pass')indicios.push('DKIM: '+auten.dkim);
  if(auten.dmarc&&auten.dmarc!=='pass')indicios.push('DMARC: '+auten.dmarc);
  if(!autEsPresente(autRaw))indicios.push('sin cabecera Authentication-Results: no se puede valorar SPF/DKIM/DMARC desde el propio mensaje');

  return {
    esMsg, sinCabeceras:!!msg.sinCabeceras,
    resumen:{
      de,paraQuien:val('to'),copia:val('cc'),responderA,retorno,
      asunto:val('subject')||msg.asunto||'',fecha:val('date'),
      messageId:val('message-id'),mailer:val('x-mailer')||val('user-agent'),
      saltos:recibidos.length},
    auten,recibidos,urls:listaUrls,ips:listaIps,servidores,correos,adjuntos,indicios,
    cabeceras:cab};
}
const autEsPresente=(s)=>!!(s&&s.trim());

/* ---------- panel ---------- */
let ANALISIS=null;

window.analizarEv=async function(id){
  const e=EST.ev.find((x)=>x.id===id);
  if(!dirEv||!e.copiado){alert('Esta evidencia no se copió a la carpeta, no se puede analizar.');return;}
  let datos;
  try{
    const archivoTrabajo=await asegurarCopiaTrabajo(e);
    const fTrabajo=await (await resolverFichero(dirEv,archivoTrabajo)).getFile();
    datos=new Uint8Array(await fTrabajo.arrayBuffer());
  }catch(err){alert(explicarError(err,'evidencias/'+e.archivo));return;}
  // Extraer indicadores recorre todo el cuerpo con varias expresiones regulares: en un fichero de
  // decenas de MB (que ya no es un correo normal) eso bloquea el hilo varios segundos.
  if(datos.length>32*1024*1024&&!confirm(e.nombre+' ocupa '+bytesTxt(datos.length)+', mucho más que un '+
    'correo normal. Analizarlo puede dejar la aplicación sin responder un rato. ¿Continuar?'))return;
  let a;
  try{ a=analizarCorreo(e.nombre,datos); }
  catch(err){ alert('No se ha podido analizar '+e.nombre+':\n\n'+err.message); return; }
  ANALISIS={id,nombre:e.nombre,...a};
  abrirPanelGenerico();
  pintarAnalisis();
  $('#panel').classList.remove('oculto');
  try{
    // se guardan los indicadores extraidos, no solo el recuento: son la materia prima
    // del apartado de indicadores y deben quedar atados a la evidencia de la que salen
    const iocs=[];
    const meter=(t,v,c)=>{if(v&&iocs.length<300)iocs.push({t,v:String(v),c});};
    a.urls.forEach((u)=>{meter('url',u.url,u.origenes.join(', '));meter('dominio',u.dominio,'host de una URL');});
    a.ips.forEach((i)=>{if(!i.privada)meter('ipv4',i.ip,i.origenes.join(', '));});
    a.servidores.forEach((sv)=>meter('servidor',sv,'cadena Received'));
    a.correos.forEach((c)=>meter('correo',c,'cabeceras o cuerpo'));
    a.adjuntos.forEach((x)=>meter('adjunto',x.nombre,x.avisos.join('; ')||'adjunto del mensaje'));
    await anotar('EVIDENCIA_ANALIZADA',{id,urls:a.urls.length,ips:a.ips.length,
      adjuntos:a.adjuntos.length,indicios:a.indicios.length,iocs});
  }catch(err){/* el análisis se muestra igual aunque no pueda anotarse */}
};

$('#panel-cerrar').onclick=()=>$('#panel').classList.add('oculto');
$('#panel-cerrar-x').onclick=()=>$('#panel').classList.add('oculto');
$('#panel').onclick=(ev)=>{if(ev.target===$('#panel'))$('#panel').classList.add('oculto');};
document.addEventListener('keydown',(ev)=>{
  if(ev.key==='Escape'&&!$('#panel').classList.contains('oculto'))$('#panel').classList.add('oculto');});

const filaAviso=(av)=>av.length?`<div class="avisos">${av.map((x)=>
  `<span class="est mal">${esc(textoTag(x))}</span>`).join(' ')}</div>`:'';

function pintarAnalisis(){
  const a=ANALISIS;
  const r=a.resumen;
  const marcaAut=(v)=>v?`<span class="est ${v==='pass'?'ok':v==='none'?'pend':'mal'}">${esc(textoTag(v))}</span>`
    :'<span class="est pend">Ausente</span>';

  let h=`<div class="panel-cab">
      <div><h2>Análisis de correo</h2>
        <div class="sub">${esc(a.nombre)} · ${esc(a.id)}${a.esMsg?' · formato .msg':' · formato .eml'}</div></div>
      <div style="display:flex;gap:8px">
        <button class="secundario" onclick="copiarIocs()">Copiar IOC</button>
        <button class="secundario" onclick="descargarIocs()">${icono('csv')}IOC en CSV</button>
      </div></div>`;

  if(a.sinCabeceras)h+=`<div class="aviso">El .msg no incluía cabeceras de transporte, así que la
    cadena Received y la autenticación no están disponibles. El análisis se limita al cuerpo y a los adjuntos.</div>`;

  if(a.indicios.length)h+=`<div class="aviso rojo"><b>Indicios para revisar</b><ul style="margin:6px 0 0 18px">
    ${a.indicios.map((i)=>`<li>${esc(i)}</li>`).join('')}</ul></div>`;

  h+=`<h3>Cabeceras principales</h3><table><tbody>`+
    [['De',r.de],['Para',r.paraQuien],['Copia',r.copia],['Responder a',r.responderA],
     ['Return-Path',r.retorno],['Asunto',r.asunto],['Fecha',r.fecha],
     ['Message-ID',r.messageId],['Cliente de correo',r.mailer]]
    .filter((f)=>f[1]).map((f)=>`<tr><th style="width:170px">${f[0]}</th>
      <td class="desenlace">${esc(f[1])}</td></tr>`).join('')+`</tbody></table>`;

  h+=`<h3>Autenticación</h3><table><thead><tr><th>SPF</th><th>DKIM</th><th>DMARC</th>
    <th>Received-SPF</th></tr></thead><tbody><tr>
    <td>${marcaAut(a.auten.spf)}</td><td>${marcaAut(a.auten.dkim)}</td>
    <td>${marcaAut(a.auten.dmarc)}</td><td>${marcaAut(a.auten.recibidoSpf)}</td>
    </tr></tbody></table>
    <p class="ayuda" style="margin-top:8px">Estos valores los escribió el servidor receptor. Solo son
    fiables si confías en la infraestructura que los añadió; no se han comprobado aquí.</p>`;

  if(a.recibidos.length){
    h+=`<h3>Cadena de entrega (${a.recibidos.length} saltos, del origen al destino)</h3>
      <table><thead><tr><th>Salto</th><th>De</th><th>Por</th><th>IP</th><th>Fecha</th><th>Demora</th></tr></thead><tbody>`+
      a.recibidos.map((x)=>`<tr><td class="idcol">${x.salto}</td>
        <td class="mono">${esc(x.de||'—')}</td><td class="mono">${esc(x.por||'—')}</td>
        <td class="mono">${x.ips.map(esc).join('<br>')||'—'}</td>
        <td class="mono">${esc(x.fecha||'—')}</td>
        <td class="mono">${x.demora==null?'—':x.demora+' s'}</td></tr>`).join('')+`</tbody></table>`;
  }

  h+=`<h3>URLs (${a.urls.length})</h3>`;
  h+=a.urls.length?`<table><thead><tr><th>URL (neutralizada)</th><th>Dominio</th>
    <th>Dónde aparece</th><th>Observaciones</th></tr></thead><tbody>`+
    a.urls.map((u)=>`<tr><td class="mono">${esc(defang(u.url))}</td>
      <td class="mono">${esc(u.dominio)}</td>
      <td class="sub">${u.origenes.map(esc).join(', ')}
        ${u.anclas.length?`<div class="sub">texto: ${esc(u.anclas.join(' / ').slice(0,120))}</div>`:''}</td>
      <td>${filaAviso(u.avisos)||'<span class="sub">—</span>'}</td></tr>`).join('')+
    `</tbody></table>`:'<div class="vacio">No se han encontrado URLs.</div>';

  h+=`<h3>Direcciones IP (${a.ips.length})</h3>`;
  h+=a.ips.length?`<table><thead><tr><th>IP</th><th>Ámbito</th><th>Dónde aparece</th></tr></thead><tbody>`+
    a.ips.map((i)=>`<tr><td class="mono">${esc(defang(i.ip))}</td>
      <td><span class="est ${i.privada?'pend':'curso'}">${i.privada?'Privada':'Pública'}</span></td>
      <td class="sub">${i.origenes.map(esc).join(', ')}</td></tr>`).join('')+
    `</tbody></table>`:'<div class="vacio">No se han encontrado direcciones IP.</div>';

  if(a.servidores.length)h+=`<h3>Servidores implicados (${a.servidores.length})</h3>
    <table><tbody>${a.servidores.map((s)=>
      `<tr><td class="mono">${esc(defang(s))}</td></tr>`).join('')}</tbody></table>`;

  h+=`<h3>Adjuntos (${a.adjuntos.length})</h3>`;
  h+=a.adjuntos.length?`<table><thead><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th>
    <th>Observaciones</th></tr></thead><tbody>`+
    a.adjuntos.map((x)=>`<tr><td>${esc(x.nombre)}</td><td class="sub">${esc(x.tipo||'—')}</td>
      <td class="mono">${x.bytes?bytesTxt(x.bytes):'—'}</td>
      <td>${filaAviso(x.avisos)||'<span class="sub">—</span>'}</td></tr>`).join('')+
    `</tbody></table>`:'<div class="vacio">El mensaje no lleva adjuntos.</div>';

  if(a.correos.length)h+=`<h3>Direcciones de correo (${a.correos.length})</h3>
    <ul class="mono lista-valores">${a.correos.map((c)=>`<li>${esc(defang(c))}</li>`).join('')}</ul>`;

  h+=`<h3>Cabeceras completas</h3><details><summary class="secundario"
      style="display:inline-block;margin-bottom:8px">Ver las ${a.cabeceras.length} cabeceras</summary>
    <pre class="crudo">${esc(a.cabeceras.map((c)=>c.nombre+': '+c.valor).join('\n'))}</pre></details>`;

  $('#panel-cuerpo').innerHTML=h;
}

function iocsPlanos(){
  const f=[['tipo','indicador','contexto']];
  ANALISIS.urls.forEach((u)=>f.push(['url',u.url,u.origenes.join(' ')+(u.avisos.length?' | '+u.avisos.join('; '):'')]));
  ANALISIS.ips.forEach((i)=>f.push(['ipv4',i.ip,(i.privada?'privada':'pública')+' | '+i.origenes.join(' ')]));
  [...new Set(ANALISIS.urls.map((u)=>u.dominio))].forEach((d)=>d&&f.push(['dominio',d,'de una URL del mensaje']));
  ANALISIS.servidores.forEach((s)=>f.push(['servidor',s,'cadena Received']));
  ANALISIS.correos.forEach((c)=>f.push(['correo',c,'cabeceras o cuerpo']));
  ANALISIS.adjuntos.forEach((a)=>f.push(['adjunto',a.nombre,a.avisos.join('; ')]));
  return f;
}
window.copiarIocs=()=>{
  const t=iocsPlanos().slice(1).map((f)=>f[0]+'\t'+f[1]).join('\n');
  navigator.clipboard.writeText(t).then(
    ()=>alert('Indicadores copiados sin neutralizar, listos para pegar en la tabla de IOC del informe.'),
    ()=>alert('El navegador ha bloqueado el portapapeles. Usa el CSV.'));
};
window.descargarIocs=()=>bajar('ioc_'+ANALISIS.id+'.csv',csv(iocsPlanos()),'text/csv');

