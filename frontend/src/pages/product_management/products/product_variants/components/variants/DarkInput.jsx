export default function DarkInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  required = false,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-400">
        {label}
        {required ? <span className="text-slate-200"> *</span> : null}
      </span>

      <input
        type={type}
        step={step}
        value={value ?? ""}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-400"
      />
    </label>
  );
}
