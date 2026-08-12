"use client";

import { FormEvent, useEffect, useState } from 'react';

type Message = {
  id: string;
  author: 'customer' | 'agent';
  text: string;
  createdAt: string;
};

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');

  async function loadMessages() {
    const response = await fetch('/api/support', { cache: 'no-store' });
    const data = await response.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadMessages();
    const timer = window.setInterval(loadMessages, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author: 'agent' })
    });
    setDraft('');
    await loadMessages();
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-600">Firma yetkilisi</p>
        <h1 className="text-3xl font-bold">Canlı destek gelen kutusu</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Müşteri mesajları burada görünür. Cevabınızı yazıp gönderin; müşteri ekranı otomatik güncellenir.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          {messages.map((message) => (
            <div key={message.id} className={message.author === 'agent' ? 'flex justify-end' : 'flex justify-start'}>
              <div className="max-w-[75%]">
                <p className="mb-1 text-xs text-neutral-500">
                  {message.author === 'agent' ? 'Siz / Yetkili' : 'Müşteri'} · {new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className={message.author === 'agent' ? 'rounded-2xl rounded-br-sm bg-blue-600 px-4 py-3 text-white' : 'rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-3 text-neutral-900 dark:bg-neutral-800 dark:text-white'}>
                  {message.text}
                </div>
              </div>
            </div>
          ))}
          {!messages.length && <p className="text-sm text-neutral-500">Henüz mesaj yok.</p>}
        </div>

        <form onSubmit={sendMessage} className="flex gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
          <input
            className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="Müşteriye cevap yazın..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={!draft.trim()}>
            Gönder
          </button>
        </form>
      </section>
    </main>
  );
}
