/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= vistas ================= */
/* cambia de vista. Vale también para las secciones que ya no están en el menú lateral
   (guía, ajustes y la búsqueda ampliada), a las que se llega desde la cabecera. */
// Vista de la sección IOCs: «tabla» o «grafo» (el grafo de relaciones vive ahora dentro de IOCs).
let ioVista='tabla';
/* Qué hay abierto en la modal #panel cuando es el detalle de un hito o de un IOC: {tipo,id}.
   Sirve para repintarla tras una acción (editar, seguimiento…) o cerrarla si el elemento se elimina.
   Esas modales llevan su propio pie de botones y ocultan el «Cerrar» genérico (.pie-propio). */
let PANEL_ITEM=null;

/* ---------- avisos cerrables ----------
   Todo .aviso recibe un botón de cerrar (icono sm) en cuanto aparece en la página, sin tocar cada
   sitio que los pinta. Cerrar lo oculta; si el aviso lleva data-aviso (una clave), se recuerda en
   esta pestaña y su pintor no lo vuelve a mostrar mientras la clave no cambie. Los demás vuelven a
   salir si la sección se repinta, porque describen algo que sigue pasando. */
const AVISOS_CERRADOS=new Set();
window.cerrarAviso=(b)=>{const a=b.closest('.aviso');if(!a)return;
  if(a.dataset.aviso)AVISOS_CERRADOS.add(a.dataset.aviso);
  a.classList.add('oculto');};
function avisosCerrables(raiz){
  const lista=(raiz.matches&&raiz.matches('.aviso')?[raiz]:[]).concat([...(raiz.querySelectorAll?raiz.querySelectorAll('.aviso'):[])]);
  for(const a of lista){
    if(a.querySelector(':scope>.aviso-cerrar'))continue;
    a.insertAdjacentHTML('beforeend',`<button type="button" class="secundario btn-ico btn-sm aviso-cerrar"
      onclick="cerrarAviso(this)" aria-label="Cerrar aviso" title="Cerrar">${icono('close')}</button>`);
  }
}
new MutationObserver((ms)=>{for(const m of ms){
  if(m.type==='attributes'){if(m.target.classList.contains('aviso'))avisosCerrables(m.target);continue;}
  for(const n of m.addedNodes)if(n.nodeType===1&&!n.classList.contains('aviso-cerrar'))avisosCerrables(n);}})
  .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
function abrirPanelPropio(tipo,id,etiqueta){
  PANEL_ITEM={tipo,id};
  $('#panel').classList.add('pie-propio');
  $('#panel').setAttribute('aria-label',etiqueta);
  $('#panel').classList.remove('oculto');
}
function abrirPanelGenerico(){PANEL_ITEM=null;$('#panel').classList.remove('pie-propio');}
const panelAbierto=(tipo)=>PANEL_ITEM&&PANEL_ITEM.tipo===tipo&&!$('#panel').classList.contains('oculto');
window.irA=(v)=>{
  $$('nav button[data-v]').forEach((o)=>o.ariaSelected=o.dataset.v===v);
  $$('[data-vista]').forEach((x)=>x.classList.toggle('oculto',x.dataset.vista!==v));
  window.scrollTo({top:0,behavior:'instant'});
  if(v==='io'&&ioVista==='grafo')pintarGrafo();
  if(v==='at')pintarAttack();
  if(v==='lb')pintarLab();
  if(v==='gu')pintarGuia();
  if(v==='aj')pintarAjustes();
  if(v==='no'){notaCargarBorrador();pintarNotas();}
};
$$('nav button[data-v]').forEach((b)=>b.onclick=()=>irA(b.dataset.v));

/* ---------- iconos del menú lateral ---------- */
/* Nombre del icono de Iconoir por sección; el sprite lo incrusta build.js desde src/iconos/. */
const ICONOS_NAV={
  db:'resumen', cl:'clasificacion', at:'mitre-attack',
  cr:'cronologia', hi:'hitos', pr:'preguntas-abiertas', no:'notas', tt:'total-timeline',
  ev:'evidencias', io:'iocs', lb:'laboratorio',
  ex:'exportar', au:'registro-actividad', gu:'guia', bu:'buscar', aj:'ajustes'};
const icono=(nombre,clase='')=>nombre
  ? `<svg class="ic${clase?' '+clase:''}" aria-hidden="true"><use href="#ic-${nombre}"/></svg>` : '';
/* ---------- tooltip de ayuda (icono info junto a un título) ----------
   Se abre al pasar el ratón o con el foco del teclado, se puede recorrer con el ratón sin que se
   cierre y Escape lo oculta. Si va dentro de un <summary>, pulsarlo no pliega el bloque. */
let tipN=0;
const ayudaTip=(texto,etiqueta='Más información')=>{const id='tip-'+(++tipN);
  return `<span class="tip"><button type="button" class="tip-btn" aria-label="${esc(etiqueta)}" aria-describedby="${id}"
    onclick="event.preventDefault();event.stopPropagation()">${icono('info-circle')}</button><span class="tip-caja" role="tooltip" id="${id}">${esc(texto)}</span></span>`;};
document.addEventListener('keydown',(e)=>{
  if(e.key!=='Escape')return;
  document.querySelectorAll('.tip:hover,.tip:focus-within').forEach((t)=>t.classList.add('tip-oculto'));
});
document.addEventListener('mouseout',(e)=>{const t=e.target.closest&&e.target.closest('.tip');
  if(t&&!t.contains(e.relatedTarget))t.classList.remove('tip-oculto');});
document.addEventListener('focusout',(e)=>{const t=e.target.closest&&e.target.closest('.tip');
  if(t)t.classList.remove('tip-oculto');});
$$('nav button[data-v]').forEach((b)=>{
  b.innerHTML=icono(ICONOS_NAV[b.dataset.v])+'<span class="etiqueta-nav">'+esc(b.textContent)+'</span>';
});
/* ---------- contraer / expandir menú lateral ---------- */
const navEl=document.querySelector('nav'),navToggle=$('#nav-toggle');
function fijarNav(contraida){
  navEl.classList.toggle('contraida',contraida);
  document.querySelector('.marco').style.setProperty('--nav-w',contraida?'64px':'246px');
  navToggle.setAttribute('aria-expanded',String(!contraida));
  navToggle.setAttribute('aria-label',contraida?'Expandir menú':'Contraer menú');
  try{almacenamiento.setItem('tl-nav-contraida',contraida?'1':'0');}catch(e){}
}
navToggle.onclick=()=>fijarNav(!navEl.classList.contains('contraida'));
try{if(almacenamiento.getItem('tl-nav-contraida')==='1')fijarNav(true);}catch(e){}

/* ---------- menús desplegables de la cabecera ---------- */
function cerrarMenus(salvo){
  for(const [b,l] of [['#btn-descargas','#lista-descargas'],['#btn-usuario','#lista-usuario']]){
    if(l===salvo)continue;
    $(l).classList.add('oculto');
    $(b).setAttribute('aria-expanded','false');
  }
  if(salvo!=='#cab-buscar-res')$('#cab-buscar-res').classList.add('oculto');
}
const alternarMenu=(btn,lista)=>(e)=>{
  e.stopPropagation();
  const abierto=!$(lista).classList.contains('oculto');
  cerrarMenus();
  if(!abierto){$(lista).classList.remove('oculto');$(btn).setAttribute('aria-expanded','true');}
};
$('#btn-descargas').onclick=alternarMenu('#btn-descargas','#lista-descargas');
$('#btn-usuario').onclick=alternarMenu('#btn-usuario','#lista-usuario');
$('#lista-descargas').onclick=()=>setTimeout(cerrarMenus,60);
$('#lista-usuario').onclick=(e)=>e.stopPropagation();
document.addEventListener('click',(e)=>{
  if(!$('#menu-descargas').contains(e.target)&&!$('#menu-usuario').contains(e.target)&&
     !$('.buscador').contains(e.target))cerrarMenus();
});
document.addEventListener('keydown',(e)=>{
  // Menú de fila abierto con el ratón: la flecha abajo lleva el foco a la primera acción.
  if(e.key==='ArrowDown'&&menuFilaBtn&&document.activeElement===menuFilaBtn){
    e.preventDefault();const b=menuFlotante.querySelector('button');if(b)b.focus();return;}
  if(e.key!=='Escape')return;
  cerrarMenuFila(true);
  cerrarMenus();
  if(!$('#visor').classList.contains('oculto'))cerrarVisor();
});
document.addEventListener('click',(e)=>{if(e.target&&e.target.id==='visor')cerrarVisor();});

/* ---------- menú de acciones por fila (tres puntos) ----------
   Las tablas llevan overflow:hidden y backdrop-filter, que recortan cualquier desplegable
   posicionado dentro de ellas. Por eso cada fila guarda sus acciones en una lista oculta y, al
   abrir, se copian a un único menú flotante colgado del <body> y colocado junto al botón.
   Se abre con clic (no con hover), se recorre con las flechas y se cierra con Escape, al elegir
   una acción, al pulsar fuera, al desplazar la página o al cambiar el tamaño de la ventana. */
/* Icono de cada acción de los menús de tres puntos, por su texto. Las de «Pasar a…» usan el
   icono de su sección en la barra lateral; «Rol», el del botón de analista de la cabecera. */
const ICONO_ACCION={'Editar':'edit','Eliminar':'eliminar','Responder':'responder','Seguimiento':'seguimiento',
  'Iniciar':'play','Reanudar':'play','Bloquear':'bloquear','Finalizar':'finalizar',
  'Pasar a Cronología':'cronologia','Pasar a Hito':'hitos','Pasar a Pregunta':'preguntas-abiertas',
  'Copiar':'copy','Pasar a borrador':'borrador','Verificar':'verificar','Transferir':'transferir',
  'Trazabilidad':'link','Valorar':'valorar','Rol':'usuario','Vincular':'vincular',
  'Consultar':'consultar','Documentar':'documentar'};
// enLista: menú que se recorre con Tab (el de las notas), sin el role/tabindex del menú flotante.
const itemMenu=(txt,accion,enLista=false)=>`<button class="secundario"${enLista?'':' role="menuitem" tabindex="-1"'} onclick="${accion}">${
  ICONO_ACCION[txt]?icono(ICONO_ACCION[txt],'ic-sm'):''}${esc(txt)}</button>`;
const menuAcciones=(etiqueta,acciones)=>`<div class="menu-fila">
  <button class="secundario btn-ico btn-lg" aria-haspopup="menu" aria-expanded="false"
    aria-label="${esc(etiqueta)}" title="${esc(etiqueta)}"
    onclick="alternarMenuFila(this,event)">${icono('more-horiz')}</button>
  <div class="oculto" data-acciones>${acciones.map(([txt,accion])=>itemMenu(txt,accion)).join('')}</div>
</div>`;
/* ---------- acciones rápidas (cabecera de página) ----------
   lista: [{txt, icono, accion}], donde accion es el código del onclick. Caben 4: si hay más, se
   ven las 3 primeras y la 4.ª posición pasa a ser «Otras acciones», que abre el resto en el mismo
   menú flotante que las filas de tabla (teclado, Escape, cierre al pulsar fuera). */
const accionesRapidas=(lista)=>{
  const MAX=4;
  const vistas=lista.length>MAX?lista.slice(0,MAX-1):lista;
  const resto=lista.length>MAX?lista.slice(MAX-1):[];
  // Una acción con «menu» abre un desplegable con sus opciones, en el mismo menú flotante.
  const boton=(a)=>a.menu?`<div class="menu-fila">
    <button type="button" class="accion-rapida" aria-haspopup="menu" aria-expanded="false"
      onclick="alternarMenuFila(this,event)">
      <span class="ar-ico">${icono(a.icono)}</span><span class="ar-txt">${esc(a.txt)}</span></button>
    <div class="oculto" data-acciones>${a.menu.map((m)=>
      `<button class="secundario" role="menuitem" tabindex="-1" onclick="${esc(m.accion)}">${icono(m.icono,'ic-sm')}${esc(m.txt)}</button>`).join('')}</div>
  </div>`:`<button type="button" class="accion-rapida" onclick="${esc(a.accion)}">
    <span class="ar-ico">${icono(a.icono)}</span><span class="ar-txt">${esc(a.txt)}</span></button>`;
  let h=vistas.map(boton).join('');
  if(resto.length)h+=`<div class="menu-fila">
    <button type="button" class="accion-rapida" aria-haspopup="menu" aria-expanded="false"
      aria-label="Otras acciones" onclick="alternarMenuFila(this,event)">
      <span class="ar-ico">${icono('more-horiz')}</span><span class="ar-txt" aria-hidden="true">Otras acciones</span></button>
    <div class="oculto" data-acciones>${resto.map((a)=>
      `<button class="secundario" role="menuitem" tabindex="-1" onclick="${esc(a.accion)}">${icono(a.icono,'ic-sm')}${esc(a.txt)}</button>`).join('')}</div>
  </div>`;
  return `<div class="acciones-rapidas">${h}</div>`;
};
// Acciones de cabecera fijas. En IOCs, «Añadir a mano» y «Copiar los relevantes» siguen con icono provisional.
$('#io-acciones').innerHTML=accionesRapidas([
  {txt:'Añadir IOC',icono:'iocs',accion:'iocManual()'},
  {txt:'Copiar los relevantes',icono:'registro-actividad',accion:'copiarIocsRepo()'},
  {txt:'CSV',icono:'csv',accion:'exportarIocs()'}]);
// «Capa para Navigator» sale de las acciones rápidas; attCapa() se conserva por si se recupera.
$('#at-acciones').innerHTML=accionesRapidas([
  {txt:'Registrar técnica',icono:'registrar-tecnica',accion:'attAnadir()'},
  {txt:'Importar catálogo',icono:'importar',accion:'attImportar()'},
  {txt:'Descargar CSV',icono:'csv',accion:'attCsv()'}]);

/* ---------- formularios plegados bajo una acción rápida ----------
   El formulario de alta de cada sección está oculto: su acción rápida lo abre (y lleva el foco al
   primer campo) y «Cancelar» lo cierra. Al cerrarlo no se borra lo escrito: si se vuelve a abrir,
   sigue ahí. Tras añadir, el formulario queda abierto para poder encadenar varias altas. */
window.abrirForm=(id,foco)=>{
  const f=document.getElementById(id);if(!f)return;
  f.classList.remove('oculto');
  const campo=foco&&document.getElementById(foco);
  if(campo)campo.focus({preventScroll:true});
  f.scrollIntoView({behavior:'smooth',block:'nearest'});
};
window.cerrarForm=(id)=>{const f=document.getElementById(id);if(f)f.classList.add('oculto');};
// Exportar: las exportaciones de datos en bruto, en un desplegable (antes, tarjeta «Otras exportaciones»).
// Icono provisional: exportar.
const clicEn=(sel)=>`document.querySelector('${sel}').click()`;
$('#ex-acciones').innerHTML=accionesRapidas([{txt:'Otras exportaciones',icono:'exportar',menu:[
  {txt:'Acta de evidencias CSV',icono:'csv',accion:clicEn('#exp-custodia')},
  {txt:'Historial de transferencias CSV',icono:'csv',accion:clicEn('#exp-custodiahist')},
  {txt:'Hitos CSV',icono:'csv',accion:clicEn('#exp-hitos')},
  {txt:'Cronología CSV',icono:'csv',accion:clicEn('#exp-crono')},
  {txt:'IOCs CSV',icono:'csv',accion:'exportarIocs()'},
  {txt:'Preguntas CSV',icono:'csv',accion:clicEn('#exp-preg')},
  {txt:'Total timeline CSV',icono:'csv',accion:clicEn('#exp-tt')},
  {txt:'Registro JSONL',icono:'exportar',accion:clicEn('#exp-registro')}]}]);
$('#cr-acciones').innerHTML=accionesRapidas([
  {txt:'Añadir hecho',icono:'anadir-hecho',accion:"abrirForm('cr-form','cr-fecha')"}]);
$('#hi-acciones').innerHTML=accionesRapidas([
  {txt:'Añadir nuevo hito',icono:'anadir-hecho',accion:"abrirForm('hi-form','hi-hito')"},
  {txt:'Aplicar plantilla',icono:'plantilla',accion:'aplicarPlantilla()'}]);
$('#pr-acciones').innerHTML=accionesRapidas([
  {txt:'Añadir pregunta',icono:'preguntas-abiertas',accion:"abrirForm('pr-form','pr-texto')"}]);
$('#no-acciones').innerHTML=accionesRapidas([
  {txt:'Añadir nueva nota',icono:'edit',accion:"abrirForm('no-form','nota-borrador')"}]);
$('#ev-acciones').innerHTML=accionesRapidas([
  {txt:'Añadir evidencia',icono:'registrar-tecnica',accion:"abrirForm('ev-form','zona')"}]);
$('#cr-cancelar').onclick=()=>cerrarForm('cr-form');
$('#hi-cancelar').onclick=()=>cerrarForm('hi-form');
$('#pr-cancelar').onclick=()=>cerrarForm('pr-form');
$('#no-cancelar').onclick=()=>cerrarForm('no-form');

/* ---------- menús de página (Filtrar y Ordenar por del total timeline) ----------
   Se abren con clic, se cierran al pulsar fuera, con Escape o al abrir otro. */
const MENUS_PAGINA=[['#tt-filtrar','#tt-filtro-lista'],['#tt-orden','#tt-orden-lista']];
function cerrarMenusPagina(salvo){
  for(const [b,l] of MENUS_PAGINA){
    if(l===salvo||!$(l))continue;
    $(l).classList.add('oculto');$(b).setAttribute('aria-expanded','false');
  }
}
for(const [b,l] of MENUS_PAGINA){
  $(b).onclick=(e)=>{
    e.stopPropagation();
    const abierto=!$(l).classList.contains('oculto');
    cerrarMenusPagina();cerrarMenus();
    if(abierto)return;
    $(l).classList.remove('oculto');$(b).setAttribute('aria-expanded','true');
    const primero=$(l).querySelector('input,button');
    if(primero&&(e.detail===0||primero.tagName==='INPUT'))primero.focus();
  };
  $(l).addEventListener('click',(e)=>e.stopPropagation());
}
document.addEventListener('click',()=>cerrarMenusPagina());
document.addEventListener('keydown',(e)=>{
  if(e.key!=='Escape')return;
  const abierto=MENUS_PAGINA.find(([,l])=>$(l)&&!$(l).classList.contains('oculto'));
  if(abierto){cerrarMenusPagina();$(abierto[0]).focus();}
});
let menuFilaBtn=null;
const menuFlotante=(()=>{const m=document.createElement('div');
  m.className='menu-lista flotante oculto';m.setAttribute('role','menu');
  document.body.appendChild(m);return m;})();
function cerrarMenuFila(devolverFoco){
  if(!menuFilaBtn)return;
  const b=menuFilaBtn;menuFilaBtn=null;
  menuFlotante.classList.add('oculto');menuFlotante.innerHTML='';
  b.setAttribute('aria-expanded','false');
  if(devolverFoco&&b.isConnected)b.focus();
}
window.alternarMenuFila=(btn,e)=>{
  e.stopPropagation();
  const mismo=menuFilaBtn===btn;
  cerrarMenuFila(false);cerrarMenus();
  if(mismo)return;
  menuFlotante.innerHTML=btn.nextElementSibling.innerHTML;
  menuFlotante.setAttribute('aria-label',btn.getAttribute('aria-label')||'');
  menuFlotante.classList.remove('oculto');
  const r=btn.getBoundingClientRect(),m=menuFlotante.getBoundingClientRect(),hueco=6;
  const abajo=r.bottom+hueco+m.height<=window.innerHeight-8;
  menuFlotante.style.top=(abajo?r.bottom+hueco:Math.max(8,r.top-hueco-m.height))+'px';
  menuFlotante.style.left=Math.max(8,Math.min(r.right-m.width,window.innerWidth-m.width-8))+'px';
  btn.setAttribute('aria-expanded','true');menuFilaBtn=btn;
  // Con teclado (Enter/Espacio llegan con detail 0) el foco pasa a la primera acción; con ratón no,
  // para no pintar el anillo de foco sobre una opción que nadie ha elegido.
  if(e.detail===0){const primero=menuFlotante.querySelector('button');if(primero)primero.focus();}
};
menuFlotante.addEventListener('click',(e)=>{
  e.stopPropagation();
  if(e.target.closest('button'))setTimeout(()=>cerrarMenuFila(false),0);
});
menuFlotante.addEventListener('keydown',(e)=>{
  const bs=[...menuFlotante.querySelectorAll('button')],i=bs.indexOf(document.activeElement);
  if(!bs.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();bs[(i+1)%bs.length].focus();}
  else if(e.key==='ArrowUp'){e.preventDefault();bs[(i-1+bs.length)%bs.length].focus();}
  else if(e.key==='Home'){e.preventDefault();bs[0].focus();}
  else if(e.key==='End'){e.preventDefault();bs[bs.length-1].focus();}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrarMenuFila(true);}
  else if(e.key==='Tab')cerrarMenuFila(true);
});
document.addEventListener('click',()=>cerrarMenuFila(false));
window.addEventListener('scroll',()=>cerrarMenuFila(false),true);
window.addEventListener('resize',()=>cerrarMenuFila(false));

$('#btn-ajustes').onclick=()=>{cerrarMenus();irA('aj');};

let ULTIMO_DIAG=null;
$('#btn-autodiag').onclick=async()=>{
  const c=$('#autodiag');
  c.innerHTML='<div class="vacio">Ejecutando…</div>';
  const r=await ejecutarAutopruebas();
  ULTIMO_DIAG=r;
  const total=r.reduce((a,s)=>a+s.pruebas.length,0);
  const mal=r.reduce((a,s)=>a+s.pruebas.filter((p)=>!p.ok).length,0);
  const ms=r.reduce((a,s)=>a+s.pruebas.reduce((b,p)=>b+p.ms,0),0);
  c.innerHTML=`<div class="kpis" style="margin-bottom:18px">
      <div class="kpi ${mal?'alerta':''}"><div class="et">Resultado</div>
        <div class="num chico">${mal?mal+(mal===1?' fallo':' fallos'):'Todo correcto'}</div>
        <div class="pie">${total-mal} de ${total} pruebas</div></div>
      <div class="kpi"><div class="et">Duración</div><div class="num chico">${Math.round(ms)} ms</div>
        <div class="pie">${esc(VERSION)}</div></div>
    </div>`+
    r.map((s)=>`<h3 style="margin-top:18px">${esc(s.nombre)}</h3>
      <ul class="lista-db">${s.pruebas.map((p)=>`<li>
        <span class="tick ${p.ok?'si':'no'}">${p.ok?icono('check'):icono('close')}</span>
        <span class="txt">${esc(p.d)}${p.ok?'':`<div class="sub">${esc(p.error)}</div>`}</span>
        <span class="antig">${Math.round(p.ms)} ms</span></li>`).join('')}</ul>`).join('')+
    (mal?`<div class="aviso rojo" style="margin-top:18px">Hay pruebas que fallan. No uses esta copia
      para un caso real hasta averiguar por qué: puede estar modificada o corrupta.</div>`:'');
};

$('#btn-autodiag-csv').onclick=()=>{
  if(!ULTIMO_DIAG){alert('Ejecuta primero el autodiagnóstico.');return;}
  bajar('autodiagnostico.csv',csv([['Suite','Prueba','Resultado','Detalle','ms'],
    ...ULTIMO_DIAG.flatMap((s)=>s.pruebas.map((p)=>
      [s.nombre,p.d,p.ok?'correcto':'FALLO',p.error||'',Math.round(p.ms)]))]),'text/csv');
};

/* ---------- playbooks e informes propios ---------- */
function pintarAjustesExtra(){
  const propios=cargarPlaybooks();
  const nombres=Object.keys(PLANTILLAS);
  $('#aj-playbooks').innerHTML=`<table><thead><tr><th>Playbook</th><th>Origen</th>
    <th>Hitos</th><th>Preguntas</th></tr></thead><tbody>`+
    nombres.map((n)=>{const p=PLANTILLAS[n];
      return `<tr><td>${esc(n)}${p.descripcion?`<div class="sub">${esc(p.descripcion)}</div>`:''}</td>
        <td><span class="est ${p.propio?'curso':'pend'}">${p.propio?'Propio':'De serie'}</span></td>
        <td class="mono">${p.hitos.length}</td><td class="mono">${p.preguntas.length}</td></tr>`;}).join('')+
    `</tbody></table><p class="ayuda" style="margin:12px 0 0">${propios.length
      ?propios.length+(propios.length===1?' playbook propio cargado':' playbooks propios cargados')
      :'No hay playbooks propios cargados.'}</p>`;

  const inf=informesPropios();
  $('#aj-informes').innerHTML=inf.length
    ? `<table><thead><tr><th>Informe</th><th>Identificador</th><th>Secciones</th></tr></thead><tbody>`+
      inf.map((x)=>`<tr><td>${esc(x.titulo||'sin título')}
        ${x.descripcion?`<div class="sub">${esc(x.descripcion)}</div>`:''}</td>
        <td class="mono">${esc(x.id||'—')}</td>
        <td class="mono">${(x.secciones||[]).length}</td></tr>`).join('')+'</tbody></table>'
    : '<div class="vacio">No hay informes personalizados. Los cuatro de serie siguen disponibles en Exportar.</div>';

  $('#aj-bloques').innerHTML=Object.entries(BLOQUES_DOC)
    .map(([k,v])=>`<tr><td class="mono">${esc(k)}</td><td class="desenlace">${esc(v)}</td></tr>`).join('');
}

window.ejemploPlaybooks=()=>bajar('playbooks-ejemplo.json',JSON.stringify({
 "_ayuda":"Cada playbook crea hitos pendientes y preguntas abiertas. Las fases deben coincidir con las de datos-base.json.",
 "playbooks":[
  {"nombre":"Acceso no autorizado a servicio expuesto",
   "descripcion":"Explotación de un servicio publicado en Internet",
   "hitos":[
    ["Notificacion","Confirmar la alerta e identificar el servicio expuesto"],
    ["Contencion","Documentar el bloqueo del acceso o la retirada del servicio"],
    ["Adquisicion de evidencias","Preservar registros del servicio, del WAF y del perimetro"],
    ["Analisis","Identificar la vulnerabilidad explotada y su identificador CVE"],
    ["Analisis","Determinar si hubo ejecucion de codigo o solo intento"],
    ["Erradicacion","Aplicar el parche o la mitigacion del fabricante"],
    ["Recuperacion","Verificar que el servicio queda expuesto sin la vulnerabilidad"],
    ["Cierre","Documentar alcance y medidas"]],
   "preguntas":[
    "¿Desde cuando estaba el servicio expuesto con esa version?",
    "¿La explotacion tuvo exito o quedo en intento?",
    "¿Existen otros sistemas con la misma version?"]}]},null,2),'application/json');

window.ejemploInformes=()=>bajar('informes-ejemplo.json',JSON.stringify({
 "_ayuda":"Cada seccion admite: titulo con nivel 1 o 2, texto fijo, pendiente (recuadro para el analista) y bloque (datos que rellena la consola). Consulta la lista de bloques en Ajustes.",
 "informes":[
  {"id":"nota-cliente",
   "titulo":"Nota de situacion para el cliente",
   "fichero":"nota_situacion",
   "descripcion":"Resumen breve para enviar a la entidad durante el incidente",
   "secciones":[
    {"nivel":1,"titulo":"1. Situacion actual"},
    {"texto":"Esta nota resume la situacion del incidente en el momento de su emision y sustituye a cualquier version anterior."},
    {"bloque":"ficha"},
    {"pendiente":"Redactar en cinco lineas y sin tecnicismos que ha ocurrido, que se ha hecho y que se necesita de la entidad."},
    {"nivel":1,"titulo":"2. Estado del trabajo"},
    {"bloque":"hitos"},
    {"nivel":2,"titulo":"2.1. Cuestiones pendientes"},
    {"bloque":"preguntas"},
    {"nivel":1,"titulo":"3. Indicadores para bloqueo"},
    {"texto":"Los valores se facilitan sin neutralizar para su uso operativo. Verifiquense antes de aplicarlos en produccion."},
    {"bloque":"iocs-publicos"},
    {"nivel":1,"titulo":"4. Proximos pasos"},
    {"pendiente":"Indicar que se va a hacer a continuacion, con quien y en que plazo."}]}]},null,2),'application/json');

async function cargarJson(f,clave,campo,etiqueta){
  try{
    const j=JSON.parse(await f.text());
    const lista=Array.isArray(j)?j:j[campo];
    if(!Array.isArray(lista)||!lista.length)
      throw new Error('el fichero no contiene una lista válida');
    if(clave==='tl-playbooks' && lista.some((x)=>!x||typeof x!=='object'||Array.isArray(x)||typeof x.nombre!=='string'||x.nombre.length>200||!Array.isArray(x.hitos)||!Array.isArray(x.preguntas)||x.hitos.length>128||x.preguntas.length>256))
      throw new Error('PLAYBOOK_ESQUEMA_INVALIDO');
    if(clave==='tl-informes' && lista.some((x)=>!x||typeof x!=='object'||Array.isArray(x)||typeof x.id!=='string'||x.id.length>100||typeof x.titulo!=='string'||x.titulo.length>200||!Array.isArray(x.secciones)||x.secciones.length>64||x.secciones.some((z)=>!z||typeof z!=='object'||Array.isArray(z))))
      throw new Error('INFORME_ESQUEMA_INVALIDO');
    almacenamiento.setItem(clave,JSON.stringify(lista));
    pintarAjustesExtra();
    if(clave==='tl-playbooks'){
      const f2=$('#hi-fase');
      if(f2)f2.innerHTML=DATOS.fases.map((x)=>`<option>${esc(x)}</option>`).join('');
    }
    pintarExport();
    alert(lista.length+' '+etiqueta+' cargados. Quedan guardados en este navegador.');
  }catch(e){ alert('No se ha podido cargar el fichero: '+e.message); }
}

$('#aj-pb-fichero').onchange=(e)=>{const f=e.target.files[0];e.target.value='';
  if(f)cargarJson(f,'tl-playbooks','playbooks','playbooks');};
$('#aj-inf-fichero').onchange=(e)=>{const f=e.target.files[0];e.target.value='';
  if(f)cargarJson(f,'tl-informes','informes','informes');};

window.quitarPlaybooks=()=>{
  if(!confirm('Se quitarán los playbooks propios de este navegador. Los de serie no se tocan.'))return;
  almacenamiento.removeItem('tl-playbooks');cargarPlaybooks();pintarAjustesExtra();};
window.quitarInformes=()=>{
  if(!confirm('Se quitarán los informes personalizados de este navegador.'))return;
  almacenamiento.removeItem('tl-informes');pintarAjustesExtra();pintarExport();};
$('#btn-guia').onclick=()=>{cerrarMenus();irA('gu');};

/* ---------- buscador de la cabecera ---------- */
function buscadorRapido(){
  const q=$('#cab-buscar').value.trim();
  const caja=$('#cab-buscar-res');
  if(q.length<2||!ASIENTOS.length){caja.classList.add('oculto');return;}
  const p=q.toLowerCase().split(/\s+/);
  const hits=registrosBuscables().filter((r)=>{
    const h=(r.titulo+' '+r.texto).toLowerCase();
    return p.every((x)=>h.includes(x));
  }).slice(0,8);
  caja.innerHTML=hits.length
    ? hits.map((r)=>`<button class="res-rapido" onclick="irDesdeBuscador('${escJs(r.vista)}')">
        <b>${esc(r.titulo)}</b><span>${esc(r.tipo)} · ${esc(r.texto.slice(0,90))}</span></button>`).join('')+
      `<div class="menu-grupo">Pulsa Intro para ver todas</div>`
    : '<div class="menu-grupo">Sin coincidencias</div>';
  cerrarMenus('#cab-buscar-res');
  caja.classList.remove('oculto');
}
window.irDesdeBuscador=(v)=>{cerrarMenus();irA(v);};
$('#cab-buscar').oninput=buscadorRapido;
$('#cab-buscar').onkeydown=(e)=>{
  if(e.key!=='Enter')return;
  const q=$('#cab-buscar').value.trim();
  cerrarMenus();
  $('#bus-q').value=q;
  irA('bu');
  pintarBusqueda();
};

$('#nota-borrador').oninput=notaAutoguardar;
$('#att-fichero').onchange=(e)=>{const f=e.target.files[0];e.target.value='';if(f)attProcesar(f);};
$('#bus-q').oninput=pintarBusqueda;

function refrescar(){
  EST=derivar();
  const c=EST.cadena;
  $('#pip').className='pip '+(ASIENTOS.length?(c.integra?'ok':'mal'):'');
  $('#estado-cadena').textContent=!ASIENTOS.length?'Sin carpeta abierta'
    :c.integra?`Cadena íntegra · ${c.n} asientos`:`Cadena rota en el asiento ${c.en}`;
  $('#sello').textContent=c.integra?(c.sello||'—').slice(0,32)+'…':c.motivo;
  pintarDb();pintarClasificacion();pintarEv();pintarSelloEstado();pintarHi();pintarCr();pintarIocs();
  pintarPr();pintarTt();pintarRegistro();pintarBusqueda();pintarAttack();
  const vista=(document.querySelector('nav button[aria-selected=true]')||{dataset:{}}).dataset.v;
  if(vista==='io'&&ioVista==='grafo')pintarGrafo();
  if(vista==='lb')pintarLab();
  pintarExport();pintarGuia();pintarNotas();pintarAjustesExtra();
  aplicarTema();   // la traducción la aplica el observador de 17-ajustes-tema-idioma.js al entrar cada nodo
  if(!SONDEO)SONDEO=setInterval(async()=>{
    if(!dirCaso||document.hidden)return;
    if(!$('#modal-pedir').classList.contains('oculto'))return;  // no recargar con un formulario abierto
    const b0=bytesRegistro,m0=marcaRegistro;
    // sincronizar() devuelve true también cuando no hay cambios: sin esta comprobación
    // se redibujaba la aplicación entera cada 7 s aunque nadie hubiera anotado nada.
    if(await sincronizar()&&(bytesRegistro!==b0||marcaRegistro!==m0))refrescar();
  },7000);
  if(!RELOJ)RELOJ=setInterval(()=>{
    document.querySelectorAll('.reloj[data-vivo]')
      .forEach((el)=>el.textContent=dur(el.dataset.inicio,new Date().toISOString()));
    document.querySelectorAll('.reloj-db[data-desde]')
      .forEach((el)=>el.textContent=humanizarDias(Date.now()-Number(el.dataset.desde)));},1000);
}

