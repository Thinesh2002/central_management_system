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
  Activity,
  Database,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import Loader from "../../../components/common/Loader";
import { openPopup } from "../../../utils/openPopup";

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

function accountNeedsDarazReauth(account) {
  if (String(account?.platform_code || "").toUpperCase() !== "DARAZ") {
    return false;
  }

  const values = [
    normalizeStatus(account.status),
    normalizeStatus(account.connection_status),
    normalizeStatus(account.token_status),
  ];

  return values.some((value) =>
    [
      "reauthorization_required",
      "token_expired",
      "refresh_failed",
      "expired",
      "connection_failed",
      "invalid",
      "not_created",
      "not_connected",
      "error",
    ].includes(value)
  );
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
  const status = value || "unknown";

  const styles = {
    active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    inactive: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    token_expired: "border-red-400/30 bg-red-400/10 text-red-300",
    reauthorization_required:
      "border-orange-400/30 bg-orange-400/10 text-orange-300",
    connection_failed: "border-red-400/30 bg-red-400/10 text-red-300",
    sync_paused: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    connected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    failed: "border-red-400/30 bg-red-400/10 text-red-300",
    expired: "border-orange-400/30 bg-orange-400/10 text-orange-300",
    paused: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    valid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    invalid: "border-red-400/30 bg-red-400/10 text-red-300",
    refresh_failed: "border-red-400/30 bg-red-400/10 text-red-300",
    not_created: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    not_connected: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    error: "border-red-400/30 bg-red-400/10 text-red-300",
    unknown: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] || styles.unknown
      }`}
    >
      {cleanStatus(status)}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-[#0D1322] text-slate-200",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-xl shadow-black/20 ${
        tones[tone] || tones.slate
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceAccountsPage() {
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

      return values.some((value) =>
        [
          "token_expired",
          "reauthorization_required",
          "connection_failed",
          "refresh_failed",
          "expired",
          "invalid",
          "error",
        ].includes(value)
      );
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
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200">
            <Activity size={13} />
            Daraz + WooCommerce Central API
          </div>

          <h1 className="text-xl font-semibold text-white">
            Marketplace Accounts
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Manage Daraz accounts, WooCommerce stores, tokens, manual sync and
            API health.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheckAllTokens}
            disabled={checkingAll}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-[#0D1322] px-3 text-[12px] font-medium text-slate-200 shadow-xl shadow-black/10 transition hover:border-yellow-400/40 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingAll ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ShieldCheck size={13} />
            )}
            Check Daraz Tokens
          </button>

          <button
            type="button"
            onClick={loadAccounts}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-[#0D1322] px-3 text-[12px] font-medium text-slate-200 shadow-xl shadow-black/10 transition hover:border-yellow-400/40 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openPopup("/marketplace/accounts/add")}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-yellow-400 px-3 text-[12px] font-semibold text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300"
          >
            <Plus size={13} />
            Add Account
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Accounts" value={stats.total} icon={Database} />

        <StatCard
          title="Active"
          value={stats.active}
          icon={CheckCircle2}
          tone="green"
        />

        <StatCard
          title="Token Issues"
          value={stats.tokenIssues}
          icon={XCircle}
          tone="red"
        />

        <StatCard title="Daraz" value={stats.daraz} icon={Store} tone="yellow" />

        <StatCard title="Woo" value={stats.woo} icon={Store} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0D1322] shadow-xl shadow-black/20">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              placeholder="Search account, platform, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-white/10 bg-[#070B14] pl-9 pr-3 text-[12px] text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/10"
            />
          </div>

          <p className="text-sm text-slate-500">
            Showing {filteredAccounts.length} of {accounts.length}
          </p>
        </div>

        {loading ? (
          <Loader label="Loading marketplace accounts..." minHeight="0" className="py-16" />
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#070B14] text-slate-500">
              <Store size={30} />
            </div>

            <p className="text-sm font-semibold text-slate-200">
              No marketplace accounts found.
            </p>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              If you already added accounts, check whether backend returns data
              from{" "}
              <span className="font-mono text-yellow-200">
                /api/marketplace/accounts
              </span>{" "}
              and confirm the response key is data/accounts/rows.
            </p>

            <button
              type="button"
              onClick={() => openPopup("/marketplace/accounts/add")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
            >
              <Plus size={16} />
              Add Account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#070B14] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Last Sync</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {filteredAccounts.map((account) => {
                  const accountId = account.id || account.account_id;

                  return (
                    <tr
                      key={accountId || account.account_uid}
                      className="transition hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">
                          {account.account_name || "Unnamed Account"}
                        </div>

                        <div className="mt-0.5 font-mono text-xs text-yellow-200/80">
                          {account.account_uid || account.account_code || "-"}
                        </div>

                        {account.seller_email && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {account.seller_email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-200">
                          {account.platform_name || account.platform_code || "-"}
                        </div>

                        <div className="text-xs text-slate-500">
                          {account.platform_code || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {account.country_code || "-"}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge value={account.status} />
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge value={account.connection_status} />
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge
                          value={account.token_status || "not_created"}
                        />
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {account.last_sync_at
                          ? new Date(account.last_sync_at).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {String(account.platform_code || "").toUpperCase() ===
                            "DARAZ" && (
                            <button
                              type="button"
                              onClick={() => handleDarazReconnect(accountId)}
                              disabled={reauthAccountId === accountId}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reauthAccountId === accountId ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                              {accountNeedsDarazReauth(account)
                                ? "Reconnect"
                                : "Connect"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openPopup(`/marketplace/accounts/${accountId}`)}
                            title="View"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-[#070B14] text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openPopup(`/marketplace/accounts/${accountId}/edit`)}
                            title="Edit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-[#070B14] text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(account)}
                            disabled={deletingAccountId === accountId}
                            title="Delete"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 text-red-300 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingAccountId === accountId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
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

      <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100/80">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-300" />

          <p>
            Backend token checker runs every 15 minutes. If Daraz token becomes
            expired or reauthorization required, use the Connect/Reconnect
            button to complete seller authorization again.
          </p>
        </div>
      </div>
    </div>
  );
}