import { describe, expect, it } from 'vitest';
import { loginSchema, messageSchema, visitorSessionSchema } from '@temmuz/shared';
describe('validation', () => {
  it('validates login', () =>
    expect(
      loginSchema.safeParse({ email: 'admin@temmuzonline.com', password: 'TemmuzOnline!2026' })
        .success,
    ).toBe(true));
  it('limits messages', () =>
    expect(
      messageSchema.safeParse({ conversationId: 'c', message: 'x'.repeat(2001) }).success,
    ).toBe(false));
  it('creates anonymous visitor sessions', () =>
    expect(
      visitorSessionSchema.safeParse({
        siteId: 'temmuz-online',
        visitorId: 'visitor_abcdefghi',
        sessionId: 'session_1',
        currentUrl: 'https://temmuzonline.com',
      }).success,
    ).toBe(true));
});
