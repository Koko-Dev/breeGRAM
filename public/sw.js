// install and activate are triggered by the Browser
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker ... ', event);
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


// fetch is triggered by the web application
self.addEventListener('fetch', event => {
  // console.log('[Service Worker] Fetch Event triggered ... ', event.request.url);
  
  event.respondWith(fetch(event.request));
})


