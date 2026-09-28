/* TraceLock · Copyright (c) 2026 Xavier Dobon
   SPDX-License-Identifier: Apache-2.0 */
// Crea las dos capturas ficticias del caso de ejemplo en ./fuente (maquetas HTML, sin marcas reales).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'fuente');
fs.mkdirSync(DIR, { recursive: true });
const PORTAL = `<html><head><meta charset="utf-8"><style>
body{margin:0;font-family:Arial,sans-serif;background:#dfe3e8}
.barra{background:#f3f4f6;border-bottom:1px solid #c8ccd2;padding:10px 16px;display:flex;gap:10px;align-items:center}
.pto{width:12px;height:12px;border-radius:50%;background:#c9ced6;display:inline-block}
.url{flex:1;background:#fff;border:1px solid #cfd4da;border-radius:16px;padding:7px 14px;font-size:14px;color:#333}.url b{color:#111}
.fondo{height:640px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e9edf2,#cfd8e3)}
.caja{width:420px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18);padding:40px 44px}
.caja h1{font-size:24px;font-weight:600;color:#1b1b1b;margin:0 0 6px}.caja p{color:#555;font-size:14px;margin:0 0 22px}
.in{border-bottom:1px solid #666;width:100%;font-size:15px;padding:8px 0;margin-bottom:20px;color:#777}
.btn{background:#1f5fa8;color:#fff;border:0;padding:9px 34px;font-size:15px;float:right}
.pie{clear:both;padding-top:26px;font-size:12px;color:#888}</style></head><body>
<div class="barra"><span class="pto"></span><span class="pto"></span><span class="pto"></span>
<div class="url">https://<b>login-microsoft365.secure-docs.example</b>/auth/factura?d=ZmluYW56YXMwM0BlbnRpZGFkLmV4YW1wbGU=</div></div>
<div class="fondo"><div class="caja"><h1>Inicie sesión</h1><p>para ver la factura de septiembre · Microsoft 365</p>
<div class="in">finanzas03@entidad.example</div><div class="in">Contraseña</div>
<button class="btn">Siguiente</button><div class="pie">¿No puede acceder a su cuenta?</div></div></div></body></html>`;
const PROXY = `<html><head><meta charset="utf-8"><style>
body{margin:0;font-family:Arial,sans-serif;background:#1e2430;color:#e6e9ef}
.cab{background:#2b3240;padding:14px 22px;font-size:17px;font-weight:bold;border-bottom:1px solid #3a4252}
.cab span{font-weight:normal;color:#9aa4b5;font-size:14px;margin-left:12px}.cont{padding:22px}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;color:#9aa4b5;font-weight:normal;padding:9px;border-bottom:1px solid #3a4252}
td{padding:10px 9px;border-bottom:1px solid #2f3645}.nueva td{background:#243a2f}.ok{color:#63d69a;font-weight:bold}.mono{font-family:monospace}</style></head><body>
<div class="cab">Proxy corporativo PRX-01 · Reglas de bloqueo <span>entorno ficticio de ejemplo</span></div>
<div class="cont"><table><tr><th>#</th><th>Destino</th><th>Acción</th><th>Creada (hora local)</th><th>Autor</th><th>Comentario</th></tr>
<tr><td>112</td><td class="mono">*.descargas-gratis.example</td><td>Bloquear</td><td>2026-08-21 09:14</td><td>soc</td><td>Campaña adware</td></tr>
<tr class="nueva"><td>113</td><td class="mono">*.secure-docs.example</td><td class="ok">Bloquear</td><td>2026-09-09 11:45</td><td>ana.martin</td><td>IR-2026-031 · portal de phishing</td></tr>
<tr class="nueva"><td>114</td><td class="mono">203.0.113.45</td><td class="ok">Bloquear</td><td>2026-09-09 11:45</td><td>ana.martin</td><td>IR-2026-031 · origen de inicio de sesión fraudulento</td></tr>
</table><p style="color:#9aa4b5;font-size:13px;margin-top:18px">Última prueba de la regla 113: 2026-09-09 11:46:05 · TCP_DENIED · 10.10.20.33</p></div></body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 690 } });
  await p.setContent(PORTAL); await p.screenshot({ path: path.join(DIR, 'captura_portal_falso.png') });
  await p.setViewportSize({ width: 1100, height: 300 }); await p.setContent(PROXY);
  await p.screenshot({ path: path.join(DIR, 'bloqueo_proxy_regla_113.png') });
  await b.close(); console.log('Capturas creadas en', DIR);
})();
