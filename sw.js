/* Phantom Ops service worker — U-16
   Strategy:
   - HTML navigations : network-first, cache fallback (never stale after deploys)
   - assets (css/js/img): stale-while-revalidate (instant repeat loads, self-heals)
   - scope: /blog/ (served from repo root on GitHub Pages) */

var VERSION = 'phantom-v2'; /* v2: purge caches from the embargoed-post era */
var ROOT = self.location.pathname.replace(/\/sw\.js$/, ''); /* e.g. /blog */

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) {
        return c.addAll([ROOT + '/', ROOT + '/css/main.css', ROOT + '/js/main.js'])
          .catch(function () { /* precache best-effort only */ });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isAsset(url) {
  return /\.(css|js|png|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname) || url.pathname.indexOf(ROOT + '/assets/') === 0;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         /* only same-origin */
  if (url.pathname.indexOf(ROOT) !== 0) return;            /* only under /blog */

  if (req.mode === 'navigate') {
    /* network-first for pages */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match(ROOT + '/');
        });
      })
    );
    return;
  }

  if (isAsset(url)) {
    /* stale-while-revalidate */
    e.respondWith(
      caches.match(req).then(function (hit) {
        var refresh = fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || refresh;
      })
    );
  }
});
