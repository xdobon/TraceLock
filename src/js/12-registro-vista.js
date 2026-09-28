/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= registro ================= */
const RESUMEN={
  CASO_ABIERTO:(d)=>'Carpeta '+(d.carpeta||''),
  CASO_CLIENTE:(d)=>d.cliente||'sin asignar',
  CLASIFICACION_CCN:(d)=>`${d.clase} · ${d.tipoIncidente} · peligrosidad ${d.peligrosidad} · impacto ${d.impacto}`,
  CLASIFICACION_RSIT:(d)=>`${d.clase} · ${d.tipoIncidente}`,
  CLASIFICACION_NIST:(d)=>`${d.vector} · funcional ${d.funcional} · recuperabilidad ${d.recuperacion}`,
  ATTACK_TECNICA:(d)=>`${d.tecnicaId} ${d.tecnica} · ${d.tactica} · ${d.confianza}`,
  ATTACK_RETIRADA:(d)=>`${d.tecnicaId} · ${d.motivo}`,
  LAB_TRANSFORMACION:(d)=>`${d.operacion||d.receta} · ${d.motivo}`,
  EVIDENCIA_METADATOS:(d)=>`${d.id} · ${d.tipoReal} · entropía ${d.entropia}`+
    (d.avisos&&d.avisos.length?` · ${d.avisos.length} avisos`:''),
  EVIDENCIA_REGISTRADA:(d)=>`${d.id} · ${d.nombre} · ${bytesTxt(d.bytes)} · ${d.sha256.slice(0,16)}…`,
  EVIDENCIA_VERIFICADA:(d)=>`${d.id} · ${d.coincide?'huella coincidente':'HUELLA DISTINTA'}`,
  EVIDENCIA_ANALIZADA:(d)=>`${d.id} · ${d.urls} URL, ${d.ips} IP, ${d.adjuntos} adjuntos, ${d.indicios} indicios`,
  EVIDENCIA_TRANSFERIDA:(d)=>`${d.id} · de ${d.origen} a ${d.destino} · ${d.motivo}`,
  EVIDENCIA_TRABAJO_CREADO:(d)=>`${d.id} · original ${(d.originalHash||'').slice(0,16)}… → trabajo ${(d.workingHash||'').slice(0,16)}…`,
  VERIFICACION_AUTOMATICA:(d)=>`${d.correctas} de ${d.total} correctas`+
    ((d.discrepancias||[]).length?` · no coinciden: ${d.discrepancias.join(', ')}`:'')+
    ((d.noLeidas||[]).length?` · no leídas: ${d.noLeidas.join(', ')}`:'')+` · ${bytesTxt(d.bytes)} en ${Math.round(d.duracionMs/1000)} s`,
  PROTECCION_APLAZADA:(d)=>`${(d.pendientes||[]).join(', ')} · ${d.motivo}`,
  EVIDENCIAS_PROTEGIDAS:(d)=>`hasta el asiento ${d.hastaSeq} · ${d.metodo||'confirmado manualmente'} · confirmado por ${d.confirmadoPor||''}`,
  HITO_CREADO:(d)=>`${d.id} · ${d.hito}`,
  HITO_INICIADO:(d)=>d.id,
  HITO_BLOQUEADO:(d)=>`${d.id} · ${d.motivo}`,
  HITO_REANUDADO:(d)=>d.id,
  HITO_FINALIZADO:(d)=>`${d.id}${d.resultado?' · '+d.resultado:''}`+
    (d.pruebas&&d.pruebas.length?` · ${d.pruebas.length} ${d.pruebas.length===1?'prueba gráfica':'pruebas gráficas'}`:''),
  HITO_SEGUIMIENTO:(d)=>`${d.id} · ${d.texto}`+
    (d.pruebas&&d.pruebas.length?` · ${d.pruebas.length} ${d.pruebas.length===1?'prueba gráfica':'pruebas gráficas'}`:''),
  CRONO_ENTRADA:(d)=>`${fmtFecha(d.fecha)} ${d.accion}`,
  NOTA:(d)=>`${d.id} · ${d.titulo}`,
  NOTA_A_LIMPIO:(d)=>`${d.id} pasada a ${d.destino}`,
  CRONO_RECTIFICADA:(d)=>`${d.id} · ${d.motivo}`,
  CRONO_ELIMINADA:(d)=>`${d.id} · ${d.motivo}`,
  HITO_EDITADO:(d)=>`${d.id} · ${d.hito||''}${d.motivo?' · '+d.motivo:''}`,
  HITO_ELIMINADO:(d)=>`${d.id} · ${d.motivo}`,
  PREGUNTA_EDITADA:(d)=>`${d.id} · ${d.pregunta||''}${d.motivo?' · '+d.motivo:''}`,
  PREGUNTA_ELIMINADA:(d)=>`${d.id} · ${d.motivo}`,
  ANCLA_EXTERNA_GENERADA:(d)=>`${d.anchorId||''} · ${d.events||''} asientos`,
  PROCEDIMIENTO_APLICADO:(d)=>`${d.nombre} · ${d.hitos} hitos, ${d.preguntas} preguntas`,
  IOC_ESTADO:(d)=>`${d.valor} → ${d.estado} · ${d.motivo}`,
  IOC_MANUAL:(d)=>`${d.tipo} ${d.valor} · ${d.contexto}`,
  IOC_CONSULTA:(d)=>`${d.valor} · ${d.proveedor} · ${d.resumen}`,
  IOC_ROL:(d)=>`${d.valor} → ${d.rol}${d.relacionados&&d.relacionados.length?' · relacionado con '+d.relacionados.join(', '):''}`,
  IOC_VINCULO:(d)=>`${d.deValor||d.de} ${d.anulado?'vínculo retirado:':'→'} ${d.aValor||d.a}${d.anulado?'':' · '+d.rel}${d.nota?' · '+d.nota:''}`,
  PREGUNTA_ABIERTA:(d)=>d.pregunta,
  PREGUNTA_RESPONDIDA:(d)=>`${d.id} · ${d.respuesta}`,
};
function pintarRegistro(){
  $('#registro').innerHTML=ASIENTOS.slice(-150).reverse().map((a)=>`
    <div class="asiento"><div class="cab">
      <span class="seq">${esc(String(a.seq).padStart(4,'0'))}</span>
      <span class="tipo">${esc(a.tipo.replace(/_/g,' ').toLowerCase())}</span>
      <span class="hora">${esc(fmtUTC(a.ts))}</span></div>
      <div class="cuerpo">${esc((RESUMEN[a.tipo]||(()=>''))(a.datos||{}))}</div>
      <div class="cuerpo actor">${esc(a.actor)}</div></div>`).join('');
}

