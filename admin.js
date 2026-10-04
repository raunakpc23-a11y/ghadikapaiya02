'use strict';
/* =====================================================================
   Admin panel — unlocked by tapping the logo 5 times, talks to /api/admin/*
   ===================================================================== */

const A = { token: sessionStorage.getItem(ADMIN_KEY) || '', tab: 'overview', req: 0, users: [], userQ: '', sort: 'lastActive', dir: -1, logType: '', logQ: '' };
const ATABS = [['overview', 'Overview', 'activity'], ['users', 'Users', 'users'], ['activity', 'Activity', 'clock'], ['sessions', 'Sessions', 'key'], ['system', 'System', 'server'], ['backups', 'Backups', 'database']];
const aApi = (m, u, b, o = {}) => api(m, u, b, { admin: true, ...o });
const fmtBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const fmtUp = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };
const fmtStamp = ts => ts ? new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ---------- unlock flow ---------- */
function openAdminAuth() {
  if (session.mode !== 'server') {
    return void showModal(`<div class="dlg"><h3>Backend offline</h3><p>The admin panel needs the Node backend. Start it with <code>node server.js</code> and reload.</p><div class="dlg-actions"><button class="btn btn-primary" data-act="close-modal">OK</button></div></div>`, { cls: 'small' });
  }
  if (A.token) return switchView('admin');
  showModal(`<div class="admin-gate"><div class="gate-icon">${icon('shield')}</div><h3>Admin Override</h3><p class="muted">Enter the developer passcode.</p>
    <form data-form="admin-auth"><input class="inp gate-input" id="admin-pass" type="password" autocomplete="off" autofocus placeholder="••••••••">
    <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="close-modal">Abort</button><button class="btn btn-primary">Authenticate</button></div></form></div>`, { cls: 'small admin-modal' });
}
async function submitAdminAuth() {
  const inp = $('#admin-pass'), bd = inp.closest('.modal-bd');
  try {
    const t0 = performance.now();
    const r = await api('POST', '/api/admin/login', { passcode: inp.value }, { noAuth: true });
    A.token = r.token; sessionStorage.setItem(ADMIN_KEY, A.token);
    bd.close(); await adminBoot(performance.now() - t0);
  } catch (e) {
    inp.value = ''; const m = inp.closest('.modal'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
    toast(e.message === 'Access denied.' ? 'ACCESS DENIED' : e.message, 'error'); sfx('error');
  }
}
async function adminBoot(ms) {
  const ov = document.createElement('div'); ov.className = 'boot'; document.body.appendChild(ov);
  const lines = [];
  const say = txt => new Promise(res => { lines.push(txt); ov.innerHTML = `<pre>${lines.map(esc).join('\n')}<span class="cursor">█</span></pre>`; setTimeout(res, motionOn() ? 260 : 0); });
  await say('▸ passcode verified');
  await say(`▸ secure channel open (${Math.round(ms)} ms)`);
  try {
    const t0 = performance.now(), o = await aApi('GET', '/api/admin/overview');
    await say(`▸ api latency ${Math.round(performance.now() - t0)} ms`);
    await say(`▸ ${o.users} users · ${o.tasks} tasks · ${o.sessions} live sessions`);
    await say(`▸ database ${fmtBytes(o.dbBytes)} · node ${o.node}`);
  } catch { await say('▸ warning: could not read overview'); }
  await say('▸ ACCESS GRANTED');
  ov.classList.add('out'); setTimeout(() => ov.remove(), 500);
  $('.admin-nav').classList.remove('hidden'); toast('Admin mode unlocked', 'success');
  switchView('admin');
}
function adminExpired() {
  if (!A.token) return;
  A.token = ''; sessionStorage.removeItem(ADMIN_KEY);
  const n = $('.admin-nav'); if (n) n.classList.add('hidden');
  toast('Admin session expired.', 'warn');
  if (ui.view === 'admin') switchView('calendar');
}
function adminLock() {
  A.token = ''; sessionStorage.removeItem(ADMIN_KEY); $('.admin-nav').classList.add('hidden'); switchView('calendar'); toast('Admin panel locked');
}

/* ---------- frame & tabs ---------- */
function adminFrame(body) {
  return `<div class="admin-scope">
    <div class="a-head"><div><span class="a-badge">${icon('shield')} ADMIN OVERRIDE</span><h2>Control Room</h2></div><button class="btn btn-ghost" data-act="a-lock">${icon('lock')} Lock panel</button></div>
    <div class="seg a-tabs">${ATABS.map(([id, l, ic]) => `<button class="${A.tab === id ? 'on' : ''}" data-act="a-tab" data-v="${id}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>
    <div class="a-body" id="a-body">${body}</div></div>`;
}
async function renderAdmin() {
  const el = $('#view-admin'), id = ++A.req;
  if (!$('#a-body', el)) el.innerHTML = adminFrame('<div class="a-loading">Loading…</div>');
  else { $$('.a-tabs button', el).forEach(b => b.classList.toggle('on', b.dataset.v === A.tab)); }
  try {
    const html = await ({ overview: tabOverview, users: tabUsers, activity: tabActivity, sessions: tabSessions, system: tabSystem, backups: tabBackups })[A.tab]();
    if (id !== A.req) return;
    $('#a-body', el).innerHTML = html;
    if (A.tab === 'users') renderUserTable();
    if (A.tab === 'activity') renderLogList();
  } catch (e) {
    if (id !== A.req) return;
    $('#a-body', el).innerHTML = `<div class="note warn">${icon('alert')}<span>${esc(e.message)}</span></div>`;
  }
}
const aStat = (l, v, s = '') => `<div class="card stat"><small>${l}</small><b>${v}</b><span>${s}</span></div>`;

async function tabOverview() {
  const o = await aApi('GET', '/api/admin/overview');
  const sv = o.signups.map(s => s.count), sl = o.signups.map(s => s.date.slice(8));
  const lc = Object.entries(o.logCounts);
  return `
    <div class="stat-grid">
      ${aStat('Users', o.users, `${o.active24h} active in 24h`)}
      ${aStat('Tasks stored', o.tasks, `${o.completed} completed`)}
      ${aStat('Focus logged', o.focusHrs + 'h', 'across all users')}
      ${aStat('Live sessions', o.sessions, `${o.locked} locked account${o.locked === 1 ? '' : 's'}`)}
      ${aStat('Database', fmtBytes(o.dbBytes), `${o.backups} backup${o.backups === 1 ? '' : 's'}`)}
      ${aStat('Uptime', fmtUp(o.uptimeSec), `Node ${esc(o.node)}`)}
    </div>
    <div class="grid-2">
      <div class="card sect"><h3>New sign-ups · 14 days</h3>${bars(sv, sl, { h: 120, color: 'rgb(var(--accent2))' })}</div>
      <div class="card sect"><h3>Registration</h3>
        <p class="muted">Registration is currently <b>${o.registrationOpen ? 'open' : 'closed'}</b> · cap ${o.maxUsers || 'unlimited'}.</p>
        <div class="btn-row"><button class="btn btn-ghost" data-act="a-quick-backup">${icon('database')} Backup now</button><button class="btn btn-ghost" data-act="a-tab" data-v="system">${icon('server')} System settings</button><button class="btn btn-ghost" data-act="a-refresh">${icon('reset')} Refresh</button></div>
        <h3 class="mt">Log volume</h3><div class="chip-row">${lc.length ? lc.map(([k, n]) => `<span class="chip">${esc(k)} · ${n}</span>`).join('') : '<span class="muted">No events yet</span>'}</div></div>
    </div>`;
}

/* ---------- users ---------- */
async function tabUsers() {
  A.users = (await aApi('GET', '/api/admin/users')).users;
  return `<div class="card sect"><div class="syl-tools"><label class="search">${icon('search')}<input class="inp" id="a-userq" data-input="a-userq" placeholder="Search users…" value="${esc(A.userQ)}"></label><span class="muted">${A.users.length} total</span></div>
    <div class="table-wrap"><table class="tbl"><thead><tr>${[['username', 'User'], ['created', 'Joined'], ['lastActive', 'Last active'], ['tasks', 'Tasks'], ['done', 'Done'], ['focusHrs', 'Focus'], ['xp', 'XP']].map(([k, l]) => `<th><button data-act="a-sort" data-k="${k}">${l}${A.sort === k ? (A.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}<th>Actions</th></tr></thead><tbody id="a-users"></tbody></table></div></div>`;
}
function renderUserTable() {
  const tb = $('#a-users'); if (!tb) return;
  const q = A.userQ.trim().toLowerCase(), k = A.sort;
  const rows = A.users.filter(u => !q || u.username.toLowerCase().includes(q)).sort((a, b) => (typeof a[k] === 'string' ? a[k].localeCompare(b[k]) : a[k] - b[k]) * A.dir);
  tb.innerHTML = rows.map(u => `<tr>
    <td><b>${esc(u.username)}</b> ${u.locked ? '<span class="chip warn">locked</span>' : ''}</td><td>${fmtStamp(u.created)}</td><td>${ago(u.lastActive)}</td>
    <td>${u.tasks}</td><td>${u.done}</td><td>${u.focusHrs}h</td><td>${u.xp}</td>
    <td class="t-act"><button class="icon-btn" data-act="a-view" data-u="${esc(u.username)}" title="View">${icon('eye')}</button>
      <button class="icon-btn" data-act="a-reset" data-u="${esc(u.username)}" title="Reset password">${icon('key')}</button>
      <button class="icon-btn" data-act="a-lockuser" data-u="${esc(u.username)}" data-l="${u.locked ? 0 : 1}" title="${u.locked ? 'Unlock' : 'Lock'}">${icon('lock')}</button>
      <button class="icon-btn" data-act="a-export-user" data-u="${esc(u.username)}" title="Export data">${icon('download')}</button>
      <button class="icon-btn danger" data-act="a-deluser" data-u="${esc(u.username)}" title="Delete user">${icon('trash')}</button></td></tr>`).join('') || `<tr><td colspan="8" class="muted pad">No users found.</td></tr>`;
}

/* ---------- activity ---------- */
async function tabActivity() {
  return `<div class="card sect"><div class="syl-tools"><div class="seg">${[['', 'All'], ['auth', 'Auth'], ['account', 'Account'], ['admin', 'Admin']].map(([v, l]) => `<button class="${A.logType === v ? 'on' : ''}" data-act="a-logtype" data-v="${v}">${l}</button>`).join('')}</div>
    <label class="search">${icon('search')}<input class="inp" id="a-logq" data-input="a-logq" placeholder="Filter log…" value="${esc(A.logQ)}"></label>
    <button class="btn btn-danger-soft btn-sm" data-act="a-clearlogs">Clear log</button></div><div id="a-logs" class="loglist"></div></div>`;
}
async function renderLogList() {
  const box = $('#a-logs'); if (!box) return;
  const my = ++A.req;
  try {
    const r = await aApi('GET', `/api/admin/logs?type=${encodeURIComponent(A.logType)}&q=${encodeURIComponent(A.logQ)}&limit=300`);
    if (my !== A.req && A.tab !== 'activity') return;
    const b = $('#a-logs'); if (!b) return;
    b.innerHTML = r.logs.map(l => `<div class="logrow ${esc(l.type)}"><time>${fmtStamp(l.t)}</time><span class="lt">${esc(l.type)}</span><span>${l.user ? `<b>${esc(l.user)}</b> · ` : ''}${esc(l.msg)}</span></div>`).join('') || '<p class="muted pad">No matching events.</p>';
  } catch (e) { box.innerHTML = `<p class="muted pad">${esc(e.message)}</p>`; }
}

/* ---------- sessions ---------- */
async function tabSessions() {
  const { sessions } = await aApi('GET', '/api/admin/sessions');
  return `<div class="card sect"><div class="syl-tools"><span class="muted">${sessions.length} active session${sessions.length === 1 ? '' : 's'}</span><button class="btn btn-danger-soft btn-sm" data-act="a-revoke-all">Revoke all</button></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>User</th><th>Started</th><th>Last seen</th><th>Expires</th><th>Device</th><th></th></tr></thead><tbody>
    ${sessions.map(s => `<tr><td><b>${esc(s.user)}</b></td><td>${fmtStamp(s.created)}</td><td>${ago(s.last)}</td><td>${fmtStamp(s.expires)}</td><td class="muted ua">${esc(s.ua.replace(/\(.*?\)/g, '').slice(0, 50) || s.ip)}</td><td><button class="icon-btn danger" data-act="a-revoke" data-id="${esc(s.id)}" title="Revoke">${icon('x')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted pad">No sessions.</td></tr>'}
    </tbody></table></div></div>`;
}

/* ---------- system ---------- */
async function tabSystem() {
  const c = await aApi('GET', '/api/admin/config'), an = c.announcement;
  return `<div class="grid-2">
    <div class="card sect"><h3>${icon('users')} Registration</h3>
      ${sRow('Open registration', 'Allow new accounts to be created.', `<label class="switch"><input type="checkbox" data-change="a-reg" ${c.registrationOpen ? 'checked' : ''}><span></span></label>`)}
      <form data-form="a-cap">${sRow('User cap', '0 means unlimited. Delete a user to free a slot.', `<input class="inp num" id="a-cap" type="number" min="0" max="10000" value="${c.maxUsers}"><button class="btn btn-ghost btn-sm">Save</button>`)}</form></div>
    <div class="card sect"><h3>${icon('key')} Credentials</h3>
      <form data-form="a-sitepw" class="stack-form"><label class="fld"><span>New site password</span><input class="inp" id="a-sitepw" type="password" minlength="4" autocomplete="new-password" required></label><button class="btn btn-ghost">Change site password</button></form>
      <form data-form="a-adminpw" class="stack-form"><label class="fld"><span>New admin passcode</span><input class="inp" id="a-adminpw" type="password" minlength="6" autocomplete="new-password" required></label><button class="btn btn-ghost">Change admin passcode</button></form></div>
  </div>
  <div class="card sect"><h3>${icon('megaphone')} Announcement banner</h3>
    <form data-form="a-announce" class="stack-form"><label class="fld"><span>Message shown to every visitor</span><input class="inp" id="a-an-text" maxlength="280" value="${esc(an.text)}" placeholder="e.g. Maintenance tonight at 10 PM"></label>
    <div class="grid2"><label class="fld"><span>Style</span><select class="inp" id="a-an-level">${['info', 'warn', 'success'].map(l => `<option ${an.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="check-row"><input type="checkbox" id="a-an-active" ${an.active ? 'checked' : ''}> Publish banner</label></div><div><button class="btn btn-primary">Save announcement</button></div></form></div>
  <div class="card sect nuke"><h3>${icon('alert')} Database nuke</h3><p class="muted">Deletes every user account and session. A backup is saved automatically first. Type <code>CONFIRM_NUKE_ALL</code> to arm it.</p>
    <form data-form="a-nuke" class="inline-form"><input class="inp mono" id="a-nuke" placeholder="CONFIRM_NUKE_ALL" autocomplete="off"><button class="btn btn-danger">Initiate wipe</button></form></div>`;
}

/* ---------- backups ---------- */
async function tabBackups() {
  const { backups } = await aApi('GET', '/api/admin/backups');
  return `<div class="card sect"><div class="syl-tools"><span class="muted">${backups.length} backup${backups.length === 1 ? '' : 's'} on disk</span><div class="btn-row"><button class="btn btn-primary btn-sm" data-act="a-quick-backup">${icon('plus')} New backup</button><button class="btn btn-ghost btn-sm" data-act="a-export-all">${icon('download')} Export all users</button></div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>File</th><th>Created</th><th>Size</th><th></th></tr></thead><tbody>
    ${backups.map(b => `<tr><td class="mono">${esc(b.name)}</td><td>${fmtStamp(b.time)}</td><td>${fmtBytes(b.size)}</td><td class="t-act"><button class="icon-btn" data-act="a-bk-dl" data-n="${esc(b.name)}" title="Download">${icon('download')}</button><button class="icon-btn" data-act="a-bk-restore" data-n="${esc(b.name)}" title="Restore">${icon('reset')}</button><button class="icon-btn danger" data-act="a-bk-del" data-n="${esc(b.name)}" title="Delete">${icon('trash')}</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted pad">No backups yet.</td></tr>'}
    </tbody></table></div></div>`;
}

/* ---------- actions ---------- */
const aDownload = async (url, name) => { const r = await aApi('GET', url, undefined, { raw: true }); download(await r.text(), 'application/json', name); };
const aTry = fn => async (...a) => { try { await fn(...a); } catch (e) { if (e.status !== 401) toast(e.message, 'error'); } };
const ADMIN_ACT = {
  'a-tab': el => { A.tab = el.dataset.v; renderAdmin(); },
  'a-lock': adminLock,
  'a-refresh': () => renderAdmin(),
  'a-sort': el => { const k = el.dataset.k; if (A.sort === k) A.dir *= -1; else { A.sort = k; A.dir = k === 'username' ? 1 : -1; } renderAdmin(); },
  'a-view': aTry(async el => {
    const d = await aApi('GET', `/api/admin/users/${encodeURIComponent(el.dataset.u)}`), s = d.stats;
    showModal(`<div class="modal-head"><div><h3>${esc(s.username)}</h3><p class="muted">Joined ${fmtStamp(s.created)} · last login ${ago(s.lastLogin)}</p></div><button class="icon-btn" data-act="close-modal">${icon('x')}</button></div>
      <div class="modal-body"><div class="stat-grid tight">${aStat('Tasks', s.tasks, s.done + ' done')}${aStat('Focus', s.focusHrs + 'h', 'logged')}${aStat('Level', levelOf(s.xp), s.xp + ' XP')}${aStat('Logins', s.logins, d.sessions + ' live session(s)')}</div>
      <p><b>Categories:</b> ${d.categories.map(c => `<span class="chip">${esc(c)}</span>`).join(' ') || '<span class="muted">none yet</span>'} · data size ${fmtBytes(s.bytes)}</p>
      <h4>Most recent tasks</h4><div class="loglist">${d.recent.map(t => `<div class="logrow"><time>${esc(t.date)}</time><span class="lt">${esc(t.status)}</span><span>${esc(t.title)} <span class="muted">· ${esc(t.category)}</span></span></div>`).join('') || '<p class="muted">No tasks.</p>'}</div></div>`, { wide: true, cls: 'admin-modal' });
  }),
  'a-reset': aTry(async el => {
    const u = el.dataset.u;
    if (!(await confirmDlg(`Reset password for ${u}?`, 'A temporary password is generated and all their sessions are signed out.', { ok: 'Reset', danger: true }))) return;
    const r = await aApi('POST', `/api/admin/users/${encodeURIComponent(u)}/reset`);
    const res = await dialog({ title: 'Temporary password', message: `Give this to <b>${esc(u)}</b> — it is shown only once:<br><code class="big">${esc(r.tempPassword)}</code>`, actions: [{ label: 'Copy', value: 'copy', cls: 'btn-primary' }, { label: 'Close', value: 'cancel' }] });
    if (res && res.v === 'copy') { try { await navigator.clipboard.writeText(r.tempPassword); toast('Copied', 'success'); } catch { toast('Copy failed — select the text manually', 'warn'); } }
  }),
  'a-lockuser': aTry(async el => { const lock = el.dataset.l === '1'; await aApi('POST', `/api/admin/users/${encodeURIComponent(el.dataset.u)}/lock`, { locked: lock }); toast(lock ? 'Account locked' : 'Account unlocked', 'success'); renderAdmin(); }),
  'a-export-user': aTry(async el => aDownload(`/api/admin/users/${encodeURIComponent(el.dataset.u)}/export`, `ghadi_user_${el.dataset.u}.json`)),
  'a-deluser': aTry(async el => {
    if (!(await typeConfirm(`Delete ${el.dataset.u}?`, 'Their account and all data are destroyed. This frees a slot.', el.dataset.u))) return;
    await aApi('DELETE', `/api/admin/users/${encodeURIComponent(el.dataset.u)}`); toast('User deleted', 'success');
    if (el.dataset.u === session.user) return logout(); renderAdmin();
  }),
  'a-logtype': el => { A.logType = el.dataset.v; $$('[data-act=a-logtype]').forEach(b => b.classList.toggle('on', b === el)); renderLogList(); },
  'a-clearlogs': aTry(async () => { if (!(await confirmDlg('Clear the activity log?', 'This cannot be undone.', { ok: 'Clear', danger: true }))) return; await aApi('DELETE', '/api/admin/logs'); renderAdmin(); }),
  'a-revoke': aTry(async el => { await aApi('DELETE', `/api/admin/sessions/${encodeURIComponent(el.dataset.id)}`); renderAdmin(); }),
  'a-revoke-all': aTry(async () => { if (!(await confirmDlg('Revoke ALL sessions?', 'Every user — including you — will need to sign in again.', { ok: 'Revoke all', danger: true }))) return; await aApi('DELETE', '/api/admin/sessions'); toast('All sessions revoked', 'success'); setTimeout(() => { localStorage.removeItem(TOKEN_KEY); location.reload(); }, 800); }),
  'a-quick-backup': aTry(async () => { const r = await aApi('POST', '/api/admin/backups'); toast('Backup created: ' + r.name, 'success'); if (A.tab === 'backups') renderAdmin(); }),
  'a-export-all': aTry(async () => aDownload('/api/admin/export', `ghadi_all_users_${fmtDate(new Date())}.json`)),
  'a-bk-dl': aTry(async el => aDownload(`/api/admin/backups/${encodeURIComponent(el.dataset.n)}`, el.dataset.n)),
  'a-bk-restore': aTry(async el => {
    if (!(await confirmDlg('Restore this backup?', `The live database is replaced by <b>${esc(el.dataset.n)}</b>. The current state is backed up first. Everyone is signed out if their session is not in the backup.`, { ok: 'Restore', danger: true }))) return;
    const r = await aApi('POST', `/api/admin/backups/${encodeURIComponent(el.dataset.n)}/restore`); toast('Restored. Previous state saved as ' + r.pre, 'success'); renderAdmin();
  }),
  'a-bk-del': aTry(async el => { if (!(await confirmDlg('Delete backup?', esc(el.dataset.n), { ok: 'Delete', danger: true }))) return; await aApi('DELETE', `/api/admin/backups/${encodeURIComponent(el.dataset.n)}`); renderAdmin(); })
};
const ADMIN_FORMS = {
  'admin-auth': submitAdminAuth,
  'a-cap': aTry(async () => { await aApi('POST', '/api/admin/config', { maxUsers: $('#a-cap').value }); toast('User cap saved', 'success'); }),
  'a-sitepw': aTry(async () => { await aApi('POST', '/api/admin/config', { sitePassword: $('#a-sitepw').value }); $('#a-sitepw').value = ''; toast('Site password changed', 'success'); }),
  'a-adminpw': aTry(async () => { await aApi('POST', '/api/admin/config', { adminPasscode: $('#a-adminpw').value }); $('#a-adminpw').value = ''; toast('Admin passcode changed', 'success'); }),
  'a-announce': aTry(async () => {
    await aApi('POST', '/api/admin/config', { announcement: { text: $('#a-an-text').value.trim(), level: $('#a-an-level').value, active: $('#a-an-active').checked } });
    toast('Announcement saved', 'success');
    const h = await api('GET', '/api/health', undefined, { noAuth: true }); showAnnouncement(h.announcement); if (!h.announcement) $('#announce').classList.add('hidden');
  }),
  'a-nuke': aTry(async () => {
    const code = $('#a-nuke').value;
    if (code !== 'CONFIRM_NUKE_ALL') { toast('Nuke aborted. Invalid confirmation code.', 'error'); return; }
    if (!(await typeConfirm('Wipe ALL users?', 'Every account and session will be destroyed (a backup is created first).', 'WIPE'))) return;
    const r = await aApi('POST', '/api/admin/nuke', { confirm: code });
    toast(`System reset: ${r.removed} users removed`, 'success'); setTimeout(() => { localStorage.removeItem(TOKEN_KEY); location.reload(); }, 1200);
  })
};
Object.assign(CHANGE, {
  'a-reg': aTry(async el => { await aApi('POST', '/api/admin/config', { registrationOpen: el.checked }); toast(el.checked ? 'Registration opened' : 'Registration closed', 'success'); })
});
let _aTimer;
Object.assign(INPUT, {
  'a-userq': el => { A.userQ = el.value; renderUserTable(); },
  'a-logq': el => { A.logQ = el.value; clearTimeout(_aTimer); _aTimer = setTimeout(renderLogList, 250); }
});
