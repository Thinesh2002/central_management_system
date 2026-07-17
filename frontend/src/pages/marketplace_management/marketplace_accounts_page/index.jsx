import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Store,
  Search,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Database,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import Loader from "../../../components/common/Loader";
import { usePageOverlay } from "../../../components/common/page_overlay/PageOverlayProvider";

function extractAccounts(res) {
  const payload = res?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.result)) return payload.result;

  if (Array.isArray(payload?.data?.accounts)) return payload.data.accounts;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  return [];
}

function cleanStatus(value) {
  return String(value || "unknown").replaceAll("_", " ");
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

const GOOD_STATUSES = new Set(["active", "connected", "valid"]);
const BAD_STATUSES = new Set([
  "token_expired",
  "reauthorization_required",
  "connection_failed",
  "refresh_failed",
  "expired",
  "invalid",
  "error",
  "failed",
]);

function accountNeedsDarazReauth(account) {
  if (String(account?.platform_code || "").toUpperCase() !== "DARAZ") {
    return false;
  }

  const values = [
    normalizeStatus(account.status),
    normalizeStatus(account.connection_status),
    normalizeStatus(account.token_status),
  ];

  return values.some((value) => BAD_STATUSES.has(value) || value === "not_created" || value === "not_connected");
}

function extractDarazAuthUrl(res) {
  const payload = res?.data;

  const candidates = [
    payload?.authorization_url,
    payload?.auth_url,
    payload?.url,
    payload?.data?.authorization_url,
    payload?.data?.auth_url,
    payload?.data?.url,
    payload?.result?.authorization_url,
    payload?.result?.auth_url,
    payload?.result?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (candidate && typeof candidate === "object") {
      const nested =
        candidate.authorization_url ||
        candidate.auth_url ||
        candidate.url ||
        candidate.data?.authorization_url ||
        candidate.data?.auth_url ||
        candidate.data?.url;

      if (typeof nested === "string" && nested.trim()) {
        return nested.trim();
      }
    }
  }

  return "";
}

function StatusBadge({ value }) {
  const status = normalizeStatus(value) || "unknown";

  let className = "border-slate-700 bg-slate-800/60 text-slate-300";

  if (GOOD_STATUSES.has(status)) {
    className = "border-emerald-900 bg-emerald-950 text-emerald-300";
  } else if (BAD_STATUSES.has(status)) {
    className = "border-red-900 bg-red-950 text-red-300";
  } else if (status === "sync_paused" || status === "paused") {
    className = "border-amber-900 bg-amber-950 text-amber-300";
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${className}`}>
      {cleanStatus(status)}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-[#0b1220] text-slate-200",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    orange: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-[18px] font-bold text-white">{value}</p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceAccountsPage() {
  const { openOverlay } = usePageOverlay();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [reauthAccountId, setReauthAccountId] = useState(null);
  const [deletingAccountId, setDeletingAccountId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await marketplaceApi.getAccounts();
      const rows = extractAccounts(res);

      setAccounts(rows);
    } catch (err) {
      console.error("[LOAD_MARKETPLACE_ACCOUNTS_ERROR]", err);

      setAccounts([]);
      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          "Failed to load marketplace accounts. Please check backend API."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckAllTokens() {
    try {
      setCheckingAll(true);
      setError("");
      setMessage("");

      const res = await marketplaceApi.checkAllDarazTokens();
      const summary = res?.data?.summary;

      setMessage(
        summary
          ? `Token check completed. Total: ${summary.total || 0}, Valid: ${
              summary.valid || 0
            }, Refreshed: ${summary.refreshed || 0}, Failed: ${
              summary.failed || 0
            }`
          : "Daraz token check completed."
      );

      await loadAccounts();
    } catch (err) {
      console.error("[CHECK_ALL_DARAZ_TOKENS_ERROR]", err);

      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          "Failed to check Daraz tokens."
      );
    } finally {
      setCheckingAll(false);
    }
  }

  async function handleDarazReconnect(accountId) {
    try {
      setReauthAccountId(accountId);
      setError("");
      setMessage("");

      if (!marketplaceApi.getDarazReauthUrl) {
        throw new Error(
          "getDarazReauthUrl API function missing in marketplace_api.jsx"
        );
      }

      const res = await marketplaceApi.getDarazReauthUrl(accountId);
      const authUrl = extractDarazAuthUrl(res);

      if (!authUrl) {
        console.error("Invalid Daraz auth URL response:", res?.data);

        throw new Error(
          "Daraz authorization URL invalid. Backend must return auth_url or authorization_url as string."
        );
      }

      if (!authUrl.startsWith("http")) {
        console.error("Invalid Daraz auth URL:", authUrl);

        throw new Error("Daraz authorization URL is not valid.");
      }

      window.location.href = authUrl;
    } catch (err) {
      console.error("[DARAZ_REAUTH_START_ERROR]", err);

      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to start Daraz reauthorization."
      );
    } finally {
      setReauthAccountId(null);
    }
  }

  async function handleDeleteAccount(account) {
    const accountId = account?.id || account?.account_id;

    if (!accountId) return;

    const confirmed = window.confirm(
      `Delete marketplace account "${account.account_name || account.account_uid}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingAccountId(accountId);
      setError("");
      setMessage("");

      await marketplaceApi.deleteAccount(accountId);

      setMessage(
        `Marketplace account "${account.account_name || account.account_uid}" deleted successfully.`
      );

      await loadAccounts();
    } catch (err) {
      console.error("[DELETE_MARKETPLACE_ACCOUNT_ERROR]", err);

      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          "Failed to delete marketplace account."
      );
    } finally {
      setDeletingAccountId(null);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return accounts;

    return accounts.filter((account) => {
      return (
        String(account.account_name || "").toLowerCase().includes(q) ||
        String(account.account_uid || "").toLowerCase().includes(q) ||
        String(account.account_code || "").toLowerCase().includes(q) ||
        String(account.platform_code || "").toLowerCase().includes(q) ||
        String(account.platform_name || "").toLowerCase().includes(q) ||
        String(account.country_code || "").toLowerCase().includes(q) ||
        String(account.seller_email || "").toLowerCase().includes(q)
      );
    });
  }, [accounts, search]);

  const stats = useMemo(() => {
    const active = accounts.filter((item) => item.status === "active").length;

    const tokenIssues = accounts.filter((item) => {
      const values = [
        normalizeStatus(item.status),
        normalizeStatus(item.token_status),
        normalizeStatus(item.connection_status),
      ];

      return values.some((value) => BAD_STATUSES.has(value));
    }).length;

    return {
      total: accounts.length,
      active,
      tokenIssues,
      daraz: accounts.filter(
        (item) => String(item.platform_code || "").toUpperCase() === "DARAZ"
      ).length,
      woo: accounts.filter((item) =>
        ["WOO", "WOOCOMMERCE"].includes(
          String(item.platform_code || "").toUpperCase()
        )
      ).length,
    };
  }, [accounts]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Store size={20} />
            Marketplace Accounts
          </h1>
          <p className="text-[13px] text-slate-500">
            Manage Daraz accounts, WooCommerce stores, tokens, manual sync and API health.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheckAllTokens}
            disabled={checkingAll}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingAll ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            Check Daraz Tokens
          </button>

          <button
            type="button"
            onClick={loadAccounts}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openOverlay("/marketplace/accounts/add", loadAccounts)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-2.5 text-[11px] font-semibold text-white hover:bg-orange-400"
          >
            <Plus size={12} />
            Add Account
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-emerald-900 bg-emerald-950 px-3 py-2 text-[13px] text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Accounts" value={stats.total} icon={Database} />
        <StatCard title="Active" value={stats.active} icon={CheckCircle2} tone="green" />
        <StatCard title="Token Issues" value={stats.tokenIssues} icon={XCircle} tone="red" />
        <StatCard title="Daraz" value={stats.daraz} icon={Store} tone="orange" />
        <StatCard title="Woo" value={stats.woo} icon={Store} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950">
        <div className="flex flex-col gap-2 border-b border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search account, platform, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-3 text-[12px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400/60"
            />
          </div>

          <p className="text-[12px] text-slate-500">
            Showing {filteredAccounts.length} of {accounts.length}
          </p>
        </div>

        {loading ? (
          <Loader label="Loading marketplace accounts..." minHeight="0" className="py-16" />
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-800 bg-[#0b1220] text-slate-500">
              <Store size={24} />
            </div>

            <p className="text-[13px] font-semibold text-slate-200">No marketplace accounts found.</p>

            <p className="mt-1 max-w-md text-[12px] text-slate-500">
              If you already added accounts, check whether backend returns data from{" "}
              <span className="font-mono text-orange-300">/api/marketplace/accounts</span> and confirm the response
              key is data/accounts/rows.
            </p>

            <button
              type="button"
              onClick={() => openOverlay("/marketplace/accounts/add", loadAccounts)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-orange-400"
            >
              <Plus size={14} />
              Add Account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-slate-900">
                <tr>
                  {["Account", "Platform", "Country", "Status", "Connection", "Token", "Last Sync"].map((header) => (
                    <th key={header} className="px-3 py-2 font-normal uppercase tracking-wide text-slate-500">
                      {header}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-normal uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredAccounts.map((account) => {
                  const accountId = account.id || account.account_id;

                  return (
                    <tr key={accountId || account.account_uid} className="hover:bg-slate-900">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-white">{account.account_name || "Unnamed Account"}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-orange-300/80">
                          {account.account_uid || account.account_code || "-"}
                        </div>
                        {account.seller_email && (
                          <div className="mt-0.5 text-[11px] text-slate-500">{account.seller_email}</div>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="text-slate-200">{account.platform_name || account.platform_code || "-"}</div>
                        <div className="text-[11px] text-slate-500">{account.platform_code || "-"}</div>
                      </td>

                      <td className="px-3 py-2.5 text-slate-300">{account.country_code || "-"}</td>

                      <td className="px-3 py-2.5">
                        <StatusBadge value={account.status} />
                      </td>

                      <td className="px-3 py-2.5">
                        <StatusBadge value={account.connection_status} />
                      </td>

                      <td className="px-3 py-2.5">
                        <StatusBadge value={account.token_status || "not_created"} />
                      </td>

                      <td className="px-3 py-2.5 text-slate-400">
                        {account.last_sync_at ? new Date(account.last_sync_at).toLocaleString() : "-"}
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {String(account.platform_code || "").toUpperCase() === "DARAZ" && (
                            <button
                              type="button"
                              onClick={() => handleDarazReconnect(accountId)}
                              disabled={reauthAccountId === accountId}
                              title={accountNeedsDarazReauth(account) ? "Reconnect" : "Connect"}
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-orange-500 px-2 text-[11px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reauthAccountId === accountId ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={12} />
                              )}
                              {accountNeedsDarazReauth(account) ? "Reconnect" : "Connect"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openOverlay(`/marketplace/accounts/${accountId}`, loadAccounts)}
                            title="View"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openOverlay(`/marketplace/accounts/${accountId}/edit`, loadAccounts)}
                            title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(account)}
                            disabled={deletingAccountId === accountId}
                            title="Delete"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingAccountId === accountId ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-[#0b1220] p-3 text-[12px] text-slate-400">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange-400" />
        <p>
          Backend token checker runs every 15 minutes. If a Daraz token becomes expired or reauthorization required,
          use the Connect/Reconnect button to complete seller authorization again.
        </p>
      </div>
    </div>
  );
}
