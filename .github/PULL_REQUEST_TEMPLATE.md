## Qué cambia y por qué

## Checklist

- [ ] `node build.js` termina sin errores.
- [ ] El autodiagnóstico interno de la app (menú → Autodiagnóstico) pasa
  sin fallos nuevos sobre `tracelock.html` reconstruido.
- [ ] No he editado `tracelock.html` directamente — solo `src/`.
- [ ] Si añado un módulo nuevo en `src/js/`, lo he colocado en la posición
  correcta de `src/js/manifest.json` (ver `CONTRIBUTING.md` sobre orden
  de dependencias entre módulos).
- [ ] He añadido una entrada nueva en `CHANGELOG.md`.
- [ ] Si el cambio afecta a algo descrito en `THREAT_MODEL.md`
  (integridad, trazabilidad, identidad, concurrencia, confidencialidad), he
  actualizado ese documento en el mismo PR.
