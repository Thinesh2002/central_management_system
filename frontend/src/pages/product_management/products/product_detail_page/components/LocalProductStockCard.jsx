function pickFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getStockSummary(product = {}) {
  const summary = product.inventory_summary || {};

  const stockQty = toNumber(
    pickFirstValue(
      summary.stock_qty,
      product.stock_qty,
      product.stock,
      product.quantity,
      product.qty,
      product.current_stock
    ),
    0
  );

  const reservedQty = toNumber(
    pickFirstValue(
      summary.reserved_qty,
      product.reserved_qty,
      product.reserved_stock,
      product.allocated_qty
    ),
    0
  );

  const availableQty = toNumber(
    pickFirstValue(
      summary.available_qty,
      product.available_qty,
      product.available_stock,
      product.available
    ),
    Math.max(stockQty - reservedQty, 0)
  );

  return {
    stockQty,
    reservedQty,
    availableQty,
    status:
      product.stock_status ||
      summary.stock_status ||
      (availableQty > 0 ? "In Stock" : "Out of Stock"),
  };
}

export default function LocalProductStockCard({ product = {} }) {
  const { stockQty, reservedQty, availableQty, status } = getStockSummary(product);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Product Inventory
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Stock details from product inventory API
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            availableQty > 0
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
          <p className="text-xs text-slate-500">Total Stock</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            {stockQty}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
          <p className="text-xs text-slate-500">Reserved</p>
          <p className="mt-1 text-lg font-semibold text-yellow-300">
            {reservedQty}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
          <p className="text-xs text-slate-500">Available</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">
            {availableQty}
          </p>
        </div>
      </div>
    </section>
  );
}