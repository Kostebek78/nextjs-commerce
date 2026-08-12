import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type SupportAuthor = 'customer' | 'agent';
export type ConversationStatus = 'open' | 'pending' | 'closed';
export type SupportMessage = { id: string; conversationId: string; author: SupportAuthor; text: string; createdAt: string; attachmentUrl?: string; attachmentName?: string; attachmentType?: string };
export type Visitor = { id: string; name: string; pageUrl: string; pageTitle: string; online: boolean; lastSeenAt: string; createdAt: string; conversationId: string };
export type Conversation = { id: string; visitorId: string; status: ConversationStatus; unread: number; typing: boolean; createdAt: string; updatedAt: string };
type Store = { visitors: Visitor[]; conversations: Conversation[]; messages: SupportMessage[] };
const dataDir = path.join(process.cwd(), '.data');
const dataFile = path.join(dataDir, 'support.json');
const fallback: Store = { visitors: [], conversations: [], messages: [] };
const globalStore = globalThis as typeof globalThis & { __supportStore?: Store; __supportListeners?: Set<(event: string) => void> };
const listeners = globalStore.__supportListeners ?? (globalStore.__supportListeners = new Set());
async function readStore(): Promise<Store> {
  if (globalStore.__supportStore) return globalStore.__supportStore;
  try { globalStore.__supportStore = JSON.parse(await readFile(dataFile, 'utf8')) as Store; }
  catch { await mkdir(dataDir, { recursive: true }); globalStore.__supportStore = structuredClone(fallback); }
  return globalStore.__supportStore;
}
async function persist(store: Store) { await mkdir(dataDir, { recursive: true }); await writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8'); listeners.forEach((listener) => listener('update')); }
export async function getSupportSnapshot() { const store = await readStore(); return store; }
export async function upsertVisitor(input: { visitorId: string; pageUrl: string; pageTitle: string }) {
  const store = await readStore(); const now = new Date().toISOString(); let visitor = store.visitors.find((item) => item.id === input.visitorId);
  if (!visitor) { const conversationId = `conv_${input.visitorId}`; visitor = { id: input.visitorId, name: `Ziyaretçi ${input.visitorId.slice(-5)}`, pageUrl: input.pageUrl, pageTitle: input.pageTitle, online: true, lastSeenAt: now, createdAt: now, conversationId }; store.visitors.unshift(visitor); store.conversations.unshift({ id: conversationId, visitorId: visitor.id, status: 'open', unread: 0, typing: false, createdAt: now, updatedAt: now }); }
  else { visitor.pageUrl = input.pageUrl; visitor.pageTitle = input.pageTitle; visitor.online = true; visitor.lastSeenAt = now; }
  await persist(store); return visitor;
}
export async function markVisitorOffline(visitorId: string) { const store = await readStore(); const visitor = store.visitors.find((item) => item.id === visitorId); if (visitor) { visitor.online = false; visitor.lastSeenAt = new Date().toISOString(); await persist(store); } }
export async function setTyping(conversationId: string, typing: boolean) { const store = await readStore(); const conversation = store.conversations.find((item) => item.id === conversationId); if (conversation) { conversation.typing = typing; conversation.updatedAt = new Date().toISOString(); await persist(store); } }
export async function addMessage(input: Omit<SupportMessage, 'id' | 'createdAt'>) { const store = await readStore(); const message: SupportMessage = { ...input, id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() }; store.messages.push(message); const conversation = store.conversations.find((item) => item.id === input.conversationId); if (conversation) { conversation.updatedAt = message.createdAt; if (input.author === 'customer') conversation.unread += 1; } await persist(store); return message; }
export async function setConversationStatus(conversationId: string, status: ConversationStatus) { const store = await readStore(); const conversation = store.conversations.find((item) => item.id === conversationId); if (!conversation) return null; conversation.status = status; conversation.updatedAt = new Date().toISOString(); await persist(store); return conversation; }
export async function markRead(conversationId: string) { const store = await readStore(); const conversation = store.conversations.find((item) => item.id === conversationId); if (conversation) { conversation.unread = 0; await persist(store); } }
export function subscribe(listener: (event: string) => void) { listeners.add(listener); return () => listeners.delete(listener); }
