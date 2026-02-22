// Service Worker for PWA - 离线缓存支持
// Network-first 策略：配合 Vite hash 文件名自动刷新缓存
const CACHE_NAME = 'shift-calendar-v1';

// 安装 Service Worker
self.addEventListener('install', event => {
    self.skipWaiting();
});

// 激活 Service Worker - 清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Network-first 策略：优先网络，失败时使用缓存
self.addEventListener('fetch', event => {
    // 只缓存同源请求
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 网络成功：更新缓存并返回
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // 网络失败：使用缓存
                return caches.match(event.request);
            })
    );
});
