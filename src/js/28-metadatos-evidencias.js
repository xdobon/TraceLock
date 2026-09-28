/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= metadatos de evidencias ================= */

const FIRMAS=[
 {b:[0xFF,0xD8,0xFF],t:'JPEG',ext:['jpg','jpeg','jpe']},
 {b:[0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A],t:'PNG',ext:['png']},
 {b:[0x47,0x49,0x46,0x38],t:'GIF',ext:['gif']},
 {b:[0x42,0x4D],t:'BMP',ext:['bmp']},
 {b:[0x49,0x49,0x2A,0x00],t:'TIFF (little endian)',ext:['tif','tiff']},
 {b:[0x4D,0x4D,0x00,0x2A],t:'TIFF (big endian)',ext:['tif','tiff']},
 {b:[0x25,0x50,0x44,0x46],t:'PDF',ext:['pdf']},
 {b:[0x50,0x4B,0x03,0x04],t:'ZIP o formato basado en ZIP',
  ext:['zip','docx','xlsx','pptx','odt','ods','odp','jar','apk','epub','vsdx']},
 {b:[0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1],t:'OLE2 (Office antiguo o .msg)',
  ext:['doc','xls','ppt','msg','vsd','db']},
 {b:[0x4D,0x5A],t:'Ejecutable de Windows (MZ/PE)',ext:['exe','dll','sys','scr','ocx','cpl','msi']},
 {b:[0x7F,0x45,0x4C,0x46],t:'Ejecutable ELF',ext:['elf','so','bin']},
 {b:[0x52,0x61,0x72,0x21,0x1A,0x07],t:'RAR',ext:['rar']},
 {b:[0x37,0x7A,0xBC,0xAF,0x27,0x1C],t:'7-Zip',ext:['7z']},
 {b:[0x1F,0x8B,0x08],t:'GZIP',ext:['gz','tgz']},
 {b:[0x75,0x73,0x74,0x61,0x72],t:'TAR',ext:['tar'],off:257},
 {b:[0xCA,0xFE,0xBA,0xBE],t:'Clase Java',ext:['class']},
 {b:[0x53,0x51,0x4C,0x69,0x74,0x65],t:'Base de datos SQLite',ext:['sqlite','db','sqlite3']},
 {b:[0x52,0x49,0x46,0x46],t:'RIFF (WAV, AVI o WebP)',ext:['wav','avi','webp']},
];

function detectarFirma(b){
  for(const f of FIRMAS){
    const o=f.off||0;
    if(b.length<o+f.b.length)continue;
    let ok=true;
    for(let i=0;i<f.b.length;i++)if(b[o+i]!==f.b[i]){ok=false;break;}
    if(ok)return f;
  }
  const cabecera=new TextDecoder('latin1').decode(b.subarray(0,2048));
  if(/^(Received|From|Return-Path|Message-ID|MIME-Version|Delivered-To):/im.test(cabecera))
    return {t:'Mensaje de correo RFC 5322',ext:['eml','msg','txt']};
  if(/^\s*[{[]/.test(cabecera))return {t:'JSON o texto estructurado',ext:['json','jsonl','txt']};
  if(/^\s*<\?xml|^\s*<html/i.test(cabecera))return {t:'XML o HTML',ext:['xml','html','htm','svg']};
  let imprimibles=0;
  const n=Math.min(b.length,4096);
  for(let i=0;i<n;i++){const c=b[i];if(c===9||c===10||c===13||(c>=32&&c<127))imprimibles++;}
  if(n&&imprimibles/n>0.92)return {t:'Texto plano',ext:['txt','csv','log','md','jsonl','eml']};
  return {t:'Sin identificar',ext:[]};
}

function entropia(b){
  const n=Math.min(b.length,1048576);
  if(!n)return 0;
  const h=new Uint32Array(256);
  for(let i=0;i<n;i++)h[b[i]]++;
  let e=0;
  for(let i=0;i<256;i++){if(!h[i])continue;const p=h[i]/n;e-=p*Math.log2(p);}
  return e;
}

/* ---------- EXIF de JPEG y TIFF ---------- */
const EXIF_TAGS={0x010F:'Fabricante',0x0110:'Modelo',0x0112:'Orientación',
 0x0131:'Aplicación de origen',0x0132:'Fecha de última modificación',0x013B:'Creado por',
 0x010E:'Descripción',0x8298:'Copyright',0x9003:'Fecha de captura',
 0x9004:'Fecha de digitalización',0xA002:'Ancho',0xA003:'Alto',0x829A:'Tiempo de exposición',
 0x920A:'Distancia focal',0x8827:'ISO',0x0100:'Ancho',0x0101:'Alto',0xA430:'Propietario de la cámara',
 0xA433:'Fabricante del objetivo',0xA434:'Objetivo',0xC614:'Modelo único'};

function leerExif(b){
  let off=-1;
  if(b[0]===0xFF&&b[1]===0xD8){
    let p=2;
    while(p+4<b.length){
      if(b[p]!==0xFF)break;
      const marca=b[p+1], largo=(b[p+2]<<8)|b[p+3];
      if(marca===0xE1&&new TextDecoder('latin1').decode(b.subarray(p+4,p+8))==='Exif'){off=p+10;break;}
      if(marca===0xDA)break;
      p+=2+largo;
    }
  }else if((b[0]===0x49&&b[1]===0x49)||(b[0]===0x4D&&b[1]===0x4D))off=0;
  if(off<0||off+8>b.length)return null;

  const le=b[off]===0x49;
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const u16=(o)=>v.getUint16(o,le), u32=(o)=>v.getUint32(o,le);
  if(u16(off+2)!==42)return null;

  const salida={}, tipoTam=[0,1,1,2,4,8,1,1,2,4,8,4,8];
  const leerValor=(o)=>{
    const tag=u16(o), tipo=u16(o+2), n=u32(o+4);
    const tam=(tipoTam[tipo]||1)*n;
    let d=o+8;
    if(tam>4)d=off+u32(o+8);
    if(d<0||d+tam>b.length)return [tag,null,tipo];
    if(tipo===2)return [tag,new TextDecoder('latin1').decode(b.subarray(d,d+tam)).replace(/\0.*$/,'').trim(),tipo];
    if(tipo===3)return [tag,u16(d),tipo];
    if(tipo===4)return [tag,u32(d),tipo];
    if(tipo===5||tipo===10){
      const r=[];
      for(let i=0;i<n;i++){const num=u32(d+i*8), den=u32(d+i*8+4);r.push(den?num/den:0);}
      return [tag,r.length===1?r[0]:r,tipo];
    }
    return [tag,null,tipo];
  };
  const recorrer=(ifd,destino)=>{
    if(ifd+2>b.length)return 0;
    const n=u16(ifd);
    if(n>512)return 0;
    for(let i=0;i<n;i++){
      const [tag,val]=leerValor(ifd+2+i*12);
      if(val!==null&&val!==undefined)destino[tag]=val;
    }
    return u32(ifd+2+n*12);
  };
  const ifd0={};
  recorrer(off+u32(off+4),ifd0);
  Object.assign(salida,ifd0);
  if(ifd0[0x8769]){const ex={};recorrer(off+ifd0[0x8769],ex);Object.assign(salida,ex);}
  let gps=null;
  if(ifd0[0x8825]){gps={};recorrer(off+ifd0[0x8825],gps);}
  return {campos:salida,gps};
}

const gradosDe=(r,ref)=>{
  if(!Array.isArray(r)||r.length<3)return null;
  const d=r[0]+r[1]/60+r[2]/3600;
  return ((ref==='S'||ref==='W')?-d:d).toFixed(6);
};

/* ---------- lectores por formato ---------- */
function metaPng(b){
  const filas=[], avisos=[];
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  let p=8;
  const colores={0:'escala de grises',2:'color RGB',3:'paleta',4:'gris con alfa',6:'RGB con alfa'};
  while(p+8<b.length){
    const largo=v.getUint32(p), tipo=new TextDecoder('latin1').decode(b.subarray(p+4,p+8));
    if(tipo==='IHDR'){
      filas.push(['Dimensiones',v.getUint32(p+8)+' × '+v.getUint32(p+12)+' px']);
      filas.push(['Profundidad de bits',String(b[p+16])]);
      filas.push(['Tipo de color',colores[b[p+17]]||String(b[p+17])]);
    }
    if(tipo==='tEXt'||tipo==='iTXt'||tipo==='zTXt'){
      const cru=new TextDecoder('latin1').decode(b.subarray(p+8,p+8+Math.min(largo,400)));
      const [k,...r]=cru.split('\0');
      filas.push(['Texto · '+k,r.join(' ').replace(/[^\x20-\x7e\xa0-\xff]/g,' ').trim().slice(0,200)]);
    }
    if(tipo==='tIME')filas.push(['Última modificación',
      v.getUint16(p+8)+'-'+String(b[p+10]).padStart(2,'0')+'-'+String(b[p+11]).padStart(2,'0')+' '+
      String(b[p+12]).padStart(2,'0')+':'+String(b[p+13]).padStart(2,'0')+':'+String(b[p+14]).padStart(2,'0')]);
    if(tipo==='IEND')break;
    p+=12+largo;
    if(largo<0||largo>b.length)break;
  }
  return {filas,avisos};
}

function metaPdf(b){
  const t=new TextDecoder('latin1').decode(b);
  const filas=[], avisos=[];
  const ver=t.match(/^%PDF-(\d\.\d)/);
  if(ver)filas.push(['Versión del formato','PDF '+ver[1]]);
  const campo=(n)=>{
    const m=t.match(new RegExp('/'+n+'\\s*\\((?:\\\\.|[^)\\\\])*\\)'));
    if(!m)return null;
    return m[0].slice(m[0].indexOf('(')+1,-1).replace(/\\([()\\])/g,'$1')
      .replace(/[^\x20-\x7e\xa0-\xff]/g,'').trim();
  };
  const fecha=(x)=>{
    if(!x)return null;
    const m=x.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
    return m?`${m[3]}-${m[2]}-${m[1]}`+(m[4]?` ${m[4]}:${m[5]||'00'}:${m[6]||'00'}`:''):x;
  };
  for(const [k,n] of [['Título','Title'],['Autor','Author'],['Asunto','Subject'],
    ['Palabras clave','Keywords'],['Aplicación de origen','Creator'],['Productor','Producer']]){
    const val=campo(n); if(val)filas.push([k,val]);
  }
  const cd=campo('CreationDate'), md=campo('ModDate');
  if(cd)filas.push(['Fecha de creación',fecha(cd)]);
  if(md)filas.push(['Fecha de modificación',fecha(md)]);
  const paginas=(t.match(/\/Type\s*\/Page[^s]/g)||[]).length;
  if(paginas)filas.push(['Páginas (aproximado)',String(paginas)]);
  if(/\/Encrypt/.test(t))filas.push(['Cifrado','sí']);
  for(const [re,txt] of [[/\/JavaScript|\/JS[\s(<]/,'contiene JavaScript'],
    [/\/OpenAction/,'ejecuta una acción al abrirse'],[/\/AA[\s<]/,'tiene acciones automáticas'],
    [/\/Launch/,'contiene una acción Launch'],[/\/EmbeddedFile/,'lleva ficheros incrustados'],
    [/\/URI\s*\(/,'contiene enlaces externos'],[/\/RichMedia|\/Flash/,'contiene medios embebidos'],
    [/\/AcroForm/,'contiene formularios']])
    if(re.test(t))avisos.push(txt);
  if(/\/ObjStm/.test(t))filas.push(['Objetos comprimidos','sí, parte de los metadatos puede no ser legible aquí']);
  const xmp=(et)=>{
    const m=t.match(new RegExp('<'+et+'[^>]*>([\\s\\S]{0,300}?)</'+et+'>'));
    return m?m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim():null;
  };
  for(const [k,et] of [['Autor (XMP)','dc:creator'],['Título (XMP)','dc:title'],
    ['Aplicación de origen (XMP)','xmp:CreatorTool'],['Fecha de creación (XMP)','xmp:CreateDate'],
    ['Fecha de modificación (XMP)','xmp:ModifyDate'],['Identificador del documento','xmpMM:DocumentID']]){
    const val=xmp(et);
    if(val&&!filas.some((f)=>f[1]===val))filas.push([k,/Fecha/.test(k)?fechaIso(val):val]);
  }
  return {filas,avisos};
}

function leerZipEntradas(b){
  // se busca el fin del directorio central desde el final del fichero
  let fin=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-66000);i--){
    if(b[i]===0x50&&b[i+1]===0x4B&&b[i+2]===0x05&&b[i+3]===0x06){fin=i;break;}
  }
  if(fin<0)return null;
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const n=v.getUint16(fin+10,true);
  let p=v.getUint32(fin+16,true);
  const entradas=[];
  for(let i=0;i<n&&p+46<=b.length;i++){
    if(v.getUint32(p,true)!==0x02014b50)break;
    const ln=v.getUint16(p+28,true), le=v.getUint16(p+30,true), lc=v.getUint16(p+32,true);
    const hora=v.getUint16(p+12,true), fechaDos=v.getUint16(p+14,true);
    entradas.push({
      nombre:new TextDecoder('utf-8').decode(b.subarray(p+46,p+46+ln)),
      metodo:v.getUint16(p+10,true), desplazamiento:v.getUint32(p+42,true),
      comprimido:v.getUint32(p+20,true), original:v.getUint32(p+24,true),
      fecha:`${String(fechaDos&31).padStart(2,'0')}-${String((fechaDos>>5)&15).padStart(2,'0')}-${1980+(fechaDos>>9)}`+
        ` ${String(hora>>11).padStart(2,'0')}:${String((hora>>5)&63).padStart(2,'0')}`});
    p+=46+ln+le+lc;
  }
  return entradas;
}

function metaZip(b,ext){
  const e=leerZipEntradas(b);
  const filas=[], avisos=[];
  if(!e)return {filas:[['Directorio del ZIP','no se ha encontrado: el fichero puede estar truncado']],avisos};
  filas.push(['Entradas',String(e.length)]);
  const total=e.reduce((a,x)=>a+x.original,0);
  filas.push(['Tamaño descomprimido',bytesTxt(total)]);
  const fechas=e.map((x)=>x.fecha).sort();
  if(fechas.length)filas.push(['Fechas internas',fechas[0]+' a '+fechas[fechas.length-1]]);
  const ooxml=e.some((x)=>x.nombre==='[Content_Types].xml');
  if(ooxml){
    filas.push(['Formato','documento OOXML de Office']);
    const core=e.find((x)=>x.nombre==='docProps/core.xml');
    if(core)filas.push(['Propiedades','incluye docProps/core.xml con autor y fechas']);
  }
  for(const [re,txt] of [
    [/vbaProject\.bin$/i,'contiene macros VBA'],
    [/\.bin$/i,'contiene objetos binarios incrustados'],
    [/oleObject/i,'contiene objetos OLE incrustados'],
    [/\.(exe|dll|js|vbs|ps1|bat|cmd|scr|lnk|hta)$/i,'contiene ficheros ejecutables o de script'],
    [/embeddings\//i,'contiene ficheros embebidos'],
    [/printerSettings/i,'conserva configuración de impresora del equipo de origen']])
    if(e.some((x)=>re.test(x.nombre)))avisos.push(txt);
  if(total>0&&e.length){
    const ratio=b.length/total;
    if(total>50*1024*1024&&ratio<0.02)avisos.push('relación de compresión muy alta: posible bomba de descompresión');
  }
  filas.push(['Primeras entradas',e.slice(0,12).map((x)=>x.nombre).join(', ')+(e.length>12?'…':'')]);
  return {filas,avisos};
}

function metaPe(b){
  const filas=[], avisos=[];
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  if(b.length<0x40)return {filas,avisos};
  const pe=v.getUint32(0x3c,true);
  if(pe+24>b.length||v.getUint32(pe,true)!==0x00004550){
    filas.push(['Cabecera PE','no encontrada: puede ser un ejecutable DOS antiguo o estar corrupto']);
    return {filas,avisos};
  }
  const maquinas={0x014c:'x86 (32 bits)',0x8664:'x64',0x01c0:'ARM',0xaa64:'ARM64',0x0200:'Itanium'};
  const maq=v.getUint16(pe+4,true);
  filas.push(['Arquitectura',maquinas[maq]||('0x'+maq.toString(16))]);
  const nsec=v.getUint16(pe+6,true);
  filas.push(['Secciones',String(nsec)]);
  const sello=v.getUint32(pe+8,true);
  filas.push(['Fecha de compilación',sello?fmtUTC(new Date(sello*1000).toISOString())+' UTC':'sin sello']);
  if(sello*1000>Date.now())avisos.push('la fecha de compilación está en el futuro: sello manipulado');
  if(sello===0)avisos.push('sello de compilación a cero: puede indicar compilación reproducible o manipulación');
  const caract=v.getUint16(pe+22,true);
  filas.push(['Tipo',(caract&0x2000)?'DLL':'ejecutable']);
  const opt=pe+24, magia=v.getUint16(opt,true);
  filas.push(['Formato',magia===0x20b?'PE32+':magia===0x10b?'PE32':'desconocido']);
  const secs=[];
  const iniSec=opt+v.getUint16(pe+20,true);
  for(let i=0;i<Math.min(nsec,24);i++){
    const o=iniSec+i*40;
    if(o+40>b.length)break;
    const nom=new TextDecoder('latin1').decode(b.subarray(o,o+8)).replace(/\0/g,'');
    const bruto=v.getUint32(o+16,true), off=v.getUint32(o+20,true);
    let ent=null;
    if(off+bruto<=b.length&&bruto>0)ent=entropia(b.subarray(off,off+Math.min(bruto,262144)));
    secs.push(nom+(ent!==null?' ('+ent.toFixed(2)+')':''));
    if(ent!==null&&ent>7.2)avisos.push('la sección '+nom+' tiene entropía '+ent.toFixed(2)+': posible empaquetado o cifrado');
  }
  if(secs.length)filas.push(['Nombres de sección y entropía',secs.join(', ')]);
  return {filas,avisos};
}

function metaOle(b){
  const filas=[], avisos=[];
  try{
    const cfb=leerCFB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
    const nombres=cfb.entradas.map((e)=>e.nombre.replace(/[\x00-\x1f]/g,'·'));
    filas.push(['Flujos y almacenes',String(cfb.entradas.length)]);
    filas.push(['Nombres',nombres.slice(0,18).join(', ')+(nombres.length>18?'…':'')]);
    if(nombres.some((n)=>/Macros|VBA|_VBA_PROJECT/i.test(n)))avisos.push('contiene proyecto de macros VBA');
    if(nombres.some((n)=>/ObjectPool|Ole10Native/i.test(n)))avisos.push('contiene objetos OLE incrustados');
    if(nombres.some((n)=>/__substg1\.0_/i.test(n)))filas.push(['Contenido','mensaje de Outlook (.msg)']);
    const resumen=cfb.entradas.find((e)=>e.tipo===2&&/SummaryInformation$/i.test(e.nombre)&&
      !/DocumentSummary/i.test(e.nombre));
    const docres=cfb.entradas.find((e)=>e.tipo===2&&/DocumentSummaryInformation$/i.test(e.nombre));
    const props=[];
    if(resumen)props.push(...leerPropertySet(cfb.leer(resumen),PROP_RESUMEN));
    if(docres)props.push(...leerPropertySet(cfb.leer(docres),PROP_DOC));
    if(props.length){
      const autor=(props.find((x)=>x[0]==='Creado por')||[])[1];
      const ultimo=(props.find((x)=>x[0]==='Modificado por última vez por')||[])[1];
      if(autor&&ultimo&&autor!==ultimo)
        avisos.push('el autor original ('+autor+') y quien lo modificó por última vez ('+ultimo+') no coinciden');
      return {filas,avisos,autoria:props};
    }
  }catch(e){filas.push(['Contenedor OLE2','no se ha podido interpretar: '+e.message]);}
  return {filas,avisos};
}

/* ---------- descompresión de una entrada del ZIP ---------- */
async function inflar(datos,metodo,maxSalida=32*1024*1024){
  if(metodo===0){if(datos.byteLength>maxSalida)throw new Error('ZIP_SALIDA_EXCESIVA');return datos;}
  if(typeof DecompressionStream!=='function')throw new Error('este navegador no puede descomprimir el contenido del fichero');
  const flujo=new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const ab=await new Response(flujo).arrayBuffer();
  if(ab.byteLength>maxSalida)throw new Error('ZIP_SALIDA_EXCESIVA');
  return new Uint8Array(ab);
}

async function zipEntrada(b,nombre){
  const e=leerZipEntradas(b);
  if(!e)return null;
  const meta=e.find((x)=>x.nombre===nombre);
  if(!meta||meta.desplazamiento==null)return null;
  if(Number.isFinite(meta.original)&&meta.original>32*1024*1024)throw new Error('ZIP_ENTRADA_EXCESIVA');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const p=meta.desplazamiento;
  if(p+30>b.length||v.getUint32(p,true)!==0x04034b50)return null;
  const ln=v.getUint16(p+26,true), le=v.getUint16(p+28,true);
  const ini=p+30+ln+le;
  if(ini+meta.comprimido>b.length)return null;
  try{ return new TextDecoder('utf-8').decode(
    await inflar(b.subarray(ini,ini+meta.comprimido),meta.metodo)); }
  catch(err){ console.warn('No se pudo descomprimir '+nombre+': '+err.message); return null; }
}

/* ---------- propiedades de un documento OOXML ---------- */
const xmlTexto=(x,etiqueta)=>{
  const m=x.match(new RegExp('<'+etiqueta+'[^>]*>([\\s\\S]*?)</'+etiqueta+'>'));
  return m?m[1].replace(/<[^>]+>/g,'').trim():null;
};
const fechaIso=(x)=>{
  if(!x)return null;
  const d=new Date(x);
  return isNaN(d)?x:fmtUTC(d.toISOString());
};

async function metaOoxml(b){
  const filas=[], avisos=[];
  const core=await zipEntrada(b,'docProps/core.xml');
  const app=await zipEntrada(b,'docProps/app.xml');
  if(core){
    const pares=[['Creado por','dc:creator'],['Título','dc:title'],['Asunto','dc:subject'],
      ['Descripción','dc:description'],['Palabras clave','cp:keywords'],['Categoría','cp:category'],
      ['Modificado por última vez por','cp:lastModifiedBy'],['Revisión','cp:revision']];
    for(const [k,t] of pares){const v=xmlTexto(core,t); if(v)filas.push([k,v]);}
    const c=xmlTexto(core,'dcterms:created'), m=xmlTexto(core,'dcterms:modified'),
      pr=xmlTexto(core,'cp:lastPrinted');
    if(c)filas.push(['Fecha de creación',fechaIso(c)]);
    if(m)filas.push(['Fecha de última modificación',fechaIso(m)]);
    if(pr)filas.push(['Última impresión',fechaIso(pr)]);
    const autor=xmlTexto(core,'dc:creator'), ultimo=xmlTexto(core,'cp:lastModifiedBy');
    if(autor&&ultimo&&autor!==ultimo)
      avisos.push('el autor original ('+autor+') y quien lo modificó por última vez ('+ultimo+') no coinciden');
  }
  if(app){
    for(const [k,t] of [['Aplicación de origen','Application'],['Versión de la aplicación','AppVersion'],
      ['Empresa','Company'],['Responsable','Manager'],['Plantilla','Template'],
      ['Páginas','Pages'],['Palabras','Words'],['Caracteres','Characters'],['Diapositivas','Slides']]){
      const v=xmlTexto(app,t); if(v)filas.push([k,v]);
    }
    const edit=xmlTexto(app,'TotalTime');
    if(edit&&+edit>0)filas.push(['Tiempo total de edición',edit+' minutos']);
  }
  if(!core&&!app)filas.push(['Propiedades del documento','no se han encontrado docProps legibles']);
  return {filas,avisos};
}

/* ---------- property sets de un documento OLE2 ---------- */
const PROP_RESUMEN={2:'Título',3:'Asunto',4:'Creado por',5:'Palabras clave',6:'Comentarios',
 7:'Plantilla',8:'Modificado por última vez por',9:'Revisión',10:'Tiempo total de edición',
 11:'Última impresión',12:'Fecha de creación',13:'Fecha de última modificación',
 14:'Páginas',15:'Palabras',16:'Caracteres',18:'Aplicación de origen'};
const PROP_DOC={14:'Responsable',15:'Empresa',3:'Bytes',5:'Párrafos',6:'Diapositivas'};

function leerPropertySet(d,mapa){
  const filas=[];
  if(d.length<48)return filas;
  const v=new DataView(d.buffer,d.byteOffset,d.byteLength);
  if(v.getUint16(0,true)!==0xFFFE)return filas;
  const nSec=v.getUint32(24,true);
  if(!nSec)return filas;
  const secOff=v.getUint32(28+16,true);
  if(secOff+8>d.length)return filas;
  const nProp=v.getUint32(secOff+4,true);
  if(nProp>256)return filas;
  const desdeFiletime=(o)=>{
    const bajo=v.getUint32(o,true), alto=v.getUint32(o+4,true);
    const ms=(alto*4294967296+bajo)/10000-11644473600000;
    return (ms>0&&ms<4102444800000)?fmtUTC(new Date(ms).toISOString()):null;
  };
  for(let i=0;i<nProp;i++){
    const id=v.getUint32(secOff+8+i*8,true), off=secOff+v.getUint32(secOff+12+i*8,true);
    const nombre=mapa[id];
    if(!nombre||off+4>d.length)continue;
    const tipo=v.getUint32(off,true);
    let val=null;
    if(tipo===2)val=String(v.getInt16(off+4,true));
    else if(tipo===3)val=String(v.getInt32(off+4,true));
    else if(tipo===30){
      const n=v.getUint32(off+4,true);
      if(off+8+n<=d.length)val=new TextDecoder('windows-1252')
        .decode(d.subarray(off+8,off+8+n)).replace(/\0.*$/,'').trim();
    }else if(tipo===31){
      const n=v.getUint32(off+4,true)*2;
      if(off+8+n<=d.length)val=new TextDecoder('utf-16le')
        .decode(d.subarray(off+8,off+8+n)).replace(/\0.*$/,'').trim();
    }else if(tipo===64&&off+12<=d.length)val=desdeFiletime(off+4);
    else if(tipo===11)val=v.getInt16(off+4,true)?'sí':'no';
    if(val===null||val==='')continue;
    if(id===10&&/^\d+$/.test(val)){
      const min=Math.round(Number(val)/600000000);
      val=min>0?min+' minutos':'menos de un minuto';
    }
    filas.push([nombre,val]);
  }
  return filas;
}

/* ---------- orquestador ---------- */
async function leerMetadatos(nombre,cabeza,cola,tamTotal,completo,registro){
  const partes=String(nombre).toLowerCase().split('.');
  const ext=partes.length>1?partes.pop():'';
  const firma=detectarFirma(cabeza);
  const ent=entropia(cabeza);
  const grupos=[], avisos=[];

  const general=[['Nombre',nombre],['Extensión declarada',ext||'sin extensión'],
    ['Tamaño',bytesTxt(tamTotal)+' ('+tamTotal.toLocaleString('es-ES')+' bytes)'],
    ['Tipo real según la firma',firma.t],
    ['Entropía de la cabecera',ent.toFixed(3)+' de 8'+
      (ent>7.5?' · muy alta, contenido comprimido o cifrado':ent<1?' · muy baja, contenido repetitivo':'')],
    ['Primeros bytes',[...cabeza.subarray(0,16)].map((x)=>x.toString(16).padStart(2,'0')).join(' ')]];
  grupos.push({titulo:'Identificación',filas:general});

  if(ext&&firma.ext.length&&!firma.ext.includes(ext))
    avisos.push('la extensión .'+ext+' no corresponde con el contenido real ('+firma.t+')');
  if(/^(exe|scr|com|pif|bat|cmd|js|vbs|hta|jar|ps1|msi|lnk)$/.test(ext))
    avisos.push('extensión ejecutable');
  if(partes.length>1&&/^(pdf|doc|docx|xls|xlsx|jpg|png|txt)$/.test(partes[partes.length-1]))
    avisos.push('doble extensión: aparenta ser .'+partes[partes.length-1]);
  if(/\u202E/.test(nombre))avisos.push('el nombre contiene el carácter de inversión de texto (RLO)');

  let r=null, autoria=[];
  if(firma.t==='PNG')r=metaPng(cabeza);
  else if(firma.t==='PDF')r=metaPdf(cabeza);
  else if(/^ZIP/.test(firma.t)){
    const buf=cola&&cola.length>cabeza.length?cola:cabeza;
    r=metaZip(buf,ext);
    if(completo){
      const oo=await metaOoxml(cabeza);
      autoria=oo.filas; r.avisos.push(...oo.avisos);
    }else r.filas.push(['Autoría y fechas internas',
      'no leídas: el fichero excede el tamaño que se analiza completo']);
  }
  else if(/^OLE2/.test(firma.t)){r=metaOle(cabeza); if(r.autoria)autoria=r.autoria;}
  else if(/^Ejecutable de Windows/.test(firma.t))r=metaPe(cabeza);

  // fechas que aporta el propio expediente, no el contenido del fichero
  const delCaso=[];
  if(registro){
    if(registro.modificadoOrigen)delCaso.push(['Modificado en el sistema de origen',
      fmtUTC(registro.modificadoOrigen)+' UTC']);
    if(registro.adquiridaEl)delCaso.push(['Adquirida el',fmtUTC(registro.adquiridaEl)+' UTC'+
      (registro.adquiridaPor?' por '+registro.adquiridaPor:'')]);
    delCaso.push(['Incorporada al caso',fmtUTC(registro.ts)+' UTC por '+registro.custodio]);
  }
  if(autoria.length||delCaso.length)
    grupos.push({titulo:'Autoría y fechas',filas:autoria.concat(delCaso)});
  if(r&&r.filas.length)grupos.push({titulo:'Propiedades del formato',filas:r.filas});
  if(r)avisos.push(...r.avisos);

  if(/^(JPEG|TIFF)/.test(firma.t)){
    const ex=leerExif(cabeza);
    if(ex){
      const filas=[];
      for(const k of Object.keys(ex.campos)){
        const et=EXIF_TAGS[k];
        if(!et)continue;
        let val=ex.campos[k];
        if(Array.isArray(val))val=val.join(', ');
        if(String(val).length>140)val=String(val).slice(0,140)+'…';
        filas.push([et,String(val)]);
      }
      if(ex.campos[0x927C])filas.push(['MakerNote','presente']);
      if(filas.length)grupos.push({titulo:'EXIF',filas});
      if(ex.gps&&ex.gps[2]&&ex.gps[4]){
        const lat=gradosDe(ex.gps[2],ex.gps[1]), lon=gradosDe(ex.gps[4],ex.gps[3]);
        if(lat&&lon){
          grupos.push({titulo:'Geolocalización',filas:[['Latitud',lat],['Longitud',lon],
            ['Coordenadas',lat+', '+lon]]});
          avisos.push('la imagen conserva coordenadas GPS: revisa antes de compartirla');
        }
      }
      if(ex.campos[0x010F]||ex.campos[0x0110])
        avisos.push('la imagen conserva datos del dispositivo de captura');
    }else grupos.push({titulo:'EXIF',filas:[['Metadatos EXIF','no se han encontrado']]});
  }
  return {firma,entropia:ent,grupos,avisos};
}

let META=null;

window.labMetadatos=async function(){
  const id=$('#lab-ev').value;
  if(!id){alert('Elige primero una evidencia en el desplegable.');return;}
  const e=EST.ev.find((x)=>x.id===id);
  if(!dirEv||!e.copiado){alert('Esa evidencia no se copió a la carpeta del caso.');return;}
  try{
    const h=await resolverFichero(dirEv,e.archivo);
    const f=await h.getFile();
    const TOPE=32*1024*1024;
    const completo=f.size<=TOPE;
    const cabeza=new Uint8Array(await f.slice(0,Math.min(f.size,TOPE)).arrayBuffer());
    const cola=completo?cabeza
      : new Uint8Array(await f.slice(Math.max(0,f.size-2*1024*1024)).arrayBuffer());
    META={ev:e,r:await leerMetadatos(e.nombre,cabeza,cola,f.size,completo,e),parcial:!completo};
    pintarMetadatos();
  }catch(err){alert(explicarError(err,'evidencias/'+e.archivo));}
};

window.metaRegistrar=async function(){
  if(!META)return;
  if(!exigeCarpeta())return;
  await anotar('EVIDENCIA_METADATOS',{id:META.ev.id,tipoReal:META.r.firma.t,
    entropia:Number(META.r.entropia.toFixed(3)),avisos:META.r.avisos,
    campos:META.r.grupos.reduce((a,g)=>a+g.filas.length,0)});
  alert('Lectura de metadatos anotada en el registro del caso.');
};

function pintarMetadatos(){
  const c=$('#lab-meta');
  if(!META){c.innerHTML='';return;}
  const {r,ev}=META;
  c.innerHTML=`<div class="tarjeta" style="margin-bottom:20px">
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h3 style="margin:0">Metadatos · ${esc(ev.id)} · ${esc(ev.nombre)}</h3>
      <button class="secundario mini" onclick="metaRegistrar()">Anotar la lectura</button>
    </div>
    ${r.avisos.length?`<div class="aviso" style="margin:0 0 16px"><b>Para revisar</b>
      <ul style="margin:6px 0 0 18px">${r.avisos.map((a)=>`<li>${esc(a)}</li>`).join('')}</ul></div>`:''}
    ${META.parcial?`<p class="ayuda">El fichero supera los 32 MB, así que se han leído solo sus
      primeros y últimos megabytes: puede quedar metadato fuera de esa ventana.</p>`:''}
    ${r.grupos.map((g)=>`<h3 style="margin-top:18px">${esc(g.titulo)}</h3>
      <table><tbody>${g.filas.map((f)=>`<tr><th style="width:230px">${esc(f[0])}</th>
        <td class="desenlace">${esc(f[1])}</td></tr>`).join('')}</tbody></table>`).join('')}
    <p class="ayuda" style="margin:16px 0 0">Los metadatos los escribió la herramienta que creó el
      fichero y pueden estar ausentes, ser erróneos o haber sido alterados a propósito. Trátalos como
      un indicio más, nunca como un hecho acreditado.</p>
  </div>`;
}

