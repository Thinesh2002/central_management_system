import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, KeyRound, Link2, Plus, RefreshCw, Save, Trash2, XCircle } from "lucide-react";
import { darazApi, extractApiMessage, formatDateTime } from "../../../services/daraz/darazCentral.service";

const defaultForm = {
  account_code: "",
  account_name: "",
  seller_name: "",
  app_key: "",
  app_secret: "",
  api_base_url: "https://api.daraz.lk/rest",
  sync_status: "active"
};

const needsReauth = (status) => ["refresh_failed", "reauth_required", "missing", "expired", "unknown"].includes(String(status || "missing").toLowerCase());

export default function DarazAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingCode, setWorkingCode] = useState("");
  const [editingCode, setEditingCode] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await darazApi.getAccounts({ active_only: "false" });
      setAccounts(response.rows || []);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz account list could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  const tokenCounts = useMemo(() => accounts.reduce((acc, a) => {
    const active = String(a.token_status || "missing").toLowerCase() === "active";
    acc.total += 1;
    if (active) acc.active += 1;
    else acc.issue += 1;
    return acc;
  }, { total: 0, active: 0, issue: 0 }), [accounts]);

  const resetForm = () => {
    setEditingCode(null);
    setForm(defaultForm);
  };

  const editAccount = (account) => {
    setEditingCode(account.account_code);
    setForm({
      account_code: account.account_code || "",
      account_name: account.account_name || account.seller_name || "",
      seller_name: account.seller_name || account.account_name || "",
      app_key: account.app_key && account.app_key !== "[HIDDEN]" ? account.app_key : "",
      app_secret: "",
      api_base_url: account.api_base_url || account.api_base || "https://api.daraz.lk/rest",
      sync_status: account.sync_status || "active"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice({ type: "info", text: editingCode ? "Updating Daraz account settings…" : "Saving Daraz account…" });
    try {
      const payload = { ...form };
      if (!payload.app_secret) delete payload.app_secret;
      if (editingCode) await darazApi.updateAccount(editingCode, payload);
      else await darazApi.createAccount(payload);
      setNotice({ type: "success", text: "Daraz account saved. Reconnect the account if token status is not active." });
      resetForm();
      await loadAccounts();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz account could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  const reconnectAccount = async (accountCode) => {
    setWorkingCode(accountCode);
    setNotice({ type: "info", text: `Opening Daraz authorization for ${accountCode}…` });
    try {
      const response = await darazApi.getAccountAuthUrl(accountCode);
      if (!response?.auth_url) throw new Error("Authorization URL was not returned by backend.");
      window.location.href = response.auth_url;
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz authorization link could not be generated.") });
      setWorkingCode("");
    }
  };

  const refreshToken = async (accountCode) => {
    setWorkingCode(accountCode);
    setNotice({ type: "info", text: `Checking token for ${accountCode}…` });
    try {
      const response = await darazApi.refreshAccountToken(accountCode);
      if (response?.success === false && response?.auth_url) {
        setNotice({ type: "warning", text: response.message || "Reconnect required. Opening Daraz authorization…" });
        setTimeout(() => { window.location.href = response.auth_url; }, 800);
        return;
      }
      setNotice({ type: "success", text: response?.message || "Daraz token refreshed successfully." });
      await loadAccounts();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Token refresh could not be completed.") });
    } finally {
      setWorkingCode("");
    }
  };

  const deleteAccount = async (accountCode) => {
    if (!confirm(`Delete Daraz account ${accountCode} from local system?`)) return;
    setWorkingCode(accountCode);
    try {
      await darazApi.deleteAccount(accountCode);
      setNotice({ type: "success", text: "Daraz account deleted from local system." });
      await loadAccounts();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz account could not be deleted.") });
    } finally {
      setWorkingCode("");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] text-xs">
      <div className="px-4 py-4 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-normal text-stone-900">Daraz Account Health</h1>
          <p className="text-stone-600 mt-1">Manage seller accounts, token status, reconnect flow, API credentials, and auto-sync readiness.</p>
        </div>
        <button onClick={loadAccounts} className="px-3 py-2 border border-stone-300 rounded-sm bg-white hover:bg-stone-50 font-semibold inline-flex items-center gap-2"><RefreshCw size={14} /> Refresh accounts</button>
      </div>

      <Notice notice={notice} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 py-4 bg-stone-50 border-b border-stone-200">
        <Metric label="Total accounts" value={tokenCounts.total} />
        <Metric label="Authorized accounts" value={tokenCounts.active} good />
        <Metric label="Need attention" value={tokenCounts.issue} warning={tokenCounts.issue > 0} />
      </div>

      <section className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
        <form onSubmit={saveAccount} className="xl:col-span-4 bg-white border border-stone-200 rounded-sm shadow-sm p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h2 className="font-bold text-base">{editingCode ? "Edit account" : "Add Daraz account"}</h2>
            {editingCode && <button type="button" onClick={resetForm} className="text-cyan-700 font-semibold">Cancel edit</button>}
          </div>
          <Input label="Account code" value={form.account_code} disabled={!!editingCode} required onChange={(v) => setForm((p) => ({ ...p, account_code: v.toUpperCase().trim() }))} placeholder="BH" />
          <Input label="Account name" value={form.account_name} required onChange={(v) => setForm((p) => ({ ...p, account_name: v }))} placeholder="BrightHub Daraz" />
          <Input label="Seller name" value={form.seller_name} onChange={(v) => setForm((p) => ({ ...p, seller_name: v }))} placeholder="Seller Center display name" />
          <Input label="App key" value={form.app_key} onChange={(v) => setForm((p) => ({ ...p, app_key: v }))} placeholder="504894" />
          <Input label="App secret" value={form.app_secret} type="password" onChange={(v) => setForm((p) => ({ ...p, app_secret: v }))} placeholder={editingCode ? "Leave blank to keep existing" : "Daraz app secret"} />
          <Input label="API base" value={form.api_base_url} onChange={(v) => setForm((p) => ({ ...p, api_base_url: v }))} />
          <Select label="Sync status" value={form.sync_status} onChange={(v) => setForm((p) => ({ ...p, sync_status: v }))} options={["active", "paused", "inactive"]} />
          <button disabled={saving} className="w-full bg-[#00343d] text-white py-2 rounded-sm font-bold hover:bg-[#004b56] disabled:opacity-60 inline-flex items-center justify-center gap-2"><Save size={14} /> {saving ? "Saving…" : editingCode ? "Update account" : "Save account"}</button>
        </form>

        <div className="xl:col-span-8 bg-white border border-stone-200 rounded-sm shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-bold text-base">Connected Daraz accounts</h2>
            <span className="text-stone-500">{accounts.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-600 border-b border-stone-200">
                <tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Token</th><th className="px-4 py-3">Sync status</th><th className="px-4 py-3">Last sync</th><th className="px-4 py-3">Token message</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? <tr><td colSpan="6" className="px-4 py-10 text-center text-stone-400">Loading accounts…</td></tr> : accounts.length === 0 ? <tr><td colSpan="6" className="px-4 py-10 text-center text-stone-400">No Daraz accounts found. Add your first account from the left panel.</td></tr> : accounts.map((account) => (
                  <tr key={account.account_code} className="hover:bg-stone-50 align-top">
                    <td className="px-4 py-3"><div className="font-bold text-stone-900">{account.account_name || account.seller_name || account.account_code}</div><div className="font-mono text-[11px] text-cyan-700">{account.account_code}</div><div className="text-[10px] text-stone-500">App key: {account.app_key || "ENV"}</div></td>
                    <td className="px-4 py-3"><TokenStatus status={account.token_status} /></td>
                    <td className="px-4 py-3"><Status status={account.sync_status || "active"} /></td>
                    <td className="px-4 py-3 text-stone-600">{formatDateTime(account.last_product_sync_at || account.last_sync_time)}</td>
                    <td className="px-4 py-3 max-w-xs text-stone-600">{account.token_message || (needsReauth(account.token_status) ? "Reconnect required before sync." : "Ready for automated sync.")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => editAccount(account)} className="px-2 py-1 border border-stone-300 rounded-sm hover:bg-stone-50 font-semibold inline-flex items-center gap-1"><Edit3 size={12} /> Edit</button>
                        {needsReauth(account.token_status) ? <button disabled={workingCode === account.account_code} onClick={() => reconnectAccount(account.account_code)} className="px-2 py-1 border border-amber-300 text-amber-700 rounded-sm hover:bg-amber-50 font-semibold inline-flex items-center gap-1"><Link2 size={12} /> Reconnect</button> : <button disabled={workingCode === account.account_code} onClick={() => refreshToken(account.account_code)} className="px-2 py-1 border border-cyan-300 text-cyan-700 rounded-sm hover:bg-cyan-50 font-semibold inline-flex items-center gap-1"><KeyRound size={12} /> Check token</button>}
                        <button disabled={workingCode === account.account_code} onClick={() => deleteAccount(account.account_code)} className="px-2 py-1 border border-rose-200 text-rose-700 rounded-sm hover:bg-rose-50 font-semibold inline-flex items-center gap-1"><Trash2 size={12} /> Delete</button>
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

function Metric({ label, value, good, warning }) { return <div className="bg-white border border-stone-200 rounded-sm p-4"><div className="text-[11px] uppercase font-bold text-stone-500">{label}</div><div className={`text-3xl font-black mt-1 ${good ? "text-emerald-700" : warning ? "text-amber-700" : "text-stone-900"}`}>{value}</div></div>; }
function Input({ label, value, onChange, placeholder = "", type = "text", required = false, disabled = false }) { return <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide">{label}<input required={required} disabled={disabled} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full border border-stone-300 rounded-sm px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-600 normal-case font-normal disabled:bg-stone-100" /></label>; }
function Select({ label, value, onChange, options }) { return <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide">{label}<select value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-stone-300 rounded-sm px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-600 normal-case font-normal bg-white">{options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>; }
function TokenStatus({ status }) { const s = String(status || "missing").toLowerCase(); const ok = s === "active"; return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] font-bold uppercase ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{ok ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} {status || "missing"}</span>; }
function Status({ status }) { const s = String(status || "active").toLowerCase(); return <span className={`inline-flex px-2 py-1 rounded-sm border text-[10px] font-bold uppercase ${s === "active" ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-stone-50 text-stone-600 border-stone-200"}`}>{status || "active"}</span>; }
function Notice({ notice }) { if (!notice?.text) return null; const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200"; return <div className={`mx-4 mt-4 border rounded-sm px-4 py-3 font-medium ${cls}`}>{notice.text}</div>; }
