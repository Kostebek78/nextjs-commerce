import { NextResponse } from 'next/server';
import { supportStore, SupportAuthor } from 'lib/support';

export async function GET() {
  return NextResponse.json({ messages: supportStore.messages });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; author?: SupportAuthor };
  const text = body.text?.trim();
  const author = body.author;

  if (!text || (author !== 'customer' && author !== 'agent')) {
    return NextResponse.json({ error: 'Geçersiz mesaj.' }, { status: 400 });
  }

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    author,
    text,
    createdAt: new Date().toISOString()
  };

  supportStore.messages.push(message);
  return NextResponse.json({ message }, { status: 201 });
}
