// Service worker بسيط - شرط أساسي من المتصفح عشان يسمح بتثبيت الموقع كتطبيق.
// مش بيعمل تخزين مؤقت (cache) للبيانات عشان دايمًا تفتح أحدث نسخة من النظام.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  // مرّر كل الطلبات زي ما هي للشبكة - لا يوجد تخزين مؤقت (offline) في هذه النسخة.
  e.respondWith(fetch(e.request));
});
