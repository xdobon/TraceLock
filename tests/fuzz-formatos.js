/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
// Batería de entradas malformadas contra los lectores de formatos (correo, OLE2, ZIP, PDF, imágenes).
// No es parte de las autopruebas: se ejecuta a mano cuando se toca un lector.
//   node build.js && node tests/fuzz-formatos.js
// Criterio: ninguna entrada debe colgar la pestaña, agotar la memoria ni lanzar un error no
// capturado. Un «error: ...» controlado es un resultado correcto.
const {chromium}=require('playwright');const zlib=require('zlib');
const http=require('http');const fs=require('fs');const path=require('path');
const DIST=path.join(__dirname,'..','tracelock.html');
const B=(x)=>Buffer.from(x,'binary');
const casos=[];const add=(n,b)=>casos.push([n,Buffer.isBuffer(b)?b:B(b)]);
// --- correo ---
add('eml vacío','');
add('eml solo cabecera','From: a@b.example');
add('eml sin cuerpo','From: a@b.example\r\nSubject: x\r\n\r\n');
add('boundary declarado inexistente','Content-Type: multipart/mixed; boundary="xx"\r\n\r\ncuerpo sin partes');
add('boundary vacío','Content-Type: multipart/mixed; boundary=""\r\n\r\n--\r\nx\r\n--');
add('MIME anidado x200',(()=>{let s='';for(let i=0;i<200;i++)s+=`Content-Type: multipart/mixed; boundary="b${i}"\r\n\r\n--b${i}\r\n`;return s+'hola';})());
add('cabecera de 5 MB','X-Big: '+'A'.repeat(5e6)+'\r\n\r\nx');
add('200k cabeceras',(()=>{let s='';for(let i=0;i<200000;i++)s+=`X-${i}: v\r\n`;return s+'\r\nx';})());
add('plegado infinito','Subject: a\r\n'+' b\r\n'.repeat(100000)+'\r\nx');
add('base64 corrupto','Content-Transfer-Encoding: base64\r\n\r\n@@@@!!!!????\r\nAAAA');
add('quoted-printable corrupto','Content-Transfer-Encoding: quoted-printable\r\n\r\n=ZZ=4=\r\n=');
add('charset inventado','Content-Type: text/plain; charset="no-existe-9"\r\n\r\nhola');
add('encoded-word roto','Subject: =?utf-8?B?@@@@?= =?=\r\n\r\nx');
add('Received sin fecha','Received: from a by b\r\nReceived: ???\r\n\r\nx');
add('URL de 2 MB','\r\n\r\nhttp://x.example/'+'a'.repeat(2e6));
add('miles de URLs','\r\n\r\n'+'http://a.example/x '.repeat(50000));
add('bytes aleatorios',require('crypto').randomBytes(300000));
add('nulos','From: a@b\0\0\0.example\r\n\r\n\0\0\0');
add('utf-16 con BOM',Buffer.concat([Buffer.from([0xFF,0xFE]),Buffer.from('From: a@b.example','utf16le')]));
add('adjunto con nombre RLO','Content-Type: multipart/mixed; boundary="b"\r\n\r\n--b\r\nContent-Disposition: attachment; filename="fact\u202Egpj.exe"\r\n\r\nx\r\n--b--');
// --- .msg / OLE2 ---
add('msg firma sola',Buffer.from([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]));
add('msg truncado',Buffer.concat([Buffer.from([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]),Buffer.alloc(500,0xFF)]));
add('msg sectores absurdos',(()=>{const b=Buffer.alloc(4096);Buffer.from([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]).copy(b);b.writeUInt16LE(0xFFFF,30);b.writeUInt16LE(0xFFFF,32);b.writeInt32LE(0x7FFFFFF0,48);return b;})());
// --- ZIP / OOXML ---
add('zip truncado',Buffer.from('PK\x03\x04'+'\x00'.repeat(26),'binary'));
add('zip tamaños falsos',(()=>{const z=zlib.deflateRawSync(Buffer.from('hola'));const n=Buffer.from('a.xml');
 const lf=Buffer.alloc(30);lf.write('PK\x03\x04','binary');lf.writeUInt32LE(0xFFFFFFF0,18);lf.writeUInt32LE(0xFFFFFFF0,22);lf.writeUInt16LE(n.length,26);
 const cd=Buffer.alloc(46);cd.write('PK\x01\x02','binary');cd.writeUInt32LE(0xFFFFFFF0,20);cd.writeUInt32LE(0xFFFFFFF0,24);cd.writeUInt16LE(n.length,28);
 const eo=Buffer.alloc(22);eo.write('PK\x05\x06','binary');eo.writeUInt16LE(1,8);eo.writeUInt16LE(1,10);eo.writeUInt32LE(46,12);eo.writeUInt32LE(30+n.length+z.length,16);
 return Buffer.concat([lf,n,z,cd,n,eo]);})());
add('zip bomba',(()=>{const z=zlib.deflateRawSync(Buffer.alloc(20e6));const n=Buffer.from('big.bin');
 const lf=Buffer.alloc(30);lf.write('PK\x03\x04','binary');lf.writeUInt16LE(8,8);lf.writeUInt32LE(z.length,18);lf.writeUInt32LE(20e6,22);lf.writeUInt16LE(n.length,26);
 const cd=Buffer.alloc(46);cd.write('PK\x01\x02','binary');cd.writeUInt16LE(8,10);cd.writeUInt32LE(z.length,20);cd.writeUInt32LE(20e6,24);cd.writeUInt16LE(n.length,28);
 const eo=Buffer.alloc(22);eo.write('PK\x05\x06','binary');eo.writeUInt16LE(1,8);eo.writeUInt16LE(1,10);eo.writeUInt32LE(46,12);eo.writeUInt32LE(30+n.length+z.length,16);
 return Buffer.concat([lf,n,z,cd,n,eo]);})());
// --- PDF / imágenes ---
add('pdf mínimo roto','%PDF-1.7\n1 0 obj\n<</Type/Catalog',);
add('pdf xref basura','%PDF-1.4\nxref\n@@@@\ntrailer\n<</Root 9999 0 R>>');
add('png cabecera sola',Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]));
add('jpeg exif truncado',Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE1,0x7F,0xFF]),Buffer.from('Exif\0\0MM\0*'),Buffer.alloc(40,0xFF)]));
add('gif corrupto',Buffer.concat([Buffer.from('GIF89a'),Buffer.alloc(100,0xFF)]));
// --- json/xml del propio expediente ---
add('xml inválido en docProps','<?xml version="1.0"?><a>\x01\x02\x03</a>');
console.log('casos:',casos.length);
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
 const html=fs.readFileSync(DIST);
 const srv=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}).listen(0,'127.0.0.1');
 await new Promise(r=>srv.once('listening',r));
 await p.goto('http://127.0.0.1:'+srv.address().port+'/tracelock.html');await p.waitForTimeout(500);
 const res=[];
 for(const [n,buf] of casos){
  const r=await Promise.race([
    p.evaluate(async([n,b64])=>{
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      const out={n};const t0=performance.now();
      const m0=performance.memory?performance.memory.usedJSHeapSize:0;
      try{ const a=analizarCorreo(n+'.eml',bytes); out.correo='ok('+(a.urls?a.urls.length:0)+' urls)'; }
      catch(e){ out.correo='error: '+e.message.slice(0,40); }
      try{ const nom=out.nombreMeta=(n.includes('zip')||n.includes('docProps')?n+'.docx':n.includes('pdf')?n+'.pdf':n.includes('msg')?n+'.msg':n.includes('png')?n+'.png':n.includes('jpeg')?n+'.jpg':n.includes('gif')?n+'.gif':n+'.bin');const meta=await leerMetadatos(nom,bytes,bytes,bytes.length,true,{}); out.meta='ok('+(meta&&meta.grupos?meta.grupos.length+'g/'+(meta.avisos||[]).length+'av':'?')+')'; }
      catch(e){ out.meta='error: '+e.message.slice(0,40); }
      out.ms=Math.round(performance.now()-t0);
      out.heapMB=performance.memory?+((performance.memory.usedJSHeapSize-m0)/1048576).toFixed(1):null;
      return out;},[n,buf.toString('base64')]),
    new Promise(r=>setTimeout(()=>r({n,colgado:true}),20000))]);
  res.push(r);
  console.log((r.colgado?'COLGADO  ':(r.ms>3000?'LENTO    ':'ok       '))+n.padEnd(28)+(r.colgado?'':` ${String(r.ms).padStart(6)} ms  correo=${r.correo}  meta=${r.meta}`));
  if(r.colgado)break;
 }
 console.log('errores no capturados:',errs.length?errs:'ninguno');
 await b.close();srv.close();
 const malos=res.filter(r=>r.colgado||r.ms>3000);
 if(errs.length||malos.length){console.error('FALLA: '+[...errs,...malos.map(r=>r.n+(r.colgado?' se cuelga':' tarda '+r.ms+' ms'))].join(' | '));process.exit(1);}
 console.log(res.length+' entradas malformadas procesadas sin colgar ni lanzar errores no capturados.');})();
