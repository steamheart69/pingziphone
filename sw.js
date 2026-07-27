const CACHE = 'bottle-v2'; // 每次发新版就改这个版本号

self.addEventListener('install', e => {
  self.skipWaiting(); // 新 SW 装好立刻待命，不等旧标签页关闭
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // 立刻接管所有页面
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // HTML 文档：网络优先，拿不到再用缓存兜底（离线可用）
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // 其它静态资源：缓存优先
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
