import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../../../config/api";
import { supplierApi } from "../../../config/sub_api/supplierApi";

const initialForm = {
  supplier_id: "",
  sku: "",
  product_name: "",
  product_image: "",
  purchase_price: "",
  moq: "1",
  lead_time_days: "0",
  notes: "",
};

export default function SupplierProductModal({
  open,
  onClose,
  editingProduct,
  suppliers,
  onSuccess,
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuMessage, setSkuMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    if (editingProduct) {
      setForm({
        supplier_id: editingProduct.supplier_id || "",
        sku: editingProduct.sku || "",
        product_name: editingProduct.product_name || "",
        product_image: editingProduct.product_image || editingProduct.main_image || "",
        purchase_price: editingProduct.purchase_price || "",
        moq: editingProduct.moq || "1",
        lead_time_days: editingProduct.lead_time_days || "0",
        notes: editingProduct.notes || "",
      });

      if (editingProduct.sku && (editingProduct.product_image || editingProduct.main_image)) {
        setPreviewImage(
          `${API_BASE_URL}/images/productimage/${editingProduct.sku}/${editingProduct.product_image || editingProduct.main_image}`
        );
      } else {
        setPreviewImage("");
      }
    } else {
      setForm(initialForm);
      setPreviewImage("");
      setSkuMessage("");
    }
  }, [editingProduct, open]);

  if (!open) return null;

  const getImageUrl = (sku, image) => {
    if (!sku || !image) return "";
    return `${API_BASE_URL}/images/productimage/${sku}/${image}`;
  };

  const findProductBySku = async (skuValue) => {
    const cleanSku = skuValue.trim();

    if (!cleanSku) {
      setSkuMessage("");
      setPreviewImage("");
      return;
    }

    try {
      setSkuLoading(true);
      setSkuMessage("");

      const productsRes = await API.get("/products");
      const products = productsRes.data?.data || [];

      const parentProduct = products.find(
        (item) =>
          item.parent_sku?.toLowerCase() === cleanSku.toLowerCase()
      );

      if (parentProduct) {
        setForm((prev) => ({
          ...prev,
          sku: parentProduct.parent_sku || cleanSku,
          product_name: parentProduct.product_name || "",
          product_image: parentProduct.main_image || "",
        }));

        setPreviewImage(
          getImageUrl(parentProduct.parent_sku, parentProduct.main_image)
        );

        setSkuMessage("Product found");
        return;
      }

      for (const product of products) {
        if (!product.parent_sku) continue;

        try {
          const variationRes = await API.get(
            `/products/${product.parent_sku}/variations`
          );

          const variations = variationRes.data?.data || [];

          const variation = variations.find(
            (item) =>
              item.sku?.toLowerCase() === cleanSku.toLowerCase()
          );

          if (variation) {
            const titleParts = [
              product.product_name,
              variation.color,
              variation.size,
            ].filter(Boolean);

            setForm((prev) => ({
              ...prev,
              sku: variation.sku || cleanSku,
              product_name: titleParts.join(" - "),
              product_image: variation.main_image || "",
            }));

            setPreviewImage(
              getImageUrl(variation.sku, variation.main_image)
            );

            setSkuMessage("Variation found");
            return;
          }
        } catch (error) {
          console.error("Variation check error:", error);
        }
      }

      setForm((prev) => ({
        ...prev,
        product_name: "",
        product_image: "",
      }));

      setPreviewImage("");
      setSkuMessage("No product found for this SKU");
    } catch (error) {
      console.error("Find product by SKU error:", error);
      setSkuMessage("Failed to check SKU");
    } finally {
      setSkuLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    if (e.target.name === "sku") {
      setSkuMessage("");
    }
  };

  const handleSkuBlur = () => {
    findProductBySku(form.sku);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingProduct) {
        await supplierApi.updateSupplierProduct(editingProduct.id, form);
      } else {
        await supplierApi.createSupplierProduct(form);
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-[#0d1726] border border-yellow-400/30 shadow-2xl shadow-yellow-400/20 animate-[fadeIn_.25s_ease]">
        <div className="border-b border-white/10 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              {editingProduct ? "Edit SKU Supplier" : "Assign SKU to Supplier"}
            </h2>
            <p className="text-slate-300 text-sm">
              Type SKU and click outside to auto load product title and image
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-slate-300">Supplier *</label>
                <select
                  name="supplier_id"
                  value={form.supplier_id}
                  onChange={handleChange}
                  className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-300">SKU *</label>
                <input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  onBlur={handleSkuBlur}
                  className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
                  placeholder="Type SKU and click outside"
                />
                {skuMessage && (
                  <p
                    className={`text-xs mt-2 ${
                      skuMessage.includes("found")
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {skuLoading ? "Checking SKU..." : skuMessage}
                  </p>
                )}
              </div>

              <Input
                name="product_name"
                label="Product Name"
                value={form.product_name}
                onChange={handleChange}
              />

              <Input
                name="purchase_price"
                label="Purchase Price"
                type="number"
                value={form.purchase_price}
                onChange={handleChange}
              />

              <Input
                name="moq"
                label="Qty"
                type="number"
                value={form.moq}
                onChange={handleChange}
              />

              <Input
                name="lead_time_days"
                label="Lead Time Days"
                type="number"
                value={form.lead_time_days}
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <label className="text-sm text-slate-300">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-[#081221] border border-white/10 p-4 flex flex-col items-center justify-center min-h-[280px]">
              <div className="w-full aspect-square rounded-2xl bg-[#07111f] border border-white/10 overflow-hidden flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={form.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-500 px-5">
                    Product image will show here
                  </div>
                )}
              </div>

              <div className="w-full mt-4">
                <p className="text-xs text-slate-400">Selected Product</p>
                <p className="text-sm font-semibold text-white mt-1 break-words">
                  {form.product_name || "-"}
                </p>

                <p className="text-xs text-slate-400 mt-3">SKU</p>
                <p className="text-sm font-semibold text-yellow-400 break-words">
                  {form.sku || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-yellow-400 text-[#07111f] font-semibold hover:shadow-lg hover:shadow-yellow-400/40 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save SKU Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
      />
    </div>
  );
}