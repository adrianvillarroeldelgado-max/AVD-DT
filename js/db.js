'use strict';
/* Almacenamiento local (IndexedDB): tácticas, videos, equipos, espacios, sesiones, plantel, planes, evaluaciones, partidos y bienestar. */
const DB = (() => {
  let opening = null;
  function open() {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open('pizarra-tactica', 5);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const s of ['projects', 'videos', 'teams', 'spaces', 'sessions', 'players', 'plans', 'evals', 'matches', 'wellness'])
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return opening;
  }
  async function run(store, mode, fn) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(r ? r.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  return {
    put: (s, obj) => run(s, 'readwrite', st => st.put(obj)),
    get: (s, id) => run(s, 'readonly', st => st.get(id)),
    all: s => run(s, 'readonly', st => st.getAll()),
    del: (s, id) => run(s, 'readwrite', st => st.delete(id)),
    clear: s => run(s, 'readwrite', st => st.clear()),
  };
})();
