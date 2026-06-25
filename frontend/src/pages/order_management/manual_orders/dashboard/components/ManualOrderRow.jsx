import { Edit, Eye, Loader2, Package, Trash2 } from "lucide-react";

import ProductImage from "./ProductImage";
import OrderStatusBadge from "./OrderStatusBadge";

import { dateOnly, money } from "../utils/orderFrontendHelpers";

import {
  getCustomerName,
  getCustomerPhone,
  getItemCount,
  getOrderDate,
  getOrderId,
  getOrderSku,
  getOrderStatus,
  getOrderTotal,
  getPaymentMethod,
  getProductImage,
  getProductTitle,
} from "../utils/orderSelectors";

export default function ManualOrderRow({
  order,
  index,
  deleteId,
  productMap,
  onView,
  onEdit,
  onDelete,
  onOpenImage,
}) {
  const orderId = String(getOrderId(order) || "");
  const sku = getOrderSku(order);
  const title = getProductTitle(order, productMap);
  const image = getProductImage(order, productMap);
  const itemCount = getItemCount(order);
  const deleting = deleteId === orderId;

  return (
    <article className="min-w-[1200px] border-b border-white/[0.04] bg-[#0b111b] transition duration-200 hover:bg-[#101827]">
      <div className="grid grid-cols-[36px_170px_minmax(440px,1.8fr)_190px_125px_125px_100px] gap-3 px-4 py-3">
        <div className="pt-1">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-transparent accent-orange-500"
            onClick={(event) => event.stopPropagation()}
          />
        </div>

        <div className="min-w-0 pt-1">
          <p className="truncate text-[10px] font-semibold leading-tight text-orange-400">
            Order ID: <span className="font-bold">{orderId || "-"}</span>
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-300">
            {dateOnly(getOrderDate(order))}
          </p>

          <div className="mt-2">
            <OrderStatusBadge status={getOrderStatus(order)} />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {sku ? (
              <span className="inline-flex max-w-[180px] items-center gap-1 rounded bg-orange-500/10 px-1.5 py-[2px] text-[9px] font-semibold leading-none text-orange-200 ring-1 ring-orange-400/15">
                <span className="shrink-0 text-orange-400">SKU</span>
                <span className="truncate tracking-normal">{sku}</span>
                <span className="text-orange-300/70">x{itemCount || 1}</span>
              </span>
            ) : (
              <span className="rounded bg-[#16202d] px-1.5 py-[2px] text-[9px] font-semibold text-slate-500 ring-1 ring-white/[0.05]">
                SKU -
              </span>
            )}
          </div>

          <p className="mt-1 max-w-[620px] truncate text-[12px] font-semibold text-slate-200">
            {itemCount > 1 ? `Multi Orders +${itemCount - 1}` : title || "-"}
          </p>

          <div className="mt-2">
            {image ? (
              <button
                type="button"
                title="Open product image"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenImage?.({
                    src: image,
                    title,
                    sku,
                    orderId,
                  });
                }}
                className="group/image flex h-14 w-14 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/10 transition-all duration-300 hover:scale-[1.04] hover:ring-violet-400/80 hover:shadow-[0_0_22px_rgba(124,58,237,0.45)]"
              >
                <ProductImage
                  src={image}
                  alt={title}
                  size="sm"
                  className="h-full w-full rounded-none border-0 object-cover transition-transform duration-300 group-hover/image:scale-125"
                />
              </button>
            ) : (
              <div className="flex h-14 w-36 items-center justify-center rounded-lg bg-[#0f1621] text-[11px] font-semibold text-slate-500 ring-1 ring-white/[0.06]">
                <Package size={14} className="mr-1" />
                No image
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 pt-1">
          <p className="truncate text-[12px] font-semibold text-slate-200">
            {getCustomerName(order)}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
            {getCustomerPhone(order)}
          </p>
        </div>

        <div className="pt-1">
          <p className="truncate text-[12px] font-semibold text-slate-200">
            {getPaymentMethod(order)}
          </p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">
            Manual Order
          </p>
        </div>

        <div className="pt-1 text-[12px] font-semibold text-slate-200">
          Rs. {money(getOrderTotal(order))}
        </div>

        <div className="flex items-start justify-end gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => onView(`/orders/${encodeURIComponent(orderId)}`)}
            disabled={!orderId}
            title="View"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[#111927] text-slate-300 transition hover:bg-orange-500/15 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eye size={14} />
          </button>

          <button
            type="button"
            onClick={() => onEdit(`/orders/${encodeURIComponent(orderId)}/edit`)}
            disabled={!orderId}
            title="Edit"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[#111927] text-slate-300 transition hover:bg-sky-500/15 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Edit size={14} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(orderId)}
            disabled={!orderId || deleting}
            title="Delete"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[#111927] text-rose-300 transition hover:bg-rose-500/15 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}