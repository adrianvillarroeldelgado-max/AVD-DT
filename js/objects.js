'use strict';
/*
  Biblioteca de material de entrenamiento.
  Tamaños en metros a escala real (con un mínimo en pantalla para que se vean).
  colorable: se puede elegir el color · rot: se puede girar · len: largo aproximado (m) para iconos
*/
const OBJ = {
  disc:       { name: 'Platillo', cat: 'Marcadores', color: '#ffd600', colorable: true, len: .6 },
  cone:       { name: 'Cono', cat: 'Marcadores', color: '#ff6d00', colorable: true, len: .8 },
  tallcone:   { name: 'Cono alto', cat: 'Marcadores', color: '#ff6d00', colorable: true, len: .9 },
  pole:       { name: 'Pica / estaca', cat: 'Marcadores', color: '#ffd600', colorable: true, len: 1.2 },
  flag:       { name: 'Banderín', cat: 'Marcadores', color: '#ff1744', colorable: true, len: 1.2 },
  hoop:       { name: 'Aro', cat: 'Coordinación', color: '#2979ff', colorable: true, len: 1 },
  ladder:     { name: 'Escalera', cat: 'Coordinación', color: '#ffd600', colorable: true, rot: true, len: 4.2 },
  hurdle:     { name: 'Valla', cat: 'Coordinación', color: '#ff6d00', colorable: true, rot: true, len: 1.2 },
  minihurdle: { name: 'Minivalla', cat: 'Coordinación', color: '#ffd600', colorable: true, rot: true, len: .8 },
  dummy:      { name: 'Maniquí', cat: 'Obstáculos', color: '#1e88e5', colorable: true, rot: true, len: .8 },
  wall:       { name: 'Barrera de 3', cat: 'Obstáculos', color: '#1e88e5', colorable: true, rot: true, len: 2 },
  rebounder:  { name: 'Rebotador', cat: 'Obstáculos', rot: true, len: 1.4 },
  goalpop:    { name: 'Pop-up 1,2 m', cat: 'Porterías', rot: true, len: 1.3, gw: 1.2, gd: .8 },
  goal:       { name: 'Miniportería 2 × 1 m', cat: 'Porterías', rot: true, len: 2.1, gw: 2, gd: 1 },
  goal3:      { name: 'Sala 3 × 2 m', cat: 'Porterías', rot: true, len: 3.1, gw: 3, gd: 1 },
  goal7:      { name: 'F7 5 × 2 m', cat: 'Porterías', rot: true, len: 5.2, gw: 5, gd: 1.5 },
  goal9:      { name: 'F9 6 × 2 m', cat: 'Porterías', rot: true, len: 6.2, gw: 6, gd: 1.5 },
  goal11:     { name: 'F11 7,32 × 2,44 m', cat: 'Porterías', rot: true, len: 7.6, gw: 7.32, gd: 2 },
  ball:       { name: 'Balón', cat: 'Balones', len: .6 },
  ballbag:    { name: 'Saco de balones', cat: 'Balones', len: 1.2 },
  bib:        { name: 'Petos', cat: 'Material', color: '#76ff03', colorable: true, len: .9 },
};
const OBJ_CATS = ['Porterías', 'Marcadores', 'Balones', 'Coordinación', 'Obstáculos', 'Material'];
function goalDims(o, R, s) {
  const g = OBJ[o.type] || OBJ.goal;
  return [Math.max(g.gw * s, R * (1.4 + g.gw * .25)), Math.max(g.gd * s, R * (.7 + g.gd * .2))];
}
const OBJ_COLORS = ['#ffd600', '#ff6d00', '#ff1744', '#2979ff', '#00c853', '#ffffff', '#e040fb', '#212121'];

/* Dibuja un objeto de material. s = píxeles por metro, R = radio de jugador, ang = rotación en pantalla */
function drawEquipment(c, o, x, y, R, s, ang) {
  const col = o.c || (OBJ[o.type] && OBJ[o.type].color) || '#ffd600';
  const m = v => v * s;
  c.save(); c.translate(x, y); if (ang) c.rotate(ang);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const shadow = () => { c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 3; c.shadowOffsetY = 1; };
  const noShadow = () => { c.shadowColor = 'transparent'; };
  switch (o.type) {
    case 'disc': {
      const r = Math.max(R * .34, 4.5);
      shadow(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); noShadow();
      c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
      c.beginPath(); c.arc(0, 0, r * .38, 0, Math.PI * 2); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
      break;
    }
    case 'cone': {
      const r = R * .7; shadow();
      c.beginPath(); c.moveTo(0, -r); c.lineTo(r * .85, r * .6); c.lineTo(-r * .85, r * .6); c.closePath();
      c.fillStyle = col; c.fill(); noShadow(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
      break;
    }
    case 'tallcone': {
      const r = R * .75; shadow();
      c.beginPath(); c.moveTo(0, -r * 1.25); c.lineTo(r * .7, r * .6); c.lineTo(-r * .7, r * .6); c.closePath();
      c.fillStyle = col; c.fill(); noShadow(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#fff'; c.fillRect(-r * .38, -r * .2, r * .76, r * .22);
      c.fillStyle = '#222'; c.fillRect(-r * .95, r * .6, r * 1.9, r * .16);
      break;
    }
    case 'pole': {
      c.strokeStyle = col; c.lineWidth = Math.max(3, R * .22);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R * 1.5); c.stroke();
      c.beginPath(); c.arc(0, 0, R * .3, 0, Math.PI * 2); c.fillStyle = '#333'; c.fill();
      break;
    }
    case 'flag': {
      c.strokeStyle = '#eee'; c.lineWidth = Math.max(2, R * .14);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R * 1.6); c.stroke();
      c.beginPath(); c.moveTo(0, -R * 1.6); c.lineTo(R * .95, -R * 1.3); c.lineTo(0, -R * 1.0); c.closePath(); c.fillStyle = col; c.fill();
      c.beginPath(); c.arc(0, 0, R * .25, 0, Math.PI * 2); c.fillStyle = '#333'; c.fill();
      break;
    }
    case 'hoop': {
      const r = Math.max(m(.4), R * .6);
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.lineWidth = Math.max(2.5, r * .16); c.strokeStyle = col; shadow(); c.stroke();
      break;
    }
    case 'ladder': {
      const L = Math.max(m(4), R * 4), w = Math.max(m(.5), R * .7), n = 9;
      c.strokeStyle = col; c.lineWidth = Math.max(2, w * .1); shadow();
      c.beginPath(); c.moveTo(-w / 2, -L / 2); c.lineTo(-w / 2, L / 2); c.moveTo(w / 2, -L / 2); c.lineTo(w / 2, L / 2);
      for (let i = 0; i <= n; i++) { const yy = -L / 2 + L * i / n; c.moveTo(-w / 2, yy); c.lineTo(w / 2, yy); }
      c.stroke(); break;
    }
    case 'hurdle': case 'minihurdle': {
      const L = o.type === 'hurdle' ? Math.max(m(1), R * 1.3) : Math.max(m(.5), R * .9), f = L * .18;
      c.strokeStyle = col; c.lineWidth = Math.max(3, R * .22); shadow();
      c.beginPath(); c.moveTo(0, -L / 2); c.lineTo(0, L / 2); c.stroke(); noShadow();
      c.lineWidth = Math.max(2, R * .14); c.strokeStyle = '#ddd';
      c.beginPath(); c.moveTo(-f, -L / 2); c.lineTo(f, -L / 2); c.moveTo(-f, L / 2); c.lineTo(f, L / 2); c.stroke();
      break;
    }
    case 'dummy': drawDummy(c, 0, 0, Math.max(m(.55), R * 1.1), col); break;
    case 'wall': {
      const w = Math.max(m(.55), R * .95), gap = w * 1.05;
      [-gap, 0, gap].forEach(yy => drawDummy(c, 0, yy, w, col, true));
      break;
    }
    case 'rebounder': {
      const L = Math.max(m(1.2), R * 1.6), d = L * .22; shadow();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-d / 2, -L / 2, d, L); noShadow();
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(-d / 2, -L / 2, d, L);
      c.lineWidth = 1; c.beginPath(); for (let i = 1; i < 6; i++) { const yy = -L / 2 + L * i / 6; c.moveTo(-d / 2, yy); c.lineTo(d / 2, yy); } c.stroke();
      c.fillStyle = '#ff1744'; c.fillRect(-d / 2 - 2, -L / 2, 3, L);
      break;
    }
    case 'goalpop': case 'goal': case 'goal3': case 'goal7': case 'goal9': case 'goal11': {
      const [W, D] = goalDims(o, R, s);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-D / 2, -W / 2, D, W);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath();
      const n = Math.max(4, Math.min(10, Math.round(W / 6)));
      for (let i = 1; i < n; i++) { const yy = -W / 2 + i * W / n; c.moveTo(-D / 2, yy); c.lineTo(D / 2, yy); }
      c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(D / 2, -W / 2); c.lineTo(-D / 2, -W / 2); c.lineTo(-D / 2, W / 2); c.lineTo(D / 2, W / 2); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(D / 2, -W / 2); c.lineTo(D / 2, W / 2); c.stroke();
      break;
    }
    case 'ball': {
      const r = R * .55;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = '#111'; c.stroke();
      c.beginPath();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; const px = Math.cos(a) * r * .42, py = Math.sin(a) * r * .42; i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.closePath(); c.fillStyle = '#111'; c.fill();
      break;
    }
    case 'ballbag': {
      const r = R * .38;
      c.beginPath(); c.arc(0, 0, r * 2.4, 0, Math.PI * 2); c.fillStyle = 'rgba(30,30,30,.55)'; c.fill();
      [[-1, -.6], [1, -.6], [0, .9], [-1.1, .9], [1.1, .9], [0, -1.6]].forEach(([a, b]) => {
        c.beginPath(); c.arc(a * r * 1.05, b * r * .95, r, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#111'; c.stroke();
      });
      break;
    }
    case 'bib': {
      const w = R * 1.1, h = R * 1.2; shadow();
      [[-.18, -.12], [0, 0], [.18, .12]].forEach(([dx, dy]) => {
        c.save(); c.translate(dx * w, dy * h);
        c.beginPath(); c.moveTo(-w * .5, -h * .45); c.lineTo(-w * .2, -h * .55); c.lineTo(w * .2, -h * .55); c.lineTo(w * .5, -h * .45);
        c.lineTo(w * .4, -h * .15); c.lineTo(w * .3, -h * .2); c.lineTo(w * .3, h * .5); c.lineTo(-w * .3, h * .5); c.lineTo(-w * .3, -h * .2); c.lineTo(-w * .4, -h * .15); c.closePath();
        c.fillStyle = col; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke(); c.restore();
      });
      break;
    }
  }
  c.restore();
}
function drawDummy(c, x, y, w, col, small) {
  c.save(); c.translate(x, y);
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 3;
  c.beginPath(); c.ellipse(0, 0, w * .32, w * .5, 0, 0, Math.PI * 2); c.fillStyle = col; c.fill();
  c.shadowColor = 'transparent'; c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke();
  c.beginPath(); c.arc(w * .08, 0, w * .2, 0, Math.PI * 2); c.fillStyle = '#f0c8a0'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.stroke();
  c.restore();
}
/* Radio aproximado en pantalla para seleccionar el objeto con el dedo */
function equipmentExtent(o, R, s) {
  switch (o.type) {
    case 'ladder': return Math.max(s * 2, R * 2);
    case 'goalpop': case 'goal': case 'goal3': case 'goal7': case 'goal9': case 'goal11': return Math.max(goalDims(o, R, s)[0] / 2, 16);
    case 'wall': return Math.max(s * 1, R * 1.5);
    case 'hoop': return Math.max(s * .45, R * .7, 14);
    case 'disc': return Math.max(R * .6, 13);
    case 'ball': return Math.max(R * .7, 14);
    default: return Math.max(R * 1.1, 16);
  }
}
