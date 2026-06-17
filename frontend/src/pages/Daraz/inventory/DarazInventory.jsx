import React, { useEffect, useState } from "react";
import { AlertTriangle, PackageCheck, Plus, RefreshCw, Search, Send } from "lucide-react";
import { darazApi, extractApiMessage } from "../../../services/daraz/darazCentral.service";

export default function DarazInventory() {
  const [rows, setRows] = useState([]);
  const [queue, setQueue] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [quickQueue, setQuickQueue] = useState({ account_code: "", item_id: "", sku_id: "", seller_sku: "", target_quantity: "", update_type: "stock" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [oosRes, queueRes] = await Promise.all([
        darazApi.getOosSkus({ search, limit: 200 }),
        darazApi.getStockQueue({ status: "pending", limit: 50 })
      ]);
      setRows(oosRes.rows || []);
      setQueue(queueRes.rows || []);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Inventory data could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToQueue = async (payload) => {
    const account_code = payload.account_code || quickQueue.account_code;
    const item_id = payload.item_id || quickQueue.item_id;
    if (!account_code || !item_id) {
      setNotice({ type: "warning", text: "Account code and item ID are required before sending a stock update request." });
      return;
    }
    try {
      setNotice({ type: "info", text: "Stock update request is being queued…" });
      const res = await darazApi.addStockQueue({
        ...quickQueue,
        ...payload,
        account_code,
        item_id,
        target_quantity: Number(payload.target_quantity ?? quickQueue.target_quantity ?? 0),
        update_type: payload.update_type || quickQueue.update_type || "stock"
      });
      setNotice({ type: "success", text: res?.message || "Stock update request added to the Daraz queue." });
      setQuickQueue({ account_code: "", item_id: "", sku_id: "", seller_sku: "", target_quantity: "", update_type: "stock" });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Stock update could not be queued.") });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5 bg-stone-50 min-h-screen text-stone-800 text-xs">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-semibold uppercase tracking-wide text-[11px]"><PackageCheck size={15} /> Daraz Inventory</div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">Stock Health Center</h1>
          <p className="text-[11px] text-stone-500 mt-1">Review out-of-stock SKUs and prepare safe stock or price update requests.</p>
        </div>
        <button onClick={loadData} className="px-3 py-2 bg-white border border-stone-300 rounded hover:bg-stone-50 font-semibold flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
      </header>

      <Notice notice={notice} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-stone-900 flex items-center gap-2"><AlertTriangle size={15} className="text-amber-600" /> Out-of-stock / unavailable SKUs</h2>
              <p className="text-[11px] text-stone-500">These listings need stock review before promotions or order pressure increases.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadData()} placeholder="Search SKU / item ID" className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded outline-none focus:ring-1 focus:ring-cyan-600" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Item ID</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? <tr><td colSpan="6" className="px-4 py-10 text-center text-stone-400">Checking inventory health…</td></tr> : rows.length === 0 ? <tr><td colSpan="6" className="px-4 py-10 text-center text-stone-400">No out-of-stock SKUs found for the selected search.</td></tr> : rows.map((row, idx) => (
                  <tr key={`${row.account_code}-${row.item_id}-${row.seller_sku}-${idx}`} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{row.seller_sku || row.shop_sku || "-"}</div>
                      <div className="text-[10px] text-stone-500">{row.sku_status || "status unknown"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-600">{row.account_code}</td>
                    <td className="px-4 py-3 font-mono text-stone-600">{row.item_id}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-700">{row.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-700">{row.available ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => addToQueue({ account_code: row.account_code, item_id: row.item_id, sku_id: row.sku_id, seller_sku: row.seller_sku, target_quantity: 0 })} className="px-2 py-1 border border-cyan-200 text-cyan-700 rounded hover:bg-cyan-50 font-semibold flex items-center gap-1 ml-auto"><Send size={12} /> Queue</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-5">
          <div className="bg-white border border-stone-200 rounded shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-stone-900 flex items-center gap-2"><Plus size={15} className="text-cyan-700" /> Manual Stock Queue</h2>
            <Input label="Account Code" value={quickQueue.account_code} onChange={(v) => setQuickQueue((p) => ({ ...p, account_code: v.toUpperCase() }))} />
            <Input label="Item ID" value={quickQueue.item_id} onChange={(v) => setQuickQueue((p) => ({ ...p, item_id: v }))} />
            <Input label="SKU ID" value={quickQueue.sku_id} onChange={(v) => setQuickQueue((p) => ({ ...p, sku_id: v }))} />
            <Input label="Seller SKU" value={quickQueue.seller_sku} onChange={(v) => setQuickQueue((p) => ({ ...p, seller_sku: v }))} />
            <Input label="Target Quantity" type="number" value={quickQueue.target_quantity} onChange={(v) => setQuickQueue((p) => ({ ...p, target_quantity: v }))} />
            <button onClick={() => addToQueue({})} className="w-full py-2 bg-[#002f36] text-white rounded font-semibold hover:bg-[#003f48]">Add to Queue</button>
          </div>

          <div className="bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200"><h2 className="font-bold text-stone-900">Pending Queue</h2></div>
            <div className="divide-y divide-stone-200 max-h-80 overflow-y-auto">
              {queue.length === 0 ? <p className="p-4 text-stone-400">No pending stock update requests.</p> : queue.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="font-semibold text-stone-900">{item.seller_sku || item.item_id}</div>
                  <div className="text-[10px] text-stone-500">{item.account_code} • {item.update_type} • {item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide">{label}<input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-600 normal-case font-normal" /></label>;
}

function Notice({ notice }) {
  if (!notice?.text) return null;
  const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200";
  return <div className={`border rounded px-4 py-3 font-medium ${cls}`}>{notice.text}</div>;
}
