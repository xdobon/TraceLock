/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= exportación de documentos ================= */

/* ---------- CRC32 y escritor ZIP (almacenado, sin comprimir) ---------- */
const CRC_TABLA=(()=>{const t=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;
    for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;
    t[n]=c>>>0;}
  return t;})();
const crc32=(b)=>{let c=0xFFFFFFFF;
  for(let i=0;i<b.length;i++)c=CRC_TABLA[(c^b[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;};

function zip(entradas){
  const cod=new TextEncoder(), partes=[], central=[];
  let desp=0;
  const w16=(v)=>[v&255,(v>>8)&255];
  const w32=(v)=>[v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255];
  for(const {nombre,datos} of entradas){
    const n=cod.encode(nombre), d=typeof datos==='string'?cod.encode(datos):datos;
    const c=crc32(d);
    const local=[...w32(0x04034b50),...w16(20),...w16(0),...w16(0),...w16(0),...w16(0),
      ...w32(c),...w32(d.length),...w32(d.length),...w16(n.length),...w16(0)];
    partes.push(new Uint8Array(local),n,d);
    central.push({n,c,tam:d.length,desp});
    desp+=local.length+n.length+d.length;
  }
  const dirIni=desp;
  for(const e of central){
    const cab=[...w32(0x02014b50),...w16(20),...w16(20),...w16(0),...w16(0),...w16(0),...w16(0),
      ...w32(e.c),...w32(e.tam),...w32(e.tam),...w16(e.n.length),...w16(0),...w16(0),
      ...w16(0),...w16(0),...w32(0),...w32(e.desp)];
    partes.push(new Uint8Array(cab),e.n);
    desp+=cab.length+e.n.length;
  }
  partes.push(new Uint8Array([...w32(0x06054b50),...w16(0),...w16(0),
    ...w16(central.length),...w16(central.length),...w32(desp-dirIni),...w32(dirIni),...w16(0)]));
  let total=0;partes.forEach((p)=>total+=p.length);
  const out=new Uint8Array(total);let p=0;
  partes.forEach((x)=>{out.set(x,p);p+=x.length;});
  return out;
}

/* ---------- modelo de documento ---------- */
const xesc=(t)=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function docBloques(tipo){
  const s=EST, m=metricas(), b=[];
  const cab=(t)=>({k:'h1',t});
  const sub=(t)=>({k:'h2',t});
  const p=(t)=>({k:'p',t});
  const tabla=(enc,filas)=>({k:'tabla',enc,filas});
  const ctxPropio={s,m,tabla,cab,sub,p};
  const cliente=$('#cliente').value||'Sin asignar';
  const caso=dirCaso?dirCaso.name:'sin carpeta';

  b.push({k:'titulo',t:tipo.titulo});
  b.push({k:'meta',t:'Caso '+caso+' · Cliente: '+cliente+' · Generado el '+fmtUTC(new Date().toISOString())+
    ' UTC por '+analista()+' · '+VERSION});
  b.push({k:'meta',t:'Sello del registro: '+(s.cadena.integra?s.cadena.sello:'CADENA ROTA en el asiento '+s.cadena.en)+
    ' · '+ASIENTOS.length+' asientos'});

  if(tipo.propio)return docBloquesPropio(tipo,b,ctxPropio);
  if(tipo.id==='final')return bloquesInforme(b,s,m,tabla,cab,sub,p);

  if(tipo.id==='custodia'){
    b.push(cab('Acta de evidencias'));
    b.push(p('Relación de evidencias incorporadas al caso. La huella se calculó al incorporar cada '+
      'fichero al almacén; acredita que la copia no ha variado desde ese momento, no la fidelidad '+
      'respecto al soporte original, que corresponde al acta de adquisición.'));
    b.push(tabla(['Id','Evidencia','Tamaño','SHA-256','Adquirida por / el','Origen y método','Responsable actual','Integridad'],
      s.ev.map((e)=>{const v=e.verif[e.verif.length-1];
        return [e.id,e.nombre,bytesTxt(e.bytes),e.sha256,
          (e.adquiridaPor||e.custodio)+'\n'+(fmtUTC(e.adquiridaEl)||fmtUTC(e.ts)+' (alta)'),
          (e.origen||'sin indicar')+'\n'+(e.metodo||'sin indicar'),
          e.custodioActual||e.custodio,
          !v?'Sin verificar':v.coincide?'Verificada '+fmtUTC(v.ts):'NO COINCIDE'];})));
    const tr=s.ev.flatMap((e)=>e.transferencias.map((t)=>[e.id,fmtUTC(t.ts),t.origen,t.destino,
      t.medio,t.motivo||'',t.observaciones||'']));
    b.push(sub('Transferencias'));
    b.push(tr.length?tabla(['Evidencia','Fecha (UTC)','Entrega','Recibe','Medio','Motivo','Observaciones'],tr)
      :p('No se ha registrado ninguna transferencia.'));
    const disc=s.ev.filter((e)=>e.coincideOrigen===false);
    if(disc.length){
      b.push(sub('Discrepancias con la huella declarada en origen'));
      b.push(tabla(['Id','Declarada en origen','Calculada al incorporar'],
        disc.map((e)=>[e.id,e.hashOrigen,e.sha256])));
    }
  }

  if(tipo.id==='iocs'){
    const iocs=todosIocs();
    b.push(cab('Indicadores'));
    b.push(p('Observables extraídos de las evidencias y su valoración. Los valores se recogen sin '+
      'neutralizar para permitir su uso operativo. Una coincidencia en un servicio externo no '+
      'determina por sí sola la maliciosidad de un indicador.'));
    b.push(iocs.length?tabla(['Tipo','Indicador','Estado','Justificación','Procedencia','Consultas documentadas'],
      iocs.map((i)=>[i.tipo,i.valor,i.estado,i.motivo||'sin valorar',
        i.evidencias.join(', ')||'añadido a mano',
        i.consultas.map((c)=>c.proveedor+' ('+fmtUTC(c.consultado||c.ts).slice(0,10)+'): '+c.resumen).join('\n')||'ninguna']))
      :p('No se ha recogido ningún indicador.'));
  }

  if(tipo.id==='estado'){
    const cl=clasificacionActual();
    b.push(cab('Clasificación del ciberincidente'));
    b.push(p('Clasificación conforme a la guía CCN-STIC 817 del Centro Criptológico Nacional. La '+
      'peligrosidad valora la gravedad técnica de la amenaza; el impacto, las consecuencias para la '+
      'entidad. Los niveles asignados y su justificación corresponden al analista firmante.'));
    if(cl){
      const sg=SEGUIMIENTO[cl.peligrosidad];
      b.push(tabla(['Concepto','Valor'],[
        ['Clase de ciberincidente',cl.clase],['Tipo',cl.tipoIncidente],
        ['Origen de la amenaza',cl.origen],
        ['Nivel de peligrosidad',cl.peligrosidad+' (sugerido por la guía: '+cl.peligrosidadSugerida+')'],
        ['Justificación de la peligrosidad',cl.motivoPeligrosidad],
        ['Nivel de impacto',cl.impacto+' (sugerido: '+cl.impactoSugerido+')'],
        ['Justificación del impacto',cl.motivoImpacto],
        ['Categoría ENS más alta afectada',cl.categoria],
        ['Equipos afectados',String(cl.equipos)],
        ['Esfuerzo de resolución',cl.esfuerzo],
        ['Dimensiones de seguridad afectadas',cl.dimensiones||'sin indicar'],
        ['Notificación al CCN-CERT',sg.notificar?'Obligatoria':'No obligatoria'],
        ['Plazo de cierre',sg.dias+' días naturales'],
        ['Clasificado por',cl.actor+' el '+fmtUTC(cl.ts)+' UTC']]));
      const rs=clasifDe('CLASIFICACION_RSIT'), ns=clasifDe('CLASIFICACION_NIST');
      if(rs){
        b.push(sub('Clasificación RSIT (TF-CSIRT y ENISA)'));
        b.push(tabla(['Concepto','Valor'],[['Classification',rs.clase],
          ['Incident example',rs.tipoIncidente],['Justificación',rs.motivo],
          ['Clasificado por',rs.actor+' el '+fmtUTC(rs.ts)+' UTC']]));
      }
      if(ns){
        b.push(sub('Repercusión según el esquema de CISA (NIST SP 800-61 r2)'));
        b.push(tabla(['Concepto','Valor'],[['Vector de ataque',ns.vector],
          ['Ubicación de la actividad',ns.ubicacion],['Impacto funcional',ns.funcional],
          ['Impacto en la información',ns.informacion],['Recuperabilidad',ns.recuperacion],
          ['Sistemas afectados',ns.sistemas],['Justificación',ns.motivo],
          ['Valorado por',ns.actor+' el '+fmtUTC(ns.ts)+' UTC']]));
      }
      const hist=historialClasificacion();
      if(hist.length>1){
        b.push(sub('Historial de clasificación'));
        b.push(tabla(['Fecha (UTC)','Peligrosidad','Impacto','Tipo','Analista'],
          hist.map((x)=>[fmtUTC(x.ts),x.peligrosidad,x.impacto,x.tipoIncidente,x.actor])));
      }
    }else b.push(p('El incidente no ha sido clasificado.'));

    b.push(cab('Situación del caso'));
    b.push(tabla(['Concepto','Valor'],[
      ['Caso abierto hace',humanizar(m.ahora-m.apertura)],
      ['Última actividad registrada',humanizar(m.ahora-m.ultima)],
      ['Evidencias',s.ev.length+' ('+bytesTxt(m.bytes)+')'],
      ['Evidencias verificadas',m.integridad.ok+' de '+s.ev.length],
      ['Evidencias con huella alterada',String(m.integridad.mal)],
      ['Hitos',m.terminados.length+' terminados de '+s.hi.length],
      ['Hitos abiertos',String(m.enCurso.length)],
      ['Preguntas sin responder',String(m.abiertas.length)],
      ['Indicadores',m.iocTotal+' ('+m.iocMal+' maliciosos, '+m.iocPend+' sin valorar)'],
      ['Plantillas aplicadas',s.procedimientos.join(', ')||'ninguna']]));

    b.push(sub('Hitos'));
    b.push(s.hi.length?tabla(['Id','Fase','Hito','Riesgo','Propietario','Inicio (UTC)','Fin (UTC)','Duración','Estado','Resultado'],
      s.hi.map((h)=>[h.id,h.fase,h.hito,h.riesgo,h.propietario,fmtUTC(h.inicio),fmtUTC(h.fin),
        h.inicio&&h.fin?dur(h.inicio,h.fin):'—',h.estado,h.resultado||h.motivo||'']))
      :p('No hay hitos registrados.'));

    b.push(sub('Preguntas abiertas'));
    b.push(s.pr.length?tabla(['Id','Pregunta','Dirigida a','Estado','Respuesta'],
      s.pr.map((q)=>[q.id,q.pregunta,q.dirigidaA||'—',q.estado,q.respuesta||'']))
      :p('No hay preguntas registradas.'));

    b.push(sub('Comprobaciones de completitud del expediente'));
    b.push(tabla(['Comprobación','Cumple','Detalle'],
      comprobaciones(m).map((c)=>[c.texto,c.ok===true?'Sí':c.ok===false?'No':'—',c.detalle||''])));
    b.push(p('Estas comprobaciones miden la completitud del expediente, no la calidad del análisis '+
      'ni la gravedad del incidente.'));
  }

  return b;
}

/* ---------- informe de respuesta al incidente ----------
   Estructura propia de TraceLock, organizada según el ciclo de gestión de incidentes descrito en
   fuentes públicas (NIST SP 800-61, ISO/IEC 27035 y la guía CCN-STIC 817): quién lo detectó y qué
   es, cómo se clasifica y a quién se comunica, qué se encontró, a qué alcanzó, qué se hizo, en qué
   pruebas se apoya y qué se mejora. Lo que el expediente conoce se rellena solo; el resto lleva una
   indicación de qué debe redactar el analista. */
function bloquesInforme(b,s,m,tabla,cab,sub,p){
  const pend=(t)=>b.push({k:'pendiente',t});
  const cl=clasificacionActual(), ns=clasifDe('CLASIFICACION_NIST');
  const ap=ASIENTOS.find((a)=>a.tipo==='CASO_ABIERTO')||{datos:{}};
  const tec=tecnicasCaso();
  const iocs=todosIocs();
  const esIocPrivado=(i)=>i.tipo==='ipv4'&&esPrivada(i.valor);
  const privados=iocs.filter(esIocPrivado), publicos=iocs.filter((i)=>!esIocPrivado(i));
  const porFase=(f)=>s.hi.filter((h)=>h.fase===f);
  const filasHitos=(lista)=>lista.map((h)=>[h.id,h.fase+' · '+h.hito,h.propietario||'—',fmtUTC(h.inicio),
    fmtUTC(h.fin),h.estado,h.resultado||h.motivo||'',
    (h.pruebas||[]).map((x)=>'acciones/'+x.archivo+' ('+x.sha256.slice(0,16)+'…)').join('\n')||'—']);
  const CAB_HITOS=['Ref.','Fase y actuación','Ejecutada por','Comienzo (UTC)','Término (UTC)','Situación','Resultado','Capturas asociadas'];
  const referencia=ap.datos.nombre||(dirCaso?dirCaso.name:'sin referencia');
  const deteccion=fmtUTC(ap.datos.deteccion||(ASIENTOS[0]||{}).ts);
  const analistas=[...new Set(ASIENTOS.map((a)=>a.actor).filter((x)=>x&&x!=='sistema'&&x!=='sin identificar'))];

  /* ---- Control del documento ---- */
  b.push(cab('Control del documento'));
  b.push(tabla(['Dato','Contenido'],[
    ['Expediente',referencia],
    ['Organización afectada',$('#cliente').value||'sin asignar'],
    ['Marcado TLP',ap.datos.tlp||'sin marcar'],
    ['Generado a partir del registro',s.cadena.integra?'sello '+s.cadena.sello:'CADENA ROTA en el asiento '+s.cadena.en]]));
  b.push(tabla(['Paso','Persona','Función','Fecha'],
    [['Redacción',analista(),'',''],['Revisión','','',''],['Aprobación','','','']]));

  /* ---- 1. Síntesis ---- */
  b.push(cab('1. Síntesis'));
  pend('Resumir el incidente para quien no va a leer el resto: en pocas líneas y sin jerga técnica, qué '+
    'pasó, desde cuándo se sabe, a qué afectó, cómo se ha respondido, cómo queda la situación y qué '+
    'decisiones se esperan del destinatario. Apoyarse en las cifras de la tabla, pero redactarlo a mano.');
  b.push(tabla(['Indicador','Valor'],[
    ['Expediente',referencia],
    ['Detectado el (UTC)',deteccion],
    ['Tipo de incidente',cl?cl.clase+' · '+cl.tipoIncidente:'sin clasificar'],
    ['Peligrosidad / impacto',cl?cl.peligrosidad+' / '+cl.impacto:'—'],
    ['Evidencias en el expediente',String(s.ev.length)],
    ['Indicadores confirmados como maliciosos',String(iocs.filter((i)=>i.estado==='Malicioso').length)],
    ['Actuaciones de respuesta',s.hi.length+' registradas, '+m.terminados.length+' terminadas'],
    ['Cuestiones abiertas',String(m.abiertas.length)]]));

  /* ---- 2. Identificación del incidente ---- */
  b.push(cab('2. Identificación del incidente'));
  b.push(sub('2.1. Datos del expediente'));
  b.push(tabla(['Dato','Contenido'],[
    ['Expediente',referencia],
    ['Organización afectada',$('#cliente').value||'sin asignar'],
    ['Detección (UTC)',deteccion],
    ['Apertura del expediente (UTC)',fmtUTC((ASIENTOS[0]||{}).ts)],
    ['Último registro (UTC)',fmtUTC((ASIENTOS[ASIENTOS.length-1]||{}).ts)],
    ['Situación',m.enCurso.length?'respuesta en curso':'sin actuaciones abiertas'],
    ['Equipo que ha intervenido',analistas.join(', ')||'—']]));
  pend('Añadir la persona de contacto para este informe y, si la hay, la fecha en que se comunicó el '+
    'incidente a la organización afectada.');
  if(ap.datos.descripcion)b.push(p('Motivo por el que se abrió el expediente: '+ap.datos.descripcion));
  else pend('Explicar por qué se abrió el expediente: qué indicio se observó y quién lo trasladó.');

  b.push(sub('2.2. Origen de la alerta'));
  pend('Indicar cómo y cuándo se tuvo noticia del incidente: una regla concreta del SIEM o del EDR, el '+
    'aviso de un usuario o de la propia organización, la comunicación de un CERT, una búsqueda proactiva. '+
    'Ojo: de dónde proceden las evidencias (tabla siguiente) no siempre coincide con cómo se detectó.');
  const origenes=[...new Set(s.ev.map((e)=>(e.origen||'')+'|'+(e.metodo||'')).filter((x)=>x!=='|'))]
    .map((x)=>x.split('|'));
  if(origenes.length)b.push(tabla(['Procedencia de las evidencias','Forma de obtención'],origenes));

  b.push(sub('2.3. Objeto y perímetro del análisis'));
  b.push(p('Este informe documenta el análisis y la respuesta al incidente del expediente '+referencia+
    ': los hechos observados, su alcance sobre los sistemas y servicios de la organización y las medidas '+
    'aplicadas para contenerlo y resolverlo. Sirve también como punto de partida para corregir su causa '+
    'y evitar que se repita.'));
  b.push(p('Material analizado: '+(s.ev.length?s.ev.length+' evidencias incorporadas al expediente, con origen en '+
    ([...new Set(s.ev.map((e)=>e.origen).filter(Boolean))].join(', ')||'orígenes sin declarar')
    :'ninguna evidencia incorporada')+'.'));
  pend('Fijar el periodo de tiempo examinado, lo que se dejó fuera deliberadamente y las circunstancias que '+
    'limitan las conclusiones (registros que ya no existían, equipos sin telemetría, memoria no capturada, '+
    'sistemas de terceros a los que no se tuvo acceso). Si no se declara, el lector entenderá que el '+
    'análisis cubrió todo.');
  b.push(p('Que no se haya encontrado rastro de una actividad no demuestra que no ocurriera: solo que no '+
    'aparece en el material y el periodo analizados.'));

  /* ---- 3. Clasificación y comunicaciones ---- */
  b.push(cab('3. Clasificación y comunicaciones'));
  b.push(sub('3.1. Categorización'));
  if(cl){
    b.push(tabla(['Criterio (CCN-STIC 817)','Valor'],[['Clase',cl.clase],['Tipo',cl.tipoIncidente],
      ['Peligrosidad',cl.peligrosidad],['Impacto',cl.impacto],
      ['Equipos afectados',cl.equipos?String(cl.equipos):'—'],['Categoría ENS más alta',cl.categoria||'—']]));
    if(ns&&ns.vector&&ns.vector!=='Unknown')b.push(p('Vector de ataque según el esquema de CISA: '+ns.vector+'.'));
  }else pend('El incidente no está clasificado. Clasificarlo desde la sección Clasificación antes de entregar.');

  b.push(sub('3.2. Comunicaciones obligatorias y a terceros'));
  const sg=cl?SEGUIMIENTO[cl.peligrosidad]:null;
  b.push(tabla(['Destinatario y norma','Procede','Plazo','Comunicado el','Nº de registro','Responsable'],[
    ['CCN-CERT (CCN-STIC 817)',sg?(sg.notificar?'Sí':'No'):'sin determinar',
      sg?sg.dias+' días naturales hasta el cierre':'—','','',''],
    ['Autoridad de protección de datos (RGPD, art. 33)','','72 h','','',''],
    ['Personas afectadas (RGPD, art. 34)','','sin dilación indebida','','',''],
    ['CSIRT de referencia (NIS2 / ENS)','','24 h / 72 h / 1 mes','','',''],
    ['Organización afectada (compromisos contractuales)','','','','',''],
    ['Fuerzas y Cuerpos de Seguridad (denuncia)','','','','',''],
    ['Regulación sectorial aplicable','','','','','']]));
  pend('Solo la fila del CCN-CERT se deduce del expediente, a partir de la peligrosidad. Si procede cada '+
    'una de las demás lo deciden la organización afectada y sus responsables jurídicos y de protección de '+
    'datos. Anotar las fechas y números de registro de lo comunicado y, para lo que no proceda, el motivo y '+
    'quién lo ha decidido.');

  /* ---- 4. Hallazgos ---- */
  b.push(cab('4. Hallazgos'));
  b.push(sub('4.1. Secuencia de los hechos'));
  const filasCrono=crOrdenadas().map((x)=>({
    orden:(x.fecha||'9999-12-31')+'T'+(x.hora||'23:59'),
    fila:[fmtFecha(x.fecha)+(x.hora?' '+x.hora:'')+(x.zona&&x.zona!=='UTC'?' ('+x.zona+')':''),
      'Adversario',x.accion,x.fuente||'sin indicar','—',
      x.rectificadaEl?'rectificada '+fmtUTC(x.rectificadaEl)+': '+(x.motivo||''):'']}));
  const filasActu=s.hi.filter((h)=>h.inicio||h.fin).map((h)=>({
    orden:h.inicio||h.fin||'9999',
    fila:[fmtUTC(h.inicio||h.fin),'Equipo de respuesta',h.fase+' · '+h.hito,
      h.propietario||'sin indicar',h.id,
      h.estado+(h.fin?' · fin '+fmtUTC(h.fin):'')+
        (h.resultado?' · '+h.resultado:(h.motivo?' · '+h.motivo:''))]}));
  const combinadas=[...filasCrono,...filasActu].sort((a,z)=>a.orden<z.orden?-1:a.orden>z.orden?1:0);
  if(combinadas.length){
    b.push(p('Hechos del adversario, reconstruidos a partir de las evidencias, y actuaciones del equipo '+
      'de respuesta en una sola secuencia ordenada en el tiempo. Las horas van en UTC salvo que se indique '+
      'otro huso; cada actuación figura en el momento en que empezó.'));
    b.push(tabla(['Momento','Quién','Qué ocurrió','Fuente o responsable','Ref.','Notas'],
      combinadas.map((x)=>x.fila)));
    const sinFuente=s.cr.filter((x)=>!x.fuente).length;
    const sinHuso=s.cr.filter((x)=>!x.zona||x.zona==='Sin determinar').length;
    if(sinFuente||sinHuso)pend(sinFuente+' hechos no indican su fuente y '+sinHuso+' no tienen huso horario. '+
      'Completarlos antes de entregar: sin fuente, un hecho no se puede comprobar.');
    const sinReloj=s.hi.filter((h)=>!h.inicio&&!h.fin).length;
    if(sinReloj)pend(sinReloj+' actuaciones planificadas no llegaron a iniciarse y por eso no aparecen aquí; '+
      'se relacionan en el apartado 6.1.');
    if(!s.cr.length)pend('La secuencia solo contiene actuaciones del equipo: no se ha reconstruido ningún hecho '+
      'del adversario. Añadirlos desde el primer indicio hasta la contención, cada uno con fecha, hora, huso '+
      'y fuente.');
  }else pend('No hay hechos ni actuaciones con hora. Reconstruir lo ocurrido desde el primer indicio hasta la '+
    'contención, cada hecho con fecha, hora, huso y fuente.');

  b.push(sub('4.2. Modo de operar del adversario'));
  if(tec.length){
    b.push(p('Técnicas de MITRE ATT&CK Enterprise observadas. El grado de confianza de cada una importa: '+
      'una técnica «posible» o «probable» es una hipótesis, no un hecho demostrado.'));
    b.push(tabla(['Táctica','Técnica','Confianza','Evidencia','Observación'],
      tec.map((t)=>[t.tacticaId+' '+t.tactica,t.tecnicaId+' '+t.tecnica,t.confianza,
        t.evidencia||'sin indicar',t.notas])));
  }else pend('No se ha registrado ninguna técnica ATT&CK. Describir el modo de operar del adversario es lo que '+
    'permite relacionar el incidente con campañas conocidas y decidir qué defensas reforzar.');

  b.push(sub('4.3. Indicadores de compromiso'));
  if(iocs.length){
    b.push(p('Todos los indicadores del expediente. «Ámbito» separa la red de la organización de la '+
      'infraestructura externa (se decide automáticamente por rango de IP privada y conviene revisarlo); '+
      '«Papel» indica si el indicador es un sistema comprometido, un activo legítimo o infraestructura del '+
      'adversario; «Relaciones» recoge los vínculos declarados. Los externos son los que sirven para bloquear '+
      'y para compartir, respetando el TLP del documento. Los valores van sin neutralizar para poder usarlos.'));
    const nomIoc=new Map(iocs.map((x)=>[x.key,x.valor]));
    const vinTexto=(i)=>[...i.vinculosLegado.map((v)=>'comprometido por '+v.valor),
      ...i.vinculos.map((v)=>(v.dir==='sale'?'':'← ')+RELACION(v.rel).n+' '+
        (nomIoc.get(v.otro)||v.otro))].join('; ')||'—';
    b.push(tabla(['Ámbito','Tipo','Indicador','Valoración','Papel','Relaciones','Justificación','Procedencia','Consultas'],
      [...publicos,...privados].map((i)=>[esIocPrivado(i)?'Interno':'Externo',i.tipo,i.valor,i.estado,
        i.rol,vinTexto(i),
        i.motivo||'sin valorar',i.evidencias.join(', ')||'manual',
        i.consultas.map((c)=>c.proveedor+': '+c.resumen).join(' | ')||'ninguna'])));
    const sinValorar=iocs.filter((i)=>i.estado==='Pendiente').length;
    if(sinValorar)pend(sinValorar+' indicadores siguen sin valorar. No entregarlos para bloqueo hasta que '+
      'cada uno tenga su justificación.');
    const sinRol=iocs.filter((i)=>i.rol==='Sin determinar').length;
    if(sinRol)pend(sinRol+' indicadores no tienen papel asignado. Decidir cuáles son sistemas comprometidos y '+
      'cuáles infraestructura del adversario: de eso dependen el apartado 5.1 y los bloqueos.');
  }else pend('El expediente no contiene indicadores de compromiso.');

  b.push(sub('4.4. Vía de entrada y causa'));
  if(ns&&ns.vector&&ns.vector!=='Unknown')b.push(p('Vector registrado: '+ns.vector+'.'));
  pend('Explicar por dónde entró el adversario, qué debilidad o configuración aprovechó (con su CVE si '+
    'existe) y qué control faltó o no funcionó. Separar lo que prueban las evidencias de lo que se supone, '+
    'con el grado de confianza de cada afirmación.');

  b.push(sub('4.5. Autoría y grado de certeza'));
  pend('Opcional. Si se plantean hipótesis sobre quién está detrás, con qué motivación o si encaja con '+
    'campañas conocidas, distinguir hechos de valoraciones y dar a cada valoración su grado de certeza: alto '+
    'con pruebas directas y de varias fuentes, medio si es coherente pero incompleta, bajo si es una '+
    'inferencia sin confirmar. Si no hay base suficiente, decirlo expresamente. No señalar a personas '+
    'concretas sin haberlo validado antes con los responsables jurídicos de la organización.');

  /* ---- 5. Alcance del compromiso ---- */
  b.push(cab('5. Alcance del compromiso'));
  b.push(sub('5.1. Activos comprometidos'));
  const afectados=iocs.filter((i)=>i.rol==='Sistema afectado');
  if(afectados.length){
    b.push(p('Sistemas que el análisis identifica como comprometidos y el indicador del adversario que lo acredita.'));
    b.push(tabla(['Tipo','Activo','Valoración','Acreditado por','Justificación','Procedencia'],
      afectados.map((i)=>[i.tipo,i.valor,i.estado,
        comprometidoPor(i,iocs).join(', ')||'sin vincular',
        i.motivo||'sin valorar',i.evidencias.join(', ')||'manual'])));
    const sinVinculo=afectados.filter((i)=>!comprometidoPor(i,iocs).length).length;
    if(sinVinculo)pend(sinVinculo+' activos comprometidos no tienen vinculado ningún indicador del adversario. '+
      'Vincularlos en la sección IOCs: sin ello el informe afirma el compromiso sin justificarlo.');
  }else pend('Ningún indicador tiene el papel «Sistema afectado». Asignarlo en la sección IOCs y vincular '+
    'cada activo con el indicador que acredita su compromiso.');
  if(cl&&cl.equipos&&+cl.equipos>0)b.push(p('Equipos afectados según la clasificación: '+cl.equipos+
    ' (categoría ENS más alta: '+cl.categoria+').'));
  pend('Añadir para qué sirve cada activo en la organización y hasta qué punto se ha visto afectado: la tabla '+
    'dice qué es técnicamente, no qué supone para el negocio.');

  b.push(sub('5.2. Información afectada'));
  if(ns)b.push(p('Afectación a la información según el esquema de CISA: '+ns.informacion+'.'));
  pend('Detallar qué información se ha visto comprometida o expuesta, cuánta y de qué tipo, y si incluye '+
    'datos personales o de categorías especiales. Si no se ha encontrado exposición, escribir «no se han '+
    'encontrado indicios de exposición en el alcance analizado» y no «no ha habido exposición»: ante un '+
    'tercero no significan lo mismo.');

  b.push(sub('5.3. Efectos sobre la actividad'));
  if(cl)b.push(p('Impacto asignado: '+cl.impacto+'. Esfuerzo estimado de resolución: '+cl.esfuerzo+'.'));
  pend('Describir cómo ha afectado a la operativa: qué servicios se interrumpieron y cuánto tiempo, a cuántos '+
    'usuarios o clientes, qué procesos funcionaron peor y qué consecuencias contractuales o de reputación '+
    'hay. Separar lo que ya ha ocurrido de lo que habría ocurrido sin la contención.');

  /* ---- 6. Respuesta ---- */
  b.push(cab('6. Respuesta'));
  b.push(sub('6.1. Actuaciones del equipo'));
  if(s.hi.length)b.push(tabla(CAB_HITOS,filasHitos(s.hi)));
  else pend('No hay actuaciones registradas. Documentar qué se hizo, cuándo y quién lo hizo.');
  for(const [tit,fase,guia] of [
    ['6.2. Contención','Contencion','Explicar qué se hizo para frenar la propagación, en qué momento quedó contenido y quién autorizó las medidas que interrumpieron algún servicio.'],
    ['6.3. Erradicación','Erradicacion','Explicar cómo se eliminaron los artefactos y la persistencia, qué credenciales y sesiones se revocaron y qué se parcheó o reconfiguró.'],
    ['6.4. Restablecimiento y comprobación','Recuperacion','Explicar cómo se recuperaron los servicios y, sobre todo, qué comprobaciones demuestran que el adversario ya no tiene acceso, cuánto duró la vigilancia reforzada y qué se observó en ella.']]){
    b.push(sub(tit));
    const l=porFase(fase);
    if(l.length)b.push(tabla(CAB_HITOS,filasHitos(l)));
    pend(guia+(l.length?'':' No hay actuaciones registradas en esta fase.'));
  }
  b.push(sub('6.5. Participación de terceros'));
  pend('Enumerar las organizaciones externas que han intervenido y su papel: fabricante o proveedor del '+
    'producto afectado, empresa de respuesta, proveedor de servicios gestionados, CERT, Fuerzas y Cuerpos de '+
    'Seguridad, aseguradora. Para cada una: desde cuándo, con qué alcance, quién es el interlocutor y con qué '+
    'TLP se le ha compartido información. El expediente no lo registra: hay que redactarlo.');
  b.push(sub('6.6. Cierre'));
  pend('Describir en qué situación queda el incidente y con qué criterios se da por resuelto: servicios '+
    'recuperados y comprobados, debilidad corregida, ninguna actividad durante la vigilancia reforzada. Si se '+
    'cierra con cuestiones sin resolver, relacionarlas.');
  if(m.abiertas.length)b.push(tabla(['Cuestión sin resolver','Pedida a','Desde (UTC)'],
    m.abiertas.map((q)=>[q.pregunta,q.dirigidaA||'—',fmtUTC(q.ts)])));
  b.push(sub('6.7. Tiempos de la respuesta'));
  b.push(tabla(['Medida','Valor'],[
    ['Antigüedad del expediente',humanizar(m.ahora-m.apertura)],
    ['De la apertura al último registro',humanizar(m.ultima-m.apertura)],
    ['Actuaciones terminadas',m.terminados.length+' de '+s.hi.length],
    ['Duración media de una actuación',m.durs.length?humanizar(m.durs.reduce((a,x)=>a+x,0)/m.durs.length):'—'],
    ['Actuación más larga',m.durs.length?humanizar(Math.max(...m.durs)):'—'],
    ['Volumen de evidencias',s.ev.length+' ('+bytesTxt(m.bytes)+')'],
    ['Asientos del registro',String(ASIENTOS.length)]]));
  pend('Completar con el tiempo que el adversario permaneció dentro y el tiempo hasta la contención: se '+
    'obtienen de la secuencia de los hechos, no del expediente.');

  /* ---- 7. Base probatoria ---- */
  b.push(cab('7. Base probatoria'));
  b.push(sub('7.1. Evidencias y su trazabilidad'));
  if(s.ev.length){
    b.push(tabla(['Ref.','Evidencia','Procedencia y obtención','Obtenida por / fecha','SHA-256','En poder de','Integridad'],
      s.ev.map((e)=>{const v=e.verif[e.verif.length-1];
        return [e.id,e.nombre+' ('+bytesTxt(e.bytes)+')',
          (e.origen||'sin indicar')+' · '+(e.metodo||'sin indicar'),
          (e.adquiridaPor||e.custodio)+' · '+(fmtUTC(e.adquiridaEl)||fmtUTC(e.ts)+' (alta)'),
          e.sha256,e.custodioActual||e.custodio,
          !v?'sin verificar':v.coincide?'verificada '+fmtUTC(v.ts):'NO COINCIDE'];})));
    const tr=s.ev.flatMap((e)=>e.transferencias.map((t)=>[e.id,fmtUTC(t.ts),t.origen,t.destino,t.medio,t.motivo||'']));
    if(tr.length)b.push(tabla(['Evidencia','Fecha (UTC)','Entrega','Recibe','Medio','Finalidad'],tr));
    b.push(p('La huella se calculó al incorporar cada fichero al expediente y prueba que la copia no ha '+
      'cambiado desde entonces. Que la copia sea fiel al soporte original lo acredita el acta de adquisición, '+
      'no este documento.'));
    const sinVerif=m.integridad.sin, disc=s.ev.filter((e)=>e.coincideOrigen===false).length;
    if(sinVerif)pend(sinVerif+' evidencias no se han verificado todavía. Verificarlas antes de entregar.');
    if(disc)pend(disc+' evidencias no coinciden con la huella declarada en origen. Explicar el motivo en el '+
      'informe; no omitirlo.');
  }else pend('El expediente no contiene evidencias, y sin ellas las conclusiones no tienen soporte.');
  b.push(sub('7.2. Medios técnicos empleados'));
  const labs=ASIENTOS.filter((a)=>a.tipo==='LAB_TRANSFORMACION');
  const metas=ASIENTOS.filter((a)=>a.tipo==='EVIDENCIA_METADATOS');
  const herr=[[VERSION,'—','Trazabilidad de evidencias, registro encadenado y análisis de correo']];
  if(labs.length)herr.push([VERSION+' · laboratorio','—',labs.length+' transformaciones registradas']);
  if(metas.length)herr.push([VERSION+' · metadatos','—',metas.length+' lecturas de metadatos registradas']);
  b.push(tabla(['Herramienta','Versión','Uso'],herr));
  pend('Añadir las demás herramientas utilizadas, con su versión exacta, y describir el entorno de análisis: '+
    'sin estos datos los resultados no se pueden reproducir.');

  /* ---- 8. Mejora ---- */
  b.push(cab('8. Mejora'));
  b.push(sub('8.1. Medidas propuestas'));
  b.push(tabla(['Ref.','Medida','Riesgo que reduce','Prioridad','Responsable','Plazo'],
    [['M-01','','','','',''],['M-02','','','','',''],['M-03','','','','','']]));
  pend('Proponer medidas concretas para la organización afectada, cada una con responsable y plazo para poder '+
    'seguirla. Las que no se adopten se registran como riesgo asumido, indicando quién lo asume. No confundir '+
    'con el apartado 8.2, que mira hacia el propio proceso de respuesta.');
  b.push(sub('8.2. Aprendizajes'));
  const flojas=comprobaciones(m).filter((c)=>c.ok===false);
  if(flojas.length){
    b.push(p('Carencias de completitud del expediente detectadas automáticamente:'));
    b.push(tabla(['Comprobación','Detalle'],flojas.map((c)=>[c.texto,c.detalle||''])));
  }
  pend('Recoger qué funcionó y qué falló en la detección y en la respuesta, y qué se cambia a partir de ahora. '+
    'Las carencias de la tabla ayudan, pero no son en sí el aprendizaje.');
  b.push(sub('8.3. Detecciones creadas o ajustadas'));
  b.push(tabla(['Nombre o identificador','Tipo','Plataforma','Qué detecta','Estado'],
    [['','','','',''],['','','','','']]));
  pend('Relacionar las reglas, consultas o casos de uso nuevos o modificados a raíz del incidente y si ya están '+
    'desplegados: es la prueba de que lo aprendido se ha convertido en capacidad de detección.');

  /* ---- Anexos ---- */
  b.push(cab('Anexo A. Registro de actividad'));
  b.push(p('Asientos del registro del expediente por orden. Cada uno incluye la huella del anterior, y el '+
    'sello del apartado «Control del documento» cierra la cadena.'));
  b.push(tabla(['#','Fecha (UTC)','Categoría','Acción','Ref.','Detalle','Analista'],
    filasTt().map((r)=>[String(r.seq),fmtUTC(r.ts),r.cat,r.accion,r.ref,r.detalle,r.actor])));
  b.push(cab('Anexo B. Fuentes consultadas'));
  const refs=[];
  for(const i of iocs)for(const c of i.consultas)
    refs.push([c.proveedor,i.valor,c.resumen,fmtUTC(c.consultado||c.ts)]);
  if(refs.length)b.push(tabla(['Fuente','Indicador','Resultado','Fecha (UTC)'],refs));
  pend('Añadir los CVE con su puntuación CVSS, boletines de fabricantes, avisos de CCN-CERT o INCIBE-CERT e '+
    'informes públicos de inteligencia que se hayan usado.');
  b.push(cab('Anexo C. Términos y siglas'));
  pend('Definir solo los términos que aparecen en el informe y que el destinatario puede no conocer.');

  b.push(cab('Alcance probatorio de este documento'));
  b.push(p('Este informe se ha generado con '+VERSION+' a partir del registro del expediente. Las horas '+
    'proceden del reloj del equipo en el que se trabajó y no están certificadas por un tercero. El nombre de '+
    'cada analista lo declara él mismo: la herramienta no autentica usuarios. El encadenado del registro '+
    'permite descubrir una modificación posterior, pero no impedirla; por eso el sello solo tiene valor si '+
    'se guardó fuera del sistema.'));
  b.push(p('El documento refleja lo registrado en la herramienta y lo que el analista haya redactado. No '+
    'reemplaza al acta de adquisición de las evidencias ni es, por sí mismo, una prueba autónoma ante terceros.'));
  return b;
}

/* ---------- renderizado a DOCX ---------- */
function bloquesADocx(bloques){
  const par=(txt,estilo,extra)=>{
    const lineas=String(txt).split('\n');
    const runs=lineas.map((l,i)=>(i?'<w:r><w:br/></w:r>':'')+
      '<w:r>'+(extra||'')+'<w:t xml:space="preserve">'+xesc(l)+'</w:t></w:r>').join('');
    return '<w:p><w:pPr>'+(estilo?'<w:pStyle w:val="'+estilo+'"/>':'')+'</w:pPr>'+runs+'</w:p>';
  };
  const celda=(t,cab)=>'<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>'+
    (cab?'<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>':'')+'</w:tcPr>'+
    par(t,null,cab?'<w:rPr><w:b/></w:rPr>':'<w:rPr><w:sz w:val="16"/></w:rPr>')+'</w:tc>';
  let cuerpo='';
  for(const b of bloques){
    if(b.k==='titulo')cuerpo+=par(b.t,'Title');
    else if(b.k==='meta')cuerpo+=par(b.t,'Subtitle');
    else if(b.k==='h1')cuerpo+=par(b.t,'Heading1');
    else if(b.k==='h2')cuerpo+=par(b.t,'Heading2');
    else if(b.k==='p')cuerpo+=par(b.t);
    else if(b.k==='pendiente')cuerpo+=par('PARA COMPLETAR POR EL ANALISTA — '+b.t,'Pendiente');
    else if(b.k==='tabla'){
      const ANCHO=15398;                       // A4 apaisado menos los margenes, en twips
      const col=Math.floor(ANCHO/b.enc.length);
      cuerpo+='<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>'+
        '<w:tblBorders>'+['top','left','bottom','right','insideH','insideV']
          .map((x)=>'<w:'+x+' w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>').join('')+
        '</w:tblBorders><w:tblLayout w:type="autofit"/></w:tblPr>'+
        '<w:tblGrid>'+b.enc.map(()=>'<w:gridCol w:w="'+col+'"/>').join('')+'</w:tblGrid>';
      cuerpo+='<w:tr><w:trPr><w:tblHeader/></w:trPr>'+b.enc.map((h)=>celda(h,true)).join('')+'</w:tr>';
      for(const f of b.filas)cuerpo+='<w:tr>'+f.map((c)=>celda(c)).join('')+'</w:tr>';
      cuerpo+='</w:tbl>'+par('');
    }
  }
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:body>'+cuerpo+'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>'+
    '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" '+
    'w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';

  const tipos='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
    '</Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
    '</Relationships>';
  const docRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '</Relationships>';
  const estilo=(id,nombre,tam,neg,color,antes)=>
    '<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+nombre+'"/>'+
    '<w:pPr><w:spacing w:before="'+(antes||0)+'" w:after="120"/></w:pPr>'+
    '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="'+tam+'"/>'+
    (neg?'<w:b/>':'')+(color?'<w:color w:val="'+color+'"/>':'')+'</w:rPr></w:style>';
  const estilos='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>'+
    '<w:sz w:val="18"/></w:rPr></w:rPrDefault></w:docDefaults>'+
    estilo('Title','Title',40,true,'1F3864',0)+
    estilo('Subtitle','Subtitle',16,false,'595959',0)+
    estilo('Heading1','heading 1',28,true,'1F3864',360)+
    estilo('Heading2','heading 2',22,true,'2E5496',240)+
    '<w:style w:type="paragraph" w:styleId="Pendiente"><w:name w:val="Pendiente"/>'+
    '<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="6" w:color="BF8F00"/></w:pBdr>'+
    '<w:shd w:val="clear" w:color="auto" w:fill="FFF2CC"/>'+
    '<w:spacing w:before="60" w:after="160"/><w:ind w:left="120" w:right="120"/></w:pPr>'+
    '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:i/><w:sz w:val="18"/>'+
    '<w:color w:val="7F6000"/></w:rPr></w:style>'+
    '</w:styles>';

  return zip([
    {nombre:'[Content_Types].xml',datos:tipos},
    {nombre:'_rels/.rels',datos:rels},
    {nombre:'word/_rels/document.xml.rels',datos:docRels},
    {nombre:'word/styles.xml',datos:estilos},
    {nombre:'word/document.xml',datos:doc}]);
}

/* ---------- renderizado a HTML imprimible (PDF por el navegador) ---------- */
function bloquesAHtml(bloques,titulo){
  let c='';
  for(const b of bloques){
    if(b.k==='titulo')c+='<h1 class="tit">'+xesc(b.t)+'</h1>';
    else if(b.k==='meta')c+='<p class="meta">'+xesc(b.t)+'</p>';
    else if(b.k==='h1')c+='<h2>'+xesc(b.t)+'</h2>';
    else if(b.k==='h2')c+='<h3>'+xesc(b.t)+'</h3>';
    else if(b.k==='p')c+='<p>'+xesc(b.t)+'</p>';
    else if(b.k==='pendiente')c+='<p class="pend"><b>Para completar por el analista.</b> '+xesc(b.t)+'</p>';
    else if(b.k==='tabla')c+='<table><thead><tr>'+b.enc.map((h)=>'<th>'+xesc(h)+'</th>').join('')+
      '</tr></thead><tbody>'+b.filas.map((f)=>'<tr>'+f.map((x)=>'<td>'+
        xesc(x).replace(/\n/g,'<br>')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  }
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>'+xesc(titulo)+'</title><style>'+
    '@page{size:A4 landscape;margin:14mm}'+
    'body{font:10pt/1.45 Calibri,"Segoe UI",Arial,sans-serif;color:#111;margin:0}'+
    '.tit{font-size:21pt;color:#2a2560;margin:0 0 4px}'+
    '.meta{color:#555;font-size:8.5pt;margin:0 0 3px}'+
    'h2{font-size:14pt;color:#2a2560;margin:22px 0 8px;border-bottom:1px solid #ccd;padding-bottom:4px;'+
      'page-break-after:avoid}'+
    'h3{font-size:11.5pt;color:#4a3a8f;margin:16px 0 6px;page-break-after:avoid}'+
    'p{margin:0 0 8px;max-width:150ch}'+
    'table{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:8pt}'+
    'th{background:#e4e1f7;text-align:left;border:1px solid #aaa;padding:4px 6px}'+
    'td{border:1px solid #ccc;padding:4px 6px;vertical-align:top;word-break:break-word}'+
    'tr{page-break-inside:avoid}thead{display:table-header-group}'+
    '@media screen{body{padding:26px;max-width:1180px;margin:auto;background:#fff}'+
      '.aviso-impresion{position:sticky;top:0;background:#2a2560;color:#fff;padding:10px 14px;'+
      'border-radius:6px;margin-bottom:18px;font-size:10pt}}'+
    '.pend{background:#fff2cc;border-left:4px solid #bf8f00;color:#7f6000;font-style:italic;'+
      'padding:9px 12px;margin:4px 0 12px;font-size:9pt}'+
    '.marca-doc{display:flex;align-items:center;gap:14px;margin:0 0 18px}'+
    '.marca-doc b{font-size:20pt;letter-spacing:.04em;color:#2a2560}'+
    '@media print{.aviso-impresion{display:none}}'+
    '</style></head><body>'+
    '<div class="marca-doc">'+
    '<svg width="58" height="44" viewBox="0 0 83 63">'+
    '<g transform="translate(3.5,3.5)" fill="none" stroke="#2a2560" stroke-width="7" '+
    'stroke-linecap="round" stroke-linejoin="round">'+
    '<path d="M14 0h-14v56h14"/><path d="M62 0h14v56h-14"/></g>'+
    '<g transform="translate(3.5,3.5)"><circle cx="22" cy="28" r="4" fill="#4a72d0"/>'+
    '<circle cx="38" cy="28" r="5.5" fill="#2a2560"/>'+
    '<circle cx="54" cy="28" r="4" fill="#4a72d0"/></g></svg><b>TraceLock</b></div>'+
    '<div class="aviso-impresion">Usa Imprimir y elige «Guardar como PDF». '+
    'Marca los gráficos de fondo si quieres conservar el sombreado de las tablas.</div>'+
    c+'</body></html>';
}

/* ---------- acciones ---------- */
/* ---------- bloques reutilizables para los informes personalizados ---------- */
const BLOQUES_DOC={
 ficha:'Ficha del incidente: referencia, entidad, TLP, fechas, estado y clasificación',
 clasificacion:'Clasificación en los tres marcos con sus justificaciones',
 cronologia:'Cronología reconstruida del ataque',
 evidencias:'Evidencias con su origen, adquisición, huella y responsable',
 custodia:'Historial de transferencias de las evidencias',
 iocs:'Todos los IOCs con rol, estado y justificación',
 'iocs-publicos':'Solo los IOCs de infraestructura externa',
 'iocs-privados':'Solo los IOCs del entorno interno y sistemas afectados',
 attack:'Técnicas MITRE ATT&CK observadas',
 hitos:'Todas las actuaciones con sus tiempos, resultado y pruebas gráficas',
 preguntas:'Preguntas del caso con su estado y respuesta',
 metricas:'Métricas de gestión del incidente',
 comprobaciones:'Comprobaciones de completitud del expediente',
 registro:'Registro de actividad completo, asiento a asiento',
 notificaciones:'Tabla de obligaciones de notificación',
};

function informesPropios(){
  try{ return JSON.parse(almacenamiento.getItem('tl-informes')||'[]'); }catch(e){ return []; }
}

function bloqueDoc(id,b,ctx){
  const {s,m,tabla,cab,sub,p}=ctx;
  const iocs=todosIocs(), mapa=new Map(iocs.map((i)=>[i.key,i]));
  const cl=clasificacionActual();
  const ap=ASIENTOS.find((a)=>a.tipo==='CASO_ABIERTO')||{datos:{}};
  const esPriv=(i)=>i.rol==='Sistema afectado'||i.rol==='Recurso legítimo del entorno'||
    (i.tipo==='ipv4'&&esPrivada(i.valor));
  switch(id){
   case 'ficha':
    b.push(tabla(['Campo','Valor'],[
      ['Referencia interna',ap.datos.nombre||(dirCaso?dirCaso.name:'—')],
      ['Entidad afectada',$('#cliente').value||'sin asignar'],
      ['Marcado TLP',ap.datos.tlp||'sin marcar'],
      ['Detección (UTC)',fmtUTC(ap.datos.deteccion||(ASIENTOS[0]||{}).ts)],
      ['Apertura del expediente (UTC)',fmtUTC((ASIENTOS[0]||{}).ts)],
      ['Peligrosidad',cl?cl.peligrosidad:'sin clasificar'],
      ['Impacto',cl?cl.impacto:'sin clasificar'],
      ['Sello del registro',s.cadena.integra?s.cadena.sello:'CADENA ROTA en el asiento '+s.cadena.en]]));
    break;
   case 'clasificacion':{
    const rs=clasifDe('CLASIFICACION_RSIT'), ns=clasifDe('CLASIFICACION_NIST');
    if(cl)b.push(tabla(['Concepto','Valor','Justificación'],[
      ['CCN-STIC 817',cl.clase+' · '+cl.tipoIncidente,''],
      ['Peligrosidad',cl.peligrosidad,cl.motivoPeligrosidad],
      ['Impacto',cl.impacto,cl.motivoImpacto]]));
    else b.push(p('El incidente no ha sido clasificado.'));
    if(rs)b.push(tabla(['RSIT','Ejemplo','Justificación'],[[rs.clase,rs.tipoIncidente,rs.motivo]]));
    if(ns)b.push(tabla(['Esquema CISA','Valor'],[['Vector',ns.vector],['Impacto funcional',ns.funcional],
      ['Impacto en la información',ns.informacion],['Recuperabilidad',ns.recuperacion]]));
    break;}
   case 'cronologia':
    b.push(s.cr.length?tabla(['Fecha','Hora','Huso','Hecho observado','Fuente'],
      crOrdenadas().map((c)=>[fmtFecha(c.fecha),c.hora||'—',c.zona,c.accion,c.fuente||'sin indicar']))
      :p('La cronología está vacía.'));
    break;
   case 'evidencias':
    b.push(s.ev.length?tabla(['Nº','Evidencia','Origen y método','Adquirida por / el','SHA-256','Responsable','Integridad'],
      s.ev.map((e)=>{const v=e.verif[e.verif.length-1];
        return [e.id,e.nombre+' ('+bytesTxt(e.bytes)+')',
          (e.origen||'sin indicar')+' · '+(e.metodo||'sin indicar'),
          (e.adquiridaPor||e.custodio)+' · '+(fmtUTC(e.adquiridaEl)||fmtUTC(e.ts)+' (alta)'),
          e.sha256,e.custodioActual||e.custodio,
          !v?'sin verificar':v.coincide?'verificada':'NO COINCIDE'];}))
      :p('No se ha incorporado ninguna evidencia.'));
    break;
   case 'custodia':{
    const tr=s.ev.flatMap((e)=>e.transferencias.map((t)=>[e.id,fmtUTC(t.ts),t.origen,t.destino,t.medio,t.motivo||'']));
    b.push(tr.length?tabla(['Evidencia','Fecha (UTC)','Entrega','Recibe','Medio','Motivo'],tr)
      :p('No se ha registrado ninguna transferencia.'));
    break;}
   case 'iocs': case 'iocs-publicos': case 'iocs-privados':{
    const lista=id==='iocs'?iocs:id==='iocs-privados'?iocs.filter(esPriv):iocs.filter((i)=>!esPriv(i));
    b.push(lista.length?tabla(['Tipo','IOC','Rol','Estado','Justificación','Procedencia'],
      lista.map((i)=>[i.tipo,i.valor,i.rol,i.estado,i.motivo||'sin valorar',
        i.evidencias.join(', ')||'añadido a mano']))
      :p('No se han recogido IOCs para este apartado.'));
    break;}
   case 'attack':{
    const tec=tecnicasCaso();
    b.push(tec.length?tabla(['Táctica','Técnica','Confianza','Evidencia','Qué se observó'],
      tec.map((t)=>[t.tacticaId+' '+t.tactica,t.tecnicaId+' '+t.tecnica,t.confianza,
        t.evidencia||'sin indicar',t.notas]))
      :p('No se han registrado técnicas ATT&CK.'));
    break;}
   case 'hitos':
    b.push(s.hi.length?tabla(['Id','Fase','Actuación','Responsable','Inicio (UTC)','Fin (UTC)','Estado','Resultado','Pruebas'],
      s.hi.map((h)=>[h.id,h.fase,h.hito,h.propietario,fmtUTC(h.inicio),fmtUTC(h.fin),h.estado,
        h.resultado||h.motivo||'',(h.pruebas||[]).map((x)=>'acciones/'+x.archivo).join('\n')||'—']))
      :p('No hay actuaciones registradas.'));
    break;
   case 'preguntas':
    b.push(s.pr.length?tabla(['Id','Pregunta','Dirigida a','Estado','Respuesta'],
      s.pr.map((q)=>[q.id,q.pregunta,q.dirigidaA||'—',q.estado,q.respuesta||'']))
      :p('No hay preguntas registradas.'));
    break;
   case 'metricas':
    b.push(tabla(['Métrica','Valor'],[
      ['Tiempo desde la apertura',humanizar(m.ahora-m.apertura)],
      ['Actuaciones terminadas',m.terminados.length+' de '+s.hi.length],
      ['Evidencias',s.ev.length+' ('+bytesTxt(m.bytes)+')'],
      ['IOCs',m.iocTotal+' ('+m.iocMal+' maliciosos)'],
      ['Preguntas sin responder',String(m.abiertas.length)],
      ['Asientos en el registro',String(ASIENTOS.length)]]));
    break;
   case 'comprobaciones':
    b.push(tabla(['Comprobación','Cumple','Detalle'],
      comprobaciones(m).map((c)=>[c.texto,c.ok===true?'Sí':c.ok===false?'No':'—',c.detalle||''])));
    break;
   case 'notificaciones':{
    const sg=cl?SEGUIMIENTO[cl.peligrosidad]:null;
    b.push(tabla(['Obligación o marco','¿Aplica?','Plazo','Fecha','Referencia'],[
      ['Notificación al CCN-CERT',sg?(sg.notificar?'Sí':'No'):'sin determinar',
        sg?sg.dias+' días para el cierre':'—','',''],
      ['Autoridad de control (RGPD art. 33)','','72 h','',''],
      ['Interesados (RGPD art. 34)','','sin dilación indebida','',''],
      ['CSIRT de referencia (NIS2 / ENS)','','24 h / 72 h / 1 mes','',''],
      ['Contractual con la entidad','','','','']]));
    break;}
   case 'registro':
    b.push(tabla(['#','Fecha (UTC)','Categoría','Acción','Ref.','Detalle','Analista'],
      filasTt().map((r)=>[String(r.seq),fmtUTC(r.ts),r.cat,r.accion,r.ref,r.detalle,r.actor])));
    break;
   default:
    b.push({k:'pendiente',t:'El informe personalizado hace referencia al bloque «'+id+
      '», que no existe. Revisa la plantilla en Ajustes.'});
  }
}

function docBloquesPropio(tipo,b,ctx){
  for(const sec of (tipo.secciones||[])){
    if(sec.titulo)b.push(sec.nivel===2?ctx.sub(sec.titulo):ctx.cab(sec.titulo));
    if(sec.texto)b.push(ctx.p(sec.texto));
    if(sec.pendiente)b.push({k:'pendiente',t:sec.pendiente});
    if(sec.bloque)bloqueDoc(sec.bloque,b,ctx);
  }
  return b;
}

const DOCS={
  custodia:{id:'custodia',titulo:'Acta de evidencias',fichero:'acta_evidencias'},
  iocs:{id:'iocs',titulo:'Relación de indicadores',fichero:'indicadores'},
  estado:{id:'estado',titulo:'Situación del caso',fichero:'situacion_caso'},
  final:{id:'final',titulo:'Informe de respuesta al incidente',fichero:'informe_respuesta'},
};

window.exportarDoc=function(cual,formato){
  if(!ASIENTOS.length){alert('Abre primero una carpeta de caso.');return;}
  const tipo=DOCS[cual]||informesPropios().find((x)=>x.id===cual);
  if(!tipo){alert('No se encuentra la plantilla de informe «'+cual+'».');return;}
  const bloques=docBloques(tipo);
  const caso=dirCaso?dirCaso.name:'caso';
  const nombre=tipo.fichero+'_'+caso;
  if(formato==='docx'){
    bajar(nombre+'.docx',bloquesADocx(bloques),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }else{
    const v=window.open('','_blank');
    if(!v){alert('El navegador ha bloqueado la ventana emergente. Permítela para generar el PDF.');return;}
    v.document.write(bloquesAHtml(bloques,tipo.titulo+' · '+caso));
    v.document.close();
    setTimeout(()=>{try{v.focus();v.print();}catch(e){}},350);
  }
};

function pintarExport(){
  const fichas=[
    ['custodia','Acta de evidencias','Relación de evidencias con huellas, datos de adquisición, responsable actual, transferencias y discrepancias con la huella de origen.'],
    ['iocs','Relación de indicadores','Observables extraídos y añadidos a mano, con su estado, la justificación de cada valoración y las consultas externas documentadas.'],
    ['estado','Situación del caso','Cifras del caso, hitos por fase con sus tiempos, preguntas y las comprobaciones de completitud del expediente.'],
    ['final','Informe de respuesta al incidente','Estructura propia basada en el ciclo de gestión de incidentes (NIST SP 800-61, ISO/IEC 27035, CCN-STIC 817): ocho capítulos y anexos. Lo que el expediente conoce se rellena solo; el resto lleva indicaciones de qué debe redactar el analista.'],
  ];
  for(const x of informesPropios())
    if(x&&x.id&&x.titulo)fichas.push([x.id,x.titulo,
      (x.descripcion||'Plantilla propia definida en Ajustes.')+' · '+
      (x.secciones||[]).length+' secciones']);
  $('#rejilla-export').innerHTML=fichas.map(([id,t,d])=>`<div class="tarjeta">
    <h3>${esc(t)}</h3>
    <p class="ayuda" style="margin-bottom:14px">${esc(d)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="primario" onclick="exportarDoc('${escJs(id)}','docx')">Word</button>
      <button class="secundario" onclick="exportarDoc('${escJs(id)}','pdf')">PDF</button>
    </div></div>`).join('');
}

