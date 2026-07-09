import React, { memo } from "react";
import { ImageOff } from "lucide-react";
import { resolveImageUrl } from "../../../product_management/products/product_dashboard/utils/localProductsImageHelpers";
import { fullAddress, money, niceDate, orderKey, sourceMeta, statusBadgeClass, statusLabel } from "../utils/orderHelpers";
import RowActionsMenu from "./RowActionsMenu";

function ProductThumb({ order, item, onPreview }) {
  const url = resolveImageUrl(item?.image_url || order.thumbnail_url || "");
  const title = item?.product_title || order.first_item_title || order.display_order_no;

  return (
    <button
      type="button"
      onClick={() =>
        url &&
        onPreview({
          url,
          title,
          orderNo: order.display_order_no || order.order_no,
        })
      }
      disabled={!url}
      title={url ? "Click to preview" : "No image"}
      className="relative z-0 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-slate-200 transition-transform duration-150 ease-out disabled:cursor-default hover:z-20 hover:scale-[2.2] hover:shadow-xl hover:ring-1 hover:ring-orange-400"
    >
      {url ? (
        <img src={url} alt={title || "Product"} className="h-full w-full object-contain" />
      ) : (
        <ImageOff size={13} className="text-slate-400" />
      )}
    </button>
  );
}

function OrderRow({
  order,
  isSelected,
  onToggle,
  onPreviewImage,
  onView,
  onPrintInvoice,
  onTrack,
  onChangeStatus,
  onDarazAction,
}) {
  const source = sourceMeta(order.source);
  const dateParts = niceDate(order.order_date);
  const items = order.items || [];
  const isMulti = items.length > 1;
  const visibleSkus = items.slice(0, 3);
  const visibleImages = items.slice(0, 3);

  return (
    <tr className={`transition ${isSelected ? "bg-orange-500/5" : "hover:bg-[#111827]"}`}>
      <td className="px-3 py-2.5 align-top">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(order)}
          className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500"
        />
      </td>

      <td className="px-3 py-2 align-top">
        <p className={`text-[10px] font-semibold ${source.className}`}>{source.label}</p>
        <p className="mt-0.5 text-[10px] text-slate-300">{order.account_name || "-"}</p>
        <p className="mt-0.5 text-[9px] text-slate-500">
          {dateParts.date} {dateParts.time}
        </p>
      </td>

      <td className="px-3 py-2 align-top">
        <div className="min-w-0 max-w-60">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onView(order)}
              className="cursor-pointer text-[9px] font-normal text-sky-400 underline decoration-dotted hover:text-sky-300"
            >
              {order.display_order_no || order.order_no}
            </button>

            {visibleSkus.length ? (
              visibleSkus.map((item, index) => (
                <button
                  key={item.id || index}
                  type="button"
                  disabled={!item.sku}
                  onClick={() =>
                    item.sku &&
                    window.open(`/order-management/sku-report/${encodeURIComponent(item.sku)}`, "_blank")
                  }
                  title={item.sku ? "Open SKU Economics Report" : ""}
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 hover:bg-slate-700 hover:text-orange-300 disabled:cursor-default disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
                >
                  <span className="max-w-28 truncate">{item.sku || "-"}</span>
                  <span className="text-slate-500">&times; {item.qty || 1}</span>
                </button>
              ))
            ) : (
              <span className="text-[9px] text-slate-600">No items</span>
            )}
            {items.length > visibleSkus.length && (
              <span className="text-[9px] text-slate-500">+{items.length - visibleSkus.length}</span>
            )}
          </div>

          <p className="mt-1 truncate text-[10px] text-slate-400">
            {isMulti ? `Multiple Items (${items.length})` : items[0]?.product_title || order.first_item_title || "-"}
          </p>

          <div className="mt-1.5 flex flex-wrap gap-1">
            {visibleImages.length ? (
              visibleImages.map((item, index) => (
                <ProductThumb key={item.id || index} order={order} item={item} onPreview={onPreviewImage} />
              ))
            ) : (
              <ProductThumb order={order} onPreview={onPreviewImage} />
            )}
            {items.length > visibleImages.length && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-900 text-[9px] font-semibold text-slate-400">
                +{items.length - visibleImages.length}
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-2 align-top">
        <p className="text-[11px] font-semibold text-slate-200">
          {order.customer_name || order.shipping_name || "-"}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">{order.customer_phone || order.shipping_phone || "-"}</p>
        <p className="mt-0.5 max-w-55 text-[9px] leading-4 text-slate-500">
          {fullAddress(order) || "-"}
        </p>
      </td>

      <td className="px-3 py-2 align-top">
        <p className="text-[11px] font-semibold text-slate-100">{money(order.grand_total, order.currency)}</p>
        <p className="mt-0.5 text-[9px] text-slate-500">
          Discount: {money(order.discount_total, order.currency)}
        </p>
        <p className="mt-0.5 text-[9px] uppercase text-slate-500">{order.payment_method || "-"}</p>
      </td>

      <td className="px-3 py-2 align-top">
        <span className={`text-[10px] font-semibold ${statusBadgeClass(order)}`}>{statusLabel(order)}</span>
      </td>

      <td className="px-3 py-2 text-right align-top">
        <RowActionsMenu
          order={order}
          onView={() => onView(order)}
          onPrintInvoice={() => onPrintInvoice(order)}
          onTrack={() => onTrack(order)}
          onChangeStatus={(status) => onChangeStatus(order, status)}
          onDarazAction={(action) => onDarazAction(order, action)}
        />
      </td>
    </tr>
  );
}

function areEqual(prev, next) {
  return (
    prev.order === next.order &&
    prev.isSelected === next.isSelected &&
    prev.onToggle === next.onToggle
  );
}

export default memo(OrderRow, areEqual);
export { orderKey };
