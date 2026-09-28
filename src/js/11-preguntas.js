/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= preguntas ================= */
marcarObligatorio('pr-texto');
$('#pr-add').onclick=async()=>{
  const t=$('#pr-texto').value.trim();
  if(!t){$('#pr-texto').focus();return;}
  await anotar('PREGUNTA_ABIERTA',{id:idNuevo('P-','PREGUNTA_ABIERTA'),pregunta:t,
    dirigidaA:$('#pr-quien').value.trim()});
  $('#pr-texto').value='';
  cerrarForm('pr-form');
};
window.responder=async(id)=>{
  const q=EST.pr.find((x)=>x.id===id);
  const d=await pedir('Responder pregunta',[
    {id:'respuesta',etiqueta:'Respuesta obtenida',tipo:'textarea',requerido:true},
    {id:'fuente',etiqueta:'Quién o qué la responde',pista:'Persona, documento o evidencia'}],
    q.pregunta);
  if(!d)return;
  await anotar('PREGUNTA_RESPONDIDA',{id,respuesta:d.respuesta+(d.fuente?' ('+d.fuente+')':'')});};

/* Editar añade un asiento con los valores nuevos; eliminar saca la pregunta de la tabla y de lo
   que se exporta, pero el asiento original sigue en el registro (por eso pide el motivo). */
window.preguntaEditar=async(id)=>{
  if(!exigeCarpeta())return;
  const q=EST.pr.find((x)=>x.id===id);if(!q)return;
  const campos=[{id:'pregunta',etiqueta:'Pregunta',tipo:'textarea',valor:q.pregunta,requerido:true},
    {id:'dirigidaA',etiqueta:'Dirigida a',valor:q.dirigidaA||'',pista:'Persona, equipo o cliente'}];
  if(q.estado==='Respondida')campos.push({id:'respuesta',etiqueta:'Respuesta obtenida',tipo:'textarea',
    valor:q.respuesta||'',requerido:true});
  campos.push({id:'motivo',etiqueta:'Motivo del cambio',tipo:'textarea',pista:'Opcional: por qué se corrige'});
  const d=await pedir('Editar '+id,campos,'El asiento original permanece en el registro.');
  if(!d)return;
  const datos={id,pregunta:d.pregunta,dirigidaA:d.dirigidaA,motivo:d.motivo||''};
  if(q.estado==='Respondida')datos.respuesta=d.respuesta;
  await anotar('PREGUNTA_EDITADA',datos);
};
window.preguntaEliminar=async(id)=>{
  if(!exigeCarpeta())return;
  const q=EST.pr.find((x)=>x.id===id);if(!q)return;
  const d=await pedir('Eliminar '+id,[
    {id:'motivo',etiqueta:'Motivo',tipo:'textarea',requerido:true,pista:'Duplicada, mal planteada, no aplica…'}],
    q.pregunta+' — la pregunta deja de aparecer en la tabla y en los documentos. El asiento original '+
    'permanece en el registro.');
  if(!d)return;
  await anotar('PREGUNTA_ELIMINADA',{id,pregunta:q.pregunta,motivo:d.motivo});
};

function pintarPr(){
  pintarEliminados('#pr-eliminados','Preguntas eliminadas',EST.prEliminadas,
    ['Id','Pregunta','Dirigida a','Estado'],(p)=>[`<span class="idcol">${esc(p.id)}</span>`,esc(p.pregunta),
      esc(p.dirigidaA||'—'),`<span class="est ${p.estado==='Abierta'?'info':'ok'}">${esc(textoTag(p.estado==='Abierta'?'Sin responder':p.estado))}</span>`]);
  if(!EST.pr.length){$('#tabla-pr').innerHTML='<div class="vacio">No hay preguntas registradas.</div>';return;}
  $('#tabla-pr').innerHTML=`<table><thead><tr><th>Id</th><th>Pregunta</th><th>Respuesta</th>
    <th>Dirigida a</th><th>Abierta desde</th><th>Estado</th><th></th></tr></thead><tbody>`+
    EST.pr.map((p)=>`<tr><td class="idcol">${esc(p.id)}</td>
      <td>${esc(p.pregunta)}</td>
      <td class="desenlace">${p.respuesta
        ?`<span class="etiqueta ok">respuesta</span>${esc(p.respuesta)}`
        :'<span class="etiqueta pend">sin respuesta</span>'}</td>
      <td>${esc(p.dirigidaA||'—')}</td><td class="mono">${fmtUTCdosLineas(p.ts)}</td>
      <td><span class="est ${p.estado==='Abierta'?'info':'ok'}">${esc(textoTag(p.estado==='Abierta'?'Sin responder':p.estado))}</span></td>
      <td class="col-acciones">${menuAcciones('Acciones de la pregunta',[
        ...(p.estado==='Abierta'?[['Responder',`responder('${escJs(p.id)}')`]]:[]),
        ['Editar',`preguntaEditar('${escJs(p.id)}')`],['Eliminar',`preguntaEliminar('${escJs(p.id)}')`]])}</td>
      </tr>`).join('')+'</tbody></table>';
}

