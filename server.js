// server.js - optional sync server for Rectilinear Redundancies (no dependencies).
// Run:  ADMIN_TOKEN=secret SITE_KEY=optional PORT=8787 node server.js
// Then set window.SYNC_CONFIG = { endpoint: "https://your-host", siteKey: "optional" } in config.js
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +process.env.PORT || 8787, ADMIN_TOKEN = process.env.ADMIN_TOKEN || '', SITE_KEY = process.env.SITE_KEY || '', ORIGIN = process.env.ALLOW_ORIGIN || '*';
const FILE = path.join(__dirname, 'data.json');
if (!ADMIN_TOKEN) { console.error('ADMIN_TOKEN env var is required.'); process.exit(1); }

let users = {};
try { users = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { users = {}; }
let timer = null;
const save = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(users), () => {}), 500); };

const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const num = (v, max = 1e7) => { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; };
const str = (v, n = 60) => String(v == null ? '' : v).slice(0, n);

function clean(b) {
  const uid = str(b.uid, 64).replace(/[^\w-]/g, '');
  if (!uid) return null;
  const subjects = {}; if (b.subjects && typeof b.subjects === 'object') Object.keys(b.subjects).slice(0, 8).forEach(k => { subjects[str(k, 20)] = num(b.subjects[k], 1e5); });
  const daily = {}; if (b.daily && typeof b.daily === 'object') Object.keys(b.daily).slice(-30).forEach(k => { daily[str(k, 12)] = num(b.daily[k], 1440); });
  const syl = {}; if (b.syl && typeof b.syl === 'object') Object.keys(b.syl).slice(0, 5).forEach(k => { syl[str(k, 20)] = num(b.syl[k], 100); });
  return {
    v: 1, uid, user: str(b.user, 40) || 'unknown', device: str(b.device, 80),
    todayMin: num(b.todayMin, 1440), totalMin: num(b.totalMin), streak: num(b.streak, 10000), best: num(b.best, 10000),
    sessions: num(b.sessions), lecWatched: num(b.lecWatched), filesOpened: num(b.filesOpened), subjects, daily, syl, lastSeen: Date.now()
  };
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'content-type,x-site-key,x-admin-token', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' });
  res.end(JSON.stringify(obj));
}
const adminOk = req => safeEq(req.headers['x-admin-token'] || '', ADMIN_TOKEN);

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = (req.url || '').split('?')[0];
  if (req.method === 'POST' && url === '/api/sync') {
    if (SITE_KEY && !safeEq(req.headers['x-site-key'] || '', SITE_KEY)) return send(res, 401, { error: 'bad key' });
    let size = 0, chunks = [];
    req.on('data', c => { size += c.length; if (size > 50 * 1024) { send(res, 413, { error: 'too large' }); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (res.writableEnded) return;
      let b; try { b = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) { return send(res, 400, { error: 'bad json' }); }
      const u = clean(b || {}); if (!u) return send(res, 400, { error: 'bad uid' });
      if (Object.keys(users).length >= 5000 && !users[u.uid]) return send(res, 507, { error: 'full' });
      users[u.uid] = u; save(); send(res, 200, { ok: true });
    });
    return;
  }
  if (url === '/api/users' && req.method === 'GET') {
    if (!adminOk(req)) return send(res, 401, { error: 'unauthorized' });
    return send(res, 200, Object.values(users).sort((a, b) => b.lastSeen - a.lastSeen));
  }
  const m = url.match(/^\/api\/users\/([\w-]+)$/);
  if (m && req.method === 'DELETE') {
    if (!adminOk(req)) return send(res, 401, { error: 'unauthorized' });
    delete users[m[1]]; save(); return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log('Sync server on :' + PORT));
