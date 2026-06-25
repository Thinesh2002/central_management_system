import { Eye, Package, Truck } from "lucide-react";
import {
  formatDate,
  getAccountCode,
  getAccountName,
  getCreatedDate,
  getCustomerName,
  getCustomerPhone,
  getItemTitle,
  getOrderCurrency,
  getOrderNumber,
  getOrderRouteId,
  getOrderStatus,
  getOrderTotal,
  getShippingCity,
  getShippingMethod,
  getShippingProvider,
  getTrackingNumber,
  money,
  normalizeStatusKey,
} from "../utils/daraz_order_utils";

export default function DarazOrderTable({ orders, accountsByCode, loading, onOpenImage, onOpenDetail }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        <TableHeader />

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Package size={28} className="text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No Daraz orders found.</p>
            <p className="text-[12px] text-slate-500">Change filter or search again.</p>
          </div>
        )}

        {orders.map((order, index) => (
          <OrderRow
            key={`${order._group_key || getOrderNumber(order)}-${index}`}
            order={order}
            accountsByCode={accountsByCode}
            onOpenImage={onOpenImage}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[36px_minmax(470px,1.8fr)_130px_170px_115px_145px_105px_74px_52px] gap-3 border-b border-white/[0.05] bg-[#111927] px-4 py-2.5 text-[11px] font-semibold text-slate-500">
      <div></div>
      <div>Order ID / SKU / Product / Image</div>
      <div>Account</div>
      <div>Customer</div>
      <div>Product Price</div>
      <div>Shipping</div>
      <div>Date</div>
      <div>Status</div>
      <div className="text-right">View</div>
    </div>
  );
}

function OrderRow({ order, accountsByCode, onOpenImage, onOpenDetail }) {
  const routeId = order._route_id || getOrderRouteId(order);
  const currency = getOrderCurrency(order);
  const accountCode = getAccountCode(order);
  const accountName = getAccountName(order, accountsByCode);
  const dateParts = formatDate(getCreatedDate(order)).split(",");

  return (
    <article onDoubleClick={() => onOpenDetail(order)} className="min-w-[1200px] border-b border-white/[0.04] bg-[#0b111b] transition hover:bg-[#101827]">
      <div className="grid grid-cols-[36px_minmax(470px,1.8fr)_130px_170px_115px_145px_105px_74px_52px] gap-3 px-4 py-3">
        <div className="pt-1">
          <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-transparent accent-orange-500" onClick={(event) => event.stopPropagation()} />
        </div>

        <ProductSummary order={order} onOpenImage={onOpenImage} />
        <MarketplaceBadge accountName={accountName} accountCode={accountCode} />

        <div className="min-w-0 pt-1">
          <p className="truncate text-[12px] font-semibold text-slate-200">{getCustomerName(order)}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{getCustomerPhone(order)}</p>
          <p className="mt-1 truncate text-[11px] text-slate-500">{getShippingCity(order)}</p>
        </div>

        <div className="pt-1 text-[12px] font-semibold text-slate-200">{money(getOrderTotal(order), currency)}</div>

        <div className="min-w-0 pt-1">
          <p className="truncate text-[12px] font-semibold text-orange-400">{getShippingMethod(order)}</p>
          <div className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
            <Truck size={12} className="shrink-0 text-slate-500" />
            <span className="truncate">{getShippingProvider(order)}</span>
          </div>
          <p className="mt-1 truncate text-[10px] text-slate-500">{getTrackingNumber(order)}</p>
        </div>

        <div className="pt-1 text-[11px] font-medium text-slate-300">
          <p>{dateParts[0]}</p>
          <p className="mt-1 text-slate-500">{dateParts[1] || ""}</p>
        </div>

        <div className="pt-1"><StatusBadge status={getOrderStatus(order)} /></div>

        <div className="flex items-start justify-end pt-0.5">
          <button
            type="button"
            onClick={() => onOpenDetail(order)}
            disabled={!routeId}
            title="View order"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[#111927] text-slate-300 transition hover:bg-orange-500/15 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSummary({ order, onOpenImage }) {
  const items = order._items || [];
  const firstItem = items[0] || {};
  const title = firstItem.title || getItemTitle(order, order) || "-";
  const isMultiLine = Boolean(order._is_multiline);
  const extraCount = Math.max(0, items.length - 1);
  const hasSku = items.some((item) => item?.sku);

  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold leading-tight text-orange-400">
        Order ID: <span className="font-bold">{getOrderNumber(order)}</span>
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {hasSku ? items.map((item, index) => <SkuBadge key={`${item.rowId || item.sku || index}`} sku={item.sku} quantity={item.quantity} />) : <span className="rounded bg-[#16202d] px-1.5 py-[2px] text-[9px] font-semibold text-slate-500 ring-1 ring-white/[0.05]">SKU -</span>}
      </div>

      <p className={`mt-1 max-w-[620px] truncate text-[12px] ${isMultiLine ? "font-semibold text-slate-200" : "font-medium text-slate-300"}`}>
        {isMultiLine ? `Multi Orders${extraCount > 0 ? ` +${extraCount}` : ""}` : title}
      </p>

      <ProductImages items={items} order={order} onOpenImage={onOpenImage} />
    </div>
  );
}

function SkuBadge({ sku, quantity }) {
  if (!sku) return null;
  return (
    <span className="inline-flex max-w-[160px] items-center gap-1 rounded bg-orange-500/10 px-1.5 py-[2px] text-[9px] font-semibold leading-none text-orange-200 ring-1 ring-orange-400/15">
      <span className="shrink-0 text-orange-400">SKU</span>
      <span className="truncate tracking-normal">{sku}</span>
      <span className="text-orange-300/70">x{quantity || 1}</span>
    </span>
  );
}

function ProductImages({ items, order, onOpenImage }) {
  const visibleItems = items.filter((item) => item.image).slice(0, 6);

  if (visibleItems.length === 0) {
    return <div className="mt-2 flex h-11 w-32 items-center justify-center rounded-lg bg-[#0f1621] text-[11px] font-semibold text-slate-500"><Package size={14} className="mr-1" /> No image</div>;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {visibleItems.map((item, index) => <ItemImage key={`${item.image}-${item.lineIndex || index}`} item={item} order={order} onOpenImage={onOpenImage} />)}
    </div>
  );
}

function ItemImage({ item, order, onOpenImage }) {
  return (
    <button
      type="button"
      title="Open product image"
      onClick={(event) => {
        event.stopPropagation();
        onOpenImage?.({ src: item.image, title: item.title, orderId: getOrderNumber(order), darazId: item.darazId, sku: item.sku });
      }}
      className="group/image flex h-11 w-11 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/10 transition hover:ring-orange-400/60"
    >
      <img src={item.image} alt={item.title || "Product"} className="h-full w-full object-cover transition duration-300 group-hover/image:scale-110" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
    </button>
  );
}

function MarketplaceBadge({ accountName, accountCode }) {
  return (
    <div className="min-w-0 pt-1">
      <p className="text-[14px] font-black leading-none text-[#ff6a00]">daraz</p>
      <p className="mt-1 max-w-[110px] truncate text-[12px] font-semibold text-slate-300">{accountName}</p>
      <p className="mt-0.5 max-w-[110px] truncate text-[11px] font-medium text-slate-500">{accountCode || "-"}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const key = normalizeStatusKey(status);
  if (key === "delivered") return <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">{status}</span>;
  if (key === "canceled") return <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">{status}</span>;
  if (key === "ready_to_ship" || key === "packed") return <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-300">{status}</span>;
  return <span className="rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">{status}</span>;
}
