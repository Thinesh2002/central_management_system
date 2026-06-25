import { useState } from "react";
import { useNavigate } from "react-router-dom";

import manualOrdersApi from "../../../config/sub_api/order_management_api/manual_orders_api";
import OrderForm from "./components/OrderForm";
import {
  buildOrderPayload,
  emptyOrderForm,
  normalizeError,
  unwrapApiResponse,
} from "./utils/orderFrontendHelpers";

export default function ManualOrderCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyOrderForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function validate(payload) {
    if (!payload.customer_name?.trim()) return "Customer name required";
    if (!payload.customer_phone?.trim()) return "Customer phone required";
    if (!payload.customer_address?.trim()) return "Customer address required";
    if (!payload.items?.length) return "At least one order item required";

    const invalidItem = payload.items.find(
      (item) => !item.product_name?.trim()
    );

    if (invalidItem) return "Every item needs product name";

    return "";
  }

  async function handleSubmit() {
    try {
      setSaving(true);
      setError("");

      const payload = buildOrderPayload(form);
      const validationError = validate(payload);

      if (validationError) {
        setError(validationError);
        return;
      }

      const response = await manualOrdersApi.createOrder(payload);
      const result = unwrapApiResponse(response);

      const orderId =
        result?.data?.order_id ||
        result?.order_id ||
        result?.data?.order?.order_id ||
        payload.order_id;

      navigate(`/orders/${encodeURIComponent(orderId)}`);
    } catch (err) {
      setError(normalizeError(err, "Order create panna mudiyala"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrderForm
      mode="create"
      form={form}
      setForm={setForm}
      onSubmit={handleSubmit}
      saving={saving}
      error={error}
    />
  );
}