# TraceLock · Copyright (c) 2026 Xavier Dobon
# SPDX-License-Identifier: Apache-2.0
"""Crea las evidencias de texto del caso de ejemplo en ./fuente (datos ficticios, deterministas)."""
import base64, random, datetime, os
os.makedirs(os.path.join(os.path.dirname(__file__), 'fuente'), exist_ok=True)
os.chdir(os.path.join(os.path.dirname(__file__), 'fuente'))
random.seed(20260909)
CRLF = '\r\n'
# ---------- EV-0001: correo de phishing (.eml) ----------
b64param = base64.b64encode(b'finanzas03@entidad.example').decode()
url = f'https://login-microsoft365.secure-docs.example/auth/factura?d={b64param}'
html = f'''<html><body style="font-family:Segoe UI,Arial,sans-serif">
<p>Estimado cliente:</p>
<p>Tiene una factura pendiente correspondiente al mes de septiembre por importe de 1.482,60 EUR.
Para evitar la suspensión del servicio, revise el documento antes de las 18:00 de hoy.</p>
<p><a href="{url}">https://portal.office.example/facturas/2026-09</a></p>
<p>Atentamente,<br>Departamento de Facturación</p>
<img src="https://img.secure-docs.example/t.gif?id=8841" width="1" height="1">
</body></html>'''
texto = f'''Estimado cliente:

Tiene una factura pendiente correspondiente al mes de septiembre por importe de 1.482,60 EUR.
Para evitar la suspensión del servicio, revise el documento antes de las 18:00 de hoy:

{url}

Atentamente,
Departamento de Facturación'''
cuerpo_html = base64.b64encode(html.encode()).decode()
eml = CRLF.join([
    'Return-Path: <bounce-7731@proveedor-pagos.example>',
    'Received: from mx1.entidad.example (10.10.0.25) by exch01.entidad.local (10.10.0.40)',
    ' with Microsoft SMTP Server id 15.2.1544.9; Wed, 9 Sep 2026 08:12:41 +0000',
    'Received: from mail.proveedor-pagos.example (198.51.100.23) by mx1.entidad.example (10.10.0.25)',
    ' with ESMTP id 4Qx7Lm2vKz; Wed, 9 Sep 2026 08:12:39 +0000',
    'Authentication-Results: mx1.entidad.example; spf=fail smtp.mailfrom=proveedor-pagos.example;',
    ' dkim=none; dmarc=fail action=none header.from=proveedor-pagos.example',
    'From: "Microsoft 365 Facturacion" <facturacion@proveedor-pagos.example>',
    'Reply-To: soporte-cobros@correo-rapido.example',
    'To: finanzas03@entidad.example',
    'Subject: Factura pendiente septiembre - accion requerida',
    'Date: Wed, 9 Sep 2026 08:12:30 +0000',
    'Message-ID: <20260909081230.7731@proveedor-pagos.example>',
    'X-Mailer: PHPMailer 6.8.1',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="=_fact_0909"',
    '',
    '--=_fact_0909',
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    texto.replace('\n', CRLF),
    '',
    '--=_fact_0909',
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    CRLF.join(cuerpo_html[i:i + 76] for i in range(0, len(cuerpo_html), 76)),
    '',
    '--=_fact_0909--', ''])
open('Factura_pendiente_septiembre.eml', 'wb').write(eml.encode('utf-8'))

# ---------- EV-0002: inicios de sesión exportados de Entra ID (UTC) ----------
filas = ['CreatedDateTime (UTC),UserPrincipalName,AppDisplayName,IPAddress,Location,Status,MfaDetail,ClientAppUsed,UserAgent,CorrelationId']
ua_ok = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0'
ua_mal = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36'
def cid():
    return '%08x-%04x-%04x-%04x-%012x' % (random.getrandbits(32), random.getrandbits(16), random.getrandbits(16), random.getrandbits(16), random.getrandbits(48))
t = datetime.datetime(2026, 9, 8, 6, 40)
usuarios = ['finanzas01@entidad.example', 'finanzas02@entidad.example', 'finanzas03@entidad.example', 'rrhh02@entidad.example', 'direccion@entidad.example']
apps = ['Office 365 Exchange Online', 'Microsoft Teams', 'OfficeHome', 'SharePoint Online']
eventos = []
while t < datetime.datetime(2026, 9, 9, 9, 50):
    t += datetime.timedelta(minutes=random.randint(9, 47))
    if t.hour < 6 or t.hour > 18:
        continue
    eventos.append((t, random.choice(usuarios), random.choice(apps), '192.0.2.10', 'Madrid, ES', 'Success', 'MFA completed in Azure AD', 'Browser', ua_ok))
eventos += [
    (datetime.datetime(2026, 9, 9, 8, 31, 7), 'finanzas03@entidad.example', 'OfficeHome', '203.0.113.45', 'Amsterdam, NL', 'Success', 'Previously satisfied (claim in the token)', 'Browser', ua_mal),
    (datetime.datetime(2026, 9, 9, 8, 33, 52), 'finanzas03@entidad.example', 'Office 365 Exchange Online', '203.0.113.45', 'Amsterdam, NL', 'Success', 'Previously satisfied (claim in the token)', 'Browser', ua_mal),
    (datetime.datetime(2026, 9, 9, 8, 47, 15), 'finanzas03@entidad.example', 'Office 365 Exchange Online', '203.0.113.45', 'Amsterdam, NL', 'Success', 'Previously satisfied (claim in the token)', 'Browser', ua_mal),
    (datetime.datetime(2026, 9, 9, 9, 41, 30), 'finanzas03@entidad.example', 'Office 365 Exchange Online', '203.0.113.45', 'Amsterdam, NL', 'Failure: 50173 (token revoked)', '', 'Browser', ua_mal),
    (datetime.datetime(2026, 9, 9, 9, 44, 2), 'finanzas03@entidad.example', 'OfficeHome', '192.0.2.10', 'Madrid, ES', 'Success', 'MFA completed in Azure AD', 'Browser', ua_ok)]
for e in sorted(eventos):
    filas.append(','.join([e[0].strftime('%Y-%m-%dT%H:%M:%SZ'), e[1], e[2], e[3], '"' + e[4] + '"', e[5], e[6], e[7], '"' + e[8] + '"', cid()]))
open('signin-logs-entra-id.csv', 'wb').write(('\n'.join(filas) + '\n').encode())

# ---------- EV-0003: log del proxy (hora local, Europe/Madrid) ----------
dom = ['www.example.com', 'intranet.entidad.example', 'cdn.example.net', 'erp.entidad.example', 'outlook.office.example',
       'teams.office.example', 'noticias.example.org', 'banco.example.com', 'sharepoint.office.example', 'update.example.net']
lineas = []
t = datetime.datetime(2026, 9, 9, 9, 55, 0)
while t < datetime.datetime(2026, 9, 9, 11, 50, 0):
    t += datetime.timedelta(seconds=random.randint(3, 40))
    lineas.append(f'{t:%Y-%m-%d %H:%M:%S} 10.10.20.33 PC-FIN-03 finanzas03 CONNECT {random.choice(dom)}:443 200 {random.randint(900, 48000)} TCP_TUNNEL "{ua_ok}"')
lineas += [f'2026-09-09 10:19:12 10.10.20.33 PC-FIN-03 finanzas03 CONNECT login-microsoft365.secure-docs.example:443 200 38211 TCP_TUNNEL "{ua_ok}"',
           f'2026-09-09 10:19:13 10.10.20.33 PC-FIN-03 finanzas03 CONNECT img.secure-docs.example:443 200 412 TCP_TUNNEL "{ua_ok}"',
           f'2026-09-09 10:20:41 10.10.20.33 PC-FIN-03 finanzas03 CONNECT login-microsoft365.secure-docs.example:443 200 5120 TCP_TUNNEL "{ua_ok}"',
           f'2026-09-09 11:46:05 10.10.20.33 PC-FIN-03 finanzas03 CONNECT login-microsoft365.secure-docs.example:443 403 0 TCP_DENIED "{ua_ok}"']
lineas.sort()
open('proxy_2026-09-09.log', 'wb').write(('\n'.join(lineas) + '\n').encode())
print('Evidencias de texto creadas en', os.getcwd())
