/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
// Comprueba el caso de ejemplo de ejemplos/ como lo vería quien lo descarga: se copia a un
// sistema de ficheros del navegador (fechas de fichero nuevas, como tras un git clone), se abre
// y se verifica cadena, huellas, sello externo y que todas las vistas se pintan.
//   node tests/caso-ejemplo.js
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'tracelock.html');
const CASO = path.join(RAIZ, 'ejemplos', 'IR-2026-031-Phishing-Finanzas');
const SELLOS = path.join(RAIZ, 'ejemplos', 'sello-externo');

const listar = (d, pre = '') => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? listar(path.join(d, e.name), pre + e.name + '/')
    : [[pre + e.name, fs.readFileSync(path.join(d, e.name)).toString('base64')]]));

(async () => {
  if (!fs.existsSync(DIST)) { console.error('Falta tracelock.html: ejecuta antes «node build.js».'); process.exit(2); }
  const html = fs.readFileSync(DIST);
  // la File System Access API sobre file:// no está disponible: se sirve por HTTP en local
  const srv = http.createServer((_, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); }).listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/tracelock.html';

  const navegador = await chromium.launch();
  const p = await (await navegador.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto(url);
  await p.waitForTimeout(600);

  const selloFichero = fs.readdirSync(SELLOS).find((f) => f.endsWith('.json'));
  const r = await p.evaluate(async ([ficheros, sello]) => {
    const root = await navigator.storage.getDirectory();
    for await (const [n] of root.entries()) await root.removeEntry(n, { recursive: true });
    const caso = await root.getDirectoryHandle('caso', { create: true });
    for (const [ruta, b64] of ficheros) {
      let d = caso; const partes = ruta.split('/');
      for (const x of partes.slice(0, -1)) d = await d.getDirectoryHandle(x, { create: true });
      const w = await (await d.getFileHandle(partes.at(-1), { create: true })).createWritable();
      await w.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))); await w.close();
    }
    $('#analista').value = 'Pruebas';
    await engancharCaso(caso);
    for (let i = 0; i < 300 && !(VERIF && VERIF.fase === 'hecha'); i++) await new Promise((x) => setTimeout(x, 100));
    const out = { asientos: ASIENTOS.length, cadena: verificarCadena().integra, verif: VERIF && { fase: VERIF.fase, disc: VERIF.discrepancias, noLeidas: VERIF.noLeidas, total: VERIF.total },
      evidencias: EST.ev.length, iocs: (typeof iocs === 'function' ? iocs().length : null) };
    await verificarSelloDesdeFichero(new File([sello], 'sello.json'));
    out.sello = $('#sello-externo').textContent.trim();
    out.vistas = [];
    for (const v of [...document.querySelectorAll('nav button[data-v]')].map((b) => b.dataset.v)) {
      irA(v); await new Promise((x) => setTimeout(x, 60));
      const c = document.querySelector(`[data-vista="${v}"]`);
      if (!c || !c.textContent.trim()) out.vistas.push(v);
    }
    return out;
  }, [listar(CASO), fs.readFileSync(path.join(SELLOS, selloFichero), 'utf8')]);

  await navegador.close(); srv.close();

  const fallos = [];
  if (errores.length) fallos.push('errores de la página: ' + errores.join(' | '));
  if (!r.cadena) fallos.push('la cadena del caso de ejemplo no está íntegra');
  if (r.evidencias !== 4) fallos.push(`se esperaban 4 evidencias y hay ${r.evidencias}`);
  if (r.asientos < 80) fallos.push(`se esperaban al menos 80 asientos y hay ${r.asientos}`);
  if (!r.verif || r.verif.fase !== 'hecha') fallos.push('la verificación automática no terminó');
  else {
    // las fechas de fichero cambian al clonar, pero el contenido no: el hash debe coincidir
    if (r.verif.disc.length) fallos.push('huellas que no coinciden: ' + r.verif.disc.join(', ') + ' (¿Git ha convertido los saltos de línea? revisa .gitattributes)');
    if (r.verif.noLeidas.length) fallos.push('evidencias que no se han podido leer: ' + r.verif.noLeidas.join(', '));
  }
  if (!/válido/i.test(r.sello)) fallos.push('el sello externo no se valida: «' + r.sello + '»');
  if (r.vistas.length) fallos.push('vistas que se quedan vacías: ' + r.vistas.join(', '));

  if (fallos.length) { console.error('Caso de ejemplo: FALLA\n- ' + fallos.join('\n- ')); process.exit(1); }
  console.log(`Caso de ejemplo correcto: ${r.asientos} asientos, ${r.evidencias} evidencias verificadas, cadena íntegra, sello ${r.sello}.`);
})().catch((e) => { console.error('Caso de ejemplo: ERROR ' + e.message); process.exit(2); });
