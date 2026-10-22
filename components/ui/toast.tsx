"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const TOAST_DURATION = 4000;

const estilos: Record<
  ToastVariant,
  { icono: React.ComponentType<{ className?: string }>; color: string }
> = {
  success: { icono: CheckCircle2, color: "text-emerald-600" },
  error: { icono: XCircle, color: "text-destructive" },
  info: { icono: Info, color: "text-primary" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, variant: "info", ...options }]);
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const mapa = timers.current;
    return () => {
      mapa.forEach((timer) => clearTimeout(timer));
      mapa.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
      >
        {toasts.map((t) => {
          const variant = t.variant ?? "info";
          const { icono: Icono, color } = estilos[variant];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-3 text-sm shadow-lg duration-200 animate-in fade-in slide-in-from-bottom-2"
            >
              <Icono className={cn("mt-0.5 h-5 w-5 shrink-0", color)} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Cerrar notificación"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => dismiss(t.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}
