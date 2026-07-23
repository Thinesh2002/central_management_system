import React, { useEffect, useState } from "react";
import { AlertCircle, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";

import messageTemplatesApi from "../../../config/sub_api/order_management_api/message_templates_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../components/common/confirm_modal/ConfirmProvider";

const TRIGGER_OPTIONS = [
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "order_packed", label: "Order Packed" },
  { value: "order_shipped", label: "Order Shipped" },
  { value: "order_delivered", label: "Order Delivered" },
  { value: "custom", label: "Custom" },
];

const PLACEHOLDERS = [
  "customer_name",
  "order_no",
  "total",
  "currency",
  "tracking_number",
  "waybill_id",
  "status",
  "account_name",
];

function triggerLabel(value) {
  return TRIGGER_OPTIONS.find((option) => option.value === value)?.label || value;
}

const emptyForm = { name: "", trigger_key: "order_confirmation", content: "", is_active: true };

function TemplateModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial || emptyForm);
      setError("");
    }
  }, [open, initial]);

  if (!open) return null;

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function insertPlaceholder(token) {
    set("content", `${form.content || ""}{{${token}}}`);
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.content.trim()) {
      setError("Name and content are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave(form);
    } catch (err) {
      setError(getApiError(err, "Failed to save template"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <h3 className="text-[13px] font-semibold text-white">
            {form.id ? "Edit Template" : "New Template"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 p-4">
          {error && (
            <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Name
            </span>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Order Confirmation"
              className="h-9 w-full border border-slate-700 bg-[#070b16] px-2.5 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Trigger
            </span>
            <select
              value={form.trigger_key}
              onChange={(e) => set("trigger_key", e.target.value)}
              className="h-9 w-full border border-slate-700 bg-[#070b16] px-2.5 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
            >
              {TRIGGER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Message content
            </span>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={5}
              placeholder="Hi {{customer_name}}, thanks for your order {{order_no}}!"
              className="w-full border border-slate-700 bg-[#070b16] px-2.5 py-2 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
            />
          </label>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Insert placeholder
            </p>
            <div className="flex flex-wrap gap-1">
              {PLACEHOLDERS.map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertPlaceholder(token)}
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 hover:bg-slate-700 hover:text-orange-300"
                >
                  {`{{${token}}}`}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500"
            />
            <span className="text-[11px] font-semibold text-slate-300">Active</span>
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-8 border border-slate-700 px-3 text-[12px] font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-8 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MessageTemplatesPage() {
  const showToast = useToast();
  const confirm = useConfirm();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await messageTemplatesApi.list();
      setTemplates(res?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load message templates"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(template) {
    setEditing(template);
    setModalOpen(true);
  }

  async function saveTemplate(form) {
    if (form.id) {
      await messageTemplatesApi.update(form.id, form);
      showToast("Template updated.");
    } else {
      await messageTemplatesApi.create(form);
      showToast("Template created.");
    }

    setModalOpen(false);
    await load();
  }

  async function deleteTemplate(template) {
    if (!(await confirm(`Delete template "${template.name}"? This can't be undone.`))) return;

    try {
      await messageTemplatesApi.remove(template.id);
      showToast("Template deleted.");
      await load();
    } catch (err) {
      alert(getApiError(err, "Failed to delete template"));
    }
  }

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-2 border border-slate-700 bg-[#1b2a3a] px-3 py-2 shadow-lg shadow-black/20">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
          <MessageSquare size={13} className="text-orange-400" />
          Customer Message Templates
        </h3>

        <button
          type="button"
          onClick={openCreate}
          className="flex h-8 items-center gap-1.5 rounded-full bg-orange-500 px-3.5 text-[12px] font-semibold text-white hover:bg-orange-400"
        >
          <Plus size={13} />
          New Template
        </button>
      </section>

      <p className="text-[11px] text-slate-500">
        These templates are used to send Daraz Instant Messages to buyers from the Order Detail page —
        placeholders like <span className="font-mono text-slate-400">{"{{customer_name}}"}</span> are
        filled in with that order's real data before sending.
      </p>

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="border border-slate-800 bg-slate-950 p-5 text-center text-[12px] text-slate-500">
          Loading templates...
        </div>
      ) : (
        <section className="border border-slate-800 bg-[#0b1220]">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="border-b border-slate-800 bg-[#111827]">
              <tr>
                {["Name", "Trigger", "Content", "Active", "Actions"].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {!templates.length && (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-[12px] text-slate-500">
                    No message templates yet — create one to get started.
                  </td>
                </tr>
              )}

              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-[#111827]">
                  <td className="px-3 py-2.5 align-top text-[12px] font-semibold text-slate-200">
                    {template.name}
                  </td>
                  <td className="px-3 py-2.5 align-top text-[11px] text-slate-400">
                    {triggerLabel(template.trigger_key)}
                  </td>
                  <td className="max-w-md truncate px-3 py-2.5 align-top text-[11px] text-slate-500">
                    {template.content}
                  </td>
                  <td className="px-3 py-2.5 align-top text-[11px]">
                    <span className={template.is_active ? "text-emerald-400" : "text-slate-500"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(template)}
                        title="Edit"
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(template)}
                        title="Delete"
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-950 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <TemplateModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={saveTemplate}
      />
    </div>
  );
}
