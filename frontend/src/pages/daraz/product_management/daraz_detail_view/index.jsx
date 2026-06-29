import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowLeft,
  Box,
  CalendarClock,
  Copy,
  Eye,
  ImageOff,
  Loader2,
  Package,
  RefreshCw,
  Tag,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { darazProductsApi } from "../../../../config/sub_api/daraz_api/daraz_products_api";

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function money(value, currency = "LKR") {
  const amount = Number(value || 0);

  return `${currency || "LKR"} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseJson(value, fallback) {
  if (!value) return fallback;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getResponseData(res) {
  const payload = res?.data;

  return {
    product:
      payload?.data?.product ||
      payload?.product ||
      payload?.data ||
      payload ||
      null,

    variants:
      payload?.data?.variants ||
      payload?.variants ||
      payload?.data?.skus ||
      payload?.skus ||
      [],
  };
}

function isInvalidId(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
}

function StatusText({ status }) {
  const value = status || "unknown";
  const lower = String(value).toLowerCase();

  const className =
    lower === "active" || lower === "live"
      ? "text-emerald-300"
      : lower === "inactive"
      ? "text-slate-300"
      : lower === "deleted" || lower === "rejected"
      ? "text-red-300"
      : "text-yellow-300";

  return <span className={`text-xs font-semibold ${className}`}>{value}</span>;
}

function ProductImage({ src, title, large = false }) {
  const [failed, setFailed] = useState(false);
  const size = large ? "h-72 w-full" : "h-14 w-14";

  if (!src || failed) {
    return (
      <div
        className={`flex ${size} items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-500`}
      >
        <ImageOff size={large ? 30 : 16} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || "Daraz product"}
      onError={() => setFailed(true)}
      className={`${size} rounded-lg border border-slate-800 object-cover`}
    />
  );
}

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        {Icon && <Icon size={14} />}
        <p className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </p>
      </div>

      <p className="mt-1.5 break-words text-xs font-semibold text-slate-100">
        {value || "-"}
      </p>
    </div>
  );
}

function HtmlPreview({ html }) {
  if (!html) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-500">
        No description available.
      </div>
    );
  }

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 16px;
            background: #ffffff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.7;
          }

          article {
            width: 100%;
            max-width: 100%;
          }

          img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 10px auto;
            border-radius: 6px;
          }

          ul {
            padding-left: 22px;
            margin-top: 8px;
            margin-bottom: 8px;
          }

          li {
            margin-bottom: 6px;
          }

          p {
            margin-top: 8px;
            margin-bottom: 8px;
          }

          div {
            max-width: 100%;
          }

          span {
            max-width: 100%;
          }

          .lzd-article {
            width: 100%;
            max-width: 100%;
          }

          .image-card {
            width: 100%;
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return (
    <iframe
      title="Daraz HTML Preview"
      srcDoc={srcDoc}
      sandbox=""
      className="h-[620px] w-full rounded-xl border border-slate-800 bg-white"
    />
  );
}

function AttributeValue({ value }) {
  if (Array.isArray(value)) {
    return (
      <div className="mt-2 space-y-1">
        {value.map((item, index) => (
          <p
            key={index}
            className="break-words text-xs leading-5 text-slate-200"
          >
            {typeof item === "object" && item !== null
              ? JSON.stringify(item)
              : String(item || "-")}
          </p>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <p className="mt-2 break-words text-xs leading-5 text-slate-200">
      {String(value || "-")}
    </p>
  );
}

export default function DarazProductViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const darazProductId = id;

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [activeTab, setActiveTab] = useState("variants");

  const images = useMemo(() => {
    return parseJson(product?.images_json, []);
  }, [product]);

  const attributes = useMemo(() => {
    return parseJson(product?.attributes_json, {});
  }, [product]);

  const rawJson = useMemo(() => {
    return parseJson(product?.raw_json, {});
  }, [product]);

  const darazAttributes = useMemo(() => {
    return rawJson?.attributes || attributes || {};
  }, [rawJson, attributes]);

  const shortDescription = useMemo(() => {
    return (
      darazAttributes?.short_description ||
      attributes?.short_description ||
      rawJson?.attributes?.short_description ||
      ""
    );
  }, [darazAttributes, attributes, rawJson]);

  const fullDescription = useMemo(() => {
    return (
      darazAttributes?.description ||
      attributes?.description ||
      rawJson?.attributes?.description ||
      ""
    );
  }, [darazAttributes, attributes, rawJson]);

  const productTitle = useMemo(() => {
    return (
      darazAttributes?.name ||
      product?.name ||
      rawJson?.attributes?.name ||
      "-"
    );
  }, [darazAttributes, product, rawJson]);

  const brand = useMemo(() => {
    return (
      darazAttributes?.brand ||
      product?.brand ||
      rawJson?.attributes?.brand ||
      "-"
    );
  }, [darazAttributes, product, rawJson]);

  const marketImages = useMemo(() => {
    const fromRaw = rawJson?.marketImages || [];
    const fromAttributes = darazAttributes?.promotion_whitebkg_image || [];

    if (Array.isArray(fromRaw) && fromRaw.length) return fromRaw;
    if (Array.isArray(fromAttributes) && fromAttributes.length) {
      return fromAttributes;
    }

    return [];
  }, [rawJson, darazAttributes]);

  const skuUrl = useMemo(() => {
    return (
      rawJson?.skus?.[0]?.Url ||
      rawJson?.Skus?.[0]?.Url ||
      rawJson?.skus?.[0]?.url ||
      rawJson?.Skus?.[0]?.url ||
      ""
    );
  }, [rawJson]);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      if (isInvalidId(darazProductId)) {
        setProduct(null);
        setVariants([]);
        setMessage("Daraz product ID missing. Please go back and open product from product list.");
        return;
      }

      const res = await darazProductsApi.view(darazProductId);
      const data = getResponseData(res);

      if (!data.product) {
        setProduct(null);
        setVariants([]);
        setMessage("Daraz product not found.");
        return;
      }

      setProduct(data.product);
      setVariants(Array.isArray(data.variants) ? data.variants : []);
    } catch (error) {
      setProduct(null);
      setVariants([]);
      setMessage(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load product."
      );
    } finally {
      setLoading(false);
    }
  }, [darazProductId]);

  async function copyText(label, value) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(label);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (loading && !product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-slate-300">
        <Loader2 size={18} className="mr-2 animate-spin text-yellow-400" />
        Loading product...
      </div>
    );
  }

  return (
    <div className="w-full p-4 text-slate-100">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/product/daraz-products"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
              >
                <ArrowLeft size={15} />
              </Link>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500 text-slate-950">
                <Package size={17} />
              </div>

              <div>
                <h1 className="text-base font-semibold text-white">
                  Daraz Product View
                </h1>
                <p className="text-xs text-slate-400">
                  Product details, variants, description and synced raw data.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {skuUrl && (
                <a
                  href={skuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
                >
                  View on Daraz
                </a>
              )}

              <button
                onClick={loadProduct}
                disabled={loading || isInvalidId(darazProductId)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-yellow-500 px-3 text-xs font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Refresh
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{message}</span>

                {isInvalidId(darazProductId) && (
                  <button
                    type="button"
                    onClick={() => navigate("/product/daraz-products")}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-yellow-500 px-3 text-xs font-semibold text-slate-950 hover:bg-yellow-400"
                  >
                    Back to Products
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {product && (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <ProductImage
                  src={product.main_image}
                  title={productTitle}
                  large
                />

                {Array.isArray(images) && images.length > 1 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold text-slate-400">
                      Product Images
                    </p>

                    <div className="grid grid-cols-5 gap-2">
                      {images.slice(0, 10).map((image, index) => (
                        <ProductImage
                          key={`${image}-${index}`}
                          src={image}
                          title={productTitle}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(marketImages) && marketImages.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-400">
                      Market / White Background Images
                    </p>

                    <div className="grid grid-cols-5 gap-2">
                      {marketImages.slice(0, 10).map((image, index) => (
                        <ProductImage
                          key={`${image}-${index}`}
                          src={image}
                          title={productTitle}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <StatusText status={product.status} />

                    <h2 className="mt-2 text-lg font-semibold leading-7 text-white">
                      {productTitle}
                    </h2>

                    <p className="mt-2 text-xs text-slate-400">
                      SKU:{" "}
                      <span className="font-medium text-slate-200">
                        {product.seller_sku || "-"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText("SKU", product.seller_sku)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
                    >
                      <Copy size={13} />
                      {copied === "SKU" ? "Copied" : "Copy SKU"}
                    </button>

                    <button
                      onClick={() => copyText("Item", product.daraz_item_id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
                    >
                      <Copy size={13} />
                      {copied === "Item" ? "Copied" : "Copy Item"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <InfoBox
                    icon={Tag}
                    label="Item ID"
                    value={product.daraz_item_id}
                  />
                  <InfoBox
                    icon={Box}
                    label="Price"
                    value={money(product.price, product.currency)}
                  />
                  <InfoBox
                    icon={Box}
                    label="Sale Price"
                    value={money(product.sale_price, product.currency)}
                  />
                  <InfoBox
                    icon={Package}
                    label="Quantity"
                    value={product.quantity}
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoBox
                    icon={Tag}
                    label="Category"
                    value={product.primary_category}
                  />
                  <InfoBox icon={Tag} label="Brand" value={brand} />
                  <InfoBox
                    icon={CalendarClock}
                    label="Last Synced"
                    value={formatDate(product.last_synced_at)}
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoBox
                    icon={Eye}
                    label="Sync Status"
                    value={product.sync_status}
                  />
                  <InfoBox
                    icon={CalendarClock}
                    label="Created"
                    value={formatDate(product.created_at)}
                  />
                  <InfoBox
                    icon={CalendarClock}
                    label="Updated"
                    value={formatDate(product.updated_at)}
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoBox
                    icon={Tag}
                    label="Hazmat"
                    value={darazAttributes?.Hazmat}
                  />
                  <InfoBox
                    icon={Tag}
                    label="Standard Delivery"
                    value={darazAttributes?.delivery_option_standard}
                  />
                  <InfoBox
                    icon={Tag}
                    label="Source"
                    value={darazAttributes?.source}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80">
              <div className="flex flex-wrap gap-5 border-b border-slate-800 px-4 pt-2">
                {[
                  { label: "Variants", value: "variants" },
                  { label: "Short Description", value: "short_description" },
                  { label: "Description", value: "description" },
                  { label: "Attributes", value: "attributes" },
                  { label: "Raw JSON", value: "raw" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`border-b-2 px-0 pb-2 pt-1 text-xs font-medium transition ${
                      activeTab === tab.value
                        ? "border-yellow-400 text-yellow-300"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "variants" && (
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Variants / SKUs
                      </h3>
                      <p className="text-xs text-slate-400">
                        Synced SKU level data from Daraz.
                      </p>
                    </div>

                    <span className="text-xs text-slate-400">
                      {variants.length} variants
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-3 py-2">SKU ID</th>
                          <th className="px-3 py-2">Seller SKU</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Price</th>
                          <th className="px-3 py-2">Sale Price</th>
                          <th className="px-3 py-2">Qty</th>
                        </tr>
                      </thead>

                      <tbody>
                        {variants.map((variant, index) => (
                          <tr
                            key={variant.id || variant.daraz_sku_id || index}
                            className="border-b border-slate-800 text-xs text-slate-300 hover:bg-slate-800/40"
                          >
                            <td className="px-3 py-2">
                              {variant.daraz_sku_id || "-"}
                            </td>

                            <td className="px-3 py-2 break-all text-slate-400">
                              {variant.seller_sku || "-"}
                            </td>

                            <td className="max-w-[340px] px-3 py-2">
                              <div className="line-clamp-2">
                                {variant.name || "-"}
                              </div>
                            </td>

                            <td className="px-3 py-2">
                              <StatusText status={variant.status} />
                            </td>

                            <td className="px-3 py-2">
                              {money(variant.price, product.currency)}
                            </td>

                            <td className="px-3 py-2">
                              {money(variant.sale_price, product.currency)}
                            </td>

                            <td className="px-3 py-2">
                              {variant.quantity || 0}
                            </td>
                          </tr>
                        ))}

                        {!variants.length && (
                          <tr>
                            <td
                              className="px-3 py-8 text-center text-xs text-slate-500"
                              colSpan="7"
                            >
                              No variants found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "short_description" && (
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-white">
                      Short Description
                    </h3>
                    <p className="text-xs text-slate-400">
                      Daraz product short description rendered as HTML.
                    </p>
                  </div>

                  <HtmlPreview html={shortDescription} />
                </div>
              )}

              {activeTab === "description" && (
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-white">
                      Product Description
                    </h3>
                    <p className="text-xs text-slate-400">
                      Daraz product description rendered like marketplace
                      listing content.
                    </p>
                  </div>

                  <HtmlPreview html={fullDescription} />
                </div>
              )}

              {activeTab === "attributes" && (
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-white">
                      Product Attributes
                    </h3>
                    <p className="text-xs text-slate-400">
                      Daraz attributes shown as readable fields.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {Object.entries(darazAttributes || {})
                      .filter(
                        ([key]) =>
                          key !== "description" &&
                          key !== "short_description"
                      )
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {key.replaceAll("_", " ")}
                          </p>

                          <AttributeValue value={value} />
                        </div>
                      ))}

                    {!Object.keys(darazAttributes || {}).length && (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-500">
                        No attributes found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "raw" && (
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Raw Daraz JSON
                      </h3>
                      <p className="text-xs text-slate-400">
                        Full technical response saved from Daraz API.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        copyText("Raw", JSON.stringify(rawJson, null, 2))
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
                    >
                      <Copy size={13} />
                      {copied === "Raw" ? "Copied" : "Copy JSON"}
                    </button>
                  </div>

                  <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">
                      {JSON.stringify(rawJson, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}