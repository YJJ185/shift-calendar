// Service Worker for PWA - 离线缓存支持
const CACHE_NAME = 'shift-calendar-v5';
const urlsToCache = [
    './',
    './index.html',
    './index.css',
    './app.js',
    './manifest.json',
    './js/utils.js',
    './js/state.js',
    './js/lunar.js',
    './js/holidays.js',
    './js/shiftTypes.js',
    './js/patterns.js',
    './js/calendar.js',
    './js/stats.js',
    './js/export.js',
    './js/theme.js'
];

// 安装 Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存已打开');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// 激活 Service Worker
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

// 拦截请求，优先使用缓存
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 缓存命中，返回缓存
                if (response) {
                    return response;
                }
                // 没有缓存，发起网络请求
                return fetch(event.request).then(response => {
                    // 检查是否有效响应
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    // 克隆响应并缓存
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
            })
    );
});
