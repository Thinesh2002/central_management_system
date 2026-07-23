import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Package, Tags, Database } from "lucide-react";
import { useParams } from "react-router-dom";
import { brighthubProductApi } from "../../../../config/sub_api/brighthub_api/brighthub_product_api";
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
  return Number.isFinite(number) ? number.toFixed(2) : "-";
}

function dateText(value) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function Badge({ value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    red: "border-red-400/30 bg-red-400/10 text-red-300",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {value || "-"}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#070B14] p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

export default function BrightHubProductDetailPage() {
  const { accountId, bhid } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const raw = useMemo(() => parseJson(product?.raw_json, {}), [product]);
  const images = useMemo(() => {
    const list = parseJson(product?.images_json, raw.images || []);
    return Array.isArray(list) ? list : [];
  }, [product, raw]);
  const usageImages = useMemo(() => (Array.isArray(raw.usage_images) ? raw.usage_images : []), [raw]);

  const mainImage = raw.image_main_url || images?.[0]?.image_url;

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const res = await brighthubProductApi.getSyncedBrightHubProductDetail(accountId, bhid);
      setProduct(res?.data?.data || null);
    } catch (err) {
      setProduct(null);
      setError(err?.friendlyMessage || "Failed to load BrightHub product details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, bhid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14]">
        <Loader label="Loading Website product..." minHeight="100vh" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || "BrightHub product not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200">
          <Package size={13} />
          BHID {product.bhid}
        </div>

        <h1 className="max-w-5xl text-xl font-semibold text-white">{product.name || "Unnamed Product"}</h1>

        <p className="mt-1 font-mono text-xs text-yellow-200/80">SKU: {product.sku || "-"}</p>
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
                <p className="text-xs text-slate-400">Synced data from BrightHub.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Info label="BHID" value={product.bhid} />
              <Info label="Category" value={raw.category_name || "-"} />
              <Info label="Status" value={<Badge value={product.status} tone={product.status === "active" ? "green" : "red"} />} />
              <Info label="Price" value={money(product.price)} />
              <Info label="Sale Price" value={money(raw.sale_price)} />
              <Info label="Stock Quantity" value={raw.stock_quantity ?? "-"} />
              <Info label="Views" value={raw.views ?? "-"} />
              <Info label="Total Sales" value={raw.total_sales ?? "-"} />
              <Info label="Child Products" value={raw.children_count ?? "-"} />
              <Info label="Created At" value={dateText(raw.created_at)} />
              <Info label="Updated At" value={dateText(raw.updated_at)} />
              <Info label="Last Synced" value={dateText(product.last_synced_at)} />
            </div>
          </div>

          {(raw.features || raw.attributes) && (
            <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-2">
                <Tags size={18} className="text-yellow-300" />
                <h2 className="font-semibold text-white">Features / Attributes</h2>
              </div>

              <div
                className="text-sm leading-6 text-slate-300"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(raw.features || raw.attributes || "") }}
              />
            </div>
          )}
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
                alt={product.name || "Website product"}
                className="mx-auto mb-4 h-40 w-40 rounded-2xl border border-white/10 bg-white object-contain"
              />
            ) : (
              <div className="mx-auto mb-4 flex h-40 w-40 items-center justify-center rounded-2xl border border-white/10 bg-[#070B14] text-slate-500">
                <ImageIcon size={32} />
              </div>
            )}

            {images.length === 0 ? (
              <p className="text-sm text-slate-500">No product images found.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image) => (
                  <a
                    key={image.id}
                    href={image.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-white/10 bg-[#070B14]"
                  >
                    <img src={image.image_url} alt={product.name || "Website image"} className="aspect-square w-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            {usageImages.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs font-medium uppercase text-slate-500">Usage Images</p>
                <div className="grid grid-cols-3 gap-2">
                  {usageImages.map((image) => (
                    <a
                      key={image.id}
                      href={image.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border border-white/10 bg-[#070B14]"
                    >
                      <img src={image.image_url} alt="Usage" className="aspect-square w-full object-cover" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <h2 className="mb-3 font-semibold text-white">Short Description</h2>

            <div
              className="text-sm leading-6 text-slate-300"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(raw.short_description || "<p>No short description found.</p>"),
              }}
            />
          </section>
        </aside>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
        <h2 className="mb-3 font-semibold text-white">Description</h2>

        <div
          className="text-sm leading-6 text-slate-300"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(raw.description || "<p>No description found.</p>"),
          }}
        />
      </div>
    </div>
  );
}
