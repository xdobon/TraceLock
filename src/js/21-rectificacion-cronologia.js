/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= rectificación de la cronología ================= */
window.rectificarCrono=async function(id){
  const c=EST.cr.find((x)=>x.id===id);
  if(!c)return;
  const [hi,hf]=(c.hora||'').split(/[–-]/);
  const d=await pedir('Rectificar '+id,[
    {id:'accion',etiqueta:'Hecho observado',tipo:'textarea',valor:c.accion,requerido:true},
    {id:'fecha',etiqueta:'Fecha',tipo:'date',valor:c.fecha,requerido:true},
    {id:'horaIni',etiqueta:'Hora inicial',tipo:'time',valor:(hi||'').trim()},
    {id:'horaFin',etiqueta:'Hora final',tipo:'time',valor:(hf||'').trim()},
    {id:'zona',etiqueta:'Huso horario',tipo:'select',opciones:DATOS.husos,valor:c.zona},
    {id:'fuente',etiqueta:'Fuente de la evidencia',valor:c.fuente||''},
    {id:'motivo',etiqueta:'Motivo de la rectificación',tipo:'textarea',requerido:true,
     pista:'Por qué cambia: error de transcripción, huso mal interpretado, nueva evidencia…'}],
    'El asiento original permanece en el registro. Una rectificación añade, nunca sustituye.');
  if(!d)return;
  const hora=d.horaIni?(d.horaFin&&d.horaFin!==d.horaIni?d.horaIni+'–'+d.horaFin:d.horaIni):'';
  await anotar('CRONO_RECTIFICADA',{id,accion:d.accion,fecha:d.fecha,hora,zona:d.zona,
    fuente:d.fuente,motivo:d.motivo});
};

/* ================= eliminar un hecho de la cronología =================
   No se borra nada: el asiento original sigue en el registro y el hecho pasa a «Hechos
   eliminados», fuera de la línea de tiempo, de la tabla y de lo que se exporta. */
window.eliminarCrono=async function(id){
  if(!exigeCarpeta())return;
  const c=EST.cr.find((x)=>x.id===id);
  if(!c)return;
  const d=await pedir('Eliminar '+id,[
    {id:'motivo',etiqueta:'Motivo',tipo:'textarea',requerido:true,
     pista:'Duplicado, registrado por error, descartado tras el análisis…'}],
    c.accion+' — el hecho sale de la cronología y se guarda en «Hechos eliminados». El asiento '+
    'original permanece en el registro.');
  if(!d)return;
  await anotar('CRONO_ELIMINADA',{id,accion:c.accion,motivo:d.motivo});
};

