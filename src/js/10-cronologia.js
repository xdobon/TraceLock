/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= cronología ================= */
marcarObligatorio('cr-accion');
$('#cr-add').onclick=async()=>{
  const accion=$('#cr-accion').value.trim();
  if(!accion){$('#cr-accion').focus();return;}
  const hi=$('#cr-hora-ini').value,hf=$('#cr-hora-fin').value;
  const hora=hi?(hf&&hf!==hi?hi+'–'+hf:hi):'';
  await anotar('CRONO_ENTRADA',{id:idNuevo('C-','CRONO_ENTRADA'),fecha:$('#cr-fecha').value,
    hora,zona:$('#cr-zona').value,accion,fuente:$('#cr-fuente').value.trim()});
  $('#cr-accion').value='';$('#cr-hora-ini').value='';$('#cr-hora-fin').value='';
  $('#cr-fuente').value='';
  cerrarForm('cr-form');
};

let crVista='linea';
$('#cr-v-tabla').onclick=()=>{crVista='tabla';
  $('#cr-v-tabla').ariaPressed='true';$('#cr-v-linea').ariaPressed='false';pintarCr();};
$('#cr-v-linea').onclick=()=>{crVista='linea';
  $('#cr-v-tabla').ariaPressed='false';$('#cr-v-linea').ariaPressed='true';pintarCr();};

const crOrdenadas=()=>EST.cr.slice().sort((a,b)=>
  ((a.fecha||'')+' '+(a.hora||'')).localeCompare((b.fecha||'')+' '+(b.hora||'')));

function pintarCr(){
  pintarEliminados('#cr-eliminados','Hechos eliminados',EST.crEliminadas,
    ['Id','Fecha','Hora','Hecho observado','Fuente'],(c)=>[`<span class="idcol">${esc(c.id)}</span>`,
      `<span class="mono" style="white-space:nowrap">${esc(fmtFecha(c.fecha))}</span>`,
      `<span class="mono" style="white-space:nowrap">${esc(c.hora||'—')}</span>`,esc(c.accion),
      `<span class="sub">${esc(c.fuente||'sin indicar')}</span>`]);
  if(!EST.cr.length){$('#tabla-cr').innerHTML='<div class="vacio">La cronología está vacía.</div>';return;}
  const orden=crOrdenadas();
  if(crVista==='linea'){
    let html='<div class="linea">',dia=null;
    for(const c of orden){
      if(c.fecha!==dia){dia=c.fecha;
        const d=fmtDiaLargo(dia);
        const n=orden.filter((x)=>x.fecha===dia).length;
        html+=`<div class="dia"><b>${esc(d.dia||'sin fecha')}</b><i>${esc(d.fecha)}</i>
          <u>${n} ${n===1?'hecho':'hechos'}</u></div>`;}
      html+=`<div class="hito-t con-acciones">
        <div class="hito-cuerpo">
        <div class="fecha">${esc(c.hora||'sin hora')}
          <span class="huso">${esc(c.zona)}</span>
          ${c.rectificadaEl?'<span class="est ok">Rectificada</span>':''}</div>
        <div class="hecho">${esc(c.accion)}</div>
        <div class="fuente">Fuente: ${esc(c.fuente||'sin indicar')} · registrado ${fmtUTC(c.ts)}
          ${c.rectificadaEl?`<br>Rectificada el ${fmtUTC(c.rectificadaEl)} por ${esc(c.rectificadaPor||'')}: ${esc(c.motivo||'')}`:''}</div>
        </div>
        <div class="hito-acciones">${botonesCrono(c,'btn-lg')}</div>
      </div>`;
    }
    $('#tabla-cr').innerHTML=html+'</div>';
    return;
  }
  $('#tabla-cr').innerHTML=`<table><thead><tr><th>Fecha</th><th>Hora</th><th>Huso</th>
    <th>Hecho observado</th><th>Fuente</th><th>Registrado</th><th></th></tr></thead><tbody>`+
    orden.map((c)=>`<tr><td class="mono">${esc(fmtFecha(c.fecha))}</td><td class="mono">${esc(c.hora||'—')}</td>
      <td class="sub">${esc(c.zona)}</td>
      <td>${esc(c.accion)}${c.rectificadaEl?`<div class="est ok">Rectificada</div>
        <div class="sub">${esc(c.motivo||'')}</div>`:''}</td>
      <td class="sub">${esc(c.fuente||'sin indicar')}</td>
      <td class="sub mono">${fmtUTC(c.ts)}${c.rectificadaEl?`<div class="sub">rect. ${fmtUTC(c.rectificadaEl)}</div>`:''}</td>
      <td class="col-acciones"><div class="botones-fila">${botonesCrono(c,'btn-lg')}</div></td>
      </tr>`).join('')+'</tbody></table>';
}

/* Rectificar (edit) y eliminar (close), como botones de solo icono. */
const botonesCrono=(c,tam)=>
  `<button class="secundario btn-ico ${tam}" onclick="rectificarCrono('${escJs(c.id)}')"
    aria-label="Rectificar ${esc(c.id)}" title="Rectificar">${icono('edit')}</button>
  <button class="secundario btn-ico ${tam}" onclick="eliminarCrono('${escJs(c.id)}')"
    aria-label="Eliminar ${esc(c.id)}" title="Eliminar">${icono('close')}</button>`;

/* Apartado «… eliminados» (cronología, hitos y preguntas): plegado por defecto, debajo de la
   tabla. Se recuerda si el analista lo ha abierto para que no se cierre solo al repintar.
   cols: cabeceras; fila(x): celdas propias; se añaden «Eliminado» y «Motivo». */
const ELIMINADOS_ABIERTOS={};
window.alternarEliminados=(sel,abierto)=>{ELIMINADOS_ABIERTOS[sel]=abierto;};
function pintarEliminados(sel,titulo,lista,cols,fila){
  const c=$(sel);if(!c)return;
  if(!(lista||[]).length){c.innerHTML='';return;}
  c.innerHTML=`<details class="tarjeta"${ELIMINADOS_ABIERTOS[sel]?' open':''}
      ontoggle="alternarEliminados('${escJs(sel)}',this.open)">
    <summary>${esc(titulo)} · ${lista.length}</summary>
    <table><thead><tr>${cols.map((x)=>`<th>${esc(x)}</th>`).join('')}<th>Eliminado</th><th>Motivo</th></tr></thead><tbody>`+
    lista.map((x)=>{const e=x.eliminado||x.eliminada;
      return `<tr>${fila(x).map((td)=>`<td>${td}</td>`).join('')}
      <td><span class="mono" style="white-space:nowrap">${fmtUTCdosLineas(e.ts)}</span><div class="sub">${esc(e.actor||'')}</div></td>
      <td class="desenlace">${esc(e.motivo)}</td></tr>`;}).join('')+'</tbody></table></details>';
}

