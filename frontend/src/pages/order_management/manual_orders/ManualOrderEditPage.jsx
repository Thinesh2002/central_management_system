import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import manualOrdersApi from "../../../config/sub_api/order_management_api/manual_orders_api";
import OrderForm from "./components/OrderForm";
import {
  buildOrderUpdatePayload,
  emptyOrderForm,
  normalizeError,
  unwrapApiResponse,
} from "./utils/orderFrontendHelpers";

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function mapOrderToForm(order = {}) {
  return {
    ...emptyOrderForm(),
    ...order,
    order_date: toDateTimeInput(order.order_date),
    due_date: toDateInput(order.due_date),
    customer_code: order.customer_code || "",
    discount: order.discount ?? 0,
    shipping_cost_actual: order.shipping_cost_actual ?? 450,
    shipping_cost_paid_by_buyer: order.shipping_cost_paid_by_buyer ?? 0,
    paid_amount: order.paid_amount ?? 0,
    items: Array.isArray(order.items) ? order.items : [],
  };
}

export default function ManualOrderEditPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [form, setForm] = useState(emptyOrderForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");
      const response = await manualOrdersApi.getOrderById(orderId);
      const result = unwrapApiResponse(response);
      setForm(mapOrderToForm(result.data || {}));
    } catch (err) {
      setError(normalizeError(err, "Order load panna mudiyala"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleDeleteExistingItem(item) {
    if (!item?.id) return;
    await manualOrdersApi.deleteOrderItem(item.id, { reason: "Removed from order edit page" });
  }

  async function syncItems() {
    const activeItems = (form.items || []).filter((item) => !item._deleted);

    for (const item of activeItems) {
      const payload = {
        sku: item.sku || null,
        product_name: item.product_name || "Manual Item",
        description: item.description || null,
        image_url: item.image_url || null,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        item_status: item.item_status || "Active",
      };

      if (item.id) {
        await manualOrdersApi.updateOrderItem(item.id, payload);
      } else {
        await manualOrdersApi.addOrderItem(orderId, payload);
      }
    }
  }

  function validate() {
    if (!form.customer_name?.trim()) return "Customer name required";
    if (!form.customer_phone?.trim()) return "Customer phone required";
    if (!form.customer_address?.trim()) return "Customer address required";
    const activeItems = (form.items || []).filter((item) => !item._deleted);
    if (!activeItems.length) return "At least one order item required";
    return "";
  }

  async function handleSubmit() {
    try {
      setSaving(true);
      setError("");

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      await manualOrdersApi.updateOrder(orderId, buildOrderUpdatePayload(form));
      await syncItems();

      navigate(`/orders/${encodeURIComponent(orderId)}`);
    } catch (err) {
      setError(normalizeError(err, "Order update panna mudiyala"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={22} /> Loading order...
      </div>
    );
  }

  return (
    <OrderForm
      mode="edit"
      form={form}
      setForm={setForm}
      onSubmit={handleSubmit}
      saving={saving}
      error={error}
      onDeleteExistingItem={handleDeleteExistingItem}
    />
  );
}
