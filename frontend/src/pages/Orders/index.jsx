import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Eye
} from "lucide-react";
import { Chart } from "react-google-charts";
import API from "../../config/api";

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTER STATES */
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* LOAD DATA */
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await API.get("/orders/view");
      setOrders(res?.data?.data || []);
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  /* FILTERED ORDERS */
  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  /* KPI CALCULATIONS */
  const stats = useMemo(() => {
    const totalSales = filteredOrders.reduce(
      (s, o) => s + Number(o.total_amount || 0),
      0
    );

    const delivered = filteredOrders.filter(o => o.status === "DELIVERED").length;
    const pending = filteredOrders.filter(o => o.status === "PENDING").length;
    const cancelled = filteredOrders.filter(o => o.status === "CANCELLED").length;

    return {
      totalSales,
      delivered,
      pending,
      cancelled,
      pie: [
        ["Status", "Count"],
        ["Delivered", delivered],
        ["Pending", pending],
        ["Cancelled", cancelled]
      ]
    };
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className=" bg-[#020617] text-slate-200 0">

      {/* ================= HEADER ================= */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white">
          Sales Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Overview of orders, revenue and status
        </p>
      </header>

      {/* ================= FILTER BAR ================= */}
      <div className="flex flex-wrap items-center gap-4 mb-10">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Filter size={16} /> Filter by status
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="ALL">All Orders</option>
          <option value="DELIVERED">Delivered</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard
          icon={<DollarSign />}
          label="Total Sales"
          value={`Rs. ${stats.totalSales.toLocaleString()}`}
        />
        <KpiCard
          icon={<CheckCircle />}
          label="Delivered"
          value={stats.delivered}
          color="emerald"
        />
        <KpiCard
          icon={<Clock />}
          label="Pending"
          value={stats.pending}
          color="amber"
        />
        <KpiCard
          icon={<XCircle />}
          label="Cancelled"
          value={stats.cancelled}
          color="red"
        />
      </div>

      {/* ================= CHART + TABLE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* PIE CHART */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Order Status Breakdown
          </h3>

          <Chart
            chartType="PieChart"
            data={stats.pie}
            options={{
              backgroundColor: "transparent",
              pieHole: 0.6,
              colors: ["#10b981", "#f59e0b", "#ef4444"],
              legend: { position: "bottom", textStyle: { color: "#94a3b8" } },
              pieSliceBorderColor: "transparent"
            }}
            width="100%"
            height="260px"
          />
        </motion.div>

        {/* TABLE */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800/60 text-xs uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filteredOrders.map((o) => (
                <tr
                  key={o.order_id}
                  className="hover:bg-slate-800/40 transition"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    #{o.order_id}
                  </td>
                  <td className="px-6 py-4 text-blue-400 font-semibold">
                    Rs. {Number(o.total_amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/view-order/${o.order_id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="p-10 text-center text-slate-500 text-sm">
              No orders found for selected filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const KpiCard = ({ icon, label, value, color = "blue" }) => {
  const colorMap = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400"
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
    >
      <div className={`mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">
        {value}
      </p>
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    DELIVERED: "bg-emerald-500/10 text-emerald-400",
    PENDING: "bg-amber-500/10 text-amber-400",
    CANCELLED: "bg-red-500/10 text-red-400"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
};
