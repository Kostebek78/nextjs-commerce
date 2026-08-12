"use client";

import {
  ChatBubbleLeftRightIcon,
  MinusIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: number;
  author: "agent" | "customer";
  text: string;
  timestamp: string;
};

const quickReplies = ["Kargo durumum nedir?", "İade süreci", "Beden önerisi"];

function now() {
  return new Intl.DateTimeFormat("tr", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function CustomerSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      author: "agent",
      text: "Merhaba! Canlı destek ekibimiz çevrimiçi. Sipariş, ürün veya iade konusunda nasıl yardımcı olabiliriz?",
      timestamp: now(),
    },
  ]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const response = useMemo(() => {
    const latestCustomerMessage = [...messages]
      .reverse()
      .find((message) => message.author === "customer");

    if (!latestCustomerMessage) return "";

    const normalized = latestCustomerMessage.text.toLocaleLowerCase("tr");

    if (normalized.includes("kargo") || normalized.includes("sipariş")) {
      return "Sipariş numaranızı paylaşırsanız kargo durumunu hemen kontrol edebiliriz. Ortalama yanıt süremiz 2 dakikadır.";
    }

    if (normalized.includes("iade")) {
      return "İade taleplerinizi teslimattan sonraki 30 gün içinde başlatabilirsiniz. Size en yakın iade adımını birlikte seçebiliriz.";
    }

    if (normalized.includes("beden") || normalized.includes("ölçü")) {
      return "Beden konusunda yardımcı olalım. Ürünün ölçü tablosunu ve kullanım tercihinizi birlikte değerlendirebiliriz.";
    }

    return "Mesajınızı aldık. Bir temsilci kısa süre içinde sohbete katılıp size özel destek sağlayacak.";
  }, [messages]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || latestMessage.author !== "customer") return;

    setIsTyping(true);
    const timeout = window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          author: "agent",
          text: response,
          timestamp: now(),
        },
      ]);
      setIsTyping(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [messages, response]);

  function sendMessage(event?: FormEvent<HTMLFormElement>, message = draft) {
    event?.preventDefault();

    const text = message.trim();

    if (!text) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        author: "customer",
        text,
        timestamp: now(),
      },
    ]);
    setDraft("");
    setIsOpen(true);
  }

  return (
    <section className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/20 dark:border-neutral-700 dark:bg-neutral-900 sm:w-96">
          <div className="flex items-center justify-between bg-neutral-900 px-5 py-4 text-white dark:bg-white dark:text-neutral-900">
            <div>
              <p className="text-sm font-semibold">Canlı müşteri desteği</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-300 dark:text-neutral-600">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Temsilciler çevrimiçi
              </div>
            </div>
            <button
              aria-label="Destek penceresini küçült"
              className="rounded-full p-2 hover:bg-white/10 dark:hover:bg-neutral-900/10"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <MinusIcon className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={transcriptRef}
            className="flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-5"
          >
            {messages.map((message) => (
              <div
                className={clsx(
                  "flex flex-col",
                  message.author === "customer" ? "items-end" : "items-start",
                )}
                key={message.id}
              >
                <p
                  className={clsx(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                    message.author === "customer"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white",
                  )}
                >
                  {message.text}
                </p>
                <span className="mt-1 px-1 text-[11px] text-neutral-500">
                  {message.timestamp}
                </span>
              </div>
            ))}
            {isTyping ? (
              <p className="text-sm text-neutral-500">Temsilci yazıyor...</p>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            {quickReplies.map((reply) => (
              <button
                className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700 dark:hover:border-blue-400 dark:hover:text-blue-300"
                key={reply}
                onClick={() => sendMessage(undefined, reply)}
                type="button"
              >
                {reply}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2 px-4 pb-4"
            onSubmit={sendMessage}
          >
            <input
              aria-label="Destek mesajı"
              className="min-w-0 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Mesajınızı yazın..."
              value={draft}
            />
            <button
              aria-label="Mesaj gönder"
              className="rounded-full bg-blue-600 p-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!draft.trim()}
              type="submit"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        aria-label="Canlı destek sohbetini aç"
        className="group flex items-center gap-3 rounded-full bg-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="relative">
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-blue-600 bg-green-400 group-hover:border-blue-700" />
        </span>
        Canlı destek
      </button>
    </section>
  );
}
