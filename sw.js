// Gasha service worker: the whole app is saved on the phone, so it opens and works without internet.
// When you change any file, bump VERSION so phones pick up the new files.
const VERSION = 'gasha-20261027124750';
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "content.json",
  "css/app.css",
  "js/app.js",
  "js/config.js",
  "js/core.js",
  "js/icons.js",
  "fonts/atkinson-hyperlegible-latin-400-italic.woff2",
  "fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2",
  "fonts/noto-sans-ethiopic-ethiopic-600-normal.woff2",
  "fonts/noto-sans-ethiopic-ethiopic-700-normal.woff2",
  "fonts/noto-sans-ethiopic-ethiopic-800-normal.woff2",
  "icons/apple-touch-icon.png",
  "icons/favicon-48.png",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "art/account-safe.svg",
  "art/admin-welcome.svg",
  "art/age.svg",
  "art/answer-audio.svg",
  "art/ask-sent.svg",
  "art/center-code.svg",
  "art/challenges.svg",
  "art/checkin.svg",
  "art/city.svg",
  "art/continue-learning.svg",
  "art/course-1.svg",
  "art/course-10.svg",
  "art/course-2.svg",
  "art/course-3.svg",
  "art/course-4.svg",
  "art/course-5.svg",
  "art/course-6.svg",
  "art/course-7.svg",
  "art/course-8.svg",
  "art/course-9.svg",
  "art/course-done.svg",
  "art/doctor-prep.svg",
  "art/empty-notes.svg",
  "art/error.svg",
  "art/event-coffee.svg",
  "art/help-center.svg",
  "art/help-doctor.svg",
  "art/help-now.svg",
  "art/help-school.svg",
  "art/install.svg",
  "art/lesson-done.svg",
  "art/lesson-tell-family.svg",
  "art/log-today.svg",
  "art/my-child.svg",
  "art/no-events.svg",
  "art/not-alone.svg",
  "art/notes-worried.svg",
  "art/now-after.svg",
  "art/now-calm.svg",
  "art/now-care.svg",
  "art/now-eat.svg",
  "art/now-hitting.svg",
  "art/now-meltdown.svg",
  "art/now-pain.svg",
  "art/now-public.svg",
  "art/now-scared.svg",
  "art/now-selfharm.svg",
  "art/now-sensory.svg",
  "art/now-siblings.svg",
  "art/now-sleep.svg",
  "art/now-toilet.svg",
  "art/now-transition.svg",
  "art/now-waiting.svg",
  "art/now-wander.svg",
  "art/now-withdrawn.svg",
  "art/offline.svg",
  "art/parent-care.svg",
  "art/path.svg",
  "art/plan-ready.svg",
  "art/privacy.svg",
  "art/questions.svg",
  "art/role-grandparent.svg",
  "art/role-helper.svg",
  "art/role-parent.svg",
  "art/role-teacher.svg",
  "art/safety-emergency.svg",
  "art/safety-home.svg",
  "art/safety-id.svg",
  "art/safety-lost.svg",
  "art/search-empty.svg",
  "art/share.svg",
  "art/signs-notes.svg",
  "art/signs.svg",
  "art/stage-living.svg",
  "art/stage-new.svg",
  "art/stage-worried.svg",
  "art/tip-sara.svg",
  "art/verify-sms.svg",
  "art/welcome-family.svg"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'gasha-saved').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // pages: network first, fall back to the saved app
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return r }).catch(() => caches.match('index.html')));
    return;
  }
  // content: show the saved copy straight away, refresh it in the background
  if (url.pathname.endsWith('/content.json')) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // everything else (art, fonts, audio, scripts): saved copy first
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.pathname.includes('/audio/') || url.pathname.includes('/art/'))) { const copy = r.clone(); caches.open('gasha-saved').then(c => c.put(req, copy)) }
    return r;
  })));
});
