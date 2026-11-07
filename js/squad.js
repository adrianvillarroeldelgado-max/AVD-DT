'use strict';
/* Plantel: jugadores, estado de disponibilidad y alineación desde el plantel */

const POSITIONS = [
  ['POR', 'Portero', 0, 1], ['LD', 'Lateral derecho', 1, 0], ['CAD', 'Carrilero derecho', 1, 0], ['DFC', 'Defensa central', 1, 1], ['LI', 'Lateral izquierdo', 1, 2], ['CAI', 'Carrilero izquierdo', 1, 2],
  ['MCD', 'Mediocentro defensivo', 2, 1], ['MD', 'Medio derecho', 3, 0], ['MC', 'Mediocentro', 3, 1], ['MI', 'Medio izquierdo', 3, 2], ['MCO', 'Mediapunta', 4, 1],
  ['ED', 'Extremo derecho', 5, 0], ['EI', 'Extremo izquierdo', 5, 2], ['SD', 'Segundo delantero', 6, 1], ['DC', 'Delantero centro', 6, 1],
];
const POS = Object.fromEntries(POSITIONS.map(([k, n, line, side]) => [k, { name: n, line, side }]));
const FOOT = { D: 'Derecho', I: 'Izquierdo', A: 'Ambos' };

async function loadSquad() {
  try { SQUAD = {}; (await DB.all('players')).forEach(p => SQUAD[p.id] = p); } catch (e) { SQUAD = {}; }
  if (typeof render === 'function') render();
}
loadSquad();

function initials(n) { return (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
function shortName(p) { if (p.short) return p.short; const w = (p.name || '').trim().split(/\s+/); return w.length > 1 ? w[w.length - 1] : (w[0] || ''); }
function statusChip(st) { const s = STATUS[st || 'disponible']; return `<span class="stchip" style="--c:${s.color}">${esc(s.name)}</span>`; }

/* ---------- Lista ---------- */
$('#btnSquad').onclick = async () => { await loadSquad(); $('#dlgSquad').showModal(); renderSquad(); if (prefs.activeCat && [...$('#sqCat').options].some(o => o.value === prefs.activeCat)) { $('#sqCat').value = prefs.activeCat; renderSquad(); } };
$('#sqSearch').oninput = () => renderSquad();
$('#sqCat').onchange = () => renderSquad();
$('#sqStatus').onchange = () => renderSquad();
$('#sqStatus').innerHTML = '<option value="">Todos los estados</option>' + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
function renderSquad() {
  const all = Object.values(SQUAD), cats = [...new Set(all.map(p => p.cat).filter(Boolean))].sort();
  fillCats($('#sqCat'), cats, 'Todas las categorías');
  const cf = $('#sqCat').value, sf = $('#sqStatus').value, q = $('#sqSearch').value.trim().toLowerCase();
  const scope = all.filter(p => !cf || p.cat === cf);
  const counts = {}; scope.forEach(p => { const s = p.status || 'disponible'; counts[s] = (counts[s] || 0) + 1; });
  $('#sqSummary').innerHTML = `<span class="sqtotal">${scope.length} jugadores</span>` + Object.entries(STATUS).filter(([k]) => counts[k]).map(([k, v]) =>
    `<button class="chip ${sf === k ? 'active' : ''}" data-st="${k}" style="--c:${v.color}"><i class="dotc"></i>${v.name}<b>${counts[k]}</b></button>`).join('');
  $$('#sqSummary [data-st]').forEach(b => b.onclick = () => { $('#sqStatus').value = $('#sqStatus').value === b.dataset.st ? '' : b.dataset.st; renderSquad(); });
  const list = scope.filter(p => (!sf || (p.status || 'disponible') === sf) && (!q || [p.name, p.short, p.pos, p.dorsal, p.statusNote].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => ((POS[a.pos] || { line: 9 }).line - (POS[b.pos] || { line: 9 }).line) || ((+a.dorsal || 99) - (+b.dorsal || 99)));
  const L = $('#sqList'); L.innerHTML = '';
  if (!list.length) { L.innerHTML = `<div class="empty">${all.length ? 'Nadie coincide con el filtro.' : 'Añade tus jugadores con «＋ Jugador» o importa una lista (CSV: dorsal;nombre;posición;categoría).'}</div>`; return; }
  for (const p of list) {
    const c = document.createElement('div'); c.className = 'sqcard';
    const st = p.status || 'disponible';
    c.innerHTML = `<div class="sqph">${p.photo ? `<img src="${p.photo}" alt="">` : `<span>${esc(initials(p.name))}</span>`}<i class="sqdot" style="background:${STATUS[st].color}"></i></div>
      <div class="sqinfo"><div class="t"><span class="dors">${esc(p.dorsal || '')}</span> ${esc(p.name)}</div>
      <div class="s">${esc([p.pos && (POS[p.pos] ? POS[p.pos].name : p.pos), p.foot && FOOT[p.foot] ? 'pie ' + FOOT[p.foot].toLowerCase() : '', p.cat].filter(Boolean).join(' · '))}</div>
      ${(p.tests && p.tests[0] && p.tests[0].final) ? `<div class="s">🧠 ${stageChip(p.tests[0].final)}</div>` : ''}
      ${st !== 'disponible' && (p.statusNote || p.back) ? `<div class="s sqnote">${esc(p.statusNote || '')}${p.back ? ' · vuelta ' + parseDate(p.back).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : ''}</div>` : ''}</div>`;
    const sel = document.createElement('select'); sel.className = 'sqsel'; sel.title = 'Cambiar estado';
    sel.innerHTML = Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${v.name}</option>`).join('');
    sel.onclick = e => e.stopPropagation();
    sel.onchange = async () => { const prev = p.status || 'disponible'; p.status = sel.value; if (typeof injuryAuto === 'function') injuryAuto(prev, p); p.updated = Date.now(); await DB.put('players', p); SQUAD[p.id] = p; render(); renderSquad(); };
    c.appendChild(sel);
    c.onclick = () => editSquadPlayer(p);
    L.appendChild(c);
  }
}

/* ---------- Editar jugador ---------- */
let sqEditing = null, sqPhoto = null, sqPrevStatus = 'disponible';
$('#spPos').innerHTML = '<option value="">—</option>' + POSITIONS.map(([k, n]) => `<option value="${k}">${k} · ${n}</option>`).join('');
$('#spPos2').innerHTML = $('#spPos').innerHTML;
$('#spStatus').innerHTML = Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
function editSquadPlayer(p) {
  sqEditing = p || { id: uid(), created: Date.now(), status: 'disponible', cat: $('#sqCat').value || prefs.lastCat || '' };
  const x = sqEditing; sqPhoto = x.photo || null; sqPrevStatus = x.status || 'disponible';
  if (typeof renderPlayerExtra === 'function') renderPlayerExtra(x);
  $('#spName').value = x.name || ''; $('#spShort').value = x.short || ''; $('#spDorsal').value = x.dorsal || '';
  $('#spPos').value = x.pos || ''; $('#spPos2').value = x.pos2 || ''; $('#spFoot').value = x.foot || '';
  $('#spCat').value = x.cat || ''; $('#spBirth').value = x.birth || ''; $('#spStatus').value = x.status || 'disponible';
  $('#spNote').value = x.statusNote || ''; $('#spBack').value = x.back || ''; $('#spNotes').value = x.notes || '';
  $('#spHeight').value = x.height || ''; $('#spWeight').value = x.weight || '';
  $('#spDel').hidden = !p; $('#spTest').hidden = !p; syncPhoto(); syncStatusRow();
  $('#spCatList').innerHTML = [...new Set(Object.values(SQUAD).map(q => q.cat).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('');
  $('#dlgSqPlayer').showModal(); setTimeout(() => $('#spName').focus(), 50);
}
function syncPhoto() { $('#spPhotoPrev').innerHTML = sqPhoto ? `<img src="${sqPhoto}" alt="">` : `<span>${esc(initials($('#spName').value))}</span>`; $('#spPhotoDel').hidden = !sqPhoto; }
function syncStatusRow() { $('#spStatusRow').hidden = $('#spStatus').value === 'disponible'; }
$('#spStatus').onchange = syncStatusRow;
$('#spName').oninput = () => { if (!sqPhoto) syncPhoto(); };
$('#spPhotoDel').onclick = () => { sqPhoto = null; syncPhoto(); };
$('#spPhoto').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const img = new Image(), u = URL.createObjectURL(f);
  img.onload = () => {
    const S = 200, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 3, m, m, 0, 0, S, S);
    sqPhoto = c.toDataURL('image/jpeg', .82); URL.revokeObjectURL(u); syncPhoto();
  };
  img.onerror = () => { URL.revokeObjectURL(u); toast('No se pudo leer esa imagen'); };
  img.src = u;
};
$('#spSave').onclick = async () => {
  const name = $('#spName').value.trim(); if (!name) { toast('Escribe el nombre del jugador'); $('#spName').focus(); return; }
  const x = sqEditing;
  Object.assign(x, { name, short: $('#spShort').value.trim(), dorsal: $('#spDorsal').value.trim(), pos: $('#spPos').value, pos2: $('#spPos2').value, foot: $('#spFoot').value,
    cat: $('#spCat').value.trim(), birth: $('#spBirth').value, status: $('#spStatus').value, statusNote: $('#spNote').value.trim(), back: $('#spBack').value,
    notes: $('#spNotes').value.trim(), height: $('#spHeight').value, weight: $('#spWeight').value, photo: sqPhoto, updated: Date.now() });
  if (typeof injuryAuto === 'function') injuryAuto(sqPrevStatus, x);
  if (x.status === 'disponible') { x.statusNote = ''; x.back = ''; }
  if (x.cat) { prefs.lastCat = x.cat; savePrefs(); }
  await DB.put('players', x); SQUAD[x.id] = x;
  // actualizar fichas vinculadas en la táctica abierta
  let changed = false; P.objs.forEach(o => { if (o.pid === x.id) { o.name = shortName(x); o.num = x.dorsal || o.num; changed = true; } });
  if (changed) commit(); else render();
  $('#dlgSqPlayer').close(); renderSquad();
};
$('#spDel').onclick = async () => {
  if (!await confirmBox(`¿Borrar a ${sqEditing.name} del plantel?`)) return;
  await DB.del('players', sqEditing.id); delete SQUAD[sqEditing.id]; $('#dlgSqPlayer').close(); renderSquad(); render();
};
$('#btnAddPlayer').onclick = () => editSquadPlayer(null);
$('#spTest').onclick = () => { if (!SQUAD[sqEditing.id]) return; $('#dlgSqPlayer').close(); openPlayerTest(SQUAD[sqEditing.id]); };
$('#sqImport').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const lines = (await f.text()).split(/\r?\n/).map(l => l.trim()).filter(Boolean); let n = 0;
  for (const l of lines) {
    const c = l.split(/[;,\t]/).map(x => x.trim());
    if (!c.length || /^(dorsal|n[uú]mero|#)$/i.test(c[0])) continue;
    let [dorsal, name, pos, cat] = c;
    if (!/^\d{1,3}$/.test(dorsal)) { cat = pos; pos = name; name = dorsal; dorsal = ''; }
    if (!name) continue;
    const pp = (pos || '').toUpperCase(); const posKey = POS[pp] ? pp : (POSITIONS.find(([k, nn]) => nn.toLowerCase() === (pos || '').toLowerCase()) || [''])[0];
    const pl = { id: uid(), name, dorsal: dorsal || '', pos: posKey, cat: cat || $('#sqCat').value || '', status: 'disponible', created: Date.now(), updated: Date.now() };
    await DB.put('players', pl); SQUAD[pl.id] = pl; n++;
  }
  toast(n ? `${n} jugadores importados` : 'No se encontraron jugadores. Formato: dorsal;nombre;posición;categoría'); renderSquad();
};

/* ---------- Alinear desde el plantel ---------- */
let pickTeam = 'A';
function openSquadPicker(team, count, formation) {
  const all = Object.values(SQUAD);
  if (!all.length) { toast('Primero añade jugadores en 👤 Plantel'); return; }
  pickTeam = team;
  const cats = [...new Set(all.map(p => p.cat).filter(Boolean))].sort();
  fillCats($('#spkCat'), cats, 'Todas las categorías'); if (prefs.lastCat && cats.includes(prefs.lastCat)) $('#spkCat').value = prefs.lastCat;
  const linked = new Set(P.objs.filter(o => o.team === team && o.pid).map(o => o.pid));
  $('#spkTeam').textContent = P.teams[team].name;
  $('#spkForm').innerHTML = Object.entries(FORMATIONS).flatMap(([n, fs]) => Object.keys(fs).map(f => `<option value="${n}|${f}">${n} jugadores · ${f}</option>`)).join('') + '<option value="free|">Sin formación (libres)</option>';
  $('#spkForm').value = `${count}|${formation}`; if (!$('#spkForm').value) $('#spkForm').value = '11|4-3-3';
  const draw = () => {
    const cf = $('#spkCat').value, L = $('#spkList'); L.innerHTML = '';
    all.filter(p => !cf || p.cat === cf).sort((a, b) => ((POS[a.pos] || { line: 9 }).line - (POS[b.pos] || { line: 9 }).line) || ((+a.dorsal || 99) - (+b.dorsal || 99))).forEach(p => {
      const st = p.status || 'disponible', r = document.createElement('label'); r.className = 'spkrow' + (st !== 'disponible' ? ' warn' : '');
      r.innerHTML = `<input type="checkbox" value="${p.id}" ${linked.size ? (linked.has(p.id) ? 'checked' : '') : (st === 'disponible' ? '' : '')}>
        <span class="dors">${esc(p.dorsal || '')}</span><span class="nm">${esc(p.name)}</span><span class="ps">${esc(p.pos || '')}</span>${statusChip(st)}`;
      L.appendChild(r);
    });
    countSel();
  };
  const countSel = () => { const n = $$('#spkList input:checked').length; $('#spkCount').textContent = `${n} elegidos`; };
  $('#spkList').onchange = countSel; $('#spkCat').onchange = draw;
  $('#spkAuto').onclick = () => {
    const [n, f] = $('#spkForm').value.split('|'); const want = n === 'free' ? 11 : +n;
    const inputs = $$('#spkList input'); inputs.forEach(i => i.checked = false);
    const avail = inputs.map(i => SQUAD[i.value]).filter(p => (p.status || 'disponible') === 'disponible');
    const gk = avail.filter(p => p.pos === 'POR').slice(0, 1), rest = avail.filter(p => p.pos !== 'POR').slice(0, want - gk.length);
    [...gk, ...rest].forEach(p => { const i = inputs.find(x => x.value === p.id); if (i) i.checked = true; });
    countSel();
  };
  draw(); $('#dlgSqPick').showModal();
}
$('#spkOk').onclick = () => {
  const chosen = $$('#spkList input:checked').map(i => SQUAD[i.value]).filter(Boolean);
  if (!chosen.length) { toast('Elige al menos un jugador'); return; }
  const unavailable = chosen.filter(p => (p.status || 'disponible') !== 'disponible');
  const key = p => { const ps = POS[p.pos] || { line: 3, side: 1 }; return ps.line * 10 + ps.side; };
  const ordered = [...chosen].sort((a, b) => key(a) - key(b));
  const [n, f] = $('#spkForm').value.split('|'); const team = pickTeam;
  let positions;
  if (n !== 'free' && +n === ordered.length) positions = formationPos(team, +n, f, P.field);
  else if (FORMATIONS[ordered.length]) positions = formationPos(team, ordered.length, Object.keys(FORMATIONS[ordered.length])[0], P.field);
  else positions = freePositions(team, ordered.length, P.field);
  pushUndo();
  P.objs.filter(o => o.type === 'player' && o.team === team).forEach(o => removeObj(o.id));
  ordered.forEach((p, i) => {
    const [, x, y] = positions[i] || [0, P.field.L / 2, P.field.W / 2];
    const o = { id: uid(), type: 'player', team, gk: p.pos === 'POR', num: p.dorsal || '', name: shortName(p), pid: p.id };
    P.objs.push(o); P.frames.forEach(fr => fr.pos[o.id] = [x, y]);
  });
  commit(); $('#dlgSqPick').close(); if ($('#dlgTeams').open) buildTeams();
  toast(`${ordered.length} jugadores colocados` + (unavailable.length ? ` · atención: ${unavailable.map(p => shortName(p) + ' (' + STATUS[p.status].name.toLowerCase() + ')').join(', ')}` : ''), unavailable.length ? 6000 : 2600);
};
