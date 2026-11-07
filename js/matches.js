'use strict';
/*
  Partidos y competición: calendario de partidos, convocatoria y alineación (a la pizarra),
  minutos / goles / asistencias / tarjetas, informe del rival con su pizarra, cálculo del día MD
  de las sesiones según los partidos y modo partido en la pizarra (marcador, cronómetro, notas).
*/
let MATCHES = [], curMatch = null;
function normMatch(m) {
  m.callup = m.callup || []; m.start = m.start || []; m.stats = m.stats || {}; m.report = m.report || {};
  m.dur = +m.dur || 90; m.venue = m.venue || 'local'; m.formation = m.formation || '11|4-3-3';
  return m;
}
async function loadMatches() { MATCHES = (await DB.all('matches')).map(normMatch); return MATCHES; }
function newMatch(date) {
  return normMatch({ id: uid(), date: date || isoDate(new Date()), time: '', rival: '', venue: 'local', comp: '', cat: prefs.activeCat || prefs.lastCat || '', place: '', gf: '', ga: '', dur: 90, rpe: '', notes: '', created: Date.now(), updated: Date.now() });
}
const isPlayed = m => m.gf !== '' && m.gf != null && m.ga !== '' && m.ga != null;
function matchResult(m) { if (!isPlayed(m)) return ''; return +m.gf > +m.ga ? 'G' : +m.gf === +m.ga ? 'E' : 'P'; }
const RES_NAME = { G: 'Victoria', E: 'Empate', P: 'Derrota' };
function resChip(m) { const r = matchResult(m); return r ? `<span class="reschip res-${r}" title="${RES_NAME[r]}">${r}</span>` : '<span class="reschip res-n" title="Por jugar">·</span>'; }
function matchLabel(m) {
  const us = m.cat || 'Mi equipo', them = m.rival || 'Rival';
  const [l, v] = m.venue === 'visitante' ? [them, us] : [us, them], [gl, gv] = m.venue === 'visitante' ? [m.ga, m.gf] : [m.gf, m.ga];
  return isPlayed(m) ? `${l} ${gl} - ${gv} ${v}` : `${l} vs ${v}`;
}
function matchEvent(m) {
  return { uid: m.id, date: m.date, time: m.time || '', dur: (m.dur || 90) + 15, title: `⚽ ${matchLabel(m)}${m.comp ? ' · ' + m.comp : ''}`, place: m.place || '', desc: [m.comp, m.venue === 'local' ? 'Local' : m.venue === 'visitante' ? 'Visitante' : 'Neutral', m.report && m.report.plan].filter(Boolean).join('\n') };
}
const dayDiff = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 864e5);

/* ---------- Día MD según los partidos ---------- */
function mdFor(date, cat, matches) {
  const ms = (matches || MATCHES).filter(m => !cat || !m.cat || m.cat === cat);
  let next = null, prev = null;
  for (const m of ms) { const d = dayDiff(m.date, date); if (d >= 0 && (next === null || d < next)) next = d; if (d < 0 && (prev === null || -d < prev)) prev = -d; }
  if (next === 0) return 'MD';
  if (next !== null && next <= 2) return 'MD-' + next;
  if (prev !== null && prev <= 2) return 'MD+' + prev;
  if (next !== null && next <= 5) return 'MD-' + next;
  return 'Libre';
}
$('#wkMD').onclick = async () => {
  await loadMatches();
  const from = isoDate(weekStart), e = new Date(weekStart); e.setDate(e.getDate() + 6); const to = isoDate(e);
  const ses = (await DB.all('sessions')).map(normSession).filter(s => s.date >= from && s.date <= to && catOk(s.cat));
  let n = 0; for (const s of ses) { const md = mdFor(s.date, s.cat); if (md !== s.md) { s.md = md; s.updated = Date.now(); await DB.put('sessions', s); n++; } }
  renderSessions(); toast(MATCHES.length ? `${n} sesion${n === 1 ? '' : 'es'} actualizada${n === 1 ? '' : 's'} según los partidos` : 'Añade tus partidos en 📊 Rendimiento › Partidos', 4000);
};

/* ---------- Lista de partidos ---------- */
async function renderMatchList() {
  await loadMatches();
  const f = $('#mtFilter').value, today = isoDate(new Date());
  let list = MATCHES.filter(m => catOk(m.cat));
  const playedL = list.filter(isPlayed), r = { G: 0, E: 0, P: 0 }; let gf = 0, ga = 0;
  playedL.forEach(m => { r[matchResult(m)]++; gf += +m.gf; ga += +m.ga; });
  $('#mtSummary').textContent = playedL.length ? `PJ ${playedL.length} · G ${r.G} · E ${r.E} · P ${r.P} · GF ${gf} · GC ${ga} · ${Math.round((r.G * 3 + r.E) / (playedL.length * 3) * 100)} % de puntos` : '';
  if (f === 'next') list = list.filter(m => m.date >= today && !isPlayed(m)).sort((a, b) => a.date.localeCompare(b.date));
  else if (f === 'played') list = list.filter(isPlayed).sort((a, b) => b.date.localeCompare(a.date));
  else list.sort((a, b) => b.date.localeCompare(a.date));
  const L = $('#mtList'); L.innerHTML = '';
  if (!list.length) { L.innerHTML = '<div class="empty">Añade los partidos de la temporada: la app calcula el día MD de cada sesión, prepara la convocatoria y lleva los minutos de cada jugador.</div>'; return; }
  list.forEach(m => {
    const row = el('div', 'vitem');
    row.innerHTML = `${resChip(m)}<div class="info"><div class="t">${esc(matchLabel(m))}</div><div class="s">${esc(fmtDate(m.date))}${m.time ? ' · ' + esc(m.time) : ''}${m.comp ? ' · ' + esc(m.comp) : ''}${m.cat ? ' · ' + esc(m.cat) : ''} · ${m.callup.length} convocados</div></div>`;
    const b = el('button', '', 'Abrir'); b.onclick = () => openMatch(m); row.appendChild(b);
    row.querySelector('.info').onclick = () => openMatch(m); L.appendChild(row);
  });
}
$('#mtFilter').onchange = renderMatchList;
$('#mtNew').onclick = () => openMatch(null);
$('#mtIcs').onclick = async () => { await loadMatches(); icsDownload(MATCHES.filter(m => catOk(m.cat) && m.date >= isoDate(new Date())).map(matchEvent), 'partidos'); };

/* ---------- Editor del partido ---------- */
function showMatchTab(t) {
  $$('#mtTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.mt === t));
  $('#mtData').hidden = t !== 'data'; $('#mtCall').hidden = t !== 'call'; $('#mtStats').hidden = t !== 'stats'; $('#mtRivalSec').hidden = t !== 'rival';
  if (t === 'call') renderCallup(); if (t === 'stats') renderMatchStats();
}
$$('#mtTabs .tab').forEach(b => b.onclick = () => { readMatchForm(); showMatchTab(b.dataset.mt); });
$('#mtForm').innerHTML = Object.entries(FORMATIONS).flatMap(([n, fs]) => Object.keys(fs).map(f => `<option value="${n}|${f}">${n} jugadores · ${f}</option>`)).join('');
const MT_FIELDS = [['mtRival', 'rival'], ['mtDate', 'date'], ['mtTime', 'time'], ['mtVenue', 'venue'], ['mtComp', 'comp'], ['mtCat', 'cat'], ['mtPlace', 'place'], ['mtGF', 'gf'], ['mtGA', 'ga'], ['mtDur', 'dur'], ['mtRPE', 'rpe'], ['mtNotes', 'notes']];
const RV_FIELDS = [['rvSystem', 'system'], ['rvStyle', 'style'], ['rvStrong', 'strong'], ['rvWeak', 'weak'], ['rvABP', 'abp'], ['rvKey', 'key'], ['rvPlan', 'plan']];
async function openMatch(m) {
  await loadSquad();
  curMatch = m ? normMatch(clone(m)) : newMatch();
  MT_FIELDS.forEach(([id, k]) => $('#' + id).value = curMatch[k] ?? '');
  RV_FIELDS.forEach(([id, k]) => $('#' + id).value = curMatch.report[k] || '');
  $('#mtForm').value = curMatch.formation; if (!$('#mtForm').value) $('#mtForm').value = '11|4-3-3';
  $('#mtTitle').textContent = m ? matchLabel(curMatch) : 'Nuevo partido'; $('#mtDel').hidden = !m;
  $('#rvBoardInfo').textContent = curMatch.rivalPid ? 'Pizarra del rival guardada en «Mis tácticas».' : '';
  showMatchTab('data'); $('#dlgMatch').showModal();
}
function readMatchForm() {
  if (!curMatch) return;
  MT_FIELDS.forEach(([id, k]) => curMatch[k] = $('#' + id).value);
  curMatch.dur = +curMatch.dur || 90; curMatch.rival = curMatch.rival.trim(); curMatch.cat = curMatch.cat.trim();
  RV_FIELDS.forEach(([id, k]) => curMatch.report[k] = $('#' + id).value);
  curMatch.formation = $('#mtForm').value;
}
async function saveMatch(close = true) {
  readMatchForm(); if (!curMatch.date) { toast('Indica la fecha del partido'); return false; }
  curMatch.updated = Date.now(); await DB.put('matches', curMatch);
  if (curMatch.cat) { prefs.lastCat = curMatch.cat; savePrefs(); }
  await loadMatches();
  if (close) { $('#dlgMatch').close(); toast('Partido guardado'); }
  if ($('#dlgPerf').open) renderMatchList();
  return true;
}
$('#mtOk').onclick = () => saveMatch(true);
$('#mtDel').onclick = async () => { if (!await confirmBox('¿Borrar este partido?')) return; await DB.del('matches', curMatch.id); $('#dlgMatch').close(); renderMatchList(); };
function matchSquad(m) {
  return Object.values(SQUAD).filter(p => !m.cat || !p.cat || p.cat === m.cat)
    .sort((a, b) => ((POS[a.pos] || { line: 9 }).line - (POS[b.pos] || { line: 9 }).line) || ((+a.dorsal || 99) - (+b.dorsal || 99)));
}
function renderCallup() {
  const m = curMatch, list = matchSquad(m), T = $('#mtCallTable');
  if (!list.length) { T.innerHTML = '<tbody><tr><td class="muted">Añade jugadores en 👤 Plantel (con la misma categoría que el partido).</td></tr></tbody>'; $('#mtCallCount').textContent = ''; return; }
  T.innerHTML = '<thead><tr><th>Convocado</th><th>Titular</th><th>Jugador</th><th>Posición</th><th>Estado</th></tr></thead><tbody>' + list.map(p => {
    const st = p.status || 'disponible';
    return `<tr class="${st !== 'disponible' ? 'warnrow' : ''}"><td><input type="checkbox" data-c="${p.id}" ${m.callup.includes(p.id) ? 'checked' : ''}></td><td><input type="checkbox" data-s="${p.id}" ${m.start.includes(p.id) ? 'checked' : ''}></td>
      <td><b class="dors">${esc(p.dorsal || '')}</b> ${esc(p.name)}</td><td>${esc(p.pos || '')}</td><td>${statusChip(st)}</td></tr>`;
  }).join('') + '</tbody>';
  const sync = () => { $('#mtCallCount').textContent = `${m.callup.length} convocados · ${m.start.length} titulares`; };
  $$('[data-c]', T).forEach(i => i.onchange = () => { const id = i.dataset.c; m.callup = i.checked ? [...new Set([...m.callup, id])] : m.callup.filter(x => x !== id); if (!i.checked) { m.start = m.start.filter(x => x !== id); $(`[data-s="${id}"]`, T).checked = false; } sync(); });
  $$('[data-s]', T).forEach(i => i.onchange = () => { const id = i.dataset.s; if (i.checked) { m.start = [...new Set([...m.start, id])]; if (!m.callup.includes(id)) { m.callup.push(id); $(`[data-c="${id}"]`, T).checked = true; } } else m.start = m.start.filter(x => x !== id); sync(); });
  sync();
}
$('#mtAuto').onclick = () => {
  readMatchForm(); const m = curMatch, n = +m.formation.split('|')[0] || 11;
  const avail = matchSquad(m).filter(p => (p.status || 'disponible') === 'disponible');
  m.callup = avail.slice(0, n === 11 ? 18 : n + 7).map(p => p.id);
  const gk = avail.filter(p => p.pos === 'POR').slice(0, 1), rest = avail.filter(p => p.pos !== 'POR').slice(0, n - gk.length);
  m.start = [...gk, ...rest].map(p => p.id); renderCallup();
  toast(`${m.callup.length} convocados y ${m.start.length} titulares propuestos (solo disponibles). Ajusta a tu criterio.`, 4000);
};
const FIELD_FOR_N = n => n >= 10 ? 'f11' : n >= 9 ? 'f9' : n >= 7 ? 'f7' : 'f5';
$('#mtBoard').onclick = async () => {
  readMatchForm(); const m = curMatch;
  const starters = m.start.map(id => SQUAD[id]).filter(Boolean);
  if (!starters.length) { toast('Marca los titulares primero'); return; }
  const [ns, f] = m.formation.split('|'), n = +ns;
  const p = normalize(newProject(`Alineación vs ${m.rival || 'rival'}`, FIELD_FOR_N(starters.length)));
  p.cat = 'Partidos'; p.teams.A.name = m.cat || 'Mi equipo'; p.teams.B.name = m.rival || 'Rival';
  const key = q => { const ps = POS[q.pos] || { line: 3, side: 1 }; return ps.line * 10 + ps.side; };
  const ordered = [...starters].sort((a, b) => key(a) - key(b));
  const positions = FORMATIONS[ordered.length] ? formationPos('A', ordered.length, ordered.length === n ? f : Object.keys(FORMATIONS[ordered.length])[0], p.field) : freePositions('A', ordered.length, p.field);
  ordered.forEach((q, i) => { const [, x, y] = positions[i]; const o = { id: uid(), type: 'player', team: 'A', gk: q.pos === 'POR', num: q.dorsal || '', name: shortName(q), pid: q.id }; p.objs.push(o); p.frames[0].pos[o.id] = [x, y]; });
  const bench = m.callup.filter(id => !m.start.includes(id)).map(id => SQUAD[id]).filter(Boolean);
  p.notes = `${matchLabel(m)} · ${fmtDate(m.date)}\nSuplentes: ${bench.map(q => (q.dorsal ? q.dorsal + ' ' : '') + shortName(q)).join(', ') || '—'}${m.report.plan ? '\nPlan: ' + m.report.plan : ''}`;
  if (m.lineupPid) p.id = m.lineupPid; m.lineupPid = p.id;
  await DB.put('projects', p); await saveMatch(false);
  $('#dlgMatch').close(); if ($('#dlgPerf').open) $('#dlgPerf').close(); if (!$('#home').hidden) hideHome();
  loadProject(p); toast('Alineación en la pizarra con los suplentes en las notas', 3500);
};
function renderMatchStats() {
  const m = curMatch, ids = m.callup.length ? m.callup : [], T = $('#mtStatsTable');
  if (!ids.length) { T.innerHTML = '<tbody><tr><td class="muted">Primero marca la convocatoria.</td></tr></tbody>'; return; }
  const def = id => m.stats[id] || {}, defMin = id => m.start.includes(id) ? m.dur : 0;
  T.innerHTML = '<thead><tr><th>Jugador</th><th>Min</th><th>Goles</th><th>Asist.</th><th>🟨</th><th>🟥</th><th>RPE</th></tr></thead><tbody>' + ids.map(id => {
    const p = SQUAD[id]; if (!p) return ''; const s = def(id);
    return `<tr><td><b class="dors">${esc(p.dorsal || '')}</b> ${esc(p.name)}${m.start.includes(id) ? ' <small>titular</small>' : ''}</td>` +
      [['min', 0, 130], ['g', 0, 20], ['a', 0, 20], ['y', 0, 2], ['r', 0, 1], ['rpe', 0, 10]].map(([k, lo, hi]) => `<td><input type="number" class="numin" data-p="${id}" data-k="${k}" min="${lo}" max="${hi}" value="${s[k] ?? ''}" placeholder="${k === 'min' ? defMin(id) : k === 'rpe' ? (m.rpe || '') : ''}"></td>`).join('') + '</tr>';
  }).join('') + '</tbody>';
  const fill = el('button', '', `Rellenar minutos (titulares ${m.dur}, suplentes 0)`); fill.onclick = () => { ids.forEach(id => { const st = m.stats[id] = m.stats[id] || {}; if (st.min === '' || st.min == null) st.min = defMin(id); }); renderMatchStats(); };
  T.parentElement.querySelector('.fillmin')?.remove(); fill.className = 'fillmin'; T.parentElement.insertBefore(fill, T);
  $$('input[data-p]', T).forEach(i => i.onchange = () => { const s = m.stats[i.dataset.p] = m.stats[i.dataset.p] || {}; s[i.dataset.k] = i.value === '' ? '' : +i.value; });
}
$('#rvBoard').onclick = async () => {
  readMatchForm(); const m = curMatch;
  let p = m.rivalPid ? await DB.get('projects', m.rivalPid) : null;
  if (!p) {
    p = normalize(newProject(`Rival: ${m.rival || 'sin nombre'}`, 'f11')); p.cat = 'Rivales'; p.teams.B.name = m.rival || 'Rival';
    const sys = (m.report.system || '').replace(/^1-/, '').trim(), key = FORMATIONS[11][sys] ? sys : '4-4-2';
    formationPos('B', 11, key, p.field).forEach(([num, x, y], i) => { const o = { id: uid(), type: 'player', team: 'B', gk: i === 0, num, name: '' }; p.objs.push(o); p.frames[0].pos[o.id] = [x, y]; });
    p.notes = [m.report.strong && 'Fortalezas: ' + m.report.strong, m.report.weak && 'Debilidades: ' + m.report.weak].filter(Boolean).join('\n');
    await DB.put('projects', p); m.rivalPid = p.id;
  }
  await saveMatch(false); $('#dlgMatch').close(); if ($('#dlgPerf').open) $('#dlgPerf').close(); if (!$('#home').hidden) hideHome();
  loadProject(normalize(p)); toast('Pizarra del rival: dibuja su sistema, salida y ABP', 3500);
};

/* ---------- PDF ---------- */
async function matchPrintHTML(m) {
  const pl = id => SQUAD[id], row = id => { const p = pl(id); return p ? `<tr><td><b>${esc(p.dorsal || '')}</b></td><td>${esc(p.name)}</td><td>${esc(p.pos || '')}</td></tr>` : ''; };
  const bench = m.callup.filter(id => !m.start.includes(id));
  let h = `<header class="pt-head"><div><h1>${esc(matchLabel(m))}</h1><p>${esc(fmtDate(m.date))}${m.time ? ' · ' + esc(m.time) : ''}${m.comp ? ' · ' + esc(m.comp) : ''}${m.place ? ' · ' + esc(m.place) : ''}</p></div><div class="pt-meta"><b>${m.venue === 'local' ? 'Local' : m.venue === 'visitante' ? 'Visitante' : 'Neutral'}</b>${matchResult(m) ? `<small>${RES_NAME[matchResult(m)]}</small>` : ''}</div></header>`;
  if (m.callup.length) h += `<h2>Convocatoria <small>${m.callup.length} jugadores</small></h2><div class="pt-steps"><div><b>Titulares</b><table class="pt-table"><tbody>${m.start.map(row).join('') || '<tr><td>—</td></tr>'}</tbody></table></div><div><b>Suplentes</b><table class="pt-table"><tbody>${bench.map(row).join('') || '<tr><td>—</td></tr>'}</tbody></table></div></div>`;
  if (m.lineupPid) { const p = await DB.get('projects', m.lineupPid); if (p) h += `<h2>Alineación</h2><div class="pt-avoid"><img src="${thumbURL(p, 900, 560)}" style="width:100%;border-radius:4px" alt=""></div>`; }
  const st = Object.entries(m.stats).filter(([id, s]) => pl(id) && (+s.min || +s.g || +s.a || +s.y || +s.r));
  if (st.length) h += `<h2>Minutos y estadísticas</h2><table class="pt-table"><thead><tr><th>Jugador</th><th>Min</th><th>Goles</th><th>Asist.</th><th>Amarillas</th><th>Rojas</th><th>RPE</th></tr></thead><tbody>${st.map(([id, s]) => `<tr><td>${esc(pl(id).name)}</td><td>${s.min || 0}</td><td>${s.g || ''}</td><td>${s.a || ''}</td><td>${s.y || ''}</td><td>${s.r || ''}</td><td>${s.rpe || m.rpe || ''}</td></tr>`).join('')}</tbody></table>`;
  const R = m.report, rv = [['Sistema', R.system], ['Estilo', R.style], ['Fortalezas', R.strong], ['Debilidades', R.weak], ['Balón parado', R.abp], ['Jugadores clave', R.key], ['Plan de partido', R.plan]].filter(x => x[1]);
  if (rv.length) h += `<h2>Informe del rival</h2><div class="pgrid">${rv.map(([k, v]) => cell(k, nl2br(v), 'c2')).join('')}</div>`;
  if (m.rivalPid) { const p = await DB.get('projects', m.rivalPid); if (p) h += `<div class="pt-avoid" style="margin-top:8px"><img src="${thumbURL(p, 900, 560)}" style="width:100%;border-radius:4px" alt=""></div>`; }
  if (m.notes) h += `<h2>Notas</h2><p class="pt-obj">${nl2br(m.notes)}</p>`;
  return h;
}
$('#mtPdfOne').onclick = async () => { readMatchForm(); printHTML(await matchPrintHTML(curMatch), { title: matchLabel(curMatch) }); };
$('#mtPdf').onclick = async () => {
  await loadMatches(); const list = MATCHES.filter(m => catOk(m.cat)).sort((a, b) => a.date.localeCompare(b.date));
  const h = `<header class="pt-head"><div><h1>Partidos</h1><p>${esc(prefs.activeCat || 'Todos los equipos')} · ${esc($('#mtSummary').textContent)}</p></div></header><table class="pt-table"><thead><tr><th>Fecha</th><th>Partido</th><th>Competición</th><th>Resultado</th><th>Convocados</th></tr></thead><tbody>` +
    (list.map(m => `<tr><td>${esc(parseDate(m.date).toLocaleDateString('es'))}${m.time ? ' ' + esc(m.time) : ''}</td><td>${esc(matchLabel(m))}</td><td>${esc(m.comp || '')}</td><td>${matchResult(m) ? RES_NAME[matchResult(m)] : 'Por jugar'}</td><td>${m.callup.length}</td></tr>`).join('') || '<tr><td colspan="5">Sin partidos.</td></tr>') + '</tbody></table>';
  printHTML(h, { title: 'Partidos' });
};

/* ---------- Modo partido en la pizarra ---------- */
let mm = { a: 0, b: 0, running: false, t0: 0, acc: 0, half: 1, id: null, match: null };
const mmSecs = () => mm.acc + (mm.running ? (performance.now() - mm.t0) / 1000 : 0);
function mmDraw() {
  const s = Math.floor(mmSecs()), base = mm.half === 2 ? (mm.match ? mm.match.dur / 2 : 45) * 60 : 0, t = base + s;
  $('#mmTime').textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  $('#mmGA').textContent = mm.a; $('#mmGB').textContent = mm.b; $('#mmHalf').textContent = mm.half === 1 ? '1.ª parte' : '2.ª parte';
  $('#mmPlay').textContent = mm.running ? '⏸' : '▶'; $('#mmHalfBtn').textContent = mm.half === 1 ? '2.ª parte' : '1.ª parte';
}
const mmMin = () => Math.floor(((mm.half === 2 ? (mm.match ? mm.match.dur / 2 : 45) * 60 : 0) + mmSecs()) / 60) + 1;
function mmNote(t) { const n = $('#mmNotes'); n.value = (n.value ? n.value.replace(/\s*$/, '') + '\n' : '') + `${mmMin()}' ${t}`; n.scrollTop = n.scrollHeight; }
async function openMatchMode() {
  await loadMatches(); const today = isoDate(new Date());
  const opts = MATCHES.filter(m => catOk(m.cat)).sort((a, b) => Math.abs(dayDiff(a.date, today)) - Math.abs(dayDiff(b.date, today))).slice(0, 12);
  $('#mmMatch').innerHTML = '<option value="">— Sin vincular a un partido —</option>' + opts.map(m => `<option value="${m.id}">${esc(parseDate(m.date).toLocaleDateString('es', { day: 'numeric', month: 'short' }))} · ${esc(matchLabel(m))}</option>`).join('');
  if (!mm.match && opts[0] && Math.abs(dayDiff(opts[0].date, today)) <= 1) mm.match = opts[0];
  $('#mmMatch').value = mm.match ? mm.match.id : '';
  mmSyncNames(); $('#matchMode').hidden = false; mmDraw();
}
function mmSyncNames() {
  const m = mm.match; const us = (m && m.cat) || (P && P.teams.A.name) || 'Mi equipo', them = (m && m.rival) || (P && P.teams.B.name) || 'Rival';
  $('#mmA').textContent = us; $('#mmB').textContent = them;
}
$('#mmMatch').onchange = e => { mm.match = MATCHES.find(m => m.id === e.target.value) || null; mmSyncNames(); };
$('#btnMatchMode').onclick = () => $('#matchMode').hidden ? openMatchMode() : ($('#matchMode').hidden = true);
$('#mmClose').onclick = () => { $('#matchMode').hidden = true; };
$('#mmPlay').onclick = () => {
  if (mm.running) { mm.acc = mmSecs(); mm.running = false; clearInterval(mm.id); }
  else { mm.t0 = performance.now(); mm.running = true; mm.id = setInterval(mmDraw, 500); }
  mmDraw();
};
$('#mmHalfBtn').onclick = () => { mm.acc = 0; mm.t0 = performance.now(); mm.half = mm.half === 1 ? 2 : 1; mmNote(mm.half === 2 ? 'Comienza la 2.ª parte' : '1.ª parte'); mmDraw(); };
$('#mmReset').onclick = async () => { if (!await confirmBox('¿Poner a cero el marcador y el cronómetro?', 'Reiniciar')) return; clearInterval(mm.id); mm = { ...mm, a: 0, b: 0, running: false, acc: 0, half: 1 }; mmDraw(); };
$$('[data-sc]').forEach(b => b.onclick = () => {
  const k = b.dataset.sc;
  if (k === 'A+') { mm.a++; mmNote('Gol ' + $('#mmA').textContent); } else if (k === 'B+') { mm.b++; mmNote('Gol ' + $('#mmB').textContent); }
  else if (k === 'A-') mm.a = Math.max(0, mm.a - 1); else mm.b = Math.max(0, mm.b - 1);
  mmDraw();
});
$('#mmStamp').onclick = () => { mmNote(''); $('#mmNotes').focus(); };
$('#mmSave').onclick = async () => {
  if (!mm.match) { toast('Elige el partido al que guardar el marcador y las notas'); return; }
  const m = normMatch(await DB.get('matches', mm.match.id) || mm.match);
  m.gf = mm.a; m.ga = mm.b; const n = $('#mmNotes').value.trim();
  if (n) m.notes = (m.notes ? m.notes + '\n' : '') + n;
  m.updated = Date.now(); await DB.put('matches', m); mm.match = m; $('#mmNotes').value = '';
  toast('Marcador y notas guardados en el partido');
};
loadMatches();
