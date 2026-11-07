'use strict';
/* Marca AVD · D.T Fútbol: tema claro / oscuro compartido con las demás apps AVD (clave «avd_theme») */
const AVD_ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};
function avdMode() { try { return localStorage.getItem('avd_theme') || 'auto'; } catch (e) { return 'auto'; } }
function avdResolve(mode) { return mode === 'claro' ? 'light' : mode === 'oscuro' ? 'dark' : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }
function avdApply(mode) {
  const t = avdResolve(mode);
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0a0a0a' : '#0B1F3A';
  document.querySelectorAll('.thb').forEach(b => { b.innerHTML = AVD_ICONS[t === 'dark' ? 'sun' : 'moon']; const l = t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'; b.setAttribute('aria-label', l); b.title = l; });
  const s = document.getElementById('setTheme'); if (s) s.value = mode;
}
function avdSet(mode) { try { localStorage.setItem('avd_theme', mode); } catch (e) {} avdApply(mode); }
document.querySelectorAll('.thb').forEach(b => b.addEventListener('click', () => avdSet(document.documentElement.getAttribute('data-theme') === 'dark' ? 'claro' : 'oscuro')));
$('#setTheme').onchange = e => avdSet(e.target.value);
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (avdMode() === 'auto') avdApply('auto'); }); } catch (e) {}
$('#btnBrand').onclick = () => showHome();
avdApply(avdMode());
