import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:3000';
const WIDGET = process.env.E2E_WIDGET_URL ?? 'http://localhost:5173/src/widget.ts';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('real customer widget to admin live chat flow persists messages and page tracking', async ({
  browser,
  request,
}) => {
  const bad = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@temmuzonline.com', password: 'wrong-password' },
  });
  expect(bad.status()).toBe(401);

  const login = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@temmuzonline.com', password: 'TemmuzOnline!2026' },
  });
  expect(login.ok()).toBeTruthy();
  const loginJson = await login.json();
  expect(loginJson.token).toBeTruthy();
  const cookies = login.headers()['set-cookie'];
  expect(cookies).toContain('temmuz_session=');

  const customerContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const customer = await customerContext.newPage();
  const admin = await adminContext.newPage();

  await admin.goto(`${ADMIN}/login`);
  await admin.getByRole('button', { name: /giriş yap/i }).click();
  await expect(admin).toHaveURL(/dashboard/);

  await customer.setContent(
    `<!doctype html><html><head><title>Ahmad Tea Yasemin Aromalı Yeşil Çay</title><meta property="og:type" content="product"><meta property="og:title" content="Ahmad Tea Yasemin Aromalı Yeşil Çay"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","sku":"test-urun","name":"Ahmad Tea Yasemin Aromalı Yeşil Çay","category":"Çay"}</script></head><body><h1>Ahmad Tea Yasemin Aromalı Yeşil Çay</h1><script src="${WIDGET}" data-site-id="temmuz-online" data-api-url="${API}" data-whatsapp-number="905000000000"></script></body></html>`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect
    .poll(() => customer.evaluate(() => localStorage.getItem('temmuz_support_visitor_id')))
    .toContain('visitor_');

  await customer.getByLabel(/canlı destek aç/i).click();
  await customer
    .getByPlaceholder(/Mesajınızı yazın/i)
    .fill('Merhaba, bu ürün hakkında bilgi almak istiyorum.');
  await customer.getByRole('button', { name: 'Gönder' }).click();

  await admin.goto(`${ADMIN}/conversations`);
  await expect(admin.getByText(/Ahmad Tea Yasemin/i)).toBeVisible({ timeout: 15_000 });
  await admin.getByText(/Ahmad Tea Yasemin/i).click();
  await expect(admin.getByText('Merhaba, bu ürün hakkında bilgi almak istiyorum.')).toBeVisible();
  await admin.getByRole('textbox').fill('Merhaba, memnuniyetle yardımcı olurum.');
  await admin.getByRole('button', { name: 'Gönder' }).click();
  await expect(customer.getByText('Merhaba, memnuniyetle yardımcı olurum.')).toBeVisible({
    timeout: 10_000,
  });

  await customer.evaluate(() => history.pushState({}, '', '/urun/test-urun'));
  await expect
    .poll(
      async () => {
        const visitorId = await customer.evaluate(() =>
          localStorage.getItem('temmuz_support_visitor_id'),
        );
        const visitor = await prisma.visitor.findUnique({
          where: { siteId_visitorId: { siteId: 'temmuz-online', visitorId: visitorId! } },
        });
        return visitor?.currentUrl ?? '';
      },
      { timeout: 10_000 },
    )
    .toContain('/urun/test-urun');

  await admin.reload();
  await expect(admin.getByText('/urun/test-urun')).toBeVisible({ timeout: 10_000 });
  await admin.getByRole('button', { name: 'Kapat' }).click();

  const visitorId = await customer.evaluate(() =>
    localStorage.getItem('temmuz_support_visitor_id'),
  );
  const visitor = await prisma.visitor.findUniqueOrThrow({
    where: { siteId_visitorId: { siteId: 'temmuz-online', visitorId: visitorId! } },
    include: { conversations: { include: { messages: true } } },
  });
  expect(visitor.online).toBe(true);
  expect(visitor.productName).toBe('Ahmad Tea Yasemin Aromalı Yeşil Çay');
  const messages = visitor.conversations.flatMap((c) => c.messages);
  expect(messages.some((m) => m.senderType === 'CUSTOMER' && m.message.includes('bu ürün'))).toBe(
    true,
  );
  expect(messages.some((m) => m.senderType === 'AGENT' && m.message.includes('memnuniyetle'))).toBe(
    true,
  );
  expect(visitor.conversations.some((c) => c.status === 'CLOSED')).toBe(true);

  await customerContext.close();
  await adminContext.close();
});
