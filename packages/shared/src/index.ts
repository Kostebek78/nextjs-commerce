import { z } from 'zod';
export const SENDER_TYPES = ['CUSTOMER', 'AGENT', 'SYSTEM'] as const;
export const CONVERSATION_STATUS = ['OPEN', 'WAITING', 'CLOSED'] as const;
export const VISITOR_EVENTS = [
  'PAGE_VIEW',
  'PRODUCT_VIEW',
  'CHAT_OPEN',
  'CHAT_STARTED',
  'MESSAGE_SENT',
  'CHAT_CLOSED',
] as const;
export const messageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
  clientMessageId: z.string().min(8).max(128).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export const visitorSessionSchema = z.object({
  siteId: z.string().min(1),
  visitorId: z.string().regex(/^visitor_[a-zA-Z0-9_-]{8,}$/),
  sessionId: z.string().min(8),
  currentUrl: z.string().url(),
  currentTitle: z.string().max(300).optional(),
  referrer: z.string().max(1000).optional(),
  userAgent: z.string().max(500).optional(),
  deviceType: z.string().max(50).optional(),
  browser: z.string().max(80).optional(),
  operatingSystem: z.string().max(80).optional(),
  product: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      category: z.string().optional(),
    })
    .optional(),
  pageType: z.string().max(80).optional(),
});
export const pageViewSchema = visitorSessionSchema.pick({
  siteId: true,
  visitorId: true,
  sessionId: true,
  currentUrl: true,
  currentTitle: true,
  product: true,
  pageType: true,
});
export const quickReplySchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  isActive: z.boolean().default(true),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type SenderType = (typeof SENDER_TYPES)[number];
export type ConversationStatus = (typeof CONVERSATION_STATUS)[number];
export interface ServerToClientEvents {
  'message:new': (payload: ChatMessage) => void;
  'visitor:update': (payload: VisitorSnapshot) => void;
  'conversation:updated': (payload: ConversationSnapshot) => void;
}
export interface ClientToServerEvents {
  'customer:message': (
    payload: z.infer<typeof messageSchema>,
    ack: (r: { ok: boolean; id?: string; error?: string }) => void,
  ) => void;
  'agent:message': (
    payload: z.infer<typeof messageSchema>,
    ack: (r: { ok: boolean; id?: string; error?: string }) => void,
  ) => void;
  'visitor:pageview': (payload: z.infer<typeof pageViewSchema>) => void;
}
export type ChatMessage = {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  message: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  metadata?: unknown;
};
export type VisitorSnapshot = {
  id: string;
  visitorId: string;
  online: boolean;
  currentUrl?: string | null;
  currentTitle?: string | null;
  productName?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  lastSeenAt: string;
};
export type ConversationSnapshot = {
  id: string;
  visitorId: string;
  status: ConversationStatus;
  updatedAt: string;
};
export const jsonHeaders = { 'content-type': 'application/json' };
