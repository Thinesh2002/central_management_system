import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  ShieldCheck,
  Loader2,
  PlayCircle,
  Store,
  AlertTriangle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import Loader from "../../../components/common/Loader";

function Badge({ value }) {
  const status = value || "unknown";

  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-gray-50 text-gray-700 border-gray-200",
    connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    valid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    token_expired: "bg-red-50 text-red-700 border-red-200",
    reauthorization_required: "bg-orange-50 text-orange-700 border-orange-200",
    refresh_failed: "bg-red-50 text-red-700 border-red-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    expired: "bg-orange-50 text-orange-700 border-orange-200",
    not_created: "bg-gray-50 text-gray-700 border-gray-200",
    not_connected: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function MarketplaceAccountDetailsPage() {
  const { accountId } = useParams();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingToken, setCheckingToken] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState("products");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const account = useMemo(() => {
    return accounts.find((item) => String(item.id) === String(accountId));
  }, [accounts, accountId]);

  async function loadAccount() {
    try {
      setLoading(true);
      setError("");

      const res = await marketplaceApi.getAccounts();
      setAccounts(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError(err?.friendlyMessage || "Failed to load account details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckToken() {
    try {
      setCheckingToken(true);
      setMessage("");
      setError("");

      await marketplaceApi.checkAccountToken(accountId);

      setMessage("Token check completed. Account token is valid.");
      await loadAccount();
    } catch (err) {
      setError(err?.friendlyMessage || "Token check failed.");
      await loadAccount();
    } finally {
      setCheckingToken(false);
    }
  }

  async function handleManualSync() {
    try {
      setSyncing(true);
      setMessage("");
      setError("");

      const res = await marketplaceApi.manualSync(accountId, syncType);

      const data = res?.data?.data;

      setMessage(
        data
          ? `Manual ${syncType} sync completed. Status: ${data.status}. Total: ${data.total_records}, Success: ${data.success_records}, Failed: ${data.failed_records}`
          : `Manual ${syncType} sync completed.`
      );

      await loadAccount();
    } catch (err) {
      setError(err?.friendlyMessage || "Manual sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  if (loading) {
    return <Loader label="Loading account details..." minHeight="100vh" />;
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-transparent p-6">
        <Link
          to="/marketplace/accounts"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to accounts
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          Account not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6">
      <div className="mb-6">
        <Link
          to="/marketplace/accounts"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to accounts
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {account.account_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {account.account_uid} • {account.platform_name || account.platform_code}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCheckToken}
              disabled={checkingToken}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingToken ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              Check Token
            </button>

            <button
              type="button"
              onClick={loadAccount}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <Store size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900">Account Information</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Platform" value={account.platform_name || account.platform_code} />
            <Info label="Platform Code" value={account.platform_code} />
            <Info label="Account UID" value={account.account_uid} />
            <Info label="Account Code" value={account.account_code || "-"} />
            <Info label="Country" value={account.country_code || "-"} />
            <Info label="Seller ID" value={account.seller_id || "-"} />
            <Info label="Seller Email" value={account.seller_email || "-"} />
            <Info label="Store URL" value={account.store_url || "-"} />
            <Info label="API Base URL" value={account.api_base_url || "-"} />
            <Info
              label="Last Connected"
              value={
                account.last_connected_at
                  ? new Date(account.last_connected_at).toLocaleString()
                  : "-"
              }
            />
            <Info
              label="Last Sync"
              value={
                account.last_sync_at
                  ? new Date(account.last_sync_at).toLocaleString()
                  : "-"
              }
            />
            <Info
              label="Last Checked"
              value={
                account.last_checked_at
                  ? new Date(account.last_checked_at).toLocaleString()
                  : "-"
              }
            />
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Activity size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900">Health</h2>
            </div>

            <div className="space-y-3">
              <HealthRow label="Status" value={<Badge value={account.status} />} />
              <HealthRow
                label="Connection"
                value={<Badge value={account.connection_status} />}
              />
              <HealthRow
                label="Token"
                value={<Badge value={account.token_status || "not_created"} />}
              />
              <HealthRow
                label="Today Errors"
                value={account.error_count_today ?? 0}
              />
              <HealthRow
                label="Today Success"
                value={account.success_count_today ?? 0}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <PlayCircle size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900">Manual Sync</h2>
            </div>

            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sync Type
            </label>
            <select
              value={syncType}
              onChange={(e) => setSyncType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            >
              <option value="products">Products</option>
              <option value="categories">Categories</option>
              <option value="inventory">Inventory</option>
              <option value="price">Price</option>
              <option value="images">Images</option>
              <option value="full_sync">Full Sync</option>
            </select>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 text-[12px] font-semibold text-slate-900 shadow-sm hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <PlayCircle size={16} />
              )}
              Run Manual Sync
            </button>
          </section>

          {account.last_error && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex gap-2">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600"
                />
                <div>
                  <h3 className="font-semibold text-red-800">Last Error</h3>
                  <p className="mt-1 text-sm text-red-700">{account.last_error}</p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function HealthRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}