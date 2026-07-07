import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Package,
  Tags,
  Box,
  Database,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { wooProductApi } from "../../../../config/sub_api/woo_api/woo_product_api";
import { sanitizeHtml } from "../../../../utils/sanitizeHtml";
import Loader from "../../../../components/common/Loader";

function parseJson(value, fallback) {
  if (!value) return fallback;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function money(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);

  if (!Number.isFinite(number)) return "-";

  return number.toFixed(2);
}

function dateText(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

function Badge({ value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    red: "border-red-400/30 bg-red-400/10 text-red-300",
    yellow: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        tones[tone] || tones.slate
      }`}
    >
      {value || "-"}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#070B14] p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-100">
        {value}
      </div>
    </div>
  );
}

function TagGroup({ title, items }) {
  const safeItems = items.filter(Boolean);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-300">{title}</h3>

      {safeItems.length === 0 ? (
        <p className="text-sm text-slate-500">No {title.toLowerCase()} found.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {safeItems.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WooProductDetailPage() {
  const { accountId, wooProductId } = useParams();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = useMemo(() => {
    return parseJson(product?.categories_json, []);
  }, [product]);

  const tags = useMemo(() => {
    return parseJson(product?.tags_json, []);
  }, [product]);

  const attributes = useMemo(() => {
    return parseJson(product?.attributes_json, []);
  }, [product]);

  const dimensions = useMemo(() => {
    return parseJson(product?.dimensions_json, {});
  }, [product]);

  const mainImage = images?.[0]?.image_src;

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const res = await wooProductApi.getSyncedWooProductDetail(
        accountId,
        wooProductId
      );

      const data = res?.data?.data || {};

      setProduct(data.product || null);
      setVariants(Array.isArray(data.variants) ? data.variants : []);
      setImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      setProduct(null);
      setVariants([]);
      setImages([]);
      setError(
        err?.friendlyMessage || "Failed to load WooCommerce product details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
  }, [accountId, wooProductId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14]">
        <Loader label="Loading Woo product..." minHeight="100vh" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
        <Link
          to="/product/woo-products"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-yellow-300"
        >
          <ArrowLeft size={16} />
          Back to Woo products
        </Link>

        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || "WooCommerce product not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-5">
        <Link
          to="/product/woo-products"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-yellow-300"
        >
          <ArrowLeft size={16} />
          Back to Woo products
        </Link>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200">
              <Package size={13} />
              Woo Product #{product.woo_product_id}
            </div>

            <h1 className="max-w-5xl text-xl font-semibold text-white">
              {product.name || "Unnamed Product"}
            </h1>

            <p className="mt-1 font-mono text-xs text-yellow-200/80">
              SKU: {product.sku || "-"}
            </p>
          </div>

          {product.permalink && (
            <a
              href={product.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
            >
              <ExternalLink size={16} />
              Open Product
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="space-y-5 xl:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
                <Database size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-white">Product Information</h2>
                <p className="text-xs text-slate-400">
                  Synced data from WooCommerce API.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Woo Product ID" value={product.woo_product_id} />
              <Info label="Product Type" value={product.product_type || "-"} />
              <Info
                label="Status"
                value={<Badge value={product.status} tone="green" />}
              />
              <Info
                label="Catalog Visibility"
                value={product.catalog_visibility || "-"}
              />
              <Info label="Regular Price" value={money(product.regular_price)} />
              <Info label="Sale Price" value={money(product.sale_price)} />
              <Info label="Current Price" value={money(product.price)} />
              <Info
                label="Stock Status"
                value={
                  <Badge
                    value={product.stock_status}
                    tone={product.stock_status === "instock" ? "green" : "red"}
                  />
                }
              />
              <Info
                label="Manage Stock"
                value={product.manage_stock ? "Yes" : "No"}
              />
              <Info
                label="Stock Quantity"
                value={product.stock_quantity ?? "-"}
              />
              <Info label="Weight" value={product.weight || "-"} />
              <Info
                label="Dimensions"
                value={`${dimensions?.length || "-"} × ${
                  dimensions?.width || "-"
                } × ${dimensions?.height || "-"}`}
              />
              <Info label="Date Created" value={dateText(product.date_created)} />
              <Info
                label="Date Modified"
                value={dateText(product.date_modified)}
              />
              <Info
                label="Last Synced"
                value={dateText(product.last_synced_at)}
              />
              <Info label="Updated At" value={dateText(product.updated_at)} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <Tags size={18} className="text-yellow-300" />
              <h2 className="font-semibold text-white">
                Categories / Tags / Attributes
              </h2>
            </div>

            <div className="space-y-5">
              <TagGroup
                title="Categories"
                items={categories.map((item) => item.name || item.slug || item.id)}
              />

              <TagGroup
                title="Tags"
                items={tags.map((item) => item.name || item.slug || item.id)}
              />

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-300">
                  Attributes
                </h3>

                {attributes.length === 0 ? (
                  <p className="text-sm text-slate-500">No attributes found.</p>
                ) : (
                  <div className="space-y-2">
                    {attributes.map((attr, index) => (
                      <div
                        key={`${attr.id || attr.name || index}`}
                        className="rounded-xl border border-white/10 bg-[#070B14] p-3"
                      >
                        <p className="text-sm font-semibold text-white">
                          {attr.name || `Attribute ${index + 1}`}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {Array.isArray(attr.options)
                            ? attr.options.join(", ")
                            : "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <Box size={18} className="text-yellow-300" />
              <h2 className="font-semibold text-white">Variations</h2>
            </div>

            {variants.length === 0 ? (
              <p className="text-sm text-slate-500">No variations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#070B14] text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Variation ID</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Last Sync</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {variants.map((variant) => (
                      <tr key={variant.woo_variation_id}>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {variant.woo_variation_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-yellow-200/80">
                          {variant.sku || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {money(variant.price)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {variant.stock_status || "-"} / Qty:{" "}
                          {variant.stock_quantity ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {dateText(variant.last_synced_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-yellow-300" />
              <h2 className="font-semibold text-white">Images</h2>
            </div>

            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name || "Woo product"}
                className="mb-4 aspect-square w-full rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-2xl border border-white/10 bg-[#070B14] text-slate-500">
                <ImageIcon size={42} />
              </div>
            )}

            {images.length === 0 ? (
              <p className="text-sm text-slate-500">No product images found.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image) => (
                  <a
                    key={image.id}
                    href={image.image_src}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-white/10 bg-[#070B14]"
                  >
                    <img
                      src={image.image_src}
                      alt={image.image_alt || image.image_name || "Woo image"}
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <h2 className="mb-3 font-semibold text-white">Description</h2>

            <div
              className="text-sm leading-6 text-slate-300"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  product.short_description ||
                    product.description ||
                    "<p>No description found.</p>"
                ),
              }}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}