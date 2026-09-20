const VERSION = "medvision-v1";
const ROUTES = [
  "/", "/dashboard", "/capture", "/triage", "/result", "/patients", "/patients/new", "/camp", "/sync", "/review", "/compare", "/district",
  ...["p1", "p2", "p3", "p4", "p5"].flatMap((id) => [`/patients/${id}`, `/patients/${id}/change`]),
];
const ASSETS = [
  "/models/triage.onnx", "/models/threshold.json",
  "/ort/ort.wasm.min.js", "/ort/ort-wasm-simd-threaded.wasm", "/ort/ort-wasm-simd-threaded.mjs",
  "/opencv/opencv.js",
  "/samples/benign.jpg", "/samples/monitor.jpg", "/samples/refer.jpg",
  "/icon-192.png", "/icon-512.png",
];

async function cacheWithLinks(cache, url, seen) {
  if (seen.has(url)) return;
  seen.add(url);
  const res = await fetch(url, { cache: "reload" });
  if (!res.ok) return;
  await cache.put(url, res.clone());
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html") && !type.includes("text/css")) return;
  const text = await res.text();
  const found = new Set(
    (text.match(/\/_next\/static\/[^"' )<>]+/g) || []).map((u) => u.split("\\")[0])
  );
  await Promise.all([...found].map((u) => cacheWithLinks(cache, u.replace(/&amp;/g, "&"), seen).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      const seen = new Set();
      await Promise.allSettled([...ROUTES, ...ASSETS].map((u) => cacheWithLinks(cache, u, seen)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  const isNav = req.mode === "navigate" || req.headers.get("RSC") === "1";
  if (isNav) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = (await cache.match(req)) || (await cache.match(url.pathname)) || (await cache.match("/dashboard"));
          if (hit) return hit;
          return new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: url.pathname.startsWith("/_next/") ? false : true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return new Response("", { status: 504 });
      }
    })()
  );
});
