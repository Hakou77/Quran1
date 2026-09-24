const CACHE_NAME = "wird-v3";
const PRECACHE = [
  "./",
  "./index.html",
  "./fonts.css",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./images/quran-study.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

async function precacheFonts(cache) {
  try {
    const cssRes = await fetch("./fonts.css");
    if (!cssRes.ok) return;
    const css = await cssRes.text();
    const urls = [...css.matchAll(/url\((\.\/fonts\/[^)]+)\)/g)].map((m) => m[1]);
    await Promise.all(urls.map((u) => cache.add(u).catch(() => null)));
  } catch (_) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)));
        await precacheFonts(cache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() =>
          caches.match("./index.html").then((cached) => cached || caches.match("./"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        if (url.pathname.endsWith(".woff2")) return new Response("", { status: 504 });
        return new Response("", { status: 504 });
      });
    })
  );
});
