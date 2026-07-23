import { useEffect, useState } from "react";
import { Edit3, Plus, Save, SlidersHorizontal, Trash2, X } from "lucide-react";

import priceRulesApi from "../../../config/sub_api/product_management_api/price_rules_api";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import { normalizeList } from "../../product_management/products/utils/productSku";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../components/common/confirm_modal/ConfirmProvider";
import { useCanViewCostPrice } from "../../../components/common/permissions/PermissionsProvider";
import Loader from "../../../components/common/Loader";

const MARKETPLACE_OPTIONS = [
  { value: "all", label: "All Marketplaces" },
  { value: "local", label: "Local Store" },
  { value: "daraz", label: "Daraz" },
  { value: "woocommerce", label: "WooCommerce" },
];

const ROUNDING_OPTIONS = [
  { value: "none", label: "No Rounding" },
  { value: "nearest_9", label: "Nearest ending in 9 (e.g. 1449)" },
  { value: "nearest_50", label: "Nearest 50" },
  { value: "nearest_100", label: "Nearest 100" },
  { value: "nearest_whole", label: "Nearest Whole Number" },
];

const emptyForm = {
  name: "",
  category_id: "",
  marketplace: "all",
  margin_type: "percentage",
  margin_value: "",
  rounding_rule: "none",
  min_price: "",
  max_price: "",
  priority: 0,
  status: "active",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        status === "active"
          ? "border-emerald-900 bg-emerald-950 text-emerald-300"
          : "border-slate-700 bg-slate-800/60 text-slate-400"
      }`}
    >
      {status || "-"}
    </span>
  );
}

export default function PriceRulesPage() {
  const showToast = useToast();
  const confirm = useConfirm();
  const canViewCostPrice = useCanViewCostPrice();

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await priceRulesApi.list();
      setRows(res?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load price rules"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canViewCostPrice) return;
    load();
    localProductsApi
      .getCategories()
      .then((res) => setCategories(normalizeList(res)))
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewCostPrice]);

  if (!canViewCostPrice) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-3 text-center">
        <SlidersHorizontal size={32} className="text-slate-600" />
        <p className="text-[14px] font-semibold text-slate-300">Access restricted</p>
        <p className="max-w-sm text-[12px] text-slate-500">
          Price rules affect profit margins and are only visible to admin and master admin accounts.
        </p>
      </div>
    );
  }

  function categoryName(id) {
    if (!id) return "Global (all categories)";
    const match = categories.find((c) => String(c.id) === String(id));
    return match?.name || match?.category_name || `#${id}`;
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || "",
      category_id: row.category_id || "",
      marketplace: row.marketplace || "all",
      margin_type: row.margin_type || "percentage",
      margin_value: row.margin_value ?? "",
      rounding_rule: row.rounding_rule || "none",
      min_price: row.min_price ?? "",
      max_price: row.max_price ?? "",
      priority: row.priority ?? 0,
      status: row.status || "active",
    });
    setModalOpen(true);
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast("Rule name is required.", { type: "error" });
      return;
    }

    if (form.margin_value === "" || Number.isNaN(Number(form.margin_value))) {
      showToast("Margin value is required.", { type: "error" });
      return;
    }

    setSaving(true);

    try {
      const payload = { ...form, category_id: form.category_id || null };

      if (editing) {
        await priceRulesApi.update(editing.id, payload);
        showToast("Price rule updated.", { type: "success" });
      } else {
        await priceRulesApi.create(payload);
        showToast("Price rule created.", { type: "success" });
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to save price rule"), { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!(await confirm(`Delete price rule "${row.name}"? This can't be undone.`))) return;

    try {
      await priceRulesApi.remove(row.id);
      showToast("Price rule deleted.", { type: "success" });
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to delete price rule"), { type: "error" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <SlidersHorizontal size={20} />
            Price Rules
          </h1>
          <p className="text-[13px] text-slate-500">
            Suggests a selling price per marketplace from cost + margin whenever the Inventory Dashboard updates a SKU's cost price.
            Suggestions never overwrite a manually-set price — apply them from the Price Dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400"
        >
          <Plus size={12} /> New Rule
        </button>
      </div>

      {error && <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>}

      {loading ? (
        <Loader label="Loading price rules..." minHeight="200px" />
      ) : !rows.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          No price rules yet. Click New Rule to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Marketplace</th>
                <th className="px-3 py-2 font-medium">Margin</th>
                <th className="px-3 py-2 font-medium">Rounding</th>
                <th className="px-3 py-2 font-medium">Min / Max</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-[#0b1220] align-top">
                  <td className="px-3 py-2 font-semibold text-slate-100">{row.name}</td>
                  <td className="px-3 py-2 text-slate-300">{categoryName(row.category_id)}</td>
                  <td className="px-3 py-2 text-slate-300 capitalize">{row.marketplace}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.margin_type === "fixed" ? "+" : ""}
                    {row.margin_value}
                    {row.margin_type === "percentage" ? "%" : ""}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {ROUNDING_OPTIONS.find((o) => o.value === row.rounding_rule)?.label || row.rounding_rule}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.min_price ?? "-"} / {row.max_price ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-900 bg-amber-950 text-amber-300 hover:bg-amber-900"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] shadow-2xl"
          >
            <div className="flex items-center justify-between rounded-t-2xl border-b border-white/10 bg-[#653bb3] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-white">{editing ? "Edit Price Rule" : "New Price Rule"}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase text-slate-500">
                  Rule Name <span className="text-orange-400">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Category</span>
                <select
                  value={form.category_id}
                  onChange={(e) => setField("category_id", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  <option value="">Global (all categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.category_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Marketplace</span>
                <select
                  value={form.marketplace}
                  onChange={(e) => setField("marketplace", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  {MARKETPLACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Margin Type</span>
                <select
                  value={form.margin_type}
                  onChange={(e) => setField("margin_type", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">
                  Margin Value {form.margin_type === "percentage" ? "(%)" : "(amount)"} <span className="text-orange-400">*</span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={form.margin_value}
                  onChange={(e) => setField("margin_value", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Rounding Rule</span>
                <select
                  value={form.rounding_rule}
                  onChange={(e) => setField("rounding_rule", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  {ROUNDING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Priority</span>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setField("priority", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Min Price</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.min_price}
                  onChange={(e) => setField("min_price", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Max Price</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.max_price}
                  onChange={(e) => setField("max_price", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={13} /> {saving ? "Saving..." : "Save Rule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
