import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImageOff,
  Loader2,
  Save,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { darazProductsApi } from "../../../../config/sub_api/daraz_api/daraz_products_api";
import Loader from "../../../../components/common/Loader";

function ProductImage({ src, title }) {
  if (!src) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-600">
        <ImageOff size={22} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || "Product"}
      className="h-24 w-24 shrink-0 rounded-xl border border-slate-800 object-cover"
    />
  );
}

export default function DarazEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);

  const [form, setForm] = useState({
    name: "",
    short_description: "",
    brand: "",
    price: "",
    sale_price: "",
    quantity: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await darazProductsApi.view(id);
        const payload = res?.data?.data;
        const data = payload?.product || payload;
        const variantList = Array.isArray(payload?.variants) ? payload.variants : [];

        if (!active) return;

        if (!data) {
          setError("Daraz product not found.");
          return;
        }

        let attributes = {};
        try {
          attributes = typeof data.attributes_json === "string"
            ? JSON.parse(data.attributes_json)
            : data.attributes_json || {};
        } catch {
          attributes = {};
        }

        setProduct(data);
        setVariants(variantList);
        setForm({
          name: data.name || attributes.name || "",
          short_description:
            data.short_description ||
            data.description ||
            attributes.short_description ||
            attributes.description ||
            "",
          brand: data.brand || attributes.brand || "",
          price: data.price ?? "",
          sale_price: data.sale_price ?? "",
          quantity: data.quantity ?? "",
        });
      } catch (err) {
        if (!active) return;
        setError(
          err?.friendlyMessage ||
            err?.response?.data?.message ||
            "Failed to load this Daraz product."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) load();

    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.short_description.trim()) payload.short_description = form.short_description.trim();
      if (form.brand.trim()) payload.brand = form.brand.trim();
      if (form.price !== "") payload.price = Number(form.price);
      if (form.sale_price !== "") payload.sale_price = Number(form.sale_price);
      if (form.quantity !== "") payload.quantity = Number(form.quantity);

      await darazProductsApi.update(id, payload);

      setSuccess("Product updated and pushed to Daraz successfully.");

      setTimeout(() => {
        navigate("/product/daraz-products");
      }, 900);
    } catch (err) {
      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          "Failed to update this product on Daraz."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-950 p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/product/daraz-products"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-yellow-300"
        >
          <ArrowLeft size={16} />
          Back to Daraz Products
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <h1 className="text-lg font-semibold text-white">Edit Daraz Product</h1>
          <p className="mt-1 text-xs text-slate-400">
            Changes here are pushed directly to your live Daraz store via the
            Daraz Open Platform API.
          </p>

          {loading ? (
            <Loader label="Loading product..." className="mt-8" />
          ) : error && !product ? (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div className="mt-5 flex gap-4">
                <ProductImage src={product?.main_image} title={product?.name} />
                <div>
                  <p className="text-xs text-slate-500">
                    SKU: {product?.seller_sku || "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Item ID: {product?.daraz_item_id || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Account: #{product?.account_id ?? "-"}
                  </p>
                </div>
              </div>

              {variants.length > 0 && (
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-yellow-300">Daraz SKU Variants</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="px-2 py-2 text-left">Seller SKU</th>
                          <th className="px-2 py-2 text-right">Price</th>
                          <th className="px-2 py-2 text-right">Sale Price</th>
                          <th className="px-2 py-2 text-right">Qty</th>
                          <th className="px-2 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {variants.map((variant) => (
                          <tr key={variant.id || variant.seller_sku}>
                            <td className="px-2 py-2 text-slate-200">{variant.seller_sku || "-"}</td>
                            <td className="px-2 py-2 text-right text-slate-300">{variant.price ?? "-"}</td>
                            <td className="px-2 py-2 text-right text-slate-300">{variant.sale_price ?? "-"}</td>
                            <td className="px-2 py-2 text-right text-slate-300">{variant.quantity ?? "0"}</td>
                            <td className="px-2 py-2 text-slate-400">{variant.status || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Short Description
                  </label>
                  <textarea
                    value={form.short_description}
                    onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))}
                    className="min-h-[80px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">
                      Sale Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.sale_price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sale_price: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <Link
                    to="/product/daraz-products"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-slate-300 hover:border-slate-500"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-yellow-500 px-4 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save &amp; Push to Daraz
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
