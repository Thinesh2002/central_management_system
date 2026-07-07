import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message, { type = "success", duration = 3000 } = {}) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);

      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-2 border px-4 py-3 text-sm font-bold shadow-2xl ${
              toast.type === "error"
                ? "border-rose-500/40 bg-rose-600 text-white"
                : "border-emerald-500/40 bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "error" ? (
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
            )}

            <span className="flex-1">{toast.message}</span>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="cursor-pointer text-white/80 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);

  if (!showToast) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return showToast;
}
