/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= estado derivado ================= */
function derivar(){
  const ev=new Map(),hi=new Map(),cr=[],pr=new Map();
  const procedimientos=[];
  let proteccion=null;
  const aplazamientos=[];
  let verifAuto=null;
  for(const a of ASIENTOS){
    const d=a.datos||{};
    switch(a.tipo){
      case 'EVIDENCIA_REGISTRADA': ev.set(d.id,Object.assign({},d,{ts:a.ts,seq:a.seq,verif:[],
        custodioActual:d.custodio,transferencias:[],mtimeRef:d.mtimeCopia??null})); break;
      case 'VERIFICACION_AUTOMATICA':{
        const fuera=new Set([...(d.discrepancias||[]),...(d.noLeidas||[])]);
        for(const e of ev.values()){
          if(!e.copiado||e.seq>d.hastaSeq||fuera.has(e.id))continue;
          e.verif.push({ts:a.ts,coincide:true,auto:true});
          if(d.mtimes&&d.mtimes[e.id]!=null)e.mtimeRef=d.mtimes[e.id];
        }
        verifAuto=Object.assign({ts:a.ts,actor:a.actor},d);
        break;}
      case 'EVIDENCIA_TRANSFERIDA':{const e=ev.get(d.id);
        if(e){e.transferencias.push({ts:a.ts,actor:a.actor,...d});e.custodioActual=d.destino;}
        break;}
      case 'EVIDENCIA_VERIFICADA':{const e=ev.get(d.id);
        if(e)e.verif.push({ts:a.ts,coincide:d.coincide,actual:d.sha256Actual});break;}
      case 'EVIDENCIA_TRABAJO_CREADO':{const e=ev.get(d.id);
        if(e){e.workingArchivo=d.archivo;e.workingHash=d.workingHash;e.workingBytes=d.bytes;}break;}
      case 'HITO_CREADO': hi.set(d.id,Object.assign({},d,{estado:d.iniciado?'En proceso':'Pendiente',
        inicio:d.iniciado?a.ts:null,seg:[],pruebas:[]})); break;
      case 'HITO_INICIADO':{const h=hi.get(d.id);if(h&&!h.inicio){h.inicio=a.ts;h.estado='En proceso';}break;}
      case 'HITO_BLOQUEADO':{const h=hi.get(d.id);
        if(h){h.estado='Bloqueado';h.motivo=d.motivo;h.pruebasBloqueo=d.pruebas||[];
          h.pruebas=(h.pruebas||[]).concat(d.pruebas||[]);}break;}
      case 'HITO_REANUDADO':{const h=hi.get(d.id);if(h){h.estado='En proceso';h.motivo=null;}break;}
      case 'HITO_FINALIZADO':{const h=hi.get(d.id);
        if(h&&h.estado!=='Terminado'){h.estado='Terminado';h.fin=a.ts;h.resultado=d.resultado;
          h.pruebasFin=d.pruebas||[];h.pruebas=(h.pruebas||[]).concat(d.pruebas||[]);}break;}
      case 'HITO_SEGUIMIENTO':{const h=hi.get(d.id);
        if(h){h.seg.push({ts:a.ts,actor:a.actor,texto:d.texto,pruebas:d.pruebas||[]});
          h.pruebas=(h.pruebas||[]).concat(d.pruebas||[]);}break;}
      case 'CRONO_ENTRADA': cr.push(Object.assign({},d,{ts:a.ts})); break;
      case 'CRONO_RECTIFICADA':{const c=cr.find((x)=>x.id===d.id);
        if(c)Object.assign(c,d,{rectificadaEl:a.ts,rectificadaPor:a.actor});break;}
      // Eliminar no borra nada del registro: el hecho sale de la cronología (y de lo que se
      // exporta) y pasa a «Hechos eliminados», con quién, cuándo y por qué.
      case 'CRONO_ELIMINADA':{const c=cr.find((x)=>x.id===d.id);
        if(c)c.eliminada={ts:a.ts,actor:a.actor,motivo:d.motivo||''};break;}
      case 'HITO_EDITADO':{const h=hi.get(d.id);
        if(h){for(const k of ['fase','hito','propietario','riesgo','notas'])if(d[k]!==undefined)h[k]=d[k];
          h.editadoEl=a.ts;h.editadoPor=a.actor;}break;}
      case 'HITO_ELIMINADO':{const h=hi.get(d.id);
        if(h)h.eliminado={ts:a.ts,actor:a.actor,motivo:d.motivo||''};break;}
      case 'PREGUNTA_EDITADA':{const p=pr.get(d.id);
        if(p){for(const k of ['pregunta','dirigidaA','respuesta'])if(d[k]!==undefined)p[k]=d[k];
          p.editadaEl=a.ts;p.editadaPor=a.actor;}break;}
      case 'PREGUNTA_ELIMINADA':{const p=pr.get(d.id);
        if(p)p.eliminada={ts:a.ts,actor:a.actor,motivo:d.motivo||''};break;}
      case 'PROCEDIMIENTO_APLICADO': procedimientos.push(d.nombre); break;
      case 'PREGUNTA_ABIERTA': pr.set(d.id,Object.assign({},d,{ts:a.ts,estado:'Abierta'})); break;
      case 'PREGUNTA_RESPONDIDA':{const p=pr.get(d.id);
        if(p){p.estado='Respondida';p.respuesta=d.respuesta;p.tsResp=a.ts;}break;}
      case 'EVIDENCIAS_PROTEGIDAS': proteccion={ts:a.ts,actor:a.actor,metodo:d.metodo,hastaSeq:d.hastaSeq}; break;
      // Aplazar no protege nada: las evidencias siguen pendientes; solo queda constancia del porqué.
      case 'PROTECCION_APLAZADA': aplazamientos.push({ts:a.ts,actor:a.actor,motivo:d.motivo,pendientes:d.pendientes||[]}); break;
    }
  }
  const evArr=[...ev.values()];
  const sinProteger=evArr.filter((e)=>!proteccion||e.seq>proteccion.hastaSeq);
  const hiTodos=[...hi.values()], prTodas=[...pr.values()];
  return{ev:evArr,hi:hiTodos.filter((h)=>!h.eliminado),cr:cr.filter((c)=>!c.eliminada),
    pr:prTodas.filter((p)=>!p.eliminada),crEliminadas:cr.filter((c)=>c.eliminada),
    hiEliminados:hiTodos.filter((h)=>h.eliminado),prEliminadas:prTodas.filter((p)=>p.eliminada),procedimientos,
    cadena:verificarCadena(),proteccion:{ultima:proteccion,sinProteger,aplazamientos},verifAuto};
}

const idNuevo=(pref,tipo)=>pref+String(ASIENTOS.filter((a)=>a.tipo===tipo).length+1).padStart(4,'0');

