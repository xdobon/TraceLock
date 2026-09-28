/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= notas rápidas ================= */
/* El borrador vive solo en esta pestaña (sessionStorage), se pierde al cerrarla: son apuntes en sucio y no deben
   ensuciar el registro encadenado. Al guardarlos como nota sí quedan anotados. */
const claveBorrador=()=>'tl-nota-borrador:'+(dirCaso?dirCaso.name:'sin-caso');
let notaTemporizador=null;

function notaCargarBorrador(){
  const t=$('#nota-borrador');
  if(!t)return;
  try{t.value=almacenamiento.getItem(claveBorrador())||'';}catch(e){}
  $('#nota-estado').textContent=t.value?'borrador recuperado':'sin borrador';
  // Si hay un borrador a medias, el formulario se abre solo: oculto pasaría desapercibido.
  if(t.value)$('#no-form').classList.remove('oculto');
}
function notaAutoguardar(){
  clearTimeout(notaTemporizador);
  $('#nota-estado').textContent='escribiendo…';
  notaTemporizador=setTimeout(()=>{
    try{almacenamiento.setItem(claveBorrador(),$('#nota-borrador').value);
      $('#nota-estado').textContent='borrador guardado en esta pestaña';
    }catch(e){$('#nota-estado').textContent='no se ha podido guardar el borrador';}
  },600);
}
window.notaMarcarHora=()=>{
  const t=$('#nota-borrador'), marca=fmtUTC(new Date().toISOString())+' UTC · ';
  const p=t.selectionStart??t.value.length;
  const antes=t.value.slice(0,p), sep=antes&&!antes.endsWith('\n')?'\n':'';
  t.value=antes+sep+marca+t.value.slice(p);
  t.focus(); t.selectionStart=t.selectionEnd=(antes+sep+marca).length;
  notaAutoguardar();
};
window.notaVaciar=()=>{
  if(!$('#nota-borrador').value.trim())return;
  if(!confirm('¿Vaciar el borrador? No se puede deshacer.'))return;
  $('#nota-borrador').value='';
  try{almacenamiento.removeItem(claveBorrador());}catch(e){}
  $('#nota-estado').textContent='sin borrador';
};
window.notaGuardar=async()=>{
  if(!exigeCarpeta())return;
  const texto=$('#nota-borrador').value.trim();
  if(!texto){alert('El borrador está vacío.');return;}
  const d=await pedir('Guardar nota',[
    {id:'titulo',etiqueta:'De qué es la nota',requerido:true,
     pista:'Reunión de seguimiento, llamada con el proveedor…'}],
    'La nota queda anotada en el registro con su hora y su autor. El texto se guarda tal cual lo has '+
    'escrito: repásalo antes si contiene datos que no quieras en el expediente.');
  if(!d)return;
  await anotar('NOTA',{id:idNuevo('N-','NOTA'),titulo:d.titulo,texto});
  $('#nota-borrador').value='';
  try{almacenamiento.removeItem(claveBorrador());}catch(e){}
  $('#nota-estado').textContent='nota guardada';
};

function todasNotas(){
  const m=new Map();
  for(const a of ASIENTOS){
    const d=a.datos||{};
    if(a.tipo==='NOTA')m.set(d.id,{...d,ts:a.ts,actor:a.actor,pasadas:[]});
    if(a.tipo==='NOTA_A_LIMPIO'&&m.has(d.id))m.get(d.id).pasadas.push(d.destino);
  }
  return [...m.values()].reverse();
}

window.notaPasarA=async(id,destino)=>{
  if(!exigeCarpeta())return;
  const n=todasNotas().find((x)=>x.id===id);
  if(!n)return;
  if(destino==='cronologia'){
    const d=await pedir('Pasar a cronología',[
      {id:'fecha',etiqueta:'Fecha',tipo:'date',requerido:true},
      {id:'hora',etiqueta:'Hora',tipo:'time'},
      {id:'zona',etiqueta:'Huso horario',valor:'UTC'},
      {id:'accion',etiqueta:'Hecho observado',tipo:'textarea',requerido:true,valor:n.texto,
       ancho:'grid-column:span 2'},
      {id:'fuente',etiqueta:'Fuente',requerido:true,valor:'Nota '+n.id+': '+n.titulo}],
      'Redacta el hecho: la nota está en sucio y la cronología se entrega. Indica la fuente real '+
      'del dato, no la nota, si la conoces.');
    if(!d)return;
    await anotar('CRONO_ENTRADA',{id:idNuevo('C-','CRONO_ENTRADA'),fecha:d.fecha,hora:d.hora||'',
      zona:d.zona||'Sin determinar',accion:d.accion,fuente:d.fuente});
  }
  if(destino==='hito'){
    const d=await pedir('Pasar a hito',[
      {id:'fase',etiqueta:'Fase',tipo:'select',requerido:true,
       opciones:['Preparacion','Deteccion','Contencion','Erradicacion','Recuperacion','Lecciones']},
      {id:'hito',etiqueta:'Actuación',requerido:true,ancho:'grid-column:span 2'},
      {id:'propietario',etiqueta:'Responsable',requerido:true,valor:analista()},
      {id:'notas',etiqueta:'Detalle',tipo:'textarea',valor:n.texto,ancho:'grid-column:span 2'}],
      'De la nota sale una actuación concreta con responsable. Si de la nota salen varias, '+
      'créalas una a una.');
    if(!d)return;
    await anotar('HITO_CREADO',{id:idNuevo('H-','HITO_CREADO'),fase:d.fase,hito:d.hito,
      propietario:d.propietario,riesgo:'Medio',notas:d.notas||('Nota '+n.id),iniciado:false});
  }
  if(destino==='pregunta'){
    const d=await pedir('Pasar a pregunta abierta',[
      {id:'pregunta',etiqueta:'Pregunta',tipo:'textarea',requerido:true,valor:n.texto,
       ancho:'grid-column:span 2'},
      {id:'dirigidaA',etiqueta:'A quién se le pregunta'}],
      'Formúlala como pregunta cerrada, para que se pueda dar por respondida.');
    if(!d)return;
    await anotar('PREGUNTA_ABIERTA',{id:idNuevo('P-','PREGUNTA_ABIERTA'),pregunta:d.pregunta,
      dirigidaA:d.dirigidaA||'',origen:'Nota '+n.id});
  }
  await anotar('NOTA_A_LIMPIO',{id,destino});
};

window.notaCopiar=(id)=>{
  const n=todasNotas().find((x)=>x.id===id);
  if(n)navigator.clipboard.writeText(n.texto).then(()=>alert('Nota copiada al portapapeles.'),
    ()=>alert('El navegador no ha permitido copiar.'));
};
window.notaRetomar=(id)=>{
  const n=todasNotas().find((x)=>x.id===id);
  if(!n)return;
  const t=$('#nota-borrador');
  t.value=(t.value?t.value+'\n\n':'')+n.texto;
  abrirForm('no-form','nota-borrador');
  notaAutoguardar(); t.focus();
};

const DESTINO_NOTA={cronologia:'Cronología',hito:'Hito',pregunta:'Pregunta'};

function pintarNotas(){
  const c=$('#notas-lista');
  if(!c)return;
  const ns=todasNotas();
  if(!ns.length){c.innerHTML='<div class="vacio">Todavía no hay notas guardadas. '+
    'Escribe en el borrador y pulsa «Guardar como nota».</div>';return;}
  /* Cada nota es un <details>: el texto llega plegado y se abre con la flecha de la derecha.
     Las acciones van agrupadas en un menú de tres puntos, al lado de la flecha. El menú se abre
     al pasar el ratón y también con el foco del teclado, para que no dependa solo del hover. */
  c.innerHTML=ns.map((n)=>`<details class="nota">
    <summary>
      <div class="nota-tit"><b>${esc(n.titulo)}</b>
        <div class="sub nota-meta">${esc(n.id)}<i>·</i>${esc(n.actor)}<i>·</i>${fmtUTC(n.ts)} UTC</div></div>
      <div class="nota-estado">${n.pasadas.length
        ? n.pasadas.map((p)=>`<span class="est ok">Pasada a ${esc((DESTINO_NOTA[p]||p).toLowerCase())}</span>`).join(' ')
        : '<span class="est pend">Sin pasar a limpio</span>'}</div>
      <div class="nota-menu">
        <button class="secundario btn-ico btn-sm" aria-haspopup="true" aria-label="Acciones de la nota"
          onclick="event.preventDefault();event.stopPropagation();">${icono('more-horiz')}</button>
        <div class="menu-lista">
          ${itemMenu('Pasar a Cronología',`notaPasarA('${escJs(n.id)}','cronologia')`,true)}
          ${itemMenu('Pasar a Hito',`notaPasarA('${escJs(n.id)}','hito')`,true)}
          ${itemMenu('Pasar a Pregunta',`notaPasarA('${escJs(n.id)}','pregunta')`,true)}
          ${itemMenu('Copiar',`notaCopiar('${escJs(n.id)}')`,true)}
          ${itemMenu('Pasar a borrador',`notaRetomar('${escJs(n.id)}')`,true)}
        </div>
      </div>
      <span class="nota-flecha">${icono('nav-arrow-down','ic-cerrada')}${icono('nav-arrow-up','ic-abierta')}</span>
    </summary>
    <pre>${esc(n.texto)}</pre>
  </details>`).join('');
}

function pintarAjustes(){
  aplicarTema();
  const a=$('#aj-acerca');
  if(a)a.innerHTML=textoAcerca();
}

