import manualOrdersApi from "../../../../../config/sub_api/order_management_api/manual_orders_api";

export async function fetchManualOrders(params = {}) {
  return manualOrdersApi.getOrders(params);
}

export async function deleteOrder(orderId) {
  const apiFunction =
    manualOrdersApi.deleteOrder ||
    manualOrdersApi.deleteManualOrder ||
    manualOrdersApi.delete ||
    manualOrdersApi.remove ||
    manualOrdersApi.destroy;

  if (!apiFunction) {
    throw new Error("Delete API function not found");
  }

  return apiFunction(orderId);
}
