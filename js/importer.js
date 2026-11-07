'use strict';
/*
  Importador de archivos externos.
  - Proyectos de esta app (.json)
  - Proyectos de TacticalPad u otras pizarras (EXPERIMENTAL): el formato de TacticalPad no es público,
    así que se lee de forma genérica: ZIP, plist binario/XML de iOS (NSKeyedArchiver), XML o JSON,
    buscando fichas con coordenadas, equipos, colores, números y pasos.
  - Videos e imágenes (también los que vengan dentro de un ZIP) → Biblioteca.
*/
const Importer = (() => {
  const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|avi|wmv|flv|mts|m2ts|3gp|mpg|mpeg|ogv)$/i;
  const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic)$/i;
  const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

  /* ---------- ZIP (sin librerías: usa DecompressionStream del navegador) ---------- */
  async function inflateRaw(raw) {
    const s = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function unzip(buf) {
    const dv = new DataView(buf), len = buf.byteLength; let eocd = -1;
    for (let i = len - 22; i >= Math.max(0, len - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('ZIP dañado');
    const n = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder(), out = [];
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
      const nlen = dv.getUint16(off + 28, true), xlen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      const name = dec.decode(new Uint8Array(buf, off + 46, nlen));
      off += 46 + nlen + xlen + clen;
      if (name.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(name)) continue;
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const raw = new Uint8Array(buf, start, csize);
      try {
        if (method === 0) out.push({ name, data: raw.slice() });
        else if (method === 8) out.push({ name, data: await inflateRaw(raw) });
      } catch (e) { /* entrada ilegible: se omite */ }
    }
    return out;
  }

  /* ---------- plist binario (iOS / macOS) ---------- */
  function bplist(buffer) {
    const b = new Uint8Array(buffer), dv = new DataView(buffer), t = buffer.byteLength - 32;
    const offSize = b[t + 6], refSize = b[t + 7];
    const num = Number(dv.getBigUint64(t + 8)), top = Number(dv.getBigUint64(t + 16)), table = Number(dv.getBigUint64(t + 24));
    const rd = (o, n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + b[o + i]; return v; };
    const offs = []; for (let i = 0; i < num; i++) offs.push(rd(table + i * offSize, offSize));
    const cache = new Map(), latin = new TextDecoder('latin1');
    function obj(i, depth) {
      if (depth > 300 || i >= offs.length) return null;
      if (cache.has(i)) return cache.get(i);
      const o = offs[i], m = b[o], hi = m >> 4, lo = m & 15;
      const size = () => { if (lo !== 15) return [lo, o + 1]; const n = 1 << (b[o + 1] & 15); return [rd(o + 2, n), o + 2 + n]; };
      let r = null;
      switch (hi) {
        case 0x0: r = lo === 8 ? false : lo === 9 ? true : null; break;
        case 0x1: { const n = 1 << lo; r = n === 8 ? Number(dv.getBigInt64(o + 1)) : rd(o + 1, n); break; }
        case 0x2: r = lo === 2 ? dv.getFloat32(o + 1) : dv.getFloat64(o + 1); break;
        case 0x3: r = new Date((978307200 + dv.getFloat64(o + 1)) * 1000).toISOString(); break;
        case 0x4: { const [n, s] = size(); const d = b.slice(s, s + n); r = isBplist(d) ? safe(() => bplist(d.buffer)) : { $data: d }; break; }
        case 0x5: { const [n, s] = size(); r = latin.decode(b.subarray(s, s + n)); break; }
        case 0x6: { const [n, s] = size(); let str = ''; for (let k = 0; k < n; k++) str += String.fromCharCode(dv.getUint16(s + k * 2)); r = str; break; }
        case 0x8: r = { $uid: rd(o + 1, lo + 1) }; break;
        case 0xA: case 0xC: { const [n, s] = size(); r = []; cache.set(i, r); for (let k = 0; k < n; k++) r.push(obj(rd(s + k * refSize, refSize), depth + 1)); return r; }
        case 0xD: { const [n, s] = size(); r = {}; cache.set(i, r);
          for (let k = 0; k < n; k++) r[String(obj(rd(s + k * refSize, refSize), depth + 1))] = obj(rd(s + (n + k) * refSize, refSize), depth + 1);
          return r; }
      }
      cache.set(i, r); return r;
    }
    return obj(top, 0);
  }
  const isBplist = u8 => u8.length > 40 && String.fromCharCode(...u8.subarray(0, 8)) === 'bplist00';
  function safe(f) { try { return f(); } catch (e) { return null; } }

  // NSKeyedArchiver → árbol normal
  function unarchive(root) {
    if (!root || !root.$objects || !root.$top) return root;
    const objs = root.$objects, memo = new Map();
    function res(v, depth) {
      if (depth > 60) return null;
      if (v && typeof v === 'object' && '$uid' in v) {
        const id = v.$uid; if (memo.has(id)) return memo.get(id);
        const o = objs[id]; if (o === '$null') return null;
        if (o && typeof o === 'object' && !Array.isArray(o)) {
          const cls = o.$class ? objs[o.$class.$uid] : null, cname = cls && cls.$classname;
          if (o['NS.keys'] && o['NS.objects']) {
            const out = {}; memo.set(id, out);
            o['NS.keys'].forEach((k, i) => { out[String(res(k, depth + 1))] = res(o['NS.objects'][i], depth + 1); });
            return out;
          }
          if (o['NS.objects']) { const arr = []; memo.set(id, arr); o['NS.objects'].forEach(x => arr.push(res(x, depth + 1))); return arr; }
          if ('NS.string' in o) return o['NS.string'];
          const out = cname ? { $classname: cname } : {}; memo.set(id, out);
          for (const k in o) if (k !== '$class') out[k] = res(o[k], depth + 1);
          return out;
        }
        memo.set(id, o); return o;
      }
      if (Array.isArray(v)) return v.map(x => res(x, depth + 1));
      if (v && typeof v === 'object' && !v.$data) { const out = {}; for (const k in v) out[k] = res(v[k], depth + 1); return out; }
      return v;
    }
    return res(root.$top.root || Object.values(root.$top)[0], 0);
  }

  /* ---------- XML ---------- */
  function xmlTree(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) return null;
    const root = doc.documentElement;
    if (root.nodeName === 'plist') return plistNode(root.firstElementChild);
    const conv = el => {
      const o = { $tag: el.nodeName };
      for (const a of el.attributes) o[a.name] = numOr(a.value);
      const kids = [...el.children];
      if (!kids.length && el.textContent.trim()) o.$text = numOr(el.textContent.trim());
      kids.forEach(k => {
        const v = conv(k);
        if (!k.children.length && !k.attributes.length && v.$text !== undefined) { o[k.nodeName] = v.$text; return; }
        (o.$children = o.$children || []).push(v);
      });
      return o;
    };
    return conv(root);
  }
  function plistNode(n) {
    if (!n) return null;
    switch (n.nodeName) {
      case 'dict': { const o = {}; const k = [...n.children]; for (let i = 0; i + 1 < k.length; i += 2) o[k[i].textContent] = plistNode(k[i + 1]); return o; }
      case 'array': return [...n.children].map(plistNode);
      case 'integer': case 'real': return +n.textContent;
      case 'true': return true; case 'false': return false;
      default: return n.textContent;
    }
  }
  function numOr(s) { const n = Number(s); return s !== '' && !isNaN(n) ? n : s; }

  /* ---------- Búsqueda genérica de fichas ---------- */
  const XK = ['x', 'posx', 'positionx', 'left', 'cx', 'locx', 'pointx', 'xpos'];
  const YK = ['y', 'posy', 'positiony', 'top', 'cy', 'locy', 'pointy', 'ypos'];
  const isNum = v => (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && isFinite(+v));
  function keyCI(o, names) {
    for (const k in o) { const lk = k.toLowerCase().replace(/[_\-\s]/g, ''); if (names.includes(lk)) return o[k]; }
    return undefined;
  }
  function pointOf(o) {
    let x, y;
    for (const k in o) {
      const lk = k.toLowerCase().replace(/[_\-\s]/g, '');
      if (x === undefined && XK.includes(lk) && isNum(o[k])) x = +o[k];
      else if (y === undefined && YK.includes(lk) && isNum(o[k])) y = +o[k];
    }
    if (x !== undefined && y !== undefined) return [x, y];
    const v = keyCI(o, ['position', 'pos', 'center', 'point', 'location', 'origin', 'coord', 'coordinates', 'nsposition', 'centerpoint']);
    if (v == null) return null;
    if (typeof v === 'string') { const m = v.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if (m) return [+m[1], +m[2]]; }
    else if (Array.isArray(v) && v.length >= 2 && isNum(v[0]) && isNum(v[1])) return [+v[0], +v[1]];
    else if (typeof v === 'object') { const p = pointOf(v); if (p) return p; }
    return null;
  }
  function segOf(o) {
    const g = names => { const v = keyCI(o, names); return isNum(v) ? +v : undefined; };
    const x1 = g(['x1', 'startx', 'fromx']), y1 = g(['y1', 'starty', 'fromy']), x2 = g(['x2', 'endx', 'tox']), y2 = g(['y2', 'endy', 'toy']);
    return [x1, y1, x2, y2].every(v => v !== undefined) ? [[x1, y1], [x2, y2]] : null;
  }
  function describe(o) {
    const s = v => (v == null ? '' : typeof v === 'object' ? (v.$classname || v.name || '') : String(v));
    return {
      team: s(keyCI(o, ['team', 'teamid', 'teamindex', 'side', 'group', 'owner', 'teamtype'])),
      color: s(keyCI(o, ['color', 'colour', 'fillcolor', 'teamcolor', 'shirtcolor', 'backgroundcolor', 'tint'])),
      num: s(keyCI(o, ['number', 'num', 'shirtnumber', 'dorsal', 'jersey', 'jerseynumber'])),
      name: s(keyCI(o, ['name', 'playername', 'title', 'label', 'text'])),
      kind: [s(keyCI(o, ['type', 'kind', 'class', 'classname', '$classname', 'objecttype', 'itemtype', 'category', 'imagename', 'image', 'icon'])), o.$tag || '', o.$classname || ''].join(' ').toLowerCase(),
    };
  }
  function collect(node, out, seen, depth) {
    if (!node || typeof node !== 'object' || depth > 80 || seen.has(node) || node.$data) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(n => collect(n, out, seen, depth + 1)); return; }
    const seg = segOf(node);
    if (seg) { out.push({ seg, ...describe(node) }); return; }
    const p = pointOf(node);
    if (p) { out.push({ p, ...describe(node) }); return; }
    for (const k in node) collect(node[k], out, seen, depth + 1);
    if (node.$children) collect(node.$children, out, seen, depth + 1);
  }
  function countIn(node) { const o = []; collect(node, o, new Set(), 0); return o.filter(c => c.p).length; }
  function findFrames(root) {
    let best = null;
    (function walk(n, depth) {
      if (!n || typeof n !== 'object' || depth > 40 || n.$data) return;
      if (Array.isArray(n) && n.length >= 2 && n.every(e => e && typeof e === 'object' && !Array.isArray(e))) {
        const counts = n.map(countIn), mn = Math.min(...counts), mx = Math.max(...counts);
        if (mn >= 2 && mn / mx >= .5) { const score = n.length * 1000 + mn; if (!best || score > best.score) best = { arr: n, score }; }
      }
      for (const k in n) walk(n[k], depth + 1);
    })(root, 0);
    return best ? best.arr : null;
  }

  function build(root, title, F) {
    const framesSrc = findFrames(root);
    const frameCands = (framesSrc || [root]).map(f => { const o = []; collect(f, o, new Set(), 0); return o; });
    const pts = frameCands.flat().flatMap(c => c.p ? [c.p] : c.seg || []);
    if (frameCands[0].filter(c => c.p).length < 1) return null;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const vertical = (maxY - minY) > (maxX - minX) * 1.15;
    let map;
    if (maxX <= 1.01 && maxY <= 1.01 && minX >= -0.01 && minY >= -0.01) map = ([x, y]) => vertical ? [(1 - y) * F.L, x * F.W] : [x * F.L, y * F.W];
    else {
      const pad = .04, w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
      map = ([x, y]) => {
        const u = (x - minX) / w, v = (y - minY) / h;
        return vertical ? [(pad + (1 - v) * (1 - 2 * pad)) * F.L, (pad + u * (1 - 2 * pad)) * F.W] : [(pad + u * (1 - 2 * pad)) * F.L, (pad + v * (1 - 2 * pad)) * F.W];
      };
    }
    // equipos: por valor de equipo; si no, por color
    const first = frameCands[0].filter(c => c.p);
    const kindOf = c => /ball|bal[oó]n|bola|pelota/.test(c.kind + ' ' + c.name.toLowerCase()) ? 'ball'
      : /cone|cono/.test(c.kind) ? 'cone' : /goal|porter[ií]a|arco/.test(c.kind) ? 'goal' : /pole|pica|stick|flag/.test(c.kind) ? 'pole'
      : /arrow|flecha|line|l[ií]nea|path|text|label|draw/.test(c.kind) ? 'skip' : 'player';
    const keyOf = c => c.team || c.color || '';
    const freq = {}; first.forEach(c => { if (kindOf(c) === 'player') { const k = keyOf(c); freq[k] = (freq[k] || 0) + 1; } });
    const order = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    const teamOf = c => { const i = order.indexOf(keyOf(c)); return i <= 0 ? 'A' : i === 1 ? 'B' : 'C'; };
    const p = { objs: [], frames: [], teamColors: {} };
    const ids = [];
    first.forEach((c, i) => {
      const kind = kindOf(c); if (kind === 'skip') { ids.push(null); return; }
      const o = { id: 'imp' + i + Math.random().toString(36).slice(2, 6), type: kind };
      if (kind === 'player') {
        o.team = teamOf(c); o.gk = /goalkeeper|portero|keeper|\bgk\b/.test(c.kind + ' ' + c.name.toLowerCase());
        o.num = /^\d{1,3}$/.test(c.num) ? c.num : (/^\d{1,3}$/.test(c.name) ? c.name : '');
        o.name = c.name && !/^\d{1,3}$/.test(c.name) && c.name.length < 25 ? c.name : '';
        const col = colorHex(c.color); if (col && !p.teamColors[o.team]) p.teamColors[o.team] = col;
      }
      p.objs.push(o); ids.push(o.id);
    });
    frameCands.forEach((cands, fi) => {
      const pc = cands.filter(c => c.p), pos = {};
      if (fi === 0 || pc.length === first.length) pc.forEach((c, i) => { if (ids[i]) pos[ids[i]] = map(c.p); });
      else {
        const used = new Set(), prev = p.frames[fi - 1].pos;
        ids.forEach(id => {
          if (!id) return; let best = -1, bd = Infinity;
          pc.forEach((c, j) => { if (used.has(j)) return; const q = map(c.p), r = prev[id]; const d = Math.hypot(q[0] - r[0], q[1] - r[1]); if (d < bd) { bd = d; best = j; } });
          if (best >= 0) { used.add(best); pos[id] = map(pc[best].p); } else pos[id] = prev[id];
        });
      }
      const draws = cands.filter(c => c.seg).map(c => {
        const t = /dash|pass|pase|discont/.test(c.kind) ? 'dash' : /zig|dribbl|conduc|wave/.test(c.kind) ? 'zig' : 'arrow';
        return { t, pts: c.seg.map(map), c: t === 'dash' ? '#ffeb3b' : t === 'zig' ? '#ff9800' : '#ffffff' };
      });
      p.frames.push({ pos, draws });
    });
    p.name = title; p.count = p.objs.length;
    return p;
  }
  function colorHex(s) {
    if (!s) return null; s = String(s).trim();
    if (/^#?[0-9a-f]{6}$/i.test(s)) return '#' + s.replace('#', '');
    const m = s.match(/(\d*\.?\d+)[,\s]+(\d*\.?\d+)[,\s]+(\d*\.?\d+)/);
    if (m) { let v = [+m[1], +m[2], +m[3]]; if (v.every(x => x <= 1)) v = v.map(x => x * 255); return '#' + v.map(x => Math.round(Math.min(255, x)).toString(16).padStart(2, '0')).join(''); }
    return null;
  }

  /* ---------- Entrada principal ---------- */
  function parseStructured(u8, name) {
    if (isBplist(u8)) { const t = safe(() => bplist(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength))); return t ? unarchive(t) : null; }
    let text = new TextDecoder().decode(u8).replace(/^﻿/, '').trim();
    if (!text) return null;
    if (text[0] === '{' || text[0] === '[') return safe(() => JSON.parse(text));
    if (text[0] === '<') return safe(() => xmlTree(text));
    return null;
  }
  const extOf = n => (n.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  const isMediaName = n => VIDEO_EXT.test(n) || IMAGE_EXT.test(n);

  async function importFile(file, F) {
    const result = { projects: [], own: [], media: [], notes: [] };
    if (file.type.startsWith('video/') || file.type.startsWith('image/') || isMediaName(file.name)) { result.media.push(file); return result; }
    const buf = await file.arrayBuffer(), u8 = new Uint8Array(buf);
    const base = file.name.replace(/\.[^.]+$/, '');
    const entries = (u8[0] === 0x50 && u8[1] === 0x4b) ? await unzip(buf) : [{ name: file.name, data: u8 }];
    for (const e of entries) {
      if (isMediaName(e.name)) {
        const n = e.name.split('/').pop(); result.media.push(new File([e.data], n, { type: MIME[extOf(n)] || '' })); continue;
      }
      if (e.data.length > 60e6) continue;
      const tree = parseStructured(e.data, e.name); if (!tree) continue;
      // proyectos de esta app
      if (tree.app === 'pizarra-tactica' && Array.isArray(tree.projects)) { result.own.push(...tree.projects); if (tree.teams) result.teams = tree.teams; continue; }
      if (tree.frames && tree.objs) { result.own.push(tree); continue; }
      const title = entries.length > 1 ? base + ' · ' + e.name.split('/').pop().replace(/\.[^.]+$/, '') : base;
      const p = build(tree, title, F);
      if (p && p.count) result.projects.push(p);
    }
    if (!result.projects.length && !result.own.length && !result.media.length)
      result.notes.push(`«${file.name}» no contiene un formato reconocible.`);
    return result;
  }
  return { importFile };
})();
