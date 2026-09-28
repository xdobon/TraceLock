/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= resumen del caso ================= */
const HORA=3600000, DIA=86400000;
const humanizar=(ms)=>{
  if(ms==null)return '—';
  const s=Math.max(0,Math.round(ms/1000));
  if(s<60)return s+' s';
  if(s<3600)return Math.round(s/60)+' min';
  if(s<172800)return (s/3600).toFixed(s<36000?1:0)+' h';
  return Math.round(s/86400)+' d';
};
// Igual, pero con los días escritos («16 días»): para la tarjeta «Caso abierto hace».
const humanizarDias=(ms)=>{const t=humanizar(ms);return /^\d+ d$/.test(t)?t.replace(/ d$/,' días'):t;};

function metricas(){
  const ahora=Date.now();
  const ev=EST.ev,hi=EST.hi,pr=EST.pr,cr=EST.cr;
  const apertura=ASIENTOS.length?new Date(ASIENTOS[0].ts).getTime():null;
  // Última actividad del equipo: sin contar la verificación automática que se anota sola cada
  // vez que se abre el caso (con ella, la tarjeta marcaba siempre «0 s»).
  const ultimoHumano=[...ASIENTOS].reverse().find((a)=>a.tipo!=='VERIFICACION_AUTOMATICA');
  const ultima=ultimoHumano?new Date(ultimoHumano.ts).getTime():null;

  const integridad={ok:0,mal:0,sin:0};
  ev.forEach((e)=>{const v=e.verif[e.verif.length-1];
    if(!v)integridad.sin++; else if(v.coincide)integridad.ok++; else integridad.mal++;});

  const porEstado=(l)=>l.reduce((a,h)=>{a[h.estado]=(a[h.estado]||0)+1;return a;},{});
  const fases=[...new Set([...FASES(),...hi.map((h)=>h.fase)])]
    .map((f)=>({fase:f,hitos:hi.filter((h)=>h.fase===f)})).filter((x)=>x.hitos.length);
  const terminados=hi.filter((h)=>h.inicio&&h.fin);
  const durs=terminados.map((h)=>new Date(h.fin)-new Date(h.inicio));
  const enCurso=hi.filter((h)=>h.estado==='En proceso'||h.estado==='Bloqueado');
  // Abiertos = todo lo que no está terminado, incluidos los planificados que aún no han arrancado.
  const abiertosHi=hi.filter((h)=>h.estado!=='Terminado');
  const pendientesHi=hi.filter((h)=>h.estado==='Pendiente');

  const abiertas=pr.filter((p)=>p.estado==='Abierta')
    .map((p)=>({...p,edad:ahora-new Date(p.ts).getTime()}))
    .sort((a,b)=>b.edad-a.edad);

  const fechasCr=cr.map((c)=>c.fecha).filter(Boolean).sort();
  const crSinHuso=cr.filter((c)=>!c.zona||c.zona==='Sin determinar').length;
  const crSinFuente=cr.filter((c)=>!c.fuente).length;

  const clasif=clasificacionActual();
  const iocs=todosIocs();
  const iocTotal=iocs.length, iocMal=iocs.filter((i)=>i.estado==='Malicioso').length,
    iocPend=iocs.filter((i)=>i.estado==='Pendiente').length;
  const correos=ASIENTOS.filter((a)=>a.tipo==='EVIDENCIA_ANALIZADA');
  const indiciosCorreo=correos.reduce((a,x)=>a+(x.datos.indicios||0),0);

  return {ahora,apertura,ultima,ev,hi,pr,cr,integridad,fases,porEstado:porEstado(hi),
    terminados,durs,enCurso,abiertosHi,pendientesHi,abiertas,fechasCr,crSinHuso,crSinFuente,
    iocTotal,iocMal,iocPend,procedimientos:EST.procedimientos,clasif,
    bytes:ev.reduce((a,e)=>a+(e.bytes||0),0),
    sinContexto:ev.filter((e)=>!e.origen||!e.metodo).length,
    correos:correos.length,indiciosCorreo};
}

function rosco(m){
  const total=m.ev.length;
  if(!total)return '<div class="vacio">Sin evidencias todavía.</div>';
  // Color plano por tramo (antes, degradado): verificadas en el color de éxito.
  const trozos=[['ok',m.integridad.ok,'var(--feedback-info-text)'],['sin',m.integridad.sin,'var(--feedback-neutral-text)'],
    ['mal',m.integridad.mal,'var(--feedback-error-text)']].filter((t)=>t[1]>0);
  const R=78,C=2*Math.PI*R;let off=0,arcos='';
  trozos.forEach(([clave,n,color])=>{
    const largo=C*(n/total);
    arcos+=`<circle cx="100" cy="100" r="${R}" fill="none" stroke="${color}" stroke-width="13"
      stroke-dasharray="${largo.toFixed(2)} ${(C-largo).toFixed(2)}"
      stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 100 100)"
      stroke-linecap="butt"></circle>`;
    off+=largo;
  });
  const pct=Math.round(m.integridad.ok/total*100);
  return `<div class="rosco">
    <svg viewBox="0 0 200 200" width="288" height="288" role="img"
      aria-label="${m.integridad.ok} de ${total} evidencias verificadas">
      <circle cx="100" cy="100" r="78" fill="none" stroke="var(--chart-background-default)" stroke-width="13"></circle>
      ${arcos}
      <!-- cifra y texto forman un bloque centrado en el círculo (centro en y=100) -->
      <text class="centro" x="100" y="90" text-anchor="middle" dominant-baseline="central">${pct}%</text>
      <text class="centro-pie" x="100" y="122" text-anchor="middle" dominant-baseline="central">Verificadas</text></svg>
    <div class="leyenda" style="margin:0">
      <span><i style="background:var(--feedback-info-text)"></i>${m.integridad.ok} con huella coincidente</span>
      <span><i style="background:var(--feedback-neutral-text)"></i>${m.integridad.sin} sin verificar todavía</span>
      <span><i style="background:var(--feedback-error-text)"></i>${m.integridad.mal} con huella distinta</span>
    </div></div>`;
}

function comprobaciones(m){
  const c=[];
  const add=(ok,texto,detalle)=>c.push({ok,texto,detalle});
  add(!!m.clasif&&!m.clasif.provisional,'Incidente clasificado y justificado según CCN-STIC 817',
    !m.clasif?'sin clasificar'
      :m.clasif.provisional?'clasificación provisional de la apertura, sin justificar'
      :m.clasif.peligrosidad+' · '+m.clasif.impacto);
  if(!m.ev.length)add(null,'Sin evidencias registradas','No hay nada que sustente el informe');
  else{
    add(m.integridad.sin===0,'Todas las evidencias verificadas al menos una vez',
      m.integridad.sin?m.integridad.sin+(m.integridad.sin===1?' sin verificar':' sin verificar'):'');
    add(m.integridad.mal===0,'Ninguna evidencia con huella alterada',
      m.integridad.mal?m.integridad.mal+' no coinciden con el alta':'');
    const pr=EST.proteccion||{sinProteger:[],aplazamientos:[]};
    const sp=pr.sinProteger.filter((e)=>e.copiado).length, apl=(pr.aplazamientos||[]).length;
    add(sp===0,'Todas las evidencias protegidas en disco',
      [sp?sp+' sin proteger':'',apl?apl+(apl===1?' aplazamiento justificado':' aplazamientos justificados'):'']
        .filter(Boolean).join(' · '));
    const sinOrigen=m.ev.filter((e)=>!e.hashOrigen).length;
    const discrep=m.ev.filter((e)=>e.coincideOrigen===false).length;
    add(discrep===0,'Ninguna evidencia discrepa de la huella declarada en origen',
      discrep?discrep+(discrep===1?' discrepancia sin justificar':' discrepancias sin justificar'):'');
    add(sinOrigen===0,'Todas las evidencias con hash de origen contrastado',
      sinOrigen?sinOrigen+(sinOrigen===1?' sin hash de origen declarado':' sin hash de origen declarado'):'');
    const sinAdq=m.ev.filter((e)=>!e.adquiridaEl||!e.equipo).length;
    add(sinAdq===0,'Todas las evidencias con datos de adquisición completos',
      sinAdq?sinAdq+(sinAdq===1?' sin fecha de adquisición o sin equipo':' sin fecha de adquisición o sin equipo'):'');
    add(m.sinContexto===0,'Todas las evidencias con origen y método declarados',
      m.sinContexto?m.sinContexto+(m.sinContexto===1?' evidencia sin origen o sin método':' evidencias sin origen o sin método'):'');
  }
  add(m.abiertosHi.length===0,'Sin hitos abiertos',
    m.abiertosHi.length?[m.pendientesHi.length&&m.pendientesHi.length+' sin iniciar',
      m.enCurso.length&&m.enCurso.length+' en curso o bloqueados'].filter(Boolean).join(' · '):'');
  if(m.iocTotal)add(m.iocPend===0,'Todos los indicadores valorados',
    m.iocPend?m.iocPend+' sin valorar':'');
  add(tecnicasCaso().length>0,'Técnicas ATT&CK registradas',
    tecnicasCaso().length?tecnicasCaso().length+' técnicas':'ninguna, el informe no describirá el modo de operar');
  add(m.abiertas.length===0,'Sin preguntas pendientes de respuesta',
    m.abiertas.length?m.abiertas.length+(m.abiertas.length===1?' abierta, de hace ':' abiertas, la más antigua de hace ')+humanizar(m.abiertas[0].edad):'');
  if(!m.cr.length)add(false,'Cronología vacía','El informe necesita una línea temporal');
  else{
    add(m.crSinHuso===0,'Toda la cronología con huso horario definido',
      m.crSinHuso?m.crSinHuso+(m.crSinHuso===1?' entrada sin determinar':' entradas sin determinar'):'');
    add(m.crSinFuente===0,'Toda la cronología con la fuente indicada',
      m.crSinFuente?m.crSinFuente+(m.crSinFuente===1?' entrada sin fuente':' entradas sin fuente'):'');
  }
  const cad=EST.cadena;
  add(cad.integra,'Registro del caso íntegro',cad.integra?'':'roto en el asiento '+cad.en);
  if(ULTIMO_SELO_EXTERNO){
    const n=Number(ULTIMO_SELO_EXTERNO.events),ok=Number.isInteger(n)&&n>0&&cad.integra&&ASIENTOS.length>=n&&String(ASIENTOS[n-1]?.hash||'')===String(ULTIMO_SELO_EXTERNO.lastHash||'');
    add(ok,'Anclaje externo cargado y compatible con el registro actual',ok?(ASIENTOS.length===n?'sin actividad posterior al sello':'hay actividad posterior al sello'):'el sello no coincide con el registro actual');
  }else add(null,'Anclaje externo del expediente','Opcional: conserva el sello fuera de la carpeta para detectar reconstrucciones o truncados.');
  return c;
}

function pintarDb(){
  if(!ASIENTOS.length){
    $('#db').innerHTML='<div class="vacio">Abre una carpeta de caso para ver su resumen.</div>';return;}
  const m=metricas();
  const media=m.durs.length?m.durs.reduce((a,b)=>a+b,0)/m.durs.length:null;
  const parado=m.ultima?m.ahora-m.ultima:null;

  // Sin colores de estado en estas tarjetas: se descartan «alerta» y «atención».
  const kpi=(clase,et,num,pie,vista)=>`<div class="kpi ${clase.replace(/\b(alerta|atencion)\b/g,'').trim()}${vista?' clicable':''}"${vista?
    ` role="button" tabindex="0" onclick="irA('${escJs(vista)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();irA('${vista}')}"`:''}>
    <div class="et">${et}</div>
    <div class="num">${num}</div><div class="pie">${pie||''}</div></div>`;

  let h=`<div class="kpis">
    ${kpi('','Caso abierto hace',`<span class="reloj-db" data-desde="${m.apertura}">${humanizarDias(m.ahora-m.apertura)}</span>`,
      'primer asiento el '+fmtUTC(ASIENTOS[0].ts).slice(0,10))}
    ${kpi(parado>4*HORA?'atencion':'','Última actividad',humanizar(parado),
      parado>4*HORA?'el caso lleva rato parado':'registro al día','au')}
    ${kpi(m.clasif&&['ALTO','MUY ALTO','CRÍTICO'].includes(m.clasif.peligrosidad)?'alerta'
        :m.clasif?'':'atencion','Clasificación CCN 817',
      m.clasif?m.clasif.peligrosidad:'sin clasificar',
      m.clasif?'impacto '+m.clasif.impacto+(SEGUIMIENTO[m.clasif.peligrosidad].notificar
        ?' · notificación obligatoria':''):'sin ella no hay plazo ni obligación definidos','cl')}
    ${kpi('','Evidencias',m.ev.length,bytesTxt(m.bytes)+' almacenados','ev')}
    ${kpi(m.integridad.mal?'alerta':'','Integridad',
      !m.ev.length?'sin evidencias'
        :m.integridad.mal?m.integridad.mal+' alteradas'
        :m.integridad.sin?m.integridad.sin+' sin verificar':'100 % verificado',
      m.integridad.ok+(m.integridad.ok===1?' verificada de ':' verificadas de ')+m.ev.length,'ev')}
    ${/* Tarjeta neutra: el aviso va solo en los hitos sin iniciar, que son los pendientes. */
      kpi('','Hitos abiertos',m.abiertosHi.length,
      m.terminados.length+(m.terminados.length===1?' terminado de ':' terminados de ')+m.hi.length
      +(m.pendientesHi.length?`<span> · </span><span class="txt-aviso">${m.pendientesHi.length} sin iniciar</span>`:''),'hi')}
    ${kpi('','IOCs',m.iocTotal,
      m.iocTotal?(m.iocMal?`<span class="txt-error">${m.iocMal} ${m.iocMal===1?'malicioso':'maliciosos'}</span>`:'0 maliciosos')
        +' · '+m.iocPend+' sin valorar':'ninguno recogido','io')}
    ${kpi((m.abiertas.length?'atencion':'')+' solo-cifra','Preguntas sin respuesta',m.abiertas.length,
      m.abiertas.length?'la más antigua, '+humanizar(m.abiertas[0].edad):'ninguna pendiente','pr')}
  </div>`;

  h+='<div class="rejilla">';

  // clasificación
  h+=`<div class="tarjeta clicable" role="button" tabindex="0" onclick="irA('cl')"
    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();irA('cl')}"><h3>Clasificación CCN-STIC 817</h3>`;
  if(!m.clasif)h+='<div class="vacio">El incidente todavía no está clasificado.</div>';
  else{
    const sg=SEGUIMIENTO[m.clasif.peligrosidad];
    h+=`<table><tbody>`+
      [['Clase',m.clasif.clase],['Tipo',m.clasif.tipoIncidente],
       ['Peligrosidad',`<span class="est ${['ALTO','MUY ALTO','CRÍTICO'].includes(m.clasif.peligrosidad)?'mal':m.clasif.peligrosidad==='MEDIO'?'curso':'pend'}">${esc(textoTag(m.clasif.peligrosidad))}</span>`],
       ['Impacto',`<span class="est ${/I[45]/.test(m.clasif.impacto)?'mal':/I[23]/.test(m.clasif.impacto)?'curso':'pend'}">${esc(textoTag(m.clasif.impacto))}</span>`],
       ['Notificación al CCN-CERT',sg.notificar?'Obligatoria':'No obligatoria'],
       ['Plazo de cierre',sg.dias+' días naturales'],
       ['Dimensiones afectadas',esc(m.clasif.dimensiones||'sin indicar')]]
      .map((f)=>`<tr><th style="width:180px">${esc(f[0])}</th><td>${f[1]}</td></tr>`).join('')+
      `</tbody></table>`;
    if(m.clasif.provisional)h+=`<div class="aviso" style="margin-top:14px">Clasificación provisional
      asignada al abrir el caso. Los niveles son los que sugiere la guía y no están justificados:
      complétalos en la pestaña Clasificación antes de cerrar.</div>`;
  }
  h+='</div>';

  // hitos por fase
  h+=`<div class="tarjeta clicable" role="button" tabindex="0" onclick="irA('hi')"
    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();irA('hi')}"><h3>Hitos por fase</h3>`;
  if(!m.fases.length)h+='<div class="vacio">Todavía no hay hitos.</div>';
  else{
    for(const f of m.fases){
      const n=f.hitos.length;
      const cuenta=(e)=>f.hitos.filter((x)=>x.estado===e).length;
      const seg=(e)=>Array.from({length:cuenta(e)},()=>`<i class="${e.replace(' ','')}" title="${e}"></i>`).join('');
      h+=`<div class="barra-fase"><div class="cab"><b>${esc(f.fase)}</b>
        <span>${cuenta('Terminado')}/${n}</span></div>
        <div class="pista segmentos" role="img" aria-label="${cuenta('Terminado')} de ${n} hitos terminados">${seg('Terminado')}${seg('En proceso')}${seg('Bloqueado')}${seg('Pendiente')}</div></div>`;
    }
    h+=`<div class="leyenda suave">
      <span><i style="background:var(--feedback-info-text)"></i>Terminado</span>
      <span><i style="background:var(--feedback-warning-text)"></i>En proceso</span>
      <span><i style="background:var(--feedback-error-text)"></i>Bloqueado</span>
      <span><i style="background:var(--feedback-neutral-text)"></i>Pendiente</span></div>`;
    if(media!=null)h+=`<div class="pie-tarjeta suave">
      Duración media de un hito terminado: ${humanizar(media)} ·
      el más largo, ${humanizar(Math.max(...m.durs))}</div>`;
  }
  if(m.cr.length&&m.fechasCr.length)h+=`<div class="pie-tarjeta suave">
    La cronología del ataque cubre del ${fmtFecha(m.fechasCr[0])} al ${fmtFecha(m.fechasCr[m.fechasCr.length-1])}
    · ${m.cr.length} hechos${m.correos?' · '+m.correos+' correos analizados con '+m.indiciosCorreo+' indicios':''}</div>`;
  h+='</div>';

  // integridad
  h+=`<div class="tarjeta clicable" role="button" tabindex="0" onclick="irA('ev')"
    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();irA('ev')}"><h3>Integridad de las evidencias</h3>${rosco(m)}</div>`;

  // preguntas por antigüedad
  h+=`<div class="tarjeta clicable" role="button" tabindex="0" onclick="irA('pr')"
    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();irA('pr')}"><h3>Preguntas abiertas</h3>`;
  h+=m.abiertas.length?`<ul class="lista-db espaciada">${m.abiertas.slice(0,7).map((p)=>
    `<li><span class="tick warn">${icono('exclamation')}</span><span class="txt">${esc(p.pregunta)}
      <div class="sub">${esc(p.dirigidaA||'sin destinatario')}</div></span>
      <span class="antig">${humanizar(p.edad)}</span></li>`).join('')}</ul>`
    :'<div class="vacio">No queda ninguna pregunta sin responder.</div>';
  h+='</div>';

  h+='</div>';

  // comprobaciones de cierre: primero lo que falta y después lo que ya está, cada grupo con su título.
  const grupoCierre=(tit,l)=>l.length?`<div class="grupo-cierre"><div class="menu-grupo">${esc(tit)} · ${l.length}</div>
    <ul class="lista-db cierre">${l.map((x)=>`<li>
      <span class="tick ${x.ok===true?'si':x.ok===false?'no':'na'}">${
        x.ok===true?icono('check'):x.ok===false?icono('close'):''}</span>
      <span class="txt">${esc(x.texto)}${x.detalle?`<span class="sub">${esc(x.detalle)}</span>`:''}</span></li>`).join('')}
    </ul></div>`:'';
  const c=comprobaciones(m);
  const pendientes=c.filter((x)=>x.ok===false||x.ok===null).length;
  // Título (con su tooltip) fuera de la tarjeta; dentro, plegable, el recuento como título sm.
  h+=`<div class="bloque-titulado"><h3 class="titulo-fuera con-tip">Preparación para el cierre
    ${ayudaTip('Son comprobaciones de completitud del expediente, no una valoración del incidente. Que estén todas en verde no significa que el caso pueda cerrarse.')}</h3>
    <details class="tarjeta" open><summary>${c.length-pendientes} de ${c.length} completadas</summary>
    ${grupoCierre('Pendiente',c.filter((x)=>x.ok!==true))}${grupoCierre('Completado',c.filter((x)=>x.ok===true))}</details></div>`;

  // Cabecera: nombre del caso y entidad afectada, bajo el título.
  const ap=ASIENTOS.find((a)=>a.tipo==='CASO_ABIERTO');
  const cli=[...ASIENTOS].reverse().find((a)=>a.tipo==='CASO_CLIENTE');
  // El punto medio va en su propio span para darle 4 px más de aire a cada lado (.sep-punto).
  $('#db-sub').innerHTML=[ap&&ap.datos&&(ap.datos.nombre||ap.datos.caseId),
    cli&&cli.datos&&cli.datos.cliente].filter(Boolean).map((x)=>esc(x))
    .join('<span class="sep-punto"> · </span>');

  $('#db').innerHTML=h;
}

function textoAcerca(){
  return `<div class="ayuda acerca">
      <p><b>Versión.</b> ${esc(VERSION)} · esquema de expediente ${SCHEMA}. El nombre y la versión figuran en todos los documentos que
      exporta, para poder identificar con qué copia se generó cada expediente.</p>
      <p><b>Qué es.</b> Un fichero HTML autónomo para gestionar el expediente del incidente. Todo lo que ves
      se reconstruye leyendo <code>registro.jsonl</code> dentro de la carpeta del caso. No hay base de datos
      ni servicio backend detrás. Las evidencias incorporadas se separan en <code>originales/</code> y, cuando
      se necesita trabajar sobre ellas, en <code>trabajo/</code>.</p>
      <p><b>Cómo protege el registro.</b> Cada asiento incluye el hash SHA-256 del anterior y un esquema
      versionado. El registro permite detectar modificaciones; los truncados o reconstrucciones completas
      se contrastan con un sello externo que debe conservarse fuera de la carpeta del caso.</p>
      <p><b>Qué no hace.</b> No envía evidencias a ningún sitio ni guarda credenciales de servicios
      externos. Las consultas a VirusTotal, urlscan o AbuseIPDB son enlaces que abres tú, y sus
      resultados se incorporan a mano para conservar su procedencia. El correo se analiza con
      <code>DOMParser</code> sin insertarlo nunca en la página: no se ejecuta nada ni se cargan imágenes.</p>
      <p><b>Sus límites, que conviene tener presentes.</b> Las marcas de tiempo salen del reloj de este
      equipo y no las atestigua nadie. El nombre del analista es autodeclarado: no hay autenticación.
      El sello externo no es una firma de identidad ni un timestamp de tercera parte; es un anclaje de
      integridad que debe conservarse fuera del expediente. La separación entre original y copia de trabajo
      es lógica y documental: no sustituye un write blocker ni un almacenamiento inmutable. La herramienta
      registra quién tiene cada evidencia y la adquisición declarada, pero no convierte por sí sola cualquier fichero en
      una adquisición forense.</p>
      <p><b>Requisitos.</b> Chrome o Edge para escribir en una carpeta local; Firefox no implementa esa
      capacidad. La tipografía Manrope e Inter se cargan desde Google Fonts, que es la única petición
      externa que hace el fichero: sin conexión, cae a la fuente del sistema.</p>
      <p><b>En resumen.</b> Sirve como registro de trabajo riguroso y trazable. No sustituye al acta de
      adquisición ni constituye por sí solo prueba autónoma ante un tercero.</p>
      <p><b>Autoría.</b> Xavier Dobon.</p>
    </div>`;
}

