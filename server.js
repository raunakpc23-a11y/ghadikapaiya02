'use strict';
/*
 * Ghadi Ka Pahiya — backend
 * Zero dependencies. Run:  node server.js
 * Env: PORT, HOST, DATA_DIR, ADMIN_PASSCODE, SITE_PASSWORD
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const START = Date.now();
const DAY = 86400000;
fs.mkdirSync(BACKUP_DIR, { recursive: true });

/* ---------------- crypto helpers ---------------- */
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt, hash: crypto.scryptSync(String(pw), salt, 64).toString('hex')
});
const checkPw = (pw, rec) => {
  try {
    if (!rec || !rec.salt || !rec.hash) return false;
    const a = crypto.scryptSync(String(pw), rec.salt, 64);
    const b = Buffer.from(rec.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
};
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const token = () => crypto.randomBytes(32).toString('hex');

/* ---------------- database ---------------- */
function freshDb() {
  return {
    v: 1, users: {}, sessions: {}, logs: [],
    config: { registrationOpen: true, maxUsers: 0, announcement: { id: 0, text: '', level: 'info', active: false } }
  };
}
function normalizeDb(d) {
  const f = freshDb();
  d = d && typeof d === 'object' ? d : f;
  d.users = Object.assign(Object.create(null), d.users || {});
  d.sessions = Object.assign(Object.create(null), d.sessions || {});
  d.logs = Array.isArray(d.logs) ? d.logs : [];
  d.config = Object.assign(f.config, d.config || {});
  d.config.announcement = Object.assign(f.config.announcement, d.config.announcement || {});
  if (!d.config.sitePass || process.env.SITE_PASSWORD) d.config.sitePass = hashPw(process.env.SITE_PASSWORD || 'bhootnath');
  if (!d.config.adminPass || process.env.ADMIN_PASSCODE) d.config.adminPass = hashPw(process.env.ADMIN_PASSCODE || 'Project3Clock');
  return d;
}
let db;
try { db = normalizeDb(JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch { db = normalizeDb(freshDb()); }

let saveTimer = null;
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}
function save() { if (!saveTimer) saveTimer = setTimeout(saveNow, 300); }
saveNow();
['SIGINT', 'SIGTERM'].forEach(s => process.on(s, () => { try { saveNow(); } catch {} process.exit(0); }));

function log(type, user, msg) {
  db.logs.unshift({ t: Date.now(), type, user: user || '', msg });
  if (db.logs.length > 1000) db.logs.length = 1000;
  save();
}

/* ---------------- small utils ---------------- */
const RESERVED = ['__proto__', 'constructor', 'prototype'];
const validUsername = n => typeof n === 'string' && /^[A-Za-z0-9_.-]{2,24}$/.test(n) && !RESERVED.includes(n);
const findUser = name => {
  if (typeof name !== 'string') return null;
  const low = name.toLowerCase();
  for (const k of Object.keys(db.users)) if (k.toLowerCase() === low) return db.users[k];
  return null;
};
const httpErr = (status, message) => Object.assign(new Error(message), { status });

function send(res, code, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, Object.assign({
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  }, headers));
  res.end(body);
}
function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(httpErr(413, 'Payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); }
      catch { reject(httpErr(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/* ---------------- rate limiting ---------------- */
const fails = new Map();
const limited = ip => { const f = fails.get(ip); return !!f && f.n >= 8 && Date.now() - f.t < 600000; };
const noteFail = ip => { const f = fails.get(ip); if (!f || Date.now() - f.t > 600000) fails.set(ip, { n: 1, t: Date.now() }); else f.n++; };
const clearFails = ip => fails.delete(ip);
setInterval(() => { const n = Date.now(); for (const [k, v] of fails) if (n - v.t > 600000) fails.delete(k); }, 300000).unref();

/* ---------------- sessions ---------------- */
function newSession(user, req) {
  const tk = token();
  db.sessions[sha(tk)] = {
    user: user.username, created: Date.now(), last: Date.now(), expires: Date.now() + 30 * DAY,
    ua: String(req.headers['user-agent'] || '').slice(0, 120), ip: req.socket.remoteAddress || ''
  };
  save();
  return tk;
}
function authUser(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const key = sha(m[1]);
  const s = db.sessions[key];
  if (!s) return null;
  if (s.expires < Date.now()) { delete db.sessions[key]; save(); return null; }
  const user = Object.prototype.hasOwnProperty.call(db.users, s.user) ? db.users[s.user] : null;
  if (!user || user.locked) return null;
  s.last = Date.now();
  return { user, key, tk: m[1] };
}
function killSessions(username) { for (const k of Object.keys(db.sessions)) if (db.sessions[k].user === username) delete db.sessions[k]; save(); }
setInterval(() => { const n = Date.now(); for (const k of Object.keys(db.sessions)) if (db.sessions[k].expires < n) delete db.sessions[k]; for (const [k, v] of adminTokens) if (v < n) adminTokens.delete(k); save(); }, 3600000).unref();

const adminTokens = new Map();
const adminOk = req => { const t = req.headers['x-admin-token']; const e = t && adminTokens.get(String(t)); return !!e && e > Date.now(); };

/* ---------------- state validation ---------------- */
const STATE_KEYS = ['tasks', 'categories', 'catColors', 'catWeights', 'syllabus', 'syllabusMeta', 'customChapters', 'focusLog', 'game', 'prefs'];
function cleanState(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.tasks)) throw httpErr(400, 'Invalid state');
  if (b.tasks.length > 30000) throw httpErr(400, 'Too many tasks');
  const out = {};
  for (const k of STATE_KEYS) if (b[k] !== undefined) out[k] = b[k];
  if (!Array.isArray(out.categories)) out.categories = [];
  return out;
}
function userStats(u) {
  const s = u.state || {};
  const tasks = Array.isArray(s.tasks) ? s.tasks : [];
  let focus = 0, done = 0;
  for (const t of tasks) { if (t && t.status === 'Completed') done++; focus += +(t && t.focusSec) || 0; }
  focus += +(s.game && s.game.freeSec) || 0;
  return {
    username: u.username, created: u.created, lastLogin: u.lastLogin || 0, lastActive: u.lastActive || 0,
    locked: !!u.locked, logins: u.logins || 0, tasks: tasks.length, done,
    focusHrs: +(focus / 3600).toFixed(2), xp: (s.game && +s.game.xp) || 0,
    bytes: Buffer.byteLength(JSON.stringify(s))
  };
}
const pub = u => ({ username: u.username, created: u.created });

/* ---------------- backups ---------------- */
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
function makeBackup(prefix = 'backup') {
  saveNow();
  const name = `${prefix}-${stamp()}.json`;
  fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, name));
  return name;
}
const backupName = n => /^[\w.-]+\.json$/.test(n) && !n.includes('..');
function listBackups() {
  return fs.readdirSync(BACKUP_DIR).filter(backupName).map(n => {
    const st = fs.statSync(path.join(BACKUP_DIR, n));
    return { name: n, size: st.size, time: st.mtimeMs };
  }).sort((a, b) => b.time - a.time);
}

/* ---------------- static files ---------------- */
const STATIC = {
  '/localdb.js': 'localdb.js',
  '/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css', '/script.js': 'script.js',
  '/analytics.js': 'analytics.js', '/admin.js': 'admin.js'
};
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:* http://127.0.0.1:*; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
function serveStatic(req, res, p) {
  const f = STATIC[p];
  if (!f || (req.method !== 'GET' && req.method !== 'HEAD')) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(ROOT, f), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(f)], 'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': CSP
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

/* ---------------- routes ---------------- */
async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname, m = req.method, ip = req.socket.remoteAddress || '?';
  if (!p.startsWith('/api/')) return serveStatic(req, res, p);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (m === 'OPTIONS') { res.writeHead(204); return res.end(); }

  try {
    /* ---- public ---- */
    if (p === '/api/health' && m === 'GET') {
      const a = db.config.announcement;
      return send(res, 200, {
        ok: true, registrationOpen: db.config.registrationOpen,
        announcement: a.active && a.text ? { id: a.id, text: a.text, level: a.level } : null
      });
    }

    if (p === '/api/register' && m === 'POST') {
      if (limited(ip)) throw httpErr(429, 'Too many attempts. Try again in a few minutes.');
      const b = await readBody(req, 10000);
      if (!db.config.registrationOpen) throw httpErr(403, 'Registration is currently closed.');
      if (!checkPw(b.sitePassword || '', db.config.sitePass)) { noteFail(ip); log('auth', b.username, 'Registration blocked: wrong site password'); throw httpErr(403, 'Invalid Site Password.'); }
      if (!validUsername(b.username)) throw httpErr(400, 'Username must be 2-24 characters: letters, numbers, _ . -');
      if (typeof b.password !== 'string' || b.password.length < 6) throw httpErr(400, 'Password must be at least 6 characters.');
      if (findUser(b.username)) throw httpErr(409, 'Username already exists.');
      const cap = +db.config.maxUsers || 0;
      if (cap && Object.keys(db.users).length >= cap) throw httpErr(403, 'User limit reached. Ask the admin for a slot.');
      const pw = hashPw(b.password);
      const u = db.users[b.username] = { username: b.username, salt: pw.salt, hash: pw.hash, created: Date.now(), lastLogin: Date.now(), lastActive: Date.now(), logins: 1, locked: false, state: null };
      clearFails(ip);
      log('auth', u.username, 'User registered');
      return send(res, 200, { token: newSession(u, req), user: pub(u), state: null });
    }

    if (p === '/api/login' && m === 'POST') {
      if (limited(ip)) throw httpErr(429, 'Too many attempts. Try again in a few minutes.');
      const b = await readBody(req, 10000);
      const u = findUser(b.username);
      if (!u || !checkPw(b.password || '', u)) { noteFail(ip); log('auth', String(b.username || '').slice(0, 24), 'Failed login attempt'); throw httpErr(401, 'Invalid username or password.'); }
      if (u.locked) throw httpErr(403, 'This account has been locked by the admin.');
      clearFails(ip);
      u.lastLogin = u.lastActive = Date.now(); u.logins = (u.logins || 0) + 1;
      log('auth', u.username, 'Signed in');
      return send(res, 200, { token: newSession(u, req), user: pub(u), state: u.state });
    }

    if (p === '/api/admin/login' && m === 'POST') {
      if (limited(ip)) throw httpErr(429, 'Too many attempts. Try again in a few minutes.');
      const b = await readBody(req, 5000);
      if (!checkPw(b.passcode || '', db.config.adminPass)) { noteFail(ip); log('admin', '', 'Failed admin passcode attempt from ' + ip); throw httpErr(401, 'Access denied.'); }
      clearFails(ip);
      const tk = token();
      adminTokens.set(tk, Date.now() + 2 * 3600000);
      log('admin', '', 'Admin panel unlocked');
      return send(res, 200, { token: tk });
    }

    /* ---- admin ---- */
    if (p.startsWith('/api/admin/')) {
      if (!adminOk(req)) throw httpErr(401, 'Admin session expired.');
      return await adminRoute(req, res, p, m, url);
    }

    /* ---- authenticated user ---- */
    const au = authUser(req);
    if (!au) throw httpErr(401, 'Not signed in');
    const u = au.user;

    if (p === '/api/state' && m === 'GET') return send(res, 200, { user: pub(u), state: u.state });
    if (p === '/api/state' && m === 'PUT') {
      u.state = cleanState(await readBody(req));
      u.lastActive = Date.now();
      save();
      return send(res, 200, { ok: true, at: Date.now() });
    }
    if (p === '/api/logout' && m === 'POST') {
      delete db.sessions[au.key]; log('auth', u.username, 'Signed out'); return send(res, 200, { ok: true });
    }
    if (p === '/api/account' && m === 'POST') {
      const b = await readBody(req, 10000);
      if (!checkPw(b.currentPassword || '', u)) throw httpErr(403, 'Current password is incorrect.');
      const oldName = u.username;
      if (b.newUsername && b.newUsername !== oldName) {
        if (!validUsername(b.newUsername)) throw httpErr(400, 'Username must be 2-24 characters: letters, numbers, _ . -');
        const other = findUser(b.newUsername);
        if (other && other !== u) throw httpErr(409, 'Username already taken.');
        delete db.users[oldName];
        u.username = b.newUsername; db.users[u.username] = u;
        for (const k of Object.keys(db.sessions)) if (db.sessions[k].user === oldName) db.sessions[k].user = u.username;
        log('account', u.username, `Username changed from ${oldName}`);
      }
      if (b.newPassword) {
        if (typeof b.newPassword !== 'string' || b.newPassword.length < 6) throw httpErr(400, 'New password must be at least 6 characters.');
        Object.assign(u, hashPw(b.newPassword));
        for (const k of Object.keys(db.sessions)) if (db.sessions[k].user === u.username && k !== au.key) delete db.sessions[k];
        log('account', u.username, 'Password changed');
      }
      save();
      return send(res, 200, { ok: true, user: pub(u) });
    }
    if (p === '/api/account' && m === 'DELETE') {
      const b = await readBody(req, 10000);
      if (!checkPw(b.password || '', u)) throw httpErr(403, 'Password is incorrect.');
      killSessions(u.username); delete db.users[u.username];
      log('account', u.username, 'Account deleted by user');
      return send(res, 200, { ok: true });
    }

    throw httpErr(404, 'Not found');
  } catch (e) {
    if (e && e.status) return send(res, e.status, { error: e.message });
    console.error(e);
    return send(res, 500, { error: 'Server error' });
  }
}

async function adminRoute(req, res, p, m, url) {
  const parts = p.split('/').filter(Boolean).slice(2); // after api/admin
  let a, b, c; try { [a, b, c] = parts.map(decodeURIComponent); } catch { return send(res, 400, { error: "Bad request" }); }

  if (a === 'overview' && m === 'GET') {
    const us = Object.values(db.users).map(userStats);
    const signups = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY); const key = d.toISOString().slice(0, 10);
      signups.push({ date: key, count: Object.values(db.users).filter(x => new Date(x.created).toISOString().slice(0, 10) === key).length });
    }
    const logCounts = {};
    for (const l of db.logs) logCounts[l.type] = (logCounts[l.type] || 0) + 1;
    let dbBytes = 0; try { dbBytes = fs.statSync(DB_FILE).size; } catch {}
    return send(res, 200, {
      uptimeSec: Math.floor((Date.now() - START) / 1000), users: us.length,
      tasks: us.reduce((s, x) => s + x.tasks, 0), completed: us.reduce((s, x) => s + x.done, 0),
      focusHrs: +us.reduce((s, x) => s + x.focusHrs, 0).toFixed(1),
      sessions: Object.keys(db.sessions).length, locked: us.filter(x => x.locked).length,
      active24h: us.filter(x => Date.now() - x.lastActive < DAY).length,
      dbBytes, signups, logCounts, node: process.version, backups: listBackups().length,
      registrationOpen: db.config.registrationOpen, maxUsers: db.config.maxUsers
    });
  }

  if (a === 'users' && !b && m === 'GET') return send(res, 200, { users: Object.values(db.users).map(userStats) });

  if (a === 'users' && b) {
    const u = Object.prototype.hasOwnProperty.call(db.users, b) ? db.users[b] : null;
    if (!u) throw httpErr(404, 'User not found');
    if (!c && m === 'GET') {
      const s = u.state || {};
      const tasks = (Array.isArray(s.tasks) ? s.tasks : []).slice().sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 15)
        .map(t => ({ title: t.title, date: t.date, status: t.status, category: t.category }));
      return send(res, 200, { stats: userStats(u), recent: tasks, categories: s.categories || [], sessions: Object.values(db.sessions).filter(x => x.user === u.username).length });
    }
    if (c === 'reset' && m === 'POST') {
      const tmp = crypto.randomBytes(5).toString('hex');
      Object.assign(u, hashPw(tmp)); killSessions(u.username);
      log('admin', u.username, 'Password reset by admin');
      return send(res, 200, { tempPassword: tmp });
    }
    if (c === 'lock' && m === 'POST') {
      const body = await readBody(req, 1000);
      u.locked = !!body.locked; if (u.locked) killSessions(u.username);
      log('admin', u.username, u.locked ? 'Account locked' : 'Account unlocked');
      return send(res, 200, { ok: true, locked: u.locked });
    }
    if (c === 'export' && m === 'GET') return send(res, 200, { user: pub(u), state: u.state });
    if (!c && m === 'DELETE') {
      killSessions(u.username); delete db.users[u.username];
      log('admin', b, 'User deleted by admin');
      return send(res, 200, { ok: true });
    }
  }

  if (a === 'logs' && m === 'GET') {
    const type = url.searchParams.get('type') || '', q = (url.searchParams.get('q') || '').toLowerCase();
    const lim = Math.min(+url.searchParams.get('limit') || 200, 1000);
    const logs = db.logs.filter(l => (!type || l.type === type) && (!q || (l.msg + ' ' + l.user).toLowerCase().includes(q))).slice(0, lim);
    return send(res, 200, { logs, total: db.logs.length });
  }
  if (a === 'logs' && m === 'DELETE') { db.logs = []; log('admin', '', 'Activity log cleared'); return send(res, 200, { ok: true }); }

  if (a === 'sessions' && !b && m === 'GET') {
    const list = Object.entries(db.sessions).map(([id, s]) => ({ id: id.slice(0, 16), user: s.user, created: s.created, last: s.last, expires: s.expires, ua: s.ua, ip: s.ip }));
    return send(res, 200, { sessions: list.sort((x, y) => y.last - x.last) });
  }
  if (a === 'sessions' && !b && m === 'DELETE') { const n = Object.keys(db.sessions).length; db.sessions = Object.create(null); log('admin', '', `All ${n} sessions revoked`); return send(res, 200, { ok: true, revoked: n }); }
  if (a === 'sessions' && b && m === 'DELETE') {
    const key = Object.keys(db.sessions).find(k => k.startsWith(b));
    if (!key) throw httpErr(404, 'Session not found');
    log('admin', db.sessions[key].user, 'Session revoked'); delete db.sessions[key]; save();
    return send(res, 200, { ok: true });
  }

  if (a === 'config' && m === 'GET') {
    return send(res, 200, { registrationOpen: db.config.registrationOpen, maxUsers: db.config.maxUsers, announcement: db.config.announcement });
  }
  if (a === 'config' && m === 'POST') {
    const body = await readBody(req, 10000);
    const cfg = db.config; const changes = [];
    if (typeof body.registrationOpen === 'boolean' && body.registrationOpen !== cfg.registrationOpen) { cfg.registrationOpen = body.registrationOpen; changes.push('registration ' + (cfg.registrationOpen ? 'opened' : 'closed')); }
    if (body.maxUsers !== undefined) { const n = Math.max(0, Math.min(10000, parseInt(body.maxUsers, 10) || 0)); if (n !== cfg.maxUsers) { cfg.maxUsers = n; changes.push('user cap set to ' + (n || 'unlimited')); } }
    if (body.sitePassword) {
      if (String(body.sitePassword).length < 4) throw httpErr(400, 'Site password must be at least 4 characters.');
      cfg.sitePass = hashPw(body.sitePassword); changes.push('site password changed');
    }
    if (body.adminPasscode) {
      if (String(body.adminPasscode).length < 6) throw httpErr(400, 'Admin passcode must be at least 6 characters.');
      cfg.adminPass = hashPw(body.adminPasscode); changes.push('admin passcode changed');
    }
    if (body.announcement && typeof body.announcement === 'object') {
      const an = body.announcement, cur = cfg.announcement;
      const text = String(an.text || '').slice(0, 280);
      const level = ['info', 'warn', 'success'].includes(an.level) ? an.level : 'info';
      const active = !!an.active && !!text;
      if (text !== cur.text || level !== cur.level || active !== cur.active) { cfg.announcement = { id: cur.id + 1, text, level, active }; changes.push(active ? 'announcement published' : 'announcement hidden'); }
    }
    if (changes.length) log('admin', '', 'Config: ' + changes.join(', '));
    save();
    return send(res, 200, { ok: true, changes });
  }

  if (a === 'backups' && !b && m === 'GET') return send(res, 200, { backups: listBackups() });
  if (a === 'backups' && !b && m === 'POST') { const name = makeBackup(); log('admin', '', 'Backup created: ' + name); return send(res, 200, { name }); }
  if (a === 'backups' && b) {
    if (!backupName(b)) throw httpErr(400, 'Bad backup name');
    const file = path.join(BACKUP_DIR, b);
    if (!fs.existsSync(file)) throw httpErr(404, 'Backup not found');
    if (!c && m === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${b}"`, 'Cache-Control': 'no-store' }); return res.end(fs.readFileSync(file)); }
    if (c === 'restore' && m === 'POST') {
      let parsed; try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw httpErr(400, 'Backup file is corrupt'); }
      const pre = makeBackup('pre-restore');
      db = normalizeDb(parsed); saveNow();
      log('admin', '', `Database restored from ${b} (previous state saved as ${pre})`);
      return send(res, 200, { ok: true, pre });
    }
    if (!c && m === 'DELETE') { fs.unlinkSync(file); log('admin', '', 'Backup deleted: ' + b); return send(res, 200, { ok: true }); }
  }

  if (a === 'export' && m === 'GET') {
    const users = Object.values(db.users).map(u => ({ username: u.username, created: u.created, lastLogin: u.lastLogin, locked: !!u.locked, state: u.state }));
    return send(res, 200, { exportedAt: new Date().toISOString(), users });
  }

  if (a === 'nuke' && m === 'POST') {
    const body = await readBody(req, 1000);
    if (body.confirm !== 'CONFIRM_NUKE_ALL') throw httpErr(400, 'Invalid confirmation code.');
    const pre = makeBackup('pre-nuke');
    const n = Object.keys(db.users).length;
    db.users = Object.create(null); db.sessions = Object.create(null);
    log('admin', '', `DATABASE WIPE: ${n} users removed (backup ${pre})`);
    saveNow();
    return send(res, 200, { ok: true, removed: n, backup: pre });
  }

  throw httpErr(404, 'Not found');
}

const server = http.createServer((req, res) => { route(req, res).catch(e => { console.error(e); try { send(res, 500, { error: 'Server error' }); } catch {} }); });
server.listen(PORT, HOST, () => {
  console.log(`Ghadi Ka Pahiya running on http://localhost:${PORT}`);
  console.log(`Data stored in ${DATA_DIR}`);
});
