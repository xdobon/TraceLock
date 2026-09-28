/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= grafo de relaciones ================= */
function grafoDatos(){
  const nodos=new Map(), aristas=[];
  const nodo=(id,etiqueta,tipo)=>{
    if(!nodos.has(id))nodos.set(id,{id,etiqueta,tipo,grado:0});
    return nodos.get(id);
  };
  const arista=(a,b,rel,discontinua,ataque)=>{
    if(!nodos.has(a)||!nodos.has(b)||a===b)return;
    aristas.push({de:a,a:b,rel,discontinua:!!discontinua,ataque:!!ataque});
    nodos.get(a).grado++;nodos.get(b).grado++;
  };

  const listaIocs=todosIocs();
  for(const i of listaIocs){
    const id='ioc:'+i.key;
    nodo(id,i.valor.length>46?i.valor.slice(0,44)+'…':i.valor,
      i.rol==='Sistema afectado'?'Sistema afectado'
      :i.rol==='Indicador de ataque'?'Indicador de ataque'
      :i.rol==='Activo legítimo'?'Activo legítimo':'IOC sin rol');
    nodos.get(id).estado=i.estado;
    nodos.get(id).rol=i.rol;
    nodos.get(id).tipoIoc=i.tipo;
  }
  // vínculos declarados: unos describen el ataque, otros el entorno normal
  for(const v of vinculosIoc())
    arista('ioc:'+v.de,'ioc:'+v.a,RELACION(v.rel).n,false,RELACION(v.rel).ataque);
  // vínculos antiguos guardados en el rol, antes de que existieran los vínculos con tipo
  for(const i of listaIocs){
    if(!(i.relacionados||[]).length)continue;
    for(const rv of i.relacionados){
      const rel=listaIocs.find((x)=>x.valor===rv);
      if(rel)arista('ioc:'+rel.key,'ioc:'+i.key,'ha comprometido',false,true);
    }
  }
  return {nodos,aristas};
}

/* iconos por tipo de IOC, sobre lienzo de 16x16 centrado en el nodo */
const ICONO_IOC={
 // link.svg de Iconoir (24x24) reducido al lienzo de 16; el grosor se compensa para que no adelgace.
 url:'<g transform="scale(.6667)" stroke-width="1.95"><path d="M14 11.9976C14 9.5059 11.683 7 8.85714 7C8.52241 7 7.41904 7.00001 7.14286 7.00001C4.30254 7.00001 2 9.23752 2 11.9976C2 14.376 3.70973 16.3664 6 16.8714C6.36756 16.9525 6.75006 16.9952 7.14286 16.9952"/><path d="M10 11.9976C10 14.4893 12.317 16.9952 15.1429 16.9952C15.4776 16.9952 16.581 16.9952 16.8571 16.9952C19.6975 16.9952 22 14.7577 22 11.9976C22 9.6192 20.2903 7.62884 18 7.12383C17.6324 7.04278 17.2499 6.99999 16.8571 6.99999"/></g>',
 dominio:'<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2c-1.8 2-1.8 10 0 12"/>',
 ipv4:'<rect x="2" y="3" width="12" height="4.5" rx="1"/><rect x="2" y="9" width="12" height="4.5" rx="1"/><path d="M4.6 5.2h.01M4.6 11.2h.01"/>',
 servidor:'<rect x="2" y="3" width="12" height="4.5" rx="1"/><rect x="2" y="9" width="12" height="4.5" rx="1"/><path d="M4.6 5.2h.01M4.6 11.2h.01"/>',
 correo:'<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.6 4.6 5.4 4 5.4-4"/>',
 usuario:'<circle cx="8" cy="5.5" r="2.6"/><path d="M3 13.4c.7-2.5 2.6-3.8 5-3.8s4.3 1.3 5 3.8"/>',
 equipo:'<rect x="2" y="3" width="12" height="8" rx="1.2"/><path d="M5.5 13.5h5"/>',
 adjunto:'<path d="M11.5 7.2 7.2 11.5a2.6 2.6 0 0 1-3.7-3.7l4.8-4.8a1.8 1.8 0 0 1 2.5 2.5l-4.7 4.7a.9.9 0 0 1-1.3-1.3l4.2-4.2"/>',
 sha256:'<path d="M6 2.5 4.5 13.5M11.5 2.5 10 13.5M2.8 5.8h10.4M2.2 10.2h10.4"/>',
 md5:'<path d="M6 2.5 4.5 13.5M11.5 2.5 10 13.5M2.8 5.8h10.4M2.2 10.2h10.4"/>',
 fichero:'<path d="M9 2.2H5a1.4 1.4 0 0 0-1.4 1.4v8.8A1.4 1.4 0 0 0 5 13.8h6a1.4 1.4 0 0 0 1.4-1.4V5.6z"/><path d="M9 2.2v3.4h3.4"/>',
 otro:'<circle cx="8" cy="8" r="5.6"/><path d="M8 5.4v3.2M8 10.8h.01"/>'};
const iconoDe=(t)=>ICONO_IOC[String(t||'').toLowerCase()]||ICONO_IOC.otro;

/* verde = víctima (sistema afectado), rojo = atacante, gris = sin determinar */
/* Cada rol usa los colores de un estado: el texto para el icono (y la leyenda) y el fondo para
   el círculo. Víctima = aviso, atacante = error, activo legítimo = éxito, sin rol = neutro. */
const ESTADO_NODO={'Sistema afectado':'warning','Indicador de ataque':'error',
  'Activo legítimo':'success','IOC sin rol':'neutral'};
const COLOR_NODO=Object.fromEntries(Object.entries(ESTADO_NODO).map(([k,v])=>[k,`var(--feedback-${v}-text)`]));

const GRAFO_W=980, GRAFO_H=620;
let GPOS=new Map(), gAlpha=0, gRaf=null, gVista={x:0,y:0,k:1}, gSel=null, gArrastre=null;

window.grafoReorganizar=()=>{GPOS.clear();gSel=null;cerrarFichaGrafo();pintarGrafo();};
window.grafoAjustar=()=>{gVista={x:0,y:0,k:1};cerrarFichaGrafo();aplicarVista();};
/* Zoom con los botones: alrededor del centro del lienzo, con los mismos límites que la rueda. */
window.grafoZoom=(f)=>{
  const k=Math.max(0.4,Math.min(3,gVista.k*f)), cx=GRAFO_W/2, cy=GRAFO_H/2;
  gVista.x=cx-(cx-gVista.x)*(k/gVista.k); gVista.y=cy-(cy-gVista.y)*(k/gVista.k);
  gVista.k=k; cerrarFichaGrafo(); aplicarVista();
};
window.grafoCentrar=(id,conFicha)=>{
  const n=GNODOS.find((x)=>x.id===id)||GPOS.get(id);if(!n)return;
  gSel=id;gVista.k=Math.max(gVista.k,1.35);
  gVista.x=GRAFO_W/2-n.x*gVista.k;gVista.y=GRAFO_H/2-n.y*gVista.k;
  aplicarVista();dibujarGrafo();
  if(conFicha)abrirFichaGrafo(id);
};

/* ---------- ficha de un IOC al pulsarlo ----------
   Como un tooltip, pero se abre con clic (no con hover) y se cierra al pulsar fuera o con Escape.
   Se coloca junto al nodo, dentro de la caja del lienzo, y se da la vuelta si no cabe. */
let gFicha=null;
function cerrarFichaGrafo(){const f=document.getElementById('g-ficha');if(f)f.remove();gFicha=null;}
function abrirFichaGrafo(id){
  cerrarFichaGrafo();
  const n=GNODOS.find((x)=>x.id===id), caja=document.getElementById('g-lienzo-caja'), svg=document.getElementById('g-svg');
  if(!n||!caja||!svg)return;
  const todos=todosIocs(), i=todos.find((x)=>'ioc:'+x.key===id);
  if(!i)return;
  const f=document.createElement('div');
  f.id='g-ficha';f.className='g-ficha';f.setAttribute('role','dialog');
  f.setAttribute('aria-label','IOC '+defang(i.valor));
  f.innerHTML=fichaIocHtml(i,todos);
  caja.appendChild(f);gFicha=id;
  // posición del nodo en píxeles de la caja
  const pt=svg.createSVGPoint();pt.x=gVista.x+n.x*gVista.k;pt.y=gVista.y+n.y*gVista.k;
  const sp=pt.matrixTransform(svg.getScreenCTM()), r=caja.getBoundingClientRect();
  const nx=sp.x-r.left, ny=sp.y-r.top, margen=8, sep=26*gVista.k;
  const w=f.offsetWidth, h=f.offsetHeight;
  let x=nx+sep; if(x+w>r.width-margen)x=nx-sep-w; x=Math.max(margen,Math.min(x,r.width-w-margen));
  let y=ny-h/2; y=Math.max(margen,Math.min(y,r.height-h-margen));
  f.style.left=x+'px';f.style.top=y+'px';
}
document.addEventListener('pointerdown',(e)=>{
  if(!gFicha)return;
  if(e.target.closest&&(e.target.closest('#g-ficha')||e.target.closest('.g-nodo')))return;
  cerrarFichaGrafo();
});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&gFicha)cerrarFichaGrafo();});

/* ---------- buscador del grafo ----------
   Resalta lo que coincide mientras se escribe y ofrece resultados, como el de la cabecera.
   Elegir uno lo centra en el lienzo y abre su ficha. */
function grafoBuscarResultados(){
  const inp=$('#grafo-buscar'), caja=$('#grafo-buscar-res');
  const q=inp.value.trim().toLowerCase();
  if(GNODOS.length)dibujarGrafo();
  if(!q){caja.classList.add('oculto');inp.setAttribute('aria-expanded','false');return;}
  const hits=GNODOS.filter((n)=>n.etiqueta.toLowerCase().includes(q)||String(n.tipoIoc||'').toLowerCase().includes(q)).slice(0,8);
  caja.innerHTML=hits.length
    ? hits.map((n)=>`<button type="button" class="res-rapido" role="option" onclick="grafoElegir('${escJs(n.id)}')">
        <b>${esc(n.etiqueta)}</b><span>${esc(n.tipoIoc||'otro')} · ${esc(n.tipo)}</span></button>`).join('')
    : '<div class="menu-grupo">Sin coincidencias</div>';
  caja.classList.remove('oculto');inp.setAttribute('aria-expanded','true');
}
window.grafoElegir=(id)=>{
  $('#grafo-buscar-res').classList.add('oculto');$('#grafo-buscar').setAttribute('aria-expanded','false');
  grafoCentrar(id,true);
};
$('#grafo-buscar').oninput=grafoBuscarResultados;
$('#grafo-buscar').onfocus=()=>{if($('#grafo-buscar').value.trim())grafoBuscarResultados();};
$('#grafo-buscar').onkeydown=(e)=>{
  if(e.key==='Enter'){const b=$('#grafo-buscar-res button');if(b){e.preventDefault();b.click();}}
  else if(e.key==='ArrowDown'){const b=$('#grafo-buscar-res button');if(b){e.preventDefault();b.focus();}}
  else if(e.key==='Escape'){$('#grafo-buscar-res').classList.add('oculto');}
};
$('#grafo-buscar-res').onkeydown=(e)=>{
  const bs=[...$$('#grafo-buscar-res button')], i=bs.indexOf(document.activeElement);
  if(e.key==='ArrowDown'){e.preventDefault();(bs[i+1]||bs[0]).focus();}
  else if(e.key==='ArrowUp'){e.preventDefault();i<=0?$('#grafo-buscar').focus():bs[i-1].focus();}
  else if(e.key==='Escape'){$('#grafo-buscar-res').classList.add('oculto');$('#grafo-buscar').focus();}
};
document.addEventListener('click',(e)=>{
  if(!e.target.closest||!e.target.closest('#io-mandos-grafo'))$('#grafo-buscar-res').classList.add('oculto');
});

function aplicarVista(){
  const l=document.getElementById('g-lienzo');
  if(l)l.setAttribute('transform',`translate(${gVista.x} ${gVista.y}) scale(${gVista.k})`);
}

function simularPaso(nodos,aristas){
  const K=170;                                   // distancia de reposo del muelle
  for(let a=0;a<nodos.length;a++){
    const n=nodos[a];
    for(let b=a+1;b<nodos.length;b++){
      const m=nodos[b];
      let dx=m.x-n.x, dy=m.y-n.y, d2=dx*dx+dy*dy||0.01;
      if(d2>360000)continue;                     // ignora pares muy lejanos
      const d=Math.sqrt(d2), f=9000/d2;
      const ux=dx/d, uy=dy/d;
      n.vx-=ux*f; n.vy-=uy*f; m.vx+=ux*f; m.vy+=uy*f;
    }
  }
  for(const e of aristas){
    const n=e.n1, m=e.n2;
    if(!n||!m)continue;
    let dx=m.x-n.x, dy=m.y-n.y, d=Math.sqrt(dx*dx+dy*dy)||0.01;
    const f=(d-K)*0.012, ux=dx/d, uy=dy/d;
    n.vx+=ux*f*d*0.06; n.vy+=uy*f*d*0.06;
    m.vx-=ux*f*d*0.06; m.vy-=uy*f*d*0.06;
  }
  const cx=GRAFO_W/2, cy=GRAFO_H/2;
  for(const n of nodos){
    n.vx+=(cx-n.x)*0.0016; n.vy+=(cy-n.y)*0.0016;
    if(n.fijo){n.vx=0;n.vy=0;continue;}
    n.vx*=0.82; n.vy*=0.82;
    n.x+=Math.max(-18,Math.min(18,n.vx));
    n.y+=Math.max(-18,Math.min(18,n.vy));
    n.x=Math.max(40,Math.min(GRAFO_W-40,n.x));
    n.y=Math.max(34,Math.min(GRAFO_H-34,n.y));
  }
}

let GNODOS=[], GARISTAS=[];

function dibujarGrafo(){
  const svg=document.getElementById('g-svg');
  if(!svg)return;
  const cap=document.getElementById('g-lienzo');
  if(!cap)return;
  const q=($('#grafo-buscar')&&$('#grafo-buscar').value||'').trim().toLowerCase();
  const casa=(n)=>q&&n.etiqueta.toLowerCase().includes(q);
  cap.innerHTML=
    GARISTAS.map((e)=>{
      const n=e.n1,m=e.n2;
      const ang=Math.atan2(m.y-n.y,m.x-n.x), R=25;
      const x1=n.x+Math.cos(ang)*R, y1=n.y+Math.sin(ang)*R;
      const x2=m.x-Math.cos(ang)*R, y2=m.y-Math.sin(ang)*R;
      const col=e.ataque?'var(--chart-3-soft)':'var(--chart-4-soft)';
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
        stroke="${col}" stroke-width="${e.ataque?1.8:1.3}"${e.ataque?'':' stroke-dasharray="6 5"'}
        marker-end="url(#${e.ataque?'g-flecha':'g-flecha-ctx'})"><title>${esc(e.rel)}</title></line>`;}).join('')+
    GNODOS.map((n)=>{
      // Como un botón de solo icono lg (44 px: icono de 20 + 12 de relleno): círculo con el fondo
      // del estado sobre una base opaca (para que no se transparenten las líneas) e icono con su
      // color de texto. Sin borde.
      const est=ESTADO_NODO[n.tipo]||'neutral';
      const marca=gSel===n.id||casa(n);
      return `<g class="g-nodo${marca?' g-marcado':''}" data-id="${esc(n.id)}" tabindex="0">
        <circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="22" fill="var(--card-background)"/>
        <circle class="g-fondo" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="22" fill="var(--feedback-${est}-background)"/>
        <g transform="translate(${(n.x-10).toFixed(1)} ${(n.y-10).toFixed(1)}) scale(1.25)" fill="none"
          stroke="var(--feedback-${est}-text)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"
          pointer-events="none">${iconoDe(n.tipoIoc)}</g>
        <text class="g-txt" x="${n.x.toFixed(1)}" y="${(n.y+38).toFixed(1)}" text-anchor="middle"
          fill="${marca?'var(--text-strong)':'var(--text-default)'}">${esc(n.etiqueta.length>24?n.etiqueta.slice(0,23)+'…':n.etiqueta)}</text>
      </g>`;}).join('');
}

function animarGrafo(){
  gRaf=null;
  if(gAlpha<=0.003)return;
  for(let i=0;i<2;i++)simularPaso(GNODOS,GARISTAS);
  gAlpha*=0.985;
  dibujarGrafo();
  gRaf=requestAnimationFrame(animarGrafo);
}

function pintarGrafo(){
  const g=grafoDatos();
  const cont=$('#grafo');
  if(!g.nodos.size){cont.innerHTML='<div class="vacio">Todavía no hay IOCs que relacionar. '+
    'El grafo se construye con los IOCs del caso y los vínculos de compromiso que asignes desde su rol.</div>';return;}

  GNODOS=[...g.nodos.values()].map((n)=>{
    const prev=GPOS.get(n.id);
    return {...n,
      x:prev?prev.x:GRAFO_W/2+(Math.random()-0.5)*420,
      y:prev?prev.y:GRAFO_H/2+(Math.random()-0.5)*300,
      vx:0,vy:0,fijo:prev?prev.fijo:false};
  });
  const porId=new Map(GNODOS.map((n)=>[n.id,n]));
  GARISTAS=g.aristas.map((e)=>({...e,n1:porId.get(e.de),n2:porId.get(e.a)}))
    .filter((e)=>e.n1&&e.n2);

  const porTipo=GNODOS.reduce((a,n)=>{a[n.tipo]=(a[n.tipo]||0)+1;return a;},{});
  const tiposIoc=[...new Set(GNODOS.map((n)=>String(n.tipoIoc||'otro').toLowerCase()))];
  const sueltos=GNODOS.filter((n)=>!GARISTAS.some((e)=>e.de===n.id||e.a===n.id)).length;

  cerrarFichaGrafo();
  cont.innerHTML=`
    <div class="tarjeta g-caja">
      <div class="g-cab">
        <div><h3 class="con-tip">Grafo de IOCs${ayudaTip('Se ven todos los artefactos a la vez. Arrastra cualquiera para recolocarlo y queda fijado donde lo sueltes; doble clic lo suelta. Pulsa uno para ver su ficha. Arrastra el fondo para desplazar la vista y usa la rueda o los botones para acercar o alejar. Las flechas ámbar continuas son relaciones de ataque; las azules discontinuas son relaciones de contexto, que describen la infraestructura normal de la entidad aunque no haya nada malicioso. Los vínculos se crean desde la acción «Vincular» de cada IOC en la tabla.')}</h3>
          <div class="g-resumen">${GNODOS.length} IOCs · ${GARISTAS.length} ${GARISTAS.length===1?'vínculo':'vínculos'}${
            sueltos?' · '+sueltos+' sin vincular':''}</div></div>
        <div class="g-botones">
          <button class="secundario btn-ico" onclick="grafoReorganizar()" aria-label="Reorganizar" title="Reorganizar">${icono('cambiar')}</button>
          <button class="secundario btn-ico" onclick="grafoAjustar()" aria-label="Ajustar vista" title="Ajustar vista">${icono('ajustar-vista')}</button>
          <button class="secundario btn-ico" onclick="grafoZoom(1.25)" aria-label="Acercar" title="Acercar">${icono('zoom-in')}</button>
          <button class="secundario btn-ico" onclick="grafoZoom(0.8)" aria-label="Alejar" title="Alejar">${icono('zoom-out')}</button>
        </div>
      </div>
      <div class="g-lienzo-caja" id="g-lienzo-caja">
      <svg id="g-svg" viewBox="0 0 ${GRAFO_W} ${GRAFO_H}" class="grafo" role="img"
        aria-label="Relaciones entre IOCs y sistemas afectados">
        <defs>
          <marker id="g-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6"
            markerHeight="6" orient="auto-start-reverse">
            <path d="M0 1.5 9 5 0 8.5z" fill="var(--chart-3-soft)"/></marker>
          <marker id="g-flecha-ctx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6"
            markerHeight="6" orient="auto-start-reverse">
            <path d="M0 1.5 9 5 0 8.5z" fill="var(--chart-4-soft)"/></marker>
        </defs>
        <g id="g-lienzo"></g>
      </svg>
      </div>
      <div class="g-leyenda">
      <div class="leyenda">${Object.keys(COLOR_NODO).filter((t)=>porTipo[t]).map((t)=>
        `<span><i style="background:${COLOR_NODO[t]}"></i>${esc(t==='Sistema afectado'?'Víctima · sistema afectado'
          :t==='Indicador de ataque'?'Atacante · indicador de ataque'
          :t==='Activo legítimo'?'Activo legítimo de la entidad':'Sin rol asignado')} · ${porTipo[t]}</span>`).join('')}</div>
      <div class="leyenda g-iconos">${tiposIoc.map((t)=>
        `<span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"
          stroke-linecap="round" stroke-linejoin="round">${iconoDe(t)}</svg>${esc(t)}</span>`).join('')}</div>
      </div>
    </div>`;

  aplicarVista();
  gAlpha=1;
  if(gRaf)cancelAnimationFrame(gRaf);
  gRaf=requestAnimationFrame(animarGrafo);
  conectarInteraccionGrafo();
}

function conectarInteraccionGrafo(){
  const svg=document.getElementById('g-svg');
  if(!svg)return;
  // Coordenadas del viewBox a partir del puntero. Con la matriz de pantalla y no con el ancho de la
  // caja: con la altura limitada, el dibujo queda centrado con márgenes y la regla de tres fallaba.
  const aViewBox=(ev)=>{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());};
  const aLienzo=(ev)=>{
    const {x,y}=aViewBox(ev);
    return {x:(x-gVista.x)/gVista.k, y:(y-gVista.y)/gVista.k, px:x, py:y};
  };
  svg.onpointerdown=(ev)=>{
    const g=ev.target.closest('.g-nodo');
    const pt=aLienzo(ev);
    svg.setPointerCapture(ev.pointerId);
    if(g){
      const n=GNODOS.find((x)=>x.id===g.dataset.id);
      if(!n)return;
      // No se fija ni se mueve nada hasta que el puntero se desplaza: así un clic abre la ficha
      // sin tocar la colocación del nodo.
      gArrastre={tipo:'nodo',n,dx:n.x-pt.x,dy:n.y-pt.y,cx:ev.clientX,cy:ev.clientY,movido:false};
    }else{
      cerrarFichaGrafo();
      gArrastre={tipo:'vista',x0:pt.px-gVista.x,y0:pt.py-gVista.y};
    }
  };
  svg.onpointermove=(ev)=>{
    if(!gArrastre)return;
    const pt=aLienzo(ev);
    if(gArrastre.tipo==='nodo'){
      if(!gArrastre.movido){
        if(Math.hypot(ev.clientX-gArrastre.cx,ev.clientY-gArrastre.cy)<4)return;
        gArrastre.movido=true;cerrarFichaGrafo();
        gArrastre.n.fijo=true; gSel=gArrastre.n.id; gAlpha=Math.max(gAlpha,0.55);
      }
      gArrastre.n.x=pt.x+gArrastre.dx; gArrastre.n.y=pt.y+gArrastre.dy;
      gArrastre.n.vx=0; gArrastre.n.vy=0;
      gAlpha=Math.max(gAlpha,0.35);
      if(!gRaf)gRaf=requestAnimationFrame(animarGrafo); else dibujarGrafo();
    }else{
      gVista.x=pt.px-gArrastre.x0; gVista.y=pt.py-gArrastre.y0; aplicarVista();
    }
  };
  const soltar=(ev)=>{
    if(gArrastre&&gArrastre.tipo==='nodo'){
      if(!gArrastre.movido&&ev.type==='pointerup'){
        const id=gArrastre.n.id;gSel=id;dibujarGrafo();
        if(gFicha===id)cerrarFichaGrafo();else abrirFichaGrafo(id);
      }else dibujarGrafo();
    }
    gArrastre=null;
    try{svg.releasePointerCapture(ev.pointerId);}catch(e){}
  };
  svg.onpointerup=soltar; svg.onpointercancel=soltar;
  svg.ondblclick=(ev)=>{
    const g=ev.target.closest('.g-nodo');
    if(!g)return;
    const n=GNODOS.find((x)=>x.id===g.dataset.id);
    if(n){n.fijo=false;gAlpha=1;if(!gRaf)gRaf=requestAnimationFrame(animarGrafo);}
  };
  svg.onwheel=(ev)=>{
    ev.preventDefault();
    cerrarFichaGrafo();
    const {x:px,y:py}=aViewBox(ev);
    const k=Math.max(0.4,Math.min(3,gVista.k*(ev.deltaY<0?1.12:0.89)));
    gVista.x=px-(px-gVista.x)*(k/gVista.k); gVista.y=py-(py-gVista.y)*(k/gVista.k);
    gVista.k=k; aplicarVista();
  };
}

window.addEventListener('pointerup',()=>{
  if(gArrastre&&gArrastre.tipo==='nodo'&&gArrastre.movido){GPOS.set(gArrastre.n.id,{x:gArrastre.n.x,y:gArrastre.n.y,fijo:true});}
  for(const n of GNODOS)GPOS.set(n.id,{x:n.x,y:n.y,fijo:n.fijo});
});

