import { useEffect, useRef, useState } from "react";
import { STATUS_TABS } from "../constants/manualOrdersConstants";

export default function ManualOrdersTabs({
  activeStatus,
  rowsCount,
  total,
  tabCounts = {},
  onChange,
}) {
  const lockedRef = useRef(false);
  const [fixedCounts, setFixedCounts] = useState({});

  useEffect(() => {
    const hasRealCounts =
      tabCounts &&
      typeof tabCounts === "object" &&
      Object.keys(tabCounts).length > 1;

    if (hasRealCounts) {
      setFixedCounts((prev) => ({
        ...prev,
        ...tabCounts,
      }));

      lockedRef.current = true;
      return;
    }

    if (!lockedRef.current) {
      setFixedCounts({
        all: total || rowsCount || 0,
      });

      lockedRef.current = true;
    }
  }, [tabCounts, total, rowsCount]);

  function getTabCount(tab) {
    const key = tab.countKey || tab.key || "all";

    if (key === "all" || tab.key === "") {
      return fixedCounts.all ?? fixedCounts.total ?? 0;
    }

    return fixedCounts[key] ?? tab.count ?? 0;
  }

  return (
    <div className="border-b border-white/[0.06] bg-[#0b1019]">
      <div className="flex min-w-0 items-center justify-between gap-3 bg-[#101722] px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const active = activeStatus === tab.key;
            const count = getTabCount(tab);

            return (
              <button
                key={tab.key || "all"}
                type="button"
                onClick={() => onChange(tab.key)}
                className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 text-[13px] font-bold transition-all duration-200 ${
                  active
                    ? "border-orange-500 bg-transparent text-orange-300"
                    : "border-transparent bg-white/[0.035] text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
                }`}
              >
                <span>{tab.label}</span>

                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    active
                      ? "bg-orange-500/15 text-orange-200"
                      : "bg-white/[0.06] text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden shrink-0 text-[11px] font-bold text-slate-500 md:block">
          Showing <span className="text-slate-200">{rowsCount || 0}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span className="text-orange-300">
            {fixedCounts.all ?? fixedCounts.total ?? total ?? rowsCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}