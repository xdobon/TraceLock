/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= repositorio de indicadores ================= */
const claveIoc=(tipo,valor)=>tipo+'|'+String(valor).toLowerCase();
const ESTADOS_IOC=['Pendiente','Benigno','Sospechoso','Malicioso'];
const ROLES_IOC=['Sin determinar','Activo legítimo','Sistema afectado','Indicador de ataque'];

/* vínculos entre artefactos: unos describen el ataque, otros el entorno normal de la entidad.
   Los de contexto sirven para entender qué es cada cosa y qué se conecta con qué aunque no
   haya nada malicioso de por medio. */
const RELACIONES_IOC=[
 {id:'compromete',n:'ha comprometido',ataque:true},
 {id:'comunica',n:'se comunica con',ataque:true},
 {id:'entrega',n:'ha entregado',ataque:true},
 {id:'usa',n:'usa o tiene asignado',ataque:false},
 {id:'pertenece',n:'pertenece a',ataque:false},
 {id:'conecta',n:'se conecta a',ataque:false},
 {id:'aloja',n:'aloja',ataque:false},
 {id:'resuelve',n:'resuelve a',ataque:false},
 {id:'autentica',n:'se autentica en',ataque:false},
 {id:'gestiona',n:'administra',ataque:false}];
const RELACION=(id)=>RELACIONES_IOC.find((r)=>r.id===id)||{id,n:id,ataque:false};

function vinculosIoc(){
  const v=new Map();
  for(const a of ASIENTOS){
    const d=a.datos||{};
    if(a.tipo!=='IOC_VINCULO')continue;
    if(d.anulado)v.delete(d.vid);
    else v.set(d.vid,{vid:d.vid,de:d.de,a:d.a,rel:d.rel,nota:d.nota||'',actor:a.actor,ts:a.ts});
  }
  return [...v.values()];
}

function todosIocs(){
  const mapa=new Map();
  const meter=(tipo,valor,evidencia,contexto)=>{
    if(!valor)return;
    const k=claveIoc(tipo,valor);
    if(!mapa.has(k))mapa.set(k,{key:k,tipo,valor,evidencias:new Set(),contextos:new Set(),
      estado:'Pendiente',motivo:'',consultas:[],rol:'Sin determinar',relacionados:[],rolExplicito:false});
    const i=mapa.get(k);
    if(evidencia)i.evidencias.add(evidencia);
    if(contexto)i.contextos.add(contexto);
  };
  for(const a of ASIENTOS){
    const d=a.datos||{};
    if(a.tipo==='EVIDENCIA_ANALIZADA'&&Array.isArray(d.iocs))
      d.iocs.forEach((x)=>meter(x.t,x.v,d.id,x.c));
    if(a.tipo==='IOC_MANUAL')meter(d.tipo,d.valor,d.evidencia||null,d.contexto||'añadido a mano');
  }
  for(const a of ASIENTOS){
    const d=a.datos||{};
    if(a.tipo==='IOC_ESTADO'&&mapa.has(d.key))
      Object.assign(mapa.get(d.key),{estado:d.estado,motivo:d.motivo,valoradoPor:a.actor,valoradoEl:a.ts});
    if(a.tipo==='IOC_ROL'&&mapa.has(d.key))
      Object.assign(mapa.get(d.key),{rol:d.rol,relacionados:d.relacionados||[],
        rolPor:a.actor,rolEl:a.ts,rolExplicito:true});
    if(a.tipo==='IOC_CONSULTA'&&mapa.has(d.key))
      mapa.get(d.key).consultas.push({...d,ts:a.ts,actor:a.actor});
  }
  // un IOC valorado como malicioso es, por defecto, un indicador de ataque: el rol se deriva
  // del estado salvo que el analista lo haya fijado a mano (p. ej. un equipo interno comprometido)
  const vin=vinculosIoc();
  return [...mapa.values()].map((i)=>{
    const salientes=vin.filter((v)=>v.de===i.key).map((v)=>({...v,dir:'sale',otro:v.a}));
    const entrantes=vin.filter((v)=>v.a===i.key).map((v)=>({...v,dir:'entra',otro:v.de}));
    const legado=(i.relacionados||[]).map((valor)=>({rel:'compromete',dir:'entra',legado:true,valor}));
    return {...i,evidencias:[...i.evidencias],contextos:[...i.contextos],
      rol:(!i.rolExplicito&&i.estado==='Malicioso')?'Indicador de ataque':i.rol,
      rolAuto:(!i.rolExplicito&&i.estado==='Malicioso'),
      vinculos:[...salientes,...entrantes],vinculosLegado:legado};
  });
}

/* valores de los indicadores que han comprometido a este artefacto */
function comprometidoPor(i,todos){
  const porKey=new Map((todos||[]).map((x)=>[x.key,x.valor]));
  const nuevos=i.vinculos.filter((v)=>v.dir==='entra'&&RELACION(v.rel).ataque)
    .map((v)=>porKey.get(v.otro)).filter(Boolean);
  return [...new Set([...(i.relacionados||[]),...nuevos])];
}

const CLASE_ROL_IOC={'Sistema afectado':'ok','Indicador de ataque':'mal','Activo legítimo':'info','Sin determinar':'pend'};

function pintarIocs(){
  const todos=todosIocs();
  const q=($('#ioc-buscar').value||'').trim().toLowerCase();
  const est=$('#ioc-estado').value;
  let filas=todos.filter((i)=>(!est||i.estado===est)&&
    (!q||(i.valor+' '+i.tipo+' '+i.motivo+' '+i.evidencias.join(' ')).toLowerCase().includes(q)));
  $('#ioc-cuenta').textContent=filas.length+' de '+todos.length+' IOCs';
  if(!todos.length){
    $('#tabla-ioc').innerHTML='<div class="vacio">Todavía no hay IOCs. Se recogen solos al '+
      'analizar un correo, o puedes añadirlos a mano.</div>';return;}
  if(!filas.length){$('#tabla-ioc').innerHTML='<div class="vacio">Ningún IOC coincide con el filtro.</div>';return;}
  const orden={'Malicioso':0,'Sospechoso':1,'Pendiente':2,'Benigno':3};
  filas.sort((a,b)=>(orden[a.estado]-orden[b.estado])||a.tipo.localeCompare(b.tipo));
  const nombreDe=new Map(todos.map((x)=>[x.key,x.valor]));
  // Tabla reducida: vínculos, justificación y consultas solo en el detalle (modal) de cada IOC.
  $('#tabla-ioc').innerHTML=`<table><thead><tr><th>Tipo</th><th>IOC (neutralizado)</th>
    <th>Rol y valoración</th><th>Procedencia</th><th></th></tr></thead><tbody>`+
    filas.map((i)=>`<tr class="fila-clicable" tabindex="0" onclick="filaIoc(event,'${escJs(i.key)}')"
        onkeydown="if(event.key==='Enter'&&event.target===this)verIoc('${escJs(i.key)}')"
        aria-label="Ver el detalle de ${esc(defang(i.valor))}">
      <td class="sub" style="white-space:nowrap">${esc(i.tipo)}</td>
      <td class="mono">${esc(defang(i.valor))}</td>
      <td><span class="est ${CLASE_ROL_IOC[i.rol]}">${esc(textoTag(i.rol))}</span>
        <div class="sub">${i.estado==='Pendiente'?'sin valorar todavía'
          :i.rolAuto?'valorado como malicioso · rol automático'
          :'valorado como '+esc(i.estado.toLowerCase())}</div></td>
      <td class="sub">${i.evidencias.map(esc).join(', ')||'—'}
        ${i.contextos.length?`<div class="sub">${esc(i.contextos.join(' · '))}</div>`:''}</td>
      <td class="col-acciones">${menuAcciones('Acciones del IOC',accionesIoc(i))}</td></tr>`).join('')+'</tbody></table>';
  // Si el detalle de un IOC está abierto, se repinta con lo nuevo.
  if(panelAbierto('ioc')&&todos.some((x)=>x.key===PANEL_ITEM.id))verIoc(PANEL_ITEM.id);
}

const accionesIoc=(i)=>[
  ['Valorar',`valorarIoc('${escJs(i.key)}')`],
  ['Rol',`marcarRolIoc('${escJs(i.key)}')`],
  ['Vincular',`vincularIoc('${escJs(i.key)}')`],
  ['Consultar',`consultarIoc('${escJs(i.key)}')`],
  ['Documentar',`documentarIoc('${escJs(i.key)}')`]];

/* ---------- detalle de un IOC (modal) ----------
   Todo lo que ya no cabe en la tabla: vínculos (con el botón de quitar), justificación y
   consultas. Abajo, «Editar» (valoración y rol en un solo diálogo) y el mismo menú de la tabla. */
window.filaIoc=(e,key)=>{
  if(e.target.closest('button,a,summary,input,select,textarea'))return;
  verIoc(key);
};
window.verIoc=(key)=>{
  const todos=todosIocs(), i=todos.find((x)=>x.key===key);if(!i)return;
  $('#panel-cuerpo').innerHTML=`<div class="panel-cab">
      <div><div class="sub">${esc(i.tipo)}</div><h2 class="mono ioc-titulo">${esc(defang(i.valor))}</h2></div>
    </div>
    <div class="ioc-detalle">${fichaIocDl(i,todos)}</div>
    <div class="panel-pie-propio">
      <button class="secundario" onclick="editarIoc('${escJs(i.key)}')">Editar</button>
      ${menuAcciones('Acciones del IOC',accionesIoc(i))}
    </div>`;
  abrirPanelPropio('ioc',key,'IOC '+defang(i.valor));
};

/* Editar un IOC: su valoración (estado y justificación) y su rol, a la vez. Solo se anota lo que
   cambia, con los mismos asientos que «Valorar» y «Rol». */
window.editarIoc=async function(key){
  if(!exigeCarpeta())return;
  const i=iocPorClave(key);if(!i)return;
  const d=await pedir('Editar IOC',[
    {id:'estado',etiqueta:'Estado',tipo:'select',opciones:ESTADOS_IOC,valor:i.estado,requerido:true},
    {id:'rol',etiqueta:'Rol',tipo:'select',opciones:ROLES_IOC,valor:i.rol,requerido:true},
    {id:'motivo',etiqueta:'Justificación y fuente',tipo:'textarea',valor:i.motivo,requerido:true}],
    defang(i.valor)+' — la justificación es obligatoria: una valoración sin motivo no es defendible en el informe.');
  if(!d)return;
  if(d.estado!==i.estado||d.motivo!==i.motivo)
    await anotar('IOC_ESTADO',{key,valor:i.valor,tipo:i.tipo,estado:d.estado,motivo:d.motivo});
  if(d.rol!==i.rol)
    await anotar('IOC_ROL',{key,valor:i.valor,tipo:i.tipo,rol:d.rol,relacionados:i.relacionados||[]});
};

const iocPorClave=(k)=>todosIocs().find((i)=>i.key===k);

/* ---------- conmutador Tabla / Grafo ----------
   El grafo de relaciones vive dentro de IOCs. Cada vista tiene sus propios mandos: la tabla, el
   buscador de texto y el filtro de estado; el grafo, el buscador que resalta y centra un IOC. */
function fijarVistaIoc(v){
  ioVista=v;
  $('#io-v-tabla').ariaPressed=String(v==='tabla');$('#io-v-grafo').ariaPressed=String(v==='grafo');
  $('#io-mandos-tabla').classList.toggle('oculto',v!=='tabla');
  $('#io-mandos-grafo').classList.toggle('oculto',v!=='grafo');
  $('#tabla-ioc').classList.toggle('oculto',v!=='tabla');
  $('#grafo').classList.toggle('oculto',v!=='grafo');
  if(v==='grafo')pintarGrafo();else cerrarFichaGrafo();
}
$('#io-v-tabla').onclick=()=>fijarVistaIoc('tabla');
$('#io-v-grafo').onclick=()=>fijarVistaIoc('grafo');

/* Ficha de un IOC: para el grafo (fichaIocHtml, con tipo y valor arriba) y para la modal de
   detalle (fichaIocDl, solo los datos). */
function fichaIocHtml(i,todos){
  return `<div class="g-ficha-cab"><svg class="g-ficha-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconoDe(i.tipo)}</svg>
    <div><div class="g-ficha-tipo">${esc(i.tipo)}</div>
    <div class="g-ficha-valor">${esc(defang(i.valor))}</div></div></div>`+fichaIocDl(i,todos);
}
function fichaIocDl(i,todos){
  const nombreDe=new Map(todos.map((x)=>[x.key,x.valor]));
  const vin=(i.vinculosLegado.map((v)=>`<div>← ha comprometido · ${esc(defang(v.valor))}</div>`).join('')+
    i.vinculos.map((v)=>{const r=RELACION(v.rel), otro=nombreDe.get(v.otro)||v.otro;
      return `<div class="ioc-vin${r.ataque?' ataque':''}">${v.dir==='sale'?'→':'←'} ${esc(r.n)} · ${esc(defang(otro))}
        ${v.nota?`<div class="sub">${esc(v.nota)}</div>`:''}
        <button class="secundario btn-ico btn-xs" onclick="quitarVinculo('${escJs(v.vid)}')"
          title="Quitar este vínculo" aria-label="Quitar este vínculo">${icono('close')}</button></div>`;}).join(''))||'<span class="sub">sin vínculos</span>';
  return `<dl>
      <dt>Rol</dt><dd><span class="est ${CLASE_ROL_IOC[i.rol]}">${esc(textoTag(i.rol))}</span>
        <div class="sub">${i.estado==='Pendiente'?'sin valorar todavía'
          :i.rolAuto?'valorado como malicioso · rol automático':'valorado como '+esc(i.estado.toLowerCase())}</div></dd>
      <dt>Vínculos</dt><dd>${vin}</dd>
      <dt>Justificación</dt><dd>${i.motivo?esc(i.motivo)+
        `<div class="sub">${esc(i.valoradoPor||'')} · ${fmtUTC(i.valoradoEl)}</div>`:'<span class="sub">sin valorar</span>'}</dd>
      <dt>Procedencia</dt><dd>${i.evidencias.map(esc).join(', ')||'—'}
        ${i.contextos.length?`<div class="sub">${esc(i.contextos.join(' · '))}</div>`:''}</dd>
      <dt>Consultas</dt><dd>${i.consultas.length?i.consultas.map((c)=>
        `<div>${esc(c.proveedor)} · ${fmtUTC(c.consultado||c.ts).slice(0,10)}<br>${esc(c.resumen)}</div>`).join(''):'—'}</dd>
    </dl>`;
}

window.valorarIoc=async function(key){
  const i=iocPorClave(key);
  const d=await pedir('Valorar IOC',[
    {id:'estado',etiqueta:'Estado',tipo:'select',opciones:ESTADOS_IOC,valor:i.estado,requerido:true},
    {id:'motivo',etiqueta:'Justificación y fuente',tipo:'textarea',valor:i.motivo,requerido:true}],
    defang(i.valor)+' — la justificación es obligatoria: una valoración sin motivo no es defendible en el informe.');
  if(!d)return;
  await anotar('IOC_ESTADO',{key,valor:i.valor,tipo:i.tipo,estado:d.estado,motivo:d.motivo});
};

window.vincularIoc=async function(key){
  if(!exigeCarpeta())return;
  const todos=todosIocs();
  const i=todos.find((x)=>x.key===key);
  const otros=todos.filter((x)=>x.key!==key);
  if(!otros.length){alert('Hace falta al menos otro IOC para poder vincular.');return;}
  const d=await pedir('Vincular '+defang(i.valor),[
    {id:'rel',etiqueta:'Relación',tipo:'select',requerido:true,
     opciones:RELACIONES_IOC.map((r)=>r.n)},
    {id:'destino',etiqueta:'Con qué artefacto',tipo:'select',requerido:true,
     opciones:otros.map((x)=>x.tipo+' · '+defang(x.valor))},
    {id:'nota',etiqueta:'Aclaración',
     pista:'Por qué consta esta relación o de dónde se sabe'}],
    'La relación se lee desde este artefacto hacia el que elijas: «'+defang(i.valor)+' '+
    '(relación) destino». Las relaciones de ataque se dibujan en el grafo con flecha ámbar y las de '+
    'contexto en azul, para poder representar también la infraestructura legítima de la entidad.');
  if(!d)return;
  const rel=(RELACIONES_IOC.find((r)=>r.n===d.rel)||{}).id;
  const destino=otros[otros.map((x)=>x.tipo+' · '+defang(x.valor)).indexOf(d.destino)];
  if(!rel||!destino){alert('No se ha podido interpretar la relación elegida.');return;}
  await anotar('IOC_VINCULO',{vid:key+'>'+destino.key+'>'+rel,de:key,a:destino.key,rel,
    nota:d.nota||'',deValor:i.valor,aValor:destino.valor});
};

window.quitarVinculo=async function(vid){
  if(!exigeCarpeta())return;
  const v=vinculosIoc().find((x)=>x.vid===vid);
  if(!v)return;
  if(!confirm('¿Quitar el vínculo «'+RELACION(v.rel).n+'»? Queda constancia en el registro.'))return;
  await anotar('IOC_VINCULO',{vid,anulado:true,de:v.de,a:v.a,rel:v.rel});
};

window.marcarRolIoc=async function(key){
  const i=iocPorClave(key);
  const d=await pedir('Rol del artefacto',[
    {id:'rol',etiqueta:'Rol',tipo:'select',opciones:ROLES_IOC,valor:i.rol,requerido:true}],
    defang(i.valor)+' — «Activo legítimo» es para la infraestructura normal de la entidad (un usuario, '+
    'su equipo, un servidor interno) que aparece en el caso sin estar comprometida. Las relaciones entre '+
    'artefactos se crean aparte, con el botón «Vincular». '+
    (i.rolAuto?'Ahora mismo consta como indicador de ataque por estar valorado como malicioso; '+
      'lo que elijas aquí sustituye a ese automatismo.':''));
  if(!d)return;
  await anotar('IOC_ROL',{key,valor:i.valor,tipo:i.tipo,rol:d.rol,
    relacionados:i.relacionados||[]});
};

const b64url=(t)=>btoa(String.fromCharCode(...new TextEncoder().encode(t)))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

function enlacesIoc(i){
  const v=i.valor, e=encodeURIComponent(v), l=[];
  if(i.tipo==='sha256'||i.tipo==='md5')
    l.push(['VirusTotal · fichero','https://www.virustotal.com/gui/file/'+e]);
  if(i.tipo==='dominio'||i.tipo==='servidor'){
    l.push(['VirusTotal · dominio','https://www.virustotal.com/gui/domain/'+e]);
    l.push(['urlscan · análisis existentes','https://urlscan.io/search/#'+encodeURIComponent('domain:"'+v+'"')]);
  }
  if(i.tipo==='ipv4'){
    l.push(['VirusTotal · dirección IP','https://www.virustotal.com/gui/ip-address/'+e]);
    l.push(['AbuseIPDB','https://www.abuseipdb.com/check/'+e]);
    l.push(['urlscan · análisis existentes','https://urlscan.io/search/#'+encodeURIComponent('ip:"'+v+'"')]);
  }
  if(i.tipo==='url'){
    l.push(['VirusTotal · URL','https://www.virustotal.com/gui/url/'+b64url(v)]);
    l.push(['urlscan · análisis existentes','https://urlscan.io/search/#'+encodeURIComponent('page.url:"'+v+'"')]);
  }
  if(i.tipo==='correo')
    l.push(['VirusTotal · búsqueda','https://www.virustotal.com/gui/search/'+e]);
  return l;
}

window.consultarIoc=function(key){
  abrirPanelGenerico();
  const i=iocPorClave(key), l=enlacesIoc(i);
  $('#panel-cuerpo').innerHTML=`<div class="panel-cab">
      <div><h2>Consulta externa</h2><div class="sub">${esc(i.tipo)} · ${esc(i.key.split('|')[1])}</div></div>
    </div>
    <pre class="crudo" style="margin-top:14px">${esc(defang(i.valor))}</pre>
    <div class="aviso">Al abrir cualquiera de estos enlaces, el indicador se comunica al servicio elegido.
      La consola no envía la evidencia ni lanza ningún análisis nuevo. Una URL puede llevar identificadores
      de sesión, direcciones de correo o datos personales del afectado: revísala antes de consultarla, y
      recuerda que en urlscan un análisis puede quedar visible para terceros.</div>
    <h3>Enlaces de consulta</h3>
    ${l.length?`<div style="display:flex;flex-wrap:wrap;gap:9px">${l.map(([t,u])=>
      `<a class="secundario" style="text-decoration:none;display:inline-block" target="_blank"
        rel="noopener noreferrer" href="${esc(u)}">${esc(t)}</a>`).join('')}</div>`
      :'<div class="vacio">No hay una consulta directa configurada para este tipo de indicador.</div>'}
    <h3>Después de consultar</h3>
    <p class="ayuda">El resultado no se incorpora solo. Documéntalo para que quede en el registro con
      proveedor, fecha y analista, que es lo que hace trazable la valoración.</p>
    <button class="primario" onclick="document.querySelector('#panel').classList.add('oculto');documentarIoc('${escJs(key)}')">Documentar el resultado</button>`;
  $('#panel').classList.remove('oculto');
};

window.documentarIoc=async function(key){
  const i=iocPorClave(key);
  const ahora=new Date();
  const local=new Date(ahora.getTime()-ahora.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const d=await pedir('Documentar consulta externa',[
    {id:'proveedor',etiqueta:'Proveedor',tipo:'select',
     opciones:['VirusTotal','urlscan.io','AbuseIPDB','MISP','TheHive','Inteligencia interna','Otro'],requerido:true},
    {id:'consultado',etiqueta:'Fecha de la consulta',tipo:'datetime-local',valor:local,requerido:true},
    {id:'resumen',etiqueta:'Resultado y referencia',tipo:'textarea',requerido:true,
     pista:'Qué devolvió, con qué referencia o enlace permanente'}],
    defang(i.valor));
  if(!d)return;
  await anotar('IOC_CONSULTA',{key,valor:i.valor,tipo:i.tipo,proveedor:d.proveedor,
    consultado:new Date(d.consultado).toISOString(),resumen:d.resumen});
};

/* Alta manual de un IOC: formulario en tarjeta dentro de la página (antes, una modal). */
const IOC_TIPOS=['url','dominio','ipv4','correo','usuario','equipo','servidor','sha256','md5','adjunto','fichero','otro'];
$('#io-tipo').innerHTML='<option value="" disabled selected hidden>Selecciona</option>'+IOC_TIPOS.map((t)=>`<option>${t}</option>`).join('');
marcarObligatorio('io-tipo');marcarObligatorio('io-valor');marcarObligatorio('io-contexto');
window.iocManual=()=>{if(!exigeCarpeta())return;abrirForm('io-form','io-tipo');};
const limpiarIocForm=()=>{for(const i of ['io-tipo','io-valor','io-contexto','io-evidencia'])$('#'+i).value='';};
$('#io-cancelar').onclick=()=>{limpiarIocForm();cerrarForm('io-form');};
$('#io-add').onclick=async()=>{
  if(!exigeCarpeta())return;
  const tipo=$('#io-tipo').value, valor=$('#io-valor').value.trim(), contexto=$('#io-contexto').value.trim();
  if(!tipo){$('#io-tipo').focus();return;}
  if(!valor){$('#io-valor').focus();return;}
  if(!contexto){$('#io-contexto').focus();return;}
  await anotar('IOC_MANUAL',{tipo,valor,contexto,evidencia:$('#io-evidencia').value.trim()||null});
  limpiarIocForm();cerrarForm('io-form');
};

window.exportarIocs=()=>{
  const todos=todosIocs(), nom=new Map(todos.map((x)=>[x.key,x.valor]));
  const vinTxt=(i)=>[...i.vinculosLegado.map((v)=>'← ha comprometido: '+v.valor),
    ...i.vinculos.map((v)=>(v.dir==='sale'?'→ ':'← ')+RELACION(v.rel).n+': '+
      (nom.get(v.otro)||v.otro)+(v.nota?' ('+v.nota+')':''))].join(' | ');
  bajar('iocs.csv',csv([
    ['Tipo','IOC','Estado','Rol','Vinculos','Justificacion','Valorado por','Valorado el (UTC)','Procedencia','Contexto','Consultas'],
    ...todos.map((i)=>[i.tipo,i.valor,i.estado,i.rol,vinTxt(i),i.motivo||'',i.valoradoPor||'',
      fmtUTC(i.valoradoEl)||'',i.evidencias.join(' '),i.contextos.join(' · '),
      i.consultas.map((c)=>c.proveedor+' '+fmtUTC(c.consultado||c.ts)+': '+c.resumen).join(' | ')])]),'text/csv');
};

window.copiarIocsRepo=()=>{
  const t=todosIocs().filter((i)=>i.estado==='Malicioso'||i.estado==='Sospechoso')
    .map((i)=>i.tipo+'\t'+i.valor+'\t'+i.estado).join('\n');
  if(!t){alert('No hay indicadores valorados como sospechosos o maliciosos.');return;}
  navigator.clipboard.writeText(t).then(
    ()=>alert('Copiados los indicadores sospechosos y maliciosos, sin neutralizar.'),
    ()=>alert('El navegador ha bloqueado el portapapeles. Usa la exportación a CSV.'));
};

