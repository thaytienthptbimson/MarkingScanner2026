/* Service Worker cho ứng dụng chấm OMR.
   - Thư viện nặng (opencv.js, Tailwind, SheetJS): ưu tiên cache, chỉ tải mạng lần đầu.
   - Trang và file cùng thư mục: ưu tiên mạng (để nhận bản cập nhật), mất mạng thì dùng cache.
   Khi sửa index.html, đổi tên CACHE (v1 -> v2) nếu muốn ép điện thoại làm mới. */
const CACHE = 'omr-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all([
      c.add('./index.html'),
      c.add('./opencv.js').catch(() => {})   // không có file này cũng không sao
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const HEAVY = /opencv\.js|cdn\.tailwindcss\.com|xlsx/;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === location.origin;
  if (!same && !HEAVY.test(req.url)) return;

  const save = res => {
    // chỉ lưu phản hồi thành công (hoặc opaque của script CDN), không lưu lỗi 404
    if (res && (res.ok || res.type === 'opaque'))
      caches.open(CACHE).then(c => c.put(req, res.clone()));
    return res;
  };

  if (HEAVY.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(save)));
  } else {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
  }
});
