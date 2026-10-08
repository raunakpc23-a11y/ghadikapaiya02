'use strict';
/*
 * Ghadi Ka Pahiya — in-browser backend.
 * Implements the same /api/* routes as server.js, but stores everything in this
 * browser's localStorage, so no server needs to be running. Exposes LocalDB.fetch()
 * which behaves like fetch() for /api/ URLs and resolves to a real Response.
 */
const LocalDB = (() => {
  const DB_KEY = 'gdp_localdb_v1', BK_KEY = 'gdp_localdb_backups', MAX_BACKUPS = 5, DAY = 86400000, START = Date.now();
  const enc = new TextEncoder();
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
  const httpErr = (status, message) => Object.assign(new Error(message), { status });

  /* ---- hashing: PBKDF2 when available, simple fallback otherwise ---- */
  async function derive(pw, salt) {
    pw = String(pw);
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
      return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 60000 }, key, 256));
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57; const s = salt + pw;
    for (let r = 0; r < 2000; r++) for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }
  const hashPw = async pw => { const salt = rnd(16); return { salt, hash: await derive(pw, salt) }; };
  const checkPw = async (pw, rec) => !!rec && !!rec.salt && !!rec.hash && (await derive(pw, rec.salt)) === rec.hash;
  async function sha(s) {
    if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
    return await derive(s, 'sess');
  }

  /* ---- database ---- */
  const freshDb = () => ({ v: 1, users: {}, sessions: {}, logs: [], config: { registrationOpen: true, maxUsers: 0, announcement: { id: 0, text: '', level: 'info', active: false } } });
  async function normalize(d) {
    const f = freshDb(); d = d && typeof d === 'object' ? d : f;
    d.users = Object.assign(Object.create(null), d.users || {});
    d.sessions = Object.assign(Object.create(null), d.sessions || {});
    d.logs = Array.isArray(d.logs) ? d.logs : [];
    d.config = Object.assign(f.config, d.config || {});
    d.config.announcement = Object.assign(f.config.announcement, d.config.announcement || {});
    if (!d.config.sitePass) d.config.sitePass = await hashPw('bhootnath');
    if (!d.config.adminPass) d.config.adminPass = await hashPw('Project3Clock');
    return d;
  }
  let db = null, ready = null, saveT = null, warned = false;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  function init() { return ready || (ready = (async () => { db = await normalize(read(DB_KEY)); saveNow(); try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {} })()); }
  function saveNow() {
    clearTimeout(saveT); saveT = null;
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch { if (!warned) { warned = true; try { toast('Browser storage is full — free some space or export your data', 'warn'); } catch {} } }
  }
  const save = () => { if (!saveT) saveT = setTimeout(saveNow, 300); };
  window.addEventListener('beforeunload', () => { if (db && saveT) saveNow(); });
  window.addEventListener('storage', e => { if (e.key === DB_KEY && e.newValue) { try { normalize(JSON.parse(e.newValue)).then(d => { db = d; }); } catch {} } });

  const log = (type, user, msg) => { db.logs.unshift({ t: Date.now(), type, user: user || '', msg }); if (db.logs.length > 1000) db.logs.length = 1000; save(); };

  const RESERVED = ['__proto__', 'constructor', 'prototype'];
  const validUsername = n => typeof n === 'string' && /^[A-Za-z0-9_.-]{2,24}$/.test(n) && !RESERVED.includes(n);
  const findUser = name => { if (typeof name !== 'string') return null; const low = name.toLowerCase(); for (const k of Object.keys(db.users)) if (k.toLowerCase() === low) return db.users[k]; return null; };

  /* ---- rate limit ---- */
  let fail = { n: 0, t: 0 };
  const limited = () => fail.n >= 8 && Date.now() - fail.t < 600000;
  const noteFail = () => { if (Date.now() - fail.t > 600000) fail = { n: 1, t: Date.now() }; else { fail.n++; fail.t = Date.now(); } };
  const clearFails = () => { fail = { n: 0, t: 0 }; };

  /* ---- sessions ---- */
  async function newSession(user) {
    const tk = rnd(32);
    db.sessions[await sha(tk)] = { user: user.username, created: Date.now(), last: Date.now(), expires: Date.now() + 30 * DAY, ua: navigator.userAgent.slice(0, 120), ip: 'this device' };
    save(); return tk;
  }
  async function authUser(h) {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(h.Authorization || ''); if (!m) return null;
    const key = await sha(m[1]), s = db.sessions[key]; if (!s) return null;
    if (s.expires < Date.now()) { delete db.sessions[key]; save(); return null; }
    const user = Object.prototype.hasOwnProperty.call(db.users, s.user) ? db.users[s.user] : null;
    if (!user || user.locked) return null;
    s.last = Date.now(); return { user, key };
  }
  const killSessions = name => { for (const k of Object.keys(db.sessions)) if (db.sessions[k].user === name) delete db.sessions[k]; save(); };
  const adminTokens = new Map();
  const adminOk = h => { const e = h['X-Admin-Token'] && adminTokens.get(String(h['X-Admin-Token'])); return !!e && e > Date.now(); };

  /* ---- helpers ---- */
  const STATE_KEYS = ['tasks', 'categories', 'catColors', 'catWeights', 'syllabus', 'syllabusMeta', 'customChapters', 'focusLog', 'game', 'prefs'];
  function cleanState(b) {
    if (!b || typeof b !== 'object' || !Array.isArray(b.tasks)) throw httpErr(400, 'Invalid state');
    if (b.tasks.length > 30000) throw httpErr(400, 'Too many tasks');
    const out = {}; for (const k of STATE_KEYS) if (b[k] !== undefined) out[k] = b[k];
    if (!Array.isArray(out.categories)) out.categories = []; return out;
  }
  const strBytes = s => new Blob([s]).size;
  function userStats(u) {
    const s = u.state || {}, tasks = Array.isArray(s.tasks) ? s.tasks : []; let focus = 0, done = 0;
    for (const t of tasks) { if (t && t.status === 'Completed') done++; focus += +(t && t.focusSec) || 0; }
    focus += +(s.game && s.game.freeSec) || 0;
    return { username: u.username, created: u.created, lastLogin: u.lastLogin || 0, lastActive: u.lastActive || 0, locked: !!u.locked, logins: u.logins || 0, tasks: tasks.length, done, focusHrs: +(focus / 3600).toFixed(2), xp: (s.game && +s.game.xp) || 0, bytes: strBytes(JSON.stringify(s)) };
  }
  const pub = u => ({ username: u.username, created: u.created });

  /* ---- backups (kept in localStorage; also downloadable) ---- */
  const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const backups = () => read(BK_KEY) || {};
  function makeBackup(prefix = 'backup') {
    saveNow();
    const all = backups(), name = `${prefix}-${stamp()}.json`;
    all[name] = { time: Date.now(), data: JSON.stringify(db) };
    const names = Object.keys(all).sort((a, b) => all[b].time - all[a].time);
    for (const n of names.slice(MAX_BACKUPS)) delete all[n];
    try { localStorage.setItem(BK_KEY, JSON.stringify(all)); }
    catch { throw httpErr(507, 'Browser storage is full. Delete old backups or use "Export all data".'); }
    return name;
  }
  const listBackups = () => { const all = backups(); return Object.keys(all).map(n => ({ name: n, size: strBytes(all[n].data), time: all[n].time })).sort((a, b) => b.time - a.time); };

  /* ---- routes ---- */
  async function route(method, url, body, h) {
    const p = url.pathname, m = method;
    if (p === '/api/health' && m === 'GET') { const a = db.config.announcement; return { ok: true, local: true, registrationOpen: db.config.registrationOpen, announcement: a.active && a.text ? { id: a.id, text: a.text, level: a.level } : null }; }

    if (p === '/api/register' && m === 'POST') {
      if (limited()) throw httpErr(429, 'Too many attempts. Try again in a few minutes.');
      if (!db.config.registrationOpen) throw httpErr(403, 'Registration is currently closed.');
      if (!(await checkPw(body.sitePassword || '', db.config.sitePass))) { noteFail(); log('auth', body.username, 'Registration blocked: wrong site password'); throw httpErr(403, 'Invalid Site Password.'); }
      if (!validUsername(body.username)) throw httpErr(400, 'Username must be 2-24 characters: letters, numbers, _ . -');
      if (typeof body.password !== 'string' || body.password.length < 6) throw httpErr(400, 'Password must be at least 6 characters.');
      if (findUser(body.username)) throw httpErr(409, 'Username already exists.');
      const cap = +db.config.maxUsers || 0; if (cap && Object.keys(db.users).length >= cap) throw httpErr(403, 'User limit reached. Ask the admin for a slot.');
      const pw = await hashPw(body.password);
      const u = db.users[body.username] = { username: body.username, salt: pw.salt, hash: pw.hash, created: Date.now(), lastLogin: Date.now(), lastActive: Date.now(), logins: 1, locked: false, state: null };
      clearFails(); log('auth', u.username, 'User registered');
      return { token: await newSession(u), user: pub(u), state: null };
    }
    if (p === '/api/login' && m === 'POST') {
      if (limited()) throw httpErr(429, 'Too many attempts. Try again in a few minutes.');
      const u = findUser(body.username);
      if (!u || !(await checkPw(body.password || '', u))) { noteFail(); log('auth', String(body.username || '').slice(0, 24), 'Failed login attempt'); throw httpErr(401, 'Invalid username or password.'); }
      if (u.locked) throw httpErr(403, 'This account has been locked by the admin.');
      clearFails(); u.lastLogin = u.lastActive = Date.now(); u.logins = (u.logins || 0) + 1; log('auth', u.username, 'Signed in');
      return { token: await newSession(u), user: pub(u), state: u.state };
    }
    if (p === '/api/admin/login' && m === 'POST') {
      if (limited()) throw httpErr(429, 'Too many attempts. Try again in a few minutes.');
      if (!(await checkPw(body.passcode || '', db.config.adminPass))) { noteFail(); log('admin', '', 'Failed admin passcode attempt'); throw httpErr(401, 'Access denied.'); }
      clearFails(); const tk = rnd(32); adminTokens.set(tk, Date.now() + 2 * 3600000); log('admin', '', 'Admin panel unlocked');
      return { token: tk };
    }
    if (p.startsWith('/api/admin/')) { if (!adminOk(h)) throw httpErr(401, 'Admin session expired.'); return await adminRoute(p, m, url, body); }

    const au = await authUser(h); if (!au) throw httpErr(401, 'Not signed in'); const u = au.user;
    if (p === '/api/state' && m === 'GET') return { user: pub(u), state: u.state };
    if (p === '/api/state' && m === 'PUT') { u.state = cleanState(body); u.lastActive = Date.now(); save(); return { ok: true, at: Date.now() }; }
    if (p === '/api/logout' && m === 'POST') { delete db.sessions[au.key]; log('auth', u.username, 'Signed out'); return { ok: true }; }
    if (p === '/api/account' && m === 'POST') {
      if (!(await checkPw(body.currentPassword || '', u))) throw httpErr(403, 'Current password is incorrect.');
      const oldName = u.username;
      if (body.newUsername && body.newUsername !== oldName) {
        if (!validUsername(body.newUsername)) throw httpErr(400, 'Username must be 2-24 characters: letters, numbers, _ . -');
        const other = findUser(body.newUsername); if (other && other !== u) throw httpErr(409, 'Username already taken.');
        delete db.users[oldName]; u.username = body.newUsername; db.users[u.username] = u;
        for (const k of Object.keys(db.sessions)) if (db.sessions[k].user === oldName) db.sessions[k].user = u.username;
        log('account', u.username, `Username changed from ${oldName}`);
      }
      if (body.newPassword) {
        if (typeof body.newPassword !== 'string' || body.newPassword.length < 6) throw httpErr(400, 'New password must be at least 6 characters.');
        Object.assign(u, await hashPw(body.newPassword));
        for (const k of Object.keys(db.sessions)) if (db.sessions[k].user === u.username && k !== au.key) delete db.sessions[k];
        log('account', u.username, 'Password changed');
      }
      save(); return { ok: true, user: pub(u) };
    }
    if (p === '/api/account' && m === 'DELETE') {
      if (!(await checkPw(body.password || '', u))) throw httpErr(403, 'Password is incorrect.');
      killSessions(u.username); delete db.users[u.username]; log('account', u.username, 'Account deleted by user'); return { ok: true };
    }
    throw httpErr(404, 'Not found');
  }

  async function adminRoute(p, m, url, body) {
    let a, b, c; try { [a, b, c] = p.split('/').filter(Boolean).slice(2).map(decodeURIComponent); } catch { throw httpErr(400, 'Bad request'); }
    if (a === 'overview' && m === 'GET') {
      const us = Object.values(db.users).map(userStats), signups = [];
      for (let i = 13; i >= 0; i--) { const key = new Date(Date.now() - i * DAY).toISOString().slice(0, 10); signups.push({ date: key, count: Object.values(db.users).filter(x => new Date(x.created).toISOString().slice(0, 10) === key).length }); }
      const logCounts = {}; for (const l of db.logs) logCounts[l.type] = (logCounts[l.type] || 0) + 1;
      return { uptimeSec: Math.floor((Date.now() - START) / 1000), users: us.length, tasks: us.reduce((s, x) => s + x.tasks, 0), completed: us.reduce((s, x) => s + x.done, 0), focusHrs: +us.reduce((s, x) => s + x.focusHrs, 0).toFixed(1), sessions: Object.keys(db.sessions).length, locked: us.filter(x => x.locked).length, active24h: us.filter(x => Date.now() - x.lastActive < DAY).length, dbBytes: strBytes(JSON.stringify(db)), signups, logCounts, node: 'In-browser storage', backups: listBackups().length, registrationOpen: db.config.registrationOpen, maxUsers: db.config.maxUsers };
    }
    if (a === 'users' && !b && m === 'GET') return { users: Object.values(db.users).map(userStats) };
    if (a === 'users' && b) {
      const u = Object.prototype.hasOwnProperty.call(db.users, b) ? db.users[b] : null; if (!u) throw httpErr(404, 'User not found');
      if (!c && m === 'GET') {
        const s = u.state || {}, tasks = (Array.isArray(s.tasks) ? s.tasks : []).slice().sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 15).map(t => ({ title: t.title, date: t.date, status: t.status, category: t.category }));
        return { stats: userStats(u), recent: tasks, categories: s.categories || [], sessions: Object.values(db.sessions).filter(x => x.user === u.username).length };
      }
      if (c === 'reset' && m === 'POST') { const tmp = rnd(5); Object.assign(u, await hashPw(tmp)); killSessions(u.username); log('admin', u.username, 'Password reset by admin'); return { tempPassword: tmp }; }
      if (c === 'lock' && m === 'POST') { u.locked = !!body.locked; if (u.locked) killSessions(u.username); log('admin', u.username, u.locked ? 'Account locked' : 'Account unlocked'); save(); return { ok: true, locked: u.locked }; }
      if (c === 'export' && m === 'GET') return { user: pub(u), state: u.state };
      if (!c && m === 'DELETE') { killSessions(u.username); delete db.users[u.username]; log('admin', b, 'User deleted by admin'); return { ok: true }; }
    }
    if (a === 'logs' && m === 'GET') {
      const type = url.searchParams.get('type') || '', q = (url.searchParams.get('q') || '').toLowerCase(), lim = Math.min(+url.searchParams.get('limit') || 200, 1000);
      return { logs: db.logs.filter(l => (!type || l.type === type) && (!q || (l.msg + ' ' + l.user).toLowerCase().includes(q))).slice(0, lim), total: db.logs.length };
    }
    if (a === 'logs' && m === 'DELETE') { db.logs = []; log('admin', '', 'Activity log cleared'); return { ok: true }; }
    if (a === 'sessions' && !b && m === 'GET') return { sessions: Object.entries(db.sessions).map(([id, s]) => ({ id: id.slice(0, 16), user: s.user, created: s.created, last: s.last, expires: s.expires, ua: s.ua, ip: s.ip })).sort((x, y) => y.last - x.last) };
    if (a === 'sessions' && !b && m === 'DELETE') { const n = Object.keys(db.sessions).length; db.sessions = Object.create(null); log('admin', '', `All ${n} sessions revoked`); return { ok: true, revoked: n }; }
    if (a === 'sessions' && b && m === 'DELETE') { const key = Object.keys(db.sessions).find(k => k.startsWith(b)); if (!key) throw httpErr(404, 'Session not found'); log('admin', db.sessions[key].user, 'Session revoked'); delete db.sessions[key]; save(); return { ok: true }; }
    if (a === 'config' && m === 'GET') return { registrationOpen: db.config.registrationOpen, maxUsers: db.config.maxUsers, announcement: db.config.announcement };
    if (a === 'config' && m === 'POST') {
      const cfg = db.config, changes = [];
      if (typeof body.registrationOpen === 'boolean' && body.registrationOpen !== cfg.registrationOpen) { cfg.registrationOpen = body.registrationOpen; changes.push('registration ' + (cfg.registrationOpen ? 'opened' : 'closed')); }
      if (body.maxUsers !== undefined) { const n = Math.max(0, Math.min(10000, parseInt(body.maxUsers, 10) || 0)); if (n !== cfg.maxUsers) { cfg.maxUsers = n; changes.push('user cap set to ' + (n || 'unlimited')); } }
      if (body.sitePassword) { if (String(body.sitePassword).length < 4) throw httpErr(400, 'Site password must be at least 4 characters.'); cfg.sitePass = await hashPw(body.sitePassword); changes.push('site password changed'); }
      if (body.adminPasscode) { if (String(body.adminPasscode).length < 6) throw httpErr(400, 'Admin passcode must be at least 6 characters.'); cfg.adminPass = await hashPw(body.adminPasscode); changes.push('admin passcode changed'); }
      if (body.announcement && typeof body.announcement === 'object') {
        const an = body.announcement, cur = cfg.announcement, text = String(an.text || '').slice(0, 280), level = ['info', 'warn', 'success'].includes(an.level) ? an.level : 'info', active = !!an.active && !!text;
        if (text !== cur.text || level !== cur.level || active !== cur.active) { cfg.announcement = { id: cur.id + 1, text, level, active }; changes.push(active ? 'announcement published' : 'announcement hidden'); }
      }
      if (changes.length) log('admin', '', 'Config: ' + changes.join(', ')); save(); return { ok: true, changes };
    }
    if (a === 'backups' && !b && m === 'GET') return { backups: listBackups() };
    if (a === 'backups' && !b && m === 'POST') { const name = makeBackup(); log('admin', '', 'Backup created: ' + name); return { name }; }
    if (a === 'backups' && b) {
      const all = backups(); if (!all[b]) throw httpErr(404, 'Backup not found');
      if (!c && m === 'GET') return { __raw: all[b].data };
      if (c === 'restore' && m === 'POST') {
        let parsed; try { parsed = JSON.parse(all[b].data); } catch { throw httpErr(400, 'Backup file is corrupt'); }
        const pre = makeBackup('pre-restore'); db = await normalize(parsed); saveNow(); log('admin', '', `Database restored from ${b} (previous state saved as ${pre})`); return { ok: true, pre };
      }
      if (!c && m === 'DELETE') { delete all[b]; localStorage.setItem(BK_KEY, JSON.stringify(all)); log('admin', '', 'Backup deleted: ' + b); return { ok: true }; }
    }
    if (a === 'export' && m === 'GET') return { exportedAt: new Date().toISOString(), users: Object.values(db.users).map(u => ({ username: u.username, created: u.created, lastLogin: u.lastLogin, locked: !!u.locked, state: u.state })) };
    if (a === 'nuke' && m === 'POST') {
      if (body.confirm !== 'CONFIRM_NUKE_ALL') throw httpErr(400, 'Invalid confirmation code.');
      const pre = makeBackup('pre-nuke'), n = Object.keys(db.users).length;
      db.users = Object.create(null); db.sessions = Object.create(null); log('admin', '', `DATABASE WIPE: ${n} users removed (backup ${pre})`); saveNow();
      return { ok: true, removed: n, backup: pre };
    }
    throw httpErr(404, 'Not found');
  }

  /* fetch()-compatible entry point */
  async function lfetch(url, opts = {}) {
    await init();
    const u = new URL(url, 'http://local'), h = {};
    for (const [k, v] of Object.entries(opts.headers || {})) h[k] === undefined && (h[k] = v);
    let body = {}; if (opts.body) { try { body = JSON.parse(opts.body) || {}; } catch { return new Response('{"error":"Invalid JSON"}', { status: 400 }); } }
    try {
      const out = await route((opts.method || 'GET').toUpperCase(), u, body, h);
      if (out && out.__raw !== undefined) return new Response(out.__raw, { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      if (e && e.status) return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { 'Content-Type': 'application/json' } });
      console.error(e); return new Response('{"error":"Storage error"}', { status: 500 });
    }
  }
  function putStateSync(name, state) { if (!db || !Object.prototype.hasOwnProperty.call(db.users, name)) return; db.users[name].state = cleanState(state); db.users[name].lastActive = Date.now(); saveNow(); }
  return { fetch: lfetch, init, putStateSync };
})();
