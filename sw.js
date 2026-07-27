// sw.js —— 网络优先版：在线永远取最新，离线才用缓存
const CACHE = 'bottle-cache-v1';

self.addEventListener('install', e => {
  self.skipWaiting(); // 新 SW 装好立即接管，不等旧标签页关闭
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // 清掉所有旧缓存
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 页面/HTML 导航：网络优先，拿到就更新缓存，断网再回退缓存
  const isNav = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNav) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || caches.match('index.html') || Response.error();
      }
    })());
    return;
  }

  // 其他静态资源：缓存优先 + 后台更新
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(res => {
      if (res && res.status === 200) {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
