/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= estado y utilidades ================= */
const VERSION='TraceLock 1.1';
const SCHEMA=2;
const CUSTODIA_VERSION='1.1';
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
/* Campo obligatorio: asterisco rojo en la etiqueta y aria-required en el control. El
   asterisco va oculto a los lectores de pantalla porque aria-required ya lo anuncia. */
const ASTERISCO='<span class="obligatorio" aria-hidden="true">*</span>';
function marcarObligatorio(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.setAttribute('aria-required','true');
  const lab=el.closest('label.campo'), span=lab&&lab.querySelector(':scope>span');
  if(span&&!span.querySelector('.obligatorio'))span.insertAdjacentHTML('beforeend',ASTERISCO);
}
/* Texto de un tag en caja de frase: primera letra en mayúscula y el resto como venga. Si todo
   el texto llega en mayúsculas («MUY ALTO», «I2 - MEDIO»), se pasa a minúsculas salvo los códigos
   (palabras con cifras, como I2 o T1566) y las siglas conocidas; lo que sigue a « - » cuenta
   como frase nueva. */
const SIGLAS_TAG=new Set(['IOC','IOCS','SPF','DKIM','DMARC','ENS','CCN','CERT','CCN-CERT','MITRE','URL','IP','MFA','CSV','UTC','NIST','RSIT','ENISA','DNS','HTML','PDF']);
const textoTag=(t)=>{
  let s=String(t==null?'':t);
  const letras=s.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g,'');
  if(letras.length>1&&letras===letras.toUpperCase())
    s=s.split(/(\s+)/).map((w)=>/\d/.test(w)||SIGLAS_TAG.has(w)?w:w.toLowerCase()).join('');
  const mayus=(x)=>x.replace(/^(\s*)(\p{Ll})/u,(_,a,b)=>a+b.toUpperCase());
  return s.split(' - ').map(mayus).join(' - ');
};
const esc=(t)=>String(t==null?'':t).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* getFileHandle() acepta un NOMBRE, nunca una ruta: pasarle 'originales/EV-0001__x.jpg'
   falla con «Name is not allowed». Como las evidencias viven en subcarpetas
   (originales/, trabajo/), cualquier ruta relativa guardada en el registro hay que
   recorrerla tramo a tramo. Se hace en un único sitio para que no vuelva a quedarse
   ningún punto de acceso sin actualizar cuando cambie la estructura de carpetas. */
async function resolverFichero(dir,ruta,opciones){
  const partes=String(ruta||'').split('/').filter((x)=>x&&x!=='.');
  if(!partes.length)throw new Error('Ruta de fichero vacía');
  // Se comprueba en blanco, pero NO se recorta cada tramo: un fichero puede llamarse
  // legítimamente «foo .jpg» y sanear() no quita esos espacios al dar de alta.
  if(partes.some((x)=>!x.trim()||x==='..'))throw new Error('Ruta de fichero no permitida: '+ruta);
  let d=dir;
  for(const parte of partes.slice(0,-1))d=await d.getDirectoryHandle(parte,opciones);
  return d.getFileHandle(partes[partes.length-1],opciones);
}

