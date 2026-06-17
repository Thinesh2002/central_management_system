import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2, RefreshCw, Search, Send, Warehouse } from "lucide-react";
import { darazApi, extractApiMessage } from "../../../services/daraz/darazCentral.service";

export default function DarazInventory() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({});
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [filters, setFilters] = useState({ account_code: "all", search: "", mismatch: "all" });

  const load = async () => {
    setLoading(true);
    setNotice({ type: "", text: "" });
    try {
      const [health, accountData, queueData] = await Promise.allSettled([
        darazApi.getInventoryHealth({ ...filters, limit: 200 }),
        darazApi.getAccounts({ active_only: "false" }),
        darazApi.getStockQueue({ status: "all", limit: 30 })
      ]);
      if (health.status === "fulfilled") {
        setRows(health.value.rows || []);
        setSummary(health.value.raw?.summary || {});
      }
      if (accountData.status === "fulfilled") setAccounts(accountData.value.rows || []);
      if (queueData.status === "fulfilled") setQueue(queueData.value.rows || []);
      const failed = [health, accountData, queueData].filter((r) => r.status === "rejected");
      if (failed.length) setNotice({ type: "warning", text: "Some inventory panels could not be refreshed. Check backend logs if data is missing." });
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz inventory could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const queueLocalSync = async () => {
    setSyncing(true);
    setNotice({ type: "info", text: "Comparing local inventory with Daraz and creating update queue…" });
    try {
      const response = await darazApi.queueLocalInventorySync({ account_code: filters.account_code !== "all" ? filters.account_code : undefined });
      setNotice({ type: "success", text: response?.message || "Local inventory sync queue created." });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Local inventory sync queue could not be created.") });
    } finally {
      setSyncing(false);
    }
  };

  const counts = useMemo(() => ({
    total: summary.total || rows.length,
    matched: summary.matched || rows.filter((r) => r.mismatch_status === "matched").length,
    attention: summary.attention || rows.filter((r) => r.mismatch_status !== "matched").length,
    stockMismatch: summary.issues?.stock_mismatch || 0,
    skuMissing: summary.issues?.sku_not_in_product_system || summary.issues?.sku_not_in_local_inventory || 0,
    priceNotUpdated: summary.issues?.price_not_updated || 0
  }), [summary, rows]);

  return (
    <div className="min-h-screen bg-white text-stone-900 text-xs">
      <div className="px-4 py-4 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-normal">Daraz Inventory Health</h1>
          <p className="text-stone-600 mt-1">SKU-wise local inventory vs Daraz stock, price, product cost, and mismatch control.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 border border-stone-300 rounded-sm bg-white hover:bg-stone-50 font-semibold inline-flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
          <button disabled={syncing} onClick={queueLocalSync} className="px-3 py-2 bg-[#00343d] text-white rounded-sm hover:bg-[#004b56] font-semibold inline-flex items-center gap-2 disabled:opacity-60"><Send size={14} /> {syncing ? "Queueing…" : "Queue Local Stock Sync"}</button>
        </div>
      </div>

      <Notice notice={notice} />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-stone-50 border-b border-stone-200">
        <Metric label="Total Daraz SKUs" value={counts.total} icon={Boxes} />
        <Metric label="Matched" value={counts.matched} icon={CheckCircle2} good />
        <Metric label="Attention" value={counts.attention} icon={AlertTriangle} warning />
        <Metric label="Stock mismatch" value={counts.stockMismatch} warning />
        <Metric label="SKU missing" value={counts.skuMissing} warning />
        <Metric label="Price not updated" value={counts.priceNotUpdated} warning />
      </div>

      <div className="px-4 py-3 border-b border-stone-200 bg-white flex flex-wrap gap-2 items-center">
        <select value={filters.account_code} onChange={(e) => setFilters((p) => ({ ...p, account_code: e.target.value }))} className="border border-stone-300 rounded-sm px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-cyan-600">
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.account_code} value={a.account_code}>{a.account_code}</option>)}
        </select>
        <select value={filters.mismatch} onChange={(e) => setFilters((p) => ({ ...p, mismatch: e.target.value }))} className="border border-stone-300 rounded-sm px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-cyan-600">
          <option value="all">All inventory</option>
          <option value="attention_required">Needs attention</option>
          <option value="stock_mismatch">Stock mismatch</option>
          <option value="price_not_updated">Price not updated</option>
          <option value="sku_not_in_product_system">SKU not in system</option>
          <option value="product_cost_missing">Product cost missing</option>
          <option value="daraz_oos">Daraz OOS</option>
        </select>
        <div className="relative flex-1 min-w-[260px] max-w-xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search SKU, product name, item ID" className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-sm outline-none focus:ring-1 focus:ring-cyan-600" />
        </div>
        <button onClick={load} className="px-3 py-2 bg-[#007185] text-white rounded-sm hover:bg-[#005f70] font-bold">Apply</button>
      </div>

      <section className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-9 border border-stone-200 rounded-sm overflow-hidden bg-white">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 font-bold">SKU Reconciliation</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-600 border-b border-stone-200">
                <tr><th className="px-3 py-3">SKU / Product</th><th className="px-3 py-3">Account</th><th className="px-3 py-3 text-right">Daraz Stock</th><th className="px-3 py-3 text-right">Local Stock</th><th className="px-3 py-3 text-right">Daraz Price</th><th className="px-3 py-3 text-right">Local Price</th><th className="px-3 py-3 text-right">Cost</th><th className="px-3 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? <tr><td colSpan="8" className="px-4 py-10 text-center text-stone-400">Loading inventory health…</td></tr> : rows.length === 0 ? <tr><td colSpan="8" className="px-4 py-10 text-center text-stone-400">No inventory rows found.</td></tr> : rows.map((row) => (
                  <tr key={`${row.account_code}-${row.seller_sku}-${row.sku_id}`} className="hover:bg-stone-50 align-top">
                    <td className="px-3 py-3"><div className="font-bold text-cyan-700 break-all">{row.seller_sku || row.shop_sku || "SKU missing"}</div><div className="text-stone-700 max-w-md line-clamp-2">{row.product_name}</div><div className="text-[10px] text-stone-500">Item ID: {row.item_id}</div></td>
                    <td className="px-3 py-3 font-mono">{row.account_code}</td>
                    <td className="px-3 py-3 text-right font-bold">{row.quantity ?? 0}</td>
                    <td className="px-3 py-3 text-right font-bold">{row.local_stock ?? "-"}</td>
                    <td className="px-3 py-3 text-right">{money(row.price)}</td>
                    <td className="px-3 py-3 text-right">{money(row.local_selling_price)}</td>
                    <td className="px-3 py-3 text-right">{money(row.cost_price)}</td>
                    <td className="px-3 py-3"><Issue issues={row.issues} text={row.issue_text} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="xl:col-span-3 space-y-4">
          <div className="border border-stone-200 rounded-sm bg-white p-4">
            <h3 className="font-bold flex items-center gap-2"><Warehouse size={15} /> Stock Update Queue</h3>
            <p className="text-stone-500 mt-1">Pending local-to-Daraz updates.</p>
            <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
              {queue.length === 0 ? <p className="text-stone-400">No queue records.</p> : queue.map((item) => <div key={item.id} className="p-2 border border-stone-200 rounded-sm bg-stone-50"><div className="font-bold break-all">{item.seller_sku}</div><div className="text-[10px] text-stone-500">{item.account_code} • Qty {item.target_quantity ?? "-"} • {item.status}</div></div>)}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function money(v) { if (v === null || v === undefined || v === "") return "-"; return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function Metric({ label, value, icon: Icon, good, warning }) { return <div className="bg-white border border-stone-200 rounded-sm p-4"><div className="flex items-center gap-2 text-[10px] uppercase font-bold text-stone-500">{Icon && <Icon size={13}/>} {label}</div><div className={`text-2xl font-black mt-1 ${good ? "text-emerald-700" : warning ? "text-amber-700" : "text-stone-900"}`}>{Number(value || 0).toLocaleString()}</div></div>; }
function Issue({ issues = [], text }) { const ok = !issues?.length; return <span className={`inline-flex px-2 py-1 rounded-sm border text-[10px] font-bold uppercase ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>{ok ? "Matched" : text}</span>; }
function Notice({ notice }) { if (!notice?.text) return null; const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200"; return <div className={`mx-4 mt-4 border rounded-sm px-4 py-3 font-medium ${cls}`}>{notice.text}</div>; }
