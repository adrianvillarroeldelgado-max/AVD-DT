'use strict';
/* Inicio: panel que resume la planificación, el plantel y la metodología, con accesos a todas las funciones */

const HOME_ACTIONS = [
  ['board', '🟩', 'Pizarra', 'Dibuja y anima jugadas', () => hideHome()],
  ['newtac', '＋', 'Nueva táctica', 'Empieza una pizarra vacía', async () => { await saveNow(); const p = newProject('Nueva táctica', P ? P.field.type : 'f11'); await DB.put('projects', p); loadProject(p); hideHome(); }],
  ['tactics', '☰', 'Mis tácticas', 'Busca, ordena e importa', () => openProjects()],
  ['session', '📅', 'Nueva sesión', 'Por fases, con tiempo y carga', async () => { await loadProjectsMap(); const s = newSession(isoDate(new Date())); await DB.put('sessions', s); openSession(s); }],
  ['plan', '🗓', 'Plan de temporada', '6 meses de contenidos', () => openSessions('plan')],
  ['meso', '🧩', 'Mesociclo', 'Consignas por semana', () => openSessions('meso')],
  ['eval', '🧠', 'Test ludológico', 'Nivel de comprensión del juego', () => openSessions('eval')],
  ['squad', '👤', 'Plantel', 'Disponibilidad y fichas', () => $('#btnSquad').click()],
  ['matches', '🏆', 'Partidos', 'Calendario, convocatoria y rival', () => openPerf('matches')],
  ['perf', '📊', 'Carga y bienestar', 'Asistencia, RPE, ACWR y temporada', () => openPerf('load')],
  ['exlib', '📚', 'Biblioteca de ejercicios', 'Por sub-etapa, fase, contenido y consigna', () => openExLib({ pick: null })],
  ['drills', '🎬', 'Videos y jugadas', 'Videoteca y análisis', () => { $('#btnLibrary').click(); showLibTab('videos'); }],
];
let homeStage = null, homeContent = null;

function showHome() { $('#home').hidden = false; document.body.classList.add('at-home'); renderHome(); }
function hideHome() { $('#home').hidden = true; document.body.classList.remove('at-home'); setTimeout(resize, 30); }
$('#btnHome').onclick = () => showHome();
$('#hmBoard').onclick = () => hideHome();
$('#hmStart').onchange = e => { prefs.homeOnStart = e.target.checked; savePrefs(); };
['dlgSessions', 'dlgSession', 'dlgSquad', 'dlgPerf', 'dlgMatch', 'dlgBackup', 'dlgProjects', 'dlgLibrary', 'dlgTeamTest', 'dlgPlayerTest', 'dlgSqPlayer', 'dlgTask'].forEach(id =>
  $('#' + id).addEventListener('close', () => { if (!$('#home').hidden) setTimeout(renderHome, 50); }));

function hmCard(cls, title, action) {
  const c = el('section', 'hm-card ' + cls);
  const h = el('div', 'hm-ch', `<h3>${esc(title)}</h3>`);
  if (action) { const b = el('button', 'hm-link', esc(action[0])); b.onclick = action[1]; h.appendChild(b); }
  c.appendChild(h); return c;
}
function fmtShort(ds) { return parseDate(ds).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }); }

async function renderHome() {
  await loadProjectsMap();
  const [sessions, plans, evals] = await Promise.all([DB.all('sessions'), DB.all('plans'), DB.all('evals')]);
  const ses = sessions.map(normSession).filter(s => catOk(s.cat)), today = isoDate(new Date()), mon = mondayOf(new Date());
  const plan = plans.find(p => p.id === prefs.lastPlan) || plans.sort((a, b) => b.updated - a.updated)[0] || null;
  const team = evals.filter(e => e.type === 'team').sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
  const players = Object.values(SQUAD).filter(p => catOk(p.cat));
  $('#hmStart').checked = prefs.homeOnStart !== false;

  // Encabezado
  const d = new Date();
  $('#hmDate').textContent = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase());
  $('#hmTeam').innerHTML = [plan ? esc(plan.cat || plan.name) : '', plan && plan.stage ? stageChip(plan.stage) : ''].filter(Boolean).join(' ') || '<span class="muted">Crea un plan de temporada para ver aquí a tu equipo</span>';

  const G = $('#hmGrid'); G.innerHTML = '';

  /* ---- Fila de indicadores ---- */
  // Próxima sesión
  const next = ses.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const k1 = hmCard('kpi', 'Próxima sesión', next ? ['Abrir', () => openSession(next)] : ['Crear', HOME_ACTIONS[3][4]]);
  if (next) {
    const main = next.phases.p1.content;
    k1.insertAdjacentHTML('beforeend', `<div class="kv">${esc(next.date === today ? 'Hoy' : fmtShort(next.date))}</div>
      <div class="kt">${mdChip(next.md)} ${esc(next.name)}</div>
      <div class="ks">${sessionTotal(next)} min · ${next.items.length} tarea${next.items.length === 1 ? '' : 's'}${sessionLoad(next) ? ' · ' + sessionLoad(next) + ' UA' : ''}</div>
      ${main ? `<div class="ks">${esc(contentLabel(main))}${next.phases.p1.consigna ? ': ' + esc(next.phases.p1.consigna) : ''}</div>` : ''}`);
  } else k1.insertAdjacentHTML('beforeend', '<div class="kempty">No hay sesiones programadas. Créalas desde aquí o desde el mesociclo.</div>');
  G.appendChild(k1);

  // Semana
  const k2 = hmCard('kpi', 'Esta semana', ['Ver semana', () => openSessions('week')]);
  const days = [...Array(7)].map((_, i) => { const x = new Date(mon); x.setDate(x.getDate() + i); const ds = isoDate(x); const list = ses.filter(s => s.date === ds); return { ds, i, list, min: list.reduce((a, s) => a + sessionTotal(s), 0), ua: list.reduce((a, s) => a + sessionLoad(s), 0) }; });
  const wMin = days.reduce((a, x) => a + x.min, 0), wUA = days.reduce((a, x) => a + x.ua, 0), mx = Math.max(60, ...days.map(x => x.min));
  k2.insertAdjacentHTML('beforeend', `<div class="kv">${wMin} <small>min</small></div><div class="ks">${(n => n + (n === 1 ? ' sesión' : ' sesiones'))(days.reduce((a, x) => a + x.list.length, 0))} · carga prevista ${wUA} UA</div>
    <div class="wbars" role="img" aria-label="Minutos de entrenamiento por día">${days.map(x => `<div class="wb ${x.ds === today ? 'today' : ''}" title="${DOW[x.i]}: ${x.min} min${x.ua ? ', ' + x.ua + ' UA' : ''}">
      <i style="height:${x.min ? Math.max(8, x.min / mx * 100) : 0}%;${x.list[0] && MD_INFO[x.list[0].md] && x.list[0].md !== 'Libre' ? `background:${MD_INFO[x.list[0].md][0]}` : ''}"></i><span>${DOW[x.i][0]}</span></div>`).join('')}</div>`);
  G.appendChild(k2);

  // Disponibilidad
  const k3 = hmCard('kpi', 'Disponibilidad', ['Plantel', () => $('#btnSquad').click()]);
  if (players.length) {
    const cnt = {}; players.forEach(p => { const s = p.status || 'disponible'; cnt[s] = (cnt[s] || 0) + 1; });
    const avail = cnt.disponible || 0;
    k3.insertAdjacentHTML('beforeend', `<div class="kv">${avail}<small>/${players.length} disponibles</small></div>
      <div class="avbar" role="img" aria-label="Estado del plantel">${Object.entries(STATUS).filter(([k]) => cnt[k]).map(([k, v]) => `<i style="flex:${cnt[k]};background:${v.color}" title="${v.name}: ${cnt[k]}"></i>`).join('')}</div>
      <div class="avleg">${Object.entries(STATUS).filter(([k]) => cnt[k] && k !== 'disponible').map(([k, v]) => `<span><i style="background:${v.color}"></i>${v.name} ${cnt[k]}</span>`).join('') || '<span>Todos disponibles</span>'}</div>`);
  } else k3.insertAdjacentHTML('beforeend', '<div class="kempty">Añade a tus jugadores para ver la disponibilidad y armar alineaciones.</div>');
  G.appendChild(k3);

  // Nivel de comprensión
  const k4 = hmCard('kpi', 'Comprensión del juego', ['Evaluar', () => openSessions('eval')]);
  if (team) {
    const f = ludoFinal(team.of, team.def);
    k4.insertAdjacentHTML('beforeend', `<div class="kv">${f.repeat ? '<span class="warnline">Repetir test</span>' : stageChip(f.stage)}</div>
      <div class="ks">Ofensiva ${team.of ? STAGE[team.of] : '—'} · Defensiva ${team.def ? STAGE[team.def] : '—'}</div>
      <div class="ks">${esc(team.cat || 'Equipo')} · ${esc(fmtShort(team.date))}</div>`);
  } else {
    const tested = players.filter(p => p.tests && p.tests[0]).length;
    k4.insertAdjacentHTML('beforeend', `<div class="kempty">Aún no hay test de equipo. ${tested ? `${tested} jugador${tested > 1 ? 'es' : ''} con test individual.` : 'El test indica la sub-etapa con la que planificar.'}</div>`);
  }
  G.appendChild(k4);
  await homeExtras(G);

  /* ---- Accesos ---- */
  const qa = hmCard('wide actions', 'Qué quieres hacer');
  const grid = el('div', 'qa');
  HOME_ACTIONS.forEach(([id, ic, t, s, fn]) => { const b = el('button', 'qa-btn', `<span class="qa-ic">${ic}</span><b>${esc(t)}</b><small>${esc(s)}</small>`); b.onclick = fn; grid.appendChild(b); });
  qa.appendChild(grid); G.appendChild(qa);

  /* ---- Semana en detalle ---- */
  const wk = hmCard('half', 'Microciclo de la semana', ['Planificación', () => openSessions('week')]);
  const wl = el('div', 'wlist');
  days.forEach(x => {
    const r = el('div', 'wrow' + (x.ds === today ? ' today' : ''));
    r.innerHTML = `<div class="wd"><b>${DOW[x.i]}</b><span>${parseDate(x.ds).getDate()}</span></div>`;
    const body = el('div', 'wbody');
    if (!x.list.length) body.innerHTML = '<span class="muted small">Sin sesión</span>';
    x.list.forEach(s => { const b = el('button', 'wses', `${mdChip(s.md)}<span>${esc(s.name)}</span><small>${sessionTotal(s)} min</small>`); b.onclick = () => openSession(s); body.appendChild(b); });
    const add = el('button', 'wadd', '＋'); add.title = 'Nueva sesión'; add.onclick = async () => { const s = newSession(x.ds); await DB.put('sessions', s); openSession(s); };
    r.append(body, add); wl.appendChild(r);
  });
  wk.appendChild(wl); G.appendChild(wk);

  /* ---- Plantel: atención ---- */
  const sq = hmCard('half', 'Plantel: requiere atención', ['Ver plantel', () => $('#btnSquad').click()]);
  const out = players.filter(p => (p.status || 'disponible') !== 'disponible').sort((a, b) => (a.back || '9').localeCompare(b.back || '9'));
  const noTest = players.filter(p => !(p.tests && p.tests[0]));
  if (!players.length) sq.insertAdjacentHTML('beforeend', '<div class="kempty">Sin jugadores todavía.</div>');
  else {
    const L = el('div', 'alist');
    out.slice(0, 7).forEach(p => {
      const st = STATUS[p.status];
      const r = el('button', 'arow', `<i style="background:${st.color}"></i><b>${esc(p.dorsal || '')}</b><span class="an">${esc(p.name)}</span><span class="ad">${esc(st.name)}${p.statusNote ? ' · ' + esc(p.statusNote) : ''}</span><span class="ab">${p.back ? 'vuelta ' + esc(fmtShort(p.back)) : ''}</span>`);
      r.onclick = () => editSquadPlayer(p); L.appendChild(r);
    });
    if (!out.length) L.innerHTML = '<div class="kempty ok">✓ Todo el plantel está disponible.</div>';
    sq.appendChild(L);
    if (noTest.length) { const b = el('button', 'hm-note', `🧠 ${noTest.length} jugador${noTest.length > 1 ? 'es' : ''} sin test ludológico individual · Evaluar`); b.onclick = () => openSessions('eval'); sq.appendChild(b); }
  }
  G.appendChild(sq);

  /* ---- Plan de temporada ---- */
  const pc = hmCard('wide', 'Plan de temporada', plan ? ['Abrir plan', () => openSessions('plan')] : ['Crear plan', () => { openSessions('plan'); setTimeout(() => $('#planNew').click(), 300); }]);
  if (plan) {
    const [y, m0] = plan.start.split('-').map(Number), nowM = (d.getFullYear() - y) * 12 + d.getMonth() - (m0 - 1);
    const need = [['act', 'hmb'], ['act', 'percep'], ['act', 'espacio'], ['main', 'fbi_con'], ['main', 'fbi_sin'], ['main', 'fbc']];
    const months = [...Array(plan.months)].map((_, m) => {
      const ok = need.filter(([row, cat]) => plan.days.some((dd, di) => (plan.grid[cellKey(di, row, m)] || []).some(c => CONTENT[c] && CONTENT[c].cat === cat))).length;
      const mainC = [...new Set(plan.days.flatMap((dd, di) => plan.grid[cellKey(di, 'main', m)] || []))];
      return { m, ok, mainC };
    });
    pc.insertAdjacentHTML('beforeend', `<p class="ks">${esc(plan.name)} · ${STAGE[plan.stage] || ''} · ${plan.days.length} días por semana${plan.assigned && plan.assigned.content ? ` · Contenido asignado: <b>${esc(contentLabel(plan.assigned.content))}</b>` : ''}</p>
      <div class="ptl">${months.map(x => `<button class="ptm ${x.m === nowM ? 'now' : ''} ${x.ok === 6 ? 'full' : ''}" data-m="${x.m}">
        <span class="ptmh">Mes ${x.m + 1}<small>${monthName(plan, x.m)}</small></span>
        <span class="ptmp"><i style="width:${x.ok / 6 * 100}%"></i></span><span class="ptmk">${x.ok}/6 bloques</span>
        <span class="ptmc">${x.mainC.slice(0, 3).map(c => esc(contentLabel(c))).join(' · ') || '<span class="muted">Sin contenidos</span>'}</span></button>`).join('')}</div>`);
    $$('.ptm', pc).forEach(b => b.onclick = () => { openSessions('meso'); setTimeout(() => { $('#mesoMonth').value = b.dataset.m; renderMeso(); }, 250); });
  } else pc.insertAdjacentHTML('beforeend', '<div class="kempty">Programa 6 meses de contenidos según la sub-etapa del equipo: activación y parte principal para cada día de entrenamiento.</div>');
  G.appendChild(pc);

  /* ---- Tácticas recientes ---- */
  const rc = hmCard('wide', 'Tácticas y tareas recientes', ['Ver todas', () => openProjects()]);
  const recent = Object.values(sesProjects).sort((a, b) => b.updated - a.updated).slice(0, 6);
  const rg = el('div', 'rgrid');
  recent.forEach(p => {
    const b = el('button', 'rcard'); const cv = thumbCanvas(p, 200, 125); b.appendChild(cv);
    b.insertAdjacentHTML('beforeend', `<b>${esc(p.name)}</b><small>${esc([p.task.strategy ? STRATEGIES[p.task.strategy] : p.cat, contentLabel(p.task.content)].filter(Boolean).join(' · '))}</small>`);
    b.onclick = () => { loadProject(p); hideHome(); }; rg.appendChild(b);
  });
  const ex = el('button', 'rcard more', `<span class="qa-ic">🎬</span><b>${DRILLS.length} ejercicios de ejemplo</b><small>Rondos, salida de balón, presión, ABP…</small>`); ex.onclick = () => $('#btnLibrary').click(); rg.appendChild(ex);
  rc.appendChild(rg); G.appendChild(rc);

  /* ---- Catálogo metodológico ---- */
  G.appendChild(catalogCard(plan ? plan.stage : null));
  backupBanner(G); fillActiveCat();
}

function catalogCard(planStage) {
  const c = hmCard('wide catalog', 'Contenidos y consignas', ['Guía', () => openSessions('guide')]);
  homeStage = homeStage || planStage || 'SUMA1';
  const tabs = el('div', 'ctabs');
  [...STAGES, ['COMP', 'Complementario']].forEach(([k, n]) => { const b = el('button', 'chip' + (homeStage === k ? ' active' : ''), esc(n)); b.onclick = () => { homeStage = k; homeContent = null; c.replaceWith(catalogCard(planStage)); }; tabs.appendChild(b); });
  c.appendChild(tabs);
  const wrap = el('div', 'cwrap'), cols = el('div', 'ccols');
  const groups = homeStage === 'COMP' ? [['percep', CONTENTS.filter(x => x.cat === 'percep')], ['espacio', CONTENTS.filter(x => x.cat === 'espacio')], ['hmb', CONTENTS.filter(x => x.cat === 'hmb')]]
    : [['fbi_con', CONTENTS.filter(x => x.cat === 'fbi_con' && x.stage === homeStage)], ['fbi_sin', CONTENTS.filter(x => x.cat === 'fbi_sin' && x.stage === homeStage)], ['fbc', CONTENTS.filter(x => x.cat === 'fbc' && x.stage === homeStage)],
      ['espacio', CONTENTS.filter(x => x.cat === 'espacio' && x.stage === homeStage)]];
  const list = groups.flatMap(g => g[1]);
  if (!homeContent || !list.some(x => x.id === homeContent)) homeContent = list[0] && list[0].id;
  groups.forEach(([cat, items]) => {
    if (!items.length) return;
    const col = el('div', 'ccol', `<h4>${esc(CATS[cat].name)}</h4>`);
    items.forEach(x => { const b = el('button', 'citem' + (x.id === homeContent ? ' on' : ''), esc(x.name)); b.onclick = () => { homeContent = x.id; c.replaceWith(catalogCard(planStage)); }; col.appendChild(b); });
    cols.appendChild(col);
  });
  const det = el('div', 'cdet'), x = CONTENT[homeContent];
  if (x) {
    const section = (title, arr) => arr.length ? `<h5>${title}</h5><ul>${arr.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    det.innerHTML = `<div class="cdh"><b>${esc(x.name)}</b><span>${esc(CATS[x.cat].long)}${x.stage ? ' · ' + STAGE[x.stage] : ''}</span></div>${x.def ? `<p>${esc(x.def)}</p>` : ''}` +
      (x.roles ? Object.entries(x.roles).map(([r, l]) => section(ROLES[r], l)).join('') : section('Consignas simples', x.simple) + section('Consignas avanzadas', x.adv));
    const b = el('button', 'primary', '＋ Crear tarea con este contenido');
    b.onclick = async () => {
      await saveNow();
      const p = normalize(newProject(x.name, P ? P.field.type : 'f11'));
      const first = consignasOf(x.id)[0];
      Object.assign(p.task, { content: x.id, consigna: first ? first.t : '', stage: x.stage || '', phase: CATS[x.cat].phase === 'act' ? 'act' : 'p1', duration: 10 });
      p.cat = CATS[x.cat].name; await DB.put('projects', p); loadProject(p); hideHome(); openTask();
    };
    const nSt = STAGES.filter(([k]) => exStageOk(x, k)).length;
    const lb = el('button', '', `📚 Ver sus ${consignasOf(x.id).length * 10 * nSt} ejercicios`); lb.title = `10 por consigna en cada sub-etapa en la que se trabaja (${nSt})`;
    lb.onclick = () => openExLib({ phase: '', content: x.id, stage: homeStage || x.stage || '', pick: null });
    const row = el('div', 'row'); row.append(b, lb); det.appendChild(row);
  }
  wrap.append(cols, det); c.appendChild(wrap);
  return c;
}

if (prefs.homeOnStart !== false) setTimeout(showHome, 0);
