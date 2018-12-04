
importScripts('/src/js/idb.js');
importScripts('/src/js/indexedDB.js');


const STATIC_CACHE = 'static-v33';
const DYNAMIC_CACHE = 'dynamic-v33';

// for storing request.url's in the cache, not file paths
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/material-design/material.min.js',
  '/src/material-design/material.min.css',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/css/help.css',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  '/offline.html'
];



/*

  Helper function to trim the Dynamic Cache
    - The is a recursive function which quits when the amount of elements is
      less than or equal to maxItems
    - This function is called

 @param {string} cacheName - The name of the Cache to trim
 @param {number} maxItems - The maximum number of items allowed to stay in the cache
 
*/
function trimCache(cacheName, maxItems) {
  caches.open(cacheName)
    .then(cache => {
      // returns an Array of all of the request.urls (strings) stored as keys
      return cache.keys()
        .then(cacheKeys => {
          if(cacheKeys.length > maxItems) {
            // Remove the oldest item, which would be the first element in the Array
            cache.delete(cacheKeys[0])
                 .then(trimCache(cacheName, maxItems))
          }
        })
    })
    
}



// install and activate are triggered by the Browser
/*self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker ... ', event);
  
  // caches.open() returns a promise --
  //    it  opens cache if it exists, or creates cache if doesn't
  // Note: The install event does not wait for caches.open() to load.
  //    To ensure it does, we use the waitUntil() method, which
  //    returns a promise, and install event now won't finish installation process
  //       until caches.open() has completed loading.
  
  event.waitUntil(caches.open(STATIC_FILES)
    .then(theStaticCache => {
      console.log('[Service Worker] Pre-caching App Shell');
      
      return theStaticCache.addAll(STATIC_FILES);
    }))
  
});*/



// The install event is the best place to cache static assets
self.addEventListener('install', function (event) {
  // console.log('[Service Worker] Installing Service Worker ...', event);
  // waitUntil() ensures caches.open() finishes loading
  //     before installation process is complete
  event.waitUntil(
    caches.open(STATIC_CACHE)
          .then(cache => {
            // console.log('[Service Worker] Pre-Caching App Shell');
            
            // addAll() takes an Array of strings identifying the request.url's
            //  we want to cache,  but will fail all if even one request.url fails.
            // We can use cache.add() to store individual
            //  files in the cache without risking that the entire cache is
            //  rejected for one request.url
            return cache.addAll(STATIC_FILES);
          }))
});  // End install event




/* The best place to do cache cleanup is in the activate event because
*      this will only be executed once the user closes all pages,
 *      in the service worker scope, and opens a new one (right at the start).
 *      At that point it is safe to update caches and remove old ones.
 *      */
self.addEventListener('activate', event => {
  // console.log('[Service Worker] Activating Service Worker ...', event);
  
  /* First, we want to wait until we are done with the cleanup
           before we continue, so we use waitUntil()
     If we do not do this, a fetch event may be triggered delivering
     files from the old cache which we are about to tear down.
 */
  event.waitUntil(
    // keys() is an array of strings
    //  -it outputs an array of strings, the names of sub-caches, in our cache storage
    // i.e. ['static-v3', 'static-v4', 'dynamic-v3', 'dynamic-v4']
    caches.keys()
      .then(keyList => {
        // console.log('Service Worker', keyList);
        
        // Promise.all() takes an Array of Promises and waits for them all to finish
        // Using this so that we only return from this function once we are really
        //     done with the cleanup.
        // Now, at this point we do not have an Array of Promises, but we do have
        //    an Array of keys(), which is an Array of strings (names of caches).
        // So, we convert them into Promises using map( ).
        // map() is a default JS area operator which allows us to transform an Array
        // So, we want to transform this Array of strings into an Array of Promises
        return Promise.all(keyList.map(keyInList => {
          // if the key in the list is not equal to the current version of
          //  the static or dynamic cache names, then we want to delete it.
          // If the conditional is not satisfied, then it will return null
          // (i.e. It will replace the given string in the keyInList with nothing)
          if(keyInList !== STATIC_CACHE && keyInList !== DYNAMIC_CACHE) {
            console.log('Service Worker: Removing old cache: ', keyInList);
            
            //  caches.delete() returns a Promise and map() returns an Array
            //  The result of map() then, therefore, in this case,
            //      will return an Array of Promises.  Hence,
            //  Promises.all() therefore receives the required Array of Promises
            return caches.delete(keyInList);
          }
        }))
      })
  );  // end waitUntil() in activate event
  
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
});  // END activate event




/*
  Helper function for fetch event Static Cache Asset request.url
  
  @param {string} string - The event.request.url
  @param {Array} array - The STATIC_FILES Array containing strings of the main request.url assets
  
*/
function isInArray(string, array) {
  let cachePath;
  
  // Request targets domain where we serve the page from (i.e. NOT a CDN)
  if (string.indexOf(self.origin) === 0) {
    // console.log('matched ', string);
    
    // Take the part of the URL AFTER the domain (e.g. after localhost:8080)
    cachePath = string.substring(self.origin.length);
  } else {
    // store the full request (for CDNs)
    cachePath = string;
  }
  return array.indexOf(cachePath) > -1;
}



// IndexedDB Strategy

self.addEventListener('fetch', event => {
  // Check which kind of request we are making
  // We only want to use the Cache then Network strategy with url used to create card
  // For all else, we use the Dynamic Caching with Offline Fallback Page Strategy
  // const url = 'https://httpbin.org/get';
  const url = 'https://breegram-instagram.firebaseio.com/posts';
  
  // Check to see if event.request.url contains this string ('https://httpbin.org/get')
  // If it does not then conditional is not greater than -1 (is -1)
  // If conditional is true, then we want to use the Cache, then Network Strategy
  if(event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Store the network response in indexedDB posts store
          // Create a copy of the network response because Promises only allows for one use
          let response = networkResponse.clone();
          
          // Store the response in indexedDB - .json() returns a Promise
          response.json()
            .then(data => {
              // The keys are the post ids from firebase database
              for(let key in data) {
                // Loop through the posts in firebase database,
                // Call helper function storeIntoObjectStore
                storeIntoObjectStore('posts', data[key]);
              } // end for loop
            });
          return networkResponse;
        })
    ) // end event.responseWith()
  } else if(isInArray(event.request.url, STATIC_FILES)) {
    // Use Case: Use Cache Only Strategy if event.request.url is in static cache.
    // Since the service worker uses version control, the main assets in shell will be current
    event.respondWith(
      caches.match(event.request)
    )
  } else {
    // Use Dynamic Caching with Offline Fallback Page Strategy
    event.respondWith(
      caches.match(event.request)
            .then(response => {
              // The parameter response is null if there is no match
              if(response) {
                return response;
              } else {
                // Dynamic Caching begins here
                // We return the event.request as usual, but we also...
                //  -- open/create a dynamic cache and..
                //  -- store the event request that was not in the Static Cache
                // into the new Dynamic Cache for later offline-first capabilities
                return fetch(event.request)
                  .then(networkResponse => {
                    // If you don't return caches.open, caches.put() will not do much
                    return caches.open(DYNAMIC_CACHE)
                                 .then(cache => {
                                   // trimCache(DYNAMIC_CACHE, 7);
                                   console.log('Trimmed the Cache in else');
                                   // Store the item in dynamic cache with a clone because..
                                   // we can only use each parameter/response Once
                                   // Network response is stored in cache and the other goes to user.
                                   cache.put(event.request.url, networkResponse.clone());
                
                                   // Return response to the user to get what they requested
                                   return networkResponse;
                                 })
                  })
                  .catch(error => {
                    // Implement Fallback Page Strategy here:
                    console.log('Service Worker -- Error: ', error);
                    return caches.open(STATIC_CACHE)
                                 .then(cache => {
                
                                   // Get the Offline Fallback page and return it
                                   // The command for getting something is cache.match()
                                   // Drawback is whenever we make an HTTP request where we can't get a valid
                                   //    return value, we will return to this page.
                                   //   - This has a bad side effect that if at some point some other request
                                   //   like fetching JSON from a url we can't reach, this will also be returned
                                   //   Fine tuning required - will modify depending on route of resource, etc..
                                   
                                   if(event.request.url.indexOf('/help') > -1) {
                                     // if the event.request.url contains /help, then
                                     //   then I know that it tried and failed to load
                                     //   the help page.  Return offline.html instead
                                     //   which gives the option to redirect to root page
                                     //   which was pre-cached in the install event
                                     return cache.match('/offline.html')
                                   }
                                 
                
                                   // An improved conditional
                                   // As I add more pages, would have needed to add conditions
                                   // i.e. if(event.request.url.indexOf('/help') || event.request.url.indexOf('/petunia')
                                   if (event.request.headers.get('accept').contains('text/html')) {
                                     return cache.match('/offline.html');
                                   }
                                 })
                  })
              }
            })
    )
  }  // End Dynamic Caching with Network Fallback and Offline Fallback Page Strategy
});  // End CACHE, then NETWORK with Dynamic Caching Strategy





//  Caching Strategies

//  Cache, then Network for 'https://httpbin.org/get' use to create card along with
//  Dynamic Caching with Network Fallback and Offline Fallback Page Strategy
//       for all other assets
/*
self.addEventListener('fetch', event => {
  // Check which kind of request we are making
  // We only want to use the Cache then Network strategy with url used to create card
  // For all else, we use the Dynamic Caching with Offline Fallback Page Strategy
  // const url = 'https://httpbin.org/get';
  const url = 'https://breegram-instagram.firebaseio.com/posts';
  
  // Check to see if event.request.url contains this string ('https://httpbin.org/get')
  // If it does not then conditional is not greater than -1 (is -1)
  // If conditional is true, then we want to use the Cache, then Network Strategy
  if(event.request.url.indexOf(url) > -1) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
            .then(cache => {
              // Initially this cache is empty because we have not visited pages
              // NOTE: This intercepts requests from feed.js
              return fetch(event.request)
                .then(networkResponse => {
                  trimCache(DYNAMIC_CACHE, 7);
                  console.log('Trimmed the Cache');
                  cache.put(event.request.url,  networkResponse.clone());
                  return networkResponse;
                })
            })
    )
  } else if(isInArray(event.request.url, STATIC_FILES)) {
    // Use Case: Use Cache Only Strategy if event.request.url is in static cache.
    // Since the service worker uses version control, the main assets in shell will be current
    event.respondWith(
      caches.match(event.request)
    )
  } else {
    // Use Dynamic Caching with Offline Fallback Page Strategy
    event.respondWith(
      caches.match(event.request)
            .then(response => {
              // The parameter response is null if there is no match
              if(response) {
                return response;
              } else {
                // Dynamic Caching begins here
                // We return the event.request as usual, but we also...
                //  -- open/create a dynamic cache and..
                //  -- store the event request that was not in the Static Cache
                // into the new Dynamic Cache for later offline-first capabilities
                return fetch(event.request)
                  .then(networkResponse => {
                    // If you don't return caches.open, caches.put() will not do much
                    return caches.open(DYNAMIC_CACHE)
                                 .then(cache => {
                                   trimCache(DYNAMIC_CACHE, 7);
                                   console.log('Trimmed the Cache in else');
                                   // Store the item in dynamic cache with a clone because..
                                   // we can only use each parameter/response Once
                                   // Network response is stored in cache and the other goes to user.
                                   cache.put(event.request.url, networkResponse.clone());
            
                                   // Return response to the user to get what they requested
                                   return networkResponse;
                                 })
                  })
                  .catch(error => {
                    // Implement Fallback Page Strategy here:
                    console.log('Service Worker -- Error: ', error);
                    return caches.open(STATIC_CACHE)
                                 .then(cache => {
                                   
                                   // Get the Offline Fallback page and return it
                                   // The command for getting something is cache.match()
                                   // Drawback is whenever we make an HTTP request where we can't get a valid
                                   //    return value, we will return to this page.
                                   //   - This has a bad side effect that if at some point some other request
                                   //   like fetching JSON from a url we can't reach, this will also be returned
                                   //   Fine tuning required - will modify depending on route of resource, etc..
                                   
                                   if(event.request.url.indexOf('/help') > -1) {
                                     // if the event.request.url contains /help, then
                                     //   then I know that it tried and failed to load
                                     //   the help page.  Return offline.html instead
                                     //   which gives the option to redirect to root page
                                     //   which was pre-cached in the install event
                                     return cache.match('/offline.html')
                                   }
                                   
                                   
                                   // An improved conditional
                                   // As I add more pages, would have needed to add conditions
                                   // i.e. if(event.request.url.indexOf('/help') || event.request.url.indexOf('/petunia')
                                   if (event.request.headers.get('accept').includes('text/html')) {
                                     return cache.match('/offline.html');
                                   }
                                 })
                  })
              }
            })
    )
  }  // End Dynamic Caching with Network Fallback and Offline Fallback Page Strategy
});  // End CACHE, then NETWORK with Dynamic Caching Strategy

*/



// Currently not in use
// CACHE then NETWORK with Dynamic Caching Strategy
// NOT offline-first
// The idea here is the get an asset as quickly as possible from the cache or network,
//    whichever is fastest while simultaneously going through the network
//    (implemented in feed.js) and implementing Dynamic caching in the Service Worker
// NOTE: This intercepts all fetch requests, including the network request in feed.js
// If we don't get it from the cache and we can't get it from the network, no-can-do
// NOTE 2: Because we are going through Dynamic Cache, we are updating assets
//       BUT, this breaks offline first. Must modify
/*
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(DYNAMIC_CACHE)
          .then(cache => {
            // Initially this cache is empty because we have not visited pages
            // NOTE: This intercepts requests from feed.js
            return fetch(event.request)
              .then(networkResponse => {
                cache.put(event.request.url,  networkResponse.clone());
                return networkResponse;
              })
          })
  )
});  // End CACHE, then NETWORK with Dynamic Caching Strategy

*/


// Currently not in use
// CACHE ONLY
/*
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
  )
});  // End CACHE ONLY

*/



// Currently not in use
// NETWORK ONLY STRATEGY -- no need for a service worker really
//  -- This would make sense for some resources which we will split up
//     when we parse an incoming request to funnel some through when
//     we just need the network result.  Otherwise, there is no need.
/*
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
  )
});
*/


// Currently not in use
  /* PRE-CACHING Only Strategy
    - fetch is triggered by the web application
 */
/*self.addEventListener('fetch', (event) => {
  // console.log('[Service Worker] Fetch Event triggered ... ', event.request.url);
  
  // Fetch the data from the cache, if available
  // event.request must be a request object, never a string
  // caches.match requests a request object which are our cache keys
  event.respondWith(
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
});    // End fetch event -- PRE-CACHING Only Strategy
*/



// Currently not in use
/* DYNAMIC CACHING Strategy -- Cache with Network Fallback */
// Assets are cached for offline-first only when user accessed them while online
// For Dynamic caching, we have to go to the fetch listener because
//   Dynamic Caching means that we have a fetch request
//   that we have to go anyway when we are online, so we want to just store
//   the response in the cache for future offline-first use
// NOTE: THIS IS DEBT HEAVY because we do not update via network by default
//       but we go for the cache first
/*self.addEventListener('fetch', event => {
  // console.log('Service Worker - fetch event - Dynamic Caching', event);
  // We want to respond with our cached assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // The parameter response is null if there is no match
        if(response) {
          return response;
      } else {
          // Dynamic Caching begins here
          // We return the event.request as usual, but we also...
          //  -- open/create a dynamic cache and..
          //  -- store the event request that was not in the Static Cache
          // into the new Dynamic Cache for later offline-first capabilities
          return fetch(event.request)
            .then(networkResponse => {
              // If you don't return caches.open, caches.put() will not do much
              return caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  // Store the item in dynamic cache with a clone because..
                  // we can only use each parameter/response Once
                  // Network response is stored in cache and the other goes to user.
                  cache.put(event.request.url, networkResponse.clone());
                  
                  // Return response to the user so that they get what they requested
                  return networkResponse;
                })
            })
            .catch(error => {
              console.log('Service Worker -- Error: ', error);
            })
        }
      })
  )
}); // End DYNAMIC CACHING Strategy*/




// Currently not in use
// Cache, then Dynamic Cache, then Network
//  USE CASE: User triggers a fetch event
//    --When the user triggers a fetch event, such as an
//        article on a news site which you want to save and access
//        later, perhaps even offline.
//    --To do this, we need to temporarily turn off our dynamic caching
//        (cache.put()) because if it's turned on, we can't simulate
//        this because we are caching everything anyway.
/*

self.addEventListener('fetch', event => {
  // console.log('Service Worker - fetch event - Dynamic Caching', event);
  // We want to respond with our cached assets
  event.respondWith(
    caches.match(event.request)
          .then(response => {
            // The parameter response is null if there is no match
            if(response) {
              return response;
            } else {
              // Dynamic Caching begins here
              // We return the event.request as usual, but we also...
              //    -- open/create a dynamic cache and..
              //    -- store the event request that was not in the
              //       Static Cache into the new Dynamic Cache
              //       for later offline-first capabilities
              return fetch(event.request)
                .then(networkResponse => {
                  // If you don't return caches.open, caches.put() will not do much
                  return caches.open(DYNAMIC_CACHE)
                               .then(cache => {
                                 // Temporarily disable cache.put() to simulate Use Case
                                  /!*cache.put(event.request.url, networkResponse.clone());*!/
              
                                 // Return the response to the user
                                 //      so that they get what they requested
                                 return networkResponse;
                               })
                })
                .catch(error => {
                  console.log('Service Worker -- Error: ', error);
                })
            }
          })
  )
});  // End Cache on Demand. Use Case: button triggers caching

*/



// Currently not in use
// DYNAMIC CACHING with OFFLINE FALLBACK PAGE Strategy
/*
self.addEventListener('fetch', event => {
  // console.log('Service Worker - fetch event - Dynamic Caching', event);
  // We want to respond with our cached assets
  event.respondWith(
    caches.match(event.request)
          .then(response => {
            // The parameter response is null if there is no match
            if(response) {
              return response;
            } else {
              // Dynamic Caching begins here
              // We return the event.request as usual, but we also...
              //  -- open/create a dynamic cache and..
              //  -- store the event request that was not in the Static Cache
              // into the new Dynamic Cache for later offline-first capabilities
              return fetch(event.request)
                .then(networkResponse => {
                  // If you don't return caches.open, caches.put() will not do much
                  return caches.open(DYNAMIC_CACHE)
                               .then(cache => {
                                 // Store the item in dynamic cache with a clone because..
                                 // we can only use each parameter/response Once
                                 // Network response is stored in cache and the other goes to user.
                                 cache.put(event.request.url, networkResponse.clone());
              
                                 // Return response to the user to get what they requested
                                 return networkResponse;
                               })
                })
                .catch(error => {
                  // Implement Fallback Page Strategy here:
                  console.log('Service Worker -- Error: ', error);
                  return caches.open(STATIC_CACHE)
                    .then(cache => {
                      // Get the Offline Fallback page and return it
                      // The command for getting something is cache.match()
                      // Drawback is whenever we make an HTTP request where we can't get a valid
                      //    return value, we will return to this page.
                      //   - This has a bad side effect that if at some point some other request
                      //   like fetching JSON from a url we can't reach, this will also be returned
                      //   Fine tuning required - will modify depending on route of resource, etc..
                      return cache.match('/offline.html')
                    })
                })
            }
          })
  )
}); // End DYNAMIC CACHING with Offline Fallback Page Strategy
*/


// Currently not in use
// NETWORK with CACHE FALLBACK Strategy
// Plus:  We serve updated content first
// Drawbacks:  -We do not take advantage of the faster response with a cache first strategy.
//             - If a fetch fails, the Network does not respond instantly;
//              this is especially problematic with LIE-FI
//             (ie. a request may timeout in 60 sec where user would have to wait a full 60 sec
//             before you reach out to the backup cache == Terrible user experience)
// Use Case:  For assets which you can fetch in the background
//     that do not have to be used immediately
/*
self.addEventListener('fetch', event => {
  // We want to first respond with our network and then fall back to the cache if no connection
  event.respondWith(
    fetch(event.request)
      .catch(error => {
        return caches.match(event.request)
      })
  );
}); // End of NETWORK with CACHE FALLBACK Strategy
*/



// NETWORK FIRST, then DYNAMIC, then CACHE FALLBACK Strategy
/*
self.addEventListener('fetch', event => {
  // Network First
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Dynamically Cache and then return response
        return caches.open(DYNAMIC_CACHE)
          .then(cache => {
            cache.put(event.request.url, networkResponse.clone());
            return networkResponse;
          })
      })
      .catch(error => {
        // Return response from the Cache
        return caches.match(event.request);
      })
  )
});   // End NETWORK FIRST, then DYNAMIC WITH CACHE FALLBACK Strategy

*/




