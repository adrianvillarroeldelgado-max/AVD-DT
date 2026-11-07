'use strict';
/*
  Rendimiento del plantel:
  - Asistencia y RPE de cada jugador en cada sesión (se registra en la propia sesión).
  - Carga real (sRPE = RPE × minutos) de sesiones y partidos, carga semanal y ACWR con alertas.
  - Cuestionario de bienestar diario (sueño, fatiga, dolor, estrés, ánimo).
  - Ficha del jugador: resumen, historial de lesiones, tests físicos y evolución del test ludológico.
  - Estadísticas de temporada: resultados, minutos, goles, asistencia, carga mensual y
    contenidos trabajados frente a los planificados.
*/
const ATT = { P: ['Presente', '#2F8F5B'], A: ['Ausente', '#C62828'], J: ['Justificada', '#B45309'], L: ['Lesionado', '#7B1FA2'] };
const WELL = [['sleep', 'Sueño'], ['fatigue', 'Fatiga'], ['sore', 'Dolor muscular'], ['stress', 'Estrés'], ['mood', 'Ánimo']];
const daysAgo = (n, from) => { const d = from ? parseDate(from) : new Date(); d.setDate(d.getDate() - n); return isoDate(d); };
const squadFor = cat => Object.values(SQUAD).filter(p => (!cat || !p.cat || p.cat === cat) && catOk(p.cat))
  .sort((a, b) => ((POS[a.pos] || { line: 9 }).line - (POS[b.pos] || { line: 9 }).line) || ((+a.dorsal || 99) - (+b.dorsal || 99)));
const pname = p => `<b class="dors">${esc(p.dorsal || '')}</b> ${esc(p.name)}`;

/* ---------- Pestañas ---------- */
let perfTab = 'matches';
function showPerfTab(t) {
  perfTab = t;
  $$('#perfTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.pf === t));
  const map = { matches: 'pfMatches', att: 'pfAtt', load: 'pfLoad', well: 'pfWell', season: 'pfSeason' };
  Object.entries(map).forEach(([k, id]) => $('#' + id).hidden = k !== t);
  ({ matches: renderMatchList, att: renderAttendance, load: renderLoad, well: renderWellness, season: renderSeason })[t]();
}
$$('#perfTabs .tab').forEach(b => b.onclick = () => showPerfTab(b.dataset.pf));
async function openPerf(tab) { await saveNow(); await loadSquad(); if (!$('#dlgPerf').open) $('#dlgPerf').showModal(); showPerfTab(tab || perfTab); }
$('#btnPerf').onclick = () => openPerf();
$('#dlgMatch').addEventListener('close', () => { if ($('#dlgPerf').open && perfTab === 'matches') renderMatchList(); });

/* ---------- Asistencia y RPE dentro de la sesión ---------- */
function renderSesAttendance() {
  const s = curSes, box = $('#sesAtt'); if (!s || !box) return;
  s.att = s.att || {};
  const list = squadFor(s.cat), total = sessionTotal(s);
  if (!list.length) { box.innerHTML = '<div class="sbh"><b>Asistencia y RPE</b><span class="muted small">Añade jugadores en 👤 Plantel para pasar lista y registrar la carga real.</span></div>'; return; }
  const pres = list.filter(p => (s.att[p.id] || {}).a === 'P'), rpes = pres.map(p => +s.att[p.id].rpe).filter(v => v || v === 0);
  const ua = pres.reduce((a, p) => { const r = s.att[p.id]; return a + (r.rpe !== '' && r.rpe != null ? +r.rpe * (+r.min || total) : 0); }, 0);
  const past = s.date <= isoDate(new Date());
  box.innerHTML = `<details ${past ? 'open' : ''}><summary class="sbh"><b>Asistencia y RPE</b><span class="muted small">${Object.keys(s.att).length ? `${pres.length}/${list.length} presentes${rpes.length ? ` · RPE medio ${(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)}` : ''}${ua ? ` · carga real ${Math.round(ua)} UA` : ''}` : 'Pasa lista y pide el RPE (0-10) al terminar'}</span></summary>
    <div class="row" style="margin:6px 0"><button id="attAll">✓ Todos presentes</button><button id="attRpe">RPE para todos…</button><span class="muted small">Min: si un jugador hizo menos tiempo, cámbialo (por defecto ${total} min).</span></div>
    <div class="attlist">${list.map(p => { const r = s.att[p.id] || {}; return `<div class="attrow" data-p="${p.id}"><span class="nm">${pname(p)}</span>${(p.status || 'disponible') !== 'disponible' ? statusChip(p.status) : '<span></span>'}
      <span class="seg attseg">${Object.entries(ATT).map(([k, [n, c]]) => `<button data-a="${k}" class="${r.a === k ? 'on' : ''}" style="--c:${c}" title="${n}">${k}</button>`).join('')}</span>
      <label class="inline small">RPE <input type="number" class="numin" data-k="rpe" min="0" max="10" value="${r.rpe ?? ''}"></label>
      <label class="inline small">Min <input type="number" class="numin" data-k="min" min="0" max="240" value="${r.min ?? ''}" placeholder="${total}"></label></div>`; }).join('')}</div></details>`;
  const save = () => { saveSes(); };
  $$('.attrow', box).forEach(row => {
    const id = row.dataset.p, rec = () => (s.att[id] = s.att[id] || {});
    $$('[data-a]', row).forEach(b => b.onclick = () => { const r = rec(); r.a = r.a === b.dataset.a ? '' : b.dataset.a; if (!r.a) delete s.att[id]; save(); renderSesAttendance(); });
    $$('input[data-k]', row).forEach(i => i.onchange = () => { const r = rec(); r[i.dataset.k] = i.value === '' ? '' : +i.value; if (!r.a) r.a = 'P'; save(); renderSesAttendance(); });
  });
  $('#attAll', box).onclick = () => { list.forEach(p => { const r = s.att[p.id] = s.att[p.id] || {}; if (!r.a) r.a = (p.status === 'lesionado' ? 'L' : 'P'); }); save(); renderSesAttendance(); };
  $('#attRpe', box).onclick = async () => {
    const v = await ask('RPE de la sesión para todos los presentes (0-10)', [{ label: 'RPE', value: '', type: 'number', mode: 'numeric' }], 'Aplicar');
    if (!v || v[0] === '') return; const n = clamp(+v[0], 0, 10);
    list.forEach(p => { const r = s.att[p.id]; if (r && r.a === 'P' && (r.rpe === '' || r.rpe == null)) r.rpe = n; }); save(); renderSesAttendance();
  };
}

/* ---------- Carga real ---------- */
async function loadEvents() {
  const [ses, mts] = await Promise.all([DB.all('sessions'), DB.all('matches')]);
  const E = {}; const add = (pid, date, ua, min, kind) => (E[pid] = E[pid] || []).push({ date, ua, min, kind });
  ses.map(normSession).forEach(s => { const tot = sessionTotal(s); Object.entries(s.att || {}).forEach(([pid, r]) => { if (r.a === 'P') { const min = +r.min || tot; add(pid, s.date, r.rpe !== '' && r.rpe != null ? +r.rpe * min : 0, min, 's'); } }); });
  const today = isoDate(new Date());
  mts.map(normMatch).filter(m => m.date <= today).forEach(m => Object.entries(m.stats).forEach(([pid, st]) => { const min = +st.min || 0; if (!min) return; const rpe = st.rpe !== '' && st.rpe != null ? +st.rpe : (m.rpe !== '' && m.rpe != null ? +m.rpe : ''); add(pid, m.date, rpe === '' ? 0 : rpe * min, min, 'm'); }));
  return E;
}
function sumUA(list, from, to) { return (list || []).filter(e => e.date >= from && e.date <= to).reduce((a, e) => a + e.ua, 0); }
function acwr(list, date) {
  const acute = sumUA(list, daysAgo(6, date), date), chronic = sumUA(list, daysAgo(27, date), date) / 4;
  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio: chronic > 0 ? acute / chronic : null };
}
function acwrChip(r) {
  if (r == null) return '<span class="muted">—</span>';
  const [c, t] = r > 1.5 ? ['#C62828', 'Riesgo alto'] : r > 1.3 ? ['#B45309', 'Vigilar'] : r < 0.8 ? ['#2F6FD1', 'Carga baja'] : ['#2F8F5B', 'Óptimo'];
  return `<span class="acchip" style="--c:${c}" title="${t}">${r.toFixed(2)}</span>`;
}
function barsSVG(data, { h = 140, color = '#0B1F3A', unit = '', fmt = v => Math.round(v) } = {}) {
  const W = Math.max(320, data.length * 54), max = Math.max(1, ...data.map(d => d.v)), bw = Math.min(36, W / data.length * .6);
  return `<svg viewBox="0 0 ${W} ${h + 34}" width="100%" role="img" style="max-height:${h + 34}px" xmlns="http://www.w3.org/2000/svg">` + data.map((d, i) => {
    const x = (i + .5) * W / data.length, bh = d.v / max * h;
    return `<rect x="${x - bw / 2}" y="${h - bh + 14}" width="${bw}" height="${bh}" rx="3" fill="${d.c || color}"><title>${esc(d.l)}: ${fmt(d.v)} ${unit}</title></rect>` +
      `<text x="${x}" y="${h - bh + 10}" font-size="11" text-anchor="middle" fill="currentColor">${d.v ? fmt(d.v) : ''}</text><text x="${x}" y="${h + 30}" font-size="11" text-anchor="middle" fill="currentColor" opacity=".7">${esc(d.l)}</text>`;
  }).join('') + `<line x1="0" x2="${W}" y1="${h + 14}" y2="${h + 14}" stroke="currentColor" opacity=".25"/></svg>`;
}
async function loadData() {
  const E = await loadEvents(), today = isoDate(new Date()), players = squadFor('');
  const rows = players.map(p => { const L = E[p.id] || [], a = acwr(L, today); return { p, L, ...a, week: sumUA(L, isoDate(mondayOf(new Date())), today), mins: L.filter(e => e.kind === 'm' && e.date >= daysAgo(27)).reduce((s, e) => s + e.min, 0) }; });
  const mon = mondayOf(new Date()), weeks = [...Array(8)].map((_, i) => { const st = new Date(mon); st.setDate(st.getDate() - (7 - i) * 7); const en = new Date(st); en.setDate(en.getDate() + 6); return [isoDate(st), isoDate(en)]; });
  const wdata = weeks.map(([f, t]) => { const act = rows.filter(r => r.L.some(e => e.date >= f && e.date <= t)); return { l: parseDate(f).toLocaleDateString('es', { day: 'numeric', month: 'short' }), v: act.length ? act.reduce((s, r) => s + sumUA(r.L, f, t), 0) / act.length : 0 }; });
  return { rows, wdata };
}
async function renderLoad() {
  const { rows, wdata } = await loadData();
  $('#ldChart').innerHTML = `<h3 class="sechead">Carga semanal media por jugador (UA)</h3>${barsSVG(wdata, { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0B1F3A', unit: 'UA' })}`;
  const T = $('#ldTable');
  if (!rows.length) { T.innerHTML = '<tbody><tr><td class="muted">Añade jugadores y registra la asistencia con RPE en las sesiones.</td></tr></tbody>'; return; }
  T.innerHTML = '<thead><tr><th>Jugador</th><th>Esta semana</th><th>Aguda (7 d)</th><th>Crónica (media 4 sem.)</th><th>ACWR</th><th>Min. de partido (28 d)</th></tr></thead><tbody>' +
    rows.sort((a, b) => (b.ratio || 0) - (a.ratio || 0)).map(r => `<tr><td>${pname(r.p)}</td><td>${r.week}</td><td>${r.acute}</td><td>${r.chronic}</td><td>${acwrChip(r.ratio)}</td><td>${r.mins}</td></tr>`).join('') + '</tbody>';
}
$('#ldPdf').onclick = async () => {
  const { rows, wdata } = await loadData();
  printHTML(`<header class="pt-head"><div><h1>Carga de entrenamiento</h1><p>${esc(prefs.activeCat || 'Todos los equipos')} · sRPE (RPE × minutos) · ${esc(fmtDate(isoDate(new Date())))}</p></div></header>
    <h2>Carga semanal media por jugador</h2><div class="pt-avoid" style="color:#1c1c1d">${barsSVG(wdata, { unit: 'UA' })}</div>
    <h2>Por jugador</h2><table class="pt-table"><thead><tr><th>Jugador</th><th>Semana</th><th>Aguda 7 d</th><th>Crónica</th><th>ACWR</th><th>Min. partido 28 d</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.p.dorsal || '')} ${esc(r.p.name)}</td><td>${r.week}</td><td>${r.acute}</td><td>${r.chronic}</td><td>${r.ratio == null ? '—' : r.ratio.toFixed(2) + (r.ratio > 1.5 ? ' ⚠' : '')}</td><td>${r.mins}</td></tr>`).join('')}</tbody></table>
    <p class="pt-obj"><small>ACWR óptimo 0,8-1,3 · vigilar 1,3-1,5 · riesgo &gt; 1,5 · carga baja &lt; 0,8.</small></p>`, { title: 'Carga ' + isoDate(new Date()) });
};

/* ---------- Asistencia ---------- */
function attRange() { if (!$('#atFrom').value) { $('#atFrom').value = daysAgo(30); $('#atTo').value = isoDate(new Date()); } return [$('#atFrom').value, $('#atTo').value]; }
async function attData() {
  const [f, t] = attRange();
  const ses = (await DB.all('sessions')).map(normSession).filter(s => s.date >= f && s.date <= t && catOk(s.cat) && s.att && Object.keys(s.att).length);
  const rows = squadFor('').map(p => { const c = { P: 0, A: 0, J: 0, L: 0 }; let n = 0; ses.forEach(s => { if (s.cat && p.cat && s.cat !== p.cat) return; n++; const r = s.att[p.id]; if (r && c[r.a] !== undefined) c[r.a]++; else c.A++; }); return { p, c, n, pct: n ? c.P / n * 100 : null }; });
  return { ses, rows, f, t };
}
async function renderAttendance() {
  const { ses, rows } = await attData(), T = $('#atTable');
  if (!ses.length) { T.innerHTML = '<tbody><tr><td class="muted">No hay sesiones con asistencia en este periodo. Pasa lista en cada sesión (sección «Asistencia y RPE»).</td></tr></tbody>'; return; }
  T.innerHTML = `<thead><tr><th>Jugador</th><th>Sesiones</th>${Object.values(ATT).map(([n]) => `<th>${n}</th>`).join('')}<th>% asistencia</th></tr></thead><tbody>` +
    rows.sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101)).map(r => `<tr><td>${pname(r.p)}</td><td>${r.n}</td>${Object.keys(ATT).map(k => `<td>${r.c[k] || ''}</td>`).join('')}<td>${r.pct == null ? '—' : `<span class="acchip" style="--c:${r.pct >= 90 ? '#2F8F5B' : r.pct >= 80 ? '#B45309' : '#C62828'}">${Math.round(r.pct)} %</span>`}</td></tr>`).join('') + '</tbody>';
}
$('#atFrom').onchange = $('#atTo').onchange = renderAttendance;
$('#atPdf').onclick = async () => {
  const { ses, rows, f, t } = await attData();
  printHTML(`<header class="pt-head"><div><h1>Asistencia</h1><p>${esc(prefs.activeCat || 'Todos los equipos')} · del ${esc(parseDate(f).toLocaleDateString('es'))} al ${esc(parseDate(t).toLocaleDateString('es'))} · ${ses.length} sesiones</p></div></header>
    <table class="pt-table"><thead><tr><th>Jugador</th><th>Sesiones</th>${Object.values(ATT).map(([n]) => `<th>${n}</th>`).join('')}<th>%</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.p.dorsal || '')} ${esc(r.p.name)}</td><td>${r.n}</td>${Object.keys(ATT).map(k => `<td>${r.c[k] || ''}</td>`).join('')}<td>${r.pct == null ? '—' : Math.round(r.pct) + ' %'}</td></tr>`).join('')}</tbody></table>`, { title: 'Asistencia ' + f });
};

/* ---------- Bienestar ---------- */
const wellTotal = w => WELL.reduce((a, [k]) => a + (+w[k] || 0), 0);
const wellAlert = w => w && WELL.every(([k]) => w[k]) && (wellTotal(w) <= 12 || WELL.some(([k]) => +w[k] === 1));
async function renderWellness() {
  if (!$('#wlDate').value) $('#wlDate').value = isoDate(new Date());
  const d = $('#wlDate').value, all = await DB.all('wellness'), day = Object.fromEntries(all.filter(w => w.date === d).map(w => [w.pid, w]));
  const list = squadFor(''), T = $('#wlTable');
  if (!list.length) { T.innerHTML = '<tbody><tr><td class="muted">Añade jugadores en 👤 Plantel.</td></tr></tbody>'; return; }
  T.innerHTML = `<thead><tr><th>Jugador</th>${WELL.map(([, n]) => `<th>${n}</th>`).join('')}<th>Total</th></tr></thead><tbody>` + list.map(p => {
    const w = day[p.id] || {};
    return `<tr data-p="${p.id}" class="${wellAlert(w) ? 'alertrow' : ''}"><td>${pname(p)}</td>${WELL.map(([k]) => `<td><select data-k="${k}" class="wsel">${['', 1, 2, 3, 4, 5].map(v => `<option ${String(w[k] ?? '') === String(v) ? 'selected' : ''} value="${v}">${v || '—'}</option>`).join('')}</select></td>`).join('')}<td>${WELL.every(([k]) => w[k]) ? `<b>${wellTotal(w)}</b>/25${wellAlert(w) ? ' ⚠' : ''}` : '—'}</td></tr>`;
  }).join('') + '</tbody>';
  $$('tr[data-p]', T).forEach(tr => $$('select', tr).forEach(s => s.onchange = async () => {
    const id = `${d}_${tr.dataset.p}`, w = (await DB.get('wellness', id)) || { id, date: d, pid: tr.dataset.p };
    w[s.dataset.k] = s.value ? +s.value : ''; await DB.put('wellness', w); renderWellness();
  }));
}
$('#wlDate').onchange = renderWellness;
$('#wlPdf').onclick = async () => {
  const d = $('#wlDate').value || isoDate(new Date()), all = (await DB.all('wellness')).filter(w => w.date === d), by = Object.fromEntries(all.map(w => [w.pid, w]));
  printHTML(`<header class="pt-head"><div><h1>Bienestar</h1><p>${esc(fmtDate(d))} · ${esc(prefs.activeCat || 'Todos los equipos')}</p></div></header><table class="pt-table"><thead><tr><th>Jugador</th>${WELL.map(([, n]) => `<th>${n}</th>`).join('')}<th>Total</th></tr></thead><tbody>${squadFor('').map(p => { const w = by[p.id] || {}; return `<tr><td>${esc(p.dorsal || '')} ${esc(p.name)}</td>${WELL.map(([k]) => `<td>${w[k] || '—'}</td>`).join('')}<td>${WELL.every(([k]) => w[k]) ? wellTotal(w) + (wellAlert(w) ? ' ⚠' : '') : '—'}</td></tr>`; }).join('')}</tbody></table>`, { title: 'Bienestar ' + d });
};

/* ---------- Estadísticas de temporada ---------- */
async function seasonData() {
  if (!$('#snFrom').value) { const plans = await DB.all('plans'), pl = plans.sort((a, b) => b.updated - a.updated)[0]; $('#snFrom').value = pl && pl.start ? pl.start + (pl.start.length === 7 ? '-01' : '') : daysAgo(180); $('#snTo').value = isoDate(new Date()); }
  const f = $('#snFrom').value, t = $('#snTo').value;
  const [sesA, mtsA, plans] = await Promise.all([DB.all('sessions'), DB.all('matches'), DB.all('plans')]);
  const ses = sesA.map(normSession).filter(s => s.date >= f && s.date <= t && catOk(s.cat)), mts = mtsA.map(normMatch).filter(m => m.date >= f && m.date <= t && catOk(m.cat));
  const played = mts.filter(isPlayed), res = { G: 0, E: 0, P: 0 }; let gf = 0, ga = 0; played.forEach(m => { res[matchResult(m)]++; gf += +m.gf; ga += +m.ga; });
  const E = await loadEvents();
  const players = squadFor('').map(p => {
    const st = { pj: 0, tit: 0, min: 0, g: 0, a: 0, y: 0, r: 0 };
    mts.filter(m => isPlayed(m) || m.date <= isoDate(new Date())).forEach(m => { const s = m.stats[p.id]; if (m.start.includes(p.id) && isPlayed(m)) st.tit++; if (s && +s.min) { st.pj++; st.min += +s.min; st.g += +s.g || 0; st.a += +s.a || 0; st.y += +s.y || 0; st.r += +s.r || 0; } });
    const sa = ses.filter(s => s.att && Object.keys(s.att).length && (!s.cat || !p.cat || s.cat === p.cat)), pres = sa.filter(s => (s.att[p.id] || {}).a === 'P').length;
    return { p, ...st, att: sa.length ? pres / sa.length * 100 : null, ua: Math.round(sumUA(E[p.id], f, t)) };
  });
  // minutos por fase y contenidos trabajados
  const phaseMinT = Object.fromEntries(PHASES.map(([k]) => [k, 0])), worked = {};
  ses.forEach(s => PHASES.forEach(([k]) => { const mn = phaseMin(s, k); phaseMinT[k] += mn; const c = s.phases[k].content; if (c) { worked[c] = worked[c] || { n: 0, min: 0 }; worked[c].n++; worked[c].min += mn; } }));
  // planificado en el plan más reciente dentro del periodo
  const plan = plans.filter(p => catOk(p.cat)).sort((a, b) => b.updated - a.updated)[0], planned = new Set();
  if (plan) for (let m = 0; m < plan.months; m++) { const [y, mo] = plan.start.split('-').map(Number), ms = isoDate(new Date(y, mo - 1 + m, 1)), me = isoDate(new Date(y, mo + m, 0)); if (me < f || ms > t) continue; plan.days.forEach((d, di) => ['act', 'main'].forEach(row => (plan.grid[cellKey(di, row, m)] || []).forEach(c => planned.add(c)))); }
  // por mes
  const months = {}; ses.forEach(s => { const k = s.date.slice(0, 7); months[k] = months[k] || { min: 0, ua: 0 }; months[k].min += sessionTotal(s); });
  Object.values(E).forEach(L => L.forEach(e => { if (e.date < f || e.date > t) return; const k = e.date.slice(0, 7); months[k] = months[k] || { min: 0, ua: 0 }; months[k].ua += e.ua; }));
  const nP = Math.max(1, players.length);
  const mdata = Object.keys(months).sort().map(k => ({ l: new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString('es', { month: 'short' }), v: months[k].min, ua: months[k].ua / nP }));
  return { f, t, ses, mts, played, res, gf, ga, players, phaseMinT, worked, planned, plan, mdata };
}
function seasonHTML(D, forPdf) {
  const pts = D.played.length ? Math.round((D.res.G * 3 + D.res.E) / (D.played.length * 3) * 100) : 0;
  const col = forPdf ? '#0B1F3A' : (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0B1F3A');
  const kp = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  let h = `<div class="stats">${kp(D.ses.length, 'sesiones')}${kp(D.ses.reduce((a, s) => a + sessionTotal(s), 0), 'minutos de entrenamiento')}${kp(D.played.length, 'partidos jugados')}${kp(`${D.res.G}-${D.res.E}-${D.res.P}`, 'G-E-P')}${kp(`${D.gf}:${D.ga}`, 'goles')}${kp(pts + ' %', 'de los puntos')}</div>`;
  h += `<h3 class="sechead">Minutos de entrenamiento por mes</h3><div class="pt-avoid">${barsSVG(D.mdata, { color: col, unit: 'min' })}</div>`;
  h += `<h3 class="sechead">Carga media por jugador y mes (UA)</h3><div class="pt-avoid">${barsSVG(D.mdata.map(x => ({ l: x.l, v: x.ua })), { color: '#FF5A1F', unit: 'UA' })}</div>`;
  h += `<h3 class="sechead">Minutos por parte de la sesión</h3><div class="pt-avoid">${barsSVG(PHASES.map(([k, n]) => ({ l: n.replace('Vuelta a la calma y reflexión', 'Vuelta calma').replace('Principal', 'P.'), v: D.phaseMinT[k] })), { color: '#2F6FD1', unit: 'min' })}</div>`;
  h += `<h3 class="sechead">Jugadores</h3><div class="tablewrap" style="padding:0"><table class="ptable pt-table"><thead><tr><th>Jugador</th><th>PJ</th><th>Tit.</th><th>Min</th><th>Goles</th><th>Asist.</th><th>🟨</th><th>🟥</th><th>% asist.</th><th>Carga UA</th></tr></thead><tbody>` +
    D.players.sort((a, b) => b.min - a.min || (b.att || 0) - (a.att || 0)).map(r => `<tr><td>${esc(r.p.dorsal || '')} ${esc(r.p.name)}</td><td>${r.pj}</td><td>${r.tit}</td><td>${r.min}</td><td>${r.g || ''}</td><td>${r.a || ''}</td><td>${r.y || ''}</td><td>${r.r || ''}</td><td>${r.att == null ? '—' : Math.round(r.att) + ' %'}</td><td>${r.ua || ''}</td></tr>`).join('') + '</tbody></table></div>';
  const ids = [...new Set([...Object.keys(D.worked), ...D.planned])];
  h += `<h3 class="sechead">Contenidos: planificado frente a trabajado${D.plan ? ` <small>(${esc(D.plan.name)})</small>` : ''}</h3><div class="tablewrap" style="padding:0"><table class="ptable pt-table"><thead><tr><th>Contenido</th><th>Bloque</th><th>Planificado</th><th>Sesiones</th><th>Minutos</th><th>Estado</th></tr></thead><tbody>` +
    (ids.sort((a, b) => ((D.worked[b] || {}).min || 0) - ((D.worked[a] || {}).min || 0)).map(id => { const w = D.worked[id], pl = D.planned.has(id), c = CONTENT[id]; return `<tr><td>${esc(contentLabel(id))}</td><td>${c ? esc(CATS[c.cat].name) : ''}</td><td>${pl ? 'Sí' : '—'}</td><td>${w ? w.n : 0}</td><td>${w ? w.min : 0}</td><td>${pl && !w ? '⚠ Sin trabajar' : w && !pl ? 'Fuera del plan' : w ? '✓ Trabajado' : ''}</td></tr>`; }).join('') || '<tr><td colspan="6">Sin contenidos en el periodo.</td></tr>') + '</tbody></table></div>';
  return h;
}
async function renderSeason() { const D = await seasonData(); $('#snBody').innerHTML = seasonHTML(D, false); }
$('#snFrom').onchange = $('#snTo').onchange = renderSeason;
$('#snPdf').onclick = async () => { const D = await seasonData(); printHTML(`<header class="pt-head"><div><h1>Temporada</h1><p>${esc(prefs.activeCat || 'Todos los equipos')} · del ${esc(parseDate(D.f).toLocaleDateString('es'))} al ${esc(parseDate(D.t).toLocaleDateString('es'))}</p></div></header>` + seasonHTML(D, true).replace(/class="sechead"/g, '').replace(/<h3 >/g, '<h2>').replace(/<\/h3>/g, '</h2>').replace(/<h3/g, '<h2'), { title: 'Temporada ' + (prefs.activeCat || '') }); };

/* ---------- Ficha del jugador: resumen, lesiones, tests físicos ---------- */
const PHYS_TESTS = ['Yo-Yo IR1 (m)', 'Sprint 30 m (s)', 'Sprint 10 m (s)', 'CMJ (cm)', 'Test de Cooper (m)', 'VO2 máx', 'Agilidad T-Test (s)', '1RM sentadilla (kg)', '% grasa', 'Peso (kg)'];
const LOWER_BETTER = /\(s\)|grasa/i;
async function renderPlayerExtra(x) {
  const box = $('#spExtra'); if (!box) return;
  x.injuries = x.injuries || []; x.phys = x.phys || [];
  let sum = '';
  if (SQUAD[x.id]) {
    const E = await loadEvents(), L = E[x.id] || [], a = acwr(L, isoDate(new Date()));
    const mts = (await DB.all('matches')).map(normMatch); let pj = 0, min = 0, g = 0, as = 0;
    mts.filter(m => m.date <= isoDate(new Date())).forEach(m => { const s = m.stats[x.id]; if (s && +s.min) { pj++; min += +s.min; g += +s.g || 0; as += +s.a || 0; } });
    const ses = (await DB.all('sessions')).filter(s => s.att && Object.keys(s.att).length && s.date >= daysAgo(60) && (!s.cat || !x.cat || s.cat === x.cat));
    const pres = ses.filter(s => (s.att[x.id] || {}).a === 'P').length;
    const wl = (await DB.all('wellness')).filter(w => w.pid === x.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    sum = `<div class="stats">${[[pj, 'partidos'], [min, 'minutos'], [`${g} / ${as}`, 'goles / asist.'], [ses.length ? Math.round(pres / ses.length * 100) + ' %' : '—', 'asistencia (60 d)'], [a.ratio == null ? '—' : a.ratio.toFixed(2), 'ACWR'], [wl && WELL.every(([k]) => wl[k]) ? wellTotal(wl) + '/25' : '—', 'último bienestar']].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  }
  const inj = x.injuries.slice().sort((a, b) => (b.from || '').localeCompare(a.from || ''));
  const days = i => i.from ? Math.max(0, dayDiff(i.to || isoDate(new Date()), i.from)) : 0;
  const phys = x.phys.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const prevOf = r => x.phys.filter(q => q.test === r.test && (q.date || '') < (r.date || '')).sort((a, b) => b.date.localeCompare(a.date))[0];
  box.innerHTML = `${sum ? `<h3>Resumen</h3>${sum}` : ''}
    <h3>Historial de lesiones <small class="muted">${inj.length ? inj.length + ' · ' + inj.reduce((a, i) => a + days(i), 0) + ' días de baja' : ''}</small></h3>
    <div class="xlist">${inj.map(i => `<div class="xrow" data-i="${i.id}"><input type="date" data-k="from" value="${i.from || ''}" title="Desde"><input type="date" data-k="to" value="${i.to || ''}" title="Hasta (vacío = sigue de baja)"><input data-k="type" value="${esc(i.type || '')}" placeholder="Tipo (ej.: rotura fibrilar)"><input data-k="zone" value="${esc(i.zone || '')}" placeholder="Zona"><span class="muted small">${days(i)} d${i.to ? '' : ' · activa'}</span><button class="danger" data-del>✕</button></div>`).join('') || '<p class="muted small">Sin lesiones registradas. Al marcar al jugador como «Lesionado» se abre una entrada automáticamente.</p>'}</div>
    <button id="injAdd" class="sadd">＋ Lesión</button>
    <h3>Tests físicos</h3>
    <div class="xlist">${phys.map(r => { const pv = prevOf(r), d = pv && r.value !== '' && pv.value !== '' ? +r.value - +pv.value : null, better = d == null ? null : (LOWER_BETTER.test(r.test) ? d < 0 : d > 0); return `<div class="xrow" data-t="${r.id}"><input type="date" data-k="date" value="${r.date || ''}"><input data-k="test" list="physList" value="${esc(r.test || '')}" placeholder="Test"><input type="number" step="any" data-k="value" value="${r.value ?? ''}" placeholder="Valor">${d == null ? '<span></span>' : `<span class="small" style="color:${better ? 'var(--ok)' : 'var(--bad)'}">${d > 0 ? '+' : ''}${+d.toFixed(2)}</span>`}<button class="danger" data-del>✕</button></div>`; }).join('') || '<p class="muted small">Registra Yo-Yo, sprints, saltos… y verás la evolución respecto al test anterior.</p>'}</div>
    <datalist id="physList">${PHYS_TESTS.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    <button id="physAdd" class="sadd">＋ Test físico</button>
    ${(x.tests || []).length ? `<h3>Evolución del test ludológico</h3><div class="xlist">${x.tests.map(t => `<div class="xrow ro"><span>${esc(parseDate(t.date).toLocaleDateString('es'))}</span>${stageChip(t.final)}<span class="muted small">CB ${t.AB ? STAGE[t.AB] : '—'} · SB ${t.ASB ? STAGE[t.ASB] : '—'} · DCB ${t.DAB ? STAGE[t.DAB] : '—'} · DSB ${t.DASB ? STAGE[t.DASB] : '—'}</span></div>`).join('')}</div>` : ''}`;
  $$('[data-i]', box).forEach(r => { const it = x.injuries.find(i => i.id === r.dataset.i); $$('input', r).forEach(i => i.onchange = () => { it[i.dataset.k] = i.value; renderPlayerExtra(x); }); $('[data-del]', r).onclick = () => { x.injuries = x.injuries.filter(i => i !== it); renderPlayerExtra(x); }; });
  $$('[data-t]', box).forEach(r => { const it = x.phys.find(i => i.id === r.dataset.t); $$('input', r).forEach(i => i.onchange = () => { it[i.dataset.k] = i.dataset.k === 'value' ? (i.value === '' ? '' : +i.value) : i.value; renderPlayerExtra(x); }); $('[data-del]', r).onclick = () => { x.phys = x.phys.filter(i => i !== it); renderPlayerExtra(x); }; });
  $('#injAdd', box).onclick = () => { x.injuries.push({ id: uid(), from: isoDate(new Date()), to: '', type: $('#spNote').value || '', zone: '' }); renderPlayerExtra(x); };
  $('#physAdd', box).onclick = () => { x.phys.push({ id: uid(), date: isoDate(new Date()), test: '', value: '' }); renderPlayerExtra(x); };
}
// Al pasar a «Lesionado» se abre una lesión; al volver a «Disponible» se cierra
function injuryAuto(prev, x) {
  x.injuries = x.injuries || []; const open = x.injuries.find(i => !i.to);
  if (x.status === 'lesionado' && prev !== 'lesionado' && !open) x.injuries.push({ id: uid(), from: isoDate(new Date()), to: '', type: x.statusNote || '', zone: '' });
  if (x.status !== 'lesionado' && prev === 'lesionado' && open) open.to = isoDate(new Date());
}

/* ---------- Inicio: próximo partido, alertas y copia ---------- */
async function homeExtras(G) {
  const today = isoDate(new Date()); await loadMatches();
  const mts = MATCHES.filter(m => catOk(m.cat));
  const next = mts.filter(m => m.date >= today && !isPlayed(m)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const last = mts.filter(isPlayed).sort((a, b) => b.date.localeCompare(a.date))[0];
  const c1 = hmCard('half', 'Próximo partido', next ? ['Abrir', () => openMatch(next)] : ['＋ Partido', () => openMatch(null)]);
  if (next) {
    const dd = dayDiff(next.date, today);
    c1.insertAdjacentHTML('beforeend', `<div class="kv">${dd === 0 ? 'Hoy' : dd === 1 ? 'Mañana' : 'En ' + dd + ' días'}</div><div class="kt">⚽ ${esc(matchLabel(next))}</div><div class="ks">${esc(fmtShort(next.date))}${next.time ? ' · ' + esc(next.time) : ''}${next.comp ? ' · ' + esc(next.comp) : ''} · ${next.callup.length ? next.callup.length + ' convocados' : 'convocatoria pendiente'}</div>`);
    const row = el('div', 'row'); const b1 = el('button', '', '📋 Convocatoria'); b1.onclick = async () => { await openMatch(next); showMatchTab('call'); };
    const b2 = el('button', '', '⏱ Modo partido'); b2.onclick = () => { hideHome(); mm.match = next; openMatchMode(); }; row.append(b1, b2); c1.appendChild(row);
  } else c1.insertAdjacentHTML('beforeend', '<div class="kempty">Añade el calendario de partidos: la app calcula el día MD de cada sesión y lleva los minutos del plantel.</div>');
  if (last) c1.insertAdjacentHTML('beforeend', `<p class="ks">Último: ${resChip(last)} ${esc(matchLabel(last))} · ${esc(fmtShort(last.date))}</p>`);
  G.appendChild(c1);
  const c2 = hmCard('half', 'Carga y bienestar', ['Ver carga', () => openPerf('load')]);
  const E = await loadEvents(), players = squadFor(''), wl = (await DB.all('wellness')).filter(w => w.date >= daysAgo(1));
  const alerts = [];
  players.forEach(p => { const a = acwr(E[p.id], today); if (a.ratio != null && (a.ratio > 1.5 || a.ratio < 0.8) && a.chronic > 0) alerts.push([p, a.ratio > 1.5 ? `ACWR ${a.ratio.toFixed(2)} · riesgo de sobrecarga` : `ACWR ${a.ratio.toFixed(2)} · carga baja`, a.ratio > 1.5 ? '#C62828' : '#2F6FD1']); });
  players.forEach(p => { const w = wl.filter(x => x.pid === p.id).sort((a, b) => b.date.localeCompare(a.date))[0]; if (wellAlert(w)) alerts.push([p, `Bienestar ${wellTotal(w)}/25`, '#B45309']); });
  if (!players.length) c2.insertAdjacentHTML('beforeend', '<div class="kempty">Con el plantel cargado, registra el RPE en cada sesión y el bienestar diario para ver aquí las alertas.</div>');
  else if (!Object.keys(E).length) c2.insertAdjacentHTML('beforeend', '<div class="kempty">Aún no hay carga real: pasa lista y pide el RPE al terminar cada sesión (sección «Asistencia y RPE»).</div>');
  else if (!alerts.length) c2.insertAdjacentHTML('beforeend', '<div class="kempty ok">✓ Sin alertas de carga ni de bienestar.</div>');
  else { const L = el('div', 'alist'); alerts.slice(0, 7).forEach(([p, t, c]) => { const r = el('button', 'arow', `<i style="background:${c}"></i><b>${esc(p.dorsal || '')}</b><span class="an">${esc(p.name)}</span><span class="ad">${esc(t)}</span>`); r.onclick = () => editSquadPlayer(p); L.appendChild(r); }); c2.appendChild(L); }
  const rb = el('div', 'row'); const w1 = el('button', '', '🙂 Bienestar de hoy'); w1.onclick = () => openPerf('well'); const w2 = el('button', '', '📈 Temporada'); w2.onclick = () => openPerf('season'); rb.append(w1, w2); c2.appendChild(rb);
  G.appendChild(c2);
}
function backupBanner(G) {
  const hasData = Object.keys(SQUAD).length || Object.keys(sesProjects).length > 1;
  if (!hasData || !backupOverdue()) return;
  const t = lastBackup(), c = el('section', 'hm-card wide bkbanner');
  c.innerHTML = `<div class="hm-ch"><h3>Protege tus datos</h3></div><p class="ks">${t ? `Tu última copia de seguridad es de hace ${Math.floor((Date.now() - t) / 864e5)} días.` : 'Todavía no has hecho ninguna copia de seguridad.'} Los datos viven solo en este dispositivo: si se borra el navegador, se pierden.</p>`;
  const b = el('button', 'primary', '⤓ Hacer copia ahora'); b.onclick = openBackup; const r = el('div', 'row'); r.appendChild(b); c.appendChild(r);
  G.prepend(c);
}
