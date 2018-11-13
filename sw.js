let staticCacheName = 'mws-restaurant-v1';
let contentImgsCache = 'mws-restaurant-imgs';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/restaurant.html',
        '/css/styles.css',
        '/js/',
        '/js/dbhelper.js',
        '/js/main.js',
        '/js/register_sw.js',
        '/js/restaurant_info.js'
      ]).catch(function(error) {
        console.log('Caches open failed: ', error);
      });
    })
  );
});

self.addEventListener('fetch', function(event) {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/'));
      return;
    }

    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(serveImg(event.request));
      return;
    }
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
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
    }).catch(function(error) {
      console.log("Offline, could not retrieve response: ", error);
    })
  });
}
