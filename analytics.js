'use strict';
/* =====================================================================
   Analytics view — all charts are plain HTML/SVG, no libraries
   ===================================================================== */

const BLOCKS = [['Morning', 5, 12], ['Afternoon', 12, 17], ['Evening', 17, 21], ['Night', 21, 29]];
const blockOf = t => {
  const h = parseInt((t.endTime || t.startTime).split(':')[0], 10);
  const hh = h < 5 ? h + 24 : h;
  return BLOCKS.findIndex(b => hh >= b[1] && hh < b[2]);
};
const BADGES = [
  { e: '🌱', n: 'First Spoke', d: 'Complete your first task', ok: c => c.done >= 1 },
  { e: '📋', n: 'Dozen Done', d: 'Complete 12 tasks', ok: c => c.done >= 12 },
  { e: '💯', n: 'Century', d: 'Complete 100 tasks', ok: c => c.done >= 100 },
  { e: '🔥', n: 'On Fire', d: '7-day streak', ok: c => c.best >= 7 },
  { e: '🚀', n: 'Unstoppable', d: '30-day streak', ok: c => c.best >= 30 },
  { e: '🎧', n: 'Deep Diver', d: '5 hours of focus', ok: c => c.focusSec >= 18000 },
  { e: '🍅', n: 'Pomodoro Pro', d: '10 focus sessions', ok: c => c.sessions >= 10 },
  { e: '🎓', n: 'Scholar', d: 'Master 10 chapters', ok: c => c.mastered >= 10 },
  { e: '🗓️', n: 'Planner', d: 'Plan 50 tasks', ok: c => c.total >= 50 },
  { e: '🌟', n: 'Perfect Day', d: 'Finish every task on a day with 3+', ok: c => c.perfect }
];

function bars(vals, labels, { h = 150, color = 'rgb(var(--accent))', unit = '' } = {}) {
  const max = Math.max(...vals, 1);
  const every = Math.ceil(vals.length / 10);
  return `<div class="bars" style="height:${h}px">${vals.map((v, i) => `<div class="bcol" title="${esc(labels[i])}: ${v}${unit}"><div class="bar-v"><i style="height:${Math.max(v / max * 100, v ? 4 : 1.5)}%;background:${color}"></i></div><span>${i % every === 0 ? esc(labels[i]) : ''}</span></div>`).join('')}</div>`;
}
function donut(segs) {
  const total = sum(segs.map(s => s.v));
  if (!total) return '<div class="empty small"><p>No data in this range.</p></div>';
  let off = 25;
  const arcs = segs.filter(s => s.v).map(s => { const p = s.v / total * 100, a = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${s.c}" stroke-width="5.5" stroke-dasharray="${p} ${100 - p}" stroke-dashoffset="${off}"/>`; off -= p; return a; }).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 42 42" class="donut"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--border)" stroke-width="5.5"/>${arcs}<text x="21" y="22.5" text-anchor="middle">${total}</text><text x="21" y="27" text-anchor="middle" class="sm">tasks</text></svg>
    <ul class="legend">${segs.map(s => `<li><i style="background:${s.c}"></i>${esc(s.l)} <b>${s.v}</b></li>`).join('')}</ul></div>`;
}

function renderAnalytics() {
  const el = $('#view-analytics'), days = ui.range, tdy = today();
  const start = fmtDate(addDays(new Date(), -(days - 1)));
  const prevStart = fmtDate(addDays(new Date(), -(2 * days - 1))), prevEnd = fmtDate(addDays(new Date(), -days));
  const all = S.tasks, inR = all.filter(t => t.date >= start && t.date <= tdy);
  const past = inR; // future tasks are excluded already
  const completed = inR.filter(t => t.status === 'Completed');
  const prevDone = all.filter(t => t.date >= prevStart && t.date <= prevEnd && t.status === 'Completed').length;
  const rate = inR.length ? Math.round(completed.length / inR.length * 100) : 0;
  const delta = prevDone ? Math.round((completed.length - prevDone) / prevDone * 100) : null;
  const dl = inR.filter(t => t.status === 'Delayed' || t.status === 'Abandoned').length;
  const burn = inR.length ? Math.round(dl / inR.length * 100) : 0;
  const st = streakInfo();

  // focus
  let focusRange = 0;
  for (const [d, s] of Object.entries(S.focusLog)) if (d >= start && d <= tdy) focusRange += s;
  const focusAll = sum(all.map(t => t.focusSec)) + S.game.freeSec;

  // estimation accuracy
  let sched = 0, actual = 0;
  completed.forEach(t => { if (t.focusSec > 0 && t.startTime && t.endTime) { sched += taskHours(t) * 3600; actual += t.focusSec; } });
  const acc = sched ? actual / sched : null;

  // completions chart (daily up to 30, weekly for 90)
  let cv = [], cl = [];
  if (days <= 30) {
    for (let i = days - 1; i >= 0; i--) { const d = addDays(new Date(), -i), ds = fmtDate(d); cv.push(all.filter(t => t.date === ds && t.status === 'Completed').length); cl.push(days <= 7 ? d.toLocaleDateString(undefined, { weekday: 'short' }) : String(d.getDate())); }
  } else {
    const weeks = Math.ceil(days / 7);
    for (let w = weeks - 1; w >= 0; w--) {
      const a = fmtDate(addDays(new Date(), -(w * 7 + 6))), b = fmtDate(addDays(new Date(), -w * 7));
      cv.push(all.filter(t => t.date >= a && t.date <= b && t.status === 'Completed').length);
      cl.push(parseDate(a).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    }
  }

  // focus per day (last 14)
  const fv = [], fl = [];
  for (let i = 13; i >= 0; i--) { const d = addDays(new Date(), -i); fv.push(Math.round((S.focusLog[fmtDate(d)] || 0) / 60)); fl.push(String(d.getDate())); }

  // status donut
  const sd = STATUSES.map(s => ({ l: s, v: inR.filter(t => t.status === s).length, c: STATUS_COLOR[s] }));

  // by category
  const catRows = S.categories.map(c => {
    const ts = inR.filter(t => t.category === c), n = ts.length;
    const cnt = s => ts.filter(t => t.status === s).length;
    const hrs = sum(ts.map(taskHours)), foc = sum(ts.map(t => t.focusSec)) / 3600;
    return { c, n, done: cnt('Completed'), part: cnt('Partially Completed'), del: cnt('Delayed'), ab: cnt('Abandoned'), pend: cnt('Pending'), hrs, foc };
  });
  const maxHrs = Math.max(...catRows.map(r => r.hrs), 0.001);

  // weekday x block heatmap
  const heat = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  const dayDone = [0, 0, 0, 0, 0, 0, 0], blockDone = [0, 0, 0, 0];
  completed.forEach(t => { const dow = parseDate(t.date).getDay(); dayDone[dow]++; if (t.startTime || t.endTime) { const b = blockOf(t); if (b >= 0) { heat[dow][b]++; blockDone[b]++; } } });
  const hmax = Math.max(...heat.flat(), 1);
  const wn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ws = +P.weekStart || 0, order = [...wn.keys()].map(i => (i + ws) % 7);

  // streak calendar (12 weeks)
  const todayDow = (new Date().getDay() - ws + 7) % 7, startCal = addDays(new Date(), -(7 * 11 + todayDow));
  let cal = '';
  for (let i = 0; i < 84; i++) {
    const d = addDays(startCal, i), ds = fmtDate(d);
    if (ds > tdy) { cal += '<i class="cal-cell fut"></i>'; continue; }
    const n = all.filter(t => t.date === ds && t.status === 'Completed').length;
    cal += `<i class="cal-cell l${n === 0 ? 0 : n < 3 ? 1 : n < 5 ? 2 : 3}" title="${ds}: ${n} completed"></i>`;
  }

  // syllabus overview
  const sylRows = Object.keys(SYLLABUS).map(sk => ({ sk, ...subjectProgress(sk) }));
  const sylTotal = sum(sylRows.map(r => r.total)), sylMastered = sum(sylRows.map(r => r.mastered));

  // badges
  const byDay = {}; all.forEach(t => { (byDay[t.date] = byDay[t.date] || []).push(t); });
  const ctx = {
    done: all.filter(t => t.status === 'Completed').length, best: st.best, focusSec: focusAll, sessions: S.game.sessions, mastered: sylMastered, total: all.length,
    perfect: Object.values(byDay).some(ts => ts.length >= 3 && ts.every(t => t.status === 'Completed'))
  };

  // insights
  const ins = [];
  if (completed.length) {
    const bd = dayDone.indexOf(Math.max(...dayDone));
    ins.push(`📅 <b>${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][bd]}</b> are your most productive days (${dayDone[bd]} completion${dayDone[bd] === 1 ? "" : "s"}).`);
    if (Math.max(...blockDone) > 0) ins.push(`⏰ You finish the most in the <b>${BLOCKS[blockDone.indexOf(Math.max(...blockDone))][0].toLowerCase()}</b>. Schedule your hardest work there.`);
  }
  const worstCat = catRows.filter(r => r.n >= 3).sort((a, b) => (b.del + b.ab) / b.n - (a.del + a.ab) / a.n)[0];
  if (worstCat && (worstCat.del + worstCat.ab) / worstCat.n >= 0.25) ins.push(`⚠️ <b>${esc(worstCat.c)}</b> slips most: ${Math.round((worstCat.del + worstCat.ab) / worstCat.n * 100)}% of its tasks are delayed or abandoned.`);
  if (acc !== null) ins.push(acc < 0.7 ? `🕒 You focus for about <b>${Math.round(acc * 100)}%</b> of the time you schedule. Try shorter blocks.` : acc > 1.2 ? `🕒 Tasks take about <b>${acc.toFixed(1)}×</b> longer than planned — pad your estimates.` : `🎯 Your time estimates are right on target (${acc.toFixed(2)}×).`);
  if (burn >= 40) ins.push(`🔋 Burnout alert: <b>${burn}%</b> of recent tasks were delayed or abandoned. Plan lighter days.`);
  if (st.cur >= 3) ins.push(`🔥 <b>${st.cur}-day</b> streak — keep it alive today!`);
  if (!ins.length) ins.push('✨ Complete a few tasks and your personal insights will appear here.');

  el.innerHTML = `
    <div class="page-head"><div><h2>Analytics</h2><p class="sub">Your habits, measured. Past tasks only — upcoming ones don't count against you.</p></div>
      <div class="seg">${[[7, '7 days'], [30, '30 days'], [90, '90 days']].map(([v, l]) => `<button class="${days === v ? 'on' : ''}" data-act="range" data-v="${v}">${l}</button>`).join('')}</div></div>

    <div class="stat-grid">
      <div class="card stat"><small>Completion rate</small><b class="c-accent">${rate}%</b><span class="${delta === null ? '' : delta >= 0 ? 'up' : 'down'}">${delta === null ? 'no previous period' : (delta >= 0 ? '▲ +' : '▼ ') + delta + '% vs previous'}</span></div>
      <div class="card stat"><small>Focus time</small><b class="c-pink">${fmtDur(focusRange)}</b><span>${fmtDur(focusAll)} all-time</span></div>
      <div class="card stat"><small>Velocity</small><b class="c-blue">${completed.length}</b><span>tasks completed</span></div>
      <div class="card stat"><small>Estimation accuracy</small><b class="c-purple">${acc === null ? 'N/A' : acc.toFixed(2) + '×'}</b><span>actual vs scheduled</span></div>
      <div class="card stat burn"><small>Burnout index</small><b>${burn}%</b><span>delayed + abandoned</span><div class="gauge"><i style="width:${burn}%;background:${burn < 20 ? '#22c55e' : burn < 50 ? '#eab308' : '#ef4444'}"></i></div></div>
      <div class="card stat"><small>Streak</small><b class="c-orange">${st.cur}🔥</b><span>best ${st.best} day${st.best === 1 ? "" : "s"}</span></div>
    </div>

    <div class="card sect"><h3>${icon('spark')} Insights</h3><ul class="insights">${ins.map(i => `<li>${i}</li>`).join('')}</ul></div>

    <div class="grid-2">
      <div class="card sect"><h3>Completed ${days > 30 ? 'per week' : 'per day'}</h3>${bars(cv, cl)}</div>
      <div class="card sect"><h3>Status breakdown</h3>${donut(sd)}</div>
    </div>

    <div class="grid-2">
      <div class="card sect"><h3>Peak productivity</h3>
        <div class="heat"><div></div>${BLOCKS.map(b => `<small>${b[0]}</small>`).join('')}
          ${order.map(d => `<small>${wn[d]}</small>${heat[d].map(n => `<div class="hcell" style="--o:${(n / hmax).toFixed(2)}" title="${wn[d]} ${n}">${n || ''}</div>`).join('')}`).join('')}</div></div>
      <div class="card sect"><h3>Focus minutes · last 14 days</h3>${bars(fv, fl, { color: 'rgb(var(--accent2))', unit: 'm' })}</div>
    </div>

    <div class="grid-2">
      <div class="card sect"><h3>By category</h3>${catRows.some(r => r.n) ? catRows.filter(r => r.n).map(r => `
        <div class="cat-stat"><div class="cs-top"><b><i style="background:${catColor(r.c)}"></i>${esc(r.c)}</b><span>${r.done}/${r.n} done</span></div>
          <div class="stack">${[['done', '#22c55e'], ['part', '#eab308'], ['del', '#f97316'], ['ab', '#ef4444'], ['pend', '#94a3b8']].map(([k, c]) => `<i style="width:${r[k] / r.n * 100}%;background:${c}" title="${k}: ${r[k]}"></i>`).join('')}</div></div>`).join('') : '<div class="empty small"><p>No tasks in this range.</p></div>'}</div>
      <div class="card sect"><h3>Time allocation <small>(scheduled vs focused)</small></h3>${catRows.some(r => r.hrs || r.foc) ? catRows.filter(r => r.hrs || r.foc).map(r => `
        <div class="cat-stat"><div class="cs-top"><b><i style="background:${catColor(r.c)}"></i>${esc(r.c)}</b><span>${r.hrs.toFixed(1)}h planned · ${r.foc.toFixed(1)}h focused</span></div>
          <div class="hbar"><i style="width:${r.hrs / maxHrs * 100}%;background:${catColor(r.c)}"></i></div></div>`).join('') : '<div class="empty small"><p>Add start/end times to see this.</p></div>'}</div>
    </div>

    <div class="grid-2">
      <div class="card sect"><h3>${icon('flame')} Activity · last 12 weeks</h3><div class="cal">${cal}</div><p class="muted tiny">Darker = more tasks completed that day.</p></div>
      <div class="card sect"><h3>${icon('book')} Syllabus mastery <small>${sylMastered}/${sylTotal} chapters</small></h3>
        ${sylRows.map(r => `<div class="cat-stat tight"><div class="cs-top"><b>${esc(r.sk)}</b><span>${r.pct}%</span></div><div class="hbar"><i style="width:${r.pct}%"></i></div></div>`).join('')}</div>
    </div>

    <div class="card sect"><h3>🏅 Badges <small>${BADGES.filter(b => b.ok(ctx)).length}/${BADGES.length} earned</small></h3>
      <div class="badges">${BADGES.map(b => `<div class="badge ${b.ok(ctx) ? 'on' : ''}" title="${esc(b.d)}"><span>${b.e}</span><b>${b.n}</b><small>${b.d}</small></div>`).join('')}</div></div>`;
}
