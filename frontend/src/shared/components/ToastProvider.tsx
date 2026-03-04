import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CloseIcon } from "./Icons";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (payload: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastClasses(variant: ToastVariant) {
  if (variant === "success") {
    return "border-[#86efac] bg-[#f0fdf4] text-[#166534]";
  }
  if (variant === "error") {
    return "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]";
  }
  return "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((payload: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: ToastItem = { id, ...payload };
    setToasts((previous) => [...previous, next]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-md border p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)] ${getToastClasses(toast.variant)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold leading-5">{toast.title}</p>
                {toast.message ? <p className="text-xs leading-4 opacity-90">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="opacity-80 hover:opacity-100"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

