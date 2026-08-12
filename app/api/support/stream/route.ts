import { getSupportSnapshot, subscribe } from 'lib/support';
import { isAdmin } from '../auth/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url); const visitorId = url.searchParams.get('visitorId'); const admin = isAdmin(request);
  if (!admin && !visitorId) return new Response('Yetkili girişi gerekli.', { status: 401 });
  const encoder = new TextEncoder(); let cleanup = () => {};
  const stream = new ReadableStream({ async start(controller) {
    const send = async () => { const snapshot = await getSupportSnapshot(); const conversationId = visitorId ? `conv_${visitorId}` : ''; const payload = admin ? snapshot : { visitors: [], agentOnline: snapshot.agentOnline, conversations: snapshot.conversations.filter((conversation) => conversation.id === conversationId), messages: snapshot.messages.filter((message) => message.conversationId === conversationId) }; controller.enqueue(encoder.encode(`event: support\ndata: ${JSON.stringify(payload)}\n\n`)); };
    await send(); const unsubscribe = subscribe(() => { void send(); }); cleanup = () => { unsubscribe(); try { controller.close(); } catch {} };
  }, cancel() { cleanup(); } });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
