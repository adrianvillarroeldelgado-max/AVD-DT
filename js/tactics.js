'use strict';
/*
  Mejoras tácticas de la pizarra:
  - Flechas curvas (carrera y pase) con punto de control editable; las fichas siguen la curva al animar.
  - Sombra de pase (cono de cobertura).
  - Líneas de unión entre fichas (con distancias) y bloques (ancho × profundidad).
  - Jugador destacado y estado del plantel en la ficha.
  - Densidad del espacio (m² por jugador).
*/

/* ---------- Curvas ---------- */
const CURVE_TYPES = ['curve', 'curvedash'];
function curveCtrl(a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  return [mx - dy * .28, my + dx * .28];
}
function qBez(a, c, b, t) { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }
function curvePts(d) { const a = d.pts[0], b = d.pts[1], c = d.pts[2] || curveCtrl(a, b); return [a, c, b]; }
function drawCurveShape(c, V, d, lw, selected) {
  const [a, k, b] = curvePts(d).map(p => w2s(V, p[0], p[1]));
  const near = qBez(a, k, b, .93);
  if (d.t === 'curvedash') c.setLineDash([lw * 2.6, lw * 2]);
  c.beginPath(); c.moveTo(a[0], a[1]);
  const steps = 24;
  for (let i = 1; i <= steps; i++) { const p = qBez(a, k, b, i / steps * .97); c.lineTo(p[0], p[1]); }
  c.stroke(); c.setLineDash([]);
  arrowHead(c, near, b, lw);
  if (selected) {
    c.save(); c.shadowColor = 'transparent'; c.setLineDash([4, 4]); c.lineWidth = 1.2; c.strokeStyle = '#00e5ff';
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(k[0], k[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(k[0], k[1], 8, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#00e5ff'; c.stroke();
    c.restore();
  }
}
function curveHitDist(V, d, p) {
  const [a, k, b] = curvePts(d).map(q => w2s(V, q[0], q[1])); let best = Infinity, prev = a;
  for (let i = 1; i <= 20; i++) { const q = qBez(a, k, b, i / 20); best = Math.min(best, distSeg(p, prev, q)); prev = q; }
  return best;
}
function curveCtrlScreen(V, d) { const k = curvePts(d)[1]; return w2s(V, k[0], k[1]); }
/* Si una curva sale de donde está la ficha y llega a donde estará, la ficha sigue la curva */
function curveFor(draws, a, b) {
  for (const d of draws || []) {
    if (!CURVE_TYPES.includes(d.t)) continue;
    const [p0, k, p1] = curvePts(d);
    if (Math.hypot(p0[0] - a[0], p0[1] - a[1]) < 3 && Math.hypot(p1[0] - b[0], p1[1] - b[1]) < 3)
      return [k[0] + ((a[0] - p0[0]) + (b[0] - p1[0])) / 2, k[1] + ((a[1] - p0[1]) + (b[1] - p1[1])) / 2];
  }
  return null;
}

/* ---------- Sombra de pase ---------- */
function shadowPts(a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = .33;
  return [a, [a[0] + Math.cos(ang - h) * L, a[1] + Math.sin(ang - h) * L], [a[0] + Math.cos(ang + h) * L, a[1] + Math.sin(ang + h) * L]];
}
function drawShadowShape(c, V, d, selected) {
  const [a, b] = [d.pts[0], d.pts[d.pts.length - 1]];
  const sp = shadowPts(a, b).map(p => w2s(V, p[0], p[1])), A = sp[0], M = w2s(V, b[0], b[1]);
  const g = c.createLinearGradient(A[0], A[1], M[0], M[1]);
  g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,.05)');
  c.beginPath(); c.moveTo(sp[0][0], sp[0][1]); c.lineTo(sp[1][0], sp[1][1]); c.lineTo(sp[2][0], sp[2][1]); c.closePath();
  c.fillStyle = g; c.fill();
  c.setLineDash([5, 5]); c.lineWidth = 1.2; c.strokeStyle = selected ? '#00e5ff' : 'rgba(255,255,255,.45)'; c.stroke(); c.setLineDash([]);
}
function shadowHit(V, d, p) {
  const sp = shadowPts(d.pts[0], d.pts[d.pts.length - 1]).map(q => w2s(V, q[0], q[1]));
  const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = s(p, sp[0], sp[1]), d2 = s(p, sp[1], sp[2]), d3 = s(p, sp[2], sp[0]);
  const inside = !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  return inside ? 0 : Infinity;
}

/* ---------- Líneas de unión y bloques ---------- */
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function linkPts(l, pos) { return l.ids.map(id => pos[id]).filter(Boolean); }
function drawLinks(c, V, proj, st) {
  (proj.links || []).forEach((l, i) => {
    const wp = linkPts(l, st.pos); if (wp.length < 2) return;
    const sp = wp.map(p => w2s(V, p[0], p[1])), col = l.c || '#ffeb3b';
    const selected = !!(st.sel && st.sel.kind === 'link' && st.sel.idx === i), fs = Math.round(clamp(V.s * .8, 10, 13));
    c.save();
    if (l.style === 'block') {
      const h = hull(sp);
      c.beginPath(); h.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
      c.globalAlpha = .2; c.fillStyle = col; c.fill(); c.globalAlpha = 1;
      c.lineWidth = selected ? 3 : 2; c.strokeStyle = selected ? '#00e5ff' : col; c.setLineDash([8, 5]); c.stroke(); c.setLineDash([]);
      if (V.minR >= 5) {
        const xs = wp.map(p => p[0]), ys = wp.map(p => p[1]);
        const depth = Math.max(...xs) - Math.min(...xs), width = Math.max(...ys) - Math.min(...ys);
        const top = h.reduce((m, p) => p[1] < m[1] ? p : m, h[0]), cx = h.reduce((s, p) => s + p[0], 0) / h.length;
        pill(c, cx, top[1] - fs * 1.8, `Ancho ${fmtM(width)} · Profundidad ${fmtM(depth)}`, fs);
      }
    } else {
      c.lineWidth = selected ? 4 : 3; c.strokeStyle = selected ? '#00e5ff' : col; c.globalAlpha = .9;
      c.beginPath(); sp.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.globalAlpha = 1;
      if (l.dist !== false && V.minR >= 5) for (let k = 1; k < wp.length; k++) {
        const L = Math.hypot(wp[k][0] - wp[k - 1][0], wp[k][1] - wp[k - 1][1]);
        pill(c, (sp[k][0] + sp[k - 1][0]) / 2, (sp[k][1] + sp[k - 1][1]) / 2, fmtM(L), fs);
      }
    }
    c.restore();
  });
}
function hitLink(sx, sy) {
  const pos = P.frames[cur].pos, links = P.links || [];
  for (let i = links.length - 1; i >= 0; i--) {
    const sp = linkPts(links[i], pos).map(p => w2s(V, p[0], p[1])); if (sp.length < 2) continue;
    const poly = links[i].style === 'block' ? hull(sp).concat([hull(sp)[0]]) : sp;
    for (let k = 1; k < poly.length; k++) if (distSeg([sx, sy], poly[k - 1], poly[k]) < 10) return i;
  }
  return -1;
}
function orderForLine(objs, pos) {
  const ps = objs.map(o => pos[o.id]), xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
  const byY = (Math.max(...ys) - Math.min(...ys)) >= (Math.max(...xs) - Math.min(...xs));
  return [...objs].sort((a, b) => byY ? pos[a.id][1] - pos[b.id][1] : pos[a.id][0] - pos[b.id][0]);
}

/* ---------- Destacado y estado ---------- */
function drawSpot(c, x, y, R) {
  const g = c.createRadialGradient(x, y, R * .8, x, y, R * 2.6);
  g.addColorStop(0, 'rgba(255,235,59,.55)'); g.addColorStop(1, 'rgba(255,235,59,0)');
  c.beginPath(); c.arc(x, y, R * 2.6, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  c.beginPath(); c.arc(x, y, R * 1.45, 0, Math.PI * 2); c.lineWidth = 2.5; c.strokeStyle = '#ffeb3b'; c.stroke();
}
const STATUS = {
  disponible: { name: 'Disponible', color: '#2ecc71' },
  molestias: { name: 'Con molestias', color: '#ff9800' },
  lesionado: { name: 'Lesionado', color: '#ff5252' },
  sancionado: { name: 'Sancionado', color: '#ffd600' },
  ausente: { name: 'Ausente', color: '#90a4ae' },
};
function drawStatusBadge(c, x, y, R, status) {
  if (!status || status === 'disponible') return;
  const bx = x + R * .78, by = y - R * .78, r = Math.max(5, R * .42);
  c.save();
  if (status === 'sancionado') { c.fillStyle = '#ffd600'; c.strokeStyle = '#111'; c.lineWidth = 1; c.fillRect(bx - r * .55, by - r * .8, r * 1.1, r * 1.6); c.strokeRect(bx - r * .55, by - r * .8, r * 1.1, r * 1.6); c.restore(); return; }
  c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fillStyle = STATUS[status] ? STATUS[status].color : '#999'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
  c.fillStyle = '#fff'; c.font = `900 ${Math.round(r * 1.5)}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(status === 'lesionado' ? '+' : status === 'molestias' ? '!' : '–', bx, by + r * .08);
  c.restore();
}

/* ---------- Densidad ---------- */
function pointInZone(z, p) {
  if (z.shape === 'circle') return Math.hypot(p[0] - z.pts[0][0], p[1] - z.pts[0][1]) <= zoneRadius(z) + .5;
  const v = zoneVerts(z); let ins = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    if (((v[i][1] > p[1]) !== (v[j][1] > p[1])) && (p[0] < (v[j][0] - v[i][0]) * (p[1] - v[i][1]) / ((v[j][1] - v[i][1]) || 1e-9) + v[i][0])) ins = !ins;
  }
  return ins;
}
function taskDensity(proj) {
  const mz = mainZone(proj), pos = proj.frames[0].pos;
  const players = proj.objs.filter(o => o.type === 'player' && pos[o.id] && (!mz || pointInZone(mz, pos[o.id])));
  const area = mz ? zoneArea(mz) : proj.field.L * proj.field.W;
  const byTeam = {}; players.forEach(o => byTeam[o.team] = (byTeam[o.team] || 0) + 1);
  return { area, n: players.length, ratio: players.length ? area / players.length : 0, byTeam, zone: mz };
}
function formatTeams(byTeam) {
  const a = byTeam.A || 0, b = byTeam.B || 0, c = byTeam.C || 0;
  return (a || b ? `${a} vs ${b}` : '') + (c ? ` + ${c} comodín${c > 1 ? 'es' : ''}` : '');
}
function updateDensityBadge() {
  const el = $('#densBadge'); if (!el || !P) return;
  const d = taskDensity(P);
  if (!d.zone || !d.n) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<b>${Math.round(d.ratio)} m²</b>/jugador<span>${formatTeams(d.byTeam)} · ${Math.round(d.area)} m²</span>`;
}
function materialOf(proj) {
  const counts = {};
  proj.objs.forEach(o => { if (o.type !== 'player') counts[o.type] = (counts[o.type] || 0) + 1; });
  (proj.zones || []).forEach(z => {
    const t = { platillos: 'disc', conos: 'cone', estacas: 'pole' }[z.material];
    if (t) counts[t] = (counts[t] || 0) + perimeterPoints(z, z.spacing || 5).length;
    if (z.material === 'ligas' && z.shape !== 'circle') counts.pole = (counts.pole || 0) + zoneVerts(z).length;
  });
  return counts;
}
const MAT_NAMES = {
  disc: ['platillo', 'platillos'], cone: ['cono', 'conos'], tallcone: ['cono alto', 'conos altos'], pole: ['pica / estaca', 'picas / estacas'], flag: ['banderín', 'banderines'],
  hoop: ['aro', 'aros'], ladder: ['escalera', 'escaleras'], hurdle: ['valla', 'vallas'], minihurdle: ['minivalla', 'minivallas'], dummy: ['maniquí', 'maniquíes'],
  wall: ['barrera de 3', 'barreras de 3'], rebounder: ['rebotador', 'rebotadores'], goalpop: ['portería pop-up 1,2 m', 'porterías pop-up 1,2 m'],
  goal: ['miniportería 2 × 1 m', 'miniporterías 2 × 1 m'], goal3: ['portería sala 3 × 2 m', 'porterías sala 3 × 2 m'], goal7: ['portería F7 5 × 2 m', 'porterías F7 5 × 2 m'],
  goal9: ['portería F9 6 × 2 m', 'porterías F9 6 × 2 m'], goal11: ['portería F11', 'porterías F11'], ball: ['balón', 'balones'], ballbag: ['saco de balones', 'sacos de balones'], bib: ['juego de petos', 'juegos de petos'],
};
function objPlural(t, n) { const m = MAT_NAMES[t]; return m ? m[n === 1 ? 0 : 1] : (OBJ[t] ? OBJ[t].name.toLowerCase() : t); }
function materialText(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${objPlural(t, n)}`).join(', ');
}
