/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/* ================= arranque ================= */
const pintarUsuario=()=>{$('#btn-usuario-txt').textContent=
  $('#analista').value.trim()||'Analista';};
$('#analista').value=almacenamiento.getItem('ir-analista')||'';
pintarUsuario();

$('#portada-pie').innerHTML=VERSION+' · para escribir en una carpeta local hacen falta Chrome o Edge; '+
  'en Firefox la aplicación funciona en modo reducido. Nada se envía fuera de este equipo.';
window.addEventListener('beforeunload',(e)=>{
  // solo cuando hay un caso abierto: evita perderlo por un F5 o un cierre de pestaña por descuido
  if(!dirCaso)return;
  e.preventDefault();
  e.returnValue='';
});
cargarRegistro().then(refrescar);
if(SOPORTA_FSA)proponerReanudar();

if(!SOPORTA_FSA){
  const a=$('#aviso-soporte');
  a.className='aviso rojo';
  a.innerHTML='Este navegador no permite escribir en una carpeta local, así que los ficheros no se copian '+
    'ni se pueden reverificar: solo se calcula su huella y el registro vive en esta pestaña, así que se pierde al '+
    'cerrarla. Para el funcionamiento completo abre este fichero con Chrome o Edge. Exporta el registro antes de cerrarla.';
  $('#abrir').disabled=true;
  $('#p-abrir').disabled=true;
  $('#p-crear').disabled=true;
}
