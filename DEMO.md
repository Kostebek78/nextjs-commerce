# Demo Senaryosu

1. `docker compose up -d` ile sistem başlatılır.
2. `pnpm db:migrate && pnpm db:seed` ile demo verisi oluşturulur.
3. Browser 1: demo müşteri sayfasına widget snippet eklenir ve chat açılır.
4. Müşteri mesaj gönderir; API mesajı PostgreSQL'e kaydeder ve `message:new` eventini admin room'a yayınlar.
5. Browser 2: `http://localhost:3000/login` üzerinden `admin@temmuzonline.com / TemmuzOnline!2026` ile giriş yapılır.
6. `/conversations` ekranında müşteri konuşması görülür.
7. Temsilci cevap gönderir; müşteri widget `message:new` ile cevabı alır.
8. Müşteri URL değiştirdiğinde widget `/widget/pageview` çağırır ve admin ziyaretçi panelinde current URL güncellenir.
9. `/conversations/:id` sağ paneli ürün, cihaz, browser, ilk/son aktivite ve event timeline gösterir.
10. Conversation `POST /conversations/:id/close` ile kapatılır.
11. Mesaj persistence doğrulaması için Prisma veya SQL ile `Message` tablosu kontrol edilir.

Demo notu: Bu repository'de Playwright e2e iskeleti ayrılmıştır; gerçek tarayıcı testi deployment ortamında çalıştırılmalıdır.
