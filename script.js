/* Rectilinear Redundancies - main app */
function initApp() {
try {
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const pick = a => a[Math.floor(Math.random() * a.length)];
const ld = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const isAuthed = () => localStorage.getItem('authenticated') === 'true';
const SUBJ = ['Physics', 'Chemistry', 'Maths', 'General'];
const SUBJ_COLOR = { Physics: '#3b82f6', Chemistry: '#10b981', Maths: '#f59e0b', General: '#a855f7' };
const QUOTES = ["You're doing great!", "Focus is your superpower.", "One concept at a time.", "Growth happens in the struggle.", "Trust the process!", "No distractions.", "Deep breath. Next problem.", "Discipline equals freedom.", "Stay hard!", "Rome wasn't built in a day.", "Brick by brick.", "Keep pushing.", "The magic you are looking for is in the work you're avoiding.", "Embrace the grind.", "Small steps, big mountain.", "Conquer the day."];
const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

window.showToast = msg => {
    const c = $('toast-container'); if (!c) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
};

/* ============ SETTINGS ============ */
const DEF = { theme: 'theme-amoled', accent: '#3b82f6', bg: 'bg-none', pomoTheme: 'plant', focusTime: 25, icon: '⚡',
    shortTime: 5, longTime: 15, cycles: 4, autoStart: false, chime: true, chimeVol: 0.5,
    mode: 'fancy', anim: true, cursorGlow: true, radius: 'round', font: 'inter', fontSize: 'font-medium', density: 'comfortable', sbWidth: 340,
    logo: 'vector', name: '', burnoutHours: 4, goal: 4, seaLion: true, slTheme: 'ocean', slImages: 'local', slSounds: true, share: true };
let S = Object.assign({}, DEF, load('pomo_settings_pro', {}));
['focusTime', 'shortTime', 'longTime', 'cycles'].forEach(k => { S[k] = Math.min(180, Math.max(1, parseInt(S[k]) || DEF[k])); });
const saveS = () => save('pomo_settings_pro', S);

/* ============ STATS ============ */
let stats = load('study_stats_pro', {});
stats.subjects = Object.assign({ Physics: 0, Chemistry: 0, Maths: 0, General: 0 }, stats.subjects || {});
stats.minutes = stats.minutes || {};
let slog = load('study_log_pro', []);
const saveStats = () => { save('study_stats_pro', stats); save('study_log_pro', slog.slice(-1000)); };
const dayKeys = () => Object.keys(stats).filter(k => /^\d{4}-\d\d-\d\d$/.test(k));
const sessionsOn = d => stats[d] || 0;
const minsOn = d => stats.minutes[d] != null ? stats.minutes[d] : (stats[d] || 0) * S.focusTime;
const totalMins = () => dayKeys().reduce((a, k) => a + minsOn(k), 0);
const sessionsTotal = () => dayKeys().reduce((a, k) => a + sessionsOn(k), 0);
function streakNow() { let n = 0, d = new Date(); if (!sessionsOn(ld(d))) d.setDate(d.getDate() - 1); while (sessionsOn(ld(d)) > 0) { n++; d.setDate(d.getDate() - 1); } return n; }
function bestStreak() {
    const ks = dayKeys().filter(k => stats[k] > 0).sort(); let best = 0, cur = 0, prev = null;
    ks.forEach(k => { const t = new Date(k + 'T00:00:00'); cur = (prev && Math.round((t - prev) / 864e5) === 1) ? cur + 1 : 1; best = Math.max(best, cur); prev = t; });
    return best;
}
function lastDays(n) { const a = [], d = new Date(); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); a.push(ld(x)); } return a; }
function addSession(subject, mins, task) {
    const t = ld();
    stats[t] = (stats[t] || 0) + 1;
    stats.subjects[subject] = (stats.subjects[subject] || 0) + mins / 60;
    stats.minutes[t] = (stats.minutes[t] != null ? stats.minutes[t] : (stats[t] - 1) * S.focusTime) + mins;
    slog.push({ t: Date.now(), s: subject, m: mins, k: task || '' });
    saveStats();
}

/* progress stores */
let prog = load('lec_progress_pro', {}), favs = load('favs_pro', []), recents = load('recents_pro', []), opened = load('files_opened_pro', {});

/* ============ DATA INGESTION ============ */
const ACR = { com: 'COM', nlm: 'NLM', shm: 'SHM', emi: 'EMI', ac: 'AC', ktg: 'KTG', goc: 'GOC', pyq: 'PYQ', rbd: 'RBD', dpp: 'DPP', sol: 'Solutions', ioc: 'IOC', poc: 'POC', auc: 'AUC', aod: 'AOD', itf: 'ITF', lcd: 'LCD', ncert: 'NCERT' };
function nice(t) {
    t = String(t || '').replace(/\s*@\S+/g, '').trim();
    const hasU = /[A-Z]/.test(t), hasL = /[a-z]/.test(t);
    if (hasU && hasL) return t;
    const up = hasU && !hasL;
    return t.split(/\s+/).map(w => {
        const l = w.toLowerCase();
        if (ACR[l]) return ACR[l]; if (up && ['to','of','and','in','the','for'].includes(l) && w !== t.split(/\s+/)[0]) return l;
        if (up && w.length <= 3 && /^[A-Z]+$/.test(w)) return w;
        return w.charAt(0).toUpperCase() + l.slice(1);
    }).join(' ');
}
const NCERT_P = { 101: 'Electric Charges and Fields', 102: 'Electrostatic Potential and Capacitance', 103: 'Current Electricity', 104: 'Moving Charges and Magnetism', 105: 'Magnetism and Matter', 106: 'Electromagnetic Induction', 107: 'Alternating Current', 108: 'Electromagnetic Waves', 201: 'Ray Optics and Optical Instruments', 202: 'Wave Optics', 203: 'Dual Nature of Radiation and Matter', 204: 'Atoms', 205: 'Nuclei', 206: 'Semiconductor Electronics' };
const NCERT_C = { 101: 'Solutions', 102: 'Electrochemistry', 103: 'Chemical Kinetics', 104: 'The d- and f-Block Elements', 105: 'Coordination Compounds', 201: 'Haloalkanes and Haloarenes', 202: 'Alcohols, Phenols and Ethers', 203: 'Aldehydes, Ketones and Carboxylic Acids', 204: 'Amines', 205: 'Biomolecules' };
function prep(b, mod) {
    const o = Object.assign({}, b); let f = (b.folders || []).slice(); let t = nice(b.title); const raw = String(b.title || '').trim();
    if (mod === 'LECTURES') { if (f[0] === 'LECTURES') f.shift(); }
    else {
        if (f[0] === 'IIT-JEE') f.shift();
        if (f[0] === 'NCERT') {
            let m = /^le(ph|ch)([12])(\d\d)$/i.exec(raw);
            if (m) {
                const phys = m[1].toLowerCase() === 'ph', code = +m[2] * 100 + +m[3], map = phys ? NCERT_P : NCERT_C;
                const num = m[2] === '1' ? +m[3] : +m[3] + (phys ? 8 : 5);
                if (map[code]) { t = `Class 12 ${phys ? 'Physics' : 'Chemistry'} · Ch ${num}: ${map[code]}`; f = ['NCERT', phys ? 'Physics' : 'Chemistry']; }
            }
            m = /^le(fl|vt)1(\d\d|ps)$/i.exec(raw);
            if (m) { const bk = m[1].toLowerCase() === 'fl' ? 'Flamingo' : 'Vistas'; t = `${bk} · ${m[2].toLowerCase() === 'ps' ? 'Preface & Index' : 'Unit ' + parseInt(m[2])}`; f = ['NCERT', 'English']; }
            if (/^PhysicalEducation12/i.test(raw)) t = 'Physical Education · Class 12 (2022)';
        }
        if (mod === 'SUPPORT') {
            if (f[0] === 'EXTRAS') {
                const sub = f[1]; f = [{ 'Formula BOOKLET': 'Formula Booklets' }[sub] || sub];
                if (sub === 'Concept Maps' && !/map/i.test(t)) t += ' Concept Map';
            } else if (f[0] === 'MATHANGO') {
                if (f[1] === 'Maths') { f = ['Coordinate Geometry Formula Sheets']; t = nice(raw.replace(/^\d+\s+/, '').replace(/\bquizrr\b/i, '').trim()); }
                else { const m = /^(Logical Reasoning|English Notes)\s*-\s*(.+)$/.exec(raw); if (m) { f = [m[1] === 'English Notes' ? 'English' : 'Logical Reasoning']; t = nice(m[2]); } else f = ['English']; }
            }
        }
    }
    o._f = f.map(nice); o._t = t; o._id = (b.folders || []).join('/') + '/' + b.title; o._m = mod;
    o._k = b.playlist ? 'video' : (/\bsol\b|answerkey|\bsolutions?\b/i.test(raw) && !/liquid solution/i.test(raw)) ? 'key' : /workbook/i.test(raw) ? 'workbook' : /sheet/i.test(raw) ? 'sheet' : 'pdf';
    return o;
}
let safeFiles = [];
try { safeFiles = (window.rawFiles || []).filter(b => b.folders && !b.folders.some(f => f.toUpperCase().includes('CLASS 10'))); } catch (e) { safeFiles = window.rawFiles || []; }
window.libraryData = {
    LECTURES: (window.rawLectures || []).map(b => prep(b, 'LECTURES')),
    FILES: safeFiles.filter(b => b.folders.some(f => ['COACHINGS', 'SUBJECTS', 'PUBLICATIONS', 'NCERT'].includes(f))).map(b => prep(b, 'FILES')),
    SUPPORT: safeFiles.filter(b => b.folders.some(f => ['EXTRAS', 'MATHANGO'].includes(f))).map(b => prep(b, 'SUPPORT'))
};
window.masterList = []; const idMap = new Map();
for (const k in window.libraryData) window.libraryData[k].forEach(b => { window.masterList.push(b); idMap.set(b._id, b); });
const natSort = (a, b) => a._t.localeCompare(b._t, undefined, { numeric: true, sensitivity: 'base' });

/* ============ APPLY SETTINGS ============ */
function applySettings() {
    document.body.className = [S.theme, 'mode-' + S.mode, S.fontSize, 'r-' + S.radius, 'f-' + S.font, S.density === 'compact' ? 'dense' : '', S.anim ? '' : 'no-anim', S.cursorGlow ? 'glow' : ''].filter(Boolean).join(' ');
    const r = document.documentElement.style, c = /^#[0-9a-f]{6}$/i.test(S.accent) ? S.accent : '#3b82f6';
    const R = parseInt(c.slice(1, 3), 16), G = parseInt(c.slice(3, 5), 16), B = parseInt(c.slice(5, 7), 16);
    r.setProperty('--accent-color', c); r.setProperty('--accent-glow', `rgba(${R},${G},${B},.4)`);
    r.setProperty('--on-accent', (0.299 * R + 0.587 * G + 0.114 * B) > 170 ? '#111' : '#fff');
    r.setProperty('--sb-w', S.sbWidth + 'px');
    const bg = $('ambient-bg'); if (bg) bg.className = S.bg || 'bg-none';
    renderLogo();
    ['pomo-icon-display'].forEach(i => { const e = $(i); if (e) e.textContent = S.icon; });
    const ci = document.querySelector('.chip-ico'); if (ci) ci.textContent = S.icon;
    const fab = $('chat-fab'), win = $('chat-window');
    if (fab) { fab.style.display = S.seaLion ? 'flex' : 'none'; fab.dataset.sl = S.slTheme; }
    if (win) { win.dataset.sl = S.slTheme; if (!S.seaLion) win.classList.remove('open'); }
    if (typeof renderPomo === 'function') renderPomo();
}
function renderLogo() {
    const el = $('sidebar-logo'); if (!el) return;
    if (S.logo === 'img') {
        if (el.dataset.mode !== 'img') {
            el.dataset.mode = 'img';
            const img = new Image(); img.alt = 'Logo';
            img.onerror = () => { img.onerror = null; img.src = img.src.replace('.jpg', '.png').replace('.JPG', '.png'); };
            img.src = Math.random() < 0.1 ? './assets/Important/Logo 1.jpg' : './assets/Important/Logo 2.jpg';
            el.innerHTML = ''; el.appendChild(img);
        }
    } else if (el.dataset.mode !== 'vec') { el.dataset.mode = 'vec'; el.innerHTML = '<svg viewBox="0 0 64 64"><use href="#rr-logo"/></svg>'; }
}

/* ============ AUTH + ADMIN UNLOCK ============ */
function doLogin() {
    const u = $('auth-user').value.trim(), p = $('auth-pass').value;
    if (p === 'Huh' && u) {
        localStorage.setItem('authenticated', 'true'); localStorage.setItem('admin_real_user', u); localStorage.removeItem('admin_real_pass');
        document.documentElement.classList.add('authed'); renderHome(); pushSync();
    } else $('auth-error').style.display = 'block';
}
$('auth-btn')?.addEventListener('click', doLogin);
['auth-user', 'auth-pass'].forEach(id => $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

window.adminUnlockStage = 0; window.adminLogoClicks = 0; window.logoClickTimer = null;
$('sidebar-logo')?.addEventListener('click', () => {
    window.adminLogoClicks++; clearTimeout(window.logoClickTimer);
    window.logoClickTimer = setTimeout(() => { window.adminLogoClicks = 0; }, 2000);
    if (window.adminUnlockStage === 0 && window.adminLogoClicks >= 10) { window.adminUnlockStage = 1; window.adminLogoClicks = 0; }
    else if (window.adminUnlockStage === 2 && window.adminLogoClicks >= 5) {
        $('admin-overlay')?.classList.add('active'); showToast('Root Access Granted.');
        window.adminUnlockStage = 0; window.adminLogoClicks = 0; window.renderAdminUsers();
    }
});
$('admin-close')?.addEventListener('click', () => $('admin-overlay')?.classList.remove('active'));
$('btn-nuke')?.addEventListener('click', () => {
    if ($('nuke-code').value === 'YUWannaKnow') { localStorage.clear(); sessionStorage.clear(); showToast('Local data wiped.'); setTimeout(() => location.reload(), 1200); }
    else showToast('Access Denied: Invalid Code');
});
window.getDeviceInfo = () => { const ua = navigator.userAgent; if (/Windows/.test(ua)) return 'Windows PC'; if (/iPhone|iPad/.test(ua)) return 'Apple iOS Device'; if (/Android/.test(ua)) return 'Android Device'; if (/Mac/.test(ua)) return 'Apple Mac'; return 'Unknown Device'; };

/* ============ SYLLABUS DATA + SYNC ============ */
const SYL = {
    Class12: { Physics: ["Electric Charges and Fields", "Electrostatic Potential", "Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves", "Ray Optics", "Wave Optics", "Dual Nature", "Atoms", "Nuclei", "Semiconductors"], Chemistry: ["Solutions", "Electrochemistry", "Chemical Kinetics", "d-and f-Block", "Coordination Compounds", "Haloalkanes", "Alcohols", "Aldehydes", "Amines", "Biomolecules"], Maths: ["Relations and Functions", "Inverse Trigonometric", "Matrices", "Determinants", "Continuity and Differentiability", "Application of Derivatives", "Integrals", "Applications of Integrals", "Differential Equations", "Vector Algebra", "3D Geometry", "Probability"] },
    JEEMains: { Physics: ["Physics and Measurement", "Kinematics", "Laws of Motion", "Work Energy Power", "Rotational Motion", "Gravitation", "Solids and Liquids", "Thermodynamics", "KTG", "Oscillations and Waves", "Electrostatics", "Current Electricity", "Magnetic Effects", "EMI & AC", "EM Waves", "Optics", "Dual Nature", "Atoms and Nuclei", "Electronic Devices"], Chemistry: ["Basic Concepts", "Atomic Structure", "Chemical Bonding", "Thermodynamics", "Solutions", "Equilibrium", "Redox & Electrochemistry", "Chemical Kinetics", "Periodic Table", "p-Block", "d- and f-Block", "Coordination Compounds", "GOC", "Hydrocarbons", "Halogens", "Oxygen Compounds", "Nitrogen Compounds", "Biomolecules"], Maths: ["Sets Relations Functions", "Complex Numbers & Quadratics", "Matrices Determinants", "P&C", "Binomial Theorem", "Sequence & Series", "Limit Continuity Differentiability", "Integral Calculus", "Differential Equations", "Coordinate Geometry", "3D Geometry", "Vector Algebra", "Statistics & Probability", "Trigonometry"] },
    JEEAdv: { Physics: ["General Physics", "Kinematics", "Newton's Laws", "Work Power Energy", "COM & Collision", "Rotational Dynamics", "Gravitation", "Fluid Mechanics", "Thermal Physics", "Electrostatics", "Current Electricity", "Magnetism", "EMI & AC", "Ray & Wave Optics", "Modern Physics"], Chemistry: ["Atomic Structure", "Gaseous State", "Thermodynamics", "Equilibrium", "Electrochemistry", "Chemical Kinetics", "Solid State", "Solutions", "Surface Chemistry", "Chemical Bonding", "Coordination Compounds", "Salt Analysis", "GOC & Isomerism", "Hydrocarbons", "Functional Groups", "Biomolecules"], Maths: ["Algebra", "Matrices", "Probability", "Trigonometry", "Analytical Geometry", "Differential Calculus", "Integral Calculus", "Vectors"] }
};
const SYL_LEVELS = { Class12: 'Class 12 Boards', JEEMains: 'JEE Mains', JEEAdv: 'JEE Advanced' };
let sylData = load('syl_tracker_pro', {});
function sylPct(level, subj) {
    let total = 0, done = 0;
    Object.keys(SYL[level]).filter(s => !subj || s === subj).forEach(s => SYL[level][s].forEach(ch => { total++; const st = sylData[`${level}_${s}_${ch}`] || 0; done += st === 3 ? 1 : st * 0.25; }));
    return total ? Math.round(done / total * 100) : 0;
}
const SYNC = window.SYNC_CONFIG || {};
let uid = localStorage.getItem('rr_uid'); if (!uid) { uid = 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('rr_uid', uid); }
function summary() {
    const daily = {}; lastDays(30).forEach(d => { const m = minsOn(d); if (m) daily[d] = Math.round(m); });
    let w = 0; Object.values(prog).forEach(p => w += Object.keys(p.watched || {}).length);
    return { v: 1, uid, user: localStorage.getItem('admin_real_user') || 'unknown', device: window.getDeviceInfo(), lastSeen: Date.now(), todayMin: Math.round(minsOn(ld())), totalMin: Math.round(totalMins()), sessions: sessionsTotal(), streak: streakNow(), best: bestStreak(), subjects: stats.subjects, daily, syl: { Class12: sylPct('Class12'), JEEMains: sylPct('JEEMains'), JEEAdv: sylPct('JEEAdv') }, lecWatched: w, filesOpened: Object.keys(opened).length };
}
function pushSync(beacon) {
    if (!SYNC.endpoint || !S.share || !isAuthed()) return;
    const url = SYNC.endpoint.replace(/\/$/, '') + '/api/sync';
    try { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-site-key': SYNC.siteKey || '' }, body: JSON.stringify(summary()), keepalive: true }).catch(() => {}); } catch (e) {}
}
setInterval(() => pushSync(), 60000); setTimeout(() => pushSync(), 4000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pushSync(); });

/* admin table */
let adminRows = [];
const ago = ts => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 90 ? 'just now' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
window.renderAdminUsers = async function () {
    const body = $('admin-users-body'), conn = $('admin-conn'); if (!body) return;
    const tok = $('admin-token').value || sessionStorage.getItem('rr_admin_token') || ''; let rows = [];
    if (SYNC.endpoint) {
        try {
            const r = await fetch(SYNC.endpoint.replace(/\/$/, '') + '/api/users', { headers: { 'x-admin-token': tok } });
            if (r.status === 401) conn.textContent = '🔒 Token missing or rejected — enter the admin token and press Load';
            else if (r.ok) { rows = await r.json(); conn.textContent = '🟢 Connected · ' + rows.length + ' user(s)'; if (tok) sessionStorage.setItem('rr_admin_token', tok); }
            else conn.textContent = '🔴 Server error ' + r.status;
        } catch (e) { conn.textContent = '🔴 Server unreachable'; }
    } else { conn.textContent = '⚪ No server configured (see config.js / server.js) — showing this device only'; rows = [summary()]; }
    adminRows = rows;
    const day = Date.now() - 864e5;
    $('admin-stats').innerHTML = [[rows.length, 'Users'], [(rows.reduce((a, u) => a + (u.totalMin || 0), 0) / 60).toFixed(1) + 'h', 'Total study'], [rows.filter(u => u.lastSeen > day).length, 'Active 24h'], [rows.length ? Math.round(rows.reduce((a, u) => a + (u.streak || 0), 0) / rows.length) : 0, 'Avg streak']].map(x => `<div class="admin-stat-card"><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('');
    body.innerHTML = rows.sort((a, b) => b.lastSeen - a.lastSeen).map(u => {
        const sub = u.subjects || {}, st = SUBJ.reduce((a, s) => a + (sub[s] || 0), 0) || 1, syl = u.syl ? Math.round(((u.syl.Class12 || 0) + (u.syl.JEEMains || 0) + (u.syl.JEEAdv || 0)) / 3) : 0;
        return `<tr><td><b>@${esc(u.user)}</b><br><small>${esc(u.uid)}</small></td><td>${ago(u.lastSeen)}</td><td>${esc(u.device)}</td><td>${u.todayMin || 0}m</td><td>${((u.totalMin || 0) / 60).toFixed(1)}h</td><td>${u.streak || 0} 🔥 <small>(best ${u.best || 0})</small></td><td><div class="sub-bar">${SUBJ.map(s => `<i style="width:${(sub[s] || 0) / st * 100}%;background:${SUBJ_COLOR[s]}" title="${s}: ${(sub[s] || 0).toFixed(1)}h"></i>`).join('')}</div></td><td>${syl}%</td><td>${u.lecWatched || 0} / ${u.filesOpened || 0}</td><td>${SYNC.endpoint ? `<button class="action-btn" data-del="${esc(u.uid)}" title="Delete this user's record">🗑</button>` : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="10">No data yet.</td></tr>';
};
$('admin-refresh')?.addEventListener('click', () => window.renderAdminUsers());
$('admin-users-body')?.addEventListener('click', async e => {
    const b = e.target.closest('[data-del]'); if (!b || !confirm('Delete this user\'s synced record?')) return;
    try { await fetch(SYNC.endpoint.replace(/\/$/, '') + '/api/users/' + encodeURIComponent(b.dataset.del), { method: 'DELETE', headers: { 'x-admin-token': $('admin-token').value || sessionStorage.getItem('rr_admin_token') || '' } }); } catch (err) {}
    window.renderAdminUsers();
});

/* ============ POMODORO ============ */
const growth = { plant: ['🌱', '🌿', '🪴', '🌳'], beaker: ['🧫', '💧', '🧪', '🧬'], flame: ['💨', '🕯️', '🪵', '🔥'] };
const RING_C = 2 * Math.PI * 96;
const P = { mode: 'focus', total: S.focusTime * 60, left: S.focusTime * 60, running: false, endAt: 0, cycle: 0, task: '', subject: 'General', quote: 'Ready to focus!', iv: null };
const modeSecs = m => (m === 'focus' ? S.focusTime : m === 'short' ? S.shortTime : S.longTime) * 60;
const modeName = { focus: 'Focus', short: 'Short Break', long: 'Long Break' };
function setMode(m) { clearInterval(P.iv); P.mode = m; P.total = P.left = modeSecs(m); P.running = false; renderPomo(); }
function startPomo() { if (P.running) return; P.running = true; P.endAt = Date.now() + P.left * 1000; P.iv = setInterval(tick, 250); P.quote = P.mode === 'focus' ? "Let's lock in!" : 'Breathe. Stretch. Hydrate.'; renderPomo(); }
function pausePomo() { if (!P.running) return; P.left = Math.max(0, Math.ceil((P.endAt - Date.now()) / 1000)); P.running = false; clearInterval(P.iv); P.quote = 'Paused. Ready when you are.'; renderPomo(); }
function tick() {
    const l = Math.max(0, Math.ceil((P.endAt - Date.now()) / 1000));
    if (l !== P.left) { P.left = l; if (P.mode === 'focus' && l % 30 === 0 && l > 0) P.quote = pick(QUOTES); renderPomo(); }
    if (l <= 0) finishPomo();
}
let actx;
function beep() {
    if (!S.chime) return;
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        [660, 880, 990].forEach((f, i) => {
            const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.18;
            o.frequency.value = f; o.connect(g); g.connect(actx.destination);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.001, S.chimeVol * 0.4), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            o.start(t); o.stop(t + 0.4);
        });
    } catch (e) {}
}
function finishPomo() {
    clearInterval(P.iv); P.running = false; let next;
    if (P.mode === 'focus') {
        addSession(P.subject, S.focusTime, P.task); P.cycle++; beep();
        showToast('Focus session complete! Great job.'); checkBurnout(); pushSync();
        next = P.cycle % S.cycles === 0 ? 'long' : 'short'; P.quote = 'Session complete! Level up!';
    } else { beep(); showToast('Break over — back to it!'); next = 'focus'; }
    const q = P.quote; setMode(next); P.quote = q; renderPomo(); renderFocusLog();
    if (S.autoStart) startPomo();
}
function checkBurnout() {
    try { if (minsOn(ld()) / 60 >= S.burnoutHours && !sessionStorage.getItem('burnout_shown')) { $('burnout-overlay')?.classList.add('active'); sessionStorage.setItem('burnout_shown', 'true'); } } catch (e) {}
}
$('burnout-close')?.addEventListener('click', () => $('burnout-overlay')?.classList.remove('active'));
function renderPomo() {
    const m = String(Math.floor(P.left / 60)).padStart(2, '0'), s = String(P.left % 60).padStart(2, '0'), t = m + ':' + s;
    const pct = P.total ? 1 - P.left / P.total : 0;
    document.querySelectorAll('[data-pomo="time"]').forEach(e => e.textContent = t);
    document.querySelectorAll('[data-pomo="modelabel"]').forEach(e => e.textContent = modeName[P.mode]);
    document.querySelectorAll('[data-pomo="toggle"]').forEach(e => e.textContent = P.running ? '⏸ Pause' : (P.left < P.total ? '▶ Resume' : '▶ Start ' + (P.mode === 'focus' ? 'Focus' : 'Break')));
    document.querySelectorAll('[data-pomo="ring"]').forEach(e => e.setAttribute('stroke-dashoffset', RING_C * (P.left / P.total)));
    document.querySelectorAll('[data-pomo="quote"]').forEach(e => e.textContent = P.quote);
    const arr = growth[S.pomoTheme] || growth.plant; let ico = arr[0]; if (pct > .25) ico = arr[1]; if (pct > .6) ico = arr[2]; if (pct > .9) ico = arr[3];
    document.querySelectorAll('[data-pomo="plant"]').forEach(e => e.textContent = P.mode === 'focus' ? ico : '☕');
    document.querySelectorAll('[data-pomo="dots"]').forEach(e => { const n = P.cycle % S.cycles; e.innerHTML = Array.from({ length: S.cycles }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join(''); });
    document.querySelectorAll('.mode-tabs button').forEach(b => b.classList.toggle('active', b.dataset.m === P.mode));
    document.querySelectorAll('.mini-pomo,.focus-room,.pomo-chip').forEach(e => e.classList.toggle('running', P.running));
    const ct = $('pomo-chip-time'); if (ct) ct.textContent = t;
    document.title = P.running ? `${t} · ${modeName[P.mode]} – Rectilinear Redundancies` : 'Rectilinear Redundancies';
}
function renderFocusLog() {
    const el = $('focus-log-list'); if (!el) return;
    const today = slog.filter(x => ld(new Date(x.t)) === ld()).reverse();
    el.innerHTML = today.length ? `<table class="log"><tr><th>Time</th><th>Subject</th><th>Min</th><th>Task</th></tr>${today.map(x => `<tr><td>${new Date(x.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td>${esc(x.s)}</td><td>${x.m}</td><td>${esc(x.k)}</td></tr>`).join('')}</table>` : '<p class="muted">No sessions yet today — start one!</p>';
}
document.addEventListener('click', e => {
    const a = e.target.closest('[data-pa]'); if (a) { const act = a.dataset.pa; if (act === 'toggle') P.running ? pausePomo() : startPomo(); else if (act === 'reset') { setMode(P.mode); P.quote = 'Timer reset. Ready!'; renderPomo(); } else if (act === 'skip') { if (P.running || P.left < P.total) { P.left = 0; P.endAt = 0; if (P.mode === 'focus') { clearInterval(P.iv); P.running = false; setMode('short'); } else setMode('focus'); } else setMode(P.mode === 'focus' ? 'short' : 'focus'); renderFocusLog(); } return; }
    const mt = e.target.closest('.mode-tabs button[data-m]'); if (mt) { setMode(mt.dataset.m); return; }
    const u = e.target.closest('[data-util]'); if (u) openUtility(u.dataset.util);
});
setInterval(() => { if (curUtil === 'timetable' && ttView === 'grid') renderTTNow(); }, 30000);

/* ============ LIBRARY ============ */
let activeModule = 'LECTURES', libFilter = 'all', openSet = new Set(load('open_folders_pro', [])), libQuery = '';
const ICONS = [[/physic/i, '⚛️'], [/inorganic/i, '⚗️'], [/organic/i, '🧬'], [/chem/i, '🧪'], [/math|algebra|calcul/i, '📐'], [/ncert/i, '📚'], [/flash/i, '📇'], [/formula/i, '🧮'], [/concept/i, '🗺️'], [/hack/i, '⚡'], [/logical/i, '🧩'], [/english/i, '🔤'], [/coaching|allen|aakash|pw|physics wallah/i, '🏫'], [/publication|pearson|wiley|disha|arihant|balaji/i, '📖'], [/subject/i, '🎓']];
const iconFor = n => { for (const [re, i] of ICONS) if (re.test(n)) return i; return '📁'; };
const KIND_ICON = { video: '🎬', key: '🔑', workbook: '📘', sheet: '📝', pdf: '📄' };
function matchFilter(b) {
    if (libFilter === 'saved') return favs.includes(b._id);
    if (libFilter === 'recent') return recents.includes(b._id);
    if (libFilter === 'progress') { const n = Object.keys((prog[b._id] || {}).watched || {}).length; return b.playlist && n > 0 && n < b.playlist.length; }
    return true;
}
function buildTree(books) {
    const root = { _files: [] };
    books.forEach(b => { let cur = root; b._f.forEach(f => { if (!cur[f]) cur[f] = { _files: [] }; cur = cur[f]; }); cur._files.push(b); });
    return root;
}
const countFiles = n => Object.keys(n).reduce((a, k) => a + (k === '_files' ? n._files.length : countFiles(n[k])), 0);
function badgeText(b) { if (!b.playlist) return ''; const n = Object.keys((prog[b._id] || {}).watched || {}).length; return n ? `${n}/${b.playlist.length}` : ''; }
function createDOMTree(node, forceOpen, path) {
    const box = document.createElement('div');
    Object.keys(node).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(key => {
        if (key === '_files') return;
        const p = path + '/' + key, d = document.createElement('details'); d.dataset.path = p; d.open = forceOpen || openSet.has(p);
        d.innerHTML = `<summary><span class="fi">${iconFor(key)}</span>${esc(key)}<span class="cnt">${countFiles(node[key])}</span></summary><div class="folder-contents"></div>`;
        d.querySelector('.folder-contents').appendChild(createDOMTree(node[key], forceOpen, p)); box.appendChild(d);
    });
    const files = node._files.slice(); if (activeModule !== 'LECTURES') files.sort(natSort);
    files.forEach(b => {
        const it = document.createElement('div'); it.className = 'book-item' + (cur && cur._id === b._id ? ' active' : ''); it.dataset.id = b._id;
        const bd = badgeText(b);
        it.innerHTML = `<span>${KIND_ICON[b._k]}</span><span class="bt" title="${esc(b._t)}">${esc(b._t)}</span><em class="bbadge${b.playlist && bd && bd.split('/')[0] === String(b.playlist.length) ? ' done' : ''}">${bd}</em><button class="star${favs.includes(b._id) ? ' on' : ''}" title="Save">${favs.includes(b._id) ? '★' : '☆'}</button>`;
        box.appendChild(it);
    });
    return box;
}
function renderLibrary(query) {
    if (query != null) libQuery = query;
    const list = $('book-list'); if (!list) return; list.innerHTML = '';
    const data = window.libraryData[activeModule]; if (!data) return;
    const toks = libQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = data.filter(b => { const h = (b._t + ' ' + b.title + ' ' + b._f.join(' ')).toLowerCase(); return toks.every(t => h.includes(t)) && matchFilter(b); });
    if (!filtered.length) { list.innerHTML = `<div class="empty-state"><img src="./assets/Important/Found Nothing 1.jpg" onerror="this.onerror=null; this.src=this.src.replace('.jpg', '.png').replace('.JPG', '.png');"><h4>Found Literally Nothing</h4><p>Try spelling it correctly this time.</p></div>`; return; }
    list.appendChild(createDOMTree(buildTree(filtered), toks.length > 0, ''));
}
$('search-bar')?.addEventListener('input', e => renderLibrary(e.target.value));
$('book-list')?.addEventListener('toggle', e => { const d = e.target; if (!d.dataset || !d.dataset.path || libQuery) return; d.open ? openSet.add(d.dataset.path) : openSet.delete(d.dataset.path); save('open_folders_pro', [...openSet]); }, true);
$('book-list')?.addEventListener('click', e => {
    const it = e.target.closest('.book-item'); if (!it) return; const b = idMap.get(it.dataset.id); if (!b) return;
    if (e.target.closest('.star')) { toggleFav(b); return; }
    loadResource(b, it);
});
$('lib-chips')?.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; libFilter = c.dataset.f; document.querySelectorAll('#lib-chips .chip').forEach(x => x.classList.toggle('active', x === c)); renderLibrary(); });
function toggleFav(b) {
    const i = favs.indexOf(b._id); i >= 0 ? favs.splice(i, 1) : favs.push(b._id); save('favs_pro', favs);
    document.querySelectorAll('.book-item').forEach(it => { if (it.dataset.id === b._id) { const s = it.querySelector('.star'); s.classList.toggle('on', favs.includes(b._id)); s.textContent = favs.includes(b._id) ? '★' : '☆'; } });
    updateBar(); if (libFilter === 'saved') renderLibrary();
}
function refreshBadge(b) { document.querySelectorAll('.book-item').forEach(it => { if (it.dataset.id === b._id) { const e = it.querySelector('.bbadge'), t = badgeText(b); e.textContent = t; e.classList.toggle('done', !!t && t.split('/')[0] === String(b.playlist.length)); } }); }

/* ============ VIEW MANAGEMENT ============ */
let isSplit = false, cur = null, curIdx = 0, curUtil = null;
function setView(v) {
    $('placeholder-box').style.display = v === 'home' ? 'flex' : 'none';
    $('error-box').style.display = v === 'error' ? 'flex' : 'none';
    $('util-panel').style.display = v === 'util' ? 'block' : 'none';
    const vw = v === 'viewer';
    $('viewer-1').style.display = vw ? 'block' : 'none'; $('viewer-2').style.display = vw && isSplit ? 'block' : 'none';
    $('resizer').style.display = vw && isSplit ? 'flex' : 'none'; $('split-btn').style.display = vw ? 'flex' : 'none';
    $('lecture-bar').style.display = vw ? 'flex' : 'none';
    const home = v === 'home';
    $('home-title-area').style.display = home ? 'flex' : 'none';
    $('current-title').style.display = home ? 'none' : 'block'; $('current-path').style.display = home ? 'none' : 'block';
    if (!vw) $('playlist-select').style.display = 'none';
    if (v !== 'util') curUtil = null;
    if (home) renderHome();
    if (window.innerWidth <= 768) $('sidebar')?.classList.remove('mobile-open');
}
function updateBar() {
    if (!cur) return; const isV = !!cur.playlist, id = cur._id;
    ['lb-prev', 'lb-next', 'lb-watch'].forEach(i => $(i).style.display = isV ? '' : 'none');
    $('lb-star').textContent = favs.includes(id) ? '★ Saved' : '☆ Save';
    const ext = $('lb-ext'), dwn = $('lb-dl');
    if (isV) { ext.style.display = dwn.style.display = 'none'; const p = prog[id] || { watched: {} }, n = Object.keys(p.watched).length; $('lb-fill').style.width = (n / cur.playlist.length * 100) + '%'; $('lb-count').textContent = `${curIdx + 1}/${cur.playlist.length} · ${n} watched`; $('lb-watch').classList.toggle('on', !!p.watched[curIdx]); $('lb-watch').textContent = p.watched[curIdx] ? '✓ Watched' : '○ Mark watched'; }
    else { ext.style.display = dwn.style.display = ''; ext.href = (cur.url || '').replace('/preview', '/view'); const m = /\/d\/([^/]+)/.exec(cur.url || ''); dwn.href = m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : '#'; $('lb-fill').style.width = '0'; $('lb-count').textContent = 'File'; }
}
function fillDropdown() {
    const dd = $('playlist-select'), w = (prog[cur._id] || {}).watched || {};
    dd.innerHTML = ''; cur.playlist.forEach((v, i) => { const o = document.createElement('option'); o.value = i; o.textContent = (w[i] ? '✓ ' : '') + (i + 1) + '. ' + v.title; dd.appendChild(o); });
    dd.value = curIdx;
}
function playIdx(i) {
    curIdx = Math.max(0, Math.min(cur.playlist.length - 1, i));
    const p = prog[cur._id] = prog[cur._id] || { watched: {}, last: 0 }; p.last = curIdx; save('lec_progress_pro', prog);
    const url = cur.playlist[curIdx].url; $('frame-1').src = url; if (isSplit) $('frame-2').src = url;
    fillDropdown(); updateBar();
}
window.loadResource = function (book, el, idx) {
    if (!book) return; cur = book;
    document.querySelectorAll('.book-item').forEach(i => i.classList.toggle('active', i === el || (!el && i.dataset.id === book._id)));
    setView('viewer');
    $('current-title').textContent = book._t || book.title || 'Untitled'; $('current-path').textContent = (book._f || []).join(' › ');
    recents = [book._id, ...recents.filter(x => x !== book._id)].slice(0, 10); save('recents_pro', recents);
    if (book.playlist && book.playlist.length) {
        $('playlist-select').style.display = 'block'; const p = prog[book._id]; curIdx = idx != null ? idx : (p ? Math.min(p.last || 0, book.playlist.length - 1) : 0);
        playIdx(curIdx);
    } else {
        $('playlist-select').style.display = 'none'; curIdx = 0; $('frame-1').src = book.url || ''; if (isSplit) $('frame-2').src = book.url || '';
        opened[book._id] = Date.now(); save('files_opened_pro', opened); updateBar();
    }
    const na = $('notes-area'), nk = 'notes_' + book.title; $('notes-label').textContent = '📝 ' + (book._t || 'Notes');
    if (na) { na.value = localStorage.getItem(nk) || ''; na.oninput = () => { try { localStorage.setItem(nk, na.value); } catch (e) {} }; }
};
$('playlist-select')?.addEventListener('change', e => { if (cur && cur.playlist) playIdx(+e.target.value); });
$('lb-prev')?.addEventListener('click', () => cur && cur.playlist && playIdx(curIdx - 1));
$('lb-next')?.addEventListener('click', () => { if (!cur || !cur.playlist) return; const p = prog[cur._id] = prog[cur._id] || { watched: {}, last: 0 }; p.watched[curIdx] = true; save('lec_progress_pro', prog); refreshBadge(cur); playIdx(curIdx + 1); });
$('lb-watch')?.addEventListener('click', () => { if (!cur || !cur.playlist) return; const p = prog[cur._id] = prog[cur._id] || { watched: {}, last: 0 }; p.watched[curIdx] ? delete p.watched[curIdx] : (p.watched[curIdx] = true); save('lec_progress_pro', prog); fillDropdown(); updateBar(); refreshBadge(cur); });
$('lb-star')?.addEventListener('click', () => cur && toggleFav(cur));

/* ============ HOME ============ */
function ring(p, txt, sz = 84) { const R = sz / 2 - 8, C = 2 * Math.PI * R; return `<svg class="mring" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}"><circle cx="${sz / 2}" cy="${sz / 2}" r="${R}" class="rbg"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${R}" class="rfg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(1, Math.max(0, p)))}" transform="rotate(-90 ${sz / 2} ${sz / 2})"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle">${txt}</text></svg>`; }
function renderHome() {
    const el = $('home-dash'); if (!el) return;
    const h = new Date().getHours(), g = h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late night grind';
    $('home-greet').textContent = g + (S.name ? ', ' + S.name : '') + '!'; $('home-quote').textContent = QUOTES[new Date().getDate() % QUOTES.length];
    const today = minsOn(ld()), goal = S.goal * 60, syl = Math.round((sylPct('Class12') + sylPct('JEEMains') + sylPct('JEEAdv')) / 3);
    const row = id => { const b = idMap.get(id); return b ? `<button class="link-row" data-open="${esc(id)}">${KIND_ICON[b._k]} <span>${esc(b._t)}</span></button>` : ''; };
    const rec = recents.map(row).filter(Boolean).slice(0, 5).join('') || '<p class="muted">Nothing opened yet.</p>', sv = favs.map(row).filter(Boolean).slice(0, 5).join('') || '<p class="muted">Tap ☆ on any item to save it here.</p>';
    el.innerHTML = `<div class="tiles"><div class="card tile">${ring(goal ? today / goal : 0, Math.round(today) + 'm')}<span>Today / ${S.goal}h goal</span></div><div class="card tile"><b>${streakNow()} 🔥</b><span>Day streak</span></div><div class="card tile"><b>${(totalMins() / 60).toFixed(1)}h</b><span>Total focus</span></div><div class="card tile">${ring(syl / 100, syl + '%')}<span>Syllabus</span></div></div>
    ${recents[0] && idMap.get(recents[0]) ? `<div class="card"><h4>▶ Continue where you left off</h4>${row(recents[0])}</div>` : ''}
    <div class="two"><div class="card"><h4>🕘 Recent</h4>${rec}</div><div class="card"><h4>★ Saved</h4>${sv}</div></div>
    <div class="card"><h4>Quick actions</h4><div class="quick"><button class="outline-btn" data-util="focus">🎯 Start focus</button><button class="outline-btn" data-util="flashcards">📇 Flashcards</button><button class="outline-btn" data-util="timetable">📅 Timetable</button><button class="outline-btn" data-util="analytics">📊 Analytics</button><button class="outline-btn" data-util="syllabus">📑 Syllabus</button></div></div>`;
}
$('home-dash')?.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (o) loadResource(idMap.get(o.dataset.open), null); });

/* ============ TABS ============ */
function switchTab(name) {
    document.querySelectorAll('.mod-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    activeModule = name; document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
    if (name === 'UTILITIES') $('view-utilities').classList.add('active');
    else if (name === 'FOCUS') $('view-focus').classList.add('active');
    else { $('view-library').classList.add('active'); $('chip-progress').style.display = name === 'LECTURES' ? '' : 'none'; if (name !== 'LECTURES' && libFilter === 'progress') { libFilter = 'all'; document.querySelectorAll('#lib-chips .chip').forEach(x => x.classList.toggle('active', x.dataset.f === 'all')); } renderLibrary(); }
}
$('module-tabs')?.addEventListener('click', e => { const t = e.target.closest('.mod-tab'); if (t) switchTab(t.dataset.tab); });
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (['UTILITIES', 'FOCUS'].includes(activeModule)) switchTab('LECTURES'); $('sidebar').classList.remove('collapsed'); $('sidebar').classList.add('mobile-open'); $('search-bar').focus(); }
    if (e.key === 'Escape') { ['settings-modal'].forEach(i => $(i)?.classList.remove('open')); ['notes-drawer', 'audio-drawer', 'chat-window'].forEach(i => $(i)?.classList.remove('open')); $('admin-overlay')?.classList.remove('active'); }
    if (curUtil === 'flashcards' && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) fcKey(e);
});

/* ============ UTILITIES ============ */
const UTITLE = { focus: '🎯 Focus Room', analytics: '📊 Analytics', timetable: '📅 Timetable', syllabus: '📑 Syllabus Mastery', flashcards: '📇 Flashcards' };
function openUtility(type) {
    if (!UTITLE[type]) return;
    setView('util'); curUtil = type;
    $('current-title').textContent = UTITLE[type]; $('current-path').textContent = 'Tools › ' + type;
    const up = $('util-panel'); up.onclick = up.onchange = up.oninput = null;
    ({ focus: renderFocus, analytics: renderAnalytics, timetable: renderTT, syllabus: renderSyl, flashcards: renderFC })[type](up);
}

/* ---- Focus room ---- */
function renderFocus(up) {
    up.innerHTML = `<div class="focus-room"><div class="mode-tabs"><button data-m="focus">Focus</button><button data-m="short">Short break</button><button data-m="long">Long break</button></div>
    <div class="ring-wrap"><svg viewBox="0 0 220 220" class="ring"><circle class="ring-bg" cx="110" cy="110" r="96"/><circle class="ring-fg" data-pomo="ring" cx="110" cy="110" r="96" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/></svg>
    <div class="ring-center"><div class="pomo-time" data-pomo="time">00:00</div><div class="ring-sub" data-pomo="modelabel">Focus</div><div class="plant" data-pomo="plant">🌱</div></div></div>
    <div class="bubble" data-pomo="quote"></div>
    <div class="focus-inputs"><select id="pomo-subject">${SUBJ.map(s => `<option ${s === P.subject ? 'selected' : ''}>${s}</option>`).join('')}</select><input type="text" id="pomo-task" placeholder="What are you working on?" value="${esc(P.task)}"></div>
    <div class="focus-btns"><button class="btn ghost" data-pa="reset">Reset</button><button class="btn big" data-pa="toggle" data-pomo="toggle">▶ Start Focus</button><button class="btn ghost" data-pa="skip">Skip ⏭</button></div>
    <div class="dots" data-pomo="dots"></div><div class="focus-log"><h3>Today's sessions</h3><div id="focus-log-list"></div></div></div>`;
    up.onchange = e => { if (e.target.id === 'pomo-subject') P.subject = e.target.value; };
    up.oninput = e => { if (e.target.id === 'pomo-task') P.task = e.target.value; };
    renderPomo(); renderFocusLog();
}

/* ---- Analytics ---- */
let anRange = 30;
function barsSVG(vals, labels, goal) {
    const n = vals.length, W = n * 20, H = 150, max = Math.max(...vals, goal || 0, 1), step = Math.ceil(n / 12);
    let s = `<svg viewBox="0 0 ${W} ${H + 24}" class="chart">`;
    vals.forEach((v, i) => { const h = v / max * H; s += `<rect class="bar" x="${i * 20 + 3}" y="${H - h}" width="14" height="${h}" rx="3"><title>${labels[i]}: ${Math.round(v)} min</title></rect>`; if (i % step === 0) s += `<text x="${i * 20 + 10}" y="${H + 16}" text-anchor="middle">${labels[i].slice(5)}</text>`; });
    if (goal) s += `<line x1="0" x2="${W}" y1="${H - goal / max * H}" y2="${H - goal / max * H}" class="goal"/>`;
    return s + '</svg>';
}
function donutSVG(parts) {
    const tot = parts.reduce((a, p) => a + p.v, 0), R = 60, C = 2 * Math.PI * R; let off = 0;
    let s = `<svg viewBox="0 0 160 160" class="donut"><circle cx="80" cy="80" r="${R}" class="donut-bg"/>`;
    if (tot > 0) parts.forEach(p => { const len = p.v / tot * C; s += `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${p.n}: ${p.v.toFixed(1)}h</title></circle>`; off += len; });
    return s + `<text x="80" y="86" text-anchor="middle" class="donut-t">${tot.toFixed(1)}h</text></svg>`;
}
function renderAnalytics(up) {
    const days = lastDays(anRange), mins = days.map(minsOn), tot = mins.reduce((a, b) => a + b, 0), act = mins.filter(m => m > 0).length;
    const parts = SUBJ.map(s => ({ n: s, v: stats.subjects[s] || 0, c: SUBJ_COLOR[s] }));
    const wd = [0, 0, 0, 0, 0, 0, 0]; days.forEach((d, i) => { wd[(new Date(d + 'T00:00:00').getDay() + 6) % 7] += mins[i]; });
    const t0 = new Date(days[0] + 'T00:00:00').getTime(), tod = [0, 0, 0, 0];
    slog.filter(x => x.t >= t0).forEach(x => { const h = new Date(x.t).getHours(); tod[h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3] += x.m; });
    const goalM = S.goal * 60, todayM = minsOn(ld());
    let w = 0, tv = 0; Object.entries(prog).forEach(([id, p]) => { w += Object.keys(p.watched || {}).length; }); window.libraryData.LECTURES.forEach(b => tv += b.playlist.length);
    const hb = days.map(d => { const m = minsOn(d), l = m <= 0 ? 0 : Math.min(4, Math.ceil(m / (goalM / 4 || 1))); return `<div class="hb l${l}" title="${d}: ${Math.round(m)} min"></div>`; }).join('');
    const hbar = (arr, labs) => { const mx = Math.max(...arr, 1); return arr.map((v, i) => `<div class="hbar"><span>${labs[i]}</span><i style="width:${v / mx * 60}%"></i><span>${Math.round(v)}m</span></div>`).join(''); };
    const recent = slog.slice(-8).reverse();
    up.innerHTML = `<div class="panel"><h2>Analytics</h2>
    <div class="row center">${[7, 30, 90].map(r => `<button class="chip ${r === anRange ? 'active' : ''}" data-range="${r}">Last ${r} days</button>`).join('')}<button class="chip" data-exp="csv">⬇ CSV</button><button class="chip" data-exp="json">⬇ JSON</button></div>
    <div class="grid4"><div class="card tile"><b>${(tot / 60).toFixed(1)}h</b><span>Focus (range)</span></div><div class="card tile"><b>${streakNow()} 🔥</b><span>Streak · best ${bestStreak()}</span></div><div class="card tile"><b>${act ? Math.round(tot / act) : 0}m</b><span>Avg / active day</span></div><div class="card tile">${ring(goalM ? todayM / goalM : 0, Math.round(todayM) + 'm')}<span>Today · goal <input type="number" id="an-goal" min="1" max="16" step="0.5" value="${S.goal}" style="width:56px;padding:2px 6px">h</span></div></div>
    <div class="card"><h4>Daily minutes</h4>${barsSVG(mins, days, goalM)}</div>
    <div class="card"><h4>Consistency heatmap</h4><div class="heat">${hb}</div></div>
    <div class="two"><div class="card"><h4>Subjects (all time)</h4><div class="row">${donutSVG(parts)}<div>${parts.map(p => `<div class="hbar"><span style="color:${p.c}">● ${p.n}</span><span>${p.v.toFixed(1)}h</span></div>`).join('')}</div></div></div>
    <div class="card"><h4>Best weekdays</h4>${hbar(wd, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])}<h4 style="margin-top:12px">Time of day</h4>${hbar(tod, ['Morning', 'Afternoon', 'Evening', 'Night'])}</div></div>
    <div class="two"><div class="card"><h4>Library progress</h4><p class="muted">Lectures watched</p><div class="prog"><div style="width:${tv ? w / tv * 100 : 0}%"></div></div><p class="muted" style="margin-top:6px">${w} of ${tv} videos · ${Object.keys(opened).length} files opened · ${favs.length} saved</p></div>
    <div class="card"><h4>Recent sessions</h4>${recent.length ? `<table class="log">${recent.map(x => `<tr><td>${new Date(x.t).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td><td>${esc(x.s)}</td><td>${x.m}m</td><td>${esc(x.k)}</td></tr>`).join('')}</table>` : '<p class="muted">No logged sessions yet.</p>'}</div></div></div>`;
    up.onclick = e => {
        const r = e.target.closest('[data-range]'); if (r) { anRange = +r.dataset.range; renderAnalytics(up); return; }
        const x = e.target.closest('[data-exp]'); if (!x) return;
        if (x.dataset.exp === 'csv') dl('study-daily.csv', 'date,minutes,sessions\n' + dayKeys().sort().map(k => `${k},${Math.round(minsOn(k))},${sessionsOn(k)}`).join('\n'), 'text/csv');
        else dl('study-data.json', JSON.stringify({ stats, log: slog }, null, 2), 'application/json');
    };
    up.onchange = e => { if (e.target.id === 'an-goal') { S.goal = Math.min(16, Math.max(0.5, parseFloat(e.target.value) || 4)); saveS(); renderAnalytics(up); } };
}

/* ---- Timetable ---- */
const TT_KEY = 'timeline_tasks_pro';
let tt = load(TT_KEY, []).map((t, i) => ({ id: t.id || 't' + Date.now() + i, time: t.time || '12:00', text: t.text || '', done: !!t.done, dur: t.dur || 60, subj: t.subj || 'General' }));
let ttView = 'list'; const GH = 44, G0 = 4 * 60, notified = new Set();
const toMin = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
const fromMin = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const saveTT = () => save(TT_KEY, tt);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
function addTT(time, text, dur, subj) { tt.push({ id: 't' + Date.now() + Math.random().toString(36).slice(2, 5), time, text, done: false, dur: dur || 60, subj: subj || 'General' }); saveTT(); }
function renderTT(up) {
    up.innerHTML = `<div class="panel"><h2>Timetable</h2>
    <div class="card"><div class="tt-form"><input type="time" id="tt-start" value="${fromMin(Math.ceil(nowMin() / 15) * 15)}"><input type="number" id="tt-dur" class="tt-dur" value="60" min="5" step="5" title="Minutes"><select id="tt-subj">${SUBJ.map(s => `<option>${s}</option>`).join('')}</select><input type="text" id="tt-task" placeholder="Task description…"><button class="primary-btn" id="tt-add">Add</button></div></div>
    <div class="row"><div class="seg" style="flex:1"><button data-v="list" class="${ttView === 'list' ? 'active' : ''}">☰ List</button><button data-v="grid" class="${ttView === 'grid' ? 'active' : ''}">▦ Day planner</button></div><button class="btn ghost" id="tt-tpl">✨ JEE day template</button><button class="btn ghost" id="tt-clr">Clear done</button></div>
    <div id="tt-sum"></div><div id="tt-body"></div></div>`;
    paintTT();
    up.onclick = e => {
        if (e.target.closest('#tt-add')) { const tx = $('tt-task').value.trim(); if (tx) { addTT($('tt-start').value || '12:00', tx, +$('tt-dur').value || 60, $('tt-subj').value); $('tt-task').value = ''; paintTT(); } return; }
        const v = e.target.closest('.seg button'); if (v) { ttView = v.dataset.v; renderTT(up); return; }
        if (e.target.closest('#tt-tpl')) { if (confirm('Add a sample JEE study day to your timetable?')) { [['06:00', 'Physics – theory + notes', 90, 'Physics'], ['08:00', 'Chemistry – NCERT + PYQs', 90, 'Chemistry'], ['10:00', 'Maths – problem practice', 120, 'Maths'], ['13:00', 'Revision – flashcards', 45, 'General'], ['16:00', 'Mock test / PYQ set', 120, 'General'], ['19:00', 'Error log review', 45, 'General']].forEach(t => addTT(...t)); paintTT(); } return; }
        if (e.target.closest('#tt-clr')) { tt = tt.filter(t => !t.done); saveTT(); paintTT(); return; }
        const it = e.target.closest('[data-id]'); if (!it) return; const t = tt.find(x => x.id === it.dataset.id); if (!t) return;
        if (e.target.closest('.tt-del')) { tt = tt.filter(x => x !== t); saveTT(); paintTT(); }
        else if (e.target.closest('.tt-chip')) { t.subj = SUBJ[(SUBJ.indexOf(t.subj) + 1) % SUBJ.length]; saveTT(); paintTT(); }
    };
    up.onchange = e => {
        const it = e.target.closest('[data-id]'); if (!it) return; const t = tt.find(x => x.id === it.dataset.id); if (!t) return;
        if (e.target.classList.contains('tt-check')) t.done = e.target.checked; else if (e.target.classList.contains('tt-time-in')) t.time = e.target.value || t.time; else if (e.target.classList.contains('tt-dur')) t.dur = Math.max(5, +e.target.value || 60); else return;
        saveTT(); paintTT();
    };
    up.onkeydown = e => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('tt-text')) { e.preventDefault(); e.target.blur(); } };
    up.onfocusout = e => { if (e.target.classList && e.target.classList.contains('tt-text')) { const t = tt.find(x => x.id === e.target.closest('[data-id]').dataset.id); if (t) { t.text = e.target.textContent.trim() || t.text; saveTT(); } } };
}
function paintTT() {
    const body = $('tt-body'); if (!body) return; tt.sort((a, b) => a.time.localeCompare(b.time));
    const done = tt.filter(t => t.done).length, nm = nowMin(), now = tt.find(t => !t.done && toMin(t.time) <= nm && nm < toMin(t.time) + t.dur), next = tt.find(t => !t.done && toMin(t.time) > nm);
    $('tt-sum').innerHTML = `<div class="prog"><div style="width:${tt.length ? done / tt.length * 100 : 0}%"></div></div><p class="muted" style="margin-top:6px">${done}/${tt.length} done${now ? ' · Now: <b>' + esc(now.text) + '</b>' : ''}${next ? ' · Next: ' + esc(next.text) + ' in ' + (toMin(next.time) - nm) + 'm' : ''}</p>`;
    if (ttView === 'list') {
        body.innerHTML = tt.length ? `<div style="display:flex;flex-direction:column;gap:10px">${tt.map(t => `<div class="tt-item ${t.done ? 'done' : ''} ${t === now ? 'now' : ''}" data-id="${t.id}" style="--sc:${SUBJ_COLOR[t.subj]}"><input type="checkbox" class="tt-check" ${t.done ? 'checked' : ''}><input type="time" class="tt-time-in" value="${t.time}"><div class="tt-main"><span class="tt-text" contenteditable="true" spellcheck="false">${esc(t.text)}</span></div><input type="number" class="tt-dur" value="${t.dur}" min="5" step="5" title="Minutes"><button class="tt-chip" style="background:${SUBJ_COLOR[t.subj]}" title="Click to change subject">${t.subj}</button><button class="icon-btn tt-del" style="color:var(--danger)">✖</button></div>`).join('')}</div>` : '<p class="muted" style="text-align:center">No tasks yet — add one above or load the template.</p>';
    } else {
        const H = (24 * 60 - G0) / 60 * GH; let h = `<div class="tt-grid" id="tt-grid" style="height:${H}px">`;
        for (let m = G0; m < 24 * 60; m += 60) h += `<div class="tt-hr" style="top:${(m - G0) / 60 * GH}px">${fromMin(m)}</div>`;
        tt.forEach(t => { const top = (toMin(t.time) - G0) / 60 * GH; h += `<div class="tt-block ${t.done ? 'done' : ''}" data-id="${t.id}" style="top:${top}px;height:${Math.max(22, t.dur / 60 * GH - 2)}px;--sc:${SUBJ_COLOR[t.subj]}" title="Drag to move · click to toggle done · double-click to rename · right-click to delete">${t.time} ${esc(t.text)}</div>`; });
        body.innerHTML = h + '<div class="tt-now" id="tt-nowline"></div></div><p class="muted">Click an empty slot to add a task · drag blocks to reschedule.</p>'; renderTTNow(); bindGrid();
    }
}
function renderTTNow() { const l = $('tt-nowline'); if (l) { l.style.top = Math.max(0, (nowMin() - G0) / 60 * GH) + 'px'; } }
function bindGrid() {
    const g = $('tt-grid'); if (!g) return; let drag = null;
    g.onpointerdown = e => {
        if (e.button !== 0) return;
        const b = e.target.closest('.tt-block'); if (!b) return; const t = tt.find(x => x.id === b.dataset.id);
        drag = { b, t, y0: e.clientY, top0: parseFloat(b.style.top), moved: false }; g.setPointerCapture(e.pointerId); b.classList.add('drag');
    };
    g.onpointermove = e => { if (!drag) return; const dy = e.clientY - drag.y0; if (Math.abs(dy) > 4) drag.moved = true; if (drag.moved) drag.b.style.top = Math.max(0, drag.top0 + dy) + 'px'; };
    g.onpointerup = e => {
        if (!drag) return; const { b, t, moved } = drag; drag = null; b.classList.remove('drag');
        if (moved) { const m = Math.round(((parseFloat(b.style.top) / GH) * 60 + G0) / 15) * 15; t.time = fromMin(Math.min(24 * 60 - 15, Math.max(G0, m))); } else t.done = !t.done;
        window.__ttUp = Date.now(); saveTT(); setTimeout(paintTT, 0);
    };
    g.ondblclick = e => { const b = (document.elementFromPoint(e.clientX, e.clientY) || e.target).closest('.tt-block'); if (!b) return; const t = tt.find(x => x.id === b.dataset.id), v = prompt('Rename task', t.text); if (v && v.trim()) { t.text = v.trim(); saveTT(); paintTT(); } };
    g.oncontextmenu = e => { const b = e.target.closest('.tt-block'); if (!b) return; e.preventDefault(); if (confirm('Delete this task?')) { tt = tt.filter(x => x.id !== b.dataset.id); saveTT(); paintTT(); } };
    g.onclick = e => { if (Date.now() - (window.__ttUp || 0) < 400 || e.target.closest('.tt-block')) return; const r = g.getBoundingClientRect(), m = Math.round(((e.clientY - r.top) / GH * 60 + G0) / 30) * 30, tx = prompt('New task at ' + fromMin(m) + ':'); if (tx && tx.trim()) { addTT(fromMin(Math.min(24 * 60 - 30, m)), tx.trim(), 60, 'General'); paintTT(); } };
}
setInterval(() => {
    if (!isAuthed()) return; const d = ld() + fromMin(nowMin());
    tt.forEach(t => { if (!t.done && t.time === fromMin(nowMin()) && !notified.has(d + t.id)) { notified.add(d + t.id); showToast('⏰ ' + t.text); beep(); } });
}, 20000);

/* ---- Syllabus ---- */
let sylLevel = 'Class12', sylFilter = 'all', sylQ = '';
const ST = ['⚪', '🟡', '🔵', '🟢'], STN = ['Unstudied', 'Theory', 'PYQs', 'Mastered'];
function renderSyl(up) {
    let h = `<div class="panel"><h2>Syllabus Mastery</h2><div class="seg">${Object.keys(SYL_LEVELS).map(k => `<button data-lv="${k}" class="${k === sylLevel ? 'active' : ''}">${SYL_LEVELS[k]}</button>`).join('')}</div>
    <div class="row"><div class="card" style="padding:8px">${ring(sylPct(sylLevel) / 100, sylPct(sylLevel) + '%', 76)}</div><div style="flex:1;min-width:200px"><input type="text" id="syl-q" placeholder="Search chapters…" value="${esc(sylQ)}" style="width:100%"><div class="chips"><button class="chip ${sylFilter === 'all' ? 'active' : ''}" data-sf="all">All</button>${STN.map((n, i) => `<button class="chip ${sylFilter == i ? 'active' : ''}" data-sf="${i}">${ST[i]} ${n}</button>`).join('')}</div></div></div><div class="syl-grid">`;
    Object.keys(SYL[sylLevel]).forEach(subj => {
        const chs = SYL[sylLevel][subj].filter(ch => ch.toLowerCase().includes(sylQ.toLowerCase()) && (sylFilter === 'all' || (sylData[`${sylLevel}_${subj}_${ch}`] || 0) == sylFilter));
        h += `<div class="card"><div class="syl-head"><h3 style="color:${SUBJ_COLOR[subj]}">${subj}</h3>${ring(sylPct(sylLevel, subj) / 100, sylPct(sylLevel, subj) + '%', 56)}</div>${chs.map(ch => { const key = `${sylLevel}_${subj}_${ch}`, st = sylData[key] || 0; return `<div class="chap"><span>${esc(ch)}</span><div class="st">${ST.map((ic, i) => `<button class="${i === st ? 'on' : ''}" data-key="${esc(key)}" data-st="${i}" title="${STN[i]}">${ic} ${i === st ? STN[i] : ''}</button>`).join('')}</div></div>`; }).join('') || '<p class="muted">No chapters match.</p>'}</div>`;
    });
    up.innerHTML = h + '</div></div>';
    up.onclick = e => {
        const lv = e.target.closest('[data-lv]'); if (lv) { sylLevel = lv.dataset.lv; renderSyl(up); return; }
        const sf = e.target.closest('[data-sf]'); if (sf) { sylFilter = sf.dataset.sf; renderSyl(up); return; }
        const b = e.target.closest('[data-key]'); if (b) { sylData[b.dataset.key] = +b.dataset.st; save('syl_tracker_pro', sylData); renderSyl(up); pushSync(); }
    };
    up.oninput = e => { if (e.target.id === 'syl-q') { sylQ = e.target.value; const pos = e.target.selectionStart; renderSyl(up); const i = $('syl-q'); i.focus(); i.setSelectionRange(pos, pos); } };
}

/* ---- Flashcards ---- */
const CODE = { P: 'Physics', C: 'Chemistry', M: 'Maths' };
const baseDeck = (window.flashSeed || []).map(r => ({ s: CODE[r[0]], q: r[1], a: r[2], id: r[0] + '|' + r[1] }));
let custom = load('fc_custom', []), boxes = load('fc_box', {}), fcSub = 'All', fcWeak = false, fcShuffle = false, fcOrder = [], fcIdx = 0, fcFlip = false;
const allCards = () => baseDeck.concat(custom.map(c => ({ s: 'Custom', q: c.q, a: c.a, id: 'X|' + c.q })));
window.__allCards = allCards;
function fcBuild() {
    fcOrder = allCards().filter(c => (fcSub === 'All' || c.s === fcSub) && (!fcWeak || (boxes[c.id] || 0) <= 1));
    if (fcShuffle) for (let i = fcOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fcOrder[i], fcOrder[j]] = [fcOrder[j], fcOrder[i]]; }
    fcIdx = 0; fcFlip = false;
}
function renderFC(up) { if (!fcOrder.length) fcBuild(); fcPaint(up); }
function fcPaint(up) {
    up = up || $('util-panel'); const all = allCards(), mastered = all.filter(c => (boxes[c.id] || 0) >= 4).length, c = fcOrder[fcIdx];
    up.innerHTML = `<div class="panel"><h2>Flashcards</h2>
    <div class="chips" style="justify-content:center">${['All', 'Physics', 'Chemistry', 'Maths', 'Custom'].map(s => `<button class="chip ${fcSub === s ? 'active' : ''}" data-sub="${s}">${s}</button>`).join('')}<button class="chip ${fcWeak ? 'active' : ''}" data-weak="1">🎯 Weak only</button><button class="chip ${fcShuffle ? 'active' : ''}" data-shuf="1">🔀 Shuffle</button></div>
    <p class="muted" style="text-align:center">${fcOrder.length ? `Card ${fcIdx + 1} of ${fcOrder.length}` : 'No cards match this filter'} · ${mastered}/${all.length} mastered · Space = flip, ←/→ = move, 1/2/3 = Again/Good/Easy</p>
    <div class="prog"><div style="width:${all.length ? mastered / all.length * 100 : 0}%"></div></div>
    ${c ? `<div class="fc-card ${fcFlip ? 'flip' : ''}" id="fc-card"><div class="fc-inner"><div class="fc-front"><span class="fc-tag">${c.s} · box ${boxes[c.id] || 0}</span>${esc(c.q)}</div><div class="fc-back"><span class="fc-tag">Answer</span>${esc(c.a)}</div></div></div>
    <div class="row center"><button class="btn ghost" data-nav="-1">◀ Prev</button><button class="btn ghost" data-rate="0">😵 Again</button><button class="btn ghost" data-rate="1">🙂 Good</button><button class="btn ghost" data-rate="4">😎 Easy</button><button class="btn ghost" data-nav="1">Next ▶</button>${c.s === 'Custom' ? '<button class="btn ghost" data-delc="1">🗑 Delete</button>' : ''}</div>` : '<p class="muted" style="text-align:center">Try another filter, or add your own card below.</p>'}
    <div class="card"><h4>Add your own card</h4><div class="fc-form"><input type="text" id="fc-q" placeholder="Question"><input type="text" id="fc-a" placeholder="Answer"><button class="primary-btn" id="fc-add">Add</button></div></div></div>`;
    up.onclick = e => {
        if (e.target.closest('#fc-card')) { fcFlip = !fcFlip; $('fc-card').classList.toggle('flip', fcFlip); return; }
        const s = e.target.closest('[data-sub]'); if (s) { fcSub = s.dataset.sub; fcBuild(); fcPaint(); return; }
        if (e.target.closest('[data-weak]')) { fcWeak = !fcWeak; fcBuild(); fcPaint(); return; }
        if (e.target.closest('[data-shuf]')) { fcShuffle = !fcShuffle; fcBuild(); fcPaint(); return; }
        const n = e.target.closest('[data-nav]'); if (n) { fcMove(+n.dataset.nav); return; }
        const r = e.target.closest('[data-rate]'); if (r) { fcRate(+r.dataset.rate); return; }
        if (e.target.closest('[data-delc]')) { const cc = fcOrder[fcIdx]; custom = custom.filter(x => 'X|' + x.q !== cc.id); save('fc_custom', custom); fcBuild(); fcPaint(); return; }
        if (e.target.closest('#fc-add')) { const q = $('fc-q').value.trim(), a = $('fc-a').value.trim(); if (q && a) { custom.push({ q, a }); save('fc_custom', custom); fcSub = 'Custom'; fcBuild(); fcIdx = fcOrder.length - 1; fcPaint(); showToast('Card added'); } }
    };
}
function fcMove(d) { if (!fcOrder.length) return; fcIdx = (fcIdx + d + fcOrder.length) % fcOrder.length; fcFlip = false; fcPaint(); }
function fcRate(v) { const c = fcOrder[fcIdx]; if (!c) return; boxes[c.id] = v === 0 ? 0 : Math.min(4, (boxes[c.id] || 0) + v); save('fc_box', boxes); fcMove(1); }
function fcKey(e) {
    if (!fcOrder.length) return;
    if (e.key === ' ') { e.preventDefault(); fcFlip = !fcFlip; $('fc-card')?.classList.toggle('flip', fcFlip); }
    else if (e.key === 'ArrowRight') fcMove(1); else if (e.key === 'ArrowLeft') fcMove(-1);
    else if (e.key === '1') fcRate(0); else if (e.key === '2') fcRate(1); else if (e.key === '3') fcRate(4);
}

/* ============ AUDIO HUB ============ */
let synthNode = null, synthGain = null, synthCtx = null;
const SYNTH = ['brown', 'pink', 'white', 'green', 'binaural'];
function stopAllAudio() {
    if (synthNode) { try { synthNode.stop(); synthNode.disconnect(); } catch (e) {} synthNode = null; }
    if (synthCtx) { try { synthCtx.close(); } catch (e) {} synthCtx = null; }
    const a = $('audio-frame'); if (a) a.src = '';
}
$('audio-select')?.addEventListener('change', e => {
    const syn = SYNTH.includes(e.target.value);
    $('volume-container').style.display = syn ? 'flex' : 'none'; $('audio-to-main-btn').style.display = syn ? 'none' : 'flex'; $('audio-iframe-box').style.display = 'none';
    stopAllAudio(); $('audio-toggle').textContent = '▶ Start Audio';
});
$('audio-volume')?.addEventListener('input', e => { if (synthGain) synthGain.gain.value = parseFloat(e.target.value); });
$('audio-toggle')?.addEventListener('click', e => {
    const type = $('audio-select').value, syn = SYNTH.includes(type);
    if (e.target.textContent.includes('Stop')) { stopAllAudio(); e.target.textContent = '▶ Start Audio'; $('audio-iframe-box').style.display = 'none'; return; }
    e.target.textContent = '⏹ Stop Audio';
    if (syn) {
        $('audio-iframe-box').style.display = 'none'; stopAllAudio();
        const ctx = synthCtx = new (window.AudioContext || window.webkitAudioContext)();
        synthGain = ctx.createGain(); synthGain.gain.value = parseFloat($('audio-volume').value); synthGain.connect(ctx.destination);
        if (type === 'binaural') {
            const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), mg = ctx.createChannelMerger(2); o1.frequency.value = 200; o2.frequency.value = 240;
            o1.connect(mg, 0, 0); o2.connect(mg, 0, 1); mg.connect(synthGain); o1.start(); o2.start();
            synthNode = { stop: () => { o1.stop(); o2.stop(); }, disconnect: () => mg.disconnect() };
        } else {
            const n = 2 * ctx.sampleRate, buf = ctx.createBuffer(1, n, ctx.sampleRate), out = buf.getChannelData(0);
            let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < n; i++) {
                const w = Math.random() * 2 - 1;
                if (type === 'white') out[i] = w * 0.1;
                else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; out[i] = last * 1.5; }
                else if (type === 'green') out[i] = w * 0.5;
                else { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
            }
            const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; if (type === 'green') { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.5; src.connect(bp); bp.connect(synthGain); } else src.connect(synthGain); src.start(); synthNode = src;
        }
    } else { $('audio-iframe-box').style.display = 'block'; $('audio-frame').src = `https://www.youtube.com/embed/${type}?autoplay=1&rel=0&modestbranding=1`; }
});
$('audio-to-main-btn')?.addEventListener('click', () => {
    const sel = $('audio-select'), type = sel.value, title = sel.options[sel.selectedIndex].text;
    cur = null; setView('viewer'); $('lecture-bar').style.display = 'none';
    $('current-title').textContent = title; $('current-path').textContent = 'Workspace › Audio › ' + title;
    const url = `https://www.youtube.com/embed/${type}?autoplay=1&rel=0&modestbranding=1`; $('frame-1').src = url; if (isSplit) $('frame-2').src = url;
    stopAllAudio(); $('audio-toggle').textContent = '▶ Start Audio'; $('audio-iframe-box').style.display = 'none'; $('audio-drawer')?.classList.remove('open');
});

/* ============ HEADER, SPLIT, DRAWERS ============ */
$('sidebar-toggle')?.addEventListener('click', () => { if (window.innerWidth <= 768) $('sidebar').classList.toggle('mobile-open'); else $('sidebar').classList.toggle('collapsed'); });
$('mobile-sidebar-close')?.addEventListener('click', () => $('sidebar').classList.remove('mobile-open'));
window.addEventListener('offline', () => $('offline-overlay')?.classList.add('active'));
window.addEventListener('online', () => $('offline-overlay')?.classList.remove('active'));
$('home-btn')?.addEventListener('click', () => { cur = null; $('frame-1').src = ''; $('frame-2').src = ''; document.querySelectorAll('.book-item').forEach(i => i.classList.remove('active')); setView('home'); });
$('fs-btn')?.addEventListener('click', () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} });
$('notes-btn')?.addEventListener('click', () => { $('audio-drawer').classList.remove('open'); $('notes-drawer').classList.add('open'); });
$('notes-close')?.addEventListener('click', () => $('notes-drawer').classList.remove('open'));
$('audio-btn')?.addEventListener('click', () => { $('notes-drawer').classList.remove('open'); $('audio-drawer').classList.add('open'); });
$('audio-close')?.addEventListener('click', () => $('audio-drawer').classList.remove('open'));
$('split-btn')?.addEventListener('click', () => {
    isSplit = !isSplit; const v1 = $('viewer-1'); v1.style.flex = '';
    $('viewer-2').style.flex = ''; $('viewer-2').style.display = isSplit ? 'block' : 'none'; $('resizer').style.display = isSplit ? 'flex' : 'none';
    $('frame-2').src = isSplit ? $('frame-1').src : '';
});
let isRes = false;
$('resizer')?.addEventListener('mousedown', () => { isRes = true; $('resizer').classList.add('dragging'); document.body.style.cursor = 'col-resize'; $('viewer-1').style.pointerEvents = $('viewer-2').style.pointerEvents = 'none'; });
document.addEventListener('mousemove', e => {
    if (document.body.classList.contains('glow')) { const g = $('cursor-glow'); if (g) g.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }
    if (!isRes) return; const r = $('main-workspace').getBoundingClientRect(), p = (e.clientX - r.left) / r.width * 100;
    if (p > 15 && p < 85) { $('viewer-1').style.flex = `0 0 ${p}%`; $('viewer-2').style.flex = '1 1 0'; }
});
document.addEventListener('mouseup', () => { if (isRes) { isRes = false; $('resizer').classList.remove('dragging'); document.body.style.cursor = ''; $('viewer-1').style.pointerEvents = $('viewer-2').style.pointerEvents = ''; } });

/* ============ SETTINGS MODAL ============ */
const OPT = {
    theme: [['theme-amoled', 'AMOLED Pitch Black'], ['theme-charcoal', 'Charcoal Dark'], ['theme-slate', 'Slate Navy'], ['theme-midnight', 'Midnight Purple'], ['theme-forest', 'Deep Forest'], ['theme-rose', 'Rose Noir'], ['theme-light', 'Light Mode']],
    bg: [['bg-none', 'None (Solid Theme)'], ['bg-glow', 'Accent Glow'], ['bg-grid', 'Blueprint Grid'], ['bg-dynamic', 'Dynamic Aurora (Animated)'], ['bg-rain', 'Rainy Window'], ['bg-space', 'Deep Space'], ['bg-lofi', 'Neon Lofi Rain (assets)'], ['bg-topo', 'Dark Topography (assets)']],
    pomoTheme: [['plant', 'Plant 🌱 🌿 🪴 🌳'], ['beaker', 'Beaker 🧫 💧 🧪 🧬'], ['flame', 'Flame 💨 🕯️ 🪵 🔥']],
    icon: ['⚡', '🍅', '🧠', '🔥', '⏱️', '🚀', '📖'].map(i => [i, i]),
    mode: [['fancy', 'Interactive & Smooth (default)'], ['classic', 'Classic / Normal']], radius: [['round', 'Rounded'], ['sharp', 'Sharp corners'], ['pill', 'Extra round']],
    font: [['inter', 'Inter (default)'], ['system', 'System UI'], ['serif', 'Serif'], ['mono', 'Monospace']], fontSize: [['font-small', 'Small'], ['font-medium', 'Medium'], ['font-large', 'Large']],
    density: [['comfortable', 'Comfortable'], ['compact', 'Compact']], logo: [['vector', 'Vector logo (default)'], ['img', 'Image logo (assets)']],
    slTheme: [['ocean', 'Ocean'], ['sunset', 'Sunset'], ['arctic', 'Arctic'], ['neon', 'Neon'], ['space', 'Cosmic'], ['forest', 'Forest']],
    slImages: [['local', 'My assets only'], ['fallback', 'Assets, then online (cats/dogs)'], ['online', 'Online first (cats/dogs)']]
};
const SCHEMA = [
    { sec: 'Appearance', items: [{ k: 'theme', l: 'Theme', t: 'select' }, { k: 'accent', l: 'Accent colour', t: 'accent' }, { k: 'bg', l: 'Ambient background', t: 'select' }, { k: 'mode', l: 'Design style', t: 'select' }, { k: 'radius', l: 'Corner style', t: 'select' }, { k: 'font', l: 'Font', t: 'select' }, { k: 'fontSize', l: 'Text size', t: 'select' }, { k: 'density', l: 'Density', t: 'select' }, { k: 'logo', l: 'Logo style', t: 'select' }, { k: 'sbWidth', l: 'Sidebar width', t: 'range', min: 280, max: 460, step: 10 }] },
    { sec: 'Interface', items: [{ k: 'name', l: 'Your display name', t: 'text' }, { k: 'anim', l: 'Animations', t: 'toggle' }, { k: 'cursorGlow', l: 'Cursor glow (Interactive mode)', t: 'toggle' }, { k: 'goal', l: 'Daily study goal (hours)', t: 'number', min: 0.5, max: 16, step: 0.5 }] },
    { sec: 'Focus', items: [{ k: 'focusTime', l: 'Focus (min)', t: 'number', min: 1, max: 180 }, { k: 'shortTime', l: 'Short break (min)', t: 'number', min: 1, max: 60 }, { k: 'longTime', l: 'Long break (min)', t: 'number', min: 1, max: 90 }, { k: 'cycles', l: 'Sessions before long break', t: 'number', min: 1, max: 12 }, { k: 'autoStart', l: 'Auto-start next timer', t: 'toggle' }, { k: 'chime', l: 'Chime on finish', t: 'toggle' }, { k: 'chimeVol', l: 'Chime volume', t: 'range', min: 0.1, max: 1, step: 0.1 }, { k: 'icon', l: 'Timer icon', t: 'select' }, { k: 'pomoTheme', l: 'Growth theme', t: 'select' }, { k: 'burnoutHours', l: '"Touch grass" after (hours/day)', t: 'number', min: 1, max: 16 }] },
    { sec: 'Sea Lion', items: [{ k: 'seaLion', l: 'Show Sea Lion', t: 'toggle' }, { k: 'slTheme', l: 'Chat theme', t: 'select' }, { k: 'slImages', l: 'Picture source', t: 'select' }, { k: 'slSounds', l: 'Sea-lion sounds & actions', t: 'toggle' }] },
    { sec: 'Data', items: [{ k: 'share', l: 'Share my study stats with the admin', t: 'toggle' }, { t: 'data' }] }
];
const ACCENTS = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];
let setSec = 'Appearance';
function renderSettings() {
    $('set-tabs').innerHTML = SCHEMA.map(s => `<button class="chip ${s.sec === setSec ? 'active' : ''}" data-sec="${s.sec}">${s.sec}</button>`).join('');
    const sec = SCHEMA.find(s => s.sec === setSec); let h = '';
    if (setSec === 'Appearance') h += `<div class="preset-row"><button class="primary-btn" data-preset="fancy">✨ Interactive (default)</button><button class="outline-btn" data-preset="classic">▭ Normal / Classic</button></div>`;
    sec.items.forEach(it => {
        if (it.t === 'data') { h += `<div class="preset-row"><button class="outline-btn" data-act="export">⬇ Export backup</button><button class="outline-btn" data-act="import">⬆ Import backup</button><input type="file" id="imp-file" accept=".json" hidden></div><p class="set-note">Sync only sends simplified stats (study time, streak, subject hours, syllabus %) when the site owner has configured a server. Passwords are never stored or sent.</p>`; return; }
        const v = S[it.k]; let c = '';
        if (it.t === 'select') c = `<select data-k="${it.k}">${OPT[it.k].map(o => `<option value="${esc(o[0])}" ${String(v) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
        else if (it.t === 'toggle') c = `<input type="checkbox" data-k="${it.k}" ${v ? 'checked' : ''}>`;
        else if (it.t === 'range') c = `<input type="range" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}">`;
        else if (it.t === 'number') c = `<input type="number" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step || 1}" value="${v}">`;
        else if (it.t === 'text') c = `<input type="text" data-k="${it.k}" value="${esc(v)}" maxlength="24">`;
        else if (it.t === 'accent') c = `<div class="color-picker-group">${ACCENTS.map(a => `<div class="color-dot ${a === S.accent ? 'active' : ''}" data-color="${a}" style="background:${a}"></div>`).join('')}<input type="color" data-k="accent" value="${S.accent}"></div>`;
        h += `<div class="set-row"><label>${it.l}</label>${c}</div>`;
    });
    $('set-body').innerHTML = h;
}
function changeSetting(k, v) {
    S[k] = v; saveS(); applySettings();
    if (['focusTime', 'shortTime', 'longTime'].includes(k) && !P.running && P.left === P.total) setMode(P.mode);
    if (k === 'cycles') renderPomo();
    if (['theme', 'accent', 'mode'].includes(k)) renderSettings();
}
$('settings-btn-main')?.addEventListener('click', () => { renderSettings(); $('settings-modal').classList.add('open'); });
$('settings-close')?.addEventListener('click', () => $('settings-modal').classList.remove('open'));
$('save-settings')?.addEventListener('click', () => { $('settings-modal').classList.remove('open'); showToast('Settings saved'); renderHome(); });
$('settings-modal')?.addEventListener('click', e => { if (e.target === $('settings-modal')) $('settings-modal').classList.remove('open'); });
$('set-tabs')?.addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) { setSec = b.dataset.sec; renderSettings(); } });
$('set-body')?.addEventListener('click', e => {
    const d = e.target.closest('.color-dot'); if (d) { changeSetting('accent', d.dataset.color); return; }
    const p = e.target.closest('[data-preset]'); if (p) { if (p.dataset.preset === 'classic') Object.assign(S, { mode: 'classic', anim: false, cursorGlow: false, radius: 'sharp', font: 'system', bg: 'bg-none', density: 'compact' }); else Object.assign(S, { mode: 'fancy', anim: true, cursorGlow: true, radius: 'round', font: 'inter', bg: 'bg-none', density: 'comfortable' }); saveS(); applySettings(); renderSettings(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'export') { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!['authenticated', 'admin_real_user', 'admin_real_pass'].includes(k)) o[k] = localStorage.getItem(k); } dl('rr-backup.json', JSON.stringify(o), 'application/json'); }
    else $('imp-file').click();
});
$('set-body')?.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'imp-file' && t.files[0]) { const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); Object.keys(o).forEach(k => { if (!['authenticated', 'admin_real_user', 'admin_real_pass', 'rr_uid'].includes(k) && typeof o[k] === 'string') localStorage.setItem(k, o[k]); }); showToast('Backup imported — reloading'); setTimeout(() => location.reload(), 900); } catch (err) { showToast('Invalid backup file'); } }; r.readAsText(t.files[0]); return; }
    const k = t.dataset.k; if (!k) return;
    let v = t.type === 'checkbox' ? t.checked : t.type === 'number' ? (parseFloat(t.value) || DEF[k]) : t.type === 'range' ? parseFloat(t.value) : t.value;
    if (['sbWidth'].includes(k)) v = Math.round(v);
    changeSetting(k, v);
});
$('set-body')?.addEventListener('input', e => { const t = e.target; if (t.type === 'color') { S.accent = t.value; saveS(); applySettings(); } else if (t.type === 'range') changeSetting(t.dataset.k, parseFloat(t.value)); });
$('set-reset')?.addEventListener('click', () => { if (confirm('Reset all preferences to defaults?')) { S = Object.assign({}, DEF); saveS(); applySettings(); setMode('focus'); renderSettings(); } });

/* ============ API FOR SEA LION ============ */
window.RR = {
    get S() { return S; }, openUtility, home: () => $('home-btn').click(), switchTab,
    pomo: { start: startPomo, pause: pausePomo, reset: () => { setMode(P.mode); }, state: () => P },
    stats: () => ({ todayMin: Math.round(minsOn(ld())), totalH: +(totalMins() / 60).toFixed(1), streak: streakNow(), best: bestStreak(), sessions: sessionsTotal() }),
    card: () => pick(allCards()), quote: () => pick(QUOTES)
};

/* ============ INIT ============ */
applySettings(); switchTab('LECTURES'); setView('home'); renderPomo();
} catch (err) { console.error('Critical Application Error:', err); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); else initApp();
