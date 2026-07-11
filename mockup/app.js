/* ============================================================
   Padel Booking — Shared Mockup JS
   ============================================================ */

// ---- theme (persist) ----
const SW = document.getElementById('themeSwitch');
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  if (SW) SW.classList.toggle('on', dark);
}
if (SW) {
  applyTheme(localStorage.getItem('pb-theme') === 'dark');
  SW.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    applyTheme(dark);
    localStorage.setItem('pb-theme', dark ? 'dark' : 'light');
  });
}

// ---- scroll progress ----
const bar = document.getElementById('bar');
addEventListener('scroll', () => {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
});

// ---- reveal on scroll ----
const io = new IntersectionObserver((es) => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---- count up ----
const co = new IntersectionObserver((es) => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, target = +el.dataset.count, dur = 1500, t0 = performance.now();
  const step = (n) => {
    const p = Math.min((n - t0) / dur, 1);
    el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target).toLocaleString('id-ID');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step); co.unobserve(el);
}), { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(c => co.observe(c));

// ---- mouse trail ----
const trail = document.getElementById('trail');
if (trail) {
  addEventListener('mousemove', (e) => { trail.style.left = e.clientX + 'px'; trail.style.top = e.clientY + 'px'; });
  addEventListener('mousedown', () => { trail.style.width = '42px'; trail.style.height = '42px'; trail.style.background = 'rgba(34,197,94,.15)'; });
  addEventListener('mouseup', () => { trail.style.width = '26px'; trail.style.height = '26px'; trail.style.background = 'transparent'; });
}

// ---- toast helper ----
function toast(msg, icon = 'check') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast';
    t.className = 'bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold';
    document.body.appendChild(t);
  }
  t.innerHTML = `<i class="ti ti-${icon} text-brand-400"></i> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---- mobile sidebar toggle ----
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sidebar]');
  if (btn) {
    const side = document.querySelector('.side');
    if (side) side.classList.toggle('hidden-side');
  }
});
