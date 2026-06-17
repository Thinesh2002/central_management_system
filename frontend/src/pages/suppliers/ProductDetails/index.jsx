import { API_BASE_URL } from "../../../config/api";

export default function ProductDetailsPopup({
  open,
  onClose,
  product,
}) {
  if (!open || !product) return null;

  const imageName =
    product.product_image ||
    product.main_image ||
    product.image;

  const imageUrl =
    product.image_url ||
    (product.sku && imageName
      ? `${API_BASE_URL}/images/productimage/${product.sku}/${imageName}`
      : "");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-[#0d1726] border border-yellow-400/30 shadow-2xl shadow-yellow-400/20 overflow-hidden">
        <div className="border-b border-white/10 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              Product Details
            </h2>

            <p className="text-slate-300 text-sm">
              SKU wise supplier product details
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-3xl bg-[#081221] border border-white/10 p-4">
            <div className="aspect-square rounded-2xl bg-[#07111f] border border-white/10 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <p className="text-slate-500">
                  No Image
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Info
              label="SKU"
              value={product.sku}
              highlight
            />

            <Info
              label="Product Name"
              value={product.product_name}
            />

            <Info
              label="Supplier"
              value={product.supplier_name}
            />

            <Info
              label="Supplier Phone"
              value={product.phone}
            />

            <Info
              label="Purchase Price"
              value={`Rs. ${Number(
                product.purchase_price || 0
              ).toFixed(2)}`}
            />

            <Info
              label="Qty"
              value={product.moq}
            />

            <Info
              label="Lead Time"
              value={`${product.lead_time_days || 0} Days`}
            />

            <Info
              label="Notes"
              value={product.notes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  highlight,
}) {
  return (
    <div className="rounded-2xl bg-[#081221] border border-white/10 p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 font-semibold break-words ${
          highlight
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}