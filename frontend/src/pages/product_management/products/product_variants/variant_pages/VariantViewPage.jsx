import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Edit,
  ImageOff,
  Package,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { useCanViewCostPrice } from "../../../../../components/common/permissions/PermissionsProvider";
import Loader from "../../../../../components/common/Loader";
import { getErrorMessage, normalizeList } from "../../utils/productSku";
import {
  getImageUrl,
  getRecordId,
  imageBelongsToVariant,
  splitImages,
} from "../utils/variantPageHelpers";

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

async function safeFetch(fn) {
  try {
    const response = await fn();
    return unwrapOne(response);
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStockStatus(inventory) {
  const stock = Number(inventory?.stock_qty ?? 0);
  const available = Number(
    inventory?.available_qty ?? inventory?.stock_qty ?? 0
  );
  const lowAlert = Number(inventory?.low_stock_alert_qty ?? 0);

  if (available <= 0) {
    return { label: "Out of Stock", className: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30" };
  }

  if (lowAlert > 0 && available <= lowAlert) {
    return { label: "Low Stock", className: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30" };
  }

  return {
    label: `In Stock (${stock})`,
    className: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
  };
}

function SpecRow({ label, value, index }) {
  return (
    <div
      className={`grid grid-cols-[160px_1fr] gap-3 px-4 py-2.5 text-sm ${
        index % 2 === 0 ? "bg-[#0b1220]" : "bg-[#0d1526]"
      }`}
    >
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="break-words font-medium text-slate-200">{value ?? "-"}</p>
    </div>
  );
}

export default function VariantViewPage() {
  const { productId, variantId } = useParams();
  const navigate = useNavigate();
  const canViewCostPrice = useCanViewCostPrice();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(null);
  const [images, setImages] = useState([]);
  const [price, setPrice] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [attributeRows, setAttributeRows] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState([]);
  const [activeImageId, setActiveImageId] = useState("");
  const [skuCopied, setSkuCopied] = useState(false);

  const imageSet = useMemo(() => splitImages(images), [images]);
  const gallery = useMemo(
    () => [imageSet.main, ...imageSet.extras].filter(Boolean),
    [imageSet]
  );
  const activeImage =
    gallery.find((image) => String(image?.id) === String(activeImageId)) ||
    gallery[0] ||
    null;

  const variantSku = variant?.variant_sku || variant?.sku || "";
  const variantTitle =
    variant?.variant_name ||
    `${product?.title || product?.name || "Product"}${
      variant?.colour_name ? ` - ${variant.colour_name}` : ""
    }`;
  const sellingPrice = price?.local_selling_price ?? price?.sale_price ?? 0;
  const stockStatus = useMemo(() => getStockStatus(inventory), [inventory]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const [productRes, variantRes, imageRes, attrRes, valueRes, productAttrRes] =
          await Promise.all([
            localProductsApi.getProductById(productId),
            localProductsApi.getVariants({ product_id: productId }).catch(() => ({ data: [] })),
            localProductsApi.getImages().catch(() => ({ data: [] })),
            localProductsApi.getAttributes().catch(() => []),
            localProductsApi.getAttributeValues().catch(() => []),
            localProductsApi.getProductAttributeValues().catch(() => ({ data: [] })),
          ]);

        setProduct(unwrapOne(productRes));

        const variants = normalizeList(variantRes);
        const found = variants.find(
          (item) => String(getRecordId(item)) === String(variantId)
        );
        setVariant(found || null);

        setImages(
          normalizeList(imageRes).filter(
            (image) =>
              String(image.product_id) === String(productId) &&
              imageBelongsToVariant(image, variantId)
          )
        );
        setActiveImageId("");

        setAttributes(normalizeList(attrRes));
        setAttributeValues(normalizeList(valueRes));
        setAttributeRows(
          normalizeList(productAttrRes).filter(
            (row) =>
              String(row.product_id) === String(productId) &&
              String(row.variant_id || "") === String(variantId)
          )
        );

        const sku = found?.variant_sku || found?.sku || "";

        if (sku) {
          const [priceRow, inventoryRow] = await Promise.all([
            safeFetch(() => localProductsApi.getPriceBySku(sku)),
            safeFetch(() => localProductsApi.getInventoryBySku(sku)),
          ]);

          setPrice(priceRow);
          setInventory(inventoryRow);
        }
      } catch (error) {
        alert(getErrorMessage(error, "Unable to load variant."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [productId, variantId]);

  function attributeName(id) {
    return attributes.find((item) => String(item.id) === String(id))?.name || "-";
  }

  function attributeValueName(id) {
    return (
      attributeValues.find((item) => String(item.id) === String(id))?.value ||
      attributeValues.find((item) => String(item.id) === String(id))?.name ||
      "-"
    );
  }

  function copySku() {
    if (!variantSku) return;
    navigator.clipboard?.writeText(variantSku).then(() => {
      setSkuCopied(true);
      setTimeout(() => setSkuCopied(false), 1500);
    });
  }

  return (
    <div className="min-h-screen bg-[#080d16] p-4 text-slate-100 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => navigate("/product/local-products")}
              className="cursor-pointer text-slate-400 hover:text-white"
            >
              Local Products
            </button>
            <ChevronRight size={13} className="text-slate-600" />
            <button
              type="button"
              onClick={() => navigate(`/product/local-products/edit/${productId}/variants`)}
              className="cursor-pointer text-slate-400 hover:text-white"
            >
              {product?.sku || product?.product_sku || "Product"}
            </button>
            <ChevronRight size={13} className="text-slate-600" />
            <span className="text-slate-300">Variant: {variantSku || "-"}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(`/product/local-products/edit/${productId}/variants/${variantId}/edit/basic`)
              }
              className="inline-flex h-9 cursor-pointer items-center gap-2 bg-orange-500 px-3 text-xs font-black text-white hover:bg-orange-400"
            >
              <Edit size={14} /> Edit Variant
            </button>
          </div>
        </div>

        {loading ? (
          <Loader label="Loading variant..." minHeight="280px" />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden border border-slate-800 bg-white">
                {activeImage ? (
                  <img
                    src={getImageUrl(activeImage)}
                    alt={variantTitle}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ImageOff size={40} />
                    <span className="text-xs font-semibold">No image</span>
                  </div>
                )}
              </div>

              {gallery.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {gallery.map((image, index) => {
                    const isActive = activeImage && String(image.id) === String(activeImage.id);

                    return (
                      <button
                        key={image.id || index}
                        type="button"
                        onClick={() => setActiveImageId(String(image.id))}
                        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border bg-white transition ${
                          isActive
                            ? "border-orange-400 ring-2 ring-orange-400/40"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <img
                          src={getImageUrl(image)}
                          alt={`${variantTitle} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Details */}
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-700/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-200 ring-1 ring-slate-600/50">
                  {variant?.colour_name || "No Colour"}
                </span>

                {variant?.size_name && (
                  <span className="inline-flex items-center rounded-full bg-slate-700/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-200 ring-1 ring-slate-600/50">
                    {variant.size_name}
                  </span>
                )}

                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    (variant?.status || "active") === "active"
                      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50"
                  }`}
                >
                  {variant?.status || "active"}
                </span>

                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${stockStatus.className}`}
                >
                  {stockStatus.label}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
                  {product?.title || product?.name || "Product"}
                </p>
                <h1 className="mt-1 text-2xl font-black text-white">{variantTitle}</h1>

                <button
                  type="button"
                  onClick={copySku}
                  title="Copy SKU"
                  className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-200"
                >
                  <Package size={13} />
                  SKU: {variantSku || "-"}
                  {skuCopied ? (
                    <Check size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>

              <div className="border border-slate-800 bg-[#0b1220] p-4">
                <p className="text-3xl font-black text-emerald-300">
                  LKR {money(sellingPrice)}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-slate-500">
                  {canViewCostPrice && <span>Cost: LKR {money(price?.cost_price)}</span>}
                  <span>Daraz: LKR {money(price?.daraz_price)}</span>
                  <span>Woo: LKR {money(price?.woo_price)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border border-slate-800 bg-[#0b1220] p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Stock Qty</p>
                  <p className="mt-1 text-lg font-black text-white">
                    {inventory?.stock_qty ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Available Qty</p>
                  <p className="mt-1 text-lg font-black text-white">
                    {inventory?.available_qty ?? 0}
                  </p>
                </div>
              </div>

              <div className="border border-slate-800 bg-[#0b1220]">
                <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-black text-white">
                  Specifications
                </h2>

                {attributeRows.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-slate-500">No attributes assigned.</p>
                ) : (
                  attributeRows.map((row, index) => (
                    <SpecRow
                      key={row.id}
                      index={index}
                      label={attributeName(row.attribute_id)}
                      value={row.custom_value || attributeValueName(row.attribute_value_id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
