import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  AlertCircle,
  X,
  Save,
  Ruler,
  RefreshCw,
} from "lucide-react";

import { usePagePermission } from "../../../components/common/permissions/PermissionsProvider";
import productSizeApi from "../../../config/sub_api/product_management_api/category/product_size_api/product_size_api";

const emptySize = {
  size_code: "",
  name: "",
  slug: "",
  sort_order: "",
  description: "",
};

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

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function TextInput({ label, value, onChange, disabled, placeholder, type = "text" }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 text-[12px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-70"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] text-slate-400">{label}</label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional description"
        rows={3}
        className="w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[12px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-70"
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
          Manage size code and product size details.
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

function ModalFooter({ readOnly, saving, mode, onClose }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="h-7 min-w-[80px] cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {readOnly ? "Close" : "Cancel"}
      </button>

      {!readOnly && (
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-7 min-w-[100px] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-3 text-[11px] font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={12} />
          {saving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
        </button>
      )}
    </div>
  );
}

export default function ProductSizePage() {
  const { canEdit, canDelete } = usePagePermission("sizes");

  const [sizes, setSizes] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sizeModal, setSizeModal] = useState({
    open: false,
    mode: "add",
    id: null,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    row: null,
  });

  const [sizeForm, setSizeForm] = useState(emptySize);

  const readOnly = sizeModal.mode === "view";

  async function loadSizes() {
    try {
      setLoading(true);
      setError("");

      const res = await productSizeApi.getAll({
        page: 1,
        limit: 500,
      });

      setSizes(extractRows(res));
    } catch (err) {
      setError(getApiMessage(err, "Failed to load product sizes"));
      setSizes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSizes();
  }, []);

  const filteredSizes = useMemo(() => {
    const key = search.trim().toLowerCase();

    if (!key) return sizes;

    return sizes.filter((row) =>
      [row.size_code, row.name, row.slug, row.description]
        .join(" ")
        .toLowerCase()
        .includes(key)
    );
  }, [sizes, search]);

  function setMsg(ok = "", bad = "") {
    setSuccess(ok);
    setError(bad);
  }

  function changeSize(field, value) {
    setSizeForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" ? { slug: slugify(value) } : {}),
    }));
  }

  function openSize(mode, row = null) {
    setMsg();

    setSizeModal({
      open: true,
      mode,
      id: row?.id || null,
    });

    setSizeForm(
      row
        ? {
            size_code: row.size_code || "",
            name: row.name || "",
            slug: row.slug || "",
            sort_order: row.sort_order ?? "",
            description: row.description || "",
          }
        : emptySize
    );
  }

  function closeSize() {
    if (saving) return;

    setSizeModal({
      open: false,
      mode: "add",
      id: null,
    });

    setSizeForm(emptySize);
  }

  async function saveSize(e) {
    e.preventDefault();

    if (readOnly) return;

    const payload = {
      size_code: sizeForm.size_code.trim(),
      name: sizeForm.name.trim(),
      slug: sizeForm.slug.trim() || slugify(sizeForm.name),
      sort_order: sizeForm.sort_order === "" ? 0 : Number(sizeForm.sort_order),
      description: sizeForm.description.trim() || null,
    };

    if (!payload.size_code) {
      setError("Please enter size code.");
      return;
    }

    if (!payload.name) {
      setError("Please enter size name.");
      return;
    }

    try {
      setSaving(true);
      setMsg();

      if (sizeModal.mode === "edit") {
        await productSizeApi.update(sizeModal.id, payload);
        setSuccess("Product size updated successfully.");
      } else {
        await productSizeApi.create(payload);
        setSuccess("Product size created successfully.");
      }

      closeSize();
      await loadSizes();
    } catch (err) {
      setError(getApiMessage(err, "Failed to save product size"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteNow() {
    const row = deleteModal.row;

    if (!row) return;

    try {
      setDeleting(true);
      setMsg();

      await productSizeApi.delete(row.id);

      setSizes((prev) => prev.filter((item) => item.id !== row.id));
      setSuccess("Product size deleted successfully.");

      setDeleteModal({
        open: false,
        row: null,
      });
    } catch (err) {
      setError(getApiMessage(err, "Failed to delete product size"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium text-slate-100">
            Product Sizes
          </h1>
          <p className="text-[13px] text-slate-500">
            Manage size code, size name and sort order.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={loadSizes}
            disabled={loading}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openSize("add")}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-2.5 text-[11px] font-semibold text-slate-950"
          >
            <Plus size={12} />
            Add Size
          </button>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-950 p-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search size code, name, slug..."
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
          Loading product sizes...
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  {["NO", "Size Code", "Name", "Slug", "Order", "Description", "Action"].map(
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
                {!filteredSizes.length && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-3 py-5 text-center text-[13px] text-slate-500"
                    >
                      No product sizes found.
                    </td>
                  </tr>
                )}

                {filteredSizes.map((row, index) => (
                  <tr key={row.id} className="bg-slate-950">
                    <td className="px-3 py-2 text-[13px] text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-300">
                      {row.size_code || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-200">
                      {row.name || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">
                      {row.slug || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">
                      {row.sort_order ?? "-"}
                    </td>

                    <td className="max-w-md px-3 py-2 text-[13px] text-slate-400">
                      <span className="line-clamp-1">
                        {row.description || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <ActionLabel
                          title="View Size"
                          color="border-sky-900 bg-sky-950 text-sky-300"
                          onClick={() => openSize("view", row)}
                        >
                          View
                        </ActionLabel>

                        {canEdit && (
                          <ActionLabel
                            title="Edit Size"
                            color="border-orange-900 bg-orange-950 text-orange-300"
                            onClick={() => openSize("edit", row)}
                          >
                            Edit
                          </ActionLabel>
                        )}

                        {canDelete && (
                          <ActionLabel
                            title="Delete Size"
                            color="border-red-900 bg-red-950 text-red-300"
                            onClick={() =>
                              setDeleteModal({
                                open: true,
                                row,
                              })
                            }
                          >
                            Delete
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
            Showing {filteredSizes.length} of {sizes.length} product sizes
          </p>
        </div>
      )}

      {sizeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title={
                sizeModal.mode === "view"
                  ? "View Product Size"
                  : sizeModal.mode === "edit"
                  ? "Edit Product Size"
                  : "Add Product Size"
              }
              onClose={closeSize}
            />

            <form onSubmit={saveSize} className="space-y-3 p-4">
              <div className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300">
                  <Ruler size={18} />
                </span>

                <div>
                  <div className="flex items-center gap-1.5 text-[13px] text-slate-200">
                    Size Preview
                  </div>
                  <p className="text-[12px] text-slate-500">
                    {sizeForm.size_code || "No size code entered"}
                  </p>
                </div>
              </div>

              <TextInput
                label="Size Code"
                value={sizeForm.size_code}
                disabled={readOnly}
                onChange={(value) => changeSize("size_code", value)}
                placeholder="M"
              />

              <TextInput
                label="Size Name"
                value={sizeForm.name}
                disabled={readOnly}
                onChange={(value) => changeSize("name", value)}
                placeholder="Medium"
              />

              <TextInput
                label="Slug"
                value={sizeForm.slug}
                disabled={readOnly}
                onChange={(value) => changeSize("slug", value)}
                placeholder="medium"
              />

              <TextInput
                label="Sort Order"
                type="number"
                value={sizeForm.sort_order}
                disabled={readOnly}
                onChange={(value) => changeSize("sort_order", value)}
                placeholder="0"
              />

              <TextArea
                label="Description"
                value={sizeForm.description}
                disabled={readOnly}
                onChange={(value) => changeSize("description", value)}
              />

              <ModalFooter
                readOnly={readOnly}
                saving={saving}
                mode={sizeModal.mode}
                onClose={closeSize}
              />
            </form>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title="Confirm Delete"
              onClose={() =>
                setDeleteModal({
                  open: false,
                  row: null,
                })
              }
            />

            <div className="space-y-3 p-4">
              <p className="text-[13px] text-slate-300">
                Are you sure you want to delete{" "}
                <span className="text-red-300">
                  {deleteModal.row?.name || "this size"}
                </span>
                ?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal({
                      open: false,
                      row: null,
                    })
                  }
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
