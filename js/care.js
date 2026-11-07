'use strict';
/*
  Cuidado de los datos y uso diario:
  - Equipo / categoría activa (filtra plantel, sesiones, partidos, carga y estadísticas).
  - Copia de seguridad completa (todas las tablas, opcionalmente videos), restauración
    combinando o reemplazando, recordatorio periódico y almacenamiento persistente.
  - Compartir una sesión con sus tareas en un archivo que otro entrenador importa.
  - Exportación a calendario (.ics) de sesiones y partidos.
  - Guía de primer uso.
*/

/* ---------- Equipo activo ---------- */
const catOk = c => !prefs.activeCat || !c || c === prefs.activeCat;
async function allCats() {
  const set = new Set(Object.values(SQUAD).map(p => p.cat).filter(Boolean));
  const [ses, mts, plans] = await Promise.all([DB.all('sessions'), DB.all('matches'), DB.all('plans')]);
  [...ses, ...mts, ...plans].forEach(x => x.cat && set.add(x.cat));
  (prefs.cats || []).forEach(c => set.add(c));
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}
async function fillActiveCat() {
  const cats = await allCats();
  const html = `<option value="">Todos los equipos</option>` + cats.map(c => `<option ${c === prefs.activeCat ? 'selected' : ''}>${esc(c)}</option>`).join('') + '<option value="__new">＋ Nuevo equipo…</option>';
  ['#activeCat', '#setActiveCat'].forEach(id => { const s = $(id); if (s) { s.innerHTML = html; s.value = prefs.activeCat || ''; } });
}
async function setActiveCat(v) {
  if (v === '__new') {
    const r = await ask('Nuevo equipo o categoría', [{ label: 'Nombre (ej.: Primera, Sub-17, Femenino)', value: '' }], 'Crear');
    const n = r && r[0] && r[0].trim(); if (!n) { fillActiveCat(); return; }
    prefs.cats = [...new Set([...(prefs.cats || []), n])]; v = n;
  }
  prefs.activeCat = v; if (v) prefs.lastCat = v; savePrefs(); await fillActiveCat();
  if (!$('#home').hidden) renderHome();
  toast(v ? `Equipo activo: ${v}` : 'Mostrando todos los equipos');
}
$('#activeCat').onchange = e => setActiveCat(e.target.value);
$('#setActiveCat').onchange = e => setActiveCat(e.target.value);
fillActiveCat();

/* ---------- Copia de seguridad ---------- */
const BK_STORES = ['projects', 'teams', 'spaces', 'sessions', 'players', 'plans', 'evals', 'matches', 'wellness', 'videos'];
const BK_LABEL = { projects: 'tácticas y tareas', teams: 'plantillas de equipo', spaces: 'espacios', sessions: 'sesiones', players: 'jugadores', plans: 'planes', evals: 'evaluaciones', matches: 'partidos', wellness: 'registros de bienestar', videos: 'videos e imágenes' };
async function packBlobs(v) {
  if (v instanceof Blob) return { __blob: await blobToDataURL(v), type: v.type };
  if (Array.isArray(v)) return Promise.all(v.map(packBlobs));
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = await packBlobs(v[k]); return o; }
  return v;
}
async function unpackBlobs(v) {
  if (v && typeof v === 'object' && v.__blob) { const b = await (await fetch(v.__blob)).blob(); return v.type ? new Blob([b], { type: v.type }) : b; }
  if (Array.isArray(v)) return Promise.all(v.map(unpackBlobs));
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = await unpackBlobs(v[k]); return o; }
  return v;
}
function lastBackup() { try { return +localStorage.getItem('pt-lastBackup') || 0; } catch (e) { return 0; } }
async function makeBackup(withVideos) {
  if (typeof saveNow === 'function') await saveNow();
  const data = { app: 'pizarra-tactica', version: 3, date: new Date().toISOString(), prefs: { ...prefs }, theme: (() => { try { return localStorage.getItem('avd_theme'); } catch (e) { return null; } })() };
  for (const s of BK_STORES) {
    if (s === 'videos' && !withVideos) continue;
    const rows = await DB.all(s);
    data[s] = s === 'videos' ? await packBlobs(rows) : rows;
  }
  return data;
}
async function saveBackup() {
  const withV = $('#bkVideos').checked; toast('Preparando la copia…', 1500);
  const data = await makeBackup(withV);
  const ok = await saveBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'pizarra_copia_completa_' + isoDate(new Date()) + '.json');
  if (ok !== false) { try { localStorage.setItem('pt-lastBackup', Date.now()); } catch (e) {} toast('Copia de seguridad descargada'); renderBackupInfo(); }
}
async function restoreBackup(data, mode) {
  if (!data || data.app !== 'pizarra-tactica') throw new Error('No es una copia de esta app');
  const stores = BK_STORES.filter(s => Array.isArray(data[s]));
  if (mode === 'replace') { for (const s of stores) await DB.clear(s); }
  const counts = {};
  for (const s of stores) {
    const rows = s === 'videos' ? await unpackBlobs(data[s]) : data[s];
    for (const r of rows) if (r && r.id) await DB.put(s, r);
    counts[s] = rows.length;
  }
  if (data.prefs && mode === 'replace') { const keep = { homeOnStart: prefs.homeOnStart }; Object.assign(prefs, data.prefs, keep); savePrefs(); }
  await loadSquad(); await fillActiveCat();
  return counts;
}
function renderBackupInfo() {
  const t = lastBackup();
  $('#bkInfo').textContent = t ? `Última copia: ${new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} (hace ${Math.floor((Date.now() - t) / 864e5)} días).` : 'Todavía no has hecho ninguna copia de seguridad en este dispositivo.';
  $('#bkEvery').value = String(prefs.bkEvery ?? 7);
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { $('#bkPersist').textContent = p ? '✓ El navegador protege los datos de esta app (almacenamiento persistente).' : 'El navegador podría borrar los datos si falta espacio. Instala la app y haz copias con regularidad.'; });
}
function openBackup() { renderBackupInfo(); $('#dlgBackup').showModal(); }
$('#bkSave').onclick = saveBackup;
$('#bkEvery').onchange = e => { prefs.bkEvery = +e.target.value; savePrefs(); };
$('#bkOpen').onclick = () => { $('#dlgSettings').close(); openBackup(); };
$('#hmBackup').onclick = openBackup;
$('#bkFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text()), mode = $('#bkMode').value;
    if (mode === 'replace' && !await confirmBox('¿Reemplazar todos los datos de este dispositivo por los de la copia? Lo que no esté en la copia se perderá.', 'Reemplazar')) return;
    const c = await restoreBackup(data, mode);
    toast('Restaurado: ' + Object.entries(c).filter(([, n]) => n).map(([s, n]) => `${n} ${BK_LABEL[s]}`).join(', '), 6000);
    $('#dlgBackup').close(); if (!$('#home').hidden) renderHome();
  } catch (er) { toast('No se pudo restaurar: ' + er.message, 5000); }
};
// Pedir almacenamiento persistente (evita que el navegador borre los datos)
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist(); }); } catch (e) {}
function backupOverdue() {
  const every = prefs.bkEvery ?? 7; if (!every) return false;
  const t = lastBackup(); return !t || Date.now() - t > every * 864e5;
}

/* ---------- Compartir sesión (archivo de intercambio) ---------- */
async function shareSession(s) {
  await loadProjectsMap();
  const projects = s.items.map(i => sesProjects[i.pid]).filter(Boolean);
  const data = { app: 'pizarra-tactica', kind: 'session-bundle', version: 3, date: new Date().toISOString(), session: s, projects };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }), name = 'sesion_' + fileName(s.name) + '.json';
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: s.name, text: 'Sesión de entrenamiento · ábrela en Pizarra Táctica (Tácticas › Importar)' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  await saveBlob(blob, name); toast('Archivo listo: tu compañero lo abre en Tácticas › Importar', 4500);
}
$('#sesShare').onclick = () => curSes && shareSession(curSes);
// Las copias completas y las sesiones compartidas también se importan desde «Mis tácticas › Importar»
const importFilesBase = importFiles;
importFiles = async function (files) {
  const rest = [];
  for (const f of files) {
    if (/\.json$/i.test(f.name) || f.type === 'application/json') {
      try {
        const d = JSON.parse(await f.text());
        if (d && d.app === 'pizarra-tactica' && d.kind === 'session-bundle') {
          for (const p of d.projects || []) await DB.put('projects', normalize(p));
          const s = normSession(d.session); await DB.put('sessions', s);
          toast(`Sesión «${s.name}» importada con ${(d.projects || []).length} tareas`, 4000); continue;
        }
        if (d && d.app === 'pizarra-tactica' && d.version >= 3) { const c = await restoreBackup(d, 'merge'); toast('Copia combinada: ' + Object.entries(c).filter(([, n]) => n).map(([s, n]) => `${n} ${BK_LABEL[s]}`).join(', '), 5000); continue; }
      } catch (e) {}
    }
    rest.push(f);
  }
  return rest.length ? importFilesBase(rest) : { nProj: 0, last: null };
};

/* ---------- Calendario (.ics) ---------- */
function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m); }
function icsDate(ds, time) { return time ? ds.replace(/-/g, '') + 'T' + time.replace(':', '') + '00' : ds.replace(/-/g, ''); }
function icsBuild(events) {
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AVD DT Futbol//Pizarra Tactica//ES', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    L.push('BEGIN:VEVENT', 'UID:' + e.uid + '@pizarra-tactica', 'DTSTAMP:' + now);
    if (e.time) {
      const [h, m] = e.time.split(':').map(Number), end = new Date(2000, 0, 1, h, m + (e.dur || 90));
      L.push('DTSTART:' + icsDate(e.date, e.time), 'DTEND:' + icsDate(e.date, `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`));
    } else { const d = parseDate(e.date); d.setDate(d.getDate() + 1); L.push('DTSTART;VALUE=DATE:' + icsDate(e.date), 'DTEND;VALUE=DATE:' + icsDate(isoDate(d))); }
    L.push('SUMMARY:' + icsEsc(e.title)); if (e.desc) L.push('DESCRIPTION:' + icsEsc(e.desc)); if (e.place) L.push('LOCATION:' + icsEsc(e.place));
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR'); return L.join('\r\n');
}
function sessionEvent(s) {
  return { uid: s.id, date: s.date, time: s.time || '', dur: sessionTotal(s), title: `Entrenamiento: ${s.name}${s.md && s.md !== 'Libre' ? ' (' + s.md + ')' : ''}`,
    desc: [s.objective, s.phases.p1.content ? contentLabel(s.phases.p1.content) + (s.phases.p1.consigna ? ': ' + s.phases.p1.consigna : '') : '', `${sessionTotal(s)} min`].filter(Boolean).join('\n') };
}
async function icsDownload(events, name) {
  if (!events.length) { toast('No hay nada que exportar en ese periodo'); return; }
  const ok = await saveBlob(new Blob([icsBuild(events)], { type: 'text/calendar' }), name + '.ics');
  if (ok !== false) toast('Calendario descargado: ábrelo para añadirlo a Google Calendar, iPhone u Outlook', 4500);
}
$('#sesIcs').onclick = () => curSes && icsDownload([sessionEvent(normSession(curSes))], 'sesion_' + fileName(curSes.name));
$('#wkIcs').onclick = async () => {
  await loadProjectsMap();
  const from = isoDate(weekStart), e = new Date(weekStart); e.setDate(e.getDate() + 6); const to = isoDate(e);
  const ses = (await DB.all('sessions')).map(normSession).filter(s => s.date >= from && s.date <= to && catOk(s.cat)).map(sessionEvent);
  const mts = (await DB.all('matches')).filter(m => m.date >= from && m.date <= to && catOk(m.cat)).map(matchEvent);
  icsDownload([...ses, ...mts], 'semana_' + from);
};

/* ---------- Guía de primer uso ---------- */
const TOUR = [
  ['👋', 'Bienvenido a Pizarra Táctica', 'Tu herramienta de entrenador AVD · D.T Fútbol: planifica, diseña tareas, gestiona el plantel y los partidos, y controla la carga. Todo se guarda en este dispositivo.'],
  ['🗓', '1. Plan de temporada', 'En 📅 Planificación crea el plan: evalúa al equipo con el test ludológico, elige la sub-etapa y reparte los contenidos de cada mes.'],
  ['🧩', '2. Mesociclo y semana', 'En el mesociclo pon las consignas de cada semana y crea las sesiones. Añade tus partidos en 📊 Rendimiento y la app calcula el día MD de cada sesión.'],
  ['📚', '3. Sesiones y tareas', 'Cada sesión va por fases. Usa «📚 Desde la biblioteca» para elegir entre 3.230 ejercicios por contenido y consigna, o dibuja tus tareas en la pizarra.'],
  ['📊', '4. Día a día', 'Pasa lista y registra el RPE en cada sesión, el bienestar del día y los minutos de los partidos. Verás la carga real, el ACWR y las alertas en el Inicio.'],
  ['📄', '5. Comparte y protege', 'Descarga en PDF cualquier trabajo, exporta al calendario y comparte sesiones con tu cuerpo técnico. Haz una copia de seguridad cada semana (Ajustes › Datos).'],
];
let tourI = 0;
function showTour(i = 0) {
  tourI = Math.max(0, Math.min(TOUR.length - 1, i)); const [ic, t, d] = TOUR[tourI];
  $('#tourBody').innerHTML = `<div class="touric">${ic}</div><h2>${esc(t)}</h2><p>${esc(d)}</p>`;
  $('#tourDots').innerHTML = TOUR.map((_, j) => `<i class="${j === tourI ? 'on' : ''}"></i>`).join('');
  $('#tourPrev').hidden = tourI === 0; $('#tourNext').textContent = tourI === TOUR.length - 1 ? 'Empezar' : 'Siguiente';
  $('#tour').hidden = false;
}
function endTour() { $('#tour').hidden = true; prefs.tourDone = true; savePrefs(); }
$('#tourNext').onclick = () => tourI === TOUR.length - 1 ? endTour() : showTour(tourI + 1);
$('#tourPrev').onclick = () => showTour(tourI - 1);
$('#tourSkip').onclick = endTour;
$('#hmTour').onclick = () => showTour(0);
$('#tourOpen').onclick = () => { $('#dlgSettings').close(); showTour(0); };
if (!prefs.tourDone) setTimeout(() => { if ($('#lock').hidden) showTour(0); }, 900);
