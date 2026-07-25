/**
 * Inside English — Service Worker
 *
 * - Caches the app shell on install.
 * - Network-first for HTML (with cache fallback for offline navigation).
 * - Cache-first for static assets.
 * - For .mp3 audio requests, supports HTTP 206 Range requests from cache so
 *   that offline playback (especially on iOS Safari) works.
 */

const CACHE_VERSION = "ie-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const SHELL_URLS = ["/", "/library", "/study", "/profile", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Range requests for audio — must return 206 Partial Content from cache.
  if (req.headers.has("range") && url.pathname.endsWith(".mp3")) {
    event.respondWith(handleRangeAudio(req));
    return;
  }

  // Audio: cache-first
  if (url.pathname.endsWith(".mp3") || url.pathname.endsWith(".m4a") || url.pathname.endsWith(".aac")) {
    event.respondWith(cacheFirst(req, AUDIO_CACHE));
    return;
  }

  // HTML: network-first with cache fallback
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }

  // Static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch (err) {
    const cached = await cache.match(req);
    return cached || cache.match("/");
  }
}

async function handleRangeAudio(req) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(req.url);
  if (!cached) {
    try {
      return await fetch(req);
    } catch {
      return Response.error();
    }
  }
  const buffer = await cached.arrayBuffer();
  const rangeHeader = req.headers.get("range") || "";
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) return new Response(buffer, { status: 200 });
  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : buffer.byteLength - 1;
  const slice = buffer.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: [
      ["Content-Type", cached.headers.get("Content-Type") || "audio/mpeg"],
      ["Content-Length", String(slice.byteLength)],
      ["Content-Range", `bytes ${start}-${end}/${buffer.byteLength}`],
      ["Accept-Ranges", "bytes"],
      ["Cache-Control", "public, max-age=31536000, immutable"],
    ],
  });
}
