'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API, api, authToken } from '../../../src/api';

export default function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<any>();
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sound, setSound] = useState(true);
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    api(`/conversations/${id}`).then((d) => setData(d.conversation));
    api('/quick-replies').then((d) => setQuickReplies((d.quickReplies ?? []).filter((q: any) => q.isActive)));
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    const s = io(API, { auth: { role: 'admin', token: authToken() } });
    s.on('message:new', (m: any) => {
      if (m.conversationId !== id) return;
      setData((d: any) => ({ ...d, messages: [...(d?.messages ?? []), m] }));
      if (m.senderType === 'CUSTOMER') {
        if (sound) new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=').play().catch(() => undefined);
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification('Yeni müşteri mesajı', { body: m.message });
          n.onclick = () => { window.focus(); location.href = `/conversations/${id}`; };
        }
      }
    });
    return () => { s.close(); };
  }, [id, sound]);
  async function send() {
    if (!text.trim()) return;
    const r = await api(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ conversationId: id, message: text, clientMessageId: crypto.randomUUID() }) });
    setData((d: any) => ({ ...d, messages: [...(d?.messages ?? []), r.message] }));
    setText('');
  }
  async function closeConversation() { await api(`/conversations/${id}/close`, { method: 'POST', body: '{}' }); setData((d: any) => ({ ...d, status: 'CLOSED' })); }
  if (!data) return <p>Yükleniyor...</p>;
  return (
    <div className="chat">
      <aside className="card" style={{ padding: 16 }}>
        <b>Konuşma</b><br /><span>{data.status}</span><br />
        <label><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sesli bildirim</label>
        <button className="btn" onClick={closeConversation} style={{ marginTop: 12 }}>Kapat</button>
        <h4>Hazır cevaplar</h4>
        {quickReplies.map((q) => <button key={q.id} className="input" onClick={() => setText(q.message)}>{q.title}</button>)}
      </aside>
      <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
        <h2>{data.visitor.productName ?? data.visitor.currentTitle ?? data.visitor.visitorId}</h2>
        <div style={{ flex: 1, overflow: 'auto' }}>{data.messages.map((m: any) => <p key={m.id} style={{ textAlign: m.senderType === 'AGENT' ? 'right' : 'left' }}><span className="card" style={{ display: 'inline-block', padding: 10 }}>{m.message}</span></p>)}</div>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn" onClick={send}>Gönder</button>
      </section>
      <aside className="card" style={{ padding: 16 }}>
        <h3>Ziyaretçi</h3><p>{data.visitor.visitorId}</p><p>{data.visitor.online ? '🟢 Online' : '⚪ Offline'}</p><p>{data.visitor.currentUrl}</p><p>{data.visitor.productName}</p><p>{data.visitor.deviceType} / {data.visitor.browser}</p>
        <h4>Timeline</h4>{data.visitor.events.map((e: any) => <small key={e.id}>{e.type} - {e.title}<br /></small>)}
      </aside>
    </div>
  );
}
