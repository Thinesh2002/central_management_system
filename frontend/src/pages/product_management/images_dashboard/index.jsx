import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Copy,
  Images,
  ImagePlus,
  Lock,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
  XCircle,
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

function formatDate(value) {
  if (!value) return null;

  try {
    return new Date(value).toLocaleString();
  } catch {
    return null;
  }
}

const TABS = [
  { key: "all", label: "All", icon: Images },
  { key: "assigned", label: "Assigned", icon: CheckCircle2 },
  { key: "unassigned", label: "Unassigned", icon: XCircle },
];

function ImageDetailModal({ image, onClose }) {
  if (!image) return null;

  const previewUrl = resolveImageUrl(image.image_url || image.image_path);
  const isAssigned = Boolean(image.is_assigned);
  const uploadedAt = formatDate(image.created_at || image.uploaded_at);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Images size={17} className="text-orange-300" />
            <h3 className="text-sm font-semibold text-white">Image Details</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-center bg-[#0b1220] p-5">
          <div className="flex h-[360px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white">
            <img
              src={previewUrl}
              alt={image.alt_text || image.file_name || "Product image"}
              className="h-full w-full object-contain p-3"
              draggable={false}
            />
          </div>
        </div>

        <div className="space-y-3 px-5 pb-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-orange-300" />
              <span className="text-xs font-semibold text-slate-400">Assigned SKU</span>
            </div>
            {image.sku ? (
              <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold text-orange-300 ring-1 ring-orange-500/30">
                {image.sku}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500">Not assigned to a SKU</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500">File name</p>
              <p className="mt-0.5 truncate font-medium text-slate-200" title={image.file_name}>
                {image.file_name || "-"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <p
                className={`mt-0.5 flex items-center gap-1 font-medium ${
                  isAssigned ? "text-emerald-300" : "text-slate-400"
                }`}
              >
                {isAssigned ? <Lock size={12} /> : null}
                {isAssigned ? "In use (protected)" : "Unassigned"}
              </p>
            </div>
            {image.alt_text ? (
              <div className="col-span-2">
                <p className="text-slate-500">Alt text</p>
                <p className="mt-0.5 font-medium text-slate-200">{image.alt_text}</p>
              </div>
            ) : null}
            {uploadedAt ? (
              <div className="col-span-2">
                <p className="text-slate-500">Uploaded</p>
                <p className="mt-0.5 font-medium text-slate-200">{uploadedAt}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkuSearchDropdown({ skuOptions, value, onSelect }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setFocused(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const results = useMemo(() => {
    if (!focused) return [];

    const q = query.trim().toLowerCase();
    const pool = q ? skuOptions.filter((row) => row.sku.toLowerCase().includes(q)) : skuOptions;

    return pool.slice(0, 50);
  }, [focused, query, skuOptions]);

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 pl-2.5 pr-1 focus-within:border-orange-500">
        <Tag size={13} className="shrink-0 text-slate-500" />
        <input
          value={value || query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onSelect("");
          }}
          onFocus={() => setFocused(true)}
          placeholder="Search by SKU..."
          className="h-full w-full min-w-0 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onSelect("");
              setQuery("");
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:text-white"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      {focused && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl shadow-black/50">
          {results.map((row) => (
            <button
              key={row.sku}
              type="button"
              onClick={() => {
                onSelect(row.sku);
                setQuery("");
                setFocused(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-orange-300"
            >
              <span className="truncate">{row.sku}</span>
              <span className="ml-2 shrink-0 text-[10px] text-slate-500">{row.count} img</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({ image, onSaveAltText, onRename, onDelete, onPreview, busy }) {
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
      <button
        type="button"
        onClick={() => onPreview(image)}
        className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden bg-slate-950"
        title="Click to view details"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={image.alt_text || image.file_name || "Product image"}
            className="h-full w-full object-cover transition duration-200 hover:scale-105"
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

        {image.sku ? (
          <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/70 px-2 py-1 text-left text-[10px] font-semibold text-orange-300">
            {image.sku}
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3 text-xs">
        {renaming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              className="h-7 flex-1 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-100 outline-none focus:border-orange-500"
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
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 text-slate-400 hover:border-orange-500 hover:text-orange-300"
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
          className="h-7 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-orange-500"
        />

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isAssigned || busy}
            onClick={() => setRenaming(true)}
            title={isAssigned ? "Assigned images can't be renamed" : "Rename"}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-700 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
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
  const [skuFilter, setSkuFilter] = useState("");
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

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

  const skuOptions = useMemo(() => {
    const counts = new Map();

    images.forEach((image) => {
      const sku = String(image.sku || "").trim();
      if (!sku) return;
      counts.set(sku, (counts.get(sku) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([sku, count]) => ({ sku, count }))
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [images]);

  const tabCounts = useMemo(
    () => ({
      all: images.length,
      assigned: images.filter((image) => image.is_assigned).length,
      unassigned: images.filter((image) => !image.is_assigned).length,
    }),
    [images]
  );

  const filteredImages = useMemo(() => {
    const q = search.trim().toLowerCase();

    return images.filter((image) => {
      const matchesTab =
        tab === "all" ||
        (tab === "assigned" && image.is_assigned) ||
        (tab === "unassigned" && !image.is_assigned);

      if (!matchesTab) return false;
      if (skuFilter && String(image.sku || "") !== skuFilter) return false;
      if (!q) return true;

      const haystack = `${image.file_name || ""} ${image.alt_text || ""} ${
        image.sku || ""
      }`.toLowerCase();

      return haystack.includes(q);
    });
  }, [images, search, tab, skuFilter]);

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
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:border-orange-500 hover:text-orange-300 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3 text-xs font-bold text-slate-950 hover:bg-orange-400 disabled:opacity-60"
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

        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-1 border-b border-slate-800 px-3">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex h-10 items-center gap-1.5 border-b-2 px-3 text-[12px] font-semibold transition ${
                    active
                      ? "border-orange-400 text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon size={13} />
                  {item.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active ? "bg-orange-500/20 text-orange-300" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {tabCounts[item.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-8 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 focus-within:border-orange-500">
                <Search size={13} className="shrink-0 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search file name or alt text..."
                  className="h-full w-56 min-w-0 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
                />
              </div>

              <SkuSearchDropdown skuOptions={skuOptions} value={skuFilter} onSelect={setSkuFilter} />
            </div>

            <span className="text-[11px] text-slate-500">
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
                onPreview={setPreviewImage}
              />
            ))}
          </div>
        )}
      </div>

      <ImageDetailModal image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
