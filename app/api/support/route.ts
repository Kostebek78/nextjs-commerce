import { NextResponse } from 'next/server';
import { addMessage, getSupportSnapshot, markRead, setConversationStatus, setTyping, upsertVisitor } from 'lib/support';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const visitorId = url.searchParams.get('visitorId');
  const snapshot = await getSupportSnapshot();
  return NextResponse.json({ visitors: snapshot.visitors, conversations: snapshot.conversations, messages: visitorId ? snapshot.messages.filter((message) => message.conversationId === `conv_${visitorId}`) : snapshot.messages });
}

export async function POST(request: Request) {
  const body = await request.json() as { action?: string; visitorId?: string; pageUrl?: string; pageTitle?: string; conversationId?: string; text?: string; author?: 'customer' | 'agent'; status?: 'open' | 'pending' | 'closed'; typing?: boolean; attachmentUrl?: string; attachmentName?: string; attachmentType?: string };
  if (body.action === 'visitor') {
    if (!body.visitorId || !body.pageUrl) return NextResponse.json({ error: 'Ziyaretçi bilgisi eksik.' }, { status: 400 });
    return NextResponse.json({ visitor: await upsertVisitor({ visitorId: body.visitorId, pageUrl: body.pageUrl, pageTitle: body.pageTitle ?? '' }) });
  }
  if (body.action === 'typing') {
    if (!body.conversationId) return NextResponse.json({ error: 'Konuşma eksik.' }, { status: 400 });
    await setTyping(body.conversationId, Boolean(body.typing)); return NextResponse.json({ ok: true });
  }
  if (body.action === 'read') { if (body.conversationId) await markRead(body.conversationId); return NextResponse.json({ ok: true }); }
  if (body.action === 'status') {
    if (!body.conversationId || !body.status) return NextResponse.json({ error: 'Durum eksik.' }, { status: 400 });
    return NextResponse.json({ conversation: await setConversationStatus(body.conversationId, body.status) });
  }
  const text = body.text?.trim();
  if (!text || !body.conversationId || (body.author !== 'customer' && body.author !== 'agent')) return NextResponse.json({ error: 'Geçersiz mesaj.' }, { status: 400 });
  return NextResponse.json({ message: await addMessage({ conversationId: body.conversationId, author: body.author, text, attachmentUrl: body.attachmentUrl, attachmentName: body.attachmentName, attachmentType: body.attachmentType }) }, { status: 201 });
}
