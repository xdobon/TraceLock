/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
// Comprueba que, con la interfaz en inglés, no queda texto de interfaz en español en
// ninguna vista. Construye un caso de muestra en memoria, recorre todas las secciones y
// usa auditarTraduccion() de la propia aplicación.
//   node tests/i18n-cobertura.js
// Lo que aparezca y sea un dato del caso (nombres, respuestas, hitos escritos a mano) es
// correcto que siga en español: se añade a PERMITIDOS. Lo demás, al diccionario
// src/js/17a-diccionario-ingles.js.
const { chromium } = require('playwright');
const path = require('path');
const DIST = path.join(__dirname, '..', 'tracelock.html');
// Datos del caso de muestra (lo que escribiría un analista): es correcto que no se traduzcan.
const DATOS_MUESTRA = ['¿Se reenvió el correo?', 'El usuario abre el adjunto', 'visto en el correo',
  'Buzón usuario', 'Pendiente de acceso', 'Revisar cabeceras', 'Restablecer contraseña',
  'Bloquear remitente', 'Primera nota', '¿Hubo acceso VPN?', 'Correo sospechoso', 'Cliente Demo',
  'dominio malo.example', 'Xavier Dobon.', 'Ana Martín'];
const ESPANOL = /[áéíóúñ¿¡]|\b(de|del|la|el|los|las|que|con|sin|para|por|una?|hay|está|son)\b/i;

async function casoMuestra() {
  registroDePrueba();
  const A = anotar;
  await A('CASO_ABIERTO', { carpeta: 'CASO-2026-014' });
  await A('CASO_CLIENTE', { cliente: 'Cliente Demo' });
  await A('CLASIFICACION_CCN', { clase: TAXONOMIA[0].clase, tipoIncidente: TAXONOMIA[0].tipos ? TAXONOMIA[0].tipos[0] : 'x',
    peligrosidad: 'ALTO', impacto: 'MEDIO', motivoPeligrosidad: 'x', motivoImpacto: 'y', revision: 'clasificación inicial' });
  await A('EVIDENCIA_REGISTRADA', { id: 'EV-0001', nombre: 'correo.eml', bytes: 20480, sha256: 'a'.repeat(64),
    custodio: 'Ana Martín', metodo: 'Entregado por el cliente', origen: 'Buzón usuario', descripcion: 'Correo sospechoso' });
  await A('EVIDENCIA_VERIFICADA', { id: 'EV-0001', sha256Actual: 'a'.repeat(64), sha256Registrado: 'a'.repeat(64), coincide: true });
  await A('HITO_CREADO', { id: 'H-0001', fase: 'Contencion', hito: 'Bloquear remitente', iniciado: true });
  await A('HITO_BLOQUEADO', { id: 'H-0001', motivo: 'Pendiente de acceso' });
  await A('HITO_CREADO', { id: 'H-0002', fase: 'Analisis', hito: 'Revisar cabeceras' });
  await A('HITO_CREADO', { id: 'H-0003', fase: 'Recuperacion', hito: 'Restablecer contraseña', iniciado: true });
  await A('HITO_FINALIZADO', { id: 'H-0003', resultado: 'Hecho' });
  await A('CRONO_ENTRADA', { id: 'C-0001', fecha: '2026-09-09', hora: '10:15', accion: 'El usuario abre el adjunto', fuente: 'EDR', huso: 'UTC' });
  await A('PREGUNTA_ABIERTA', { id: 'P-0001', pregunta: '¿Se reenvió el correo?' });
  await A('PREGUNTA_ABIERTA', { id: 'P-0002', pregunta: '¿Hubo acceso VPN?' });
  await A('PREGUNTA_RESPONDIDA', { id: 'P-0002', respuesta: 'No' });
  await A('IOC_MANUAL', { tipo: 'dominio', valor: 'malo.example', contexto: 'visto en el correo', evidencia: 'EV-0001' });
  await A('ATTACK_TECNICA', { tecnicaId: 'T1566.001', tecnica: 'Spearphishing Attachment', tactica: 'Initial Access',
    tacticaId: 'TA0001', confianza: 'Confirmada', justificacion: 'adjunto' });
  await A('NOTA', { id: 'N-0001', titulo: 'Primera nota', texto: 'texto' });
}

(async () => {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('dialog', (d) => d.dismiss());
  await pagina.addInitScript(() => sessionStorage.setItem('tl-idioma', 'en'));
  await pagina.goto('file://' + DIST, { waitUntil: 'load' });
  const pendientes = await pagina.evaluate(async (fuente) => {
    const vistas = [];
    const recoger = () => { for (const t of auditarTraduccion()) vistas.push(t); };
    console.table = () => {};
    recoger();                                   // portada
    eval('(' + fuente + ')')().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    for (const v of [...document.querySelectorAll('nav button[data-v]')].map((b) => b.dataset.v).concat(['gu', 'aj', 'bu'])) {
      irA(v); await new Promise((r) => setTimeout(r, 30)); recoger();
    }
    return [...new Set(vistas)];
  }, casoMuestra.toString());
  const reales = pendientes.filter((t) => {
    let resto = t.replace(/^@[\w-]+: /, '');
    for (const d of DATOS_MUESTRA) resto = resto.split(d).join('');
    return ESPANOL.test(resto);
  });
  await navegador.close();
  if (errores.length) { console.error('Errores de la página:\n' + errores.join('\n')); process.exit(2); }
  if (reales.length) {
    console.log(`${reales.length} textos siguen en español con la interfaz en inglés:\n` + reales.map((t) => '  · ' + t).join('\n'));
    process.exit(1);
  }
  console.log('Cobertura de traducción: no queda texto de interfaz en español en ninguna vista.');
})();
