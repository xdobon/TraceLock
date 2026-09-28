/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= diálogo genérico de formulario ================= */
let pedirResolver=null;

function pedir(titulo,campos,nota){
  return new Promise((resolve)=>{
    pedirResolver=resolve;
    $('#pedir-titulo').textContent=titulo;
    $('#pedir-nota').innerHTML=nota?esc(nota):'';
    $('#pedir-nota').style.display=nota?'':'none';
    $('#pedir-campos').innerHTML=campos.map((c)=>{
      const ancho=c.ancho||(c.tipo==='textarea'?'grid-column:span 2':'');
      const val=esc(c.valor==null?'':c.valor);
      const req=c.requerido?' aria-required="true"':'';
      let control;
      if(c.tipo==='select')
        control=`<select id="pedirc-${c.id}"${req}>${(c.opciones||[]).map((o)=>
          `<option${o===c.valor?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
      else if(c.tipo==='imagenes'){
        control=`<div class="soltar-img" id="pedirw-${c.id}">
          <input type="file" id="pedirc-${c.id}" accept="image/*" multiple>
          <div class="lista-img" id="pedirl-${c.id}"></div></div>`;
      }
      else if(c.tipo==='checks'){
        const marcados=String(c.valor||'').split(',').map((x)=>x.trim());
        control=`<div class="casillas" id="pedirc-${c.id}">${(c.opciones||[]).map((o)=>
          `<label><input type="checkbox" value="${esc(o)}"${marcados.includes(o)?' checked':''}>${esc(o)}</label>`
          ).join('')}</div>`;
      }
      else if(c.tipo==='textarea')
        control=`<textarea id="pedirc-${c.id}"${req} rows="3" placeholder="${esc(c.pista||'')}">${val}</textarea>`;
      else{
        const lista=c.lista?` list="pedir-lista-${c.id}"`:'';
        control=`<input id="pedirc-${c.id}"${req} type="${c.tipo||'text'}" value="${val}"${lista}
          placeholder="${esc(c.pista||'')}" ${c.clase?`class="${c.clase}"`:''}>`+
          (c.lista?`<datalist id="pedir-lista-${c.id}">${c.lista.map((o)=>
            `<option value="${esc(o)}">`).join('')}</datalist>`:'');
      }
      return `<label class="campo" style="${ancho}"><span>${esc(c.etiqueta)}${
        c.requerido?ASTERISCO:''}</span>${control}</label>`;
    }).join('');
    $('#modal-pedir').classList.remove('oculto');
    const primero=$('#pedir-campos').querySelector('input:not([type=file]),select,textarea');
    if(primero)primero.focus();
    for(const c of campos){
      if(c.tipo!=='imagenes')continue;
      const inp=$('#pedirc-'+c.id), cajaL=$('#pedirl-'+c.id), env=$('#pedirw-'+c.id);
      const pintar=()=>{cajaL.innerHTML=[...inp.files].map((f)=>
        `<span class="chip-img">${esc(f.name)} <i>${bytesTxt(f.size)}</i></span>`).join('')
        ||'<span class="sub">Ninguna imagen seleccionada. Puedes arrastrarlas aquí o pegarlas con Ctrl+V.</span>';};
      inp.onchange=pintar;
      env.ondragover=(e)=>{e.preventDefault();env.classList.add('activa');};
      env.ondragleave=()=>env.classList.remove('activa');
      env.ondrop=(e)=>{e.preventDefault();env.classList.remove('activa');
        const dt=new DataTransfer();
        for(const f of [...inp.files,...e.dataTransfer.files])if(/^image\//.test(f.type))dt.items.add(f);
        inp.files=dt.files;pintar();};
      env.onpaste=(e)=>{
        const dt=new DataTransfer();
        for(const f of inp.files)dt.items.add(f);
        let n=0;
        for(const it of e.clipboardData.items){
          if(!/^image\//.test(it.type))continue;
          const f=it.getAsFile();
          if(f){dt.items.add(new File([f],'captura-'+Date.now()+'-'+(++n)+'.png',{type:f.type}));}
        }
        if(n){inp.files=dt.files;pintar();}
      };
      env.tabIndex=0;
      pintar();
    }
    $('#modal-pedir').dataset.campos=JSON.stringify(
      campos.map((c)=>({id:c.id,requerido:!!c.requerido,tipo:c.tipo||'text'})));
  });
}
$('#pedir-cancelar').onclick=()=>{$('#modal-pedir').classList.add('oculto');
  if(pedirResolver){pedirResolver(null);pedirResolver=null;}};
$('#pedir-cerrar').onclick=()=>$('#pedir-cancelar').onclick();
$('#modal-pedir').onclick=(e)=>{if(e.target===$('#modal-pedir'))$('#pedir-cancelar').onclick();};
// Escape cierra la modal abierta que está por encima (el análisis de correo lo gestiona su módulo).
document.addEventListener('keydown',(e)=>{
  if(e.key!=='Escape')return;
  const abierta=(id)=>!$(id).classList.contains('oculto');
  if(abierta('#modal-pedir'))$('#pedir-cancelar').onclick();
  else if(abierta('#modal-tr'))$('#tr-cancelar').onclick();
  else if(abierta('#modal-custodia'))$('#custodia-cerrar').onclick();
});
$('#pedir-aceptar').onclick=()=>{
  const campos=JSON.parse($('#modal-pedir').dataset.campos||'[]');
  const salida={};
  for(const c of campos){
    const el=$('#pedirc-'+c.id);
    const v=c.tipo==='imagenes'?[...el.files]
      :c.tipo==='checks'
      ?[...el.querySelectorAll('input:checked')].map((x)=>x.value).join(', ')
      :(el.value||'').trim();
    if(c.requerido&&!(c.tipo==='imagenes'?v.length:v)){
      alert('El campo marcado con asterisco es obligatorio.');el.focus();return;}
    salida[c.id]=v;
  }
  $('#modal-pedir').classList.add('oculto');
  if(pedirResolver){pedirResolver(salida);pedirResolver=null;}
};

