import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../../../config/api";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const OrderDetail = () => {
  const { orderId } = useParams();

  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);

  const cleanAmount = (val) => {
    if (!val) return 0;
    return parseFloat(val.toString().replace(/,/g, "")) || 0;
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await API.get("/daraz/finance/view");

      const filtered =
        res.data.data?.filter(
          (f) => String(f.order_no) === String(orderId)
        ) || [];

      setOrderData(filtered);

    } catch (err) {
      console.error("Order Detail Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  /* =========================
     CALCULATIONS
  ========================= */

  const summary = useMemo(() => {
    let totalSales = 0;
    let totalExpense = 0;
    let totalSoldQty = 0;

    orderData.forEach((row) => {
      const amount = cleanAmount(row.amount);

      // Sold Qty (avoid duplicates)
      if (row.quantity) {
        totalSoldQty += Number(row.quantity);
      }

      if (amount > 0) totalSales += amount;
      else totalExpense += amount;
    });

    const totalNet = totalSales + totalExpense;

    return {
      totalSales,
      totalExpense,
      totalNet,
      totalSoldQty
    };
  }, [orderData]);

  // Unique product info (avoid repeated rows)
  const productInfo = orderData.find(
    (d) => d.product_name || d.product_image
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <RefreshCw className="text-emerald-500" size={40} />
        </motion.div>
      </div>
    );

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-[#020617] via-[#0f172a] to-black text-slate-200 space-y-8">

      <h1 className="text-3xl font-black text-white">
        Order <span className="text-emerald-500">#{orderId}</span>
      </h1>

      {/* PRODUCT SECTION */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="text-sm uppercase text-slate-400 mb-6">
          Product Info
        </h2>

        {productInfo ? (
          <div className="flex gap-6 items-center">

            {productInfo.product_image ? (
              <img
                src={productInfo.product_image}
                alt="Product"
                className="w-28 h-28 object-cover rounded-xl border border-white/10"
              />
            ) : (
              <div className="w-28 h-28 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-xs text-slate-500">
                No Image
              </div>
            )}

            <div>
              <div className="text-xl font-semibold text-white">
                {productInfo.product_name || "No Product Name"}
              </div>

              <div className="text-sm text-slate-400 mt-2">
                SKU: {productInfo.seller_sku || "N/A"}
              </div>

              <div className="text-sm text-emerald-400 mt-2 font-semibold">
                Sold Quantity: {summary.totalSoldQty}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-slate-500 text-sm">
            No product data found.
          </div>
        )}
      </div>

      {/* FINANCE BREAKDOWN */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="text-sm uppercase text-slate-400 mb-6">
          Finance Breakdown
        </h2>

        <div className="space-y-4">
          {orderData.map((f, idx) => (
            <div
              key={idx}
              className="flex justify-between text-sm border-b border-white/10 pb-3"
            >
              <span>{f.fee_name}</span>
              <span
                className={
                  cleanAmount(f.amount) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }
              >
                LKR {cleanAmount(f.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SUMMARY */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="text-sm uppercase text-slate-400 mb-6">
          Order Summary
        </h2>

        <div className="space-y-3 text-sm">

          <div className="flex justify-between">
            <span>Total Sales</span>
            <span className="text-emerald-400 font-semibold">
              LKR {summary.totalSales.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Total Expense</span>
            <span className="text-rose-400 font-semibold">
              LKR {summary.totalExpense.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-lg font-bold pt-4 border-t border-white/10">
            <span>Total Net</span>
            <span
              className={
                summary.totalNet >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }
            >
              LKR {summary.totalNet.toFixed(2)}
            </span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default OrderDetail;