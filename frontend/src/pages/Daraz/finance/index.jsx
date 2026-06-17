import React, { useEffect, useState } from "react";
import { AlertTriangle, Download, RefreshCw, Wallet } from "lucide-react";
import { darazApi, extractApiMessage, formatDateTime } from "../../../services/daraz/darazCentral.service";

export default function DarazFinance() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [filters, setFilters] = useState({ account_code: "all", start: "", end: "" });

  const load = async () => {
    setLoading(true);
    setNotice({ type: "", text: "" });
    try {
      const [finance, accountsData] = await Promise.all([
        darazApi.getNetSales({ ...filters, limit: 1000 }),
        darazApi.getAccounts({ active_only: "false" })
      ]);
      setSummary(finance.summary || {});
      setRows(finance.rows || []);
      setAccounts(accountsData.rows || []);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz net sales report could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="min-h-screen bg-white text-stone-900 text-xs">
      <div className="px-4 py-4 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-normal">Daraz Business Reports</h1>
          <p className="text-stone-600 mt-1">Net sales, product cost, commission, missing cost, and SKU mismatch report.</p>
        </div>
        <div className="flex gap-2"><button onClick={load} className="px-3 py-2 border border-stone-300 rounded-sm bg-white hover:bg-stone-50 font-semibold inline-flex items-center gap-2"><RefreshCw size={14} /> Refresh</button><button className="px-3 py-2 bg-[#007185] text-white rounded-sm font-bold inline-flex items-center gap-2"><Download size={14} /> Download</button></div>
      </div>

      <Notice notice={notice} />

      <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap gap-2 items-center">
        <select value={filters.account_code} onChange={(e) => setFilters((p) => ({ ...p, account_code: e.target.value }))} className="border border-stone-300 rounded-sm px-3 py-2 bg-white"><option value="all">All accounts</option>{accounts.map((a) => <option key={a.account_code} value={a.account_code}>{a.account_code}</option>)}</select>
        <input type="date" value={filters.start} onChange={(e) => setFilters((p) => ({ ...p, start: e.target.value }))} className="border border-stone-300 rounded-sm px-3 py-2" />
        <input type="date" value={filters.end} onChange={(e) => setFilters((p) => ({ ...p, end: e.target.value }))} className="border border-stone-300 rounded-sm px-3 py-2" />
        <button onClick={load} className="px-4 py-2 bg-[#00343d] text-white rounded-sm font-bold">Apply</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-stone-50 border-b border-stone-200">
        <Metric label="Revenue" value={summary.product_revenue} money />
        <Metric label="Product cost" value={summary.product_cost} money />
        <Metric label="Commission" value={summary.commission_amount} money />
        <Metric label="Net sales" value={summary.estimated_net_sales} money good />
        <Metric label="Missing cost" value={summary.missing_cost_items} warning />
        <Metric label="SKU missing" value={summary.sku_missing_items} warning />
      </div>

      <section className="p-4">
        <div className="border border-stone-200 rounded-sm overflow-hidden bg-white">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 font-bold flex items-center gap-2"><Wallet size={15} /> Net Sales by Order Item</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-600 border-b border-stone-200"><tr><th className="px-3 py-3">Order / Date</th><th className="px-3 py-3">SKU / Product</th><th className="px-3 py-3 text-right">Sales</th><th className="px-3 py-3 text-right">Cost</th><th className="px-3 py-3 text-right">Fees</th><th className="px-3 py-3 text-right">Net sales</th><th className="px-3 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? <tr><td colSpan="7" className="px-4 py-10 text-center text-stone-400">Loading finance report…</td></tr> : rows.length === 0 ? <tr><td colSpan="7" className="px-4 py-10 text-center text-stone-400">No synced order item data found.</td></tr> : rows.map((row) => <tr key={row.id || row.order_item_id} className="hover:bg-stone-50"><td className="px-3 py-3"><div className="font-bold text-cyan-700">#{row.order_id}</div><div className="text-[10px] text-stone-500">{formatDateTime(row.daraz_created_at)}</div></td><td className="px-3 py-3"><div className="font-bold break-all">{row.seller_sku || "SKU missing"}</div><div className="max-w-md line-clamp-2">{row.product_name}</div></td><td className="px-3 py-3 text-right font-bold">{money(row.sales_amount)}</td><td className="px-3 py-3 text-right">{money(row.product_cost)}</td><td className="px-3 py-3 text-right">{money(row.commission_amount)}</td><td className="px-3 py-3 text-right font-black">{money(row.estimated_net_sales)}</td><td className="px-3 py-3"><Status value={row.cost_status} /></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function money(v) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function Metric({ label, value, money: isMoney, good, warning }) { return <div className="bg-white border border-stone-200 rounded-sm p-4"><div className="text-[10px] uppercase font-bold text-stone-500">{label}</div><div className={`text-2xl font-black mt-1 ${good ? "text-emerald-700" : warning ? "text-amber-700" : "text-stone-900"}`}>{isMoney ? money(value) : Number(value || 0).toLocaleString()}</div></div>; }
function Status({ value }) { const ok = String(value).toLowerCase() === "ok"; return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] font-bold uppercase ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>{!ok && <AlertTriangle size={12}/>} {value || "Check"}</span>; }
function Notice({ notice }) { if (!notice?.text) return null; const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200"; return <div className={`mx-4 mt-4 border rounded-sm px-4 py-3 font-medium ${cls}`}>{notice.text}</div>; }
