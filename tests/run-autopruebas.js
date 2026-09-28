#!/usr/bin/env node
/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/**
 * Corre las autopruebas embebidas de TraceLock (ejecutarAutopruebas(),
 * definida en src/js/32-autodiagnostico.js) dentro de un Chromium headless,
 * y hace fallar el proceso (exit code 1) si alguna prueba falla.
 *
 * Por qué esto es seguro sobre file://: las propias autopruebas usan
 * registroDePrueba() para simular el manejador de fichero (hRegistro) en
 * memoria, así que no dependen de la File System Access API real ni de
 * IndexedDB — funcionan igual abriendo el HTML como página local.
 *
 * Uso: node tests/run-autopruebas.js
 * Requiere: tracelock.html ya construido (node build.js) y Playwright
 * con el navegador Chromium instalado (`npx playwright install chromium`).
 */
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, '..', 'tracelock.html');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  // Las autopruebas no deberían disparar diálogos nativos (alert/confirm) —
  // llaman a la lógica directamente, no a los manejadores de UI que los usan.
  // Este handler es solo un cinturón de seguridad: sin él, un alert()
  // inesperado dejaría el navegador esperando indefinidamente y el proceso
  // de CI colgado en vez de fallar limpiamente.
  page.on('dialog', (dialog) => {
    consoleErrors.push(`Diálogo nativo inesperado durante las autopruebas: [${dialog.type()}] ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });

  await page.goto('file://' + DIST, { waitUntil: 'load' });

  // ejecutarAutopruebas() es una función de nivel superior dentro de un
  // <script> clásico (no un módulo ES), así que queda en el ámbito global
  // de la página y es accesible como window.ejecutarAutopruebas.
  const resultados = await page.evaluate(async () => {
    if (typeof window.ejecutarAutopruebas !== 'function') {
      throw new Error('window.ejecutarAutopruebas no está definida — ¿ha cambiado el nombre de la función?');
    }
    return await window.ejecutarAutopruebas();
  });

  await browser.close();

  let total = 0, fallos = 0;
  for (const suite of resultados) {
    for (const prueba of suite.pruebas) {
      total++;
      if (!prueba.ok) {
        fallos++;
        console.error(`✗ [${suite.nombre}] ${prueba.d}\n  ${prueba.error}`);
      }
    }
  }

  console.log(`\n${total - fallos} de ${total} pruebas correctas.`);

  if (consoleErrors.length) {
    console.error(`\n${consoleErrors.length} error(es) de página no relacionados con las autopruebas:`);
    consoleErrors.forEach((e) => console.error('  ' + e));
  }

  if (fallos > 0 || consoleErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fallo al ejecutar las autopruebas:', err);
  process.exit(1);
});
