import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronRight, RefreshCw, Search, ShoppingBag, Store } from "lucide-react";
import { darazApi, extractApiMessage, formatDateTime } from "../../../services/daraz/darazCentral.service";

export default function DarazOrders() {
  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [filters, setFilters] = useState({ search: "", account_code: "", status: "", page: 1, limit: 100 });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [ordersData, accountsData] = await Promise.all([
        darazApi.getOrders({
          page: filters.page,
          limit: filters.limit,
          search: filters.search || undefined,
          account_code: filters.account_code || undefined,
          status: filters.status || undefined
        }),
        darazApi.getAccounts({ active_only: "false" })
      ]);
      setOrders(ordersData.rows || []);
      setAccounts(accountsData.rows || []);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz orders could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncOrders = async () => {
    setSyncing(true);
    setNotice({ type: "info", text: "Daraz order sync has started. Latest orders will appear after completion." });
    try {
      const res = await darazApi.syncOrders(filters.account_code || null);
      setNotice({ type: "success", text: res?.message || "Daraz orders synced successfully." });
      await loadOrders();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz order sync failed.") });
    } finally {
      setSyncing(false);
    }
  };

  const openOrder = async (order) => {
    setSelectedOrder({ ...order, loading: true });
    try {
      const detail = await darazApi.getOrder(order.id || order.order_id);
      setSelectedOrder(detail);
    } catch (error) {
      setSelectedOrder({ ...order, items: [], detail_error: extractApiMessage(error, "Order details could not be loaded.") });
    }
  };

  const statusCounts = useMemo(() => {
    const output = { all: orders.length };
    orders.forEach((order) => {
      const status = String(order.order_status || order.status || "unknown").toLowerCase();
      output[status] = (output[status] || 0) + 1;
    });
    return output;
  }, [orders]);

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5 bg-stone-50 min-h-screen text-stone-800 text-xs">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-semibold uppercase tracking-wide text-[11px]"><ShoppingBag size={15} /> Daraz Orders</div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">Order Management Center</h1>
          <p className="text-[11px] text-stone-500 mt-1">Track seller orders, account-wise status, and operational follow-up from synced Daraz data.</p>
        </div>
        <button disabled={syncing} onClick={syncOrders} className="px-3 py-2 bg-[#002f36] text-white rounded shadow-sm hover:bg-[#003f48] font-semibold flex items-center gap-2 disabled:opacity-60"><RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync Orders"}</button>
      </header>

      <Notice notice={notice} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniCard label="Loaded Orders" value={orders.length} />
        <MiniCard label="Delivered" value={statusCounts.delivered || 0} />
        <MiniCard label="Pending" value={statusCounts.pending || statusCounts.pendingprocessing || 0} />
        <MiniCard label="Cancelled" value={statusCounts.canceled || statusCounts.cancelled || 0} />
      </div>

      <section className="bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {["", "pending", "delivered", "canceled", "shipped"].map((status) => (
              <button key={status || "all"} onClick={() => setFilters((p) => ({ ...p, status }))} className={`px-3 py-1.5 rounded border font-semibold ${filters.status === status ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"}`}>{status || "All"}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <select value={filters.account_code} onChange={(e) => setFilters((p) => ({ ...p, account_code: e.target.value }))} className="border border-stone-300 rounded px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-cyan-600">
              <option value="">All accounts</option>
              {accounts.map((account) => <option key={account.account_code} value={account.account_code}>{account.account_code}</option>)}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && loadOrders()} placeholder="Search order ID / customer" className="w-full sm:w-72 pl-9 pr-3 py-2 border border-stone-300 rounded outline-none focus:ring-1 focus:ring-cyan-600" />
            </div>
            <button onClick={loadOrders} className="px-3 py-2 border border-stone-300 rounded bg-white hover:bg-stone-50 font-semibold flex items-center gap-2"><Search size={14} /> Apply</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-[11px] uppercase text-stone-500 border-b border-stone-200"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? <tr><td colSpan="6" className="px-4 py-10 text-center text-stone-400">Loading Daraz orders…</td></tr> : orders.length === 0 ? <tr><td colSpan="6" className="px-4 py-10 text-center text-stone-400">No orders found for the selected filters.</td></tr> : orders.map((order) => (
                <tr key={`${order.account_code}-${order.order_id}`} className="hover:bg-stone-50">
                  <td className="px-4 py-3"><div className="font-bold text-stone-900">#{order.order_id}</div><div className="text-[10px] text-stone-500 flex items-center gap-1"><Calendar size={11} /> {formatDateTime(order.daraz_created_at || order.created_at)}</div></td>
                  <td className="px-4 py-3"><div className="font-mono text-stone-700">{order.account_code}</div><div className="text-[10px] text-stone-500">{order.account_name}</div></td>
                  <td className="px-4 py-3"><Status value={order.order_status || order.status} /></td>
                  <td className="px-4 py-3 text-stone-600">{order.payment_method || "-"}</td>
                  <td className="px-4 py-3 text-right font-bold text-stone-900">{order.currency || "LKR"} {Number(order.order_total || order.price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => openOrder(order)} className="p-2 border border-stone-200 rounded hover:bg-stone-50"><ChevronRight size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] bg-stone-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div><h2 className="text-lg font-bold text-stone-900">Order #{selectedOrder.order_id}</h2><p className="text-[11px] text-stone-500">Daraz synced order details</p></div>
              <button onClick={() => setSelectedOrder(null)} className="px-3 py-1.5 border border-stone-300 rounded hover:bg-white font-semibold">Close</button>
            </div>
            <div className="p-5 space-y-5">
              {selectedOrder.detail_error && <Notice notice={{ type: "warning", text: selectedOrder.detail_error }} />}
              <div className="grid grid-cols-2 gap-3">
                <Info label="Account" value={selectedOrder.account_code} />
                <Info label="Status" value={selectedOrder.order_status || selectedOrder.status} />
                <Info label="Payment" value={selectedOrder.payment_method} />
                <Info label="Total" value={`${selectedOrder.currency || "LKR"} ${Number(selectedOrder.order_total || 0).toLocaleString()}`} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 mb-2">Order Items</h3>
                {selectedOrder.loading ? <p className="text-stone-400">Loading items…</p> : !selectedOrder.items?.length ? <p className="text-stone-400">No item records found for this order.</p> : <div className="space-y-2">{selectedOrder.items.map((item) => <div key={item.id || item.order_item_id} className="p-3 border border-stone-200 rounded"><div className="font-semibold text-stone-900">{item.product_name || item.name || "Product"}</div><div className="text-[10px] text-stone-500">SKU: {item.seller_sku || "-"} • Qty {item.quantity || 1}</div></div>)}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value }) { return <div className="bg-white border border-stone-200 rounded shadow-sm p-4"><div className="text-[10px] uppercase font-bold text-stone-500">{label}</div><div className="text-2xl font-black text-stone-900 mt-1">{value}</div></div>; }
function Info({ label, value }) { return <div className="p-3 border border-stone-200 rounded bg-stone-50"><div className="text-[10px] uppercase font-bold text-stone-500">{label}</div><div className="font-semibold text-stone-900 mt-1 break-words">{value || "-"}</div></div>; }
function Status({ value }) { const s = String(value || "unknown").toLowerCase(); const cls = s.includes("delivered") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.includes("cancel") ? "bg-rose-50 text-rose-700 border-rose-200" : s.includes("ship") ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-amber-50 text-amber-700 border-amber-200"; return <span className={`inline-flex px-2 py-1 rounded border text-[10px] font-bold uppercase ${cls}`}>{value || "unknown"}</span>; }
function Notice({ notice }) { if (!notice?.text) return null; const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200"; return <div className={`border rounded px-4 py-3 font-medium ${cls}`}>{notice.text}</div>; }
