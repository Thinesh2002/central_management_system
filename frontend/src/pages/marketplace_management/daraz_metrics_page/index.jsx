import React, { useEffect, useState } from "react";
import { Clock, Gauge, Loader2, RefreshCw, ShieldCheck, Star, Tag } from "lucide-react";

import darazSellerMetricsApi from "../../../config/sub_api/daraz_api/daraz_seller_metrics_api";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import { getApiError } from "../../../config/api";
import Loader from "../../../components/common/Loader";

function extractAccounts(res) {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  return [];
}

function getAccountId(account = {}) {
  return account.id || account.account_id;
}

function getAccountName(account = {}) {
  return account.account_name || account.account_code || `#${getAccountId(account)}`;
}

function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toFixed(2)}%`;
}

function MetricCard({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-[#0D1322] text-slate-200",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    orange: "border-orange-400/20 bg-orange-400/10 text-orange-300",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-[16px] font-bold text-white">{value}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

export default function DarazMetricsPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [metrics, setMetrics] = useState(null);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await marketplaceApi.getAccounts({ platform_code: "DARAZ" });
        const rows = extractAccounts(res);
        setAccounts(rows);
        if (rows.length) setAccountId(String(getAccountId(rows[0])));
      } catch (err) {
        setError(getApiError(err, "Failed to load Daraz accounts"));
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  async function loadMetrics() {
    if (!accountId) return;

    setLoadingMetrics(true);
    setError("");

    try {
      const res = await darazSellerMetricsApi.get(accountId);
      setMetrics(res?.data?.data || null);
    } catch (err) {
      setMetrics(null);
      setError(getApiError(err, "Failed to load seller metrics"));
    } finally {
      setLoadingMetrics(false);
    }
  }

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Gauge size={20} />
            Daraz Metrics
          </h1>
          <p className="text-[13px] text-slate-500">
            Live seller performance — positive rating, ship-on-time rate, and response metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loadingAccounts || !accounts.length}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
          >
            {!accounts.length && <option value="">No Daraz accounts</option>}
            {accounts.map((account) => (
              <option key={getAccountId(account)} value={getAccountId(account)}>
                {getAccountName(account)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadMetrics}
            disabled={!accountId || loadingMetrics}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMetrics ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {loadingMetrics ? (
        <Loader label="Loading seller metrics..." minHeight="240px" />
      ) : !metrics ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          No metrics loaded yet. Pick an account and click Refresh.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <MetricCard icon={Star} label="Positive Seller Rating" value={percent(metrics.positive_seller_rating)} tone="green" />
            <MetricCard icon={ShieldCheck} label="Ship On Time" value={percent(metrics.ship_on_time)} tone="orange" />
            <MetricCard icon={Gauge} label="Response Rate" value={percent(Number(metrics.response_rate) * 100)} tone="blue" />
            <MetricCard icon={Clock} label="Response Time" value={`${metrics.response_time ?? "-"} hrs`} tone="slate" />
            <MetricCard icon={Tag} label="Main Category" value={metrics.main_category_name || "-"} tone="slate" />
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3 text-[11px] text-slate-500">
            Seller ID: <span className="font-mono text-slate-300">{metrics.seller_id || "-"}</span> · Category ID:{" "}
            <span className="font-mono text-slate-300">{metrics.main_category_id || "-"}</span>
          </div>
        </>
      )}
    </div>
  );
}
