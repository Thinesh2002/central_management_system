import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        message,
        title: options.title || "Confirm",
        confirmLabel: options.confirmLabel || "Delete",
        cancelLabel: options.cancelLabel || "Cancel",
      });
    });
  }, []);

  function settle(result) {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => settle(false)}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={17} className="text-purple-200" />
                <h3 className="text-sm font-semibold text-white">{state.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => settle(false)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm leading-6 text-slate-300">{state.message}</p>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 px-5 py-3.5">
              <button
                type="button"
                onClick={() => settle(false)}
                className="h-9 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 text-[13px] font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {state.cancelLabel}
              </button>

              <button
                type="button"
                onClick={() => settle(true)}
                className="h-9 cursor-pointer rounded-lg bg-red-600 px-4 text-[13px] font-semibold text-white transition hover:bg-red-500"
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }

  return confirm;
}
