import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightCircle, Eye, MoreVertical, Printer, Truck } from "lucide-react";
import { canDarazPrintAwb, nextDarazStep } from "../utils/orderHelpers";

const MANUAL_STATUSES = [
  "pending",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const DARAZ_EXTRA_ACTIONS = [
  { value: "get_shipment_providers", label: "Get Shipment Providers" },
  { value: "recreate_package", label: "Recreate Package" },
  { value: "set_invoice_number", label: "Set Invoice Number" },
];

// Rendered through a portal so the menu can escape the table's
// overflow-x-auto scroll container instead of being clipped by it.
export default function RowActionsMenu({
  order,
  onView,
  onPrintInvoice,
  onTrack,
  onChangeStatus,
  onDarazAction,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 4, left: Math.max(rect.right - 220, 8) });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  function run(fn) {
    setOpen(false);
    fn();
  }

  const isDaraz = order.source === "daraz";
  const isLocal = order.source === "local";
  const hasWaybill = Boolean(order.waybill_id || order.tracking_number);
  const step = isDaraz ? nextDarazStep(order) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        <MoreVertical size={14} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className="z-[100] w-56 border border-slate-700 bg-[#0b1220] py-1 shadow-2xl"
          >
            <div className="border-b border-slate-800 px-3 py-2">
              <p className="truncate text-[11px] font-semibold text-white">
                {order.display_order_no || order.order_no}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">{order.order_status || "-"}</p>
            </div>

            <button
              type="button"
              onClick={() => run(onView)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800"
            >
              <Eye size={12} /> View Details
            </button>

            <button
              type="button"
              onClick={() => run(onPrintInvoice)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800"
            >
              <Printer size={12} /> Print Invoice
            </button>

            {hasWaybill && (
              <button
                type="button"
                onClick={() => run(onTrack)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800"
              >
                <Truck size={12} /> Tracking
              </button>
            )}

            {isLocal && (
              <>
                <div className="mt-1 border-t border-slate-800 px-3 pt-1.5 text-[10px] font-semibold uppercase text-slate-500">
                  Change Status
                </div>
                {MANUAL_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={status === order.order_status}
                    onClick={() => run(() => onChangeStatus(status))}
                    className="flex w-full items-center px-3 py-1.5 text-left text-[11px] capitalize text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    {status.replace(/_/g, " ")}
                  </button>
                ))}
              </>
            )}

            {isDaraz && (
              <>
                <div className="mt-1 border-t border-slate-800 px-3 pt-1.5 text-[10px] font-semibold uppercase text-slate-500">
                  Daraz Actions
                </div>

                {step && (
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        step.kind === "status" ? onChangeStatus(step.status) : onDarazAction(step.action)
                      )
                    }
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-orange-300 hover:bg-slate-800"
                  >
                    <ArrowRightCircle size={12} /> {step.label}
                  </button>
                )}

                {canDarazPrintAwb(order) && (
                  <button
                    type="button"
                    onClick={() => run(() => onDarazAction("print_awb"))}
                    className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800"
                  >
                    Print AWB
                  </button>
                )}

                {DARAZ_EXTRA_ACTIONS.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => run(() => onDarazAction(action.value))}
                    className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    {action.label}
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
