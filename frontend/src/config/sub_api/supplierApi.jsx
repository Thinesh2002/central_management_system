import API from "../../config/api";

export const supplierApi = {
  getSuppliers: (params) =>
    API.get("/suppliers/all", { params }),

  createSupplier: (data) =>
    API.post("/suppliers/create", data),

  updateSupplier: (id, data) =>
    API.put(`/suppliers/${id}`, data),

  deleteSupplier: (id) =>
    API.delete(`/suppliers/${id}`),

  getSupplierProducts: (params) =>
    API.get("/suppliers/products", { params }),

  createSupplierProduct: (data) =>
    API.post("/suppliers/products", data),

  updateSupplierProduct: (id, data) =>
    API.put(`/suppliers/supplier-products/${id}`, data),

  deleteSupplierProduct: (id) =>
    API.delete(`/suppliers/supplier-products/${id}`),

  getSupplierProductsBySku: (sku) =>
    API.get(`/suppliers/supplier-products/sku/${sku}`),

  getShipments: (params) =>
    API.get("/suppliers/shipments", { params }),

  createShipment: (data) =>
    API.post("/suppliers/shipments", data),

  getShipmentById: (id) =>
    API.get(`/suppliers/shipments/${id}`),

  updateShipment: (id, data) =>
    API.put(`/suppliers/shipments/${id}`, data),

  deleteShipment: (id) =>
    API.delete(`/suppliers/shipments/${id}`),

  createShipmentOrder: (shipmentId, data) =>
    API.post(`/suppliers/shipments/${shipmentId}/orders`, data),

  getShipmentOrders: (shipmentId) =>
    API.get(`/suppliers/shipments/${shipmentId}/orders`),

  updateShipmentOrder: (orderId, data) =>
    API.put(`/suppliers/shipment-orders/${orderId}`, data),

  deleteShipmentOrder: (orderId) =>
    API.delete(`/suppliers/shipment-orders/${orderId}`),
};