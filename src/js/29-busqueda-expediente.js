/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= búsqueda en el expediente ================= */
function registrosBuscables(){
  const r=[];
  const add=(tipo,titulo,texto,vista,ref)=>r.push({tipo,titulo,texto:String(texto||''),vista,ref});
  for(const e of EST.ev)
    add('evidencia',e.id+' · '+e.nombre,[e.nombre,e.origen,e.metodo,e.sha256,e.md5,e.custodio,
      e.custodioActual,e.equipo,e.serie,e.usuarioEquipo,e.ubicacion,
      ...e.transferencias.map((t)=>t.destino+' '+t.motivo)].filter(Boolean).join(' · '),'ev',e.id);
  for(const i of todosIocs())
    add('indicador',i.tipo+' · '+i.valor,[i.valor,i.estado,i.motivo,i.evidencias.join(' '),
      i.consultas.map((c)=>c.proveedor+' '+c.resumen).join(' ')].filter(Boolean).join(' · '),'io',i.key);
  for(const h of EST.hi)
    add('hito',h.id+' · '+h.hito,[h.fase,h.propietario,h.estado,h.notas,h.resultado,h.motivo,
      ...h.seg.map((s)=>s.texto)].filter(Boolean).join(' · '),'hi',h.id);
  for(const c of EST.cr)
    add('cronología',fmtFecha(c.fecha)+' '+(c.hora||''),[c.accion,c.fuente,c.zona,c.motivo]
      .filter(Boolean).join(' · '),'cr',c.id);
  for(const p of EST.pr)
    add('pregunta',p.id+' · '+p.pregunta,[p.dirigidaA,p.estado,p.respuesta].filter(Boolean).join(' · '),'pr',p.id);
  const cl=clasificacionActual();
  if(cl)add('clasificación',cl.clase+' · '+cl.tipoIncidente,
    [cl.peligrosidad,cl.impacto,cl.motivoPeligrosidad,cl.motivoImpacto].join(' · '),'cl','');
  for(const a of ASIENTOS)
    add('registro','#'+String(a.seq).padStart(4,'0')+' '+a.tipo.replace(/_/g,' ').toLowerCase(),
      (RESUMEN[a.tipo]||(()=>''))(a.datos||{})+' · '+a.actor,'aud',String(a.seq));
  return r;
}

function pintarBusqueda(){
  const cruda=($('#bus-q')&&$('#bus-q').value||'').trim();
  const todos=registrosBuscables();
  $('#bus-cuenta').textContent=todos.length+' elementos indexados';
  if(!cruda){$('#bus-res').innerHTML='<div class="vacio">Escribe para buscar en todo el expediente: '+
    'evidencias, indicadores, hitos, cronología, preguntas, clasificación y registro.</div>';return;}
  // filtros tipo:xxx combinados con el texto libre
  const tipos=[],palabras=[];
  for(const tk of cruda.split(/\s+/)){
    const m=tk.match(/^tipo:(.+)$/i);
    if(m)tipos.push(m[1].toLowerCase()); else palabras.push(tk.toLowerCase());
  }
  const hits=todos.filter((r)=>{
    if(tipos.length&&!tipos.some((t)=>r.tipo.includes(t)))return false;
    const heno=(r.titulo+' '+r.texto).toLowerCase();
    return palabras.every((p)=>heno.includes(p));
  });
  if(!hits.length){$('#bus-res').innerHTML='<div class="vacio">Ninguna coincidencia. '+
    'Prueba con menos palabras o revisa el filtro de tipo.</div>';return;}
  const marca=(t)=>{
    let out=esc(t);
    for(const p of palabras){
      if(!p)continue;
      out=out.replace(new RegExp('('+p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');
    }
    return out;
  };
  const contexto=(t)=>{
    if(!palabras.length)return t.slice(0,260);
    const i=t.toLowerCase().indexOf(palabras[0]);
    if(i<0)return t.slice(0,260);
    return (i>90?'…':'')+t.slice(Math.max(0,i-90),i+220);
  };
  $('#bus-res').innerHTML=`<p class="ayuda">${hits.length} ${hits.length===1?'coincidencia':'coincidencias'}</p>`+
    hits.slice(0,120).map((r)=>`<div class="hit">
      <div class="cab"><span class="est pend">${esc(textoTag(r.tipo))}</span>
        <b>${marca(r.titulo)}</b>
        <button class="secundario mini" style="margin-left:auto"
          onclick="irA('${escJs(r.vista)}')">Ir a la sección</button></div>
      <p>${marca(contexto(r.texto))}</p></div>`).join('')+
    (hits.length>120?'<p class="ayuda">Se muestran las 120 primeras.</p>':'');
}

