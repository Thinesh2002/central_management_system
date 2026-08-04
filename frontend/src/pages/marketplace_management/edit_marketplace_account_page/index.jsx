import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save,
  Store,
  KeyRound,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import Loader from "../../../components/common/Loader";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#070B14] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/10";

const emptyForm = {
  platform_code: "DARAZ",
  account_uid: "",
  account_name: "",
  account_code: "",
  country_code: "LK",
  seller_id: "",
  seller_email: "",
  store_url: "",
  api_base_url: "",
  is_sandbox: false,

  app_key: "",
  app_secret: "",
  access_token: "",
  refresh_token: "",
  access_token_expires_at: "",
  refresh_token_expires_at: "",
};

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

function extractOneAccount(res) {
  const payload = res?.data;

  if (!payload) return null;
  if (payload.account) return payload.account;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.row) return payload.row;

  return null;
}

function getAccountId(account) {
  return account?.id || account?.account_id;
}

function toDatetimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditMarketplaceAccountPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAppSecret, setShowAppSecret] = useState(false);

  const pageTitle = useMemo(() => {
    return account?.account_name
      ? `Edit ${account.account_name}`
      : "Edit Marketplace Account";
  }, [account]);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function fillForm(row) {
    setForm({
      platform_code: "DARAZ",
      account_uid: row.account_uid || "",
      account_name: row.account_name || "",
      account_code: row.account_code || "",
      country_code: row.country_code || "LK",
      seller_id: row.seller_id || "",
      seller_email: row.seller_email || "",
      store_url: row.store_url || "",
      api_base_url: row.api_base_url || "https://api.daraz.lk/rest",
      is_sandbox: Boolean(row.is_sandbox),

      app_key: "",
      app_secret: "",
      access_token: "",
      refresh_token: "",
      access_token_expires_at: toDatetimeLocal(row.access_token_expires_at),
      refresh_token_expires_at: toDatetimeLocal(row.refresh_token_expires_at),
    });
  }

  async function loadAccount() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      let row = null;

      try {
        const singleRes = await marketplaceApi.getAccountById(accountId);
        row = extractOneAccount(singleRes);
      } catch (_) {
        row = null;
      }

      if (!row) {
        const res = await marketplaceApi.getAccounts();
        const rows = extractAccounts(res);

        row = rows.find(
          (item) =>
            String(item.id) === String(accountId) ||
            String(item.account_id) === String(accountId) ||
            String(item.account_uid) === String(accountId)
        );
      }

      if (!row) {
        throw new Error("Account not found.");
      }

      setAccount(row);
      fillForm(row);
    } catch (err) {
      setError(err?.friendlyMessage || err?.message || "Failed to load account.");
    } finally {
      setLoading(false);
    }
  }

  function validateForm() {
    if (!form.account_name.trim()) return "Account name is required.";
    if (!form.account_code.trim()) return "Account code is required.";
    if (!form.account_uid.trim()) return "Account UID is required.";

    return "";
  }

  function buildDarazPayload() {
    return {
      platform_code: "DARAZ",
      account_uid: form.account_uid.trim() || null,
      account_name: form.account_name.trim(),
      account_code: form.account_code.trim(),
      country_code: form.country_code.trim() || "LK",
      seller_id: form.seller_id.trim() || null,
      seller_email: form.seller_email.trim() || null,
      store_url: form.store_url.trim() || null,
      api_base_url: form.api_base_url.trim() || null,
      is_sandbox: form.is_sandbox ? 1 : 0,
      app_key: form.app_key.trim() || null,
      app_secret: form.app_secret.trim() || null,
      access_token: form.access_token.trim() || null,
      refresh_token: form.refresh_token.trim() || null,
      access_token_expires_at: form.access_token_expires_at || null,
      refresh_token_expires_at: form.refresh_token_expires_at || null,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const id = getAccountId(account) || accountId;

      await marketplaceApi.updateAccount(id, buildDarazPayload());

      navigate("/marketplace/accounts");
    } catch (err) {
      setError(
        err?.friendlyMessage ||
          "Failed to update marketplace account. Check backend update route."
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14]">
        <Loader label="Loading account..." minHeight="100vh" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{pageTitle}</h1>

          <p className="mt-1 text-sm text-slate-400">
            Update account details and API base settings.
          </p>
        </div>

        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
          Secret fields are blank for safety. Fill only when changing keys.
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

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
                <Store size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-white">Account Details</h2>
                <p className="text-xs text-slate-400">
                  Platform cannot be changed after account creation.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Platform">
                <input value="DARAZ" disabled className={`${inputClass} opacity-70`} />
              </Field>

              <Field label="Country Code">
                <input
                  value={form.country_code}
                  onChange={(e) =>
                    updateField("country_code", e.target.value.toUpperCase())
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Account UID">
                <input
                  value={form.account_uid}
                  onChange={(e) =>
                    updateField("account_uid", e.target.value.toUpperCase())
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Account Code">
                <input
                  value={form.account_code}
                  onChange={(e) => updateField("account_code", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Account Name" className="md:col-span-2">
                <input
                  value={form.account_name}
                  onChange={(e) => updateField("account_name", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Seller ID">
                <input
                  value={form.seller_id}
                  onChange={(e) => updateField("seller_id", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Seller Email">
                <input
                  type="email"
                  value={form.seller_email}
                  onChange={(e) => updateField("seller_email", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="API Base URL" className="md:col-span-2">
                <input
                  value={form.api_base_url}
                  onChange={(e) => updateField("api_base_url", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#070B14] px-4 py-3 text-sm text-slate-300 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_sandbox}
                  onChange={(e) => updateField("is_sandbox", e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-yellow-400"
                />
                Sandbox / test account
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
                <KeyRound size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-white">Update Daraz Credentials</h2>
                <p className="text-xs text-slate-400">
                  Leave secret fields blank if you do not want to change them.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="New App Key">
                <input
                  value={form.app_key}
                  onChange={(e) => updateField("app_key", e.target.value)}
                  placeholder="Fill only if changing"
                  className={inputClass}
                />
              </Field>

              <Field label="New App Secret">
                <SecretInput
                  value={form.app_secret}
                  show={showAppSecret}
                  setShow={setShowAppSecret}
                  onChange={(value) => updateField("app_secret", value)}
                  placeholder="Fill only if changing"
                />
              </Field>

              <Field label="New Access Token" className="md:col-span-2">
                <textarea
                  value={form.access_token}
                  onChange={(e) => updateField("access_token", e.target.value)}
                  rows={3}
                  placeholder="Fill only if changing"
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="New Refresh Token" className="md:col-span-2">
                <textarea
                  value={form.refresh_token}
                  onChange={(e) =>
                    updateField("refresh_token", e.target.value)
                  }
                  rows={3}
                  placeholder="Fill only if changing"
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="Access Token Expires At">
                <input
                  type="datetime-local"
                  value={form.access_token_expires_at}
                  onChange={(e) =>
                    updateField("access_token_expires_at", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Refresh Token Expires At">
                <input
                  type="datetime-local"
                  value={form.refresh_token_expires_at}
                  onChange={(e) =>
                    updateField("refresh_token_expires_at", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck size={18} />
              </div>

              <div>
                <h3 className="font-semibold text-white">Update Account</h3>
                <p className="text-xs text-slate-400">
                  Save account changes safely.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 text-[12px] font-semibold text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </button>
          </section>

          <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
            <div className="flex gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-yellow-300"
              />

              <div>
                <h3 className="font-semibold text-yellow-200">
                  Important Note
                </h3>
                <p className="mt-1 text-sm leading-6 text-yellow-100/80">
                  Daraz refresh token expiry needs seller reauthorization.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function SecretInput({ value, show, setShow, onChange, placeholder }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pr-11`}
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-yellow-300"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
