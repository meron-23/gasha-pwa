// Gasha PWA: shared helpers, storage, sharing, reminders, install prompt and start-up.
(function () {
  const G = window.G = {};
  const C = G.config = window.GASHA_CONFIG || {};
  G.D = null;
  G.questions = [];
  G.listeners = [];

  // ---------- storage (everything a parent enters stays on the phone)
  G.ls = {
    get(k, d) { try { const v = localStorage.getItem('gasha.' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem('gasha.' + k, JSON.stringify(v)) } catch (e) {} },
    clear() { try { Object.keys(localStorage).filter(k => k.startsWith('gasha.')).forEach(k => localStorage.removeItem(k)) } catch (e) {} }
  };

  // ---------- text helpers
  const esc = G.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  G.md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  G.bi = s => { s = String(s || '').trim(); const m = s.match(/^(.*?)\s*·\s*\*(.+)\*\s*$/s); return m ? { am: m[1].trim(), en: m[2].trim() } : { am: s, en: '' } };
  G.strip = s => String(s || '').replace(/\*\*|\*/g, '');
  G.icon = (name, acc) => {
    const inner = (window.ICONS[name] || window.ICONS.info || '').replace(/ACCENT/g, acc || 'currentColor').replace(/BGC/g, 'var(--surface)');
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  };
  G.art = (id, cls = 'art', alt = '') => `<img class="${cls}" src="art/${id}.svg" alt="${esc(alt)}" loading="lazy">`;
  G.thumb = (id, w, h) => `<span class="thumb" style="width:${w}px;height:${h}px"><img src="art/${id}.svg" alt="" loading="lazy"></span>`;
  G.getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  G.tel = n => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
  G.deviceId = G.ls.get('device', null) || (() => { const d = 'd' + Math.random().toString(36).slice(2, 9); G.ls.set('device', d); return d })();

  // ---------- questions: kept on the phone, and sent to the server when config.questionEndpoint is set
  G.sendQuestion = async (text, extra = {}) => {
    const q = Object.assign({ id: 'q' + Date.now(), text, at: new Date().toISOString(), status: 'new', answer: '', device: G.deviceId }, extra);
    G.questions.unshift(q); G.ls.set('questions', G.questions);
    if (C.questionEndpoint) {
      try { const r = await fetch(C.questionEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) }); q.status = r.ok ? 'sent' : 'queued' }
      catch (e) { q.status = 'queued' }
      G.ls.set('questions', G.questions);
    }
    return q;
  };
  // retry queued questions when back online
  window.addEventListener('online', () => { G.questions.filter(q => q.status === 'queued').forEach(async q => { try { const r = await fetch(C.questionEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) }); if (r.ok) { q.status = 'sent'; G.ls.set('questions', G.questions) } } catch (e) {} }) });

  // ---------- sharing: the phone's own share sheet, or Telegram when that is not available
  G.share = async (text, url) => {
    url = url || C.publicUrl || location.origin + location.pathname;
    if (navigator.share) { try { await navigator.share({ title: 'ጋሻ · Gasha', text, url }); return 'shared' } catch (e) { if (e && e.name === 'AbortError') return 'cancelled' } }
    window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text), '_blank', 'noopener');
    return 'telegram';
  };
  G.shareLink = route => (C.publicUrl || location.origin + location.pathname) + '#/' + route;

  // ---------- files: calendar reminders (.ics) and "download my data"
  G.download = (name, data, type) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1500);
  };
  const icsDate = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  G.reminder = (title, when, minutes = 15, desc = '') => {
    const end = new Date(when.getTime() + minutes * 60000);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gasha//EN', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@gasha', 'DTSTAMP:' + icsDate(new Date()), 'DTSTART:' + icsDate(when), 'DTEND:' + icsDate(end),
      'SUMMARY:' + title.replace(/[,;]/g, ' '), 'DESCRIPTION:' + desc.replace(/\n/g, '\\n').replace(/[,;]/g, ' '), 'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + title.replace(/[,;]/g, ' '), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    G.download('gasha-reminder.ics', ics, 'text/calendar');
  };

  // ---------- install prompt
  G.installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); G.installEvt = e; G.listeners.forEach(f => f()) });
  window.addEventListener('appinstalled', () => { G.installEvt = null; G.ls.set('installed', true); G.listeners.forEach(f => f()) });
  G.isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  G.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  G.install = async () => { if (!G.installEvt) return false; G.installEvt.prompt(); const r = await G.installEvt.userChoice; G.installEvt = null; return r.outcome === 'accepted' };

  // ---------- offline cache helpers (used by "Save offline" and "Downloaded lessons")
  G.cacheUrls = async urls => { if (!('caches' in window)) return false; const c = await caches.open('gasha-saved'); await Promise.all(urls.map(u => c.add(u).catch(() => {}))); return true };
  G.storageMB = async () => { try { const e = await navigator.storage.estimate(); return Math.max(0.1, e.usage / 1048576).toFixed(1) } catch (e) { return '0.0' } };
  G.clearSaved = async () => { try { await caches.delete('gasha-saved') } catch (e) {} };

  G.render = () => { if (G.D) G.App.render(document.getElementById('root')) };

  async function boot() {
    G.questions = G.ls.get('questions', []);
    try { const res = await fetch('content.json'); G.D = await res.json() }
    catch (e) { document.getElementById('root').innerHTML = '<div class="boot">' + window.LOGO + '<p>Could not load the content. Check the internet and try again.</p><button onclick="location.reload()">Try again</button></div>'; return }
    let rq = 0; G.listeners.push(() => { if (rq) return; rq = setTimeout(() => { rq = 0; G.render() }, 0) });
    G.App.boot();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.addEventListener('DOMContentLoaded', boot);
})();
