import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PackageCheck, Save, Loader2 } from "lucide-react";
import { brighthubProductApi } from "../../../../config/sub_api/brighthub_api/brighthub_product_api";
import Loader from "../../../../components/common/Loader";
import BrightHubImageUploader, { normalizeBrightHubImages } from "../components/BrightHubImageUploader";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#070B14] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-yellow-400/60";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function BrightHubEditProductPage() {
  const { accountId, bhid } = useParams();
  const navigate = useNavigate();

  // Full live object from BrightHub, kept as-is so fields the form doesn't
  // expose (images, variant_attributes, etc.) survive the PUT unchanged -
  // BrightHub's update is a full replace, anything omitted gets cleared.
  const [liveProduct, setLiveProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadProduct() {
    setLoading(true);
    setError("");

    try {
      const res = await brighthubProductApi.getLiveBrightHubProduct(accountId, bhid);
      const product = res?.data?.data;

      if (!product) throw new Error("Product not found on BrightHub.");

      setLiveProduct(product);
      setImages(normalizeBrightHubImages(product.images));
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        price: product.price ?? "",
        sale_price: product.sale_price ?? "",
        stock_quantity: product.stock_quantity ?? "",
        category_id: product.category_id ?? "",
        status: product.status || "active",
        short_description: product.short_description || "",
        description: product.description || "",
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.friendlyMessage || "Failed to load the live BrightHub product.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, bhid]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.price || Number(form.price) <= 0) return setError("Enter a valid price.");

    setSaving(true);
    setError("");

    // Start from the full live object (preserves images/variant_attributes/
    // anything the form doesn't show), then overlay only the edited fields.
    const payload = {
      ...liveProduct,
      name: form.name.trim(),
      sku: form.sku.trim() || liveProduct.sku,
      price: Number(form.price),
      status: form.status,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock_quantity: form.stock_quantity !== "" ? Number(form.stock_quantity) : liveProduct.stock_quantity,
      category_id: form.category_id ? Number(form.category_id) : liveProduct.category_id,
      short_description: form.short_description,
      description: form.description,
      images,
    };

    delete payload.id;
    delete payload.bhid;

    try {
      await brighthubProductApi.updateBrightHubProduct(accountId, bhid, payload);
      navigate(`/product/brighthub-products/${accountId}/${bhid}`);
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.friendlyMessage || "Failed to update the Website product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14]">
        <Loader label="Loading Website product..." minHeight="100vh" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
          {error || "Product not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#070B14] px-4 py-8 text-slate-100 md:px-6">
      <div className="w-full max-w-xl">
        <div className="mb-5">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
            <PackageCheck size={20} className="text-yellow-300" />
            Edit Website Product — {bhid}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Loaded live from BrightHub. Fields not shown here are kept as-is.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-white/10 bg-[#0D1322] p-5"
        >
          <Field label="Product Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </Field>

          <Field label="SKU">
            <input
              className={inputClass}
              value={form.sku}
              onChange={(e) => updateField("sku", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                required
              />
            </Field>

            <Field label="Sale Price">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.sale_price}
                onChange={(e) => updateField("sale_price", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stock Quantity">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.stock_quantity}
                onChange={(e) => updateField("stock_quantity", e.target.value)}
              />
            </Field>

            <Field label="Category ID">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.category_id}
                onChange={(e) => updateField("category_id", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Images">
            <BrightHubImageUploader accountId={accountId} images={images} onChange={setImages} />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <Field label="Short Description">
            <textarea
              rows={2}
              className={inputClass}
              value={form.short_description}
              onChange={(e) => updateField("short_description", e.target.value)}
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={5}
              className={inputClass}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 text-[12px] font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving..." : "Update Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
