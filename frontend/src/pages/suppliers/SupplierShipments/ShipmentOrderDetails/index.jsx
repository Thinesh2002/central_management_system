import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Pencil,
  Trash2,
  Save,
  Plus,
  Truck,
  Boxes,
  Image as ImageIcon,
  RefreshCw,
  X,
} from "lucide-react";
import API, { API_BASE_URL } from "../../../../config/api";
import { supplierApi } from "../../../../config/sub_api/supplierApi";

const initialOrderForm = {
  sku: "",
  product_name: "",
  product_image: "",
  order_qty: "",
  purchase_price: "",
  received_qty: "0",
  status: "ordered",
};

const formatDate = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "-";

const getImageUrl = (sku, image) =>
  sku && image ? `${API_BASE_URL}/images/productimage/${sku}/${image}` : "";

const preloadImages = (orders = []) => {
  orders.forEach((order) => {
    const url = getImageUrl(order.sku, order.product_image);
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
};

export default function ShipmentOrderDetails() {
  const navigate = useNavigate();
  const { shipmentId } = useParams();

  const [shipment, setShipment] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuMessage, setSkuMessage] = useState("");
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [orderForm, setOrderForm] = useState(initialOrderForm);

  const resetOrderForm = () => {
    setOrderForm(initialOrderForm);
    setEditingOrder(null);
    setProductPreview(null);
    setSkuMessage("");
  };

  const fetchShipment = async () => {
    if (!shipmentId) return;

    try {
      setLoading(true);
      const res = await supplierApi.getShipmentById(shipmentId);
      const shipmentData = res.data.data || null;
      const orderList = shipmentData?.orders || [];

      preloadImages(orderList);
      setShipment(shipmentData);
      setOrders(orderList);
    } catch (error) {
      console.error("Fetch shipment details error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipment();
    resetOrderForm();
  }, [shipmentId]);

  const findProductBySku = async (skuValue) => {
    const cleanSku = skuValue.trim();

    if (!cleanSku) {
      setSkuMessage("");
      setProductPreview(null);
      setOrderForm((prev) => ({
        ...prev,
        product_name: "",
        product_image: "",
      }));
      return;
    }

    try {
      setSkuLoading(true);
      setSkuMessage("");

      const productsRes = await API.get("/products");
      const products = productsRes.data?.data || [];

      const parentProduct = products.find(
        (item) => item.parent_sku?.toLowerCase() === cleanSku.toLowerCase()
      );

      if (parentProduct) {
        const data = {
          sku: parentProduct.parent_sku,
          product_name: parentProduct.product_name || "",
          product_image: parentProduct.main_image || "",
          image_url: getImageUrl(parentProduct.parent_sku, parentProduct.main_image),
        };

        setOrderForm((prev) => ({
          ...prev,
          sku: data.sku,
          product_name: data.product_name,
          product_image: data.product_image,
        }));

        setProductPreview(data);
        setSkuMessage("Product found");
        return;
      }

      for (const product of products) {
        if (!product.parent_sku) continue;

        const variationRes = await API.get(`/products/${product.parent_sku}/variations`);
        const variations = variationRes.data?.data || [];

        const variation = variations.find(
          (item) => item.sku?.toLowerCase() === cleanSku.toLowerCase()
        );

        if (variation) {
          const productName = [product.product_name, variation.color, variation.size]
            .filter(Boolean)
            .join(" - ");

          const data = {
            sku: variation.sku,
            product_name: productName || product.product_name || "",
            product_image: variation.main_image || "",
            image_url: getImageUrl(variation.sku, variation.main_image),
          };

          setOrderForm((prev) => ({
            ...prev,
            sku: data.sku,
            product_name: data.product_name,
            product_image: data.product_image,
          }));

          setProductPreview(data);
          setSkuMessage("Variation found");
          return;
        }
      }

      setOrderForm((prev) => ({
        ...prev,
        product_name: "",
        product_image: "",
      }));
      setProductPreview(null);
      setSkuMessage("No product found for this SKU");
    } catch (error) {
      console.error("Find product by SKU error:", error);
      setSkuMessage("Failed to check SKU");
    } finally {
      setSkuLoading(false);
    }
  };

  const handleOrderChange = (e) => {
    const { name, value } = e.target;

    setOrderForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "sku") {
      setSkuMessage("");
      setProductPreview(null);
    }
  };

  const openAddOrderModal = () => {
    resetOrderForm();
    setOrderModalOpen(true);
  };

  const closeOrderModal = () => {
    setOrderModalOpen(false);
    resetOrderForm();
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);

    setOrderForm({
      sku: order.sku || "",
      product_name: order.product_name || "",
      product_image: order.product_image || "",
      order_qty: order.order_qty || "",
      purchase_price: order.purchase_price || "",
      received_qty: order.received_qty || "0",
      status: order.status || "ordered",
    });

    setProductPreview({
      sku: order.sku,
      product_name: order.product_name || "",
      product_image: order.product_image || "",
      image_url: getImageUrl(order.sku, order.product_image),
    });

    setOrderModalOpen(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();

    try {
      setSavingOrder(true);

      if (editingOrder) {
        await supplierApi.updateShipmentOrder(editingOrder.id, orderForm);
      } else {
        await supplierApi.createShipmentOrder(shipmentId, orderForm);
      }

      closeOrderModal();
      fetchShipment();
    } catch (error) {
      alert(error.response?.data?.message || "Order save failed");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this shipment order?")) return;

    try {
      await supplierApi.deleteShipmentOrder(orderId);
      fetchShipment();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const totalQty = orders.reduce((sum, item) => sum + Number(item.order_qty || 0), 0);
  const totalReceived = orders.reduce((sum, item) => sum + Number(item.received_qty || 0), 0);
  const totalAmount = orders.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <Header navigate={navigate} openAddOrderModal={openAddOrderModal} />

      {loading && (
        <div className="p-10 text-center text-yellow-400 flex items-center justify-center gap-2">
          <RefreshCw size={18} className="animate-spin" />
          Loading shipment details...
        </div>
      )}

      {!loading && shipment && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Info label="Shipment Code" value={shipment.shipment_code} highlight />
            <Info label="Supplier" value={shipment.supplier_name} />
            <Info label="Shipment Date" value={formatDate(shipment.shipment_date)} />
            <Info label="Expected Arrival" value={formatDate(shipment.expected_arrival_date)} />
            <Info label="Status" value={shipment.status} />
            <Info label="Total Orders" value={orders.length} />
            <Info label="Total Ordered Qty" value={totalQty} />
            <Info label="Total Received Qty" value={totalReceived} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Total Orders" value={orders.length} />
            <SummaryCard label="Total Qty" value={totalQty} />
            <SummaryCard label="Total Amount" value={`Rs. ${Number(totalAmount).toFixed(2)}`} />
          </div>

          <OrdersTable
            orders={orders}
            openAddOrderModal={openAddOrderModal}
            handleEditOrder={handleEditOrder}
            handleDeleteOrder={handleDeleteOrder}
          />
        </>
      )}

      {!loading && !shipment && (
        <div className="p-10 text-center text-slate-400">Shipment not found</div>
      )}

      {orderModalOpen && (
        <OrderModal
          editingOrder={editingOrder}
          orderForm={orderForm}
          productPreview={productPreview}
          skuMessage={skuMessage}
          skuLoading={skuLoading}
          savingOrder={savingOrder}
          closeOrderModal={closeOrderModal}
          handleOrderChange={handleOrderChange}
          handleSaveOrder={handleSaveOrder}
          findProductBySku={findProductBySku}
        />
      )}
    </div>
  );
}

function Header({ navigate, openAddOrderModal }) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
          <Truck size={30} />
          Shipment Order Details
        </h1>
        <p className="text-slate-300 mt-2">
          View shipment orders and add new SKU orders using popup.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate("/suppliers-shipments")}
          className="cursor-pointer px-5 py-3 rounded-2xl bg-[#132238] border border-white/10 text-white font-semibold hover:border-yellow-400 transition-all flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          onClick={openAddOrderModal}
          className="cursor-pointer px-5 py-3 rounded-2xl bg-yellow-400 text-[#07111f] font-semibold hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          Add Shipment Order
        </button>
      </div>
    </div>
  );
}

function OrdersTable({ orders, openAddOrderModal, handleEditOrder, handleDeleteOrder }) {
  return (
    <div className="rounded-3xl bg-[#081221] border border-white/10 overflow-hidden">
      <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
          <Boxes size={22} />
          Shipment Orders
        </h3>

        <button
          onClick={openAddOrderModal}
          className="cursor-pointer px-4 py-2 rounded-xl bg-yellow-400 text-[#07111f] font-semibold flex items-center gap-2"
        >
          <Plus size={16} />
          Add Order
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#132238] text-slate-200">
            <tr>
              {["Image", "SKU", "Product", "Order Qty", "Received Qty", "Purchase Price", "Total", "Status", "Action"].map(
                (head) => (
                  <th key={head} className={`p-4 ${head === "Action" ? "text-right" : "text-left"}`}>
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => {
              const image = getImageUrl(order.sku, order.product_image);
              const productName = order.product_name || "-";

              return (
                <tr key={order.id} className="border-t border-white/10 hover:bg-white/[0.04]">
                  <td className="p-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#07111f] border border-white/10 overflow-hidden flex items-center justify-center">
                      {image ? (
                        <img
                          src={image}
                          alt={productName}
                          loading="eager"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={22} className="text-slate-600" />
                      )}
                    </div>
                  </td>

                  <td className="p-4 font-semibold text-yellow-400">{order.sku}</td>
                  <td className="p-4 max-w-[420px]">{productName}</td>
                  <td className="p-4">{order.order_qty || 0}</td>
                  <td className="p-4">{order.received_qty || 0}</td>
                  <td className="p-4">Rs. {Number(order.purchase_price || 0).toFixed(2)}</td>
                  <td className="p-4">Rs. {Number(order.total_amount || 0).toFixed(2)}</td>

                  <td className="p-4">
                    <StatusBadge status={order.status} />
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="cursor-pointer px-3 py-2 rounded-xl bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400 hover:text-[#07111f] flex items-center gap-2"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="cursor-pointer px-3 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {orders.length === 0 && (
              <tr>
                <td colSpan="9" className="p-10 text-center text-slate-400">
                  No shipment orders added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderModal({
  editingOrder,
  orderForm,
  productPreview,
  skuMessage,
  skuLoading,
  savingOrder,
  closeOrderModal,
  handleOrderChange,
  handleSaveOrder,
  findProductBySku,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0d1726] border border-yellow-400/30 shadow-2xl shadow-yellow-400/20">
        <div className="sticky top-0 bg-[#0d1726] z-10 border-b border-white/10 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
              <Package size={24} />
              {editingOrder ? "Edit Shipment Order" : "Add Shipment Order"}
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              Type SKU and click outside to auto load product title and image.
            </p>
          </div>

          <button
            onClick={closeOrderModal}
            className="cursor-pointer w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSaveOrder} className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-4">
            <div className="lg:col-span-2">
              <Input
                name="sku"
                label="SKU *"
                value={orderForm.sku}
                onChange={handleOrderChange}
                onBlur={() => findProductBySku(orderForm.sku)}
                required
              />

              {skuMessage && (
                <p
                  className={`text-xs mt-2 ${
                    skuMessage.includes("found") ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {skuLoading ? "Checking SKU..." : skuMessage}
                </p>
              )}
            </div>

            <div className="lg:col-span-2">
              <Input
                name="product_name"
                label="Product Name"
                value={orderForm.product_name}
                onChange={handleOrderChange}
              />
            </div>

            <Input name="order_qty" label="Order Qty *" type="number" value={orderForm.order_qty} onChange={handleOrderChange} required />
            <Input name="purchase_price" label="Purchase Price" type="number" value={orderForm.purchase_price} onChange={handleOrderChange} />
            <Input name="received_qty" label="Received Qty" type="number" value={orderForm.received_qty} onChange={handleOrderChange} />

            <div>
              <label className="text-sm text-slate-300">Status</label>
              <select
                name="status"
                value={orderForm.status}
                onChange={handleOrderChange}
                className="cursor-pointer w-full mt-1 bg-[#07111f] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
              >
                <option value="ordered">Ordered</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <ProductPreview productPreview={productPreview} orderForm={orderForm} />

          <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={closeOrderModal}
              className="cursor-pointer px-5 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingOrder}
              className="cursor-pointer px-6 py-3 rounded-2xl bg-yellow-400 text-[#07111f] font-semibold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {editingOrder ? <Save size={18} /> : <Plus size={18} />}
              {savingOrder ? "Saving..." : editingOrder ? "Update Order" : "Add Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductPreview({ productPreview, orderForm }) {
  return (
    <div className="rounded-2xl bg-[#07111f] border border-white/10 p-4 flex items-center gap-4">
      <div className="w-24 h-24 rounded-xl bg-[#0d1726] border border-white/10 overflow-hidden flex items-center justify-center">
        {productPreview?.image_url ? (
          <img
            src={productPreview.image_url}
            alt={productPreview.product_name}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon size={28} className="text-slate-600" />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">Product Preview</p>
        <p className="font-semibold text-white break-words">
          {productPreview?.product_name || orderForm.product_name || "-"}
        </p>
        <p className="text-sm text-yellow-400 mt-1">{orderForm.sku || "-"}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "received"
      ? "bg-green-500/15 text-green-400"
      : status === "partial"
      ? "bg-yellow-400/15 text-yellow-400"
      : status === "cancelled"
      ? "bg-red-500/15 text-red-400"
      : "bg-white/10 text-slate-300";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}

function Input({ label, name, value, onChange, onBlur, type = "text", required = false }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        className="w-full mt-1 bg-[#07111f] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 transition-all"
      />
    </div>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div className="rounded-2xl bg-[#081221] border border-white/10 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 font-semibold break-words ${highlight ? "text-yellow-400" : "text-white"}`}>
        {value || "-"}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-[#081221] border border-white/10 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-yellow-400 mt-1">{value}</p>
    </div>
  );
}