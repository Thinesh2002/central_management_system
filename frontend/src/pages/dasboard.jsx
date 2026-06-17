import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Chart } from "react-google-charts";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  Box,
  ShoppingCart,
  ArrowUpRight,
  Users,
  CreditCard,
  Zap,
  BarChart
} from "lucide-react";
import API from "../config/api";

export default function UnifiedHomeDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ orders: [], products: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          API.get("/orders/view"),
          API.get("/products/list")
        ]);

        setData({
          orders: ordersRes.data?.data || [],
          products: productsRes.data || []
        });
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ================= STATS ================= */
  const stats = useMemo(() => {
    const totalSales = data.orders.reduce(
      (s, o) => s + Number(o.total_amount || 0),
      0
    );
    const activeProducts = data.products.length;
    const pendingOrders = data.orders.filter(o => o.status === "PENDING").length;
    const totalVariants = data.products.filter(p => p.product_type === "child").length;

    return { totalSales, activeProducts, pendingOrders, totalVariants };
  }, [data]);

  const pieData = useMemo(() => [
    ["Type", "Count"],
    ["Products", stats.activeProducts],
    ["Pending Orders", stats.pendingOrders],
    ["Variants", stats.totalVariants]
  ], [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className=" ">

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 ">
            <LayoutDashboard size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Business Overview
            </span>
          </div>
        
       
        </div>


      </header>

      {/* KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Stat label="Total Sales" value={`Rs. ${stats.totalSales.toLocaleString()}`} icon={<TrendingUp />} />
        <Stat label="Active Products" value={stats.activeProducts} icon={<Box />} />
        <Stat label="Pending Orders" value={stats.pendingOrders} icon={<ShoppingCart />} />
        <Stat label="Product Variants" value={stats.totalVariants} icon={<BarChart />} />
      </section>

      {/* ANALYTICS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* AREA CHART */}
        <div className="lg:col-span-8 bg-[#0F172A]/80 backdrop-blur-xl border border-[#1E293B] rounded-2xl p-6 glow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-white">
                Revenue & Orders
              </h3>
              <p className="text-xs text-slate-400">
                Last 7 days performance
              </p>
            </div>
            <button
              onClick={() => navigate("/profit-dashboard")}
              className="text-sm text-cyan-400 hover:underline flex items-center gap-1"
            >
              View report <ArrowUpRight size={14} />
            </button>
          </div>

          <Chart
            chartType="AreaChart"
            width="100%"
            height="320px"
            data={[
              ["Day", "Revenue", "Orders"],
              ["Mon", 400, 10],
              ["Tue", 900, 25],
              ["Wed", 1200, 30],
              ["Thu", 800, 20],
              ["Fri", 1500, 45],
              ["Sat", 2000, 60],
              ["Sun", 1800, 50]
            ]}
            options={{
              backgroundColor: "transparent",
              colors: ["#22D3EE", "#38BDF8"],
              hAxis: { textStyle: { color: "#94A3B8" }, gridlines: { color: "transparent" } },
              vAxis: { textStyle: { color: "#94A3B8" }, gridlines: { color: "#1E293B" } },
              legend: { position: "none" },
              chartArea: { width: "92%", height: "78%" }
            }}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">

          {/* SYSTEM STATUS */}
          <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-[#1E293B] rounded-2xl p-6 glow">
            <h4 className="font-semibold text-white mb-1">
              System Status
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Live system availability
            </p>
            <HealthBar label="Database" percentage={98} />
            <HealthBar label="API" percentage={100} />
            <HealthBar label="Storage" percentage={45} />
          </div>

          {/* PIE CHART */}
          <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-[#1E293B] rounded-2xl p-6 glow">
            <h4 className="font-semibold text-white mb-1">
              Inventory Split
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Product and order distribution
            </p>

            <Chart
              chartType="PieChart"
              width="100%"
              height="260px"
              data={pieData}
              options={{
                backgroundColor: "transparent",
                pieHole: 0.55,
                colors: ["#22D3EE", "#38BDF8", "#0EA5E9"],
                legend: {
                  position: "bottom",
                  textStyle: { color: "#CBD5F5", fontSize: 12 }
                },
                chartArea: { width: "90%", height: "78%" }
              }}
            />
          </div>

          {/* NAVIGATION */}
          <div className="grid grid-cols-2 gap-4">
            <NavCard label="Products" icon={<Box />} onClick={() => navigate("/products")} />
            <NavCard label="Orders" icon={<ShoppingCart />} onClick={() => navigate("/orders-list")} />
            <NavCard label="Analytics" icon={<BarChart />} onClick={() => navigate("/advanced-analytics")} />
            <NavCard label="Profit" icon={<CreditCard />} onClick={() => navigate("/profit-dashboard")} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Stat({ label, value, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="bg-[#0F172A]/80 backdrop-blur-xl border border-[#1E293B] rounded-2xl p-6 glow transition"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400">
          {icon}
        </div>
        <span className="text-xs uppercase text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </motion.div>
  );
}

function NavCard({ label, icon, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="bg-[#020617]/80 backdrop-blur border border-[#1E293B] rounded-xl p-4 hover:bg-[#0F172A] glow transition flex items-center gap-3"
    >
      <div className="text-cyan-400">{icon}</div>
      <p className="text-sm font-medium text-slate-300">{label}</p>
    </motion.button>
  );
}

function HealthBar({ label, percentage }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1 bg-[#1E293B] rounded">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8 }}
          className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
        />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-[#0F172A]/80 backdrop-blur border border-[#1E293B] rounded-lg text-sm hover:bg-[#111827] glow transition"
    >
      {icon}
      {label}
    </button>
  );
}
