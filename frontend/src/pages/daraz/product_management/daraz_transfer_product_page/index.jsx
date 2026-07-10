import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Search, Send } from "lucide-react";
import { localProductsApi } from "../../../../config/sub_api/product_management_api/local_products_api";
import { marketplaceApi } from "../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { darazCatalogApi } from "../../../../config/sub_api/daraz_api/daraz_catalog_api";
import Loader from "../../../../components/common/Loader";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-slate-400";

export default function DarazTransferProductPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [skuRows, setSkuRows] = useState([]);

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [brand, setBrand] = useState("No Brand");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    marketplaceApi
      .getAccounts({ platform_code: "DARAZ" })
      .then((res) => {
        const list = res?.data?.data || res?.data || [];
        setAccounts(list);
        if (list[0]?.id) setAccountId(String(list[0].id));
      })
      .catch(() => setAccounts([]));
  }, []);

  async function searchProducts() {
    try {
      setLoadingProducts(true);
      const res = await localProductsApi.getProducts({ search, limit: 20 });
      const list = res?.data?.data || res?.data?.rows || res?.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    searchProducts();
  }, []);

  async function selectProduct(productSummary) {
    setError("");
    setSuccess(null);
    setLoadingDetail(true);

    try {
      const res = await localProductsApi.getProductById(productSummary.id);
      const product = res?.data?.data || res?.data;
      setSelected(product);

      const variants = product?.variants?.length
        ? product.variants
        : [{ variant_sku: product?.sku, colour_name: null, image_url: null }];

      const rows = await Promise.all(
        variants.map(async (variant) => {
          const sku = variant.variant_sku || product?.sku;
          let price = 0;
          let quantity = 0;

          try {
            const priceRes = await localProductsApi.getPriceBySku(sku);
            const priceData = priceRes?.data?.data || priceRes?.data;
            price = priceData?.daraz_price || priceData?.sale_price || 0;
          } catch {
            /* no price record yet */
          }

          try {
            const invRes = await localProductsApi.getInventoryBySku(sku);
            const invData = invRes?.data?.data || invRes?.data;
            quantity = invData?.available_qty ?? invData?.stock_qty ?? 0;
          } catch {
            /* no inventory record yet */
          }

          return {
            sellerSku: sku,
            price,
            quantity,
            images: variant.image_url ? [variant.image_url] : [],
          };
        })
      );

      setSkuRows(rows);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load product details.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleTransfer() {
    setError("");
    setSuccess(null);

    if (!accountId) return setError("Select a Daraz account.");
    if (!primaryCategory) return setError("Daraz primary category ID is required.");
    if (!selected) return setError("Select a local product first.");

    const productImages = (selected.images || [])
      .map((img) => img.image_url)
      .filter(Boolean);

    const payload = {
      primaryCategory,
      name: selected.product_name,
      shortDescription: selected.description || "",
      brand,
      images: productImages,
      skus: skuRows.map((row) => ({
        sellerSku: row.sellerSku,
        price: Number(row.price || 0),
        quantity: Number(row.quantity || 0),
        images: row.images,
      })),
    };

    try {
      setSending(true);
      const res = await darazCatalogApi.createProduct(accountId, payload);
      const created = res?.data?.data?.data || res?.data?.data || res?.data;
      setSuccess(created);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Transfer to Daraz failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-950 p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <h1 className="text-lg font-semibold text-white">Transfer Local Product → Daraz</h1>
          <p className="mt-1 text-xs text-slate-400">
            Pick a product from this system and push it to Daraz as a new listing (CreateProduct).
          </p>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span>Transferred. Daraz item_id: {success?.item_id || success?.data?.item_id || "-"}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                placeholder="Search local products..."
                className={inputClass}
              />
              <button
                onClick={searchProducts}
                className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
              >
                <Search size={16} />
              </button>
            </div>

            {loadingProducts ? (
              <Loader label="Loading..." className="py-6" minHeight="0" />
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => selectProduct(product)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-[12px] ${
                      selected?.id === product.id
                        ? "border-yellow-500 bg-yellow-500/10 text-yellow-200"
                        : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-medium">{product.product_name}</div>
                    <div className="text-[10px] text-slate-500">SKU: {product.sku}</div>
                  </button>
                ))}
                {!products.length && (
                  <p className="py-4 text-center text-xs text-slate-500">No products found.</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            {!selected ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Select a product on the left to review it.
              </p>
            ) : loadingDetail ? (
              <Loader label="Loading details..." className="py-10" minHeight="0" />
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">{selected.product_name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{selected.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Daraz Account</label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name || acc.account_code || `#${acc.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Primary Category ID</label>
                    <input
                      value={primaryCategory}
                      onChange={(e) => setPrimaryCategory(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. 6614"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Brand</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <p className="text-xs font-medium text-slate-400">
                    SKUs to transfer ({skuRows.length})
                  </p>
                  {skuRows.map((row, index) => (
                    <div key={row.sellerSku + index} className="grid grid-cols-3 gap-2 text-xs">
                      <input
                        value={row.sellerSku}
                        readOnly
                        className={`${inputClass} bg-slate-900 text-slate-400`}
                      />
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) =>
                          setSkuRows((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, price: e.target.value } : r))
                          )
                        }
                        className={inputClass}
                      />
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          setSkuRows((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r))
                          )
                        }
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end border-t border-slate-800 pt-4">
                  <button
                    onClick={handleTransfer}
                    disabled={sending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-yellow-500 px-3 text-[12px] font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Transfer to Daraz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
