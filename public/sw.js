const CACHE_NAME = "zhiqi-react-ui-v5";
const CORE_ASSETS = ["./", "./index.html", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./manifest.webmanifest"];

async function precacheApplication() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE_ASSETS);
  const response = await fetch("./index.html");
  const html = await response.text();
  const buildAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => /\.(?:js|css)$/.test(url));
  await cache.addAll([...new Set(buildAssets)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplication());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const requestUrl = new URL(event.request.url);
        const cached = await caches.match(event.request, { ignoreVary: requestUrl.origin === self.location.origin });
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return new Response("Offline resource unavailable", { status: 503, statusText: "Offline" });
      })
  );
});
