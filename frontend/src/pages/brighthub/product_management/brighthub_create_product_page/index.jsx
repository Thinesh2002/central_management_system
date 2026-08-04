import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PackagePlus, Save, Loader2 } from "lucide-react";
import { brighthubProductApi } from "../../../../config/sub_api/brighthub_api/brighthub_product_api";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#070B14] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-yellow-400/60";

const emptyForm = {
  name: "",
  sku: "",
  price: "",
  sale_price: "",
  stock_quantity: "",
  category_id: "",
  status: "active",
  short_description: "",
  description: "",
};

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function BrightHubCreateProductPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.price || Number(form.price) <= 0) return setError("Enter a valid price.");

    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      status: form.status,
    };

    if (form.sku.trim()) payload.sku = form.sku.trim();
    if (form.sale_price) payload.sale_price = Number(form.sale_price);
    if (form.stock_quantity !== "") payload.stock_quantity = Number(form.stock_quantity);
    if (form.category_id) payload.category_id = Number(form.category_id);
    if (form.short_description.trim()) payload.short_description = form.short_description.trim();
    if (form.description.trim()) payload.description = form.description.trim();

    try {
      await brighthubProductApi.createBrightHubProduct(accountId, payload);
      navigate("/product/brighthub-products");
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.friendlyMessage || "Failed to create the Website product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#070B14] px-4 py-8 text-slate-100 md:px-6">
      <div className="w-full max-w-xl">
        <div className="mb-5">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
            <PackagePlus size={20} className="text-yellow-300" />
            Add Website Product
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Creates a new product directly on BrightHub (admin.brighthub.lk). Leave SKU blank to let BrightHub
            generate a BHID/SKU automatically.
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

          <Field label="SKU" hint="Optional — BrightHub generates one automatically if left blank.">
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

            <Field label="Sale Price" hint="Optional discounted price.">
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

            <Field label="Category ID" hint="From the BrightHub admin panel.">
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.category_id}
                onChange={(e) => updateField("category_id", e.target.value)}
              />
            </Field>
          </div>

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
            {saving ? "Creating..." : "Create Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
