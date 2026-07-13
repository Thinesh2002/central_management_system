import React, { Fragment, memo } from "react";
import { ArrowRightCircle, ImageOff, Printer, Truck } from "lucide-react";
import { resolveImageUrl } from "../../../product_management/products/product_dashboard/utils/localProductsImageHelpers";
import {
  fullAddress,
  money,
  nextDarazStep,
  niceDate,
  orderKey,
  sourceMeta,
  statusBadgeClass,
  statusBucketKey,
  statusLabel,
} from "../utils/orderHelpers";
import RowActionsMenu from "./RowActionsMenu";
import { usePageOverlay } from "../../../../components/common/page_overlay/PageOverlayProvider";

function getItemImage(item = {}) {
  return item.product_main_image || item.product_image_url || item.image_url || item.image || "";
}

function getItemName(item = {}) {
  return item.product_title || item.name || item.product_name || item.title || "-";
}

function getItemSku(item = {}) {
  return item.local_sku || item.sku || item.seller_sku || item.shop_sku || item.marketplace_sku || "-";
}

function getItemQty(item = {}) {
  return Number(item.qty || item.quantity || 1) || 1;
}

function ProductThumb({ order, item, onPreview }) {
  const url = resolveImageUrl(getItemImage(item) || order.thumbnail_url || "");
  const title = getItemName(item) !== "-" ? getItemName(item) : order.first_item_title || order.display_order_no;

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
      className="relative z-0 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-slate-200 transition-transform duration-150 ease-out disabled:cursor-default hover:z-20 hover:scale-[2.2] hover:shadow-xl hover:ring-1 hover:ring-orange-400"
    >
      {url ? (
        <img src={url} alt={title || "Product"} className="h-full w-full object-contain" />
      ) : (
        <ImageOff size={17} className="text-slate-400" />
      )}
    </button>
  );
}

const ACTION_TONE_CLASS = {
  primary: "bg-yellow-500 text-slate-950 hover:bg-yellow-400",
  outline: "border border-slate-600 text-slate-200 hover:border-yellow-400 hover:text-yellow-200",
};

function ActionButton({ label, icon: Icon, onClick, tone = "outline" }) {
  const toneClass = ACTION_TONE_CLASS[tone] || ACTION_TONE_CLASS.outline;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-sm px-2 text-[12px] font-semibold transition ${toneClass}`}
    >
      {Icon && <Icon size={13} />}
      {label}
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
  onEdit,
  onDelete,
  onTrack,
  onChangeStatus,
  onDarazAction,
  onAddWaybill,
}) {
  const { openOverlay } = usePageOverlay();
  const source = sourceMeta(order.source);
  const dateParts = niceDate(order.order_date);
  // Every order gets at least one product row, even if items didn't load -
  // the shared order columns (customer/total/status/actions) still render.
  const items = order.items?.length ? order.items : [null];
  const rowCount = items.length;
  const isMulti = items.length > 1;

  const isDaraz = order.source === "daraz";
  const hasWaybill = Boolean(order.waybill_id || order.tracking_number);
  const darazStep = isDaraz ? nextDarazStep(order) : null;
  const isCancelled = statusBucketKey(order) === "cancelled";

  return (
    <Fragment>
      {items.map((item, index) => {
        const isFirst = index === 0;
        const itemSku = item ? getItemSku(item) : null;

        return (
          <tr
            key={item?.id || index}
            className={`transition ${isSelected ? "bg-orange-500/5" : "hover:bg-[#111827]"} ${
              isFirst ? "border-t border-slate-800" : "border-t border-dashed border-slate-800/60"
            }`}
          >
            {isFirst && (
              <td rowSpan={rowCount} className="px-5 py-4 align-top">
                <input
                  type="checkbox"
                  checked={Boolean(isSelected)}
                  onChange={() => onToggle(order)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500"
                />
              </td>
            )}

            {isFirst && (
              <td rowSpan={rowCount} className="px-5 py-4 align-top">
                <button
                  type="button"
                  onClick={() => onView(order)}
                  className="cursor-pointer text-[13px] font-semibold text-slate-200 hover:text-sky-300 hover:underline"
                >
                  #{order.display_order_no || order.order_no}
                </button>
                <p className={`mt-1.5 text-[11px] font-semibold ${source.className}`}>{source.label}</p>
                <p className="mt-1.5 text-[11px] text-slate-300">{order.account_name || "-"}</p>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  {dateParts.date} {dateParts.time}
                </p>
                {isMulti && (
                  <p className="mt-1.5 text-[10px] font-semibold text-orange-300">{items.length} items</p>
                )}
              </td>
            )}

            <td className="px-5 py-4 align-top">
              <div className="flex min-w-0 items-start gap-4">
                <ProductThumb order={order} item={item} onPreview={onPreviewImage} />

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-normal leading-5 text-slate-100">
                    {item ? getItemName(item) : order.first_item_title || "-"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    {itemSku && itemSku !== "-" ? (
                      <button
                        type="button"
                        onClick={() => openOverlay(`/order-management/sku-report/${encodeURIComponent(itemSku)}`)}
                        title="Open SKU Economics Report"
                        className="font-mono text-slate-400 underline decoration-dotted hover:text-orange-300"
                      >
                        {itemSku}
                      </button>
                    ) : null}
                    {item && <span>Qty: {getItemQty(item)}</span>}
                  </div>
                </div>
              </div>
            </td>

            {isFirst && (
              <td rowSpan={rowCount} className="px-5 py-4 align-top">
                <p className="text-[13px] font-semibold text-slate-200">
                  {order.customer_name || order.shipping_name || "-"}
                </p>
                <p className="mt-1.5 text-[11px] text-slate-400">{order.customer_phone || order.shipping_phone || "-"}</p>
                <p className="mt-1.5 max-w-55 text-[10px] leading-5 text-slate-500">
                  {fullAddress(order) || "-"}
                </p>
              </td>
            )}

            {isFirst && (
              <td rowSpan={rowCount} className="px-5 py-4 align-top">
                <p className="text-[13px] font-semibold text-slate-100">{money(order.grand_total, order.currency)}</p>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Discount: {money(order.discount_total, order.currency)}
                </p>
                <p className="mt-1.5 text-[10px] uppercase text-slate-500">{order.payment_method || "-"}</p>
              </td>
            )}

            {isFirst && (
              <td rowSpan={rowCount} className="px-5 py-4 align-top">
                <span className={`text-[12px] font-semibold ${statusBadgeClass(order)}`}>{statusLabel(order)}</span>
              </td>
            )}

            {isFirst && (
              <td rowSpan={rowCount} className="px-5 py-4 align-top">
                <div className="flex w-40 flex-col gap-2">
                  {isDaraz && darazStep && (
                    <ActionButton
                      label={darazStep.label}
                      icon={ArrowRightCircle}
                      tone="primary"
                      onClick={() =>
                        darazStep.kind === "status"
                          ? onChangeStatus(order, darazStep.status)
                          : onDarazAction(order, darazStep.action)
                      }
                    />
                  )}

                  {isDaraz && !isCancelled && (
                    <ActionButton
                      label="Print AWB"
                      icon={Truck}
                      tone="primary"
                      onClick={() => onDarazAction(order, "print_awb")}
                    />
                  )}

                  {!isDaraz && (
                    <ActionButton
                      label={hasWaybill ? "Edit Waybill" : "Add Waybill"}
                      icon={Truck}
                      tone="primary"
                      onClick={() => onAddWaybill(order)}
                    />
                  )}

                  <ActionButton label="Print Invoice" icon={Printer} tone="primary" onClick={() => onPrintInvoice(order)} />

                  <RowActionsMenu
                    order={order}
                    onView={() => onView(order)}
                    onPrintInvoice={() => onPrintInvoice(order)}
                    onTrack={() => onTrack(order)}
                    onEdit={() => onEdit(order)}
                    onDelete={() => onDelete(order)}
                    onChangeStatus={(status) => onChangeStatus(order, status)}
                    onDarazAction={(action) => onDarazAction(order, action)}
                  />
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </Fragment>
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
