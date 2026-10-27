// Gasha PWA: the parent app. Every screen is driven by content.json; everything the parent enters stays on the phone.
(function () {
  const G = window.G, CFG = G.config, esc = G.esc, md = G.md, bi = G.bi, icon = G.icon, art = G.art, thumb = G.thumb;
  const NOW_ART = { 1: 'now-meltdown', 2: 'now-waiting', 3: 'now-sleep', 4: 'now-eat', 5: 'now-sensory', 6: 'now-public', 7: 'now-selfharm', 8: 'now-hitting', 9: 'now-wander', 10: 'now-scared', 11: 'now-transition', 12: 'now-care', 13: 'now-toilet', 14: 'now-pain', 15: 'now-withdrawn', 16: 'now-siblings' };
  const COL = { coral: '#E2492D', mustard: '#B87800', blue: '#1C5FAA', teal: '#079280', navy: '#0F3B54' };
  const CH_COURSE = { speech: 4, meltdown: 5, instructions: 4, sleep: 6, eating: 6, toilet: 6, wander: 6, selfharm: 5, public: 7, stigma: 7, family: 7, play: 3, school: 10, tired: 1 };
  const CH_NOW = { meltdown: 1, sleep: 3, eating: 4, wander: 9, selfharm: 7, public: 6, toilet: 13 };
  const TOPIC_COURSE = { A: 1, B: 2, C: 4, D: 5, E: 6, F: 10, G: 8, H: 2 };

  const DEF = { onboarded: false, stack: [{ r: 'welcome' }], ans: { role: 'parent', stage: 'new', age: '3to6', child: { name: '', sex: 'boy' }, challenges: ['meltdown', 'speech'], city: 'addis', center: 'GUYS01', parent: '', phone: '' },
    done: [], logs: [], checklist: {}, signs: [], doctor: {}, rsvp: {}, lang: 'am', mode: 'light', path: [], checkin: {}, helpful: {}, qMine: [],
    kids: [], kid: 0, family: '', sms: true, consents: { 0: true, 1: true }, offline: [], notes: { other: '', doctor: '' }, otp: '' };
  const fresh = () => JSON.parse(JSON.stringify(DEF));
  let S = Object.assign(fresh(), G.ls.get('app', {}));
  const save = () => G.ls.set('app', S);
  const D = () => G.D;
  const en = () => S.lang === 'en';
  const cur = () => S.stack[S.stack.length - 1];
  const kid = () => S.kids[S.kid] || S.ans.child;
  const name = () => kid().name || (kid().sex === 'girl' ? 'ሳሮን' : 'ሚኪ');
  const parent = () => S.ans.parent || 'ሰላማዊት';
  const centerName = () => CFG.center.name;
  const P = s => String(s == null ? '' : s).replace(/\{name\}/g, name()).replace(/\{parent\}/g, parent()).replace(/\{center\}/g, centerName()).replace(/\{city\}/g, cityName()).replace(/\{phone\}/g, '+251 ' + (S.ans.phone || '91 234 5678')).replace(/\{contact\}/g, S.family || '—').replace(/\{code\}/g, S.ans.center || '—').replace(/\{v\}/g, CFG.version);
  const L = pair => P(Array.isArray(pair) ? (en() && pair[1] ? pair[1] : pair[0]) : pair);
  const LB = s => { const b = bi(s); return P(en() && b.en ? b.en : b.am) };
  const F = (o, k) => P(en() && o[k + '_en'] ? o[k + '_en'] : o[k + '_am']);
  const page = (file, key) => (D().pages[file] || {})[key] || { tables: [], lists: [], paras: [], title: '' };
  const rows = (file, key, i = 0) => ((page(file, key).tables[i]) || { rows: [] }).rows;
  const rowMap = (file, key) => { const m = {}; rows(file, key).forEach(r => { m[G.strip(r[0])] = r }); return m };
  const RT = (file, key, label) => { const r = rowMap(file, key)[label]; return r ? P(en() && r[2] ? r[2] : r[1]) : '' };
  const cityName = () => { const st = (D() && D().onboarding.steps.find(s => s.key === 'city')); const o = st && st.options.find(x => x[0] === S.ans.city); return o ? (en() ? o[2] : o[1]) : 'አዲስ አበባ' };
  const course = id => D().courses.find(c => c.id === +id);
  const lessonById = lid => { const c = course(String(lid).split('.')[0]); return c && c.lessons.find(l => l.id === lid) };
  const situation = id => D().right_now.find(s => s.id === +id);
  const qa = id => D().qa.questions.find(q => q.id === id);

  // ---------- navigation
  // Each screen has its own address (#/lesson?id=3.2), so the phone's back button, deep links and shared links all work.
  const PARAMS = ['id', 'k', 'i', 'n'];
  const hashOf = c => { const q = PARAMS.filter(k => c[k] != null && c[k] !== '').map(k => k + '=' + encodeURIComponent(c[k])).join('&'); return '#/' + c.r + (q ? '?' + q : '') };
  const parseHash = h => { const m = String(h || '').match(/^#\/([a-z]+)(?:\?(.*))?$/); if (!m || !SCR[m[1]]) return null; const o = { r: m[1] }; new URLSearchParams(m[2] || '').forEach((v, k) => { if (PARAMS.includes(k)) o[k] = v }); return o };
  const url = (push) => { try { history[push ? 'pushState' : 'replaceState']({ depth: S.stack.length }, '', hashOf(cur())) } catch (e) {} };
  function go(r, a = {}) { S.stack.push(Object.assign({ r }, a)); save(); url(true); rerender(true) }
  function replace(r, a = {}) { S.stack[S.stack.length - 1] = Object.assign({ r }, a); save(); url(false); rerender(true) }
  function back() { if (S.stack.length > 1 && history.state && history.state.depth > 1) history.back(); else { if (S.stack.length > 1) S.stack.pop(); save(); url(false); rerender(true) } }
  function tab(r) { S.stack = [{ r }]; save(); url(false); rerender(true) }
  window.addEventListener('popstate', () => {
    closeSheet(true);
    if (S.stack.length > 1) S.stack.pop();
    else { const h = parseHash(location.hash); if (h && S.onboarded && !['welcome', 'ob', 'login'].includes(h.r)) S.stack = [h]; else if (S.onboarded) S.stack = [{ r: 'home' }] }
    save(); url(false); rerender(true);
  });
  let toastMsg = '', toastT;
  function toast(m) { toastMsg = m; rerender(); clearTimeout(toastT); toastT = setTimeout(() => { toastMsg = ''; rerender() }, 2600) }

  // ---------- bottom sheet (confirmations, install steps, the "call" chooser)
  let sheet = null;
  function openSheet(html) { sheet = html; rerender() }
  function closeSheet(silent) { sheet = null; if (!silent) rerender() }

  // ---------- audio: plays audio/<id>.mp3 when the recording exists; until Sara records it, the player runs on the script length
  const AU = { id: null, label: '', dur: 0, t: 0, on: false, el: null, timer: null, real: false };
  const secs = s => { const m = String(s || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 60 };
  function audioStop(clear) { clearInterval(AU.timer); if (AU.el) AU.el.pause(); AU.on = false; if (clear) Object.assign(AU, { id: null, el: null, t: 0, real: false }) }
  function audio(id, label, dur) {
    if (AU.id === id) { if (AU.on) audioStop(); else audioPlay(); return rerender() }
    audioStop(true); Object.assign(AU, { id, label, dur, t: 0 });
    const el = new Audio('audio/' + id + '.mp3'); AU.el = el;
    el.addEventListener('loadedmetadata', () => { if (AU.el === el) { AU.real = true; AU.dur = el.duration || dur } });
    el.addEventListener('timeupdate', () => { if (AU.el === el && AU.real) { AU.t = el.currentTime; tickUI() } });
    el.addEventListener('ended', () => { if (AU.el === el) { AU.on = false; AU.t = AU.dur; rerender() } });
    el.addEventListener('error', () => { if (AU.el === el) { AU.real = false; AU.el = null } });
    audioPlay(); rerender();
  }
  function audioPlay() {
    AU.on = true; if (AU.t >= AU.dur) AU.t = 0;
    if (AU.el) { AU.el.currentTime = AU.t; AU.el.play().catch(() => { AU.real = false; AU.el = null }) }
    clearInterval(AU.timer);
    AU.timer = setInterval(() => { if (AU.real) return; AU.t = Math.min(AU.dur, AU.t + 1); if (AU.t >= AU.dur) { AU.on = false; clearInterval(AU.timer); rerender() } else tickUI() }, 1000);
  }
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function tickUI() {
    if (!root) return; const pct = AU.dur ? AU.t / AU.dur : 0;
    root.querySelectorAll('[data-au-prog]').forEach(i => i.style.width = (pct * 100) + '%');
    root.querySelectorAll('[data-au-time]').forEach(s => s.textContent = mmss(AU.t) + ' / ' + mmss(AU.dur));
    root.querySelectorAll('[data-au-bars] i').forEach((b, k, all) => b.classList.toggle('on', k / all.length < pct));
  }
  const playerBar = () => !AU.id ? '' : `<div class="aplayer" role="region" aria-label="Audio"><button class="play" data-act="au" aria-label="${AU.on ? 'Pause' : 'Play'}">${icon(AU.on ? 'pause' : 'play')}</button><div class="t"><b>${esc(AU.label)}</b><span data-au-time>${mmss(AU.t)} / ${mmss(AU.dur)}</span><span class="prog"><i data-au-prog style="width:${AU.dur ? AU.t / AU.dur * 100 : 0}%"></i></span></div><button class="x" data-act="auclose" aria-label="${en() ? 'Close player' : 'ዝጋ'}">${icon('close')}</button></div>`;
  const listenBtn = (id, label, dur, style = '') => `<button class="chip" data-act="listen" data-id="${esc(id)}" data-label="${esc(label)}" data-dur="${dur}" style="align-self:flex-start;${style}">${AU.id === id && AU.on ? '❚❚' : '🔊'} ${en() ? 'Listen' : 'በድምፅ አዳምጥ'}</button>`;
  let keepScroll = 0, root = null;
  function rerender(reset) { if (!root) return; const sc = root.querySelector('.scroll'); keepScroll = reset ? 0 : (sc ? sc.scrollTop : 0); G.App.render(root) }

  // ---------- plan
  function plan() {
    const a = S.ans, out = [];
    const add = n => { if (n && !out.includes(n)) out.push(n) };
    if (a.role === 'teacher') [10, 2, 4].forEach(add);
    if (a.role === 'relative' || a.role === 'helper') add(9);
    if (a.stage === 'new') add(1);
    if (a.stage === 'worried' || a.stage === 'unsure') { add(2); add(3) }
    if (a.stage === 'learn') [2, 7, 3].forEach(add);
    a.challenges.forEach(c => add(CH_COURSE[c]));
    if (!out.length) add(1);
    return out;
  }
  const isDone = lid => S.done.includes(lid);
  function nextLesson() {
    for (const cid of plan()) { const c = course(cid); const l = c.lessons.find(x => !isDone(x.id)); if (l) return { c, l } }
    const c = course(1); return { c, l: c.lessons[0] };
  }

  // ---------- small parts
  const top = (title, opts = {}) => `<div class="top">${opts.close ? `<button class="ib" data-act="back" aria-label="${en() ? 'Close' : 'ዝጋ'}">${icon('close')}</button>` : opts.noback ? '' : `<button class="ib" data-act="back" aria-label="${en() ? 'Back' : 'ተመለስ'}">${icon('back')}</button>`}<h1>${title}</h1>${opts.right || ''}</div>`;
  const langT = () => `<div class="lang" role="group" aria-label="Language"><button data-act="lang" data-v="am" aria-pressed="${!en()}">አማ</button><button data-act="lang" data-v="en" aria-pressed="${en()}">EN</button></div>`;
  const nav = active => {
    const it = [['home', 'home', en() ? 'Today' : 'ዛሬ'], ['courses', 'course', en() ? 'Courses' : 'ትምህርቶች'], ['now', 'now', en() ? 'Help now' : 'አሁን እርዳኝ'], ['questions', 'questions', en() ? 'Questions' : 'ጥያቄዎች'], ['help', 'findhelp', en() ? 'Find help' : 'እርዳታ']];
    return `<nav class="nav" aria-label="Main">${it.map(([r, ic, lb]) => r === 'now'
      ? `<button class="now" data-tab="now" ${active === r ? 'aria-current="page"' : ''}><span class="c">${icon('now')}</span>${lb}</button>`
      : `<button data-tab="${r}" ${active === r ? 'aria-current="page"' : ''}>${icon(ic)}${lb}</button>`).join('')}</nav>`;
  };
  const tile = (bg, inner, act) => `<button class="tile" style="background:${bg}" ${act}>${inner}</button>`;
  const enLine = (pair) => (!en() && Array.isArray(pair) && pair[1]) ? `<span class="en">${esc(P(pair[1]))}</span>` : '';
  const nextStep = s => String(s || '').split(' · ').map(seg => {
    seg = seg.trim(); let m, act = 'data-tab="help"', ic = 'next', label = seg;
    if ((m = seg.match(/^Course (\d+)/)) && course(m[1])) { act = `data-go="course" data-id="${m[1]}"`; ic = 'course'; label = (en() ? 'Course ' : 'ኮርስ ') + m[1] + ': ' + F(course(m[1]), 'title') }
    else if ((m = seg.match(/^Lesson (\d+\.\d+)/)) && lessonById(m[1])) { act = `data-go="lesson" data-id="${m[1]}"`; ic = 'learn'; label = (en() ? 'Lesson ' : 'ትምህርት ') + m[1] + ': ' + F(lessonById(m[1]), 'title') }
    else if ((m = seg.match(/^FAQ ([A-H]\d+)/)) && qa(m[1])) { act = `data-go="answer" data-id="${m[1]}"`; ic = 'questions'; label = F(qa(m[1]), 'q') }
    else if (/^Right now/.test(seg)) {
      const want = seg.replace(/^Right now:\s*/, '').replace(/\s*\(.*$/, '').toLowerCase();
      const t = D().right_now.find(x => (x.tile_en || '').toLowerCase().startsWith(want.slice(0, 8))) || D().right_now.find(x => (x.tile_en || '').toLowerCase().includes(want.split(/[ ,]/)[0]));
      act = t ? `data-go="calm" data-id="${t.id}"` : 'data-tab="now"'; ic = 'now'; label = (en() ? 'Help now: ' : 'አሁን እርዳኝ፦ ') + (t ? F(t, 'tile') : want);
    }
    else if (/Signs checklist/.test(seg)) { act = 'data-go="signs"'; ic = 'signs'; label = en() ? 'What have you noticed? (signs checklist)' : 'ምን አስተውለዋል? (የምልክቶች ዝርዝር)' }
    else if (/ask the doctor/i.test(seg)) { act = 'data-go="doctor"'; ic = 'doctor'; label = en() ? 'What to ask the doctor' : 'ሐኪሙን ምን ልጠይቅ' }
    else if (/Safety/.test(seg)) { act = 'data-go="safety"'; ic = 'safety'; label = en() ? 'Emergency and safety' : 'አስቸኳይ ሁኔታና ደህንነት' }
    else if (/Find help|Find a speech/.test(seg)) { act = 'data-tab="help"'; ic = 'findhelp'; label = en() ? seg : 'እርዳታ ፈልግ' }
    else if (/My child/.test(seg)) { act = 'data-go="mychild"'; ic = 'child'; label = en() ? 'My child' : 'ልጄ' }
    else if (/Center events/.test(seg)) { act = 'data-go="events"'; ic = 'event'; label = en() ? 'Center events' : 'የማዕከል ዝግጅቶች' }
    else if (/Share/.test(seg)) { act = 'data-act="shareapp"'; ic = 'share'; label = en() ? 'Share with family' : 'ለቤተሰብ ያጋሩ' }
    return `<button class="card tap row" ${act}><span class="ib" style="width:36px;height:36px">${icon(ic)}</span><span class="grow" style="font-weight:700;font-size:14px">${esc(label)}</span>${icon('next')}</button>`;
  }).join('');

  // ---------- screens
  const SCR = {};

  // onboarding
  const steps = () => D().onboarding.steps;
  const stepOf = k => steps().find(s => s.key === k);
  const ORDER = ['role', 'stage', 'age', 'child', 'challenges', 'city', 'center', 'account', 'verify', 'ready'];
  const progress = k => { const i = ORDER.indexOf(k); const n = 8; return `<span class="prog grow" role="progressbar" aria-valuenow="${Math.min(i + 1, n)}" aria-valuemax="${n}"><i style="width:${Math.min(100, (i + 1) / n * 100)}%"></i></span>` };
  const obTop = k => `<div class="top"><button class="ib" data-act="back" aria-label="back">${icon('back')}</button>${progress(k)}${langT()}</div>`;
  const obHead = st => `<h2 class="h1">${esc(L(st.q))}</h2><p class="sub">${esc(L(st.help))}</p>${st.audio ? listenBtn('ob-' + st.key, L(st.q), 20) : ''}`;
  const nextOb = k => ORDER[ORDER.indexOf(k) + 1];

  SCR.welcome = () => {
    const l = D().onboarding.landing;
    return { body: `<div class="scroll" style="justify-content:center;gap:18px">${art('welcome-family')}<h1 class="h1" style="font-size:32px">${esc(L(l.headline))}</h1><p class="sub">${esc(L(l.sub))}</p>${langT()}<p class="note">${esc(L(l.credit))}</p></div>`,
      foot: `<button class="cta" data-go="ob" data-k="role">${esc(L(l.cta))}</button><button class="ghost" data-go="login">${esc(L(l.login))}</button>` };
  };
  SCR.ob = c => {
    const k = c.k, st = stepOf(k), a = S.ans; c.login = c.id === 'login';
    let body = '', ok = true;
    const ART = { role: { parent: 'role-parent', relative: 'role-grandparent', helper: 'role-helper', teacher: 'role-teacher' }, stage: { worried: 'stage-worried', unsure: 'questions', new: 'stage-new', while: 'stage-living', learn: 'course-2' } };
    if (k === 'role') {
      body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${st.options.map(o => `<button class="opt" style="flex-direction:column;align-items:stretch;text-align:center" data-act="pick" data-k="role" data-v="${o[0]}" aria-pressed="${a.role === o[0]}">${art(ART.role[o[0]], 'art')}<b>${esc(en() ? o[2] : o[1])}</b></button>`).join('')}</div>`;
    } else if (k === 'stage' || k === 'age' || k === 'city') {
      body = st.options.map(o => `<button class="opt" data-act="pick" data-k="${k}" data-v="${o[0]}" data-s="${esc(o.filter(Boolean).join(' ').toLowerCase())}" aria-pressed="${a[k] === o[0]}">${k === 'stage' ? thumb(ART.stage[o[0]], 60, 46) : ''}<span class="grow"><b>${esc(en() ? o[2] : o[1])}</b>${o[3] ? `<span class="en">${esc(o[3])}</span>` : ''}</span>${a[k] === o[0] ? icon('check') : ''}</button>`).join('');
      if (k === 'age') body += art('age');
      if (k === 'city') body = `<div class="field"><input data-act="cityq" placeholder="${esc(L(st.placeholder))}" aria-label="city"></div><div id="cities" style="display:flex;flex-direction:column;gap:10px">` + body + `</div>`;
    } else if (k === 'child') {
      body = `<div class="field"><label for="cn">${esc(L(st.field))}</label><input id="cn" data-bind="child.name" value="${esc(a.child.name)}" placeholder="${esc(L(st.placeholder))}"></div><b>${esc(L(st.gender_label))}</b><div class="chips">${st.options.map(o => `<button class="chip" data-act="sex" data-v="${o[0]}" aria-pressed="${a.child.sex === o[0]}">${esc(en() ? o[2] : o[1])}</button>`).join('')}</div>${st.note ? `<p class="note">${esc(L(st.note))}</p>` : ''}${st.privacy ? `<p class="note">🔒 ${esc(L(st.privacy))}</p>` : ''}${art('role-parent')}`;
    } else if (k === 'challenges') {
      body = `<div class="chips">${st.options.map(o => `<button class="chip" data-act="multi" data-v="${o[0]}" aria-pressed="${a.challenges.includes(o[0])}">${esc(en() ? o[2] : o[1])}</button>`).join('')}</div>`;
      ok = a.challenges.length > 0;
    } else if (k === 'center') {
      const good = /^guys/i.test(a.center || '');
      body = `<div class="field"><label for="cc">${esc(L(st.field))}</label><input id="cc" data-bind="center" value="${esc(a.center)}" style="font-size:22px;font-weight:700;letter-spacing:.1em"></div>${a.center ? (good ? `<div class="card row" style="background:var(--teal-t)">${thumb('help-center', 52, 40)}<span class="grow"><b>Guys Special Needs Center</b><span class="en">${esc(L(st.found).replace('{city}', cityName()))}</span></span></div>` : `<p class="note" style="color:var(--coral-s)">${esc(L(st.wrong))}</p>`) : ''}<p class="note">${esc(L(st.qr))}</p>${art('center-code')}`;
    } else if (k === 'account') {
      body = `<div class="field"><label for="pn">${esc(L(st.fields[0].slice(0, 2)))}</label><input id="pn" data-bind="parent" value="${esc(a.parent)}" placeholder="ሰላማዊት"><span class="note">${esc(en() ? st.fields[0][3] : st.fields[0][2])}</span></div>
        <div class="field"><label for="ph">${esc(L(st.fields[1].slice(0, 2)))}</label><div class="row"><span class="chip">+251</span><input id="ph" data-bind="phone" inputmode="tel" value="${esc(a.phone)}" placeholder="9X XXX XXXX"></div></div>
        <div class="card">${st.consents.map((c, i) => `<label class="row" style="align-items:flex-start;font-size:14px;line-height:1.5"><input type="checkbox" data-act="consent" data-v="${i}" ${S.consents[i] ? 'checked' : ''} style="width:20px;height:20px;margin-top:2px">${esc(L(c))}</label>`).join('')}</div>${art('account-safe')}`;
      ok = !!S.consents[0];
    } else if (k === 'verify') {
      if (S.otp == null || S.otp === '') S.otp = CFG.demo.otp || '';
      body = `${art('verify-sms')}<p class="note" style="text-align:center">${en() ? 'Code sent to' : 'ኮዱ የተላከው ወደ'} +251 ${esc(S.ans.phone || '9X XXX XXXX')}</p><div class="field"><input class="code" data-act="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="${esc(S.otp)}" aria-label="code"></div><p class="note" style="text-align:center"><a href="#" data-act="resend">${esc(L(st.resend).replace(/\{t\}|\d+:\d+/, '').replace(/\s+$/, '') || (en() ? 'Send again' : 'እንደገና ላክ'))}</a> · <a href="#" data-act="back">${esc(L(st.change))}</a></p><div class="card" style="background:var(--teal-t)">${esc(L(st.once))}</div><p class="note" style="text-align:center">${en() ? 'Demo: no SMS is sent; the code is filled in for you.' : 'ማሳያ፦ SMS አይላክም፤ ኮዱ ተሞልቶልዎታል።'}</p>`;
      ok = String(S.otp).length === 6;
    } else if (k === 'ready') {
      body = `<div class="hero-n" style="margin:-18px -18px 0;border-radius:0 0 26px 26px">${art('plan-ready')}<h2 class="h1" style="color:#fff">${esc(L(st.q))}</h2><p class="sub">${esc(L(st.help))}</p></div><b>${esc(L(st.list_label))}</b>${plan().slice(0, 3).map(id => { const c = course(id); return `<div class="card row">${thumb('course-' + id, 64, 50)}<span class="grow"><b>${esc(F(c, 'title'))}</b><span class="en">${c.lessons_count} ${en() ? 'lessons' : 'ትምህርቶች'} · ${c.minutes} ${en() ? 'min' : 'ደቂቃ'}</span></span></div>` }).join('')}<div class="card row" style="background:var(--mustard-t)">${icon('now')}<span class="grow" style="font-size:14px">${esc(L(st.now_tip))}</span></div>${G.isStandalone() ? '' : `<button class="card tap row" data-act="install">${icon('download')}<span class="grow" style="font-size:14px;font-weight:700">${esc(L(st.install))}</span>${icon('next')}</button>`}`;
    }
    const isLast = k === 'ready';
    const cta = isLast ? L(st.cta) : (st.cta ? L(st.cta).replace('{n}', a.challenges.length) : (en() ? 'Continue' : 'ቀጥል'));
    const skip = (k === 'center' || k === 'child') ? `<button class="ghost" data-act="obnext" data-k="${k}">${en() ? 'Skip' : 'ዝለል'}</button>` : (k === 'account' ? `<button class="ghost" data-act="obnext" data-k="verify">${esc(L(st.skip))}</button>` : '');
    return { body: (k === 'ready' ? '' : obTop(k)) + `<div class="scroll">${k === 'ready' ? '' : obHead(st)}${body}</div>`, foot: `<button class="cta" ${ok ? '' : 'disabled'} data-act="${isLast || (k === 'verify' && c.login) ? 'finish' : 'obnext'}" data-k="${k}">${esc(cta)}</button>${skip}` };
  };
  SCR.login = () => {
    const st = stepOf('login');
    return { body: top('') + `<div class="scroll"><h2 class="h1">${esc(L(st.q))}</h2><p class="sub">${esc(L(st.help))}</p><div class="card" style="background:var(--teal-t)"><b>${esc(L(st.stay))}</b></div><div class="field"><label for="lp">${en() ? 'Phone number' : 'ስልክ ቁጥር'}</label><input id="lp" data-bind="phone" inputmode="tel" value="${esc(S.ans.phone)}" placeholder="9X XXX XXXX"></div>${art('account-safe')}</div>`,
      foot: `<button class="cta" data-go="ob" data-k="verify" data-id="login">${en() ? 'Send me a code' : 'ኮድ ላክልኝ'}</button><button class="ghost" data-go="ob" data-k="role">${esc(L(st.new))}</button>` };
  };

  // home
  SCR.home = () => {
    const h = new Date().getHours(), g = rowMap('home', 'home');
    const greet = en() ? (h < 12 ? 'Good morning' : h < 18 ? 'Hello' : 'Good evening') : (h < 12 ? 'እንደምን አደሩ' : h < 18 ? 'ሰላም' : 'እንደምን አመሹ');
    const tips = D().daily_tips; const tagsFor = { speech: 'communication', instructions: 'communication', meltdown: 'behaviour', sleep: 'routine', eating: 'routine', toilet: 'routine', play: 'play', tired: 'parent', stigma: 'family', family: 'family' };
    const want = S.ans.challenges.map(c => tagsFor[c]).filter(Boolean);
    const day = Math.floor(Date.now() / 864e5); const pool = tips.filter(t => want.some(w => (t.tag || '').includes(w))); const tip = (pool.length ? pool : tips)[day % (pool.length || tips.length)];
    const { c, l } = nextLesson();
    const ev = rows('other', '10-7-center-events-6-3-sample-events')[0] || [];
    const safetyPinned = S.ans.challenges.some(x => x === 'wander' || x === 'selfharm');
    const notes = S.ans.stage === 'worried' || S.ans.stage === 'unsure';
    const card = r => g[r] ? (en() ? g[r][2] : g[r][1]) : '';
    const doneN = c.lessons.filter(x => isDone(x.id)).length;
    const body = `<div class="top"><span class="grow"><span class="note">${new Date().toLocaleDateString(en() ? 'en-GB' : 'am-ET', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1 style="font-size:22px">${esc(greet)} ${esc(parent())}</h1></span>${langT()}<button class="ib" data-go="profile" aria-label="Profile">${icon('user')}</button></div>
    <div class="scroll">
      <button class="card tap row" data-tab="now" style="background:var(--coral-t);border-color:transparent">${thumb('help-now', 70, 58)}<span class="grow"><b style="font-size:16px">${esc(P(card('Help now').split(' · ')[0]))}</b><span class="en">${esc(P(card('Help now').split(' · ')[1] || ''))}</span></span>${icon('next')}</button>
      <div class="card" style="background:var(--blue);color:#fff;border:0"><div class="row"><span class="grow" style="font-size:12px;font-weight:700;color:#FFD978">${en() ? 'Continue' : 'ይቀጥሉ'} · ${esc(F(c, 'title'))}</span><span style="font-size:12px">${doneN} ${en() ? 'of' : 'ከ'} ${c.lessons.length}</span></div><b style="font-size:17px">${esc(F(l, 'title'))}</b><span class="prog" style="background:rgba(255,255,255,.25)"><i style="width:${doneN / c.lessons.length * 100}%;background:#FFC23D"></i></span><button class="cta" data-go="lesson" data-id="${l.id}">▶ ${en() ? 'Listen' : 'አዳምጥ'} · ${l.minutes} ${en() ? 'min' : 'ደቂቃ'}</button></div>
      <div class="card row" style="align-items:flex-start;background:var(--mustard-t);border-color:transparent">${thumb('tip-sara', 60, 52)}<span class="grow"><b style="font-size:13px;color:var(--mustard-s)">${en() ? "Today's tip from Sara" : 'የዛሬ ምክር ከሳራ'}</b><span style="display:block;font-size:15px;line-height:1.55;margin-top:4px">${esc(P(en() ? tip.en : tip.am))}</span></span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${tile('#079280', `${icon('findhelp')}<span>${en() ? 'Find help' : 'እርዳታ ፈልግ'}</span>`, 'data-tab="help"')}${tile('#E2492D', `${icon('doctor')}<span>${en() ? 'Ask the doctor' : 'ሐኪሙን ምን ልጠይቅ'}</span>`, 'data-go="doctor"')}${tile('#B87800', `${icon('questions')}<span>${en() ? 'Questions' : 'ጥያቄዎችና መልሶች'}</span>`, 'data-tab="questions"')}</div>
      ${safetyPinned ? `<button class="card tap row" data-go="safety" style="border-color:var(--coral)">${icon('safety')}<span class="grow"><b>${esc(P(card('Safety').split(' · ')[0]))}</b><span class="en">${esc(P(card('Safety').split(' · ')[1] || ''))}</span></span>${icon('next')}</button>` : ''}
      ${notes ? `<button class="card tap row" data-go="signs">${thumb('signs', 56, 44)}<span class="grow"><b>${esc(P(card('Notes')))}</b></span>${icon('next')}</button>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="card tap" data-go="path">${art('path')}<b>${en() ? 'My path' : 'መንገዴ'}</b><span class="note">${en() ? '4 weeks · 5 min a day' : '4 ሳምንታት · በቀን 5 ደቂቃ'}</span></button><button class="card tap" data-go="mychild">${art('my-child')}<b>${en() ? 'My child' : 'ልጄ'} · ${esc(name())}</b><span class="note">${S.logs.length} ${en() ? 'notes' : 'ማስታወሻዎች'}</span></button></div>
      <button class="card tap row" data-go="log">${icon('notes')}<span class="grow"><b>${en() ? 'Write down today' : 'ዛሬን ይጻፉ'}</b><span class="en">${en() ? 'A small win or a hard moment' : 'ትንሽ ድል ወይም ከባድ ጊዜ'}</span></span>${icon('next')}</button>
      ${ev.length ? `<button class="card tap row" data-go="event" data-i="0">${thumb('event-coffee', 64, 50)}<span class="grow"><b>${esc(en() ? ev[2] : ev[1])}</b><span class="en">${esc(ev[3])} · ${esc(ev[4])} · ${en() ? 'Free' : 'ነጻ'}</span></span></button>` : ''}
    </div>`;
    return { body, nav: 'home' };
  };

  // courses
  SCR.courses = c => {
    const f = c.f || 'all', q = (c.q || '').toLowerCase(), mine = plan();
    let list = D().courses.slice();
    if (f === 'mine') list = list.filter(x => mine.includes(x.id));
    if (f === 'progress') list = list.filter(x => x.lessons.some(l => isDone(l.id)) && !x.lessons.every(l => isDone(l.id)));
    if (q) list = list.filter(x => (x.title_am + x.title_en + x.card_am + x.card_en + x.lessons.map(l => l.title_am + l.title_en).join(' ')).toLowerCase().includes(q));
    const fl = [['all', en() ? 'All' : 'ሁሉም'], ['mine', en() ? 'For you' : 'ለእርስዎ'], ['progress', en() ? 'In progress' : 'እየተማሩ ያሉ']];
    return { body: `<div class="top"><h1>${en() ? 'Courses' : 'ትምህርቶች'}</h1><span class="note">${D().courses.length} ${en() ? 'courses' : 'ኮርሶች'} · ${D().courses.reduce((a, x) => a + x.lessons.length, 0)} ${en() ? 'lessons' : 'ትምህርቶች'}</span></div>
      <div class="scroll"><div class="field"><input data-act="cq" value="${esc(c.q || '')}" placeholder="${en() ? 'Search courses: sleep, speech…' : 'ኮርስ ፈልግ፦ እንቅልፍ፣ ንግግር…'}" aria-label="search"></div>
      <div class="chips">${fl.map(([k, lb]) => `<button class="chip" data-act="cf" data-v="${k}" aria-pressed="${f === k}">${lb}</button>`).join('')}</div>
      ${list.map(x => { const dn = x.lessons.filter(l => isDone(l.id)).length; return `<button class="card tap" data-go="course" data-id="${x.id}"><div class="row" style="align-items:flex-start">${thumb('course-' + x.id, 84, 66)}<span class="grow"><b style="font-size:16px">${esc(F(x, 'title'))}</b><span class="en" style="font-size:13px">${esc(F(x, 'card'))}</span></span></div><div class="row"><span class="pill ${mine.includes(x.id) ? 'm' : ''}">${mine.includes(x.id) ? (en() ? 'For you' : 'ለእርስዎ') : (en() ? 'Course' : 'ኮርስ')} ${x.id}</span><span class="note grow">${x.lessons.length} ${en() ? 'lessons' : 'ትምህርቶች'} · ${x.minutes} ${en() ? 'min' : 'ደቂቃ'}</span><span class="note">${dn}/${x.lessons.length}</span></div>${dn ? `<span class="prog"><i style="width:${dn / x.lessons.length * 100}%"></i></span>` : ''}</button>` }).join('') || `<p class="empty">${en() ? 'No course matches.' : 'የሚመሳሰል ኮርስ የለም።'}</p>`}</div>`, nav: 'courses' };
  };
  SCR.course = c => {
    const x = course(c.id), dn = x.lessons.filter(l => isDone(l.id)).length;
    const nxt = x.lessons.find(l => !isDone(l.id)) || x.lessons[0];
    return { body: `<div class="scroll nopad"><div class="hero-n">${'<div class="row"><button class="ib" data-act="back" aria-label="back" style="background:rgba(255,255,255,.15);border:0;color:#fff">' + icon('back') + '</button><span class="grow"></span><button class="chip" data-act="saveoff" data-id="' + x.id + '" style="background:rgba(255,255,255,.15);border:0;color:#fff">' + (S.offline.includes(x.id) ? '✓ ' + (en() ? 'Saved offline' : 'ያለ ኢንተርኔት ተቀምጧል') : icon('download').replace('<svg', '<svg width="14" height="14"') + ' ' + (en() ? 'Save offline' : 'ያለ ኢንተርኔት አስቀምጥ')) + '</button></div>'}
      ${art('course-' + x.id)}<span style="font-size:12px;font-weight:700;color:#FFD978">${en() ? 'Course' : 'ኮርስ'} ${x.id} · ${esc(x.for)}</span><h1 class="h1" style="color:#fff">${esc(F(x, 'title'))}</h1><p class="sub">${esc(F(x, 'card'))}</p><span class="prog" style="background:rgba(255,255,255,.2)"><i style="width:${dn / x.lessons.length * 100}%;background:#FFC23D"></i></span><span class="note" style="color:#fff">${dn} ${en() ? 'of' : 'ከ'} ${x.lessons.length} · ${x.minutes} ${en() ? 'min' : 'ደቂቃ'}</span></div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px"><div class="card list">${x.lessons.map((l, i) => `<button class="li" data-go="lesson" data-id="${l.id}"><span class="num" style="${isDone(l.id) ? 'background:var(--teal-t);color:var(--teal-s)' : ''}">${isDone(l.id) ? '✓' : i + 1}</span><span class="grow"><b style="font-size:15px">${esc(F(l, 'title'))}</b><span class="en">${esc(l.media)} · ${l.minutes} ${en() ? 'min' : 'ደ'}</span></span>${icon('play')}</button>`).join('')}</div></div></div>`,
      foot: `<button class="cta" data-go="lesson" data-id="${nxt.id}">▶ ${dn ? (en() ? 'Continue' : 'ይቀጥሉ') : (en() ? 'Start' : 'ጀምር')} · ${esc(F(nxt, 'title'))}</button>` };
  };
  SCR.lesson = c => {
    const l = lessonById(c.id), x = course(c.id.split('.')[0]), i = x.lessons.indexOf(l);
    const pics = l.pictures.length ? l.pictures : [{ n: 1, am: F(l, 'title'), en: l.title_en }];
    const pi = Math.min(c.pi || 0, pics.length - 1), pic = pics[pi];
    const tot = l.minutes * 60, mine = AU.id === 'lesson-' + l.id, pt = mine ? AU.t : 0, pdur = mine ? AU.dur : tot;
    const pct = pdur ? pt / pdur : 0, picArt = l.id === '1.3' ? 'lesson-tell-family' : (l.video ? 'course-3' : 'course-' + x.id);
    const mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    return { body: `<div class="top"><button class="ib" data-act="back" aria-label="close">${icon('close')}</button><span class="steps grow" style="grid-template-columns:repeat(${x.lessons.length},1fr)">${x.lessons.map((_, k) => `<i style="background:${k <= i ? 'var(--blue)' : 'var(--line)'}"></i>`).join('')}</span>${langT()}</div>
      <div class="scroll"><span class="note" style="font-weight:700">${en() ? 'Lesson' : 'ትምህርት'} ${l.id} · ${esc(F(x, 'title'))}</span>
      <div style="position:relative">${art(picArt)}<span class="pill" style="position:absolute;left:10px;top:10px;background:rgba(15,59,84,.85);color:#fff">${l.video ? '▶ ' + (en() ? 'Video' : 'ቪዲዮ') : pi + 1 + ' / ' + pics.length}</span></div>
      <div class="card" style="background:var(--mustard-t);border:0"><b style="font-size:17px">${esc(P(en() ? pic.en : pic.am))}</b>${!en() && pic.en ? `<span class="en">${esc(pic.en)}</span>` : ''}${pics.length > 1 ? `<div class="row"><button class="chip" data-act="pic" data-v="${Math.max(0, pi - 1)}" ${pi === 0 ? 'disabled style="opacity:.35"' : ''} aria-label="previous">‹</button><span class="grow note" style="text-align:center">${en() ? 'Picture cards change with the audio' : 'ሥዕሎቹ ከድምፁ ጋር ይቀየራሉ'}</span><button class="chip" data-act="pic" data-v="${Math.min(pics.length - 1, pi + 1)}" ${pi === pics.length - 1 ? 'disabled style="opacity:.35"' : ''} aria-label="next">›</button></div>` : ''}</div>
      ${l.video ? `<div class="card" style="font-size:14px">${icon('video').replace('<svg', '<svg width="18" height="18"')} ${esc(l.video)}</div>` : ''}
      <h2 class="h1" style="font-size:22px">${esc(F(l, 'title'))}</h2>
      <div class="card"><div class="player"><button class="play" data-act="listen" data-id="lesson-${l.id}" data-label="${esc(F(l, 'title'))}" data-dur="${tot}" aria-label="play">${icon(mine && AU.on ? 'pause' : 'play')}</button><span class="bars" data-au-bars>${Array.from({ length: 34 }, (_, k) => `<i class="${k / 34 < pct ? 'on' : ''}" style="height:${30 + 60 * Math.abs(Math.sin(k * 1.7))}%"></i>`).join('')}</span></div><div class="row note"><span class="grow">${en() ? "Sara's voice" : 'የሳራ ድምፅ'} · <span ${mine ? 'data-au-time' : ''}>${mm(pt)} / ${mm(pdur)}</span></span><span>${esc(l.media)}</span></div></div>
      <details class="card" ${c.open ? 'open' : ''}><summary style="font-weight:700;cursor:pointer">${en() ? 'Read the script' : 'ጽሑፉን ያንብቡ'}</summary><p style="font-size:16px;line-height:1.7;margin:6px 0 0">${esc(P(F(l, 'script')))}</p></details>
      <div class="card"><b>${en() ? 'Key points' : 'ዋና ነጥቦች'}</b>${l.key_points.map(k => `<div class="row" style="align-items:flex-start;font-size:15px">${icon('check')}<span class="grow">${esc(P(en() && k.en ? k.en : k.am))}${!en() && k.en ? `<span class="en">${esc(k.en)}</span>` : ''}</span></div>`).join('')}</div>
      <div class="card" style="background:var(--teal-t);border:0"><b style="color:var(--teal-s)">${en() ? 'Try today' : 'ዛሬ ይሞክሩት'}</b><span style="font-size:15px;line-height:1.55">${esc(P(F(l, 'try')))}</span></div></div>`,
      foot: `<button class="cta" data-act="lessondone" data-id="${l.id}">${en() ? 'I listened' : 'ጨርሻለሁ'}</button>` };
  };
  SCR.lessondone = c => {
    const l = lessonById(c.id), x = course(c.id.split('.')[0]), i = x.lessons.indexOf(l), next = x.lessons[i + 1];
    const heads = en() ? ['Well done, ' + parent() + '!', 'Great work, ' + parent() + '!', 'One step forward!', 'Good work for ' + name() + '!'] : [`በጣም ጥሩ፣ ${parent()}!`, `ጎበዝ፣ ${parent()}!`, 'አንድ እርምጃ ወደፊት!', `ለ${name()} ጥሩ ሰርተዋል!`];
    return { body: top('', { close: true }) + `<div class="scroll">${art('lesson-done')}<h2 class="h1" style="text-align:center">${esc(heads[S.done.length % 4])}</h2><p class="sub" style="text-align:center">${en() ? `Lesson ${i + 1} of ${x.lessons.length} done` : `ትምህርት ${i + 1} ከ ${x.lessons.length} ተጠናቀቀ`}</p>
      <div class="card" style="background:var(--mustard-t);border:0"><b style="color:var(--mustard-s)">${en() ? 'Try it today · 5 min' : 'ዛሬ ይሞክሩት · 5 ደቂቃ'}</b><span style="font-size:15px;line-height:1.55">${esc(P(F(l, 'try')))}</span><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="ghost" data-act="remind" data-id="${l.id}">${en() ? 'Remind me tonight' : 'ማታ አስታውሰኝ'}</button><button class="ghost" data-act="sharelesson" data-id="${l.id}">${en() ? 'Share with family' : 'ለቤተሰብ አጋራ'}</button></div></div>
      <b>${en() ? 'How was this lesson?' : 'ይህ ትምህርት እንዴት ነበር?'}</b><div class="chips">${[['ok', en() ? 'It helped' : 'ረድቶኛል'], ['hard', en() ? 'It was hard' : 'ከብዶኛል'], ['q', en() ? 'I have a question' : 'ጥያቄ አለኝ']].map(([k, lb]) => `<button class="chip" data-act="fb" data-v="${k}" aria-pressed="${c.fb === k}">${lb}</button>`).join('')}</div>
      ${c.fb === 'hard' ? `<div class="card">${en() ? "That's okay. Listen again tomorrow, or send us your question." : 'ምንም አይደለም። ነገ እንደገና ያዳምጡት፣ ወይም ጥያቄዎን ይላኩልን።'}</div>` : ''}</div>`,
      foot: next ? `<button class="cta" data-go="lesson" data-id="${next.id}" data-replace="1">${en() ? 'Next' : 'ቀጣይ'}: ${esc(F(next, 'title'))}</button><button class="ghost" data-tab="home">${en() ? "That's enough for today" : 'ለዛሬ በቂ ነው'}</button>` : `<button class="cta" data-go="coursedone" data-id="${x.id}" data-replace="1">${en() ? 'Finish the course' : 'ኮርሱን ጨርስ'}</button>` };
  };
  SCR.coursedone = c => {
    const x = course(c.id), nx = plan().map(course).find(y => y.id !== x.id && !y.lessons.every(l => isDone(l.id))) || course(x.id % 10 + 1);
    return { body: `<div class="scroll nopad"><div class="hero-n" style="padding-top:22px"><button class="ib" data-tab="courses" aria-label="close" style="background:rgba(255,255,255,.15);border:0;color:#fff">${icon('close')}</button>${art('course-done')}<h1 class="h1" style="color:#fff">${en() ? `You finished "${esc(x.title_en)}"!` : `«${esc(x.title_am)}»ን ጨርሰዋል!`}</h1><span class="sub">${x.lessons.length} ${en() ? 'lessons' : 'ትምህርቶች'}</span></div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px"><div class="card"><b>${en() ? "Sara's message" : 'የሳራ መልዕክት'}</b><span style="font-size:15px;line-height:1.6">${esc(P(F(x, 'done')))}</span></div>
      <b>${en() ? 'Next for' : 'ቀጣዩ ለ'} ${esc(name())}</b><button class="card tap row" data-go="course" data-id="${nx.id}">${thumb('course-' + nx.id, 64, 50)}<span class="grow"><b>${esc(F(nx, 'title'))}</b><span class="en">${nx.lessons.length} ${en() ? 'lessons' : 'ትምህርቶች'}</span></span></button>
      <button class="card tap row" data-act="shareapp">${icon('share')}<span class="grow"><b>${en() ? 'Know another parent?' : 'ሌላ ወላጅ ያውቃሉ?'}</b><span class="en">${en() ? 'Share Gasha on Telegram' : 'ጋሻን በቴሌግራም ያጋሩ'}</span></span></button></div></div>`,
      foot: `<button class="cta" data-tab="home">${en() ? 'Back to home' : 'ወደ ዋና ገጽ'}</button>` };
  };
  SCR.shared = c => {
    const l = lessonById(c.id || '2.1') || lessonById('2.1'), r = rowMap('other', '10-8-shared-lesson-page-2-8'), v = k => r[k] ? P(en() ? r[k][2] : r[k][1]) : '';
    return { body: top(en() ? 'What family sees' : 'ቤተሰብ የሚያየው') + `<div class="scroll"><div class="card" style="background:var(--navy);color:#fff;border:0"><span class="note" style="color:#FFD978">${esc(v('Top'))}</span><b style="font-size:20px">${esc(F(l, 'title'))}</b></div>${art('course-2')}<div class="card"><div class="player"><button class="play" data-act="listen" data-id="lesson-${l.id}" data-label="${esc(F(l, 'title'))}" data-dur="${l.minutes * 60}" aria-label="play">${icon(AU.id === 'lesson-' + l.id && AU.on ? 'pause' : 'play')}</button><span class="grow"><b>${esc(v('Audio').replace('{min}', l.minutes))}</b></span></div></div>${l.key_points.map((k, i) => `<div class="row" style="align-items:flex-start"><span class="num">${i + 1}</span><span class="grow" style="font-size:15px">${esc(P(en() ? k.en : k.am))}</span></div>`).join('')}<div class="card" style="background:var(--mustard-t);border:0">${esc(v('Help box'))}</div><div class="card"><b>${en() ? 'Telegram message' : 'የቴሌግራም መልዕክት'}</b><span class="note">${esc(v('Telegram share text').replace('{link}', G.shareLink('shared?id=' + l.id)))}</span>${S.onboarded ? `<button class="ghost" data-act="sharelesson" data-id="${l.id}">${icon('share')} ${en() ? 'Send this to family' : 'ለቤተሰብ ላክ'}</button>` : ''}</div></div>`,
      foot: `<button class="cta" data-act="getapp">${esc(v('CTA').split(' · ')[0])}</button><span class="note" style="text-align:center">${esc(v('CTA').split(' · ')[1] || '')}</span>` };
  };

  // right now
  SCR.now = c => {
    const pick = S.ans.challenges.map(x => CH_NOW[x]).find(id => id && id > 7) || 8;
    const shown = D().right_now.filter(s => s.id <= 7 || s.id === pick);
    const tileOf = s => tile(COL[s.colour] || '#1C5FAA', `<img src="art/${NOW_ART[s.id]}.svg" alt="">${esc(F(s, 'tile'))}`, `data-go="calm" data-id="${s.id}"`);
    return { body: `<div class="scroll"><button class="card tap row" data-go="safety" style="background:var(--coral-t);border-color:transparent;color:var(--coral-s)">${icon('alert')}<b class="grow" style="font-size:14px">${en() ? 'Is your child hurt or lost? Emergency' : 'ልጁ ተጎድቷል ወይም ጠፍቷል? አስቸኳይ'}</b>${icon('next')}</button>
      <h1 class="h1">${en() ? 'What is happening right now?' : 'አሁን ምን እየሆነ ነው?'}</h1><p class="sub">${en() ? 'Tap one. We will guide you step by step.' : 'አንዱን ይጫኑ። ደረጃ በደረጃ እንመራዎታለን።'}</p>
      <button class="card tap row" data-go="calm" data-id="0" style="background:var(--navy);color:#fff;border:0">${icon('breathe')}<span class="grow"><b>${esc(RT('now', 'calm-yourself-first-3-2', 'Title'))}</b><span class="en" style="color:#cfe">${en() ? '30 second breathing' : '30 ሰከንድ የትንፋሽ ልምምድ'}</span></span></button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${shown.map(tileOf).join('')}</div>
      <button class="ghost" data-go="allnow">${en() ? 'Other situations' : 'ሌሎች ሁኔታዎች'} (${D().right_now.length - shown.length})</button></div>`, nav: 'now' };
  };
  SCR.allnow = () => ({ body: top(en() ? 'All 16 situations' : 'ሁሉም 16 ሁኔታዎች') + `<div class="scroll">${D().right_now.map(s => `<button class="card tap row" data-go="calm" data-id="${s.id}">${thumb(NOW_ART[s.id], 70, 52)}<span class="grow"><b>${s.id} · ${esc(F(s, 'tile'))}</b>${!en() ? `<span class="en">${esc(s.tile_en)}</span>` : ''}</span>${icon('next')}</button>`).join('')}</div>` });
  let breath = { timer: null, ph: 0, round: 1, left: 4 };
  SCR.calm = c => {
    const s = situation(c.id), m = rowMap('now', 'calm-yourself-first-3-2'), v = k => m[k] ? P(en() ? m[k][2] : m[k][1]) : '';
    const phases = v('Ring labels').split(' · '); const ph = breath.ph;
    const direct = s && (s.id === 7 || s.id === 9);
    if (direct) { setTimeout(() => replace('step', { id: s.id, n: 0 }), 0); return { body: '' } }
    return { cls: 'dark', body: `<div class="scroll" style="background:var(--navy);color:#fff;text-align:center"><div class="row"><button class="ib" data-act="back" aria-label="close" style="background:rgba(255,255,255,.15);border:0;color:#fff">${icon('close')}</button><span class="grow"></span>${langT()}</div>
      <h1 class="h1" style="color:#fff">${esc(v('Title'))}</h1><p class="sub" style="color:#cfe">${esc(v('Sub'))}</p>
      <div class="breath" id="breath" style="transform:scale(${ph === 0 ? 1.08 : ph === 1 ? 1.08 : .86})"><b style="font-size:24px">${esc(phases[ph] || '')}</b><span>${breath.left} ${en() ? 's' : 'ሰከንድ'}</span></div>
      <p class="note" style="color:#cfe">${esc(v('Counter').replace('{n}', breath.round))} · ${esc(v('Pattern'))}</p>
      <div class="card" style="background:rgba(255,255,255,.08);border:0;color:#fff;text-align:left;font-size:14px;line-height:1.6">${listenBtn('calm', v('Title'), 30, 'background:rgba(255,255,255,.15);color:#fff;border:0')}${esc(v("Sara's audio"))}</div></div>`,
      foot: `<button class="cta" data-act="${s ? 'tosteps' : 'back'}" data-id="${s ? s.id : ''}">${esc(v('Button'))}</button><button class="ghost" data-act="${s ? 'tosteps' : 'back'}" data-id="${s ? s.id : ''}">${esc(v('Skip link'))}</button>`, after: startBreath };
  };
  function startBreath() {
    clearInterval(breath.timer); const dur = [4, 2, 6];
    breath.timer = setInterval(() => {
      if (cur().r !== 'calm') { clearInterval(breath.timer); breath = { timer: null, ph: 0, round: 1, left: 4 }; return }
      breath.left--; if (breath.left <= 0) { breath.ph = (breath.ph + 1) % 3; if (breath.ph === 0) breath.round = breath.round % 4 + 1; breath.left = dur[breath.ph] }
      const el = document.getElementById('breath'); if (el) { const m = rowMap('now', 'calm-yourself-first-3-2'); const phases = P(en() ? m['Ring labels'][2] : m['Ring labels'][1]).split(' · '); el.style.transform = `scale(${breath.ph === 2 ? .86 : 1.08})`; el.innerHTML = `<b style="font-size:24px">${esc(phases[breath.ph])}</b><span>${breath.left} ${en() ? 's' : 'ሰከንድ'}</span>` }
    }, 1000);
  }
  SCR.step = c => {
    const s = situation(c.id), n = +c.n || 0, st = s.steps[n], last = n === s.steps.length - 1, col = COL[s.colour] || '#E2492D';
    const T = k => P(en() && st[k + '_en'] ? st[k + '_en'] : st[k + '_am']);
    return { body: `<div class="scroll" style="background:${col};color:#fff"><div class="row"><button class="ib" data-tab="now" aria-label="close" style="background:rgba(255,255,255,.18);border:0;color:#fff">${icon('close')}</button><span class="steps grow" style="grid-template-columns:repeat(${s.steps.length},1fr)">${s.steps.map((_, k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span><b>${n + 1}/${s.steps.length}</b>${langT()}</div>
      <span style="font-weight:700;color:#FFE3B3">${esc(F(s, 'tile'))}</span>
      ${n === 0 ? `<div class="card" style="background:rgba(255,255,255,.14);border:0;color:#fff;font-size:15px;line-height:1.55">${listenBtn('now-' + s.id, F(s, 'tile'), 25, 'background:rgba(255,255,255,.2);color:#fff;border:0')}${esc(F(s, 'sara'))}</div>` : ''}
      <div class="card" style="color:var(--ink);gap:12px;padding:16px">${n === 0 ? art(NOW_ART[s.id]) : ''}<h2 class="h1" style="font-size:22px">${esc(T('title'))}</h2><p style="margin:0;font-size:16px;line-height:1.6">${esc(T('do_what'))}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="do" style="background:var(--teal-t)"><b style="color:var(--teal-s);display:block">${en() ? 'Do' : 'ያድርጉ'}</b>${esc(T('do'))}</div><div class="do" style="background:var(--coral-t)"><b style="color:var(--coral-s);display:block">${en() ? "Don't" : 'አያድርጉ'}</b>${esc(T('dont'))}</div></div></div>
      ${s.id === 7 || s.id === 9 ? `<a class="card" href="${G.tel(s.id === 7 ? CFG.emergency.ambulance : CFG.emergency.police)}" style="background:rgba(255,255,255,.14);border:0;color:#fff">${icon('call')}<span class="grow"><b style="font-size:22px">${s.id === 7 ? CFG.emergency.ambulance : CFG.emergency.police}</b><span class="en" style="color:#fff">${s.id === 7 ? (en() ? 'Call the ambulance' : 'አምቡላንስ ይደውሉ') : (en() ? 'Call the police' : 'ፖሊስ ይደውሉ')}</span></span></a>` : ''}</div>`,
      foot: `<button class="cta" data-act="${last ? 'toafter' : 'nextstep'}" data-id="${s.id}" data-n="${n}">${last ? (en() ? 'Done, next' : 'አድርጌዋለሁ፣ ቀጣይ') : (en() ? 'I did it, next' : 'አድርጌዋለሁ፣ ቀጣይ')}</button><button class="ghost" data-go="safety" style="color:var(--coral-s);border-color:var(--coral)">${en() ? 'Getting worse / hurting himself' : 'እየባሰ ነው / ራሱን እየጎዳ ነው'}</button>` };
  };
  SCR.after = c => {
    const s = situation(c.id), m = rowMap('now', 'after-screen-3-4-shared-parts'), v = k => m[k] ? P(en() ? m[k][2] : m[k][1]) : '';
    const opts = v('Options').split(' · ');
    const care = en() ? s.after_en : s.after_am;
    return { body: top('', { close: true }) + `<div class="scroll">${art('now-after')}<h2 class="h1">${esc(v('Headline'))}</h2><p class="sub">${esc(v('Question'))}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${opts.map((o, i) => `<button class="opt" style="justify-content:center;min-height:52px" data-act="result" data-v="${i}" aria-pressed="${c.res === i}">${esc(o)}</button>`).join('')}</div>
      ${c.res === 2 ? `<div class="card" style="background:var(--coral-t);border:0">${esc(v('If "Not calm"').split(' · ')[0])}<div class="row"><button class="ghost" data-act="tosteps" data-id="${s.id}">${esc(v('If "Not calm"').split(' · ')[1] || '')}</button><a class="ghost" href="${G.tel(CFG.center.phone)}">${icon('call')} ${esc(v('If "Not calm"').split(' · ')[2] || '')}</a></div></div>` : ''}
      <div class="card"><b>${esc(v('Section'))}</b>${care.map(x => `<div class="row" style="font-size:15px">• <span class="grow">${esc(P(x))}</span></div>`).join('')}</div>
      <div class="card" style="background:var(--mustard-t);border:0"><b>${en() ? 'Common triggers' : 'የተለመዱ ምክንያቶች'}</b><span style="font-size:14px;line-height:1.55">${esc(P(F(s, 'triggers')))}</span></div>
      ${s.prevent_lessons.map(id => { const l = lessonById(id); return l ? `<button class="card tap row" data-go="lesson" data-id="${id}">${thumb('course-' + id.split('.')[0], 56, 44)}<span class="grow"><span class="note">${en() ? 'Next time: prevent it' : 'በሚቀጥለው ቀድመው ይከላከሉ'}</span><b>${esc(F(l, 'title'))}</b><span class="en">${l.minutes} ${en() ? 'min' : 'ደ'}</span></span></button>` : '' }).join('')}
      ${s.faq.map(id => { const q = qa(id); return q ? `<button class="card tap row" data-go="answer" data-id="${id}">${icon('questions')}<span class="grow" style="font-size:14px;font-weight:700">${esc(F(q, 'q'))}</span></button>` : '' }).join('')}
      <div class="card note">${esc(v('Repeat card'))}</div></div>`,
      foot: `<button class="cta" data-tab="now">${esc(v('Buttons').split(' · ')[1] || 'Done')}</button>` };
  };
  SCR.safety = () => {
    const p = D().pages.safety, num = rows('safety', 'emergency-numbers');
    const sec = (k, ic) => { const s = p[k]; if (!s) return ''; return `<div class="card"><b class="row">${icon(ic)}${esc(s.title.split(' · ')[en() ? 0 : 1] || s.title)}</b>${(s.lists[0] || []).map((x, i) => `<div class="row" style="align-items:flex-start;font-size:15px"><span class="num" style="background:var(--coral-t);color:var(--coral-s)">${i + 1}</span><span class="grow">${esc(LB(x))}</span></div>`).join('')}</div>` };
    const chk = (p['safety-at-home-checklist-from-lesson-6-5'] || { lists: [[]] }).lists[0];
    return { body: top(en() ? 'Emergency and safety' : 'አስቸኳይ ሁኔታ') + `<div class="scroll"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${num.map((r, i) => { const n = G.strip(r[1]), isNum = /^\d+$/.test(n), fam = /set in Profile/.test(n), num_ = isNum ? n : fam ? S.family : CFG.center.phone;
        const href = (fam && !S.family) ? 'href="#" data-go="editprofile"' : `href="${G.tel(num_)}"`;
        return `<a class="card tap" ${href} style="text-decoration:none;background:${i === 0 ? '#C23A22' : i === 1 ? 'var(--navy)' : 'var(--surface)'};color:${i < 2 ? '#fff' : 'var(--ink)'};border:${i < 2 ? '0' : '1px solid var(--line)'}">${icon(isNum ? 'call' : fam ? 'user' : 'center')}<b style="font-size:${isNum ? 30 : 15}px">${esc(isNum ? n : fam ? (S.family || (en() ? 'Add a family number' : 'የቤተሰብ ስልክ ያስገቡ')) : centerName())}</b><span style="font-size:13px">${esc(P(en() ? r[3] : r[2]))}</span></a>` }).join('')}</div>
      <p class="note">${esc(LB(String(p['emergency-numbers'].paras[0] || '').replace(/^Footer: /, '').replace(/\s*Admin note:.*$/s, '')))}</p>
      ${sec('if-he-is-hurting-himself', 'hurt')}${sec('if-he-is-lost', 'wander')}${art('safety-lost')}${sec('if-he-has-a-seizure', 'alert')}${sec('if-he-swallowed-something', 'alert')}
      <div class="card"><b>${en() ? 'Make your home safe' : 'ቤትዎን ደህንነቱ የተጠበቀ ያድርጉ'}</b>${chk.map((x, i) => `<label class="row" style="font-size:15px"><input type="checkbox" data-act="chk" data-v="${i}" ${S.checklist[i] ? 'checked' : ''} style="width:20px;height:20px">${esc(LB(x))}</label>`).join('')}</div>
      <button class="card tap row" data-go="idcard">${thumb('safety-id', 60, 46)}<b class="grow">${en() ? "Child's ID card" : 'የልጁ መታወቂያ ካርድ'}</b>${icon('next')}</button></div>` };
  };
  SCR.idcard = () => {
    const t = LB((D().pages.safety['id-card-for-the-child-printable-from-pro'] || { paras: [''] }).paras[0]);
    return { body: top(en() ? 'ID card' : 'መታወቂያ ካርድ') + `<div class="scroll">${art('safety-id')}<div class="card print" style="border:2px solid var(--teal)"><div class="row"><span style="width:56px;height:56px;border-radius:28px;background:var(--teal-t);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px">${esc(name()[0])}</span><span class="grow"><b style="font-size:20px">${esc(name())}</b><span class="en">ጋሻ · Gasha</span></span></div><p style="font-size:16px;line-height:1.6;margin:0">${esc(P(t))}</p>${S.family ? `<b>${en() ? 'Family' : 'ቤተሰብ'}: ${esc(S.family)}</b>` : ''}<b>${esc(centerName())}: ${esc(CFG.center.phone)}</b></div><p class="note">${en() ? 'Print it, or keep a screenshot of it on the phone.' : 'ያትሙት ወይም ስክሪንሾቱን በስልክዎ ይያዙ።'}</p></div>`, foot: `<button class="cta" data-act="print">${icon('download')} ${en() ? 'Print the ID card' : 'መታወቂያ ካርዱን አትም'}</button>` };
  };

  // questions
  SCR.questions = () => {
    const Q = D().qa, mine = G.questions.filter(q => q.device === G.deviceId);
    return { body: `<div class="top"><h1>${en() ? 'Questions and answers' : 'ጥያቄዎችና መልሶች'}</h1>${langT()}</div><div class="scroll">
      <button class="card tap row" data-go="search">${icon('search')}<span class="grow muted">${en() ? 'Search: sleep, school, ትምህርት ቤት…' : 'ጥያቄ ፈልግ፦ እንቅልፍ፣ sleep፣ school…'}</span></button>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${Object.entries(Q.topics).map(([k, t], i) => `<button class="card tap" data-go="topic" data-id="${k}" style="background:${['var(--blue-t)', 'var(--teal-t)', 'var(--coral-t)', 'var(--mustard-t)'][i % 4]};border:0;padding:12px"><b>${esc(en() ? t.en : t.am)}</b><span class="en">${Q.questions.filter(q => q.topic === k).length} ${en() ? 'questions' : 'ጥያቄዎች'}</span></button>`).join('')}</div>
      <b>${en() ? 'Most asked' : 'በብዛት የተጠየቁ'}</b><div class="card list">${Q.most_asked.map((id, i) => { const q = qa(id); return `<button class="li" data-go="answer" data-id="${id}"><span class="num">${i + 1}</span><span class="grow" style="font-weight:700;font-size:15px">${esc(F(q, 'q'))}</span>${icon('next')}</button>` }).join('')}</div>
      ${mine.length ? `<b>${en() ? 'My questions' : 'የእኔ ጥያቄዎች'}</b>${mine.map(q => `<div class="card"><b style="font-size:15px">${esc(q.text)}</b>${q.answer ? `<div style="background:var(--teal-t);border-radius:12px;padding:10px;font-size:14px;line-height:1.55"><b>${en() ? 'Answer from Sara' : 'የሳራ መልስ'}</b><br>${esc(q.answer)}</div>` : `<span class="pill m" style="align-self:flex-start">${q.status === 'queued' ? (en() ? 'Will send when you are online' : 'ኢንተርኔት ሲገኝ ይላካል') : (en() ? 'Waiting for an expert' : 'ባለሙያ እስኪመልስ በመጠባበቅ ላይ')}</span><span class="note">${new Date(q.at).toLocaleDateString()}</span>`}</div>`).join('')}` : ''}
      <button class="card tap row" data-go="ask" style="border-style:dashed">${thumb('ask-sent', 60, 46)}<span class="grow"><b>${en() ? "Your question isn't here?" : 'ጥያቄዎ እዚህ የለም?'}</b><span class="en">${en() ? 'Send it; an expert answers for all parents.' : 'ይላኩልን፤ ባለሙያ መልሶ ለሁሉም ወላጆች ይጨመራል።'}</span></span></button></div>`, nav: 'questions' };
  };
  SCR.topic = c => {
    const t = D().qa.topics[c.id], qs = D().qa.questions.filter(q => q.topic === c.id);
    return { body: top(esc(en() ? t.en : t.am)) + `<div class="scroll">${art('questions')}<span class="note">${qs.length} ${en() ? 'questions parents ask' : 'ወላጆች የሚጠይቁት'}</span><div class="card list">${qs.map(q => `<button class="li" data-go="answer" data-id="${q.id}"><span class="num">${q.id}</span><span class="grow"><b style="font-size:15px">${esc(F(q, 'q'))}</b>${!en() ? `<span class="en">${esc(q.q_en)}</span>` : ''}</span><span class="note">${q.audio}</span></button>`).join('')}</div><button class="ghost" data-go="ask">${en() ? 'Ask a question' : 'ጥያቄ ይላኩ'}</button></div>` };
  };
  SCR.answer = c => {
    const q = qa(c.id), t = D().qa.topics[q.topic];
    return { body: top('', { right: langT() }) + `<div class="scroll"><span class="pill b" style="align-self:flex-start">${esc(en() ? t.en : t.am)} · ${q.id}</span><h2 class="h1" style="font-size:23px">${esc(F(q, 'q'))}</h2>
      <div class="card" style="background:var(--blue);color:#fff;border:0"><div class="player"><button class="play" style="background:var(--mustard);color:var(--navy)" data-act="listen" data-id="qa-${q.id}" data-label="${esc(F(q, 'q'))}" data-dur="${secs(q.audio)}" aria-label="play">${icon(AU.id === 'qa-' + q.id && AU.on ? 'pause' : 'play')}</button><span class="grow"><b>${en() ? "Sara's answer" : 'የሳራ መልስ'}</b><span class="en" style="color:#dfe">${en() ? 'Child psychologist' : 'የልጆች ሥነ-ልቦና ባለሙያ'} · ${q.audio}</span></span></div></div>
      <div class="card"><b style="font-size:19px">${esc(P(F(q, 'short')))}</b><p style="margin:0;font-size:16px;line-height:1.7">${esc(P(F(q, 'answer')))}</p></div>
      <b>${en() ? 'Next step' : 'ቀጣዩ እርምጃ'}</b>${nextStep(q.next_step)}
      <div class="card row"><span class="grow" style="font-weight:700">${en() ? 'Did this answer help?' : 'ይህ መልስ ረድቶዎታል?'}</span><button class="chip" data-act="helpful" data-id="${q.id}" data-v="y" aria-pressed="${S.helpful[q.id] === 'y'}">${en() ? 'Yes' : 'አዎ'}</button><button class="chip" data-act="helpful" data-id="${q.id}" data-v="n" aria-pressed="${S.helpful[q.id] === 'n'}">${en() ? 'No' : 'አይ'}</button></div>
      ${S.helpful[q.id] === 'n' ? `<button class="ghost" data-go="ask" data-text="${esc(F(q, 'q'))} · ">${en() ? 'What was missing? Tell us' : 'ምን ጎደለ? ይንገሩን'}</button>` : ''}
      <button class="ghost" data-act="shareanswer" data-id="${q.id}">${icon('share')} ${en() ? 'Share this answer' : 'ይህን መልስ አጋራ'}</button>
      <p class="note">${en() ? 'General information, not a diagnosis or treatment. Ask a doctor about your child\'s health.' : 'አጠቃላይ መረጃ ነው፤ ምርመራ ወይም ህክምና አይደለም። ስለ ልጅዎ ጤና ሐኪም ያማክሩ።'}</p></div>` };
  };
  SCR.search = c => {
    const q = (c.q || '').trim().toLowerCase();
    const res = q ? D().qa.questions.map(x => { const hay = [x.q_am, x.q_en, x.search.join(' ')].join(' ').toLowerCase(); const body = (x.answer_am + x.answer_en).toLowerCase(); return { x, s: (hay.includes(q) ? 3 : 0) + (x.search.some(w => w.toLowerCase() === q) ? 3 : 0) + (body.includes(q) ? 1 : 0) } }).filter(r => r.s).sort((a, b) => b.s - a.s).map(r => r.x) : [];
    const syn = q && res[0] ? res[0].search.find(w => w.toLowerCase() !== q && /[ሀ-፿]/.test(w) !== /[ሀ-፿]/.test(q)) : '';
    const crs = res[0] ? course(TOPIC_COURSE[res[0].topic]) : null;
    return { body: top(en() ? 'Search' : 'ፈልግ') + `<div class="scroll"><div class="field"><input id="sq" data-act="sq" value="${esc(c.q || '')}" placeholder="${en() ? 'Amharic or English' : 'በአማርኛ ወይም በእንግሊዝኛ'}" aria-label="search" autofocus></div>
      <div class="chips">${['እንቅልፍ', 'sleep', 'ትምህርት ቤት', 'ጸበል', 'ንግግር', 'vaccine'].map(w => `<button class="chip" data-act="sqset" data-v="${w}">${w}</button>`).join('')}</div>
      ${q ? (res.length ? `<p class="note">${syn ? `“${esc(c.q)}” ${en() ? 'means' : 'ማለት'} “${esc(syn)}” · ` : ''}${res.length} ${en() ? 'answers found' : 'መልሶች ተገኝተዋል'}</p><div class="card list">${res.slice(0, 10).map(x => `<button class="li" data-go="answer" data-id="${x.id}">${icon('play')}<span class="grow"><b style="font-size:15px">${esc(F(x, 'q'))}</b><span class="en">${esc(en() ? x.q_am : x.q_en)}</span></span><span class="note">${x.audio}</span></button>`).join('')}</div>${crs ? `<button class="card tap row" data-go="course" data-id="${crs.id}">${thumb('course-' + crs.id, 60, 46)}<span class="grow"><span class="note">${en() ? 'Full course' : 'ሙሉ ኮርስ'}</span><b>${esc(F(crs, 'title'))}</b></span></button>` : ''}`
        : `${art('search-empty')}<p class="sub" style="text-align:center">${en() ? 'We found no answer. Send us your question.' : 'መልስ አላገኘንም። ጥያቄዎን ይላኩልን።'}</p><button class="cta" data-go="ask" data-text="${esc(c.q)}">${en() ? 'Ask this question' : 'ይህን ጥያቄ ላክ'}</button>`) : `<p class="note">${en() ? 'Search matches Amharic and English: try “sleep”.' : 'ፍለጋ አማርኛና እንግሊዝኛን ያገናኛል፦ “sleep” ይሞክሩ።'}</p>`}</div>` };
  };
  SCR.ask = c => {
    const m = rowMap('qa', 'ask-a-question-4-4-bottom-and-offline'), v = k => m[k] ? P(en() ? m[k][2] : m[k][1]) : '';
    if (c.sent) { const sim = CFG.demo.showDemoAnswer ? similar(c.sent) : [];
      return { body: top('', { close: true }) + `<div class="scroll">${art('ask-sent')}<h2 class="h1" style="text-align:center">${esc(v('Sent'))}</h2><p class="note" style="text-align:center">${en() ? 'You will find the answer under Questions › My questions.' : 'መልሱን በጥያቄዎች › የእኔ ጥያቄዎች ስር ያገኙታል።'}</p>${sim.length ? `<b>${en() ? 'While you wait, these answers may help' : 'እስከዚያው እነዚህ መልሶች ሊረዱዎት ይችላሉ'}</b><div class="card list">${sim.map(x => `<button class="li" data-go="answer" data-id="${x.id}">${icon('questions')}<span class="grow" style="font-weight:700;font-size:15px">${esc(F(x, 'q'))}</span>${icon('next')}</button>`).join('')}</div>` : ''}</div>`, foot: `<button class="cta" data-tab="questions">${en() ? 'Back to questions' : 'ወደ ጥያቄዎች'}</button>` } }
    return { body: top(esc(v('Title'))) + `<div class="scroll"><p class="sub">${esc(v('Sub'))}</p><div class="field"><label for="aq">${en() ? 'Your question' : 'ጥያቄዎ'}</label><textarea id="aq" placeholder="${en() ? 'e.g. My child only eats rice and bread…' : 'ለምሳሌ፦ ልጄ ሩዝና ዳቦ ብቻ ነው የሚበላው…'}">${esc(c.text || '')}</textarea></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${v('Steps').split(' · ').map((s, i) => `<div class="card" style="padding:10px;align-items:center;text-align:center;font-size:13px"><span class="num">${i + 1}</span>${esc(s)}</div>`).join('')}</div>
      <p class="note">🔒 ${esc(v('Privacy'))}</p><div class="card note">${esc(v('Urgent'))}</div></div>`, foot: `<button class="cta" data-act="send">${esc(v('Button'))}</button>` };
  };

  function similar(t) { const w = String(t).toLowerCase().split(/[\s፣።?,.!]+/).filter(x => x.length > 2); return D().qa.questions.map(q => ({ q, s: w.filter(x => (q.q_am + ' ' + q.q_en + ' ' + q.search.join(' ') + ' ' + q.short_am).toLowerCase().includes(x)).length })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.q) }

  // find help
  const KINDS = [['center', en => en ? 'Centers and therapy' : 'ማዕከላትና ቴራፒ', 'help-center'], ['hospital', en => en ? 'Doctors and hospitals' : 'ሐኪሞችና ሆስፒታሎች', 'help-doctor'], ['school', en => en ? 'Schools' : 'ልዩ ፍላጎት የሚቀበሉ ት/ቤቶች', 'help-school'], ['organisation', en => en ? 'Organisations' : 'ድርጅቶች', 'not-alone']];
  SCR.help = c => {
    const k = c.k || 'center', q = (c.q || '').toLowerCase();
    const all = D().directory.map((d, i) => Object.assign({ i }, d));
    let list = all.filter(d => k === 'center' ? d.type.startsWith('center') : d.type === k);
    if (q) list = list.filter(d => JSON.stringify(d).toLowerCase().includes(q));
    const cityEn = ((stepOf('city').options.find(o => o[0] === S.ans.city) || [])[2] || '').toLowerCase().split(' ')[0];
    const near = c.near && S.ans.city !== 'other';
    if (near) list = list.filter(d => (String(d.area || '') + ' ' + String(d.city || '') + ' ' + d.name).toLowerCase().includes(cityEn) || /national|online|phone/i.test(String(d.area || d.city || '')));
    const where = d => d.area || d.city || '';
    return { body: `<div class="top"><h1>${en() ? 'Where can I find help?' : 'እርዳታ የት ላግኝ?'}</h1><button class="chip" data-go="ob" data-k="city" style="flex:none">${icon('findhelp').replace('<svg', '<svg width="14" height="14"')} ${esc(cityName())}</button></div><div class="scroll">
      <div class="field"><input data-act="hq" value="${esc(c.q || '')}" placeholder="${en() ? 'Search a center, doctor, school…' : 'ማዕከል፣ ሐኪም፣ ትምህርት ቤት…'}" aria-label="search"></div>
      <div class="sheet-tabs">${KINDS.map(([kk, lb]) => `<button class="chip" data-act="hk" data-v="${kk}" aria-pressed="${k === kk}" style="white-space:nowrap">${lb(en())}</button>`).join('')}</div>
      <div class="chips"><button class="chip" data-act="near" aria-pressed="${!near}">${en() ? 'All cities' : 'ሁሉም ከተሞች'}</button><button class="chip" data-act="near" data-v="1" aria-pressed="${!!near}">${en() ? 'Only' : 'በ'} ${esc(cityName())} ${en() ? '' : 'ብቻ'}</button></div>
      ${list.map(d => `<button class="card tap" data-go="place" data-i="${d.i}"><div class="row" style="align-items:flex-start">${thumb(KINDS.find(x => d.type.startsWith(x[0]))[2], 56, 44)}<span class="grow"><b style="font-size:15px">${esc(d.name)}</b><span class="en">${esc(where(d))}</span></span></div><span class="note">${esc(d.services || d.what_they_offer || d.notes || d.what_they_do || '')}</span><div class="row" style="flex-wrap:wrap;gap:6px">${d.verified ? `<span class="pill t">✓ ${en() ? 'Verified' : 'ተረጋግጧል'} ${esc(d.verified_on || '')}</span>` : `<span class="pill m">${en() ? 'Confirm by phone' : 'በስልክ ያረጋግጡ'}</span>`}${/partner/i.test(d.source_status) ? `<span class="pill b">${en() ? 'Your center' : 'የእርስዎ ማዕከል'}</span>` : ''}${d.fee ? `<span class="pill">${esc(d.fee)}</span>` : ''}</div></button>`).join('') || `<p class="empty">${en() ? 'No places listed here yet.' : 'እስካሁን የተመዘገበ ቦታ የለም።'}</p>`}
      <button class="card tap row" data-go="signs">${thumb('signs', 56, 44)}<span class="grow"><b>${en() ? 'Worried about your child?' : 'ስለ ልጅዎ ያሳስበዎታል?'}</b><span class="en">${en() ? 'Note what you see and show the professional' : 'ያስተዋሉትን መዝግበው ለባለሙያው ያሳዩ'}</span></span></button>
      <button class="card tap row" data-go="doctor">${thumb('doctor-prep', 56, 44)}<span class="grow"><b>${en() ? 'What should I ask the doctor?' : 'ሐኪሙን ምን ልጠይቅ?'}</b><span class="en">${en() ? 'A checklist for the appointment' : 'ለቀጠሮ መዘጋጃ ዝርዝር'}</span></span></button></div>`, nav: 'help' };
  };
  SCR.place = c => {
    const d = D().directory[c.i], skip = ['type', 'name', 'verified', 'verified_on'];
    const lab = { area: en() ? 'Area' : 'ሰፈር', city: en() ? 'City' : 'ከተማ', services: en() ? 'Services' : 'አገልግሎቶች', ages_size: en() ? 'Ages and size' : 'ዕድሜ', fee: en() ? 'Fee' : 'ክፍያ', contact: en() ? 'Contact' : 'ስልክ', source_status: en() ? 'Status' : 'ሁኔታ', what_they_offer: en() ? 'Offers' : 'አገልግሎት', how_to_get_there: en() ? 'How to get there' : 'እንዴት', notes: en() ? 'Notes' : 'ማስታወሻ', what_they_do: en() ? 'What they do' : 'ስራቸው' };
    return { body: top('') + `<div class="scroll">${art(KINDS.find(x => d.type.startsWith(x[0]))[2])}<h2 class="h1">${esc(d.name)}</h2><span class="note">${esc(d.area || d.city || '')}</span>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${(() => { const ph = (String(d.contact || '').match(/\+?\d[\d\s-]{5,}\d/) || [''])[0], partner = /partner/i.test(d.source_status || ''), num = ph || (partner ? CFG.center.phone : '');
        const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.name.replace(/\(.*?\)/g, '') + ' ' + String(d.area || d.city || 'Ethiopia').replace(/\[.*?\]/g, ''));
        const st = 'style="align-items:center;padding:10px;text-decoration:none;color:inherit;display:flex;flex-direction:column"';
        return (num ? `<a class="card tap" ${st} href="${G.tel(num)}">${icon('call')}<b style="font-size:13px">${en() ? 'Call' : 'ደውል'}</b></a>` : `<button class="card tap" ${st} data-act="nonumber">${icon('call')}<b style="font-size:13px">${en() ? 'Call' : 'ደውል'}</b></button>`)
          + `<button class="card tap" ${st} data-act="shareplace" data-i="${c.i}">${icon('share')}<b style="font-size:13px">${en() ? 'Share' : 'አጋራ'}</b></button>`
          + `<a class="card tap" ${st} href="${maps}" target="_blank" rel="noopener">${icon('directions')}<b style="font-size:13px">${en() ? 'Directions' : 'አቅጣጫ'}</b></a>` })()}</div>
      <dl class="card kv">${Object.entries(d).filter(([k, v]) => !skip.includes(k) && v).map(([k, v]) => `<dt>${esc(lab[k] || k)}</dt><dd>${md(v)}</dd>`).join('')}</dl>
      ${d.verified ? `<span class="pill t">✓ ${en() ? 'Verified' : 'ተረጋግጧል'}</span>` : `<div class="card" style="background:var(--mustard-t);border:0;font-size:14px">${en() ? 'Not confirmed yet. Please call before you go.' : 'ገና አልተረጋገጠም። ከመሄድዎ በፊት ይደውሉ።'}</div>`}
      <button class="card tap row" data-go="doctor">${icon('doctor')}<b class="grow">${en() ? 'Prepare for the visit' : 'ለጉብኝቱ ይዘጋጁ'}</b>${icon('next')}</button><button class="ghost" data-go="ask" data-text="${esc((en() ? 'Wrong information about ' : 'ስለ ') + d.name + (en() ? ': ' : ' የተሳሳተ መረጃ፦ '))}">${en() ? 'Information wrong? Tell us' : 'መረጃው ተሳስቷል? ያሳውቁን'}</button></div>` };
  };
  const signsList = () => { let grp = ''; return rows('assessment', '5-3-what-have-you-noticed').map(r => { if (r[0]) grp = r[0]; return { grp: bi(grp), n: +r[1], am: r[2], en: r[3], ex: bi(r[4]), first: /yes/.test(r[5]) } }) };
  SCR.signs = c => {
    const all = signsList(), show = c.more ? all : all.filter(x => x.first);
    const g = {}; show.forEach(x => { const k = x.grp.am; (g[k] = g[k] || { t: x.grp, items: [] }).items.push(x) });
    return { body: top(en() ? 'What have you noticed?' : 'ምን አስተውለዋል?') + `<div class="scroll"><p class="sub">${en() ? "Choose what you've seen. It's not a test; it's a note to show the professional." : 'ያዩትን ይምረጡ። ፈተና አይደለም፤ ለባለሙያው የሚያሳዩት ማስታወሻ ነው።'}</p>
      ${Object.values(g).map(gr => `<b>${esc(en() ? gr.t.en : gr.t.am)}</b>${gr.items.map(x => `<label class="opt" aria-pressed="${S.signs.includes(x.n)}" style="align-items:flex-start"><input type="checkbox" data-act="sign" data-v="${x.n}" ${S.signs.includes(x.n) ? 'checked' : ''} style="width:22px;height:22px;margin-top:2px"><span class="grow"><b style="font-size:15px">${esc(en() ? x.en : x.am)}</b><span class="en">${esc(en() ? x.ex.en : x.ex.am)}</span></span></label>`).join('')}`).join('')}
      ${c.more ? '' : `<button class="ghost" data-act="moresigns">+ ${all.length - show.length} ${en() ? 'more signs' : 'ተጨማሪ ምልክቶች'}</button>`}
      <p class="note">${en() ? "Children develop at different speeds. One or two signs alone don't mean autism." : 'ልጆች በተለያየ ፍጥነት ያድጋሉ። አንድ ወይም ሁለት ምልክት ብቻ ኦቲዝም ማለት አይደለም።'}</p></div>`,
      foot: `<button class="cta" data-go="signsresult">${en() ? 'Prepare my notes' : 'ማስታወሻዬን አዘጋጅ'} · ${S.signs.length} ${en() ? 'selected' : 'ተመርጠዋል'}</button>` };
  };
  SCR.signsresult = () => {
    const tb = rows('assessment', '5-4-your-notes-for-the-professional'), all = signsList(), sel = all.filter(x => S.signs.includes(x.n));
    const cs = sel.length ? tb[0] : tb[1], lost = S.signs.includes(3) ? tb[2] : null;
    return { body: top(en() ? 'Your notes' : 'ማስታወሻዎ') + `<div class="scroll">${art('signs-notes')}<h2 class="h1" style="font-size:21px">${esc(LB(cs[1]))}</h2><p class="sub">${esc(LB(cs[2]))}</p>${lost ? `<div class="card" style="background:var(--coral-t);border:0">${esc(LB(lost[1].replace(/^adds a coral line: /, '')))}</div>` : ''}
      <div class="card"><b>${esc(name())} · ${new Date().toLocaleDateString()}</b>${sel.map(x => `<span style="font-size:15px">• ${esc(en() ? x.en : x.am)}</span>`).join('') || `<span class="note">—</span>`}</div>
      <div class="field"><label for="other">${en() ? 'Anything else you noticed (optional)' : 'ሌላ ያስተዋሉት (አማራጭ)'}</label><textarea id="other" data-bind="notes.other">${esc(S.notes.other)}</textarea></div>
      <button class="card tap row" data-go="big" data-k="notes">${icon('doctor')}<b class="grow">${en() ? 'Show the professional in large text' : 'ለባለሙያው በትልቁ አሳይ'}</b>${icon('next')}</button>
      <button class="card tap row" data-tab="help">${icon('findhelp')}<b class="grow">${en() ? 'Where can I get an assessment?' : 'ለግምገማ የት ልሂድ?'}</b>${icon('next')}</button><button class="card tap row" data-go="doctor">${icon('doctor')}<b class="grow">${en() ? 'Questions to ask the doctor' : 'ሐኪሙን የሚጠይቋቸው ጥያቄዎች'}</b>${icon('next')}</button><button class="card tap row" data-go="lesson" data-id="1.6">${icon('learn')}<b class="grow">${en() ? 'What can I do at home meanwhile?' : 'እስከዚያው ቤት ውስጥ ምን ላድርግ?'}</b>${icon('next')}</button></div>`,
      foot: `<button class="cta" data-act="sharenotes">${icon('share')} ${en() ? 'Send my notes' : 'ማስታወሻዬን ላክ'}</button>` };
  };
  SCR.doctor = c => {
    const p = D().pages.assessment['5-5-what-to-ask-the-doctor'], [take, ask] = p.lists;
    return { body: top(en() ? 'What to ask the doctor' : 'ሐኪሙን ምን ልጠይቅ?') + `<div class="scroll">${art('help-doctor')}<p class="sub">${en() ? 'Prepare before the appointment and show it there.' : 'ከቀጠሮው በፊት ያዘጋጁ፣ በቀጠሮው ላይ ያሳዩ።'}</p>
      ${[[en() ? 'Take with you' : 'ይዘው ይሂዱ', take, 't'], [en() ? 'Ask' : 'ይጠይቁ', ask, 'a']].map(([h, l, k]) => `<div class="card"><b>${h}</b>${l.map((x, i) => `<label class="row" style="align-items:flex-start;font-size:15px"><input type="checkbox" data-act="doc" data-v="${k}${i}" ${S.doctor[k + i] ? 'checked' : ''} style="width:20px;height:20px;margin-top:3px"><span class="grow">${esc(LB(x))}</span></label>`).join('')}</div>`).join('')}
      <div class="field"><label for="dsays">${en() ? 'Write what the doctor says' : 'ሐኪሙ ያለውን ይጻፉ'}</label><textarea id="dsays" data-bind="notes.doctor">${esc(S.notes.doctor)}</textarea></div><p class="note">${esc(LB((p.paras.find(x => /Tip/.test(x)) || '').replace(/^\*\*Tip at the bottom:\*\* /, '')))}</p></div>`,
      foot: `<button class="cta" data-go="big" data-k="doctor">${en() ? 'Show the doctor in large text' : 'ለሐኪሙ በትልቁ አሳይ'}</button>` };
  };
  // Large text, to hand the phone to a doctor or therapist
  SCR.big = c => {
    let items = [], title = '';
    if (c.k === 'doctor') {
      const [take, ask] = D().pages.assessment['5-5-what-to-ask-the-doctor'].lists;
      title = en() ? 'Questions for the doctor' : 'ለሐኪሙ ጥያቄዎች';
      items = ask.filter((_, i) => S.doctor['a' + i]).map(LB); if (!items.length) items = ask.map(LB);
      if (S.notes.doctor) items.push((en() ? 'Notes: ' : 'ማስታወሻ፦ ') + S.notes.doctor);
    } else {
      title = (en() ? 'About ' : 'ስለ ') + name();
      items = signsList().filter(x => S.signs.includes(x.n)).map(x => en() ? x.en : x.am);
      if (S.notes.other) items.push(S.notes.other);
      S.logs.filter(x => x.type === 'hard').slice(0, 5).forEach(x => items.push(new Date(x.at).toLocaleDateString() + ' · ' + (x.chip || '') + ' ' + x.text));
      if (!items.length) items = [en() ? 'No notes yet. Use "What have you noticed?" or "Write down today" first.' : 'እስካሁን ማስታወሻ የለም። መጀመሪያ «ምን አስተውለዋል?» ወይም «ዛሬን ይጻፉ» ይጠቀሙ።'];
    }
    return { body: `<div class="scroll" style="background:var(--surface)"><div class="row"><button class="ib" data-act="back" aria-label="close">${icon('close')}</button><span class="grow note">${esc(name())} · ${new Date().toLocaleDateString()}</span>${langT()}</div><h1 class="h1" style="font-size:30px">${esc(title)}</h1>${items.map((x, i) => `<p class="big" style="margin:0;padding:12px 0;border-top:1px solid var(--line)"><span class="num" style="width:34px;height:34px;font-size:16px;margin-right:8px">${i + 1}</span>${esc(x)}</p>`).join('')}</div>` };
  };

  // profile & more
  const ageLabel = k => { const o = stepOf('age').options.find(x => x[0] === k); return o ? (en() ? o[2] : o[1]) : '' };
  const optLabel = (step, k) => { const o = (stepOf(step).options || []).find(x => x[0] === k); return o ? (en() ? o[2] : o[1]) : k };
  SCR.profile = () => {
    const r = rowMap('other', '10-5-profile-6-1'), v = k => r[k] ? P(en() ? r[k][2] : r[k][1]) : '';
    const item = (ic, t, act, sub = '') => `<button class="li" ${act}>${icon(ic)}<span class="grow"><b style="font-size:15px">${t}</b>${sub ? `<span class="en">${sub}</span>` : ''}</span>${icon('next')}</button>`;
    const modes = [['light', en() ? 'Light' : 'ብሩህ'], ['dark', en() ? 'Dark' : 'ጨለማ'], ['auto', en() ? 'Like my phone' : 'እንደ ስልኩ']];
    return { body: top(esc(v('Title'))) + `<div class="scroll"><button class="card tap row" data-go="editprofile"><span style="width:52px;height:52px;border-radius:26px;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex:none">${esc(parent()[0])}</span><span class="grow"><b style="font-size:17px">${esc(parent())}</b><span class="en">+251 ${esc(S.ans.phone || '—')} · ${esc(optLabel('role', S.ans.role))}</span></span><span class="pill b">${esc(v('Edit'))}</span></button>
      <div class="card list">${item('child', esc(v('Children').split(' · ')[0]), 'data-go="kids"', esc(S.kids.map(k => k.name || '—').join(', ') || name()))}${item('chart', en() ? 'My child: notes and progress' : 'ልጄ፦ ማስታወሻና እድገት', 'data-go="mychild"', esc(name()))}${item('signs', esc(v('Stage').replace('{stage}', '').replace(/[\s·]+$/, '')), 'data-go="ob" data-k="stage"', esc(optLabel('stage', S.ans.stage)))}${item('practice', en() ? 'Hardest things right now' : 'አሁን በጣም የከበዱት ነገሮች', 'data-go="ob" data-k="challenges"', esc(S.ans.challenges.map(x => optLabel('challenges', x)).join(', ')))}${item('findhelp', en() ? 'City' : 'ከተማ', 'data-go="ob" data-k="city"', esc(cityName()))}${item('center', esc(v('Center').replace(/·.*$/, '').trim()), 'data-go="ob" data-k="center"', esc(S.ans.center ? centerName() + ' · ' + S.ans.center : '—'))}${item('call', esc(v('Family contact')), 'data-go="editprofile"', esc(S.family || (en() ? 'Not set' : 'አልተሞላም')))}</div>
      <div class="card list">${item('event', en() ? 'Center events' : 'የማዕከል ዝግጅቶች', 'data-go="events"')}${item('practice', en() ? 'My path' : 'መንገዴ', 'data-go="path"')}${item('notes', en() ? 'Write down today' : 'ዛሬን ይጻፉ', 'data-go="log"')}${item('calendar', en() ? 'Monthly check-in' : 'የወሩ ማረጋገጫ', 'data-go="checkin"')}${item('safety', en() ? 'Emergency and safety' : 'አስቸኳይ ሁኔታና ደህንነት', 'data-go="safety"')}${item('safety', esc(v('Child ID card')), 'data-go="idcard"')}${item('share', en() ? 'What family sees when you share' : 'ሲያጋሩ ቤተሰብ የሚያየው', 'data-go="shared" data-id="2.1"')}</div>
      <div class="card"><div class="row"><b class="grow">${esc(v('Language').split(' · ')[0])}</b>${langT()}</div><div class="row" style="flex-wrap:wrap"><b class="grow">${esc(v('Look').split(' · ')[0])}</b><div class="lang">${modes.map(([k, lb]) => `<button data-act="mode" data-v="${k}" aria-pressed="${S.mode === k}">${lb}</button>`).join('')}</div></div><label class="row"><b class="grow">${esc(v('SMS'))}</b><input type="checkbox" data-act="sms" ${S.sms ? 'checked' : ''} style="width:22px;height:22px"></label><button class="ghost" data-go="messages">${en() ? 'See the messages we send' : 'የምንልካቸውን መልዕክቶች ይመልከቱ'}</button></div>
      <div class="card list">${item('download', esc(v('Downloads').replace(/·\s*\{size\}.*$/, '').trim()), 'data-go="downloads"')}${G.isStandalone() ? '' : item('download', en() ? 'Install Gasha on this phone' : 'ጋሻን በዚህ ስልክ ላይ ይጫኑ', 'data-act="install"')}${item('lock', esc(v('Privacy box').replace(' ›', '').split(' (')[0]), 'data-go="privacy"')}${item('info', en() ? 'About Gasha and sources' : 'ስለ ጋሻና ምንጮች', 'data-go="about"')}${item('offline', en() ? 'Messages when something goes wrong' : 'ችግር ሲፈጠር የሚታዩ መልዕክቶች', 'data-go="states"')}</div>
      <div class="card list">${item('download', esc(v('Account').split(' · ')[0]), 'data-act="export"')}${item('logout', esc(v('Account').split(' · ')[2] || 'Log out'), 'data-act="logout"')}${item('close', esc(v('Account').split(' · ')[1] || 'Delete'), 'data-act="delete"')}</div><p class="note" style="text-align:center">${esc(v('Footer'))}</p></div>` };
  };
  SCR.editprofile = () => {
    const acc = stepOf('account');
    return { body: top(en() ? 'Edit profile' : 'መገለጫ አስተካክል') + `<div class="scroll">
      <div class="field"><label for="pn">${esc(L(acc.fields[0].slice(0, 2)))}</label><input id="pn" data-bind="parent" value="${esc(S.ans.parent)}" placeholder="ሰላማዊት"></div>
      <div class="field"><label for="ph">${esc(L(acc.fields[1].slice(0, 2)))}</label><div class="row"><span class="chip">+251</span><input id="ph" class="grow" data-bind="phone" inputmode="tel" value="${esc(S.ans.phone)}" placeholder="9X XXX XXXX"></div></div>
      <div class="field"><label for="fc">${en() ? 'Emergency family contact' : 'የአስቸኳይ ጊዜ ቤተሰብ ስልክ'}</label><input id="fc" data-bind="family" inputmode="tel" value="${esc(S.family)}" placeholder="+251 9X XXX XXXX"><span class="note">${en() ? 'Shown on the Emergency page and the ID card.' : 'በአስቸኳይ ገጽና በመታወቂያ ካርዱ ላይ ይታያል።'}</span></div>
      <b>${en() ? 'I am' : 'እኔ'}</b><div class="chips">${stepOf('role').options.map(o => `<button class="chip" data-act="pick" data-k="role" data-v="${o[0]}" aria-pressed="${S.ans.role === o[0]}">${esc(en() ? o[2] : o[1])}</button>`).join('')}</div></div>`,
      foot: `<button class="cta" data-act="saved">${en() ? 'Save' : 'አስቀምጥ'}</button>` };
  };
  SCR.kids = () => ({ body: top(en() ? 'My children' : 'ልጆቼ') + `<div class="scroll">${S.kids.map((k, i) => `<div class="card row"><span class="num" style="width:44px;height:44px;font-size:18px">${esc((k.name || '?')[0])}</span><span class="grow"><b>${esc(k.name || (en() ? 'No name yet' : 'ስም አልተሞላም'))}</b><span class="en">${esc(optLabel('child', k.sex))} · ${esc(ageLabel(k.age))}</span></span>${i === S.kid ? `<span class="pill t">${en() ? 'Showing' : 'የሚታየው'}</span>` : `<button class="chip" data-act="pickkid" data-v="${i}">${en() ? 'Show' : 'አሳይ'}</button>`}<button class="ib" data-go="editkid" data-i="${i}" aria-label="edit">${icon('notes')}</button></div>`).join('')}
    <p class="note">${en() ? 'Lessons and tips use the name of the child that is showing.' : 'ትምህርቶችና ምክሮች የሚታየውን ልጅ ስም ይጠቀማሉ።'}</p></div>`, foot: `<button class="cta" data-act="addkid">+ ${en() ? 'Add a child' : 'ልጅ ጨምር'}</button>` });
  SCR.editkid = c => {
    const i = +c.i || 0, k = S.kids[i]; if (!k) return SCR.kids();
    const st = stepOf('child');
    return { body: top(en() ? 'Child' : 'ልጅ') + `<div class="scroll"><div class="field"><label for="kn">${esc(L(st.field))}</label><input id="kn" data-bind="kids.${i}.name" value="${esc(k.name)}" placeholder="${esc(L(st.placeholder))}"></div>
      <b>${esc(L(st.gender_label))}</b><div class="chips">${st.options.map(o => `<button class="chip" data-act="kidset" data-i="${i}" data-k="sex" data-v="${o[0]}" aria-pressed="${k.sex === o[0]}">${esc(en() ? o[2] : o[1])}</button>`).join('')}</div>
      <b>${esc(L(stepOf('age').q))}</b><div class="chips">${stepOf('age').options.map(o => `<button class="chip" data-act="kidset" data-i="${i}" data-k="age" data-v="${o[0]}" aria-pressed="${k.age === o[0]}">${esc(en() ? o[2] : o[1])}</button>`).join('')}</div>
      ${S.kids.length > 1 ? `<button class="ghost" data-act="delkid" data-i="${i}" style="color:var(--coral-s)">${en() ? 'Remove this child' : 'ይህን ልጅ አስወግድ'}</button>` : ''}</div>`, foot: `<button class="cta" data-act="saved">${en() ? 'Save' : 'አስቀምጥ'}</button>` };
  };
  SCR.downloads = c => {
    const saved = S.offline.map(course).filter(Boolean);
    return { body: top(en() ? 'Downloaded lessons' : 'የወረዱ ትምህርቶች') + `<div class="scroll">${art('offline')}<div class="card"><b>${en() ? 'Works without internet' : 'ያለ ኢንተርኔት የሚሰሩ'}</b><span style="font-size:14px;line-height:1.55">${en() ? 'Help now, Safety, all answers and the courses below work offline once Gasha has opened once.' : 'አሁን እርዳኝ፣ ደህንነት፣ ሁሉም መልሶችና ከታች ያሉት ኮርሶች ጋሻ አንድ ጊዜ ከተከፈተ በኋላ ያለ ኢንተርኔት ይሰራሉ።'}</span><span class="note" id="mb">${en() ? 'Space used' : 'የተያዘ ቦታ'}: …</span></div>
      ${saved.length ? saved.map(x => `<button class="card tap row" data-go="course" data-id="${x.id}">${thumb('course-' + x.id, 60, 46)}<span class="grow"><b>${esc(F(x, 'title'))}</b><span class="en">✓ ${en() ? 'Saved' : 'ተቀምጧል'}</span></span>${icon('next')}</button>`).join('') : `<p class="empty">${en() ? 'No courses saved yet. Open a course and tap "Save offline".' : 'እስካሁን የተቀመጠ ኮርስ የለም። ኮርስ ከፍተው «ያለ ኢንተርኔት አስቀምጥ»ን ይጫኑ።'}</p>`}</div>`,
      foot: saved.length ? `<button class="ghost" data-act="clearsaved">${en() ? 'Clear downloads' : 'የወረዱትን አጽዳ'}</button>` : `<button class="cta" data-tab="courses">${en() ? 'Go to courses' : 'ወደ ኮርሶች'}</button>`,
      after: () => G.storageMB().then(mb => { const e = document.getElementById('mb'); if (e) e.textContent = (en() ? 'Space used' : 'የተያዘ ቦታ') + ': ' + mb + ' MB' }) };
  };
  SCR.install = () => {
    const ios = G.isIOS();
    const steps = ios ? (en() ? ['Open this page in Safari', 'Tap the Share button at the bottom', 'Choose "Add to Home Screen"', 'Tap "Add"'] : ['ይህን ገጽ በSafari ይክፈቱ', 'ከታች ያለውን የማጋሪያ (Share) ቁልፍ ይጫኑ', '«Add to Home Screen»ን ይምረጡ', '«Add»ን ይጫኑ'])
      : (en() ? ['Open this page in Chrome', 'Tap the ⋮ menu at the top right', 'Choose "Install app" or "Add to Home screen"', 'Tap "Install"'] : ['ይህን ገጽ በChrome ይክፈቱ', 'ከላይ በቀኝ ያለውን ⋮ ይጫኑ', '«Install app» ወይም «Add to Home screen»ን ይምረጡ', '«Install»ን ይጫኑ']);
    return { body: top(en() ? 'Install Gasha' : 'ጋሻን ይጫኑ') + `<div class="scroll">${art('install')}<p class="sub">${en() ? 'Gasha opens like an app from your home screen and works without internet.' : 'ጋሻ ከስልክዎ ዋና ገጽ እንደ መተግበሪያ ይከፈታል፤ ያለ ኢንተርኔትም ይሰራል።'}</p>${steps.map((x, i) => `<div class="card row"><span class="num">${i + 1}</span><b class="grow" style="font-size:15px">${esc(x)}</b></div>`).join('')}</div>`,
      foot: G.installEvt ? `<button class="cta" data-act="install">${en() ? 'Install now' : 'አሁን ጫን'}</button>` : `<button class="cta" data-act="back">${en() ? 'Done' : 'ጨርሻለሁ'}</button>` };
  };
  SCR.messages = () => {
    const r = rows('other', '10-10-sms-and-push-messages'), p = page('other', '10-10-sms-and-push-messages');
    const fill = t => P(t).replace(/\{lesson\}/g, F(nextLesson().l, 'title')).replace(/\{course\}/g, F(nextLesson().c, 'title')).replace(/\{try_today_short\}/g, F(nextLesson().l, 'try').slice(0, 50) + '…').replace(/\{month\}/g, new Date().toLocaleDateString(en() ? 'en-GB' : 'am-ET', { month: 'long' })).replace(/\{time\}/g, '4:00').replace(/\{event\}/g, en() ? "Parents' talk" : 'የወላጆች ውይይት').replace(/\{topic\}/g, en() ? 'sleep' : 'እንቅልፍ').replace(/\{code\}/g, CFG.demo.otp || '000000');
    return { body: top(en() ? 'Messages from Gasha' : 'ከጋሻ የሚመጡ መልዕክቶች') + `<div class="scroll"><p class="sub">${en() ? 'At most 2 SMS a week, never before 7 a.m. or after 9 p.m.' : 'በሳምንት ከ2 SMS አይበልጥም፤ ከጠዋቱ 1 ሰዓት በፊት ወይም ከምሽቱ 3 ሰዓት በኋላ አይላክም።'}</p>${r.map(x => `<div class="card"><span class="note" style="font-weight:700">${esc(G.strip(x[0]))}</span><div style="background:var(--sunk);border-radius:14px 14px 14px 4px;padding:10px 12px;font-size:15px;line-height:1.5">${esc(fill(en() ? x[2] : x[1]))}</div><span class="note">GASHA</span></div>`).join('')}<label class="card row"><b class="grow">${en() ? 'Send me SMS reminders' : 'የSMS ማስታወሻ ላክልኝ'}</b><input type="checkbox" data-act="sms" ${S.sms ? 'checked' : ''} style="width:22px;height:22px"></label></div>` };
  };
  SCR.about = () => {
    const l = D().onboarding.landing, src = D().pages.sources;
    const clean = x => md(String(x).replace(/(\]\([^)]*\))\s*:.*$/s, '$1'));
    const sec = (k) => { const p = src[k]; if (!p) return ''; return `<div class="card"><b>${esc(p.title)}</b>${p.lists.map(li => `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6">${li.map(x => `<li>${clean(x)}</li>`).join('')}</ul>`).join('')}${p.tables.map(t => t.rows.map(r => `<p style="margin:0;font-size:14px;line-height:1.55;border-top:1px solid var(--line);padding-top:6px">${clean(r[0])}${r[1] ? ' · ' + clean(r[1]) : ''}</p>`).join('')).join('')}</div>` };
    return { body: top(en() ? 'About Gasha' : 'ስለ ጋሻ') + `<div class="scroll">${art('welcome-family')}<h2 class="h1">${esc(L(l.headline))}</h2><p class="sub">${esc(L(l.sub))}</p><div class="card"><span style="font-size:15px;line-height:1.6">${esc(L(l.credit))}</span><span class="note">${en() ? "General information, not a diagnosis or treatment. Ask a doctor about your child's health." : 'አጠቃላይ መረጃ ነው፤ ምርመራ ወይም ህክምና አይደለም። ስለ ልጅዎ ጤና ሐኪም ያማክሩ።'}</span></div><b>${en() ? 'What the content is based on' : 'ይዘቱ የተመሰረተባቸው ምንጮች'}</b>${['clinical-guidance', 'ethiopian-context'].map(sec).join('')}<p class="note" style="text-align:center">ጋሻ · Gasha ${esc(CFG.version)} · ${esc(centerName())}</p></div>` };
  };
  SCR.privacy = () => {
    const r = rows('other', '10-6-privacy-in-plain-words-6-2');
    return { body: top(en() ? 'Privacy in plain words' : 'ግላዊነትዎ በቀላል ቃላት') + `<div class="scroll">${art('privacy')}${listenBtn('privacy', en() ? 'Privacy in plain words' : 'ግላዊነትዎ በቀላል ቃላት', 120)}${r.map(x => `<div class="card"><b>${esc(G.strip(x[0]))}</b><span style="font-size:15px;line-height:1.55">${esc(P(en() ? x[2] : x[1]))}</span></div>`).join('')}<button class="ghost" data-act="export">${icon('download')} ${en() ? 'Download my data' : 'መረጃዬን አውርድ'}</button></div>` };
  };
  const EV_ART = ['event-coffee', 'parent-care', 'course-4', 'course-9', 'not-alone'];
  SCR.events = () => { const ev = rows('other', '10-7-center-events-6-3-sample-events'); return { body: top(en() ? 'Center events' : 'የማዕከል ዝግጅቶች') + `<div class="scroll">${ev.length ? ev.map((e, i) => `<button class="card tap row" data-go="event" data-i="${i}">${thumb(EV_ART[i % 5], 64, 50)}<span class="grow"><b>${esc(en() ? e[2] : e[1])}</b><span class="en">${esc(e[3])} · ${esc(e[4])}</span></span>${S.rsvp[i] ? '<span class="pill t">✓</span>' : icon('next')}</button>`).join('') : `${art('no-events')}<p class="empty">${esc(RT('other', '10-11-empty-offline-and-error-states', 'No events'))}</p>`}</div>` } };
  SCR.event = c => {
    const e = rows('other', '10-7-center-events-6-3-sample-events')[c.i], cp = page('other', '10-7-center-events-6-3-sample-events').paras;
    if (!e) return SCR.events();
    return { body: `<div class="scroll nopad"><div class="hero-n" style="background:#E2492D"><button class="ib" data-act="back" aria-label="back" style="background:rgba(255,255,255,.18);border:0;color:#fff">${icon('back')}</button><span style="font-weight:700;color:#FFE3D6">${en() ? 'From your center · Free' : 'ከማዕከልዎ · ነጻ'}</span><h1 class="h1" style="color:#fff">${esc(en() ? e[2] : e[1])}</h1><div class="chips"><span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${esc(e[3])}</span></div></div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">${art(EV_ART[c.i % 5])}<div class="card row"><span class="num" style="background:var(--mustard)">${esc(String(e[4])[0])}</span><span class="grow"><span class="note">${en() ? 'Led by' : 'የሚመራው'}</span><b>${esc(e[4])}</b></span></div><div class="card"><b>${en() ? 'What to expect' : 'ምን ይጠብቁ'}</b><span>${esc(e[5])}</span></div><a class="card row" href="${G.tel(CFG.center.phone)}" style="text-decoration:none;color:inherit">${icon('center')}<span class="grow"><b>${esc(centerName())}</b><span class="en">${esc(CFG.center.area)}</span></span>${icon('call')}</a><p class="note">${esc(cp[1] || '')}</p></div></div>`,
      foot: `<button class="cta" data-act="rsvp" data-i="${c.i}">${S.rsvp[c.i] ? (en() ? "You're registered ✓ (tap to cancel)" : 'ተመዝግበዋል ✓ (ለመሰረዝ ይጫኑ)') : (en() ? "I'll come" : 'እመጣለሁ')}</button><button class="ghost" data-act="eventremind" data-i="${c.i}">${en() ? 'Add a reminder to my calendar' : 'በቀን መቁጠሪያዬ አስታውሰኝ'}</button>` };
  };
  SCR.path = () => {
    const r = rows('other', '10-1-my-path-2-2-4-weeks-of-daily-practi'); let wk = '';
    const items = r.map(x => { if (x[0]) wk = x[0]; return { wk: bi(wk), day: x[1], am: x[2], en: x[3], lesson: x[4] } });
    const weeks = {}; items.forEach(x => { (weeks[x.wk.am] = weeks[x.wk.am] || { t: x.wk, d: [] }).d.push(x) });
    const total = items.length, dn = S.path.length;
    return { body: top(en() ? 'My path' : 'መንገዴ') + `<div class="scroll">${art('path')}<span class="note">${en() ? 'Daily practice · 4 weeks · tap a day when you have done it' : 'የዕለት ልምምድ · 4 ሳምንታት · ያደረጉትን ቀን ይጫኑ'}</span><span class="prog"><i style="width:${total ? dn / total * 100 : 0}%;background:var(--teal)"></i></span><span class="note">${dn} / ${total}</span>${Object.values(weeks).map((w, wi) => `<div class="card"><b style="font-size:16px">${en() ? 'Week' : 'ሳምንት'} ${wi + 1} · ${esc(en() ? w.t.en : w.t.am)}</b>${w.d.map(d => { const id = wi + '-' + d.day; const done = S.path.includes(id); return `<div class="row" style="align-items:flex-start"><button class="num" data-act="pathday" data-v="${id}" style="border:0;width:34px;height:34px;${done ? 'background:var(--teal);color:#fff' : ''}" aria-pressed="${done}" aria-label="${en() ? 'Mark day done' : 'ቀኑን ጨርሻለሁ'}">${done ? '✓' : d.day}</button><span class="grow" style="font-size:14.5px;line-height:1.5">${esc(P(en() ? d.en : d.am))}${d.lesson && lessonById(d.lesson) ? ` <button class="pill b" data-go="lesson" data-id="${d.lesson}" style="border:0">▶ ${d.lesson}</button>` : ''}</span></div>` }).join('')}</div>`).join('')}</div>` };
  };
  SCR.log = c => {
    const m = rowMap('other', '10-2-write-down-today-log-2-5'), v = k => m[k] ? P(en() ? m[k][2] : m[k][1]) : '';
    const type = c.t || 'win', chips = v('Hard-moment chips').split(' · '), feel = v('Your feeling').split(' · ');
    return { body: top(esc(v('Title'))) + `<div class="scroll">${art('log-today')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${v('Type').split(' · ').map((t, i) => `<button class="opt" style="justify-content:center" data-act="logt" data-v="${i ? 'hard' : 'win'}" aria-pressed="${type === (i ? 'hard' : 'win')}">${i ? icon('meltdown') : icon('badge')}${esc(t)}</button>`).join('')}</div>
      ${type === 'hard' ? `<div class="chips">${chips.map(t => `<button class="chip" data-act="logc" data-v="${esc(t)}" aria-pressed="${c.chip === t}">${esc(t)}</button>`).join('')}</div>` : ''}
      <div class="field"><label for="lg">${esc(v('Prompt'))}</label><textarea id="lg" placeholder="${esc(type === 'hard' ? v('Placeholder (hard)') : v('Placeholder (win)'))}">${esc(c.draft || '')}</textarea></div>
      <b>${esc(feel[0])}</b><div class="chips">${feel.slice(1).map(t => `<button class="chip" data-act="logf" data-v="${esc(t)}" aria-pressed="${c.f === t}">${esc(t)}</button>`).join('')}</div><p class="note">${esc(v('Privacy'))}</p>
      ${S.logs.length ? `<b>${en() ? 'Earlier notes' : 'የቀድሞ ማስታወሻዎች'}</b>` : ''}${S.logs.slice(0, 10).map((x, i) => `<div class="card"><div class="row"><span class="pill ${x.type === 'hard' ? 'c' : 't'}">${esc(x.chip || (x.type === 'hard' ? (en() ? 'Hard moment' : 'ከባድ ጊዜ') : (en() ? 'Small win' : 'ትንሽ ድል')))} · ${new Date(x.at).toLocaleDateString()}</span><span class="grow"></span><button class="chip" data-act="dellog" data-i="${i}" aria-label="delete" style="padding:4px 9px">✕</button></div><span>${esc(x.text)}</span>${x.feel ? `<span class="note">${esc(x.feel)}</span>` : ''}</div>`).join('')}</div>`,
      foot: `<button class="cta" data-act="savelog">${esc(v('Button'))}</button>` };
  };
  SCR.checkin = c => {
    const r = rows('other', '10-3-monthly-check-in-2-6'), i = +c.i || 0, q = r[i], scale = en() ? ['Never', 'Sometimes', 'Often', 'Every day'] : ['በፍጹም', 'አልፎ አልፎ', 'ብዙ ጊዜ', 'በየቀኑ'];
    if (i >= r.length) return { body: top('', { close: true }) + `<div class="scroll">${art('checkin')}<h2 class="h1" style="text-align:center">${en() ? `Thank you. ${name()}'s page is updated.` : `እናመሰግናለን። የ${name()} ገጽ ተዘምኗል።`}</h2></div>`, foot: `<button class="cta" data-go="mychild" data-replace="1">${en() ? 'See my child' : 'ልጄን ይመልከቱ'}</button>` };
    return { body: `<div class="top"><button class="ib" data-act="back" aria-label="close">${icon('close')}</button><span class="prog grow"><i style="width:${(i + 1) / r.length * 100}%"></i></span><b>${i + 1}/${r.length}</b></div><div class="scroll"><span class="note" style="font-weight:700">${esc(r[i][1] || '')}</span><h2 class="h1" style="font-size:22px">${esc(P(en() ? q[3] : q[2]))}</h2>${listenBtn('checkin-' + (i + 1), P(en() ? q[3] : q[2]), 10)}${scale.map((s, k) => `<button class="opt" data-act="ci" data-i="${i}" data-v="${k}" aria-pressed="${S.checkin[i] === k}"><span class="grow"><b>${s}</b></span><span>${'●'.repeat(k + 1)}${'○'.repeat(3 - k)}</span></button>`).join('')}</div>`, foot: `<button class="cta" data-act="cinext" data-i="${i}" ${S.checkin[i] == null ? 'disabled' : ''}>${en() ? 'Continue' : 'ቀጥል'}</button>` };
  };
  SCR.mychild = () => {
    const m = rowMap('other', '10-4-my-child-2-7'), v = k => m[k] ? P(en() ? m[k][2] : m[k][1]) : '';
    // hard moments per week over the last 4 weeks, from the parent's own notes
    const now = Date.now(), wk = [3, 2, 1, 0].map(w => S.logs.filter(x => x.type === 'hard' && now - new Date(x.at) >= w * 6048e5 && now - new Date(x.at) < (w + 1) * 6048e5).length), mx = Math.max(1, ...wk);
    const trend = wk[3] < wk[2] ? 0 : wk[3] === wk[2] ? 1 : 2, trendTxt = (v('Chart').split(' · ')[1] || '').split(' / ')[trend] || '';
    const ci = S.checkinAt, sk = [[0, 1], [2, 3], [4, 5]].map(([a, b]) => ((S.checkin[a] || 0) + (S.checkin[b] || 0)) / 2);
    const months = Math.max(0, Math.round((now - new Date(S.joined || now)) / 2.6e9));
    const due = !ci || now - new Date(ci) > 2.6e9;
    return { body: top(esc(name())) + `<div class="scroll">${art('my-child')}<span class="note">${esc(name())} · ${esc(ageLabel(kid().age || S.ans.age))} · ${en() ? `with Gasha for ${months} month${months === 1 ? '' : 's'}` : `ከ${months} ወር ጀምሮ ከእኛ ጋር`}</span>
      ${due ? `<button class="card tap row" data-go="checkin" data-i="0" style="background:var(--mustard-t);border:0">${icon('calendar')}<span class="grow"><b>${esc(v('Check-in due').split(' · ')[0])}</b><span class="en">${esc(v('Check-in due').split(' · ').slice(1).join(' · '))}</span></span>${icon('next')}</button>` : ''}
      <div class="card"><b>${esc(v('Chart').split(' · ')[0])}</b><div style="display:flex;align-items:flex-end;gap:12px;height:120px">${wk.map((n, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><b>${n}</b><span style="width:100%;height:${Math.max(4, n / mx * 80)}px;border-radius:8px;background:${i === 3 ? 'var(--coral)' : 'var(--coral-t)'}"></span><span class="note">${esc(v('Week labels').split(' · ')[i] || '')}</span></div>`).join('')}</div><span class="note">${esc(trendTxt)}${trend === 2 ? ' · ' + esc(v('Going up note')) : ''}</span></div>
      <div class="card"><b>${esc(v('Skills').split(' · ')[0])}</b>${ci ? (v('Skills').split(' · ').slice(1, 4)).map((s, i) => `<div class="row"><span class="grow">${esc(s)}</span><span class="prog" style="width:120px"><i style="width:${(sk[i] / 3) * 100}%;background:var(--teal)"></i></span></div>`).join('') : `<span class="note">${en() ? 'Fill in the monthly check-in to see this.' : 'ይህን ለማየት የወሩን ማረጋገጫ ይሙሉ።'}</span>`}</div>
      <b>${esc(v('Recent').split(' · ')[0])}</b>${S.logs.length ? S.logs.slice(0, 4).map(x => `<div class="card"><span class="pill ${x.type === 'hard' ? 'c' : 't'}" style="align-self:flex-start">${esc(x.chip || '')} ${new Date(x.at).toLocaleDateString()}</span>${esc(x.text)}</div>`).join('') + `<button class="ghost" data-go="log">${en() ? 'See all notes' : 'ሁሉንም ማስታወሻዎች ይመልከቱ'}</button>` : `<div class="card note">${art('empty-notes')}${esc(v('Empty'))}</div>`}</div>`,
      foot: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="cta" data-go="log">${esc(v('Buttons').split(' · ')[0])}</button><button class="ghost" data-go="big" data-k="notes">${esc(v('Buttons').split(' · ')[1] || '')}</button></div>` };
  };
  SCR.states = () => {
    const r = rows('other', '10-11-empty-offline-and-error-states');
    const ART = { 'No internet (banner)': 'offline', 'Search no result': 'search-empty', 'No events': 'no-events', 'Something went wrong': 'error', 'Install prompt': 'install' };
    return { body: top(en() ? 'When something goes wrong' : 'ችግር ሲፈጠር') + `<div class="scroll"><p class="sub">${en() ? 'The messages Gasha shows when there is no internet, a code is wrong, or nothing is found.' : 'ኢንተርኔት ሲጠፋ፣ ኮድ ሲሳሳት ወይም ምንም ሳይገኝ ጋሻ የሚያሳያቸው መልዕክቶች።'}</p>${r.map(x => `<div class="card">${ART[G.strip(x[0])] ? art(ART[G.strip(x[0])]) : ''}<span class="note" style="font-weight:700">${esc(G.strip(x[0]))}</span><b style="font-size:15px">${esc(P(en() ? x[2] : x[1]).replace(/\{n\}/g, '2'))}</b></div>`).join('')}</div>` };
  };

  // ---------- render
  const ONBOARD = ['welcome', 'ob', 'login'], PUBLIC = ['shared', 'privacy', 'about', 'install'], TABS = ['home', 'courses', 'now', 'questions', 'help'];
  const effMode = () => S.mode === 'auto' ? ((window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light') : S.mode;
  const offlineBar = () => navigator.onLine === false ? `<div style="flex:none;background:var(--mustard-t);color:var(--mustard-s);font-size:13px;font-weight:700;padding:8px 14px;display:flex;gap:8px;align-items:center">${icon('offline')}${esc(RT('other', '10-11-empty-offline-and-error-states', 'No internet (banner)'))}</div>` : '';
  G.App = {
    boot() {
      root = document.getElementById('root');
      if (!S.joined) { S.joined = new Date().toISOString(); save() }
      const h = parseHash(location.hash);
      if (h && !ONBOARD.includes(h.r) && (S.onboarded || PUBLIC.includes(h.r))) {
        const base = S.onboarded ? { r: 'home' } : { r: 'welcome' };
        S.stack = (S.onboarded && TABS.includes(h.r)) ? [h] : [base, h];
        save();
        try { history.replaceState({ depth: 1 }, '', hashOf(base)); if (S.stack.length > 1) history.pushState({ depth: 2 }, '', hashOf(h)) } catch (e) {}
      } else { if (!S.onboarded && !ONBOARD.includes(cur().r)) S.stack = [{ r: 'welcome' }]; try { history.replaceState({ depth: S.stack.length }, '', hashOf(cur())) } catch (e) {} }
      window.addEventListener('online', () => rerender()); window.addEventListener('offline', () => rerender());
      if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.mode === 'auto') rerender() });
      rerender(true);
    },
    render(rootEl) {
      root = rootEl;
      if (!S.onboarded && !ONBOARD.includes(cur().r) && !PUBLIC.includes(cur().r)) S.stack = [{ r: 'welcome' }];
      const c = cur(), fn = SCR[c.r] || SCR.home; let s;
      try { s = fn(c) } catch (e) { console.error(e); s = { body: top('') + `<div class="scroll">${art('error')}<p class="empty">${esc(RT('other', '10-11-empty-offline-and-error-states', 'Something went wrong'))}</p><button class="cta" data-tab="home">${en() ? 'Back to home' : 'ወደ ዋና ገጽ'}</button></div>` } }
      document.documentElement.lang = en() ? 'en' : 'am';
      rootEl.innerHTML = `<div class="stage"><div class="phone" data-mode="${effMode()}"><div class="screen">${offlineBar()}${s.body}${s.foot ? `<div class="foot">${s.foot}</div>` : ''}${playerBar()}${s.nav ? nav(s.nav) : ''}${toastMsg ? `<div class="toast" role="status">${esc(toastMsg)}</div>` : ''}${sheet ? `<div class="sheet-bg" data-act="sheetclose"><div class="sheet" data-act="noop" role="dialog" aria-modal="true">${sheet}</div></div>` : ''}</div></div></div>`;
      const sc = rootEl.querySelector('.scroll'); if (sc && keepScroll) sc.scrollTop = keepScroll;
      if (s.after) s.after();
      wire(rootEl);
    }
  };

  // ---------- inputs
  function bindSet(k, v) {
    const p = k.split('.');
    if (['notes', 'kids', 'family'].includes(p[0])) { let o = S; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v }
    else if (p[0] === 'child') S.ans.child[p[1]] = v;
    else S.ans[k] = v;
    save();
  }
  const liveSearch = (el, sel, ms) => { const n = el.querySelector(sel); if (!n) return; n.oninput = () => { cur().q = n.value; clearTimeout(n._t); n._t = setTimeout(() => { rerender(); const m = root.querySelector(sel); if (m) { m.focus(); m.setSelectionRange(m.value.length, m.value.length) } }, ms) } };
  function wire(el) {
    el.querySelector('.phone').addEventListener('click', e => {
      const b = e.target.closest('[data-go],[data-tab],[data-act]'); if (!b) return;
      const d = b.dataset;
      if (d.tab) { e.preventDefault(); closeSheet(true); return tab(d.tab) }
      if (d.go) {
        e.preventDefault(); closeSheet(true); const a = {}; ['id', 'k', 'i', 'n', 'text'].forEach(k => { if (d[k] != null) a[k] = d[k] });
        return d.replace ? replace(d.go, a) : go(d.go, a);
      }
      act(d, b, e);
    });
    el.querySelectorAll('[data-bind]').forEach(inp => inp.oninput = () => { bindSet(inp.dataset.bind, inp.value); if (inp.dataset.bind === 'center') { clearTimeout(inp._t); inp._t = setTimeout(() => { rerender(); const n = root.querySelector('#cc'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length) } }, 600) } });
    liveSearch(el, '[data-act="cq"]', 350); liveSearch(el, '[data-act="hq"]', 350); liveSearch(el, '[data-act="sq"]', 400);
    const cityq = el.querySelector('[data-act="cityq"]'); if (cityq) cityq.oninput = () => { const t = cityq.value.trim().toLowerCase(); el.querySelectorAll('#cities .opt').forEach(o => o.hidden = t && !(o.dataset.s + ' ' + o.textContent).toLowerCase().includes(t)) };
    const otp = el.querySelector('[data-act="otp"]'); if (otp) otp.oninput = () => { otp.value = otp.value.replace(/\D/g, '').slice(0, 6); S.otp = otp.value; save(); const cta = el.querySelector('.foot .cta'); if (cta) cta.disabled = otp.value.length !== 6 };
    const lg = el.querySelector('#lg'); if (lg) lg.oninput = () => { cur().draft = lg.value };
    const aq = el.querySelector('#aq'); if (aq) aq.oninput = () => { cur().text = aq.value };
  }

  // ---------- helpers for actions
  const tonight = () => { const d = new Date(); d.setHours(20, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d };
  function eventDate(txt) {
    const t = String(txt).toLowerCase(), d = new Date(); d.setSeconds(0, 0);
    const next = day => { const x = new Date(d); x.setDate(x.getDate() + ((day - x.getDay() + 7) % 7 || 7)); return x };
    let x;
    if (/sat/.test(t)) { x = next(6); x.setHours(/morning/.test(t) ? 10 : 10, 0) }
    else if (/sun/.test(t)) { x = next(0); x.setHours(14, 0) }
    else if (/april/.test(t)) { x = new Date(d.getMonth() > 3 ? d.getFullYear() + 1 : d.getFullYear(), 3, 2, 10, 0) }
    else { x = next(1); x.setHours(9, 0) }
    return x;
  }
  const confirmSheet = (title, text, yesAct, yes, no) => openSheet(`<h2>${esc(title)}</h2><p class="sub">${esc(text)}</p><button class="cta" data-act="${yesAct}" style="background:var(--coral);color:#fff;box-shadow:none">${esc(yes)}</button><button class="ghost" data-act="sheetclose">${esc(no)}</button>`);
  function wipe(to) { G.ls.clear(); G.clearSaved(); audioStop(true); const keep = { lang: S.lang, mode: S.mode }; S = Object.assign(fresh(), keep, { stack: [{ r: to }] }); G.questions = []; save(); closeSheet(true); url(false); rerender(true) }

  function act(d, b, e) {
    const c = cur();
    switch (d.act) {
      case 'noop': return;
      case 'back': e.preventDefault(); return back();
      case 'sheetclose': return closeSheet();
      case 'lang': S.lang = d.v; save(); return rerender();
      case 'mode': S.mode = d.v; save(); return rerender();
      case 'toast': return toast(d.msg);
      case 'saved': toast(en() ? 'Saved' : 'ተቀምጧል'); return back();
      // onboarding
      case 'pick': S.ans[d.k] = d.v; save(); return rerender();
      case 'sex': S.ans.child.sex = d.v; save(); return rerender();
      case 'multi': { const a = S.ans.challenges, i = a.indexOf(d.v); i < 0 ? a.push(d.v) : a.splice(i, 1); save(); return rerender() }
      case 'consent': S.consents[d.v] = b.checked; save(); { const cta = root.querySelector('.foot .cta'); if (cta && cur().k === 'account') cta.disabled = !S.consents[0] } return;
      case 'resend': e.preventDefault(); S.otp = CFG.demo.otp || ''; save(); toast((en() ? 'A new code was sent to +251 ' : 'አዲስ ኮድ ወደ +251 ') + (S.ans.phone || '…') + (en() ? '' : ' ተልኳል')); return;
      case 'obnext': { if (S.onboarded && ['stage', 'challenges', 'city', 'center', 'age', 'role'].includes(d.k)) { toast(en() ? 'Saved' : 'ተቀምጧል'); return back() } return go('ob', { k: ORDER[ORDER.indexOf(d.k) + 1] }) }
      case 'finish': {
        S.onboarded = true; if (!S.kids.length) S.kids = [{ name: S.ans.child.name, sex: S.ans.child.sex, age: S.ans.age }]; S.kid = 0;
        S.stack = [{ r: 'home' }]; save(); url(false); return rerender(true);
      }
      case 'install': if (G.installEvt) { G.install().then(ok => { if (ok) toast(en() ? 'Gasha is installed' : 'ጋሻ ተጭኗል'); rerender() }); return } return go('install');
      // learning
      case 'cf': c.f = d.v; return rerender();
      case 'pic': c.pi = +d.v; return rerender();
      case 'listen': return audio(d.id, d.label, +d.dur || 60);
      case 'au': if (AU.on) audioStop(); else audioPlay(); return rerender();
      case 'auclose': audioStop(true); return rerender();
      case 'lessondone': if (!S.done.includes(d.id)) S.done.push(d.id); save(); return replace('lessondone', { id: d.id });
      case 'fb': c.fb = d.v; save(); if (d.v === 'q') return go('ask', { text: (en() ? 'About lesson ' : 'ስለ ትምህርት ') + c.id + ': ' }); return rerender();
      case 'saveoff': {
        const x = course(d.id); if (!S.offline.includes(x.id)) S.offline.push(x.id); save();
        G.cacheUrls(['art/course-' + x.id + '.svg', ...x.lessons.map(l => 'audio/lesson-' + l.id + '.mp3')]).then(() => toast(en() ? 'Saved. This course works without internet.' : 'ተቀምጧል። ይህ ኮርስ ያለ ኢንተርኔት ይሰራል።'));
        return rerender();
      }
      case 'remind': { const l = lessonById(d.id); G.reminder((en() ? 'Gasha · Try today: ' : 'ጋሻ · ዛሬ ይሞክሩት፦ ') + F(l, 'title'), tonight(), 10, F(l, 'try')); return toast(en() ? 'Reminder for 8 p.m. downloaded. Open it to add it to your calendar.' : 'የምሽት 2 ሰዓት ማስታወሻ ወርዷል። ከፍተው በቀን መቁጠሪያዎ ያስገቡት።') }
      case 'sharelesson': { const l = lessonById(d.id), r = rowMap('other', '10-8-shared-lesson-page-2-8'), link = G.shareLink('shared?id=' + l.id); const t = P(en() ? r['Telegram share text'][2] : r['Telegram share text'][1]).replace('{link}', '').trim(); G.share(t + ' · ' + F(l, 'title'), link); return }
      case 'shareapp': { const l = D().onboarding.landing; G.share(L(l.headline) + ' ' + L(l.sub)); return }
      case 'shareanswer': { const q = qa(d.id); G.share(F(q, 'q') + '\n' + F(q, 'short'), G.shareLink('answer?id=' + q.id)); return }
      case 'shareplace': { const x = D().directory[d.i]; G.share([x.name, x.area || x.city, x.services || x.what_they_offer || '', x.contact || ''].filter(Boolean).join('\n')); return }
      case 'sharenotes': { const sel = signsList().filter(x => S.signs.includes(x.n)).map(x => '• ' + (en() ? x.en : x.am)); G.share(name() + ' · ' + new Date().toLocaleDateString() + '\n' + sel.join('\n') + (S.notes.other ? '\n' + S.notes.other : '')); return }
      case 'getapp': if (S.onboarded) return tab('home'); S.stack = [{ r: 'welcome' }]; save(); url(false); return rerender(true);
      // right now
      case 'tosteps': return replace('step', { id: d.id, n: 0 });
      case 'nextstep': return go('step', { id: d.id, n: +d.n + 1 });
      case 'toafter': return go('after', { id: d.id });
      case 'result': { c.res = +d.v; if (!c.logged) { S.logs.unshift({ type: 'hard', chip: F(situation(c.id), 'tile'), text: b.textContent, at: new Date().toISOString() }); c.logged = 1 } else S.logs[0].text = b.textContent; save(); return rerender() }
      case 'chk': S.checklist[d.v] = b.checked; save(); return;
      case 'print': return window.print();
      // questions
      case 'helpful': S.helpful[d.id] = d.v; save(); return rerender();
      case 'sqset': c.q = d.v; return rerender();
      case 'send': { const t = root.querySelector('#aq').value.trim(); if (!t) return toast(en() ? 'Write your question first' : 'መጀመሪያ ጥያቄዎን ይጻፉ'); G.sendQuestion(t, { child: name(), city: S.ans.city, from: parent() }); c.sent = t; save(); return rerender(true) }
      // find help
      case 'hk': c.k = d.v; return rerender();
      case 'near': c.near = d.v ? 1 : 0; return rerender();
      case 'nonumber': return openSheet(`<h2>${en() ? 'No phone number yet' : 'ስልክ ቁጥር ገና የለም'}</h2><p class="sub">${en() ? 'We are still confirming this number. Your center can help you reach them.' : 'ይህን ቁጥር እያረጋገጥን ነው። ማዕከልዎ ሊያገናኝዎት ይችላል።'}</p><a class="cta" href="${G.tel(CFG.center.phone)}">${icon('call')} ${esc(centerName())}</a><button class="ghost" data-act="sheetclose">${en() ? 'Close' : 'ዝጋ'}</button>`);
      case 'sign': { const n = +d.v, i = S.signs.indexOf(n); i < 0 ? S.signs.push(n) : S.signs.splice(i, 1); save(); return rerender() }
      case 'moresigns': c.more = 1; return rerender();
      case 'doc': S.doctor[d.v] = b.checked; save(); return;
      // more
      case 'rsvp': S.rsvp[d.i] = !S.rsvp[d.i]; save(); return toast(S.rsvp[d.i] ? (en() ? "You're registered. We'll remind you by SMS one day before." : 'ተመዝግበዋል። አንድ ቀን ቀደም ብለን በSMS እናስታውስዎታለን።') : (en() ? 'Registration cancelled' : 'ምዝገባው ተሰርዟል'));
      case 'eventremind': { const ev = rows('other', '10-7-center-events-6-3-sample-events')[d.i]; G.reminder('Gasha · ' + (en() ? ev[2] : ev[1]), eventDate(ev[3]), 120, centerName() + ' · ' + ev[5]); return toast(en() ? 'Calendar reminder downloaded. Open it to add it.' : 'የቀን መቁጠሪያ ማስታወሻ ወርዷል። ከፍተው ያስገቡት።') }
      case 'pathday': { const i = S.path.indexOf(d.v); i < 0 ? S.path.push(d.v) : S.path.splice(i, 1); save(); return rerender() }
      case 'logt': c.t = d.v; return rerender();
      case 'logc': c.chip = d.v; return rerender();
      case 'logf': c.f = d.v; return rerender();
      case 'savelog': { const t = root.querySelector('#lg').value.trim(); if (!t) return toast(en() ? 'Write a few words first' : 'መጀመሪያ ጥቂት ቃላት ይጻፉ'); S.logs.unshift({ type: c.t || 'win', chip: c.chip, feel: c.f, text: t, at: new Date().toISOString() }); c.draft = ''; c.chip = null; c.f = null; save(); toast(en() ? 'Saved. Thank you for writing today.' : 'ተቀምጧል። ዛሬን ስለጻፉ እናመሰግናለን።'); return }
      case 'dellog': S.logs.splice(+d.i, 1); save(); return rerender();
      case 'ci': S.checkin[d.i] = +d.v; save(); return rerender();
      case 'cinext': { const i = +d.i, n = rows('other', '10-3-monthly-check-in-2-6').length; if (i + 1 >= n) S.checkinAt = new Date().toISOString(); save(); return replace('checkin', { i: i + 1 }) }
      case 'sms': S.sms = b.checked; save(); return toast(S.sms ? (en() ? 'SMS reminders on' : 'የSMS ማስታወሻ በርቷል') : (en() ? 'SMS reminders off' : 'የSMS ማስታወሻ ጠፍቷል'));
      case 'pickkid': S.kid = +d.v; save(); return rerender();
      case 'addkid': S.kids.push({ name: '', sex: 'boy', age: '3to6' }); S.kid = S.kids.length - 1; save(); return go('editkid', { i: S.kids.length - 1 });
      case 'kidset': S.kids[d.i][d.k] = d.v; save(); return rerender();
      case 'delkid': S.kids.splice(+d.i, 1); S.kid = 0; save(); toast(en() ? 'Removed' : 'ተወግዷል'); return back();
      case 'clearsaved': G.clearSaved(); S.offline = []; save(); toast(en() ? 'Downloads cleared' : 'የወረዱት ጸድተዋል'); return rerender();
      case 'export': { const data = { exported: new Date().toISOString(), app: 'Gasha ' + CFG.version, profile: S.ans, children: S.kids, family_contact: S.family, notes: S.logs, signs: S.signs, notes_for_professional: S.notes, monthly_check_in: S.checkin, lessons_done: S.done, my_path: S.path, questions: G.questions }; G.download('gasha-my-data.json', JSON.stringify(data, null, 2), 'application/json'); return toast(en() ? 'Your data file was downloaded' : 'የመረጃዎ ፋይል ወርዷል') }
      case 'logout': return confirmSheet(en() ? 'Log out of this phone?' : 'ከዚህ ስልክ ይውጡ?', en() ? 'Your notes on this phone will be removed. Log in again with your phone number.' : 'በዚህ ስልክ ያሉት ማስታወሻዎች ይሰረዛሉ። በስልክ ቁጥርዎ እንደገና ይግቡ።', 'dologout', en() ? 'Log out' : 'ውጣ', en() ? 'Cancel' : 'ተው');
      case 'dologout': return wipe('login');
      case 'delete': { const r = rowMap('other', '10-5-profile-6-1')['Delete confirm'], p = String(en() ? r[2] : r[1]).split(' · '); return confirmSheet(en() ? 'Delete my account' : 'አካውንቴን ሰርዝ', p[0], 'dodelete', p[1] || 'Delete', p[2] || 'Cancel') }
      case 'dodelete': return wipe('welcome');
    }
  }
})();
