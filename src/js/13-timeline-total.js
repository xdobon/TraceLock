/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= total timeline ================= */
const CATEGORIA={
  CASO_ABIERTO:'Caso', CASO_CLIENTE:'Caso',
  EVIDENCIA_REGISTRADA:'Evidencia', EVIDENCIA_VERIFICADA:'Evidencia',
  EVIDENCIA_ANALIZADA:'Evidencia', EVIDENCIA_TRANSFERIDA:'Evidencia',
  EVIDENCIA_TRABAJO_CREADO:'Evidencia', EVIDENCIAS_PROTEGIDAS:'Evidencia', PROTECCION_APLAZADA:'Evidencia', VERIFICACION_AUTOMATICA:'Evidencia',
  CRONO_RECTIFICADA:'Cronologia', CRONO_ELIMINADA:'Cronologia', ANCLA_EXTERNA_GENERADA:'Caso',
  HITO_EDITADO:'Hito', HITO_ELIMINADO:'Hito', PREGUNTA_EDITADA:'Pregunta', PREGUNTA_ELIMINADA:'Pregunta', PROCEDIMIENTO_APLICADO:'Caso', CLASIFICACION_CCN:'Caso',
  CLASIFICACION_RSIT:'Caso', CLASIFICACION_NIST:'Caso',
  ATTACK_TECNICA:'Indicador', ATTACK_RETIRADA:'Indicador', LAB_TRANSFORMACION:'Indicador',
  EVIDENCIA_METADATOS:'Evidencia',
  IOC_ESTADO:'Indicador', IOC_MANUAL:'Indicador', IOC_CONSULTA:'Indicador', IOC_ROL:'Indicador',
  IOC_VINCULO:'Indicador',
  HITO_CREADO:'Hito', HITO_INICIADO:'Hito', HITO_BLOQUEADO:'Hito',
  HITO_REANUDADO:'Hito', HITO_FINALIZADO:'Hito', HITO_SEGUIMIENTO:'Hito',
  CRONO_ENTRADA:'Cronologia', PREGUNTA_ABIERTA:'Pregunta', PREGUNTA_RESPONDIDA:'Pregunta',
  NOTA:'Nota', NOTA_A_LIMPIO:'Nota'};
const CATS=['Caso','Evidencia','Hito','Cronologia','Pregunta','Indicador'];
const ACCION={
  CASO_ABIERTO:'Apertura del caso', CASO_CLIENTE:'Cliente asignado',
  EVIDENCIA_REGISTRADA:'Evidencia registrada', EVIDENCIA_VERIFICADA:'Integridad verificada',
  EVIDENCIA_ANALIZADA:'Correo analizado', EVIDENCIA_TRANSFERIDA:'Evidencia transferida',
  EVIDENCIA_TRABAJO_CREADO:'Copia de trabajo creada', EVIDENCIAS_PROTEGIDAS:'Evidencias protegidas (solo lectura)',
  PROTECCION_APLAZADA:'Protección aplazada con justificación',
  VERIFICACION_AUTOMATICA:'Verificación automática de evidencias',
  CRONO_RECTIFICADA:'Cronología rectificada', CRONO_ELIMINADA:'Hecho eliminado de la cronología',
  ANCLA_EXTERNA_GENERADA:'Sello externo generado',
  HITO_EDITADO:'Hito editado', HITO_ELIMINADO:'Hito eliminado',
  PREGUNTA_EDITADA:'Pregunta editada', PREGUNTA_ELIMINADA:'Pregunta eliminada', PROCEDIMIENTO_APLICADO:'Plantilla aplicada',
  CLASIFICACION_CCN:'Clasificado según CCN-STIC 817',
  CLASIFICACION_RSIT:'Clasificado según RSIT',
  CLASIFICACION_NIST:'Repercusión valorada según CISA',
  ATTACK_TECNICA:'Técnica ATT&CK registrada', ATTACK_RETIRADA:'Técnica ATT&CK retirada',
  LAB_TRANSFORMACION:'Transformación de laboratorio',
  EVIDENCIA_METADATOS:'Metadatos leídos',
  IOC_ESTADO:'Indicador valorado', IOC_MANUAL:'Indicador añadido', IOC_CONSULTA:'Consulta documentada',
  IOC_ROL:'Rol de indicador asignado', IOC_VINCULO:'Vínculo entre artefactos',
  HITO_CREADO:'Hito creado', HITO_INICIADO:'Hito iniciado', HITO_BLOQUEADO:'Hito bloqueado',
  HITO_REANUDADO:'Hito reanudado', HITO_FINALIZADO:'Hito finalizado', HITO_SEGUIMIENTO:'Seguimiento anotado',
  CRONO_ENTRADA:'Entrada de cronología', NOTA:'Nota guardada', NOTA_A_LIMPIO:'Nota pasada a limpio',
  PREGUNTA_ABIERTA:'Pregunta abierta',
  PREGUNTA_RESPONDIDA:'Pregunta respondida'};
let ttDesc=true;

// Filtros (texto y categorías) dentro del menú «Filtrar»; el orden, en «Ordenar por».
$('#tt-filtros').innerHTML=CATS.map((c)=>
  `<label class="casilla-filtro">
     <input type="checkbox" class="tt-cat" value="${c}" checked>${c}</label>`).join('');
$('#tt-filtros').onchange=pintarTt;
$('#tt-buscar').oninput=pintarTt;
$('#ioc-buscar').oninput=pintarIocs;
$('#ioc-estado').onchange=pintarIocs;
$$('#tt-orden-lista .opcion-orden').forEach((b)=>b.onclick=()=>{
  ttDesc=b.dataset.orden==='desc';
  $$('#tt-orden-lista .opcion-orden').forEach((x)=>x.setAttribute('aria-checked',String(x===b)));
  cerrarMenusPagina();pintarTt();});

function filasTt(){
  return ASIENTOS.map((a)=>({
    seq:a.seq, ts:a.ts, cat:CATEGORIA[a.tipo]||'Caso',
    accion:ACCION[a.tipo]||a.tipo, actor:a.actor,
    ref:(a.datos&&a.datos.id)||'',
    detalle:(RESUMEN[a.tipo]||(()=>''))(a.datos||{}),
    fechaHecho:a.tipo==='CRONO_ENTRADA'
      ?(fmtFecha(a.datos.fecha)+' '+(a.datos.hora||'')+' '+(a.datos.zona||'')).trim():''}));
}

let ttVista='linea';
$('#tt-v-linea').onclick=()=>{ttVista='linea';
  $('#tt-v-linea').ariaPressed='true';$('#tt-v-tabla').ariaPressed='false';pintarTt();};
$('#tt-v-tabla').onclick=()=>{ttVista='tabla';
  $('#tt-v-linea').ariaPressed='false';$('#tt-v-tabla').ariaPressed='true';pintarTt();};

const COLOR_CAT={Caso:'var(--chart-1)',Evidencia:'var(--chart-2)',Hito:'var(--chart-3)',
  Cronologia:'var(--chart-4)',Pregunta:'var(--chart-5)',Indicador:'var(--chart-6)'};

function pintarTt(){
  if(!ASIENTOS.length){$('#tabla-tt').innerHTML='<div class="vacio">El caso todavía no tiene actividad.</div>';return;}
  const activas=$$('.tt-cat').filter((c)=>c.checked).map((c)=>c.value);
  const q=$('#tt-buscar').value.trim().toLowerCase();
  // Con el menú cerrado no se ven los filtros: el punto del botón avisa de que hay alguno aplicado.
  $('#tt-filtro-activo').classList.toggle('oculto',!q&&activas.length===CATS.length);
  let f=filasTt().filter((r)=>activas.includes(r.cat));
  if(q)f=f.filter((r)=>(r.accion+' '+r.detalle+' '+r.actor+' '+r.ref).toLowerCase().includes(q));
  if(ttDesc)f=f.reverse();
  if(!f.length){$('#tabla-tt').innerHTML='<div class="vacio">Ningún evento coincide con el filtro.</div>';return;}

  if(ttVista==='linea'){
    let html='<div class="linea">',dia=null;
    for(const r of f){
      const d=r.ts.slice(0,10);
      if(d!==dia){
        dia=d;
        const l=fmtDiaLargo(d);
        const n=f.filter((x)=>x.ts.slice(0,10)===d).length;
        html+=`<div class="dia"><b>${esc(l.dia||'')}</b><i>${esc(l.fecha)}</i>
          <u>${n} ${n===1?'evento':'eventos'}</u></div>`;
      }
      const color=COLOR_CAT[r.cat]||'var(--chart-7)';
      // Tag como los del resto de la app (texto, fondo y borde) en tamaño sm; el color es el de
      // la categoría, el mismo del punto de la línea.
      html+=`<div class="hito-t" style="--punto:${color}">
        <div class="fecha">${esc(fmtUTC(r.ts).slice(11))}
          <span class="est tag-sm tag-cat" style="--cat:${color}">${esc(textoTag(r.cat))}</span>
          <span class="seq-t">#${esc(String(r.seq).padStart(4,'0'))}</span></div>
        <div class="hecho"><b>${esc(r.accion)}</b>${r.ref?` <span class="idcol">${esc(r.ref)}</span>`:''}
          ${r.detalle?`<div class="sub" style="margin-top:4px">${esc(r.detalle)}</div>`:''}</div>
        <div class="fuente">${esc(r.actor)}${r.fechaHecho?' · hecho fechado en '+esc(r.fechaHecho):''}</div>
      </div>`;
    }
    $('#tabla-tt').innerHTML=html+'</div>';
    return;
  }

  // Anchos fijos (medidos a 1440 px con reparto automático): Detalle un 25 % más estrecho
  // (36,3 → 27,2 %) y ese espacio repartido a partes iguales entre Registrado (14,9 → 19,45 %) y
  // Analista (9,2 → 13,75 %). La columna # conserva su ancho para que el número no se parta.
  $('#tabla-tt').innerHTML=`<table class="tabla-tt"><colgroup><col style="width:5.8%"><col style="width:19.45%">
    <col style="width:10.2%"><col style="width:13.1%"><col style="width:10.5%"><col style="width:27.2%">
    <col style="width:13.75%"></colgroup><thead><tr><th>#</th>
    <th>Registrado (UTC)</th><th>Categoría</th>
    <th>Acción</th><th>Referencia</th><th>Detalle</th><th>Analista</th></tr></thead><tbody>`+
    f.map((r)=>`<tr>
      <td class="mono" style="white-space:nowrap">${esc(String(r.seq).padStart(4,'0'))}</td>
      <td class="mono" style="white-space:nowrap">${fmtUTCdosLineas(r.ts)}
        <div class="sub">${fmtLocal(r.ts).split(' ')[1]} local</div></td>
      <td class="sub">${esc(r.cat)}</td>
      <td>${esc(r.accion)}</td>
      <td class="idcol">${esc(r.ref)}</td>
      <td>${esc(r.detalle)}${r.fechaHecho?`<div class="sub">hecho fechado en ${esc(r.fechaHecho)}</div>`:''}</td>
      <td class="sub">${esc(r.actor)}</td></tr>`).join('')+'</tbody></table>';
}

