import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { API_BASE_URL } from "../../../config/api";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Plus,
  Layers,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  Copy,
  Check,
  MoreVertical,
  ChevronRight
} from "lucide-react";

export default function ViewProductVariations() {
  const { parentSku } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSku, setCopiedSku] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    loadVariants();
  }, [parentSku]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const productRes = await API.get(`/products/${parentSku}`);
      setProduct(productRes.data?.data || productRes.data);
      
      const res = await API.get(`/products/${parentSku}/variations`);
      setVariants(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Error loading variations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sku) => {
    if (window.confirm(`Are you sure you want to delete SKU: ${sku}?`)) {
      try {
        await API.delete(`/variations/${sku}`);
        setVariants(prev => prev.filter(v => v.sku !== sku));
        setOpenMenu(null);
      } catch (err) {
        alert("Unable to delete this variation.");
      }
    }
  };

  const handleCopySku = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const getImageUrl = (sku, image) =>
    image ? `${API_BASE_URL}/images/productimage/${sku}/${image}` : null;

  const formatPrice = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

  // Dropdown Menu Component
  const ActionMenu = ({ sku }) => {
    const isOpen = openMenu === sku;
    return (
      <div className="relative flex justify-end">
        <button 
          onClick={() => setOpenMenu(isOpen ? null : sku)}
          className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
            <div className="absolute right-0 mt-8 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden text-left">
              <a href={`/variations/view/${sku}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => setOpenMenu(null)}>
                <Eye size={14} className="text-blue-400" /> View Details
              </a>
              <a href={`/products/edit-variation/${sku}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => setOpenMenu(null)}>
                <Edit3 size={14} className="text-amber-400" /> Edit Variation
              </a>
              <div className="h-px bg-slate-800 my-1" />
              <button 
                onClick={() => handleDelete(sku)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full text-left transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 space-y-4">
        <RefreshCw className="text-teal-500 animate-spin" size={32} />
        <p className="text-sm text-slate-500 animate-pulse font-medium">Fetching variations...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-slate-950 min-h-screen text-slate-200">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-1">
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-400 uppercase tracking-widest transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Back to Products
          </button>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-teal-500/10 rounded-lg">
                <Layers className="text-teal-500" size={24} />
             </div>
             <h1 className="text-3xl font-bold text-white tracking-tight">
                {product?.product_name || "Variations"}
             </h1>
          </div>
          <p className="text-slate-400 flex items-center gap-2 text-sm mt-2">
            Parent Reference: 
            <span className="text-amber-500 font-mono bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded uppercase text-xs">
              {parentSku}
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={`/products/view/${parentSku}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Eye size={18} /> View Product
          </a>
          <a
            href={`/products/add-variation/${parentSku}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-teal-900/20 active:scale-95"
          >
            <Plus size={18} /> Add Variation
          </a>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: variants.length, color: "text-white" },
          { label: "Active", value: variants.filter(v => v.status === 1).length, color: "text-emerald-400" },
          { label: "Inactive", value: variants.filter(v => v.status !== 1).length, color: "text-red-400" },
          { label: "Min Price", value: formatPrice(Math.min(...variants.map(v => v.selling_price || 0))), color: "text-teal-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value || 0}</p>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/30 border-b border-slate-800">
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-20">Image</th>
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">SKU Details</th>
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Configuration</th>
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Price (LKR)</th>
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50">
              {variants.map((v) => {
                const imageUrl = getImageUrl(v.sku, v.main_image);
                return (
                  <tr key={v.sku} className="hover:bg-slate-800/20 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                          <ImageIcon size={18} className="text-slate-700" />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 group/sku">
                        <span className="text-xs font-mono font-bold text-teal-400 bg-teal-400/5 border border-teal-400/10 px-2 py-1 rounded-md uppercase tracking-tight">
                          {v.sku}
                        </span>
                        <button
                          onClick={() => handleCopySku(v.sku)}
                          className="opacity-0 group-hover/sku:opacity-100 text-slate-500 hover:text-white transition-all"
                        >
                          {copiedSku === v.sku ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                       <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-200">
                             {v.color || "No Color"} {v.size ? `• ${v.size}` : ""}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">{v.material || "Standard Material"}</p>
                       </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-white">
                        {formatPrice(v.selling_price)}
                      </p>
                      {v.cost_price > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5 italic">
                          Cost: {formatPrice(v.cost_price)}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-tight border ${
                          v.status === 1
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                        {v.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <ActionMenu sku={v.sku} />
                    </td>
                  </tr>
                );
              })}

              {variants.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-900 rounded-full">
                        <Layers className="text-slate-700" size={40} />
                      </div>
                      <p className="text-slate-500 font-medium italic">
                        Intha product-ku innum variations add seiyappadavillai.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}