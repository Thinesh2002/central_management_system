import React, { memo } from "react";
import { ImageOff } from "lucide-react";
import { resolveImageUrl } from "../../../product_management/products/product_dashboard/utils/localProductsImageHelpers";
import { fullAddress, money, niceDate, orderKey, sourceMeta, statusBadgeClass, statusLabel } from "../utils/orderHelpers";
import RowActionsMenu from "./RowActionsMenu";

function ProductThumb({ order, onPreview }) {
  const url = resolveImageUrl(order.thumbnail_url || "");
  const title = order.first_item_title || order.display_order_no;

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
      className="relative z-0 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-white transition-transform duration-150 ease-out disabled:cursor-default hover:z-20 hover:scale-[2.4] hover:shadow-xl hover:ring-1 hover:ring-orange-400"
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
  const skus = (order.items || []).slice(0, 3);

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

      <td className="px-3 py-2.5 align-top">
        <p className={`text-[11px] font-semibold ${source.className}`}>{source.label}</p>
        <p className="mt-0.5 text-[11px] text-slate-300">{order.account_name || "-"}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {dateParts.date} {dateParts.time}
        </p>
      </td>

      <td className="px-3 py-2.5 align-top">
        <div className="min-w-0 max-w-60">
          <button
            type="button"
            onClick={() => onView(order)}
            className="cursor-pointer text-[12px] font-semibold text-sky-400 underline decoration-dotted hover:text-sky-300"
          >
            {order.display_order_no || order.order_no}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-1">
            {skus.length ? (
              skus.map((item, index) => (
                <span
                  key={item.id || index}
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
                >
                  <span className="max-w-35 truncate">{item.sku || item.local_sku || "-"}</span>
                  <span className="text-slate-500">&times; {item.qty || 1}</span>
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-600">No items</span>
            )}
          </div>

          <p className="mt-1 truncate text-[11px] text-slate-400">{order.first_item_title || "-"}</p>

          <div className="mt-1.5">
            <ProductThumb order={order} onPreview={onPreviewImage} />
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 align-top">
        <p className="text-[12px] font-semibold text-slate-200">
          {order.customer_name || order.shipping_name || "-"}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">{order.customer_phone || order.shipping_phone || "-"}</p>
        <p className="mt-0.5 max-w-55 text-[10px] leading-4 text-slate-500">
          {fullAddress(order) || "-"}
        </p>
      </td>

      <td className="px-3 py-2.5 align-top">
        <p className="text-[12px] font-semibold text-slate-100">{money(order.grand_total, order.currency)}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Discount: {money(order.discount_total, order.currency)}
        </p>
        <p className="mt-0.5 text-[10px] uppercase text-slate-500">{order.payment_method || "-"}</p>
      </td>

      <td className="px-3 py-2.5 align-top">
        <span className={`text-[11px] font-semibold ${statusBadgeClass(order)}`}>{statusLabel(order)}</span>
      </td>

      <td className="px-3 py-2.5 text-right align-top">
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
