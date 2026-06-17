import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  Wallet
} from "lucide-react";
import { darazApi, extractApiMessage, formatDateTime } from "../../../services/daraz/darazCentral.service";

export default function DarazCentralDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [oos, setOos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const loadDashboard = async () => {
    setLoading(true);
    setNotice({ type: "", text: "" });
    try {
      const [dashboardData, accountData, oosData] = await Promise.allSettled([
        darazApi.dashboard(),
        darazApi.getAccounts({ active_only: "false" }),
        darazApi.getOosSkus({ limit: 8 })
      ]);

      if (dashboardData.status === "fulfilled") setSummary(dashboardData.value || {});
      if (accountData.status === "fulfilled") setAccounts(accountData.value.rows || []);
      if (oosData.status === "fulfilled") setOos(oosData.value.rows || []);

      const failed = [dashboardData, accountData, oosData].filter((r) => r.status === "rejected");
      if (failed.length) {
        setNotice({ type: "warning", text: "Some Daraz panels could not be refreshed. Existing data is still shown where available." });
      }
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Dashboard data could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const productTotals = useMemo(() => {
    const rows = Array.isArray(summary?.product_summary) ? summary.product_summary : Array.isArray(summary) ? summary : [];
    return rows.reduce(
      (acc, row) => ({
        products: acc.products + Number(row.total_products || 0),
        itemIds: acc.itemIds + Number(row.total_item_ids || 0),
        skus: acc.skus + Number(row.total_skus || 0),
        oos: acc.oos + Number(row.oos_skus || 0)
      }),
      { products: 0, itemIds: 0, skus: 0, oos: 0 }
    );
  }, [summary]);

  const activeAccounts = accounts.filter((a) => String(a.sync_status || "active").toLowerCase() === "active").length;
  const tokenIssues = accounts.filter((a) => !["active", "ok"].includes(String(a.token_status || "missing").toLowerCase())).length;

  const runFullSync = async () => {
    setSyncing(true);
    setNotice({ type: "info", text: "Daraz product sync has started. Please keep this page open until the confirmation appears." });
    try {
      await darazApi.syncProducts(null, false);
      setNotice({ type: "success", text: "Product sync completed successfully. The latest Daraz listing data is now available." });
      await loadDashboard();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Product sync could not be completed.") });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <SellerLoader text="Loading Daraz Seller Central workspace…" />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5 bg-stone-50 min-h-screen text-stone-800 text-xs">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-semibold uppercase tracking-wide text-[11px]">
            <ShoppingBag size={15} /> Daraz Seller Central
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">Channel Operations Overview</h1>
          <p className="text-[11px] text-stone-500 mt-1">Monitor multi-account product sync, token health, stock exposure, and daily seller actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate("/daraz/accounts")} className="px-3 py-2 bg-white border border-stone-200 rounded shadow-sm hover:bg-stone-50 font-semibold text-stone-700 flex items-center gap-2">
            <Store size={14} /> Manage Accounts
          </button>
          <button disabled={syncing} onClick={runFullSync} className="px-3 py-2 bg-[#002f36] text-white rounded shadow-sm hover:bg-[#003f48] font-semibold flex items-center gap-2 disabled:opacity-60">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync Products"}
          </button>
        </div>
      </header>

      <Notice notice={notice} />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Store} label="Active Accounts" value={activeAccounts} sub={`${accounts.length} total connected channels`} tone="cyan" />
        <MetricCard icon={Boxes} label="Synced Products" value={productTotals.products.toLocaleString()} sub={`${productTotals.itemIds.toLocaleString()} item IDs`} tone="emerald" />
        <MetricCard icon={Layers} label="Daraz SKUs" value={productTotals.skus.toLocaleString()} sub="Variations and seller SKUs" tone="amber" />
        <MetricCard icon={AlertTriangle} label="Stock Attention" value={productTotals.oos.toLocaleString()} sub="Out-of-stock or unavailable SKUs" tone="rose" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-stone-900">Account Sync Health</h2>
              <p className="text-[11px] text-stone-500">Seller-channel readiness and last sync tracking.</p>
            </div>
            <button onClick={() => navigate("/daraz/products")} className="text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1">
              View listings <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Product Sync</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {accounts.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-stone-400">No Daraz accounts have been connected yet.</td></tr>
                ) : accounts.slice(0, 8).map((account) => (
                  <tr key={account.account_code} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{account.account_name || account.account_code}</div>
                      <div className="text-[10px] text-stone-500 font-mono uppercase">{account.account_code}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill value={account.token_status || "missing"} /></td>
                    <td className="px-4 py-3"><StatusPill value={account.sync_status || "active"} /></td>
                    <td className="px-4 py-3 text-stone-600">{formatDateTime(account.last_product_sync_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate("/daraz/accounts")} className="text-cyan-700 font-semibold hover:underline">Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-5">
          <div className="bg-white border border-stone-200 rounded shadow-sm p-4">
            <h3 className="font-bold text-stone-900 flex items-center gap-2"><Activity size={15} className="text-cyan-700" /> System Readiness</h3>
            <div className="mt-4 space-y-3">
              <HealthRow label="Token issues" value={tokenIssues} ok={tokenIssues === 0} />
              <HealthRow label="OOS SKUs" value={oos.length} ok={oos.length === 0} />
              <HealthRow label="Auto sync" value="30 min" ok />
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded shadow-sm p-4">
            <h3 className="font-bold text-stone-900 flex items-center gap-2"><Truck size={15} className="text-cyan-700" /> Stock Attention Queue</h3>
            <div className="mt-3 space-y-2">
              {oos.length === 0 ? (
                <p className="text-stone-500 text-[11px]">No out-of-stock SKU alerts found.</p>
              ) : oos.slice(0, 5).map((row, idx) => (
                <div key={`${row.seller_sku}-${idx}`} className="p-2 border border-stone-200 rounded bg-stone-50">
                  <div className="font-semibold text-stone-800 truncate">{row.seller_sku || row.shop_sku || "SKU not available"}</div>
                  <div className="text-[10px] text-stone-500">{row.account_code} • Qty {row.quantity ?? 0}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/daraz/inventory")} className="mt-3 w-full py-2 border border-stone-300 rounded bg-white hover:bg-stone-50 font-semibold text-stone-700">Review Inventory</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SellerLoader({ text }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-500">
      <RefreshCw className="animate-spin text-cyan-700" size={34} />
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide">{text}</p>
    </div>
  );
}

function Notice({ notice }) {
  if (!notice?.text) return null;
  const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200";
  return <div className={`border rounded px-4 py-3 font-medium ${cls}`}>{notice.text}</div>;
}

function MetricCard({ icon: Icon, label, value, sub, tone }) {
  const toneClass = {
    cyan: "text-cyan-700 bg-cyan-50 border-cyan-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    rose: "text-rose-700 bg-rose-50 border-rose-100"
  }[tone] || "text-cyan-700 bg-cyan-50 border-cyan-100";

  return (
    <motion.div whileHover={{ y: -2 }} className="bg-white border border-stone-200 rounded shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded border ${toneClass}`}><Icon size={18} /></div>
        <Clock size={14} className="text-stone-300" />
      </div>
      <div className="mt-4 text-[11px] uppercase font-bold text-stone-500">{label}</div>
      <div className="text-2xl font-black text-stone-900 mt-1">{value}</div>
      <div className="text-[11px] text-stone-500 mt-1">{sub}</div>
    </motion.div>
  );
}

function StatusPill({ value }) {
  const norm = String(value || "").toLowerCase();
  const cls = norm.includes("active") || norm.includes("success") || norm === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : norm.includes("missing") || norm.includes("failed") || norm.includes("expired") ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex px-2 py-1 rounded border text-[10px] font-bold uppercase ${cls}`}>{value || "unknown"}</span>;
}

function HealthRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-500">{label}</span>
      <span className={`font-bold flex items-center gap-1 ${ok ? "text-emerald-700" : "text-rose-700"}`}>
        {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {value}
      </span>
    </div>
  );
}
