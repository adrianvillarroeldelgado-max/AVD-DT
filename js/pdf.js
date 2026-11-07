'use strict';
/*
  Descarga en PDF de cualquier trabajo (ficha, sesión, plan, mesociclo, microciclo, evaluación,
  plantel, táctica con todos sus pasos, ejercicios de la biblioteca).
  Sin librerías externas: el documento se maqueta en HTML con los estilos .prt, se rasteriza
  página a página (SVG foreignObject → canvas) y se empaqueta en un PDF A4 con imágenes JPEG.
  Si el navegador no lo permite, se usa la impresión del sistema («Guardar como PDF»).
*/
const PRINT_CSS = `
.prt{color:#1c1c1d;background:#fff;font:10pt/1.42 'Barlow',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;text-align:left}
.prt *{box-sizing:border-box}
.prt h1,.prt h2,.prt h3{font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif}
.prt .pt-brand{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;border-bottom:4px solid #0B1F3A;padding-bottom:6px;margin-bottom:10px}
.prt .pt-brand img{height:40px;width:auto;display:block}
.prt .pt-brand span{font:italic 700 9pt/1.2 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5d5d5f;text-align:right}
.prt .pt-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #0B1F3A;padding-bottom:6px;margin-bottom:8px}
.prt .pt-head h1{margin:0;font-size:20pt;line-height:1.05;font-style:italic;font-weight:800;text-transform:uppercase;color:#0B1F3A}
.prt .pt-head p{margin:3px 0 0;color:#5d5d5f}
.prt .pt-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:13pt;white-space:nowrap}
.prt .pt-meta small{font-size:9pt;color:#5d5d5f}
.prt h2{font-size:13pt;margin:12px 0 6px;padding:3px 8px;background:#EDEDED;border-left:4px solid #FF5A1F;font-style:italic;font-weight:800;text-transform:uppercase;color:#0B1F3A}
.prt h2 small{font-weight:600;color:#5d5d5f;margin-left:6px;text-transform:none;font-style:normal}
.prt .pt-obj{margin:6px 0}
.prt .pt-task{border:1px solid #CFCFD2;border-radius:6px;padding:8px;margin:0 0 8px;background:#fff}
.prt .pt-task h3{margin:0 0 6px;font-size:13.5pt;display:flex;justify-content:space-between;gap:8px;color:#0B1F3A;font-style:italic;font-weight:800}
.prt .pt-task h3 small{font-weight:600;color:#5d5d5f;font-style:normal;font-family:'Barlow',Arial,sans-serif;font-size:9pt;text-align:right}
.prt .pgrid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #9a9aa0;border-radius:4px;overflow:hidden}
.prt .pc{border:1px solid #CFCFD2;margin:-1px 0 0 -1px;padding:4px 6px;min-height:28px}
.prt .pc>span{display:block;font:italic 700 8pt/1.3 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#0B1F3A}
.prt .pc>div{font-size:9.5pt}
.prt .pc.c2{grid-column:span 2}
.prt .pc.c4{grid-column:span 4}
.prt .pdesc{display:grid;grid-template-columns:55% 1fr;gap:8px;align-items:start}
.prt .pdesc img{width:100%;border-radius:3px;display:block}
.prt .pdesc p{margin:4px 0}
.prt .pt-table{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:9.5pt}
.prt .pt-table th,.prt .pt-table td{border:1px solid #9a9aa0;padding:4px 6px;vertical-align:top;text-align:left}
.prt .pt-table th{background:#0B1F3A;color:#fff;font:italic 700 9.5pt/1.3 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase}
.prt .pt-table th small{color:#dfe5ee;text-transform:none}
.prt .pt-table tr:nth-child(even) td{background:#F6F6F7}
.prt small{font-size:8.5pt;color:#5d5d5f}
.prt .mdchip,.prt .stagechip{display:inline-block;font-size:9pt;font-weight:800;padding:1px 8px;border-radius:999px;color:#111}
.prt .st-EGO1{background:#ffcc80}.prt .st-EGO2{background:#fff176}.prt .st-SUMA1{background:#a5d6a7}.prt .st-SUMA2{background:#80deea}
.prt .pt-steps{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 10px}
.prt .pt-steps figure{margin:0;border:1px solid #CFCFD2;border-radius:4px;padding:4px}
.prt .pt-steps img{width:100%;display:block;border-radius:3px}
.prt .pt-steps figcaption{font-size:8.5pt;color:#5d5d5f;padding-top:2px}
.prt .pt-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}
.prt .stats{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}
.prt .stat{border:1px solid #CFCFD2;border-radius:6px;padding:5px 10px;display:flex;flex-direction:column;min-width:90px;flex:1}
.prt .stat b{font:italic 800 15pt/1.1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;color:#0B1F3A}
.prt .stat span{font-size:8.5pt;color:#5d5d5f}
.prt svg{color:#1c1c1d}
.prt .reschip{display:inline-block;width:16px;text-align:center;border-radius:3px;color:#fff;font-weight:800}.prt .res-G{background:#2F8F5B}.prt .res-E{background:#9a9aa0}.prt .res-P{background:#C62828}
.prt .pt-foot{margin-top:10px;font-size:8.5pt;color:#777;text-align:right}
`;
(function injectPrintCSS() { const st = document.createElement('style'); st.id = 'prtCss'; st.textContent = PRINT_CSS; document.head.appendChild(st); })();

/* ---------- Recursos para el documento: logo y fuentes incrustadas ---------- */
let PDF_LOGO = null, PDF_FONTS = null;
async function pdfLogo() {
  if (PDF_LOGO) return PDF_LOGO;
  const img = document.querySelector('img.lg');
  try {
    if (img && img.src.startsWith('data:')) return (PDF_LOGO = img.src);
    if (img && !img.complete) await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0); PDF_LOGO = c.toDataURL('image/png');
  } catch (e) { PDF_LOGO = ''; }
  return PDF_LOGO;
}
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
async function pdfFonts() {
  if (PDF_FONTS !== null) return PDF_FONTS;
  PDF_FONTS = '';
  try {
    const link = [...document.querySelectorAll('link[rel=stylesheet]')].find(l => l.href.includes('fonts.googleapis'));
    if (!link) return '';
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 4000);
    let css = await (await fetch(link.href, { signal: ctl.signal })).text();
    // solo los subconjuntos latinos para no inflar el documento
    const blocks = css.split('@font-face').slice(1).filter(b => /U\+0000-00FF/.test(b)).map(b => '@font-face' + b.slice(0, b.indexOf('}') + 1));
    const out = [];
    for (const b of blocks) {
      const m = b.match(/url\((https:[^)]+)\)/); if (!m) continue;
      const data = await blobToDataURL(await (await fetch(m[1], { signal: ctl.signal })).blob());
      out.push(b.replace(m[1], data));
    }
    clearTimeout(to); PDF_FONTS = out.join('\n');
  } catch (e) { PDF_FONTS = ''; }
  return PDF_FONTS;
}

/* ---------- Maquetación y rasterizado ---------- */
const PDF_W = { p: 720, l: 1060 };            // ancho del contenido en px CSS
const PDF_RATIO = { p: 273 / 186, l: 186 / 273 }; // alto/ancho útil de A4 con márgenes de 12 mm
function pdfDocHTML(html, logo) {
  return `<div class="pt-brand">${logo ? `<img src="${logo}" alt="AVD">` : '<b>AVD</b>'}<span>D.T Fútbol · Pizarra Táctica<br>${esc(new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div>${html}`;
}
function pdfBreaks(box, H, PH) {
  const top0 = box.getBoundingClientRect().top;
  const atoms = [...box.querySelectorAll('article,tr,.pc,p,li,h2,h3,img,header,figure,.pt-avoid,.pt-brand')].map(e => { const r = e.getBoundingClientRect(); return [r.top - top0, r.bottom - top0, e.tagName]; }).filter(a => a[1] - a[0] < PH * .92);
  const cands = [...new Set(atoms.map(a => Math.floor(a[0])))].sort((a, b) => a - b);
  const pages = []; let y = 0;
  while (y < H - 2) {
    const lim = y + PH; if (lim >= H) { pages.push([y, H]); break; }
    let best = null;
    for (const c of cands) {
      if (c <= y + PH * .25 || c > lim) continue;
      if (atoms.some(a => a[0] < c - 1 && a[1] > c + 1)) continue;
      best = c;
    }
    // un título no se queda solo al final de la página
    if (best !== null) { const h2 = atoms.find(a => a[2] === 'H2' && a[1] <= best + 1 && a[1] > best - 40); if (h2 && h2[0] > y + PH * .25) best = Math.floor(h2[0]); }
    const end = best ?? lim; pages.push([y, end]); y = end;
  }
  return pages;
}
const PDF_SAFARI = /^((?!chrome|chromium|crios|android|edg).)*safari/i.test(navigator.userAgent);
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function renderPages(html, orient = 'p') {
  const W = PDF_W[orient], PH = Math.floor(W * PDF_RATIO[orient]), S = 2;
  const [logo, fonts] = await Promise.all([pdfLogo(), pdfFonts()]);
  const box = document.createElement('div'); box.className = 'prt';
  box.style.cssText = `position:fixed;left:-20000px;top:0;width:${W}px;`;
  box.innerHTML = pdfDocHTML(html, logo); document.body.appendChild(box);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const H = Math.ceil(box.scrollHeight), ranges = pdfBreaks(box, H, PH);
    const clone = box.cloneNode(true); clone.removeAttribute('style'); clone.style.width = W + 'px';
    const xhtml = new XMLSerializer().serializeToString(clone);
    const pages = [];
    for (const [a, b] of ranges) {
      const h = Math.max(1, b - a);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${h * S}" viewBox="0 ${a} ${W} ${h}"><foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml"><style>${fonts}${PRINT_CSS}</style>${xhtml}</div></foreignObject></svg>`;
      const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      const c = document.createElement('canvas'); c.width = W * S; c.height = PH * S;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      // Safari a veces pinta en blanco las imágenes internas la primera vez: se dibuja dos veces
      if (PDF_SAFARI) { x.drawImage(img, 0, 0, W * S, h * S); await new Promise(r => setTimeout(r, 150)); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(img, 0, 0, W * S, h * S);
      c.toDataURL('image/jpeg', .5); // comprueba que el lienzo no quede bloqueado
      pages.push(c);
    }
    return { pages, W, PH, orient };
  } finally { box.remove(); }
}

/* ---------- Escritor PDF mínimo (A4, una imagen JPEG por página) ---------- */
function pdfLatin(s) { return Uint8Array.from(s, ch => { const c = ch.charCodeAt(0); return c < 256 ? c : 63; }); }
function pdfStr(s) { return '(' + s.replace(/[\\()]/g, m => '\\' + m).replace(/[–—]/g, '-').replace(/[·]/g, '\xb7') + ')'; }
function buildPDF(pages, title, orient) {
  const PW = orient === 'l' ? 841.89 : 595.28, PHt = orient === 'l' ? 595.28 : 841.89, M = 34.02;
  const chunks = [], offs = []; let len = 0;
  const put = x => { const b = typeof x === 'string' ? pdfLatin(x) : x; chunks.push(b); len += b.length; };
  const n = pages.length, firstPage = 5; // 1 catálogo, 2 páginas, 3 fuente, 4 info
  const obj = (i, body) => { offs[i] = len; put(`${i} 0 obj\n`); body(); put('\nendobj\n'); };
  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => put(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${firstPage + i * 3} 0 R`).join(' ')}] >>`));
  obj(3, () => put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  obj(4, () => put(`<< /Title ${pdfStr(title)} /Author (AVD D.T F\xfatbol) /Creator (Pizarra T\xe1ctica) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}) >>`));
  const date = new Date().toLocaleDateString('es');
  pages.forEach((pg, i) => {
    const pi = firstPage + i * 3, ci = pi + 1, ii = pi + 2;
    const dw = PW - 2 * M, dh = dw * pg.h / pg.w;
    const foot = `AVD \xb7 D.T F\xfatbol \xb7 ${title} \xb7 ${date}`, num = `${i + 1} / ${n}`;
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${M.toFixed(2)} ${(PHt - M - dh).toFixed(2)} cm /Im0 Do Q\n` +
      `BT /F1 7.5 Tf 0.36 0.36 0.37 rg ${M.toFixed(2)} 16 Td ${pdfStr(foot.length > 110 ? foot.slice(0, 108) + '...' : foot)} Tj ET\n` +
      `BT /F1 7.5 Tf 0.36 0.36 0.37 rg ${(PW - M - 26).toFixed(2)} 16 Td ${pdfStr(num)} Tj ET\n` +
      `q 0.043 0.122 0.227 rg ${M.toFixed(2)} 26 ${dw.toFixed(2)} 0.8 re f Q`;
    obj(pi, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PHt}] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 ${ii} 0 R >> >> /Contents ${ci} 0 R >>`));
    obj(ci, () => { put(`<< /Length ${content.length} >>\nstream\n`); put(content); put('\nendstream'); });
    obj(ii, () => { put(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpg.length} >>\nstream\n`); put(pg.jpg); put('\nendstream'); });
  });
  const total = firstPage + n * 3, xref = len;
  put(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) put(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  put(`trailer\n<< /Size ${total} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}
function canvasJPEG(c) {
  const d = c.toDataURL('image/jpeg', .9), bin = atob(d.slice(d.indexOf(',') + 1)), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return { jpg: u, w: c.width, h: c.height };
}
/* Recorta el blanco sobrante de la última página para que el PDF no lleve medio folio vacío */
async function makePDF(html, title, orient) {
  const r = await renderPages(html, orient);
  return { blob: buildPDF(r.pages.map(canvasJPEG), title, orient), pages: r.pages };
}
const pdfFileName = t => (t || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60).toLowerCase() + '.pdf';

/* ---------- Diálogo: vista previa, descargar, imprimir, compartir ---------- */
let pdfJob = null;
function printNativeWrap(html) {
  $('#printArea').innerHTML = html + `<footer class="pt-foot">AVD · D.T Fútbol · Pizarra Táctica · ${new Date().toLocaleDateString('es')}</footer>`;
  setTimeout(() => { try { window.print(); } catch (e) { toast('La impresión no está disponible aquí'); } }, 300);
}
/* Punto de entrada usado por toda la app */
function printHTML(html, opts = {}) {
  const orient = opts.landscape ? 'l' : 'p', title = opts.title || ((html.match(/<h1>(.*?)<\/h1>/) || html.match(/<h3>(.*?)<small>/) || [])[1] || 'Documento').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  pdfJob = { html, title, orient, blob: null, seq: (pdfJob ? pdfJob.seq : 0) + 1 };
  $('#pdfTitle').textContent = 'PDF · ' + title; $('#pdfOrient').value = orient;
  if (!$('#dlgPdf').open) $('#dlgPdf').showModal();
  pdfRun();
}
async function pdfRun() {
  const job = pdfJob, seq = job.seq; job.blob = null;
  $('#pdfDl').disabled = true; $('#pdfShare').hidden = true; $('#pdfInfo').textContent = 'Preparando el PDF…';
  $('#pdfPages').innerHTML = '<div class="pdfwait">Maquetando las páginas…</div>';
  try {
    const { blob, pages } = await makePDF(job.html, job.title, job.orient);
    if (seq !== pdfJob.seq) return;
    job.blob = blob; job.file = pdfFileName(job.title);
    const P = $('#pdfPages'); P.innerHTML = ''; pages.forEach(c => P.appendChild(c));
    $('#pdfInfo').textContent = `${pages.length} página${pages.length > 1 ? 's' : ''} A4 · ${Math.max(1, Math.round(blob.size / 1024))} KB · ${job.file}`;
    $('#pdfDl').disabled = false;
    try { $('#pdfShare').hidden = !(navigator.canShare && navigator.canShare({ files: [new File([blob], job.file, { type: 'application/pdf' })] })); } catch (e) {}
  } catch (e) {
    console.warn('PDF', e);
    if (seq !== pdfJob.seq) return;
    $('#pdfPages').innerHTML = '<div class="pdfwait">Este navegador no permite crear el PDF directamente. Usa «🖨 Imprimir» y elige «Guardar como PDF».</div>';
    $('#pdfInfo').textContent = 'PDF directo no disponible';
  }
}
async function pdfDownload(blob, name) {
  const dl = await claudeDownloads();
  if (dl) { try { await dl.save({ filename: name, data: blob }); return true; } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return false; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
  return true;
}
$('#pdfDl').onclick = async () => { if (!pdfJob || !pdfJob.blob) return; if (await pdfDownload(pdfJob.blob, pdfJob.file)) toast('PDF descargado: ' + pdfJob.file); };
$('#pdfShare').onclick = async () => { if (!pdfJob || !pdfJob.blob) return; try { await navigator.share({ files: [new File([pdfJob.blob], pdfJob.file, { type: 'application/pdf' })], title: pdfJob.title }); } catch (e) {} };
$('#pdfPrint').onclick = () => { if (!pdfJob) return; $('#dlgPdf').close(); printNativeWrap(pdfJob.html); };
$('#pdfOrient').onchange = e => { if (!pdfJob) return; pdfJob.orient = e.target.value; pdfJob.seq++; pdfRun(); };

/* ---------- Documentos adicionales ---------- */
// Táctica completa: ficha + todos los pasos
$('#exPdf').onclick = async () => {
  await saveNow(); const p = normalize(clone(P));
  const steps = p.frames.map((f, i) => `<figure><img src="${(() => { try { return thumbCanvas(p, 520, 325, i).toDataURL('image/png'); } catch (e) { return ''; } })()}" alt=""><figcaption>Paso ${i + 1} de ${p.frames.length}</figcaption></figure>`).join('');
  const h = `<header class="pt-head"><div><h1>${esc(p.name)}</h1><p>${esc(p.cat || '')}${p.task.content ? ' · ' + esc(contentLabel(p.task.content)) : ''}</p></div><div class="pt-meta"><b>${p.frames.length} paso${p.frames.length > 1 ? 's' : ''}</b></div></header>` +
    (p.notes ? `<p class="pt-obj">${nl2br(p.notes)}</p>` : '') + `<h2>Secuencia</h2><div class="pt-steps">${steps}</div><h2>Ficha de la tarea</h2>` + taskPrintHTML(p, null, true);
  $('#dlgExport').close(); printHTML(h, { title: p.name });
};
// Microciclo de la semana
$('#wkPdf').onclick = async () => {
  await loadProjectsMap();
  const from = isoDate(weekStart), to = isoDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6));
  const ses = (await DB.all('sessions')).map(normSession).filter(s => s.date >= from && s.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const totMin = ses.reduce((a, s) => a + sessionTotal(s), 0), totLoad = ses.reduce((a, s) => a + sessionLoad(s), 0);
  let h = `<header class="pt-head"><div><h1>Microciclo</h1><p>Semana del ${esc(parseDate(from).toLocaleDateString('es', { day: 'numeric', month: 'long' }))} al ${esc(parseDate(to).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }))}</p></div><div class="pt-meta"><b>${totMin} min</b>${totLoad ? `<small>${totLoad} UA previstas</small>` : ''}</div></header>`;
  h += '<table class="pt-table"><thead><tr><th>Día</th><th>Sesión</th><th>MD</th><th>Contenido principal</th><th>Tareas</th><th>Min</th><th>Carga</th></tr></thead><tbody>' +
    (ses.length ? ses.map(s => `<tr><td><b>${esc(parseDate(s.date).toLocaleDateString('es', { weekday: 'long', day: 'numeric' }))}</b></td><td>${esc(s.name)}${s.objective ? `<br><small>${esc(s.objective)}</small>` : ''}</td><td>${mdChip(s.md)}</td><td>${esc(contentLabel(s.phases.p1.content))}${s.phases.p1.consigna ? `<br><small>${esc(s.phases.p1.consigna)}</small>` : ''}</td><td>${s.items.length}</td><td>${sessionTotal(s)}</td><td>${sessionLoad(s) || '–'}</td></tr>`).join('') : '<tr><td colspan="7">Sin sesiones esta semana.</td></tr>') + '</tbody></table>';
  ses.forEach(s => { h += `<h2>${esc(s.name)} <small>${esc(fmtDate(s.date))}</small></h2>` + sessionPrintHTML(s).replace(/<header class="pt-head">[\s\S]*?<\/header>/, ''); });
  printHTML(h, { title: 'Microciclo ' + from });
};
// Evaluaciones
$('#evPdf').onclick = async () => {
  const teams = (await DB.all('evals')).filter(e => e.type === 'team').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const cf = $('#evCat').value, list = Object.values(SQUAD).filter(p => !cf || p.cat === cf).sort((a, b) => (+a.dorsal || 99) - (+b.dorsal || 99));
  let h = `<header class="pt-head"><div><h1>Evaluación · test ludológico</h1><p>${cf ? esc(cf) + ' · ' : ''}Nivel de comprensión del juego</p></div></header><h2>Tests de equipo</h2>`;
  h += '<table class="pt-table"><thead><tr><th>Fecha</th><th>Categoría</th><th>Ofensiva</th><th>Defensiva</th><th>Resultado</th><th>Notas</th></tr></thead><tbody>' +
    (teams.length ? teams.map(t => { const f = ludoFinal(t.of, t.def); return `<tr><td>${esc(fmtDate(t.date))}</td><td>${esc(t.cat || '')}</td><td>${t.of ? STAGE[t.of] : '—'}</td><td>${t.def ? STAGE[t.def] : '—'}</td><td>${f.repeat ? 'Repetir el test' : stageChip(f.stage)}</td><td>${esc(t.notes || '')}</td></tr>`; }).join('') : '<tr><td colspan="6">Sin tests de equipo.</td></tr>') + '</tbody></table><h2>Tests individuales</h2>';
  h += '<table class="pt-table"><thead><tr><th>Jugador</th><th>Fecha</th><th>Con balón</th><th>Sin balón</th><th>Def. con balón</th><th>Def. sin balón</th><th>Nivel</th></tr></thead><tbody>' +
    (list.length ? list.map(p => { const e = (p.tests || [])[0] || {}; return `<tr><td><b>${esc(p.dorsal || '')}</b> ${esc(p.name)}</td><td>${e.date ? esc(parseDate(e.date).toLocaleDateString('es')) : '—'}</td>${['AB', 'ASB', 'DAB', 'DASB'].map(k => `<td>${e[k] ? STAGE[e[k]] : '—'}</td>`).join('')}<td>${e.final ? stageChip(e.final) : '—'}</td></tr>`; }).join('') : '<tr><td colspan="7">Sin jugadores en el plantel.</td></tr>') + '</tbody></table>';
  printHTML(h, { title: 'Evaluacion ' + (cf || 'equipo') });
};
// Plantel
$('#sqPdf').onclick = () => {
  const cf = $('#sqCat').value, sf = $('#sqStatus').value;
  const list = Object.values(SQUAD).filter(p => (!cf || p.cat === cf) && (!sf || (p.status || 'disponible') === sf)).sort((a, b) => (+a.dorsal || 99) - (+b.dorsal || 99));
  const st = k => STATUS[k || 'disponible'] || STATUS.disponible;
  const counts = {}; list.forEach(p => counts[p.status || 'disponible'] = (counts[p.status || 'disponible'] || 0) + 1);
  let h = `<header class="pt-head"><div><h1>Plantel</h1><p>${cf ? esc(cf) + ' · ' : ''}${list.length} jugadores · ${Object.entries(counts).map(([k, n]) => `${n} ${esc(st(k).name.toLowerCase())}`).join(' · ')}</p></div></header>`;
  h += '<table class="pt-table"><thead><tr><th>N.º</th><th>Jugador</th><th>Posición</th><th>Pie</th><th>Categoría</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>' +
    list.map(p => `<tr><td><b>${esc(p.dorsal || '')}</b></td><td>${esc(p.name)}</td><td>${esc(POS[p.pos] ? POS[p.pos].name : (p.pos || ''))}</td><td>${esc(FOOT[p.foot] || p.foot || '')}</td><td>${esc(p.cat || '')}</td><td><span class="pt-dot" style="background:${st(p.status).color}"></span>${esc(st(p.status).name)}</td><td>${esc(p.statusNote || '')}${p.back ? `<br><small>Vuelta: ${esc(parseDate(p.back).toLocaleDateString('es'))}</small>` : ''}</td></tr>`).join('') + '</tbody></table>';
  printHTML(h, { title: 'Plantel' + (cf ? ' ' + cf : '') });
};
