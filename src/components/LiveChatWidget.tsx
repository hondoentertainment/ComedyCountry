"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Message = {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
};

type Props = {
  eventId: string;
};

export function LiveChatWidget({ eventId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const url = lastTimestampRef.current
        ? `/api/live-chat/${eventId}?after=${encodeURIComponent(lastTimestampRef.current)}`
        : `/api/live-chat/${eventId}`;

      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      if (data.isActive === false) {
        setIsActive(false);
      }

      const newMessages: Message[] = data.messages ?? [];
      if (newMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const unique = newMessages.filter((m) => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
        lastTimestampRef.current =
          newMessages[newMessages.length - 1].createdAt;
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [eventId]);

  useEffect(() => {
    fetchMessages();

    const interval = setInterval(() => {
      if (isActive) {
        fetchMessages();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMessages, isActive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/live-chat/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });

      if (res.status === 401) {
        setError("Sign in to chat");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send");
      }

      setInput("");
      // Immediately fetch to show new message
      await fetchMessages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-zinc-800 rounded-lg flex flex-col h-96">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Live Chat</h3>
        <span
          className={`inline-flex items-center gap-1.5 text-xs ${
            isActive ? "text-green-400" : "text-zinc-500"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-green-400 animate-pulse" : "bg-zinc-600"
            }`}
          />
          {isActive ? "Live" : "Ended"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-8">
            {isActive
              ? "No messages yet. Say something!"
              : "Chat has ended."}
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="text-zinc-500 text-xs mr-2">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-brand-gold font-medium mr-1.5">
                {msg.userId.slice(0, 8)}
              </span>
              <span className="text-zinc-300">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isActive && (
        <form
          onSubmit={handleSend}
          className="border-t border-zinc-800 px-3 py-2 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-gold"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      )}
      {error && (
        <p className="px-4 pb-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
