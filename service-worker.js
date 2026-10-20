
const CACHE_NAME = "circle-academic-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("circle-academic-") &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Menangani notifikasi Web Push dari server.
self.addEventListener("push", (event) => {
  let data = {
    title: "Circle Academic Tracker",
    body: "Ada pengingat tugas atau agenda untukmu.",
    url: "./"
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: {
        url: data.url || "./"
      },
      tag: data.tag || "circle-reminder",
      renotify: false
    })
  );
});

// Membuka aplikasi ketika notifikasi diketuk.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "./",
    self.location.origin
  );

  if (targetUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of windows) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          return;
        }
      }

      await self.clients.openWindow(targetUrl.href);
    })()
  );
});

// Menangani navigasi aplikasi saat online/offline.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      return (
        (await caches.match(request)) ||
        new Response(
          "Kamu sedang offline. Hubungkan internet lalu coba lagi.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        )
      );
    })
  );
});
