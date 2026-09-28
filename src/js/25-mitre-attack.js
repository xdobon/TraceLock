/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= MITRE ATT&CK ================= */
const TACTICAS=[
 ['TA0043','Reconnaissance','reconnaissance'],
 ['TA0042','Resource Development','resource-development'],
 ['TA0001','Initial Access','initial-access'],
 ['TA0002','Execution','execution'],
 ['TA0003','Persistence','persistence'],
 ['TA0004','Privilege Escalation','privilege-escalation'],
 ['TA0005','Defense Evasion','defense-evasion'],
 ['TA0006','Credential Access','credential-access'],
 ['TA0007','Discovery','discovery'],
 ['TA0008','Lateral Movement','lateral-movement'],
 ['TA0009','Collection','collection'],
 ['TA0011','Command and Control','command-and-control'],
 ['TA0010','Exfiltration','exfiltration'],
 ['TA0040','Impact','impact']];

const CONFIANZA_ATT=['Confirmada','Probable','Posible'];

let catalogoAtt=[];
try{catalogoAtt=JSON.parse(almacenamiento.getItem('tl-attack')||'[]');}catch(e){catalogoAtt=[];}

const tecnicasCaso=()=>{
  const m=new Map();
  for(const a of ASIENTOS){
    if(a.tipo==='ATTACK_TECNICA')m.set(a.datos.tecnicaId,Object.assign({},a.datos,{ts:a.ts,actor:a.actor}));
    if(a.tipo==='ATTACK_RETIRADA')m.delete(a.datos.tecnicaId);
  }
  return [...m.values()];
};

window.attImportar=()=>$('#att-fichero').click();

window.attProcesar=async(f)=>{
  try{
    const j=JSON.parse(await f.text());
    const objetos=j.objects||j;
    const salida=[];
    for(const o of objetos){
      if(o.type!=='attack-pattern'||o.x_mitre_deprecated||o.revoked)continue;
      const ref=(o.external_references||[]).find((r)=>r.source_name==='mitre-attack');
      if(!ref||!ref.external_id)continue;
      salida.push({id:ref.external_id,nombre:o.name,
        tacticas:(o.kill_chain_phases||[]).filter((k)=>k.kill_chain_name==='mitre-attack')
          .map((k)=>k.phase_name)});
    }
    if(!salida.length)throw new Error('El fichero no contiene técnicas de ATT&CK reconocibles.');
    salida.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
    catalogoAtt=salida;
    almacenamiento.setItem('tl-attack',JSON.stringify(salida));
    alert('Catálogo cargado: '+salida.length+' técnicas. Se conserva mientras esta pestaña siga abierta.');
    pintarAttack();
  }catch(e){alert('No se pudo leer el catálogo: '+e.message);}
};

window.attAnadir=async function(){
  if(!exigeCarpeta())return;
  const lista=catalogoAtt.map((t)=>t.id+' · '+t.nombre);
  const d=await pedir('Registrar técnica observada',[
    {id:'tecnica',etiqueta:'Técnica',requerido:true,clase:'mono',ancho:'grid-column:span 2',
     lista:lista.slice(0,900),pista:'T1566.001 · Spearphishing Attachment'},
    {id:'tactica',etiqueta:'Táctica',tipo:'select',requerido:true,
     opciones:TACTICAS.map((t)=>t[0]+' · '+t[1])},
    {id:'confianza',etiqueta:'Confianza',tipo:'select',requerido:true,opciones:CONFIANZA_ATT},
    {id:'evidencia',etiqueta:'Evidencia que la sostiene',
     lista:EST.ev.map((e)=>e.id+' · '+e.nombre),pista:'EV-0001 o la fuente concreta'},
    {id:'notas',etiqueta:'Qué se observó exactamente',tipo:'textarea',requerido:true,
     ancho:'grid-column:span 2',pista:'El hecho concreto, no la descripción genérica de la técnica'}],
    catalogoAtt.length
      ? 'Catálogo cargado con '+catalogoAtt.length+' técnicas: escribe el identificador o el nombre y autocompleta.'
      : 'No hay catálogo ATT&CK cargado, así que el campo es libre. Importa enterprise-attack.json desde el botón de arriba para tener el listado oficial y evitar identificadores inventados.');
  if(!d)return;
  const id=(d.tecnica.match(/^(T\d{4}(?:\.\d{3})?)/i)||[])[1]||d.tecnica.trim();
  const nom=d.tecnica.replace(/^T\d{4}(?:\.\d{3})?\s*·?\s*/i,'').trim();
  const tac=TACTICAS.find((t)=>d.tactica.startsWith(t[0]));
  await anotar('ATTACK_TECNICA',{tecnicaId:id.toUpperCase(),tecnica:nom||id,
    tacticaId:tac[0],tactica:tac[1],tacticaCorta:tac[2],
    confianza:d.confianza,evidencia:d.evidencia||'',notas:d.notas});
};

window.attQuitar=async(id)=>{
  const d=await pedir('Retirar técnica',[
    {id:'motivo',etiqueta:'Motivo',tipo:'textarea',requerido:true,ancho:'grid-column:span 2',
     pista:'Por qué se descarta: se atribuyó por error, la evidencia no la sostiene…'}],
    id+' — el asiento original permanece en el registro; se añade la retirada.');
  if(!d)return;
  await anotar('ATTACK_RETIRADA',{tecnicaId:id,motivo:d.motivo});
};

window.attCapa=()=>{
  const t=tecnicasCaso();
  if(!t.length){alert('No hay técnicas registradas.');return;}
  const capa={versions:{attack:'',navigator:'4.9.0',layer:'4.5'},
    name:'TraceLock · '+(dirCaso?dirCaso.name:'caso'),domain:'enterprise-attack',
    description:'Técnicas observadas y registradas en el caso. Generado por '+VERSION,
    techniques:t.map((x)=>({techniqueID:x.tecnicaId,tactic:x.tacticaCorta,
      score:x.confianza==='Confirmada'?100:x.confianza==='Probable'?60:30,
      color:'',comment:x.confianza+': '+x.notas,enabled:true,showSubtechniques:true})),
    gradient:{colors:['#ffc46b','#ff8095'],minValue:0,maxValue:100},
    legendItems:[{label:'Confirmada',color:'#ff8095'},{label:'Probable o posible',color:'#ffc46b'}]};
  bajar('capa_attack_'+(dirCaso?dirCaso.name:'caso')+'.json',JSON.stringify(capa,null,2),'application/json');
};

window.attCsv=()=>bajar('tecnicas_attack.csv',csv([
  ['Tactica ID','Tactica','Tecnica ID','Tecnica','Confianza','Evidencia','Observado','Registrado (UTC)','Analista'],
  ...tecnicasCaso().map((t)=>[t.tacticaId,t.tactica,t.tecnicaId,t.tecnica,t.confianza,
    t.evidencia,t.notas,fmtUTC(t.ts),t.actor])]),'text/csv');

function pintarAttack(){
  const tec=tecnicasCaso();
  const porTactica=TACTICAS.map(([id,nom,corto])=>
    ({id,nom,corto,lista:tec.filter((t)=>t.tacticaId===id)}));
  const clase=(c)=>c==='Confirmada'?'mal':c==='Probable'?'curso':'pend';

  let h=`<div class="tarjeta" style="margin-bottom:20px">
    <h3>Cobertura por táctica<span class="sep-4">·</span><span class="txt-suave">${tec.length} ${tec.length===1?'técnica registrada':'técnicas registradas'}</span></h3>
    <div class="att-matriz">`+
    porTactica.map((t)=>`<div class="att-col ${t.lista.length?'con':''}">
      <div class="att-cab"><b>${esc(t.nom)}</b><span class="mono">${esc(t.id)}</span></div>
      ${t.lista.length?t.lista.map((x)=>`<div class="att-tec est tag-sm ${clase(x.confianza)}"
        title="${esc(x.tecnica)} · ${esc(x.confianza)}">${esc(x.tecnicaId)}</div>`).join('')
        :'<div class="att-vacio">—</div>'}
    </div>`).join('')+
    `</div></div>`;

  h+=tec.length?`<div class="tarjeta"><h3>Técnicas registradas</h3>
    <table><thead><tr><th>Táctica</th><th>Técnica</th><th>Confianza</th><th>Evidencia</th>
    <th>Qué se observó</th><th></th></tr></thead><tbody>`+
    porTactica.filter((t)=>t.lista.length).flatMap((t)=>t.lista.map((x,i)=>`<tr>
      ${i===0?`<th rowspan="${t.lista.length}" style="vertical-align:top">${esc(t.nom)}
        <div class="sub mono">${esc(t.id)}</div></th>`:''}
      <td><span class="mono idcol">${esc(x.tecnicaId)}</span><div>${esc(x.tecnica)}</div></td>
      <td><span class="est ${clase(x.confianza)}">${esc(textoTag(x.confianza))}</span></td>
      <td class="sub">${esc(x.evidencia||'sin indicar')}</td>
      <td class="desenlace">${esc(x.notas)}</td>
      <td class="col-acciones"><button class="secundario btn-ico btn-lg" onclick="attQuitar('${escJs(x.tecnicaId)}')"
        aria-label="Retirar ${esc(x.tecnicaId)}" title="Retirar">${icono('close')}</button></td>
    </tr>`)).join('')+`</tbody></table></div>`
    :'<div class="vacio">Todavía no se ha registrado ninguna técnica.</div>';

  $('#attack').innerHTML=h;
  // El texto de apoyo con el estado del catálogo ya no está en la página; se deja la guarda por
  // si vuelve (el aviso al importar sigue diciendo cuántas técnicas se han cargado).
  if($('#att-catalogo'))$('#att-catalogo').textContent=catalogoAtt.length
    ? catalogoAtt.length+' técnicas en el catálogo local'
    : 'sin catálogo: los identificadores se escriben a mano';
}

