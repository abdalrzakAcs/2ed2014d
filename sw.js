/**
 * تطبيق المالك على الموبايل: يفتح من الشاشة الرئيسية، والشاشة نفسها تبقى
 * متاحة بلا شبكة. بيانات الشركة تُطلب من الخادم عند الاتصال فقط، ولا تُخزَّن
 * في هذا الملف.
 */

const CACHE = 'acs-owner-shell-2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'].map((url) =>
          cache.add(url).catch(() => undefined),
        ),
      )
      await self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkPage(request))
    return
  }

  if (!isShellAsset(url.pathname)) return
  event.respondWith(cacheFirst(request))
})

function isShellAsset(pathname) {
  return (
    pathname.includes('/assets/') ||
    pathname.endsWith('/manifest.json') ||
    pathname.endsWith('/sw.js') ||
    pathname.includes('/icons/')
  )
}

async function networkPage(request) {
  try {
    const response = await fetch(request)
    const type = response.headers.get('content-type') ?? ''
    if (response.ok || type.includes('text/html')) {
      const copy = response.clone()
      const cache = await caches.open(CACHE)
      await cache.put('./index.html', copy)
      return response
    }
  } catch {
    /* بلا شبكة: الصفحة المحفوظة */
  }
  return (await caches.match('./index.html')) ?? (await caches.match('./')) ?? fetch(request)
}

async function cacheFirst(request) {
  const hit = await caches.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    const copy = response.clone()
    const cache = await caches.open(CACHE)
    await cache.put(request, copy)
  }
  return response
}
