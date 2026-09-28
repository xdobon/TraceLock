/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= ajustes: tema e idioma ================= */
// Solo modo noche: el modo día se retiró de Ajustes. Si quedaba «dia» guardado de una versión
// anterior, se ignora.
const TEMAS=[
 {id:'noche',n:'Modo noche',en:'Night mode',
  icono:'<path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7Z"/>'}];

const IDIOMAS=[
 {id:'es',n:'Español',en:'Spanish',bandera:'ES'},
 {id:'en',n:'Inglés',en:'English',bandera:'EN'}];

let IDIOMA='es', TEMA='noche';

/* ---------- traducción de la interfaz ----------
   Se traduce lo que se MUESTRA, nunca lo que se guarda: el registro, los valores de los
   formularios y los documentos exportados siguen en español. El diccionario (I18N y
   I18N_PATRONES) está en 17a-diccionario-ingles.js.

   Por qué un observador y no una pasada tras refrescar(): media aplicación pinta su parte
   por su cuenta (diálogos, avisos, búsqueda, laboratorio, grafo…) y cualquier pasada
   explícita se queda corta en cuanto alguien añade un innerHTML nuevo. Con el observador,
   todo lo que entra en el DOM se traduce antes de que el navegador lo pinte. En español
   el observador está desconectado: coste cero. */
const ORIG=new WeakMap();        // nodo de texto -> texto original
const ESCRITO=new WeakMap();     // nodo de texto -> lo último que escribimos nosotros
const ORIG_ATTR=new WeakMap();   // elemento -> {atributo: valor original}
const ATTRS_TRAD=['placeholder','title','aria-label','alt'];
// Contenedores cuyo contenido son datos, no interfaz: hashes, comandos, cabeceras crudas…
const NO_TRADUCIR='script,style,textarea,pre,code,[translate="no"],[contenteditable]';
// Los atributos (placeholder, title…) sí se traducen en textarea y en elementos de datos.
const NO_TRADUCIR_ATTR='script,style,[translate="no"]';
const CACHE_TRAD=new Map();
let PATRONES_COMPILADOS=null;

const normalizar=(t)=>t.replace(/\s+/g,' ').trim();
function compilarPatrones(){
  const porPrefijo=new Map(), generales=[];
  const fijo=(es)=>es.replace(/\{\d+\}/g,'').length;
  for(const [es,en] of [...I18N_PATRONES].sort((a,b)=>fijo(b[0])-fijo(a[0]))){
    const partes=es.split(/(\{\d+\})/);
    const orden=[];
    const re=new RegExp('^'+partes.map((x)=>{const m=x.match(/^\{(\d+)\}$/);
      if(m){orden.push(+m[1]);return '(.*?)';}
      return x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('')+'$');
    const p={re,orden,en};
    const lit=es.split('{')[0];   // texto fijo antes del primer hueco
    const pref=lit.length>=3?lit.slice(0,3).toLowerCase():'';
    if(!pref)generales.push(p);
    else{if(!porPrefijo.has(pref))porPrefijo.set(pref,[]);porPrefijo.get(pref).push(p);}
  }
  PATRONES_COMPILADOS={porPrefijo,generales};
}
// Un hueco suele ser un dato (id, número, nombre): se deja tal cual salvo que se
// reconozca como texto de la interfaz (una fase, un estado, «quedan 45 días»…).
function trHueco(c,prof){
  const k=normalizar(c);
  if(!k)return c;
  const r=traducirTexto(k,prof+1);
  if(r==null)return c;
  const m=c.match(/^(\s*)[\s\S]*?(\s*)$/);
  return m[1]+r+m[2];
}
function traducirPatron(t,prof){
  if(!PATRONES_COMPILADOS)compilarPatrones();
  const {porPrefijo,generales}=PATRONES_COMPILADOS;
  const candidatos=(porPrefijo.get(t.slice(0,3).toLowerCase())||[]).concat(generales);
  for(const p of candidatos){
    const m=t.match(p.re);
    if(!m)continue;
    const huecos={};p.orden.forEach((n,i)=>{huecos[n]=m[i+1];});
    return p.en.replace(/\{(\d+)\}/g,(_,n)=>trHueco(huecos[n]??'',prof));
  }
  return null;
}
/* Estrategias, de más a menos segura. prof limita la recursión a través de los huecos. */
function traducirTexto(n,prof=0){
  if(!n||!/[a-záéíóúñü]/i.test(n))return null;
  const exacto=I18N[n];
  if(exacto!==undefined)return exacto;
  if(prof>2)return null;
  if(n.length<=1200){const p=traducirPatron(n,prof);if(p!=null)return p;}
  // «3 sin verificar», «1 Bloqueado»: número + etiqueta conocida
  const num=n.match(/^([\d.,]+\s+)(.+)$/);
  if(num){const r=traducirTexto(num[2],prof);if(r!=null)return num[1]+r;}
  // lista de nombres entre comillas: «Huella SHA-256», «Codificar en Base64»…
  if(/^«[^»]+»(, «[^»]+»)+$/.test(n))
    return n.replace(/«([^»]+)»/g,(x,i)=>'«'+(I18N[i]??i)+'»');
  // «T1566 Spearphishing · Initial Access · Confirmada»: cada tramo reconocido se traduce;
  // los demás (datos) se dejan como están
  if(n.includes(' · ')){
    let alguno=false;
    const partes=n.split(' · ').map((x)=>{const r=traducirTexto(x,prof+1);if(r!=null){alguno=true;return r;}return x;});
    if(alguno)return partes.join(' · ');
  }
  // Tags en caja de frase («Muy alto», «Sin verificar»): el diccionario puede tener la entrada en
  // minúscula o toda en mayúsculas. Se busca así y la traducción vuelve a la caja de frase.
  if(prof<=2&&/^\p{Lu}/u.test(n)){
    for(const v of [n[0].toLowerCase()+n.slice(1),n.toUpperCase()]){
      if(v===n)continue;
      const r=traducirTexto(v,prof+1);
      if(r!=null)return textoTag(r);
    }
  }
  return null;
}
function traducirCadena(s){
  if(IDIOMA==='es'||s==null||s==='')return s;
  const k=String(s);
  if(CACHE_TRAD.has(k))return CACHE_TRAD.get(k);
  const nucleo=normalizar(k);
  let r=k;
  const t=traducirTexto(nucleo);
  if(t!=null){const m=k.match(/^(\s*)[\s\S]*?(\s*)$/);r=m[1]+t+m[2];}
  if(CACHE_TRAD.size>30000)CACHE_TRAD.clear();
  CACHE_TRAD.set(k,r);
  return r;
}
// Los mensajes de alert/confirm llevan saltos de línea con sentido: se traduce línea a línea.
const traducirMensaje=(m)=>IDIOMA==='es'?m:String(m??'').split('\n').map(traducirCadena).join('\n');

const saltar=(el)=>!el||!!el.closest(NO_TRADUCIR);
function trTexto(n){
  const p=n.parentElement;
  if(saltar(p))return;
  const actual=n.nodeValue;
  // Si lo que hay no es lo último que escribimos, lo ha puesto la aplicación: es el nuevo original.
  if(ESCRITO.get(n)!==actual)ORIG.set(n,actual);
  const orig=ORIG.get(n);
  // Un <option> sin value toma como valor su TEXTO. Traducirlo cambiaría lo que el
  // formulario envía y acabaría en inglés en el registro. Se congela el valor original.
  if(p.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',normalizar(orig));
  const t=IDIOMA==='en'?traducirCadena(orig):orig;
  if(t!==actual)n.nodeValue=t;
  ESCRITO.set(n,t);
}
function trAtributos(el){
  if(!el||el.closest(NO_TRADUCIR_ATTR))return;
  for(const a of ATTRS_TRAD){
    if(!el.hasAttribute(a))continue;
    const actual=el.getAttribute(a);
    let o=ORIG_ATTR.get(el);
    if(!o){o={};ORIG_ATTR.set(el,o);}
    if(!o[a]||o[a].escrito!==actual)o[a]={orig:actual};
    const t=IDIOMA==='en'?traducirCadena(o[a].orig):o[a].orig;
    if(t!==actual)el.setAttribute(a,t);
    o[a].escrito=t;
  }
}
function trArbol(raiz){
  if(!raiz)return;
  if(raiz.nodeType===3){trTexto(raiz);return;}
  if(raiz.nodeType!==1||raiz.closest(NO_TRADUCIR_ATTR))return;
  trAtributos(raiz);
  // textarea y compañía se visitan (por sus atributos); su texto lo descarta trTexto()
  const it=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{
    acceptNode:(n)=>n.nodeType===1&&n.matches(NO_TRADUCIR_ATTR)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n; while((n=it.nextNode())){if(n.nodeType===3)trTexto(n);else trAtributos(n);}
}

let OBS_IDIOMA=null;
function observarIdioma(activo){
  if(activo&&!OBS_IDIOMA){
    OBS_IDIOMA=new MutationObserver((registros)=>{
      for(const r of registros){
        if(r.type==='childList')r.addedNodes.forEach(trArbol);
        else if(r.type==='characterData')trTexto(r.target);
        else if(r.type==='attributes')trAtributos(r.target);
      }
      OBS_IDIOMA.takeRecords();   // descarta los cambios que acabamos de hacer nosotros
    });
    OBS_IDIOMA.observe(document.documentElement,{childList:true,subtree:true,characterData:true,
      attributes:true,attributeFilter:ATTRS_TRAD});
  }else if(!activo&&OBS_IDIOMA){OBS_IDIOMA.disconnect();OBS_IDIOMA=null;}
}

const TITULO_ORIG=document.title;
function aplicarIdioma(){
  observarIdioma(IDIOMA==='en');
  trArbol(document.body);
  document.title=IDIOMA==='en'?traducirCadena(TITULO_ORIG):TITULO_ORIG;
  document.documentElement.lang=IDIOMA;
}

/* alert, confirm y prompt: sus mensajes no pasan por el DOM. */
{
  const a=window.alert.bind(window),c=window.confirm.bind(window),p=window.prompt.bind(window);
  window.alert=(m)=>a(traducirMensaje(m));
  window.confirm=(m)=>c(traducirMensaje(m));
  window.prompt=(m,d)=>p(traducirMensaje(m),d);
}

/* Auditoría: lista lo que sigue en español en pantalla. Úsala desde la consola del
   navegador con la interfaz en inglés: auditarTraduccion() */
window.auditarTraduccion=function(){
  const pendientes=new Set();
  const esEspanol=(t)=>/[áéíóúñ¿¡]|\b(de|del|la|el|los|las|que|con|sin|para|por|una?|hay|está|son)\b/i.test(t);
  const it=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=it.nextNode())){
    if(saltar(n.parentElement)||n.parentElement.closest('.oculto'))continue;
    const t=normalizar(n.nodeValue);
    if(t&&esEspanol(t))pendientes.add(t);
  }
  document.querySelectorAll(ATTRS_TRAD.map((a)=>'['+a+']').join(',')).forEach((el)=>{
    if(saltar(el))return;
    ATTRS_TRAD.forEach((a)=>{const v=el.getAttribute(a);if(v&&esEspanol(v))pendientes.add('@'+a+': '+v);});});
  const lista=[...pendientes].sort();
  console.table(lista);
  return lista;
};

function aplicarTema(){
  document.documentElement.setAttribute('data-tema',TEMA);
  const svg=(d)=>'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" '+
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  const ct=$('#aj-tema');
  if(ct)ct.innerHTML=TEMAS.map((t)=>`<button type="button" aria-pressed="${t.id===TEMA}"
    onclick="fijarTema('${escJs(t.id)}')">${svg(t.icono)}${esc(IDIOMA==='en'?t.en:t.n)}</button>`).join('');
  const ci=$('#aj-idioma');
  if(ci)ci.innerHTML=IDIOMAS.map((l)=>`<button type="button" aria-pressed="${l.id===IDIOMA}"
    onclick="fijarIdioma('${escJs(l.id)}')"><span class="mono">${l.bandera}</span>${esc(IDIOMA==='en'?l.en:l.n)}</button>`).join('');
}

window.fijarTema=(id)=>{
  if(!TEMAS.some((x)=>x.id===id))return;
  TEMA=id;
  try{almacenamiento.setItem('tl-tema',id);}catch(e){}
  aplicarTema();
  const vista=(document.querySelector('nav button[aria-selected=true]')||{dataset:{}}).dataset.v;
  if(vista==='io'&&ioVista==='grafo')dibujarGrafo();
};
window.fijarIdioma=(id)=>{
  IDIOMA=id;
  try{almacenamiento.setItem('tl-idioma',id);}catch(e){}
  aplicarIdioma();aplicarTema();
};

try{
  const t=almacenamiento.getItem('tl-tema'); if(t&&TEMAS.some((x)=>x.id===t))TEMA=t;
  const l=almacenamiento.getItem('tl-idioma'); if(l)IDIOMA=l;
}catch(e){}
document.documentElement.setAttribute('data-tema',TEMA);
if(IDIOMA!=='es')aplicarIdioma();


