const CACHE_NAME = "zhiqi-react-ui-v9";
const CORE_ASSETS = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./manifest.webmanifest"];

async function precacheApplication() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    CORE_ASSETS.map(async (asset) => {
      const response = await fetch(asset, { cache: "no-cache" });
      if (response.ok) await cache.put(asset, response);
    })
  );
  const response = await fetch("./index.html", { cache: "no-cache" });
  const html = await response.text();
  const buildAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => /\.(?:js|css)$/.test(url));
  await cache.addAll([...new Set(buildAssets)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheApplication();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request.url, { cache: "no-cache" })
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, response.clone());
            await cache.put("./index.html", response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreVary: requestUrl.origin === self.location.origin });
          if (cached) return cached;
          return (await caches.match("./index.html")) || new Response("Offline resource unavailable", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreVary: requestUrl.origin === self.location.origin });
        if (cached) return cached;
        return new Response("Offline resource unavailable", { status: 503, statusText: "Offline" });
      })
  );
});
