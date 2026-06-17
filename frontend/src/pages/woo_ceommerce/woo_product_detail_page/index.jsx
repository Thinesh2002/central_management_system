import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, ArrowLeft, ExternalLink, Info, Tag, Box, Database, Globe, List, ImageIcon, RefreshCw } from "lucide-react";
import API from "../../../config/api";

const WooProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [isDescOpen, setIsDescOpen] = useState(false);
  
  // ✅ NEW: Update state
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ variation state
  const [selectedOptions, setSelectedOptions] = useState({});
  const [currentVariation, setCurrentVariation] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await API.get(`/woo-products/${id}`);
      setProduct(res.data);
      
      // ✅ Variable product check & fetch
      if (res.data.type === "variable") {
        const varRes = await API.get(`/woo-products/${id}/variations`);
        setVariations(varRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ check variable product
  const isVariableProduct =
    product?.type === "variable" &&
    product?.attributes?.some(attr => attr.variation === true);

  // ✅ handle select
  const handleSelect = (attrName, value) => {
    const newOptions = {
      ...selectedOptions,
      [attrName]: value
    };
    setSelectedOptions(newOptions);

    const match = variations.find(v => 
      v.attributes.every(attr => newOptions[attr.name] === attr.option)
    );

    if (match) {
      setCurrentVariation(match);
    }
  };

  // ✅ NEW: Handle Update Button Click
  const handleUpdateClick = async () => {
    setIsUpdating(true);
    // Mimic API update process or actual logic here
    try {
      // Logic for update goes here if needed
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
      navigate(`/woo-edit-product/${id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ✅ Display Logic
  const displayImage = currentVariation?.image?.src || product.images?.[activeImage]?.src;
  const displaySKU = currentVariation?.sku || product.sku || "No SKU";
  const displayPrice = currentVariation?.price || product.price;

  // --- UI Compact Styles ---
  const tableHeader = "bg-slate-900 text-[11px] font-black uppercase text-slate-500 p-3 border-b border-slate-800 tracking-wider text-left";
  const tableCell = "p-3 border-b border-slate-800/50 text-[13px] text-slate-300";

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className=" bg-slate-950 text-white p-6 font-sans min-h-screen"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER BAR */}
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[14px]">
            <ArrowLeft size={18} /> Back
          </button>
          
          {/* ✅ UPDATED: Update/Edit Button with Loading State */}
          <button 
            disabled={isUpdating}
            onClick={handleUpdateClick} 
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all text-[13px] ${
              isUpdating 
              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
              : "bg-[#fbb931] text-black hover:scale-105"
            }`}
          >
            {isUpdating ? (
              <> <RefreshCw size={16} className="animate-spin" /> Updating... </>
            ) : (
              <> <Edit3 size={16} /> Edit Product </>
            )}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">

          {/* 🔥 IMAGE GALLERY */}
          <div className="space-y-4">
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
              <AnimatePresence mode="wait">
                <motion.img
                  key={displayImage}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  src={displayImage}
                  className="w-full h-[500px] object-contain transition-transform duration-500"
                />
              </AnimatePresence>
              
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-green-400 border border-green-500/20">
                SKU: {displaySKU}
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {product.images?.map((img, i) => (
                <img
                  key={i}
                  src={img.src}
                  onClick={() => { setActiveImage(i); setCurrentVariation(null); }}
                  className={`w-16 h-16 object-cover rounded-xl cursor-pointer border-2 transition-all ${
                    !currentVariation && i === activeImage ? "border-green-500 scale-105 shadow-lg shadow-green-500/20" : "border-slate-800 opacity-40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 🔥 PRODUCT INFO */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold mb-2 text-white tracking-tight leading-tight">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-2xl font-extrabold text-green-400">Rs {displayPrice}</span>
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                {currentVariation ? (currentVariation.stock_status === 'instock' ? 'Variation In Stock' : 'Out of Stock') : (product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock')}
              </span>
            </div>

            <div className="flex gap-6 mb-8 border-b border-slate-800 pb-4 text-[13px]">
              <button 
                onClick={() => setIsDescOpen(true)}
                className="text-slate-400 hover:text-green-400 font-semibold transition-colors flex items-center gap-2 group"
              >
                Description 
                <span className="bg-slate-800 group-hover:bg-green-500/20 px-2 py-0.5 rounded text-[10px]">VIEW</span>
              </button>
              <div className="text-slate-400"><span className="text-slate-600 mr-2">|</span> Category: <span className="text-slate-200">{product.categories?.[0]?.name}</span></div>
            </div>

            <div
              className="text-slate-400 text-[13px] leading-relaxed mb-8 italic border-l-2 border-slate-700 pl-4"
              dangerouslySetInnerHTML={{ __html: product.short_description }}
            />

            {/* 🔥 ATTRIBUTES GRID */}
            <div className="grid grid-cols-1 gap-3 mb-10">
              {isVariableProduct ? (
                product.attributes?.filter(attr => attr.variation).map((attr, i) => (
                    <div key={i} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">{attr.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelect(attr.name, opt)}
                            className={`px-3 py-1.5 rounded-md border text-[12px] font-bold transition-all ${
                              selectedOptions[attr.name] === opt ? "border-green-500 text-green-400 bg-green-500/5 shadow-md" : "border-slate-800 text-slate-500"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
              ) : null }
            </div>

            <button
              onClick={() => window.open(product.permalink, "_blank")}
              className="w-full py-4 bg-white text-black hover:bg-green-500 hover:text-white font-black rounded-xl transition-all duration-300 transform active:scale-95 shadow-xl shadow-white/5 text-[14px]"
            >
              VIEW IN STORE <ExternalLink size={16} className="inline ml-2" />
            </button>
          </div>
        </div>

        {/* --- 🔥 NEW SECTION: A TO Z TABLES --- */}
        <div className="space-y-12 mt-10">
          
          {/* 1. PRODUCT SPECIFICATIONS TABLE */}
          <div className="space-y-4">
             <h2 className="text-[14px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
               <List size={16} className="text-green-500"/> Product Specifications
             </h2>
             <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20">
               <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-900/50"><th className={tableHeader}>Feature Name</th><th className={tableHeader}>Detail / Value</th></tr></thead>
                  <tbody>
                    <tr><td className={tableCell + " font-bold"}>Product Name</td><td className={tableCell}>{product.name}</td></tr>
                    <tr><td className={tableCell + " font-bold"}>Base Price</td><td className={tableCell}>Rs {product.price}</td></tr>
                    <tr><td className={tableCell + " font-bold"}>Stock Status</td><td className={tableCell}>{product.stock_status} ({product.stock_quantity || "N/A"})</td></tr>
                    {product.attributes?.map((attr, idx) => (
                      <tr key={idx}><td className={tableCell + " font-bold"}>{attr.name}</td><td className={tableCell}>{attr.options.join(", ")}</td></tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>

          {/* 2. VARIATIONS OVERVIEW TABLE (WITH IMAGES) */}
          {isVariableProduct && variations.length > 0 && (
            <div className="space-y-4">
               <h2 className="text-[14px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                 <Database size={16} className="text-yellow-500"/> Variations Overview
               </h2>
               <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20">
                  <table className="w-full text-left border-collapse">
                    <thead className={tableHeader}>
                      <tr>
                        <th className="p-3 w-20">Image</th>
                        <th className="p-3">Variation</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variations.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 border-b border-slate-800/50">
                             <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
                                {v.image?.src ? <img src={v.image.src} className="w-full h-full object-cover" alt="v-img" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon size={16}/></div>}
                             </div>
                          </td>
                          <td className={tableCell + " font-bold"}>{v.attributes.map(a => a.option).join(" / ")}</td>
                          <td className={tableCell + " font-mono"}>{v.sku || "N/A"}</td>
                          <td className={tableCell + " text-green-400"}>Rs {v.price}</td>
                          <td className={tableCell}>{v.stock_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* 3. SEO & META DETAILS TABLE */}
          <div className="space-y-4">
            <h2 className="text-[14px] font-bold text-slate-400 flex items-center gap-3 uppercase tracking-widest">
              <Globe size={16} className="text-blue-500"/> SEO & Meta Details
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-900/50"><th className={tableHeader}>Meta Key</th><th className={tableHeader}>Content / Value</th></tr></thead>
                <tbody>
                  {product.meta_data?.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className={tableCell + " text-[11px] font-mono text-slate-500 w-1/3"}>{m.key}</td>
                      <td className={tableCell + " text-[13px]"}>{typeof m.value === 'string' ? m.value : JSON.stringify(m.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. LIVE CUSTOMER VIEW (WordPress Style) */}
          <div className="space-y-4 pb-20">
             <h2 className="text-[14px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
               <Info size={16} className="text-orange-500"/> Live Customer View (WordPress)
             </h2>
             <div className="bg-white text-slate-800 p-8 rounded-2xl border border-slate-200 shadow-inner">
                <div 
                  className="text-[14px] leading-relaxed max-h-[600px] overflow-y-auto prose prose-slate prose-img:rounded-xl prose-headings:text-slate-900 prose-a:text-blue-600 prose-strong:text-slate-900 max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }} 
                />
             </div>
          </div>

        </div>

        {/* 🔥 DESCRIPTION POPUP */}
        <AnimatePresence>
          {isDescOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDescOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 text-white"><h3 className="text-xl font-bold">Product Description</h3><button onClick={() => setIsDescOpen(false)} className="p-2 hover:bg-slate-800 rounded-full">✕</button></div>
                <div className="p-8 max-h-[70vh] overflow-y-auto text-[14px] leading-relaxed text-slate-300"><div dangerouslySetInnerHTML={{ __html: product.description }} /></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default WooProductDetail;