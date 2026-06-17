import React, { useEffect, useState, useMemo } from "react";
import { Chart } from "react-google-charts";
import { motion } from "framer-motion"; 
import { getIncomes } from "../../services/Finance/finance.service";
import { 
  Wallet, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  Layers, 
  Zap,
  Activity,
  Filter,
  DownloadCloud
} from "lucide-react";

const IncomeDashboard = () => {
    const [incomes, setIncomes] = useState([]);
    const [filterPlatform, setFilterPlatform] = useState("All");

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await getIncomes();
            setIncomes(res?.data?.data || []);
        } catch (error) {
            console.error("Matrix Sync Failure");
        }
    };

    // ANALYTICAL CALCULATIONS
    const stats = useMemo(() => {
        const total = incomes.reduce((sum, i) => sum + Number(i.net_amount || 0), 0);
        const avg = incomes.length ? total / incomes.length : 0;
        const highest = incomes.length ? Math.max(...incomes.map(i => Number(i.net_amount))) : 0;
        return { total, avg, highest };
    }, [incomes]);

    const filteredIncomes = useMemo(() => {
        return filterPlatform === "All" 
            ? incomes 
            : incomes.filter(i => i.source_name === filterPlatform);
    }, [incomes, filterPlatform]);

    const platforms = ["All", ...new Set(incomes.map(i => i.source_name))];

    const pieData = useMemo(() => {
        const map = filteredIncomes.reduce((acc, cur) => {
            acc[cur.source_name] = (acc[cur.source_name] || 0) + Number(cur.net_amount || 0);
            return acc;
        }, {});
        return [["Platform", "Revenue"], ...Object.entries(map)];
    }, [filteredIncomes]);

    const chartOptions = {
        backgroundColor: "transparent",
        colors: ["#3b82f6", "#2563eb", "#60a5fa", "#1d4ed8", "#93c5fd"],
        legend: { textStyle: { color: "#94a3b8", fontSize: 10 } },
        pieHole: 0.5,
        chartArea: { width: "100%", height: "80%" },
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-4 md:p-10 space-y-10 bg-[#020617] min-h-screen"
        >
            {/* HEADER & CONTROLS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter italic drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        FINANCE <span className="text-blue-500 not-italic">MATRIX</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                            <Zap size={10} fill="currentColor" /> Neural Sync Active
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">v4.0 Analytic Engine</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-2 hover:border-blue-500/30 transition-all">
                        <Filter size={14} className="text-slate-500" />
                        <select 
                            value={filterPlatform} 
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-300 outline-none cursor-pointer"
                        >
                            {platforms.map(p => <option key={p} value={p} className="bg-[#0f172a]">{p}</option>)}
                        </select>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95">
                        <DownloadCloud size={14} /> Export Matrix
                    </button>
                </div>
            </div>

            {/* ANALYTIC KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Accumulated Credit" value={`Rs. ${stats.total.toLocaleString()}`} icon={<Wallet />} color="text-blue-500" trend="+14.2%" />
                <StatCard title="Analytic Nodes" value={incomes.length} icon={<Layers />} color="text-indigo-400" trend="Active" />
                <StatCard title="Mean Settlement" value={`Rs. ${stats.avg.toFixed(0)}`} icon={<Activity />} color="text-emerald-400" trend="Stable" />
                <StatCard title="Peak Node" value={`Rs. ${stats.highest.toLocaleString()}`} icon={<ArrowUpRight />} color="text-sky-400" trend="High" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* SOURCE MIX ANALYTICS */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-4 bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all"
                >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
                        <PieIcon size={14} className="text-blue-500" /> Platform Saturation
                    </h3>
                    <Chart chartType="PieChart" width="100%" height="300px" data={pieData} options={chartOptions} />
                </motion.div>

                {/* MASTER DATA MATRIX */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-8 bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col hover:border-blue-500/20 transition-all"
                >
                    <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Settlement Ledger</h3>
                        <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20" />
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar flex-grow">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.02]">
                                <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    <th className="px-10 py-6">Timestamp</th>
                                    <th className="px-10 py-6">Source Domain</th>
                                    <th className="px-10 py-6 text-right">Net Value (Rs)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filteredIncomes.length > 0 ? filteredIncomes.map((row) => (
                                    <tr key={row.id} className="group hover:bg-blue-500/[0.03] transition-all cursor-crosshair">
                                        <td className="px-10 py-5 text-sm font-bold text-slate-400 group-hover:text-blue-400 transition-colors italic">
                                            {row.income_date}
                                        </td>
                                        <td className="px-10 py-5">
                                            <span className="px-4 py-1.5 bg-blue-500/5 rounded-xl text-[10px] font-black uppercase text-blue-500/70 border border-blue-500/10 group-hover:border-blue-500/30 transition-all">
                                                {row.source_name}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5 text-right font-black text-white tabular-nums tracking-tighter">
                                            {Number(row.net_amount).toLocaleString()}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-10 py-20 text-center text-slate-600 italic text-sm">
                                            No active nodes detected for the selected matrix.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

//STAT CARD
const StatCard = ({ title, value, icon, color, trend }) => (
    <motion.div 
        whileHover={{ y: -10, boxShadow: "0px 20px 40px rgba(0,0,0,0.4)" }} 
        className="bg-[#111827]/40 border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group"
    >
        <div className="flex justify-between items-start mb-6">
            <div className={`p-4 bg-white/5 rounded-2xl ${color} group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-xl`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <span className="text-[9px] font-black text-blue-500 bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/10 uppercase tracking-widest shadow-inner">
                {trend}
            </span>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</p>
        <h2 className="text-4xl font-black text-white mt-2 tracking-tighter italic tabular-nums group-hover:text-blue-400 transition-colors drop-shadow-sm">
            {value}
        </h2>
        <div className={`absolute -right-8 -bottom-8 ${color} opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 pointer-events-none`}>
            {React.cloneElement(icon, { size: 160 })}
        </div>
    </motion.div>
);

export default IncomeDashboard;