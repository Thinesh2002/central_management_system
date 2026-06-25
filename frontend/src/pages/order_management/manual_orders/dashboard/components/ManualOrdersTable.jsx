import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import ManualOrderRow from "./ManualOrderRow";
import ProductImagePopup from "./ProductImagePopup";

export default function ManualOrdersTable({
  rows = [],
  loading,
  deleteId,
  productMap,
  onView,
  onEdit,
  onDelete,
}) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <>
      <section className="overflow-hidden rounded-xl bg-[#0b1019] shadow-xl shadow-black/20 ring-1 ring-white/[0.06]">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <TableHeader />

            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Loader2 size={28} className="animate-spin text-orange-400" />
                <p className="text-sm font-bold text-slate-300">Loading orders...</p>
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Package size={30} className="text-slate-600" />
                <p className="text-sm font-bold text-slate-300">No manual orders found.</p>
              </div>
            )}

            {!loading &&
              rows.map((order, index) => (
                <ManualOrderRow
                  key={order?.order_id || order?.id || index}
                  order={order}
                  index={index}
                  deleteId={deleteId}
                  productMap={productMap}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenImage={setSelectedImage}
                />
              ))}
          </div>
        </div>
      </section>

      <ProductImagePopup
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[36px_170px_minmax(440px,1.8fr)_190px_125px_125px_100px] gap-3 border-b border-white/[0.05] bg-[#111927] px-4 py-2.5 text-[11px] font-semibold text-slate-500">
      <div></div>
      <div>Order</div>
      <div>Product / SKU / Image</div>
      <div>Customer</div>
      <div>Payment</div>
      <div>Total</div>
      <div className="text-right">Action</div>
    </div>
  );
}