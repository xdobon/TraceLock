/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= autodiagnóstico =================
   Las pruebas viven dentro del propio fichero: así viajan con él y cualquiera puede
   comprobar su copia sin instalar nada. El ejecutor de Node carga este mismo array,
   de modo que no hay dos versiones de las pruebas que puedan divergir. */

const VECTORES_HUELLA=[
 ['',                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','d41d8cd98f00b204e9800998ecf8427e'],
 ['abc',             'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad','900150983cd24fb0d6963f7d28e17f72'],
 ['message digest',  'f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650','f96b697d7cb7938d525a2f31aaf161d0'],
 ['áéíóú ñ 漢字',      '817e48ff86aaea4b7ee8c2211bcebbb9a02b6d83604c48bbdead9a6d6acc9404','5f2c33ea539555fb66566b55f5f14ea0'],
 ['x'.repeat(55),    'd5e285683cd4efc02d021a5c62014694958901005d6f71e89e0989fac77e4072','04364420e25c512fd958a70738aa8f72'],
 ['w'.repeat(119),   '5cb9d9eeda0eeba3057bb19aa8593c99781938f5acbb23c33f90bdf475b6ac11','20ffcf857ba39b1d56e11650e63e35d0'],
 ['a'.repeat(1000000),'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0','7707d6ae4e027c70eea2a935c2296f21'],
];

const CARGAS_INYECCION=[
 "x'+alert(document.title)+'",
 "https://a.tld/?q='-alert(1)-'",
 "factura'.pdf",
 "comillas\"dobles.png",
 "<img src=x onerror=alert(1)>.png",
 "<\/script><script>alert(1)<\/script>",   // la barra va escapada: si no, cierra esta etiqueta
 "a\nb",
];

const EML_PRUEBA=[
 'Return-Path: <bounce@micr0soft-billing.example>',
 'Received: from mx01.cliente.example (10.20.0.11) by exch02.cliente.local (10.20.0.30)',
 ' with Microsoft SMTP Server; Tue, 17 Feb 2026 11:04:52 +0000',
 'Received: from relay7.envios.example (203.0.113.44) by mx01.cliente.example (10.20.0.11)',
 ' with ESMTPS; Tue, 17 Feb 2026 11:04:40 +0000',
 'Authentication-Results: mx.cliente.example; spf=fail; dkim=fail; dmarc=fail',
 'From: "Soporte <soporte@microsoft.com>" <facturacion@micr0soft-billing.example>',
 'Message-ID: <20260909.4471@relay7.envios.example>',
 'Reply-To: respuestas@correo-seguro.example',
 'To: usuario@cliente.example',
 'Subject: =?utf-8?B?QWNjacOzbiByZXF1ZXJpZGE=?=',
 'MIME-Version: 1.0',
 'Content-Type: multipart/alternative; boundary="LIM"',
 '',
 '--LIM',
 'Content-Type: text/plain; charset=utf-8',
 'Content-Transfer-Encoding: quoted-printable',
 '',
 'Verifique en https://micr0soft-billing.example/verify=3Fid=3D8891',
 'o en http://203.0.113.44/login',
 '',
 '--LIM',
 'Content-Type: text/html; charset=utf-8',
 '',
 '<html><body><a href="https://micr0soft-billing.example/pago">https://login.microsoftonline.com</a>',
 '<a href="https://xn--micrsoft-o1a.example/x">otro</a></body></html>',
 '',
 '--LIM--',
 ''].join('\r\n');

/* Registro en memoria, para poder probar el encadenado sin tocar el disco. */
function registroDePrueba(){
  const disco={texto:'',marca:1};
  const previo={dirCaso,hRegistro,ASIENTOS,bytesRegistro,marcaRegistro,dirEv};
  dirCaso={name:'AUTODIAGNOSTICO'};
  dirEv=null;
  hRegistro={
    getFile:async()=>({size:new TextEncoder().encode(disco.texto).length,
      lastModified:disco.marca,text:async()=>disco.texto}),
    createWritable:async()=>({
      write:async(o)=>{
        const b=new TextEncoder().encode(disco.texto);
        const d=new TextEncoder().encode(o.data);
        const out=new Uint8Array(Math.max(b.length,o.position+d.length));
        out.set(b.subarray(0,o.position));
        out.set(d,o.position);
        if(b.length>o.position+d.length)out.set(b.subarray(o.position+d.length),o.position+d.length);
        disco.texto=new TextDecoder().decode(out);
      },
      close:async()=>{disco.marca++;}})};
  ASIENTOS=[];bytesRegistro=0;marcaRegistro=0;
  return {disco,restaurar(){dirCaso=previo.dirCaso;hRegistro=previo.hRegistro;
    ASIENTOS=previo.ASIENTOS;bytesRegistro=previo.bytesRegistro;
    marcaRegistro=previo.marcaRegistro;dirEv=previo.dirEv;}};
}

const AUTOPRUEBAS=[
 {nombre:'Huellas criptográficas',pruebas:[
  {d:'SHA-256 coincide con los vectores publicados',f(t){
    for(const [texto,sha] of VECTORES_HUELLA)
      t.igual(new Sha256().update(new TextEncoder().encode(texto)).hex(),sha,
        'SHA-256 de una entrada de '+texto.length+' caracteres');}},
  {d:'MD5 coincide con los vectores publicados',f(t){
    for(const [texto,,md5] of VECTORES_HUELLA)
      t.igual(new Md5().update(new TextEncoder().encode(texto)).hex(),md5,
        'MD5 de una entrada de '+texto.length+' caracteres');}},
  {d:'el troceado arbitrario da el mismo resultado que el bloque entero',f(t){
    const datos=new Uint8Array(400000);
    for(let i=0;i<datos.length;i++)datos[i]=(i*2654435761)&255;
    for(const Alg of [Sha256,Md5]){
      const entero=new Alg().update(datos).hex();
      const h=new Alg();
      let i=0;
      while(i<datos.length){const n=1+((i*7919)%40000);h.update(datos.subarray(i,i+n));i+=n;}
      t.igual(h.hex(),entero,'huella troceada');}}},
 ]},

 {nombre:'Escapado y superficie de inyección',pruebas:[
  {d:'ningún dato externo puede romper un manejador en línea',f(t){
    const patron=/^<button onclick="fn\('(?:[^'\\]|\\.)*'\)">x<\/button>$/;
    for(const c of CARGAS_INYECCION)
      t.cierto(patron.test('<button onclick="fn(\''+escJs(c)+'\')">x</button>'),
        'la carga '+JSON.stringify(c)+' rompe el atributo');}},
  {d:'el escapado neutraliza las etiquetas HTML',f(t){
    for(const c of CARGAS_INYECCION){
      t.noContiene(escJs(c),'<','queda un < sin escapar');
      t.noContiene(escJs(c),'"','queda una comilla doble sin escapar');}
    t.igual(esc('a & b'),'a &amp; b','ampersand escapado');}},
 ]},

 {nombre:'Registro encadenado',pruebas:[
  {d:'cada asiento enlaza con la huella del anterior',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C'});
      await anotar('HITO_CREADO',{id:'H-0001',fase:'Analisis',hito:'x',iniciado:true});
      await anotar('HITO_FINALIZADO',{id:'H-0001',resultado:'hecho'});
      t.igual(ASIENTOS.length,3,'número de asientos');
      t.igual(ASIENTOS[0].prev,'GENESIS','el primero enlaza con GENESIS');
      t.igual(ASIENTOS[1].prev,ASIENTOS[0].hash,'el segundo enlaza con el primero');
      t.cierto(verificarCadena().integra,'la cadena debería ser íntegra');
    }finally{e.restaurar();}}},
  {d:'alterar o borrar un asiento rompe la cadena',async f(t){
    const e=registroDePrueba();
    try{
      for(let i=0;i<4;i++)await anotar('EVIDENCIA_ANOTADA',{id:'EV-0001',texto:'n'+i});
      const copia=ASIENTOS.map((x)=>JSON.parse(JSON.stringify(x)));
      ASIENTOS[2].datos.texto='modificado a mano';
      const c=verificarCadena();
      t.falso(c.integra,'la alteración debería detectarse');
      t.igual(c.en,3,'debe señalar el asiento alterado');
      ASIENTOS=copia;ASIENTOS.splice(1,1);
      t.falso(verificarCadena().integra,'el borrado debería detectarse');
    }finally{e.restaurar();}}},
  {d:'el asiento se persiste antes de tocar la memoria',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C'});
      const antes=ASIENTOS.length;
      hRegistro.createWritable=async()=>{
        const err=new Error('solo lectura');err.name='NoModificationAllowedError';throw err;};
      let fallo=null;
      try{ await anotar('EVIDENCIA_ANOTADA',{id:'EV-0001',texto:'x'}); }catch(err){ fallo=err; }
      t.cierto(fallo,'debería fallar al escribir');
      t.igual(ASIENTOS.length,antes,'la memoria no debe crecer si falla el disco');
      t.cierto(verificarCadena().integra,'la cadena debe seguir íntegra');
    }finally{e.restaurar();}}},
  {d:'dos analistas sobre el mismo fichero no se pisan',async f(t){
    const e=registroDePrueba();
    const nombre=$('#analista').value;
    try{
      $('#analista').value='Ana';
      await anotar('CASO_ABIERTO',{carpeta:'C'});
      await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase:'Analisis',hito:'A1'});
      const sesionA={a:ASIENTOS,b:bytesRegistro,m:marcaRegistro};
      ASIENTOS=[];bytesRegistro=0;marcaRegistro=0;
      $('#analista').value='Beñat';
      await cargarRegistro();
      await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase:'Contencion',hito:'B1'});
      await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase:'Contencion',hito:'B2'});
      ASIENTOS=sesionA.a;bytesRegistro=sesionA.b;marcaRegistro=sesionA.m;
      $('#analista').value='Ana';
      await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase:'Cierre',hito:'A2'});
      const lineas=e.disco.texto.trim().split('\n').map((l)=>JSON.parse(l));
      t.igual(lineas.length,5,'no se debe perder ningún asiento');
      t.igual(lineas.map((x)=>x.seq).join(' '),'1 2 3 4 5','la numeración debe ser correlativa');
      const ids=lineas.filter((x)=>x.tipo==='HITO_CREADO').map((x)=>x.datos.id);
      t.igual(new Set(ids).size,ids.length,'los identificadores no pueden repetirse: '+ids.join(','));
      ASIENTOS=lineas;
      t.cierto(verificarCadena().integra,'la cadena resultante debe ser íntegra');
    }finally{e.restaurar();$('#analista').value=nombre;}}},
 ]},

 {nombre:'Rutas dentro de la carpeta del caso',pruebas:[
  {d:'una ruta con subcarpeta se recorre tramo a tramo, no se pasa entera a getFileHandle',async f(t){
    const pedidos=[];
    const dirFalso=(nombre)=>({
      nombre,
      getDirectoryHandle:async(n)=>{pedidos.push(['dir',n]);return dirFalso(n);},
      getFileHandle:async(n)=>{
        pedidos.push(['fichero',n]);
        // Es exactamente lo que hace el navegador de verdad: un nombre con '/'
        // no es un nombre válido. Si el helper fallara, saltaría aquí.
        if(n.includes('/'))throw new Error("Name is not allowed");
        return {nombre:n};
      }});
    const h=await resolverFichero(dirFalso('evidencias'),'originales/EV-0001__foto.jpg');
    t.igual(h.nombre,'EV-0001__foto.jpg','debe devolver el manejador del fichero final');
    t.igual(JSON.stringify(pedidos),JSON.stringify([['dir','originales'],['fichero','EV-0001__foto.jpg']]),
      'debe pedir primero la subcarpeta y después el fichero');
    pedidos.length=0;
    await resolverFichero(dirFalso('evidencias'),'EV-0001__suelto.jpg');
    t.igual(JSON.stringify(pedidos),JSON.stringify([['fichero','EV-0001__suelto.jpg']]),
      'una evidencia antigua sin subcarpeta debe seguir funcionando');
    pedidos.length=0;
    await resolverFichero(dirFalso('evidencias'),'trabajo/EV-0002__copia.eml');
    t.igual(JSON.stringify(pedidos),JSON.stringify([['dir','trabajo'],['fichero','EV-0002__copia.eml']]),
      'la copia de trabajo se resuelve igual que el original');}},
  {d:'las rutas vacías o con salto de carpeta se rechazan',async f(t){
    const dirFalso={getDirectoryHandle:async()=>dirFalso,getFileHandle:async()=>({})};
    for(const mala of ['','   ','..','../fuera.txt','originales/../../fuera.txt','a/ /b.txt']){
      let lanzo=false;
      try{await resolverFichero(dirFalso,mala);}catch(_){lanzo=true;}
      t.cierto(lanzo,'debería rechazarse: '+JSON.stringify(mala));
    }}},
 ]},

 {nombre:'Registro guardado en el navegador',pruebas:[
  {d:'el registro del modo sin carpeta se relee en el mismo formato en que se guarda',f(t){
    const asiento=(seq)=>({schema:SCHEMA,seq,ts:'2026-01-01T00:00:0'+(seq%10)+'.000Z',
      tipo:'CASO_ABIERTO',actor:'Ana',datos:{},hash:'a'.repeat(64),prev:seq===1?'GENESIS':'b'.repeat(64)});
    const dos=[asiento(1),asiento(2)];
    // exactamente lo que escribe anotar() cuando no hay carpeta abierta
    const guardado=dos.map((x)=>JSON.stringify(x)).join('\n')+'\n';
    t.igual(parsearRegistroAlmacen(guardado).length,2,'debe releer lo que acaba de guardar');
    t.igual(parsearRegistroAlmacen('').length,0,'un almacén vacío debe dar un registro vacío, no un error');
    t.igual(parsearRegistroAlmacen(null).length,0,'un almacén sin escribir debe dar un registro vacío');
    // formato heredado: el array JSON que se guardaba antes
    t.igual(parsearRegistroAlmacen(JSON.stringify(dos)).length,2,'debe seguir leyendo el formato antiguo');
    t.igual(parsearRegistroAlmacen('[]').length,0,'el array vacío antiguo no debe dar error');}},
  {d:'aceptar el formato antiguo no relaja la validación del esquema',f(t){
    const malos=['[{"seq":1}]','{"seq":1}','[{oops','[42]','{}'];
    for(const m of malos){
      let lanzo=false;
      try{parsearRegistroAlmacen(m);}catch(_){lanzo=true;}
      t.cierto(lanzo,'debería rechazarse: '+m);
    }}},
 ]},

 {nombre:'Evidencias: adquisición obligatoria y protección',pruebas:[
  {d:'no se puede dar de alta una evidencia sin los datos que TraceLock no puede deducir del fichero',f(t){
    const ids=CAMPOS_ADQ_OBLIGATORIOS.map((par)=>par[0]);
    const previos=ids.map((id)=>$('#'+id).value);
    try{
      ids.forEach((id)=>{$('#'+id).value='';});
      t.cierto(campoAdquisicionFaltante(),'debe bloquear si faltan todos los campos');
      ids.forEach((id)=>{$('#'+id).value='x';});
      t.falso(campoAdquisicionFaltante(),'debe dejar pasar si están todos rellenos');
      $('#ev-equipo').value='';
      const falta=campoAdquisicionFaltante();
      t.cierto(falta,'debe seguir bloqueando si falta solo uno');
      t.igual(falta[0],'ev-equipo','debe señalar exactamente el campo que falta');
    }finally{ids.forEach((id,i)=>{$('#'+id).value=previos[i];});}}},
  {d:'cada campo que se exige lleva el asterisco rojo, y ninguno que no se exija lo lleva',f(t){
    const exigidos=new Set(CAMPOS_ADQ_OBLIGATORIOS.map((par)=>par[0]));
    for(const id of exigidos){
      const span=$('#'+id).closest('label.campo').querySelector(':scope>span');
      t.cierto(span.querySelector('.obligatorio'),'falta el asterisco en '+id);
      t.igual($('#'+id).getAttribute('aria-required'),'true','falta aria-required en '+id);
    }
    const marcados=[...document.querySelectorAll('[data-vista="ev"] .campos .obligatorio')]
      .map((s)=>s.closest('label.campo').querySelector('input,select,textarea').id);
    t.igual(marcados.filter((id)=>!exigidos.has(id)).join(','),'','campos marcados como obligatorios que no se validan');}},
  {d:'las evidencias quedan pendientes de proteger hasta que se confirma el comando, y una nueva evidencia reabre la pendiente',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C'});
      await anotar('EVIDENCIA_REGISTRADA',{id:'EV-0001',nombre:'a.bin',sha256:'a'.repeat(64)});
      t.igual(EST.proteccion.sinProteger.length,1,'la evidencia recién dada de alta debe quedar pendiente de proteger');
      const seqEv=ASIENTOS.find((a)=>a.tipo==='EVIDENCIA_REGISTRADA').seq;
      await anotar('EVIDENCIAS_PROTEGIDAS',{metodo:'attrib/chmod',hastaSeq:seqEv,confirmadoPor:analista()});
      t.igual(EST.proteccion.sinProteger.length,0,'tras confirmar la protección no debe quedar ninguna evidencia pendiente');
      await anotar('EVIDENCIA_REGISTRADA',{id:'EV-0002',nombre:'b.bin',sha256:'b'.repeat(64)});
      t.igual(EST.proteccion.sinProteger.length,1,'una evidencia nueva vuelve a quedar pendiente aunque ya se protegiera antes');
      t.igual(EST.proteccion.sinProteger[0].id,'EV-0002','debe señalar justo la evidencia nueva, no la ya protegida');
      await anotar('PROTECCION_APLAZADA',{pendientes:['EV-0002'],motivo:'prueba'});
      t.igual(EST.proteccion.sinProteger.length,1,'aplazar la protección no debe darla por aplicada');
      t.igual(EST.proteccion.aplazamientos.length,1,'el aplazamiento debe quedar registrado');
    }finally{e.restaurar();}}},
  {d:'los comandos de protección tocan los ficheros de todas las subcarpetas y nunca las carpetas',f(t){
    t.cierto(/\/S$/.test(CMD_PROTEGER_WIN)&&/\/S$/.test(CMD_DESPROTEGER_WIN),'attrib debe llevar /S para llegar a originales\\ y trabajo\\');
    t.cierto(!/\/D\b/.test(CMD_PROTEGER_WIN),'attrib no debe aplicarse a carpetas (/D)');
    t.cierto(/-type f/.test(CMD_PROTEGER_NIX)&&/-type f/.test(CMD_DESPROTEGER_NIX),'chmod solo sobre ficheros: en carpetas quita el permiso de acceso');}},
  {d:'dos asientos pedidos a la vez se escriben en orden y la cadena sigue íntegra',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C'});
      await Promise.all([anotar('NOTA',{id:'N-0001',titulo:'a'}),anotar('NOTA',{id:'N-0002',titulo:'b'}),
        anotar('NOTA',{id:'N-0003',titulo:'c'})]);
      t.igual(ASIENTOS.map((a)=>a.seq).join(','),'1,2,3,4','numeración sin repetidos');
      t.cierto(verificarCadena().integra,'la cadena debe seguir íntegra');
    }finally{e.restaurar();}}},
  {d:'el SHA-256 nativo y el propio por trozos dan la misma huella',async f(t){
    t.igual(await sha256Fichero(new File([new TextEncoder().encode('abc')],'a')),VECTORES_HUELLA[1][1],'nativo, vector publicado');
    t.igual(await sha256Fichero(new File([new TextEncoder().encode('abc')],'a'),null,null,true),VECTORES_HUELLA[1][1],'por trozos, vector publicado');
    const b=new Uint8Array(3*1024*1024+17);for(let i=0;i<b.length;i+=65536)crypto.getRandomValues(b.subarray(i,Math.min(i+65536,b.length)));
    const f=new File([b],'x');
    t.igual(await sha256Fichero(f,null,null,true),await sha256Fichero(f),'3 MB por los dos caminos');}},
  {d:'una verificación automática da por verificadas las evidencias salvo las discrepantes',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C'});
      await anotar('EVIDENCIA_REGISTRADA',{id:'EV-0001',nombre:'a',sha256:'a'.repeat(64),copiado:true,archivo:'originales/a',mtimeCopia:1});
      await anotar('EVIDENCIA_REGISTRADA',{id:'EV-0002',nombre:'b',sha256:'b'.repeat(64),copiado:true,archivo:'originales/b'});
      const hasta=ASIENTOS.at(-1).seq;
      await anotar('VERIFICACION_AUTOMATICA',{hastaSeq:hasta,total:2,correctas:1,discrepancias:['EV-0002'],noLeidas:[],mtimes:{'EV-0001':5}});
      const a=EST.ev.find((x)=>x.id==='EV-0001'),b=EST.ev.find((x)=>x.id==='EV-0002');
      t.igual(a.verif.length,1,'la correcta queda verificada');
      t.igual(a.mtimeRef,5,'se actualiza la fecha de referencia');
      t.igual(b.verif.length,0,'la discrepante no se da por verificada');
    }finally{e.restaurar();}}},
 ]},

 {nombre:'Análisis de correo',pruebas:[
  {d:'decodifica el asunto y reconstruye la cadena de entrega',f(t){
    const a=analizarCorreo('prueba.eml',new TextEncoder().encode(EML_PRUEBA));
    t.igual(a.resumen.asunto,'Acción requerida','asunto decodificado');
    t.igual(a.recibidos.length,2,'saltos detectados');
    t.igual(a.recibidos[0].de,'relay7.envios.example','el primer salto es el más antiguo');
    t.igual(a.auten.spf,'fail','resultado de SPF');}},
  {d:'extrae las URLs de las partes en texto y en HTML',f(t){
    const u=analizarCorreo('prueba.eml',new TextEncoder().encode(EML_PRUEBA)).urls.map((x)=>x.url);
    t.cierto(u.some((x)=>x.includes('verify?id=8891')),'quoted-printable decodificado');
    t.cierto(u.some((x)=>x.includes('203.0.113.44')),'URL con IP por host');
    t.cierto(u.some((x)=>x.includes('xn--')),'URL con dominio punycode');}},
  {d:'levanta los indicios de suplantación',f(t){
    const a=analizarCorreo('prueba.eml',new TextEncoder().encode(EML_PRUEBA));
    const i=a.indicios.join(' | '), av=a.urls.flatMap((x)=>x.avisos).join(' | ');
    t.contiene(i,'Return-Path','discrepancia de Return-Path');
    t.contiene(i,'nombre visible','nombre visible falsificado');
    t.contiene(av,'el texto del enlace apunta a','enlace engañoso');
    t.contiene(av,'punycode','dominio punycode');}},
  {d:'distingue las IP privadas de las públicas',f(t){
    const ips=analizarCorreo('prueba.eml',new TextEncoder().encode(EML_PRUEBA)).ips;
    t.cierto(ips.some((x)=>x.ip==='10.20.0.11'&&x.privada),'10.20.0.11 es privada');
    t.cierto(ips.some((x)=>x.ip==='203.0.113.44'&&!x.privada),'203.0.113.44 es pública');}},
  {d:'los lectores de correo aguantan entradas malformadas sin colgarse',f(t){
    const E=(x)=>new TextEncoder().encode(x);
    const casos=[['vacío',''],['solo cabecera','From: a@b.example'],
      ['boundary inexistente','Content-Type: multipart/mixed; boundary="xx"\r\n\r\ncuerpo'],
      ['base64 corrupto','Content-Transfer-Encoding: base64\r\n\r\n@@@@!!!!'],
      ['quoted-printable corrupto','Content-Transfer-Encoding: quoted-printable\r\n\r\n=ZZ=4='],
      ['encoded-word roto','Subject: =?utf-8?B?@@@@?=\r\n\r\nx'],
      ['nulos','From: a@b\u0000.example\r\n\r\n\u0000\u0000']];
    for(const [n,txt] of casos){
      let ok=true; try{ analizarCorreo('x.eml',E(txt)); }catch(e){ ok=false; }
      t.cierto(ok,'no debe lanzar con «'+n+'»');
    }
    // MIME anidado sin fin: debe cortar con un error controlado, no colgarse
    let prof=''; for(let i=0;i<200;i++)prof+=`Content-Type: multipart/mixed; boundary="b${i}"\r\n\r\n--b${i}\r\n`;
    let controlado=false; try{ analizarCorreo('x.eml',E(prof)); }catch(e){ controlado=/PROFUNDIDAD/i.test(e.message); }
    t.cierto(controlado,'el anidamiento excesivo debe dar un error controlado');
    // una «URL» enorme no debe atascar el análisis ni salir como indicador
    const t0=Date.now();
    const a=analizarCorreo('x.eml',E('\r\n\r\nhttp://x.example/'+'a'.repeat(300000)));
    t.cierto(Date.now()-t0<1000,'una URL descomunal no debe tardar más de 1 s');
    t.cierto(a.urls.every((u)=>u.url.length<=2100),'las URLs se acotan a una longitud razonable');}},
  {d:'no confunde el Message-ID con una dirección de correo',f(t){
    const c=analizarCorreo('prueba.eml',new TextEncoder().encode(EML_PRUEBA)).correos;
    t.cierto(!c.some((x)=>x.startsWith('20260909.4471@')),'el Message-ID no es un IOC de correo');
    t.cierto(c.includes('respuestas@correo-seguro.example'),'las direcciones reales se siguen extrayendo');}},
  {d:'la neutralización de indicadores es reversible',f(t){
    const u='https://micr0soft-billing.example/verify?id=8891';
    t.igual(defang(u),'hxxps://micr0soft-billing[.]example/verify?id=8891','neutralizado');
    t.igual(OPERACIONES['refang'].f(defang(u)),u,'devuelto a su forma real');}},
 ]},

 {nombre:'Contenedores y laboratorio',pruebas:[
  {d:'el ZIP que escribe se lee con su propio lector',f(t){
    const b=zip([{nombre:'docProps/core.xml',datos:'<x/>'},
      {nombre:'word/document.xml',datos:'contenido de prueba'}]);
    const e=leerZipEntradas(b);
    t.igual(e.length,2,'entradas leídas');
    t.igual(e[0].nombre,'docProps/core.xml','nombre de la primera entrada');
    const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
    t.igual(v.getUint32(0,true),0x04034b50,'firma de la cabecera local');
    t.igual(v.getUint32(b.length-22,true),0x06054b50,'firma del fin del directorio');}},
  {d:'la firma real prevalece sobre la extensión declarada',f(t){
    const pe=new Uint8Array(300);pe[0]=0x4D;pe[1]=0x5A;
    const r=detectarFirma(pe);
    t.contiene(r.t,'Ejecutable de Windows','tipo detectado');
    t.falso(r.ext.includes('pdf'),'no debe aceptar la extensión pdf');}},
  {d:'la entropía distingue lo comprimido de lo repetitivo',f(t){
    const azar=new Uint8Array(100000);
    let x=123456789;
    for(let i=0;i<azar.length;i++){x=(x*1103515245+12345)&0x7fffffff;azar[i]=(x>>16)&255;}
    t.cierto(entropia(azar)>7.9,'la entropía de datos dispersos debe ser alta');
    t.cierto(entropia(new Uint8Array(100000))<0.1,'la de datos repetidos debe ser baja');}},
  {d:'un contenedor OLE2 corrupto falla de forma controlada',f(t){
    const firma=[0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1];
    const casos={};
    casos['vacío']=new Uint8Array(0);
    casos['truncado']=new Uint8Array(300);
    casos['firma borrada']=new Uint8Array(1024);
    const s1=new Uint8Array(2048);s1.set(firma);
    new DataView(s1.buffer).setUint16(30,40,true);
    casos['sectores absurdos']=s1;
    const s2=new Uint8Array(4096);
    for(let i=8;i<s2.length;i++)s2[i]=(i*37)&255;
    s2.set(firma);
    casos['bytes arbitrarios']=s2;
    for(const nombre in casos){
      let err=null;
      try{ leerCFB(casos[nombre].buffer.slice(0)); }catch(e){ err=e; }
      if(err)t.cierto(!(err instanceof RangeError)&&!(err instanceof TypeError),
        'con «'+nombre+'» se ha lanzado '+err.constructor.name+': '+err.message);}}},
  {d:'las transformaciones del laboratorio son correctas',f(t){
    t.igual(OPERACIONES['base64-encode'].f('hola'),'aG9sYQ==','base64');
    t.igual(OPERACIONES['base64-decode'].f('aG9sYQ=='),'hola','base64 inverso');
    t.igual(OPERACIONES['hex-encode'].f('AB'),'41 42','hexadecimal');
    t.igual(OPERACIONES['hex-decode'].f('41 42'),'AB','hexadecimal inverso');
    t.igual(OPERACIONES['rot13'].f(OPERACIONES['rot13'].f('Hola Mundo')),'Hola Mundo','ROT13 involutivo');
    t.igual(OPERACIONES['url-decode'].f('a%20b'),'a b','URL');
    t.igual(OPERACIONES['unicode-decode'].f('\\u0041\\u0042'),'AB','escapes unicode');
    t.igual(OPERACIONES['sha256'].f('abc'),VECTORES_HUELLA[1][1],'huella SHA-256');}},
  {d:'el laboratorio trata los binarios como bytes, no como texto',f(t){
    const jpg=new Uint8Array([0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x80,0x81,0xFE]);
    t.igual(labCodificacionTexto(jpg,false),null,'una cabecera JPEG no pasa por texto');
    t.igual(labCodificacionTexto(new TextEncoder().encode('línea de log\n'),false),'utf-8','texto UTF-8');
    t.igual(OPERACIONES['hex-encode'].b(jpg.subarray(0,4)),'ff d8 ff e0','hexadecimal de los bytes reales');
    t.igual(OPERACIONES['sha256'].b(new TextEncoder().encode('abc')),VECTORES_HUELLA[1][1],'SHA-256 de bytes');
    t.igual(OPERACIONES['base64-encode'].b(new Uint8Array([0xFF,0xD8,0xFF])),'/9j/','Base64 de bytes');}},
 ]},

 {nombre:'Marcos normativos',pruebas:[
  {d:'la taxonomía CCN-STIC 817 está completa y es coherente',f(t){
    t.igual(TAXONOMIA.length,9,'clases de la Tabla 1');
    t.cierto(TIPOS_PLANOS.length>=36,'tipos de incidente');
    for(const [,tipos] of TAXONOMIA)
      for(const [nombre,nivel] of tipos)
        t.cierto(PELIGROSIDAD.includes(nivel),
          'el tipo «'+nombre+'» sugiere un nivel inexistente: '+nivel);}},
  {d:'la Tabla 6 asocia notificación y plazo a cada peligrosidad',f(t){
    const esperado={'BAJO':[false,15],'MEDIO':[false,30],'ALTO':[true,45],
      'MUY ALTO':[true,90],'CRÍTICO':[true,120]};
    for(const nivel in esperado){
      t.igual(SEGUIMIENTO[nivel].notificar,esperado[nivel][0],'notificación para '+nivel);
      t.igual(SEGUIMIENTO[nivel].dias,esperado[nivel][1],'plazo para '+nivel);}}},
  {d:'la sugerencia de impacto sigue los criterios del apartado 6.3.2',f(t){
    const casos=[[['Sin determinar',0,'menos de 1 jornada-persona'],'I0 - IRRELEVANTE'],
      [['BÁSICA',3,'menos de 1 jornada-persona'],'I1 - BAJO'],
      [['BÁSICA',15,'menos de 1 jornada-persona'],'I2 - MEDIO'],
      [['ALTA',2,'entre 1 y 10 jornadas-persona'],'I3 - ALTO'],
      [['MEDIA',60,'entre 10 y 20 jornadas-persona'],'I4 - MUY ALTO'],
      [['ALTA',60,'más de 50 jornadas-persona'],'I5 - CRÍTICO']];
    for(const [args,esperado] of casos)
      t.igual(impactoSugerido(args[0],args[1],args[2]),esperado,
        'categoría '+args[0]+', '+args[1]+' equipos, '+args[2]);}},
  {d:'las etiquetas de esfuerzo antiguas siguen interpretándose',f(t){
    const pares=[['menos de 1 JP','menos de 1 jornada-persona'],
      ['entre 1 y 10','entre 1 y 10 jornadas-persona'],
      ['entre 10 y 20','entre 10 y 20 jornadas-persona'],
      ['entre 20 y 50','entre 20 y 50 jornadas-persona'],
      ['más de 50','más de 50 jornadas-persona']];
    for(const [viejo,nuevo] of pares)
      t.igual(rangoEsfuerzo(viejo),rangoEsfuerzo(nuevo),
        'la etiqueta antigua «'+viejo+'» debe equivaler a la nueva');}},
  {d:'RSIT, CISA y ATT&CK conservan sus catálogos',f(t){
    t.cierto(RSIT.length>=10,'clases de la RSIT');
    t.igual(NIST_VECTORES.length,9,'vectores de ataque');
    t.igual(NIST_FUNCIONAL.length,8,'niveles de impacto funcional');
    t.igual(NIST_RECUPERACION.length,4,'niveles de recuperabilidad');
    t.igual(TACTICAS.length,14,'tácticas de ATT&CK');
    t.igual(TACTICAS[0][0],'TA0043','la primera es Reconnaissance');
    t.igual(TACTICAS[13][0],'TA0040','la última es Impact');}},
 ]},

 {nombre:'Documentos exportados',pruebas:[
  {d:'el informe de respuesta tiene todos sus capítulos',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C',nombre:'TICKET-1',tlp:'TLP:AMBER',
        deteccion:'2026-08-30T07:15:00.000Z',descripcion:'Aviso'});
      await anotar('EVIDENCIA_REGISTRADA',{id:'EV-0001',nombre:'correo.eml',archivo:'a',
        bytes:2048,sha256:'aa'.repeat(32),copiado:true,custodio:'Ana',origen:'Buzón',metodo:'Exportación'});
      await anotar('CRONO_ENTRADA',{id:'C-0001',fecha:'2026-08-28',hora:'09:41',zona:'UTC',
        accion:'Recepción del mensaje',fuente:'Cabeceras'});
      EST=derivar();
      const b=docBloques(DOCS.final);
      const h1=b.filter((x)=>x.k==='h1').map((x)=>x.t);
      for(const s of ['Control del documento','1. Síntesis','2. Identificación del incidente',
        '3. Clasificación y comunicaciones','4. Hallazgos','5. Alcance del compromiso','6. Respuesta',
        '7. Base probatoria','8. Mejora','Anexo A. Registro de actividad','Anexo B. Fuentes consultadas',
        'Anexo C. Términos y siglas'])
        t.cierto(h1.includes(s),'falta la sección «'+s+'»');
      t.cierto(b.filter((x)=>x.k==='pendiente').length>10,'debe marcar lo que falta por escribir');
      const plano=JSON.stringify(b);
      t.contiene(plano,'TICKET-1','referencia del caso');
      t.contiene(plano,'aa'.repeat(32),'huella de la evidencia');
    }finally{e.restaurar();}}},
  {d:'el DOCX generado tiene las partes obligatorias y el XML equilibrado',async f(t){
    const e=registroDePrueba();
    try{
      await anotar('CASO_ABIERTO',{carpeta:'C',nombre:'TICKET-1'});
      EST=derivar();
      const z=bloquesADocx(docBloques(DOCS.custodia));
      const nombres=leerZipEntradas(z).map((x)=>x.nombre);
      for(const p of ['[Content_Types].xml','_rels/.rels','word/document.xml',
        'word/styles.xml','word/_rels/document.xml.rels'])
        t.cierto(nombres.includes(p),'falta la parte '+p);
      const s=new TextDecoder('latin1').decode(z);
      const cuenta=(re)=>(s.match(re)||[]).length;
      t.igual(cuenta(/<w:tbl>/g),cuenta(/<\/w:tbl>/g),'tablas equilibradas');
      t.igual(cuenta(/<w:tr>/g),cuenta(/<\/w:tr>/g),'filas equilibradas');
    }finally{e.restaurar();}}},
  {d:'la vista imprimible escapa el contenido',f(t){
    const html=bloquesAHtml([{k:'p',t:'<img src=x onerror=alert(1)>'}],'Prueba');
    t.noContiene(html,'<img src=x','no debe llevar la etiqueta cruda');
    t.contiene(html,'&lt;img','debe estar escapada');}},
 ]},
];

/* ---------- ejecución ---------- */
async function ejecutarAutopruebas(){
  const salida=[];
  for(const suite of AUTOPRUEBAS){
    const s={nombre:suite.nombre,pruebas:[]};
    for(const p of suite.pruebas){
      const t={
        cierto(v,m){if(!v)throw new Error(m);},
        falso(v,m){if(v)throw new Error(m);},
        igual(a,b,m){if(a!==b)throw new Error(m+' — '+JSON.stringify(a)+' ≠ '+JSON.stringify(b));},
        contiene(x,y,m){if(String(x).indexOf(y)<0)throw new Error(m+' — no contiene '+JSON.stringify(y));},
        noContiene(x,y,m){if(String(x).indexOf(y)>=0)throw new Error(m+' — contiene '+JSON.stringify(y));},
      };
      const t0=(typeof performance==='object'?performance.now():Date.now());
      try{ await p.f(t); s.pruebas.push({d:p.d,ok:true,ms:(typeof performance==='object'?performance.now():Date.now())-t0}); }
      catch(e){ s.pruebas.push({d:p.d,ok:false,error:e.message,
        ms:(typeof performance==='object'?performance.now():Date.now())-t0}); }
    }
    salida.push(s);
  }
  return salida;
}

