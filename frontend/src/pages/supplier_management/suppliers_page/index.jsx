import { useEffect, useState } from "react";
import { Edit3, Plus, Save, Search, ShieldAlert, Trash2, Truck, X } from "lucide-react";

import suppliersApi from "../../../config/sub_api/supplier_management_api/suppliers_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../components/common/confirm_modal/ConfirmProvider";
import { useIsMasterAdmin } from "../../../components/common/permissions/PermissionsProvider";
import Loader from "../../../components/common/Loader";

const PAYMENT_TERMS_OPTIONS = [
  { value: "cod", label: "COD" },
  { value: "net_30", label: "Net 30" },
  { value: "net_60", label: "Net 60" },
  { value: "advance", label: "Advance" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  name: "",
  contact_email: "",
  contact_phone: "",
  business_registration_no: "",
  bank_name: "",
  bank_account_number: "",
  payment_terms: "cod",
  currency: "LKR",
  delivery_lead_time_days: "",
  rating: "",
  status: "active",
  notes: "",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        status === "active"
          ? "border-emerald-900 bg-emerald-950 text-emerald-300"
          : "border-slate-700 bg-slate-800/60 text-slate-400"
      }`}
    >
      {status || "-"}
    </span>
  );
}

export default function SuppliersPage() {
  const showToast = useToast();
  const confirm = useConfirm();
  const isMasterAdmin = useIsMasterAdmin();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await suppliersApi.list({ search, status });
      setRows(res?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load suppliers"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isMasterAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMasterAdmin, status]);

  if (!isMasterAdmin) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert size={32} className="text-slate-600" />
        <p className="text-[14px] font-semibold text-slate-300">Master admin access required</p>
        <p className="max-w-sm text-[12px] text-slate-500">
          Supplier data is restricted to master admin accounts only.
        </p>
      </div>
    );
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || "",
      contact_email: row.contact_email || "",
      contact_phone: row.contact_phone || "",
      business_registration_no: row.business_registration_no || "",
      bank_name: row.bank_name || "",
      bank_account_number: row.bank_account_number || "",
      payment_terms: row.payment_terms || "cod",
      currency: row.currency || "LKR",
      delivery_lead_time_days: row.delivery_lead_time_days ?? "",
      rating: row.rating ?? "",
      status: row.status || "active",
      notes: row.notes || "",
    });
    setModalOpen(true);
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast("Supplier name is required.", { type: "error" });
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await suppliersApi.update(editing.id, form);
        showToast("Supplier updated.", { type: "success" });
      } else {
        await suppliersApi.create(form);
        showToast("Supplier created.", { type: "success" });
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to save supplier"), { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!(await confirm(`Delete supplier "${row.name}"? This can't be undone.`))) return;

    try {
      await suppliersApi.remove(row.id);
      showToast("Supplier deleted.", { type: "success" });
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to delete supplier"), { type: "error" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Truck size={20} />
            Suppliers
          </h1>
          <p className="text-[13px] text-slate-500">
            Master data for purchasing. Purchase orders, receiving, and cost history build on this next.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400"
        >
          <Plus size={12} /> Add Supplier
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-55 max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            onBlur={load}
            placeholder="Search name, email, phone, registration no..."
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>}

      {loading ? (
        <Loader label="Loading suppliers..." minHeight="200px" />
      ) : !rows.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          No suppliers yet. Click Add Supplier to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Registration No</th>
                <th className="px-3 py-2 font-medium">Bank Account</th>
                <th className="px-3 py-2 font-medium">Payment Terms</th>
                <th className="px-3 py-2 font-medium">Lead Time</th>
                <th className="px-3 py-2 font-medium">Rating</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-[#0b1220] align-top">
                  <td className="px-3 py-2 font-semibold text-slate-100">{row.name}</td>
                  <td className="px-3 py-2 text-slate-300">
                    <p>{row.contact_email || "-"}</p>
                    <p className="text-slate-500">{row.contact_phone || "-"}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{row.business_registration_no || "-"}</td>
                  <td className="px-3 py-2 text-slate-300">
                    <p>{row.bank_name || "-"}</p>
                    <p className="font-mono text-[11px] text-slate-500">{row.bank_account_number || "-"}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {PAYMENT_TERMS_OPTIONS.find((o) => o.value === row.payment_terms)?.label || row.payment_terms}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.delivery_lead_time_days !== null && row.delivery_lead_time_days !== undefined
                      ? `${row.delivery_lead_time_days} day(s)`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.rating ?? "-"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-900 bg-amber-950 text-amber-300 hover:bg-amber-900"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] shadow-2xl"
          >
            <div className="flex items-center justify-between rounded-t-2xl border-b border-white/10 bg-[#653bb3] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-white">{editing ? "Edit Supplier" : "Add Supplier"}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase text-slate-500">
                  Supplier Name <span className="text-orange-400">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Contact Email</span>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Contact Phone</span>
                <input
                  value={form.contact_phone}
                  onChange={(e) => setField("contact_phone", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Business Registration No</span>
                <input
                  value={form.business_registration_no}
                  onChange={(e) => setField("business_registration_no", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Bank Name</span>
                <input
                  value={form.bank_name}
                  onChange={(e) => setField("bank_name", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Bank Account Number</span>
                <input
                  value={form.bank_account_number}
                  onChange={(e) => setField("bank_account_number", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Payment Terms</span>
                <select
                  value={form.payment_terms}
                  onChange={(e) => setField("payment_terms", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  {PAYMENT_TERMS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Currency</span>
                <input
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Delivery Lead Time (days)</span>
                <input
                  type="number"
                  min="0"
                  value={form.delivery_lead_time_days}
                  onChange={(e) => setField("delivery_lead_time_days", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Rating (0-5)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(e) => setField("rating", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Notes</span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-[#070b16] px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-orange-400"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={13} /> {saving ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
