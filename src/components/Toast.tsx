"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

type ToastMessage = { id: number; text: string };

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const timeoutRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const toast = useCallback((message: string) => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, text: message }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timeoutRef.current.delete(id);
    }, 3000);
    timeoutRef.current.set(id, t);
  }, []);

  useEffect(() => {
    const timeouts = timeoutRef.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[110] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-lg bg-brand-surface border border-zinc-600 shadow-xl text-white text-sm font-medium flex items-center gap-2"
          >
            <span className="text-brand-gold" aria-hidden>✓</span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
