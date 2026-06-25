import { useEffect, useMemo, useRef, useState } from "react";
import { Edit, ImagePlus, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./components/ProductPageLayout";
import {
  generateVariantSku,
  getErrorMessage,
  getName,
  normalizeList,
} from "./utils/productSku";

const MAX_EXTRA_IMAGES = 8;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

const emptyVariant = {
  product_id: "",
  variant_sku: "",
  colour_id: "",
  colour: "",
  size: "",
  model: "",
  material: "",
  price: 0,
  cost_price: 0,
  sale_price: 0,
  stock_qty: 0,
  status: "active",
  created_by: 1,
  updated_by: 1,
};

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function cleanNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getRecordId(record = {}) {
  return (
    record.id ??
    record.variant_id ??
    record.product_variant_id ??
    record.local_variant_id ??
    ""
  );
}

function rowBelongsToProduct(row, productId) {
  const possibleIds = [
    row?.product_id,
    row?.local_product_id,
    row?.parent_product_id,
    row?.productId,
  ].filter((value) => value !== undefined && value !== null && value !== "");

  if (!possibleIds.length) return true;
  return possibleIds.some((value) => String(value) === String(productId));
}

function getCategoryId(row) {
  return (
    row?.category_id ??
    row?.product_category_id ??
    row?.categoryId ??
    row?.parent_category_id ??
    ""
  );
}

function getSubCategoryId(row) {
  return (
    row?.sub_category_id ??
    row?.subcategory_id ??
    row?.subCategoryId ??
    row?.product_sub_category_id ??
    ""
  );
}

function getModelId(row) {
  return row?.model_id ?? row?.product_model_id ?? row?.modelId ?? "";
}

function getColourCode(colour) {
  return (
    colour?.colour_code ||
    colour?.color_code ||
    colour?.code ||
    colour?.hex_code ||
    ""
  );
}

function getVariantSku(variant = {}) {
  return (
    variant.variant_sku ||
    variant.sku ||
    variant.seller_sku ||
    variant.local_sku ||
    variant.child_sku ||
    `VARIANT${getRecordId(variant) || ""}`
  );
}

function getVariantName(variant = {}) {
  return (
    variant.colour ||
    variant.color ||
    variant.colour_name ||
    variant.color_name ||
    variant.variant_name ||
    variant.name ||
    variant.title ||
    variant.size ||
    "Variant"
  );
}

function getVariantPrice(variant = {}) {
  return (
    variant.price ??
    variant.main_price ??
    variant.selling_price ??
    variant.sale_price ??
    0
  );
}

function getVariantStock(variant = {}) {
  return (
    variant.stock_qty ??
    variant.current_stock ??
    variant.quantity ??
    variant.available_stock ??
    0
  );
}

function buildImageUrl(value) {
  if (!value) return "";

  const url = String(value).trim();
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${url}`;
  if (url.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${url}`;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;

  return `${BACKEND_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function getImageUrl(image) {
  if (!image) return "";

  if (typeof image === "string") return buildImageUrl(image);

  return buildImageUrl(
    image.preview ||
      image.image_url ||
      image.imageUrl ||
      image.image_path ||
      image.imagePath ||
      image.file_url ||
      image.fileUrl ||
      image.file_path ||
      image.filePath ||
      image.url ||
      image.path ||
      image.src
  );
}

function getImageFileName(image) {
  const value =
    image?.image_url ||
    image?.image_path ||
    image?.file_url ||
    image?.file_path ||
    image?.url ||
    image?.path ||
    "";

  if (!value) return "No image selected";

  return String(value).split("/").pop() || String(value);
}

function imageBelongsToVariant(image = {}, variantId) {
  const imageVariantId =
    image.variant_id || image.product_variant_id || image.sku_id || "";

  return String(imageVariantId) === String(variantId);
}

function sortImages(images = []) {
  return [...images].sort((a, b) => {
    const sortA = Number(a.sort_order ?? a.position ?? a.display_order ?? 0);
    const sortB = Number(b.sort_order ?? b.position ?? b.display_order ?? 0);

    if (sortA !== sortB) return sortA - sortB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function splitImages(images = []) {
  const sorted = sortImages(images);

  const main =
    sorted.find((item) => {
      const type = String(item.image_type || item.type || "").toLowerCase();

      return (
        Number(item.is_main || item.is_primary || item.is_featured || 0) === 1 ||
        type === "main" ||
        type === "primary"
      );
    }) ||
    sorted[0] ||
    null;

  const mainId = main?.id ? String(main.id) : "";

  const extras = sorted.filter((item) => {
    if (!main) return true;
    if (item.id && mainId && String(item.id) === mainId) return false;

    const type = String(item.image_type || item.type || "").toLowerCase();
    if (type === "main" || type === "primary") return false;

    return true;
  });

  return {
    main,
    extras: Array.from({ length: MAX_EXTRA_IMAGES }, (_, index) => extras[index] || null),
    count: sorted.length,
  };
}

async function validateImage(file) {
  if (!file) throw new Error("Please select an image.");

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, JPEG, PNG, GIF and WEBP images are allowed.");
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);

      const pixels = image.width * image.height;

      if (pixels > 10000000) {
        reject(
          new Error(
            `Image is above 10MP. Current: ${image.width} x ${image.height}`
          )
        );
        return;
      }

      resolve({
        width: image.width,
        height: image.height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read selected image."));
    };

    image.src = url;
  });
}

function useFilePreview(file) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return preview;
}

function DarkInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  required = false,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-400">
        {label}
        {required ? <span className="text-slate-200"> *</span> : null}
      </span>
      <input
        type={type}
        step={step}
        value={value ?? ""}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-400"
      />
    </label>
  );
}

function DarkSelect({ label, value, onChange, children, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-400">
        {label}
      </span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
    </label>
  );
}

function RowImagePreview({ image, onOpen }) {
  const preview = getImageUrl(image);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden border border-slate-700 bg-[#0a101d] transition hover:border-orange-400 hover:shadow-[0_0_18px_rgba(249,115,22,0.35)]"
    >
      {preview ? (
        <img
          src={preview}
          alt="Variant"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
          onError={(event) => {
            event.currentTarget.src =
              "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
          }}
        />
      ) : (
        <ImagePlus size={18} className="text-slate-500" />
      )}
    </button>
  );
}

function SubImagesCell({ images = [], onOpen }) {
  const shown = images.filter(Boolean);

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {shown.slice(0, 4).map((image, index) => (
          <button
            key={image?.id || index}
            type="button"
            onClick={onOpen}
            className="group h-10 w-10 cursor-pointer overflow-hidden border border-slate-700 bg-[#0a101d] transition hover:border-orange-400 hover:shadow-[0_0_14px_rgba(249,115,22,0.3)]"
          >
            <img
              src={getImageUrl(image)}
              alt={`Sub ${index + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
            />
          </button>
        ))}

        {!shown.length ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex h-10 w-10 cursor-pointer items-center justify-center border border-slate-700 bg-[#0a101d] text-slate-600 transition hover:border-orange-400 hover:text-orange-300 hover:shadow-[0_0_14px_rgba(249,115,22,0.3)]"
          >
            <ImagePlus size={15} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-orange-500/50 bg-orange-500/10 text-orange-300 transition hover:bg-orange-500/20 hover:text-orange-200 hover:shadow-[0_0_14px_rgba(249,115,22,0.35)]"
        title="Add / edit sub images"
      >
        <Plus size={16} />
      </button>

      <div>
        <p className="text-xs font-bold text-slate-300">Sub Images</p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {shown.length} selected
        </p>
      </div>
    </div>
  );
}

function MainImageBox({ image, file, markedRemove, disabled, onPick, onToggleRemove }) {
  const inputRef = useRef(null);
  const filePreview = useFilePreview(file);
  const preview = filePreview || getImageUrl(image);
  const hasImage = Boolean(preview);

  return (
    <div className="mx-auto w-full max-w-[330px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 bg-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          markedRemove ? "border-rose-400 opacity-50" : "border-violet-400 hover:border-violet-300"
        }`}
      >
        {hasImage ? (
          <img src={preview} alt="Main" className="h-full w-full object-contain" />
        ) : (
          <div className="text-center text-slate-500">
            <ImagePlus size={34} className="mx-auto mb-2" />
            <p className="text-sm font-bold">Click to add image</p>
          </div>
        )}
      </button>

      <div className="mt-5 rounded-lg border border-slate-500/40 bg-slate-700/50 px-4 py-3 text-center">
        <p className="truncate text-xs font-bold text-slate-200">
          {file?.name || getImageFileName(image)}
        </p>
      </div>

      {hasImage ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleRemove}
          className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm font-bold ${
            markedRemove
              ? "border-slate-500 text-slate-200 hover:bg-slate-700"
              : "border-rose-400/50 text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          {markedRemove ? "Undo Remove" : "Remove Image"}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          event.target.value = "";
          if (selectedFile) onPick(selectedFile);
        }}
      />
    </div>
  );
}

function SubImageBox({ label, image, file, markedRemove, disabled, onPick, onToggleRemove }) {
  const inputRef = useRef(null);
  const filePreview = useFilePreview(file);
  const preview = filePreview || getImageUrl(image);
  const hasImage = Boolean(preview);

  return (
    <div>
      <p className="mb-2 text-xs font-black text-slate-300">{label}</p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          markedRemove ? "border-rose-400 opacity-50" : "border-slate-500/60 hover:border-violet-300"
        }`}
      >
        {hasImage ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="text-center text-slate-500">
            <ImagePlus size={24} className="mx-auto mb-2" />
            <p className="text-xs font-bold">Add</p>
          </div>
        )}
      </button>

      <div className="mt-2 rounded-md border border-slate-500/30 bg-slate-700/40 px-2 py-1.5 text-center">
        <p className="truncate text-[11px] font-bold text-slate-300">
          {file?.name || getImageFileName(image)}
        </p>
      </div>

      {hasImage ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleRemove}
          className={`mt-2 w-full rounded-md border px-2 py-1.5 text-xs font-bold ${
            markedRemove
              ? "border-slate-500 text-slate-200 hover:bg-slate-700"
              : "border-rose-400/50 text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          {markedRemove ? "Undo" : "Remove"}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          event.target.value = "";
          if (selectedFile) onPick(selectedFile);
        }}
      />
    </div>
  );
}

function ImageUploadPopup({
  mode,
  title,
  mainImage,
  extraImages = [],
  saving,
  onClose,
  onSave,
}) {
  const [mainFile, setMainFile] = useState(null);
  const [extraFiles, setExtraFiles] = useState({});
  const [removeIds, setRemoveIds] = useState({});

  const safeExtras = Array.from(
    { length: MAX_EXTRA_IMAGES },
    (_, index) => extraImages[index] || null
  );

  function toggleRemove(image) {
    if (!image?.id) return;

    setRemoveIds((prev) => ({
      ...prev,
      [image.id]: !prev[image.id],
    }));
  }

  function handleMainPick(file) {
    setMainFile(file);

    if (mainImage?.id) {
      setRemoveIds((prev) => ({
        ...prev,
        [mainImage.id]: false,
      }));
    }
  }

  function handleExtraPick(file, index) {
    setExtraFiles((prev) => ({
      ...prev,
      [index]: file,
    }));

    const currentImage = safeExtras[index];
    if (currentImage?.id) {
      setRemoveIds((prev) => ({
        ...prev,
        [currentImage.id]: false,
      }));
    }
  }

  async function handleSave() {
    const removals = [];

    if (mode === "main" && mainImage?.id && removeIds[mainImage.id]) {
      removals.push(mainImage);
    }

    if (mode === "sub") {
      safeExtras.forEach((image) => {
        if (image?.id && removeIds[image.id]) {
          removals.push(image);
        }
      });
    }

    await onSave({
      mode,
      mainFile,
      extraFiles,
      removals,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-700 bg-[#243b57] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-violet-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <ImagePlus size={20} />
            <p className="text-base font-black">
              {mode === "main" ? "Product Image" : "Sub Images"}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {mode === "main" ? (
            <MainImageBox
              image={mainImage}
              file={mainFile}
              markedRemove={Boolean(mainImage?.id && removeIds[mainImage.id])}
              disabled={saving}
              onPick={handleMainPick}
              onToggleRemove={() => toggleRemove(mainImage)}
            />
          ) : (
            <div>
              <div className="mb-4 rounded-lg border border-slate-500/30 bg-slate-700/30 px-4 py-3">
                <p className="text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  Main image is not shown here. Only sub images are managed in this popup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {safeExtras.map((image, index) => (
                  <SubImageBox
                    key={`sub-${index}`}
                    label={`Sub ${index + 1}`}
                    image={image}
                    file={extraFiles[index]}
                    markedRemove={Boolean(image?.id && removeIds[image.id])}
                    disabled={saving}
                    onPick={(file) => handleExtraPick(file, index)}
                    onToggleRemove={() => toggleRemove(image)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 bg-[#1c3048] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-500 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Images"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VariantModal({
  open,
  form,
  saving,
  loading,
  colours,
  onClose,
  onSubmit,
  onChange,
  onColourChange,
  onGenerateSku,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-700 bg-[#243b57] text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-violet-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Plus size={20} />
            <p className="text-base font-black">
              {form.id ? "Edit Variant" : "Add Variant"}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DarkSelect
              label="Colour Code"
              value={form.colour_id || ""}
              onChange={onColourChange}
              disabled={loading || saving}
            >
              <option value="">Select colour</option>
              {colours.map((item) => (
                <option key={item.id} value={item.id}>
                  {getName(item)}
                  {getColourCode(item) ? ` (${getColourCode(item)})` : ""}
                </option>
              ))}
            </DarkSelect>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <DarkInput
                label="Variant SKU"
                value={form.variant_sku}
                onChange={(value) => onChange("variant_sku", value)}
                required
                placeholder="Auto SKU"
              />

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onGenerateSku}
                  className="h-10 cursor-pointer rounded-lg border border-slate-500/60 bg-slate-700/50 px-4 text-sm font-bold text-slate-200 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  SKU
                </button>
              </div>
            </div>

            <DarkInput
              label="Colour Name"
              value={form.colour}
              onChange={(value) => onChange("colour", value)}
            />

            <DarkInput
              label="Size"
              value={form.size}
              onChange={(value) => onChange("size", value)}
            />

            <DarkInput
              label="Model Text"
              value={form.model}
              onChange={(value) => onChange("model", value)}
            />

            <DarkInput
              label="Material"
              value={form.material}
              onChange={(value) => onChange("material", value)}
            />

            <DarkInput
              label="Selling Price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(value) => onChange("price", value)}
            />

            <DarkInput
              label="Cost Price"
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={(value) => onChange("cost_price", value)}
            />

            <DarkInput
              label="Sale Price"
              type="number"
              step="0.01"
              value={form.sale_price}
              onChange={(value) => onChange("sale_price", value)}
            />

            <DarkInput
              label="Stock Qty"
              type="number"
              value={form.stock_qty}
              onChange={(value) => onChange("stock_qty", value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 bg-[#1c3048] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-500 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            disabled={saving}
            type="submit"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Variant"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LocalProductVariantsPage() {
  const { productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [colours, setColours] = useState([]);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [imagePopup, setImagePopup] = useState(null);
  const [form, setForm] = useState({
    ...emptyVariant,
    product_id: productId,
  });

  const selectedCategory = useMemo(() => {
    const categoryId = getCategoryId(product);
    return categories.find((item) => String(item.id) === String(categoryId));
  }, [categories, product]);

  const selectedSubCategory = useMemo(() => {
    const subCategoryId = getSubCategoryId(product);
    return subCategories.find(
      (item) => String(item.id) === String(subCategoryId)
    );
  }, [subCategories, product]);

  const selectedModel = useMemo(() => {
    const modelId = getModelId(product);
    return models.find((item) => String(item.id) === String(modelId));
  }, [models, product]);

  const selectedColour = useMemo(() => {
    return colours.find((item) => String(item.id) === String(form.colour_id));
  }, [colours, form.colour_id]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        productRes,
        variantRes,
        imageRes,
        colourRes,
        categoryRes,
        subCategoryRes,
        modelRes,
      ] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({
          data: [],
        })),
        localProductsApi.getImages().catch(() => ({ data: [] })),
        localProductsApi.getColours().catch(() => []),
        localProductsApi.getCategories().catch(() => []),
        localProductsApi.getSubCategories().catch(() => []),
        localProductsApi.getProductModels().catch(() => []),
      ]);

      const productData = unwrapOne(productRes);
      const variantRows = normalizeList(variantRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const imageRows = normalizeList(imageRes).filter(
        (item) => String(item.product_id) === String(productId)
      );

      setProduct(productData);
      setVariants(variantRows);
      setImages(imageRows);
      setColours(normalizeList(colourRes));
      setCategories(normalizeList(categoryRes));
      setSubCategories(normalizeList(subCategoryRes));
      setModels(normalizeList(modelRes));
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load variants."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function resetForm() {
    setForm({
      ...emptyVariant,
      product_id: productId,
    });
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(variant) {
    setForm({
      ...emptyVariant,
      ...variant,
      product_id: productId,
      id: getRecordId(variant),
      colour_id: variant.colour_id || variant.product_colour_id || "",
      colour: variant.colour || variant.color || "",
      price:
        variant.price ??
        variant.main_price ??
        variant.selling_price ??
        variant.sale_price ??
        0,
      stock_qty:
        variant.stock_qty ??
        variant.current_stock ??
        variant.quantity ??
        variant.available_stock ??
        0,
    });

    setFormOpen(true);
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function generateSkuForColour(colourId = form.colour_id) {
    const colour = colours.find((item) => String(item.id) === String(colourId));

    const sku = generateVariantSku({
      category: selectedCategory,
      subCategory: selectedSubCategory,
      model: selectedModel,
      colour,
    });

    setForm((prev) => ({
      ...prev,
      colour_id: colourId,
      colour: getName(colour) || prev.colour,
      variant_sku: sku,
    }));
  }

  function handleColourChange(value) {
    const colour = colours.find((item) => String(item.id) === String(value));

    setForm((prev) => ({
      ...prev,
      colour_id: value,
      colour: getName(colour),
    }));

    if (value) {
      const sku = generateVariantSku({
        category: selectedCategory,
        subCategory: selectedSubCategory,
        model: selectedModel,
        colour,
      });

      setForm((prev) => ({
        ...prev,
        colour_id: value,
        colour: getName(colour),
        variant_sku: sku,
      }));
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!String(form.variant_sku || "").trim()) {
      alert("Variant SKU is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        product_id: productId,
        variant_sku: String(form.variant_sku || "").trim(),
        colour_id: form.colour_id || null,
        colour: form.colour || getName(selectedColour) || "",
        price: cleanNumber(form.price),
        main_price: cleanNumber(form.price),
        selling_price: cleanNumber(form.price),
        cost_price: cleanNumber(form.cost_price),
        sale_price: cleanNumber(form.sale_price),
        stock_qty: cleanNumber(form.stock_qty),
        status: form.status || "active",
        updated_by: 1,
      };

      if (form.id) {
        await localProductsApi.updateVariant(form.id, payload);
      } else {
        await localProductsApi.createVariant(payload);
      }

      await localProductsApi
        .updateProduct(productId, {
          ...product,
          has_variants: 1,
          product_type: "variable",
          updated_by: 1,
        })
        .catch(() => null);

      resetForm();
      setFormOpen(false);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save variant."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(variant) {
    const variantId = getRecordId(variant);
    const confirmed = window.confirm(`Delete variant ${getVariantSku(variant)}?`);

    if (!confirmed) return;

    try {
      await localProductsApi.deleteVariant(variantId);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete variant."));
    }
  }

  function getVariantImageSet(variant) {
    const variantId = getRecordId(variant);

    const variantImages = images.filter(
      (image) =>
        String(image.product_id) === String(productId) &&
        imageBelongsToVariant(image, variantId)
    );

    return splitImages(variantImages);
  }

  async function uploadImageOnly({
    file,
    isMain,
    sortOrder,
    existingImage = null,
    variantId = "",
  }) {
    if (!file) return;

    await validateImage(file);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("product_id", productId);
    formData.append("variant_id", String(variantId));
    formData.append("product_variant_id", String(variantId));
    formData.append("is_main", isMain ? "1" : "0");
    formData.append("sort_order", String(sortOrder));
    formData.append("image_type", isMain ? "main" : "sub");
    formData.append("created_by", "1");
    formData.append("updated_by", "1");

    if (existingImage?.id) {
      await localProductsApi.updateImage(existingImage.id, formData);
    } else {
      await localProductsApi.uploadImage(formData);
    }
  }

  async function savePopupImages({ mode, mainFile, extraFiles, removals }) {
    if (!imagePopup?.variantId) return;

    setSavingImages(true);

    try {
      for (const image of removals || []) {
        if (image?.id) {
          await localProductsApi.deleteImage(image.id);
        }
      }

      if (mode === "main" && mainFile) {
        await uploadImageOnly({
          file: mainFile,
          isMain: true,
          sortOrder: 0,
          existingImage: imagePopup.imageSet?.main,
          variantId: imagePopup.variantId,
        });
      }

      if (mode === "sub") {
        for (const [indexText, file] of Object.entries(extraFiles || {})) {
          const index = Number(indexText);

          await uploadImageOnly({
            file,
            isMain: false,
            sortOrder: index + 1,
            existingImage: imagePopup.imageSet?.extras?.[index],
            variantId: imagePopup.variantId,
          });
        }
      }

      setImagePopup(null);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, error.message || "Unable to save images."));
    } finally {
      setSavingImages(false);
    }
  }

  return (
    <ProductPageLayout productId={productId} active="variants" product={product}>
      <div className="border border-slate-800 bg-[#0b1220] text-slate-100">
        <div className="flex items-center justify-end border-b border-slate-800 bg-[#07101f] px-4 py-2">
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-orange-500 px-3 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-400"
          >
            <Plus size={14} />
            Add Variant
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-slate-300" />
            <span className="text-sm font-semibold">Loading variations...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="border-b border-slate-800 bg-[#0a101d] text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-[70px] px-3 py-3">Edit</th>
                  <th className="w-[150px] px-3 py-3">Colour</th>
                  <th className="w-[220px] px-3 py-3">SKU</th>
                  <th className="w-[190px] px-3 py-3">Main Image</th>
                  <th className="w-[270px] px-3 py-3">Sub Images</th>
                  <th className="w-[130px] px-3 py-3">Price</th>
                  <th className="w-[110px] px-3 py-3">Stock</th>
                  <th className="w-[160px] px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {variants.length ? (
                  variants.map((variant, index) => {
                    const variantId = getRecordId(variant) || `variant-${index}`;
                    const imageSet = getVariantImageSet(variant);

                    return (
                      <tr key={variantId} className="hover:bg-slate-900/40">
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => openEditForm(variant)}
                            className="cursor-pointer text-orange-300 transition hover:text-orange-200"
                            title="Edit variant"
                          >
                            <Edit size={17} />
                          </button>
                        </td>

                        <td className="px-3 py-3">
                          <span className="border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-bold text-slate-300">
                            {getVariantName(variant)}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <p className="font-bold text-slate-100">
                            {getVariantSku(variant)}
                          </p>
                          {variant.size || variant.material ? (
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {[variant.size, variant.material]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          <RowImagePreview
                            image={imageSet.main}
                            onOpen={() =>
                              setImagePopup({
                                mode: "main",
                                title: getVariantSku(variant),
                                variantId,
                                imageSet,
                              })
                            }
                          />
                        </td>

                        <td className="px-3 py-3">
                          <SubImagesCell
                            images={imageSet.extras}
                            onOpen={() =>
                              setImagePopup({
                                mode: "sub",
                                title: getVariantSku(variant),
                                variantId,
                                imageSet,
                              })
                            }
                          />
                        </td>

                        <td className="px-3 py-3 font-bold text-slate-200">
                          LKR {getVariantPrice(variant)}
                        </td>

                        <td className="px-3 py-3 font-bold text-slate-300">
                          {getVariantStock(variant)}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(variant)}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                              title="Edit variant"
                            >
                              <Edit size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(variant)}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
                              title="Delete variant"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-3 py-10 text-center text-slate-500">
                      No variants yet. Click Add Variant to create child SKU.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VariantModal
        open={formOpen}
        form={form}
        saving={saving}
        loading={loading}
        colours={colours}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        onSubmit={handleSave}
        onChange={updateField}
        onColourChange={handleColourChange}
        onGenerateSku={() => generateSkuForColour()}
      />

      {imagePopup ? (
        <ImageUploadPopup
          mode={imagePopup.mode}
          title={imagePopup.title}
          mainImage={imagePopup.imageSet?.main}
          extraImages={imagePopup.imageSet?.extras || []}
          saving={savingImages}
          onClose={() => {
            if (!savingImages) setImagePopup(null);
          }}
          onSave={savePopupImages}
        />
      ) : null}
    </ProductPageLayout>
  );
}
