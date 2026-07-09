import React, { useEffect, useState } from "react";
import { AlertCircle, Clock, PlayCircle, Save } from "lucide-react";

import ordersApi from "../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";

const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at"]);

function isDayField(key) {
  return /day/i.test(key);
}

function labelize(key) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function OrderSyncSettingsPage() {
  const showToast = useToast();

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await ordersApi.getSyncSettings();
      const data = res?.data || {};
      setSettings(data);
      setForm(data);
    } catch (err) {
      setError(getApiError(err, "Failed to load sync settings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await ordersApi.updateSyncSettings(form);
      showToast("Sync settings saved.");
      await load();
    } catch (err) {
      alert(getApiError(err, "Failed to save sync settings"));
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);

    try {
      const res = await ordersApi.runSyncNow();
      showToast(res?.message || "Sync triggered.");
    } catch (err) {
      alert(getApiError(err, "Failed to trigger sync"));
    } finally {
      setRunning(false);
    }
  }

  const editableKeys = Object.keys(form || {}).filter((key) => !HIDDEN_FIELDS.has(key));

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <Clock size={13} className="text-orange-400" />
            Daraz Order Sync Settings
          </h3>

          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle size={12} className={running ? "animate-spin" : ""} />
            {running ? "Running..." : "Run Sync Now"}
          </button>
        </div>

        <p className="px-3 py-2.5 text-[11px] text-slate-400">
          Controls how far back (in days) the scheduled Daraz order sync looks when pulling orders. The
          job runs automatically every 30 minutes.
        </p>
      </section>

      <div className="flex items-center gap-1.5 rounded-md border border-amber-900 bg-amber-950 px-3 py-2 text-[11px] text-amber-300">
        <AlertCircle size={13} />
        The Daraz Order API isn't connected yet, so "Run Sync Now" won't pull real orders until that
        integration is wired in — this page already saves and applies the day-range setting for when it
        is.
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="border border-slate-800 bg-slate-950 p-5 text-center text-[12px] text-slate-500">
          Loading settings...
        </div>
      ) : !settings ? (
        <div className="border border-slate-800 bg-slate-950 p-5 text-center text-[12px] text-slate-500">
          No sync settings row found yet. Save once to create it.
        </div>
      ) : (
        <form onSubmit={save} className="border border-slate-800 bg-[#0b1220] p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {editableKeys.map((key) => (
              <label key={key} className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {labelize(key)}
                  {isDayField(key) && <span className="ml-1 text-orange-400">(days)</span>}
                </span>
                <input
                  type={typeof form[key] === "number" || isDayField(key) ? "number" : "text"}
                  value={form[key] ?? ""}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="h-9 w-full border border-slate-700 bg-[#0a101d] px-2.5 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-8 items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={13} /> {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
