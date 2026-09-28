/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
// Uso: node build.js; python3 -m http.server 8123 --directory dist (en otra terminal);
//      python3 ejemplos/generador/crear-evidencias.py; node ejemplos/generador/capturas.js;
//      node ejemplos/generador/generar-caso.js
// Genera el caso de ejemplo conduciendo la propia aplicación (mismas funciones que usa un analista),
// con el reloj de la página simulado para reconstruir un incidente de tres días.
// Todo es ficticio: dominios .example, IPs de documentación (RFC 5737) y personas inventadas.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'fuente');
const DESTINO = path.join(__dirname, '..');
const CASO = 'IR-2026-031-Phishing-Finanzas';

const b64 = (f) => fs.readFileSync(path.join(SRC, f)).toString('base64');
const sha256 = (f) => require('crypto').createHash('sha256').update(fs.readFileSync(path.join(SRC, f))).digest('hex');

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ timezoneId: 'Europe/Madrid', locale: 'es-ES', viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.clock.setFixedTime(new Date('2026-09-09T09:18:00Z'));
  await p.goto(process.env.TRACELOCK_URL || 'http://127.0.0.1:8123/tracelock.html');
  await p.waitForTimeout(800);

  // limpiar el almacenamiento privado de ejecuciones anteriores
  await p.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) await r.removeEntry(n, { recursive: true }); });

  // --- guion de respuestas para los diálogos y utilidades ---
  await p.evaluate(() => {
    window.RESP = {}; window.LOGD = [];
    window.pedir = async (titulo, campos) => {
      const clave = Object.keys(RESP).find((k) => titulo.startsWith(k));
      if (!clave) throw new Error('Sin guion para el diálogo «' + titulo + '»');
      let r = RESP[clave]; if (Array.isArray(r)) { r = r.shift(); if (!RESP[clave].length) delete RESP[clave]; } else delete RESP[clave];
      if (r === null) return null;
      const out = {};
      for (const c of campos) {
        let v = r[c.id];
        if (c.tipo === 'select') {
          const ops = c.opciones || [];
          if (v == null) v = c.valor != null && c.valor !== '' ? c.valor : ops[0];
          else {
            const m = ops.find((o) => o === v) || ops.find((o) => o.startsWith(v)) || ops.find((o) => o.includes(v));
            if (!m) throw new Error(`«${v}» no está entre las opciones de ${c.id} en «${titulo}»: ${ops.join(' | ')}`);
            v = m;
          }
        } else if (c.tipo === 'checks') v = Array.isArray(v) ? v.join(', ') : (v ?? '');
        else if (c.tipo === 'imagenes') v = v || [];
        else v = String(v ?? c.valor ?? '').trim();
        if (c.requerido && !(c.tipo === 'imagenes' ? v.length : v)) throw new Error(`Falta «${c.id}» en «${titulo}»`);
        out[c.id] = v;
      }
      LOGD.push('pedir: ' + titulo);
      return out;
    };
    window.alert = (m) => LOGD.push('alert: ' + String(m).slice(0, 90));
    window.confirm = (m) => { LOGD.push('confirm: ' + String(m).slice(0, 90)); return true; };
    window.showDirectoryPicker = async () => navigator.storage.getDirectory();
    window.fichero = (b, nombre, tipo, mtime) => new File([Uint8Array.from(atob(b), (c) => c.charCodeAt(0))], nombre, { type: tipo, lastModified: mtime });
    window.soy = (n) => { $('#analista').value = n; almacenamiento.setItem('ir-analista', n); };
    window.adquisicion = (o) => { for (const [k, v] of Object.entries(o)) $('#' + k).value = v; };
    window.hitoPorTexto = (t) => EST.hi.find((h) => h.hito.startsWith(t)).id;
  });

  const paso = async (isoUtc, descripcion, fn, arg) => {
    await p.clock.setFixedTime(new Date(isoUtc));
    try { await p.evaluate(fn, arg); }
    catch (e) { throw new Error(`Paso «${descripcion}» (${isoUtc}): ${e.message}`); }
    await p.waitForTimeout(120);
    process.stdout.write('· ' + descripcion + '\n');
  };

  const ev = {
    eml: b64('Factura_pendiente_septiembre.eml'), csv: b64('signin-logs-entra-id.csv'),
    log: b64('proxy_2026-09-09.log'), png: b64('captura_portal_falso.png'), prueba: b64('bloqueo_proxy_regla_113.png'),
  };

  /* =============== 9 de septiembre =============== */
  await paso('2026-09-09T09:18:00Z', 'Crear el caso (con plantilla de phishing)', async () => {
    soy('Ana Martín');
    RESP['Crear caso · datos del incidente'] = { nombre: 'IR-2026-031 Phishing Finanzas', analista: 'Ana Martín',
      cliente: 'Entidad Ejemplo S.A.', tlp: 'TLP:AMBER', deteccion: '2026-09-09T11:02',
      descripcion: 'El SOC de la entidad alerta de un inicio de sesión de riesgo en Entra ID para finanzas03 desde 203.0.113.45 (Países Bajos), minutos después de recibir un correo de supuesta factura pendiente.' };
    RESP['Crear caso · clasificación y plantilla'] = { tipo: 'Phishing', categoria: 'MEDIA', equipos: '1', esfuerzo: 'entre 1 y 10', plantilla: 'Phishing' };
    await $('#p-crear').onclick();
  });

  await paso('2026-09-09T09:21:00Z', 'Contención inmediata: revocar sesiones', async () => {
    $('#hi-fase').value = 'Contencion'; $('#hi-hito').value = 'Revocar sesiones y restablecer la contraseña de finanzas03';
    $('#hi-prop').value = 'Ana Martín'; $('#hi-riesgo').value = 'Alto';
    $('#hi-notas').value = 'Coordinado con el administrador de Microsoft 365 de la entidad.';
    await $('#hi-iniciar').onclick();
  });
  await paso('2026-09-09T09:24:00Z', 'Iniciar «Conservar el mensaje original»', async () => { await hitoIniciar(hitoPorTexto('Conservar el mensaje')); });

  await paso('2026-09-09T09:36:00Z', 'Alta de EV-0001 (correo)', async (ev) => {
    adquisicion({ 'ev-origen': 'Buzón finanzas03@entidad.example (Exchange Online)', 'ev-metodo': 'Descarga desde consola cloud',
      'ev-adquirida-por': 'Ana Martín', 'ev-equipo': 'Exchange Online · tenant entidad.example', 'ev-ubicacion': 'Nube · región UE',
      'ev-adquirida-el': '2026-09-09T11:33', 'ev-testigo': '', 'ev-serie': '', 'ev-usuario': 'finanzas03', 'ev-estado-sistema': 'No aplica', 'ev-hash-origen': '' });
    await procesar([fichero(ev.eml, 'Factura_pendiente_septiembre.eml', 'message/rfc822', Date.parse('2026-09-09T09:33:10Z'))]);
  }, ev);
  await paso('2026-09-09T09:38:00Z', 'Proteger EV-0001', async () => {
    RESP['Anotar la protección'] = { metodo: 'Explorador de Windows' };
    await confirmarProteccion(false);
  });

  await paso('2026-09-09T09:47:00Z', 'Alta de EV-0002 (inicios de sesión) con hash de origen', async ([ev, h]) => {
    adquisicion({ 'ev-origen': 'Microsoft Entra ID · registros de inicio de sesión', 'ev-metodo': 'Descarga desde consola cloud',
      'ev-adquirida-por': 'Ana Martín', 'ev-equipo': 'Portal de Entra ID · tenant entidad.example', 'ev-ubicacion': 'Nube · región UE',
      'ev-adquirida-el': '2026-09-09T11:44', 'ev-usuario': '', 'ev-estado-sistema': 'No aplica', 'ev-hash-origen': h });
    RESP['Hay evidencias sin proteger'] = null;   // no debe aparecer: EV-0001 ya está protegida
    await procesar([fichero(ev.csv, 'signin-logs-entra-id.csv', 'text/csv', Date.parse('2026-09-09T09:44:30Z'))]);
  }, [ev, sha256('signin-logs-entra-id.csv')]);

  await paso('2026-09-09T09:49:00Z', 'Finalizar la revocación de sesiones', async () => {
    RESP['Finalizar hito'] = { resultado: 'Sesiones revocadas y contraseña restablecida a las 11:40 (hora local). El intento posterior desde 203.0.113.45 falla con token revocado (EV-0002).' };
    await hitoFinalizar(hitoPorTexto('Revocar sesiones'));
  });
  await paso('2026-09-09T09:52:00Z', 'Finalizar «Conservar el mensaje original»', async () => {
    RESP['Finalizar hito'] = { resultado: 'Mensaje exportado como .eml desde Exchange Online y registrado como EV-0001, con cabeceras completas.' };
    await hitoFinalizar(hitoPorTexto('Conservar el mensaje'));
  });

  await paso('2026-09-09T09:55:00Z', 'Analizar el correo EV-0001', async () => { await analizarEv('EV-0001'); $('#panel').classList.add('oculto'); });

  await paso('2026-09-09T09:58:00Z', 'Iniciar «Revisar identidad, autenticación, URLs y adjuntos»', async () => { await hitoIniciar(hitoPorTexto('Revisar identidad')); });

  await paso('2026-09-09T10:04:00Z', 'Alta de EV-0003 (proxy) pasando por la puerta de protección', async (ev) => {
    adquisicion({ 'ev-origen': 'Proxy corporativo PRX-01', 'ev-metodo': 'Exportacion desde SIEM', 'ev-adquirida-por': 'Ana Martín',
      'ev-equipo': 'PRX-01 vía consola del SIEM', 'ev-ubicacion': 'CPD de la sede central', 'ev-adquirida-el': '2026-09-09T12:01',
      'ev-usuario': '', 'ev-estado-sistema': 'Encendido y en producción', 'ev-hash-origen': '' });
    RESP['Hay evidencias sin proteger'] = { decision: 'Ya la he aplicado' };
    RESP['Anotar la protección'] = { metodo: 'Comando attrib' };
    await procesar([fichero(ev.log, 'proxy_2026-09-09.log', 'text/plain', Date.parse('2026-09-09T10:01:40Z'))]);
  }, ev);

  await paso('2026-09-09T10:12:00Z', 'Alta de EV-0004 (captura del usuario) aplazando la protección', async (ev) => {
    adquisicion({ 'ev-origen': 'Portátil PC-FIN-03 (captura hecha por la usuaria)', 'ev-metodo': 'Entregado por el cliente',
      'ev-adquirida-por': 'Ana Martín', 'ev-equipo': 'PC-FIN-03', 'ev-ubicacion': 'Departamento financiero, planta 2',
      'ev-adquirida-el': '2026-09-09T12:10', 'ev-testigo': 'Responsable de TI de la entidad', 'ev-serie': 'SN-EJ-4471',
      'ev-usuario': 'finanzas03', 'ev-estado-sistema': 'Encendido y aislado', 'ev-hash-origen': '' });
    RESP['Hay evidencias sin proteger'] = { decision: 'No se puede aplicar ahora' };
    RESP['Continuar sin proteger'] = { motivo: 'Trabajo en remoto sobre la unidad compartida del CSIRT, que no admite el atributo de solo lectura desde este equipo. Se aplicará desde la oficina.' };
    await procesar([fichero(ev.png, 'captura_portal_falso.png', 'image/png', Date.parse('2026-09-09T08:22:05Z'))]);
  }, ev);

  // --- indicadores ---
  await paso('2026-09-09T10:15:00Z', 'Añadir IOCs a mano', async () => {
    RESP['Añadir IOC a mano'] = [
      { tipo: 'ipv4', valor: '203.0.113.45', contexto: 'Origen de los inicios de sesión fraudulentos de finanzas03 (08:31–08:47 UTC)', evidencia: 'EV-0002' },
      { tipo: 'usuario', valor: 'finanzas03@entidad.example', contexto: 'Cuenta que introdujo sus credenciales en el portal falso', evidencia: 'EV-0002' },
      { tipo: 'equipo', valor: 'PC-FIN-03', contexto: 'Portátil de la usuaria desde el que se accedió al portal falso', evidencia: 'EV-0003' }];
    await iocManual(); await iocManual(); await iocManual();
  });
  await paso('2026-09-09T10:21:00Z', 'Valorar IOCs', async () => {
    const valorar = async (tipo, valor, estado, motivo) => { RESP['Valorar IOC'] = { estado, motivo }; await valorarIoc(claveIoc(tipo, valor)); };
    await valorar('url', 'https://login-microsoft365.secure-docs.example/auth/factura?d=ZmluYW56YXMwM0BlbnRpZGFkLmV4YW1wbGU=', 'Malicioso',
      'Portal falso de inicio de sesión (captura EV-0004). El texto del enlace muestra otro dominio. Escaneo previo en urlscan.');
    await valorar('dominio', 'login-microsoft365.secure-docs.example', 'Malicioso', 'Aloja el portal falso; subdominio que imita a Microsoft 365.');
    await valorar('correo', 'facturacion@proveedor-pagos.example', 'Malicioso', 'Remitente del phishing. SPF y DMARC fallan; Return-Path y Reply-To de otros dominios.');
    await valorar('correo', 'soporte-cobros@correo-rapido.example', 'Sospechoso', 'Reply-To del mensaje, distinto del remitente. Sin más actividad observada.');
    await valorar('ipv4', '198.51.100.23', 'Sospechoso', 'Servidor de envío según la cadena Received. No aparece en otros registros.');
    await valorar('ipv4', '203.0.113.45', 'Malicioso', 'Inicios de sesión con token válido tras el acceso al portal falso (EV-0002): patrón de robo de sesión.');
  });
  await paso('2026-09-09T10:26:00Z', 'Documentar consulta en urlscan', async () => {
    RESP['Documentar consulta externa'] = { proveedor: 'urlscan.io', consultado: '2026-09-09T12:25',
      resumen: 'Escaneo público existente del 8 de septiembre: página de inicio de sesión falsa con kit de proxy inverso. Referencia ficticia: urlscan-ejemplo-0908-44f1.' };
    await documentarIoc(claveIoc('dominio', 'login-microsoft365.secure-docs.example'));
  });
  await paso('2026-09-09T10:29:00Z', 'Roles de los artefactos', async () => {
    RESP['Rol del artefacto'] = [{ rol: 'Sistema afectado' }, { rol: 'Activo legítimo' }];
    await marcarRolIoc(claveIoc('usuario', 'finanzas03@entidad.example'));
    await marcarRolIoc(claveIoc('equipo', 'PC-FIN-03'));
  });
  await paso('2026-09-09T10:33:00Z', 'Vínculos entre artefactos', async () => {
    const V = async (tipo, valor, rel, destino, nota) => { RESP['Vincular '] = { rel, destino, nota }; await vincularIoc(claveIoc(tipo, valor)); };
    await V('correo', 'facturacion@proveedor-pagos.example', 'ha entregado', 'url ·', 'El enlace va en el cuerpo del correo EV-0001');
    await V('url', 'https://login-microsoft365.secure-docs.example/auth/factura?d=ZmluYW56YXMwM0BlbnRpZGFkLmV4YW1wbGU=', 'pertenece a', 'dominio · login-microsoft365', '');
    await V('ipv4', '203.0.113.45', 'ha comprometido', 'usuario ·', 'Inicios de sesión con la sesión robada (EV-0002)');
    await V('usuario', 'finanzas03@entidad.example', 'usa', 'equipo ·', '');
    await V('equipo', 'PC-FIN-03', 'se conecta a', 'dominio · login-microsoft365', 'Acceso al portal a las 10:19 hora local (EV-0003)');
  });

  // --- laboratorio y metadatos ---
  await paso('2026-09-09T10:38:00Z', 'Laboratorio: decodificar el parámetro del enlace', async () => {
    irA('lb'); $('#lab-ev').value = ''; await labCargarEvidencia();
    $('#lab-in').value = 'ZmluYW56YXMwM0BlbnRpZGFkLmV4YW1wbGU='; $('#lab-op').value = 'base64-decode'; await labEjecutarUI();
    RESP['Registrar la operación'] = { motivo: 'Decodificar el parámetro «d» del enlace de EV-0001: contiene la dirección de la destinataria, así que el enlace estaba personalizado para ella.' };
    await labRegistrar();
  });
  await paso('2026-09-09T10:41:00Z', 'Leer metadatos de EV-0004', async () => {
    $('#lab-ev').value = 'EV-0004'; await labCargarEvidencia(); $('#lab-op').value = '__metadatos__'; await labEjecutarUI(); await metaRegistrar();
  });

  // --- cronología ---
  await paso('2026-09-09T10:50:00Z', 'Cronología del ataque', async () => {
    irA('cr');
    const add = async (fecha, hi, hf, zona, accion, fuente) => {
      $('#cr-fecha').value = fecha; $('#cr-hora-ini').value = hi; $('#cr-hora-fin').value = hf; $('#cr-zona').value = zona;
      $('#cr-accion').value = accion; $('#cr-fuente').value = fuente; await $('#cr-add').onclick(); };
    await add('2026-09-09', '08:13', '', 'UTC', 'Llega al buzón de finanzas03 el correo «Factura pendiente septiembre», desde proveedor-pagos.example.', 'EV-0001 · cabeceras Received');
    await add('2026-09-09', '10:19', '10:21', 'Europe/Madrid', 'PC-FIN-03 accede al portal falso login-microsoft365.secure-docs.example.', 'EV-0003 · proxy PRX-01');
    await add('2026-09-09', '08:31', '08:47', 'UTC', 'Inicios de sesión de finanzas03 desde 203.0.113.45 con MFA «satisfecha en el token»: la sesión robada se reutiliza.', 'EV-0002 · Entra ID');
    await add('2026-09-09', '09:02', '', 'UTC', 'El SOC de la entidad genera la alerta de inicio de sesión de riesgo.', 'Ticket del SOC de la entidad');
    await add('2026-09-09', '09:41', '', 'UTC', 'Nuevo intento desde 203.0.113.45: falla porque el token ya está revocado.', 'EV-0002 · Entra ID');
  });
  await paso('2026-09-09T10:58:00Z', 'Rectificar la hora de recepción del correo', async () => {
    RESP['Rectificar '] = { horaIni: '08:12', motivo: 'Error de transcripción: la cabecera Received de mx1 marca 08:12:41 UTC, no 08:13.' };
    await rectificarCrono('C-0001');
  });

  // --- ATT&CK ---
  await paso('2026-09-09T11:05:00Z', 'Técnicas ATT&CK', async () => {
    RESP['Registrar técnica observada'] = [
      { tecnica: 'T1566.002 Spearphishing Link', tactica: 'Initial Access', confianza: 'Confirmada', evidencia: 'EV-0001',
        notas: 'Correo dirigido a finanzas03 con enlace personalizado (parámetro con su dirección) a un portal falso.' },
      { tecnica: 'T1557 Adversary-in-the-Middle', tactica: 'Credential Access', confianza: 'Probable', evidencia: 'EV-0002',
        notas: 'Los inicios de sesión desde 203.0.113.45 pasan la MFA «por reclamación en el token»: compatible con un proxy inverso que roba la cookie de sesión.' },
      { tecnica: 'T1078.004 Cloud Accounts', tactica: 'Defense Evasion', confianza: 'Confirmada', evidencia: 'EV-0002',
        notas: 'Acceso a Exchange Online con la cuenta legítima de finanzas03 entre las 08:31 y las 08:47 UTC.' }];
    await attAnadir(); await attAnadir(); await attAnadir();
  });

  // --- clasificación justificada ---
  await paso('2026-09-09T11:20:00Z', 'Clasificación CCN-STIC 817 justificada', async () => {
    RESP['Clasificar el incidente · paso 1 de 2'] = { tipo: 'Phishing', origen: 'Externa', categoria: 'MEDIA', equipos: '1', esfuerzo: 'entre 1 y 10',
      dimensiones: ['Confidencialidad', 'Autenticidad'] };
    RESP['Clasificar el incidente · paso 2 de 2'] = {
      motivoPeligrosidad: 'Campaña de phishing dirigida con robo de sesión: el atacante accedió al buzón con la cuenta legítima durante unos 16 minutos.',
      motivoImpacto: 'Un solo usuario y un sistema de categoría MEDIA. Sin indicios de exfiltración; resolución estimada en menos de 10 jornadas-persona.' };
    await clasificar();
  });
  await paso('2026-09-09T11:24:00Z', 'Clasificación RSIT', async () => {
    RESP['Clasificar según RSIT'] = { tipo: 'Phishing', motivo: 'Suplantación de un servicio legítimo para obtener credenciales de la víctima.' };
    await clasificarRsit();
  });

  // --- notas y preguntas ---
  await paso('2026-09-09T11:40:00Z', 'Nota de la llamada con la entidad', async () => {
    irA('no');
    $('#nota-borrador').value = 'Llamada con el responsable de TI de la entidad (11:30 hora local). Confirman que finanzas03 introdujo la contraseña y aprobó la MFA en el portal. Preguntan si otros usuarios del departamento recibieron el correo. Piden informe preliminar el viernes.';
    RESP['Guardar nota'] = { titulo: 'Llamada con el responsable de TI de la entidad' };
    await notaGuardar();
  });
  await paso('2026-09-09T11:43:00Z', 'Pasar la nota a pregunta abierta', async () => {
    RESP['Pasar a pregunta abierta'] = { pregunta: '¿Recibieron el mismo correo otros usuarios del departamento financiero?', dirigidaA: 'Administrador de correo de la entidad' };
    await notaPasarA('N-0001', 'pregunta');
  });
  await paso('2026-09-09T11:46:00Z', 'Iniciar el bloqueo de indicadores', async () => { await hitoIniciar(hitoPorTexto('Documentar retirada')); });
  await paso('2026-09-09T11:52:00Z', 'Responder preguntas de la plantilla', async () => {
    const pr = (t) => EST.pr.find((x) => x.pregunta.startsWith(t)).id;
    RESP['Responder pregunta'] = [
      { respuesta: 'Sí: abrió el enlace a las 10:19 hora local desde PC-FIN-03.', fuente: 'EV-0003 · proxy PRX-01' },
      { respuesta: 'Sí: introdujo la contraseña y aprobó la MFA. Confirmado por la usuaria en llamada.', fuente: 'Nota N-0001 y EV-0002' }];
    await responder(pr('¿Se abrió un enlace')); await responder(pr('¿Se introdujeron credenciales'));
  });

  /* =============== 10 de septiembre =============== */
  await paso('2026-09-10T07:40:00Z', 'Seguimiento del bloqueo', async () => {
    soy('Ana Martín');
    RESP['Anotar seguimiento'] = { texto: 'Bloqueados *.secure-docs.example y 203.0.113.45 en el proxy (reglas 113 y 114). Pendiente de que la entidad retire el correo del resto de buzones.' };
    await hitoSeguimiento(hitoPorTexto('Documentar retirada'));
  });
  await paso('2026-09-10T08:05:00Z', 'Transferir EV-0001 al laboratorio', async (h) => {
    irA('ev'); transferirEv('EV-0001');
    $('#tr-a').value = 'Luis Ortega (laboratorio de análisis)'; $('#tr-medio').value = 'Transferencia cifrada (SFTP, enlace seguro)';
    $('#tr-hash').value = h; $('#tr-motivo').value = 'Análisis del enlace en entorno aislado para identificar el kit de phishing.';
    $('#tr-obs').value = 'Se entrega una copia idéntica; el original permanece en el expediente.';
    await $('#tr-guardar').onclick();
  }, sha256('Factura_pendiente_septiembre.eml'));
  await paso('2026-09-10T08:20:00Z', 'Luis Ortega verifica EV-0001 al recibirla', async () => { soy('Luis Ortega'); await verificarEv('EV-0001'); });
  await paso('2026-09-10T10:30:00Z', 'Seguimiento del análisis del enlace', async () => {
    RESP['Anotar seguimiento'] = { texto: 'En entorno aislado, el enlace carga un proxy inverso que reenvía el inicio de sesión real y captura la cookie de sesión. Compatible con T1557.' };
    await hitoSeguimiento(hitoPorTexto('Revisar identidad'));
  });
  await paso('2026-09-10T10:45:00Z', 'Finalizar la revisión del correo', async () => {
    RESP['Finalizar hito'] = { resultado: 'SPF y DMARC fallan; Return-Path y Reply-To de dominios distintos; enlace personalizado a un proxy inverso. IOCs valorados en el repositorio.' };
    await hitoFinalizar(hitoPorTexto('Revisar identidad'));
  });
  await paso('2026-09-10T11:10:00Z', 'Clasificación CISA', async () => {
    RESP['Valorar según el esquema de CISA'] = { vector: 'Email/Phishing', ubicacion: 'LEVEL 2 - BUSINESS NETWORK', funcional: 'NO IMPACT TO SERVICES', informacion: ['SUSPECTED BUT NOT IDENTIFIED'], recuperacion: 'REGULAR',
      sistemas: 'Buzón de finanzas03 (Exchange Online)', motivo: 'Acceso al buzón sin impacto en servicios. No se ha podido descartar la lectura de correos durante los 16 minutos de acceso.' };
    await clasificarNist();
  });
  await paso('2026-09-10T14:00:00Z', 'Proteger las evidencias pendientes', async () => {
    soy('Ana Martín'); RESP['Anotar la protección'] = { metodo: 'Explorador de Windows' }; await confirmarProteccion(false);
  });
  await paso('2026-09-10T14:20:00Z', 'Bloquear el cierre del bloqueo a la espera de la entidad', async () => {
    RESP['Bloquear hito'] = { motivo: 'La retirada del correo de los demás buzones depende del administrador de correo de la entidad; pedida el 10/09 a las 16:15 hora local.' };
    await hitoBloquear(hitoPorTexto('Documentar retirada'));
  });
  await paso('2026-09-10T15:30:00Z', 'Generar el sello externo', async () => {
    window.SELLO = {}; const b = bajar; window.bajar = (n, c) => { SELLO[n] = c; }; await generarSelloExterno(); window.bajar = b;
  });

  /* =============== 11 de septiembre =============== */
  await paso('2026-09-11T07:30:00Z', 'Reanudar el bloqueo y finalizarlo con la captura de las reglas', async (b) => {
    await hitoReanudar(hitoPorTexto('Documentar retirada'));
    RESP['Finalizar hito'] = { resultado: 'La entidad confirma la retirada del correo de 3 buzones. Reglas 113 y 114 del proxy activas; última prueba denegada a las 11:46 del 09/09.',
      pruebas: [fichero(b, 'bloqueo_proxy_regla_113.png', 'image/png', Date.parse('2026-09-09T09:47:00Z'))] };
    await hitoFinalizar(hitoPorTexto('Documentar retirada'));
  }, ev.prueba);
  await paso('2026-09-11T07:45:00Z', 'Reabrir el caso: verificación automática', async () => {
    const h = dirCaso; await engancharCaso(h);
    for (let i = 0; i < 100 && !(VERIF && VERIF.fase === 'hecha'); i++) await new Promise((r) => setTimeout(r, 100));
    if (!VERIF || VERIF.fase !== 'hecha') throw new Error('la verificación automática no terminó');
  });

  // --- extraer la carpeta del caso y el sello ---
  const r = await p.evaluate(async () => {
    const out = {};
    const leer = async (dir, pre) => {
      for await (const [n, h] of dir.entries()) {
        if (h.kind === 'directory') await leer(h, pre + n + '/');
        else { const f = await h.getFile(); const b = new Uint8Array(await f.arrayBuffer()); let s = '';
          for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
          out[pre + n] = btoa(s); }
      }
    };
    await leer(dirCaso, '');
    const c = verificarCadena();
    return { ficheros: out, sello: SELLO, asientos: ASIENTOS.length, integra: c.integra, log: LOGD, verif: VERIF && { total: VERIF.total, disc: VERIF.discrepancias } };
  });
  if (errores.length) throw new Error('Errores de la página: ' + errores.join(' | '));
  fs.rmSync(path.join(DESTINO, CASO), { recursive: true, force: true });
  fs.rmSync(path.join(DESTINO, 'sello-externo'), { recursive: true, force: true });
  for (const [ruta, datos] of Object.entries(r.ficheros)) {
    const f = path.join(DESTINO, CASO, ruta); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(datos, 'base64'));
  }
  fs.mkdirSync(path.join(DESTINO, 'sello-externo'), { recursive: true });
  for (const [n, c] of Object.entries(r.sello)) fs.writeFileSync(path.join(DESTINO, 'sello-externo', n), c);
  // datos-base.json con las listas del escenario
  const db = path.join(DESTINO, CASO, 'datos-base.json');
  const datos = JSON.parse(fs.readFileSync(db, 'utf8'));
  Object.assign(datos, { organizacion: 'CSIRT de ejemplo', analistas: ['Ana Martín', 'Luis Ortega'], clientes: ['Entidad Ejemplo S.A.'] });
  fs.writeFileSync(db, JSON.stringify(datos, null, 2) + '\n');
  console.log(JSON.stringify({ asientos: r.asientos, integra: r.integra, verif: r.verif, ficheros: Object.keys(r.ficheros), sello: Object.keys(r.sello) }, null, 1));
  console.log(r.log.filter((x) => x.startsWith('alert')).join('\n'));
  await navegador.close();
})().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
