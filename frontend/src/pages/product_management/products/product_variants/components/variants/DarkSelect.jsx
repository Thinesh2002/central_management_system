export default function DarkSelect({ label, value, onChange, children, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-400">
        {label}
      </span>

      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
    </label>
  );
}
