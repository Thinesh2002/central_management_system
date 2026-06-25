import { ArrowLeft, Loader2, Package, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ProductPickerModal from "./ProductPickerModal";
import OrderItemsEditor from "./OrderItemsEditor";
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  calculateLocalTotals,
  money,
  recalcItem,
} from "../utils/orderFrontendHelpers";

export default function OrderForm({
  mode = "create",
  form,
  setForm,
  onSubmit,
  saving,
  error,
  onDeleteExistingItem,
}) {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  const totals = useMemo(() => calculateLocalTotals(form), [form]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateItems(items) {
    setForm((prev) => ({
      ...prev,
      items: items.map((item) => recalcItem(item)),
    }));
  }

  function handleProductSelect(item) {
    updateItems([...(form.items || []), item]);
    setPickerOpen(false);
  }

  const pageTitle = mode === "edit" ? "Edit Manual Order" : "Create Manual Order";
  const buttonText = mode === "edit" ? "Update Order" : "Create Order";

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <ProductPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleProductSelect}
      />

      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-2xl">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-700 bg-[#0B1120] p-2.5 text-slate-300 transition hover:border-orange-500 hover:text-orange-300"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {pageTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Manual / custom order only. Daraz and WooCommerce orders stay separate.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
            {form.order_id || "New Manual Order"}
          </div>
        </div>

        {error ? (
          <div className="mx-5 mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="p-5 lg:p-8">
          {/* Main form like sample UI */}
          <div className="grid gap-8 xl:grid-cols-2">
            {/* Left column */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B1120]/70 p-5">
              <SectionTitle
                icon={<Package size={16} className="text-orange-400" />}
                title="Customer Details"
                subtitle="Customer contact and delivery address."
              />

              <div className="space-y-4">
                <FieldRow label="Customer Name" required>
                  <input
                    value={form.customer_name || ""}
                    onChange={(e) => updateField("customer_name", e.target.value)}
                    className={inputClass}
                    placeholder="Customer name"
                  />
                </FieldRow>

                <FieldRow label="Customer Code">
                  <input
                    value={form.customer_code || ""}
                    onChange={(e) => updateField("customer_code", e.target.value)}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </FieldRow>

                <FieldRow label="Phone" required>
                  <input
                    value={form.customer_phone || ""}
                    onChange={(e) => updateField("customer_phone", e.target.value)}
                    className={inputClass}
                    placeholder="077xxxxxxx"
                  />
                </FieldRow>

                <FieldRow label="Phone 2">
                  <input
                    value={form.customer_phone_2 || ""}
                    onChange={(e) => updateField("customer_phone_2", e.target.value)}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </FieldRow>

                <FieldRow label="Shipping Address" required>
                  <textarea
                    value={form.customer_address || ""}
                    onChange={(e) =>
                      updateField("customer_address", e.target.value)
                    }
                    className={`${inputClass} min-h-[96px] resize-none`}
                    placeholder="Full delivery address"
                  />

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <input
                      value={form.customer_city || ""}
                      onChange={(e) => updateField("customer_city", e.target.value)}
                      className={inputClass}
                      placeholder="City"
                    />

                    <input
                      value={form.customer_district || ""}
                      onChange={(e) =>
                        updateField("customer_district", e.target.value)
                      }
                      className={inputClass}
                      placeholder="District"
                    />

                    <input
                      value={form.customer_province || ""}
                      onChange={(e) =>
                        updateField("customer_province", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Province"
                    />
                  </div>
                </FieldRow>
              </div>
            </section>

            {/* Right column */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B1120]/70 p-5">
              <SectionTitle
                title="Order Details"
                subtitle="Order type, status, date and payment method."
              />

              <div className="space-y-4">
                <FieldRow label="Order Type">
                  <select
                    value={form.order_type || "MANUAL"}
                    onChange={(e) => updateField("order_type", e.target.value)}
                    className={inputClass}
                  >
                    {ORDER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow label="Payment Method">
                  <select
                    value={form.payment_method || "COD"}
                    onChange={(e) =>
                      updateField("payment_method", e.target.value)
                    }
                    className={inputClass}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow label="Order Status">
                  <select
                    value={form.order_status || "Pending"}
                    onChange={(e) => updateField("order_status", e.target.value)}
                    className={inputClass}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow label="Order Date">
                  <input
                    type="datetime-local"
                    value={form.order_date || ""}
                    onChange={(e) => updateField("order_date", e.target.value)}
                    className={inputClass}
                  />
                </FieldRow>

                <FieldRow label="Due Date">
                  <input
                    type="date"
                    value={form.due_date || ""}
                    onChange={(e) => updateField("due_date", e.target.value)}
                    className={inputClass}
                  />
                </FieldRow>

                <FieldRow label="Tracking Number">
                  <input
                    value={form.tracking_number || ""}
                    onChange={(e) =>
                      updateField("tracking_number", e.target.value)
                    }
                    className={inputClass}
                    placeholder="Optional"
                  />
                </FieldRow>
              </div>
            </section>
          </div>

          {/* Note */}
          <section className="mt-6 rounded-2xl border border-slate-800 bg-[#0B1120]/70 p-5">
            <div className="grid gap-2 lg:grid-cols-6">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:pr-4 lg:pt-2 lg:text-right">
                Order Note
              </label>

              <textarea
                value={form.note || ""}
                onChange={(e) => updateField("note", e.target.value)}
                className="min-h-[90px] w-full resize-none rounded-xl border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500 lg:col-span-5"
                placeholder="Internal note..."
              />
            </div>
          </section>

          {/* Items separate component */}
          <div className="mt-6">
            <OrderItemsEditor
              items={form.items || []}
              onChange={updateItems}
              onOpenProductPicker={() => setPickerOpen(true)}
              onDeleteExistingItem={onDeleteExistingItem}
            />
          </div>

          {/* Bottom summary like sample */}
          <div className="mt-6 flex justify-end">
            <section className="w-full rounded-2xl border border-slate-800 bg-[#0B1120]/70 p-5 sm:w-[430px]">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
                Order Total
              </h2>

              <div className="space-y-3 text-sm">
                <SummaryRow label="Item Total" value={`Rs. ${money(totals.item_total)}`} />

                <SummaryInput
                  label="Discount (-)"
                  value={form.discount ?? 0}
                  danger
                  onChange={(value) => updateField("discount", value)}
                />

                <SummaryRow
                  label="Subtotal"
                  value={`Rs. ${money(totals.subtotal)}`}
                  bold
                />

                <SummaryInput
                  label="Actual Shipping Cost"
                  value={form.shipping_cost_actual ?? 450}
                  onChange={(value) => updateField("shipping_cost_actual", value)}
                />

                <SummaryInput
                  label="Shipping Paid By Buyer"
                  value={form.shipping_cost_paid_by_buyer ?? 0}
                  onChange={(value) =>
                    updateField("shipping_cost_paid_by_buyer", value)
                  }
                />

                <SummaryRow
                  label="Order Total"
                  value={`Rs. ${money(totals.order_total)}`}
                  bold
                  highlight
                />

                <SummaryInput
                  label="Paid Amount"
                  value={form.paid_amount ?? 0}
                  onChange={(value) => updateField("paid_amount", value)}
                />

                <p className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-400">
                  Actual shipping cost is internal courier cost. Buyer shipping only adds to order total.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer action */}
        <div className="flex flex-col gap-3 border-t border-slate-800 bg-[#0B1120] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {saving ? (mode === "edit" ? "Updating..." : "Creating...") : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500";

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
        {icon}
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function FieldRow({ label, required, children }) {
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:pr-4 lg:pt-2 lg:text-right">
        {label} {required ? <span className="text-red-400">*</span> : null}
      </label>

      <div className="lg:col-span-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, bold, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={bold ? "font-bold text-white" : "font-semibold text-slate-400"}>
        {label}
      </span>

      <div
        className={`w-40 rounded-lg border px-3 py-2 text-right font-bold ${
          highlight
            ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
            : "border-slate-700 bg-slate-950 text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryInput({ label, value, onChange, danger }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`font-semibold ${danger ? "text-red-300" : "text-slate-400"}`}>
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right font-bold text-white outline-none transition focus:border-orange-500"
      />
    </div>
  );
}