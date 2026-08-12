import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as Client, type Socket } from 'socket.io-client';
import { buildApp } from '../server';
import { prisma } from '@temmuz/database';
import bcrypt from 'bcryptjs';

const sockets: Socket[] = [];
let baseUrl = '';
let app: Awaited<ReturnType<typeof buildApp>>;

function connect(auth: Record<string, unknown>) {
  const socket = Client(baseUrl, {
    auth,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  sockets.push(socket);
  return socket;
}

async function wait(ms = 250) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  app = await buildApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
  await prisma.site.upsert({
    where: { siteId: 'temmuz-online' },
    update: {},
    create: { siteId: 'temmuz-online', name: 'Temmuz Online' },
  });
  await prisma.adminUser.upsert({
    where: { email: 'socket-admin@temmuzonline.com' },
    update: { passwordHash: await bcrypt.hash('TemmuzOnline!2026', 4), role: 'ADMIN' },
    create: {
      email: 'socket-admin@temmuzonline.com',
      name: 'Socket Admin',
      passwordHash: await bcrypt.hash('TemmuzOnline!2026', 4),
      role: 'ADMIN',
    },
  });
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await app.close();
  await prisma.$disconnect();
});

describe('Socket.IO security', () => {
  it('denies unauthenticated and fake admin handshakes', async () => {
    const unauthenticated = connect({ role: 'admin' });
    const fake = connect({ role: 'admin', token: 'fake.jwt.token' });
    await wait();
    expect(unauthenticated.connected).toBe(false);
    expect(fake.connected).toBe(false);
  });

  it('allows authenticated admin handshakes', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'socket-admin@temmuzonline.com', password: 'TemmuzOnline!2026' },
    });
    const token = login.json().token;
    const admin = connect({ role: 'admin', token });
    await new Promise<void>((resolve, reject) => {
      admin.on('connect', () => resolve());
      admin.on('connect_error', reject);
    });
    expect(admin.connected).toBe(true);
  });

  it('denies customer access to another visitor conversation', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/widget/session',
      payload: {
        siteId: 'temmuz-online',
        visitorId: 'visitor_socket_a123456',
        sessionId: 'session_socket_a',
        currentUrl: 'https://temmuzonline.com/a',
      },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/widget/session',
      payload: {
        siteId: 'temmuz-online',
        visitorId: 'visitor_socket_b123456',
        sessionId: 'session_socket_b',
        currentUrl: 'https://temmuzonline.com/b',
      },
    });
    const firstVisitor = await prisma.visitor.findUniqueOrThrow({
      where: { siteId_visitorId: { siteId: 'temmuz-online', visitorId: 'visitor_socket_a123456' } },
    });
    const foreignConversation = await prisma.conversation.create({
      data: { visitorId: firstVisitor.id, status: 'WAITING' },
    });
    const customer = connect({
      role: 'customer',
      siteId: 'temmuz-online',
      visitorId: 'visitor_socket_b123456',
      sessionId: 'session_socket_b',
      token: second.json().socketToken,
    });
    await new Promise<void>((resolve, reject) => {
      customer.on('connect', () => resolve());
      customer.on('connect_error', reject);
    });
    const ack = await new Promise<{ ok: boolean; error?: string }>((resolve) =>
      customer.emit(
        'customer:message',
        {
          conversationId: foreignConversation.id,
          message: 'attack',
          clientMessageId: 'attack-message-1',
        },
        resolve,
      ),
    );
    expect(first.json().socketToken).toBeTruthy();
    expect(ack.ok).toBe(false);
    expect(ack.error).toContain('Unauthorized conversation');
  });
});
