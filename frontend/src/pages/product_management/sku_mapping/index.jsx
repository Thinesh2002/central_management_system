import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  AlertCircle,
  X,
  Save,
  Edit,
  Trash2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";

import { usePagePermission } from "../../../components/common/permissions/PermissionsProvider";
import skuMappingApi from "../../../config/sub_api/product_management_api/sku_mapping_api";

const emptyMapping = {
  wrong_sku: "",
  correct_sku: "",
  platform: "DARAZ",
  notes: "",
};

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://backend.teckvora.com/api"
).replace(/\/$/, "");
const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

function resolveImageUrl(value) {
  if (!value) return "";
  const url = String(value).trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;
  return `${BACKEND_BASE_URL}/${url}`;
}

function SkuThumb({ src }) {
  if (!src) {
    return <div className="h-9 w-9 shrink-0 rounded-md border border-slate-800 bg-slate-900" />;
  }

  return (
    <img
      src={resolveImageUrl(src)}
      alt=""
      className="h-9 w-9 shrink-0 rounded-md border border-slate-800 object-cover"
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function getApiMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

function extractRows(res) {
  const payload = res?.data || res;

  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;

  return [];
}

function ActionLabel({ title, color, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded border px-1.5 py-0.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
    >
      {children}
    </button>
  );
}

function TextInput({ label, value, onChange, disabled, placeholder, required }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] text-slate-400">
        {label} {required && <span className="text-orange-300">*</span>}
      </label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 text-[12px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-70"
      />
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between rounded-t-lg border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
      <div>
        <h3 className="text-[15px] font-normal text-white">{title}</h3>
        <p className="text-[12px] text-purple-200/80">
          Map a wrong marketplace SKU to the correct local SKU.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function SkuMappingPage() {
  const { canEdit, canDelete } = usePagePermission("sku_mapping");

  const [mappings, setMappings] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] = useState({ open: false, mode: "add", id: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, row: null });
  const [form, setForm] = useState(emptyMapping);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsScanned, setSuggestionsScanned] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [acceptingSku, setAcceptingSku] = useState(null);

  async function loadMappings() {
    try {
      setLoading(true);
      setError("");

      const res = await skuMappingApi.getAll({ page: 1, limit: 500, search });
      setMappings(extractRows(res));
    } catch (err) {
      setError(getApiMessage(err, "Failed to load SKU mappings"));
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMappings = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return mappings;

    return mappings.filter((row) =>
      [row.wrong_sku, row.correct_sku, row.platform, row.notes]
        .join(" ")
        .toLowerCase()
        .includes(key)
    );
  }, [mappings, search]);

  function setMsg(ok = "", bad = "") {
    setSuccess(ok);
    setError(bad);
  }

  function changeForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openModal(mode, row = null) {
    setMsg();
    setModal({ open: true, mode, id: row?.id || null });
    setForm(
      row
        ? {
            wrong_sku: row.wrong_sku || "",
            correct_sku: row.correct_sku || "",
            platform: row.platform || "DARAZ",
            notes: row.notes || "",
          }
        : emptyMapping
    );
  }

  function closeModal() {
    if (saving) return;
    setModal({ open: false, mode: "add", id: null });
    setForm(emptyMapping);
  }

  async function saveMapping(e) {
    e.preventDefault();

    const payload = {
      wrong_sku: form.wrong_sku.trim(),
      correct_sku: form.correct_sku.trim(),
      platform: form.platform.trim() || "DARAZ",
      notes: form.notes.trim() || null,
    };

    if (!payload.wrong_sku) return setError("Please enter the wrong SKU.");
    if (!payload.correct_sku) return setError("Please enter the correct SKU.");

    if (payload.wrong_sku === payload.correct_sku) {
      return setError("Wrong SKU and correct SKU cannot be the same.");
    }

    try {
      setSaving(true);
      setMsg();

      if (modal.mode === "edit") {
        await skuMappingApi.update(modal.id, payload);
        setSuccess("SKU mapping updated successfully.");
      } else {
        await skuMappingApi.create(payload);
        setSuccess("SKU mapping created successfully.");
      }

      closeModal();
      await loadMappings();
    } catch (err) {
      setError(getApiMessage(err, "Failed to save SKU mapping"));
    } finally {
      setSaving(false);
    }
  }

  async function loadSuggestions() {
    try {
      setLoadingSuggestions(true);
      setMsg();

      const res = await skuMappingApi.getSuggestions({ limit: 50 });
      setSuggestions(extractRows(res));
      setSuggestionsScanned(true);
    } catch (err) {
      setError(getApiMessage(err, "Failed to load SKU mapping suggestions"));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function acceptSuggestion(suggestion) {
    try {
      setAcceptingSku(suggestion.wrong_sku);
      setMsg();

      await skuMappingApi.create({
        wrong_sku: suggestion.wrong_sku,
        correct_sku: suggestion.suggested_correct_sku,
        platform: "DARAZ",
        notes: `Auto-suggested (${Math.round(suggestion.confidence * 100)}% match, ${suggestion.occurrences} order(s))`,
      });

      setSuggestions((prev) => prev.filter((row) => row.wrong_sku !== suggestion.wrong_sku));
      setSuccess(`Mapped ${suggestion.wrong_sku} → ${suggestion.suggested_correct_sku}.`);
      await loadMappings();
    } catch (err) {
      setError(getApiMessage(err, "Failed to accept suggestion"));
    } finally {
      setAcceptingSku(null);
    }
  }

  function dismissSuggestion(wrongSku) {
    setSuggestions((prev) => prev.filter((row) => row.wrong_sku !== wrongSku));
  }

  async function confirmDeleteNow() {
    const row = deleteModal.row;
    if (!row) return;

    try {
      setDeleting(true);
      setMsg();

      await skuMappingApi.delete(row.id);

      setMappings((prev) => prev.filter((item) => item.id !== row.id));
      setSuccess("SKU mapping deleted successfully.");
      setDeleteModal({ open: false, row: null });
    } catch (err) {
      setError(getApiMessage(err, "Failed to delete SKU mapping"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium text-slate-100">SKU Mapping</h1>
          <p className="text-[13px] text-slate-500">
            Map a wrong SKU seen on a marketplace (e.g. a typo'd Daraz seller SKU) to the
            correct local SKU.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={loadMappings}
            disabled={loading}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} />
            Refresh
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={loadSuggestions}
              disabled={loadingSuggestions}
              className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-orange-700 bg-orange-500 px-2.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles size={12} />
              {loadingSuggestions ? "Scanning..." : "Scan for Suggestions"}
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => openModal("add")}
              className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-2.5 text-[11px] font-semibold text-slate-950"
            >
              <Plus size={12} />
              Add Mapping
            </button>
          )}
        </div>
      </div>

      {suggestionsScanned && (
        <div className="rounded-lg border border-orange-900/40 bg-orange-950/10">
          <div className="flex items-center justify-between border-b border-orange-900/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-orange-300">
              <Sparkles size={13} />
              Suggested Mappings ({suggestions.length})
            </div>
            <button
              type="button"
              onClick={() => setSuggestionsScanned(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-300"
            >
              Hide
            </button>
          </div>

          {!suggestions.length ? (
            <p className="px-3 py-4 text-center text-[13px] text-slate-500">
              No unresolved SKUs found in the last 180 days of orders — nothing to suggest.
            </p>
          ) : (
            <div className="divide-y divide-orange-900/20">
              {suggestions.map((row) => (
                <div key={row.wrong_sku} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SkuThumb src={row.wrong_sku_image} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-mono text-red-300">{row.wrong_sku}</span>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-slate-500" title={row.order_product_title}>
                        {row.order_product_title}
                      </p>
                    </div>

                    <ArrowRight size={13} className="shrink-0 text-slate-600" />

                    <SkuThumb src={row.correct_sku_image} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-mono text-emerald-300">{row.suggested_correct_sku}</span>
                        <span className="text-[11px] text-slate-500">
                          {Math.round(row.confidence * 100)}% match · {row.occurrences} order(s)
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-slate-500" title={row.matched_product_name}>
                        {row.matched_product_name}
                      </p>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => acceptSuggestion(row)}
                        disabled={acceptingSku === row.wrong_sku}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-900 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 disabled:opacity-50"
                      >
                        <Check size={12} />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissSuggestion(row.wrong_sku)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-300"
                      >
                        <X size={12} />
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border border-slate-800 bg-slate-950 p-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wrong SKU, correct SKU, platform, notes..."
            className="h-8 w-full border border-slate-800 bg-slate-900 pl-8 pr-3 text-[12px] text-slate-300 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {success && (
        <div className="rounded-md border border-emerald-900 bg-emerald-950 px-3 py-2 text-[13px] text-emerald-300">
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-center text-[13px] text-slate-500">
          Loading SKU mappings...
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  {["NO", "Wrong SKU", "", "Correct SKU", "Platform", "Notes", "Action"].map(
                    (header) => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-xs font-normal uppercase tracking-wide text-slate-500 ${
                          header === "Action" ? "text-right" : "text-left"
                        }`}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!filteredMappings.length && (
                  <tr>
                    <td colSpan="7" className="px-3 py-5 text-center text-[13px] text-slate-500">
                      No SKU mappings found.
                    </td>
                  </tr>
                )}

                {filteredMappings.map((row, index) => (
                  <tr key={row.id} className="bg-slate-950">
                    <td className="px-3 py-2 text-[13px] text-slate-500">{index + 1}</td>

                    <td className="px-3 py-2 font-mono text-[13px] text-red-300">
                      {row.wrong_sku}
                    </td>

                    <td className="px-2 py-2 text-slate-600">
                      <ArrowRight size={14} />
                    </td>

                    <td className="px-3 py-2 font-mono text-[13px] text-emerald-300">
                      {row.correct_sku}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">{row.platform || "-"}</td>

                    <td className="max-w-md px-3 py-2 text-[13px] text-slate-400">
                      <span className="line-clamp-1">{row.notes || "-"}</span>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {canEdit && (
                          <ActionLabel
                            title="Edit Mapping"
                            color="border-orange-900 bg-orange-950 text-orange-300"
                            onClick={() => openModal("edit", row)}
                          >
                            <Edit size={12} />
                          </ActionLabel>
                        )}

                        {canDelete && (
                          <ActionLabel
                            title="Delete Mapping"
                            color="border-red-900 bg-red-950 text-red-300"
                            onClick={() => setDeleteModal({ open: true, row })}
                          >
                            <Trash2 size={12} />
                          </ActionLabel>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <div className="flex justify-between text-[13px] text-slate-500">
          <p>
            Showing {filteredMappings.length} of {mappings.length} SKU mappings
          </p>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title={modal.mode === "edit" ? "Edit SKU Mapping" : "Add SKU Mapping"}
              onClose={closeModal}
            />

            <form onSubmit={saveMapping} className="space-y-3 p-4">
              <TextInput
                label="Wrong SKU"
                required
                value={form.wrong_sku}
                onChange={(value) => changeForm("wrong_sku", value)}
                placeholder="The incorrect SKU as it appears on the marketplace"
              />

              <TextInput
                label="Correct SKU"
                required
                value={form.correct_sku}
                onChange={(value) => changeForm("correct_sku", value)}
                placeholder="The real local product SKU"
              />

              <TextInput
                label="Platform"
                value={form.platform}
                onChange={(value) => changeForm("platform", value)}
                placeholder="DARAZ"
              />

              <div>
                <label className="mb-1 block text-[12px] text-slate-400">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => changeForm("notes", e.target.value)}
                  placeholder="Optional context on why this SKU was wrong"
                  rows={3}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[12px] text-slate-300 outline-none placeholder:text-slate-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-7 min-w-[80px] cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-7 min-w-[100px] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-3 text-[11px] font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={12} />
                  {saving ? "Saving..." : modal.mode === "edit" ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title="Confirm Delete"
              onClose={() => setDeleteModal({ open: false, row: null })}
            />

            <div className="space-y-3 p-4">
              <p className="text-[13px] text-slate-300">
                Delete mapping{" "}
                <span className="font-mono text-red-300">{deleteModal.row?.wrong_sku}</span>{" "}
                →{" "}
                <span className="font-mono text-emerald-300">
                  {deleteModal.row?.correct_sku}
                </span>
                ?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, row: null })}
                  disabled={deleting}
                  className="h-7 min-w-[80px] cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteNow}
                  disabled={deleting}
                  className="h-7 min-w-[90px] cursor-pointer rounded-md border border-red-900 bg-red-950 px-3 text-[11px] font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
