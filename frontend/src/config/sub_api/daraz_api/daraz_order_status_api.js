import api from '../../api';

function payload(orderId, extra = {}) {
  return { order_id: orderId, ...extra };
}

export const darazOrderStatusApi = {
  pack(orderId, extra = {}) { return api.post('/daraz/order-status/pack', payload(orderId, extra)); },
  readyToShip(orderId, extra = {}) { return api.post('/daraz/order-status/ready-to-ship', payload(orderId, extra)); },
  cancel(orderId, extra = {}) { return api.post('/daraz/order-status/cancel', payload(orderId, extra)); },
  syncStatus(orderId, extra = {}) { return api.post('/daraz/order-status/sync', payload(orderId, extra)); },
  syncTracking(orderId, extra = {}) { return api.post('/daraz/order-status/sync-tracking', payload(orderId, extra)); },
  printAwb(orderId, extra = {}) { return api.post('/daraz/order-status/print-awb', payload(orderId, extra)); },
  printInvoice(orderId, extra = {}) { return api.post('/daraz/order-status/print-invoice', payload(orderId, extra)); },
  setInvoiceNumber(orderId, invoiceNumber, extra = {}) { return api.post('/daraz/order-status/invoice-number', payload(orderId, { invoice_number: invoiceNumber, ...extra })); },
};

export default darazOrderStatusApi;
