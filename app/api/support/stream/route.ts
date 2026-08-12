import { getSupportSnapshot, subscribe } from 'lib/support';
import { isAdminRequest } from '../../../../lib/support-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const visitorId = url.searchParams.get('visitorId');
  const admin = isAdminRequest(request);

  if (!admin && !visitorId) return new Response('Yetkili girişi gerekli.', { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const snapshot = await getSupportSnapshot();
        const payload = admin
          ? snapshot
          : {
              visitors: [],
              agentOnline: snapshot.agentOnline,
              conversations: snapshot.conversations.filter((conversation) => conversation.id === `conv_${visitorId}`),
              messages: snapshot.messages.filter((message) => message.conversationId === `conv_${visitorId}`),
            };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      await send();
      cleanup = subscribe(() => {
        void send();
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
