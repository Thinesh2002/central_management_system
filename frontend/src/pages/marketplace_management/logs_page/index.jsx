import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, RefreshCw, X } from "lucide-react";
import marketplaceLogsApi from "../../../config/sub_api/marketplace_api/marketplace_logs_api";
import marketplaceApi from "../../../config/sub_api/marketplace_management_api/marketplace_api";

const TYPES = [
  ["daraz_order_api", "Daraz order API logs"],
  ["daraz_order_sync", "Daraz order sync logs"],
  ["daraz_product_sync", "Daraz product sync logs"],
  ["daraz_finance_api", "Daraz finance API logs"],
  ["daraz_finance_sync", "Daraz finance sync logs"],
  ["woo_order_sync", "Woo order sync logs"],
  ["woo_product_sync", "Woo product sync logs"],
  ["inventory_movement", "Inventory movement logs"],
  ["transfer", "Marketplace transfer logs"],
];

const inputClass = "h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-blue-700";

function unwrapRows(response) {
  const payload = response?.data || response || {};
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;
  return [];
}

function compact(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 90)}...` : text || "-";
}

function pick(row, keys) {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  return "-";
}

export default function MarketplaceLogsPage({ defaultType = "transfer" }) {
  const { type: routeType } = useParams();
  const [type, setType] = useState(routeType || defaultType);
  const [filters, setFilters] = useState({ search: "", account_id: "", status: "", date_from: "", date_to: "", page: 1, limit: 50 });
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (routeType) setType(routeType); }, [routeType]);

  const title = useMemo(() => TYPES.find(([key]) => key === type)?.[1] || "Marketplace logs", [type]);

  useEffect(() => {
    async function loadAccounts() {
      const response = await marketplaceApi.getAccounts().catch(() => null);
      setAccounts(unwrapRows(response));
    }
    loadAccounts();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await marketplaceLogsApi.list(type, filters);
      setRows(unwrapRows(response));
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "Unable to load logs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [type, filters]);

  useEffect(() => { load(); }, [load]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="min-h-screen bg-[#020617] p-3 text-slate-100 lg:p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0b1019] px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-100">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">Filter API, sync, inventory, finance and marketplace transfer logs.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1019] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
              {TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={filters.account_id} onChange={(event) => setFilter("account_id", event.target.value)} className={inputClass}>
              <option value="">All accounts</option>
              {accounts.map((account) => <option key={account.id || account.account_id} value={account.id || account.account_id}>{account.account_name || account.account_code}</option>)}
            </select>
            <input value={filters.search} onChange={(event) => setFilter("search", event.target.value)} placeholder="Search..." className={inputClass} />
            <input value={filters.status} onChange={(event) => setFilter("status", event.target.value)} placeholder="Status" className={inputClass} />
            <input type="date" value={filters.date_from} onChange={(event) => setFilter("date_from", event.target.value)} className={inputClass} />
            <input type="date" value={filters.date_to} onChange={(event) => setFilter("date_to", event.target.value)} className={inputClass} />
          </div>
        </div>

        {message && <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{message}</p>}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1019]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-800 bg-[#111827] text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Account</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Message</th><th className="px-4 py-3 text-right">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-[#111827]">
                    <td className="px-4 py-3 text-slate-300">{pick(row, ["created_at", "started_at", "updated_at", "movement_date", "sync_started_at"])}</td>
                    <td className="px-4 py-3 text-slate-300">{pick(row, ["account_code", "account_id", "platform_code"])}</td>
                    <td className="px-4 py-3 text-slate-300">{pick(row, ["request_type", "action_type", "movement_type", "sync_type", "type"])}</td>
                    <td className="px-4 py-3 text-slate-300">{pick(row, ["status", "api_status", "sync_status", "http_status"])} </td>
                    <td className="px-4 py-3 text-slate-400">{compact(pick(row, ["message", "error_message", "endpoint", "sku", "reference_id"]))}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setSelected(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"><Eye size={13} /> View</button></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">{loading ? "Loading..." : "No logs found."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-100">Log details</h2>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"><X size={15} /></button>
            </div>
            <pre className="max-h-[70vh] overflow-auto p-4 text-xs leading-6 text-slate-300">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
