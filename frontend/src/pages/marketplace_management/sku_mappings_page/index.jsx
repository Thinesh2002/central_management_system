import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import skuMappingApi from "../../../config/sub_api/marketplace_api/sku_mapping_api";
import marketplaceApi from "../../../config/sub_api/marketplace_management_api/marketplace_api";

const inputClass = "h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-blue-700";
const boxClass = "rounded-xl border border-slate-800 bg-[#0b1019]";

function unwrapRows(response) {
  const payload = response?.data || response || {};
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;
  return [];
}

function clean(value) {
  return String(value ?? "").trim();
}

function defaultForm() {
  return { platform: "DARAZ", account_id: "", local_sku: "", marketplace_sku: "", local_product_id: "", local_variant_id: "", marketplace_item_id: "", marketplace_product_id: "", status: "ACTIVE" };
}

export default function SkuMappingsPage() {
  const [filters, setFilters] = useState({ platform: "", search: "", status: "", page: 1, limit: 50 });
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState(defaultForm());
  const [bulkText, setBulkText] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadAccounts = useCallback(async () => {
    const response = await marketplaceApi.getAccounts().catch(() => null);
    setAccounts(unwrapRows(response));
  }, []);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await skuMappingApi.list(filters);
      setRows(unwrapRows(response));
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "Unable to load SKU mappings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadUnmapped = useCallback(async () => {
    const response = await skuMappingApi.unmapped({ platform: filters.platform || "DARAZ", search: filters.search, limit: 50 }).catch(() => null);
    setUnmapped(unwrapRows(response));
  }, [filters.platform, filters.search]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadMappings(); loadUnmapped(); }, [loadMappings, loadUnmapped]);

  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    if (!form.platform) return true;
    const code = clean(account.platform_code || account.platform).toUpperCase();
    return form.platform === "WOO" ? ["WOO", "WOOCOMMERCE", "WOO_COMMERCE"].includes(code) : code === form.platform;
  }), [accounts, form.platform]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveMapping() {
    if (!form.platform || !form.local_sku || !form.marketplace_sku) return setMessage("Platform, local SKU and marketplace SKU are required.");
    setLoading(true);
    setMessage("");
    try {
      await skuMappingApi.save(form);
      setForm(defaultForm());
      setMessage("SKU mapping saved.");
      await loadMappings();
      await loadUnmapped();
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "SKU mapping save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function removeMapping(id) {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      await skuMappingApi.remove(id);
      setMessage("SKU mapping removed.");
      await loadMappings();
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "SKU mapping remove failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runBulk() {
    const bulkRows = bulkText.split("\n").map((line) => {
      const [platform, account_code, local_sku, marketplace_sku] = line.split(",").map(clean);
      return platform && local_sku && marketplace_sku ? { platform, account_code, local_sku, marketplace_sku, status: "ACTIVE" } : null;
    }).filter(Boolean);
    if (!bulkRows.length) return setMessage("Bulk format: DARAZ,BH,LOCALSKU,MARKETSKU");
    setLoading(true);
    try {
      await skuMappingApi.bulk(bulkRows);
      setBulkText("");
      setMessage("Bulk mappings saved.");
      await loadMappings();
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "Bulk mapping failed.");
    } finally {
      setLoading(false);
    }
  }

  async function checkDuplicate() {
    if (!form.platform || !form.marketplace_sku) return setDuplicate(null);
    const response = await skuMappingApi.duplicateCheck({ platform: form.platform, account_id: form.account_id, marketplace_sku: form.marketplace_sku }).catch(() => null);
    setDuplicate(response?.data?.data || response?.data || null);
  }

  async function loadSuggestions(value) {
    updateForm("local_sku", value);
    if (clean(value).length < 2) return setSuggestions([]);
    const response = await skuMappingApi.suggestions({ search: value, limit: 8 }).catch(() => null);
    setSuggestions(unwrapRows(response));
  }

  return (
    <div className="min-h-screen bg-[#020617] p-3 text-slate-100 lg:p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b1019] px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Marketplace SKU Mappings</h1>
            <p className="mt-1 text-sm text-slate-400">Connect Daraz/Woo marketplace SKUs with local SKUs for inventory sync.</p>
          </div>
          <button onClick={loadMappings} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className={`${boxClass} p-3`}>
              <div className="flex flex-wrap gap-2">
                <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search SKU..." className={inputClass} />
                <select value={filters.platform} onChange={(event) => updateFilter("platform", event.target.value)} className={inputClass}>
                  <option value="">All platforms</option>
                  <option value="DARAZ">Daraz</option>
                  <option value="WOO">Woo</option>
                </select>
                <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className={inputClass}>
                  <option value="">All status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className={`${boxClass} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-800 bg-[#111827] text-xs uppercase tracking-wide text-slate-400">
                    <tr><th className="px-4 py-3 text-left">Platform</th><th className="px-4 py-3 text-left">Account</th><th className="px-4 py-3 text-left">Local SKU</th><th className="px-4 py-3 text-left">Marketplace SKU</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.map((row) => (
                      <tr key={row.id || `${row.platform}-${row.marketplace_sku}`} className="hover:bg-[#111827]">
                        <td className="px-4 py-3 text-slate-300">{row.platform}</td>
                        <td className="px-4 py-3 text-slate-300">{row.account_code || row.account_id || "-"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100">{row.local_sku}</td>
                        <td className="px-4 py-3 text-slate-300">{row.marketplace_sku}</td>
                        <td className="px-4 py-3 text-slate-300">{row.status}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => removeMapping(row.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-900 bg-red-950/30 px-2 py-1 text-xs text-red-300 hover:bg-red-950"><Trash2 size={13} /> Remove</button></td>
                      </tr>
                    ))}
                    {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">{loading ? "Loading..." : "No SKU mappings found."}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${boxClass} p-4`}>
              <h2 className="mb-3 text-sm font-bold text-slate-100">Unmapped marketplace SKUs</h2>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {unmapped.map((item, index) => (
                  <button key={`${item.marketplace_sku || item.seller_sku}-${index}`} onClick={() => setForm((prev) => ({ ...prev, platform: filters.platform || prev.platform || "DARAZ", marketplace_sku: item.marketplace_sku || item.seller_sku || item.sku || "", account_id: item.account_id || prev.account_id }))} className="rounded-lg border border-slate-800 bg-[#020617] p-3 text-left hover:border-blue-700">
                    <p className="text-xs font-bold text-slate-100">{item.marketplace_sku || item.seller_sku || item.sku}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{item.product_name || item.name || item.account_code || "Unmapped"}</p>
                  </button>
                ))}
                {!unmapped.length && <p className="text-sm text-slate-500">No unmapped SKUs found for the selected filter.</p>}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className={`${boxClass} p-4`}>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Link2 size={16} /> Add mapping</h2>
              <div className="mt-3 grid gap-3">
                <select value={form.platform} onChange={(event) => updateForm("platform", event.target.value)} className={inputClass}>
                  <option value="DARAZ">Daraz</option>
                  <option value="WOO">Woo</option>
                </select>
                <select value={form.account_id} onChange={(event) => updateForm("account_id", event.target.value)} className={inputClass}>
                  <option value="">Any account</option>
                  {filteredAccounts.map((account) => <option key={account.id || account.account_id} value={account.id || account.account_id}>{account.account_name || account.account_code}</option>)}
                </select>
                <input value={form.local_sku} onChange={(event) => loadSuggestions(event.target.value)} placeholder="Local SKU" className={inputClass} list="local-sku-suggestions" />
                <datalist id="local-sku-suggestions">{suggestions.map((item) => <option key={item.local_sku || item.sku} value={item.local_sku || item.sku}>{item.product_name || item.name}</option>)}</datalist>
                <input value={form.marketplace_sku} onChange={(event) => updateForm("marketplace_sku", event.target.value)} onBlur={checkDuplicate} placeholder="Daraz/Woo SKU" className={inputClass} />
                <input value={form.marketplace_item_id} onChange={(event) => updateForm("marketplace_item_id", event.target.value)} placeholder="Item/Product ID optional" className={inputClass} />
                {duplicate?.duplicate && <p className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-300">Duplicate mapping exists. You can map existing SKU, create duplicate suffix before product create, skip, or update existing product from transfer popup.</p>}
                <button onClick={saveMapping} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Mapping</button>
              </div>
            </div>

            <div className={`${boxClass} p-4`}>
              <h2 className="text-sm font-bold text-slate-100">Bulk mapping</h2>
              <p className="mt-1 text-xs text-slate-500">One row: DARAZ,BH,LOCALSKU,MARKETSKU</p>
              <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} rows={8} className="mt-3 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-blue-700" />
              <button onClick={runBulk} disabled={loading} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60">Save Bulk</button>
            </div>
          </aside>
        </div>

        {message && <p className="rounded-lg border border-slate-700 bg-[#0b1019] px-3 py-2 text-sm text-slate-300">{message}</p>}
      </div>
    </div>
  );
}
