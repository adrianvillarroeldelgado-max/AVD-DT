'use strict';
/*
  Espacios de juego (zonas): rectángulos, círculos y polígonos delimitados con
  línea, platillos, conos, estacas, bandas o ligas, con medidas en metros.
  Una zona: { id, name, shape:'rect'|'circle'|'poly', pts, material, color, spacing, dims, dim, main }
    rect: pts = [esquina, esquina opuesta] · circle: pts = [centro, punto del borde] · poly: pts = vértices
*/
const ZONE_MATERIALS = {
  linea: 'Línea', platillos: 'Platillos', conos: 'Conos', estacas: 'Estacas', bandas: 'Bandas', ligas: 'Ligas',
};
const ZONE_DEFAULT_COLOR = { linea: '#ffffff', platillos: '#ffd600', conos: '#ff6d00', estacas: '#ffd600', bandas: '#ff1744', ligas: '#00e5ff' };

function zoneVerts(z) {
  if (z.shape === 'rect') {
    const [a, b] = z.pts, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  }
  if (z.shape === 'poly') return z.pts;
  return null;
}
function zoneRadius(z) { return Math.hypot(z.pts[1][0] - z.pts[0][0], z.pts[1][1] - z.pts[0][1]); }
function zoneBBox(z) {
  if (z.shape === 'circle') { const r = zoneRadius(z), [cx, cy] = z.pts[0]; return [cx - r, cy - r, cx + r, cy + r]; }
  const v = zoneVerts(z), xs = v.map(p => p[0]), ys = v.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function zoneArea(z) {
  if (z.shape === 'circle') return Math.PI * zoneRadius(z) ** 2;
  const v = zoneVerts(z); let a = 0;
  for (let i = 0; i < v.length; i++) { const p = v[i], q = v[(i + 1) % v.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a) / 2;
}
function zoneCentroid(z) {
  if (z.shape === 'circle') return z.pts[0];
  const v = zoneVerts(z); return [v.reduce((s, p) => s + p[0], 0) / v.length, v.reduce((s, p) => s + p[1], 0) / v.length];
}
function zoneHandles(z) {
  if (z.shape === 'rect') return zoneVerts(z);
  return z.pts;
}
function fmtM(v) { return (v < 10 ? (Math.round(v * 10) / 10).toString().replace('.', ',') : Math.round(v)) + ' m'; }
function zoneSummary(z) {
  const a = Math.round(zoneArea(z));
  if (z.shape === 'rect') { const [x0, y0, x1, y1] = zoneBBox(z); return `${fmtM(x1 - x0).replace(' m', '')} × ${fmtM(y1 - y0)} · ${a} m²`; }
  if (z.shape === 'circle') return `Ø ${fmtM(zoneRadius(z) * 2)} · ${a} m²`;
  return `${z.pts.length} lados · ${a} m²`;
}
/* Puntos repartidos por el perímetro cada `spacing` metros (incluye vértices) */
function perimeterPoints(z, spacing) {
  spacing = Math.max(.5, spacing || 5);
  if (z.shape === 'circle') {
    const r = zoneRadius(z), n = Math.max(6, Math.round(2 * Math.PI * r / spacing)), [cx, cy] = z.pts[0];
    return [...Array(n)].map((_, i) => [cx + r * Math.cos(i * 2 * Math.PI / n), cy + r * Math.sin(i * 2 * Math.PI / n)]);
  }
  const v = zoneVerts(z), out = [];
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(L / spacing));
    for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}
/* Etiquetas de medidas: [{p:[x,y] mundo, n:[nx,ny] normal hacia fuera, t:texto}] */
function zoneLabels(z) {
  if (z.shape === 'circle') { const [cx, cy] = z.pts[0], r = zoneRadius(z); return [{ p: [cx, cy - r], n: [0, -1], t: 'Ø ' + fmtM(r * 2) }]; }
  const v = zoneVerts(z), c = zoneCentroid(z), out = [];
  const edges = z.shape === 'rect' ? [0, 1] : v.map((_, i) => i);
  for (const i of edges) {
    const a = v[i], b = v[(i + 1) % v.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .5) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
    if ((mid[0] - c[0]) * n[0] + (mid[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
    out.push({ p: mid, n, t: fmtM(L) });
  }
  return out;
}
/* Ruta de la zona en coordenadas de pantalla */
function zonePath(c, V, z, fresh = true) {
  if (fresh) c.beginPath();
  if (z.shape === 'circle') { const [x, y] = w2s(V, z.pts[0][0], z.pts[0][1]), r = zoneRadius(z) * V.s; c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); return; }
  zoneVerts(z).forEach((p, i) => { const [x, y] = w2s(V, p[0], p[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.closePath();
}
function pill(c, x, y, text, fs) {
  c.save(); c.font = `700 ${fs}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(text).width + fs * .9, h = fs * 1.55;
  c.fillStyle = 'rgba(8,14,10,.78)'; c.beginPath();
  c.roundRect ? c.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : c.rect(x - w / 2, y - h / 2, w, h); c.fill();
  c.fillStyle = '#fff'; c.fillText(text, x, y + .5); c.restore();
}
function drawZone(c, V, z, opts = {}) {
  const R = objR(V), col = z.color || ZONE_DEFAULT_COLOR[z.material] || '#fff';
  c.save();
  switch (z.material) {
    case 'bandas':
      zonePath(c, V, z); c.lineJoin = 'miter';
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(7, V.s * .22) + 2; c.stroke();
      c.strokeStyle = col; c.lineWidth = Math.max(7, V.s * .22); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.setLineDash([10, 8]); c.stroke(); c.setLineDash([]);
      break;
    case 'ligas':
      zonePath(c, V, z); c.strokeStyle = col; c.lineWidth = 2; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 2; c.stroke(); c.shadowColor = 'transparent';
      (z.shape === 'circle' ? perimeterPoints(z, z.spacing || 5) : zoneVerts(z)).forEach(p => {
        const [x, y] = w2s(V, p[0], p[1]); c.beginPath(); c.arc(x, y, Math.max(3, R * .22), 0, Math.PI * 2); c.fillStyle = '#ffd600'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#333'; c.stroke();
      });
      break;
    case 'platillos': case 'conos': case 'estacas': {
      zonePath(c, V, z); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]);
      const type = z.material === 'platillos' ? 'disc' : z.material === 'conos' ? 'cone' : 'pole';
      const k = z.material === 'platillos' ? .85 : .75;
      perimeterPoints(z, z.spacing || 5).forEach(p => { const [x, y] = w2s(V, p[0], p[1]); drawEquipment(c, { type, c: col }, x, y, R * k, V.s, 0); });
      break;
    }
    default:
      zonePath(c, V, z); c.strokeStyle = col; c.lineWidth = 3; c.stroke();
  }
  if (opts.selected) { zonePath(c, V, z); c.strokeStyle = '#00e5ff'; c.lineWidth = 2; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]); }
  if ((z.dims || opts.editing) && V.minR >= 5) {
    const fs = Math.round(clamp(V.s * .9, 11, 14));
    for (const l of zoneLabels(z)) {
      const [x, y] = w2s(V, l.p[0], l.p[1]);
      const nx = V.rot ? l.n[1] : l.n[0], ny = V.rot ? -l.n[0] : l.n[1];
      c.font = `700 ${fs}px system-ui,sans-serif`;
      const off = Math.abs(nx) * (c.measureText(l.t).width / 2 + fs * .45 + 7) + Math.abs(ny) * (fs * .8 + 7);
      pill(c, x + nx * off, y + ny * off, l.t, fs);
    }
    if (zoneArea(z) * V.s * V.s > 9000 || opts.editing) {
      const [cx, cy] = w2s(V, ...zoneCentroid(z));
      pill(c, cx, cy, (z.name && !opts.editing ? z.name + ' · ' : '') + zoneSummary(z), fs - 1);
    }
  }
  if (opts.selected) {
    zoneHandles(z).forEach(p => { const [x, y] = w2s(V, p[0], p[1]); c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#00e5ff'; c.stroke(); });
  }
  c.restore();
}
function zoneEdgeDist(V, z, sx, sy) {
  if (z.shape === 'circle') { const [x, y] = w2s(V, z.pts[0][0], z.pts[0][1]); return Math.abs(Math.hypot(sx - x, sy - y) - zoneRadius(z) * V.s); }
  const v = zoneVerts(z).map(p => w2s(V, p[0], p[1])); let d = Infinity;
  for (let i = 0; i < v.length; i++) d = Math.min(d, distSeg([sx, sy], v[i], v[(i + 1) % v.length]));
  return d;
}

/* ---------- Espacios predefinidos ---------- */
const rectZ = (cx, cy, w, h, material, extra = {}) => ({ shape: 'rect', pts: [[cx - w / 2, cy - h / 2], [cx + w / 2, cy + h / 2]], material, ...extra });
const polyZ = (cx, cy, r, n, rot, material, extra = {}) => ({ shape: 'poly', pts: [...Array(n)].map((_, i) => [cx + r * Math.cos(rot + i * 2 * Math.PI / n), cy + r * Math.sin(rot + i * 2 * Math.PI / n)]), material, ...extra });
const SPACE_PRESETS = [
  { name: 'Rondo 10 × 10', desc: 'Platillos cada 2,5 m', build: F => ({ zones: [rectZ(F.L / 2, F.W / 2, 10, 10, 'platillos', { spacing: 2.5 })] }) },
  { name: 'Rondo 15 × 15', desc: 'Platillos cada 3 m', build: F => ({ zones: [rectZ(F.L / 2, F.W / 2, 15, 15, 'platillos', { spacing: 3 })] }) },
  { name: 'Doble rondo', desc: 'Dos cuadrados de 12 m unidos', build: F => ({ zones: [rectZ(F.L / 2 - 7, F.W / 2, 12, 12, 'platillos', { spacing: 3 }), rectZ(F.L / 2 + 7, F.W / 2, 12, 12, 'platillos', { spacing: 3, color: '#ff6d00' })] }) },
  { name: 'Posesión 30 × 25', desc: 'Conos cada 5 m', build: F => ({ zones: [rectZ(F.L / 2, F.W / 2, 30, 25, 'conos', { spacing: 5 })] }) },
  { name: 'Partido reducido 40 × 30', desc: 'Bandas y dos miniporterías', build: F => ({ zones: [rectZ(F.L / 2, F.W / 2, 40, 30, 'bandas')], objs: [{ type: 'goal', x: F.L / 2 - 20, y: F.W / 2 }, { type: 'goal', x: F.L / 2 + 20, y: F.W / 2, rot: Math.PI }] }) },
  { name: 'Juego de posición 20 × 20 + zona central', desc: 'Cuadrado con zona de comodín', build: F => ({ zones: [rectZ(F.L / 2, F.W / 2, 20, 20, 'conos', { spacing: 5 }), rectZ(F.L / 2, F.W / 2, 6, 6, 'platillos', { spacing: 2, color: '#2979ff' })] }) },
  { name: 'Rombo 20 m', desc: 'Platillos cada 2,5 m', build: F => ({ zones: [polyZ(F.L / 2, F.W / 2, 10, 4, -Math.PI / 2, 'platillos', { spacing: 2.5 })] }) },
  { name: 'Hexágono 20 m', desc: 'Estacas en los vértices', build: F => ({ zones: [polyZ(F.L / 2, F.W / 2, 10, 6, 0, 'estacas', { spacing: 10 })] }) },
  { name: 'Círculo Ø 20 m', desc: 'Platillos', build: F => ({ zones: [{ shape: 'circle', pts: [[F.L / 2, F.W / 2], [F.L / 2 + 10, F.W / 2]], material: 'platillos', spacing: 3 }] }) },
  { name: 'Pasillos laterales', desc: 'Carriles exteriores con ligas', build: F => ({ zones: [{ shape: 'rect', pts: [[0, 0], [F.L, F.W * .17]], material: 'ligas' }, { shape: 'rect', pts: [[0, F.W * .83], [F.L, F.W]], material: 'ligas' }] }) },
  { name: 'Zona de finalización', desc: 'Último cuarto del campo con conos', build: F => ({ zones: [{ shape: 'rect', pts: [[F.L * .75, F.W * .15], [F.L, F.W * .85]], material: 'conos', spacing: 5 }] }) },
  { name: 'Circuito de escalera y vallas', desc: 'Escalera, 4 minivallas y slalom', build: F => {
      const x = F.L / 2 - 14, y = F.W / 2;
      return { zones: [], objs: [{ type: 'ladder', x, y, rot: Math.PI / 2 }, ...[0, 1, 2, 3].map(i => ({ type: 'minihurdle', x: x + 5 + i * 1.5, y })), ...[0, 1, 2, 3, 4].map(i => ({ type: 'pole', x: x + 13 + i * 2.5, y: y + (i % 2 ? 1 : -1) })), { type: 'goal7', x: x + 28, y }] };
    } },
];
