self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(cacheNames => {

      return Promise.all(
        cacheNames.map(cache => caches.delete(cache))
      );

    })

  );

  self.clients.claim();

});
