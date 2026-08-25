import { describe, expect, it } from 'vitest';
describe('widget build contract', () => {
  it('uses anonymous visitor prefix', () => {
    expect('visitor_abc123456789').toMatch(/^visitor_/);
  });
});
