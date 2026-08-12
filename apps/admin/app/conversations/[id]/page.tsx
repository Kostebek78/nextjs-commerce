'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API, api } from '../../../src/api';
export default function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<any>();
  const [text, setText] = useState('');
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);
  useEffect(() => {
    if (!id) return;
    api(`/conversations/${id}`).then((d) => setData(d.conversation));
    const s = io(API, { auth: { role: 'admin' } });
    s.emit('join', id);
    s.on('message:new', (m: any) => {
      if (m.conversationId === id)
        setData((d: any) => ({ ...d, messages: [...(d?.messages ?? []), m] }));
    });
    return () => {
      s.close();
    };
  }, [id]);
  async function send() {
    if (!text.trim()) return;
    const r = await api(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        conversationId: id,
        message: text,
        clientMessageId: crypto.randomUUID(),
      }),
    });
    setData((d: any) => ({ ...d, messages: [...(d?.messages ?? []), r.message] }));
    setText('');
  }
  if (!data) return <p>Yükleniyor...</p>;
  return (
    <div className="chat">
      <aside className="card" style={{ padding: 16 }}>
        Konuşma
        <br />
        <b>{data.status}</b>
      </aside>
      <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
        <h2>{data.visitor.productName ?? data.visitor.currentTitle ?? data.visitor.visitorId}</h2>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {data.messages.map((m: any) => (
            <p key={m.id} style={{ textAlign: m.senderType === 'AGENT' ? 'right' : 'left' }}>
              <span className="card" style={{ display: 'inline-block', padding: 10 }}>
                {m.message}
              </span>
            </p>
          ))}
        </div>
        <textarea
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn" onClick={send}>
          Gönder
        </button>
      </section>
      <aside className="card" style={{ padding: 16 }}>
        <h3>Ziyaretçi</h3>
        <p>{data.visitor.visitorId}</p>
        <p>{data.visitor.online ? '🟢 Online' : '⚪ Offline'}</p>
        <p>{data.visitor.currentUrl}</p>
        <p>
          {data.visitor.deviceType} / {data.visitor.browser}
        </p>
        <h4>Timeline</h4>
        {data.visitor.events.map((e: any) => (
          <small key={e.id}>
            {e.type} - {e.title}
            <br />
          </small>
        ))}
      </aside>
    </div>
  );
}
