import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  ImagePlus,
  Lock,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import Loader from "../../../components/common/Loader";
import {
  dedupeImageLibraryRows,
  resolveImageUrl,
} from "../products/product_dashboard/utils/localProductsImageHelpers";

function unwrapList(response) {
  const data = response?.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function ImageCard({ image, onSaveAltText, onRename, onDelete, busy }) {
  const [altText, setAltText] = useState(image.alt_text || "");
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(
    (image.file_name || "").replace(/\.[^.]+$/, "")
  );
  const [copied, setCopied] = useState(false);

  const previewUrl = resolveImageUrl(image.image_url || image.image_path);
  const isAssigned = Boolean(image.is_assigned);

  useEffect(() => {
    setAltText(image.alt_text || "");
  }, [image.alt_text]);

  function copyUrl() {
    navigator.clipboard?.writeText(previewUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function submitRename() {
    if (!newName.trim()) return;
    onRename(image, newName.trim()).then((ok) => {
      if (ok) setRenaming(false);
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-950">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={image.alt_text || image.file_name || "Product image"}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlus size={28} className="text-slate-700" />
        )}

        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isAssigned
              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
              : "bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50"
          }`}
        >
          {isAssigned ? <Lock size={10} /> : null}
          {isAssigned ? "Assigned" : "Unassigned"}
        </span>

        {image._attachment_count > 1 ? (
          <span
            className="absolute right-2 top-2 inline-flex items-center rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-slate-700"
            title={`Attached in ${image._attachment_count} places`}
          >
            ×{image._attachment_count}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 text-xs">
        {renaming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              className="h-7 flex-1 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-100 outline-none focus:border-yellow-500"
            />
            <button
              type="button"
              onClick={submitRename}
              disabled={busy}
              className="rounded border border-emerald-600/40 bg-emerald-600/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="rounded border border-slate-700 p-1 text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <p className="truncate font-medium text-slate-200" title={image.file_name}>
            {image.file_name || "-"}
          </p>
        )}

        <div className="flex items-center gap-1">
          <input
            readOnly
            value={previewUrl}
            className="h-7 flex-1 truncate rounded border border-slate-800 bg-slate-950 px-2 text-[10px] text-slate-500"
          />
          <button
            type="button"
            onClick={copyUrl}
            title="Copy image URL"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 text-slate-400 hover:border-yellow-500 hover:text-yellow-300"
          >
            {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          </button>
        </div>

        <input
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          onBlur={() => {
            if ((altText || "") !== (image.alt_text || "")) {
              onSaveAltText(image, altText);
            }
          }}
          placeholder="Alt text..."
          className="h-7 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-yellow-500"
        />

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isAssigned || busy}
            onClick={() => setRenaming(true)}
            title={isAssigned ? "Assigned images can't be renamed" : "Rename"}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-700 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-yellow-500 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil size={12} />
            Rename
          </button>

          <button
            type="button"
            disabled={isAssigned || busy}
            onClick={() => onDelete(image)}
            title={isAssigned ? "Assigned images can't be deleted" : "Delete"}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-700 py-1.5 text-[11px] font-semibold text-red-400 hover:border-red-500/60 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImagesDashboardPage() {
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadImages() {
    setLoading(true);
    setError("");

    try {
      const res = await localProductsApi.getImages({ limit: 1000 });
      setImages(dedupeImageLibraryRows(unwrapList(res)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load images."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
  }, []);

  const filteredImages = useMemo(() => {
    const q = search.trim().toLowerCase();

    return images.filter((image) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "assigned" && image.is_assigned) ||
        (filter === "unassigned" && !image.is_assigned);

      if (!matchesFilter) return false;
      if (!q) return true;

      const haystack = `${image.file_name || ""} ${image.alt_text || ""} ${
        image.sku || ""
      }`.toLowerCase();

      return haystack.includes(q);
    });
  }, [images, search, filter]);

  async function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      await localProductsApi.uploadImage(formData);
      setSuccess("Image uploaded.");
      await loadImages();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveAltText(image, altText) {
    setBusyId(String(image.id));
    setError("");

    try {
      await localProductsApi.patchImage(image.id, { alt_text: altText });
      setImages((prev) =>
        prev.map((row) =>
          row.id === image.id ? { ...row, alt_text: altText } : row
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save alt text."));
    } finally {
      setBusyId("");
    }
  }

  async function handleRename(image, fileName) {
    setBusyId(String(image.id));
    setError("");
    setSuccess("");

    try {
      const res = await localProductsApi.renameImage(image.id, fileName);
      const updated = res?.data?.data;

      setImages((prev) =>
        prev.map((row) => (row.id === image.id ? { ...row, ...updated } : row))
      );
      setSuccess("Image renamed.");
      return true;
    } catch (err) {
      setError(getErrorMessage(err, "Failed to rename image."));
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(image) {
    if (!window.confirm(`Delete "${image.file_name}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(String(image.id));
    setError("");
    setSuccess("");

    try {
      await localProductsApi.deleteImage(image.id);
      setImages((prev) => prev.filter((row) => row.id !== image.id));
      setSuccess("Image deleted.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete image."));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="min-h-full bg-slate-950 p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Images Dashboard</h1>
            <p className="mt-1 text-xs text-slate-400">
              All uploaded product images in one place. Assigned images (in use
              by a product, or mirrored to Daraz / WooCommerce) are protected
              from rename and delete.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadImages}
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:border-yellow-500 hover:text-yellow-300 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex h-9 items-center gap-2 rounded-lg bg-yellow-500 px-3 text-xs font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
            >
              <ImagePlus size={14} />
              {uploading ? "Uploading..." : "Add Image"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              hidden
              onChange={handleFileSelected}
            />
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <CheckCircle size={14} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name, alt text, or SKU..."
              className="h-8 w-64 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-yellow-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {["all", "assigned", "unassigned"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${
                  filter === key
                    ? "bg-yellow-500 text-slate-950"
                    : "border border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {key}
              </button>
            ))}

            <span className="ml-2 text-[11px] text-slate-500">
              {filteredImages.length} of {images.length}
            </span>
          </div>
        </div>

        {loading ? (
          <Loader label="Loading images..." minHeight="240px" />
        ) : filteredImages.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-slate-500">
            <ImagePlus size={28} />
            <span className="text-sm font-semibold">No images found.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                busy={busyId === String(image.id)}
                onSaveAltText={handleSaveAltText}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
