export default function LocalProductInfoCard({ title, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0b1220] shadow-lg shadow-black/20">
      <div className="flex items-center gap-2.5 border-b border-slate-800/80 bg-[#0f172a]/70 px-4 py-3">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-300">
            <Icon size={16} />
          </div>
        )}

        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          {title}
        </h2>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

export function DetailItem({ label, value, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-[#070b16] px-3.5 py-3 transition hover:border-slate-700 hover:bg-[#0a1020] ${className}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-medium text-slate-200">
        {value || "-"}
      </p>
    </div>
  );
}

export function Badge({ children, tone = "slate" }) {
  const toneClass = {
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    violet: "border-violet-500/25 bg-violet-500/10 text-violet-300",
    slate: "border-slate-700 bg-slate-800/60 text-slate-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    blue: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}