/* Game Hub service worker — makes the hub installable and playable offline.
   Navigations are network-first so fresh deploys are never stale;
   the cached copy is only a fallback when offline. */

const CACHE = 'game-hub-v1';

const PRECACHE = [
  '/tic-tac-toe/',
  '/tic-tac-toe/manifest.json',
  '/tic-tac-toe/icons/icon-192.png',
  '/tic-tac-toe/icons/icon-512.png',
  '/tic-tac-toe/2048-game/',
  '/tic-tac-toe/battleship/',
  '/tic-tac-toe/connect-four/',
  '/tic-tac-toe/dots-and-boxes/',
  '/tic-tac-toe/gomoku/',
  '/tic-tac-toe/hangman/',
  '/tic-tac-toe/memory-match/',
  '/tic-tac-toe/minesweeper/',
  '/tic-tac-toe/rock-paper-scissors/',
  '/tic-tac-toe/snake/',
  '/tic-tac-toe/sudoku/',
  '/tic-tac-toe/tic-tac-toe/',
  '/tic-tac-toe/word-game/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle our own pages/assets. The multiplayer relay (wss://broker.emqx.io)
  // and Google Fonts are cross-origin and pass straight through.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/tic-tac-toe/')) return;

  if (request.mode === 'navigate') {
    // Network first: always serve the newest deploy when online.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/tic-tac-toe/')))
    );
    return;
  }

  // Assets: cache first, then network.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
    )
  );
});
