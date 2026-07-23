import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  AlertCircle,
  X,
  Save,
  Eye,
  Edit,
  Trash2,
  Palette,
  RefreshCw,
} from "lucide-react";

import { usePagePermission } from "../../../components/common/permissions/PermissionsProvider";
import productColourApi from "../../../config/sub_api/product_management_api/category/product_colour_api/product_colour_api";

const emptyColour = {
  colour_code: "",
  name: "",
  slug: "",
  hex_code: "",
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

function normalizeHex(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";

  const clean = text.startsWith("#") ? text : `#${text}`;
  return clean.toUpperCase();
}

function isValidHex(value = "") {
  if (!value) return true;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
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

function TextInput({ label, value, onChange, disabled, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] text-slate-400">{label}</label>
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
    <div className="flex items-center justify-between rounded-t-2xl border-b border-white/10 bg-[#653bb3] px-4 py-3">
      <div>
        <h3 className="text-[15px] font-normal text-white">{title}</h3>
        <p className="text-[12px] text-purple-200/80">
          Manage colour code and product colour details.
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

function ColourPreview({ hexCode }) {
  const validHex = normalizeHex(hexCode);
  const canUseColour = isValidHex(validHex) && validHex;

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex h-5 w-5 rounded border border-slate-700"
        style={{ backgroundColor: canUseColour ? validHex : "transparent" }}
      />
      <span className="text-[13px] text-slate-400">{validHex || "-"}</span>
    </div>
  );
}

export default function ProductColourPage() {
  const { canEdit, canDelete } = usePagePermission("colours");

  const [colours, setColours] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [colourModal, setColourModal] = useState({
    open: false,
    mode: "add",
    id: null,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    row: null,
  });

  const [colourForm, setColourForm] = useState(emptyColour);

  const readOnly = colourModal.mode === "view";

  async function loadColours() {
    try {
      setLoading(true);
      setError("");

      const res = await productColourApi.getAll({
        page: 1,
        limit: 500,
      });

      setColours(extractRows(res));
    } catch (err) {
      setError(getApiMessage(err, "Failed to load product colours"));
      setColours([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadColours();
  }, []);

  const filteredColours = useMemo(() => {
    const key = search.trim().toLowerCase();

    if (!key) return colours;

    return colours.filter((row) =>
      [row.colour_code, row.name, row.slug, row.hex_code, row.description]
        .join(" ")
        .toLowerCase()
        .includes(key)
    );
  }, [colours, search]);

  function setMsg(ok = "", bad = "") {
    setSuccess(ok);
    setError(bad);
  }

  function changeColour(field, value) {
    setColourForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" ? { slug: slugify(value) } : {}),
    }));
  }

  function openColour(mode, row = null) {
    setMsg();

    setColourModal({
      open: true,
      mode,
      id: row?.id || null,
    });

    setColourForm(
      row
        ? {
            colour_code: row.colour_code || "",
            name: row.name || "",
            slug: row.slug || "",
            hex_code: row.hex_code || "",
            description: row.description || "",
          }
        : emptyColour
    );
  }

  function closeColour() {
    if (saving) return;

    setColourModal({
      open: false,
      mode: "add",
      id: null,
    });

    setColourForm(emptyColour);
  }

  async function saveColour(e) {
    e.preventDefault();

    if (readOnly) return;

    const hexCode = normalizeHex(colourForm.hex_code);

    const payload = {
      colour_code: colourForm.colour_code.trim(),
      name: colourForm.name.trim(),
      slug: colourForm.slug.trim() || slugify(colourForm.name),
      hex_code: hexCode || null,
      description: colourForm.description.trim() || null,
    };

    if (!payload.colour_code) {
      setError("Please enter colour code.");
      return;
    }

    if (!payload.name) {
      setError("Please enter colour name.");
      return;
    }

    if (payload.hex_code && !isValidHex(payload.hex_code)) {
      setError("Please enter valid hex code. Example: #000000");
      return;
    }

    try {
      setSaving(true);
      setMsg();

      if (colourModal.mode === "edit") {
        await productColourApi.update(colourModal.id, payload);
        setSuccess("Product colour updated successfully.");
      } else {
        await productColourApi.create(payload);
        setSuccess("Product colour created successfully.");
      }

      closeColour();
      await loadColours();
    } catch (err) {
      setError(getApiMessage(err, "Failed to save product colour"));
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

      await productColourApi.delete(row.id);

      setColours((prev) => prev.filter((item) => item.id !== row.id));
      setSuccess("Product colour deleted successfully.");

      setDeleteModal({
        open: false,
        row: null,
      });
    } catch (err) {
      setError(getApiMessage(err, "Failed to delete product colour"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium text-slate-100">
            Product Colours
          </h1>
          <p className="text-[13px] text-slate-500">
            Manage colour code, colour name and hex preview.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={loadColours}
            disabled={loading}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openColour("add")}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-2.5 text-[11px] font-semibold text-slate-950"
          >
            <Plus size={12} />
            Add Colour
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
            placeholder="Search colour code, name, slug, hex..."
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
          Loading product colours...
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  {["NO", "Preview", "Colour Code", "Name", "Slug", "Hex", "Description", "Action"].map(
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
                {!filteredColours.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-3 py-5 text-center text-[13px] text-slate-500"
                    >
                      No product colours found.
                    </td>
                  </tr>
                )}

                {filteredColours.map((row, index) => (
                  <tr key={row.id} className="bg-slate-950">
                    <td className="px-3 py-2 text-[13px] text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-3 py-2">
                      <ColourPreview hexCode={row.hex_code} />
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-300">
                      {row.colour_code || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-200">
                      {row.name || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">
                      {row.slug || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">
                      {row.hex_code || "-"}
                    </td>

                    <td className="max-w-md px-3 py-2 text-[13px] text-slate-400">
                      <span className="line-clamp-1">
                        {row.description || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <ActionLabel
                          title="View Colour"
                          color="border-sky-900 bg-sky-950 text-sky-300"
                          onClick={() => openColour("view", row)}
                        >
                          View
                        </ActionLabel>

                        {canEdit && (
                          <ActionLabel
                            title="Edit Colour"
                            color="border-orange-900 bg-orange-950 text-orange-300"
                            onClick={() => openColour("edit", row)}
                          >
                            Edit
                          </ActionLabel>
                        )}

                        {canDelete && (
                          <ActionLabel
                            title="Delete Colour"
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
            Showing {filteredColours.length} of {colours.length} product colours
          </p>
        </div>
      )}

      {colourModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title={
                colourModal.mode === "view"
                  ? "View Product Colour"
                  : colourModal.mode === "edit"
                  ? "Edit Product Colour"
                  : "Add Product Colour"
              }
              onClose={closeColour}
            />

            <form onSubmit={saveColour} className="space-y-3 p-4">
              <div className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <span
                  className="inline-flex h-10 w-10 rounded-md border border-slate-700"
                  style={{
                    backgroundColor:
                      isValidHex(normalizeHex(colourForm.hex_code)) &&
                      normalizeHex(colourForm.hex_code)
                        ? normalizeHex(colourForm.hex_code)
                        : "transparent",
                  }}
                />

                <div>
                  <div className="flex items-center gap-1.5 text-[13px] text-slate-200">
                    <Palette size={14} />
                    Colour Preview
                  </div>
                  <p className="text-[12px] text-slate-500">
                    {normalizeHex(colourForm.hex_code) || "No hex code selected"}
                  </p>
                </div>
              </div>

              <TextInput
                label="Colour Code"
                value={colourForm.colour_code}
                disabled={readOnly}
                onChange={(value) => changeColour("colour_code", value)}
                placeholder="CLR-BLK"
              />

              <TextInput
                label="Colour Name"
                value={colourForm.name}
                disabled={readOnly}
                onChange={(value) => changeColour("name", value)}
                placeholder="Black"
              />

              <TextInput
                label="Slug"
                value={colourForm.slug}
                disabled={readOnly}
                onChange={(value) => changeColour("slug", value)}
                placeholder="black"
              />

              <div>
                <label className="mb-1 block text-[12px] text-slate-400">
                  Hex Code
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_44px]">
                  <input
                    type="text"
                    value={colourForm.hex_code}
                    disabled={readOnly}
                    onChange={(e) => changeColour("hex_code", e.target.value)}
                    onBlur={(e) =>
                      changeColour("hex_code", normalizeHex(e.target.value))
                    }
                    placeholder="#000000"
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2.5 text-[12px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-70"
                  />

                  <input
                    type="color"
                    value={
                      isValidHex(normalizeHex(colourForm.hex_code)) &&
                      normalizeHex(colourForm.hex_code)
                        ? normalizeHex(colourForm.hex_code)
                        : "#000000"
                    }
                    disabled={readOnly}
                    onChange={(e) => changeColour("hex_code", e.target.value)}
                    className="h-8 w-full cursor-pointer rounded-md border border-slate-800 bg-slate-900 p-1 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </div>

              <TextArea
                label="Description"
                value={colourForm.description}
                disabled={readOnly}
                onChange={(value) => changeColour("description", value)}
              />

              <ModalFooter
                readOnly={readOnly}
                saving={saving}
                mode={colourModal.mode}
                onClose={closeColour}
              />
            </form>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
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
                  {deleteModal.row?.name || "this colour"}
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
