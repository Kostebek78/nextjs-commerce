"use client";

import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Message = { id: string; conversationId: string; author: 'agent' | 'customer'; text: string; createdAt: string; attachmentUrl?: string; attachmentName?: string; attachmentType?: string };
type ConversationState = { id: string; agentTyping?: boolean };
const quickReplies = ['Kargo durumum nedir?', 'İade süreci', 'Beden önerisi'];

function getVisitorId() {
  let id = localStorage.getItem('support_visitor_id');
  if (!id) { id = `visitor_${crypto.randomUUID()}`; localStorage.setItem('support_visitor_id', id); }
  return id;
}

export function CustomerSupportWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorId, setVisitorId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [agentTyping, setAgentTyping] = useState(false);
  const [agentOnline, setAgentOnline] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);

  async function register() {
    const id = getVisitorId(); setVisitorId(id);
    const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'visitor', visitorId: id, pageUrl: location.href, pageTitle: document.title }) });
    const data = await response.json();
    if (data.visitor) setConversationId(data.visitor.conversationId);
  }

  async function load() {
    if (!visitorId) return;
    const data = await fetch(`/api/support?visitorId=${encodeURIComponent(visitorId)}`, { cache: 'no-store' }).then((response) => response.json());
    setMessages(data.messages ?? []); setAgentOnline(data.agentOnline !== false);
    const conversation = (data.conversations ?? []).find((item: ConversationState) => item.id === `conv_${visitorId}`);
    setAgentTyping(Boolean(conversation?.agentTyping));
    if ((data.messages?.length ?? 0) > previousCount.current && !isOpen) setHasNew(true);
    previousCount.current = data.messages?.length ?? 0;
  }

  useEffect(() => { void register(); }, []);
  useEffect(() => { if (!visitorId) return; void register(); void load(); }, [pathname, visitorId]);
  useEffect(() => { if (!visitorId) return; const heartbeat = window.setInterval(() => void register(), 15_000); return () => window.clearInterval(heartbeat); }, [visitorId, pathname]);
  useEffect(() => { if (!visitorId) return; const eventSource = new EventSource(`/api/support/stream?visitorId=${encodeURIComponent(visitorId)}`); eventSource.addEventListener('support', () => void load()); return () => eventSource.close(); }, [visitorId, isOpen]);
  useEffect(() => { transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, agentTyping]);

  async function send(event?: FormEvent, preset = draft) {
    event?.preventDefault(); const text = preset.trim(); if (!text || !conversationId) return;
    let attachment: { attachmentUrl?: string; attachmentName?: string; attachmentType?: string } = {};
    if (file) { const form = new FormData(); form.append('file', file); const upload = await fetch('/api/support/upload', { method: 'POST', body: form }).then((response) => response.json()); if (upload.url) attachment = { attachmentUrl: upload.url, attachmentName: upload.name, attachmentType: upload.type }; }
    await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, text, author: 'customer', ...attachment }) });
    setDraft(''); setFile(null); setIsOpen(true); setHasNew(false);
  }

  function updateDraft(value: string) {
    setDraft(value);
    if (conversationId) void fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'typing', conversationId, author: 'customer', typing: Boolean(value.trim()) }) });
  }

  return <section className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
    {isOpen && <div className="w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border bg-white shadow-2xl sm:w-96 dark:border-neutral-700 dark:bg-neutral-900">
      <header className="flex items-center justify-between bg-neutral-900 px-5 py-4 text-white"><div><p className="text-sm font-semibold">Canlı müşteri desteği</p><p className="mt-1 text-xs text-neutral-300">{agentOnline ? '🟢 Temsilciler çevrimiçi' : '⚪ Şu anda mesai dışı'}</p></div><button onClick={() => setIsOpen(false)} aria-label="Kapat"><XMarkIcon className="h-5 w-5" /></button></header>
      <div ref={transcriptRef} className="flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-5">{messages.map((message) => <div key={message.id} className={clsx('flex flex-col', message.author === 'customer' ? 'items-end' : 'items-start')}><p className={clsx('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6', message.author === 'customer' ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 dark:text-white')}>{message.text}</p>{message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 text-xs text-blue-600">📎 {message.attachmentName}</a>}<span className="mt-1 text-[11px] text-neutral-500">{new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></div>)}{agentTyping && <p className="text-xs text-neutral-400">Temsilci yazıyor...</p>}</div>
      <div className="flex gap-2 overflow-x-auto border-t px-4 py-3">{quickReplies.map((reply) => <button key={reply} onClick={() => void send(undefined, reply)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs">{reply}</button>)}</div>
      {file && <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-xs"><span className="truncate">📎 {file.name}</span><button onClick={() => setFile(null)}>×</button></div>}
      <form onSubmit={send} className="flex items-center gap-2 px-4 pb-4"><label className="cursor-pointer rounded-full border p-3"><PaperClipIcon className="h-5 w-5" /><input type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><input value={draft} onChange={(event) => updateDraft(event.target.value)} placeholder="Mesajınızı yazın..." className="min-w-0 flex-1 rounded-full border bg-neutral-50 px-4 py-3 text-sm dark:bg-neutral-800" /><button disabled={!draft.trim()} className="rounded-full bg-blue-600 p-3 text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button></form>
    </div>}
    <button onClick={() => { setIsOpen(!isOpen); setHasNew(false); }} className="relative flex items-center gap-3 rounded-full bg-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-lg"><ChatBubbleLeftRightIcon className="h-6 w-6" />Canlı destek{hasNew && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] font-bold">!</span>}</button>
  </section>;
}
