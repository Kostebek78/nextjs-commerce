import { NextResponse } from 'next/server';
import { addMessage, getSupportSnapshot, markRead, setAgentOnline, setConversationStatus, setTyping, upsertVisitor } from 'lib/support';
import { isAdminRequest } from '@/lib/support-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const visitorId = url.searchParams.get('visitorId');
  const admin = isAdminRequest(request);

  if (!admin && !visitorId) return NextResponse.json({ error: 'Yetkili girişi gerekli.' }, { status: 401 });

  const snapshot = await getSupportSnapshot();
  const conversationId = visitorId ? `conv_${visitorId}` : '';

  return NextResponse.json({
    visitors: admin ? snapshot.visitors : [],
    agentOnline: snapshot.agentOnline,
    conversations: admin
      ? snapshot.conversations
      : snapshot.conversations.filter((conversation) => conversation.id === conversationId),
    messages: visitorId
      ? snapshot.messages.filter((message) => message.conversationId === conversationId)
      : admin
        ? snapshot.messages
        : [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    visitorId?: string;
    pageUrl?: string;
    pageTitle?: string;
    conversationId?: string;
    text?: string;
    author?: 'customer' | 'agent';
    status?: 'open' | 'pending' | 'closed';
    typing?: boolean;
    online?: boolean;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
  };

  if (body.action === 'visitor' || body.action === 'heartbeat') {
    if (!body.visitorId || !body.pageUrl) return NextResponse.json({ error: 'Ziyaretçi bilgisi eksik.' }, { status: 400 });
    return NextResponse.json({
      visitor: await upsertVisitor({
        visitorId: body.visitorId,
        pageUrl: body.pageUrl,
        pageTitle: body.pageTitle ?? '',
      }),
    });
  }

  const admin = isAdminRequest(request);

  if (!admin && (
    body.author === 'agent' ||
    body.action === 'status' ||
    body.action === 'read' ||
    body.action === 'agent_presence' ||
    (body.action === 'typing' && body.author !== 'customer')
  )) {
    return NextResponse.json({ error: 'Yetkili girişi gerekli.' }, { status: 401 });
  }

  if (body.action === 'agent_presence') {
    return NextResponse.json({ agentOnline: await setAgentOnline(Boolean(body.online)) });
  }

  if (body.action === 'typing') {
    if (!body.conversationId || !body.author) return NextResponse.json({ error: 'Konuşma ve kullanıcı tipi eksik.' }, { status: 400 });
    await setTyping(body.conversationId, body.author, Boolean(body.typing));
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'read') {
    if (!body.conversationId) return NextResponse.json({ error: 'Konuşma eksik.' }, { status: 400 });
    await markRead(body.conversationId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'status') {
    if (!body.conversationId || !body.status) return NextResponse.json({ error: 'Durum eksik.' }, { status: 400 });
    return NextResponse.json({ conversation: await setConversationStatus(body.conversationId, body.status) });
  }

  const text = body.text?.trim();
  if (!text || !body.conversationId || (body.author !== 'customer' && body.author !== 'agent')) {
    return NextResponse.json({ error: 'Geçersiz mesaj.' }, { status: 400 });
  }

  if (body.author === 'agent' && !admin) return NextResponse.json({ error: 'Yetkili girişi gerekli.' }, { status: 401 });

  return NextResponse.json({
    message: await addMessage({
      conversationId: body.conversationId,
      author: body.author,
      text,
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
      attachmentType: body.attachmentType,
    }),
  }, { status: 201 });
}
