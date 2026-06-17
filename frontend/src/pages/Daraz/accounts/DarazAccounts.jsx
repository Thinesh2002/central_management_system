import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, KeyRound, Link2, RefreshCw, Save, Store, XCircle } from "lucide-react";
import { darazApi, extractApiMessage, formatDateTime } from "../../../services/daraz/darazCentral.service";

const emptyForm = {
  account_code: "",
  account_name: "",
  seller_id: "",
  user_id: "",
  country_code: "LK",
  api_base_url: "https://api.daraz.lk/rest",
  access_token: "",
  refresh_token: "",
  sync_status: "active",
  notes: ""
};

export default function DarazAccounts() {
  const location = useLocation();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCode, setEditingCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await darazApi.getAccounts({ active_only: "false" });
      setAccounts(data.rows || []);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz accounts could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice({ type: "success", text: location.state.notice });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCode(null);
  };

  const editAccount = (account) => {
    setEditingCode(account.account_code);
    setForm({
      ...emptyForm,
      account_code: account.account_code || "",
      account_name: account.account_name || "",
      seller_id: account.seller_id || "",
      user_id: account.user_id || "",
      country_code: account.country_code || "LK",
      api_base_url: account.api_base_url || "https://api.daraz.lk/rest",
      sync_status: account.sync_status || "active",
      notes: account.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitAccount = async (e) => {
    e.preventDefault();
    if (!form.account_code.trim() || !form.account_name.trim()) {
      setNotice({ type: "warning", text: "Account code and account name are required before saving the Daraz channel." });
      return;
    }

    setSaving(true);
    setNotice({ type: "info", text: editingCode ? "Updating Daraz account details…" : "Saving new Daraz account…" });
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") payload[key] = null;
      });

      const res = editingCode ? await darazApi.updateAccount(editingCode, payload) : await darazApi.createAccount(payload);
      setNotice({ type: "success", text: res?.message || "Daraz account saved successfully." });
      resetForm();
      await loadAccounts();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz account could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  const refreshToken = async (accountCode) => {
    setNotice({ type: "info", text: `Checking token status for ${accountCode}…` });
    try {
      const res = await darazApi.refreshAccountToken(accountCode);

      if (res?.success === false) {
        setNotice({
          type: "warning",
          text: res?.message || `Token refresh failed for ${accountCode}. Please re-authorize the seller account.`,
          authUrl: res?.auth_url || null
        });
        await loadAccounts();
        return;
      }

      setNotice({ type: "success", text: res?.message || `Token refreshed successfully for ${accountCode}.` });
      await loadAccounts();
    } catch (error) {
      const data = error?.response?.data;
      setNotice({
        type: "error",
        text: extractApiMessage(error, `Token refresh failed for ${accountCode}.`),
        authUrl: data?.auth_url || null
      });
    }
  };

  const reconnectAccount = async (accountCode) => {
    setNotice({ type: "info", text: `Opening Daraz Seller Center authorization for ${accountCode}…` });
    try {
      const res = await darazApi.getAccountAuthUrl(accountCode);
      if (!res?.auth_url) {
        setNotice({ type: "error", text: "Authorization link could not be generated. Please check backend DARAZ_REDIRECT_URI and Daraz app settings." });
        return;
      }
      window.location.href = res.auth_url;
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Authorization link could not be generated. Please check backend DARAZ_REDIRECT_URI and try again.") });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5 bg-stone-50 min-h-screen text-stone-800 text-xs">
      <header>
        <div className="flex items-center gap-2 text-cyan-700 font-semibold uppercase tracking-wide text-[11px]"><Store size={15} /> Daraz Accounts</div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">Marketplace Account Center</h1>
        <p className="text-[11px] text-stone-500 mt-1">Connect Daraz seller accounts, manage tokens, and control sync readiness.</p>
      </header>

      <Notice notice={notice} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <form onSubmit={submitAccount} className="xl:col-span-4 bg-white border border-stone-200 rounded shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="font-bold text-stone-900">{editingCode ? "Update Account" : "Add Account"}</h2>
              <p className="text-[11px] text-stone-500">Token fields are optional when you authorize later.</p>
            </div>
            {editingCode && <button type="button" onClick={resetForm} className="text-stone-400 hover:text-stone-700"><XCircle size={16} /></button>}
          </div>

          <Input label="Account Code" value={form.account_code} disabled={!!editingCode} onChange={(v) => updateField("account_code", v.toUpperCase().replace(/\s+/g, "_"))} placeholder="LEDSONE_LK" required />
          <Input label="Account Name" value={form.account_name} onChange={(v) => updateField("account_name", v)} placeholder="LEDSONE Daraz LK" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Seller ID" value={form.seller_id} onChange={(v) => updateField("seller_id", v)} />
            <Input label="User ID" value={form.user_id} onChange={(v) => updateField("user_id", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country" value={form.country_code} onChange={(v) => updateField("country_code", v.toUpperCase())} />
            <Select label="Sync Status" value={form.sync_status} onChange={(v) => updateField("sync_status", v)} options={["active", "paused", "inactive", "blocked"]} />
          </div>
          <Input label="API Base URL" value={form.api_base_url} onChange={(v) => updateField("api_base_url", v)} />
          <Input label="Access Token" type="password" value={form.access_token} onChange={(v) => updateField("access_token", v)} placeholder={editingCode ? "Leave blank to keep existing token" : "Paste access token"} />
          <Input label="Refresh Token" type="password" value={form.refresh_token} onChange={(v) => updateField("refresh_token", v)} placeholder={editingCode ? "Leave blank to keep existing token" : "Paste refresh token"} />
          <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide">
            Notes
            <textarea value={form.notes || ""} onChange={(e) => updateField("notes", e.target.value)} className="mt-1 w-full min-h-20 border border-stone-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-600 normal-case font-normal" placeholder="Internal account notes" />
          </label>
          <button disabled={saving} className="w-full py-2 bg-[#002f36] text-white rounded font-semibold hover:bg-[#003f48] disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} {editingCode ? "Update Account" : "Save Account"}
          </button>
        </form>

        <div className="xl:col-span-8 bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-stone-900">Connected Seller Accounts</h2>
              <p className="text-[11px] text-stone-500">Use refresh token action when token status shows expired or failed.</p>
            </div>
            <button onClick={loadAccounts} className="px-3 py-2 border border-stone-300 rounded bg-white hover:bg-stone-50 font-semibold flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Sync</th>
                  <th className="px-4 py-3">Last Product Sync</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-10 text-center text-stone-400">Loading accounts…</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-10 text-center text-stone-400">No Daraz accounts found. Add your first seller account to start syncing.</td></tr>
                ) : accounts.map((account) => (
                  <tr key={account.account_code} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{account.account_name}</div>
                      <div className="text-[10px] text-stone-500 font-mono uppercase">{account.account_code}</div>
                    </td>
                    <td className="px-4 py-3"><TokenStatus value={account.token_status} /></td>
                    <td className="px-4 py-3"><TokenStatus value={account.sync_status} /></td>
                    <td className="px-4 py-3 text-stone-600">{formatDateTime(account.last_product_sync_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => editAccount(account)} className="px-2 py-1 border border-stone-300 rounded hover:bg-stone-50 font-semibold">Edit</button>
                        {needsReauth(account.token_status) ? (
                          <button onClick={() => reconnectAccount(account.account_code)} className="px-2 py-1 border border-amber-200 text-amber-700 rounded hover:bg-amber-50 font-semibold flex items-center gap-1"><Link2 size={12} /> Reconnect</button>
                        ) : (
                          <button onClick={() => refreshToken(account.account_code)} className="px-2 py-1 border border-cyan-200 text-cyan-700 rounded hover:bg-cyan-50 font-semibold flex items-center gap-1"><KeyRound size={12} /> Refresh Token</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text", required = false, disabled = false }) {
  return (
    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide">
      {label}
      <input required={required} disabled={disabled} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full border border-stone-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-600 normal-case font-normal disabled:bg-stone-100" />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide">
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-600 normal-case font-normal bg-white">
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}

function Notice({ notice }) {
  if (!notice?.text) return null;
  const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200";
  return (
    <div className={`border rounded px-4 py-3 font-medium ${cls}`}>
      <div>{notice.text}</div>
      {notice.authUrl && (
        <a
          href={notice.authUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex mt-2 px-3 py-1.5 rounded bg-white border border-current font-bold hover:opacity-80"
        >
          Re-authorize Daraz Account
        </a>
      )}
    </div>
  );
}

function needsReauth(value) {
  const norm = String(value || "missing").toLowerCase();
  return ["refresh_failed", "reauth_required", "missing", "expired"].includes(norm) || norm.includes("failed") || norm.includes("required");
}

function TokenStatus({ value }) {
  const norm = String(value || "missing").toLowerCase();
  const good = norm === "active" || norm === "success" || norm === "ok";
  const bad = norm.includes("failed") || norm.includes("expired") || norm.includes("missing") || norm.includes("required");
  const cls = good ? "bg-emerald-50 text-emerald-700 border-emerald-200" : bad ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold uppercase ${cls}`}>{good ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {value || "missing"}</span>;
}
