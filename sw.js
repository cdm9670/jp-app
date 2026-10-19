const CACHE = 'jpk-v6_20261019_0929';
const AUDIO = 'jpk-audio-v1'; // 녹음 트랙은 앱 업데이트 후에도 유지
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(u => new Request(u, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== AUDIO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || /\/(index\.html)?(\?.*)?$/.test(new URL(e.request.url).pathname);
  if (isPage) {
    // 페이지는 인터넷이 되면 최신본, 안 되면 저장본
    const net = fetch(e.request, {cache: 'no-cache'}).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return res;
    });
    const slow = new Promise((_, rej) => setTimeout(rej, 3000));
    e.respondWith(Promise.race([net, slow]).catch(() => caches.match('./index.html').then(r => r || net)));
    return;
  }
  const isAudio = /\/audio\//.test(new URL(e.request.url).pathname);
  if (isAudio && e.request.headers.has('range')) return; // 범위 요청은 브라우저에 맡김
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => {
    if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(isAudio ? AUDIO : CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => isAudio ? Response.error() : caches.match('./index.html'))));
});
