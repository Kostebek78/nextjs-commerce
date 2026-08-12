export type SupportAuthor = 'customer' | 'agent';

export type SupportMessage = {
  id: string;
  author: SupportAuthor;
  text: string;
  createdAt: string;
};

type SupportStore = {
  messages: SupportMessage[];
};

const globalStore = globalThis as typeof globalThis & {
  __nextjsCommerceSupportStore?: SupportStore;
};

export const supportStore =
  globalStore.__nextjsCommerceSupportStore ??
  (globalStore.__nextjsCommerceSupportStore = {
    messages: [
      {
        id: 'welcome',
        author: 'agent',
        text: 'Merhaba! Canlı destek ekibimiz çevrimiçi. Size nasıl yardımcı olabiliriz?',
        createdAt: new Date().toISOString()
      }
    ]
  });
