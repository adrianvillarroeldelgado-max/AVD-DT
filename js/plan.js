'use strict';
/* Planificación de temporada (6 meses), mesociclo, test ludológico (equipo e individual) y guía metodológica */

const DEFAULT_DAYS = [
  { label: 'Día 1', wd: 0, act: 'hmb', main: 'fbi_con' },
  { label: 'Día 2', wd: 2, act: 'percep', main: 'fbi_sin' },
  { label: 'Día 3', wd: 4, act: 'espacio', main: 'fbc' },
];
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
let curPlan = null;

function showPlanTab(tab) {
  $$('#planTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.pt === tab));
  ['week', 'plan', 'meso', 'eval', 'guide'].forEach(k => $('#pt' + k[0].toUpperCase() + k.slice(1)).hidden = k !== tab);
  if (tab === 'week') renderSessions();
  else if (tab === 'plan') renderPlan();
  else if (tab === 'meso') renderMeso();
  else if (tab === 'eval') renderEval();
  else if (tab === 'guide') renderGuide();
}
$$('#planTabs .tab').forEach(b => b.onclick = () => showPlanTab(b.dataset.pt));

/* ---------- Plan de temporada ---------- */
function newPlan() {
  const d = new Date();
  return { id: uid(), name: 'Plan ' + d.getFullYear(), cat: prefs.lastCat || '', stage: 'SUMA1', start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, months: 6,
    days: clone(DEFAULT_DAYS), assigned: { content: '', consigna: '' }, grid: {}, meso: {}, created: Date.now(), updated: Date.now() };
}
const cellKey = (d, row, m) => `${d}_${row}_${m}`;
function monthName(plan, m) { const [y, mo] = plan.start.split('-').map(Number); const dt = new Date(y, mo - 1 + m, 1); return dt.toLocaleDateString('es', { month: 'short', year: '2-digit' }); }
async function loadPlans() { return (await DB.all('plans')).sort((a, b) => b.updated - a.updated); }
async function savePlan() { if (!curPlan) return; curPlan.updated = Date.now(); await DB.put('plans', curPlan); prefs.lastPlan = curPlan.id; savePrefs(); }
async function ensurePlan() {
  const plans = await loadPlans();
  curPlan = plans.find(p => p.id === prefs.lastPlan) || plans[0] || null;
  $('#planSel').innerHTML = plans.length ? plans.map(p => opt(p.id, p.name + (p.cat ? ' · ' + p.cat : ''), curPlan && curPlan.id)).join('') : '<option value="">Sin planes</option>';
  return curPlan;
}
$('#planSel').onchange = async e => { curPlan = await DB.get('plans', e.target.value); prefs.lastPlan = curPlan.id; savePrefs(); renderPlan(); };
$('#planNew').onclick = () => editPlanSettings(newPlan(), true);
$('#planEdit').onclick = () => { if (curPlan) editPlanSettings(curPlan, false); };
$('#planDel').onclick = async () => {
  if (!curPlan || !await confirmBox(`¿Borrar el plan «${curPlan.name}»? Las sesiones creadas se conservan.`)) return;
  await DB.del('plans', curPlan.id); curPlan = null; prefs.lastPlan = null; savePrefs(); renderPlan();
};
async function renderPlan() {
  await ensurePlan();
  const g = $('#planGrid'), info = $('#planInfo'), chk = $('#planCheck');
  ['#planEdit', '#planPrint', '#planDel'].forEach(s => $(s).disabled = !curPlan);
  if (!curPlan) {
    g.innerHTML = ''; chk.innerHTML = '';
    info.innerHTML = 'Crea un plan para programar los contenidos de 6 meses según la sub-etapa del equipo. Cada día de la semana tiene una activación (HMB/HME, habilidades perceptivas o gestión del espacio) y una parte principal (FBI con balón, FBI sin balón o FBC).';
    return;
  }
  const p = curPlan, as = p.assigned || {};
  info.innerHTML = `<b>${esc(p.name)}</b>${p.cat ? ' · ' + esc(p.cat) : ''} · Sub-etapa <b>${STAGE[p.stage] || '—'}</b> · ${p.months} meses desde ${monthName(p, 0)} · ${p.days.length} días/semana${as.content ? ` · Contenido asignado: <b>${esc(contentLabel(as.content))}</b>` : ''}. Toca ＋ para añadir contenidos a cada mes.`;
  let h = '<thead><tr><th></th><th>Fase</th>' + [...Array(p.months)].map((_, m) => `<th>Mes ${m + 1}<small>${monthName(p, m)}</small></th>`).join('') + '</tr></thead><tbody>';
  p.days.forEach((d, di) => {
    [['act', 'Activación'], ['main', 'Parte principal']].forEach(([row, rl], ri) => {
      const cat = d[row];
      h += `<tr class="${ri ? '' : 'dstart'}">${ri ? '' : `<th rowspan="2" class="dlabel">${esc(d.label)}<small>${WEEKDAYS[d.wd] || ''}</small></th>`}<td class="phlabel">${rl}<small>${CATS[cat] ? CATS[cat].name : ''}</small></td>`;
      for (let m = 0; m < p.months; m++) {
        const list = p.grid[cellKey(di, row, m)] || [];
        h += `<td class="pcell" data-k="${cellKey(di, row, m)}" data-cat="${cat}">${list.map((cid, i) => `<span class="cchip ${cid === as.content ? 'assigned' : ''} ${CONTENT[cid] && CONTENT[cid].stage === p.stage ? 'cur' : ''}" title="${esc(CONTENT[cid] ? CATS[CONTENT[cid].cat].long + (CONTENT[cid].stage ? ' · ' + STAGE[CONTENT[cid].stage] : '') : '')}">${cid === as.content ? '★ ' : ''}${esc(contentLabel(cid))}<button data-rm="${i}" title="Quitar">×</button></span>`).join('')}<button class="cadd" title="Añadir contenido">＋</button></td>`;
      }
      h += '</tr>';
    });
  });
  g.innerHTML = h + '</tbody>';
  $$('.pcell', g).forEach(td => {
    $('.cadd', td).onclick = () => pickContent(td.dataset.cat, p.stage, cid => { const k = td.dataset.k; p.grid[k] = [...new Set([...(p.grid[k] || []), cid])]; savePlan().then(renderPlan); });
    $$('[data-rm]', td).forEach(b => b.onclick = e => { e.stopPropagation(); const k = td.dataset.k; p.grid[k].splice(+b.dataset.rm, 1); savePlan().then(renderPlan); });
  });
  // validación
  const need = [['act', 'hmb', 'HMB/HME'], ['act', 'percep', 'H. perceptivas'], ['act', 'espacio', 'Gestión del espacio'], ['main', 'fbi_con', 'FBI con balón'], ['main', 'fbi_sin', 'FBI sin balón'], ['main', 'fbc', 'FBC']];
  let ch = '<div class="chkrow"><b>Revisión por mes</b></div>';
  for (let m = 0; m < p.months; m++) {
    const items = need.map(([row, cat, n]) => {
      const ok = p.days.some((d, di) => (p.grid[cellKey(di, row, m)] || []).some(cid => CONTENT[cid] && CONTENT[cid].cat === cat));
      return `<span class="ck ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${n}</span>`;
    }).join('');
    ch += `<div class="chkrow"><span class="ckm">Mes ${m + 1}</span>${items}</div>`;
  }
  if (as.content) {
    const ok = Object.values(p.grid).some(l => l.includes(as.content));
    ch += `<div class="chkrow"><span class="ck ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} El contenido asignado (${esc(contentLabel(as.content))}) ${ok ? 'figura' : 'aún no figura'} en algún mes</span></div>`;
  }
  chk.innerHTML = ch;
}
function pickContent(cat, stage, onPick) {
  const list = contentsFor(cat, stage, true);
  pickFrom(`Añadir ${CATS[cat] ? CATS[cat].name : 'contenido'}`, list.map(c => ({
    id: c.id, label: c.name, group: c.stage ? STAGE[c.stage] + (c.stage === stage ? ' (sub-etapa del equipo)' : '') : 'Todas las sub-etapas',
    sub: c.def || (c.roles ? Object.values(ROLES).join(' · ') : (c.simple[0] || '')),
  })).sort((a, b) => (b.group.includes('equipo') - a.group.includes('equipo'))), onPick);
}
function editPlanSettings(p, isNew) {
  const draft = clone(p);
  $('#psName').value = draft.name; $('#psCat').value = draft.cat || ''; $('#psStage').innerHTML = stageOpts(draft.stage);
  $('#psStart').value = draft.start; $('#psMonths').value = draft.months;
  const catOpts = (row, cur) => Object.entries(CATS).filter(([, c]) => c.phase === row).map(([k, c]) => opt(k, c.name, cur)).join('');
  const drawDays = () => {
    $('#psDays').innerHTML = draft.days.map((d, i) => `<div class="psday" data-i="${i}">
      <input data-f="label" value="${esc(d.label)}" maxlength="20">
      <select data-f="wd">${WEEKDAYS.map((w, j) => opt(String(j), w, String(d.wd))).join('')}</select>
      <select data-f="act" title="Activación">${catOpts('act', d.act)}</select>
      <select data-f="main" title="Parte principal">${catOpts('main', d.main)}</select></div>`).join('');
    $$('#psDays [data-f]').forEach(el => el.onchange = () => { const d = draft.days[+el.closest('.psday').dataset.i]; d[el.dataset.f] = el.dataset.f === 'wd' ? +el.value : el.value; });
  };
  drawDays();
  $('#psAddDay').onclick = () => { if (draft.days.length >= 6) return; const n = draft.days.length; draft.days.push({ label: 'Día ' + (n + 1), wd: Math.min(6, n * 2), act: DEFAULT_DAYS[n % 3].act, main: DEFAULT_DAYS[n % 3].main }); drawDays(); };
  $('#psDelDay').onclick = () => { if (draft.days.length > 1) { draft.days.pop(); drawDays(); } };
  const fillCons = () => { const cons = consignasOf($('#psContent').value); $('#psConsigna').innerHTML = opt('', '— Consigna —', draft.assigned.consigna) + cons.map(c => opt(c.t, `${c.level}: ${c.t}`, draft.assigned.consigna)).join(''); };
  const fillContents = () => {
    const st = $('#psStage').value;
    $('#psContent').innerHTML = opt('', '— Sin contenido asignado —', draft.assigned.content) + ['fbi_con', 'fbi_sin', 'fbc', 'percep', 'espacio'].map(c => `<optgroup label="${CATS[c].name}">${contentsFor(c, st, !st).map(x => opt(x.id, x.name + (x.stage ? ' · ' + STAGE[x.stage] : ''), draft.assigned.content)).join('')}</optgroup>`).join('');
    fillCons();
  };
  fillContents();
  $('#psStage').onchange = fillContents;
  $('#psContent').onchange = () => { draft.assigned.content = $('#psContent').value; draft.assigned.consigna = ''; fillCons(); };
  $('#psOk').onclick = async () => {
    Object.assign(draft, { name: $('#psName').value.trim() || 'Plan', cat: $('#psCat').value.trim(), stage: $('#psStage').value, start: $('#psStart').value || draft.start, months: clamp(+$('#psMonths').value || 6, 1, 12) });
    draft.assigned = { content: $('#psContent').value, consigna: $('#psConsigna').value };
    curPlan = draft; await savePlan(); $('#dlgPlanSet').close(); renderPlan();
    if (isNew) toast('Plan creado. Añade contenidos a cada mes con ＋');
  };
  $('#dlgPlanSet').showModal();
}
$('#planPrint').onclick = () => {
  const p = curPlan; if (!p) return;
  let h = `<header class="pt-head"><div><h1>${esc(p.name)}</h1><p>Programación de contenidos${p.cat ? ' · ' + esc(p.cat) : ''} · ${STAGE[p.stage] || ''}</p></div><div class="pt-meta"><b>${p.months} meses</b></div></header>`;
  h += '<table class="pt-table"><thead><tr><th></th><th>Fase</th>' + [...Array(p.months)].map((_, m) => `<th>Mes ${m + 1}<br><small>${monthName(p, m)}</small></th>`).join('') + '</tr></thead><tbody>';
  p.days.forEach((d, di) => [['act', 'Activación'], ['main', 'Parte principal']].forEach(([row, rl], ri) => {
    h += `<tr>${ri ? '' : `<td rowspan="2"><b>${esc(d.label)}</b><br><small>${WEEKDAYS[d.wd]}</small></td>`}<td>${rl}<br><small>${CATS[d[row]].name}</small></td>` +
      [...Array(p.months)].map((_, m) => `<td>${(p.grid[cellKey(di, row, m)] || []).map(c => esc(contentLabel(c))).join('<br>')}</td>`).join('') + '</tr>';
  }));
  printHTML(h + '</tbody></table>', { landscape: true, title: p.name });
};

/* ---------- Mesociclo ---------- */
$('#mesoMonth').onchange = () => renderMeso();
async function renderMeso() {
  await ensurePlan();
  const g = $('#mesoGrid'), p = curPlan;
  $('#mesoAuto').disabled = $('#mesoPrint').disabled = !p;
  if (!p) { g.innerHTML = '<tbody><tr><td class="pad muted">Primero crea un plan en «Plan de temporada».</td></tr></tbody>'; $('#mesoMonth').innerHTML = ''; return; }
  const prev = $('#mesoMonth').value;
  $('#mesoMonth').innerHTML = [...Array(p.months)].map((_, m) => opt(String(m), `Mes ${m + 1} · ${monthName(p, m)}`, prev || '0')).join('');
  const m = +$('#mesoMonth').value || 0;
  const sessions = (await DB.all('sessions')).filter(s => s.plan && s.plan.id === p.id && s.plan.m === m);
  let h = '<thead><tr><th></th><th>Fase</th><th>Contenidos del mes</th>' + [0, 1, 2, 3].map(w => {
    const n = sessions.filter(s => s.plan.w === w).length;
    return `<th>Semana ${w + 1}<button class="mkses" data-w="${w}">${n ? `📅 ${n} sesión${n > 1 ? 'es' : ''}` : '＋ Crear sesiones'}</button></th>`;
  }).join('') + '</tr></thead><tbody>';
  p.meso[m] = p.meso[m] || {};
  p.days.forEach((d, di) => [['act', 'Activación'], ['main', 'Parte principal']].forEach(([row, rl], ri) => {
    const contents = p.grid[cellKey(di, row, m)] || [];
    const cons = contents.flatMap(c => consignasOf(c).map(x => ({ ...x, c })));
    h += `<tr class="${ri ? '' : 'dstart'}">${ri ? '' : `<th rowspan="2" class="dlabel">${esc(d.label)}<small>${WEEKDAYS[d.wd]}</small></th>`}<td class="phlabel">${rl}<small>${CATS[d[row]].name}</small></td>
      <td class="mcont">${contents.length ? contents.map(c => `<span class="cchip">${esc(contentLabel(c))}</span>`).join('') : '<span class="muted small">Sin contenido en el plan</span>'}</td>` +
      [0, 1, 2, 3].map(w => {
        const k = `${di}_${row}_${w}`, v = p.meso[m][k] || '';
        return `<td class="mcell"><textarea data-k="${k}" rows="3" placeholder="Consigna de la semana">${esc(v)}</textarea>${cons.length ? `<select data-k="${k}"><option value="">Elegir del catálogo…</option>${cons.map(x => opt(x.t, `${contentLabel(x.c)} · ${x.level}: ${x.t}`, '')).join('')}</select>` : ''}</td>`;
      }).join('') + '</tr>';
  }));
  g.innerHTML = h + '</tbody>';
  $$('textarea[data-k]', g).forEach(ta => ta.onchange = () => { p.meso[m][ta.dataset.k] = ta.value; savePlan(); });
  $$('select[data-k]', g).forEach(sl => sl.onchange = () => { if (!sl.value) return; const ta = $(`textarea[data-k="${sl.dataset.k}"]`, g); ta.value = sl.value; p.meso[m][sl.dataset.k] = sl.value; savePlan(); sl.value = ''; });
  $$('.mkses', g).forEach(b => b.onclick = () => makeWeekSessions(m, +b.dataset.w));
}
$('#mesoAuto').onclick = async () => {
  const p = curPlan; if (!p) return; const m = +$('#mesoMonth').value || 0; p.meso[m] = p.meso[m] || {}; let n = 0;
  p.days.forEach((d, di) => ['act', 'main'].forEach(row => {
    const contents = p.grid[cellKey(di, row, m)] || []; if (!contents.length) return;
    const c = CONTENT[contents[0]]; if (!c) return;
    let seq;
    if (c.roles) seq = Object.values(c.roles).flat();
    else seq = [...c.simple.slice(0, 2), ...(c.adv.length ? c.adv.slice(0, 2) : c.simple.slice(2, 4))];
    if (contents[1] && CONTENT[contents[1]]) { const c2 = CONTENT[contents[1]]; seq[2] = seq[2] || (c2.simple[0]); }
    for (let w = 0; w < 4; w++) { const k = `${di}_${row}_${w}`; if (!p.meso[m][k] && seq.length) { p.meso[m][k] = seq[Math.min(w, seq.length - 1)]; n++; } }
  }));
  await savePlan(); renderMeso();
  toast(n ? `${n} consignas propuestas: semanas 1-2 simples, 3-4 avanzadas. Revísalas.` : 'No había celdas vacías con contenido para completar');
};
function sessionDate(p, m, w, wd) {
  const [y, mo] = p.start.split('-').map(Number), first = new Date(y, mo - 1 + m, 1);
  const mon = mondayOf(first); if (mon < first) mon.setDate(mon.getDate() + 7);
  mon.setDate(mon.getDate() + w * 7 + (wd || 0)); return isoDate(mon);
}
async function makeWeekSessions(m, w) {
  const p = curPlan, all = (await DB.all('sessions')).map(normSession);
  const existing = all.filter(s => s.plan && s.plan.id === p.id && s.plan.m === m && s.plan.w === w);
  if (existing.length) {
    pickFrom(`Mes ${m + 1} · Semana ${w + 1}`, existing.sort((a, b) => a.date.localeCompare(b.date)).map(s => ({ id: s.id, label: s.name, sub: fmtDate(s.date) })), id => openSession(existing.find(s => s.id === id)));
    return;
  }
  const mm = p.meso[m] || {}; let n = 0;
  for (const [di, d] of p.days.entries()) {
    const actC = (p.grid[cellKey(di, 'act', m)] || [])[0] || '', mainC = (p.grid[cellKey(di, 'main', m)] || [])[0] || '';
    const s = newSession(sessionDate(p, m, w, d.wd));
    s.name = `M${m + 1}·S${w + 1} ${d.label}${mainC ? ' · ' + contentLabel(mainC) : ''}`; s.cat = p.cat; s.stage = p.stage;
    s.plan = { id: p.id, m, w, d: di };
    s.phases.info.notes = [mainC ? `Contenido: ${contentLabel(mainC)}` : '', mm[`${di}_main_${w}`] ? `Consigna: ${mm[`${di}_main_${w}`]}` : ''].filter(Boolean).join(' · ');
    s.phases.act = { ...s.phases.act, content: actC, consigna: mm[`${di}_act_${w}`] || '', strategy: d.act === 'hmb' ? 'circuito' : 'coordinativo' };
    [['p1', 'rondo'], ['p2', 'posicion'], ['p3', 'real']].forEach(([k, st]) => s.phases[k] = { ...s.phases[k], content: mainC, consigna: mm[`${di}_main_${w}`] || '', strategy: st });
    s.phases.vuelta.notes = 'Reflexión: ¿qué hemos aprendido sobre la consigna?';
    await DB.put('sessions', s); n++;
  }
  toast(`${n} sesiones creadas en el calendario con su contenido y consigna. Añade las tareas en cada fase.`, 5000);
  renderMeso();
}
$('#mesoPrint').onclick = () => {
  const p = curPlan; if (!p) return; const m = +$('#mesoMonth').value || 0, mm = p.meso[m] || {};
  let h = `<header class="pt-head"><div><h1>Mesociclo · Mes ${m + 1}</h1><p>${esc(p.name)} · ${monthName(p, m)} · ${STAGE[p.stage] || ''}</p></div></header>`;
  h += '<table class="pt-table"><thead><tr><th></th><th>Fase</th><th>Contenidos del mes</th>' + [1, 2, 3, 4].map(w => `<th>Semana ${w}</th>`).join('') + '</tr></thead><tbody>';
  p.days.forEach((d, di) => [['act', 'Activación'], ['main', 'Parte principal']].forEach(([row, rl], ri) => {
    h += `<tr>${ri ? '' : `<td rowspan="2"><b>${esc(d.label)}</b></td>`}<td>${rl}<br><small>${CATS[d[row]].name}</small></td><td>${(p.grid[cellKey(di, row, m)] || []).map(c => esc(contentLabel(c))).join('<br>')}</td>` +
      [0, 1, 2, 3].map(w => `<td>${esc(mm[`${di}_${row}_${w}`] || '')}</td>`).join('') + '</tr>';
  }));
  printHTML(h + '</tbody></table>', { landscape: true, title: `Mesociclo mes ${m + 1}` });
};

/* ---------- Evaluación: test ludológico ---------- */
const stageChip = s => s ? `<span class="stagechip st-${s}">${STAGE[s]}</span>` : '<span class="muted">—</span>';
async function renderEval() {
  const teams = (await DB.all('evals')).filter(e => e.type === 'team').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const L = $('#evTeamList'); L.innerHTML = '';
  if (!teams.length) L.innerHTML = '<div class="empty">Evalúa al equipo observando 10 situaciones ofensivas y 10 defensivas. El resultado indica la sub-etapa con la que planificar.</div>';
  teams.forEach(t => {
    const r = document.createElement('div'); r.className = 'vitem';
    const fin = ludoFinal(t.of, t.def);
    r.innerHTML = `<div class="info"><div class="t">${esc(t.cat || 'Equipo')} · ${esc(fmtDate(t.date))}</div><div class="s">Ofensiva: ${t.of ? STAGE[t.of] : '—'} · Defensiva: ${t.def ? STAGE[t.def] : '—'}</div></div>${fin.repeat ? '<span class="warnline small">Repetir test</span>' : stageChip(fin.stage)}`;
    const b = document.createElement('button'); b.textContent = 'Abrir'; b.onclick = () => openTeamTest(t); r.appendChild(b);
    r.querySelector('.info').onclick = () => openTeamTest(t);
    L.appendChild(r);
  });
  const all = Object.values(SQUAD), cats = [...new Set(all.map(p => p.cat).filter(Boolean))].sort();
  fillCats($('#evCat'), cats, 'Todas las categorías'); if (prefs.activeCat && !$('#evCat').dataset.touched && cats.includes(prefs.activeCat)) $('#evCat').value = prefs.activeCat;
  const cf = $('#evCat').value, list = all.filter(p => !cf || p.cat === cf).sort((a, b) => (+a.dorsal || 99) - (+b.dorsal || 99));
  const T = $('#evPlayers');
  if (!list.length) { T.innerHTML = '<tbody><tr><td class="pad muted">Añade jugadores en 👤 Plantel para evaluarlos individualmente.</td></tr></tbody>'; return; }
  T.innerHTML = '<thead><tr><th>Jugador</th><th>Fecha</th><th>Con balón</th><th>Sin balón</th><th>Def. con balón</th><th>Def. sin balón</th><th>Nivel</th><th></th></tr></thead><tbody>' +
    list.map(p => { const e = (p.tests || [])[0] || {}; return `<tr><td><b>${esc(p.dorsal || '')}</b> ${esc(p.name)}</td><td>${e.date ? esc(parseDate(e.date).toLocaleDateString('es')) : '—'}</td>${['AB', 'ASB', 'DAB', 'DASB'].map(k => `<td>${e[k] ? STAGE[e[k]] : '—'}</td>`).join('')}<td>${stageChip(e.final)}</td><td><button data-pid="${p.id}">Evaluar</button></td></tr>`; }).join('') + '</tbody>';
  $$('[data-pid]', T).forEach(b => b.onclick = () => openPlayerTest(SQUAD[b.dataset.pid]));
}
$('#evCat').onchange = () => { $('#evCat').dataset.touched = 1; renderEval(); };
$('#evNewTeam').onclick = () => openTeamTest(null);
let curTT = null;
function openTeamTest(t) {
  curTT = t ? clone(t) : { id: uid(), type: 'team', date: isoDate(new Date()), cat: prefs.lastCat || '', ofS: Array(10).fill(''), defS: Array(10).fill(''), notes: '' };
  $('#ttDate').value = curTT.date; $('#ttCat').value = curTT.cat || ''; $('#ttNotes').value = curTT.notes || ''; $('#ttDel').hidden = !t;
  const body = $('#ttBody');
  body.innerHTML = Object.entries(LUDO_TEAM).map(([ph, info]) => `<div class="ttphase"><h3>${info.name}</h3>
    <div class="ttdesc">${STAGES.map(([k, n]) => `<div><b>${n}</b><span>${esc(info.d[k])}</span></div>`).join('')}</div>
    <div class="ttsit">${[...Array(10)].map((_, i) => `<label>S${i + 1}<select data-ph="${ph}" data-i="${i}">${opt('', '—', curTT[ph === 'OF' ? 'ofS' : 'defS'][i])}${STAGES.map(([k, n]) => opt(k, n.replace('Egocéntrica', 'Ego').replace('Sumativa', 'Suma'), curTT[ph === 'OF' ? 'ofS' : 'defS'][i])).join('')}</select></label>`).join('')}</div></div>`).join('');
  $$('select[data-ph]', body).forEach(s => s.onchange = () => { curTT[s.dataset.ph === 'OF' ? 'ofS' : 'defS'][+s.dataset.i] = s.value; ttResult(); });
  ttResult(); $('#dlgTeamTest').showModal();
}
function ttResult() {
  curTT.of = predominant(curTT.ofS); curTT.def = predominant(curTT.defS);
  const f = ludoFinal(curTT.of, curTT.def); curTT.final = f.stage;
  $('#ttResult').innerHTML = `<div>Ofensiva: ${stageChip(curTT.of)}</div><div>Defensiva: ${stageChip(curTT.def)}</div><div><b>Resultado final:</b> ${f.repeat ? '<span class="warnline">Repetir el test</span>' : stageChip(f.stage)}<small>${esc(f.note)}</small></div>`;
}
$('#ttOk').onclick = async () => { curTT.date = $('#ttDate').value; curTT.cat = $('#ttCat').value.trim(); curTT.notes = $('#ttNotes').value; await DB.put('evals', curTT); $('#dlgTeamTest').close(); renderEval(); toast('Test guardado'); };
$('#ttDel').onclick = async () => { if (!await confirmBox('¿Borrar este test?')) return; await DB.del('evals', curTT.id); $('#dlgTeamTest').close(); renderEval(); };
$('#ttApply').onclick = async () => {
  if (!curTT.final) { toast('El test no da un resultado final'); return; }
  await ensurePlan(); if (!curPlan) { toast('Crea primero un plan de temporada'); return; }
  curPlan.stage = curTT.final; await savePlan(); toast(`Plan «${curPlan.name}» ajustado a ${STAGE[curTT.final]}`);
};
let curPT = null, curPTPlayer = null;
function openPlayerTest(pl) {
  curPTPlayer = pl; const last = (pl.tests || [])[0] || {};
  curPT = { date: isoDate(new Date()), AB: last.AB || '', ASB: last.ASB || '', DAB: last.DAB || '', DASB: last.DASB || '', final: '', notes: '' };
  $('#ptTitle').textContent = `Test ludológico · ${pl.name}`; $('#ptDate').value = curPT.date; $('#ptNotes').value = '';
  $('#ptBody').innerHTML = Object.entries(LUDO_IND).map(([k, info]) => `<div class="ptrole"><h4>${info.name}</h4><div class="ptopts">${STAGES.map(([s, n]) =>
    `<label class="ptopt"><input type="radio" name="pt_${k}" value="${s}" ${curPT[k] === s ? 'checked' : ''}><b>${n}</b><span>${esc(info.d[s])}</span></label>`).join('')}</div></div>`).join('');
  $$('#ptBody input[type=radio]').forEach(r => r.onchange = () => { curPT[r.name.slice(3)] = r.value; ptSync(); });
  $('#ptFinal').innerHTML = stageOpts(last.final || '', '— Usar el sugerido —');
  ptSync(); $('#dlgPlayerTest').showModal();
}
function ptSync() { const s = ludoIndResult(curPT); $('#ptSuggest').value = s ? STAGE[s] + ' (predominante)' : ''; }
$('#ptOk').onclick = async () => {
  curPT.date = $('#ptDate').value; curPT.notes = $('#ptNotes').value; curPT.final = $('#ptFinal').value || ludoIndResult(curPT) || '';
  const pl = curPTPlayer; pl.tests = [curPT, ...(pl.tests || [])].slice(0, 20); pl.updated = Date.now();
  await DB.put('players', pl); SQUAD[pl.id] = pl; $('#dlgPlayerTest').close();
  if ($('#dlgSessions').open) renderEval(); if ($('#dlgSquad').open) renderSquad();
  toast(`${pl.name}: ${curPT.final ? STAGE[curPT.final] : 'sin resultado'}`);
};

/* ---------- Guía metodológica ---------- */
function renderGuide() {
  $('#guideBody').innerHTML = `
  <h3>Perspectiva</h3>
  <p>La planificación parte del <b>nivel de comprensión del juego</b> del jugador y del equipo, no de su edad. Ese nivel se expresa en sub-etapas: <b>Egocéntrica I, Egocéntrica II, Sumativa I y Sumativa II</b>. Cada sub-etapa tiene sus contenidos y consignas.</p>
  <ol class="gsteps">
    <li><b>Evaluar.</b> Pestaña <i>Evaluación</i>: test ludológico de equipo (10 situaciones ofensivas y 10 defensivas) e individual (atacante con y sin balón, defensor del atacante con y sin balón). Si las dos fases del equipo coinciden, esa es la sub-etapa; si son correlativas, define la más primaria; si no lo son, se repite el test.</li>
    <li><b>Programar la temporada.</b> Pestaña <i>Plan de temporada</i>: 6 meses y 3 días por semana. Cada mes debe tener en la parte principal al menos 1 FBI con balón, 1 FBI sin balón y 1 FBC, y en la activación al menos 1 HMB/HME, 1 de gestión del espacio y 1 de habilidades perceptivas. El contenido asignado tiene que aparecer en algún mes.</li>
    <li><b>Mesociclo.</b> Pestaña <i>Mesociclo</i>: elige el mes y escribe la consigna de cada semana. Las consignas deben relacionarse entre sí y progresar (por ejemplo, simples en las semanas 1-2 y avanzadas en las 3-4). Con «Crear sesiones» la app prepara las sesiones de esa semana en el calendario.</li>
    <li><b>Sesión.</b> Fases: Información → Activación (circuito, juego coordinativo o ejercicio analítico) → Principal 1 (rondo, duelos o juego de posesión) → Principal 2 (juego de posición o de invasión discontinua) → Principal 3 (juego real condicionado) → Vuelta a la calma y reflexión. El contenido y la consigna de la parte principal se mantienen en las tres tareas.</li>
    <li><b>Tarea en 9 pasos</b> (📝 Ficha): 1) contenido y consigna, 2) estrategia didáctica, 3) participantes (porteros y comodines), 4) espacio, 5) puntuación, 6) normas, 7) gradiente para facilitar o dificultar, 8) preguntas preparadas y 9) representación gráfica (la pizarra).
      <br><small>Puntuar en portería: solo en juegos de invasión discontinua y juegos reales condicionados. Llegar a un espacio: invasión discontinua y juegos de posesión. Pasar por un espacio: solo juegos de posesión.</small></li>
    <li><b>Dirigir la tarea.</b> En 📽 Presentar → ⏱: organización y explicación (1-2 min), feedback constante, gradiente hacia el 60 % del tiempo y cierre reflexivo hacia el 90 %. Usa el mando directo o el descubrimiento guiado según la fase.</li>
  </ol>
  <h3>Alto rendimiento: microciclo</h3>
  <p>Para el primer equipo, cada sesión se sitúa respecto al partido (MD-4 … MD+1) y se prevé la carga: <b>minutos × RPE previsto</b> (unidades arbitrarias, UA) por tarea, por sesión y por semana. Es la línea de los cursos de Coaches' Voice sobre microciclo, MD-3, MD-1 y predicción de la carga. Las orientaciones de cada día que muestra la app son generales; ajústalas a tu modelo de juego y a tu calendario.</p>
  <ul>${['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1'].map(k => `<li><b>${k}</b>: ${esc(MD_GUIDE[k])}</li>`).join('')}</ul>
  <h3>Catálogo incluido</h3>
  <p>${CONTENTS.filter(c => c.cat !== 'hmb').length} contenidos con sus consignas simples y avanzadas: habilidades perceptivas por rol, gestión de los espacios por sub-etapa y bloque básico (FBI y FBC) de Egocéntrica I a Sumativa II. Las propuestas de HMB/HME son orientativas y puedes sustituirlas por las tuyas.</p>`;
}
