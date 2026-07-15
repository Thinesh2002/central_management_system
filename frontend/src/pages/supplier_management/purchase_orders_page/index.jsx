import { useEffect, useRef, useState } from "react";
import { Check, ClipboardList, Loader2, PackageCheck, Plus, Save, Search, Trash2, X } from "lucide-react";

import purchaseOrdersApi from "../../../config/sub_api/supplier_management_api/purchase_orders_api";
import suppliersApi from "../../../config/sub_api/supplier_management_api/suppliers_api";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import grnApi from "../../../config/sub_api/supplier_management_api/grn_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import Loader from "../../../components/common/Loader";

const EDITABLE_STATUSES = new Set(["draft", "pending"]);
const RECEIVABLE_STATUSES = new Set(["approved", "sent", "partially_received"]);

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLE = {
  draft: "border-slate-700 bg-slate-800/60 text-slate-400",
  pending: "border-amber-900 bg-amber-950 text-amber-300",
  approved: "border-sky-900 bg-sky-950 text-sky-300",
  sent: "border-indigo-900 bg-indigo-950 text-indigo-300",
  partially_received: "border-orange-900 bg-orange-950 text-orange-300",
  received: "border-emerald-900 bg-emerald-950 text-emerald-300",
  cancelled: "border-red-900 bg-red-950 text-red-300",
};

function clean(value) {
  return String(value ?? "").trim();
}

function money(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyItem() {
  return { sku: "", product_name: "", quantity_ordered: 1, unit_cost: 0 };
}

function emptyForm() {
  return {
    supplier_id: "",
    order_date: todayInputValue(),
    expected_delivery_date: "",
    currency: "LKR",
    tax_amount: 0,
    shipping_amount: 0,
    notes: "",
    items: [emptyItem()],
  };
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        STATUS_STYLE[status] || STATUS_STYLE.draft
      }`}
    >
      {String(status || "-").replace(/_/g, " ")}
    </span>
  );
}

export default function PurchaseOrdersPage() {
  const showToast = useToast();

  const [rows, setRows] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [matches, setMatches] = useState({});
  const [searching, setSearching] = useState(null);
  const searchTimers = useRef({});

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState(null);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ received_date: todayInputValue(), notes: "", items: [] });

  const readOnly = editing ? !EDITABLE_STATUSES.has(editing.status) : false;

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await purchaseOrdersApi.list({ search, status });
      setRows(res?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load purchase orders"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    suppliersApi
      .options()
      .then((res) => setSupplierOptions(res?.data || []))
      .catch(() => setSupplierOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setMatches({});
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      supplier_id: row.supplier_id,
      order_date: row.order_date ? String(row.order_date).slice(0, 10) : todayInputValue(),
      expected_delivery_date: row.expected_delivery_date ? String(row.expected_delivery_date).slice(0, 10) : "",
      currency: row.currency || "LKR",
      tax_amount: row.tax_amount ?? 0,
      shipping_amount: row.shipping_amount ?? 0,
      notes: row.notes || "",
      items: (row.items || []).map((item) => ({
        sku: item.sku,
        product_name: item.product_name,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
      })),
    });
    setMatches({});
    setModalOpen(true);
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItemField(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItemRow() {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItemRow(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function runSkuSearch(index, query) {
    setSearching(index);

    try {
      const res = await localProductsApi.getProducts({ limit: 20, search: query });
      const products = res?.data?.data || res?.data || [];
      const flat = [];

      (Array.isArray(products) ? products : []).forEach((p) => {
        const productName = clean(p.product_name || p.title || p.name || p.sku || "Product");
        const variants = Array.isArray(p.variants) ? p.variants : [];

        if (variants.length) {
          variants.forEach((v) => {
            const vSku = clean(v.variant_sku || v.sku || v.local_sku || "");
            if (vSku) flat.push({ sku: vSku, product_name: productName });
          });
        } else {
          const pSku = clean(p.sku || p.product_sku || p.local_sku || "");
          if (pSku) flat.push({ sku: pSku, product_name: productName });
        }
      });

      setMatches((prev) => ({ ...prev, [index]: flat.slice(0, 20) }));
    } catch {
      setMatches((prev) => ({ ...prev, [index]: [] }));
    } finally {
      setSearching((prev) => (prev === index ? null : prev));
    }
  }

  function handleSkuQueryChange(index, value) {
    setItemField(index, "sku", value);
    window.clearTimeout(searchTimers.current[index]);

    const query = clean(value);
    if (query.length < 2) {
      setMatches((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    searchTimers.current[index] = window.setTimeout(() => runSkuSearch(index, query), 350);
  }

  async function selectMatch(index, match) {
    setItemField(index, "sku", match.sku);
    setItemField(index, "product_name", match.product_name);
    setMatches((prev) => ({ ...prev, [index]: [] }));

    try {
      const res = await localProductsApi.getPriceBySku(match.sku);
      const cost = res?.data?.data?.cost_price ?? res?.data?.cost_price;
      if (cost !== undefined && cost !== null) {
        setItemField(index, "unit_cost", Number(cost));
      }
    } catch {
      // No price record yet - leave unit cost for manual entry.
    }
  }

  function lineTotal(item) {
    return Number(item.quantity_ordered || 0) * Number(item.unit_cost || 0);
  }

  const subtotal = form.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const total = subtotal + Number(form.tax_amount || 0) + Number(form.shipping_amount || 0);

  async function submit(event) {
    event.preventDefault();
    if (readOnly) return;

    if (!form.supplier_id) {
      showToast("Select a supplier.", { type: "error" });
      return;
    }

    if (!form.items.length || form.items.some((item) => !item.sku || !Number(item.quantity_ordered))) {
      showToast("Every line item needs a SKU and a quantity greater than 0.", { type: "error" });
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await purchaseOrdersApi.update(editing.id, form);
        showToast("Purchase order updated.", { type: "success" });
      } else {
        await purchaseOrdersApi.create(form);
        showToast("Purchase order created.", { type: "success" });
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to save purchase order"), { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(row, nextStatus) {
    if (nextStatus === row.status) return;

    try {
      await purchaseOrdersApi.updateStatus(row.id, nextStatus);
      showToast("Status updated.", { type: "success" });
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to update status"), { type: "error" });
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete purchase order "${row.po_number}"? This can't be undone.`)) return;

    try {
      await purchaseOrdersApi.remove(row.id);
      showToast("Purchase order deleted.", { type: "success" });
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to delete purchase order"), { type: "error" });
    }
  }

  async function openReceive(row) {
    setReceiveOpen(true);
    setReceiveLoading(true);
    setReceivingPo(null);

    try {
      const res = await purchaseOrdersApi.getById(row.id);
      const po = res?.data;
      setReceivingPo(po);
      setReceiveForm({
        received_date: todayInputValue(),
        notes: "",
        items: (po?.items || [])
          .map((item) => ({
            purchase_order_item_id: item.id,
            sku: item.sku,
            product_name: item.product_name,
            quantity_ordered: item.quantity_ordered,
            quantity_already_received: item.quantity_received,
            remaining: item.quantity_ordered - item.quantity_received,
            quantity_to_receive: item.quantity_ordered - item.quantity_received,
            unit_cost: item.unit_cost,
          }))
          .filter((item) => item.remaining > 0),
      });
    } catch (err) {
      showToast(getApiError(err, "Failed to load purchase order"), { type: "error" });
      setReceiveOpen(false);
    } finally {
      setReceiveLoading(false);
    }
  }

  function setReceiveItemField(index, key, value) {
    setReceiveForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  }

  async function submitReceive(event) {
    event.preventDefault();
    if (!receivingPo) return;

    const itemsToReceive = receiveForm.items.filter((item) => Number(item.quantity_to_receive) > 0);

    if (!itemsToReceive.length) {
      showToast("Enter a quantity received for at least one line item.", { type: "error" });
      return;
    }

    setReceiveSaving(true);

    try {
      await grnApi.create({
        purchase_order_id: receivingPo.id,
        received_date: receiveForm.received_date,
        notes: receiveForm.notes,
        items: itemsToReceive.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          sku: item.sku,
          quantity_received: Number(item.quantity_to_receive),
          unit_cost: item.unit_cost,
        })),
      });

      showToast("Goods received and stock updated.", { type: "success" });
      setReceiveOpen(false);
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to record goods received"), { type: "error" });
    } finally {
      setReceiveSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <ClipboardList size={20} />
            Purchase Orders
          </h1>
          <p className="text-[13px] text-slate-500">Order stock from suppliers and track it through to receiving.</p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400"
        >
          <Plus size={12} /> New Purchase Order
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-55 max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            onBlur={load}
            placeholder="Search PO number or supplier..."
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>}

      {loading ? (
        <Loader label="Loading purchase orders..." minHeight="200px" />
      ) : !rows.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          No purchase orders yet. Click New Purchase Order to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">PO Number</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Order Date</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-[#0b1220] align-top">
                  <td className="px-3 py-2 font-mono font-semibold text-slate-100">{row.po_number}</td>
                  <td className="px-3 py-2 text-slate-300">{row.supplier_name}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.order_date ? String(row.order_date).slice(0, 10) : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.item_count ?? ""}</td>
                  <td className="px-3 py-2 font-semibold text-slate-100">
                    {row.currency} {money(row.total_amount)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={row.status} />
                      <select
                        value={row.status}
                        onChange={(e) => handleStatusChange(row, e.target.value)}
                        className="h-6 rounded border border-slate-700 bg-slate-900 px-1 text-[10px] text-slate-300 outline-none"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        title={EDITABLE_STATUSES.has(row.status) ? "Edit" : "View"}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-900 bg-amber-950 text-amber-300 hover:bg-amber-900"
                      >
                        {EDITABLE_STATUSES.has(row.status) ? <Save size={12} /> : <Search size={12} />}
                      </button>
                      {RECEIVABLE_STATUSES.has(row.status) && (
                        <button
                          type="button"
                          onClick={() => openReceive(row)}
                          title="Receive Goods"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-900 bg-emerald-950 text-emerald-300 hover:bg-emerald-900"
                        >
                          <PackageCheck size={12} />
                        </button>
                      )}
                      {(row.status === "draft" || row.status === "cancelled") && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
              <h2 className="text-[14px] font-semibold text-white">
                {editing ? (readOnly ? `View Purchase Order — ${editing.po_number}` : `Edit Purchase Order — ${editing.po_number}`) : "New Purchase Order"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                    Supplier <span className="text-orange-400">*</span>
                  </span>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setField("supplier_id", e.target.value)}
                    disabled={readOnly}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                    required
                  >
                    <option value="">Select supplier...</option>
                    {supplierOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Currency</span>
                  <input
                    value={form.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                    disabled={readOnly}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Order Date</span>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setField("order_date", e.target.value)}
                    disabled={readOnly}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Expected Delivery</span>
                  <input
                    type="date"
                    value={form.expected_delivery_date}
                    onChange={(e) => setField("expected_delivery_date", e.target.value)}
                    disabled={readOnly}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Line Items</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 px-2 text-[11px] font-semibold text-slate-300 hover:border-orange-400"
                    >
                      <Plus size={11} /> Add Line
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div key={index} className="rounded-md border border-slate-800 bg-[#070b16] p-2">
                      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                        <div className="relative">
                          <input
                            value={item.sku}
                            onChange={(e) => handleSkuQueryChange(index, e.target.value)}
                            disabled={readOnly}
                            placeholder="Search SKU / product..."
                            autoComplete="off"
                            className="h-8 w-full rounded-md border border-slate-700 bg-[#0b1220] px-2 text-[11px] text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                          />
                          {searching === index && (
                            <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-orange-400" />
                          )}
                          {item.product_name && (
                            <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-medium text-emerald-400">
                              <Check size={10} className="shrink-0" />
                              <span className="truncate">{item.product_name}</span>
                            </p>
                          )}
                          {!!matches[index]?.length && (
                            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-700 bg-[#0b1220] shadow-xl">
                              {matches[index].map((match) => (
                                <button
                                  key={match.sku}
                                  type="button"
                                  onClick={() => selectMatch(index, match)}
                                  className="block w-full truncate px-2 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800"
                                >
                                  <span className="font-mono text-orange-400">{match.sku}</span> — {match.product_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => setItemField(index, "quantity_ordered", e.target.value)}
                          disabled={readOnly}
                          placeholder="Qty"
                          className="h-8 w-full rounded-md border border-slate-700 bg-[#0b1220] px-2 text-[11px] text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => setItemField(index, "unit_cost", e.target.value)}
                          disabled={readOnly}
                          placeholder="Unit Cost"
                          className="h-8 w-full rounded-md border border-slate-700 bg-[#0b1220] px-2 text-[11px] text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                        />

                        <div className="flex h-8 items-center justify-end rounded-md border border-transparent px-2 text-[11px] font-semibold text-slate-300">
                          {money(lineTotal(item))}
                        </div>

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={form.items.length <= 1}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Tax Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.tax_amount}
                    onChange={(e) => setField("tax_amount", e.target.value)}
                    disabled={readOnly}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Shipping Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.shipping_amount}
                    onChange={(e) => setField("shipping_amount", e.target.value)}
                    disabled={readOnly}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="ml-auto max-w-xs space-y-1 rounded-md border border-slate-800 bg-[#070b16] p-3 text-[12px]">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span>{money(form.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Shipping</span>
                  <span>{money(form.shipping_amount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 text-[13px] font-semibold text-slate-100">
                  <span>Total</span>
                  <span>
                    {form.currency} {money(total)}
                  </span>
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Notes</span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  disabled={readOnly}
                  className="w-full rounded-md border border-slate-700 bg-[#070b16] px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-orange-400 disabled:opacity-60"
                />
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-800 bg-[#0b1220] px-4 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300"
              >
                {readOnly ? "Close" : "Cancel"}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={13} /> {saving ? "Saving..." : "Save Purchase Order"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {receiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={() => setReceiveOpen(false)}>
          <form
            onSubmit={submitReceive}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-linear-to-r from-emerald-950 via-[#0f1f1a] to-emerald-950 px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
                <PackageCheck size={16} />
                Receive Goods — {receivingPo?.po_number || ""}
              </h2>
              <button
                type="button"
                onClick={() => setReceiveOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            {receiveLoading ? (
              <Loader label="Loading purchase order..." minHeight="160px" />
            ) : (
              <div className="space-y-4 p-4">
                <p className="text-[12px] text-slate-400">
                  Supplier: <span className="font-semibold text-slate-200">{receivingPo?.supplier_name}</span>
                </p>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Received Date</span>
                  <input
                    type="date"
                    value={receiveForm.received_date}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, received_date: e.target.value }))}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-emerald-400"
                  />
                </label>

                {!receiveForm.items.length ? (
                  <p className="rounded-md border border-slate-800 bg-[#070b16] px-3 py-4 text-center text-[12px] text-slate-500">
                    Everything on this purchase order has already been received.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-slate-800">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">SKU</th>
                          <th className="px-2 py-1.5 font-medium">Ordered</th>
                          <th className="px-2 py-1.5 font-medium">Received</th>
                          <th className="px-2 py-1.5 font-medium">Remaining</th>
                          <th className="px-2 py-1.5 font-medium">Receive Now</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {receiveForm.items.map((item, index) => (
                          <tr key={item.purchase_order_item_id}>
                            <td className="px-2 py-1.5">
                              <p className="font-mono font-semibold text-slate-100">{item.sku}</p>
                              <p className="truncate text-slate-500">{item.product_name}</p>
                            </td>
                            <td className="px-2 py-1.5 text-slate-300">{item.quantity_ordered}</td>
                            <td className="px-2 py-1.5 text-slate-300">{item.quantity_already_received}</td>
                            <td className="px-2 py-1.5 text-slate-300">{item.remaining}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                max={item.remaining}
                                value={item.quantity_to_receive}
                                onChange={(e) => setReceiveItemField(index, "quantity_to_receive", e.target.value)}
                                className="h-7 w-20 rounded-md border border-slate-700 bg-[#070b16] px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-400"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Notes</span>
                  <textarea
                    rows={2}
                    value={receiveForm.notes}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-[#070b16] px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
            )}

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-800 bg-[#0b1220] px-4 py-3">
              <button
                type="button"
                onClick={() => setReceiveOpen(false)}
                className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300"
              >
                Cancel
              </button>
              {!!receiveForm.items.length && (
                <button
                  type="submit"
                  disabled={receiveSaving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PackageCheck size={13} /> {receiveSaving ? "Saving..." : "Confirm Receipt"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
