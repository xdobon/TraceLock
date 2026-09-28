/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= clasificación CCN-STIC 817 ================= */

/* Taxonomía: 9 clases y sus tipos, tal como figuran en la Tabla 1 de la guía.
   El nivel de peligrosidad sugerido se deduce de la tabla de criterios del
   apartado 6.3, que asocia amenaza y vector de ataque a cada nivel. Es una
   ayuda: el nivel definitivo lo fija el analista y debe justificarlo. */
const TAXONOMIA=[
 ['Código dañino',[['Virus','ALTO'],['Gusanos','ALTO'],['Troyanos','ALTO'],
   ['Spyware','MEDIO'],['Rootkit','MUY ALTO'],['Ransomware','MUY ALTO'],
   ['Herramienta de acceso remoto (RAT)','MUY ALTO']]],
 ['Disponibilidad',[['Denegación de servicio (DoS/DDoS)','ALTO'],
   ['Fallo de hardware o software','BAJO'],['Error humano','BAJO'],['Sabotaje','ALTO']]],
 ['Obtención de información',[['Identificación de activos y vulnerabilidades (escaneo)','MEDIO'],
   ['Sniffing','MEDIO'],['Ingeniería social','MEDIO'],['Phishing','MEDIO']]],
 ['Intrusiones',[['Compromiso de cuenta de usuario','ALTO'],
   ['Defacement (desfiguración)','MEDIO'],['Cross-Site Scripting (XSS)','ALTO'],
   ['Cross-Site Request Forgery (CSRF)','ALTO'],['Inyección SQL','ALTO'],
   ['Spear phishing','ALTO'],['Pharming','ALTO'],['Ataque de fuerza bruta','ALTO'],
   ['Inyección de ficheros remota','ALTO'],['Explotación de vulnerabilidad software','ALTO'],
   ['Explotación de vulnerabilidad hardware','ALTO'],['Acceso no autorizado a red','ALTO']]],
 ['Compromiso de la información',[['Acceso no autorizado a información','ALTO'],
   ['Modificación o borrado no autorizado de información','ALTO'],
   ['Publicación no autorizada de información','ALTO'],['Exfiltración de información','MUY ALTO']]],
 ['Fraude',[['Suplantación / spoofing','ALTO'],['Uso de recursos no autorizado','MEDIO'],
   ['Uso ilegítimo de credenciales','ALTO'],
   ['Violación de derechos de propiedad intelectual o industrial','BAJO']]],
 ['Contenido abusivo',[['Spam (correo basura)','BAJO'],
   ['Acoso, extorsión o mensajes ofensivos','BAJO'],
   ['Pederastia, racismo o apología de la violencia o el delito','BAJO']]],
 ['Política de seguridad',[['Abuso de privilegios por usuarios','BAJO'],
   ['Acceso a servicios no autorizados','BAJO'],['Sistema desactualizado','BAJO']]],
 ['Otros',[['Otros incidentes no incluidos en las clases anteriores','MEDIO']]],
];

const PELIGROSIDAD=['BAJO','MEDIO','ALTO','MUY ALTO','CRÍTICO'];
const IMPACTO=['I0 - IRRELEVANTE','I1 - BAJO','I2 - MEDIO','I3 - ALTO','I4 - MUY ALTO','I5 - CRÍTICO'];

/* Tabla 6: seguimiento por parte del CCN-CERT según el nivel de peligrosidad. */
const SEGUIMIENTO={
 'BAJO':{notificar:false,dias:15},
 'MEDIO':{notificar:false,dias:30},
 'ALTO':{notificar:true,dias:45},
 'MUY ALTO':{notificar:true,dias:90},
 'CRÍTICO':{notificar:true,dias:120}};

/* Criterios del apartado 6.3, reproducidos para consulta durante la valoración. */
const CRITERIOS_PELIGROSIDAD=[
 ['CRÍTICO','Ciberespionaje',
  'APT, campañas de código dañino, interrupción de servicios, compromiso de sistemas de control industrial',
  'Capacidad de exfiltrar información muy valiosa en cantidad considerable y en poco tiempo; capacidad de tomar el control de sistemas sensibles en cantidad y en poco tiempo'],
 ['MUY ALTO','Interrupción de servicios, exfiltración de datos o compromiso de los servicios',
  'Código dañino confirmado de alto impacto (RAT, troyano que envía datos, rootkit); ataques externos con éxito',
  'Capacidad de exfiltrar información valiosa en cantidad apreciable; capacidad de tomar el control de sistemas sensibles en cantidad considerable'],
 ['ALTO','Toma de control de sistemas, robo y publicación o venta de información sustraída, ciberdelito, suplantación',
  'Código dañino de impacto medio (virus, gusanos, troyanos); DoS o DDoS sobre servicios no esenciales; tráfico DNS con dominios de APT o campañas; accesos no autorizados, suplantación o sabotaje; XSS o inyección SQL; spear phishing o pharming',
  'Capacidad de exfiltrar información valiosa; capacidad de tomar el control de ciertos sistemas'],
 ['MEDIO','Logro o incremento significativo de capacidades ofensivas, desfiguración de páginas web, manipulación de información',
  'Descargas de archivos sospechosos; contactos con dominios o direcciones IP sospechosas; escáneres de activos y vulnerabilidades; código dañino de bajo impacto (adware, spyware); sniffing o ingeniería social',
  'Capacidad de exfiltrar un volumen apreciable de información; capacidad de tomar el control de algún sistema'],
 ['BAJO','Ataques a la imagen, menosprecio, errores y fallos',
  'Incumplimientos de política; spam sin adjuntos; software desactualizado; acoso, coacción o comentarios ofensivos; error humano o fallo de hardware o software',
  'Escasa capacidad de exfiltrar un volumen apreciable de información; nula o escasa capacidad de tomar el control de sistemas']];

const CRITERIOS_IMPACTO=[
 ['I0 - IRRELEVANTE','Sin impacto apreciable sobre el sistema. Sin daños reputacionales apreciables.'],
 ['I1 - BAJO','La categoría más alta de los sistemas afectados es BÁSICA. Se resuelve en menos de 1 jornada-persona. Daños reputacionales puntuales, sin eco mediático.'],
 ['I2 - MEDIO','La categoría más alta de los sistemas afectados es MEDIA. Afecta a más de 10 equipos con información de categoría BÁSICA. Se resuelve entre 1 y 10 jornadas-persona. Daños reputacionales apreciables, con eco mediático.'],
 ['I3 - ALTO','La categoría más alta de los sistemas afectados es ALTA. Afecta a más de 50 equipos de categoría BÁSICA o a más de 10 de categoría MEDIA. Se resuelve entre 10 y 20 jornadas-persona. Daños reputacionales de difícil reparación, con eco mediático y afectando a la reputación de terceros.'],
 ['I4 - MUY ALTO','Afecta a sistemas clasificados RESERVADO. Afecta a más de 100 equipos de categoría BÁSICA, más de 50 de MEDIA o más de 10 de ALTA. Se resuelve entre 20 y 50 jornadas-persona. Daños a la imagen del país. Afecta apreciablemente a actividades oficiales en el extranjero o a una infraestructura crítica.'],
 ['I5 - CRÍTICO','Afecta a sistemas clasificados SECRETO. Afecta a más de 100 equipos de categoría MEDIA, más de 50 de ALTA o más de 10 con información RESERVADO. Se resuelve en más de 50 jornadas-persona. Afecta apreciablemente a la seguridad nacional o gravemente a una infraestructura crítica.']];

const tipoPlano=(clase,tipo)=>clase+' · '+tipo;
const TIPOS_PLANOS=TAXONOMIA.flatMap(([c,ts])=>ts.map(([t,p])=>({etiqueta:tipoPlano(c,t),clase:c,tipo:t,sug:p})));

// Acepta las etiquetas actuales y las que guardaron versiones anteriores ("menos de 1 JP").
function rangoEsfuerzo(v){
  const t=String(v||'');
  if(/más de 50/.test(t))return '>50';
  if(/20 y 50/.test(t))return '20-50';
  if(/10 y 20/.test(t))return '10-20';
  if(/1 y 10/.test(t))return '1-10';
  return '<1';
}

function impactoSugerido(cat,equipos,jp){
  const n=parseInt(equipos,10)||0;
  jp=rangoEsfuerzo(jp);
  if(jp==='>50')return 'I5 - CRÍTICO';
  if(cat==='ALTA'&&n>50)return 'I5 - CRÍTICO';
  if(cat==='MEDIA'&&n>100)return 'I5 - CRÍTICO';
  if(jp==='20-50')return 'I4 - MUY ALTO';
  if(cat==='ALTA'&&n>10)return 'I4 - MUY ALTO';
  if(cat==='MEDIA'&&n>50)return 'I4 - MUY ALTO';
  if(cat==='BÁSICA'&&n>100)return 'I4 - MUY ALTO';
  if(jp==='10-20')return 'I3 - ALTO';
  if(cat==='ALTA')return 'I3 - ALTO';
  if(cat==='MEDIA'&&n>10)return 'I3 - ALTO';
  if(cat==='BÁSICA'&&n>50)return 'I3 - ALTO';
  if(jp==='1-10')return 'I2 - MEDIO';
  if(cat==='MEDIA')return 'I2 - MEDIO';
  if(cat==='BÁSICA'&&n>10)return 'I2 - MEDIO';
  if(cat==='BÁSICA')return 'I1 - BAJO';
  return 'I0 - IRRELEVANTE';
}

const clasificacionActual=()=>{
  for(let i=ASIENTOS.length-1;i>=0;i--)
    if(ASIENTOS[i].tipo==='CLASIFICACION_CCN')
      return Object.assign({},ASIENTOS[i].datos,{ts:ASIENTOS[i].ts,actor:ASIENTOS[i].actor});
  return null;
};
const historialClasificacion=()=>ASIENTOS.filter((a)=>a.tipo==='CLASIFICACION_CCN')
  .map((a)=>Object.assign({},a.datos,{ts:a.ts,actor:a.actor}));

window.clasificar=async function(){
  if(!exigeCarpeta())return;
  const previa=clasificacionActual();
  const uno=await pedir('Clasificar el incidente · paso 1 de 2',[
    {id:'tipo',etiqueta:'Tipo de ciberincidente (Tabla 1)',tipo:'select',requerido:true,
     opciones:TIPOS_PLANOS.map((t)=>t.etiqueta),
     valor:previa?tipoPlano(previa.clase,previa.tipoIncidente):TIPOS_PLANOS[0].etiqueta,ancho:'grid-column:span 2'},
    {id:'origen',etiqueta:'Origen de la amenaza',tipo:'select',
     opciones:['Externa','Interna','Sin determinar'],valor:previa?previa.origen:'Externa'},
    {id:'categoria',etiqueta:'Categoría ENS más alta afectada',tipo:'select',
     opciones:['Sin determinar','BÁSICA','MEDIA','ALTA'],valor:previa?previa.categoria:'Sin determinar'},
    {id:'equipos',etiqueta:'Equipos afectados',tipo:'number',valor:previa?previa.equipos:'0'},
    {id:'esfuerzo',etiqueta:'Esfuerzo estimado de resolución',tipo:'select',
     opciones:['menos de 1 jornada-persona','entre 1 y 10 jornadas-persona',
       'entre 10 y 20 jornadas-persona','entre 20 y 50 jornadas-persona','más de 50 jornadas-persona'],
     valor:previa?previa.esfuerzo:'menos de 1 jornada-persona'},
    {id:'dimensiones',etiqueta:'Dimensiones de seguridad afectadas',tipo:'checks',
     opciones:['Confidencialidad','Integridad','Disponibilidad','Autenticidad','Trazabilidad'],
     valor:previa?previa.dimensiones:'',ancho:'grid-column:span 2'}],
    'Una jornada-persona es el esfuerzo de una jornada de trabajo ininterrumpido de un trabajador medio: es la unidad que emplea la guía para graduar el impacto. Estos datos alimentan la sugerencia del paso siguiente.');
  if(!uno)return;

  const t=TIPOS_PLANOS.find((x)=>x.etiqueta===uno.tipo);
  const sugImpacto=impactoSugerido(uno.categoria,uno.equipos,uno.esfuerzo);
  const dos=await pedir('Clasificar el incidente · paso 2 de 2',[
    {id:'peligrosidad',etiqueta:'Nivel de peligrosidad',tipo:'select',requerido:true,
     opciones:PELIGROSIDAD,valor:previa?previa.peligrosidad:t.sug},
    {id:'motivoPeligrosidad',etiqueta:'Justificación de la peligrosidad',tipo:'textarea',requerido:true,
     valor:previa?previa.motivoPeligrosidad:'',ancho:'grid-column:span 2',
     pista:'Amenaza subyacente, vector y capacidad observada'},
    {id:'impacto',etiqueta:'Nivel de impacto',tipo:'select',requerido:true,
     opciones:IMPACTO,valor:previa?previa.impacto:sugImpacto},
    {id:'motivoImpacto',etiqueta:'Justificación del impacto',tipo:'textarea',requerido:true,
     valor:previa?previa.motivoImpacto:'',ancho:'grid-column:span 2',
     pista:'Sistemas afectados, degradación, esfuerzo y daño reputacional'}],
    'Sugerencias de la guía para lo indicado: peligrosidad '+t.sug+', impacto '+sugImpacto+
    '. Son orientativas y no contemplan criterios reputacionales, de seguridad nacional ni de infraestructura crítica: revísalas y justifica el nivel que asignes.');
  if(!dos)return;

  await anotar('CLASIFICACION_CCN',{clase:t.clase,tipoIncidente:t.tipo,
    peligrosidadSugerida:t.sug,peligrosidad:dos.peligrosidad,motivoPeligrosidad:dos.motivoPeligrosidad,
    impactoSugerido:sugImpacto,impacto:dos.impacto,motivoImpacto:dos.motivoImpacto,
    origen:uno.origen,categoria:uno.categoria,equipos:uno.equipos,esfuerzo:uno.esfuerzo,
    dimensiones:uno.dimensiones,revision:previa?'reclasificación':'clasificación inicial'});
};

function pintarClasificacion(){
  $('#marcos').innerHTML=MARCOS.map((m)=>
    // El punto de «clasificado» solo acompaña al marco seleccionado.
    `<button aria-pressed="${m.id===marcoActivo}" onclick="marcoIr('${escJs(m.id)}')"
      ${m.id===marcoActivo&&clasifDe(m.asiento)?'title="Clasificado"':''}>
      ${esc(m.nombre)}${m.id===marcoActivo&&clasifDe(m.asiento)?'<i class="punto" aria-hidden="true"></i>':''}</button>`).join('');
  const marco=MARCOS.find((m)=>m.id===marcoActivo);
  $('#marco-pie').textContent=marco.pie;
  // Mismo texto en los tres marcos: «Clasificar» si ese marco todavía no tiene clasificación,
  // «Reclasificar» si ya la tiene.
  const accion={ccn:'clasificar',rsit:'clasificarRsit',nist:'clasificarNist'}[marcoActivo];
  $('#marco-accion').innerHTML=accionesRapidas([{txt:clasifDe(marco.asiento)?'Reclasificar':'Clasificar',
    icono:'reclasificar',accion:accion+'()'}]);
  if(marcoActivo==='rsit'){$('#clasif').innerHTML=pintarMarcoRsit();return;}
  if(marcoActivo==='nist'){$('#clasif').innerHTML=pintarMarcoNist();return;}
  pintarClasifCcn();
}

function pintarClasifCcn(){
  const c=clasificacionActual();
  const cont=$('#clasif');
  if(!ASIENTOS.length){cont.innerHTML='<div class="vacio">Abre una carpeta de caso para clasificar el incidente.</div>';return;}

  let h='';
  if(!c){
    h+=`<div class="vacio" style="margin-bottom:20px">El incidente no está clasificado.
      Sin clasificación no se puede determinar si existe obligación de notificar ni el plazo de cierre.</div>`;
  }else{
    const s=SEGUIMIENTO[c.peligrosidad];
    const ap=ASIENTOS.find((a)=>a.tipo==='CASO_ABIERTO');
    const deteccion=(ap&&ap.datos&&ap.datos.deteccion)||ASIENTOS[0].ts;
    const limite=new Date(new Date(deteccion).getTime()+s.dias*DIA);
    const quedan=Math.ceil((limite-Date.now())/DIA);
    h+=`<div class="kpis">
      <div class="kpi ${['ALTO','MUY ALTO','CRÍTICO'].includes(c.peligrosidad)?'alerta':''}">
        <div class="et">Peligrosidad</div><div class="num chico">${esc(c.peligrosidad)}</div>
        <div class="pie">${c.provisional?'PROVISIONAL · pendiente de justificar'
        :'la guía sugería '+esc(c.peligrosidadSugerida)}</div></div>
      <div class="kpi ${/I[45]/.test(c.impacto)?'alerta':/I3/.test(c.impacto)?'atencion':''}">
        <div class="et">Impacto</div><div class="num chico">${esc(c.impacto)}</div>
        <div class="pie">la guía sugería ${esc(c.impactoSugerido)}</div></div>
      <div class="kpi ${s.notificar?'atencion':''}">
        <div class="et">Notificación al CCN-CERT</div>
        <div class="num chico">${s.notificar?'Obligatoria':'No obligatoria'}</div>
        <div class="pie">${s.notificar?'canal LUCIA':'según la Tabla 6 de la guía'}</div></div>
      <div class="kpi ${quedan<0?'alerta':quedan<7?'atencion':''}">
        <div class="et">Plazo de cierre</div><div class="num chico">${s.dias} días</div>
        <div class="pie">${quedan<0?'vencido hace '+(-quedan)+' días':'quedan '+quedan+' días'} · límite ${fmtUTC(limite.toISOString()).slice(0,10)}</div></div>
    </div>

    <div class="rejilla">
      <div class="tarjeta"><h3>Clasificación vigente</h3>
        <table><tbody>
        ${[['Clase',c.clase],['Tipo',c.tipoIncidente],['Origen de la amenaza',c.origen],
           ['Categoría ENS afectada',c.categoria],['Equipos afectados',c.equipos],
           ['Esfuerzo de resolución',c.esfuerzo],
           ['Dimensiones afectadas',c.dimensiones||'sin indicar'],
           ['Clasificado por',c.actor+' · '+fmtUTC(c.ts)]]
          .map((f)=>`<tr><th style="width:190px">${esc(f[0])}</th><td>${esc(f[1])}</td></tr>`).join('')}
        </tbody></table></div>
      <div class="tarjeta"><h3>Justificaciones</h3>
        <div class="desenlace"><span class="etiqueta suave">peligrosidad</span>${esc(c.motivoPeligrosidad)}</div>
        <div class="desenlace" style="margin-top:32px"><span class="etiqueta suave">impacto</span>${esc(c.motivoImpacto)}</div>
      </div>
    </div>`;

    const hist=historialClasificacion();
    if(hist.length>1){
      const colorPel=(p)=>['ALTO','MUY ALTO','CRÍTICO'].includes(p)?'txt-error':p==='MEDIO'?'txt-aviso':'txt-neutro';
      h+=`<div class="tarjeta" style="margin-bottom:20px"><h3 class="con-tip">Historial de clasificación
        ${ayudaTip('Cada reclasificación se añade al registro; la anterior no se sustituye. El nivel de peligrosidad que se comunica al cerrar es el último.')}</h3>
        <table><thead><tr><th>Fecha (UTC)</th><th>Peligrosidad</th><th>Impacto</th>
        <th>Tipo</th><th>Analista</th></tr></thead><tbody>`+
        hist.slice().reverse().map((x)=>`<tr><td class="mono">${fmtUTC(x.ts)}</td>
          <td class="${colorPel(x.peligrosidad)}">${esc(x.peligrosidad)}</td><td>${esc(x.impacto)}</td>
          <td class="sub">${esc(x.tipoIncidente)}</td><td class="sub">${esc(x.actor)}</td></tr>`).join('')+
        `</tbody></table></div>`;
    }
  }

  h+=`<div class="tarjeta" style="margin-bottom:20px"><h3>Criterios de peligrosidad · apartado 6.3</h3>
    <table><thead><tr><th>Nivel</th><th>Amenaza subyacente habitual</th><th>Vector de ataque</th>
    <th>Características potenciales</th></tr></thead><tbody>`+
    CRITERIOS_PELIGROSIDAD.map(([n,a,v,ca])=>`<tr${c&&c.peligrosidad===n?' class="fila-activa"':''}>
      <td><span class="est ${n==='BAJO'?'pend':n==='MEDIO'?'curso':'mal'}">${esc(textoTag(n))}</span></td>
      <td class="desenlace">${esc(a)}</td><td class="desenlace">${esc(v)}</td>
      <td class="desenlace">${esc(ca)}</td></tr>`).join('')+`</tbody></table></div>

  <div class="tarjeta" style="margin-bottom:20px"><h3>Criterios de impacto · apartado 6.3.2</h3>
    <table><thead><tr><th style="width:150px">Nivel</th><th>Criterios</th></tr></thead><tbody>`+
    CRITERIOS_IMPACTO.map(([n,d])=>`<tr${c&&c.impacto===n?' class="fila-activa"':''}>
      <td><span class="est ${/I0|I1/.test(n)?'pend':/I2|I3/.test(n)?'curso':'mal'}">${esc(textoTag(n))}</span></td>
      <td class="desenlace">${esc(d)}</td></tr>`).join('')+`</tbody></table></div>

  <div class="tarjeta"><h3>Seguimiento por el CCN-CERT · Tabla 6</h3>
    <table><thead><tr><th>Peligrosidad</th><th>Notificación obligatoria</th>
    <th>Plazo de cierre</th></tr></thead><tbody>`+
    PELIGROSIDAD.map((n)=>`<tr${c&&c.peligrosidad===n?' class="fila-activa"':''}>
      <td>${esc(n)}</td><td>${SEGUIMIENTO[n].notificar?'Sí':'No'}</td>
      <td class="mono">${SEGUIMIENTO[n].dias} días naturales</td></tr>`).join('')+`</tbody></table>
    <p class="ayuda" style="margin:12px 0 0">Los plazos se cuentan en días naturales. El plazo que se
      muestra arriba cuenta desde la fecha de detección indicada al crear el caso; si el caso se abrió
      sin ella, cuenta desde el primer asiento del registro. La obligación
      de notificar aplica a las entidades del ámbito del ENS y se canaliza por LUCIA; las entidades
      privadas fuera del ENS se dirigen a INCIBE-CERT.</p></div>`;

  cont.innerHTML=h;
}

