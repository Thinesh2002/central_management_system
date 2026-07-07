export function FormInput({ label, value, onChange, type = "text", placeholder = "", required = false, min, step }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
        {label} {required ? <span className="text-rose-400">*</span> : null}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full border border-slate-700 bg-[#0a101d] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
      />
    </label>
  );
}

export function FormSelect({ label, value, onChange, children, required = false, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
        {label} {required ? <span className="text-rose-400">*</span> : null}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-slate-700 bg-[#0a101d] px-4 py-3 text-sm text-slate-100 outline-none focus:border-yellow-500 disabled:bg-slate-900 disabled:text-slate-600"
      >
        {children}
      </select>
    </label>
  );
}

export function FormTextarea({ label, value, onChange, placeholder = "", rows = 4 }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-slate-700 bg-[#0a101d] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
      />
    </label>
  );
}
