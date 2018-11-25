const STATIC_CACHE = 'static-v4';
const DYNAMIC_CACHE = 'dynamic-v4';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/material-design/material.min.js',
  '/src/material-design/material.min.css',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/css/help.css',
  '/help/index.html',
  '/src/images/breeGrams1.jpeg',
  '/src/images/parkour-main.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'http://localhost:8080/favicon.ico'
];


// install and activate are triggered by the Browser
/*self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker ... ', event);
  // caches.open() returns a promise --
  //    it  opens cache if it exists, or creates cache if doesn't
  // Note: The install event does not wait for caches.open() to load
  //       To ensure it does, we use the waitUntil() method, which
  //       returns a promise, and now won't finish installation process
  //       until that is done.
  event.waitUntil(caches.open(STATIC_FILES)
    .then(theStaticCache => {
      console.log('[Service Worker] Pre-caching App Shell');
      return theStaticCache.addAll(STATIC_FILES);
    }))
  
});*/

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  event.waitUntil(
    caches.open(STATIC_CACHE)
          .then(cache => {
            console.log('[Service Worker] Pre-Caching App Shell');
            return cache.addAll(STATIC_FILES);
          }));
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker ...', event);
  
  /*
    From: https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
  * -- claim() method of 'Clients' allows active SW to set itself as the 'controller'
  *       for all clients within this 'scope'.
  * -- Triggers a "controllerchange" event on 'navigator.serviceWorker' in any clients
  *       that become controlled by this SW.
  * -- When an SW is initially registered, pages won't use it until they next load.
  *       The claim() method causes those pages to be controlled immediately.
  *        -- Be aware that this results in your SW controlling pages that loaded
  *           regularly over the network, or possibly via a different SW.
*/
  // return self.clients.claim();
  
  /*
   Using claim() inside service worker's "activate" event listener
   so that clients loaded in the same scope do not need to be reloaded
    before their fetches will go through this service worker.
  * */
  event.waitUntil(clients.claim());
});


/* Pre-Caching Strategy */
// fetch is triggered by the web application
self.addEventListener('fetch', (event) => {
  // console.log('[Service Worker] Fetch Event triggered ... ', event.request.url);
  
  // Fetch the data from the cache, if available
  // event.request must be a request object, never a string
  // caches.match requests a request object which are our cache keys
/*  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // response is null if there is no match
        if(response) {
          // Here we are not making a network request,
          // but we are intercepting the request and we are not issuing a new one
          // Instead we are just looking to see if there is a match
          // If there is a match iin the cache, then we return the cached response
          return response;
        } else {
          // If it is not in the cache, get it from the Network
          return fetch(event.request);
        }
      })
  );
});*/

/* Dynamic Caching Strategy */
// Assets are cached for offline-first only when user accessed them while online
// For Dynamic caching, we have to go to the fetch listener because
//   Dynamic Caching means that we have a fetch request
//   that we have to go anyway when we are online, so we want to just store
//   the response in the cache for future offline-first use
self.addEventListener('fetch', event => {
  console.log('Service Worker - fetch event - Dynamic Caching', event);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if(response) {
          return response;
      } else {
          // Dynamic Caching begins here
          // We return the event.request as usual, but we also...
          //    -- open/create a dynamic cache and..
          //    -- store the event request that was not in the Static Cache
          //     into the new Dynamic Cache for later offline-first capabilities
          return fetch(event.request)
            .then(networkResponse => {
              return caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  // Store the item in dynamic cache with a clone because..
                  //   we can only use each parameter/response Once
                  cache.put(event.request.url, networkResponse.clone());
                  return networkResponse;
                })
            })
            .catch(error => {
              console.log('Service Worker -- Error: ', error);
            })
        }
      })
  )
})

});


