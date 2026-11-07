'use strict';
/*
  Procesado de videos al subirlos:
  1. Comprueba si el navegador puede reproducirlo (resolución y duración).
  2. Si no se reproduce, o es más grande/pesado que la calidad elegida, lo convierte a MP4 (H.264 + AAC)
     con ffmpeg.wasm. El motor (~30 MB) se descarga de internet la primera vez y queda en caché.
     Si prefieres no depender de internet, copia ffmpeg-core.js y ffmpeg-core.wasm
     (paquete @ffmpeg/core 0.12.6, carpeta dist/umd) en vendor/ffmpeg-core/.
  3. Genera una miniatura.
*/
const VideoTools = (() => {
  const CDN = ['https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd', 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'];
  const LOCAL = 'vendor/ffmpeg-core';

  const WORKER_SRC = `
let core = null;
self.onmessage = async (e) => {
  const { id, type, data } = e.data;
  try {
    if (type === 'load') {
      importScripts(data.coreURL);
      core = await self.createFFmpegCore({ mainScriptUrlOrBlob: data.coreURL + '#' + btoa(JSON.stringify({ wasmURL: data.wasmURL })) });
      core.setLogger(d => self.postMessage({ type: 'log', data: d }));
      core.setProgress(d => self.postMessage({ type: 'progress', data: d }));
      self.postMessage({ id, ok: true });
    } else if (type === 'write') { core.FS.writeFile(data.path, data.bytes); self.postMessage({ id, ok: true }); }
    else if (type === 'exec') {
      if (core.setTimeout) core.setTimeout(-1);
      core.exec(...data.args); const ret = core.ret; if (core.reset) core.reset();
      self.postMessage({ id, ok: true, ret });
    } else if (type === 'read') { const b = core.FS.readFile(data.path); self.postMessage({ id, ok: true, bytes: b }, [b.buffer]); }
    else if (type === 'rm') { try { core.FS.unlink(data.path); } catch (_) {} self.postMessage({ id, ok: true }); }
  } catch (err) { self.postMessage({ id, ok: false, error: String((err && err.message) || err) }); }
};`;

  let worker = null, loading = null, seq = 0, onProg = null, lastLog = '';
  const pending = new Map();
  function call(type, data, transfer) {
    return new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); worker.postMessage({ id, type, data }, transfer || []); });
  }
  async function blobURL(url, type) {
    const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
    return URL.createObjectURL(new Blob([await r.arrayBuffer()], { type }));
  }
  async function exists(url) { try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch (e) { return false; } }
  function getFF(onStatus) {
    if (loading) return loading;
    loading = (async () => {
      onStatus && onStatus('Descargando el conversor (solo la primera vez)…');
      const bases = (await exists(LOCAL + '/ffmpeg-core.js')) ? [LOCAL, ...CDN] : CDN;
      let coreURL, wasmURL, lastErr;
      for (const b of bases) {
        try { coreURL = await blobURL(b + '/ffmpeg-core.js', 'text/javascript'); wasmURL = await blobURL(b + '/ffmpeg-core.wasm', 'application/wasm'); break; }
        catch (e) { lastErr = e; coreURL = wasmURL = null; }
      }
      if (!coreURL) throw new Error('No se pudo descargar el conversor (' + (lastErr && lastErr.message) + ')');
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
      worker.onmessage = e => {
        const m = e.data;
        if (m.type === 'progress') { if (onProg) onProg(Math.max(0, Math.min(1, m.data.progress || 0))); return; }
        if (m.type === 'log') { lastLog = m.data && m.data.message || ''; return; }
        const p = pending.get(m.id); if (!p) return; pending.delete(m.id);
        m.ok ? p.res(m) : p.rej(new Error(m.error));
      };
      await call('load', { coreURL, wasmURL });
      return true;
    })();
    loading.catch(() => { loading = null; if (worker) { worker.terminate(); worker = null; } });
    return loading;
  }

  function probe(blob) {
    return new Promise(res => {
      const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      const u = URL.createObjectURL(blob); let done = false;
      const fin = r => { if (done) return; done = true; v.removeAttribute('src'); v.load(); URL.revokeObjectURL(u); res(r); };
      v.onloadedmetadata = () => {
        if (v.videoWidth > 0) fin({ ok: true, w: v.videoWidth, h: v.videoHeight, dur: v.duration });
        else setTimeout(() => fin({ ok: v.videoWidth > 0, w: v.videoWidth, h: v.videoHeight, dur: v.duration }), 600);
      };
      v.onerror = () => fin({ ok: false });
      setTimeout(() => fin({ ok: false }), 12000);
      v.src = u;
    });
  }
  function thumbnail(blob) {
    return new Promise(res => {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      const u = URL.createObjectURL(blob); let done = false;
      const fin = r => { if (done) return; done = true; URL.revokeObjectURL(u); res(r); };
      v.onloadedmetadata = () => { v.currentTime = Math.min(1.5, (v.duration || 2) * .2); };
      v.onseeked = () => {
        try {
          const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d');
          x.fillStyle = '#000'; x.fillRect(0, 0, 320, 180);
          const s = Math.min(320 / v.videoWidth, 180 / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
          x.drawImage(v, (320 - w) / 2, (180 - h) / 2, w, h); fin(c.toDataURL('image/jpeg', .72));
        } catch (e) { fin(null); }
      };
      v.onerror = () => fin(null); setTimeout(() => fin(null), 10000);
      v.src = u;
    });
  }
  function imageThumb(blob) {
    return new Promise(res => {
      const img = new Image(), u = URL.createObjectURL(blob);
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d');
        x.fillStyle = '#000'; x.fillRect(0, 0, 320, 180);
        const s = Math.min(320 / img.width, 180 / img.height); x.drawImage(img, (320 - img.width * s) / 2, (180 - img.height * s) / 2, img.width * s, img.height * s);
        URL.revokeObjectURL(u); res({ thumb: c.toDataURL('image/jpeg', .72), w: img.width, h: img.height });
      };
      img.onerror = () => { URL.revokeObjectURL(u); res({ thumb: null }); };
      img.src = u;
    });
  }

  async function convert(file, target, onStatus, onProgress) {
    await getFF(onStatus);
    const ext = ((file.name || '').split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
    const inName = 'in.' + ext, outName = 'out.mp4';
    onStatus && onStatus('Preparando…');
    const bytes = new Uint8Array(await file.arrayBuffer());
    await call('write', { path: inName, bytes }, [bytes.buffer]);
    onStatus && onStatus('Convirtiendo a MP4…'); onProg = onProgress;
    const args = ['-i', inName, '-map', '0:v:0', '-map', '0:a:0?', '-vf', `scale=-2:'trunc(min(${target},ih)/2)*2'`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outName];
    let r;
    try { r = await call('exec', { args }); } finally { onProg = null; }
    if (r.ret !== 0) { await call('rm', { path: inName }); throw new Error('El conversor no pudo leer este archivo' + (lastLog ? ' (' + lastLog.slice(0, 80) + ')' : '')); }
    const out = await call('read', { path: outName });
    await call('rm', { path: inName }); await call('rm', { path: outName });
    return new Blob([out.bytes], { type: 'video/mp4' });
  }

  /* Procesa un archivo para la biblioteca. Devuelve {kind, blob, type, w, h, dur, thumb, converted, note} */
  async function process(file, quality, onStatus, onProgress) {
    if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name)) {
      onStatus && onStatus('Guardando imagen…');
      const t = await imageThumb(file);
      return { kind: 'image', blob: file, type: file.type || 'image/jpeg', ...t };
    }
    onStatus && onStatus('Analizando…');
    const p = await probe(file);
    const target = quality === 'original' ? null : +quality;
    const bitrate = p.ok && p.dur ? file.size * 8 / p.dur : 0;
    const isMp4 = /mp4|m4v/i.test(file.type) || /\.(mp4|m4v)$/i.test(file.name);
    let need = !p.ok;
    if (p.ok && target) need = p.h > target * 1.1 || !isMp4 || bitrate > 9e6;
    let blob = file, converted = false, note = '';
    if (need) {
      if (file.size > 1.6e9) {
        if (!p.ok) throw new Error('Archivo demasiado grande (más de 1,6 GB) para convertirlo en el navegador.');
        note = 'Muy grande para convertir; se guardó el original.';
      } else {
        try { blob = await convert(file, target || 720, onStatus, onProgress); converted = true; }
        catch (e) {
          if (!p.ok) throw new Error('Formato no compatible y no se pudo convertir: ' + e.message);
          note = 'No se pudo convertir; se guardó el original.';
        }
      }
    }
    onStatus && onStatus('Creando miniatura…');
    const info = converted ? await probe(blob) : p;
    const thumb = await thumbnail(blob);
    return { kind: 'file', blob, type: blob.type || file.type || 'video/mp4', w: info.w, h: info.h, dur: info.dur, thumb, converted, note };
  }
  return { process, probe, thumbnail };
})();
