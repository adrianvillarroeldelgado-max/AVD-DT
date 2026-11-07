'use strict';
/* Fichas de tarea (9 pasos), sesiones por fases, microciclo, impresión (PDF), presentación y cronómetro de tarea */

const MD_OPTS = ['Libre', 'MD-5', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1', 'MD+2', 'Pretemporada'];
const MD_INFO = {
  'MD-5': ['#7e57c2', 'Recuperación / compensatorio'], 'MD-4': ['#e53935', 'Tensión · espacios reducidos'], 'MD-3': ['#fb8c00', 'Duración · espacios amplios'],
  'MD-2': ['#fdd835', 'Velocidad · táctica del rival'], 'MD-1': ['#43a047', 'Activación · balón parado'], 'MD': ['#1e88e5', 'Partido'],
  'MD+1': ['#00acc1', 'Recuperación'], 'MD+2': ['#8d6e63', 'Descanso / compensatorio'], 'Pretemporada': ['#5c6bc0', 'Pretemporada'], 'Libre': ['#78909c', 'Sin día de partido de referencia'],
};
const INTENSITY = { baja: 'Baja', media: 'Media', alta: 'Alta', maxima: 'Máxima' };
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDate = s => { const [y, m, d] = (s || '').split('-').map(Number); return y ? new Date(y, m - 1, d || 1) : new Date(); };
const fmtDate = s => { if (!s) return ''; const t = parseDate(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function thumbURL(p, w = 480, h = 300) { try { return thumbCanvas(normalize(clone(p)), w, h).toDataURL('image/png'); } catch (e) { return ''; } }
const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
const stageOpts = (cur, empty = '— Sin indicar —') => opt('', empty, cur) + STAGES.map(([k, n]) => opt(k, n, cur)).join('');
const taskLoad = t => (+t.duration || 0) * (RPE_BY_INT[t.intensity] || 5);

/* ---------- Ficha de tarea ---------- */
const TK = { tkObj: 'objective', tkPhys: 'phys', tkPhase: 'phase', tkInt: 'intensity', tkDur: 'duration', tkSeries: 'series', tkWork: 'work', tkRest: 'rest',
  tkPlayers: 'players', tkRules: 'rules', tkScoring: 'scoring', tkVar: 'variants', tkStage: 'stage', tkContent: 'content', tkConsigna: 'consigna',
  tkStrategy: 'strategy', tkStyle: 'style', tkSpaceNote: 'spaceNote', tkScoreType: 'scoreType', tkDesc: 'desc', tkGradDown: 'gradDown', tkGradUp: 'gradUp', tkFeedback: 'feedback' };
function spaceText(p) {
  const z = mainZone(p);
  if (!z) return `Campo ${Math.round(p.field.L)} × ${Math.round(p.field.W)} m (sin espacio delimitado)`;
  if (z.shape === 'rect') { const [x0, y0, x1, y1] = zoneBBox(z); return `${fmtM(x1 - x0).replace(' m', '')} × ${fmtM(y1 - y0)} · ${Math.round(zoneArea(z))} m²`; }
  return zoneSummary(z);
}
function autoPlayers(p) {
  const d = taskDensity(p), gks = p.objs.filter(o => o.type === 'player' && o.gk).length;
  const txt = formatTeams(d.byTeam);
  return txt ? `${txt}${gks ? ` · ${gks} portero${gks > 1 ? 's' : ''}` : ' · sin porteros'}` : '';
}
function taskStatsHTML(p) {
  const d = taskDensity(p), mat = materialText(materialOf(p));
  return `<div class="stat"><b>${d.n && d.zone ? Math.round(d.ratio) : '–'}</b><span>m² por jugador</span></div>
    <div class="stat"><b>${d.n || '–'}</b><span>${esc(formatTeams(d.byTeam) || 'jugadores')}</span></div>
    <div class="stat"><b>${taskLoad(p.task) || '–'}</b><span>carga prevista (UA)</span></div>
    ${mat ? `<div class="statmat"><b>Material:</b> ${esc(mat)}</div>` : ''}`;
}
function taskSteps(p) {
  const t = p.task, hasBoard = p.objs.length > 0;
  return [
    ['Contenido y consigna', !!(t.content && t.consigna)], ['Estrategia didáctica', !!t.strategy], ['Participantes', !!(t.players || taskDensity(p).n)],
    ['Espacio', !!mainZone(p)], ['Puntuación', !!(t.scoreType || t.scoring)], ['Normas', !!t.rules], ['Gradiente', !!(t.gradDown || t.gradUp)],
    ['Preguntas', !!t.feedback], ['Representación gráfica', hasBoard],
  ];
}
function scoreWarning(t) {
  const s = SCORING[t.scoreType]; if (!s || !s.allowed || !t.strategy) return '';
  if (!s.allowed.includes(t.strategy)) return `«${s.name}» solo se recomienda en: ${s.allowed.map(k => STRATEGIES[k].toLowerCase()).join(' y ')}.`;
  return '';
}
function fillTaskSelects() {
  const t = P.task;
  $('#tkPhase').innerHTML = PHASES.map(([k, n]) => opt(k, n, t.phase)).join('');
  $('#tkStage').innerHTML = stageOpts(t.stage);
  const cc = t.content && CONTENT[t.content] ? CONTENT[t.content].cat : ($('#tkCat').value || '');
  $('#tkCat').innerHTML = opt('', 'Todos los tipos', cc) + Object.entries(CATS).map(([k, c]) => opt(k, c.name, cc)).join('');
  fillContentSelect();
  const ph = PHASE[t.phase] || PHASE.p1, rec = ph[2];
  $('#tkStrategy').innerHTML = opt('', '— Elegir —', t.strategy) + PHASES.filter(x => x[2].length).map(([k, n, list]) =>
    `<optgroup label="${esc(n)}">${list.map(s => opt(s, STRATEGIES[s], t.strategy)).join('')}</optgroup>`).join('');
  $('#tkStratHint').textContent = rec.length ? `Sugeridas para ${ph[1].toLowerCase()}: ${rec.map(s => STRATEGIES[s]).join(', ')}.` : `En ${ph[1].toLowerCase()} no se usan tareas de juego.`;
  $('#tkStratHint').classList.toggle('warnline', !!(t.strategy && rec.length && !rec.includes(t.strategy)));
  $('#tkStyle').innerHTML = opt('', '— Elegir —', t.style) + Object.entries(STYLES).map(([k, n]) => opt(k, n, t.style)).join('');
  $('#tkScoreType').innerHTML = opt('', '— Elegir —', t.scoreType) + Object.entries(SCORING).map(([k, s]) => opt(k, s.name, t.scoreType)).join('');
}
function fillContentSelect() {
  const t = P.task, cat = $('#tkCat').value, list = contentsFor(cat || null, t.stage || null, !t.stage);
  $('#tkContent').innerHTML = opt('', '— Elegir contenido —', t.content) + list.map(c => opt(c.id, `${c.name}${c.stage ? ' · ' + STAGE[c.stage] : ''}`, t.content)).join('');
  const c = CONTENT[t.content];
  $('#tkContentDef').textContent = c ? [CATS[c.cat].long, c.stage ? STAGE[c.stage] : '', c.def].filter(Boolean).join(' · ') : '';
  const cons = consignasOf(t.content);
  $('#tkConsSel').innerHTML = opt('', cons.length ? `— ${cons.length} consignas disponibles —` : '— Elige primero un contenido —', '') +
    [...new Set(cons.map(x => x.level))].map(lv => `<optgroup label="${esc(lv)}">${cons.filter(x => x.level === lv).map(x => opt(x.t, x.t, '')).join('')}</optgroup>`).join('');
}
function refreshTaskAuto() {
  $('#tkAutoPlayers').textContent = 'En la pizarra: ' + (autoPlayers(P) || 'no hay jugadores');
  $('#tkAutoSpace').textContent = 'En la pizarra: ' + spaceText(P) + (taskDensity(P).n && mainZone(P) ? ` · ${Math.round(taskDensity(P).ratio)} m²/jugador` : '');
  const w = scoreWarning(P.task); $('#tkScoreWarn').hidden = !w; $('#tkScoreWarn').textContent = w ? '⚠ ' + w : '';
  const t = P.task; $('#tkLoad').textContent = t.duration ? `Carga prevista: ${t.duration} min × RPE ${RPE_BY_INT[t.intensity] || 5} = ${taskLoad(t)} UA (estimación para planificar)` : '';
  $('#taskStats').innerHTML = taskStatsHTML(P);
  const steps = taskSteps(P), done = steps.filter(s => s[1]).length;
  $('#taskSteps').innerHTML = `<div class="s9h"><b>Diseño de la tarea</b><span>${done}/9 pasos</span></div>` +
    steps.map(([n, ok], i) => `<div class="s9 ${ok ? 'ok' : ''}"><i>${ok ? '✓' : i + 1}</i>${esc(n)}</div>`).join('');
}
function openTask() {
  saveNow();
  const t = P.task;
  $('#tkName').value = P.name;
  fillTaskSelects();
  for (const [id, k] of Object.entries(TK)) if (!['tkPhase', 'tkStage', 'tkContent', 'tkStrategy', 'tkStyle', 'tkScoreType'].includes(id)) $('#' + id).value = t[k] ?? '';
  const cv = $('#taskThumb'), w = 480, h = 300; cv.width = w * 2; cv.height = h * 2;
  const x = cv.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); renderScene(x, makeView(w, h, P, 'horizontal', 4), P, { pos: P.frames[0].pos, draws: P.frames[0].draws });
  refreshTaskAuto();
  if (!$('#dlgTask').open) $('#dlgTask').showModal();
}
$('#tkName').oninput = e => { P.name = e.target.value || 'Tarea'; $('#projName').value = P.name; scheduleSave(); };
for (const [id, k] of Object.entries(TK)) $('#' + id).addEventListener('input', e => {
  P.task[k] = ['duration', 'series'].includes(k) ? (e.target.value === '' ? '' : +e.target.value) : e.target.value; P.updated = Date.now(); scheduleSave();
  if (['tkPhase', 'tkStage', 'tkContent', 'tkStrategy'].includes(id)) fillTaskSelects();
  refreshTaskAuto();
});
$('#tkCat').onchange = () => fillContentSelect();
$('#tkConsSel').onchange = e => { if (!e.target.value) return; $('#tkConsigna').value = e.target.value; P.task.consigna = e.target.value; scheduleSave(); e.target.value = ''; refreshTaskAuto(); };
$('#btnTask').onclick = openTask;
$('#tkPrint').onclick = async () => { await saveNow(); printHTML(taskPrintHTML(P, null, true), { title: P.name }); };
$('#tkPresent').onclick = () => { $('#dlgTask').close(); startPresent(null); };
$('#tkToSession').onclick = async () => {
  await saveNow();
  const list = (await DB.all('sessions')).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  pickFrom('Añadir a una sesión', [{ id: '__new', label: '＋ Nueva sesión para hoy', sub: '' },
    ...list.map(s => ({ id: s.id, label: s.name || 'Sesión', sub: `${s.md || ''} · ${fmtDate(s.date)}` }))], async id => {
    let s = id === '__new' ? newSession(isoDate(new Date())) : normSession(list.find(x => x.id === id));
    s.items.push({ pid: P.id, block: P.task.phase || 'p1', dur: +P.task.duration || 10 });
    const ph = s.phases[P.task.phase]; if (ph && !ph.content && P.task.content) { ph.content = P.task.content; ph.consigna = ph.consigna || P.task.consigna; ph.strategy = ph.strategy || P.task.strategy; }
    s.updated = Date.now(); await DB.put('sessions', s);
    $('#dlgTask').close(); toast(`Añadida a «${s.name}»`); openSession(s);
  });
};

/* ---------- Selector genérico ---------- */
function pickFrom(title, items, onPick) {
  $('#pickTitle').textContent = title; $('#pickSearch').value = '';
  const draw = () => {
    const q = $('#pickSearch').value.trim().toLowerCase(), L = $('#pickList'); L.innerHTML = '';
    const f = items.filter(i => !q || (i.label + ' ' + (i.sub || '')).toLowerCase().includes(q));
    if (!f.length) L.innerHTML = '<div class="empty">Nada coincide.</div>';
    let lastGroup = null;
    f.forEach(i => {
      if (i.group && i.group !== lastGroup) { lastGroup = i.group; const h = document.createElement('div'); h.className = 'vgroup'; h.textContent = i.group; L.appendChild(h); }
      const b = document.createElement('button'); b.className = 'pickrow';
      if (i.thumb) { const im = document.createElement('img'); im.src = i.thumb; im.alt = ''; b.appendChild(im); }
      const t = document.createElement('div'); t.innerHTML = `<div class="t">${esc(i.label)}</div>${i.sub ? `<div class="s">${esc(i.sub)}</div>` : ''}`; b.appendChild(t);
      b.onclick = () => { $('#dlgPick').close(); onPick(i.id); };
      L.appendChild(b);
    });
  };
  $('#pickSearch').oninput = draw; draw(); $('#dlgPick').showModal();
}

/* ---------- Sesiones ---------- */
function emptyPhases() { return Object.fromEntries(PHASES.map(([k]) => [k, { content: '', consigna: '', strategy: '', notes: '', dur: k === 'info' ? 2 : k === 'vuelta' ? 5 : 0 }])); }
function normSession(s) {
  if (!s) return s;
  s.phases = Object.assign(emptyPhases(), s.phases || {});
  s.items = (s.items || []).map(i => ({ ...i, block: normPhase(i.block) }));
  s.stage = s.stage || ''; s.md = s.md || 'Libre';
  return s;
}
function newSession(date) {
  return normSession({ id: uid(), name: 'Sesión ' + parseDate(date).toLocaleDateString('es', { day: 'numeric', month: 'short' }), date, md: (typeof mdFor === 'function' ? mdFor(date, prefs.activeCat || prefs.lastCat || '') : 'Libre'), cat: (prefs.activeCat || prefs.lastCat || ''), objective: '', notes: '', items: [], created: Date.now(), updated: Date.now() });
}
let weekStart = mondayOf(new Date()), curSes = null, sesProjects = {};
async function loadProjectsMap() { sesProjects = {}; (await DB.all('projects')).forEach(p => sesProjects[p.id] = normalize(p)); }
function phaseMin(s, k) { const items = s.items.filter(i => i.block === k); return items.length ? items.reduce((a, i) => a + (+i.dur || 0), 0) : (+s.phases[k].dur || 0); }
function sessionTotal(s) { s = normSession(s); return PHASES.reduce((a, [k]) => a + phaseMin(s, k), 0); }
function sessionLoad(s) { return s.items.reduce((a, i) => { const p = sesProjects[i.pid]; return a + (+i.dur || 0) * (RPE_BY_INT[p ? p.task.intensity : 'media'] || 5); }, 0); }
async function openSessions(tab) { await saveNow(); await loadProjectsMap(); $('#dlgSessions').showModal(); showPlanTab(tab || 'week'); }
$('#btnSessions').onclick = () => openSessions();
$('#wkPrev').onclick = () => { weekStart.setDate(weekStart.getDate() - 7); renderSessions(); };
$('#wkNext').onclick = () => { weekStart.setDate(weekStart.getDate() + 7); renderSessions(); };
$('#wkToday').onclick = () => { weekStart = mondayOf(new Date()); renderSessions(); };
$('#sesSearch').oninput = () => renderSessions();
$('#btnNewSession').onclick = async () => { const s = newSession(isoDate(new Date())); await DB.put('sessions', s); openSession(s); };
$('#sesMD').innerHTML = MD_OPTS.map(m => opt(m, m, '')).join('');
function mdChip(md) { const i = MD_INFO[md] || ['#78909c', '']; return md && md !== 'Libre' ? `<span class="mdchip" style="background:${i[0]}">${esc(md)}</span>` : ''; }
async function renderSessions() {
  const all = (await DB.all('sessions')).map(normSession).filter(s => typeof catOk !== 'function' || catOk(s.cat)), today = isoDate(new Date());
  const mts = typeof loadMatches === 'function' ? (await loadMatches()).filter(m => catOk(m.cat)) : [];
  const end = new Date(weekStart); end.setDate(end.getDate() + 6);
  $('#wkLbl').textContent = `${weekStart.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const g = $('#weekGrid'); g.innerHTML = '';
  let weekMin = 0, weekLoad = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); const ds = isoDate(d);
    const col = document.createElement('div'); col.className = 'day' + (ds === today ? ' today' : '');
    col.innerHTML = `<div class="dh">${DOW[i]} <b>${d.getDate()}</b></div>`;
    mts.filter(m => m.date === ds).forEach(m => { const c = document.createElement('button'); c.className = 'mtchip'; c.innerHTML = `${resChip(m)}<span>${esc(m.rival ? 'vs ' + m.rival : 'Partido')}</span><small>${esc(m.time || '')}</small>`; c.onclick = () => openMatch(m); col.appendChild(c); });
    all.filter(s => s.date === ds).forEach(s => {
      const mins = sessionTotal(s), load = sessionLoad(s); weekMin += mins; weekLoad += load;
      const c = document.createElement('button'); c.className = 'sescard';
      const main = s.phases.p1.content || s.phases.p2.content;
      c.innerHTML = `${mdChip(s.md)}<div class="t">${esc(s.name)}</div><div class="s">${mins} min${load ? ' · ' + load + ' UA' : ''}</div>${main ? `<div class="s">${esc(contentLabel(main))}</div>` : ''}`;
      c.onclick = () => openSession(s); col.appendChild(c);
    });
    const add = document.createElement('button'); add.className = 'dayadd'; add.textContent = '＋'; add.title = 'Nueva sesión este día';
    add.onclick = async () => { const s = newSession(ds); await DB.put('sessions', s); openSession(s); };
    col.appendChild(add); g.appendChild(col);
  }
  $('#wkTotal').textContent = weekMin ? `${weekMin} min de entrenamiento · carga prevista ${weekLoad} UA` : '';
  const q = $('#sesSearch').value.trim().toLowerCase(), L = $('#sesList'); L.innerHTML = '';
  const list = all.filter(s => !q || [s.name, s.objective, s.cat, s.md, contentLabel(s.phases.p1.content)].join(' ').toLowerCase().includes(q)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!list.length) L.innerHTML = '<div class="empty">Todavía no hay sesiones. Crea una con «＋ Nueva sesión», desde el mesociclo o desde la ficha de una tarea.</div>';
  list.forEach(s => {
    const r = document.createElement('div'); r.className = 'vitem';
    const main = s.phases.p1.content;
    r.innerHTML = `<div class="info">${mdChip(s.md)} <span class="t" style="display:inline">${esc(s.name)}</span><div class="s">${esc(fmtDate(s.date))} · ${sessionTotal(s)} min · ${s.items.length} tareas${s.cat ? ' · ' + esc(s.cat) : ''}${s.stage ? ' · ' + STAGE[s.stage] : ''}</div>${main ? `<div class="s">${esc(contentLabel(main))}${s.phases.p1.consigna ? ': ' + esc(s.phases.p1.consigna) : ''}</div>` : ''}</div>`;
    r.querySelector('.info').onclick = () => openSession(s);
    const b = document.createElement('button'); b.textContent = 'Abrir'; b.onclick = () => openSession(s); r.appendChild(b);
    L.appendChild(r);
  });
}
async function openSession(s) {
  await loadProjectsMap(); curSes = normSession(s);
  $('#sesName').value = s.name || ''; $('#sesDate').value = s.date || ''; $('#sesMD').value = s.md || 'Libre';
  $('#sesStage').innerHTML = stageOpts(s.stage);
  $('#sesCat').value = s.cat || ''; $('#sesObj').value = s.objective || ''; $('#sesNotes').value = s.notes || '';
  const cats = new Set(Object.values(SQUAD).map(p => p.cat).filter(Boolean)); (await DB.all('sessions')).forEach(x => x.cat && cats.add(x.cat));
  $('#sesCatList').innerHTML = [...cats].map(c => `<option value="${esc(c)}">`).join('');
  $('#sesPlanInfo').hidden = !s.plan;
  if (s.plan) { const pl = await DB.get('plans', s.plan.id); $('#sesPlanInfo').textContent = `${pl ? pl.name : 'Plan'} · Mes ${s.plan.m + 1} · Semana ${s.plan.w + 1} · ${(pl && pl.days[s.plan.d] ? pl.days[s.plan.d].label : 'Día ' + (s.plan.d + 1))}`; }
  renderSessionBlocks();
  if (!$('#dlgSession').open) $('#dlgSession').showModal();
}
function saveSes() { if (!curSes) return; curSes.updated = Date.now(); DB.put('sessions', curSes); }
[['sesName', 'name'], ['sesDate', 'date'], ['sesMD', 'md'], ['sesCat', 'cat'], ['sesObj', 'objective'], ['sesNotes', 'notes'], ['sesStage', 'stage']].forEach(([id, k]) =>
  $('#' + id).addEventListener('input', e => {
    if (!curSes) return; curSes[k] = e.target.value;
    if (k === 'cat') { prefs.lastCat = e.target.value; savePrefs(); }
    saveSes(); if (k === 'md' || k === 'stage') renderSessionBlocks();
  }));
$('#dlgSession').addEventListener('close', () => { if ($('#dlgSessions').open && !$('#ptWeek').hidden) renderSessions(); });
function phaseFieldsHTML(k, ph, stage) {
  const p = PHASE[k];
  if (k === 'info' || k === 'vuelta') return `<div class="pfields"><label class="inline small">Duración <input data-f="dur" type="number" min="0" max="60" value="${+ph.dur || 0}" style="width:56px"> min</label>
    <input data-f="notes" class="grow" value="${esc(ph.notes || '')}" placeholder="${k === 'info' ? 'Qué se explica: contenido, consigna y objetivo' : 'Preguntas de reflexión y cierre'}"></div>`;
  const cat = k === 'act' ? ['hmb', 'percep', 'espacio'] : ['fbi_con', 'fbi_sin', 'fbc'];
  const contents = cat.flatMap(c => contentsFor(c, stage || null, !stage));
  const cons = consignasOf(ph.content);
  return `<div class="pfields">
    <select data-f="content" title="Contenido">${opt('', '— Contenido —', ph.content)}${cat.map(c => `<optgroup label="${CATS[c].name}">${contents.filter(x => x.cat === c).map(x => opt(x.id, x.name + (x.stage ? ' · ' + STAGE[x.stage] : ''), ph.content)).join('')}</optgroup>`).join('')}</select>
    <select data-f="strategy" title="Estrategia didáctica">${opt('', '— Estrategia —', ph.strategy)}${p[2].map(s => opt(s, STRATEGIES[s], ph.strategy)).join('')}</select>
    <input data-f="consigna" class="grow" list="dl_${k}" value="${esc(ph.consigna || '')}" placeholder="Consigna">
    <datalist id="dl_${k}">${cons.map(c => `<option value="${esc(c.t)}">`).join('')}</datalist></div>`;
}
function renderSessionBlocks() {
  const s = curSes, wrap = $('#sesBlocks'); wrap.innerHTML = '';
  $('#sesMDInfo').textContent = s.md && s.md !== 'Libre' ? `${s.md}: ${MD_GUIDE[s.md] || (MD_INFO[s.md] || [])[1] || ''}` : 'Elige el día del microciclo si la sesión se planifica respecto a un partido.';
  PHASES.forEach(([bk, bl, strats, hint]) => {
    const items = s.items.map((it, i) => ({ it, i })).filter(x => x.it.block === bk), ph = s.phases[bk];
    const box = document.createElement('div'); box.className = 'sblock' + (bk === 'info' || bk === 'vuelta' ? ' slim' : '');
    box.innerHTML = `<div class="sbh"><b>${bl}</b><span class="muted small">${esc(hint)}</span><span>${phaseMin(s, bk)} min</span></div>` + phaseFieldsHTML(bk, ph, s.stage);
    $$('[data-f]', box).forEach(inp => inp.addEventListener('change', e => {
      const f = inp.dataset.f; ph[f] = f === 'dur' ? +inp.value || 0 : inp.value;
      if (f === 'content') { ph.consigna = ''; if (bk === 'p1') ['p2', 'p3'].forEach(x => { if (!s.phases[x].content) s.phases[x].content = inp.value; }); }
      if (f === 'consigna' && bk === 'p1') ['p2', 'p3'].forEach(x => { if (!s.phases[x].consigna && s.phases[x].content === ph.content) s.phases[x].consigna = inp.value; });
      saveSes(); renderSessionBlocks();
    }));
    items.forEach(({ it, i }) => {
      const p = sesProjects[it.pid], row = document.createElement('div'); row.className = 'srow';
      if (p) {
        const cv = thumbCanvas(p, 96, 60); cv.className = 'sthumb'; cv.title = 'Abrir en la pizarra'; cv.onclick = () => openTaskFromSession(p); row.appendChild(cv);
        const d = taskDensity(p), warns = [];
        if (strats.length && p.task.strategy && !strats.includes(p.task.strategy)) warns.push(`estrategia sugerida: ${strats.map(x => STRATEGIES[x]).join(' / ')}`);
        if (ph.content && p.task.content && p.task.content !== ph.content) warns.push('trabaja otro contenido');
        const info = document.createElement('div'); info.className = 'sinfo';
        info.innerHTML = `<div class="t">${esc(p.name)}</div><div class="s">${esc([p.task.strategy ? STRATEGIES[p.task.strategy] : '', contentLabel(p.task.content), d.n && d.zone ? Math.round(d.ratio) + ' m²/jug' : '', p.task.intensity ? 'RPE ' + RPE_BY_INT[p.task.intensity] : ''].filter(Boolean).join(' · '))}</div>${warns.length ? `<div class="s warnline">⚠ ${esc(warns.join(' · '))}</div>` : ''}`;
        row.appendChild(info);
      } else { row.appendChild(Object.assign(document.createElement('div'), { className: 'sinfo', innerHTML: '<div class="t muted">(tarea eliminada)</div>' })); }
      const dur = document.createElement('label'); dur.className = 'inline small';
      dur.innerHTML = `<input type="number" min="1" max="180" value="${+it.dur || 0}" style="width:58px"> min`;
      $('input', dur).onchange = e => { it.dur = clamp(+e.target.value || 1, 1, 180); saveSes(); renderSessionBlocks(); };
      row.appendChild(dur);
      const mk = (txt, title, fn, cls) => { const b = document.createElement('button'); b.textContent = txt; b.title = title; if (cls) b.className = cls; b.onclick = fn; row.appendChild(b); };
      mk('↑', 'Subir', () => { const prev = s.items.map((x, j) => j).filter(j => j < i && s.items[j].block === bk).pop(); if (prev !== undefined) { [s.items[prev], s.items[i]] = [s.items[i], s.items[prev]]; saveSes(); renderSessionBlocks(); } });
      mk('↓', 'Bajar', () => { const nx = s.items.map((x, j) => j).find(j => j > i && s.items[j].block === bk); if (nx !== undefined) { [s.items[nx], s.items[i]] = [s.items[i], s.items[nx]]; saveSes(); renderSessionBlocks(); } });
      mk('✕', 'Quitar de la sesión', () => { s.items.splice(i, 1); saveSes(); renderSessionBlocks(); }, 'danger');
      box.appendChild(row);
    });
    {
      const bar = document.createElement('div'); bar.className = 'sbar';
      const lib = document.createElement('button'); lib.className = 'sadd'; lib.textContent = '📚 Desde la biblioteca';
      lib.title = 'Ejercicios de la biblioteca para esta parte, contenido y consigna';
      lib.onclick = () => openExLib({ phase: bk, stage: s.stage || undefined, content: ph.content || '', consigna: ph.consigna || '', pick: { ses: s, block: bk } });
      bar.appendChild(lib);
      if (bk === 'info' || bk === 'vuelta') { box.appendChild(bar); wrap.appendChild(box); return; }
      const add = document.createElement('button'); add.className = 'sadd'; add.textContent = '＋ Añadir tarea existente';
      add.onclick = () => {
        const list = Object.values(sesProjects).sort((a, b) => ((b.task.content === ph.content && !!ph.content) - (a.task.content === ph.content && !!ph.content)) || ((b.task.phase === bk) - (a.task.phase === bk)) || b.updated - a.updated);
        pickFrom('Añadir a ' + bl.toLowerCase(), list.map(p => ({ id: p.id, label: p.name, sub: [p.task.strategy ? STRATEGIES[p.task.strategy] : p.cat, contentLabel(p.task.content), (p.task.duration || 10) + ' min'].filter(Boolean).join(' · '), thumb: thumbURL(p, 120, 75) })), id => {
          const p = sesProjects[id]; s.items.push({ pid: id, block: bk, dur: +p.task.duration || 10 });
          if (!ph.content && p.task.content) { ph.content = p.task.content; ph.consigna = ph.consigna || p.task.consigna; ph.strategy = ph.strategy || p.task.strategy; }
          saveSes(); renderSessionBlocks();
        });
      };
      const nw = document.createElement('button'); nw.className = 'sadd'; nw.textContent = '＋ Crear tarea nueva';
      nw.onclick = () => createTaskForPhase(bk);
      bar.append(add, nw); box.appendChild(bar);
    }
    wrap.appendChild(box);
  });
  const mat = {}; let maxN = 0;
  s.items.forEach(it => { const p = sesProjects[it.pid]; if (!p) return; const m = materialOf(p); for (const k in m) mat[k] = Math.max(mat[k] || 0, m[k]); maxN = Math.max(maxN, taskDensity(p).n); });
  if (typeof renderSesAttendance === 'function') renderSesAttendance();
  const load = sessionLoad(s);
  $('#sesSummary').innerHTML = `<div class="stat"><b>${sessionTotal(s)} min</b><span>tiempo total</span></div><div class="stat"><b>${s.items.length}</b><span>tareas</span></div><div class="stat"><b>${maxN || '–'}</b><span>jugadores (máx.)</span></div><div class="stat"><b>${load || '–'}</b><span>carga prevista (UA)</span></div>` +
    (Object.keys(mat).length ? `<div class="statmat"><b>Material necesario:</b> ${esc(materialText(mat))}</div>` : '');
}
async function createTaskForPhase(bk) {
  const s = curSes, ph = s.phases[bk], strat = ph.strategy || (PHASE[bk][2][0] || '');
  const p = normalize(newProject(`${PHASE[bk][1]} · ${contentLabel(ph.content) || 'Tarea'}`, P ? P.field.type : 'f11'));
  if (P && P.field.type === 'custom') p.field = clone(P.field);
  p.cat = STRATEGIES[strat] || 'Sesión';
  Object.assign(p.task, { phase: bk, content: ph.content, consigna: ph.consigna, strategy: strat, stage: s.stage, duration: 10, style: bk === 'act' ? 'mando' : 'descubrimiento' });
  await DB.put('projects', p);
  s.items.push({ pid: p.id, block: bk, dur: 10 }); saveSes();
  await saveNow(); $('#dlgSession').close(); $('#dlgSessions').close(); loadProject(p);
  toast('Tarea creada: dibújala en la pizarra y completa la ficha (📝)', 4500);
}
async function openTaskFromSession(p) {
  await saveNow(); const fresh = await DB.get('projects', p.id); if (!fresh) return;
  $('#dlgSession').close(); $('#dlgSessions').close(); loadProject(fresh); openTask();
}
$('#sesPresent').onclick = () => {
  const ids = PHASES.flatMap(([k]) => curSes.items.filter(i => i.block === k).map(i => i.pid)).filter(id => sesProjects[id]);
  if (!ids.length) { toast('Añade tareas a la sesión para presentarla'); return; }
  $('#dlgSession').close(); $('#dlgSessions').close(); startPresent(ids, curSes);
};
$('#sesPrint').onclick = () => printHTML(sessionPrintHTML(curSes), { title: curSes.name });
$('#sesDup').onclick = async () => { const n = clone(curSes); n.id = uid(); n.name += ' (copia)'; delete n.plan; n.created = n.updated = Date.now(); await DB.put('sessions', n); openSession(n); toast('Sesión duplicada'); };
$('#sesDel').onclick = async () => {
  if (!await confirmBox(`¿Borrar la sesión «${curSes.name}»? Las tareas no se borran.`)) return;
  await DB.del('sessions', curSes.id); curSes = null; $('#dlgSession').close(); if ($('#dlgSessions').open) renderSessions();
};

/* ---------- Impresión / PDF (formato de ficha del cuaderno) ---------- */
const nl2br = v => esc(v || '').replace(/\n/g, '<br>');
function cell(label, value, cls = '') { return `<div class="pc ${cls}"><span>${label}</span><div>${value || '&nbsp;'}</div></div>`; }
function taskPrintHTML(p, dur, single) {
  const t = p.task, d = taskDensity(p), mat = materialText(materialOf(p)), ph = PHASE[t.phase] || PHASE.p1;
  const time = [dur || t.duration ? (dur || t.duration) + ' min' : '', t.series > 1 ? t.series + ' series' : '', t.work ? 'trabajo ' + t.work : '', t.rest ? 'descanso ' + t.rest : ''].filter(Boolean).join(' · ');
  const space = esc(spaceText(p)) + (d.n && d.zone ? `<br><small>${Math.round(d.ratio)} m² por jugador</small>` : '') + (t.spaceNote ? `<br><small>${esc(t.spaceNote)}</small>` : '');
  const score = [SCORING[t.scoreType] ? SCORING[t.scoreType].name : '', t.scoring].filter(Boolean).map(esc).join(': ');
  const grad = [t.gradDown ? '↓ ' + esc(t.gradDown) : '', t.gradUp ? '↑ ' + esc(t.gradUp) : ''].filter(Boolean).join('<br>');
  const content = t.content ? `<b>${esc(contentLabel(t.content))}</b><br><small>${esc(CATS[CONTENT[t.content]?.cat]?.long || '')}${t.stage ? ' · ' + STAGE[t.stage] : ''}</small>` : esc(t.objective);
  return `<article class="pt-task${single ? ' single' : ''}">
    <h3>${esc(p.name)}<small>${esc(ph[1])}${t.intensity ? ' · intensidad ' + INTENSITY[t.intensity].toLowerCase() : ''}</small></h3>
    <div class="pgrid">
      ${cell('Contenido', content, 'c2')}${cell('Consigna', nl2br(t.consigna), 'c2')}
      ${cell('Estrategia didáctica', esc([STRATEGIES[t.strategy], STYLES[t.style]].filter(Boolean).join(' · ')))}${cell('Tiempo', esc(time))}${cell('Espacio', space, 'c2')}
      ${cell('Número de jugadores / equipos', esc(t.players || autoPlayers(p)), 'c2')}${cell('Material', esc(mat), 'c2')}
      <div class="pc c4 desc"><span>Descripción</span><div class="pdesc"><img src="${thumbURL(p, 640, 400)}" alt=""><div>${nl2br(t.desc || t.objective)}${t.variants ? `<p><b>Variantes:</b> ${nl2br(t.variants)}</p>` : ''}</div></div></div>
      ${cell('Normativas', nl2br(t.rules), 'c2')}${cell('Puntuación', score, 'c2')}
      ${cell('Gradiente', grad, 'c2')}${cell('Feedback / preguntas', nl2br(t.feedback), 'c2')}
    </div></article>`;
}
function sessionPrintHTML(s) {
  s = normSession(s);
  let h = `<header class="pt-head"><div><h1>${esc(s.name)}</h1><p>${esc(fmtDate(s.date))}${s.cat ? ' · ' + esc(s.cat) : ''}${s.stage ? ' · ' + STAGE[s.stage] : ''}</p></div>
    <div class="pt-meta">${mdChip(s.md)}<b>${sessionTotal(s)} min</b>${sessionLoad(s) ? `<small>${sessionLoad(s)} UA previstas</small>` : ''}</div></header>`;
  if (s.objective) h += `<p class="pt-obj"><b>Objetivo:</b> ${esc(s.objective)}</p>`;
  h += `<table class="pt-table"><thead><tr><th>Parte de la sesión</th><th>Contenidos de entrenamiento</th><th>Estrategias didácticas</th><th>Duración</th></tr></thead><tbody>` +
    PHASES.map(([k, n]) => {
      const ph = s.phases[k], tasks = s.items.filter(i => i.block === k && sesProjects[i.pid]).map(i => sesProjects[i.pid]);
      const cont = (k === 'info' || k === 'vuelta') ? esc(ph.notes || '') : [ph.content ? `<b>${esc(contentLabel(ph.content))}</b>` : '', ph.consigna ? esc(ph.consigna) : ''].filter(Boolean).join('<br>');
      const strat = [...new Set([ph.strategy, ...tasks.map(t => t.task.strategy)].filter(Boolean))].map(x => STRATEGIES[x]).join(', ');
      return `<tr><td><b>${esc(n)}</b></td><td>${cont || '–'}</td><td>${esc(strat) || '–'}</td><td>${phaseMin(s, k)} min</td></tr>`;
    }).join('') + `</tbody></table>`;
  PHASES.forEach(([k, n]) => {
    const items = s.items.filter(i => i.block === k && sesProjects[i.pid]); if (!items.length) return;
    h += `<h2>${esc(n)} <small>${phaseMin(s, k)} min</small></h2>` + items.map(i => taskPrintHTML(sesProjects[i.pid], i.dur)).join('');
  });
  if (s.notes) h += `<p class="pt-obj"><b>Notas:</b> ${nl2br(s.notes)}</p>`;
  return h;
}
/* printHTML(html, opts) está en pdf.js: vista previa, descarga del PDF e impresión */

/* ---------- Modo presentación ---------- */
async function startPresent(ids, ses) {
  await saveNow();
  presenting = { ids: ids || null, idx: 0, origId: P.id, ses: ses || null };
  setTool('move'); sel = null; showSel(); closePanel();
  document.body.classList.add('presenting'); $('#present').hidden = false; $('#prNotes').hidden = true; $('#prClock').hidden = true; timerReset();
  try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) {}
  if (ids) await presentLoad(0); else { cur = 0; presentUI(); }
  setTimeout(resize, 60);
}
async function presentLoad(i) {
  if (!presenting || !presenting.ids) return;
  presenting.idx = clamp(i, 0, presenting.ids.length - 1);
  const p = await DB.get('projects', presenting.ids[presenting.idx]); if (p) { if (playing) stopPlay(); loadProject(p); }
  cur = 0; renderFrames(); render(); timerReset(); presentUI();
}
function presentUI() {
  if (!presenting) return;
  const t = P.task, d = taskDensity(P), multi = presenting.ids && presenting.ids.length > 1;
  $('#prTitle').textContent = P.name;
  $('#prSub').textContent = [multi ? `Tarea ${presenting.idx + 1}/${presenting.ids.length}` : '', PHASE[t.phase] ? PHASE[t.phase][1] : '', t.duration ? t.duration + ' min' : '', t.players || formatTeams(d.byTeam), d.zone && d.n ? Math.round(d.ratio) + ' m²/jug' : ''].filter(Boolean).join(' · ');
  $('#prStep').textContent = P.frames.length > 1 ? `Paso ${cur + 1}/${P.frames.length}` : '';
  $('#prPrevTask').hidden = $('#prNextTask').hidden = !multi;
  $('#prPrevTask').disabled = presenting.idx === 0; $('#prNextTask').disabled = !multi || presenting.idx >= presenting.ids.length - 1;
  $('#prPlay').textContent = playing ? '❚❚' : '▶';
  const rows = [['Contenido', contentLabel(t.content)], ['Consigna', t.consigna], ['Objetivo', t.objective], ['Normativas', t.rules], ['Puntuación', [SCORING[t.scoreType]?.name, t.scoring].filter(Boolean).join(': ')], ['Variantes', t.variants]].filter(r => r[1]);
  $('#prNotes').innerHTML = rows.length ? rows.map(([k, v]) => `<p><b>${k}:</b> ${nl2br(v)}</p>`).join('') : '<p class="muted">Esta tarea no tiene consignas. Escríbelas en 📝 Ficha.</p>';
}
function presentStep(dir) {
  if (playing) stopPlay();
  const n = cur + dir;
  if (n >= 0 && n < P.frames.length) { cur = n; renderFrames(); render(); }
  else if (presenting.ids && dir > 0 && presenting.idx < presenting.ids.length - 1) { presentLoad(presenting.idx + 1); return; }
  else if (presenting.ids && dir < 0 && presenting.idx > 0) { presentLoad(presenting.idx - 1); return; }
  presentUI();
}
async function stopPresent() {
  if (!presenting) return;
  const orig = presenting.origId; presenting = null; timerStop();
  if (playing) stopPlay();
  document.body.classList.remove('presenting'); $('#present').hidden = true;
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
  if (orig && orig !== P.id) { const p = await DB.get('projects', orig); if (p) loadProject(p); }
  setTimeout(resize, 60); showSel();
}
$('#btnPresent').onclick = () => startPresent(null);
$('#prExit').onclick = stopPresent;
$('#prPrev').onclick = () => presentStep(-1);
$('#prNext').onclick = () => presentStep(1);
$('#prPlay').onclick = () => { playing ? stopPlay() : play(); presentUI(); };
$('#prPrevTask').onclick = () => presentLoad(presenting.idx - 1);
$('#prNextTask').onclick = () => presentLoad(presenting.idx + 1);
$('#prInfo').onclick = () => { $('#prNotes').hidden = !$('#prNotes').hidden; };
$('#prTimer').onclick = () => { $('#prClock').hidden = !$('#prClock').hidden; timerDraw(); };
canvas.addEventListener('click', e => { if (!presenting) return; const r = canvas.getBoundingClientRect(); presentStep(e.clientX - r.left < r.width * .3 ? -1 : 1); });
document.addEventListener('keydown', e => {
  if (!presenting) return;
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stopPresent(); }
  else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); presentStep(1); }
  else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); presentStep(-1); }
  else if (k === ' ') { e.preventDefault(); e.stopImmediatePropagation(); playing ? stopPlay() : play(); presentUI(); }
  else if (k.toLowerCase() === 'i') { $('#prNotes').hidden = !$('#prNotes').hidden; }
  else if (k.toLowerCase() === 't') { $('#prTimer').click(); }
}, true);
document.addEventListener('fullscreenchange', () => { setTimeout(resize, 80); });
setInterval(() => { if (presenting) { const pl = $('#prPlay'); const want = playing ? '❚❚' : '▶'; if (pl.textContent !== want) pl.textContent = want; const st = P.frames.length > 1 ? `Paso ${cur + 1}/${P.frames.length}` : ''; if ($('#prStep').textContent !== st) $('#prStep').textContent = st; } }, 250);

/* ---------- Cronómetro de la tarea ----------
   Guion para dirigir la tarea: organización y explicación (1-2 min), gradiente hacia el 60 % del tiempo,
   feedback constante y cierre reflexivo hacia el 90 %. */
let tmr = { start: 0, acc: 0, running: false, id: null, fired: {} }, audioCtx = null;
function beep(n = 1) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < n; i++) { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      const t0 = audioCtx.currentTime + i * .3; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.4, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .22); o.start(t0); o.stop(t0 + .25); }
  } catch (e) {}
}
function timerTotal() { return Math.max(1, +P.task.duration || 10) * 60; }
function timerElapsed() { return tmr.acc + (tmr.running ? (performance.now() - tmr.start) / 1000 : 0); }
function timerCues() {
  const T = timerTotal(), t = P.task;
  return [
    [0, 'Organización y explicación', `${contentLabel(t.content) || 'Tarea'}${t.consigna ? ' · ' + t.consigna : ''}`],
    [Math.min(120, T * .15), 'Feedback constante', t.feedback ? 'Preguntas: ' + t.feedback : 'Refuerza la consigna durante el juego'],
    [T * .6, 'Aplicar gradiente', [t.gradDown ? '↓ ' + t.gradDown : '', t.gradUp ? '↑ ' + t.gradUp : ''].filter(Boolean).join(' · ') || 'Facilita o dificulta según cómo fluya la tarea'],
    [T * .9, 'Cierre reflexivo', t.feedback ? t.feedback : '¿Qué hemos aprendido? Relaciona con la consigna'],
    [T, 'Fin de la tarea', ''],
  ];
}
function timerDraw() {
  if (!P) return;
  const T = timerTotal(), e = Math.min(timerElapsed(), T), cues = timerCues();
  const f = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  $('#pcTime').textContent = f(e); $('#pcTotal').textContent = ' / ' + f(T);
  $('#pcFill').style.width = (e / T * 100) + '%';
  const c = [...cues].reverse().find(x => e >= x[0]) || cues[0];
  $('#pcCue').innerHTML = `<b>${esc(c[1])}</b>${c[2] ? `<span>${esc(c[2])}</span>` : ''}`;
  $('#pcStart').textContent = tmr.running ? '❚❚ Pausa' : (e > 0 && e < T ? '▶ Seguir' : '▶ Iniciar');
  cues.forEach((x, i) => { if (i && e >= x[0] && !tmr.fired[i]) { tmr.fired[i] = 1; beep(i === cues.length - 1 ? 3 : 1); } });
  if (e >= T && tmr.running) timerStop();
}
function timerStop() { if (tmr.running) { tmr.acc = timerElapsed(); tmr.running = false; } clearInterval(tmr.id); tmr.id = null; if (P) timerDraw(); }
function timerReset() { clearInterval(tmr.id); tmr = { start: 0, acc: 0, running: false, id: null, fired: {} }; if (P && $('#prClock')) timerDraw(); }
$('#pcStart').onclick = () => {
  if (tmr.running) { timerStop(); return; }
  if (timerElapsed() >= timerTotal()) timerReset();
  tmr.start = performance.now(); tmr.running = true; beep(1); tmr.id = setInterval(timerDraw, 250); timerDraw();
};
$('#pcReset').onclick = timerReset;
