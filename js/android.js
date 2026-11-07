'use strict';
/*
  Integración con la app Android (envoltorio WebView). Solo actúa si existe window.AndroidBridge,
  que inyecta la app nativa; en el navegador y en GitHub Pages no hace nada.
  - Descargas (PDF, copias, videos, calendario): se guardan en la carpeta Descargas del teléfono.
  - Compartir: abre el menú de Android (WhatsApp, Drive, correo…).
  - Imprimir: usa el servicio de impresión de Android («Guardar como PDF» o una impresora).
  - Botón Atrás: cierra primero diálogos, paneles y pantallas superpuestas.
*/
(function () {
  const B = window.AndroidBridge; if (!B) return;
  document.documentElement.classList.add('android');
  const b64 = async blob => { const d = await blobToDataURL(blob); return d.slice(d.indexOf(',') + 1); };
  const mimeOf = (blob, name) => blob.type || ({ pdf: 'application/pdf', json: 'application/json', ics: 'text/calendar', png: 'image/png', mp4: 'video/mp4', webm: 'video/webm' })[(name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
  async function nativeSave(blob, name) {
    try { const r = B.saveFile(await b64(blob), name, mimeOf(blob, name)); toast(r || ('Guardado en Descargas: ' + name), 3500); return true; }
    catch (e) { toast('No se pudo guardar el archivo'); return false; }
  }
  async function nativeShare(blob, name, title) {
    try { B.shareFile(await b64(blob), name, mimeOf(blob, name), title || name); return true; } catch (e) { return nativeSave(blob, name); }
  }
  window.saveBlob = nativeSave;
  window.pdfDownload = nativeSave;
  window.printNativeWrap = function (html) {
    $('#printArea').innerHTML = html + `<footer class="pt-foot">AVD · D.T Fútbol · Pizarra Táctica · ${new Date().toLocaleDateString('es')}</footer>`;
    setTimeout(() => { try { B.print((pdfJob && pdfJob.title) || 'Pizarra Táctica'); } catch (e) { toast('La impresión no está disponible'); } }, 300);
  };
  const baseRun = window.pdfRun;
  window.pdfRun = async function () { await baseRun(); if (pdfJob && pdfJob.blob) $('#pdfShare').hidden = false; };
  $('#pdfShare').onclick = () => { if (pdfJob && pdfJob.blob) nativeShare(pdfJob.blob, pdfJob.file, pdfJob.title); };
  // Compartir una sesión: menú de Android
  if (typeof shareSession === 'function') {
    window.shareSession = async function (s) {
      await loadProjectsMap();
      const projects = s.items.map(i => sesProjects[i.pid]).filter(Boolean);
      const data = { app: 'pizarra-tactica', kind: 'session-bundle', version: 3, date: new Date().toISOString(), session: s, projects };
      nativeShare(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'sesion_' + fileName(s.name) + '.json', s.name);
    };
    $('#sesShare').onclick = () => curSes && shareSession(curSes);
  }
  // Botón Atrás de Android: devuelve true si la app lo ha gestionado
  window.__avdBack = function () {
    if (!$('#tour').hidden) { $('#tour').hidden = true; return true; }
    const dl = [...document.querySelectorAll('dialog[open]')].pop(); if (dl) { dl.close(); return true; }
    if (document.body.classList.contains('presenting')) { stopPresent(); return true; }
    if (!$('#matchMode').hidden) { $('#matchMode').hidden = true; return true; }
    if (!$('#toolPanel').hidden) { closePanel(); return true; }
    if ($('#home').hidden) { showHome(); return true; }
    return false;
  };
  // Modo presentación a pantalla completa (oculta las barras del sistema)
  if (typeof startPresent === 'function') {
    const sp = window.startPresent, ep = window.stopPresent;
    window.startPresent = async function (...a) { try { B.immersive(true); } catch (e) {} return sp.apply(this, a); };
    window.stopPresent = async function (...a) { try { B.immersive(false); } catch (e) {} return ep.apply(this, a); };
  }
  try { B.ready(document.documentElement.getAttribute('data-theme') || 'light'); } catch (e) {}
  // Avisar al teléfono del tema para colorear las barras del sistema
  new MutationObserver(() => { try { B.theme(document.documentElement.getAttribute('data-theme')); } catch (e) {} }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
