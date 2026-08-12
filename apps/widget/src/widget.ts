import { io, Socket } from 'socket.io-client';
const script = document.currentScript as HTMLScriptElement | null;
const siteId = script?.dataset.siteId ?? 'temmuz-online';
const apiUrl = script?.dataset.apiUrl ?? 'https://api.support.temmuzonline.com';
const visitorKey = 'temmuz_support_visitor_id';
const whatsappNumber = script?.dataset.whatsappNumber ?? '905000000000';
const sessionId = `session_${crypto.randomUUID()}`;
const visitorId =
  localStorage.getItem(visitorKey) ??
  `visitor_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;
localStorage.setItem(visitorKey, visitorId);
function detect() {
  const ua = navigator.userAgent;
  return {
    deviceType: /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop',
    browser: /Chrome/i.test(ua)
      ? 'Chrome'
      : /Safari/i.test(ua)
        ? 'Safari'
        : /Firefox/i.test(ua)
          ? 'Firefox'
          : 'Unknown',
    operatingSystem: /Windows/i.test(ua)
      ? 'Windows'
      : /Mac/i.test(ua)
        ? 'macOS'
        : /Android/i.test(ua)
          ? 'Android'
          : /iPhone|iPad/i.test(ua)
            ? 'iOS'
            : 'Unknown',
  };
}
function product() {
  try {
    for (const el of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
      const data = JSON.parse(el.textContent || '{}');
      const arr = Array.isArray(data) ? data : [data];
      const p = arr.find(
        (x: any) =>
          x['@type'] === 'Product' || x['@graph']?.some?.((g: any) => g['@type'] === 'Product'),
      );
      const prod =
        p?.['@type'] === 'Product' ? p : p?.['@graph']?.find((g: any) => g['@type'] === 'Product');
      if (prod)
        return {
          id: String(prod.sku ?? prod.productID ?? ''),
          name: prod.name,
          url: location.href,
          category: prod.category,
        };
    }
  } catch {}
  const og = document.querySelector('meta[property="og:type"]')?.getAttribute('content');
  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? document.title;
  if (og?.includes('product')) return { name: title, url: location.href };
  const h = document.querySelector('h1')?.textContent?.trim();
  return h && location.pathname.includes('urun') ? { name: h, url: location.href } : undefined;
}
const page = () => ({
  siteId,
  visitorId,
  sessionId,
  currentUrl: location.href,
  currentTitle: document.title,
  referrer: document.referrer,
  userAgent: navigator.userAgent,
  ...detect(),
  pageType: product() ? 'product' : 'page',
  product: product(),
});
async function post(path: string, body: unknown) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
  }).catch(() => undefined);
  if (!response?.ok) return undefined;
  return response.json().catch(() => undefined);
}
const root = document.createElement('div');
root.id = 'temmuz-support-root';
document.body.appendChild(root);
const shadow = root.attachShadow({ mode: 'closed' });
shadow.innerHTML = `<style>:host{all:initial}.wrap{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:Inter,Arial,sans-serif}.btn{width:64px;height:64px;border-radius:999px;border:0;background:linear-gradient(135deg,#0f766e,#14b8a6);color:white;font-size:28px;box-shadow:0 18px 40px #0f172a35;cursor:pointer}.panel{display:none;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#fff;border-radius:24px;box-shadow:0 24px 80px #0f172a40;overflow:hidden;border:1px solid #dbe4ea}.open .panel{display:flex;flex-direction:column}.open .btn{display:none}.head{background:linear-gradient(135deg,#102a43,#0f766e);color:white;padding:18px}.head b{font-size:18px}.status{font-size:12px;opacity:.9}.msgs{flex:1;padding:14px;overflow:auto;background:#f8fafc}.msg{margin:8px 0;display:flex}.msg span{padding:10px 12px;border-radius:16px;max-width:82%;line-height:1.35;white-space:pre-wrap;word-break:break-word}.me{justify-content:flex-end}.me span{background:#0f766e;color:white}.them span{background:white;border:1px solid #e2e8f0}.form{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0}.form textarea{flex:1;resize:none;border:1px solid #cbd5e1;border-radius:14px;padding:10px;font:inherit}.send,.wa,.close{border:0;border-radius:12px;padding:10px 12px;cursor:pointer}.send{background:#0f766e;color:white}.wa{background:#25d366;color:white;width:100%;margin-top:10px}.close{float:right;background:#ffffff22;color:white}@media(max-width:520px){.wrap{right:10px;bottom:10px}.panel{width:calc(100vw - 20px);height:calc(100vh - 30px);max-height:none}}</style><div class="wrap"><div class="panel" role="dialog" aria-label="Temmuz Online canlı destek"><div class="head"><button class="close" aria-label="Kapat">×</button><b>Temmuz Online Canlı Destek</b><div class="status">Bağlanıyor...</div><button class="wa">WhatsApp ile devam et</button></div><div class="msgs" aria-live="polite"></div><div class="form"><textarea rows="2" maxlength="2000" placeholder="Mesajınızı yazın..."></textarea><button class="send">Gönder</button></div></div><button class="btn" aria-label="Canlı destek aç">💬</button></div>`;
const wrap = shadow.querySelector('.wrap')!,
  btn = shadow.querySelector('.btn')!,
  close = shadow.querySelector('.close')!,
  msgs = shadow.querySelector('.msgs')!,
  ta = shadow.querySelector('textarea') as HTMLTextAreaElement,
  status = shadow.querySelector('.status')!,
  sendBtn = shadow.querySelector('.send')!,
  wa = shadow.querySelector('.wa')!;
let socket: Socket;
let socketToken = '';
let conversationId = 'new';
let historyLoaded = false;
function add(text: string, me = false, id?: string) {
  if (id && msgs.querySelector(`[data-message-id="${id}"]`)) return;
  const d = document.createElement('div');
  d.className = `msg ${me ? 'me' : 'them'}`;
  if (id) d.setAttribute('data-message-id', id);
  const s = document.createElement('span');
  s.textContent = text;
  d.appendChild(s);
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}
function connect() {
  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    auth: { role: 'customer', visitorId, siteId, sessionId, token: socketToken },
    reconnection: true,
  });
  socket.on(
    'connect',
    () => (status.textContent = 'Online • temsilcilerimiz yardımcı olmaya hazır'),
  );
  socket.on('disconnect', () => (status.textContent = 'Bağlantı koptu, yeniden deneniyor'));
  socket.on('message:new', (m: any) => {
    if (m.senderType === 'AGENT') {
      conversationId = m.conversationId;
      add(m.message, false, m.id);
    }
  });
  socket.on('conversation:created', (c: any) => {
    conversationId = c.id;
  });
}
async function send() {
  const message = ta.value.trim();
  if (!message) return;
  ta.value = '';
  add(message, true);
  socket.emit(
    'customer:message',
    {
      conversationId,
      message,
      clientMessageId: crypto.randomUUID(),
      metadata: { url: location.href, product: product() },
    },
    (ack: any) => {
      if (ack.ok && ack.conversationId) conversationId = ack.conversationId;
      if (!ack.ok) add('Mesaj gönderilemedi, lütfen tekrar deneyin.', false);
    },
  );
  await post('/widget/pageview', page());
}
btn.addEventListener(
  'click',
  () => {
    wrap.classList.add('open');
    post('/widget/pageview', page());
    if (!historyLoaded && msgs.childElementCount === 0)
      add('Merhaba, Temmuz Online destek ekibine hoş geldiniz. Size nasıl yardımcı olabiliriz?');
  },
  { once: false },
);
close.addEventListener('click', () => wrap.classList.remove('open'));
sendBtn.addEventListener('click', send);
ta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
wa.addEventListener('click', () => {
  const p = product();
  const text = p?.name
    ? `Merhaba, ${p.name} ürünü hakkında bilgi almak istiyorum.`
    : 'Merhaba, Temmuz Online hakkında bilgi almak istiyorum.';
  open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
});
post('/widget/session', page()).then((session) => {
  socketToken = session?.socketToken ?? '';
  conversationId = session?.activeConversationId ?? 'new';
  if (Array.isArray(session?.messages)) {
    historyLoaded = session.messages.length > 0;
    for (const message of session.messages)
      add(message.message, message.senderType === 'CUSTOMER', message.id);
  }
  connect();
});
setInterval(() => post('/widget/heartbeat', page()), 25000);
let last = location.href;
setInterval(() => {
  if (location.href !== last) {
    last = location.href;
    post('/widget/pageview', page());
    socket?.emit('visitor:pageview', page());
  }
}, 1000);
