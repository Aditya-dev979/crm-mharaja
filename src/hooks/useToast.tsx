import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Toast, { type ToastTone } from "@/components/feedback/Toast";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_DURATION = 4200;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
    const handle = timers.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = ++nextId.current;
      setToasts(list => [...list.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(handle => window.clearTimeout(handle));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map(t => (
            <Toast key={t.id} tone={t.tone} title={t.title} message={t.message} onClose={() => dismiss(t.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
