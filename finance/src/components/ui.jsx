import { useEffect } from "react";
import { Loader2, X } from "lucide-react";

export function Spinner({ size = 22 }) {
  return <Loader2 size={size} className="animate-spin text-orange-400" />;
}

export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-900 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center px-4 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-orange-500 text-white hover:bg-orange-400 disabled:bg-orange-500/50",
    secondary: "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "text-slate-300 hover:bg-slate-800 hover:text-white",
  };
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export const inputClass =
  "h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-orange-400";

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, footer, width = "max-w-lg" }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className={`flex max-h-[90vh] w-full ${width} flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Alert({ tone = "error", children }) {
  const styles = {
    error: "border-red-500/40 bg-red-500/10 text-red-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    info: "border-slate-700 bg-slate-800/60 text-slate-300",
  };
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles[tone]}`}>{children}</div>;
}
