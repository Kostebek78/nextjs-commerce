# Temmuz Online Self-Hosted Live Support

Temmuz Online için JivoChat/Tawk/Crisp gibi üçüncü taraf SaaS kullanmadan çalışan, tek JavaScript snippet ile İkas veya herhangi bir web sitesine eklenebilen canlı destek monorepo'su.

## Architecture

- `apps/api`: Fastify REST API, Socket.IO realtime server, auth, rate limit, health check.
- `apps/admin`: Next.js admin paneli (`/login`, `/dashboard`, `/conversations`, `/visitors`, `/settings`, `/quick-replies`).
- `apps/widget`: Framework bağımsız Vanilla TypeScript widget; Shadow DOM ile CSS izolasyonu.
- `packages/database`: Prisma schema, migration ve seed.
- `packages/shared`: Zod validation, ortak event ve type sözleşmeleri.
- `packages/config`: environment validation.
- `infra/nginx`: `support.temmuzonline.com` ve `api.support.temmuzonline.com` reverse proxy.

Mesaj akışı: Customer widget -> Socket.IO API -> PostgreSQL persistence -> admin room -> temsilci cevabı -> müşteri socket room.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker / Docker Compose
- PostgreSQL 16
- Redis 7 (production presence/rate limit altyapısı için compose içinde hazır)

## Installation

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Development admin credentials:

- Email: `admin@temmuzonline.com`
- Password: `TemmuzOnline!2026`

Production'da seed şifresini ve tüm secret değerlerini mutlaka değiştirin.

## Development

```bash
pnpm --filter @temmuz/api dev
pnpm --filter @temmuz/admin dev
pnpm --filter @temmuz/widget dev
```

## Docker

```bash
docker compose up -d
```

Servisler:

- API: <http://localhost:4000>
- Admin: <http://localhost:3000>
- Widget static build: <http://localhost:8080/widget.js>
- Nginx: <http://localhost>

## Database migration and seed

```bash
pnpm db:migrate
pnpm db:seed
```

Seed 1 admin, 2 agent, 3 visitor, 3 conversation ve örnek mesajları oluşturur.

## Widget installation

İkas özel kod alanına veya herhangi bir web sitesine ekleyin:

```html
<script
  src="https://support.temmuzonline.com/widget.js"
  data-site-id="temmuz-online"
  data-api-url="https://api.support.temmuzonline.com"
></script>
```

Widget `localStorage` içinde sadece anonim `visitor_xxx` kimliğini saklar. IP adresi kalıcı olarak saklanmaz. Ürün bilgisi sırasıyla JSON-LD Product, OpenGraph ve DOM fallback üzerinden algılanır.

## REST API

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /visitors`, `GET /visitors/:id`
- `GET /conversations`, `GET /conversations/:id`, `POST /conversations/:id/close`
- `GET /conversations/:id/messages`, `POST /conversations/:id/messages`
- `GET/POST/PUT/DELETE /quick-replies`
- `POST /widget/session`, `POST /widget/heartbeat`, `POST /widget/pageview`
- `GET /health`

Standart hata formatı:

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

## WebSocket events

- Visitor: `visitor:update`, `visitor:pageview`
- Conversation: `conversation:created`, `conversation:updated`
- Message: `message:new`
- Agent: `agent:online`

Socket.IO reconnect client tarafında aktiftir. Mesajlar server-side PostgreSQL'e yazılır ve `clientMessageId` unique constraint ile duplicate azaltılır.

## Security

- Password hash: bcrypt.
- Auth cookie: HttpOnly, SameSite=Lax, production'da Secure.
- Validation: Zod.
- Security headers: Helmet.
- Rate limit: Fastify rate limit, login brute-force limiti.
- CORS allow-list environment üzerinden.
- XSS: Admin/widget mesajları text node/React escaping ile render eder, HTML injection yapılmaz.
- KVKK: anonim visitor, minimum veri, IP kalıcı saklama yok.

## Production deployment

1. `JWT_SECRET` ve `SESSION_SECRET` için güçlü rastgele değer üretin.
2. PostgreSQL yedekleme planı kurun (`pg_dump`, PITR veya managed backup).
3. Nginx önüne Let's Encrypt veya kurumsal SSL ekleyin.
4. `CORS_ORIGIN` değerini sadece Temmuz Online ve admin domainleriyle sınırlandırın.
5. Varsayılan seed admin şifresini değiştirin.

## Testing

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config
```

E2E senaryoları `tests/e2e` altında genişletilecek Playwright yapısı için ayrılmıştır.

## Troubleshooting

- `DATABASE_URL` yoksa config validation API başlangıcını durdurur.
- Admin listeleri boşsa `pnpm db:seed` çalıştırın.
- Widget bağlanmıyorsa `data-api-url`, CORS ve Nginx WebSocket proxy ayarlarını kontrol edin.
- Production'da HTTPS yoksa secure cookie ve browser notification davranışları sınırlı olabilir.
