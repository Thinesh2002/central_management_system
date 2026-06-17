import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // Smooth animations
import API, { API_BASE_URL } from "../../config/api";
import ImageModal from "../compnents/image_view";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Package,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function ProductDashboard() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([
        API.get("/products/list"),
        API.get("/inventory/view")
      ]);
      setProducts(prodRes.data?.data || prodRes.data || []);
      setInventory(invRes.data?.data || invRes.data || []);
    } catch (err) {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getImageUrl = (sku, image) =>
    image ? `${API_BASE_URL}/images/products/${sku}/${image}` : null;

  const getInventoryBySku = (sku) =>
    inventory.find((i) => i.sku === sku) || { stock_in: 0, stock_out: 0, current_stock: 0 };

  // Optimized Filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to terminate this product SKU?")) return;
    try {
      await API.delete(`/products/${id}`);
      loadData();
    } catch (err) {
      alert("Delete failed. Product might be linked to other records.");
    }
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans p-4 md:p-8">
      
      {/* HEADER: Matrix Style */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-white tracking-tighter "
          >
            Inventory 
          </motion.h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Live SKU tracking & Logistics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-grow lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search Identity or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 pl-10 pr-4 py-3 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-700"
            />
          </div>
          
          <button
            onClick={loadData}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400"
            title="Refresh Sync"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => navigate("/add-product")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95"
          >
            <Plus size={16} /> New SKU
          </button>
        </div>
      </header>

      {/* TABLE SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 border-b border-slate-800/60">
                <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Asset</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Identity</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">In</th>
                <th className="px-6 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Out</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Matrix Balance</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Valuation</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/40">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((p, index) => {
                  const inv = getInventoryBySku(p.sku);
                  const isLowStock = inv.current_stock <= 5;
                  
                  return (
                    <motion.tr 
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group hover:bg-blue-500/[0.03] transition-colors"
                    >
                      {/* ASSET IMAGE */}
                      <td className="px-8 py-5">
                        <div className="relative w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 group-hover:border-blue-500/40 transition-all p-1">
                          {p.main_image ? (
                            <img
                              src={getImageUrl(p.sku, p.main_image)}
                              alt={p.sku}
                              onClick={() => setPreviewImage(getImageUrl(p.sku, p.main_image))}
                              className="w-full h-full object-cover rounded-xl cursor-pointer hover:scale-110 transition duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-xl">
                              <Package className="text-slate-700" size={20} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* IDENTITY */}
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span 
                              onClick={() => navigate(`/product/${p.id}`)}
                              className="text-sm font-bold text-white hover:text-blue-400 cursor-pointer transition-colors"
                            >
                              {p.product_name}
                            </span>
                            <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 w-fit px-2 py-0.5 rounded border border-slate-800 uppercase">
                            {p.sku}
                          </span>
                        </div>
                      </td>

                      {/* FLOW STATS */}
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-500 font-bold tabular-nums">
                           <TrendingUp size={12} /> {inv.stock_in}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-1 text-rose-500 font-bold tabular-nums">
                           <TrendingDown size={12} /> {inv.stock_out}
                        </div>
                      </td>

                      {/* BALANCE MATRIX */}
                      <td className="px-8 py-5">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`text-lg font-black tabular-nums ${isLowStock ? "text-rose-500" : "text-blue-400"}`}>
                            {inv.current_stock}
                          </div>
                          {isLowStock ? (
                            <div className="flex items-center gap-1 text-[8px] font-black uppercase text-rose-500 animate-pulse bg-rose-500/10 px-2 py-0.5 rounded-full mt-1">
                              <AlertTriangle size={8} /> Critical
                            </div>
                          ) : (
                            <div className="h-4" /> 
                          )}
                        </div>
                      </td>

                      {/* VALUATION & ACTIONS */}
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end group-hover:hidden transition-all">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Unit Price</span>
                          <span className="text-sm font-black text-slate-200 tabular-nums">
                            <span className="text-[10px] text-blue-500 mr-1">LKR</span>
                            {Number(p.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* REVEAL ACTIONS ON HOVER */}
                        <div className="hidden group-hover:flex items-center justify-end gap-2 animate-in slide-in-from-right-2 duration-200">
                          <button
                            onClick={() => navigate(`/edit-product/${p.id}`)}
                            className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/20"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="p-3 bg-rose-600/10 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-lg shadow-rose-900/20"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}