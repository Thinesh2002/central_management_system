import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import API from "../../../config/api";
import {
  RefreshCw,
  Wallet,
  Zap,
  DollarSign,
  ReceiptText
} from "lucide-react";

const DarazFinance = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const cleanAmount = (val) => {
    if (!val) return 0;
    return parseFloat(val.toString().replace(/,/g, "")) || 0;
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/daraz/finance/all-with-image");
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error("Finance Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  /* ============================== */
  const calculatedSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalVAT = 0;
    let totalWHT = 0;

    transactions.forEach((t) => {
      const amount = cleanAmount(t.amount);
      const vat = cleanAmount(t.VAT_in_amount);
      const wht = cleanAmount(t.WHT_amount);

      totalVAT += vat;
      totalWHT += wht;

      if (amount > 0) totalIncome += amount;
      else totalExpense += amount;
    });

    const netSales = totalIncome + totalExpense;

    return {
      totalIncome,
      totalExpense,
      totalVAT,
      totalWHT,
      netSales
    };
  }, [transactions]);

  /* ============================== */
  const groupedOrders = useMemo(() => {
    const groups = {};

    transactions.forEach((t) => {
      const id = t.order_no || "Non-Order Charges";

      if (!groups[id]) {
        groups[id] = {
          orderNo: id,
          date: t.transaction_date,
          totalImpact: 0,
          items: []
        };
      }

      groups[id].totalImpact += cleanAmount(t.amount);
      groups[id].items.push(t);
    });

    return Object.values(groups);
  }, [transactions]);

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
    <div className="w-full min-h-screen p-6 space-y-8 text-slate-200 
    bg-gradient-to-br from-[#020617] via-[#0f172a] to-black">

      {/* HEADER */}
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-white uppercase italic">
          Financial <span className="text-emerald-500">Ledger</span>
        </h1>

        <button
          onClick={fetchFinanceData}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-500/20 text-emerald-500"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={calculatedSummary.totalIncome} color="text-emerald-400" icon={DollarSign} />
        <StatCard label="Total Expenses" value={calculatedSummary.totalExpense} color="text-rose-400" icon={Zap} />
        <StatCard label="VAT Component" value={calculatedSummary.totalVAT} color="text-orange-400" icon={ReceiptText} />
        <StatCard label="Net Sales" value={calculatedSummary.netSales} color="text-white" icon={Wallet} isMain />
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="p-5 text-xs uppercase text-slate-500">Product</th>
              <th className="p-5 text-xs uppercase text-slate-500">Order</th>
              <th className="p-5 text-xs uppercase text-slate-500 text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {groupedOrders.map((order, idx) => {

              const firstItem = order.items.find(i => i.product_image);

              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">

                  {/* PRODUCT IMAGE + TITLE */}
                  <td className="p-5">
                    <div className="flex items-center gap-4">

                      {firstItem?.product_image ? (
                        <img
                          src={firstItem.product_image}
                          alt="Product"
                          className="w-16 h-16 object-cover rounded-xl border border-white/10"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-xs text-slate-500">
                          No Img
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-semibold text-white">
                          {firstItem?.product_name || "No Product Name"}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          SKU: {firstItem?.seller_sku || "N/A"}
                        </div>
                      </div>

                    </div>
                  </td>

                  {/* ORDER */}
                  <td className="p-5">
                    <a
                      href={`/orders/${order.orderNo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-bold hover:underline"
                    >
                      #{order.orderNo}
                    </a>
                    <div className="text-xs text-slate-500 mt-1">
                      {order.date}
                    </div>
                  </td>

                  {/* NET */}
                  <td className={`p-5 text-right font-bold ${
                    order.totalImpact >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}>
                    LKR {order.totalImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, icon: Icon, isMain }) => (
  <div className={`p-5 rounded-3xl border backdrop-blur-xl shadow-xl ${
    isMain
      ? "bg-emerald-500/10 border-emerald-500/20"
      : "bg-white/5 border-white/10"
  }`}>
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
      isMain ? "bg-emerald-500 text-black" : "bg-white/10 " + color
    }`}>
      <Icon size={16} />
    </div>
    <p className="text-xs uppercase text-slate-500">{label}</p>
    <h3 className={`text-lg font-bold mt-1 ${color}`}>
      LKR {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </h3>
  </div>
);

export default DarazFinance;