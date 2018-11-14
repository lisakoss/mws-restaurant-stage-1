import idb from 'idb';

let staticCacheName = 'mws-restaurant-v1';
let contentImgsCache = 'mws-restaurant-imgs';
let allCaches = [
  staticCacheName,
  contentImgsCache
];

var dbPromise = idb.open('mws-restaurant', 1, function (upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
  }
});

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/restaurant.html',
        'css/styles.css',
        'js/dbhelper.js',
        'js/main.js',
        'js/register_sw.js',
        'js/restaurant_info.js',
      ]).catch(function (error) {
        console.log('Caches open failed: ', error);
      });
    })
  );
});


self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName.startsWith('mws-restaurant-') &&
            !allCaches.includes(cacheName);
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/index.html'));
      return;
    }

    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(serveImg(event.request));
      return;
    }
  }

  // ajax request
  if (requestUrl.port === '1337') {
    const parts = requestUrl.pathname.split("/");
  } else { // non ajax request
    event.respondWith(
      caches.match(event.request).then(function (response) {
        return response || fetch(event.request).then(function (networkResponse) {
          return caches.open(staticCacheName).then(function (cache) {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(function (error) {
          console.log("Offline, could not retrieve response: ", error);
        })
      })
    );
  }
});

function serveImg(request) {
  var imgUrl = request.url.replace(/-\d+px\.jpg$/, '');

  return caches.open(contentImgsCache).then(function (cache) {
    return cache.match(imgUrl).then(function (response) {
      if (response) return response;

      return fetch(request).then(function (networkResponse) {
        cache.put(imgUrl, networkResponse.clone());
        return networkResponse;
      });
    }).catch(function (error) {
      console.log("Offline, could not retrieve response: ", error);
    })
  });
}
