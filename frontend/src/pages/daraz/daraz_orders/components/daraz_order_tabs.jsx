export default function DarazOrderTabs({ tabs, counts, activeStatus, onChange }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center overflow-x-auto bg-[#101722] px-4">
      {tabs.map((tab) => {
        const active = activeStatus === tab.key;
        const count = Number(counts?.[tab.countKey] || 0);

        return (
          <button
            key={tab.key || "all"}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`group relative inline-flex h-10 cursor-pointer items-center gap-2 overflow-hidden border-b-2 px-4 text-[13px] font-bold transition-all duration-300 ${
              active
                ? "border-orange-500 text-orange-300"
                : "border-transparent text-slate-400 hover:border-white/[0.18] hover:text-slate-200"
            }`}
          >
            {!active && (
              <>
                <span className="pointer-events-none absolute inset-0 bg-white/[0.035] transition-all duration-300 group-hover:bg-white/[0.07]" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] to-transparent opacity-70" />
              </>
            )}

            <span className="relative z-10 whitespace-nowrap">
              {tab.label}
            </span>

            <span
              className={`relative z-10 rounded-md px-2 py-0.5 text-[11px] transition-all duration-300 ${
                active
                  ? "bg-orange-500/15 text-orange-200"
                  : "bg-white/[0.08] text-slate-400 group-hover:bg-white/[0.12] group-hover:text-slate-200"
              }`}
            >
              {count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}