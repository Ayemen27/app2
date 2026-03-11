const CACHE_NAME = 'binarjoin-v6';
const API_CACHE = 'api-data-v2';

const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

const VITE_DEV_PATHS = ['/@vite', '/@react-refresh', '/@fs', '/__vite', '/node_modules/.vite', '/src/'];

function isViteDevRequest(pathname) {
  return VITE_DEV_PATHS.some(p => pathname.startsWith(p));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== API_CACHE) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/')
            .then((appShell) => appShell || caches.match('/offline.html'));
        })
    );
    return;
  }

  if (isViteDevRequest(url.pathname)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (url.pathname.endsWith('.css')) {
            return new Response('/* offline */', { headers: { 'Content-Type': 'text/css' } });
          }
          if (url.pathname.endsWith('.js') || url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx') || url.pathname.endsWith('.jsx')) {
            return new Response('/* offline */', { headers: { 'Content-Type': 'application/javascript' } });
          }
          return new Response(null, { status: 204 });
        });
      })
    );
    return;
  }

  const assetExtensions = /\.(js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf|eot)(\?.*)?$/;
  if (assetExtensions.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          fetch(event.request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        }).catch(() => {
          if (url.pathname.endsWith('.js')) {
            return new Response('/* offline */', { headers: { 'Content-Type': 'application/javascript' } });
          }
          if (url.pathname.endsWith('.css')) {
            return new Response('/* offline */', { headers: { 'Content-Type': 'text/css' } });
          }
          return new Response(null, { status: 204 });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
