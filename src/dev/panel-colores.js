/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= Panel de colores (solo en dist/tracelock-dev.html) =================
   Herramienta de diseño, no de la app: no entra en tracelock.html. Permite cambiar en directo
   cualquier color de src/colores/colores.json y ver el efecto en la interfaz real.
   - Va en un Shadow DOM con sus propios colores fijos: editar la paleta no lo hace ilegible.
   - Edita el modo noche. Aplica la paleta entera con una hoja propia (:root sin data-tema=dia),
     que gana a la del build.
   - Guarda en localStorage de este navegador; exporta e importa colores.json con el mismo formato
     que lee build.js, para llevar lo decidido al código.
   - Degradado solo donde el color se usa únicamente como fondo (lo calcula build.js).
   Recibe DEV_COLORES (el JSON) y DEV_USOS ({nombre:{props,veces}}) inyectados por build.js. */
(function(){
  'use strict';
  // Clave nueva: lo guardado antes no tenía modo día y taparía la base generada.
  const CLAVE='tracelock-dev-colores-v2';
  const ORIGINAL=JSON.parse(JSON.stringify(DEV_COLORES));
  let datos=JSON.parse(JSON.stringify(DEV_COLORES));
  try{const g=localStorage.getItem(CLAVE);if(g){const x=JSON.parse(g);if(x&&x.grupos)datos=x;}}catch(e){}

  const todos=()=>datos.grupos.flatMap((g)=>g.colores);
  const orig=(n)=>ORIGINAL.grupos.flatMap((g)=>g.colores).find((c)=>c.nombre===n);
  const hex8=([h,a])=>(a>=100?h:h+Math.round(a*2.55).toString(16).padStart(2,'0')).toUpperCase();
  const valor=(c)=>c.degradado?`linear-gradient(${c.angulo??135}deg, ${c.degradado.map(hex8).join(', ')})`:hex8(c.color);
  const primero=(c)=>c.degradado?c.degradado[0]:c.color;
  const imagen=(d,[h,a],w)=>`url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='${d}'%20fill='none'>`+
    `<path%20d='${w}'%20stroke='%23${h.slice(1)}'%20stroke-opacity='${a/100}'%20stroke-width='${d==='0 0 24 24'?1.5:2.2}'%20`+
    `stroke-linecap='round'%20stroke-linejoin='round'/></svg>")`.replace(/ /g,'%20');
  const soloFondo=(n)=>{const u=DEV_USOS[n];return !!(u&&u.veces&&u.props.length&&u.props.every((p)=>/^background(-image)?$/.test(p)));};
  /* Modo que se edita: el de la app. v(c) devuelve el objeto con color/degradado/angulo de ese
     modo (en día, c.dia; si no lo tiene, se crea copiando el de noche). */
  const modo='noche';
  const soloColor=(o)=>{const r={};for(const k of ['color','degradado','angulo'])if(o&&o[k]!==undefined)r[k]=JSON.parse(JSON.stringify(o[k]));return r;};
  const vDe=(c,m)=>m==='dia'?(c.dia||soloColor(c)):c;
  const v=(c)=>{if(modo==='dia'&&!c.dia)c.dia=soloColor(c);return vDe(c,modo);};
  const distintoEn=(c,m)=>{const o=orig(c.nombre);return JSON.stringify(soloColor(vDe(c,m)))!==JSON.stringify(soloColor(o?vDe(o,m):{}));};
  const distinto=(c)=>distintoEn(c,modo);
  const hoja=document.createElement('style');hoja.id='dev-tokens';document.head.appendChild(hoja);
  const flash=document.createElement('style');flash.id='dev-flash';document.head.appendChild(flash);
  function aplicarTodo(){
    const bloque=(m)=>todos().map((c)=>`--${c.nombre}:${valor(vDe(c,m))};`).join('')+
      (()=>{const i=todos().find((c)=>c.nombre==='input-icon'),k=todos().find((c)=>c.nombre==='primary-text-default');
        return (i?`--flecha-select:${imagen('0 0 24 24',primero(vDe(i,m)),'M6 9L12 15L18 9')};`:'')+
          (k?`--check-casilla:${imagen('4 4 16 16',primero(vDe(k,m)),'M5 13L9 17L19 7')};`:'');})();
    hoja.textContent=`:root:not([data-tema="dia"]){${bloque('noche')}}`;
  }
  const aplicar=()=>aplicarTodo();
  function guardar(){try{localStorage.setItem(CLAVE,JSON.stringify(datos));}catch(e){}}
  aplicarTodo();

  /* ---------- asignaciones a elementos ----------
     datos.reglas = [{selector, prop, token}]: «este elemento usa este color para su texto, fondo o
     borde». Se aplican con una hoja propia y !important para que se vea exactamente lo elegido, y
     viajan en colores.json: build.js las añade al final del CSS de la app. */
  const PROPS={color:'Texto',background:'Fondo','border-color':'Borde'};
  const hojaReglas=document.createElement('style');hojaReglas.id='dev-reglas';document.head.appendChild(hojaReglas);
  const hojaMarca=document.createElement('style');
  hojaMarca.textContent='.dev-marca{outline:2px dashed #FF00FF!important;outline-offset:2px!important;cursor:crosshair!important}';
  document.head.appendChild(hojaMarca);
  const reglas=()=>(datos.reglas=datos.reglas||[]);
  const validoSel=(sel)=>{try{document.querySelectorAll(sel);return true;}catch(e){return false;}};
  function aplicarReglas(){
    hojaReglas.textContent=reglas().filter((r)=>validoSel(r.selector))
      .map((r)=>`${r.selector}{${r.prop}:var(--${r.token})!important}`).join('\n');
  }
  aplicarReglas();

  /* ---------- interfaz ---------- */
  const host=document.createElement('div');
  host.id='dev-colores';
  document.body.appendChild(host);
  const raiz=host.attachShadow({mode:'open'});
  raiz.innerHTML=`<style>
    :host{all:initial}
    *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    .abrir{position:fixed;left:16px;bottom:16px;z-index:2147483000;padding:9px 14px;border-radius:999px;border:1px solid #444;
      background:#1b1b1f;color:#f2f2f2;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.5)}
    .abrir b{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;
      background:conic-gradient(#ff5b5b,#ffd35b,#5bff9b,#5bc8ff,#b35bff,#ff5b5b);vertical-align:-1px}
    .panel{position:fixed;top:0;right:0;bottom:0;width:400px;max-width:100vw;z-index:2147483001;background:#16161a;color:#e8e8ea;
      border-left:1px solid #333;display:flex;flex-direction:column;font-size:13px;box-shadow:-10px 0 30px rgba(0,0,0,.5)}
    .panel[hidden]{display:none}
    header{padding:14px 16px 12px;border-bottom:1px solid #2c2c32;display:flex;flex-direction:column;gap:10px}
    .fila{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    h1{font-size:15px;margin:0;flex:1}
    button,.boton{font-size:12px;padding:6px 10px;border-radius:7px;border:1px solid #444;background:#222228;color:#eee;cursor:pointer}
    button:hover,.boton:hover{background:#2c2c34}
    input[type=search]{flex:1;min-width:0;padding:7px 10px;border-radius:7px;border:1px solid #444;background:#0f0f12;color:#eee;font-size:13px}
    .nota{color:#9a9aa2;font-size:11.5px;line-height:1.4}
    .lista{overflow:auto;flex:1;padding:6px 0 30px}
    details{border-bottom:1px solid #26262c}
    summary{cursor:pointer;padding:10px 16px;font-weight:600;color:#cfcfd4;list-style:none;display:flex;justify-content:space-between}
    summary::-webkit-details-marker{display:none}
    summary i{font-style:normal;color:#8a8a92;font-weight:400}
    .color{padding:9px 16px 11px;border-top:1px solid #1f1f24}
    .color.mod{background:#1d1b2a}
    .cab{display:flex;align-items:center;gap:8px}
    .mues{width:26px;height:26px;border-radius:6px;border:1px solid #555;flex:none;
      background-image:linear-gradient(45deg,#444 25%,transparent 25%,transparent 75%,#444 75%),linear-gradient(45deg,#444 25%,transparent 25%,transparent 75%,#444 75%);
      background-size:8px 8px;background-position:0 0,4px 4px;position:relative;overflow:hidden}
    .mues span{position:absolute;inset:0}
    .nom{flex:1;min-width:0;font-family:ui-monospace,Consolas,monospace;font-size:12px;word-break:break-all}
    .nom small{display:block;font-family:system-ui,sans-serif;color:#8a8a92;font-size:11px;margin-top:2px}
    .ctrl{display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap}
    .ctrl label{color:#9a9aa2;font-size:11px;display:flex;align-items:center;gap:4px}
    input[type=color]{width:34px;height:26px;padding:0;border:1px solid #555;border-radius:5px;background:none;cursor:pointer}
    input.hex{width:78px;padding:4px 6px;border-radius:5px;border:1px solid #444;background:#0f0f12;color:#eee;font:12px ui-monospace,monospace}
    input.num{width:50px;padding:4px 6px;border-radius:5px;border:1px solid #444;background:#0f0f12;color:#eee;font-size:12px}
    .punto{width:7px;height:7px;border-radius:50%;background:#b39bff;flex:none}
    .sin{color:#ff8a8a}
    .mini{padding:3px 7px;font-size:11px}
    .grad[disabled]{opacity:.45;cursor:not-allowed}
    .elegir{width:100%;background:#2a2340;border-color:#6b5bd6}
    .modos button{flex:1;padding:8px 10px}
    .modos button[aria-pressed=true]{background:#e8e8ea;color:#111;border-color:#e8e8ea;font-weight:600}
    .elegir.activo{background:#6b5bd6;color:#fff}
    .asig{padding:12px 16px;border-bottom:1px solid #2c2c32;background:#1a1822}
    .asig h2{font-size:13px;margin:0 0 8px}
    .asig .muestra{padding:8px 10px;border-radius:6px;background:#0f0f12;border:1px solid #333;margin-bottom:8px;
      max-height:54px;overflow:hidden;font-size:12px;color:#ccc}
    .asig input.sel{width:100%;padding:6px 8px;border-radius:6px;border:1px solid #444;background:#0f0f12;color:#eee;font:12px ui-monospace,monospace}
    .asig .prop{display:grid;grid-template-columns:52px 26px 1fr;gap:8px;align-items:center;margin-top:8px}
    .asig .prop span.m{width:26px;height:20px;border-radius:4px;border:1px solid #555}
    .asig select{width:100%;padding:5px 6px;border-radius:6px;border:1px solid #444;background:#0f0f12;color:#eee;font-size:12px}
    .reglas{margin-top:12px}
    .regla{display:flex;gap:6px;align-items:center;font:11.5px ui-monospace,monospace;padding:4px 0;border-top:1px solid #26262c}
    .regla span{flex:1;min-width:0;word-break:break-all;color:#cfcfd4}
    .regla b{color:#b39bff;font-weight:400}
  </style>
  <button class="abrir" type="button"><b></b>Colores</button>
  <div class="panel" hidden role="dialog" aria-label="Panel de colores">
    <header>
      <div class="fila"><h1>Colores <span class="nota" id="cuenta"></span></h1><button id="cerrar" aria-label="Cerrar">✕</button></div>
      <div class="fila"><input type="search" id="buscar" placeholder="Buscar token (p. ej. primary, text, border)"></div>
      <div class="fila">
        <button id="exportar">Exportar colores.json</button>
        <label class="boton">Importar<input type="file" id="importar" accept=".json,application/json" hidden></label>
        <button id="reset">Restablecer todo</button>
      </div>
      <div class="fila"><button id="elegir" class="elegir">⌖ Asignar color a un elemento</button></div>
      <div class="nota">Los cambios se aplican al momento y se guardan en este navegador. Para llevarlos al código,
        exporta y sustituye <code>src/colores/colores.json</code>. «Ubicar» hace parpadear el color en magenta.</div>
    </header>
    <div class="lista"><div id="asignar"></div><div id="lista"></div></div>
  </div>`;
  const $=(s)=>raiz.querySelector(s);
  const panel=$('.panel');
  $('.abrir').onclick=()=>{panel.hidden=!panel.hidden;};
  $('#cerrar').onclick=()=>{panel.hidden=true;};
  const abiertos=new Set();

  function fila(c){
    const u=DEV_USOS[c.nombre]||{props:[],veces:0};
    const x=v(c), g=!!x.degradado, pg=soloFondo(c.nombre);
    const par=(i,[h,a])=>`<input type="color" data-i="${i}" value="${h.slice(0,7).toLowerCase()}">
      <input class="hex" data-hex="${i}" value="${h.toUpperCase()}" maxlength="7" spellcheck="false">
      <label>opac.<input class="num" type="number" min="0" max="100" data-a="${i}" value="${a}"></label>`;
    const pares=g?x.degradado:[x.color];
    return `<div class="color${distinto(c)?' mod':''}" data-n="${c.nombre}">
      <div class="cab"><div class="mues"><span style="background:${valor(x)}"></span></div>
        <div class="nom">--${c.nombre}<small>${u.veces?`${u.veces} usos · ${u.props.join(', ')||'js'}`:'<span class="sin">sin uso en la app</span>'}</small></div>
        ${distinto(c)?'<span class="punto" title="Modificado"></span>':''}
        <button class="mini" data-acc="ubicar" ${u.veces?'':'disabled'}>Ubicar</button>
        ${distinto(c)?'<button class="mini" data-acc="deshacer">Deshacer</button>':''}</div>
      <div class="ctrl">${par(0,pares[0])}</div>
      ${g?`<div class="ctrl">${par(1,pares[1])}<label>ángulo<input class="num" type="number" min="0" max="360" data-ang value="${x.angulo??135}"></label></div>`:''}
      <div class="ctrl"><label title="${pg?'':'Solo se permite en colores que se usan únicamente como fondo'}">
        <input type="checkbox" class="grad" data-grad ${g?'checked':''} ${pg||g?'':'disabled'}> degradado</label></div>
    </div>`;
  }
  function pintar(){
    const q=$('#buscar').value.trim().toLowerCase();
    const mod=todos().filter(distinto).length;
    $('#cuenta').textContent=`· ${todos().length} tokens${mod?` · ${mod} modificados`:''}`;
    $('#lista').innerHTML=datos.grupos.map((gr)=>{
      const cs=gr.colores.filter((c)=>!q||c.nombre.includes(q));
      if(!cs.length)return '';
      const m=cs.filter(distinto).length;
      return `<details data-g="${gr.grupo}"${q||abiertos.has(gr.grupo)?' open':''}><summary>${gr.grupo}<i>${cs.length}${m?` · ${m} mod.`:''}</i></summary>
        ${cs.map(fila).join('')}</details>`;
    }).join('');
  }
  $('#lista').addEventListener('toggle',(e)=>{const d=e.target;if(d.tagName==='DETAILS'){d.open?abiertos.add(d.dataset.g):abiertos.delete(d.dataset.g);}},true);
  $('#buscar').oninput=pintar;

  const colorDe=(el)=>todos().find((c)=>c.nombre===el.closest('.color').dataset.n);
  function cambio(c,repintar){
    aplicar(c);guardar();
    const f=$(`.color[data-n="${c.nombre}"]`);
    if(repintar||!f){pintar();return;}
    f.querySelector('.mues span').style.background=valor(v(c));
    f.classList.toggle('mod',distinto(c));
    // Sin repintar la fila (se perdería el foco del campo): solo el aviso y el botón de deshacer.
    const cab=f.querySelector('.cab');
    if(distinto(c)&&!cab.querySelector('[data-acc=deshacer]'))
      cab.insertAdjacentHTML('beforeend','<span class="punto" title="Modificado"></span><button class="mini" data-acc="deshacer">Deshacer</button>');
    const mod=todos().filter(distinto).length;
    $('#cuenta').textContent=`· ${todos().length} tokens${mod?` · ${mod} modificados`:''}`;
  }
  $('#lista').addEventListener('input',(e)=>{
    const t=e.target;if(!t.closest('.color'))return;
    const c=colorDe(t), x=v(c), pares=x.degradado||[x.color];
    if(t.type==='color'){const i=+t.dataset.i;pares[i][0]=t.value.toUpperCase();
      t.parentElement.querySelector(`[data-hex="${i}"]`).value=t.value.toUpperCase();}
    else if(t.dataset.hex!==undefined){const v=t.value.trim();if(!/^#[0-9a-fA-F]{6}$/.test(v))return;
      const i=+t.dataset.hex;pares[i][0]=v.toUpperCase();t.parentElement.querySelector(`[data-i="${i}"]`).value=v.toLowerCase();}
    else if(t.dataset.a!==undefined){pares[+t.dataset.a][1]=Math.max(0,Math.min(100,+t.value||0));}
    else if(t.dataset.ang!==undefined){x.angulo=+t.value||0;}
    else return;
    cambio(c,false);
  });
  $('#lista').addEventListener('change',(e)=>{
    const t=e.target;if(t.dataset.grad===undefined)return;
    const c=colorDe(t), x=v(c);
    if(t.checked){const p=x.color;x.degradado=[p.slice(),p.slice()];x.angulo=x.angulo??135;delete x.color;}
    else{x.color=x.degradado[0].slice();delete x.degradado;delete x.angulo;}
    cambio(c,true);
  });
  $('#lista').addEventListener('click',(e)=>{
    const b=e.target.closest('button[data-acc]');if(!b)return;
    const c=colorDe(b);
    if(b.dataset.acc==='deshacer'){
      // Solo el modo que se está editando.
      const o=orig(c.nombre);
      if(modo==='dia'){c.dia=soloColor(o.dia||o);}
      else{for(const k of ['color','degradado','angulo'])delete c[k];Object.assign(c,soloColor(o));}
      cambio(c,true);}
    if(b.dataset.acc==='ubicar'){
      let n=0;
      const t=setInterval(()=>{flash.textContent=n%2?'':`:root{--${c.nombre}:#FF00FF!important}`;
        if(++n>8){clearInterval(t);flash.textContent='';}},180);
    }
  });
  $('#reset').onclick=()=>{
    if(!confirm('¿Volver a los colores de colores.json? Se pierden los cambios de este navegador.'))return;
    datos=JSON.parse(JSON.stringify(ORIGINAL));try{localStorage.removeItem(CLAVE);}catch(e){}
    aplicarTodo();
    aplicarReglas();pintarAsignar(undefined);pintar();
  };
  $('#exportar').onclick=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(datos,null,1)+'\n'],{type:'application/json'}));
    a.download='colores.json';document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  };
  $('#importar').onchange=async(e)=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    try{const x=JSON.parse(await f.text());
      if(!x||!Array.isArray(x.grupos))throw new Error('No tiene el formato de colores.json (falta «grupos»).');
      datos=x;aplicarTodo();aplicarReglas();guardar();pintarAsignar(undefined);pintar();
    }catch(err){alert('No se ha podido importar: '+err.message);}
  };
  /* ----- modo «elegir elemento» ----- */
  let eligiendo=false, marcado=null, elegido=null;
  const fuera=(el)=>el&&el!==host&&!host.contains(el)&&el.nodeType===1;
  function marcar(el){if(marcado)marcado.classList.remove('dev-marca');marcado=el;if(el)el.classList.add('dev-marca');}
  function salirEleccion(){eligiendo=false;marcar(null);$('#elegir').classList.remove('activo');
    $('#elegir').textContent='⌖ Asignar color a un elemento';}
  document.addEventListener('mouseover',(e)=>{if(eligiendo&&fuera(e.target))marcar(e.target);},true);
  document.addEventListener('click',(e)=>{
    if(!eligiendo||!fuera(e.target))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    elegido=e.target;salirEleccion();pintarAsignar(sugerirSelector(elegido));
  },true);
  document.addEventListener('keydown',(e)=>{if(eligiendo&&e.key==='Escape')salirEleccion();},true);
  $('#elegir').onclick=()=>{
    if(eligiendo){salirEleccion();return;}
    eligiendo=true;$('#elegir').classList.add('activo');
    $('#elegir').textContent='Pulsa un elemento de la página… (Esc para cancelar)';
  };
  /* Selector propuesto: las clases del elemento, precedidas por la del contenedor con clase o id
     estable más cercano. Se puede editar a mano; el panel dice a cuántos elementos afecta. */
  const clases=(el)=>[...el.classList].filter((c)=>c!=='dev-marca'&&c!=='oculto'&&!/^(activ|abiert|sel)/.test(c));
  const trozo=(el)=>el.tagName.toLowerCase()+clases(el).map((c)=>'.'+CSS.escape(c)).join('');
  function sugerirSelector(el){
    let sel=trozo(el), p=el.parentElement, n=0;
    while(p&&p!==document.body&&n<4){
      if(p.id&&!/\d/.test(p.id)){sel='#'+CSS.escape(p.id)+' '+sel;break;}
      if(clases(p).length){sel='.'+CSS.escape(clases(p)[0])+' '+sel;break;}
      p=p.parentElement;n++;
    }
    return sel;
  }
  const opcionesTokens=(sel)=>'<option value="">— sin asignar —</option>'+datos.grupos.map((g)=>
    `<optgroup label="${g.grupo}">${g.colores.map((c)=>`<option value="${c.nombre}"${c.nombre===sel?' selected':''}>${c.nombre}</option>`).join('')}</optgroup>`).join('');
  function pintarAsignar(sel){
    const cont=$('#asignar');
    if(sel===undefined&&!reglas().length){cont.innerHTML='';return;}
    let h='';
    if(sel!==undefined){
      const valido=validoSel(sel), n=valido?document.querySelectorAll(sel).length:0;
      const cs=elegido?getComputedStyle(elegido):null;
      const actual=(p)=>cs?(p==='background'?cs.backgroundColor:p==='border-color'?cs.borderTopColor:cs.color):'';
      const regla=(p)=>(reglas().find((r)=>r.selector===sel&&r.prop===p)||{}).token||'';
      h+=`<div class="asig"><h2>Elemento seleccionado</h2>
        ${elegido?`<div class="muestra">${(elegido.textContent||'').trim().slice(0,140).replace(/[<>&]/g,'')||'(sin texto)'}</div>`:''}
        <input class="sel" id="asig-sel" value="${sel.replace(/"/g,'&quot;')}" spellcheck="false">
        <div class="nota" style="margin-top:4px">${valido?`Afecta a ${n} elemento${n===1?'':'s'} de esta vista.`:'<span class="sin">Selector no válido</span>'}
          Edítalo para ampliar o reducir el alcance.</div>
        ${Object.entries(PROPS).map(([p,et])=>`<div class="prop"><label>${et}</label>
          <span class="m" style="background:${actual(p)}" title="Actual: ${actual(p)}"></span>
          <select data-prop="${p}">${opcionesTokens(regla(p))}</select></div>`).join('')}
        <div class="fila" style="margin-top:10px"><button class="mini" id="asig-cerrar">Cerrar</button></div></div>`;
    }
    if(reglas().length)h+=`<div class="asig reglas"><h2>Asignaciones hechas · ${reglas().length}</h2>${reglas().map((r,i)=>
      `<div class="regla"><span>${r.selector.replace(/[<>&]/g,'')} · ${PROPS[r.prop]||r.prop} → <b>--${r.token}</b></span>
        <button class="mini" data-quitar="${i}">Quitar</button></div>`).join('')}</div>`;
    cont.innerHTML=h;
  }
  $('#asignar').addEventListener('change',(e)=>{
    const t=e.target;
    if(t.id==='asig-sel'){pintarAsignar(t.value.trim());return;}
    if(!t.dataset.prop)return;
    const sel=$('#asig-sel').value.trim();if(!validoSel(sel))return;
    const i=reglas().findIndex((r)=>r.selector===sel&&r.prop===t.dataset.prop);
    if(i>=0)reglas().splice(i,1);
    if(t.value)reglas().push({selector:sel,prop:t.dataset.prop,token:t.value});
    aplicarReglas();guardar();pintarAsignar(sel);
  });
  $('#asignar').addEventListener('click',(e)=>{
    const q=e.target.closest('[data-quitar]');
    if(q){reglas().splice(+q.dataset.quitar,1);aplicarReglas();guardar();
      pintarAsignar($('#asig-sel')?$('#asig-sel').value.trim():undefined);}
    if(e.target.id==='asig-cerrar'){elegido=null;pintarAsignar(undefined);}
  });
  pintarAsignar(undefined);
  pintar();
})();
