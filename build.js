#!/usr/bin/env node
/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
/**
 * build.js — ensambla src/ en un único tracelock.html, en la raíz del proyecto
 *
 * No usa dependencias externas ni paso de compilación real: solo concatena,
 * en el orden declarado en src/js/manifest.json, los ficheros fuente dentro
 * de la plantilla HTML. El resultado es el mismo artefacto de siempre
 * (un único .html sin servidor, sin Node en producción): Node solo hace
 * falta para *generar* ese fichero durante el desarrollo, no para usarlo.
 *
 * Uso: node build.js
 * Salida: tracelock.html en la raíz (y dist/tracelock-dev.html, con el panel de colores)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'tracelock.html');

function read(p) {
  return fs.readFileSync(p, 'utf-8');
}

/* Las fuentes se incrustan como data: URI. No es una optimización: la CSP del propio fichero
   solo admite `font-src data:`, así que cargarlas de un servidor externo no funcionaría, y el
   objetivo es que un único .html funcione sin conexión y sin peticiones a terceros. */
function fuentesCss() {
  const dir = path.join(SRC, 'fuentes');
  const familias = [
    { archivo: 'pliant.woff', familia: 'Pliant' },
    { archivo: 'azeret.woff', familia: 'Azeret Mono' },
  ];
  return familias.map(({ archivo, familia }) => {
    const b64 = fs.readFileSync(path.join(dir, archivo)).toString('base64');
    return `  @font-face{font-family:"${familia}";src:url(data:font/woff;base64,${b64}) format("woff");`
      + `font-weight:100 900;font-style:normal;font-display:swap}\n`;
  }).join('');
}

/* Sprite de iconos: un único <svg> oculto con un <symbol> por fichero de src/iconos/.
   Se usan con <svg class="ic"><use href="#ic-nombre"/></svg>. Van incrustados porque la CSP no
   admite recursos externos, y con currentColor para que hereden el color de cada tema. */
function spriteIconos() {
  const dir = path.join(SRC, 'iconos');
  const ficheros = fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
  const simbolos = ficheros.map((f) => {
    const svg = read(path.join(dir, f));
    const interior = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return `<symbol id="ic-${path.basename(f, '.svg')}" viewBox="0 0 24 24" fill="none">${interior}</symbol>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${simbolos}</svg>\n`;
}

/* ---------- colores ----------
   src/colores/colores.json es la fuente de verdad de la paleta: lo exporta el editor de colores
   y el panel de desarrollo con el mismo formato. Aquí se convierte en variables CSS. */
function leerColores() {
  return JSON.parse(read(path.join(SRC, 'colores', 'colores.json')));
}
const hex8 = ([hex, a]) => (a >= 100 ? hex : hex + Math.round(a * 2.55).toString(16).padStart(2, '0')).toUpperCase();
function valorColor(c) {
  return c.degradado ? `linear-gradient(${c.angulo}deg, ${c.degradado.map(hex8).join(', ')})` : hex8(c.color);
}
/* La flecha de los <select> es una imagen: no admite var(), así que se genera con el color. */
function flechaSelect(c) {
  const [hex, a] = c.degradado ? c.degradado[0] : c.color;
  return `url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'>`
    + `<path%20d='M6%209L12%2015L18%209'%20stroke='%23${hex.slice(1)}'%20stroke-opacity='${a / 100}'%20stroke-width='1.5'%20`
    + `stroke-linecap='round'%20stroke-linejoin='round'/></svg>")`;
}
function coloresCss(datos) {
  const lineas = datos.grupos.map((g) => `    /* ${g.grupo} */\n`
    + g.colores.map((c) => `    --${c.nombre}:${valorColor(c)};`).join('\n')).join('\n');
  const todos = datos.grupos.flatMap((g) => g.colores);
  const icono = todos.find((c) => c.nombre === 'input-icon');
  const check = todos.find((c) => c.nombre === 'primary-text-default');
  return `  :root{\n${lineas}\n    --flecha-select:${icono ? flechaSelect(icono) : 'none'};\n`
    + `    --check-casilla:${check ? checkCasilla(check) : 'none'};\n  }\n`;
}
/* Marca de las casillas de verificación: también es una imagen (no admite var()), así que se
   genera con el color del texto del botón primario, que es el relleno de la casilla marcada.
   Es el check de Iconoir recortado a su contenido (viewBox 4 4 16 16) para que a 8 px el trazo
   quede en 1 px y no desaparezca. */
function checkCasilla(c) {
  const [hex, a] = c.degradado ? c.degradado[0] : c.color;
  return `url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='4%204%2016%2016'%20fill='none'>`
    + `<path%20d='M5%2013L9%2017L19%207'%20stroke='%23${hex.slice(1)}'%20stroke-opacity='${a / 100}'%20stroke-width='2.2'%20`
    + `stroke-linecap='round'%20stroke-linejoin='round'/></svg>")`;
}
/* Dónde se usa cada color, para avisar de los que no se usan en ningún sitio. */
function usosColores(datos, fuentes) {
  const usos = {};
  for (const c of datos.grupos.flatMap((g) => g.colores)) {
    const n = c.nombre.replace(/[-]/g, '\\-');
    const props = new Set();
    const decl = new RegExp(`([a-z-]+)\\s*:[^;{}]*?var\\(--${n}[,)]`, 'g');
    const attr = new RegExp(`(fill|stroke|stop-color)="[^"]*var\\(--${n}[,)]`, 'g');
    const cualquiera = new RegExp(`var\\(--${n}[,)]`, 'g');
    let total = 0;
    for (const f of fuentes) {
      let m;
      while ((m = decl.exec(f))) props.add(m[1]);
      while ((m = attr.exec(f))) props.add(m[1]);
      total += (f.match(cualquiera) || []).length;
    }
    if (total && !props.size) props.add('js');
    usos[c.nombre] = { props: [...props].sort(), veces: total };
  }
  return usos;
}

function build() {
  const cabecera = read(path.join(SRC, 'html', '01-cabecera.html'));
  const colores = leerColores();
  const estilos = read(path.join(SRC, 'css', 'estilos.css'));
  // Asignaciones hechas desde el panel de colores («este elemento usa este color»): van al final
  // para que ganen, con !important como en el panel. Conviene pasarlas a su regla normal del CSS.
  const reglas = (colores.reglas || []).map((r) => `  ${r.selector}{${r.prop}:var(--${r.token})!important}`).join('\n');
  const css = fuentesCss() + coloresCss(colores) + estilos
    + (reglas ? `\n  /* ---------- asignaciones del panel de colores (colores.json · reglas) ---------- */\n${reglas}\n` : '');
  const cuerpoYApertura = read(path.join(SRC, 'html', '02-cuerpo-y-apertura-script.html'));
  const cierre = read(path.join(SRC, 'html', '03-cierre.html'));

  const manifestPath = path.join(SRC, 'js', 'manifest.json');
  const manifest = JSON.parse(read(manifestPath));

  const js = manifest
    .map((fname) => {
      const full = path.join(SRC, 'js', fname);
      if (!fs.existsSync(full)) {
        throw new Error(`Falta el módulo declarado en manifest.json: ${fname}`);
      }
      return read(full);
    })
    .join('');

  // el sprite va justo tras <body>, antes de cualquier marcado que lo use
  const conSprite = cuerpoYApertura.replace(/(<body[^>]*>)/, `$1\n${spriteIconos()}`);
  if (conSprite === cuerpoYApertura) throw new Error('No se ha encontrado <body> para insertar el sprite de iconos');
  const html = cabecera + css + conSprite + js + cierre;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, 'utf-8');

  const usos = usosColores(colores, [estilos, js, cuerpoYApertura]);
  const sinUso = Object.entries(usos).filter(([, u]) => !u.veces).map(([n]) => n);
  if (sinUso.length) console.log(`Colores sin uso en la app (${sinUso.length}): ${sinUso.join(', ')}`);
  /* Versión de desarrollo: la misma app + el panel de colores (src/dev/panel-colores.js), que
     recibe la paleta y dónde se usa cada color. No se distribuye: es para decidir colores. */
  const panel = path.join(SRC, 'dev', 'panel-colores.js');
  if (fs.existsSync(panel)) {
    // Antes del ÚLTIMO </body>: el JS de la app contiene otros «</body>» dentro de cadenas.
    const fin = html.lastIndexOf('</body>');
    const dev = html.slice(0, fin) + `<script>\nconst DEV_COLORES=${JSON.stringify(colores)};\n`
      + `const DEV_USOS=${JSON.stringify(usos)};\n${read(panel)}</script>\n` + html.slice(fin);
    fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'dist', 'tracelock-dev.html'), dev, 'utf-8');
    console.log('Construido también: dist/tracelock-dev.html (con panel de colores)');
  }
  const kb = (n) => (n / 1024).toFixed(0) + ' KB';
  console.log(`Construido: ${OUT} (${manifest.length} módulos JS, ${fs.readdirSync(path.join(SRC,'iconos')).filter((f)=>f.endsWith('.svg')).length} iconos, ${kb(Buffer.byteLength(html))})`);
}

build();
