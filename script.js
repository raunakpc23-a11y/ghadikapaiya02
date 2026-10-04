'use strict';
/* =====================================================================
   Ghadi Ka Pahiya — core app
   Files: script.js (core, daily/monthly/focus/syllabus/settings)
          analytics.js (analytics view)   admin.js (admin panel)
   ===================================================================== */

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const today = () => fmtDate(new Date());
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
let _uid = 0;
const uid = () => Date.now().toString(36) + (_uid++).toString(36) + Math.random().toString(36).slice(2, 6);
const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = a => a.reduce((s, x) => s + x, 0);
const timeMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtDur = sec => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const ago = ts => { if (!ts) return 'never'; const s = (Date.now() - ts) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; };

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (P.time24) return `${pad(h)}:${pad(m)}`;
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}
function taskHours(t) {
  if (!t.startTime || !t.endTime) return 0;
  let d = timeMin(t.endTime) - timeMin(t.startTime);
  if (d < 0) d += 1440;
  return d / 60;
}

/* ---------- constants ---------- */
const LOCAL_KEY = 'ghadi_v4_local', TOKEN_KEY = 'ghadi_v4_token', PREFS_KEY = 'ghadi_v4_prefs', ADMIN_KEY = 'ghadi_v4_admin';
const LEGACY = 'ghadi_v3_';
const STATUSES = ['Pending', 'Completed', 'Partially Completed', 'Delayed', 'Abandoned'];
const STATUS_COLOR = { Pending: '#94a3b8', Completed: '#22c55e', 'Partially Completed': '#eab308', Delayed: '#f97316', Abandoned: '#ef4444' };
const STATUS_SHORT = { 'Partially Completed': 'Partial' };
const PALETTE = ['#3b82f6', '#ec4899', '#f97316', '#10b981', '#8b5cf6', '#eab308', '#14b8a6', '#ef4444'];
const BASE_CATS = [
  { name: 'JEE', w: 1.5, c: '#3b82f6' }, { name: 'School', w: 1.1, c: '#ec4899' }, { name: 'Personal', w: 0.8, c: '#f97316' },
  { name: 'Fitness', w: 0.9, c: '#10b981' }, { name: 'Reading', w: 0.8, c: '#8b5cf6' },
  { name: 'Projects', w: 1.2, c: '#14b8a6' }, { name: 'Mock Tests', w: 1.5, c: '#ef4444' }
];
const NAV = [
  ['calendar', 'Daily View', 'calendar', 'Daily'], ['monthly', 'Monthly Calendar', 'grid', 'Month'],
  ['focus', 'Focus Zone', 'timer', 'Focus'], ['syllabus', 'Syllabus Tracker', 'book', 'Syllabus'],
  ['analytics', 'Analytics', 'chart', 'Stats'], ['settings', 'Settings', 'sliders', 'Settings']
];
const VIEWS = ['calendar', 'monthly', 'focus', 'syllabus', 'analytics', 'settings', 'admin'];

const SYLLABUS = {
  "JEE Main - Physics": ["Kinematics", "Laws of Motion", "Work, Energy & Power", "Rotational Motion", "Gravitation", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics"],
  "JEE Main - Chemistry": ["Atomic Structure", "Chemical Bonding", "Thermodynamics", "Equilibrium", "Redox", "Kinetics", "Coordination", "Organic Basics", "Hydrocarbons"],
  "JEE Main - Mathematics": ["Sets & Relations", "Complex Numbers", "Matrices & Determinants", "Quadratic Equations", "Permutations & Combinations", "Calculus", "Vector & 3D Geometry", "Probability"],
  "JEE Advanced - Physics": ["Advanced Mechanics", "Advanced Thermal Physics", "Advanced Electromagnetism", "Advanced Optics", "Modern Physics Focus"],
  "JEE Advanced - Chemistry": ["Physical Chemistry Deep Dive", "Inorganic Reactions", "Advanced Organic Mechanisms", "Practical Chemistry"],
  "JEE Advanced - Mathematics": ["Advanced Calculus", "Advanced Coordinate Geometry", "Advanced Algebra", "Complex Variables"],
  "Class 12 - Physics": ["Electrostatics", "Current Electricity", "Magnetism", "EMI & AC", "EM Waves", "Ray Optics", "Wave Optics", "Dual Nature", "Atoms & Nuclei", "Electronic Devices"],
  "Class 12 - Chemistry": ["Solutions", "Electrochemistry", "Chemical Kinetics", "d and f Block Elements", "Coordination Compounds", "Haloalkanes", "Alcohols", "Aldehydes", "Amines", "Biomolecules"],
  "Class 12 - Mathematics": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity and Differentiability", "Applications of Derivatives", "Integrals", "Differential Equations", "Vector Algebra", "3D Geometry", "Linear Programming", "Probability"]
};
const SYL_EXAMS = ['JEE Main', 'JEE Advanced', 'Class 12'];
const SYL_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'];
const STAGES = ['Not Started', 'Theory Done', 'Practicing', 'PYQs Completed', 'Mastered'];
const STAGE_W = [0, 0.25, 0.5, 0.75, 1];
const STAGE_COLOR = ['#94a3b8', '#60a5fa', '#a78bfa', '#f59e0b', '#22c55e'];

const ACCENTS = {
  ocean: ['#3b82f6', '#8b5cf6'], emerald: ['#10b981', '#06b6d4'], amethyst: ['#8b5cf6', '#ec4899'], amber: ['#f59e0b', '#ef4444'],
  rose: ['#f43f5e', '#fb923c'], teal: ['#14b8a6', '#3b82f6'], crimson: ['#dc2626', '#9333ea'], lime: ['#84cc16', '#10b981']
};
const FONTS = [['inter', 'Inter'], ['poppins', 'Poppins'], ['space', 'Space Grotesk'], ['serif', 'Lora'], ['mono', 'JetBrains Mono'], ['fredoka', 'Fredoka']];
const MASCOTS = ['🐰', '🦊', '🐼', '🐸', '🦄', '🐱', '🐙', '🦖'];
const QUOTES = [
  "Keep going, you're doing great! 🌟", "Focus on the step in front of you. 🧗", "Every minute counts. You got this! ⏳",
  "Stay sharp. Stay hungry. 🦊", "Unleash your inner beast! 🦁", "Small steps = giant leaps. 🚀",
  "You are unstoppable today! ✨", "Brain: loading awesome… 🧠", "One more page. One more problem. 📚",
  "Future you is cheering for you! 📣", "Tiny wins add up to big ones. 🍀", "Breathe in, focus on. 🌬️"
];
const PRESETS = {
  classic: { name: 'Classic', e: '🕰️', theme: 'system', accent: 'ocean', bg: 'gradient', card: 'glass', radius: 'normal', font: 'inter' },
  midnight: { name: 'Midnight', e: '🌌', theme: 'dark', accent: 'amethyst', bg: 'aurora', card: 'glass', radius: 'round', font: 'space', darkLum: 12 },
  paper: { name: 'Paper', e: '📜', theme: 'light', accent: 'amber', bg: 'plain', card: 'solid', radius: 'sharp', font: 'serif', lightLum: 250 },
  neon: { name: 'Neon', e: '⚡', theme: 'dark', accent: 'lime', bg: 'dots', card: 'outline', radius: 'normal', font: 'mono', darkLum: 0 },
  sakura: { name: 'Sakura', e: '🌸', theme: 'light', accent: 'rose', bg: 'gradient', card: 'glass', radius: 'pill', font: 'poppins' },
  forest: { name: 'Forest', e: '🌲', theme: 'dark', accent: 'emerald', bg: 'gradient', card: 'solid', radius: 'normal', font: 'inter', darkLum: 22 },
  sunset: { name: 'Sunset', e: '🌇', theme: 'light', accent: 'crimson', bg: 'aurora', card: 'glass', radius: 'round', font: 'poppins' }
};
const DEFAULT_PREFS = {
  theme: 'system', accent: 'ocean', customAccent: '#3b82f6', bg: 'gradient', lightLum: 248, darkLum: 31,
  card: 'glass', radius: 'normal', density: 'comfortable', font: 'inter', fontSize: 16, motion: 'full', sidebar: 'full',
  startView: 'calendar', time24: false, weekStart: 0, overload: 10, workMin: 25, shortBreak: 5, longBreak: 15,
  sound: true, playful: false, mascot: '🐰', sparkles: true, confetti: true
};
const LEVEL_NAMES = ['Rookie', 'Spoke', 'Rim Rider', 'Wheel Whiz', 'Time Tamer', 'Clockwork', 'Hour Hero', 'Minute Master', 'Chrono Champ', 'Legend'];

/* ---------- state ---------- */
let S = null;                       // user state
const session = { mode: 'server', user: null };
const P = { ...DEFAULT_PREFS };     // live preferences (also S.prefs)
const ui = {
  view: 'calendar', filter: 'Central', date: dayStart(new Date()), month: dayStart(new Date()), anim: true,
  syl: { exam: 'JEE Main', subject: 'Physics', q: '', filter: 'all', note: null, hl: null }, range: 30
};
let dragId = null;

/* ======================= preferences & theming ======================= */
function loadCachedPrefs() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(PREFS_KEY)); } catch {}
  if (!saved) {
    saved = {};
    try { // migrate settings from the old version
      const th = localStorage.getItem('omnitrack_theme'), co = localStorage.getItem('omnitrack_color');
      if (th) saved.theme = th;
      if (co && ACCENTS[co]) saved.accent = co;
      const ll = localStorage.getItem('omnitrack_light_lum'), dl = localStorage.getItem('omnitrack_dark_lum');
      if (ll) saved.lightLum = +ll; if (dl) saved.darkLum = +dl;
      if (localStorage.getItem(LEGACY + 'playful') === 'true') saved.playful = true;
    } catch {}
  }
  Object.assign(P, DEFAULT_PREFS, saved);
}
const cachePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(P)); } catch {} };

function hexToRgb(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shiftHue(hex, deg) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg) % 360;
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function accentPair() {
  if (P.accent === 'custom' && /^#[0-9a-f]{6}$/i.test(P.customAccent)) return [P.customAccent, shiftHue(P.customAccent, 40)];
  return ACCENTS[P.accent] || ACCENTS.ocean;
}
function applyPrefs() {
  const r = document.documentElement;
  const dark = P.theme === 'dark' || (P.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.classList.toggle('dark', dark);
  for (const k of ['card', 'radius', 'density', 'font', 'bg', 'motion', 'sidebar']) r.dataset[k] = P[k];
  r.style.setProperty('--fs', clamp(+P.fontSize || 16, 13, 20) + 'px');
  const [a, b] = accentPair();
  r.style.setProperty('--accent', hexToRgb(a).join(' '));
  r.style.setProperty('--accent2', hexToRgb(b).join(' '));
  const L = clamp(+P.lightLum || 248, 235, 255), D = clamp(+P.darkLum, 0, 60) || 0;
  r.style.setProperty('--bg-light', `rgb(${L},${Math.min(255, L + 2)},${Math.min(255, L + 4)})`);
  r.style.setProperty('--bg-dark', `rgb(${D},${Math.round(D * 1.32)},${Math.round(D * 1.77)})`);
  document.body.classList.toggle('playful', !!P.playful);
  const tm = $('meta[name=theme-color]'); if (tm) tm.content = a;
  buildFloatLayer();
  const tt = $('#theme-toggle'); if (tt) tt.innerHTML = icon(dark ? 'sun' : 'moon');
  const fp = $('#f-playful'); if (fp) fp.checked = !!P.playful;
  const mb = $('#f-mascot-body'); if (mb) mb.textContent = P.mascot;
}
function buildFloatLayer() {
  const el = $('#float-layer'); if (!el) return;
  if (!P.playful) { el.innerHTML = ''; return; }
  if (el.childElementCount) return;
  const items = ['⭐', '🌈', '🎈', '🍭', '☁️', '🦋', '🌸', '🪁', '✨', '🍀', '🎵', '🧩'];
  el.innerHTML = items.map((e, i) => `<span style="left:${(i * 83 + 7) % 96}%;font-size:${1.4 + (i % 4) * 0.5}rem;animation-duration:${14 + (i % 5) * 4}s;animation-delay:-${i * 2.3}s">${e}</span>`).join('');
}
function setPref(key, val) {
  P[key] = val;
  applyPrefs();
  if (['workMin', 'shortBreak', 'longBreak'].includes(key) && !F.running) resetFocus(false);
  if (key === 'playful') { refreshFocusUI(); if (val) sfx('pop'); }
  if (key === 'mascot') refreshFocusUI();
  if (['time24', 'weekStart', 'overload'].includes(key)) renderView();
  save();
}

/* ======================= modals, dialogs, toasts ======================= */
function showModal(html, { wide = false, dismiss = true, cls = '' } = {}) {
  const bd = document.createElement('div');
  bd.className = 'modal-bd';
  if (dismiss) bd.dataset.dismiss = '1';
  bd.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bd);
  requestAnimationFrame(() => bd.classList.add('in'));
  bd.close = () => { bd.classList.remove('in'); setTimeout(() => bd.remove(), 200); if (bd.onclose) bd.onclose(); };
  if (dismiss) bd.addEventListener('mousedown', e => { if (e.target === bd) bd.close(); });
  const f = bd.querySelector('[autofocus]') || bd.querySelector('input:not([type=checkbox]),select,textarea');
  if (f) setTimeout(() => f.focus(), 60);
  return bd;
}
function dialog({ title, message = '', actions, input = null, danger = false }) {
  return new Promise(resolve => {
    const bd = showModal(`
      <div class="dlg">
        <h3>${esc(title)}</h3>${message ? `<p>${message}</p>` : ''}
        ${input ? `<input class="inp dlg-input" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}" ${input.type ? `type="${input.type}"` : ''} autocomplete="off">` : ''}
        <div class="dlg-actions">${actions.map(a => `<button class="btn ${a.cls || 'btn-ghost'}" data-v="${esc(a.value)}">${esc(a.label)}</button>`).join('')}</div>
      </div>`, { cls: 'small' + (danger ? ' danger' : '') });
    let done = false;
    const finish = v => { if (done) return; done = true; bd.close(); resolve(v); };
    bd.onclose = () => finish(null);
    bd.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      const val = b.dataset.v, inp = $('.dlg-input', bd);
      if (val === 'cancel') return finish(null);
      if (input && input.match !== undefined && inp.value.trim() !== input.match) {
        inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); return;
      }
      finish({ v: val, text: inp ? inp.value.trim() : '' });
    });
    const inp = $('.dlg-input', bd);
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const ok = $('.btn-primary,.btn-danger', bd); if (ok) ok.click(); } });
  });
}
const confirmDlg = async (title, message, { ok = 'Confirm', danger = false } = {}) =>
  !!(await dialog({ title, message, danger, actions: [{ label: 'Cancel', value: 'cancel' }, { label: ok, value: 'ok', cls: danger ? 'btn-danger' : 'btn-primary' }] }));
const typeConfirm = async (title, message, word) =>
  !!(await dialog({ title, message, danger: true, input: { placeholder: `Type ${word}`, match: word }, actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Confirm', value: 'ok', cls: 'btn-danger' }] }));

function toast(msg, type = 'info', ms = 3200) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${esc(msg)}</span>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
}

/* ======================= sound & fun effects ======================= */
let actx = null;
function sfx(name) {
  if (!P.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const seq = { pop: [[660, 0.07]], click: [[440, 0.04]], done: [[523, 0.12], [659, 0.12], [784, 0.2]], error: [[200, 0.18]], break: [[784, 0.12], [587, 0.2]] }[name] || [];
    let t = actx.currentTime;
    seq.forEach(([f, d]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9;
    });
  } catch {}
}
const motionOn = () => P.motion === 'full' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

function confetti(n = 140) {
  if (!motionOn()) return;
  const cv = $('#confetti'); if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight; cv.classList.add('on');
  const cols = [...PALETTE, ...accentPair()];
  const ps = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.7, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 18 - 6,
    s: 5 + Math.random() * 7, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4
  }));
  let frames = 0;
  (function step() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => { p.vy += 0.5; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore(); });
    if (++frames < 130) requestAnimationFrame(step); else { ctx.clearRect(0, 0, cv.width, cv.height); cv.classList.remove('on'); }
  })();
}
function emojiBurst(list = ['🦊', '🐼', '🦁', '🐸', '🦄', '🎉', '⭐', '🚀', '🍰', '🎈'], n = 24) {
  if (!motionOn()) return;
  for (let i = 0; i < n; i++) setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'emoji-particle'; el.textContent = list[Math.floor(Math.random() * list.length)];
    el.style.left = (Math.random() * 80 + 10) + 'vw';
    document.body.appendChild(el); setTimeout(() => el.remove(), 3000);
  }, i * 70);
}
let lastSpark = 0;
document.addEventListener('mousemove', e => {
  if (!P.playful || !P.sparkles || !motionOn()) return;
  const now = performance.now(); if (now - lastSpark < 45) return; lastSpark = now;
  const s = document.createElement('span');
  s.className = 'sparkle'; s.textContent = ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)];
  s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
  document.body.appendChild(s); setTimeout(() => s.remove(), 750);
});

/* ======================= API & persistence ======================= */
async function api(method, url, body, { admin = false, raw = false, noAuth = false } = {}) {
  const h = {};
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const tk = localStorage.getItem(TOKEN_KEY);
  if (tk && !noAuth) h.Authorization = 'Bearer ' + tk;
  if (admin && A.token) h['X-Admin-Token'] = A.token;
  let r;
  try { r = await fetch(url, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch { throw Object.assign(new Error('Cannot reach the server'), { offline: true }); }
  if (raw && r.ok) return r;
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) {
    const e = Object.assign(new Error((d && d.error) || `Request failed (${r.status})`), { status: r.status });
    if (r.status === 401) { if (admin) adminExpired(); else if (!noAuth) sessionExpired(); }
    throw e;
  }
  return d;
}
function sessionExpired() {
  if (sessionExpired.done) return; sessionExpired.done = true;
  localStorage.removeItem(TOKEN_KEY); toast('Session expired. Please sign in again.', 'warn');
  setTimeout(() => location.reload(), 1200);
}

let saveTimer = null, saving = false, dirty = false;
function setSync(state) {
  const el = $('#sync'); if (!el) return;
  const m = { saved: ['ok', 'Synced'], saving: ['busy', 'Saving…'], error: ['err', 'Offline · retrying'], local: ['local', 'Local mode'] }[state];
  el.className = 'sync ' + m[0]; el.innerHTML = `<i></i><span class="lbl">${m[1]}</span>`;
}
function save() {
  if (!S) return;
  cachePrefs();
  if (session.mode === 'local') { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(S)); } catch { toast('Browser storage is full', 'error'); } return; }
  dirty = true; setSync('saving');
  clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 500);
}
async function flushSave() {
  if (!dirty || saving || !S || session.mode !== 'server') return;
  saving = true; dirty = false; let failed = false;
  try { await api('PUT', '/api/state', S); }
  catch (e) { failed = true; dirty = true; if (e.status === 413 || e.status === 400) toast(e.message, 'error'); }
  saving = false;
  setSync(failed ? 'error' : dirty ? 'saving' : 'saved');
  if (dirty) { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, failed ? 5000 : 500); }
}
window.addEventListener('beforeunload', () => { if (F.acc >= 1) flushFocus(); if (dirty && session.mode === 'server') { try { fetch('/api/state', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) }, body: JSON.stringify(S) }); } catch {} } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (F.running) flushFocus(); flushSave(); } });

/* ---------- state normalisation (also migrates the old format) ---------- */
function normTask(t) {
  const focusSec = t.focusSec !== undefined ? +t.focusSec || 0 : (+t.actualFocusTime || 0) * 60;
  return {
    id: String(t.id), title: String(t.title).slice(0, 200), date: t.date, category: String(t.category || ''),
    startTime: /^\d\d:\d\d$/.test(t.startTime || '') ? t.startTime : '', endTime: /^\d\d:\d\d$/.test(t.endTime || '') ? t.endTime : '',
    status: STATUSES.includes(t.status) ? t.status : 'Pending', notes: String(t.notes || ''),
    priority: ['low', 'normal', 'high'].includes(t.priority) ? t.priority : 'normal',
    order: typeof t.order === 'number' ? t.order : undefined, focusSec, groupId: t.groupId || undefined, xp: !!t.xp || t.status === 'Completed'
  };
}
function normalize(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const o = k => (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k]) ? raw[k] : {});
  const s = {
    tasks: (Array.isArray(raw.tasks) ? raw.tasks : []).filter(t => t && t.id && t.title && /^\d{4}-\d\d-\d\d$/.test(t.date)).map(normTask),
    categories: (Array.isArray(raw.categories) ? raw.categories : []).filter(c => typeof c === 'string' && c).slice(0, 5),
    catColors: o('catColors'), catWeights: o('catWeights'), syllabus: o('syllabus'), syllabusMeta: o('syllabusMeta'),
    customChapters: o('customChapters'), focusLog: o('focusLog'),
    game: Object.assign({ xp: 0, fx: 0, freeSec: 0, sessions: 0 }, o('game')), prefs: o('prefs')
  };
  return s;
}
const catColor = n => (S && S.catColors[n]) || (BASE_CATS.find(c => c.name === n) || {}).c || '#94a3b8';
const catWeight = n => { const w = S && S.catWeights[n]; return typeof w === 'number' ? w : (BASE_CATS.find(c => c.name === n) || { w: 1 }).w; };
function nextPaletteColor() { const used = Object.values(S.catColors); return PALETTE.find(c => !used.includes(c)) || PALETTE[S.categories.length % PALETTE.length]; }

/* ======================= auth & boot ======================= */
async function boot() {
  loadCachedPrefs();
  applyPrefs();
  buildChrome();
  buildFocus();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (P.theme === 'system') applyPrefs(); });
  let health = null;
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('/api/health', { signal: ctl.signal }); clearTimeout(to);
    if (r.ok) health = await r.json();
  } catch {}
  if (!health || !health.ok) { session.mode = 'local'; return showAuth(true); }
  session.mode = 'server';
  showAnnouncement(health.announcement);
  session.reg = health.registrationOpen;
  if (localStorage.getItem(TOKEN_KEY)) {
    try { const r = await api('GET', '/api/state'); session.user = r.user.username; return enter(r.state); }
    catch (e) { if (!e.offline) localStorage.removeItem(TOKEN_KEY); }
  }
  showAuth(false);
}
function showAnnouncement(a) {
  const el = $('#announce'); if (!el) return;
  if (!a || localStorage.getItem('ghadi_v4_dismissed') === String(a.id)) { el.classList.add('hidden'); return; }
  el.className = 'announce ' + esc(a.level);
  el.innerHTML = `${icon('megaphone')}<span>${esc(a.text)}</span><button class="icon-btn" data-act="dismiss-announce" data-id="${a.id}" title="Dismiss">${icon('x')}</button>`;
}

let authMode = 'login';
function showAuth(offline) {
  const bd = showModal(`
    <div class="auth">
      <div class="auth-head"><svg class="logo-svg big" viewBox="0 0 48 48"><use href="#logo"/></svg><h2 class="grad-text">Ghadi Ka Pahiya</h2><p>Your time, in motion.</p></div>
      ${offline ? `
        <div class="auth-body">
          <div class="note warn">${icon('alert')}<span>The backend isn't reachable. Run <code>node server.js</code> to enable accounts and sync, or continue in <b>Local Mode</b> (data stays in this browser only).</span></div>
          <button class="btn btn-primary btn-block" data-act="local-mode">Continue in Local Mode</button>
        </div>` : `
        <div class="tabs"><button id="tab-login" class="tab on" data-act="auth-tab" data-m="login">Sign In</button><button id="tab-register" class="tab" data-act="auth-tab" data-m="register">Register</button></div>
        <form class="auth-body" data-form="auth">
          <label class="fld"><span>Username</span><input class="inp" id="auth-user" required autocomplete="username" placeholder="Enter username"></label>
          <label class="fld"><span>Password</span><input class="inp" id="auth-pass" type="password" required autocomplete="current-password" placeholder="Enter password"></label>
          <label class="fld hidden" id="auth-site"><span>Site Password <button type="button" class="chip" data-act="site-hint">?</button></span><input class="inp" id="auth-sitepw" type="password" placeholder="Enter Site Password"></label>
          <p class="err hidden" id="auth-err"></p>
          <button class="btn btn-primary btn-block" id="auth-btn">Access Session</button>
        </form>`}
    </div>`, { dismiss: false, cls: 'auth-modal' });
  showAuth.el = bd;
  authMode = 'login';
}
function setAuthTab(m) {
  authMode = m;
  $('#tab-login').classList.toggle('on', m === 'login'); $('#tab-register').classList.toggle('on', m === 'register');
  $('#auth-site').classList.toggle('hidden', m !== 'register');
  $('#auth-pass').autocomplete = m === 'register' ? 'new-password' : 'current-password';
  $('#auth-btn').textContent = m === 'register' ? 'Register Account' : 'Access Session';
  $('#auth-err').classList.add('hidden');
}
async function submitAuth() {
  const err = $('#auth-err'), btn = $('#auth-btn');
  const body = { username: $('#auth-user').value.trim(), password: $('#auth-pass').value };
  if (authMode === 'register') body.sitePassword = $('#auth-sitepw').value;
  btn.disabled = true;
  try {
    const r = await api('POST', authMode === 'register' ? '/api/register' : '/api/login', body, { noAuth: true });
    localStorage.setItem(TOKEN_KEY, r.token); session.user = r.user.username;
    showAuth.el.close(); await enter(r.state);
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
    const m = $('.modal', showAuth.el); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
  }
  btn.disabled = false;
}
function enterLocal() {
  session.mode = 'local'; session.user = 'Local';
  let raw = null; try { raw = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch {}
  showAuth.el.close(); enter(raw);
}
async function enter(rawState) {
  S = normalize(rawState);
  if (Object.keys(S.prefs).length) Object.assign(P, DEFAULT_PREFS, S.prefs); // else keep the look chosen on the sign-in screen
  S.prefs = P;
  if (!ACCENTS[P.accent] && P.accent !== 'custom') P.accent = 'ocean';
  applyPrefs(); cachePrefs();
  setSync(session.mode === 'local' ? 'local' : 'saved');
  buildChrome();
  if (!S.categories.length) openOnboarding(); else startUI();
}
function startUI() {
  ui.date = dayStart(new Date()); ui.month = dayStart(new Date());
  buildFocus(); resetFocus(false);
  switchView(VIEWS.includes(P.startView) && P.startView !== 'admin' ? P.startView : 'calendar');
}

async function logout() {
  flushFocus();
  if (session.mode === 'server') { try { await flushSave(); await api('POST', '/api/logout'); } catch {} }
  localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(ADMIN_KEY);
  location.reload();
}

/* ======================= chrome (nav, level card) ======================= */
function buildChrome() {
  $('#nav').innerHTML = NAV.map(([id, label, ic]) => `<button class="nav-btn" data-view="${id}" data-act="nav" title="${label}">${icon(ic)}<span class="lbl">${label}</span></button>`).join('')
    + `<button class="nav-btn admin-nav hidden" data-view="admin" data-act="nav" title="Admin">${icon('shield')}<span class="lbl">Admin</span></button>`;
  $('#mobile-nav').innerHTML = NAV.filter(n => n[0] !== 'monthly').map(([id, , ic, short]) => `<button class="mob-btn" data-view="${id}" data-act="nav">${icon(ic)}<span>${short}</span></button>`).join('');
  if (typeof A !== 'undefined' && A.token) $('.admin-nav').classList.remove('hidden');
  const tt = $('#theme-toggle'); if (tt) tt.innerHTML = icon(document.documentElement.classList.contains('dark') ? 'sun' : 'moon');
  if (S) renderLevelCard();
}
const levelOf = xp => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 40));
function addXp(n) {
  const b = levelOf(S.game.xp); S.game.xp += n; const a = levelOf(S.game.xp);
  if (a > b) { toast(`Level up! You're now level ${a} · ${LEVEL_NAMES[Math.min(a - 1, 9)]}`, 'success', 4500); sfx('done'); if (P.playful && P.confetti) confetti(); }
}
function streakInfo() {
  const days = new Set(S.tasks.filter(t => t.status === 'Completed').map(t => t.date));
  let cur = 0;
  for (let i = 0; i < 400; i++) { if (days.has(fmtDate(addDays(new Date(), -i)))) cur++; else if (i !== 0) break; }
  const sorted = [...days].sort(); let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    run = prev && fmtDate(addDays(parseDate(prev), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return { cur, best, days };
}
function renderLevelCard() {
  const el = $('#level-card'); if (!el || !S) return;
  const xp = S.game.xp, lv = levelOf(xp), lo = 40 * (lv - 1) ** 2, hi = 40 * lv ** 2;
  const pct = Math.round(((xp - lo) / (hi - lo)) * 100);
  el.innerHTML = `<div class="lv-top"><span class="lv-badge">${lv}</span><div class="lv-txt"><b>${LEVEL_NAMES[Math.min(lv - 1, 9)]}</b><small>${xp} XP · ${esc(session.user || '')}</small></div><span class="flame" title="Current streak">${icon('flame')}${streakInfo().cur}</span></div><div class="bar"><i style="width:${pct}%"></i></div>`;
}

/* ======================= view switching ======================= */
function switchView(v) {
  if (v === 'admin' && !(typeof A !== 'undefined' && A.token)) return;
  ui.view = v; ui.anim = true;
  $$('.nav-btn,.mob-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  VIEWS.forEach(x => $('#view-' + x).classList.toggle('hidden', x !== v));
  $('#topbar').classList.toggle('hidden', !(v === 'calendar' || v === 'monthly'));
  $('#date-controls').classList.toggle('hidden', v !== 'calendar');
  $('#app').dataset.view = v;
  renderView(v);
  $('#views').scrollTop = 0;
}
function renderView(v = ui.view) {
  if (!S) return;
  const map = { calendar: renderDaily, monthly: renderMonthly, focus: refreshFocusUI, syllabus: renderSyllabus, analytics: renderAnalytics, settings: renderSettings, admin: renderAdmin };
  map[v] && map[v]();
  renderFilters(); renderLevelCard();
}
function renderFilters() {
  const el = $('#filters'); if (!el || !S) return;
  if (ui.filter !== 'Central' && !S.categories.includes(ui.filter)) ui.filter = 'Central';
  const ds = fmtDate(ui.date), showCounts = ui.view === 'calendar';
  const cnt = c => showCounts ? S.tasks.filter(t => t.date === ds && (c === 'Central' || t.category === c)).length : 0;
  const pill = (f, label, color) => `<button class="pill ${ui.filter === f ? 'on' : ''}" data-act="filter" data-f="${esc(f)}" ${color ? `style="--c:${color}"` : ''}>${color ? '<i></i>' : ''}${esc(label)}${showCounts ? `<em>${cnt(f)}</em>` : ''}</button>`;
  el.innerHTML = pill('Central', 'All') + S.categories.map(c => pill(c, c, catColor(c))).join('');
}
function updateDateControls() {
  const isToday = fmtDate(ui.date) === today();
  $('#date-label').textContent = isToday ? 'Today' : ui.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  $('#date-input').value = fmtDate(ui.date);
}

/* ======================= tasks ======================= */
function sortTasks(a) {
  const hasOrder = a.some(t => t.order !== undefined);
  return a.slice().sort((x, y) => {
    if (hasOrder) { const o = (x.order ?? 1e9) - (y.order ?? 1e9); if (o) return o; }
    if (!x.startTime && y.startTime) return -1;
    if (x.startTime && !y.startTime) return 1;
    return x.startTime.localeCompare(y.startTime) || x.title.localeCompare(y.title);
  });
}
const dayTasks = (ds, f = ui.filter) => sortTasks(S.tasks.filter(t => t.date === ds && (f === 'Central' || t.category === f)));
function dayLoad(ds) {
  return sum(S.tasks.filter(t => t.date === ds && t.status !== 'Abandoned').map(t => (t.startTime && t.endTime ? taskHours(t) : 0.5) * catWeight(t.category)));
}
function overlaps(ds) {
  const ts = S.tasks.filter(t => t.date === ds && t.startTime && t.endTime && t.status !== 'Abandoned')
    .map(t => { const s = timeMin(t.startTime); let e = timeMin(t.endTime); if (e <= s) e += 1440; return { s, e }; }).sort((a, b) => a.s - b.s);
  let n = 0; for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length && ts[j].s < ts[i].e; j++) n++;
  return n;
}

function taskCard(t, i) {
  const done = t.status === 'Completed';
  const time = t.startTime && t.endTime ? `${fmtTime(t.startTime)} – ${fmtTime(t.endTime)}` : 'Anytime / all day';
  const mins = Math.round(t.focusSec / 60);
  return `<article class="task ${done ? 'done' : ''} ${ui.anim ? 'anim' : ''}" draggable="true" data-id="${t.id}" data-act="task-open" style="--c:${catColor(t.category)};--s:${STATUS_COLOR[t.status]};--i:${i}">
    <span class="grip" title="Drag to reorder">${icon('grip')}</span>
    <button class="check ${done ? 'on' : ''}" data-act="task-toggle" data-id="${t.id}" title="${done ? 'Mark pending' : 'Mark complete'}">${icon('check')}</button>
    <div class="t-main">
      <div class="t-tags">
        <span class="tag">${esc(t.category || 'No category')}</span>
        ${t.priority === 'high' ? '<span class="prio high">High</span>' : t.priority === 'low' ? '<span class="prio low">Low</span>' : ''}
        <span class="st">● ${esc(t.status)}</span>
        ${t.groupId ? `<span class="meta">${icon('repeat')} Recurring</span>` : ''}
        ${t.notes ? `<span class="meta" title="Has notes">${icon('note')}</span>` : ''}
        ${mins ? `<span class="meta">${icon('timer')} ${mins}m</span>` : ''}
      </div>
      <h4>${esc(t.title)}</h4>
      <p class="t-time">${icon('clock')} ${time}</p>
    </div>
    <div class="t-actions">
      <select class="sel" data-change="status" data-id="${t.id}" title="Status">${STATUSES.map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${STATUS_SHORT[s] || s}</option>`).join('')}</select>
      <button class="icon-btn" data-act="task-focus" data-id="${t.id}" title="Start focus session">${icon('play')}</button>
      <button class="icon-btn" data-act="task-edit" data-id="${t.id}" title="Edit">${icon('edit')}</button>
      <button class="icon-btn danger" data-act="task-del" data-id="${t.id}" title="Delete">${icon('trash')}</button>
    </div>
  </article>`;
}

function renderDaily() {
  const el = $('#view-calendar'), ds = fmtDate(ui.date);
  updateDateControls();
  const list = dayTasks(ds), all = S.tasks.filter(t => t.date === ds);
  const done = all.filter(t => t.status === 'Completed').length, pct = all.length ? Math.round(done / all.length * 100) : 0;
  const isToday = ds === today();
  const load = dayLoad(ds), lim = +P.overload || 10, ov = overlaps(ds);
  const warn = [];
  if (load > lim) warn.push(`Heavy day: <b>${load.toFixed(1)}</b> weighted hours planned (your limit is ${lim}). Consider moving something.`);
  if (ov) warn.push(`<b>${ov}</b> overlapping time slot${ov > 1 ? 's' : ''} on this day.`);
  const dayFocus = Math.round((S.focusLog[ds] || 0) / 60);
  el.innerHTML = `
    <div class="day-head">
      <div><h2>${isToday ? 'Today' : ui.date.toLocaleDateString(undefined, { weekday: 'long' })}</h2><p class="sub">${ui.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <div class="day-stats">
        <button class="btn btn-ghost btn-sm month-link" data-act="nav" data-view="monthly">${icon('grid')} Month</button>
        <div class="mini"><b>${done}/${all.length}</b><small>done</small></div>
        <div class="mini"><b>${load.toFixed(1)}h</b><small>load</small></div>
        <div class="mini"><b>${dayFocus}m</b><small>focus</small></div>
      </div>
    </div>
    <div class="bar big"><i style="width:${pct}%"></i></div>
    ${warn.length ? `<div class="banner warn">${icon('alert')}<div><h4>Schedule warning</h4><p>${warn.join('<br>')}</p></div></div>` : ''}
    <div class="quick"><span>${icon('plus')}</span><input id="quick-add" class="inp" placeholder="Quick add to ${ui.filter === 'Central' ? esc(S.categories[0]) : esc(ui.filter)} — type a task and press Enter" maxlength="200" autocomplete="off"></div>
    <div id="task-list" class="task-list">${list.map(taskCard).join('')}</div>
    ${list.length ? '' : `<div class="empty">${icon('calendar')}<p>No tasks for this ${ui.filter === 'Central' ? 'day' : 'category'}.</p><button class="btn btn-primary" data-act="new-task">${icon('plus')} Add a task</button></div>`}`;
  ui.anim = false;
}

function quickAdd(title) {
  title = title.trim(); if (!title) return;
  const cat = ui.filter !== 'Central' ? ui.filter : S.categories[0];
  S.tasks.push(normTask({ id: uid(), title, date: fmtDate(ui.date), category: cat, status: 'Pending' }));
  save(); renderView(); const q = $('#quick-add'); if (q) q.focus(); sfx('pop');
}
function setStatus(id, status) {
  const t = S.tasks.find(x => x.id === id); if (!t || t.status === status) return;
  const was = t.status; t.status = status;
  if (status === 'Completed' && !t.xp) { t.xp = true; addXp(10 + (t.priority === 'high' ? 5 : 0)); celebrate(t); }
  else if (status === 'Completed') celebrate(t, true);
  save(); renderView();
  if ((status === 'Delayed' || status === 'Abandoned') && was !== status) setTimeout(() => openNotes(id), 250);
}
function celebrate(t, quiet = false) {
  toast(quiet ? `“${t.title}” completed` : `+XP · “${t.title}” done!`, 'success');
  if (P.playful) { sfx('done'); if (P.confetti) { confetti(); emojiBurst(undefined, 14); } }
}

/* ---- add / edit modal ---- */
function openTaskModal(task, preset = {}) {
  if (!S.categories.length) return toast('Add a category first', 'warn');
  const t = task || { title: preset.title || '', date: preset.date || fmtDate(ui.date), category: preset.category || (ui.filter !== 'Central' ? ui.filter : S.categories[0]), startTime: '', endTime: '', priority: 'normal', status: 'Pending' };
  const untimed = task ? !t.startTime : false;
  const cats = S.categories.includes(t.category) || !t.category ? S.categories : [...S.categories, t.category];
  const bd = showModal(`
    <div class="modal-head"><h3>${task ? 'Edit Task' : 'New Task'}</h3><button class="icon-btn" data-act="close-modal">${icon('x')}</button></div>
    <form class="modal-body" data-form="task">
      <input type="hidden" id="tf-id" value="${task ? esc(task.id) : ''}">
      <label class="fld"><span>Task title</span><input class="inp" id="tf-title" required maxlength="200" value="${esc(t.title)}" autofocus></label>
      <div class="grid2">
        <label class="fld"><span>Date</span><input class="inp" type="date" id="tf-date" required value="${t.date}"></label>
        <label class="fld"><span>Category</span><select class="inp" id="tf-cat">${cats.map(c => `<option ${c === t.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      </div>
      <div class="grid2">
        <label class="fld"><span>Start</span><input class="inp" type="time" id="tf-start" value="${t.startTime}" ${untimed ? 'disabled' : ''}></label>
        <label class="fld"><span>End</span><input class="inp" type="time" id="tf-end" value="${t.endTime}" ${untimed ? 'disabled' : ''}></label>
      </div>
      <label class="check-row"><input type="checkbox" id="tf-untimed" data-change="tf-untimed" ${untimed ? 'checked' : ''}> Untimed / all-day task</label>
      <div class="grid2">
        <label class="fld"><span>Priority</span><select class="inp" id="tf-prio">${['low', 'normal', 'high'].map(p => `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></label>
        ${task ? `<label class="fld"><span>Status</span><select class="inp" id="tf-status">${STATUSES.map(s => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>` : `
        <label class="fld"><span>${icon('repeat')} Repeat</span><select class="inp" id="tf-rec"><option value="none">Never (one-time)</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="weekdays">Weekdays only</option></select></label>`}
      </div>
      ${task ? '' : `<label class="fld hidden" id="tf-dur-wrap"><span>Repeat for</span><select class="inp" id="tf-dur"><option value="30">1 month</option><option value="90" selected>3 months</option><option value="180">6 months</option></select></label>`}
      ${task && task.groupId ? `<label class="check-row"><input type="checkbox" id="tf-series"> Apply title, category, time &amp; priority to all upcoming tasks in this series</label>` : ''}
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancel</button><button class="btn btn-primary">Save Task</button></div>
    </form>`);
  const rec = $('#tf-rec', bd);
  if (rec) rec.addEventListener('change', () => $('#tf-dur-wrap', bd).classList.toggle('hidden', rec.value === 'none'));
}
function submitTask() {
  const id = $('#tf-id').value, untimed = $('#tf-untimed').checked;
  const start = untimed ? '' : $('#tf-start').value, end = untimed ? '' : $('#tf-end').value;
  if (!!start !== !!end) return toast('Set both a start and an end time (or mark the task untimed).', 'warn');
  const base = { title: $('#tf-title').value.trim(), category: $('#tf-cat').value, startTime: start, endTime: end, priority: $('#tf-prio').value };
  if (!base.title) return toast('Please enter a title', 'warn');
  const date = $('#tf-date').value;
  if (!date) return toast('Please pick a date', 'warn');
  if (!id) {
    const rec = $('#tf-rec').value;
    if (rec === 'none') S.tasks.push(normTask({ ...base, id: uid(), date, status: 'Pending' }));
    else {
      const gid = 'group_' + uid(), startD = parseDate(date), n = +$('#tf-dur').value || 90; let added = 0;
      for (let i = 0; i < n; i++) {
        const d = addDays(startD, i), dow = d.getDay();
        if ((rec === 'daily') || (rec === 'weekly' && i % 7 === 0) || (rec === 'weekdays' && dow !== 0 && dow !== 6)) {
          S.tasks.push(normTask({ ...base, id: uid(), date: fmtDate(d), status: 'Pending', groupId: gid })); added++;
        }
      }
      toast(`Created ${added} recurring tasks`, 'success');
    }
  } else {
    const t = S.tasks.find(x => x.id === id); if (!t) return;
    const newStatus = $('#tf-status').value, series = $('#tf-series') && $('#tf-series').checked, oldDate = t.date;
    Object.assign(t, base, { date });
    if (series && t.groupId) S.tasks.forEach(o => { if (o !== t && o.groupId === t.groupId && o.date >= oldDate) Object.assign(o, base); });
    if (newStatus !== t.status) { document.querySelector('.modal-bd')?.close(); save(); return setStatus(id, newStatus); }
  }
  $$('.modal-bd').forEach(b => b.close()); save(); renderView(); refreshFocusUI();
}
async function deleteTask(id) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  if (t.groupId) {
    const r = await dialog({ title: 'Delete recurring task', message: `“${esc(t.title)}” is part of a recurring series.`, danger: true, actions: [
      { label: 'Cancel', value: 'cancel' }, { label: 'Only this one', value: 'one', cls: 'btn-ghost' }, { label: 'This & upcoming', value: 'all', cls: 'btn-danger' }] });
    if (!r) return;
    S.tasks = r.v === 'all' ? S.tasks.filter(x => !(x.groupId === t.groupId && x.date >= t.date)) : S.tasks.filter(x => x.id !== id);
  } else {
    if (!(await confirmDlg('Delete task?', `“${esc(t.title)}” will be removed permanently.`, { ok: 'Delete', danger: true }))) return;
    S.tasks = S.tasks.filter(x => x.id !== id);
  }
  save(); renderView(); refreshFocusUI(); toast('Task deleted');
}

/* ---- notes modal ---- */
function openNotes(id) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  const bd = showModal(`
    <div class="modal-head notes-head" style="--c:${catColor(t.category)};--s:${STATUS_COLOR[t.status]}">
      <div><div class="t-tags"><span class="tag">${esc(t.category)}</span><span class="st">● ${esc(t.status)}</span><span class="meta">${parseDate(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></div><h3>${esc(t.title)}</h3></div>
      <button class="icon-btn" data-act="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body"><textarea class="inp notes-area" id="notes-input" placeholder="Notes, reflections, links… (Ctrl+Enter to save)">${esc(t.notes)}</textarea></div>
    <div class="modal-foot"><button class="btn btn-ghost" data-act="close-modal">Discard</button><button class="btn btn-ghost" data-act="task-focus" data-id="${t.id}">${icon('play')} Focus</button><button class="btn btn-primary" data-act="notes-save" data-id="${t.id}">Save Notes</button></div>`, { wide: true });
  $('#notes-input', bd).addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('[data-act=notes-save]', bd).click(); });
}

/* ---- drag & drop ---- */
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.task'); if (!c) return; dragId = c.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); setTimeout(() => c.classList.add('dragging'), 0); });
document.addEventListener('dragover', e => { const c = e.target.closest && e.target.closest('.task'); if (!c || !dragId) return; e.preventDefault(); $$('.task.over').forEach(x => x.classList.remove('over')); if (c.dataset.id !== dragId) c.classList.add('over'); });
document.addEventListener('dragend', () => { dragId = null; $$('.task.over,.task.dragging').forEach(x => x.classList.remove('over', 'dragging')); });
document.addEventListener('drop', e => {
  const c = e.target.closest && e.target.closest('.task'); if (!c || !dragId) return;
  e.preventDefault();
  const ids = $$('#task-list .task').map(x => x.dataset.id), from = ids.indexOf(dragId), to = ids.indexOf(c.dataset.id);
  dragId = null; if (from < 0 || to < 0 || from === to) return renderView();
  const [m] = ids.splice(from, 1); ids.splice(to, 0, m);
  ids.forEach((id, i) => { const t = S.tasks.find(x => x.id === id); if (t) t.order = i; });
  save(); renderView();
});

/* ======================= monthly calendar ======================= */
function renderMonthly() {
  const el = $('#view-monthly'), y = ui.month.getFullYear(), m = ui.month.getMonth();
  const ws = +P.weekStart || 0, first = (new Date(y, m, 1).getDay() - ws + 7) % 7, dim = new Date(y, m + 1, 0).getDate();
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], labels = [...names.slice(ws), ...names.slice(0, ws)];
  const td = today(); let cells = '';
  for (let i = 0; i < first; i++) cells += '<div class="mday blank"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = fmtDate(new Date(y, m, d)), ts = dayTasks(ds), doneN = ts.filter(t => t.status === 'Completed').length;
    cells += `<button class="mday ${ds === td ? 'today' : ''} ${ds === fmtDate(ui.date) ? 'sel' : ''}" data-act="jump-date" data-d="${ds}">
      <span class="dnum">${d}</span>${ts.length ? `<span class="dcount" title="${doneN} of ${ts.length} done">${doneN}/${ts.length}</span>` : ''}
      <div class="chips">${ts.slice(0, 3).map(t => `<span class="mchip ${t.status === 'Completed' ? 'done' : ''}" style="--c:${catColor(t.category)}">${esc(t.title)}</span>`).join('')}${ts.length > 3 ? `<span class="more">+${ts.length - 3} more</span>` : ''}</div></button>`;
  }
  el.innerHTML = `<div class="card month-card ${ui.anim ? 'anim' : ''}">
    <div class="month-head"><button class="icon-btn" data-act="month" data-n="-1">${icon('left')}</button><h2>${ui.month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><button class="icon-btn" data-act="month" data-n="1">${icon('right')}</button><button class="btn btn-ghost btn-sm" data-act="month-today">This month</button></div>
    <div class="mgrid mhead">${labels.map(l => `<div>${l}</div>`).join('')}</div><div class="mgrid mbody">${cells}</div></div>`;
  ui.anim = false;
}

/* ======================= focus zone ======================= */
const F = { mode: 'work', len: 'work', total: 1500, remaining: 1500, elapsed: 0, running: false, last: 0, acc: 0, taskId: '', timer: null, done: 0, bubble: '' };
const RING = 2 * Math.PI * 118;

function buildFocus() {
  const el = $('#view-focus'); if (!el || el.dataset.built) return; el.dataset.built = '1';
  el.innerHTML = `<div class="focus-wrap"><div class="card focus-card" id="focus-card">
    <div class="focus-top"><h2>Focus Zone</h2><label class="switch-row"><span>Playful</span><span class="switch"><input type="checkbox" id="f-playful" data-change="pref-playful"><span></span></span></label></div>
    <div class="mascot-wrap playful-only" id="f-mascot"><div class="bubble" id="f-bubble"></div><button class="mascot-body" id="f-mascot-body" data-act="mascot" aria-label="Pet the mascot"></button><span class="mascot-acc" id="f-acc"></span></div>
    <div class="focus-fields">
      <label class="fld"><span>Target task</span><select class="inp" id="f-task" data-change="f-task"></select></label>
      <label class="fld"><span>Session length</span><select class="inp" id="f-len" data-change="f-len"></select></label>
    </div>
    <div class="ring-wrap" id="f-ring-wrap">
      <svg viewBox="0 0 260 260"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="g1"/><stop offset="1" class="g2"/></linearGradient></defs>
        <circle cx="130" cy="130" r="118" class="ring-bg"/><circle id="f-ring" cx="130" cy="130" r="118" class="ring-fg" stroke="url(#rg)" stroke-dasharray="${RING.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 130 130)"/></svg>
      <div class="ring-center"><span id="f-time">25:00</span><span id="f-state">Ready</span></div>
    </div>
    <div class="focus-stats"><div><b id="f-today">0m</b><small>focus today</small></div><div><b id="f-sess">0</b><small>sessions this visit</small></div><div><b id="f-total">0h</b><small>all-time focus</small></div></div>
    <div class="focus-btns"><button class="btn btn-primary btn-lg" id="f-start" data-act="f-toggle"></button><button class="btn btn-ghost btn-lg" data-act="f-reset">${icon('reset')} Reset</button><button class="btn btn-ghost btn-lg hidden" id="f-skip" data-act="f-skip">${icon('skip')} Skip break</button><button class="btn btn-success btn-lg" data-act="f-done">${icon('check')} Mark Done</button></div>
  </div></div>`;
}
const focusLenMin = () => F.len === 'work' ? +P.workMin : F.len === 'untimed' ? 0 : +F.len;
function resetFocus(flush = true) {
  if (flush) flushFocus();
  clearInterval(F.timer); F.timer = null; F.running = false; F.elapsed = 0;
  F.mode = F.len === 'untimed' ? 'untimed' : 'work';
  F.total = F.mode === 'untimed' ? 0 : focusLenMin() * 60; F.remaining = F.total;
  F.bubble = 'Ready when you are! 🌈'; const bb = $('#f-bubble'); if (bb) bb.textContent = F.bubble;
  updateFocusUI();
}
function flushFocus() {
  if (!S || F.acc < 1) return;
  const sec = F.acc; F.acc = 0;
  const t = F.taskId && S.tasks.find(x => x.id === F.taskId);
  if (t) t.focusSec += sec; else S.game.freeSec += sec;
  const d = today(); S.focusLog[d] = (S.focusLog[d] || 0) + sec;
  S.game.fx += sec; const m = Math.floor(S.game.fx / 60);
  if (m) { S.game.fx -= m * 60; addXp(m); }
  save();
}
function tickFocus() {
  const now = Date.now(), dt = (now - F.last) / 1000; F.last = now;
  if (F.mode === 'untimed') { F.elapsed += dt; F.acc += Math.min(dt, 10); }
  else {
    F.remaining -= dt; if (F.mode === 'work') F.acc += Math.min(dt, 10);
    if (F.remaining <= 0) { F.remaining = 0; return finishPhase(); }
  }
  if (F.acc >= 30) flushFocus();
  updateFocusUI();
}
function toggleFocus() {
  if (F.running) return pauseFocus();
  F.running = true; F.last = Date.now(); F.timer = setInterval(tickFocus, 250);
  if (P.playful) { setBubble(QUOTES[Math.floor(Math.random() * QUOTES.length)]); sfx('pop'); }
  updateFocusUI();
}
function pauseFocus() {
  if (!F.running) return;
  tickFocus(); if (!F.running) return;
  clearInterval(F.timer); F.timer = null; F.running = false; flushFocus(); updateFocusUI();
}
function finishPhase() {
  clearInterval(F.timer); F.timer = null; F.running = false;
  if (F.mode === 'work') {
    flushFocus(); S.game.sessions++; F.done++; addXp(5);
    F.mode = F.done % 4 === 0 ? 'long' : 'short'; F.total = (F.mode === 'long' ? +P.longBreak : +P.shortBreak) * 60; F.remaining = F.total;
    sfx('done'); toast(`Focus session complete! Time for a ${F.mode === 'long' ? 'long' : 'short'} break.`, 'success', 5000);
    if (P.playful && P.confetti) confetti(80);
    setBubble('Amazing! Stretch, sip some water. 💧'); save();
  } else {
    F.mode = F.len === 'untimed' ? 'untimed' : 'work'; F.total = focusLenMin() * 60; F.remaining = F.total;
    sfx('break'); toast('Break is over — back to it!', 'info', 4500); setBubble("Break's over! Let's go! 🚀");
  }
  updateFocusUI();
}
function skipBreak() { if (F.mode !== 'short' && F.mode !== 'long') return; clearInterval(F.timer); F.running = false; F.mode = F.len === 'untimed' ? 'untimed' : 'work'; F.total = focusLenMin() * 60; F.remaining = F.total; updateFocusUI(); }
function markFocusDone() {
  if (!F.taskId) return toast('Pick a target task first.', 'warn');
  pauseFocus(); const id = F.taskId;
  setStatus(id, 'Completed'); F.taskId = ''; resetFocus(false); refreshFocusUI();
}
function setBubble(txt) { F.bubble = txt; const b = $('#f-bubble'); if (b) b.textContent = txt; }
function refreshFocusUI() {
  const sel = $('#f-task'); if (!sel || !S) return;
  const td = today();
  const opts = S.tasks.filter(t => (t.date === td && t.status === 'Pending') || t.id === F.taskId);
  if (F.taskId && !opts.some(t => t.id === F.taskId)) F.taskId = '';
  sel.innerHTML = `<option value="">Free focus (no task)</option>` + sortTasks(opts).map(t => `<option value="${t.id}" ${t.id === F.taskId ? 'selected' : ''}>${esc(t.title)} (${esc(t.category)})</option>`).join('');
  const len = $('#f-len');
  len.innerHTML = `<option value="work">Pomodoro · ${+P.workMin} min</option><option value="15">Quick burst · 15 min</option><option value="50">Deep work · 50 min</option><option value="90">Marathon · 90 min</option><option value="untimed">Untimed stopwatch</option>`;
  len.value = F.len;
  updateFocusUI();
}
function updateFocusUI() {
  const disp = $('#f-time'); if (!disp) return;
  const val = F.mode === 'untimed' ? F.elapsed : F.remaining, s = Math.max(0, Math.ceil(F.mode === 'untimed' ? Math.floor(val) : val));
  const txt = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  disp.textContent = txt;
  const brk = F.mode === 'short' || F.mode === 'long';
  const state = F.running ? (brk ? 'Break' : F.mode === 'untimed' ? 'Stopwatch' : 'Focusing') : (F.elapsed > 0 || F.remaining < F.total ? 'Paused' : brk ? 'Break ready' : 'Ready');
  $('#f-state').textContent = state;
  const ring = $('#f-ring');
  ring.style.strokeDashoffset = F.mode === 'untimed' || !F.total ? 0 : (RING * (1 - F.remaining / F.total)).toFixed(2);
  $('#f-start').innerHTML = F.running ? `${icon('pause')} Pause` : `${icon('play')} ${brk ? 'Start Break' : F.remaining < F.total || F.elapsed > 0 ? 'Resume' : 'Start Timer'}`;
  $('#f-skip').classList.toggle('hidden', !brk);
  const card = $('#focus-card'); card.dataset.state = F.running ? (brk ? 'break' : 'work') : 'idle';
  const fd = Math.round((S.focusLog[today()] || 0) / 60 + F.acc / 60);
  $('#f-today').textContent = fd + 'm'; $('#f-sess').textContent = F.done;
  const tot = sum(S.tasks.map(t => t.focusSec)) + S.game.freeSec + F.acc; $('#f-total').textContent = tot >= 3600 ? (tot / 3600).toFixed(1) + 'h' : Math.round(tot / 60) + 'm';
  const mb = $('#f-mascot-body'); mb.textContent = P.mascot;
  mb.dataset.mood = F.running ? (brk ? 'break' : 'work') : 'idle';
  $('#f-acc').textContent = F.running ? (brk ? '☕' : '🎧') : '';
  if (!F.bubble) setBubble('Ready when you are! 🌈');
  document.title = F.running ? `${txt} · Ghadi Ka Pahiya` : 'Ghadi Ka Pahiya | Productivity Calendar';
}

/* ======================= syllabus ======================= */
const chaptersOf = sk => [...(SYLLABUS[sk] || []), ...(S.customChapters[sk] || [])];
const chKey = (sk, ch) => `${sk}_${ch}`;
const stageOf = key => { const v = S.syllabus[key]; const i = STAGES.indexOf(v); return i < 0 ? 0 : i; };
const daysSince = ds => ds ? Math.floor((dayStart(new Date()) - parseDate(ds)) / 86400000) : null;
function subjectProgress(sk) {
  const chs = chaptersOf(sk); if (!chs.length) return { pct: 0, mastered: 0, total: 0 };
  const w = sum(chs.map(c => STAGE_W[stageOf(chKey(sk, c))]));
  return { pct: Math.round(w / chs.length * 100), mastered: chs.filter(c => stageOf(chKey(sk, c)) === 4).length, total: chs.length };
}
function ringSvg(pct, size = 64) {
  const r = 15.9155;
  return `<svg class="pring" viewBox="0 0 36 36" width="${size}" height="${size}"><circle cx="18" cy="18" r="${r}" class="pr-bg"/><circle cx="18" cy="18" r="${r}" class="pr-fg" stroke-dasharray="${pct} ${100 - pct}" transform="rotate(-90 18 18)"/><text x="18" y="21" text-anchor="middle">${pct}%</text></svg>`;
}
function renderSyllabus() {
  const el = $('#view-syllabus'), y = ui.syl;
  const examSubs = SYL_SUBJECTS.map(s => `${y.exam} - ${s}`);
  const prog = examSubs.map(subjectProgress);
  const total = sum(prog.map(p => p.total)), overall = total ? Math.round(sum(prog.map((p, i) => p.pct * p.total)) / total) : 0;
  const mastered = sum(prog.map(p => p.mastered));
  // next up: weakest chapters across the exam
  const cand = [];
  examSubs.forEach(sk => chaptersOf(sk).forEach(ch => { const k = chKey(sk, ch), st = stageOf(k); if (st < 4) cand.push({ sk, ch, st, conf: (S.syllabusMeta[k] || {}).conf || 0 }); }));
  cand.sort((a, b) => a.st - b.st || a.conf - b.conf);
  const next = cand.slice(0, 3);
  const due = [];
  examSubs.forEach(sk => chaptersOf(sk).forEach(ch => { const k = chKey(sk, ch), m = S.syllabusMeta[k]; if (m && m.revised && stageOf(k) > 0 && daysSince(m.revised) >= 14) due.push({ sk, ch }); }));
  el.innerHTML = `
    <div class="page-head"><div><h2>Syllabus Tracker</h2><p class="sub">Click a stage to update it. Rate your confidence and mark revisions to keep chapters fresh.</p></div></div>
    <div class="syl-top card">
      <div class="syl-ring">${ringSvg(overall, 78)}<div><b>${esc(y.exam)}</b><small>${mastered} of ${total} chapters mastered</small></div></div>
      <div class="syl-next">
        <small class="cap">Next up</small>
        <div class="chip-row">${next.length ? next.map(n => `<button class="chip" data-act="syl-jump" data-sk="${esc(n.sk)}" data-ch="${esc(n.ch)}">${esc(n.sk.split(' - ')[1])} · ${esc(n.ch)}</button>`).join('') : '<span class="muted">Everything mastered — legendary! 🏆</span>'}</div>
        ${due.length ? `<small class="cap">Due for revision (${due.length})</small><div class="chip-row">${due.slice(0, 4).map(n => `<button class="chip warn" data-act="syl-jump" data-sk="${esc(n.sk)}" data-ch="${esc(n.ch)}">${esc(n.ch)}</button>`).join('')}</div>` : ''}
      </div>
    </div>
    <div class="syl-bar">
      <div class="seg">${SYL_EXAMS.map(e => `<button class="${y.exam === e ? 'on' : ''}" data-act="syl-exam" data-v="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      <div class="seg tabs-sub">${SYL_SUBJECTS.map((s, i) => `<button class="${y.subject === s ? 'on' : ''}" data-act="syl-subject" data-v="${s}">${s}<em>${prog[i].pct}%</em></button>`).join('')}</div>
    </div>
    <div class="syl-tools">
      <label class="search">${icon('search')}<input class="inp" id="syl-q" data-input="syl-q" placeholder="Search chapters…" value="${esc(y.q)}"></label>
      <select class="inp sm" data-change="syl-filter"><option value="all">All stages</option>${STAGES.map(s => `<option ${y.filter === s ? 'selected' : ''}>${s}</option>`).join('')}<option value="due" ${y.filter === 'due' ? 'selected' : ''}>Due for revision</option></select>
    </div>
    <div id="syl-list" class="card syl-list"></div>`;
  renderSylList();
}
function renderSylList() {
  const box = $('#syl-list'); if (!box) return;
  const y = ui.syl, sk = `${y.exam} - ${y.subject}`, q = y.q.trim().toLowerCase();
  const custom = S.customChapters[sk] || [];
  let rows = chaptersOf(sk).filter(ch => {
    const k = chKey(sk, ch), m = S.syllabusMeta[k] || {};
    if (q && !ch.toLowerCase().includes(q)) return false;
    if (y.filter === 'due') return m.revised && stageOf(k) > 0 && daysSince(m.revised) >= 14;
    if (y.filter !== 'all') return STAGES[stageOf(k)] === y.filter;
    return true;
  });
  const html = rows.map(ch => {
    const k = chKey(sk, ch), st = stageOf(k), m = S.syllabusMeta[k] || {}, rev = daysSince(m.revised), isDue = m.revised && st > 0 && rev >= 14;
    return `<div class="syl-row ${y.hl === k ? 'hl' : ''}" id="row-${esc(k).replace(/[^\w-]/g, '_')}" style="--sc:${STAGE_COLOR[st]}">
      <span class="sdot"></span>
      <div class="sname"><b>${esc(ch)}</b><small>${m.revised ? `Revised ${rev === 0 ? 'today' : rev + 'd ago'}` : 'Not revised yet'}${isDue ? ' · <span class="due">revise soon</span>' : ''}</small></div>
      <select class="sel stage" data-change="syl-status" data-key="${esc(k)}">${STAGES.map((s, i) => `<option ${i === st ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <div class="conf" title="Confidence">${[1, 2, 3, 4, 5].map(n => `<button class="${(m.conf || 0) >= n ? 'on' : ''}" data-act="syl-conf" data-key="${esc(k)}" data-v="${n}">${icon('star')}</button>`).join('')}</div>
      <div class="srow-actions">
        <button class="icon-btn" data-act="syl-rev" data-key="${esc(k)}" title="Mark revised today">${icon('check')}</button>
        <button class="icon-btn" data-act="syl-sched" data-sk="${esc(sk)}" data-ch="${esc(ch)}" title="Schedule a study task">${icon('calendar')}</button>
        <button class="icon-btn ${m.notes ? 'has' : ''}" data-act="syl-note" data-key="${esc(k)}" title="Notes">${icon('note')}</button>
        ${custom.includes(ch) ? `<button class="icon-btn danger" data-act="syl-del" data-sk="${esc(sk)}" data-ch="${esc(ch)}" title="Remove custom chapter">${icon('trash')}</button>` : ''}
      </div>
      ${y.note === k ? `<textarea class="inp syl-note" data-input="syl-note" data-key="${esc(k)}" placeholder="Formulae, weak spots, resources…">${esc(m.notes || '')}</textarea>` : ''}
    </div>`;
  }).join('');
  box.innerHTML = (html || `<div class="empty small"><p>No chapters match.</p></div>`) + `
    <form class="syl-add" data-form="syl-add"><input class="inp" id="syl-new" placeholder="Add a custom chapter to ${esc(y.subject)}…" maxlength="80"><button class="btn btn-ghost">${icon('plus')} Add</button></form>`;
  if (y.hl) { const r = $('.syl-row.hl', box); if (r) r.scrollIntoView({ block: 'center', behavior: motionOn() ? 'smooth' : 'auto' }); y.hl = null; }
}
const sylMeta = k => (S.syllabusMeta[k] = S.syllabusMeta[k] || {});

/* ======================= settings ======================= */
const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(P[key]) === String(v) ? 'on' : ''}" data-act="pref" data-key="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
const toggleCtl = key => `<label class="switch"><input type="checkbox" data-change="pref" data-key="${key}" ${P[key] ? 'checked' : ''}><span></span></label>`;
const rng = (key, min, max, step = 1, unit = '') => `<div class="rng"><input type="range" min="${min}" max="${max}" step="${step}" value="${P[key]}" data-input="pref-range" data-key="${key}" data-unit="${unit}"><output>${P[key]}${unit}</output></div>`;
const numCtl = (key, min, max) => `<input class="inp num" type="number" min="${min}" max="${max}" value="${P[key]}" data-change="pref-num" data-key="${key}" data-min="${min}" data-max="${max}">`;
const sRow = (t, d, c) => `<div class="srow"><div class="stxt"><b>${t}</b><p>${d}</p></div><div class="sctl">${c}</div></div>`;

function renderSettings() {
  const el = $('#view-settings'), keep = $('#views').scrollTop;
  const hasLegacy = !!localStorage.getItem(LEGACY + 'tasks');
  el.innerHTML = `
    <div class="page-head"><div><h2>Settings</h2><p class="sub">Make Ghadi Ka Pahiya yours. Changes apply instantly and sync to your account.</p></div></div>

    <div class="card sect"><h3>${icon('user')} Profile</h3>
      <div class="profile">
        <div class="avatar">${esc((session.user || '?')[0].toUpperCase())}</div>
        <div><b>${esc(session.user)}</b><p class="muted">${session.mode === 'server' ? 'Signed in · data syncs to the server' : 'Local mode · data lives in this browser only'}</p></div>
      </div>
      ${session.mode === 'server' ? `<form class="grid3" data-form="account">
        <label class="fld"><span>New username</span><input class="inp" id="acc-user" placeholder="${esc(session.user)}" autocomplete="off"></label>
        <label class="fld"><span>New password</span><input class="inp" id="acc-new" type="password" placeholder="Leave blank to keep" autocomplete="new-password"></label>
        <label class="fld"><span>Current password</span><input class="inp" id="acc-cur" type="password" required autocomplete="current-password"></label>
        <div><button class="btn btn-primary">Save profile</button></div></form>` : ''}
    </div>

    <div class="card sect"><h3>${icon('spark')} Theme presets</h3>
      <div class="presets">${Object.entries(PRESETS).map(([id, p]) => `<button class="preset" data-act="preset" data-id="${id}"><span class="pe">${p.e}</span><b>${p.name}</b><i style="background:linear-gradient(135deg,${ACCENTS[p.accent][0]},${ACCENTS[p.accent][1]})"></i></button>`).join('')}</div>
    </div>

    <div class="card sect"><h3>${icon('sun')} Appearance</h3>
      ${sRow('Mode', 'Light, dark, or follow your device.', seg('theme', [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]))}
      ${sRow('Accent colour', 'Pick a palette or mix your own.', `<div class="swatches">${Object.entries(ACCENTS).map(([k, [a, b]]) => `<button class="swatch ${P.accent === k ? 'on' : ''}" data-act="accent" data-k="${k}" title="${k}" style="background:linear-gradient(135deg,${a},${b})"></button>`).join('')}<label class="swatch custom ${P.accent === 'custom' ? 'on' : ''}" title="Custom colour"><input type="color" value="${P.customAccent}" data-input="custom-accent">+</label></div>`)}
      ${sRow('Background', 'The scenery behind everything.', seg('bg', [['plain', 'Plain'], ['gradient', 'Gradient'], ['aurora', 'Aurora'], ['dots', 'Dots']]))}
      ${sRow('Light brightness', 'Warm paper to harsh white.', rng('lightLum', 235, 255))}
      ${sRow('Dark depth', 'Slate to pure OLED black.', rng('darkLum', 0, 60))}
      ${sRow('Card style', 'How panels look.', seg('card', [['glass', 'Glass'], ['solid', 'Solid'], ['outline', 'Outline']]))}
      ${sRow('Corners', 'From crisp to bubbly.', seg('radius', [['sharp', 'Sharp'], ['normal', 'Normal'], ['round', 'Round'], ['pill', 'Bubbly']]))}
      ${sRow('Density', 'How much breathing room.', seg('density', [['compact', 'Compact'], ['comfortable', 'Comfy'], ['spacious', 'Spacious']]))}
      ${sRow('Font', 'The voice of the interface.', `<div class="seg fonts">${FONTS.map(([v, l]) => `<button class="${P.font === v ? 'on' : ''}" data-act="pref" data-key="font" data-val="${v}" data-f="${v}">${l}</button>`).join('')}</div>`)}
      ${sRow('Text size', 'Scale the whole interface.', rng('fontSize', 13, 20, 1, 'px'))}
      ${sRow('Animations', 'Reduce or disable motion.', seg('motion', [['full', 'Full'], ['reduced', 'Reduced'], ['off', 'Off']]))}
      ${sRow('Sidebar', 'Full labels or icons only.', seg('sidebar', [['full', 'Full'], ['compact', 'Icons']]))}
    </div>

    <div class="card sect"><h3>${icon('sliders')} Preferences</h3>
      ${sRow('Start page', 'Where you land after signing in.', `<select class="inp sm" data-change="pref-select" data-key="startView">${NAV.map(n => `<option value="${n[0]}" ${P.startView === n[0] ? 'selected' : ''}>${n[1]}</option>`).join('')}</select>`)}
      ${sRow('24-hour time', 'Show 18:30 instead of 6:30 PM.', toggleCtl('time24'))}
      ${sRow('Week starts on', 'Used by the monthly calendar.', seg('weekStart', [[0, 'Sunday'], [1, 'Monday']]))}
      ${sRow('Overload limit', 'Warn when a day exceeds this many weighted hours.', numCtl('overload', 2, 24))}
    </div>

    <div class="card sect"><h3>${icon('timer')} Focus &amp; Pomodoro</h3>
      ${sRow('Focus length', 'Minutes per Pomodoro session.', numCtl('workMin', 5, 120))}
      ${sRow('Short break', 'Minutes.', numCtl('shortBreak', 1, 30))}
      ${sRow('Long break', 'Every fourth session, minutes.', numCtl('longBreak', 5, 60))}
      ${sRow('Sound effects', 'Chimes when sessions end (and pops in playful mode).', toggleCtl('sound'))}
    </div>

    <div class="card sect playful-sect"><h3>🎈 Playful mode</h3>
      ${sRow('Enable playful mode', 'Bubbly fonts, floating shapes, a living mascot, confetti and XP fanfare everywhere.', toggleCtl('playful'))}
      ${sRow('Mascot', 'Your focus buddy.', `<div class="seg mascots">${MASCOTS.map(m => `<button class="${P.mascot === m ? 'on' : ''}" data-act="pref" data-key="mascot" data-val="${m}">${m}</button>`).join('')}</div>`)}
      ${sRow('Cursor sparkles', 'A trail of stars follows your mouse.', toggleCtl('sparkles'))}
      ${sRow('Confetti', 'Celebrate completed tasks and level-ups.', toggleCtl('confetti'))}
    </div>

    <div class="card sect"><h3>${icon('grid')} Categories <small>(max 5)</small></h3>
      <div class="cat-list">${S.categories.map(c => `<div class="cat-row"><input type="color" value="${catColor(c)}" data-input="cat-color" data-c="${esc(c)}" title="Colour"><b>${esc(c)}</b><label title="Workload weight (used for overload warnings)">weight <input class="inp num" type="number" min="0.1" max="5" step="0.1" value="${catWeight(c)}" data-change="cat-weight" data-c="${esc(c)}"></label><button class="icon-btn danger" data-act="cat-remove" data-c="${esc(c)}" title="Remove">${icon('x')}</button></div>`).join('')}</div>
      <form class="inline-form" data-form="cat-add"><input class="inp" id="cat-new" placeholder="New category…" maxlength="24"><button class="btn btn-ghost">${icon('plus')} Add</button></form>
    </div>

    <div class="card sect"><h3>${icon('download')} Data</h3>
      <div class="btn-row">
        <button class="btn btn-ghost" data-act="export" data-f="csv">${icon('download')} Export CSV</button>
        <button class="btn btn-ghost" data-act="export" data-f="json">${icon('download')} Export JSON backup</button>
        <button class="btn btn-ghost" data-act="import">${icon('upload')} Import JSON</button>
        ${hasLegacy ? `<button class="btn btn-ghost" data-act="legacy">${icon('database')} Import data from old version</button>` : ''}
        <button class="btn btn-ghost" data-act="reset-appearance">${icon('reset')} Reset appearance</button>
      </div>
    </div>

    <div class="card sect"><h3>${icon('cmd')} Shortcuts</h3>
      <div class="keys"><span><kbd>N</kbd> New task</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> Command palette</span><span><kbd>←</kbd><kbd>→</kbd> Change day</span><span><kbd>T</kbd> Jump to today</span><span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> Save notes</span><span><kbd>Esc</kbd> Close dialogs</span></div>
    </div>

    <div class="card sect danger-zone"><h3>${icon('alert')} Danger zone</h3>
      <div class="btn-row"><button class="btn btn-danger-soft" data-act="delete-account">${session.mode === 'server' ? 'Delete account' : 'Erase local data'}</button>${session.mode === 'server' ? `<button class="btn btn-ghost" data-act="logout">${icon('logout')} Log out</button>` : ''}</div>
    </div>`;
  $('#views').scrollTop = keep;
}

function exportData(fmt) {
  if (!S.tasks.length && fmt === 'csv') return toast('No tasks to export', 'warn');
  const stamp = fmtDate(new Date());
  if (fmt === 'json') return download(JSON.stringify(S, null, 2), 'application/json', `ghadi_backup_${stamp}.json`);
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['ID', 'Title', 'Date', 'Category', 'StartTime', 'EndTime', 'Status', 'Priority', 'Notes', 'FocusMinutes'];
  const rows = S.tasks.map(t => [t.id, t.title, t.date, t.category, t.startTime, t.endTime, t.status, t.priority, t.notes, Math.round(t.focusSec / 60)].map(cell).join(','));
  download('\ufeff' + [head.join(','), ...rows].join('\n'), 'text/csv', `ghadi_tasks_${stamp}.csv`);
}
function download(content, mime, name) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
}
function mergeImport(raw) {
  const incoming = Array.isArray(raw) ? { tasks: raw } : raw;
  if (!incoming || !Array.isArray(incoming.tasks)) throw new Error('This file does not look like a Ghadi backup.');
  const ns = normalize(incoming), ids = new Set(S.tasks.map(t => t.id));
  let added = 0;
  ns.tasks.forEach(t => { if (!ids.has(t.id)) { S.tasks.push(t); added++; } });
  ns.categories.forEach(c => { if (!S.categories.includes(c) && S.categories.length < 5) S.categories.push(c); });
  Object.assign(S.catColors, { ...ns.catColors, ...S.catColors }); Object.assign(S.catWeights, { ...ns.catWeights, ...S.catWeights });
  Object.assign(S.syllabus, { ...ns.syllabus, ...S.syllabus }); Object.assign(S.syllabusMeta, { ...ns.syllabusMeta, ...S.syllabusMeta });
  Object.keys(ns.customChapters).forEach(k => { S.customChapters[k] = [...new Set([...(S.customChapters[k] || []), ...(ns.customChapters[k] || [])])]; });
  Object.keys(ns.focusLog).forEach(d => { if (!(d in S.focusLog)) S.focusLog[d] = ns.focusLog[d]; });
  return added;
}
function importFile() {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  inp.onchange = async () => {
    try { const added = mergeImport(JSON.parse(await inp.files[0].text())); save(); renderView(); toast(`Imported ${added} new task${added === 1 ? '' : 's'}`, 'success'); }
    catch (e) { toast(e.message || 'Import failed', 'error'); }
  };
  inp.click();
}
async function importLegacy() {
  const r = await dialog({ title: 'Import from old version', message: 'Enter the username you used in the old version. Its tasks, categories and syllabus progress will be merged into this account.', input: { placeholder: 'Old username', value: session.mode === 'server' ? session.user : '' }, actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Import', value: 'ok', cls: 'btn-primary' }] });
  if (!r || !r.text) return;
  try {
    const tasks = (JSON.parse(localStorage.getItem(LEGACY + 'tasks')) || []).filter(t => t.owner === r.text);
    const cats = JSON.parse(localStorage.getItem(LEGACY + 'categories_' + r.text)) || [];
    const syl = JSON.parse(localStorage.getItem(LEGACY + 'syllabus_' + r.text)) || {};
    if (!tasks.length && !cats.length && !Object.keys(syl).length) return toast(`No old data found for “${r.text}”.`, 'warn');
    const added = mergeImport({ tasks, categories: cats, syllabus: syl });
    save(); renderView(); toast(`Imported ${added} tasks from the old version`, 'success');
  } catch { toast('Could not read old data', 'error'); }
}

/* ======================= onboarding ======================= */
function openOnboarding() {
  const bd = showModal('<div id="onb"></div>', { dismiss: false, wide: true });
  bd.dataset.onb = '1'; renderOnboarding();
}
const onbSel = new Set(['JEE', 'School', 'Personal']);
function renderOnboarding() {
  const box = $('#onb'); if (!box) return;
  const pool = [...new Set([...BASE_CATS.map(c => c.name), ...onbSel])];
  box.innerHTML = `<div class="modal-head"><div><h3>Select your focus areas</h3><p class="muted">Choose or add up to 5 categories that matter most (${onbSel.size}/5).</p></div></div>
    <div class="modal-body"><div class="onb-grid">${pool.map(c => `<label class="onb-item ${onbSel.has(c) ? 'on' : ''}" style="--c:${(BASE_CATS.find(b => b.name === c) || { c: '#94a3b8' }).c}"><input type="checkbox" data-change="onb-cat" data-c="${esc(c)}" ${onbSel.has(c) ? 'checked' : ''}><i></i><span>${esc(c)}</span></label>`).join('')}</div>
      <form class="inline-form" data-form="onb-add"><input class="inp" id="onb-new" placeholder="Add a custom category…" maxlength="24"><button class="btn btn-ghost">${icon('plus')} Add</button></form></div>
    <div class="modal-foot"><button class="btn btn-primary" data-act="onb-save">Complete setup</button></div>`;
}
function saveOnboarding() {
  if (!onbSel.size) return toast('Please select at least one category.', 'warn');
  S.categories = [...onbSel].slice(0, 5);
  S.categories.forEach(c => { if (!S.catColors[c]) S.catColors[c] = (BASE_CATS.find(b => b.name === c) || {}).c || nextPaletteColor(); });
  $$('.modal-bd[data-onb]').forEach(b => b.close());
  save(); startUI();
}

/* ======================= command palette ======================= */
function openPalette() {
  if (!S) return;
  const bd = showModal(`<div class="pal"><div class="pal-in">${icon('search')}<input id="pal-q" class="inp" placeholder="Type a command or search tasks…" autocomplete="off"></div><div id="pal-list" class="pal-list"></div></div>`, { cls: 'palette' });
  const actions = () => [
    ...NAV.map(n => ({ l: `Go to ${n[1]}`, i: n[2], run: () => switchView(n[0]) })),
    { l: 'New task', i: 'plus', run: () => openTaskModal() },
    { l: 'Toggle light / dark', i: 'moon', run: () => { setPref('theme', document.documentElement.classList.contains('dark') ? 'light' : 'dark'); } },
    { l: P.playful ? 'Turn off playful mode' : 'Turn on playful mode', i: 'spark', run: () => { setPref('playful', !P.playful); if (ui.view === 'settings') renderSettings(); } },
    { l: 'Start / pause focus timer', i: 'timer', run: () => { switchView('focus'); toggleFocus(); } },
    { l: 'Export tasks (CSV)', i: 'download', run: () => exportData('csv') },
    { l: 'Log out', i: 'logout', run: logout }
  ];
  let items = [];
  const draw = () => {
    const q = $('#pal-q', bd).value.trim().toLowerCase();
    items = actions().filter(a => !q || a.l.toLowerCase().includes(q));
    if (q) S.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 6).forEach(t => items.push({ l: `${t.title} — ${t.date}`, i: 'calendar', run: () => { ui.date = parseDate(t.date); switchView('calendar'); } }));
    $('#pal-list', bd).innerHTML = items.map((a, i) => `<button class="pal-item ${i === 0 ? 'on' : ''}" data-i="${i}">${icon(a.i)}<span>${esc(a.l)}</span></button>`).join('') || '<p class="muted pad">Nothing found.</p>';
  };
  const run = i => { const a = items[i]; if (!a) return; bd.close(); setTimeout(a.run, 120); };
  $('#pal-q', bd).addEventListener('input', draw);
  $('#pal-q', bd).addEventListener('keydown', e => {
    const list = $$('.pal-item', bd), cur = list.findIndex(x => x.classList.contains('on'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = clamp(cur + (e.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1); list.forEach((x, i) => x.classList.toggle('on', i === n)); list[n] && list[n].scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') run(Math.max(cur, 0));
  });
  $('#pal-list', bd).addEventListener('click', e => { const b = e.target.closest('.pal-item'); if (b) run(+b.dataset.i); });
  draw();
}

/* ======================= admin entry (logo secret) ======================= */
let logoClicks = 0, logoTimer = null;
function handleLogoClick() {
  const logo = $('#brand-btn'); logoClicks++; clearTimeout(logoTimer);
  logo.style.setProperty('--p', logoClicks / 5); logo.classList.remove('tap'); void logo.offsetWidth; logo.classList.add('tap');
  if (logoClicks >= 5) { logoClicks = 0; logo.style.setProperty('--p', 0); logo.classList.add('unlock'); setTimeout(() => logo.classList.remove('unlock'), 1200); openAdminAuth(); }
  else logoTimer = setTimeout(() => { logoClicks = 0; logo.style.setProperty('--p', 0); }, 2000);
}

/* ======================= event delegation ======================= */
const ACT = {
  nav: el => { switchView(el.dataset.view); sfx('click'); },
  logo: handleLogoClick,
  'new-task': () => openTaskModal(),
  'close-modal': el => { const bd = el.closest('.modal-bd'); bd && bd.close(); },
  prev: () => { ui.date = addDays(ui.date, -1); ui.anim = true; renderView(); },
  next: () => { ui.date = addDays(ui.date, 1); ui.anim = true; renderView(); },
  today: () => { ui.date = dayStart(new Date()); ui.anim = true; renderView(); },
  filter: el => { ui.filter = el.dataset.f; renderView(); },
  'task-open': el => openNotes(el.dataset.id),
  'task-toggle': el => { const t = S.tasks.find(x => x.id === el.dataset.id); if (t) setStatus(t.id, t.status === 'Completed' ? 'Pending' : 'Completed'); },
  'task-edit': el => { const t = S.tasks.find(x => x.id === el.dataset.id); if (t) openTaskModal(t); },
  'task-del': el => deleteTask(el.dataset.id),
  'task-focus': el => { $$('.modal-bd').forEach(b => b.close()); F.taskId = el.dataset.id; switchView('focus'); refreshFocusUI(); },
  'notes-save': el => { const t = S.tasks.find(x => x.id === el.dataset.id); if (t) { t.notes = $('#notes-input').value; save(); } $$('.modal-bd').forEach(b => b.close()); renderView(); },
  month: el => { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + (+el.dataset.n), 1); renderMonthly(); },
  'month-today': () => { ui.month = dayStart(new Date()); renderMonthly(); },
  'jump-date': el => { ui.date = parseDate(el.dataset.d); switchView('calendar'); },
  'f-toggle': toggleFocus, 'f-reset': () => resetFocus(true), 'f-skip': skipBreak, 'f-done': markFocusDone,
  mascot: el => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]; setBubble(q); sfx('pop');
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    if (P.playful) emojiBurst(['💖', '✨', '💫'], 6);
  },
  pref: el => {
    const k = el.dataset.key; let v = el.dataset.val; if (typeof DEFAULT_PREFS[k] === 'number') v = +v;
    setPref(k, v);
    $$(`[data-act=pref][data-key=${k}]`).forEach(b => b.classList.toggle('on', b === el));
  },
  accent: el => { P.accent = el.dataset.k; applyPrefs(); save(); $$('.swatch').forEach(s => s.classList.toggle('on', s === el)); },
  preset: el => { Object.assign(P, PRESETS[el.dataset.id]); delete P.name; delete P.e; applyPrefs(); save(); renderSettings(); toast(`${PRESETS[el.dataset.id].name} theme applied`, 'success'); },
  'reset-appearance': async () => {
    if (!(await confirmDlg('Reset appearance?', 'Theme, colours, fonts and layout options return to defaults. Your data is untouched.', { ok: 'Reset' }))) return;
    ['theme', 'accent', 'customAccent', 'bg', 'lightLum', 'darkLum', 'card', 'radius', 'density', 'font', 'fontSize', 'motion', 'sidebar'].forEach(k => P[k] = DEFAULT_PREFS[k]);
    applyPrefs(); save(); renderSettings();
  },
  'toggle-theme': () => setPref('theme', document.documentElement.classList.contains('dark') ? 'light' : 'dark'),
  palette: openPalette,
  'cat-remove': async el => {
    const c = el.dataset.c, n = S.tasks.filter(t => t.category === c).length;
    if (S.categories.length <= 1) return toast('Keep at least one category.', 'warn');
    if (!(await confirmDlg(`Remove “${c}”?`, n ? `${n} existing task${n > 1 ? 's' : ''} keep this label but it won't appear as a filter.` : 'This category has no tasks.', { ok: 'Remove', danger: true }))) return;
    S.categories = S.categories.filter(x => x !== c); save(); renderView();
  },
  export: el => exportData(el.dataset.f), import: importFile, legacy: importLegacy,
  logout: logout,
  'delete-account': async () => {
    if (session.mode === 'local') {
      if (!(await typeConfirm('Erase local data', 'This permanently deletes everything stored in this browser for Ghadi Ka Pahiya.', 'DELETE'))) return;
      localStorage.removeItem(LOCAL_KEY); localStorage.removeItem(PREFS_KEY); return location.reload();
    }
    const r = await dialog({ title: 'Delete account', danger: true, message: 'This permanently deletes your account and all data. Enter your password and type DELETE to confirm.', input: { placeholder: 'Your password', type: 'password' }, actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Delete forever', value: 'ok', cls: 'btn-danger' }] });
    if (!r || !r.text) return;
    if (!(await typeConfirm('Final confirmation', 'There is no undo.', 'DELETE'))) return;
    try { await api('DELETE', '/api/account', { password: r.text }); localStorage.removeItem(TOKEN_KEY); location.reload(); } catch (e) { toast(e.message, 'error'); }
  },
  'syl-exam': el => { ui.syl.exam = el.dataset.v; renderSyllabus(); },
  'syl-subject': el => { ui.syl.subject = el.dataset.v; renderSyllabus(); },
  'syl-conf': el => { const m = sylMeta(el.dataset.key), v = +el.dataset.v; m.conf = m.conf === v ? 0 : v; save(); renderSyllabus(); },
  'syl-rev': el => { sylMeta(el.dataset.key).revised = today(); save(); toast('Marked as revised today', 'success'); renderSyllabus(); },
  'syl-note': el => { ui.syl.note = ui.syl.note === el.dataset.key ? null : el.dataset.key; renderSylList(); const t = $('.syl-note'); if (t) t.focus(); },
  'syl-sched': el => { const sub = el.dataset.sk.split(' - ')[1]; openTaskModal(null, { title: `Study: ${el.dataset.ch} (${sub})`, category: S.categories.find(c => c === 'JEE') || S.categories.find(c => c === 'School') || S.categories[0], date: today() }); },
  'syl-del': async el => {
    if (!(await confirmDlg('Remove chapter?', `“${esc(el.dataset.ch)}” and its progress will be removed.`, { ok: 'Remove', danger: true }))) return;
    const sk = el.dataset.sk; S.customChapters[sk] = (S.customChapters[sk] || []).filter(c => c !== el.dataset.ch);
    delete S.syllabus[chKey(sk, el.dataset.ch)]; delete S.syllabusMeta[chKey(sk, el.dataset.ch)]; save(); renderSyllabus();
  },
  'syl-jump': el => { const [exam, subject] = el.dataset.sk.split(' - '); Object.assign(ui.syl, { exam, subject, q: '', filter: 'all', hl: chKey(el.dataset.sk, el.dataset.ch) }); renderSyllabus(); },
  'range': el => { ui.range = +el.dataset.v; renderAnalytics(); },
  'auth-tab': el => setAuthTab(el.dataset.m),
  'site-hint': () => toast('Hint: 0 spaces and 0 capital digits', 'info', 4000),
  'local-mode': enterLocal,
  'dismiss-announce': el => { localStorage.setItem('ghadi_v4_dismissed', el.dataset.id); $('#announce').classList.add('hidden'); },
  'onb-save': saveOnboarding
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (e.target.closest('select,option,input,textarea') && !el.matches('select,input,textarea')) return;
  const fn = ACT[el.dataset.act] || (typeof ADMIN_ACT !== 'undefined' && ADMIN_ACT[el.dataset.act]);
  if (fn) fn(el, e);
});

const CHANGE = {
  status: el => setStatus(el.dataset.id, el.value),
  'date-input': el => { if (el.value) { ui.date = parseDate(el.value); ui.anim = true; renderView(); } },
  'tf-untimed': el => { $('#tf-start').disabled = $('#tf-end').disabled = el.checked; },
  'f-task': el => { F.taskId = el.value; },
  'f-len': el => { F.len = el.value; resetFocus(true); },
  'pref-playful': el => { setPref('playful', el.checked); },
  pref: el => setPref(el.dataset.key, el.checked),
  'pref-num': el => { const v = clamp(parseFloat(el.value) || DEFAULT_PREFS[el.dataset.key], +el.dataset.min, +el.dataset.max); el.value = v; setPref(el.dataset.key, v); },
  'pref-select': el => setPref(el.dataset.key, el.value),
  'syl-status': el => { S.syllabus[el.dataset.key] = el.value; const m = sylMeta(el.dataset.key); if (el.value !== 'Not Started' && !m.revised) m.revised = today(); save(); renderSyllabus(); if (el.value === 'Mastered' && P.playful) { confetti(60); sfx('done'); } },
  'syl-filter': el => { ui.syl.filter = el.value; renderSylList(); },
  'cat-weight': el => { S.catWeights[el.dataset.c] = clamp(parseFloat(el.value) || 1, 0.1, 5); save(); },
  'onb-cat': el => {
    if (el.checked) { if (onbSel.size >= 5) { el.checked = false; return toast('Maximum of 5 categories allowed.', 'warn'); } onbSel.add(el.dataset.c); } else onbSel.delete(el.dataset.c);
    renderOnboarding();
  }
};
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el); });
let noteSave = null;
const INPUT = {
  'pref-range': el => { const v = +el.value; P[el.dataset.key] = v; applyPrefs(); el.nextElementSibling.textContent = v + (el.dataset.unit || ''); clearTimeout(INPUT._t); INPUT._t = setTimeout(save, 400); },
  'custom-accent': el => { P.accent = 'custom'; P.customAccent = el.value; applyPrefs(); $$('.swatch').forEach(s => s.classList.toggle('on', s.classList.contains('custom'))); clearTimeout(INPUT._t); INPUT._t = setTimeout(save, 400); },
  'cat-color': el => { S.catColors[el.dataset.c] = el.value; clearTimeout(INPUT._t); INPUT._t = setTimeout(() => { save(); renderFilters(); }, 300); },
  'syl-q': el => { ui.syl.q = el.value; renderSylList(); },
  'syl-note': el => { sylMeta(el.dataset.key).notes = el.value; clearTimeout(noteSave); noteSave = setTimeout(save, 600); }
};
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUT[el.dataset.input]) INPUT[el.dataset.input](el); });

const FORMS = {
  auth: submitAuth, task: submitTask,
  account: async () => {
    const body = { currentPassword: $('#acc-cur').value, newUsername: $('#acc-user').value.trim(), newPassword: $('#acc-new').value };
    if (!body.newUsername && !body.newPassword) return toast('Nothing to change.', 'warn');
    try { const r = await api('POST', '/api/account', body); session.user = r.user.username; toast('Profile updated', 'success'); renderSettings(); renderLevelCard(); }
    catch (e) { toast(e.message, 'error'); }
  },
  'cat-add': () => {
    const v = $('#cat-new').value.trim(); if (!v) return;
    if (S.categories.length >= 5) return toast('Maximum 5 categories allowed.', 'warn');
    if (S.categories.some(c => c.toLowerCase() === v.toLowerCase())) return toast('That category already exists.', 'warn');
    S.categories.push(v); S.catColors[v] = S.catColors[v] || nextPaletteColor(); save(); renderView();
  },
  'syl-add': () => {
    const v = $('#syl-new').value.trim(); if (!v) return;
    const sk = `${ui.syl.exam} - ${ui.syl.subject}`;
    if (chaptersOf(sk).some(c => c.toLowerCase() === v.toLowerCase())) return toast('Chapter already exists.', 'warn');
    (S.customChapters[sk] = S.customChapters[sk] || []).push(v); save(); renderSyllabus();
  },
  'onb-add': () => {
    const v = $('#onb-new').value.trim(); if (!v) return;
    if (onbSel.size >= 5) return toast('Maximum of 5 categories allowed.', 'warn');
    onbSel.add(v); renderOnboarding();
  }
};
document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); const fn = FORMS[f.dataset.form] || (typeof ADMIN_FORMS !== 'undefined' && ADMIN_FORMS[f.dataset.form]); fn && fn(f); });

document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase(), typing = ['input', 'textarea', 'select'].includes(tag);
  if (e.key === 'Enter' && e.target.id === 'quick-add') { e.preventDefault(); const v = e.target.value; e.target.value = ''; quickAdd(v); return; }
  if (e.key === 'Escape') { const m = $$('.modal-bd[data-dismiss]').pop(); if (m) m.close(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!$('.palette')) openPalette(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || !S || $('.modal-bd')) return;
  if (e.key === 'n') { e.preventDefault(); openTaskModal(); }
  else if (e.key === 't' && ui.view === 'calendar') ACT.today();
  else if (e.key === 'ArrowLeft' && ui.view === 'calendar') ACT.prev();
  else if (e.key === 'ArrowRight' && ui.view === 'calendar') ACT.next();
});

document.addEventListener('DOMContentLoaded', boot);
