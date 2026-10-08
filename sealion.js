// sealion.js - Personal Sea Lion chat for Rectilinear Redundancies
(function () {
  function boot() {
    const $ = id => document.getElementById(id);
    const body = $('chat-body'), input = $('chat-input'), send = $('chat-send'), chipsEl = $('chat-chips');
    const fab = $('chat-fab'), win = $('chat-window'), closeBtn = $('chat-close');
    if (!body || !input || !send) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const RR = () => window.RR || {};
    const S = () => (RR().S || {});
    const sounds = () => S().slSounds !== false;
    const act = t => (sounds() ? t : '');

    /* ---------- toggle ---------- */
    const toggle = open => { win.classList.toggle('open', open); if (open) { input.focus(); scroll(); } };
    fab?.addEventListener('click', () => toggle(!win.classList.contains('open')));
    closeBtn?.addEventListener('click', () => toggle(false));

    /* ---------- rendering ---------- */
    function scroll() { body.scrollTop = body.scrollHeight; }
    function addUser(t) { const d = document.createElement('div'); d.className = 'chat-msg user-msg'; d.textContent = t; body.appendChild(d); scroll(); }
    function addBot(html) { const d = document.createElement('div'); d.className = 'chat-msg bot-msg'; d.innerHTML = html; body.appendChild(d); scroll(); return d; }
    function typing() { const d = document.createElement('div'); d.className = 'chat-msg bot-msg typing'; d.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(d); scroll(); return d; }
    function setChips(list) {
      chipsEl.innerHTML = '';
      list.forEach(c => { const b = document.createElement('button'); b.textContent = c; b.addEventListener('click', () => ask(c)); chipsEl.appendChild(b); });
    }
    const BASE_CHIPS = ['Tell me a joke', 'Study tip', 'Quiz me', 'Cat picture', 'Start timer', 'My stats', 'Motivate me'];
    setChips(BASE_CHIPS);

    /* ---------- images ---------- */
    const CATS = {
      cats: { re: /\b(cats?|kittens?|kitty|kitties|meow)\b/, one: 'Cat', online: () => 'https://cataas.com/cat?t=' + Date.now() },
      dogs: { re: /\b(dogs?|pupp(y|ies)|doggo|woof)\b/, one: 'Dog', online: () => 'https://placedog.net/500/350?r&t=' + Date.now() },
      capybaras: { re: /\b(capybaras?|capy|capibaras?)\b/, one: 'Capybara', online: null },
      memes: { re: /\b(memes?|funny pic(ture)?s?)\b/, one: 'Meme', online: null }
    };
    const EXTS = ['jpg', 'png', 'jpeg', 'webp'];
    const placeholder = label => 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="46%" fill="#94a3b8" font-size="20" text-anchor="middle" font-family="sans-serif">' + label + '</text><text x="50%" y="62%" fill="#64748b" font-size="14" text-anchor="middle" font-family="sans-serif">(add images to /assets)</text></svg>');
    function imageHTML(key) {
      const c = CATS[key], n = 1 + Math.floor(Math.random() * 10);
      const mode = S().slImages || 'local';
      const img = document.createElement('img'); img.className = 'sl-img'; img.alt = c.one;
      const chain = [];
      const local = () => EXTS.forEach(e => chain.push('./assets/' + key[0].toUpperCase() + key.slice(1) + '/' + c.one + '%20' + n + '.' + e));
      const online = () => { if (c.online) chain.push(c.online()); };
      if (mode === 'online') { online(); local(); } else if (mode === 'fallback') { local(); online(); } else local();
      let i = 0;
      img.onerror = () => { i++; if (i < chain.length) img.src = chain[i]; else { img.onerror = null; img.src = placeholder(c.one + ' #' + n); } };
      img.src = chain[0];
      return img;
    }
    function sendImage(key, lead) {
      const d = addBot(esc(lead)); d.appendChild(imageHTML(key));
      d.querySelector('img').addEventListener('load', scroll);
    }

    /* ---------- content banks ---------- */
    const B = {
      greet: ['*Arf arf!* Hello, study buddy! What are we conquering today?', 'Hey there! *claps flippers* Ready to learn something?', '*Splashes in* Oh, hi! Need a lecture, a file, or a flashcard?', 'Hello hello! Your favourite pinniped is on duty. 🦭', 'Good to see you! Shall we get some work done, or just hang out for a second?', '*Balances a ball on nose* Hi! Ask me anything.'],
      thanks: ['*Happy arf!* Anytime!', 'You’re welcome! Now go ace it.', '*Flaps flippers* My pleasure!', 'Aww, thanks! Fish for me later? 🐟', 'Always here for you!'],
      bye: ['*Waves flipper* See you soon! Don’t forget to rest.', 'Bye! Come back with good news!', 'Arf! Take care and drink some water. 💧', 'Off you go! I’ll guard the notes.'],
      jokes: ['Why did the sea lion fail maths? He kept getting lost at sea-level… I mean, at C-level.', 'What do you call a physicist who loves sea lions? Someone with great *Arf*-ections.', 'Why was the equal sign so humble? It knew it wasn’t less than or greater than anyone.', 'Why do chemists make great friends? They always have good reactions.', 'I told my calculator a joke. It said "I’ll add it to my list of things I can’t solve."', 'What did the integral say to the derivative? "Stop going off on a tangent!"', 'Why can’t you trust atoms? They make up everything.', 'Parallel lines have so much in common… it’s a shame they’ll never meet.', 'Why was the student’s notebook cold? It had too many drafts.', 'What’s a sea lion’s favourite subject? Mari-time management.', 'Why did the vector break up with the scalar? Too much direction, not enough magnitude from the scalar.', 'Why is 6 afraid of 7? Because 7 8 9. (Sorry, I had to.)', 'What does a sea lion say when a question is easy? "That’s a seal-y simple one!"', 'How does a physicist ask someone out? "Hey, want to have some quantum-time together?"', 'I would tell you a chemistry joke, but all the good ones Argon.', 'Why did the function go to therapy? Too many unresolved limits.'],
      facts: ['Sea lions can dive up to ~500 m and hold their breath for up to 20 minutes. Impressive!', 'The speed of light is exactly 299,792,458 m/s - the metre is actually defined from it.', 'Water is densest at about 4 °C, which is why lakes freeze from the top down.', 'A day on Venus is longer than its year.', 'The number zero was developed in India; Brahmagupta wrote rules for it in 628 CE.', 'Sea lions have external ear flaps; true seals don’t. Handy for telling us apart!', 'Ramanujan found infinite series for π that are still used in modern computations.', 'Diamond and graphite are both pure carbon - only the bonding arrangement differs.', 'Lightning heats the air around it to roughly five times the surface temperature of the Sun.', 'Bananas are slightly radioactive thanks to potassium-40. Don’t panic.', 'Euler’s identity e^(iπ) + 1 = 0 ties together five of the most important constants in maths.', 'Sea lions can clap their front flippers - and that’s very much on brand.', 'The Indian IITs started in 1951; the first one was set up in Kharagpur.', 'Honey never spoils - jars found in ancient tombs were still edible.', 'A neutron star teaspoon would weigh about a billion tonnes.', 'Sound travels about four times faster in water than in air.'],
      tips: ['Try active recall: close the book and write down everything you remember before checking.', 'Spaced repetition beats cramming. Use the Flashcards tool - the Leitner boxes do the scheduling for you.', 'Study in 25-minute sprints with 5-minute breaks. The Focus tab has a timer waiting.', 'Do the hardest subject first, when your brain is freshest.', 'After solving a problem, explain it out loud as if teaching a friend. Gaps show up instantly.', 'Keep an error log. Re-solving your past mistakes is the best revision there is.', 'Sleep consolidates memory. Pulling an all-nighter usually costs more than it gives.', 'Mix topics when practising (interleaving) - it feels harder but sticks better.', 'Before a lecture, skim the chapter headings for 2 minutes. You’ll absorb much more.', 'For formulas: derive them once, then memorise. Understanding makes recall easier.', 'Put your phone in another room during focus blocks. Seriously, it works.', 'Set one tiny goal for the next 10 minutes instead of facing the entire syllabus.', 'Time yourself on previous-year papers - speed is a skill you can train.', 'Review notes within 24 hours of a lecture to slow forgetting dramatically.', 'Hydrate and stretch between blocks. Your brain runs on the body it lives in.', 'Tick off chapters in the Syllabus tracker - visible progress is real motivation.'],
      motivate: ['Every expert was once a beginner who refused to quit. Keep going!', 'You don’t have to be perfect today. Just be a little better than yesterday.', 'Small steps every day add up to giant leaps. *Arf!*', 'Discipline is just remembering what you want. Remind yourself why you started.', 'The hard chapters are where rank-changing marks live. Lean in.', 'Progress, not perfection. One more problem, then another.', 'You’ve survived 100% of your bad study days so far. Streak intact!', 'Be stubborn about the goal and flexible about the method.', 'Tired? Rest, don’t quit. The finish line isn’t going anywhere.', 'Future you is cheering for present you. Don’t let them down!'],
      comfort: ['I’m sorry you’re feeling this way. Take a slow breath with me - in for 4, hold 4, out for 6. You’re doing better than you think.', '*Gentle nuzzle* It’s okay to have rough days. Rest a little, then try one small thing.', 'Stress means you care - but you’re allowed to pause. Want a short break timer?', 'Exams aren’t a measure of your worth. You’re more than any mark. 💙'],
      heavy: ['I’m really sorry you’re hurting. Please talk to someone you trust - a parent, friend, teacher or counsellor - and if you ever feel unsafe, reach out to a local helpline or emergency services right now. You matter, and you don’t have to carry this alone. 💙'],
      compliments: ['*Blushes in fur* Aww, you’re too kind!', 'Thank you! You’re pretty great yourself.', '*Does a happy spin* You made my day!', 'Flattery gets you extra fish. 🐟'],
      identity: ['I’m the Personal Sea Lion - part study assistant, part professional flipper-clapper. I can search your library, quiz you, run the timer, share pictures and tell bad jokes.', 'Arf! I’m Sea Lion, your resident helper for Rectilinear Redundancies.'],
      fish: ['*Catches the fish mid-air* Nom nom nom! 🐟', 'Fish?! Where?! *spins excitedly*', '*Happy sea lion noises* More please!'],
      jee: ['JEE tip: NCERT first, then problems. Chemistry is often the quickest to score if you’ve read the NCERT line by line.', 'Physics: build concepts from first principles, then drill numericals. Maths: practise a lot, review mistakes weekly.', 'Mock tests teach you timing and temperament. Analyse every one - the review is more valuable than the score.', 'Revise formula sheets often - the Support tab has booklets and flashcards for that!'],
      sleep: ['Sleep is part of studying. 7-8 hours helps memory more than an extra late-night hour.', 'Go to bed! Your neurons are filing today’s notes while you sleep. 😴', 'Tired brains forget quickly. A short nap (20 min) can do wonders.'],
      confused: ['*Tilts head* I couldn’t find anything for that. Try different keywords, or use the chips below.', '*Sad Arf* Nothing matched. Try a chapter name like "electrostatics" or ask for a joke!', 'Hmm, no match in the library. Want a study tip instead?']
    };

    /* ---------- intents ---------- */
    const has = (q, re) => re.test(q);
    function go(fn, msg) { try { fn(); } catch (e) { console.error(e); } return msg; }
    function timeStr() { const d = new Date(); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); }
    function quiz() {
      const c = RR().card && RR().card();
      if (!c) return 'I don’t have any flashcards yet. Add some in the Flashcards tool!';
      const q = c.q || c.question || c.front || c[1] || '', a = c.a || c.answer || c.back || c[2] || '';
      const d = addBot('📝 <b>Quiz time:</b> ' + esc(q));
      const b = document.createElement('button'); b.className = 'chat-reveal'; b.textContent = 'Reveal answer';
      b.addEventListener('click', () => { b.replaceWith(Object.assign(document.createElement('div'), { innerHTML: '<b>Answer:</b> ' + esc(a) })); scroll(); });
      d.appendChild(b); return null;
    }
    const INTENTS = [
      { re: /^(hi|hello|hey|yo|sup|hola|namaste|hii+|heya|good (morning|afternoon|evening))\b/, f: () => pick(B.greet) },
      { re: /\b(thanks?|thank you|thx|ty|cheers)\b/, f: () => pick(B.thanks) },
      { re: /^(bye|goodbye|see ya|cya|good night|gn|later)\b/, f: () => pick(B.bye) },
      { re: /\b(joke|funny|make me laugh|pun)\b/, f: () => pick(B.jokes) },
      { re: /\b(fact|trivia|did you know|something interesting)\b/, f: () => pick(B.facts) },
      { re: /\b(study )?tips?\b|\bhow (do|should) i study\b|\bstudy (advice|hack)s?\b/, f: () => pick(B.tips) },
      { re: /\b(motivat\w*|inspire|inspiration|encourage\w*|quote)\b/, f: () => (Math.random() < .5 && RR().quote ? '“' + esc(RR().quote().t || RR().quote().q || RR().quote()) + '”' : pick(B.motivate)) },
      { re: /\b(suicid\w*|kill myself|end my life|self.?harm|want to die|hurt myself)\b/, f: () => pick(B.heavy) },
      { re: /\b(sad|stress\w*|anxious|anxiety|depress\w*|overwhelm\w*|tired of|can'?t do this|give up|hopeless|failing|worried|burn(ed)? ?out|lonely|scared)\b/, f: () => pick(B.comfort), chips: ['Start 5 min break', 'Motivate me', 'Tell me a joke'] },
      { re: /\b(you('re| are) (great|awesome|cute|amazing|the best|smart)|good (bot|boy|job)|love you|i like you)\b/, f: () => pick(B.compliments) },
      { re: /\b(who are you|what are you|your name|about you|introduce yourself)\b/, f: () => pick(B.identity) },
      { re: /\b(help|what can you do|commands|options)\b/, f: () => 'I can: 🔎 search lectures/files by topic, 📝 quiz you, ⏱ start/pause/reset the timer, 📊 show your stats, 🖼 send cat/dog/capybara/meme pics, 😂 jokes, 🧠 facts, 💡 tips, ⚙ open tools (analytics, timetable, syllabus, flashcards, settings).' },
      { re: /\b(time|date|day is it|today'?s date)\b/, f: () => 'It’s ' + timeStr() + '.' },
      { re: /\b(flip a coin|coin flip|toss a coin|heads or tails)\b/, f: () => 'I flipped it… <b>' + (Math.random() < .5 ? 'Heads' : 'Tails') + '</b>!' },
      { re: /\b(roll (a |the )?(dice|die)|dice)\b/, f: () => '🎲 You rolled a <b>' + (1 + Math.floor(Math.random() * 6)) + '</b>!' },
      { re: /\b(fish|sardine|herring|salmon|snack)\b/, f: () => pick(B.fish) },
      { re: /\b(sleep|sleepy|nap|insomnia|bedtime)\b/, f: () => pick(B.sleep) },
      { re: /\b(quiz|flash ?card|test me|question me|ask me)\b/, f: () => quiz() },
      { re: /\b(start|begin|run|resume)\b.*\b(timer|pomodoro|focus)\b|\b(timer|pomodoro|focus)\b.*\b(start|begin|go)\b|^(start timer|pomodoro)$/, f: () => go(() => RR().pomo.start(), '⏱ Timer started. *Arf!* Focus mode on.') },
      { re: /\b(pause|stop|hold)\b.*\b(timer|pomodoro|focus)\b/, f: () => go(() => RR().pomo.pause(), '⏸ Timer paused.') },
      { re: /\b(reset)\b.*\b(timer|pomodoro)\b/, f: () => go(() => RR().pomo.reset(), '↺ Timer reset.') },
      { re: /\b(start|take)\b.*\bbreak\b|\bbreak timer\b/, f: () => go(() => { RR().openUtility('focus'); }, 'Open the Focus tool and pick a break mode - you’ve earned it. ☕') },
      { re: /\b(stats?|streak|progress|how am i doing|how much (did|have) i)\b/, f: () => { const s = RR().stats && RR().stats(); return s ? '📊 Today: <b>' + s.todayMin + ' min</b> · Total: <b>' + s.totalH + ' h</b> · Streak: <b>' + s.streak + '</b> day(s) (best ' + s.best + ') · Sessions: <b>' + s.sessions + '</b>.' : 'Stats aren’t available right now.'; } },
      { re: /\b(open|show|go to|take me to)\b.*\b(analytics|statistics)\b|^analytics$/, f: () => go(() => RR().openUtility('analytics'), 'Opening Analytics 📊') },
      { re: /\b(open|show|go to|take me to)\b.*\b(timetable|schedule|planner)\b|^timetable$/, f: () => go(() => RR().openUtility('timetable'), 'Opening your Timetable 🗓') },
      { re: /\b(open|show|go to|take me to)\b.*\b(syllabus|tracker)\b|^syllabus$/, f: () => go(() => RR().openUtility('syllabus'), 'Opening the Syllabus tracker ✅') },
      { re: /\b(open|show|go to|take me to)\b.*\b(flash ?cards?)\b/, f: () => go(() => RR().openUtility('flashcards'), 'Opening Flashcards 🃏') },
      { re: /\b(open|show|go to|take me to)\b.*\b(focus|pomodoro|timer)\b/, f: () => go(() => RR().openUtility('focus'), 'Opening Focus ⏱') },
      { re: /\b(open|show|go to)\b.*\bsettings?\b|^settings$/, f: () => go(() => document.getElementById('settings-btn-main').click(), 'Opening Settings ⚙') },
      { re: /\b(go )?home\b|\bdashboard\b/, f: () => go(() => RR().home(), 'Heading home 🏠') }
    ];

    /* ---------- resource search ---------- */
    const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'on', 'in', 'to', 'me', 'my', 'find', 'search', 'show', 'give', 'get', 'open', 'lecture', 'lectures', 'file', 'files', 'notes', 'please', 'pls', 'want', 'need', 'about', 'and', 'some', 'any', 'i', 'can', 'you', 'do', 'have', 'is', 'there']);
    function search(q) {
      const list = window.masterList || [];
      let toks = q.split(/[^a-z0-9]+/).filter(t => t && !STOP.has(t));
      if (!toks.length) toks = q.split(/[^a-z0-9]+/).filter(Boolean);
      if (!toks.length) return [];
      const hay = b => ((b._t || b.title || '') + ' ' + (b._f || []).join(' ') + ' ' + (b.title || '')).toLowerCase();
      const scored = [];
      list.forEach((b, i) => {
        const h = hay(b); let ok = true, sc = 0;
        for (const t of toks) { const p = h.indexOf(t); if (p < 0) { ok = false; break; } sc += (h.slice(p - 1, p).match(/[a-z0-9]/) ? 1 : 3); }
        if (ok) scored.push({ i, sc });
      });
      scored.sort((a, b) => b.sc - a.sc);
      return scored.slice(0, 8).map(x => x.i);
    }
    function showResults(idxs) {
      const d = addBot('*Sniffs around* Found ' + idxs.length + ' match' + (idxs.length > 1 ? 'es' : '') + ':');
      idxs.forEach(i => {
        const b = window.masterList[i], btn = document.createElement('button');
        btn.className = 'chat-match-btn'; btn.dataset.index = i;
        btn.textContent = (b._k === 'video' ? '🎬 ' : '📄 ') + (b._t || b.title);
        d.appendChild(btn);
      });
      scroll();
    }
    body.addEventListener('click', e => {
      const btn = e.target.closest('.chat-match-btn'); if (!btn) return;
      const idx = parseInt(btn.dataset.index, 10), b = window.masterList && window.masterList[idx];
      if (b && window.loadResource) { window.loadResource(b, null); if (window.showToast) window.showToast('Opened: ' + (b._t || b.title)); }
    });

    /* ---------- main handler ---------- */
    let busy = false;
    function reply(fn) {
      const t = typing(); busy = true;
      setTimeout(() => { t.remove(); busy = false; try { fn(); } catch (e) { console.error(e); addBot('*Confused Arf!* Something tripped me up.'); } }, 350 + Math.random() * 450);
    }
    function answer(raw) {
      const q = raw.toLowerCase().trim();
      if (q === 'enable admin mode') {
        if (window.adminUnlockStage === 1) window.adminUnlockStage = 2;
        addBot('*Confused Arf!* I don’t know what that means or you don’t have clearance!'); return;
      }
      // pictures
      const wantsPic = /\b(pic|picture|pictures|image|images|photo|photos|show me|send me|random|surprise)\b/.test(q);
      for (const key in CATS) if (CATS[key].re.test(q)) {
        const nonPic = /\b(flash ?cards?|quiz|question|fact|joke|tip|lecture|file|notes)\b/.test(q);
        if (!nonPic || wantsPic) { sendImage(key, act('*Flaps flippers* ') + 'Here’s a ' + CATS[key].one.toLowerCase() + ' for you!'); setChips(['Another one', 'Dog picture', 'Cat picture', 'Capybara picture', 'Meme']); lastPic = key; return; }
      }
      if (/^(another|one more|more|again)\b/.test(q) && lastPic) { sendImage(lastPic, 'Another one coming up!'); return; }
      if (/\b(picture|image|photo|something cute|surprise me|random pic)\b/.test(q) && !/\b(flash|card|quiz|question|fact|joke|tip)\b/.test(q)) {
        const k = pick(Object.keys(CATS)); lastPic = k; sendImage(k, 'Surprise! Here’s a random ' + CATS[k].one.toLowerCase() + '.'); return;
      }
      for (const it of INTENTS) {
        if (has(q, it.re)) {
          const out = it.f();
          if (out) addBot(sounds() ? out : out.replace(/\*[^*]+\*\s*/g, ''));
          setChips(it.chips || BASE_CHIPS); return;
        }
      }
      const res = search(q);
      if (res.length) { showResults(res); setChips(BASE_CHIPS); }
      else if (/\b(jee|iit|neet|mains|advanced|boards?|exam strategy)\b/.test(q)) { addBot(pick(B.jee)); setChips(BASE_CHIPS); }
      else { addBot(pick(B.confused)); setChips(['Study tip', 'Tell me a joke', 'Quiz me', 'Help']); }
    }
    let lastPic = null;
    function ask(text) {
      const t = String(text || '').trim(); if (!t || busy) return;
      addUser(t); input.value = '';
      reply(() => answer(t));
    }
    send.addEventListener('click', () => ask(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(input.value); } });

    /* ---------- nudges ---------- */
    const NUDGES = ['Psst… need a quiz?', '*Arf!* Time for a stretch?', 'Drink some water! 💧', 'How about a quick flashcard?', 'Want a joke?', 'Check your streak!'];
    setInterval(() => {
      if (!fab || win.classList.contains('open') || S().seaLion === false || Math.random() > 0.35) return;
      const n = document.createElement('div'); n.className = 'sl-nudge'; n.textContent = pick(NUDGES);
      document.body.appendChild(n); setTimeout(() => n.remove(), 5000);
    }, 90000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
