'use strict';
/* Pizarra Táctica — aplicación principal */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDur = s => { if (!isFinite(s)) return ''; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

/* ---------- Campos ---------- */
const FIELD_TYPES = {
  f11: { L: 105, W: 68, players: 11 },
  f9: { L: 75, W: 50, players: 9 },
  f7: { L: 60, W: 40, players: 7 },
  f5: { L: 40, W: 20, players: 5 },
  custom: { L: 50, W: 35, players: 7 },
};
function marksFor(F) {
  switch (F.type) {
    case 'f11': return { pa: [16.5, 40.32], ga: [5.5, 18.32], spot: 11, circle: 9.15, goal: 7.32, arc: true };
    case 'f9': return { pa: [13, 30], ga: [5, 15], spot: 9, circle: 7, goal: 6, arc: false };
    case 'f7': return { pa: [12, 26], ga: [4, 12], spot: 9, circle: 6, goal: 6, arc: false };
    case 'f5': return { futsal: true, dr: 6, spot: 6, spot2: 10, circle: 3, goal: 3 };
    default: { const k = Math.min(F.L / 105, F.W / 68); return { pa: [16.5 * k, 40.32 * k], ga: [5.5 * k, 18.32 * k], spot: 11 * k, circle: 9.15 * k, goal: Math.max(2, 7.32 * k), arc: true }; }
  }
}
const VIEW_OPTS = [['full', 'Campo completo'], ['tq', '3/4 de campo'], ['half', 'Medio campo'], ['third', 'Último tercio'], ['center', 'Zona central'], ['box', 'Área grande'], ['small', 'Área chica'], ['zone', 'Espacio principal']];
function mainZone(proj) { return (proj.zones || []).find(z => z.main) || null; }
function viewBox(proj) {
  const F = proj.field, { L, W } = F, m = Math.max(1.5, L * .035), my = Math.max(1.2, m * .8);
  const mz = mainZone(proj);
  if (proj.pitch === 'zone' && mz) {
    const [x0, y0, x1, y1] = zoneBBox(mz), mm = Math.max(2, Math.max(x1 - x0, y1 - y0) * .14);
    return { x0: x0 - mm, x1: x1 + mm, y0: y0 - mm, y1: y1 + mm };
  }
  const mk = marksFor(F), pa = mk.pa || [mk.dr + 2, mk.goal + mk.dr * 2 + 2], ga = mk.ga || [3, mk.goal + 2];
  let r;
  switch (proj.pitch) {
    case 'tq': r = [L * .25 - m, L + m, -my, W + my]; break;
    case 'half': r = [L / 2 - m * 1.5, L + m, -my, W + my]; break;
    case 'third': r = [L * 2 / 3 - m, L + m, -my, W + my]; break;
    case 'center': r = [L / 3 - m, L * 2 / 3 + m, -my, W + my]; break;
    case 'box': { const mm = Math.max(2, pa[0] * .35); r = [L - pa[0] - mm, L + mm, W / 2 - pa[1] / 2 - mm, W / 2 + pa[1] / 2 + mm]; break; }
    case 'small': { const mm = Math.max(1.5, ga[0] * .6); r = [L - ga[0] - mm * 1.5, L + mm, W / 2 - ga[1] / 2 - mm, W / 2 + ga[1] / 2 + mm]; break; }
    default: return { x0: -m, x1: L + m, y0: -my, y1: W + my };
  }
  if (proj.side === 'L' && proj.pitch !== 'center') r = [L - r[1], L - r[0], r[2], r[3]];
  return { x0: r[0], x1: r[1], y0: r[2], y1: r[3] };
}

/* ---------- Constantes ---------- */
const TEAM_KEYS = ['A', 'B', 'C'];
const THEMES = {
  cesped: { grass: '#2f7d3a', stripe: '#2a7134', line: 'rgba(255,255,255,.92)', out: '#235a2b' },
  oscuro: { grass: '#1d3b2a', stripe: '#1a3525', line: 'rgba(255,255,255,.8)', out: '#13281c' },
  pizarra: { grass: '#f4f6f5', stripe: '#eceeed', line: '#33433a', out: '#dfe4e1' },
};
const DRAW_DEFAULT_COLOR = { arrow: '#ffffff', dash: '#ffeb3b', zig: '#ff9800', line: '#ffffff', pen: '#ffffff', rect: '#00e5ff', circle: '#00e5ff', text: '#ffffff' };
const SWATCHES = ['#ffffff', '#ffeb3b', '#ff9800', '#ff5252', '#00e5ff', '#76ff03', '#e040fb', '#111111'];
const ADD_TOOLS = {
  addA: { type: 'player', team: 'A' }, addB: { type: 'player', team: 'B' }, addC: { type: 'player', team: 'C' },
  addGA: { type: 'player', team: 'A', gk: true }, addGB: { type: 'player', team: 'B', gk: true },
  ball: { type: 'ball' }, cone: { type: 'cone' }, goal: { type: 'goal' }, pole: { type: 'pole' },
};
const DRAW_TOOLS = ['arrow', 'dash', 'zig', 'curve', 'curvedash', 'shadow', 'line', 'pen', 'rect', 'circle'];
const HINTS = {
  move: 'Arrastra fichas o dibujos · doble toque en un jugador para editarlo',
  addA: 'Toca el campo para añadir jugadores del equipo A', addB: 'Toca el campo para añadir jugadores del equipo B',
  addC: 'Toca el campo para añadir comodines', addGA: 'Toca el campo para colocar al portero A', addGB: 'Toca el campo para colocar al portero B',
  ball: 'Toca el campo para colocar un balón', cone: 'Toca para colocar conos', goal: 'Toca para colocar una miniportería',
  pole: 'Toca para colocar picas', arrow: 'Arrastra para dibujar una carrera', dash: 'Arrastra para dibujar un pase',
  zig: 'Arrastra para dibujar una conducción', line: 'Arrastra para dibujar una línea', pen: 'Dibuja a mano alzada',
  rect: 'Arrastra para marcar una zona', circle: 'Arrastra desde el centro para dibujar un círculo',
  text: 'Toca donde quieras escribir',
  curve: 'Arrastra para una carrera curva · luego mueve el punto blanco para ajustar la curva',
  curvedash: 'Arrastra para un pase curvo · luego mueve el punto blanco para ajustar la curva',
  shadow: 'Arrastra desde el jugador hacia donde tapa el pase', erase: 'Toca una ficha o un dibujo para borrarlo',
  measure: 'Arrastra para medir una distancia en metros',
};
// Formaciones del equipo A (ataca a la derecha) en un campo de referencia de 105 x 68: [número, x, y]
const FORMATIONS = {
  11: {
    '4-4-2': [[1,4,34],[2,18,60],[4,15,42],[5,15,26],[3,18,8],[7,32,60],[8,30,42],[6,30,26],[11,32,8],[9,44,40],[10,44,28]],
    '4-3-3': [[1,4,34],[2,18,60],[4,15,42],[5,15,26],[3,18,8],[6,26,34],[8,34,46],[10,34,22],[7,46,58],[9,48,34],[11,46,10]],
    '4-2-3-1': [[1,4,34],[2,18,60],[4,15,42],[5,15,26],[3,18,8],[6,27,42],[8,27,26],[7,38,58],[10,38,34],[11,38,10],[9,48,34]],
    '4-1-4-1': [[1,4,34],[2,18,60],[4,15,42],[5,15,26],[3,18,8],[6,25,34],[7,36,58],[8,34,42],[10,34,26],[11,36,10],[9,47,34]],
    '3-5-2': [[1,4,34],[2,15,48],[4,14,34],[5,15,20],[7,30,62],[6,27,34],[8,32,44],[10,32,24],[3,30,6],[9,45,40],[11,45,28]],
    '3-4-3': [[1,4,34],[2,15,48],[4,14,34],[5,15,20],[7,30,60],[8,29,40],[6,29,28],[3,30,8],[10,45,54],[9,48,34],[11,45,14]],
    '5-3-2': [[1,4,34],[2,20,62],[4,14,46],[5,13,34],[6,14,22],[3,20,6],[8,30,46],[10,32,34],[7,30,22],[9,44,40],[11,44,28]],
    '5-4-1': [[1,4,34],[2,20,62],[4,14,46],[5,13,34],[6,14,22],[3,20,6],[7,32,58],[8,30,40],[10,30,28],[11,32,10],[9,45,34]],
  },
  9: {
    '3-3-2': [[1,4,34],[2,18,54],[4,15,34],[3,18,14],[7,32,56],[6,30,34],[8,32,12],[9,46,42],[10,46,26]],
    '3-2-3': [[1,4,34],[2,18,54],[4,15,34],[3,18,14],[6,30,44],[8,30,24],[7,44,58],[9,48,34],[11,44,10]],
    '4-3-1': [[1,4,34],[2,18,60],[4,15,42],[5,15,26],[3,18,8],[7,32,52],[6,30,34],[8,32,16],[9,46,34]],
  },
  8: {
    '3-3-1': [[1,4,34],[2,18,54],[4,15,34],[3,18,14],[7,32,56],[6,30,34],[8,32,12],[9,46,34]],
    '3-2-2': [[1,4,34],[2,18,54],[4,15,34],[3,18,14],[6,30,44],[8,30,24],[9,46,44],[10,46,24]],
    '2-3-2': [[1,4,34],[2,16,46],[3,16,22],[7,30,56],[6,28,34],[8,30,12],[9,46,44],[10,46,24]],
  },
  7: {
    '2-3-1': [[1,4,34],[2,16,46],[3,16,22],[7,30,56],[6,28,34],[8,30,12],[9,46,34]],
    '3-2-1': [[1,4,34],[2,18,54],[4,15,34],[3,18,14],[6,30,44],[8,30,24],[9,46,34]],
    '3-1-2': [[1,4,34],[2,18,54],[4,15,34],[3,18,14],[6,28,34],[9,46,44],[10,46,24]],
    '2-1-2-1': [[1,4,34],[2,16,46],[3,16,22],[6,26,34],[7,36,54],[8,36,14],[9,47,34]],
  },
  6: {
    '2-2-1': [[1,4,34],[2,16,46],[3,16,22],[7,32,50],[8,32,18],[9,46,34]],
    '2-1-2': [[1,4,34],[2,16,46],[3,16,22],[6,28,34],[9,44,48],[10,44,20]],
  },
  5: {
    '1-2-1 (rombo)': [[1,4,34],[4,16,34],[2,30,52],[3,30,16],[9,45,34]],
    '2-2 (cuadrado)': [[1,4,34],[2,18,48],[3,18,20],[9,40,48],[10,40,20]],
    '3-1': [[1,4,34],[2,16,52],[4,14,34],[3,16,16],[9,40,34]],
  },
};

/* ---------- Preferencias ---------- */
const DEFAULT_PREFS = { orient: 'auto', size: 1, nums: true, names: true, onion: true, theme: 'cesped', loop: false, speed: 1.2, lastId: null, pin: null, vidQ: '720', vidCats: [] };
let prefs = { ...DEFAULT_PREFS };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('pt-prefs') || '{}')); } catch (e) {}
function savePrefs() { try { localStorage.setItem('pt-prefs', JSON.stringify(prefs)); } catch (e) {} }

/* ---------- Estado ---------- */
let P = null, cur = 0, tool = 'move', color = '#ffffff', sel = null, drag = null;
let playing = false, anim = null;
let undoStack = [], redoStack = [];
let lastTap = { t: 0, id: null };
let SQUAD = {}, presenting = null;
const TASK_DEFAULT = { content: '', consigna: '', strategy: '', style: '', stage: '', spaceNote: '', scoreType: '', desc: '', gradDown: '', gradUp: '', feedback: '', objective: '', phys: '', phase: 'p1', duration: 15, series: 1, reps: '', work: '', rest: '', intensity: 'media', rules: '', variants: '', scoring: '', players: '' };
let polyDraft = null, polyCursor = null, measure = null, objColor = null, hoverPt = null;
const canvas = $('#board'), ctx = canvas.getContext('2d');
let V = null, dpr = 1;

function newProject(name = 'Nueva táctica', type = 'f11') {
  const ft = FIELD_TYPES[type];
  return {
    id: uid(), name, cat: 'General', notes: '', pitch: 'full',
    field: { type, L: ft.L, W: ft.W, marks: 'full' }, zones: [], side: 'R', grid: { mode: 'none', cols: 3, rows: 3 },
    teams: {
      A: { name: 'Mi equipo', color: '#e53935', text: '#ffffff', gk: '#fdd835' },
      B: { name: 'Rival', color: '#1e88e5', text: '#ffffff', gk: '#43a047' },
      C: { name: 'Comodines', color: '#ff9800', text: '#111111', gk: '#9c27b0' },
    },
    objs: [], frames: [{ pos: {}, draws: [] }], created: Date.now(), updated: Date.now(),
  };
}
function normalize(p) {
  const base = newProject();
  p.teams = p.teams || {};
  for (const t of TEAM_KEYS) p.teams[t] = Object.assign({}, base.teams[t], p.teams[t] || {});
  p.objs = p.objs || []; p.frames = (p.frames && p.frames.length) ? p.frames : [{ pos: {}, draws: [] }];
  p.frames.forEach(f => { f.pos = f.pos || {}; f.draws = f.draws || []; });
  if (!p.field || !p.field.L) p.field = clone(base.field);
  if (!FIELD_TYPES[p.field.type]) p.field.type = 'custom';
  p.field.marks = p.field.marks || 'full';
  p.zones = p.zones || [];
  p.links = (p.links || []).filter(l => l.ids && l.ids.length > 1);
  p.task = Object.assign({}, TASK_DEFAULT, p.task || {});
  p.task.phase = normPhase(p.task.phase);
  if (p.area) { const [x0, y0, x1, y1] = p.area; p.zones.push({ id: uid(), name: 'Zona de juego', shape: 'rect', pts: [[x0, y0], [x1, y1]], material: 'linea', color: '#ffffff', spacing: 5, dims: true, dim: true, main: true }); }
  delete p.area;
  if (p.pitch === 'area') p.pitch = 'zone';
  if (!VIEW_OPTS.some(v => v[0] === p.pitch)) p.pitch = 'full';
  if (p.pitch === 'zone' && !mainZone(p)) p.pitch = 'full';
  p.side = p.side === 'L' ? 'L' : 'R';
  p.grid = Object.assign({ mode: 'none', cols: 3, rows: 3 }, p.grid || {});
  p.cat = p.cat || 'General'; p.name = p.name || 'Táctica';
  return p;
}

/* ---------- Geometría ---------- */
function makeView(w, h, proj, orient, minR) {
  const v = viewBox(proj);
  const rot = orient === 'vertical' || (orient === 'auto' && h > w * 1.15);
  const ww = rot ? v.y1 - v.y0 : v.x1 - v.x0, wh = rot ? v.x1 - v.x0 : v.y1 - v.y0;
  const s = Math.min(w / ww, h / wh);
  return { w, h, v, rot, s, ox: (w - ww * s) / 2, oy: (h - wh * s) / 2, minR: minR ?? 9 };
}
function w2s(V, x, y) { return V.rot ? [V.ox + (y - V.v.y0) * V.s, V.oy + (V.v.x1 - x) * V.s] : [V.ox + (x - V.v.x0) * V.s, V.oy + (y - V.v.y0) * V.s]; }
function s2w(V, sx, sy) { return V.rot ? [V.v.x1 - (sy - V.oy) / V.s, V.v.y0 + (sx - V.ox) / V.s] : [V.v.x0 + (sx - V.ox) / V.s, V.v.y0 + (sy - V.oy) / V.s]; }
function worldTransform(c, V) {
  const { s, ox, oy, v } = V;
  if (V.rot) c.transform(0, -s, s, 0, ox - v.y0 * s, oy + v.x1 * s);
  else c.transform(s, 0, 0, s, ox - v.x0 * s, oy - v.y0 * s);
}
function objR(V) { return clamp(V.s * 1.55, V.minR, 30) * prefs.size; }
function fixCol(c) { return (prefs.theme === 'pizarra' && /^#fff(fff)?$/i.test(c || '')) ? '#1b1b1b' : (c || '#fff'); }

/* ---------- Dibujo del campo ---------- */
function drawPitch(c, V, proj) {
  const T = THEMES[prefs.theme] || THEMES.cesped, v = V.v, F = proj.field, L = F.L, W = F.W, mk = marksFor(F);
  c.fillStyle = T.out; c.fillRect(0, 0, V.w, V.h);
  c.save(); worldTransform(c, V);
  c.fillStyle = T.grass; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const n = Math.max(4, Math.round(L / 7.5)), sw = L / n;
  c.fillStyle = T.stripe; for (let i = 0; i < n; i += 2) c.fillRect(i * sw, 0, sw, W);
  c.strokeStyle = T.line; c.fillStyle = T.line; c.lineWidth = Math.max(0.1, 1.4 / V.s); c.lineJoin = 'round';
  const dot = (x, y) => { c.beginPath(); c.arc(x, y, Math.max(.2, L * .003), 0, Math.PI * 2); c.fill(); };
  if (F.marks !== 'none') {
    c.strokeRect(0, 0, L, W);
    c.beginPath(); c.moveTo(L / 2, 0); c.lineTo(L / 2, W); c.stroke();
  }
  if (F.marks === 'full') {
    c.beginPath(); c.arc(L / 2, W / 2, mk.circle, 0, Math.PI * 2); c.stroke(); dot(L / 2, W / 2);
    const gd = clamp(L * .019, .8, 2), g2 = mk.goal / 2;
    for (const side of [0, 1]) {
      const gx = side ? L : 0, d = side ? -1 : 1;
      if (mk.futsal) {
        const r = mk.dr, ya = W / 2 - g2, yb = W / 2 + g2;
        c.beginPath();
        if (!side) { c.arc(0, ya, r, -Math.PI / 2, 0); c.lineTo(r, yb); c.arc(0, yb, r, 0, Math.PI / 2); }
        else { c.arc(L, ya, r, -Math.PI / 2, Math.PI, true); c.lineTo(L - r, yb); c.arc(L, yb, r, Math.PI, Math.PI / 2, true); }
        c.stroke(); dot(gx + d * mk.spot, W / 2); dot(gx + d * mk.spot2, W / 2);
      } else {
        c.strokeRect(side ? L - mk.pa[0] : 0, W / 2 - mk.pa[1] / 2, mk.pa[0], mk.pa[1]);
        c.strokeRect(side ? L - mk.ga[0] : 0, W / 2 - mk.ga[1] / 2, mk.ga[0], mk.ga[1]);
        dot(gx + d * mk.spot, W / 2);
        if (mk.arc && mk.circle > mk.pa[0] - mk.spot) {
          const th = Math.acos((mk.pa[0] - mk.spot) / mk.circle);
          c.beginPath(); if (side) c.arc(L - mk.spot, W / 2, mk.circle, Math.PI - th, Math.PI + th); else c.arc(mk.spot, W / 2, mk.circle, -th, th); c.stroke();
        }
      }
      c.save(); c.globalAlpha = .25; c.fillRect(side ? L : -gd, W / 2 - g2, gd, mk.goal); c.restore();
      c.strokeRect(side ? L : -gd, W / 2 - g2, gd, mk.goal);
    }
    const cr = clamp(L * .01, .5, 1);
    [[0, 0, 0, .5], [L, 0, .5, 1], [L, W, 1, 1.5], [0, W, 1.5, 2]].forEach(([x, y, a, b]) => { c.beginPath(); c.arc(x, y, cr, a * Math.PI, b * Math.PI); c.stroke(); });
  }
  c.restore();
}
function gridLines(proj) {
  const g = proj.grid; if (!g || g.mode === 'none') return [];
  const F = proj.field, mz = mainZone(proj), [x0, y0, x1, y1] = mz ? zoneBBox(mz) : [0, 0, F.L, F.W], w = x1 - x0, h = y1 - y0, out = [];
  const vert = n => { for (let i = 1; i < n; i++) out.push([[x0 + w * i / n, y0], [x0 + w * i / n, y1]]); };
  const horiz = ys => ys.forEach(y => out.push([[x0, y], [x1, y]]));
  if (g.mode === 'thirds' || g.mode === 'both') vert(3);
  if (g.mode === 'lanes' || g.mode === 'both') {
    const mk = marksFor(F);
    if (!mz && mk.pa) horiz([F.W / 2 - mk.pa[1] / 2, F.W / 2 - mk.ga[1] / 2, F.W / 2 + mk.ga[1] / 2, F.W / 2 + mk.pa[1] / 2]);
    else horiz([1, 2, 3, 4].map(i => y0 + h * i / 5));
  }
  if (g.mode === 'custom') { vert(clamp(+g.cols || 1, 1, 12)); const r = clamp(+g.rows || 1, 1, 12); horiz([...Array(r - 1)].map((_, i) => y0 + h * (i + 1) / r)); }
  return out;
}
function drawZonesLayer(c, V, proj, st) {
  const lines = gridLines(proj);
  if (lines.length) {
    c.save(); c.strokeStyle = prefs.theme === 'pizarra' ? 'rgba(40,60,50,.5)' : 'rgba(255,255,255,.5)'; c.lineWidth = 1.6; c.setLineDash([7, 6]);
    for (const [a, b] of lines) { const p = w2s(V, a[0], a[1]), q = w2s(V, b[0], b[1]); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
    c.restore();
  }
  const zones = proj.zones || [], dimZ = zones.filter(z => z.dim);
  if (dimZ.length) {
    c.save(); c.beginPath(); c.rect(0, 0, V.w, V.h); dimZ.forEach(z => zonePath(c, V, z, false));
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fill('evenodd'); c.restore();
  }
  zones.forEach((z, i) => drawZone(c, V, z, { selected: !!(st.sel && st.sel.kind === 'zone' && st.sel.idx === i), editing: st.editZone === i }));
  if (st.tempZone) drawZone(c, V, st.tempZone, { editing: true });
  if (st.polyDraft) drawPolyDraft(c, V, st.polyDraft);
}
function drawPolyDraft(c, V, d) {
  const pts = d.cursor ? [...d.pts, d.cursor] : d.pts; if (!pts.length) return;
  const sp = pts.map(p => w2s(V, p[0], p[1]));
  c.save(); c.strokeStyle = '#00e5ff'; c.lineWidth = 2.5; c.setLineDash([8, 6]);
  c.beginPath(); sp.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
  if (d.pts.length >= 3) { c.globalAlpha = .45; c.beginPath(); c.moveTo(sp[sp.length - 1][0], sp[sp.length - 1][1]); c.lineTo(sp[0][0], sp[0][1]); c.stroke(); c.globalAlpha = 1; }
  c.setLineDash([]);
  const fs = Math.round(clamp(V.s * .9, 11, 14));
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (L < .3) continue;
    pill(c, (sp[i][0] + sp[i - 1][0]) / 2, (sp[i][1] + sp[i - 1][1]) / 2 - fs * 1.4, fmtM(L), fs);
  }
  sp.slice(0, d.pts.length).forEach((p, i) => { c.beginPath(); c.arc(p[0], p[1], i === 0 && d.pts.length >= 3 ? 11 : 6, 0, Math.PI * 2); c.fillStyle = i === 0 ? '#00e5ff' : '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#003a40'; c.stroke(); });
  c.restore();
}
function drawMeasure(c, V, m) {
  const a = w2s(V, m.a[0], m.a[1]), b = w2s(V, m.b[0], m.b[1]), L = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]);
  c.save(); c.strokeStyle = '#ffeb3b'; c.lineWidth = 2.5; c.setLineDash([6, 4]);
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, t = 8;
  [a, b].forEach(p => { c.beginPath(); c.moveTo(p[0] + Math.cos(ang) * t, p[1] + Math.sin(ang) * t); c.lineTo(p[0] - Math.cos(ang) * t, p[1] - Math.sin(ang) * t); c.stroke(); });
  pill(c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 16, fmtM(L), 14);
  c.restore();
}

/* ---------- Fichas ---------- */
function drawObj(c, V, proj, o, x, y, R, ghost, selected) {
  c.save();
  if (o.type === 'player') {
    const t = proj.teams[o.team] || proj.teams.A;
    if (o.spot && !ghost) drawSpot(c, x, y, R);
    if (!ghost) { c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 4; c.shadowOffsetY = 2; }
    c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = o.gk ? t.gk : t.color; c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = Math.max(1.5, R * .12); c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke();
    if (o.team === 'C') { c.setLineDash([3, 3]); c.lineWidth = 1.5; c.strokeStyle = '#111'; c.beginPath(); c.arc(x, y, R * .8, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    if (prefs.nums && o.num !== undefined && o.num !== null && o.num !== '') {
      const n = String(o.num);
      c.fillStyle = o.gk ? '#111' : t.text;
      c.font = `700 ${Math.round(R * (n.length > 1 ? .95 : 1.1))}px system-ui,sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, x, y + R * .06);
    }
    if (prefs.names && o.name && !ghost && (V.minR || 9) >= 5) {
      const fs = Math.round(clamp(R * .75, 10, 16));
      c.font = `600 ${fs}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(o.name, x, y + R + 2);
      c.fillStyle = '#fff'; c.fillText(o.name, x, y + R + 2);
    }
    if (!ghost && o.pid && SQUAD[o.pid]) drawStatusBadge(c, x, y, R, SQUAD[o.pid].status);
  } else {
    drawEquipment(c, o, x, y, R, V.s, (o.rot || 0) - (V.rot ? Math.PI / 2 : 0));
  }
  c.restore();
  if (selected) {
    c.save(); c.setLineDash([5, 4]); c.strokeStyle = '#00e5ff'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, (o.type === 'player' ? R * 1.35 : equipmentExtent(o, R, V.s) * 1.15), 0, Math.PI * 2); c.stroke(); c.restore();
  }
}

/* ---------- Dibujos ---------- */
function arrowHead(c, a, b, lw) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = lw * 4.2;
  c.beginPath(); c.moveTo(b[0], b[1]);
  c.lineTo(b[0] - L * Math.cos(ang - .42), b[1] - L * Math.sin(ang - .42));
  c.lineTo(b[0] - L * Math.cos(ang + .42), b[1] - L * Math.sin(ang + .42));
  c.closePath(); c.fill();
}
function shortened(a, b, by) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [b[0] - dx / L * by, b[1] - dy / L * by]; }
function zigzag(c, a, b, lw) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, amp = lw * 1.8, half = lw * 2.25, end = Math.max(0, L - lw * 5);
  c.beginPath(); c.moveTo(a[0], a[1]);
  let t = 0, k = 0;
  while (t < end) { t = Math.min(end, t + half); k++; const s = t >= end ? 0 : (k % 2 ? 1 : -1); c.lineTo(a[0] + ux * t + nx * amp * s, a[1] + uy * t + ny * amp * s); }
  const e = shortened(a, b, lw * 2.5); c.lineTo(e[0], e[1]); c.stroke();
}
function textFont(V, d) { return Math.round(clamp(V.s * 2.2, 12, 30) * (d.size || 1)); }
function textBox(c, V, d) {
  const fs = textFont(V, d); c.font = `700 ${fs}px system-ui,sans-serif`;
  const lines = String(d.text || '').split('\n'), lh = fs * 1.25;
  const w = Math.max(...lines.map(l => c.measureText(l).width), 10);
  return { fs, lines, lh, w, h: lh * lines.length };
}
function drawShape(c, V, d, selected) {
  const pts = d.pts.map(p => w2s(V, p[0], p[1])); if (!pts.length) return;
  const lw = Math.max(2, objR(V) * .18), col = fixCol(d.c);
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  if (selected) { c.shadowColor = '#00e5ff'; c.shadowBlur = 12; }
  const a = pts[0], b = pts[pts.length - 1];
  const seg = (p, q) => { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); };
  switch (d.t) {
    case 'pen': c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); break;
    case 'line': seg(a, b); break;
    case 'arrow': seg(a, shortened(a, b, lw * 2)); arrowHead(c, a, b, lw); break;
    case 'dash': c.setLineDash([lw * 2.6, lw * 2]); seg(a, shortened(a, b, lw * 2)); c.setLineDash([]); arrowHead(c, a, b, lw); break;
    case 'zig': zigzag(c, a, b, lw); arrowHead(c, a, b, lw); break;
    case 'curve': case 'curvedash': drawCurveShape(c, V, d, lw, selected); break;
    case 'shadow': c.shadowColor = 'transparent'; drawShadowShape(c, V, d, selected); break;
    case 'rect': {
      const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(a[0] - b[0]), h = Math.abs(a[1] - b[1]);
      const ga = c.globalAlpha; c.globalAlpha = ga * .22; c.fillRect(x, y, w, h); c.globalAlpha = ga;
      c.setLineDash([lw * 3, lw * 2]); c.strokeRect(x, y, w, h); break;
    }
    case 'circle': {
      const r = Math.hypot(b[0] - a[0], b[1] - a[1]);
      c.beginPath(); c.arc(a[0], a[1], r, 0, Math.PI * 2);
      const ga = c.globalAlpha; c.globalAlpha = ga * .22; c.fill(); c.globalAlpha = ga; c.stroke(); break;
    }
    case 'text': {
      const tb = textBox(c, V, d); c.textAlign = 'center'; c.textBaseline = 'middle';
      const top = a[1] - tb.h / 2;
      if (d.box) {
        const pad = tb.fs * .45, ga = c.globalAlpha;
        c.shadowColor = 'transparent'; c.fillStyle = prefs.theme === 'pizarra' ? 'rgba(255,255,255,.92)' : 'rgba(10,16,12,.72)';
        c.beginPath(); c.roundRect ? c.roundRect(a[0] - tb.w / 2 - pad, top - pad * .6, tb.w + pad * 2, tb.h + pad * 1.2, pad * .6) : c.rect(a[0] - tb.w / 2 - pad, top - pad * .6, tb.w + pad * 2, tb.h + pad * 1.2);
        c.fill(); c.globalAlpha = ga; c.lineWidth = 2; c.strokeStyle = col; c.stroke(); c.fillStyle = col;
      }
      tb.lines.forEach((l, i) => {
        const y = top + tb.lh * (i + .5);
        if (!d.box) { c.lineWidth = 4; c.strokeStyle = (prefs.theme === 'pizarra') ? '#fff' : 'rgba(0,0,0,.7)'; c.strokeText(l, a[0], y); }
        c.fillText(l, a[0], y);
      });
      break;
    }
  }
  c.restore();
}

/* ---------- Escena ---------- */
const ORDER = { goal11: 0, goal9: 0, goal7: 0, goal3: 0, goal: 0, goalpop: 0, rebounder: 0, ladder: 1, hoop: 1, disc: 1, bib: 1, player: 3, ball: 4 };
function sortedObjs(proj) { return [...proj.objs].sort((a, b) => (ORDER[a.type] ?? 2) - (ORDER[b.type] ?? 2)); }
function renderScene(c, V, proj, st) {
  drawPitch(c, V, proj);
  drawZonesLayer(c, V, proj, st);
  const R = objR(V);
  if (st.ghost) {
    c.save(); c.globalAlpha = .3;
    for (const o of proj.objs) {
      const a = st.ghost[o.id], b = st.pos[o.id]; if (!a || !b) continue;
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < .3) continue;
      const [ax, ay] = w2s(V, a[0], a[1]), [bx, by] = w2s(V, b[0], b[1]);
      c.setLineDash([4, 5]); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
      drawObj(c, V, proj, o, ax, ay, R, true, false);
    }
    c.restore();
  }
  c.save(); c.globalAlpha = st.drawAlpha ?? 1;
  (st.draws || []).forEach((d, i) => drawShape(c, V, d, !!(st.sel && st.sel.kind === 'draw' && st.sel.idx === i)));
  c.restore();
  if (st.temp) drawShape(c, V, st.temp, false);
  drawLinks(c, V, proj, st);
  for (const o of sortedObjs(proj)) {
    const p = st.pos[o.id]; if (!p) continue;
    const [x, y] = w2s(V, p[0], p[1]);
    drawObj(c, V, proj, o, x, y, R, false, isSelected(st, o.id));
  }
  if (st.measure) drawMeasure(c, V, st.measure);
  if (st.place) drawPlacePreview(c, V, proj, st.place);
  if (st.band) drawBand(c, st.band);
}
function easeStep(t) { const p = .12; if (t <= p) return 0; const u = Math.min(1, (t - p) / (1 - p)); return u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
function interpState(proj, i, t) {
  const A = proj.frames[i], B = proj.frames[i + 1] || A, pos = {};
  for (const id in A.pos) {
    const a = A.pos[id], b = B.pos[id] || a, k = (a[0] !== b[0] || a[1] !== b[1]) ? curveFor(A.draws, a, b) : null;
    pos[id] = k ? qBez(a, k, b, t) : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  return { pos, draws: A.draws, drawAlpha: 1 - t * .75 };
}
function frameState() {
  const f = P.frames[cur];
  return {
    pos: f.pos, draws: f.draws, sel,
    ghost: (prefs.onion && cur > 0) ? P.frames[cur - 1].pos : null,
    temp: drag && drag.mode === 'new' ? drag.shape : null,
    tempZone: drag && drag.mode === 'newZone' ? drag.zone : null,
    editZone: drag && (drag.mode === 'zone' || drag.mode === 'zoneHandle') ? drag.idx : null,
    polyDraft: polyDraft ? { pts: polyDraft, cursor: polyCursor } : null,
    measure,
    place: placementPreview(),
    band: drag && drag.mode === 'band' ? [drag.a, drag.b] : null,
  };
}
function render() {
  if (!P || !V) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, V.w, V.h);
  const st = (playing && anim) ? interpState(P, anim.i, anim.e) : frameState();
  renderScene(ctx, V, P, st);
}
function resize() {
  const st = $('#stage'), w = st.clientWidth, h = st.clientHeight; if (!w || !h || !P) return;
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  V = makeView(w, h, P, prefs.orient);
  render();
}

/* ---------- Detección de toques ---------- */
function hitObj(sx, sy) {
  const pos = P.frames[cur].pos, R = objR(V), list = sortedObjs(P).reverse();
  for (const o of list) {
    const p = pos[o.id]; if (!p) continue;
    const [x, y] = w2s(V, p[0], p[1]);
    const r = o.type === 'player' ? Math.max(R * 1.1, 16) : equipmentExtent(o, R, V.s);
    const cy = (o.type === 'pole' || o.type === 'flag') ? y - R * .6 : y;
    if (Math.hypot(sx - x, sy - cy) <= r) return o;
  }
  return null;
}
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function hitDraw(sx, sy) {
  const draws = P.frames[cur].draws, p = [sx, sy];
  for (let i = draws.length - 1; i >= 0; i--) {
    const d = draws[i], pts = d.pts.map(q => w2s(V, q[0], q[1])); let dist = Infinity;
    if (d.t === 'rect') {
      const [a, b] = [pts[0], pts[pts.length - 1]];
      if (sx >= Math.min(a[0], b[0]) && sx <= Math.max(a[0], b[0]) && sy >= Math.min(a[1], b[1]) && sy <= Math.max(a[1], b[1])) dist = 0;
    } else if (d.t === 'circle') {
      const r = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      if (Math.hypot(sx - pts[0][0], sy - pts[0][1]) <= r + 8) dist = 0;
    } else if (CURVE_TYPES.includes(d.t)) { dist = curveHitDist(V, d, p);
    } else if (d.t === 'shadow') { dist = shadowHit(V, d, p);
    } else if (d.t === 'text') {
      const tb = textBox(ctx, V, d);
      if (Math.abs(sx - pts[0][0]) < tb.w / 2 + 10 && Math.abs(sy - pts[0][1]) < tb.h / 2 + 8) dist = 0;
    } else {
      for (let k = 1; k < pts.length; k++) dist = Math.min(dist, distSeg(p, pts[k - 1], pts[k]));
    }
    if (dist < 14) return i;
  }
  return -1;
}

/* ---------- Edición ---------- */
function pushUndo() { undoStack.push(JSON.stringify(P)); if (undoStack.length > 100) undoStack.shift(); redoStack = []; updateUndo(); }
function undo() { if (!undoStack.length) return; redoStack.push(JSON.stringify(P)); P = JSON.parse(undoStack.pop()); afterHistory(); }
function redo() { if (!redoStack.length) return; undoStack.push(JSON.stringify(P)); P = JSON.parse(redoStack.pop()); afterHistory(); }
function afterHistory() { cur = Math.min(cur, P.frames.length - 1); sel = null; syncProjectUI(); syncViewSel(); resize(); commit(); }
function updateUndo() { $('#btnUndo').disabled = !undoStack.length; $('#btnRedo').disabled = !redoStack.length; }
function commit() { P.updated = Date.now(); scheduleSave(); render(); showSel(); renderFrames(); updateUndo(); updateDensityBadge(); }

let saveTimer = null;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
async function saveNow() { clearTimeout(saveTimer); if (!P) return; try { await DB.put('projects', clone(P)); } catch (e) { console.error(e); toast('No se pudo guardar'); } }

function nextNum(team) {
  const used = new Set(P.objs.filter(o => o.type === 'player' && o.team === team).map(o => +o.num));
  let n = team === 'C' ? 1 : 2; while (used.has(n)) n++; return n;
}
function addObj(spec, x, y) {
  const o = { id: uid(), type: spec.type };
  if (spec.type === 'player') { o.team = spec.team; o.gk = !!spec.gk; o.num = spec.gk ? 1 : nextNum(spec.team); o.name = ''; }
  P.objs.push(o);
  for (const f of P.frames) f.pos[o.id] = [x, y];
  return o;
}
function removeObj(id) {
  P.objs = P.objs.filter(o => o.id !== id); P.frames.forEach(f => delete f.pos[id]); sel = null;
  P.links = (P.links || []).map(l => ({ ...l, ids: l.ids.filter(x => x !== id) })).filter(l => l.ids.length > 1);
}
function propagate(id, old) {
  const np = P.frames[cur].pos[id];
  for (let j = cur + 1; j < P.frames.length; j++) {
    const q = P.frames[j].pos[id];
    if (q && Math.abs(q[0] - old[0]) < 1e-6 && Math.abs(q[1] - old[1]) < 1e-6) P.frames[j].pos[id] = [...np]; else break;
  }
}
function clampField(p) { return [clamp(p[0], 0, P.field.L), clamp(p[1], 0, P.field.W)]; }
function evPoint(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function makeZone(shape, pts) {
  const mat = prefs.zMat || 'platillos';
  return { id: uid(), name: '', shape, pts, material: mat, color: prefs.zColor || ZONE_DEFAULT_COLOR[mat], spacing: +prefs.zSpacing || 5, dims: true, dim: false, main: false };
}
function addZone(z) {
  if (!mainZone(P)) { z.main = true; z.dim = zoneArea(z) > P.field.L * P.field.W * .2; }
  P.zones.push(z); sel = { kind: 'zone', idx: P.zones.length - 1 };
}
function finishPoly() {
  if (!polyDraft || polyDraft.length < 3) { toast('Un polígono necesita al menos 3 puntos'); return; }
  pushUndo(); const z = makeZone('poly', polyDraft); addZone(z);
  polyDraft = null; polyCursor = null; $('#zbClose').hidden = true;
  setTool('move'); sel = { kind: 'zone', idx: P.zones.length - 1 }; commit(); syncViewSel();
  toast('Espacio creado: ' + zoneSummary(z), 3500);
}

canvas.addEventListener('pointerdown', e => {
  if (!P || presenting) return;
  if (playing) stopPlay();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const [sx, sy] = evPoint(e), [wx, wy] = s2w(V, sx, sy);
  if (tool !== 'measure' && measure) measure = null;
  if (tool === 'measure') { measure = { a: [wx, wy], b: [wx, wy] }; drag = { mode: 'measure' }; render(); return; }
  if (tool === 'area') {
    if ((prefs.zShape || 'rect') === 'poly') {
      if (!polyDraft) polyDraft = [];
      if (polyDraft.length >= 3) { const [fx, fy] = w2s(V, polyDraft[0][0], polyDraft[0][1]); if (Math.hypot(sx - fx, sy - fy) < 18) { finishPoly(); return; } }
      polyDraft.push(clampField([wx, wy])); $('#zbClose').hidden = polyDraft.length < 3; render(); return;
    }
    const p = clampField([wx, wy]); drag = { mode: 'newZone', zone: makeZone(prefs.zShape || 'rect', [p, [...p]]) }; render(); return;
  }
  {
  const sd = sel && sel.kind === 'draw' ? P.frames[cur].draws[sel.idx] : null;
    if (sd && CURVE_TYPES.includes(sd.t)) {
      const [kx, ky] = curveCtrlScreen(V, sd);
      if (Math.hypot(sx - kx, sy - ky) < 18) { pushUndo(); if (!sd.pts[2]) sd.pts[2] = curveCtrl(sd.pts[0], sd.pts[1]); drag = { mode: 'ctrl', idx: sel.idx, moved: false }; return; }
    }
  }
  if (tool === 'move') {
    if (sel && sel.kind === 'zone' && P.zones[sel.idx]) {
      const z = P.zones[sel.idx], hs = zoneHandles(z);
      for (let i = 0; i < hs.length; i++) {
        const [hx, hy] = w2s(V, hs[i][0], hs[i][1]);
        if (Math.hypot(sx - hx, sy - hy) < 18) { pushUndo(); drag = { mode: 'zoneHandle', idx: sel.idx, h: i, moved: false }; render(); return; }
      }
    }
    const o = hitObj(sx, sy);
    if (o && sel && sel.kind === 'multi' && sel.ids.includes(o.id)) {
      pushUndo(); const starts = {}; sel.ids.forEach(id => { const q = P.frames[cur].pos[id]; if (q) starts[id] = [...q]; });
      drag = { mode: 'multi', last: [wx, wy], starts, moved: false }; render(); return;
    }
    if (o) {
      const now = performance.now();
      if (lastTap.id === o.id && now - lastTap.t < 350) { lastTap = { t: 0, id: null }; if (o.type === 'player') editPlayer(o); return; }
      lastTap = { t: now, id: o.id };
      sel = { kind: 'obj', id: o.id }; pushUndo();
      const p = P.frames[cur].pos[o.id];
      drag = { mode: 'obj', id: o.id, start: [...p], off: [p[0] - wx, p[1] - wy], moved: false };
      showSel(); render(); return;
    }
    const di = hitDraw(sx, sy);
    if (di >= 0) {
      const now = performance.now(), d = P.frames[cur].draws[di];
      if (d.t === 'text' && lastTap.id === 'd' + di && now - lastTap.t < 350) { lastTap = { t: 0, id: null }; editTextShape(d); return; }
      lastTap = { t: now, id: 'd' + di };
      sel = { kind: 'draw', idx: di }; pushUndo(); drag = { mode: 'draw', idx: di, last: [wx, wy], moved: false }; showSel(); render(); return;
    }
    const li = hitLink(sx, sy);
    if (li >= 0) { sel = { kind: 'link', idx: li }; showSel(); render(); return; }
    for (let i = P.zones.length - 1; i >= 0; i--) {
      if (zoneEdgeDist(V, P.zones[i], sx, sy) < 14) {
        const now = performance.now();
        if (lastTap.id === 'z' + i && now - lastTap.t < 350) { lastTap = { t: 0, id: null }; editZone(i); return; }
        lastTap = { t: now, id: 'z' + i };
        sel = { kind: 'zone', idx: i }; pushUndo(); drag = { mode: 'zone', idx: i, last: [wx, wy], moved: false }; showSel(); render(); return;
      }
    }
    sel = null; drag = { mode: 'band', a: [sx, sy], b: [sx, sy] }; showSel(); render(); return;
  }
  if (tool === 'erase') {
    const o = hitObj(sx, sy);
    if (o) { pushUndo(); removeObj(o.id); commit(); return; }
    const di = hitDraw(sx, sy);
    if (di >= 0) { pushUndo(); P.frames[cur].draws.splice(di, 1); sel = null; commit(); return; }
    const li = hitLink(sx, sy); if (li >= 0) { pushUndo(); P.links.splice(li, 1); sel = null; commit(); return; }
    for (let i = P.zones.length - 1; i >= 0; i--) if (zoneEdgeDist(V, P.zones[i], sx, sy) < 14) { pushUndo(); removeZone(i); commit(); return; }
    return;
  }
  const spec = toolSpec(tool);
  if (spec) {
    if (placeQty() === 1) {
      pushUndo(); const o = placeOne(spec, wx, wy); sel = { kind: 'obj', id: o.id };
      drag = { mode: 'obj', id: o.id, start: [wx, wy], off: [0, 0], moved: false, placed: true }; showSel(); render(); return;
    }
    drag = { mode: 'place', a: [wx, wy], b: [wx, wy], sa: [sx, sy], moved: false }; render(); return;
  }
  if (tool === 'text') {
    openTextDialog(null, r => { pushUndo(); P.frames[cur].draws.push({ t: 'text', pts: [[wx, wy]], c: color, ...r }); commit(); });
    return;
  }
  if (DRAW_TOOLS.includes(tool)) { drag = { mode: 'new', shape: { t: tool, pts: [[wx, wy], [wx, wy]], c: color } }; render(); }
});
canvas.addEventListener('pointermove', e => {
  if (!P || !V) return;
  const [sx, sy] = evPoint(e), [wx, wy] = s2w(V, sx, sy);
  if (tool === 'area' && polyDraft && !drag) { polyCursor = clampField([wx, wy]); render(); return; }
  if (!drag && toolSpec(tool) && e.pointerType === 'mouse' && placeQty() > 1) { hoverPt = [wx, wy]; render(); return; }
  if (!drag) return;
  if (drag.mode === 'place') { drag.b = [wx, wy]; if (Math.hypot(sx - drag.sa[0], sy - drag.sa[1]) > 8) drag.moved = true; render(); return; }
  if (drag.mode === 'band') { drag.b = [sx, sy]; render(); return; }
  if (drag.mode === 'multi') {
    const dx = wx - drag.last[0], dy = wy - drag.last[1];
    for (const id in drag.starts) { const q = P.frames[cur].pos[id]; if (q) P.frames[cur].pos[id] = [q[0] + dx, q[1] + dy]; }
    drag.last = [wx, wy]; drag.moved = true; render(); return;
  }
  if (drag.mode === 'obj') {
    P.frames[cur].pos[drag.id] = [clamp(wx + drag.off[0], V.v.x0 + .5, V.v.x1 - .5), clamp(wy + drag.off[1], V.v.y0 + .5, V.v.y1 - .5)];
    drag.moved = true; render();
  } else if (drag.mode === 'draw' || drag.mode === 'zone') {
    const pts = drag.mode === 'draw' ? (P.frames[cur].draws[drag.idx] || {}).pts : (P.zones[drag.idx] || {}).pts; if (!pts) return;
    const dx = wx - drag.last[0], dy = wy - drag.last[1];
    if (Math.hypot(dx, dy) > .01) { pts.forEach(p => { p[0] += dx; p[1] += dy; }); drag.last = [wx, wy]; drag.moved = true; render(); }
  } else if (drag.mode === 'ctrl') {
    const d = P.frames[cur].draws[drag.idx]; if (d) { d.pts[2] = [wx, wy]; drag.moved = true; render(); }
  } else if (drag.mode === 'zoneHandle') {
    const z = P.zones[drag.idx], p = clampField([wx, wy]);
    if (z.shape === 'rect') {
      const opp = zoneVerts(z)[(drag.h + 2) % 4]; z.pts = [p, [...opp]];
      const v = zoneVerts(z); drag.h = v.findIndex(q => q[0] === p[0] && q[1] === p[1]);
    } else if (z.shape === 'circle') {
      if (drag.h === 0) { const dx = p[0] - z.pts[0][0], dy = p[1] - z.pts[0][1]; z.pts = z.pts.map(q => [q[0] + dx, q[1] + dy]); }
      else z.pts[1] = p;
    } else z.pts[drag.h] = p;
    drag.moved = true; render();
  } else if (drag.mode === 'new') {
    const sh = drag.shape;
    if (sh.t === 'pen') { const l = sh.pts[sh.pts.length - 1]; if (Math.hypot(wx - l[0], wy - l[1]) > .4) sh.pts.push([wx, wy]); }
    else sh.pts[1] = [wx, wy];
    render();
  } else if (drag.mode === 'newZone') { drag.zone.pts[1] = clampField([wx, wy]); render(); }
  else if (drag.mode === 'measure') { measure.b = [wx, wy]; render(); }
});
function endPointer() {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.mode === 'obj' && d.placed) { const q = P.frames[cur].pos[d.id]; P.frames.forEach(f => f.pos[d.id] = [...q]); commit(); }
  else if (d.mode === 'obj') { if (d.moved) { propagate(d.id, d.start); commit(); } else { undoStack.pop(); updateUndo(); } }
  else if (d.mode === 'multi') { if (d.moved) { for (const id in d.starts) propagate(id, d.starts[id]); commit(); } else { undoStack.pop(); updateUndo(); } }
  else if (d.mode === 'band') {
    const [a, b] = [d.a, d.b];
    if (Math.abs(b[0] - a[0]) > 6 || Math.abs(b[1] - a[1]) > 6) {
      const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      selectObjs(P.objs.filter(o => { const q = P.frames[cur].pos[o.id]; if (!q) return false; const [x, y] = w2s(V, q[0], q[1]); return x >= x0 && x <= x1 && y >= y0 && y <= y1; }));
    } else render();
  }
  else if (d.mode === 'place') {
    const spec = toolSpec(tool); if (!spec) { render(); return; }
    const pts = layoutPositions(placeQty(), placeLay(), placeGap(spec), d.a, d.b, d.moved).map(clampView);
    pushUndo(); const ids = pts.map(q => placeOne(spec, q[0], q[1]).id);
    sel = ids.length > 1 ? { kind: 'multi', ids } : { kind: 'obj', id: ids[0] };
    commit(); toast(`${ids.length} × ${specName(tool)} colocados. Arrástralos juntos para moverlos.`);
  }
  else if (d.mode === 'ctrl') { if (d.moved) commit(); else { undoStack.pop(); updateUndo(); render(); } }
  else if (d.mode === 'draw' || d.mode === 'zone' || d.mode === 'zoneHandle') {
    if (d.moved) { commit(); if (d.mode !== 'draw') { syncViewSel(); if (P.pitch === 'zone') resize(); } }
    else { undoStack.pop(); updateUndo(); render(); }
  } else if (d.mode === 'new') {
    const sh = d.shape; let len = 0;
    for (let k = 1; k < sh.pts.length; k++) len += Math.hypot(sh.pts[k][0] - sh.pts[k - 1][0], sh.pts[k][1] - sh.pts[k - 1][1]);
    if (sh.t === 'pen' && sh.pts.length > 2) sh.pts.shift();
    if (CURVE_TYPES.includes(sh.t)) sh.pts[2] = curveCtrl(sh.pts[0], sh.pts[1]);
    if (len > .8) { pushUndo(); P.frames[cur].draws.push(sh); if (CURVE_TYPES.includes(sh.t)) { sel = { kind: 'draw', idx: P.frames[cur].draws.length - 1 }; } commit(); } else render();
  } else if (d.mode === 'newZone') {
    const z = d.zone, [x0, y0, x1, y1] = zoneBBox(z);
    const ok = z.shape === 'circle' ? zoneRadius(z) > .5 : (x1 - x0 > 1 && y1 - y0 > 1);
    if (ok) { pushUndo(); addZone(z); setTool('move'); sel = { kind: 'zone', idx: P.zones.length - 1 }; commit(); syncViewSel(); toast('Espacio creado: ' + zoneSummary(z) + '. Arrastra las esquinas para ajustarlo.', 4000); }
    else render();
  } else if (d.mode === 'measure') render();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { if (hoverPt) { hoverPt = null; render(); } });
canvas.addEventListener('pointerdown', () => closePanel(), true);
function removeZone(i) {
  const wasMain = P.zones[i] && P.zones[i].main;
  P.zones.splice(i, 1); sel = null;
  if (wasMain && P.pitch === 'zone') { P.pitch = 'full'; resize(); }
  syncViewSel();
}

/* ---------- Panel de selección ---------- */
function selObj() { return sel && sel.kind === 'obj' ? P.objs.find(o => o.id === sel.id) : null; }
function selDraw() { return sel && sel.kind === 'draw' ? P.frames[cur].draws[sel.idx] : null; }
function selZone() { return sel && sel.kind === 'zone' ? P.zones[sel.idx] : null; }
function selLinkObj() { return sel && sel.kind === 'link' ? (P.links || [])[sel.idx] : null; }
function showSel() {
  const panel = $('#selPanel'), objs = selObjs(), o = selObj(), d = selDraw(), z = selZone(), lk = selLinkObj();
  if (sel && sel.kind === 'multi' && objs.length < 2) sel = objs.length ? { kind: 'obj', id: objs[0].id } : null;
  if (playing || presenting || (!objs.length && !d && !z && !lk)) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  const multi = objs.length > 1;
  $('#selInfo').textContent = multi ? objs.length + ' seleccionados' : '';
  $('#selEdit').classList.toggle('hidden', multi || !((o && o.type === 'player') || (d && d.t === 'text') || z));
  $('#selRotate').classList.toggle('hidden', !objs.some(x => OBJ[x.type] && OBJ[x.type].rot));
  $('#selColor').classList.toggle('hidden', !(d || z || objs.some(x => OBJ[x.type] && OBJ[x.type].colorable)));
  $('#selSave').classList.toggle('hidden', !(z || (multi && objs.some(x => x.type !== 'player'))));
  $('#selColor').classList.toggle('hidden', !(d || z || lk || objs.some(x => OBJ[x.type] && OBJ[x.type].colorable)));
  $('#selLink').classList.toggle('hidden', !multi);
  $('#selStyle').classList.toggle('hidden', !lk); if (lk) $('#selStyle').textContent = lk.style === 'block' ? 'Ver como línea' : 'Ver como bloque';
  $('#selSpot').classList.toggle('hidden', !objs.some(x => x.type === 'player')); $('#selSpot').textContent = objs.length && objs.every(x => x.type !== 'player' || x.spot) ? 'Quitar destacado' : 'Destacar';
  $('#selDup').classList.toggle('hidden', !!lk);
  if (lk) $('#selInfo').textContent = (lk.style === 'block' ? 'Bloque' : 'Línea') + ' de ' + lk.ids.length;
}
$('#selDel').onclick = () => {
  const objs = selObjs(), d = selDraw(), z = selZone();
  pushUndo();
  if (objs.length) objs.forEach(o => removeObj(o.id)); else if (d) { P.frames[cur].draws.splice(sel.idx, 1); } else if (z) removeZone(sel.idx);
  else if (selLinkObj()) P.links.splice(sel.idx, 1);
  sel = null; commit();
};
$('#selEdit').onclick = () => { const o = selObj(), d = selDraw(); if (o) editPlayer(o); else if (d && d.t === 'text') editTextShape(d); else if (selZone()) editZone(sel.idx); };
$('#selRotate').onclick = () => {
  const objs = selObjs().filter(o => OBJ[o.type] && OBJ[o.type].rot); if (!objs.length) return;
  pushUndo(); objs.forEach(o => o.rot = ((o.rot || 0) + Math.PI / 4) % (Math.PI * 2)); commit();
};
$('#selColor').onclick = () => {
  const objs = selObjs(), d = selDraw(), z = selZone(); pushUndo();
  const lk = selLinkObj();
  if (d) d.c = color; else if (z) z.color = color; else if (lk) lk.c = color; else objs.forEach(o => { if (OBJ[o.type] && OBJ[o.type].colorable) o.c = color; });
  commit();
};
$('#selSave').onclick = () => {
  const z = selZone(); if (z) { saveSpace([z], []); return; }
  const objs = selObjs().filter(o => o.type !== 'player').map(o => { const q = P.frames[cur].pos[o.id]; return { type: o.type, x: q[0], y: q[1], rot: o.rot || 0, c: o.c }; });
  if (objs.length) saveSpace([], objs);
};
$('#selLink').onclick = () => {
  const objs = selObjs(); if (objs.length < 2) return; pushUndo();
  const ordered = orderForLine(objs, P.frames[cur].pos);
  P.links.push({ id: uid(), ids: ordered.map(o => o.id), style: 'line', c: '#ffeb3b', dist: true });
  sel = { kind: 'link', idx: P.links.length - 1 }; commit();
  toast('Línea creada. Se mueve con las fichas en todos los pasos. Cámbiala a bloque para ver ancho y profundidad.', 4500);
};
$('#selStyle').onclick = () => { const lk = selLinkObj(); if (!lk) return; pushUndo(); lk.style = lk.style === 'block' ? 'line' : 'block'; commit(); };
$('#selSpot').onclick = () => {
  const ps = selObjs().filter(o => o.type === 'player'); if (!ps.length) return; pushUndo();
  const on = !ps.every(o => o.spot); ps.forEach(o => o.spot = on); commit();
};
$('#selDup').onclick = () => {
  const objs = selObjs(), d = selDraw(), z = selZone(); pushUndo();
  if (objs.length) {
    const ids = objs.map(o => {
      const n = clone(o); n.id = uid(); if (n.type === 'player' && !n.gk) n.num = nextNum(n.team);
      P.objs.push(n); P.frames.forEach(f => { const q = f.pos[o.id]; if (q) f.pos[n.id] = [q[0] + 2, q[1] + 2]; });
      return n.id;
    });
    sel = ids.length > 1 ? { kind: 'multi', ids } : { kind: 'obj', id: ids[0] };
  } else if (d) {
    const n = clone(d); n.pts.forEach(q => { q[0] += 2; q[1] += 2; });
    P.frames[cur].draws.push(n); sel = { kind: 'draw', idx: P.frames[cur].draws.length - 1 };
  } else if (z) {
    const n = clone(z); n.id = uid(); n.main = false; n.dim = false; n.pts.forEach(q => { q[0] += 3; q[1] += 3; });
    P.zones.push(n); sel = { kind: 'zone', idx: P.zones.length - 1 };
  }
  commit();
};

/* ---------- Editar espacio ---------- */
let editingZone = -1;
function editZone(i) {
  const z = P.zones[i]; if (!z) return; editingZone = i;
  $('#zName').value = z.name || ''; $('#zInfo').textContent = ({ rect: 'Rectángulo', circle: 'Círculo', poly: 'Polígono' })[z.shape] + ' · ' + zoneSummary(z);
  $('#zMat').value = z.material; $('#zColor').value = z.color || ZONE_DEFAULT_COLOR[z.material]; $('#zSpacing').value = z.spacing || 5;
  $('#zDims').checked = !!z.dims; $('#zDim').checked = !!z.dim; $('#zMain').checked = !!z.main;
  const [x0, y0, x1, y1] = zoneBBox(z);
  $('#zSizeRow').hidden = z.shape === 'poly';
  $('#zW').value = +(z.shape === 'circle' ? zoneRadius(z) * 2 : x1 - x0).toFixed(1); $('#zH').value = +(y1 - y0).toFixed(1);
  $('#zH').parentElement.hidden = z.shape === 'circle';
  $('#zW').parentElement.firstChild.textContent = z.shape === 'circle' ? 'Diámetro (m) ' : 'Largo (m) ';
  $('#dlgZone').showModal();
}
$('#zMat').onchange = e => { const z = P.zones[editingZone]; if (z && $('#zColor').value.toLowerCase() === (ZONE_DEFAULT_COLOR[z.material] || '').toLowerCase()) $('#zColor').value = ZONE_DEFAULT_COLOR[e.target.value]; };
function applyZoneForm() {
  const z = P.zones[editingZone]; if (!z) return null;
  pushUndo();
  z.name = $('#zName').value.trim(); z.material = $('#zMat').value; z.color = $('#zColor').value;
  z.spacing = clamp(+$('#zSpacing').value || 5, .5, 20); z.dims = $('#zDims').checked; z.dim = $('#zDim').checked;
  if ($('#zMain').checked) P.zones.forEach(q => q.main = q === z); else z.main = false;
  if (z.shape === 'rect') {
    const [x0, y0, x1, y1] = zoneBBox(z), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const w = clamp(+$('#zW').value || (x1 - x0), 1, 130), h = clamp(+$('#zH').value || (y1 - y0), 1, 100);
    z.pts = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy + h / 2]];
  } else if (z.shape === 'circle') {
    const r = clamp(+$('#zW').value || zoneRadius(z) * 2, 1, 130) / 2; z.pts = [z.pts[0], [z.pts[0][0] + r, z.pts[0][1]]];
  }
  if (!mainZone(P) && P.pitch === 'zone') P.pitch = 'full';
  commit(); syncViewSel(); resize();
  return z;
}
$('#zOk').onclick = () => { applyZoneForm(); $('#dlgZone').close(); };
$('#zSave').onclick = () => { const z = applyZoneForm(); $('#dlgZone').close(); if (z) saveSpace([z], []); };

/* ---------- Espacios guardados ---------- */
function spaceProject(data) {
  const p = newProject('', P.field.type); p.field = clone(P.field); p.zones = clone(data.zones || []);
  (data.objs || []).forEach((o, i) => { const id = 'o' + i; p.objs.push({ id, type: o.type, rot: o.rot || 0, c: o.c }); p.frames[0].pos[id] = [o.x, o.y]; });
  if (!p.zones.some(z => z.main) && p.zones[0]) p.zones[0].main = true;
  p.pitch = p.zones.length ? 'zone' : 'full';
  const fix = mainZone(p); if (fix) fix.dim = false;
  return p;
}
function spaceBBox(data) {
  const bs = (data.zones || []).map(zoneBBox).concat((data.objs || []).map(o => [o.x, o.y, o.x, o.y]));
  if (!bs.length) return null;
  return [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))];
}
function applySpace(data) {
  pushUndo();
  if ($('#spReplace').checked) { P.zones = []; P.objs.filter(o => o.type !== 'player' && o.type !== 'ball').forEach(o => removeObj(o.id)); }
  let dx = 0, dy = 0;
  if (data.field && (data.field.L !== P.field.L || data.field.W !== P.field.W)) {
    const b = spaceBBox(data);
    if (b) { const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; dx = cx / data.field.L * P.field.L - cx; dy = cy / data.field.W * P.field.W - cy; }
  }
  for (const zr of data.zones || []) {
    const z = Object.assign({ name: '', material: 'platillos', spacing: 5, dims: true, dim: false, main: false }, clone(zr));
    z.id = uid(); z.main = false; z.color = z.color || ZONE_DEFAULT_COLOR[z.material];
    z.pts = z.pts.map(p => [p[0] + dx, p[1] + dy]);
    addZone(z);
  }
  for (const o of data.objs || []) {
    const n = addObj({ type: o.type }, o.x + dx, o.y + dy); if (o.rot) n.rot = o.rot;
    if (OBJ[o.type] && OBJ[o.type].colorable) n.c = o.c || OBJ[o.type].color;
  }
  sel = null; commit(); syncViewSel(); resize();
}
async function saveSpace(zones, objs) {
  const r = await ask('Guardar en Mis espacios', [{ label: 'Nombre del espacio', value: (zones[0] && zones[0].name) || 'Mi espacio' }], 'Guardar');
  if (!r || !r[0].trim()) return;
  await DB.put('spaces', { id: uid(), name: r[0].trim(), field: { L: P.field.L, W: P.field.W }, zones: clone(zones), objs: clone(objs), created: Date.now() });
  toast('Espacio guardado en «Mis espacios»');
  if ($('#dlgSpaces').open) renderSpaces();
}
function spaceCard(name, desc, data, onApply, onDelete) {
  const card = document.createElement('div'); card.className = 'card';
  const cv = thumbCanvas(spaceProject(data)); cv.onclick = onApply; card.appendChild(cv);
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.innerHTML = `<div class="t">${esc(name)}</div><div class="s">${esc(desc)}</div>`; card.appendChild(meta);
  const acts = document.createElement('div'); acts.className = 'acts';
  const b = document.createElement('button'); b.className = 'primary'; b.textContent = 'Usar'; b.onclick = onApply; acts.appendChild(b);
  if (onDelete) { const d = document.createElement('button'); d.className = 'danger'; d.textContent = 'Borrar'; d.onclick = onDelete; acts.appendChild(d); }
  card.appendChild(acts); return card;
}
async function renderSpaces() {
  const mine = (await DB.all('spaces')).sort((a, b) => b.created - a.created), wrap = $('#mySpaces'); wrap.innerHTML = '';
  if (!mine.length) wrap.innerHTML = '<div class="empty">Crea un espacio con ⛶ Delimitar y guárdalo desde su menú, o guarda aquí el espacio actual con su material.</div>';
  mine.forEach(sp => wrap.appendChild(spaceCard(sp.name, (sp.zones || []).map(zoneSummary).join(' + ') || ((sp.objs || []).length + ' objetos'), sp,
    () => { applySpace(sp); $('#dlgSpaces').close(); toast('Espacio «' + sp.name + '» añadido'); },
    async () => { if (!await confirmBox('¿Borrar el espacio «' + sp.name + '»?')) return; await DB.del('spaces', sp.id); renderSpaces(); })));
  const pw = $('#presetSpaces'); pw.innerHTML = '';
  SPACE_PRESETS.forEach(ps => {
    const data = ps.build(P.field);
    data.objs = (data.objs || []);
    pw.appendChild(spaceCard(ps.name, ps.desc, data, () => { applySpace(ps.build(P.field)); $('#dlgSpaces').close(); toast('Espacio «' + ps.name + '» añadido'); }));
  });
}
function openSpaces() { $('#dlgSpaces').showModal(); renderSpaces(); }
$('#btnSaveSpace').onclick = () => {
  const objs = P.objs.filter(o => o.type !== 'player' && o.type !== 'ball').map(o => { const p = P.frames[cur].pos[o.id]; return { type: o.type, x: p[0], y: p[1], rot: o.rot || 0, c: o.c }; });
  if (!P.zones.length && !objs.length) { toast('No hay espacios ni material en la pizarra para guardar'); return; }
  saveSpace(P.zones, objs);
};

/* ---------- Barra de delimitación ---------- */
function syncZoneBar() {
  const shape = prefs.zShape || 'rect', mat = prefs.zMat || 'platillos';
  $$('#zbShape button').forEach(b => b.classList.toggle('on', b.dataset.shape === shape));
  $('#zbMat').value = mat; $('#zbColor').value = prefs.zColor || ZONE_DEFAULT_COLOR[mat];
  $('#zbSpacing').value = prefs.zSpacing || 5;
  $('#zbSpLbl').hidden = !['platillos', 'conos', 'estacas', 'ligas'].includes(mat);
  $('#zbClose').hidden = !(polyDraft && polyDraft.length >= 3);
}
$$('#zbShape button').forEach(b => b.onclick = () => { prefs.zShape = b.dataset.shape; savePrefs(); polyDraft = null; syncZoneBar(); hint(areaHint()); render(); });
$('#zbMat').onchange = e => { prefs.zMat = e.target.value; prefs.zColor = null; savePrefs(); syncZoneBar(); };
$('#zbColor').oninput = e => { prefs.zColor = e.target.value; savePrefs(); };
$('#zbSpacing').onchange = e => { prefs.zSpacing = clamp(+e.target.value || 5, .5, 20); savePrefs(); };
$('#zbClose').onclick = finishPoly;
$('#zbDone').onclick = () => { if (polyDraft && polyDraft.length >= 3) finishPoly(); else setTool('move'); };
function areaHint() {
  return ({ rect: 'Arrastra para delimitar un rectángulo (verás las medidas)', circle: 'Arrastra desde el centro hacia el borde', poly: 'Toca para poner vértices · toca el primero para cerrar' })[prefs.zShape || 'rect'];
}

/* ---------- Texto ---------- */
function openTextDialog(d, onOk) {
  $('#txText').value = d ? d.text : ''; $('#txSize').value = String(d ? (d.size || 1) : 1); $('#txBox').checked = d ? !!d.box : false;
  $('#txOk').onclick = () => {
    const t = $('#txText').value.trim(); $('#dlgText').close();
    if (t) onOk({ text: t, size: +$('#txSize').value, box: $('#txBox').checked });
  };
  $('#dlgText').showModal(); setTimeout(() => $('#txText').focus(), 50);
}
function editTextShape(d) { openTextDialog(d, r => { pushUndo(); Object.assign(d, r); commit(); }); }

/* ---------- Editar jugador ---------- */
let editing = null;
function editPlayer(o) {
  editing = o;
  $('#edNum').value = o.num ?? ''; $('#edName').value = o.name || ''; $('#edTeam').value = o.team; $('#edGk').checked = !!o.gk;
  TEAM_KEYS.forEach((k, i) => $('#edTeam').options[i].text = k + ' · ' + P.teams[k].name);
  const sq = Object.values(SQUAD).sort((a, b) => (+a.dorsal || 99) - (+b.dorsal || 99));
  $('#edPid').innerHTML = '<option value="">— Sin vincular —</option>' + sq.map(p => `<option value="${p.id}">${esc((p.dorsal ? p.dorsal + ' · ' : '') + p.name)}${p.status && p.status !== 'disponible' ? ' (' + STATUS[p.status].name.toLowerCase() + ')' : ''}</option>`).join('');
  $('#edPid').value = o.pid && SQUAD[o.pid] ? o.pid : ''; $('#edPidRow').hidden = !sq.length;
  $('#dlgEdit').showModal(); setTimeout(() => $('#edName').focus(), 50);
}
$('#edOk').onclick = () => {
  if (!editing) return; pushUndo();
  const o = P.objs.find(x => x.id === editing.id);
  if (o) { o.num = $('#edNum').value.trim(); o.name = $('#edName').value.trim(); o.team = $('#edTeam').value; o.gk = $('#edGk').checked; o.pid = $('#edPid').value || null; }
  $('#dlgEdit').close(); editing = null; commit();
};
$('#edName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#edOk').click(); });
$('#edPid').onchange = e => { const sp = SQUAD[e.target.value]; if (sp) { $('#edName').value = sp.short || sp.name; $('#edNum').value = sp.dorsal || ''; $('#edGk').checked = sp.pos === 'POR'; } };

/* ---------- Pasos y animación ---------- */
function renderFrames() {
  const fl = $('#frameList'); fl.innerHTML = '';
  P.frames.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'fr' + (i === cur ? ' active' : ''); b.textContent = i + 1; b.title = 'Paso ' + (i + 1);
    b.onclick = () => { if (playing) stopPlay(); cur = i; sel = null; showSel(); renderFrames(); render(); };
    fl.appendChild(b);
  });
  const act = fl.children[cur]; if (act) act.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  $('#btnDelFrame').disabled = P.frames.length < 2;
}
function markFrame(i) { $$('#frameList .fr').forEach((b, k) => b.classList.toggle('active', k === i)); }
$('#btnAddFrame').onclick = () => {
  if (playing) stopPlay(); pushUndo();
  P.frames.splice(cur + 1, 0, { pos: clone(P.frames[cur].pos), draws: [] });
  cur++; sel = null; commit(); hint('Nuevo paso: mueve las fichas a su siguiente posición');
};
$('#btnDelFrame').onclick = () => {
  if (P.frames.length < 2) return; if (playing) stopPlay(); pushUndo();
  P.frames.splice(cur, 1); cur = Math.min(cur, P.frames.length - 1); sel = null; commit();
};
function play() {
  if (P.frames.length < 2) { toast('Añade al menos 2 pasos con «＋ Paso» para animar'); return; }
  if (cur >= P.frames.length - 1) cur = 0;
  playing = true; sel = null; showSel();
  anim = { i: cur, t0: performance.now(), e: 0 };
  $('#btnPlay').textContent = '❚❚';
  requestAnimationFrame(tick);
}
function stopPlay() { playing = false; anim = null; $('#btnPlay').textContent = '▶'; renderFrames(); render(); }
function tick(now) {
  if (!playing || !anim) return;
  const dur = prefs.speed * 1000;
  let t = (now - anim.t0) / dur;
  while (t >= 1) {
    anim.i++; anim.t0 += dur; t -= 1;
    if (anim.i >= P.frames.length - 1) {
      if (prefs.loop) { anim.i = 0; anim.t0 = now; t = 0; }
      else { cur = P.frames.length - 1; stopPlay(); return; }
    }
  }
  cur = anim.i; anim.e = easeStep(t); markFrame(cur); render();
  requestAnimationFrame(tick);
}
$('#btnPlay').onclick = () => playing ? stopPlay() : play();
$('#speedSel').onchange = e => { prefs.speed = +e.target.value; savePrefs(); };

/* ---------- Herramientas y paneles ---------- */
const PLAYER_ITEMS = [['addA', 'A', false, 'Jugador A'], ['addB', 'B', false, 'Jugador B'], ['addGA', 'A', true, 'Portero A'], ['addGB', 'B', true, 'Portero B'], ['addC', 'C', false, 'Comodín']];
const DRAW_ITEMS = [['arrow', '➝', 'Carrera'], ['dash', '⇢', 'Pase'], ['zig', '〰', 'Conducción'], ['curve', '⤴', 'Carrera curva'], ['curvedash', '⤻', 'Pase curvo'], ['shadow', '◣', 'Sombra de pase'], ['line', '╱', 'Línea'], ['pen', '✎', 'Lápiz'], ['rect', '▢', 'Zona'], ['circle', '◯', 'Círculo'], ['text', 'T', 'Texto']];
const DEFAULT_GAP = { player: 5, disc: 2, cone: 2, tallcone: 2, pole: 2, flag: 5, hoop: 1, ladder: 5, hurdle: 1.5, minihurdle: 1, dummy: 2, wall: 4, rebounder: 4,
  goalpop: 8, goal: 10, goal3: 15, goal7: 20, goal9: 25, goal11: 30, ball: 1.5, ballbag: 3, bib: 2 };
const QTY_CHIPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
let panelName = null;

function toolSpec(t) { if (ADD_TOOLS[t]) return ADD_TOOLS[t]; if (t && t.startsWith('obj:') && OBJ[t.slice(4)]) return { type: t.slice(4) }; return null; }
function specKey(spec) { return spec.type === 'player' ? 'player' : spec.type; }
function specName(t) {
  const p = PLAYER_ITEMS.find(x => x[0] === t);
  if (p) { const tn = P ? P.teams[p[1]].name : p[1]; return p[0] === 'addC' ? tn : (p[2] ? 'Portero ' : 'Jugador ') + tn; }
  const s = toolSpec(t); return s ? ((OBJ[s.type] || {}).name || s.type) : '';
}
function placeQty() { return clamp(Math.round(+prefs.qty || 1), 1, 40); }
function placeLay() { return prefs.lay || 'line'; }
function placeGap(spec) { const k = specKey(spec); return +((prefs.gaps || {})[k]) || DEFAULT_GAP[k] || 3; }
function setPlaceGap(spec, v) { prefs.gaps = prefs.gaps || {}; prefs.gaps[specKey(spec)] = clamp(+v || 1, .5, 30); savePrefs(); }

function placeOne(spec, x, y) {
  const o = addObj(spec, x, y), d = OBJ[o.type];
  if (d && d.colorable) o.c = objColor || d.color;
  return o;
}
function layoutPositions(n, lay, gap, a, b, dragged) {
  const dir = V.rot ? [0, 1] : [1, 0], perp = V.rot ? [-1, 0] : [0, 1], out = [];
  const at = (p, v, k, w, j) => [p[0] + v[0] * k + (w ? w[0] * j : 0), p[1] + v[1] * k + (w ? w[1] * j : 0)];
  if (n <= 1) return [dragged ? b : a];
  if (dragged) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || .01, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nr = [-u[1], u[0]];
    if (lay === 'circle') { for (let i = 0; i < n; i++) { const t = i * 2 * Math.PI / n - Math.PI / 2; out.push([a[0] + Math.cos(t) * L, a[1] + Math.sin(t) * L]); } return out; }
    if (lay === 'grid') {
      const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
      const cols = clamp(Math.round(Math.sqrt(n * Math.max(w, .1) / Math.max(h, .1))), 1, n), rows = Math.ceil(n / cols);
      const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]);
      for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); out.push([x0 + (cols > 1 ? w * c / (cols - 1) : w / 2), y0 + (rows > 1 ? h * r / (rows - 1) : h / 2)]); }
      return out;
    }
    const amp = lay === 'zig' ? Math.max(.5, gap * .5) : 0;
    for (let i = 0; i < n; i++) out.push(at(a, u, L * i / (n - 1), nr, amp * (i % 2 ? 1 : -1)));
    return out;
  }
  if (lay === 'circle') { const r = Math.max(gap * n / (2 * Math.PI), gap * .6); for (let i = 0; i < n; i++) { const t = i * 2 * Math.PI / n - Math.PI / 2; out.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]); } return out; }
  if (lay === 'grid') {
    const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) out.push(at(a, dir, (i % cols - (cols - 1) / 2) * gap, perp, (Math.floor(i / cols) - (rows - 1) / 2) * gap));
    return out;
  }
  for (let i = 0; i < n; i++) out.push(at(a, dir, (i - (n - 1) / 2) * gap, perp, lay === 'zig' ? (i % 2 ? .5 : -.5) * gap : 0));
  return out;
}
function clampView(p) { return [clamp(p[0], V.v.x0 + .3, V.v.x1 - .3), clamp(p[1], V.v.y0 + .3, V.v.y1 - .3)]; }
function placementPreview() {
  const spec = toolSpec(tool); if (!spec) return null;
  let a, b, dragged = false;
  if (drag && drag.mode === 'place') { a = drag.a; b = drag.b; dragged = drag.moved; }
  else if (hoverPt && placeQty() > 1) { a = b = hoverPt; }
  else return null;
  const pts = layoutPositions(placeQty(), placeLay(), placeGap(spec), a, b, dragged).map(clampView);
  return { spec, pts, a, b, dragged };
}
function drawPlacePreview(c, V, proj, pp) {
  const R = objR(V), o = { type: pp.spec.type, team: pp.spec.team, gk: pp.spec.gk, num: '', c: (OBJ[pp.spec.type] && OBJ[pp.spec.type].colorable) ? (objColor || OBJ[pp.spec.type].color) : undefined };
  c.save(); c.globalAlpha = .6;
  pp.pts.forEach(p => { const [x, y] = w2s(V, p[0], p[1]); drawObj(c, V, proj, o, x, y, R, true, false); });
  c.restore();
  if (!pp.dragged) return;
  const A = w2s(V, pp.a[0], pp.a[1]), B = w2s(V, pp.b[0], pp.b[1]), L = Math.hypot(pp.b[0] - pp.a[0], pp.b[1] - pp.a[1]), n = pp.pts.length, lay = placeLay();
  c.save(); c.strokeStyle = '#00e5ff'; c.lineWidth = 2; c.setLineDash([6, 5]);
  if (lay === 'grid') c.strokeRect(Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]));
  else if (lay === 'circle') { c.beginPath(); c.arc(A[0], A[1], L * V.s, 0, Math.PI * 2); c.stroke(); }
  else { c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
  c.restore();
  let txt;
  if (lay === 'grid') txt = `${n} · ${fmtM(Math.abs(pp.b[0] - pp.a[0])).replace(' m', '')} × ${fmtM(Math.abs(pp.b[1] - pp.a[1]))}`;
  else if (lay === 'circle') txt = `${n} · Ø ${fmtM(L * 2)} · cada ${fmtM(2 * Math.PI * L / n)}`;
  else txt = `${n} · ${fmtM(L)} · cada ${fmtM(L / Math.max(1, n - 1))}`;
  pill(c, (A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 18, txt, 13);
}

/* ---------- Selección múltiple ---------- */
function selIds() {
  if (!sel) return [];
  const ids = sel.kind === 'obj' ? [sel.id] : sel.kind === 'multi' ? sel.ids : [];
  return ids.filter(id => P.objs.some(o => o.id === id));
}
function selObjs() { const ids = selIds(); return P.objs.filter(o => ids.includes(o.id)); }
function isSelected(st, id) { return !!(st.sel && ((st.sel.kind === 'obj' && st.sel.id === id) || (st.sel.kind === 'multi' && st.sel.ids.includes(id)))); }
function selectObjs(list) {
  const ids = list.map(o => o.id);
  sel = ids.length > 1 ? { kind: 'multi', ids } : ids.length ? { kind: 'obj', id: ids[0] } : null;
  showSel(); render();
}
function drawBand(c, b) {
  const [a, z] = b; c.save();
  c.fillStyle = 'rgba(0,229,255,.12)'; c.strokeStyle = '#00e5ff'; c.lineWidth = 1.5; c.setLineDash([5, 4]);
  c.fillRect(Math.min(a[0], z[0]), Math.min(a[1], z[1]), Math.abs(z[0] - a[0]), Math.abs(z[1] - a[1]));
  c.strokeRect(Math.min(a[0], z[0]), Math.min(a[1], z[1]), Math.abs(z[0] - a[0]), Math.abs(z[1] - a[1]));
  c.restore();
}

/* ---------- Paneles ---------- */
function openPanel(name) {
  if (panelName === name) { closePanel(); return; }
  panelName = name; renderPanel();
  $('#toolPanel').hidden = false; $('#toolPanel').scrollTop = 0;
  $$('.tool.grp').forEach(b => b.classList.toggle('open', b.dataset.panel === name));
}
function closePanel() {
  if (!panelName) return;
  panelName = null; $('#toolPanel').hidden = true; $$('.tool.grp').forEach(b => b.classList.remove('open'));
}
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function panelHead(title) {
  const h = el('div', 'tp-head', `<h3>${esc(title)}</h3>`), x = el('button', 'x', '✕'); x.title = 'Cerrar'; x.onclick = closePanel; h.appendChild(x); return h;
}
function iconPlayer(team, gk) {
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 80; const x = cv.getContext('2d'); x.scale(2, 2);
  x.fillStyle = '#2f7d3a'; x.fillRect(0, 0, 60, 40);
  drawObj(x, { s: 8, rot: false, minR: 9 }, P, { type: 'player', team, gk, num: gk ? 1 : (team === 'C' ? 'C' : '') }, 30, 20, 11, false, false);
  return cv;
}
function iconObj(type) {
  const d = OBJ[type], cv = document.createElement('canvas'); cv.width = 120; cv.height = 80; const x = cv.getContext('2d'); x.scale(2, 2);
  x.fillStyle = '#2f7d3a'; x.fillRect(0, 0, 60, 40);
  const long = d.len > 1.5 || d.cat === 'Porterías', s = Math.min(14, (long ? 50 : 28) / d.len);
  drawEquipment(x, { type, c: d.colorable ? (objColor || d.color) : undefined }, 30, type === 'pole' || type === 'flag' ? 32 : 20, long ? 7 : 10, s, long ? Math.PI / 2 : 0);
  return cv;
}
function itemButton(t, label, icon) {
  const b = el('button', 'tp-item' + (tool === t ? ' on' : '')); b.appendChild(icon); b.appendChild(el('span', '', esc(label)));
  b.onclick = () => { pushRecent(t); setTool(t); };
  return b;
}
function pushRecent(t) { prefs.recent = [t, ...(prefs.recent || []).filter(x => x !== t)].slice(0, 8); savePrefs(); }
function qtyBox() {
  const box = el('div', 'tp-qty'), q = placeQty();
  const r1 = el('div', 'tp-row', '<span class="small muted">Cantidad por toque</span>'), chips = el('div', 'tp-chips');
  QTY_CHIPS.forEach(n => { const b = el('button', n === q ? 'on' : '', n); b.onclick = () => { prefs.qty = n; savePrefs(); renderPanel(); syncPlaceBar(); }; chips.appendChild(b); });
  r1.appendChild(chips); box.appendChild(r1);
  if (q > 1) {
    const r2 = el('div', 'tp-row', '<span class="small muted">Disposición</span>'), seg = el('div', 'seg');
    [['line', '⋯ Línea'], ['zig', '⩘ Zigzag'], ['grid', '▦ Cuadrícula'], ['circle', '◌ Círculo']].forEach(([k, l]) => {
      const b = el('button', placeLay() === k ? 'on' : '', l); b.style.fontSize = '13px'; b.onclick = () => { prefs.lay = k; savePrefs(); renderPanel(); syncPlaceBar(); }; seg.appendChild(b);
    });
    r2.appendChild(seg); box.appendChild(r2);
    box.appendChild(el('div', 'small muted', 'Toca para colocarlos juntos con la separación elegida, o arrastra para repartirlos en una distancia.'));
  }
  const r3 = el('div', 'tp-row', '<span class="small muted">Color del material</span>'), sw = el('div', 'swatches');
  [null, ...OBJ_COLORS].forEach(c => {
    const b = el('button', 'sw' + (objColor === c ? ' active' : '')); if (c) b.style.background = c; else { b.textContent = 'A'; b.title = 'Color original'; b.style.fontSize = '11px'; }
    b.onclick = () => { objColor = c; renderPanel(); }; sw.appendChild(b);
  });
  r3.appendChild(sw); box.appendChild(r3);
  return box;
}
function renderPanel() {
  const tp = $('#toolPanel'); tp.innerHTML = '';
  if (panelName === 'objects') {
    tp.appendChild(panelHead('Objetos'));
    tp.appendChild(qtyBox());
    const rec = (prefs.recent || []).filter(t => toolSpec(t));
    const mk = t => { const p = PLAYER_ITEMS.find(x => x[0] === t); return p ? iconPlayer(p[1], p[2]) : iconObj(t.slice(4)); };
    if (rec.length) { tp.appendChild(el('div', 'tp-sec', 'Recientes')); const g = el('div', 'tp-grid'); rec.forEach(t => g.appendChild(itemButton(t, specName(t), mk(t)))); tp.appendChild(g); }
    tp.appendChild(el('div', 'tp-sec', 'Jugadores'));
    const gp = el('div', 'tp-grid');
    PLAYER_ITEMS.forEach(([t, team, gk]) => gp.appendChild(itemButton(t, (gk ? 'Portero ' : t === 'addC' ? '' : 'Jugador ') + (t === 'addC' ? P.teams.C.name : P.teams[team].name), iconPlayer(team, gk))));
    tp.appendChild(gp);
    OBJ_CATS.forEach(cat => {
      tp.appendChild(el('div', 'tp-sec', cat)); const g = el('div', 'tp-grid');
      Object.entries(OBJ).filter(([, d]) => d.cat === cat).forEach(([type, d]) => g.appendChild(itemButton('obj:' + type, d.name, iconObj(type))));
      tp.appendChild(g);
    });
  } else if (panelName === 'draw') {
    tp.appendChild(panelHead('Dibujo'));
    const g = el('div', 'tp-grid');
    DRAW_ITEMS.forEach(([t, gl, l]) => g.appendChild(itemButton(t, l, el('span', 'gl', gl))));
    tp.appendChild(g);
    tp.appendChild(el('div', 'tp-sec', 'Color'));
    const sw = el('div', 'swatches');
    SWATCHES.forEach(c => { const b = el('button', 'sw' + (c === color ? ' active' : '')); b.style.background = c; b.onclick = () => { color = c; buildSwatches(); renderPanel(); }; sw.appendChild(b); });
    tp.appendChild(sw);
  } else if (panelName === 'space') {
    tp.appendChild(panelHead('Espacio'));
    tp.appendChild(el('div', 'tp-sec', 'Delimitar con medidas'));
    const g = el('div', 'tp-grid');
    [['rect', '▭', 'Rectángulo'], ['circle', '◯', 'Círculo'], ['poly', '⬠', 'Polígono']].forEach(([sh, gl, l]) => {
      const b = el('button', 'tp-item' + (tool === 'area' && (prefs.zShape || 'rect') === sh ? ' on' : '')); b.appendChild(el('span', 'gl', gl)); b.appendChild(el('span', '', l));
      b.onclick = () => { prefs.zShape = sh; savePrefs(); setTool('area'); }; g.appendChild(b);
    });
    const bm = el('button', 'tp-item' + (tool === 'measure' ? ' on' : '')); bm.appendChild(el('span', 'gl', '📏')); bm.appendChild(el('span', '', 'Medir')); bm.onclick = () => setTool('measure'); g.appendChild(bm);
    const bs = el('button', 'tp-item'); bs.appendChild(el('span', 'gl', '▦')); bs.appendChild(el('span', '', 'Mis espacios')); bs.onclick = () => { closePanel(); openSpaces(); }; g.appendChild(bs);
    tp.appendChild(g);
    tp.appendChild(el('div', 'tp-sec', 'Vista del campo'));
    const vc = el('div', 'tp-chips'), mz = mainZone(P);
    VIEW_OPTS.forEach(([v, l]) => { const b = el('button', P.pitch === v ? 'on' : '', esc(l)); b.disabled = v === 'zone' && !mz; b.onclick = () => { setView(v); renderPanel(); }; vc.appendChild(b); });
    tp.appendChild(vc);
    tp.appendChild(el('div', 'tp-sec', 'Divisiones'));
    const dc = el('div', 'tp-chips');
    [['none', 'Ninguna'], ['thirds', 'Tercios'], ['lanes', 'Carriles'], ['both', 'Tercios y carriles']].forEach(([v, l]) => {
      const b = el('button', P.grid.mode === v ? 'on' : '', l); b.onclick = () => { pushUndo(); P.grid.mode = v; commit(); renderPanel(); }; dc.appendChild(b);
    });
    tp.appendChild(dc);
  } else if (panelName === 'edit') {
    tp.appendChild(panelHead('Editar'));
    const n = selIds().length, list = el('div', 'tp-list');
    const act = (ic, label, fn, dis, danger) => { const b = el('button', danger ? 'danger' : '', `<span>${ic}</span>${esc(label)}`); b.disabled = !!dis; b.onclick = fn; list.appendChild(b); };
    act('↶', 'Deshacer', () => { undo(); renderPanel(); }, !undoStack.length);
    act('↷', 'Rehacer', () => { redo(); renderPanel(); }, !redoStack.length);
    act('▣', 'Seleccionar todo', () => { setTool('move'); selectObjs(P.objs); }, !P.objs.length);
    act('👥', 'Seleccionar jugadores', () => { setTool('move'); selectObjs(P.objs.filter(o => o.type === 'player')); }, !P.objs.some(o => o.type === 'player'));
    act('🔶', 'Seleccionar material', () => { setTool('move'); selectObjs(P.objs.filter(o => o.type !== 'player')); }, !P.objs.some(o => o.type !== 'player'));
    act('⧉', `Duplicar selección${n ? ' (' + n + ')' : ''}`, () => { closePanel(); $('#selDup').click(); }, !sel);
    act('⟳', 'Girar selección 45°', () => { closePanel(); $('#selRotate').click(); }, !selObjs().some(o => OBJ[o.type] && OBJ[o.type].rot));
    act('🗑', `Eliminar selección${n ? ' (' + n + ')' : ''}`, () => { closePanel(); $('#selDel').click(); }, !sel, true);
    act('✎', 'Borrar dibujos de este paso', () => { pushUndo(); P.frames[cur].draws = []; sel = null; commit(); renderPanel(); }, !P.frames[cur].draws.length);
    act('🔶', 'Quitar todo el material', async () => { closePanel(); if (!await confirmBox('¿Quitar todo el material de la pizarra (conos, platillos, porterías…)?', 'Quitar')) return; pushUndo(); P.objs.filter(o => o.type !== 'player').forEach(o => removeObj(o.id)); commit(); }, !P.objs.some(o => o.type !== 'player'), true);
    act('⌫', 'Vaciar pizarra', async () => { closePanel(); if (!await confirmBox('¿Vaciar la pizarra? Se quitan fichas, material, dibujos y espacios. Puedes deshacerlo.', 'Vaciar')) return; pushUndo(); P.objs = []; P.zones = []; P.frames.forEach(f => { f.pos = {}; f.draws = []; }); sel = null; if (P.pitch === 'zone') { P.pitch = 'full'; resize(); } commit(); syncViewSel(); }, false, true);
    tp.appendChild(list);
    tp.appendChild(el('div', 'tp-sec', 'Tamaño de las fichas'));
    const r = el('input'); r.type = 'range'; r.min = .6; r.max = 1.6; r.step = .05; r.value = prefs.size; r.oninput = () => { prefs.size = +r.value; savePrefs(); render(); };
    tp.appendChild(r);
  }
}
$$('.tool.grp').forEach(b => b.onclick = () => openPanel(b.dataset.panel));
$$('.tool[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));

function updateGroupButtons() {
  const spec = toolSpec(tool), di = DRAW_ITEMS.find(x => x[0] === tool && x[0] !== 'text');
  const set = (panel, on) => { const b = $(`.tool.grp[data-panel="${panel}"]`); if (b) b.classList.toggle('active', on); };
  set('objects', !!spec); set('draw', !!di); set('space', tool === 'area' || tool === 'measure');
  const sn = spec ? specName(tool) : ''; $('#gObjLbl').textContent = spec ? ((sn.length > 11 ? sn.slice(0, 10) + '…' : sn) + (placeQty() > 1 ? ' ×' + placeQty() : '') + ' ▾') : 'Objetos ▾';
  $('#gDrawIc').textContent = di ? di[1] : '➝'; $('#gDrawLbl').textContent = di ? di[2] + ' ▾' : 'Dibujo ▾';
  $('#gSpaceLbl').textContent = tool === 'measure' ? 'Medir ▾' : tool === 'area' ? 'Delimitar ▾' : 'Espacio ▾';
}
function syncPlaceBar() {
  const spec = toolSpec(tool); $('#placeBar').hidden = !spec; if (!spec) return;
  const q = placeQty();
  $('#pbName').textContent = specName(tool); $('#pbQty').value = q;
  $$('#pbLayout button').forEach(b => b.classList.toggle('on', b.dataset.lay === placeLay()));
  $('#pbLayout').hidden = q < 2; $('#pbGapLbl').hidden = q < 2 || placeLay() === 'none';
  $('#pbGap').value = placeGap(spec);
  updateGroupButtons();
}
function placeHint() {
  const q = placeQty(), n = specName(tool).toLowerCase();
  return q > 1 ? `Toca para colocar ${q} (${n}) o arrastra para repartirlos` : `Toca para colocar: ${n} · arrastra para ajustar`;
}
const setQty = v => { prefs.qty = clamp(Math.round(+v || 1), 1, 40); savePrefs(); syncPlaceBar(); hint(placeHint()); render(); };
$('#pbMinus').onclick = () => setQty(placeQty() - 1);
$('#pbPlus').onclick = () => setQty(placeQty() + 1);
$('#pbQty').onchange = e => setQty(e.target.value);
$$('#pbLayout button').forEach(b => b.onclick = () => { prefs.lay = b.dataset.lay; savePrefs(); syncPlaceBar(); render(); });
$('#pbGap').onchange = e => { const s = toolSpec(tool); if (s) setPlaceGap(s, e.target.value); syncPlaceBar(); render(); };
$('#pbDone').onclick = () => setTool('move');

function setTool(t) {
  closePanel();
  if (t === 'objlib') { openPanel('objects'); return; }
  if (t === 'spaces') { openSpaces(); return; }
  if (t !== 'area') { polyDraft = null; polyCursor = null; }
  if (t !== 'measure') measure = null;
  hoverPt = null;
  tool = t;
  $$('.tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  $('#zoneBar').hidden = t !== 'area'; if (t === 'area') syncZoneBar();
  syncPlaceBar(); updateGroupButtons();
  if (t !== 'move') { sel = null; showSel(); }
  render();
  hint(t === 'area' ? areaHint() : toolSpec(t) ? placeHint() : (HINTS[t] || ''));
}
function buildSwatches() {
  const w = $('#swatches'); w.innerHTML = '';
  SWATCHES.forEach(c => {
    const b = document.createElement('button'); b.className = 'sw' + (c === color ? ' active' : ''); b.style.background = c; b.title = c;
    b.onclick = () => { color = c; buildSwatches(); if (selDraw() || selZone()) $('#selColor').click(); };
    w.appendChild(b);
  });
}
function updateDots() { if (panelName === 'objects') renderPanel(); }

/* ---------- Avisos ---------- */
let toastTimer, hintTimer;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms); }
function hint(msg) { const h = $('#hint'); if (!msg) { h.classList.remove('show'); return; } h.textContent = msg; h.classList.add('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.remove('show'), 2800); }

/* ---------- Preguntas dentro de la app (sin prompt/confirm del navegador) ---------- */
function ask(title, fields, okText = 'Aceptar', danger = false) {
  return new Promise(res => {
    const d = $('#dlgAsk'), wrap = $('#askFields'); $('#askTitle').textContent = title; wrap.innerHTML = '';
    const inputs = fields.map((f, i) => {
      const l = document.createElement('label'); l.textContent = f.label;
      const inp = document.createElement('input'); inp.id = 'askIn' + i; inp.value = f.value ?? '';
      if (f.type) inp.type = f.type; if (f.mode) inp.inputMode = f.mode; if (f.list) inp.setAttribute('list', f.list);
      l.appendChild(inp); wrap.appendChild(l); return inp;
    });
    wrap.hidden = !fields.length;
    const ok = $('#askOk'); ok.textContent = okText; ok.className = danger ? 'danger' : 'primary';
    let done = false;
    const finish = v => { if (done) return; done = true; if (d.open) d.close(); res(v); };
    $('#askForm').onsubmit = e => { e.preventDefault(); finish(inputs.map(i => i.value)); };
    $('#askCancel').onclick = () => finish(null);
    d.onclose = () => finish(null);
    d.showModal(); setTimeout(() => (inputs[0] || ok).focus(), 50);
  });
}
async function confirmBox(msg, okText = 'Borrar') { return (await ask(msg, [], okText, true)) !== null; }

/* ---------- Diálogos genéricos ---------- */
$$('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
});

/* ---------- Proyectos ---------- */
function syncProjectUI() { $('#projName').value = P.name; updateDots(); }
function loadProject(p) {
  if (playing) stopPlay();
  P = normalize(p); cur = 0; sel = null; undoStack = []; redoStack = [];
  prefs.lastId = P.id; savePrefs();
  polyDraft = null; measure = null;
  syncProjectUI(); syncViewSel(); resize(); renderFrames(); updateUndo(); showSel(); updateDensityBadge();
}
$('#projName').addEventListener('input', e => { P.name = e.target.value || 'Táctica'; P.updated = Date.now(); scheduleSave(); });

function thumbCanvas(proj, w = 240, h = 150, frame = 0) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const x = c.getContext('2d'); x.scale(2, 2);
  const TV = makeView(w, h, proj, 'horizontal', 3);
  const f = proj.frames[frame] || proj.frames[0];
  renderScene(x, TV, proj, { pos: f.pos, draws: f.draws });
  return c;
}
function miniPlay(cv, proj) {
  if (cv._playing || proj.frames.length < 2) return; cv._playing = true;
  const x = cv.getContext('2d'), w = cv.width / 2, h = cv.height / 2, TV = makeView(w, h, proj, 'horizontal', 3);
  const dur = 1000, t0 = performance.now(), n = proj.frames.length - 1;
  const f = now => {
    const k = (now - t0) / dur, i = Math.min(n - 1, Math.floor(k));
    const st = k >= n ? { pos: proj.frames[n].pos, draws: [] } : interpState(proj, i, easeStep(k - i));
    x.setTransform(2, 0, 0, 2, 0, 0); renderScene(x, TV, proj, st);
    if (k < n + .6) requestAnimationFrame(f);
    else { cv._playing = false; x.setTransform(2, 0, 0, 2, 0, 0); renderScene(x, TV, proj, { pos: proj.frames[0].pos, draws: proj.frames[0].draws }); }
  };
  requestAnimationFrame(f);
}
function fillCats(selEl, cats, all = 'Todas las categorías') {
  const v = selEl.value; selEl.innerHTML = `<option value="">${all}</option>` + cats.map(c => `<option>${esc(c)}</option>`).join('');
  if (cats.includes(v)) selEl.value = v;
}
let projSelMode = false; const projSel = new Set();
async function openProjects() { await saveNow(); setProjSel(false); $('#dlgProjects').showModal(); renderProjects(); }
function setProjSel(on) {
  projSelMode = on; projSel.clear();
  $('#projBulk').hidden = !on; $('#btnProjSel').textContent = on ? 'Cancelar selección' : 'Seleccionar';
  $('#btnProjSel').classList.toggle('on-btn', on);
}
function updateBulk() { $('#pbCount').textContent = projSel.size + (projSel.size === 1 ? ' seleccionada' : ' seleccionadas'); }
let lastProjList = [];
async function renderProjects() {
  const all = (await DB.all('projects')).map(normalize);
  const cats = [...new Set(all.map(p => p.cat))].sort((a, b) => a.localeCompare(b));
  fillCats($('#projCat'), cats);
  const q = $('#projSearch').value.trim().toLowerCase(), cf = $('#projCat').value, sort = $('#projSort').value;
  let list = all.filter(p => (!cf || p.cat === cf) && (!q || (p.name + ' ' + (p.notes || '') + ' ' + p.cat).toLowerCase().includes(q)));
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'cat') list.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  else list.sort((a, b) => b.updated - a.updated);
  lastProjList = list;
  const g = $('#projGrid'); g.innerHTML = '';
  if (!list.length) { g.innerHTML = '<div class="empty">No hay tácticas que coincidan.</div>'; updateBulk(); return; }
  let lastCat = null;
  for (const p of list) {
    if (sort === 'cat' && p.cat !== lastCat) {
      lastCat = p.cat; const h = document.createElement('div'); h.className = 'grouphead';
      h.innerHTML = `${esc(p.cat)} <span>${list.filter(x => x.cat === p.cat).length}</span>`; g.appendChild(h);
    }
    const card = document.createElement('div'); card.className = 'card' + (projSel.has(p.id) ? ' picked' : '');
    const cv = thumbCanvas(p);
    const toggle = () => { projSel.has(p.id) ? projSel.delete(p.id) : projSel.add(p.id); card.classList.toggle('picked', projSel.has(p.id)); card.querySelector('.pick').textContent = projSel.has(p.id) ? '✓' : ''; updateBulk(); };
    cv.onclick = () => { if (projSelMode) toggle(); else { loadProject(p); $('#dlgProjects').close(); } };
    card.appendChild(cv);
    if (projSelMode) { const pk = document.createElement('div'); pk.className = 'pick'; pk.textContent = projSel.has(p.id) ? '✓' : ''; card.appendChild(pk); }
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<div class="t">${esc(p.name)}${p.id === P.id ? ' · <span class="muted">abierta</span>' : ''}</div>
      <div class="s">${esc(p.cat)} · ${fieldLabel(p.field)} · ${p.frames.length} paso${p.frames.length > 1 ? 's' : ''} · ${new Date(p.updated).toLocaleDateString()}</div>`;
    card.appendChild(meta);
    const acts = document.createElement('div'); acts.className = 'acts';
    if (projSelMode) {
      const bSel = document.createElement('button'); bSel.textContent = projSel.has(p.id) ? 'Quitar' : 'Elegir';
      bSel.onclick = () => { toggle(); bSel.textContent = projSel.has(p.id) ? 'Quitar' : 'Elegir'; };
      acts.append(bSel);
    } else {
      const bOpen = document.createElement('button'); bOpen.textContent = 'Abrir'; bOpen.className = 'primary';
      bOpen.onclick = () => { loadProject(p); $('#dlgProjects').close(); };
      const bDup = document.createElement('button'); bDup.textContent = 'Duplicar';
      bDup.onclick = async () => { await duplicateProjects([p]); renderProjects(); };
      const bDel = document.createElement('button'); bDel.textContent = 'Borrar'; bDel.className = 'danger';
      bDel.onclick = async () => { if (!await confirmBox(`¿Borrar «${p.name}»? No se puede deshacer.`)) return; await deleteProjects([p.id]); renderProjects(); };
      acts.append(bOpen, bDup, bDel);
    }
    card.appendChild(acts); g.appendChild(card);
  }
  updateBulk();
}
function fieldLabel(F) { return ({ f11: 'F11', f9: 'F9', f7: 'F7', f5: 'Sala' })[F.type] || `${Math.round(F.L)}×${Math.round(F.W)} m`; }
async function duplicateProjects(list) {
  for (const p of list) { const n = clone(p); n.id = uid(); n.name = p.name + ' (copia)'; n.created = n.updated = Date.now(); await DB.put('projects', n); }
}
async function deleteProjects(ids) {
  for (const id of ids) await DB.del('projects', id);
  if (ids.includes(P.id)) {
    const rest = (await DB.all('projects')).sort((a, b) => b.updated - a.updated);
    const np = rest[0] || newProject(); if (!rest[0]) await DB.put('projects', np); loadProject(np);
  }
}
$('#btnProjects').onclick = openProjects;
$('#projSearch').oninput = renderProjects;
$('#projCat').onchange = renderProjects;
$('#projSort').onchange = renderProjects;
$('#btnProjSel').onclick = () => { setProjSel(!projSelMode); renderProjects(); };
$('#pbAll').onclick = () => { const allOn = lastProjList.every(p => projSel.has(p.id)); lastProjList.forEach(p => allOn ? projSel.delete(p.id) : projSel.add(p.id)); renderProjects(); };
async function selectedProjects() { const all = await DB.all('projects'); return all.filter(p => projSel.has(p.id)); }
$('#pbCat').onclick = async () => {
  if (!projSel.size) return toast('Elige al menos una táctica');
  const cats = [...new Set((await DB.all('projects')).map(p => p.cat || 'General'))];
  $('#vidCatList').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  const r = await ask('Mover a categoría', [{ label: 'Categoría (escribe una nueva o elige)', list: 'vidCatList' }], 'Mover');
  if (!r || !r[0].trim()) return;
  for (const p of await selectedProjects()) { p.cat = r[0].trim(); await DB.put('projects', p); if (p.id === P.id) P.cat = p.cat; }
  toast('Tácticas movidas a «' + r[0].trim() + '»'); renderProjects();
};
$('#pbExport').onclick = async () => {
  if (!projSel.size) return toast('Elige al menos una táctica');
  await saveNow();
  const data = { app: 'pizarra-tactica', version: 2, date: new Date().toISOString(), projects: await selectedProjects() };
  saveBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'tacticas_' + projSel.size + '_' + new Date().toISOString().slice(0, 10) + '.json');
};
$('#pbDup').onclick = async () => { if (!projSel.size) return toast('Elige al menos una táctica'); await duplicateProjects(await selectedProjects()); setProjSel(false); renderProjects(); toast('Tácticas duplicadas'); };
$('#pbDel').onclick = async () => {
  if (!projSel.size) return toast('Elige al menos una táctica');
  if (!await confirmBox(`¿Borrar ${projSel.size} táctica${projSel.size > 1 ? 's' : ''}? No se puede deshacer.`)) return;
  await deleteProjects([...projSel]); setProjSel(false); renderProjects();
};
$('#btnNewProj').onclick = async () => {
  await saveNow();
  const p = newProject('Nueva táctica', P ? P.field.type : 'f11');
  if (P && P.field.type === 'custom') { p.field = clone(P.field); }
  await DB.put('projects', p); loadProject(p); $('#dlgProjects').close();
  toast('Táctica nueva creada'); setTimeout(() => { $('#projName').focus(); $('#projName').select(); }, 100);
};

/* ---------- Importación (tácticas, TacticalPad, videos) ---------- */
async function importFiles(files) {
  let nProj = 0, nMedia = 0, last = null; const notes = [], media = [];
  const ids = new Set((await DB.all('projects')).map(p => p.id));
  for (const file of files) {
    let r;
    try { r = await Importer.importFile(file, FIELD_TYPES.f11 && { L: 105, W: 68 }); }
    catch (e) { notes.push(`«${file.name}»: ${e.message}`); continue; }
    for (const raw of r.own) { const p = normalize(raw); if (ids.has(p.id) && !Array.isArray(r.own)) p.id = uid(); await DB.put('projects', p); nProj++; last = p; }
    if (r.teams) for (const t of r.teams) await DB.put('teams', t);
    for (const ip of r.projects) {
      const p = newProject(ip.name, 'f11'); p.cat = 'TacticalPad'; p.notes = 'Importado de «' + file.name + '». Revisa las posiciones.';
      p.objs = ip.objs; p.frames = ip.frames;
      for (const k in ip.teamColors) if (p.teams[k]) p.teams[k].color = ip.teamColors[k];
      await DB.put('projects', p); nProj++; last = p;
    }
    media.push(...r.media); notes.push(...r.notes);
  }
  if (media.length) { nMedia = media.length; queueMedia(media, 'TacticalPad'); }
  const parts = [];
  if (nProj) parts.push(`${nProj} táctica${nProj > 1 ? 's' : ''}`);
  if (nMedia) parts.push(`${nMedia} video${nMedia > 1 ? 's' : ''}/imagen${nMedia > 1 ? 'es' : ''} a la Biblioteca`);
  if (parts.length) toast('Importado: ' + parts.join(' y '), 4000);
  if (notes.length) setTimeout(() => toast(notes[0] + (notes.length > 1 ? ` (+${notes.length - 1})` : '') + ' Si es de TacticalPad, envíame un ejemplo para mejorar el importador.', 7000), parts.length ? 4200 : 0);
  return { nProj, last };
}
$('#projImport').onchange = async e => {
  const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
  const r = await importFiles(files);
  if (r.nProj === 1 && r.last) { loadProject(r.last); $('#dlgProjects').close(); } else renderProjects();
};

/* ---------- Biblioteca: ejercicios ---------- */
function drillToProject(d) {
  const p = newProject(d.title); p.cat = d.cat; p.notes = d.desc; p.pitch = d.pitch || 'full';
  const pos = {}, idmap = {};
  for (const [key, kind, x, y, num] of d.objs) {
    const o = { id: uid() }; idmap[key] = o.id;
    if (['A', 'B', 'C', 'GA', 'GB'].includes(kind)) { o.type = 'player'; o.team = kind.slice(-1); o.gk = kind[0] === 'G'; o.num = num ?? (o.gk ? 1 : ''); o.name = ''; }
    else o.type = kind;
    p.objs.push(o); pos[o.id] = [x, y];
  }
  const mk = a => { const [t, ...n] = a, pts = []; for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]); return { t, pts, c: DRAW_DEFAULT_COLOR[t] || '#ffffff' }; };
  const steps = d.steps || []; let cp = clone(pos);
  p.frames = [{ pos: clone(cp), draws: (steps[0]?.d || []).map(mk) }];
  steps.forEach((s, i) => {
    for (const [k, v] of Object.entries(s.m || {})) if (idmap[k]) cp[idmap[k]] = v.slice();
    p.frames.push({ pos: clone(cp), draws: (steps[i + 1]?.d || []).map(mk) });
  });
  return p;
}
function renderDrills() {
  const cats = [...new Set(DRILLS.map(d => d.cat))];
  fillCats($('#drillCat'), cats);
  const cf = $('#drillCat').value, g = $('#drillGrid'); g.innerHTML = '';
  DRILLS.filter(d => !cf || d.cat === cf).forEach(d => {
    const p = drillToProject(d);
    const card = document.createElement('div'); card.className = 'card';
    const cv = thumbCanvas(p); cv.title = 'Ver animación'; cv.onclick = () => miniPlay(cv, p);
    card.appendChild(cv);
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<div class="t">${esc(d.title)}</div><div class="s">${esc(d.cat)} · ${p.frames.length} pasos</div><div class="d">${esc(d.desc)}</div>`;
    card.appendChild(meta);
    const acts = document.createElement('div'); acts.className = 'acts';
    const bPlay = document.createElement('button'); bPlay.textContent = '▶ Ver'; bPlay.onclick = () => miniPlay(cv, p);
    const bUse = document.createElement('button'); bUse.textContent = 'Usar en mi pizarra'; bUse.className = 'primary';
    bUse.onclick = async () => { await saveNow(); const np = drillToProject(d); await DB.put('projects', np); loadProject(np); $('#dlgLibrary').close(); toast('Ejercicio copiado a «Mis tácticas». Puedes editarlo.'); };
    acts.append(bPlay, bUse); card.appendChild(acts); g.appendChild(card);
  });
}
$('#drillCat').onchange = renderDrills;
function showLibTab(tab) {
  $$('#dlgLibrary .tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  $('#tabDrills').hidden = tab !== 'drills'; $('#tabVideos').hidden = tab !== 'videos'; $('#tabExlib').hidden = tab !== 'exlib';
}
$('#btnLibrary').onclick = () => { $('#dlgLibrary').showModal(); renderDrills(); renderVideos(); if (typeof openExLib === 'function') openExLib({ pick: null }); };
$$('#dlgLibrary .tab').forEach(t => t.onclick = () => showLibTab(t.dataset.tab));

/* ---------- Biblioteca: videos e imágenes ---------- */
let vidURLs = [], vidFilter = '';
function ytId(url) { const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : null; }
function embedUrl(url) {
  const y = ytId(url); if (y) return 'https://www.youtube.com/embed/' + y + '?rel=0';
  const v = url.match(/vimeo\.com\/(?:video\/)?(\d+)/); if (v) return 'https://player.vimeo.com/video/' + v[1];
  return null;
}
async function videoCats() {
  const all = await DB.all('videos'), counts = {};
  all.forEach(v => { const c = v.cat || 'General'; counts[c] = (counts[c] || 0) + 1; });
  (prefs.vidCats || []).forEach(c => { if (!(c in counts)) counts[c] = 0; });
  return { all, counts, names: Object.keys(counts).sort((a, b) => a.localeCompare(b)) };
}
function fillCatList(names) { $('#vidCatList').innerHTML = names.map(c => `<option value="${esc(c)}">`).join(''); }
async function renderVideos() {
  vidURLs.forEach(u => URL.revokeObjectURL(u)); vidURLs = [];
  const { all, counts, names } = await videoCats();
  fillCatList(names);
  if (vidFilter && !names.includes(vidFilter)) vidFilter = '';
  const chips = $('#vidChips'); chips.innerHTML = '';
  const mkChip = (label, val, n) => { const b = document.createElement('button'); b.className = 'chip' + (vidFilter === val ? ' active' : ''); b.innerHTML = `${esc(label)}<b>${n}</b>`; b.onclick = () => { vidFilter = val; renderVideos(); }; chips.appendChild(b); };
  mkChip('Todas', '', all.length); names.forEach(n => mkChip(n, n, counts[n]));
  const q = $('#vidSearch').value.trim().toLowerCase();
  const list = all.filter(v => (!vidFilter || (v.cat || 'General') === vidFilter) && (!q || [v.title, v.notes, (v.tags || []).join(' '), v.cat].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (a.cat || 'General').localeCompare(b.cat || 'General') || b.created - a.created);
  const L = $('#vidList'); L.innerHTML = '';
  if (!list.length) {
    L.innerHTML = all.length ? '<div class="empty">Nada coincide con la búsqueda.</div>'
      : '<div class="empty">Sube videos de partidos o entrenamientos (se convierten solos a MP4), imágenes, o enlaces de YouTube/Vimeo.<br>Las animaciones que exportes como video también aparecen aquí.</div>';
  }
  const projects = await DB.all('projects'), pname = id => (projects.find(p => p.id === id) || {}).name;
  let lastCat = null;
  for (const v of list) {
    const cat = v.cat || 'General';
    if (!vidFilter && cat !== lastCat) { lastCat = cat; const h = document.createElement('div'); h.className = 'vgroup'; h.textContent = `${cat} · ${counts[cat]}`; L.appendChild(h); }
    const it = document.createElement('div'); it.className = 'vitem';
    const th = document.createElement('div'); th.className = 'vthumb';
    if (v.thumb) th.innerHTML = `<img src="${v.thumb}" alt="">`;
    else if (v.kind === 'file' && v.blob) { const u = URL.createObjectURL(v.blob); vidURLs.push(u); th.innerHTML = `<video src="${u}#t=0.5" muted preload="metadata" playsinline></video>`; }
    else if (v.kind === 'link' && ytId(v.url)) th.innerHTML = `<img src="https://img.youtube.com/vi/${ytId(v.url)}/mqdefault.jpg" alt="">`;
    else th.textContent = v.kind === 'image' ? '🖼' : '▶';
    if (v.dur) th.insertAdjacentHTML('beforeend', `<span class="dur">${fmtDur(v.dur)}</span>`);
    th.onclick = () => openPlayer(v);
    const info = document.createElement('div'); info.className = 'info'; info.onclick = () => openPlayer(v);
    const bits = [];
    if (v.kind === 'link') bits.push('enlace'); else if (v.kind === 'image') bits.push('imagen'); else if (v.h) bits.push(v.h + 'p');
    if (v.blob) bits.push((v.blob.size / 1048576).toFixed(1) + ' MB');
    if (v.converted) bits.push('convertido a MP4');
    if (v.projectId && pname(v.projectId)) bits.push('↔ ' + pname(v.projectId));
    bits.push(new Date(v.created).toLocaleDateString());
    info.innerHTML = `<div class="t">${esc(v.title)}</div><div class="s">${esc(bits.join(' · '))}</div>` +
      ((v.tags && v.tags.length) ? `<div>${v.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '');
    const bEd = document.createElement('button'); bEd.textContent = '✎'; bEd.title = 'Título, categoría y etiquetas';
    bEd.onclick = async () => {
      const r = await ask('Editar', [{ label: 'Título', value: v.title }, { label: 'Categoría', value: v.cat || 'General', list: 'vidCatList' }, { label: 'Etiquetas (separadas por comas)', value: (v.tags || []).join(', ') }], 'Guardar');
      if (!r) return;
      v.title = r[0].trim() || v.title; v.cat = r[1].trim() || 'General'; v.tags = r[2].split(',').map(s => s.trim()).filter(Boolean);
      await DB.put('videos', v); renderVideos();
    };
    const bDel = document.createElement('button'); bDel.textContent = '🗑'; bDel.className = 'danger'; bDel.title = 'Borrar';
    bDel.onclick = async () => { if (!await confirmBox(`¿Borrar «${v.title}»?`)) return; await DB.del('videos', v.id); renderVideos(); };
    it.append(th, info, bEd, bDel); L.appendChild(it);
  }
  if (navigator.storage && navigator.storage.estimate) {
    try { const e = await navigator.storage.estimate(); $('#vidStorage').textContent = `Espacio usado: ${(e.usage / 1048576).toFixed(0)} MB de ~${(e.quota / 1073741824).toFixed(1)} GB disponibles en este dispositivo.`; } catch (_) {}
  }
}
$('#vidSearch').oninput = renderVideos;

// Cola de procesado: convierte y guarda los videos uno a uno
const vidQueue = []; let vidBusy = false;
function queueMedia(files, cat) {
  for (const f of files) {
    const el = document.createElement('div'); el.className = 'qitem';
    el.innerHTML = `<div class="qtop"><span class="qname">${esc(f.name)}</span><span class="qst">En cola</span></div><div class="progress"><div></div></div>`;
    $('#vidQueue').appendChild(el);
    vidQueue.push({ file: f, cat, el });
  }
  runQueue();
}
async function runQueue() {
  if (vidBusy) return; vidBusy = true;
  while (vidQueue.length) {
    const job = vidQueue.shift(), st = $('.qst', job.el), bar = $('.progress div', job.el);
    try {
      const r = await VideoTools.process(job.file, prefs.vidQ || '720', s => st.textContent = s, p => bar.style.width = Math.round(p * 100) + '%');
      bar.style.width = '100%';
      await DB.put('videos', { id: uid(), kind: r.kind, title: job.file.name.replace(/\.[^.]+$/, ''), cat: job.cat || 'General', tags: [], notes: '',
        blob: r.blob, type: r.type, w: r.w, h: r.h, dur: r.dur, thumb: r.thumb, converted: !!r.converted, created: Date.now() });
      job.el.classList.add('ok'); st.textContent = r.note || (r.converted ? 'Convertido y guardado' : 'Guardado');
      setTimeout(() => job.el.remove(), r.note ? 8000 : 3000);
    } catch (e) {
      job.el.classList.add('err'); st.textContent = e.name === 'QuotaExceededError' ? 'Sin espacio en el dispositivo' : e.message;
      setTimeout(() => job.el.remove(), 12000);
    }
    if ($('#dlgLibrary').open) renderVideos();
  }
  vidBusy = false;
}
$('#vidFile').onchange = async e => {
  const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
  const { names } = await videoCats(); fillCatList(names);
  const r = await ask('Categoría de ' + (files.length > 1 ? 'estos ' + files.length + ' archivos' : '«' + files[0].name + '»'),
    [{ label: 'Categoría (p. ej. Partidos, Rival, Entrenamiento)', value: vidFilter || 'General', list: 'vidCatList' }], 'Subir');
  if (!r) return;
  queueMedia(files, r[0].trim() || 'General');
};
$('#btnAddLink').onclick = async () => {
  const { names } = await videoCats(); fillCatList(names);
  const r = await ask('Añadir enlace', [{ label: 'Enlace de YouTube o Vimeo', type: 'url' }, { label: 'Título', value: 'Video' }, { label: 'Categoría', value: vidFilter || 'General', list: 'vidCatList' }]);
  if (!r || !r[0]) return; const url = r[0].trim();
  if (!/^https?:\/\//i.test(url)) { toast('El enlace debe empezar por http'); return; }
  await DB.put('videos', { id: uid(), kind: 'link', url, title: (r[1] || 'Video').trim(), cat: (r[2] || 'General').trim(), tags: [], notes: '', created: Date.now() });
  renderVideos();
};
// Gestión de categorías
async function renderCats() {
  const { counts, names } = await videoCats(), wrap = $('#catRows'); wrap.innerHTML = '';
  if (!names.length) wrap.innerHTML = '<p class="muted small">Aún no hay categorías.</p>';
  names.forEach(n => {
    const row = document.createElement('div'); row.className = 'catrow';
    row.innerHTML = `<span>${esc(n)}<b>${counts[n]}</b></span><button>Renombrar</button><button class="danger">Quitar</button>`;
    const [bR, bD] = $$('button', row);
    bR.onclick = async () => {
      const r = await ask('Renombrar categoría', [{ label: 'Nuevo nombre', value: n }], 'Renombrar'); if (!r || !r[0].trim() || r[0].trim() === n) return;
      const nn = r[0].trim();
      for (const v of await DB.all('videos')) if ((v.cat || 'General') === n) { v.cat = nn; await DB.put('videos', v); }
      prefs.vidCats = [...new Set((prefs.vidCats || []).map(c => c === n ? nn : c))]; savePrefs();
      if (vidFilter === n) vidFilter = nn; renderCats(); renderVideos();
    };
    bD.onclick = async () => {
      if (counts[n] && !await confirmBox(`Los ${counts[n]} elementos de «${n}» pasarán a «General».`, 'Quitar categoría')) return;
      for (const v of await DB.all('videos')) if ((v.cat || 'General') === n) { v.cat = 'General'; await DB.put('videos', v); }
      prefs.vidCats = (prefs.vidCats || []).filter(c => c !== n); savePrefs();
      if (vidFilter === n) vidFilter = ''; renderCats(); renderVideos();
    };
    wrap.appendChild(row);
  });
}
$('#btnVidCats').onclick = () => { $('#dlgCats').showModal(); renderCats(); };
$('#btnNewCat').onclick = () => {
  const n = $('#newCat').value.trim(); if (!n) return;
  prefs.vidCats = [...new Set([...(prefs.vidCats || []), n])]; savePrefs(); $('#newCat').value = '';
  renderCats(); renderVideos();
};
$('#newCat').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnNewCat').click(); });

/* ---------- Reproductor con dibujo ---------- */
const pv = $('#pvideo'), pf = $('#pframe'), pim = $('#pimg'), pc = $('#pcanvas'), pctx = pc.getContext('2d');
let curVid = null, pURL = null, pMode = null, pStrokes = [], pDrag = null;
async function openPlayer(v) {
  curVid = v; $('#playerTitle').textContent = v.title; $('#pNotes').value = v.notes || '';
  pStrokes = []; setPMode(null);
  const isFile = v.kind === 'file';
  $$('#dlgPlayer .fileonly').forEach(b => b.hidden = !isFile);
  pv.hidden = pf.hidden = pim.hidden = true;
  if (isFile) { pURL = URL.createObjectURL(v.blob); pv.src = pURL; pv.hidden = false; pv.playbackRate = 1; $('#pRate').value = '1'; }
  else if (v.kind === 'image') { pURL = URL.createObjectURL(v.blob); pim.src = pURL; pim.hidden = false; }
  else {
    const em = embedUrl(v.url);
    if (!em) { window.open(v.url, '_blank', 'noopener'); return; }
    pf.src = em; pf.hidden = false;
  }
  const projects = (await DB.all('projects')).sort((a, b) => a.name.localeCompare(b.name));
  $('#pLink').innerHTML = '<option value="">— Ninguna —</option>' + projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#pLink').value = v.projectId && projects.some(p => p.id === v.projectId) ? v.projectId : '';
  $('#pOpenTac').disabled = !$('#pLink').value;
  $('#dlgPlayer').showModal(); setTimeout(sizePC, 60);
}
$('#pLink').onchange = async e => {
  if (!curVid) return; curVid.projectId = e.target.value || null; await DB.put('videos', curVid);
  $('#pOpenTac').disabled = !e.target.value; toast(e.target.value ? 'Video vinculado a la táctica' : 'Vínculo quitado');
};
$('#pOpenTac').onclick = async () => {
  const id = $('#pLink').value; if (!id) return; const p = await DB.get('projects', id); if (!p) return;
  await saveNow(); $('#dlgPlayer').close(); $('#dlgLibrary').close(); loadProject(p);
};
$('#dlgPlayer').addEventListener('close', async () => {
  pv.pause(); pv.removeAttribute('src'); pv.load(); pf.src = 'about:blank'; pim.removeAttribute('src');
  if (pURL) { URL.revokeObjectURL(pURL); pURL = null; }
  if (curVid) { const n = $('#pNotes').value; if (n !== (curVid.notes || '')) { curVid.notes = n; await DB.put('videos', curVid); } curVid = null; }
});
function sizePC() {
  const r = $('#pwrap').getBoundingClientRect(), d = window.devicePixelRatio || 1;
  pc.width = Math.max(1, Math.round(r.width * d)); pc.height = Math.max(1, Math.round(r.height * d));
  redrawPC();
}
function redrawPC() {
  const d = window.devicePixelRatio || 1, w = pc.width / d, h = pc.height / d;
  pctx.setTransform(d, 0, 0, d, 0, 0); pctx.clearRect(0, 0, w, h);
  const all = pDrag ? [...pStrokes, pDrag] : pStrokes;
  for (const s of all) {
    const pts = s.pts.map(p => [p[0] * w, p[1] * h]); if (pts.length < 2) continue;
    pctx.strokeStyle = s.c; pctx.fillStyle = s.c; pctx.lineWidth = 4; pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    pctx.shadowColor = 'rgba(0,0,0,.6)'; pctx.shadowBlur = 3;
    if (s.t === 'pen') { pctx.beginPath(); pts.forEach((p, i) => i ? pctx.lineTo(p[0], p[1]) : pctx.moveTo(p[0], p[1])); pctx.stroke(); }
    else { const a = pts[0], b = pts[pts.length - 1]; const e = shortened(a, b, 8); pctx.beginPath(); pctx.moveTo(a[0], a[1]); pctx.lineTo(e[0], e[1]); pctx.stroke(); arrowHead(pctx, a, b, 4); }
  }
}
function setPMode(m) {
  pMode = m; pc.classList.toggle('on', !!m);
  $('#pPen').classList.toggle('on-btn', m === 'pen'); $('#pArrow').classList.toggle('on-btn', m === 'arrow');
  if (m) pv.pause();
}
$('#pPen').onclick = () => setPMode(pMode === 'pen' ? null : 'pen');
$('#pArrow').onclick = () => setPMode(pMode === 'arrow' ? null : 'arrow');
$('#pClear').onclick = () => { pStrokes = []; redrawPC(); };
$('#pBack').onclick = () => { pv.currentTime = Math.max(0, pv.currentTime - 1); };
$('#pFwd').onclick = () => { pv.currentTime = Math.min(pv.duration || 0, pv.currentTime + 1); };
$('#pRate').onchange = e => { pv.playbackRate = +e.target.value; };
function pPoint(e) { const r = pc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
pc.addEventListener('pointerdown', e => { if (!pMode) return; try { pc.setPointerCapture(e.pointerId); } catch (_) {} const p = pPoint(e); pDrag = { t: pMode, c: $('#pColor').value, pts: [p, p] }; });
pc.addEventListener('pointermove', e => { if (!pDrag) return; const p = pPoint(e); if (pDrag.t === 'pen') pDrag.pts.push(p); else pDrag.pts[1] = p; redrawPC(); });
const pEnd = () => { if (!pDrag) return; pStrokes.push(pDrag); pDrag = null; redrawPC(); };
pc.addEventListener('pointerup', pEnd); pc.addEventListener('pointercancel', pEnd);
window.addEventListener('resize', () => { if ($('#dlgPlayer').open) sizePC(); });
$('#pSnap').onclick = () => {
  if (!pv.videoWidth) { toast('Reproduce el video primero'); return; }
  const r = $('#pwrap').getBoundingClientRect(), d = window.devicePixelRatio || 1;
  const c = document.createElement('canvas'); c.width = pc.width; c.height = pc.height; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  const sc = Math.min(r.width / pv.videoWidth, r.height / pv.videoHeight) * d, vw = pv.videoWidth * sc, vh = pv.videoHeight * sc;
  x.drawImage(pv, (c.width - vw) / 2, (c.height - vh) / 2, vw, vh); x.drawImage(pc, 0, 0);
  c.toBlob(async b => {
    const t = Math.floor(pv.currentTime);
    await DB.put('videos', { id: uid(), kind: 'image', title: curVid.title + ' · ' + fmtDur(t), cat: curVid.cat || 'General', tags: ['captura'], notes: '', blob: b, type: 'image/png',
      thumb: (() => { const s = document.createElement('canvas'); s.width = 320; s.height = 180; s.getContext('2d').drawImage(c, 0, 0, 320, 180); return s.toDataURL('image/jpeg', .7); })(),
      projectId: curVid.projectId || null, created: Date.now() });
    toast('Captura guardada en la Biblioteca');
    saveBlob(b, fileName(curVid.title + '_' + t + 's') + '.png');
  }, 'image/png');
};

/* ---------- Equipos ---------- */
function formationPos(team, count, key, F) {
  const list = (FORMATIONS[count] || FORMATIONS[11])[key] || Object.values(FORMATIONS[count] || FORMATIONS[11])[0];
  return list.map(([n, x, y]) => { let X = x * F.L / 105, Y = y * F.W / 68; if (team === 'B') { X = F.L - X; Y = F.W - Y; } return [n, X, Y]; });
}
function freePositions(team, n, F) {
  const out = [];
  if (team === 'C') { for (let i = 0; i < n; i++) out.push([i + 1, F.L / 2 + (i % 2 ? 3 : -3), F.W * (i + 1) / (n + 1)]); return out; }
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    let x = F.L * (.1 + .32 * (c + .5) / cols), y = F.W * (r + 1) / (rows + 1);
    if (team === 'B') { x = F.L - x; y = F.W - y; }
    out.push([i + 2, x, y]);
  }
  return out;
}
function placePlayers(team, positions, players, keepNames) {
  const old = P.objs.filter(o => o.type === 'player' && o.team === team);
  const names = {}; old.forEach(o => { if (o.name) names[o.num] = o.name; });
  old.forEach(o => removeObj(o.id));
  positions.forEach(([n, x, y], i) => {
    const src = players ? players[i] : null; if (players && !src) return;
    const o = { id: uid(), type: 'player', team, gk: src ? !!src.gk : (n === 1 && team !== 'C'), num: src ? src.num : n, name: src ? (src.name || '') : (keepNames ? names[n] || '' : '') };
    P.objs.push(o); P.frames.forEach(f => f.pos[o.id] = [x, y]);
  });
}
function buildTeams() {
  const wrap = $('#teamsWrap'); wrap.innerHTML = '';
  const defCount = FIELD_TYPES[P.field.type] ? FIELD_TYPES[P.field.type].players : 11;
  for (const k of TEAM_KEYS) {
    const t = P.teams[k], box = document.createElement('div'); box.className = 'team';
    const isC = k === 'C';
    box.innerHTML = `
      <input class="tname" value="${esc(t.name)}" maxlength="30" aria-label="Nombre del equipo ${k}">
      <div class="colors">
        <label>Camiseta <input type="color" data-k="color" value="${t.color}"></label>
        <label>Número <input type="color" data-k="text" value="${t.text}"></label>
        ${isC ? '' : `<label>Portero <input type="color" data-k="gk" value="${t.gk}"></label>`}
      </div>
      ${isC ? `<div class="row"><label class="inline">Comodines <input class="nFree" type="number" min="1" max="8" value="2" style="width:70px"></label><button class="addFree primary">Colocar comodines</button></div>`
      : `<div class="row">
          <label class="inline">Jugadores <select class="count">${[11, 9, 8, 7, 6, 5].map(n => `<option value="${n}" ${n === defCount ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <select class="formSel"></select>
        </div>
        <div class="row"><button class="applyForm primary">Colocar formación</button>
          <label class="inline">o <input class="nFree" type="number" min="1" max="20" value="${defCount}" style="width:64px"></label><button class="addFree">Colocar libres</button></div>`}
      <div class="plist"></div>
      ${isC ? '' : '<div class="row"><button class="fromSquad primary">👤 Alinear desde el plantel</button></div>'}
      <div class="row"><button class="addP">＋ Jugador</button><button class="clearT danger">Quitar todos</button></div>
      ${isC ? '' : `<div class="row"><select class="tpl"><option value="">Plantillas guardadas…</option></select><button class="loadT">Cargar</button><button class="saveT">Guardar plantilla</button></div>`}`;
    $('.tname', box).oninput = e => { t.name = e.target.value; scheduleSave(); };
    $$('input[type=color]', box).forEach(inp => inp.oninput = e => { t[e.target.dataset.k] = e.target.value; updateDots(); render(); scheduleSave(); });
    if (!isC) {
      const fill = () => { const n = $('.count', box).value; $('.formSel', box).innerHTML = Object.keys(FORMATIONS[n]).map(f => `<option>${f}</option>`).join(''); };
      fill(); $('.count', box).onchange = fill;
      $('.applyForm', box).onclick = () => {
        const n = +$('.count', box).value, f = $('.formSel', box).value;
        pushUndo(); placePlayers(k, formationPos(k, n, f, P.field), null, true); commit(); buildTeams();
        toast(`${t.name}: ${n} jugadores en ${f}`);
      };
    }
    $('.addFree', box).onclick = () => {
      const n = clamp(+$('.nFree', box).value || 1, 1, 20);
      pushUndo(); placePlayers(k, freePositions(k, n, P.field), null, true); commit(); buildTeams();
    };
    if (!isC) $('.fromSquad', box).onclick = () => openSquadPicker(k, $('.count', box).value, $('.formSel', box).value);
    $('.addP', box).onclick = () => { pushUndo(); addObj({ type: 'player', team: k }, k === 'A' ? P.field.L * .38 : k === 'B' ? P.field.L * .62 : P.field.L / 2, P.field.W / 2); commit(); buildTeams(); };
    $('.clearT', box).onclick = async () => {
      if (!await confirmBox('¿Quitar todos los jugadores de ' + t.name + '?', 'Quitar')) return;
      pushUndo(); P.objs.filter(o => o.type === 'player' && o.team === k).forEach(o => removeObj(o.id)); commit(); buildTeams();
    };
    if (!isC) {
      $('.saveT', box).onclick = async () => {
        const rn = await ask('Guardar plantilla', [{ label: 'Nombre de la plantilla', value: t.name }], 'Guardar'); const name = rn && rn[0].trim(); if (!name) return;
        const players = P.objs.filter(o => o.type === 'player' && o.team === k).sort((a, b) => (+a.num || 99) - (+b.num || 99)).map(o => ({ num: o.num, name: o.name, gk: !!o.gk }));
        await DB.put('teams', { id: uid(), name, color: t.color, text: t.text, gk: t.gk, players, created: Date.now() });
        toast('Plantilla guardada'); buildTeams();
      };
      $('.loadT', box).onclick = async () => {
        const id = $('.tpl', box).value; if (!id) { toast('Elige una plantilla'); return; }
        const tpl = await DB.get('teams', id); if (tpl) { loadTemplate(k, tpl); buildTeams(); toast('Plantilla «' + tpl.name + '» cargada'); }
      };
      DB.all('teams').then(list => {
        const s = $('.tpl', box);
        list.sort((a, b) => a.name.localeCompare(b.name)).forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name + ' (' + x.players.length + ')'; s.appendChild(o); });
      });
    }
    const pl = $('.plist', box);
    const players = P.objs.filter(o => o.type === 'player' && o.team === k).sort((a, b) => (+a.num || 99) - (+b.num || 99));
    if (!players.length) pl.innerHTML = '<div class="muted small">Sin jugadores todavía.</div>';
    for (const o of players) {
      const r = document.createElement('div'); r.className = 'prow';
      r.innerHTML = `<input value="${esc(o.num)}" inputmode="numeric" maxlength="3" aria-label="Número"><input value="${esc(o.name)}" placeholder="${o.gk ? 'Portero' : 'Nombre'}" maxlength="24" aria-label="Nombre"><button class="danger" title="Quitar">✕</button>`;
      const [iNum, iName] = $$('input', r);
      iNum.oninput = () => { o.num = iNum.value.trim(); render(); scheduleSave(); };
      iName.oninput = () => { o.name = iName.value; render(); scheduleSave(); };
      $('button', r).onclick = () => { pushUndo(); removeObj(o.id); commit(); buildTeams(); };
      pl.appendChild(r);
    }
    wrap.appendChild(box);
  }
}
function loadTemplate(team, tpl) {
  const t = P.teams[team]; t.color = tpl.color; t.text = tpl.text; t.gk = tpl.gk; t.name = tpl.name;
  const mine = P.objs.filter(o => o.type === 'player' && o.team === team);
  pushUndo();
  if (!mine.length) {
    const count = FIELD_TYPES[P.field.type] ? FIELD_TYPES[P.field.type].players : 11;
    const ps = [...tpl.players].sort((a, b) => (b.gk - a.gk) || ((+a.num || 99) - (+b.num || 99))).slice(0, count);
    placePlayers(team, formationPos(team, count, Object.keys(FORMATIONS[count])[0], P.field), ps, false);
  } else {
    const byNum = {}; tpl.players.forEach(p => byNum[String(p.num)] = p.name);
    mine.forEach(o => { if (byNum[String(o.num)] !== undefined) o.name = byNum[String(o.num)]; });
  }
  commit(); updateDots();
}
$('#btnTeams').onclick = () => { buildTeams(); $('#dlgTeams').showModal(); };

/* ---------- Exportar ---------- */
function fileName(s) { return (s || 'tactica').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'tactica'; }
/* En un artefacto de claude.ai las descargas pasan por la capacidad «downloads» */
let DL_NS;
async function claudeDownloads() {
  if (DL_NS !== undefined) return DL_NS;
  try { DL_NS = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch (e) { DL_NS = null; }
  return DL_NS;
}
async function saveBlob(blob, name) {
  const dl = await claudeDownloads();
  if (dl) { try { await dl.save({ filename: name, data: blob }); return true; } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return false; } }
  const file = new File([blob], name, { type: blob.type });
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  if (mobile && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}
function drawTitle(c, w, text) {
  c.save(); c.font = '600 22px system-ui,sans-serif'; c.textBaseline = 'top';
  const tw = c.measureText(text).width; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(14, 12, tw + 24, 36);
  c.fillStyle = '#fff'; c.fillText(text, 26, 19); c.restore();
}
$('#btnExport').onclick = () => { $('#exProgress').hidden = true; $('#dlgExport').showModal(); };
$('#exPng').onclick = () => {
  const W = 1920, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const EV = makeView(W, H, P, 'horizontal'); const f = P.frames[cur];
  renderScene(x, EV, P, { pos: f.pos, draws: f.draws }); drawTitle(x, W, P.name + (P.frames.length > 1 ? ' · paso ' + (cur + 1) : ''));
  c.toBlob(b => saveBlob(b, fileName(P.name) + (P.frames.length > 1 ? '_paso' + (cur + 1) : '') + '.png'), 'image/png');
};
function pickMime() {
  const list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
}
let exporting = false;
$('#exVideo').onclick = async () => {
  if (exporting) return;
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('Este navegador no permite grabar video. Prueba con Chrome.'); return; }
  if (P.frames.length < 2) { toast('La táctica necesita al menos 2 pasos para hacer un video'); return; }
  exporting = true; if (playing) stopPlay();
  const bar = $('#exProgress'), fill = $('div', bar); bar.hidden = false; fill.style.width = '0%';
  const W = 1280, H = 720, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.style.cssText = 'position:fixed;left:-10000px;top:0;width:10px;height:10px'; document.body.appendChild(cv);
  const c = cv.getContext('2d'), EV = makeView(W, H, P, 'horizontal');
  const stream = cv.captureStream(30); let mic = null;
  if ($('#exVoice').checked) {
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); mic.getAudioTracks().forEach(t => stream.addTrack(t)); }
    catch (e) { toast('No se pudo usar el micrófono; el video se grabará sin voz'); }
  }
  const mime = mic ? (['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '') : pickMime();
  let rec; try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5e6 } : {}); } catch (e) { rec = new MediaRecorder(stream); }
  const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => rec.onstop = r);
  const dur = prefs.speed * 1000 * (mic ? 1.6 : 1), hold = mic ? 2500 : 800, n = P.frames.length - 1, total = hold + n * dur + (mic ? 2500 : hold * 1.5);
  if (mic) toast('Grabando: habla mientras se reproduce la animación', 3000);
  const drawAt = el => {
    let st;
    if (el < hold) st = { pos: P.frames[0].pos, draws: P.frames[0].draws };
    else { const k = (el - hold) / dur, i = Math.floor(k); st = i >= n ? { pos: P.frames[n].pos, draws: P.frames[n].draws } : interpState(P, i, easeStep(k - i)); }
    c.setTransform(1, 0, 0, 1, 0, 0); renderScene(c, EV, P, st); drawTitle(c, W, P.name);
  };
  drawAt(0); rec.start(200); const t0 = performance.now();
  await new Promise(res => {
    const f = now => { const el = now - t0; drawAt(Math.min(el, total)); fill.style.width = Math.min(100, el / total * 100) + '%'; if (el < total) requestAnimationFrame(f); else res(); };
    requestAnimationFrame(f);
  });
  rec.stop(); await stopped; stream.getTracks().forEach(t => t.stop()); if (mic) mic.getTracks().forEach(t => t.stop()); cv.remove();
  const type = (rec.mimeType || mime || 'video/webm').split(';')[0], ext = type.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type });
  if ($('#exSaveLib').checked) {
    try {
      const thumb = (() => { const s = document.createElement('canvas'); s.width = 320; s.height = 180; const sv = makeView(320, 180, P, 'horizontal', 3); renderScene(s.getContext('2d'), sv, P, { pos: P.frames[0].pos, draws: P.frames[0].draws }); return s.toDataURL('image/jpeg', .7); })();
      await DB.put('videos', { id: uid(), kind: 'file', title: P.name, cat: 'Pizarra', tags: [P.cat], blob, type, w: W, h: H, dur: total / 1000, thumb, notes: P.notes || '', projectId: P.id, created: Date.now() });
    } catch (e) {}
  }
  exporting = false; bar.hidden = true;
  await saveBlob(blob, fileName(P.name) + '.' + ext);
  toast('Video listo' + ($('#exSaveLib').checked ? ' y guardado en la Biblioteca' : ''));
};
$('#exJson').onclick = () => saveBlob(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }), fileName(P.name) + '.json');
$('#exBackup').onclick = async () => {
  await saveNow();
  const data = { app: 'pizarra-tactica', version: 2, date: new Date().toISOString(), projects: await DB.all('projects'), teams: await DB.all('teams') };
  saveBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'pizarra_copia_' + new Date().toISOString().slice(0, 10) + '.json');
};

/* ---------- Ajustes ---------- */
function syncViewSel() {
  if (!P) return;
  const mz = mainZone(P);
  for (const id of ['#viewSel', '#setPitch']) {
    const el = $(id); el.innerHTML = VIEW_OPTS.map(([v, l]) => `<option value="${v}" ${v === 'zone' && !mz ? 'disabled' : ''}>${l}</option>`).join('');
    el.value = P.pitch;
  }
}
function syncFieldSettings() {
  const F = P.field;
  $('#setField').value = F.type; $('#setL').value = Math.round(F.L); $('#setW').value = Math.round(F.W);
  $('#setL').disabled = $('#setW').disabled = F.type !== 'custom';
  $('#setMarks').value = F.marks; syncViewSel(); $('#setSide').value = P.side;
  $('#setGrid').value = P.grid.mode; $('#setCols').value = P.grid.cols; $('#setRows').value = P.grid.rows;
  $('#gridCustom').hidden = P.grid.mode !== 'custom';
  $('#btnAreaClear').disabled = !P.zones.length;
  const mz = mainZone(P);
  $('#areaInfo').textContent = P.zones.length ? `${P.zones.length} espacio${P.zones.length > 1 ? 's' : ''}${mz ? ' · principal: ' + zoneSummary(mz) : ''}. Toca el borde de un espacio para moverlo, ajustarlo o editarlo.`
    : 'Sin espacios delimitados. Las divisiones se aplican a todo el campo.';
}
async function renderLinkedVideos() {
  const vids = (await DB.all('videos')).filter(v => v.projectId === P.id), box = $('#setVideos');
  box.innerHTML = vids.length ? '' : '<span class="muted">Ninguno. Vincula videos desde el reproductor de la Biblioteca.</span>';
  vids.forEach(v => {
    const r = document.createElement('div'); r.className = 'linkrow';
    r.innerHTML = `<span>${esc(v.title)}</span><button>Ver</button>`;
    $('button', r).onclick = () => { $('#dlgSettings').close(); $('#dlgLibrary').showModal(); renderDrills(); showLibTab('videos'); renderVideos(); openPlayer(v); };
    box.appendChild(r);
  });
}
$('#btnSettings').onclick = async () => {
  $('#setCat').value = P.cat; $('#setNotes').value = P.notes || '';
  syncFieldSettings();
  $('#setOrient').value = prefs.orient; $('#setTheme').value = prefs.theme; $('#setSize').value = prefs.size;
  $('#setNums').checked = prefs.nums; $('#setNames').checked = prefs.names; $('#setOnion').checked = prefs.onion; $('#setLoop').checked = prefs.loop;
  $('#setVidQ').value = prefs.vidQ || '720';
  $('#btnPin').textContent = prefs.pin ? 'Quitar PIN de acceso' : 'Establecer PIN de acceso';
  const cats = new Set(['General', 'Ataque', 'Defensa', 'Transición', 'Balón parado', 'Posesión', 'Construcción', 'Calentamiento', 'Partido']);
  (await DB.all('projects')).forEach(p => p.cat && cats.add(p.cat));
  $('#catList').innerHTML = [...cats].map(c => `<option value="${esc(c)}">`).join('');
  renderLinkedVideos();
  $('#dlgSettings').showModal();
};
function setField(type, L, W) {
  const old = P.field, nf = { ...old, type };
  if (type !== 'custom') { nf.L = FIELD_TYPES[type].L; nf.W = FIELD_TYPES[type].W; }
  else { nf.L = clamp(+L || old.L, 10, 130); nf.W = clamp(+W || old.W, 8, 100); }
  pushUndo();
  const kx = nf.L / old.L, ky = nf.W / old.W;
  if (kx !== 1 || ky !== 1) {
    P.frames.forEach(f => {
      for (const id in f.pos) f.pos[id] = [f.pos[id][0] * kx, f.pos[id][1] * ky];
      f.draws.forEach(d => d.pts.forEach(p => { p[0] *= kx; p[1] *= ky; }));
    });
    P.zones.forEach(z => z.pts.forEach(p => { p[0] *= kx; p[1] *= ky; }));
  }
  P.field = nf; resize(); commit(); syncFieldSettings();
}
$('#setField').onchange = e => setField(e.target.value);
$('#setL').onchange = () => setField('custom', $('#setL').value, $('#setW').value);
$('#setW').onchange = () => setField('custom', $('#setL').value, $('#setW').value);
$('#setMarks').onchange = e => { pushUndo(); P.field.marks = e.target.value; commit(); };
function setView(v) { pushUndo(); P.pitch = v; resize(); commit(); syncViewSel(); }
$('#setPitch').onchange = e => setView(e.target.value);
$('#viewSel').onchange = e => setView(e.target.value);
$('#setSide').onchange = e => { pushUndo(); P.side = e.target.value; resize(); commit(); };
$('#setGrid').onchange = e => { pushUndo(); P.grid.mode = e.target.value; $('#gridCustom').hidden = P.grid.mode !== 'custom'; commit(); };
$('#setCols').onchange = e => { P.grid.cols = clamp(+e.target.value || 1, 1, 12); commit(); };
$('#setRows').onchange = e => { P.grid.rows = clamp(+e.target.value || 1, 1, 12); commit(); };
$('#btnArea').onclick = () => { $('#dlgSettings').close(); setTool('area'); };
$('#btnSpaces2').onclick = () => { $('#dlgSettings').close(); openSpaces(); };
$('#btnAreaClear').onclick = async () => { if (!await confirmBox('¿Quitar todos los espacios delimitados?', 'Quitar')) return; pushUndo(); P.zones = []; if (P.pitch === 'zone') P.pitch = 'full'; sel = null; resize(); commit(); syncFieldSettings(); };
$('#setCat').oninput = e => { P.cat = e.target.value.trim() || 'General'; scheduleSave(); };
$('#setNotes').oninput = e => { P.notes = e.target.value; scheduleSave(); };
$('#setOrient').onchange = e => { prefs.orient = e.target.value; savePrefs(); resize(); };
$('#setTheme').onchange = e => { prefs.theme = e.target.value; savePrefs(); render(); };
$('#setSize').oninput = e => { prefs.size = +e.target.value; savePrefs(); render(); };
$('#setVidQ').onchange = e => { prefs.vidQ = e.target.value; savePrefs(); };
[['setNums', 'nums'], ['setNames', 'names'], ['setOnion', 'onion'], ['setLoop', 'loop']].forEach(([id, k]) => $('#' + id).onchange = e => { prefs[k] = e.target.checked; savePrefs(); render(); });

/* ---------- PIN ---------- */
async function hashPin(s) {
  const txt = 'pizarra:' + s;
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const ch of txt) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return 'd' + h.toString(16);
}
$('#btnPin').onclick = async () => {
  if (prefs.pin) {
    const rp = await ask('Quitar PIN', [{ label: 'PIN actual', type: 'password', mode: 'numeric' }], 'Quitar'); if (!rp) return;
    if (await hashPin(rp[0]) !== prefs.pin) { toast('PIN incorrecto'); return; }
    prefs.pin = null; savePrefs(); toast('PIN quitado'); $('#btnPin').textContent = 'Establecer PIN de acceso'; return;
  }
  const rp = await ask('Nuevo PIN', [{ label: 'PIN (4 a 8 números)', type: 'password', mode: 'numeric' }, { label: 'Repite el PIN', type: 'password', mode: 'numeric' }], 'Activar');
  if (!rp) return;
  if (!/^\d{4,8}$/.test(rp[0])) { toast('Usa de 4 a 8 números'); return; }
  if (rp[0] !== rp[1]) { toast('Los PIN no coinciden'); return; }
  prefs.pin = await hashPin(rp[0]); savePrefs(); toast('PIN activado. Se pedirá al abrir la app.'); $('#btnPin').textContent = 'Quitar PIN de acceso';
};
function checkLock() {
  return new Promise(res => {
    if (!prefs.pin) return res();
    const L = $('#lock'); L.hidden = false;
    const go = async () => {
      if (await hashPin($('#lockPin').value) === prefs.pin) { L.hidden = true; $('#lockPin').value = ''; res(); }
      else { $('#lockErr').textContent = 'PIN incorrecto'; $('#lockPin').value = ''; }
    };
    $('#lockOk').onclick = go; $('#lockPin').onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => $('#lockPin').focus(), 50);
  });
}

/* ---------- Teclado ---------- */
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select') || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); setTool('move'); selectObjs(P.objs); }
  else if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); if (sel) $('#selDup').click(); }
  else if (k === 'delete' || k === 'backspace') { if (sel) { e.preventDefault(); $('#selDel').click(); } }
  else if (k === ' ') { e.preventDefault(); playing ? stopPlay() : play(); }
  else if (k === 'arrowright') { if (cur < P.frames.length - 1) { cur++; sel = null; showSel(); renderFrames(); render(); } }
  else if (k === 'arrowleft') { if (cur > 0) { cur--; sel = null; showSel(); renderFrames(); render(); } }
  else if (k === 'escape') { if (panelName) { closePanel(); return; } setTool('move'); sel = null; showSel(); render(); }
  else if (k === 'enter' && polyDraft) finishPoly();
});
$('#btnUndo').onclick = undo;
$('#btnRedo').onclick = redo;

/* ---------- Inicio ---------- */
function welcomeProject() {
  const p = newProject('Mi primera táctica');
  formationPos('A', 11, '4-3-3', p.field).forEach(([n, x, y]) => { const o = { id: uid(), type: 'player', team: 'A', gk: n === 1, num: n, name: '' }; p.objs.push(o); p.frames[0].pos[o.id] = [x, y]; });
  formationPos('B', 11, '4-4-2', p.field).forEach(([n, x, y]) => { const o = { id: uid(), type: 'player', team: 'B', gk: n === 1, num: n, name: '' }; p.objs.push(o); p.frames[0].pos[o.id] = [x, y]; });
  const b = { id: uid(), type: 'ball' }; p.objs.push(b); p.frames[0].pos[b.id] = [52.5, 34];
  return p;
}
async function init() {
  buildSwatches();
  const matOpts = Object.entries(ZONE_MATERIALS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('#zbMat').innerHTML = matOpts; $('#zMat').innerHTML = matOpts;
  $('#speedSel').value = String(prefs.speed); if (!$('#speedSel').value) $('#speedSel').value = '1.2';
  await checkLock();
  let p = null;
  try {
    if (prefs.lastId) p = await DB.get('projects', prefs.lastId);
    if (!p) { const all = await DB.all('projects'); all.sort((a, b) => b.updated - a.updated); p = all[0] || null; }
  } catch (e) { console.error(e); }
  if (!p) { p = welcomeProject(); try { await DB.put('projects', p); } catch (e) {} }
  loadProject(p);
  new ResizeObserver(() => resize()).observe($('#stage'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  window.addEventListener('pagehide', saveNow);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  hint('Toca ☰ Tácticas para tus jugadas y 🎬 Biblioteca para ejercicios y videos');
}
// Service worker: copia sin conexión (también dentro de la app de Android cuando abre la web publicada)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname !== 'appassets.androidplatform.net') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
init();
