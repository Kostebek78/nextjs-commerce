import bcrypt from 'bcryptjs';
import { prisma } from '../src/index.js';
async function main() {
  const site = await prisma.site.upsert({
    where: { siteId: 'temmuz-online' },
    update: {},
    create: {
      siteId: 'temmuz-online',
      name: 'Temmuz Online',
      domain: 'temmuzonline.com',
      whatsappNumber: '905000000000',
    },
  });
  const passwordHash = await bcrypt.hash('TemmuzOnline!2026', 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@temmuzonline.com' },
    update: { passwordHash },
    create: { name: 'Temmuz Admin', email: 'admin@temmuzonline.com', passwordHash, role: 'ADMIN' },
  });
  for (const email of ['ayse@temmuzonline.com', 'mehmet@temmuzonline.com'])
    await prisma.adminUser.upsert({
      where: { email },
      update: {},
      create: {
        name: email.startsWith('ayse') ? 'Ayşe Agent' : 'Mehmet Agent',
        email,
        passwordHash,
        role: 'AGENT',
      },
    });
  await prisma.quickReply.createMany({
    data: [
      {
        siteId: site.siteId,
        title: 'Karşılama',
        message: 'Merhaba, size nasıl yardımcı olabilirim?',
        createdById: admin.id,
      },
      {
        siteId: site.siteId,
        title: 'Kargo',
        message: 'Kargonuz siparişiniz onaylandıktan sonra hazırlanacaktır.',
        createdById: admin.id,
      },
      {
        siteId: site.siteId,
        title: 'Distribütör',
        message: 'Ürünümüz yetkili distribütör ürünüdür.',
        createdById: admin.id,
      },
    ],
    skipDuplicates: true,
  });
  for (let i = 1; i <= 3; i++) {
    const v = await prisma.visitor.upsert({
      where: { siteId_visitorId: { siteId: site.siteId, visitorId: `visitor_demo_${i}` } },
      update: {},
      create: {
        siteId: site.siteId,
        visitorId: `visitor_demo_${i}`,
        sessionId: `session_demo_${i}`,
        currentUrl: `https://temmuzonline.com/urun/demo-${i}`,
        currentTitle: i === 1 ? 'Ahmad Tea Yasemin Aromalı Yeşil Çay' : 'Temmuz Online Ürün',
        deviceType: 'desktop',
        browser: 'Chrome',
        operatingSystem: 'macOS',
        pageType: 'product',
        productName: i === 1 ? 'Ahmad Tea Yasemin Aromalı Yeşil Çay' : `Demo Ürün ${i}`,
        productUrl: `https://temmuzonline.com/urun/demo-${i}`,
        online: i < 3,
      },
    });
    const c = await prisma.conversation.create({
      data: {
        visitorId: v.id,
        status: i === 3 ? 'CLOSED' : 'WAITING',
        assignedAgentId: admin.id,
        closedAt: i === 3 ? new Date() : null,
      },
    });
    await prisma.message.createMany({
      data: [
        {
          conversationId: c.id,
          senderType: 'CUSTOMER',
          senderId: v.visitorId,
          message: 'Merhaba, ürün hakkında bilgi almak istiyorum.',
        },
        {
          conversationId: c.id,
          senderType: 'AGENT',
          senderId: admin.id,
          agentId: admin.id,
          message: 'Merhaba, memnuniyetle yardımcı olurum.',
        },
      ],
    });
    await prisma.visitorEvent.create({
      data: {
        visitorId: v.id,
        type: 'PRODUCT_VIEW',
        url: v.currentUrl,
        title: v.currentTitle,
        metadata: { productName: v.productName },
      },
    });
  }
}
main().finally(() => prisma.$disconnect());
