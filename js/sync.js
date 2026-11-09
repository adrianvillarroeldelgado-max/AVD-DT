'use strict';
/*
  Sincronización entre dispositivos con Firebase (Auth con correo y contraseña + Firestore).
  - Cada registro local (IndexedDB) se refleja en users/{uid}/data/{almacén~id} como texto JSON.
  - Cada cambio local se marca con _ts y se sube en lote unos segundos después (también sin conexión: queda en cola).
  - Los cambios de otros dispositivos llegan en tiempo real; gana la versión más reciente (_ts).
  - Los videos no se sincronizan (son demasiado grandes): se quedan en cada dispositivo.
*/
const SYNC_STORES = ['projects', 'teams', 'spaces', 'sessions', 'players', 'plans', 'evals', 'matches', 'wellness'];
const SYNC_MAX = 950000; // límite de Firestore: 1 MiB por documento
const SYNC_SDK = 'https://www.gstatic.com/firebasejs/11.0.2/';
const SY = { fb: null, auth: null, db: null, user: null, unsub: null, ready: false, applying: 0, timer: null, remoteTs: {}, status: 'off', last: 0, skipped: 0, err: '' };
const syncKey = (s, id) => `${s}~${id}`;
const syncLS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
function syncQueue() { try { return new Set(JSON.parse(syncLS('pt-sync-queue') || '[]')); } catch (e) { return new Set(); } }
function syncSaveQueue(q) { syncLS('pt-sync-queue', JSON.stringify([...q])); }

/* ---------- Marcar cambios locales (envoltorio de DB) ---------- */
const DB_RAW = { put: DB.put, get: DB.get, all: DB.all, del: DB.del, clear: DB.clear };
DB.put = async (s, obj) => {
  const track = SYNC_STORES.includes(s) && !SY.applying && obj && obj.id;
  if (track) obj._ts = Date.now();
  const r = await DB_RAW.put(s, obj);
  if (track) syncMark(s, obj.id);
  return r;
};
DB.del = async (s, id) => {
  const r = await DB_RAW.del(s, id);
  if (SYNC_STORES.includes(s) && !SY.applying) syncMark(s, id);
  return r;
};
function syncMark(s, id) {
  if (!FIREBASE_CONFIG) return;
  const q = syncQueue(); q.add(syncKey(s, id)); syncSaveQueue(q);
  syncSchedule();
}
function syncSchedule(ms = 3000) { clearTimeout(SY.timer); SY.timer = setTimeout(syncFlush, ms); }

/* ---------- Subir la cola ---------- */
async function syncFlush() {
  if (!SY.user || !SY.ready || !navigator.onLine) { syncUI(); return; }
  const q = syncQueue(); if (!q.size) { syncUI(); return; }
  const { doc, writeBatch, serverTimestamp } = SY.fs;
  const keys = [...q].slice(0, 400);
  try {
    SY.status = 'busy'; syncUI();
    const batch = writeBatch(SY.db); let n = 0;
    for (const key of keys) {
      const i = key.indexOf('~'), s = key.slice(0, i), id = key.slice(i + 1);
      const rec = await DB_RAW.get(s, id), ref = doc(SY.db, 'users', SY.user.uid, 'data', key);
      if (rec) {
        const ts = rec._ts || rec.updated || rec.created || 1;
        if ((SY.remoteTs[key] || 0) > ts) continue; // hay una versión más nueva en la nube: gana esa
        const v = JSON.stringify(rec);
        if (v.length > SYNC_MAX) { SY.skipped++; continue; }
        batch.set(ref, { s, ts, v, del: false, st: serverTimestamp() }); SY.remoteTs[key] = ts;
      } else {
        const ts = Date.now();
        batch.set(ref, { s, ts, v: '', del: true, st: serverTimestamp() }); SY.remoteTs[key] = ts;
      }
      n++;
    }
    if (n) await batch.commit();
    const rest = syncQueue(); keys.forEach(k => rest.delete(k)); syncSaveQueue(rest);
    SY.last = Date.now(); SY.status = 'ok'; SY.err = '';
    if (rest.size) syncSchedule(500);
  } catch (e) {
    console.warn('sync push', e); SY.status = 'error'; SY.err = e.code || e.message; syncSchedule(30000);
  }
  syncUI();
}

/* ---------- Recibir cambios ---------- */
async function syncApply(changes) {
  const touched = new Set(); let reloadP = null;
  SY.applying++;
  try {
    for (const d of changes) {
      const key = d.id, i = key.indexOf('~'), s = key.slice(0, i), id = key.slice(i + 1), x = d.data;
      if (!SYNC_STORES.includes(s)) continue;
      SY.remoteTs[key] = Math.max(SY.remoteTs[key] || 0, x.ts || 0);
      const local = await DB_RAW.get(s, id), lts = local ? (local._ts || local.updated || local.created || 0) : 0;
      if (x.del) { if (local && lts <= x.ts) { await DB_RAW.del(s, id); touched.add(s); } continue; }
      if (local && lts >= x.ts) continue;
      let rec; try { rec = JSON.parse(x.v); } catch (e) { continue; }
      rec._ts = x.ts; await DB_RAW.put(s, rec); touched.add(s);
      if (s === 'projects' && typeof P !== 'undefined' && P && P.id === id) reloadP = rec;
    }
  } finally { SY.applying--; }
  if (touched.size) syncRefresh(touched, reloadP);
}
async function syncRefresh(touched, reloadP) {
  try {
    if (touched.has('players') && typeof loadSquad === 'function') await loadSquad();
    if (touched.has('matches') && typeof loadMatches === 'function') await loadMatches();
    if (reloadP && typeof loadProject === 'function') loadProject(normalize(reloadP));
    if (!$('#home').hidden && typeof renderHome === 'function') renderHome();
    if ($('#dlgSessions').open && typeof renderSessions === 'function') renderSessions();
    if ($('#dlgSquad').open && typeof renderSquad === 'function') renderSquad();
    if ($('#dlgProjects').open && typeof renderProjects === 'function') renderProjects();
  } catch (e) { console.warn(e); }
}
function syncListen() {
  const { collection, query, where, onSnapshot, Timestamp } = SY.fs;
  if (SY.unsub) SY.unsub();
  const uid = SY.user.uid, since = +(syncLS('pt-sync-pull-' + uid) || 0);
  const col = collection(SY.db, 'users', uid, 'data');
  const q = since ? query(col, where('st', '>', Timestamp.fromMillis(since))) : col;
  SY.unsub = onSnapshot(q, { includeMetadataChanges: false }, async snap => {
    const ch = [];
    let maxSt = +(syncLS('pt-sync-pull-' + uid) || 0);
    snap.docChanges().forEach(c => {
      if (c.type === 'removed') return;
      const data = c.doc.data({ serverTimestamps: 'estimate' });
      ch.push({ id: c.doc.id, data });
      if (data.st && !c.doc.metadata.hasPendingWrites) maxSt = Math.max(maxSt, data.st.toMillis());
    });
    if (ch.length) await syncApply(ch);
    syncLS('pt-sync-pull-' + uid, String(maxSt));
    if (!SY.ready) {
      SY.ready = true;
      // Primera vez en este dispositivo con esta cuenta: subir todo lo que ya había aquí
      if (!syncLS('pt-sync-seeded-' + uid)) {
        const qq = syncQueue();
        for (const s of SYNC_STORES) (await DB_RAW.all(s)).forEach(r => r && r.id && qq.add(syncKey(s, r.id)));
        syncSaveQueue(qq); syncLS('pt-sync-seeded-' + uid, '1');
      }
      syncSchedule(300);
    }
    SY.last = Date.now(); if (SY.status !== 'busy') SY.status = 'ok'; syncUI();
  }, e => { console.warn('sync listen', e); SY.status = 'error'; SY.err = e.code || e.message; syncUI(); });
}

/* ---------- Arranque y sesión ---------- */
async function syncLoadSDK() {
  if (SY.fb) return true;
  try {
    const [app, auth, fs] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => import(SYNC_SDK + f)));
    SY.fb = app.initializeApp(FIREBASE_CONFIG); SY.authM = auth; SY.fs = fs;
    SY.auth = auth.getAuth(SY.fb); SY.db = fs.getFirestore(SY.fb);
    try { await auth.setPersistence(SY.auth, auth.indexedDBLocalPersistence); } catch (e) {}
    auth.onAuthStateChanged(SY.auth, u => {
      SY.user = u; SY.ready = false;
      if (u) { SY.status = 'busy'; syncListen(); }
      else { if (SY.unsub) SY.unsub(); SY.unsub = null; SY.status = 'out'; }
      syncUI();
    });
    return true;
  } catch (e) {
    console.warn('sync sdk', e); SY.status = 'error'; SY.err = 'Sin conexión con Firebase'; syncUI(); return false;
  }
}
const SYNC_ERR = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.', 'auth/wrong-password': 'Contraseña incorrecta.', 'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo: usa «Entrar».', 'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El correo no es válido.', 'auth/network-request-failed': 'Sin conexión a internet.', 'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/operation-not-allowed': 'Falta activar «Correo electrónico/contraseña» en Firebase › Authentication.', 'auth/unauthorized-domain': 'Falta añadir este dominio en Firebase › Authentication › Dominios autorizados.',
  'permission-denied': 'Firestore rechazó el acceso: revisa las reglas de seguridad.',
};
const syncMsg = e => SYNC_ERR[e && (e.code || e)] || (e && (e.message || e)) || 'Error';
async function syncSignIn(create) {
  const email = $('#syEmail').value.trim(), pass = $('#syPass').value;
  if (!email || !pass) { toast('Escribe tu correo y una contraseña'); return; }
  if (!await syncLoadSDK()) return;
  try {
    const a = SY.authM;
    if (create) await a.createUserWithEmailAndPassword(SY.auth, email, pass);
    else await a.signInWithEmailAndPassword(SY.auth, email, pass);
    $('#syPass').value = ''; toast(create ? 'Cuenta creada: tus datos se están subiendo' : 'Sesión iniciada: sincronizando…', 3500);
  } catch (e) { toast(syncMsg(e), 5000); }
}
async function syncReset() {
  const email = $('#syEmail').value.trim(); if (!email) { toast('Escribe tu correo arriba'); return; }
  if (!await syncLoadSDK()) return;
  try { await SY.authM.sendPasswordResetEmail(SY.auth, email); toast('Te enviamos un correo para cambiar la contraseña', 4500); } catch (e) { toast(syncMsg(e), 5000); }
}
async function syncSignOut() {
  if (!SY.user) return;
  if (!await confirmBox('¿Cerrar la sesión de sincronización? Los datos se quedan en este dispositivo, pero dejarán de sincronizarse.', 'Cerrar sesión')) return;
  await syncFlush(); await SY.authM.signOut(SY.auth); toast('Sesión cerrada');
}

/* ---------- Interfaz ---------- */
function syncUI() {
  const box = document.getElementById('syncBox'); if (!box) return;
  const q = syncQueue().size, chip = document.getElementById('hmSync');
  let txt, cls;
  if (!FIREBASE_CONFIG) { txt = 'Sincronización no configurada'; cls = 'off'; }
  else if (!SY.user) { txt = SY.status === 'error' ? 'Sin conexión con la nube' : 'Sin sincronizar · inicia sesión'; cls = 'off'; }
  else if (SY.status === 'error') { txt = 'Error al sincronizar: ' + syncMsg(SY.err); cls = 'err'; }
  else if (!navigator.onLine) { txt = `Sin conexión · ${q} cambio${q === 1 ? '' : 's'} pendiente${q === 1 ? '' : 's'}`; cls = 'wait'; }
  else if (SY.status === 'busy' || q) { txt = 'Sincronizando…'; cls = 'wait'; }
  else { txt = 'Sincronizado' + (SY.last ? ' · ' + new Date(SY.last).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''); cls = 'ok'; }
  if (chip) { chip.hidden = !FIREBASE_CONFIG; chip.className = 'sychip sy-' + cls; chip.textContent = '☁ ' + (cls === 'ok' ? 'Sincronizado' : cls === 'wait' ? 'Sincronizando' : cls === 'err' ? 'Error de sincronización' : 'Sin sincronizar'); }
  $('#syState').className = 'systate sy-' + cls; $('#syState').textContent = txt;
  $('#syNoCfg').hidden = !!FIREBASE_CONFIG;
  $('#syOut').hidden = !FIREBASE_CONFIG || !!SY.user;
  $('#syIn').hidden = !SY.user;
  if (SY.user) $('#syWho').textContent = SY.user.email;
  $('#sySkip').hidden = !SY.skipped; $('#sySkip').textContent = SY.skipped ? `${SY.skipped} elemento(s) superan 1 MB y no se sincronizan (por ejemplo, una táctica con una imagen muy grande).` : '';
}
function syncInit() {
  $('#syLogin').onclick = () => syncSignIn(false);
  $('#syCreate').onclick = () => syncSignIn(true);
  $('#syForgot').onclick = syncReset;
  $('#syLogout').onclick = syncSignOut;
  $('#syNow').onclick = () => { syncSchedule(0); toast('Sincronizando…'); };
  const chip = document.getElementById('hmSync'); if (chip) chip.onclick = () => { $('#dlgSettings').showModal(); setTimeout(() => $('#syncBox').scrollIntoView({ block: 'center' }), 50); };
  window.addEventListener('online', () => { syncUI(); syncSchedule(500); });
  window.addEventListener('offline', syncUI);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncFlush(); });
  syncUI();
  if (FIREBASE_CONFIG) syncLoadSDK();
}
window.addEventListener('load', syncInit);
