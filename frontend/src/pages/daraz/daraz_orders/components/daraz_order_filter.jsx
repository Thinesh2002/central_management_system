import { useEffect, useState } from "react";
import { Filter, Store, X } from "lucide-react";

export default function DarazOrderFilterPopup({
  open,
  filters,
  statusTabs,
  pageSizes,
  accountOptions,
  accountLoading,
  selectedAccountCodes,
  onClose,
  onApply,
  onClear,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [localAccounts, setLocalAccounts] = useState(selectedAccountCodes || []);

  useEffect(() => {
    if (!open) return;
    setLocalFilters(filters);
    setLocalAccounts(selectedAccountCodes || []);
  }, [filters, open, selectedAccountCodes]);

  if (!open) return null;

  function update(key, value) {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAccount(code) {
    setLocalAccounts((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-[#203047] ring-1 ring-white/10" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between bg-cyan-700 px-5 py-4">
          <h3 className="inline-flex items-center gap-2 text-sm font-black text-white">
            <Filter size={17} /> Advanced Filters
          </h3>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          <FilterSection title="Daraz Accounts" icon={<Store size={16} className="text-cyan-400" />} selected={localAccounts.length}>
            {accountLoading && <p className="text-xs font-bold text-slate-300">Loading accounts...</p>}
            {!accountLoading && accountOptions.length === 0 && <p className="text-xs font-bold text-slate-400">No Daraz accounts found.</p>}
            {!accountLoading && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accountOptions.map((account) => (
                  <CheckboxCard
                    key={account.code}
                    checked={localAccounts.includes(account.code)}
                    label={account.name}
                    subLabel={account.code}
                    onChange={() => toggleAccount(account.code)}
                  />
                ))}
              </div>
            )}
          </FilterSection>

          <FilterSection title="Order Status">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {statusTabs.map((tab) => (
                <CheckboxCard
                  key={tab.key || "all"}
                  checked={localFilters.status === tab.key}
                  label={tab.label}
                  onChange={() => update("status", tab.key)}
                  radio
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Page Size">
            <div className="grid gap-3 md:grid-cols-4">
              {pageSizes.map((size) => (
                <CheckboxCard
                  key={size}
                  checked={Number(localFilters.limit) === size}
                  label={`Show ${size}`}
                  onChange={() => update("limit", size)}
                  radio
                />
              ))}
            </div>
          </FilterSection>
        </div>

        <footer className="flex items-center justify-between border-t border-white/10 bg-[#19263a] p-5">
          <button type="button" onClick={onClear} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/20">
            CLEAR ALL
          </button>
          <button type="button" onClick={() => onApply(localFilters, localAccounts)} className="rounded-lg bg-cyan-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-cyan-950/40 hover:bg-cyan-500">
            APPLY FILTERS
          </button>
        </footer>
      </div>
    </div>
  );
}

function FilterSection({ title, icon, selected, children }) {
  return (
    <section className="mb-6 border-b border-white/10 pb-5 last:mb-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="inline-flex items-center gap-2 text-sm font-black text-white">{icon}{title}</h4>
        {selected !== undefined && <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-white">Selected: {selected}</span>}
      </div>
      {children}
    </section>
  );
}

function CheckboxCard({ checked, label, subLabel, onChange, radio = false }) {
  return (
    <label className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-lg border px-4 transition ${checked ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}>
      <input type={radio ? "radio" : "checkbox"} checked={checked} onChange={onChange} className="h-4 w-4 accent-cyan-500" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-white">{label}</span>
        {subLabel && <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{subLabel}</span>}
      </span>
    </label>
  );
}
