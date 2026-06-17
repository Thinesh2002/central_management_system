import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Package,
  User,
  Printer,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Clock
} from "lucide-react";
import API from "../../../config/api";

export default function OrderView() {
  const { order_id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef(null);

  /* ================= FETCH ORDER ================= */
  useEffect(() => {
    fetchOrder();
  }, [order_id]);

  const fetchOrder = async () => {
    try {
      const res = await API.get(`/orders/view/${order_id}`);

      console.log("ORDER API RESPONSE 👉", res.data);

      // ✅ FIX: access .data.data
      setOrder(res.data?.data || null);
    } catch (err) {
      console.error("Order fetch failed", err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATUS UPDATE ================= */
  const updateStatus = async (status) => {
    setStatusOpen(false);
    try {
      await API.patch(`/orders/status/${order_id}`, { status });
      setOrder(prev => ({ ...prev, status }));
    } catch {
      alert("Failed to update order status");
    }
  };

  useEffect(() => {
    const close = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* ================= PRINT ================= */
  const printInvoice = () => {
    const html = document.getElementById("print-area").innerHTML;
    const w = window.open("", "", "width=900,height=700");
    w.document.write(`<html><body>${html}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-red-400">
        Order not found
      </div>
    );
  }

  /* ================= SAFE DATA ================= */
  const items = Array.isArray(order.items) ? order.items : [];
  const customer = order.customer || null;

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString()
    : "Date not available";

  const totalAmount = Number(order.total_amount || 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 lg:p-10">

      {/* HEADER */}
      <header className="flex justify-between items-start mb-10">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h1 className="text-3xl font-bold text-white">
            Order #{order.order_id}
          </h1>

          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
            <Clock size={14} /> {orderDate}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-right">
          <p className="text-xs uppercase text-slate-400">Grand Total</p>
          <p className="text-2xl font-bold text-white mt-1">
            Rs. {totalAmount.toLocaleString()}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ITEMS */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-slate-800">
            <h3 className="font-semibold flex items-center gap-2">
              <Package size={18} /> Order Items
            </h3>
            <button
              onClick={printInvoice}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl"
            >
              <Printer size={18} />
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left">SKU</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length > 0 ? (
                items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 font-medium">{i.sku}</td>
                    <td className="px-6 py-4 text-center">{i.quantity}</td>
                    <td className="px-6 py-4 text-right">Rs. {i.price}</td>
                    <td className="px-6 py-4 text-right font-semibold">
                      Rs. {i.quantity * i.price}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-4 space-y-6">

          {/* STATUS */}
          <div ref={statusRef} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-xs uppercase text-slate-400 mb-3">Order Status</p>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="w-full flex justify-between items-center px-4 py-3 bg-slate-800 rounded-xl"
            >
              <span className="font-semibold">{order.status}</span>
              <ChevronDown size={16} />
            </button>

            <AnimatePresence>
              {statusOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-2 bg-slate-800 rounded-xl overflow-hidden"
                >
                  {["PENDING", "DELIVERED", "CANCELLED"].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className="block w-full px-4 py-3 text-left hover:bg-blue-600"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CUSTOMER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User size={18} /> Customer
            </h3>

            {customer ? (
              <div className="space-y-3 text-sm">
                <Info icon={<User size={14}/>} label="Name" value={customer.name} />
                <Info icon={<Phone size={14}/>} label="Phone" value={customer.phone} />
                <Info icon={<Mail size={14}/>} label="Email" value={customer.email} />
                <Info icon={<MapPin size={14}/>} label="Address" value={customer.address} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Customer data not available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PRINT */}
      <div id="print-area" style={{ display: "none" }}>
        <h2>Invoice #{order.order_id}</h2>
        <p>{customer?.name}</p>
        <p>{customer?.address}</p>
      </div>
    </div>
  );
}

/* SMALL COMPONENT */
const Info = ({ icon, label, value }) => (
  <div className="flex gap-3">
    <div className="text-blue-400">{icon}</div>
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-white">{value || "-"}</p>
    </div>
  </div>
);
