/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= hitos ================= */
function aplicarDatosBase(){
  $('#hi-fase').innerHTML=DATOS.fases.map((f)=>`<option>${esc(f)}</option>`).join('');
  $('#hi-riesgo').innerHTML=DATOS.riesgos.map((r)=>`<option${r==='Medio'?' selected':''}>${esc(r)}</option>`).join('');
  $('#cr-zona').innerHTML=DATOS.husos.map((h)=>`<option>${esc(h)}</option>`).join('');
  $('#lista-analistas').innerHTML=DATOS.analistas
    .map((a)=>`<option value="${esc(a.nombre||a)}">`).join('');
  $('#lista-metodos').innerHTML=DATOS.metodosAdquisicion.map((m)=>`<option value="${esc(m)}">`).join('');
  $('#lista-clientes').innerHTML=DATOS.clientes
    .map((c)=>`<option value="${esc(c.nombre||c)}">`).join('');
  const guardado=almacenamiento.getItem('ir-cliente');
  if(guardado&&!$('#cliente').value)$('#cliente').value=guardado;
}

async function cargarDatosBase(){
  let bruto=null;
  if(dirCaso){
    try{
      const h=await dirCaso.getFileHandle('datos-base.json');
      bruto=await (await h.getFile()).text();
    }catch(e){
      // no existe: se crea una plantilla editable dentro de la carpeta del caso
      try{
        const h=await dirCaso.getFileHandle('datos-base.json',{create:true});
        const w=await h.createWritable();
        await w.write(JSON.stringify(DATOS_DEFECTO,null,2));
        await w.close();
      }catch(_){}
    }
  }
  if(!bruto)bruto=almacenamiento.getItem('ir-datos-base');
  if(bruto){
    try{
      const d=JSON.parse(bruto);
      DATOS=Object.assign(JSON.parse(JSON.stringify(DATOS_DEFECTO)),d);
      almacenamiento.setItem('ir-datos-base',bruto);
    }catch(e){alert('datos-base.json no es JSON valido: '+e.message);}
  }
  aplicarDatosBase();
}

$('#cliente').onchange=async()=>{
  const v=$('#cliente').value.trim();
  almacenamiento.setItem('ir-cliente',v);
  if(dirCaso)await anotar('CASO_CLIENTE',{cliente:v});
};

aplicarDatosBase();

marcarObligatorio('hi-hito');marcarObligatorio('hi-estado');
async function nuevoHito(iniciado){
  const hito=$('#hi-hito').value.trim();
  if(!hito){$('#hi-hito').focus();return;}
  if(typeof iniciado!=='boolean'){$('#hi-estado').focus();return;}
  if(!exigeCarpeta())return;
  await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase:$('#hi-fase').value,hito,
    propietario:$('#hi-prop').value.trim()||analista(),riesgo:$('#hi-riesgo').value,
    notas:$('#hi-notas').value.trim(),iniciado});
  $('#hi-hito').value='';$('#hi-notas').value='';$('#hi-estado').value='';
  cerrarForm('hi-form');
}
// El estado se elige en el formulario («Iniciar ahora» o «Pendiente»); es obligatorio.
$('#hi-add').onclick=()=>{const e=$('#hi-estado').value;
  nuevoHito(e==='iniciar'?true:e==='pendiente'?false:null);};

window.hitoIniciar=(id)=>anotar('HITO_INICIADO',{id});
window.hitoFinalizar=async(id)=>{
  const h=EST.hi.find((x)=>x.id===id);
  const d=await pedir('Finalizar hito',[
    {id:'resultado',etiqueta:'Resultado del hito',tipo:'textarea',
     pista:'Qué se consiguió y con qué evidencia queda respaldado'},CAMPO_PRUEBAS],
    h.hito+' — la hora de fin se sella al aceptar. El resultado es opcional, pero un hito sin '+
    'resultado no aporta nada al informe.');
  if(!d)return;
  const pruebas=await guardarPruebas(id,d.pruebas);
  await anotar('HITO_FINALIZADO',{id,resultado:d.resultado,pruebas});};
window.hitoBloquear=async(id)=>{
  const h=EST.hi.find((x)=>x.id===id);
  const d=await pedir('Bloquear hito',[
    {id:'motivo',etiqueta:'Motivo del bloqueo',tipo:'textarea',requerido:true,
     pista:'Qué falta y de quién depende'},CAMPO_PRUEBAS],h.hito);
  if(!d)return;
  const pruebas=await guardarPruebas(id,d.pruebas);
  await anotar('HITO_BLOQUEADO',{id,motivo:d.motivo,pruebas});};
window.hitoReanudar=(id)=>anotar('HITO_REANUDADO',{id});
window.hitoSeguimiento=async(id)=>{
  const h=EST.hi.find((x)=>x.id===id);
  const d=await pedir('Anotar seguimiento',[
    {id:'texto',etiqueta:'Anotación',tipo:'textarea',requerido:true,
     pista:'Qué ha cambiado desde la última anotación'},CAMPO_PRUEBAS],
    h.hito+' — la anotación queda fechada y firmada con tu nombre.');
  if(!d)return;
  const pruebas=await guardarPruebas(id,d.pruebas);
  await anotar('HITO_SEGUIMIENTO',{id,texto:d.texto,pruebas});};

const CLASE={'Pendiente':'pend','En proceso':'curso','Bloqueado':'bloq','Terminado':'ok'};

/* ---------- editar y eliminar ----------
   Editar añade un asiento con los campos nuevos (el original sigue en el registro). Eliminar
   saca el hito de la tabla, del resumen y de lo que se exporta, pero no lo borra del registro:
   por eso pide el motivo. */
window.hitoEditar=async(id)=>{
  if(!exigeCarpeta())return;
  const h=EST.hi.find((x)=>x.id===id);if(!h)return;
  const fases=[...new Set([...FASES(),h.fase])], riesgos=[...new Set([...(DATOS.riesgos||['Bajo','Medio','Alto']),h.riesgo])];
  const d=await pedir('Editar '+id,[
    {id:'hito',etiqueta:'Hito',valor:h.hito,requerido:true},
    {id:'fase',etiqueta:'Fase',tipo:'select',opciones:fases,valor:h.fase,requerido:true},
    {id:'propietario',etiqueta:'Propietario',valor:h.propietario||''},
    {id:'riesgo',etiqueta:'Riesgo',tipo:'select',opciones:riesgos,valor:h.riesgo,requerido:true},
    {id:'notas',etiqueta:'Notas',tipo:'textarea',valor:h.notas||''},
    {id:'motivo',etiqueta:'Motivo del cambio',tipo:'textarea',pista:'Opcional: por qué se corrige'}],
    'Las horas, el estado y el seguimiento no se editan: los marcan las propias acciones del hito. '+
    'El asiento original permanece en el registro.');
  if(!d)return;
  await anotar('HITO_EDITADO',{id,hito:d.hito,fase:d.fase,propietario:d.propietario,riesgo:d.riesgo,
    notas:d.notas,motivo:d.motivo||''});
};
window.hitoEliminar=async(id)=>{
  if(!exigeCarpeta())return;
  const h=EST.hi.find((x)=>x.id===id);if(!h)return;
  const d=await pedir('Eliminar '+id,[
    {id:'motivo',etiqueta:'Motivo',tipo:'textarea',requerido:true,
     pista:'Duplicado, creado por error, no aplica a este caso…'}],
    h.hito+' — el hito deja de aparecer en la tabla y en los documentos. El asiento original '+
    'permanece en el registro.');
  if(!d)return;
  $('#panel').classList.add('oculto');
  await anotar('HITO_ELIMINADO',{id,hito:h.hito,motivo:d.motivo});
};

/* Acciones de cada hito según su estado. */
function accionesHito(h){
  const id=escJs(h.id);
  const A={iniciar:['Iniciar',`hitoIniciar('${id}')`],finalizar:['Finalizar',`hitoFinalizar('${id}')`],
    seguimiento:['Seguimiento',`hitoSeguimiento('${id}')`],bloquear:['Bloquear',`hitoBloquear('${id}')`],
    reanudar:['Reanudar',`hitoReanudar('${id}')`],editar:['Editar',`hitoEditar('${id}')`],
    eliminar:['Eliminar',`hitoEliminar('${id}')`]};
  const por={'Pendiente':['iniciar','editar','eliminar'],
    'En proceso':['finalizar','seguimiento','bloquear','editar'],
    'Bloqueado':['reanudar','seguimiento','editar'],
    'Terminado':['seguimiento','editar','eliminar']}[h.estado]||['editar'];
  return por.map((k)=>A[k]);
}

/* ---------- detalle del hito (modal) ----------
   La fila de la tabla solo lleva lo esencial; al pulsarla se abre todo: riesgo, horas,
   duración, notas, resultado o bloqueo y el hilo de seguimiento con sus pruebas. */
window.filaHito=(e,id)=>{
  if(e.target.closest('button,a,summary,input,select,textarea'))return;
  verHito(id);
};
window.verHito=(id)=>{
  const h=EST.hi.find((x)=>x.id===id);if(!h)return;
  const vivo=h.estado==='En proceso'||h.estado==='Bloqueado';
  const borrable=h.estado==='Pendiente'||h.estado==='Terminado';
  const dato=(et,val)=>`<div class="hi-dato"><dt>${esc(et)}</dt><dd>${val}</dd></div>`;
  // Secciones sin márgenes propios, 40 px entre ellas (.hi-modal). Editar y eliminar van en el
  // menú de tres puntos junto al de cerrar; la acción principal del pie es «Añadir seguimiento».
  const menu=[['Editar',`hitoEditar('${escJs(h.id)}')`]];
  if(borrable)menu.push(['Eliminar',`hitoEliminar('${escJs(h.id)}')`]);
  $('#panel-cuerpo').innerHTML=`<div class="hi-modal">
    <div class="panel-cab">
      <div><div class="sub">${esc(h.id)} · ${esc(h.fase)}</div><h2>${esc(h.hito)}</h2></div>
    </div>
    <div class="hi-menu">${menuAcciones('Acciones del hito',menu)}</div>
    <dl class="hi-datos">
      ${dato('Estado',`<span class="est ${CLASE[h.estado]}">${esc(textoTag(h.estado))}</span>`)}
      ${dato('Riesgo',`<span class="riesgo ${esc(h.riesgo)}">${esc(textoTag(h.riesgo))}</span>`)}
      ${dato('Propietario',esc(h.propietario||'—'))}
      ${dato('Inicio (UTC)',h.inicio?`<span class="mono">${fmtUTC(h.inicio)}</span><div class="sub">${fmtLocal(h.inicio)} local</div>`:'—')}
      ${dato('Fin (UTC)',h.fin?`<span class="mono">${fmtUTC(h.fin)}</span><div class="sub">${fmtLocal(h.fin)} local</div>`:'—')}
      ${dato('Duración',`<span class="reloj" ${vivo?`data-vivo="1" data-inicio="${esc(h.inicio)}"`:''}>${
        h.inicio?dur(h.inicio,h.fin||new Date().toISOString()):'—'}</span>`)}
    </dl>
    ${h.resultado?`<section><h3>Resultado</h3><p class="hi-texto">${esc(h.resultado)}</p>${chipsPruebas(h.pruebasFin,h.hito)}</section>`:''}
    ${h.motivo?`<section><h3>Motivo del bloqueo</h3><p class="hi-texto">${esc(h.motivo)}</p>${chipsPruebas(h.pruebasBloqueo,h.hito)}</section>`:''}
    <section><h3>Seguimiento</h3>
    ${h.seg.length?`<div class="hilo">${h.seg.map((x)=>
      `<div><b>${fmtUTC(x.ts)}</b> ${esc(x.texto)} <i>(${esc(x.actor)})</i>
       ${chipsPruebas(x.pruebas,h.hito+' · seguimiento')}</div>`).join('')}</div>`
      :'<p class="sub">Sin anotaciones de seguimiento.</p>'}
    ${h.editadoEl?`<p class="sub">Editado el ${fmtUTC(h.editadoEl)} por ${esc(h.editadoPor||'')}</p>`:''}</section>
    <div class="panel-pie-propio">
      <button class="primario" onclick="hitoSeguimiento('${escJs(h.id)}')"${h.estado==='Pendiente'
        ?' disabled title="Un hito pendiente todavía no admite seguimiento: inícialo primero."':''}>Añadir seguimiento</button>
    </div></div>`;
  abrirPanelPropio('hito',h.id,'Hito '+h.id);
};

function pintarHi(){
  pintarEliminados('#hi-eliminados','Hitos eliminados',EST.hiEliminados,
    ['Id','Hito','Fase','Propietario'],(h)=>[`<span class="idcol">${esc(h.id)}</span>`,esc(h.hito),
      `<span class="sub">${esc(h.fase)}</span>`,esc(h.propietario||'—')]);
  // Si el detalle de un hito está abierto, se repinta con lo nuevo (o se cierra si ya no existe).
  if(panelAbierto('hito')){
    if(EST.hi.some((x)=>x.id===PANEL_ITEM.id))verHito(PANEL_ITEM.id);else $('#panel').classList.add('oculto');}
  if(!EST.hi.length){$('#tabla-hi').innerHTML='<div class="vacio">Todavía no hay hitos registrados.</div>';return;}
  let html=`<table><thead><tr><th>Id</th><th>Hito</th><th>Propietario</th><th>Estado</th><th>Resultado</th>
    <th></th></tr></thead><tbody>`;
  const fases=[...new Set([...FASES(),...EST.hi.map((h)=>h.fase)])];
  for(const f of fases){
    const hs=EST.hi.filter((h)=>h.fase===f);
    if(!hs.length)continue;
    html+=`<tr class="fase-fila"><td colspan="6">${esc(f)}</td></tr>`;
    for(const h of hs){
      html+=`<tr class="fila-clicable" tabindex="0" onclick="filaHito(event,'${escJs(h.id)}')"
          onkeydown="if(event.key==='Enter'&&event.target===this)verHito('${escJs(h.id)}')"
          aria-label="Ver el detalle de ${esc(h.id)}">
        <td class="idcol">${esc(h.id)}</td>
        <td><div class="hito-nombre">${esc(h.hito)}</div></td>
        <td>${esc(h.propietario)}</td>
        <td><span class="est ${CLASE[h.estado]}">${esc(textoTag(h.estado))}</span></td>
        <td class="desenlace">${
          h.resultado?`<span class="etiqueta ok">resultado</span>${esc(h.resultado)}`
          :h.motivo?`<span class="etiqueta bloq">bloqueado</span>${esc(h.motivo)}`
          :'<span class="sub">—</span>'}
          ${chipsPruebas(h.pruebasFin||h.pruebasBloqueo,h.hito)}</td>
        <td class="col-acciones">${menuAcciones('Acciones del hito',accionesHito(h))}</td></tr>`;
    }
  }
  $('#tabla-hi').innerHTML=html+'</tbody></table>';
}
