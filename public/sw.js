/**
 * Inside English v2.0 - High Performance Service Worker
 * Features:
 * 1. Pre-caches core app UI shell (HTML, CSS, JS, fonts).
 * 2. Caches regular text-based APIs using Stale-While-Revalidate.
 * 3. Dynamic Audio Caching for offline playback.
 * 4. CRITICAL: Custom HTTP Range Request support for iOS Safari and mobile Chrome 
 *    (standard cache-first strategies fail for media elements because they strictly require 206 Partial Content).
 */

const CACHE_NAME = 'inside-english-v2-cache';
const AUDIO_CACHE_NAME = 'inside-english-audio-cache';

// Core assets to pre-cache on app installation
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // You would list your bundled CSS, JS files, and static fonts/icons here
];

// 1. INSTALL EVENT
// Pre-caches all essential structural files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core UI Shell...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT
// Clean up legacy caches from prior deploys
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== AUDIO_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH INTERCEPTION & STRATEGIES
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is an audio file request (e.g., .mp3 from storage or CDN)
  const isAudioRequest = 
    url.pathname.endsWith('.mp3') || 
    url.pathname.includes('/storage/v1/object/public/audio/') ||
    event.request.headers.get('Accept')?.includes('audio/');

  if (isAudioRequest) {
    event.respondWith(handleAudioFetch(event.request));
  } else {
    // Standard Strategy for UI Assets & Pages: Stale-While-Revalidate
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update cache if network response is healthy
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, serve fallback or offline page if not in cache
          console.warn('[Service Worker] Network request failed. Serving cached fallback.');
        });

        return cachedResponse || fetchPromise;
      })
    );
  }
});

/**
 * Custom Handler for Audio Fetching.
 * Resolves the iOS/Safari range request bug by slicing cached array buffers
 * and serving correct HTTP 206 Partial Content headers.
 */
async function handleAudioFetch(request) {
  const audioCache = await caches.open(AUDIO_CACHE_NAME);
  const cachedResponse = await audioCache.match(request);

  if (cachedResponse) {
    console.log('[Service Worker] Audio cache hit! Serving from disk...', request.url);
    
    // Check if browser requested partial content (Range Header is required by mobile players)
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      return returnRangeResponse(cachedResponse, rangeHeader);
    }
    return cachedResponse;
  }

  // Cache miss: Stream from network, cache it for future offline plays, and return response
  console.log('[Service Worker] Audio cache miss. Downloading track...', request.url);
  try {
    const networkResponse = await fetch(request);
    
    // Cache the fully downloaded audio track for future offline use (Status 200 or 206)
    if (networkResponse.status === 200 || networkResponse.status === 206) {
      const responseToCache = networkResponse.clone();
      // Store in specific audio cache
      await audioCache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Audio download failed and not cached:', error);
    // Return standard error response
    return new Response('Audio unavailable offline', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Helper to process and serve cached audio responses for HTTP Range requests (HTTP 206).
 */
async function returnRangeResponse(cachedResponse, rangeHeader) {
  const arrayBuffer = await cachedResponse.arrayBuffer();
  const totalLength = arrayBuffer.byteLength;
  const mimeType = cachedResponse.headers.get('Content-Type') || 'audio/mpeg';

  // Parse Range header (e.g., "bytes=0-100000" or "bytes=25000-")
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
  if (!rangeMatch) {
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': totalLength.toString(),
        'Accept-Ranges': 'bytes',
      }
    });
  }

  const start = parseInt(rangeMatch[1], 10);
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalLength - 1;

  const slicedBuffer = arrayBuffer.slice(start, end + 1);
  const slicedLength = slicedBuffer.byteLength;

  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': slicedLength.toString(),
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Accept-Ranges': 'bytes',
    }
  });
}
