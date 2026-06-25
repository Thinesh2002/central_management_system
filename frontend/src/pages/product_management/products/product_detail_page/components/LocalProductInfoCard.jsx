export default function LocalProductInfoCard({ title, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-xl shadow-black/10">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-[#111827] px-4 py-3">
        {Icon && <Icon size={17} className="text-orange-300" />}
        <h2 className="text-sm font-black text-white">{title}</h2>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

export function DetailItem({ label, value, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-[#070b16] p-3 ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-100">
        {value || "-"}
      </p>
    </div>
  );
}

export function Badge({ children, tone = "slate" }) {
  const toneClass = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    slate: "border-slate-600 bg-slate-800/60 text-slate-200",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}>
      {children}
    </span>
  );
}
