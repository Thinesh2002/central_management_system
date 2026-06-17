import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, DollarSign, Package, Truck,
  ArrowUpRight, BarChart3, PieChart as PieIcon, 
  ShoppingBag, Search, Filter, Download
} from "lucide-react";
import { Chart } from "react-google-charts";
import API, { API_BASE_URL } from "../../../config/api";

export default function ProductProfitDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        API.get("/orders/view"),
        API.get("/products/list"),
      ]);

      const detailedOrders = await Promise.all(
        (ordersRes.data?.data || []).map(o =>
          API.get(`/orders/view/${o.order_id}`).then(r => r.data.data)
        )
      );

      setOrders(detailedOrders);
      setProducts(productsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const orderRows = useMemo(() => {
    return orders.map(order => {
      let productCost = 0;
      order.items?.forEach(i => {
        const p = products.find(pr => pr.sku === i.sku);
        productCost += i.quantity * Number(p?.cost_price || 0);
      });

      const revenue = Number(order.total_amount || 0);
      const companyShipping = Number(order.shipping_fee || 0);
      const netSales = revenue - productCost - companyShipping;

      return { ...order, revenue, productCost, companyShipping, netSales };
    }).filter(o => o.order_id.toString().includes(searchTerm));
  }, [orders, products, searchTerm]);

  const totals = useMemo(() => {
    return orderRows.reduce(
      (a, o) => {
        a.revenue += o.revenue;
        a.net += o.netSales;
        a.costs += o.productCost;
        a.shipping += o.companyShipping;
        return a;
      },
      { revenue: 0, net: 0, costs: 0, shipping: 0 }
    );
  }, [orderRows]);

  if (loading) return <LoadingScreen />;

  return (
    <div className=" ">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1600px] mx-auto ">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              Net Sales 
            </h1>
          
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search Order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 focus:ring-2 ring-blue-500/50 outline-none w-64 transition-all"
              />
            </div>
   
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <StatCard title="Gross Revenue" value={totals.revenue} trend="+12.5%" icon={<TrendingUp size={24}/>} />
          <StatCard title="Net Profit" value={totals.net} trend="+8.2%" icon={<DollarSign size={24}/>} isProfit />
          <StatCard title="Operating Costs" value={totals.costs + totals.shipping} trend="-2.1%" icon={<Package size={24}/>} />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CHART AREA */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 backdrop-blur-md">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieIcon size={20} className="text-emerald-400" /> Breakdown
                </h3>
              </div>
              <Chart
                chartType="PieChart"
                width="100%"
                height="300px"
                data={[["Task", "Value"], ["Profit", totals.net], ["COGS", totals.costs], ["Shipping", totals.shipping]]}
                options={{
                  backgroundColor: "transparent",
                  pieHole: 0.5,
                  colors: ["#10b981", "#3b82f6", "#f43f5e"],
                  legend: "none",
                  pieSliceBorderColor: "none",
                  chartArea: { width: "100%", height: "80%" },
                }}
              />
              <div className="mt-6 space-y-3">
                <LegendItem color="bg-emerald-500" label="Net Profit" value={totals.net} />
                <LegendItem color="bg-blue-500" label="Product Costs" value={totals.costs} />
                <LegendItem color="bg-rose-500" label="Shipping" value={totals.shipping} />
              </div>
            </div>
          </div>

          {/* TABLE AREA */}
          <div className="lg:col-span-8 bg-white/[0.03] border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-md">
            <div className="p-8 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <ShoppingBag className="text-blue-500" /> Recent Transactions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-white/5">
                    <th className="px-8 py-5 font-semibold">Order Details</th>
                    <th className="px-8 py-5 font-semibold">Revenue</th>
                    <th className="px-8 py-5 font-semibold">Profit</th>
                    <th className="px-8 py-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orderRows.map((o) => (
                    <motion.tr 
                      key={o.order_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedOrder(o)}
                      className="group hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-8 py-6">
                        <span className="text-white font-bold text-lg block">#{o.order_id}</span>
                        <span className="text-xs text-slate-500 font-medium italic">Confirmed Order</span>
                      </td>
                      <td className="px-8 py-6 text-slate-300 font-medium">Rs. {o.revenue.toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl font-bold text-sm ${o.netSales >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          Rs. {o.netSales.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="inline-flex p-2 rounded-lg bg-white/5 group-hover:bg-blue-600 transition-all text-blue-400 group-hover:text-white">
                          <ArrowUpRight size={18} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {selectedOrder && <EnhancedModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ================= COMPONENT SUB-SECTIONS ================= */

function StatCard({ title, value, icon, trend, isProfit }) {
  return (
    <motion.div 
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-4">{title}</p>
      <div className="flex items-end gap-3">
        <h2 className={`text-4xl font-black ${isProfit ? 'text-emerald-400' : 'text-white'}`}>
          Rs. {value.toLocaleString()}
        </h2>
        <span className="text-xs font-bold text-emerald-400 mb-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{trend}</span>
      </div>
    </motion.div>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-white">Rs. {value.toLocaleString()}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold tracking-widest text-xs uppercase animate-pulse">Synchronizing Data...</p>
    </div>
  );
}

function EnhancedModal({ order, onClose }) {
  const img = (sku, i) => sku && i ? `${API_BASE_URL}/images/products/${encodeURIComponent(sku)}/${encodeURIComponent(i)}` : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-[#111114] border border-white/10 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Items */}
          <div className="p-10 bg-white/[0.02] border-r border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white">Order Items</h2>
              <span className="text-blue-400 font-bold">#{order.order_id}</span>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <img src={img(item.sku, item.image)} className="w-14 h-14 rounded-xl object-cover bg-slate-800" alt="prod" />
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-sm truncate w-32">{item.sku}</h4>
                    <p className="text-xs text-slate-500 font-medium">Qty: {item.quantity} × Rs. {item.price}</p>
                  </div>
                  <p className="font-black text-white">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Right: Summary */}
          <div className="p-10 flex flex-col justify-between relative">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition"><X/></button>
            <div>
              <h2 className="text-2xl font-black text-white mb-8">Profit Analysis</h2>
              <div className="space-y-5">
                <SummaryRow label="Total Revenue" value={order.revenue} />
                <SummaryRow label="Product Cost (COGS)" value={order.productCost} />
                <SummaryRow label="Shipping (Company Paid)" value={order.companyShipping} />
                <div className="h-px bg-white/10 my-6" />
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Final Net Profit</p>
                  <p className={`text-5xl font-black ${order.netSales >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                    Rs. {order.netSales.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-full bg-white text-black font-black py-4 rounded-2xl mt-10 hover:bg-slate-200 transition">Dismiss</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-white font-bold italic">Rs. {value.toLocaleString()}</span>
    </div>
  );
}