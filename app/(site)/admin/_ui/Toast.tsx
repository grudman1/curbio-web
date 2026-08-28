"use client";

// Save/error feedback for every write in the app — no silent saves, no page
// reloads. Mounted once in AppShell; screens call useToast().
//
// Bottom-right, auto-dismiss (errors stay longer), dismiss on click.
// Entrance is a 120ms rise that collapses to a plain fade under
// prefers-reduced-motion.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<{
  toast: (kind: ToastKind, message: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider (AppShell mounts it)");
  return ctx.toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(1);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 6500 : 3200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 right-4 z-overlay flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-2"
          >
            {items.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => dismiss(t.id)}
                className="pointer-events-auto flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-app-border bg-app-card p-3 text-left shadow-app-pop motion-safe:animate-[toast-in_160ms_var(--easing-out)] motion-reduce:animate-none"
              >
                <span
                  className={`mt-px inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full ${
                    t.kind === "success" ? "bg-pill-good-bg text-pill-good-fg" : "bg-pill-bad-bg text-pill-bad-fg"
                  }`}
                >
                  <Icon name={t.kind === "success" ? "check" : "x"} size={11} />
                </span>
                <span className="min-w-0 flex-1 font-sans text-ops-body leading-[1.4] text-content">
                  {t.message}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
