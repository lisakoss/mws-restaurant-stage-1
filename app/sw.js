import idb from 'idb';

let staticCacheName = 'mws-restaurant-v1';
let contentImgsCache = 'mws-restaurant-imgs';
let allCaches = [
  staticCacheName,
  contentImgsCache
];

var dbPromise = idb.open('mws-restaurant', 2, function (upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
    case 1:
      let reviewsStore = upgradeDb.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
      reviewsStore.createIndex('restaurant_id', 'restaurant_id');
  }
});

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/restaurant.html',
        '/review.html',
        'css/styles.css',
        'js/dbhelper.js',
        'js/main.js',
        'js/register_sw.js',
        'js/restaurant_info.js',
        'js/restaurant_review.js',
        'https://use.fontawesome.com/releases/v5.5.0/css/all.css',
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
    let id;

    if (parts[parts.length - 1] === "restaurants") {
      id = -1;
    } else {
      id = parts[parts.length - 1];
    }

    console.log("event request", event.request.url);

    // handle reviews
    if(event.request.url.indexOf("reviews") > -1) {
      console.log("the reviewwwsss")
      event.respondWith(
        dbPromise.then(function(db) {
          return db.transaction('reviews')
            .objectStore('reviews')
            .index('restaurant_id')
            .getAll(id);
        }).then(function(data) {
          return (data && data.data) || fetch(event.request).then(function (networkResponse) {
            return networkResponse.json().then(function(fetchJson) {
              return dbPromise.then(function (db) {
                const tx = db.transaction('reviews', 'readwrite');
                const reviewsStore = tx.objectStore('reviews');

                fetchJson.forEach(review => {
                  reviewsStore.put({
                    id: review.id,
                    "restaurant_id": review["restaurant_id"],
                    data: review,
                  });
                  return fetchJson;
                });
              })
            }).then(function (finalData) {
              if(finalData[0].data) {
                let transformResponse = finalData.map(review => review.data);
                return new Response(JSON.stringify(transformResponse));
              }

              return new Response(JSON.stringify(finalData));
            }).catch(function(error) {
              console.log("Error could not fetch response: ", error);
            })
          })
        })
      )
    } else { // handle restaurant 
      event.respondWith(
        dbPromise.then(function (db) {
          return db.transaction('restaurants')
            .objectStore('restaurants')
            .get(id);
        }).then(function (data) {
          return (data && data.data) || fetch(event.request).then(function (networkResponse) {
            return networkResponse.json().then(function (fetchJson) {
              return dbPromise.then(function (db) {
                const tx = db.transaction('restaurants', 'readwrite');
                tx.objectStore('restaurants').put({
                  id: id,
                  data: fetchJson
                });
                return fetchJson;
              });
            })
          })
        }).then(function (finalData) {
          return new Response(JSON.stringify(finalData));
        }).catch(function (error) {
          console.log("Error could not fetch response: ", error);
        })
      );
    }
  } else { // non ajax request
    event.respondWith(
      caches.match(event.request).then(function (response) {
        return response || fetch(event.request).then(function (networkResponse) {
          return caches.open(staticCacheName).then(function (cache) {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(function (error) {
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
