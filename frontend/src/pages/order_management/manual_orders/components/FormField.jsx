export function FormInput({ label, className = "", error, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span> : null}
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-500 ${props.className || ""}`}
      />
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function FormSelect({ label, children, className = "", error, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span> : null}
      <select
        {...props}
        className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-orange-500 ${props.className || ""}`}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function FormTextarea({ label, className = "", error, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span> : null}
      <textarea
        {...props}
        className={`min-h-[96px] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-500 ${props.className || ""}`}
      />
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}
