import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import { loadConfig } from '@temmuz/config';
import { prisma } from '@temmuz/database';
import {
  loginSchema,
  messageSchema,
  pageViewSchema,
  quickReplySchema,
  visitorSessionSchema,
} from '@temmuz/shared';

const cfg = loadConfig();
const PRESENCE_TIMEOUT_MS = 45_000;
export let io: Server;
let redis: Redis | undefined;

function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function requireAuth(req: any) {
  await req.jwtVerify();
}
async function requireAdmin(req: any) {
  await req.jwtVerify();
  if (req.user.role !== 'ADMIN')
    throw Object.assign(new Error('Admin yetkisi gerekli'), { statusCode: 403, code: 'FORBIDDEN' });
}

async function markStaleVisitorsOffline() {
  const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_MS);
  const result = await prisma.visitor.updateMany({
    where: { online: true, lastSeenAt: { lt: cutoff } },
    data: { online: false },
  });
  if (result.count > 0) io?.emit('visitor:offline', { count: result.count });
}

async function sendAgent(conversationId: string, agentId: string, body: unknown) {
  const p = messageSchema.parse({ ...(body as object), conversationId });
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
  });
  if (conversation.status === 'CLOSED')
    throw Object.assign(new Error('Conversation closed'), {
      statusCode: 409,
      code: 'CONVERSATION_CLOSED',
    });
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderType: 'AGENT',
      senderId: agentId,
      agentId,
      message: p.message,
      metadata: p.metadata,
      clientMessageId: p.clientMessageId,
      deliveredAt: new Date(),
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'OPEN', assignedAgentId: agentId },
  });
  io.to(conversationId).emit('message:new', message);
  io.to(`visitor:${conversation.visitorId}`).emit('message:new', message);
  io.to('agents').emit('message:new', message);
  return { success: true, message };
}

function registerRealtime(app: FastifyInstance) {
  io = new Server(app.server, { cors: { origin: cfg.CORS_ORIGIN.split(','), credentials: true } });
  io.on('connection', async (socket) => {
    const { role, visitorId, siteId, token } = socket.handshake.auth as Record<
      string,
      string | undefined
    >;
    if (role === 'admin') {
      try {
        if (!token) throw new Error('Missing token');
        app.jwt.verify(token);
        socket.join('agents');
        io.emit('agent:online', { id: socket.id });
      } catch {
        socket.disconnect(true);
      }
    }
    if (role === 'customer' && visitorId) {
      const visitor = await prisma.visitor.findUnique({
        where: { siteId_visitorId: { siteId: siteId ?? cfg.WIDGET_SITE_ID, visitorId } },
      });
      if (visitor) {
        socket.join(`visitor:${visitor.id}`);
        await prisma.visitor.update({
          where: { id: visitor.id },
          data: { online: true, lastSeenAt: new Date() },
        });
        io.to('agents').emit('visitor:update', visitor);
        const conversation = await prisma.conversation.findFirst({
          where: { visitorId: visitor.id, status: { not: 'CLOSED' } },
          orderBy: { updatedAt: 'desc' },
        });
        if (conversation) socket.join(conversation.id);
      }
    }
    socket.on('customer:message', async (payload, ack) => {
      try {
        const p = messageSchema.parse(payload);
        if (!visitorId) throw new Error('Visitor required');
        const visitor = await prisma.visitor.findUniqueOrThrow({
          where: { siteId_visitorId: { siteId: siteId ?? cfg.WIDGET_SITE_ID, visitorId } },
        });
        let conversation =
          p.conversationId === 'new'
            ? null
            : await prisma.conversation.findUnique({ where: { id: p.conversationId } });
        if (conversation && conversation.visitorId !== visitor.id)
          throw Object.assign(new Error('Unauthorized conversation'), { statusCode: 403 });
        if (!conversation || conversation.status === 'CLOSED') {
          conversation = await prisma.conversation.create({
            data: { visitorId: visitor.id, status: 'WAITING' },
          });
          io.to('agents').emit('conversation:created', conversation);
        }
        socket.join(conversation.id);
        const msg = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'CUSTOMER',
            senderId: visitor.visitorId,
            message: p.message,
            metadata: p.metadata,
            clientMessageId: p.clientMessageId,
            deliveredAt: new Date(),
          },
        });
        await prisma.visitorEvent.create({
          data: {
            visitorId: visitor.id,
            type: 'MESSAGE_SENT',
            metadata: { conversationId: conversation.id },
          },
        });
        io.to(conversation.id).emit('message:new', msg);
        io.to('agents').emit('message:new', msg);
        ack({ ok: true, id: msg.id, conversationId: conversation.id });
      } catch (e) {
        ack({ ok: false, error: e instanceof Error ? e.message : 'error' });
      }
    });
    socket.on('agent:message', async (payload, ack) => {
      try {
        const msg = await sendAgent(payload.conversationId, socket.id, payload);
        ack({ ok: true, id: msg.message.id });
      } catch (e) {
        ack({ ok: false, error: e instanceof Error ? e.message : 'error' });
      }
    });
    socket.on('visitor:pageview', async (p) => {
      try {
        const b = pageViewSchema.parse(p);
        const visitor = await prisma.visitor.update({
          where: { siteId_visitorId: { siteId: b.siteId, visitorId: b.visitorId } },
          data: {
            currentUrl: b.currentUrl,
            currentTitle: b.currentTitle,
            pageType: b.pageType,
            productId: b.product?.id,
            productName: b.product?.name,
            productUrl: b.product?.url,
            category: b.product?.category,
            lastSeenAt: new Date(),
            online: true,
          },
        });
        io.to('agents').emit('visitor:pageview', visitor);
      } catch {}
    });
  });
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      redact: [
        'req.headers.authorization',
        'password',
        'token',
        'message',
        'req.cookies.temmuz_session',
      ],
    },
    genReqId: () => crypto.randomUUID(),
  });
  await app.register(helmet);
  await app.register(cors, { origin: cfg.CORS_ORIGIN.split(','), credentials: true });
  await app.register(cookie, { secret: cfg.SESSION_SECRET });
  await app.register(jwt, {
    secret: cfg.JWT_SECRET,
    cookie: { cookieName: 'temmuz_session', signed: false },
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  if (cfg.REDIS_URL) {
    redis = new Redis(cfg.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    redis.on('error', () => undefined);
  }
  app.setErrorHandler((e, _req, reply) =>
    reply.status((e as any).statusCode ?? 500).send({
      success: false,
      error: { code: (e as any).code ?? 'INTERNAL_ERROR', message: e.message },
    }),
  );
  app.get('/health', async () => {
    let database = 'ok';
    let redisStatus = cfg.REDIS_URL ? 'ok' : 'disabled';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    if (redis) {
      try {
        if (redis.status === 'wait') await redis.connect();
        await redis.ping();
      } catch {
        redisStatus = 'error';
      }
    }
    return {
      status: database === 'ok' && redisStatus !== 'error' ? 'ok' : 'degraded',
      database,
      redis: redisStatus,
    };
  });
  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const body = loginSchema.parse(req.body);
      const user = await prisma.adminUser.findUnique({ where: { email: body.email } });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        !(await bcrypt.compare(body.password, user.passwordHash))
      )
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı' },
        });
      const token = app.jwt.sign(
        { sub: user.id, role: user.role, email: user.email },
        { expiresIn: '8h' },
      );
      reply.setCookie('temmuz_session', token, {
        httpOnly: true,
        secure: cfg.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return { success: true, token, user: publicUser(user) };
    },
  );
  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('temmuz_session', { path: '/' });
    return { success: true };
  });
  app.get('/auth/me', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    user: await prisma.adminUser.findUnique({
      where: { id: req.user.sub },
      select: { id: true, name: true, email: true, role: true },
    }),
  }));
  app.get('/admin/users', { preHandler: requireAdmin }, async () => ({
    success: true,
    users: await prisma.adminUser.findMany({
      select: { id: true, name: true, email: true, role: true, status: true },
    }),
  }));
  app.post('/widget/session', async (req) => {
    const b = visitorSessionSchema.parse(req.body);
    await prisma.site.upsert({
      where: { siteId: b.siteId },
      update: {},
      create: { siteId: b.siteId, name: 'Temmuz Online', whatsappNumber: cfg.WHATSAPP_NUMBER },
    });
    const visitor = await prisma.visitor.upsert({
      where: { siteId_visitorId: { siteId: b.siteId, visitorId: b.visitorId } },
      update: {
        sessionId: b.sessionId,
        lastSeenAt: new Date(),
        online: true,
        currentUrl: b.currentUrl,
        currentTitle: b.currentTitle,
        referrer: b.referrer,
        userAgent: b.userAgent,
        deviceType: b.deviceType,
        browser: b.browser,
        operatingSystem: b.operatingSystem,
        pageType: b.pageType,
        productId: b.product?.id,
        productName: b.product?.name,
        productUrl: b.product?.url,
        category: b.product?.category,
      },
      create: {
        siteId: b.siteId,
        visitorId: b.visitorId,
        sessionId: b.sessionId,
        online: true,
        currentUrl: b.currentUrl,
        currentTitle: b.currentTitle,
        referrer: b.referrer,
        userAgent: b.userAgent,
        deviceType: b.deviceType,
        browser: b.browser,
        operatingSystem: b.operatingSystem,
        pageType: b.pageType,
        productId: b.product?.id,
        productName: b.product?.name,
        productUrl: b.product?.url,
        category: b.product?.category,
      },
    });
    io?.to('agents').emit('visitor:update', visitor);
    return { success: true, visitorId: visitor.visitorId };
  });
  app.post('/widget/heartbeat', async (req) => {
    const b = pageViewSchema.parse(req.body);
    const visitor = await prisma.visitor.update({
      where: { siteId_visitorId: { siteId: b.siteId, visitorId: b.visitorId } },
      data: {
        lastSeenAt: new Date(),
        online: true,
        currentUrl: b.currentUrl,
        currentTitle: b.currentTitle,
      },
    });
    io?.to('agents').emit('visitor:update', visitor);
    return { success: true };
  });
  app.post('/widget/pageview', async (req) => {
    const b = pageViewSchema.parse(req.body);
    const visitor = await prisma.visitor.update({
      where: { siteId_visitorId: { siteId: b.siteId, visitorId: b.visitorId } },
      data: {
        lastSeenAt: new Date(),
        online: true,
        currentUrl: b.currentUrl,
        currentTitle: b.currentTitle,
        pageType: b.pageType,
        productId: b.product?.id,
        productName: b.product?.name,
        productUrl: b.product?.url,
        category: b.product?.category,
      },
    });
    await prisma.visitorEvent.create({
      data: {
        visitorId: visitor.id,
        type: b.pageType === 'product' ? 'PRODUCT_VIEW' : 'PAGE_VIEW',
        url: b.currentUrl,
        title: b.currentTitle,
        metadata: b.product ?? {},
      },
    });
    io?.to('agents').emit('visitor:pageview', visitor);
    return { success: true };
  });
  app.get('/visitors', { preHandler: requireAuth }, async () => ({
    success: true,
    visitors: await prisma.visitor.findMany({
      orderBy: { lastSeenAt: 'desc' },
      include: { conversations: true },
    }),
  }));
  app.get('/visitors/:id', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    visitor: await prisma.visitor.findUnique({
      where: { id: req.params.id },
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 30 },
        conversations: { include: { messages: { take: 3, orderBy: { createdAt: 'desc' } } } },
      },
    }),
  }));
  app.get('/conversations', { preHandler: requireAuth }, async () => ({
    success: true,
    conversations: await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { visitor: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    }),
  }));
  app.get('/conversations/:id', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    conversation: await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        visitor: { include: { events: { take: 20, orderBy: { createdAt: 'desc' } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    }),
  }));
  app.post('/conversations/:id/close', { preHandler: requireAuth }, async (req: any) => {
    const c = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    await prisma.visitorEvent.create({
      data: { visitorId: c.visitorId, type: 'CHAT_CLOSED', metadata: { conversationId: c.id } },
    });
    io.to(c.id).emit('conversation:closed', c);
    io.to('agents').emit('conversation:updated', c);
    return { success: true, conversation: c };
  });
  app.get('/conversations/:id/messages', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    messages: await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
    }),
  }));
  app.post('/conversations/:id/messages', { preHandler: requireAuth }, async (req: any) =>
    sendAgent(req.params.id, req.user.sub, req.body),
  );
  app.get('/quick-replies', { preHandler: requireAuth }, async () => ({
    success: true,
    quickReplies: await prisma.quickReply.findMany({
      where: { siteId: cfg.WIDGET_SITE_ID },
      orderBy: { createdAt: 'desc' },
    }),
  }));
  app.post('/quick-replies', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    quickReply: await prisma.quickReply.create({
      data: {
        ...quickReplySchema.parse(req.body),
        siteId: cfg.WIDGET_SITE_ID,
        createdById: req.user.sub,
      },
    }),
  }));
  app.put('/quick-replies/:id', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    quickReply: await prisma.quickReply.update({
      where: { id: req.params.id },
      data: quickReplySchema.partial().parse(req.body),
    }),
  }));
  app.delete('/quick-replies/:id', { preHandler: requireAuth }, async (req: any) => ({
    success: true,
    quickReply: await prisma.quickReply.delete({ where: { id: req.params.id } }),
  }));
  registerRealtime(app);
  setInterval(markStaleVisitorsOffline, 30_000).unref();
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: cfg.PORT, host: '0.0.0.0' });
}
