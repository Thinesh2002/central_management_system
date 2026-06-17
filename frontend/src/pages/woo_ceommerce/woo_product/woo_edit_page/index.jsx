import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, Plus, Trash2, ArrowLeft, Image as ImageIcon, 
  Layout, Tag, BarChart3, ListTree, Globe, Eye, Settings2 
} from "lucide-react";
import API from "../../../../config/api";

const WooEditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const attributesEndRef = useRef(null);

  const [form, setForm] = useState({
    name: "", slug: "", sku: "", regular_price: "", sale_price: "",
    stock_quantity: "", description: "", short_description: "",
    status: "publish", categories: [], images: [""], attributes: [],
    meta_title: "", meta_desc: "", type: "" // ✅ Added type
  });

  // ✅ NEW: Variations state for variable products
  const [variations, setVariations] = useState([]);

  useEffect(() => { fetchProduct(); }, []);

  const fetchProduct = async () => {
    try {
      const res = await API.get(`/woo-products/${id}`);
      const data = res.data;
      setForm({
        name: data.name || "",
        slug: data.slug || "",
        sku: data.sku || "",
        regular_price: data.regular_price || "",
        sale_price: data.sale_price || "",
        stock_quantity: data.stock_quantity || "",
        description: data.description || "",
        short_description: data.short_description || "",
        status: data.status || "publish",
        categories: data.categories?.map(c => c.id) || [],
        images: data.images?.map(i => i.src) || [""],
        attributes: data.attributes || [],
        meta_title: data.meta_data?.find(m => m.key === "rank_math_title")?.value || "",
        meta_desc: data.meta_data?.find(m => m.key === "rank_math_description")?.value || "",
        type: data.type || "simple" // ✅ Fetching type
      });

      // ✅ Fetch variations if it's a variable product
      if (data.type === "variable") {
        const varRes = await API.get(`/woo-products/${id}/variations`);
        setVariations(varRes.data || []);
      }
    } catch (err) {
      alert("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ NEW: Variation change handler
  const handleVarChange = (index, field, value) => {
    const updated = [...variations];
    updated[index][field] = value;
    setVariations(updated);
  };

  /* ✅ NEW: ADD VARIATION */
  const handleAddVariation = async () => {
    try {
      const res = await API.post(`/woo-products/${id}/variations`, {
        regular_price: "0",
        stock_status: "instock"
      });
      setVariations([...variations, res.data]);
      alert("New variation slot added!");
    } catch (err) {
      alert("Failed to add variation. Save attributes first.");
    }
  };

  /* ✅ NEW: DELETE VARIATION */
  const handleDeleteVariation = async (varId) => {
    if (!window.confirm("Are you sure you want to delete this variation?")) return;
    try {
      await API.delete(`/woo-products/${id}/variations/${varId}`);
      setVariations(variations.filter(v => v.id !== varId));
      alert("Variation deleted successfully");
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* IMAGE HANDLERS */
  const handleImageChange = (i, val) => {
    const updated = [...form.images];
    updated[i] = val;
    setForm({ ...form, images: updated });
  };

  /* ATTRIBUTE HANDLERS */
  const handleAttrChange = (i, key, value) => {
    const updated = [...form.attributes];
    if (key === "options") {
      updated[i][key] = value.split(",").map(v => v.trim());
    } else {
      updated[i][key] = value;
    }
    setForm({ ...form, attributes: updated });
  };

  const addAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { name: "", options: [] }],
    }));
    setTimeout(() => {
      attributesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Update Base Product
      await API.put(`/woo-products/${id}`, {
        ...form,
        categories: form.categories.map(catId => ({ id: catId })),
        images: form.images.filter(src => src.trim() !== "").map(src => ({ src })),
        attributes: form.attributes.map((a, index) => ({
          name: a.name, position: index, visible: true, variation: form.type === "variable", options: a.options,
        })),
        meta_data: [
          { key: "rank_math_title", value: form.meta_title },
          { key: "rank_math_description", value: form.meta_desc },
        ],
      });

      // 2. ✅ Update Variations (Batch Update)
      if (form.type === "variable" && variations.length > 0) {
        await API.put(`/woo-products/${id}/variations-batch`, {
          update: variations.map(v => ({
            id: v.id,
            regular_price: String(v.regular_price),
            sale_price: String(v.sale_price),
            stock_quantity: v.stock_quantity,
            sku: v.sku,
            image: v.image?.src ? { src: v.image.src } : null
          }))
        });
      }

      alert("Updated successfully");
      navigate("/woo-products");
    } catch (err) { alert("Update failed"); }
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950">
      <div className="h-10 w-10 border-4 border-[#fbb931] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#fbb931]"></div>
    </div>
  );

  const cardStyle = "bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-xl shadow-2xl";
  const inputStyle = "w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-[#fbb931] focus:ring-1 focus:ring-[#fbb931] outline-none transition-all text-slate-200 placeholder:text-slate-700";
  const labelStyle = "block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.15em]";

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen p-4 md:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-[#fbb931] transition-all group">
            <div className="p-2 bg-slate-900 rounded-full group-hover:bg-[#fbb931] group-hover:text-black transition-all">
              <ArrowLeft size={18} />
            </div>
            <span className="font-bold text-sm">BACK</span>
          </button>
          <div className="text-right">
            <h1 className="text-4xl font-black text-white italic tracking-tighter">EDIT PRODUCT</h1>
            <p className="text-[#fbb931] text-[10px] font-bold tracking-widest uppercase tracking-widest">
                {form.type.toUpperCase()} | #{id}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-32">
          
          {/* 1. BASIC & PRICING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`${cardStyle} lg:col-span-2`}>
              <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Layout size={20} className="text-[#fbb931]"/> Basic Details</h2>
              <div className="space-y-4">
                <input name="name" value={form.name} onChange={handleChange} className={inputStyle} placeholder="Product Name" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="slug" value={form.slug} onChange={handleChange} className={inputStyle} placeholder="URL Slug" />
                  <input name="sku" value={form.sku} onChange={handleChange} className={inputStyle} placeholder="SKU" />
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={cardStyle}>
              <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Tag size={20} className="text-[#fbb931]"/> Status</h2>
              <div className="space-y-4">
                {/* Regular Price Hidden if Variable */}
                {form.type !== "variable" && (
                    <>
                        <input name="regular_price" value={form.regular_price} onChange={handleChange} className={inputStyle} placeholder="Price" />
                        <input name="sale_price" value={form.sale_price} onChange={handleChange} className={inputStyle} placeholder="Sale Price" />
                    </>
                )}
                <select name="status" value={form.status} onChange={handleChange} className={inputStyle}>
                  <option value="publish" className="bg-slate-900">Live</option>
                  <option value="draft" className="bg-slate-900">Draft</option>
                </select>
              </div>
            </motion.div>
          </div>

{/* ✅ VARIATIONS MANAGER WITH IMAGE PREVIEW & REMOVE */}
{form.type === "variable" && (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cardStyle}>
    <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
      <h2 className="text-xl font-bold flex items-center gap-3">
        <Settings2 size={24} className="text-[#fbb931]"/> Variation Details
      </h2>
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-slate-500 font-bold uppercase">{variations.length} Items</span>
        <button type="button" onClick={handleAddVariation} className="bg-[#fbb931] text-black text-[10px] font-black px-4 py-2 rounded-full hover:scale-105 transition-all shadow-lg shadow-[#fbb931]/20">
            + ADD VARIATION
        </button>
      </div>
    </div>
    
    <div className="space-y-6">
      {variations.map((v, idx) => (
        <div key={v.id} className="group relative p-6 bg-slate-950/60 border border-slate-800 rounded-[2rem] hover:border-[#fbb931]/30 transition-all shadow-inner">
          
          {/* ✅ Variation Delete Button */}
          <button 
            type="button" 
            onClick={() => handleDeleteVariation(v.id)}
            className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={18} />
          </button>

          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Variation Image Preview */}
            <div className="w-full md:w-32 text-center">
              <label className={labelStyle}>Image</label>
              <div className="relative aspect-square w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-2 group-hover:border-[#fbb931]/20 transition-all">
                {v.image?.src ? (
                  <img src={v.image.src} className="w-full h-full object-cover" alt="var-preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
              <input 
                value={v.image?.src || ""} 
                onChange={(e) => {
                  const updated = [...variations];
                  updated[idx].image = { ...updated[idx].image, src: e.target.value };
                  setVariations(updated);
                }}
                placeholder="Image URL"
                className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] focus:border-[#fbb931] outline-none text-slate-400"
              />
            </div>

            {/* Variation Data Fields */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center pr-10">
                <span className="text-sm font-black text-[#fbb931] uppercase italic tracking-wide">
                  {v.attributes?.length > 0 
                    ? v.attributes?.map(a => `${a.name}: ${a.option}`).join(" | ") 
                    : "New Variation (Not Linked)"}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">ID: #{v.id}</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelStyle}>Price</label>
                  <input value={v.regular_price} onChange={(e) => handleVarChange(idx, "regular_price", e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-[#fbb931] outline-none" />
                </div>
                <div>
                  <label className={labelStyle}>Sale Price</label>
                  <input value={v.sale_price} onChange={(e) => handleVarChange(idx, "sale_price", e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-[#fbb931] outline-none" />
                </div>
                <div>
                  <label className={labelStyle}>Stock</label>
                  <input value={v.stock_quantity} onChange={(e) => handleVarChange(idx, "stock_quantity", e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-[#fbb931] outline-none" />
                </div>
                <div>
                  <label className={labelStyle}>SKU</label>
                  <input value={v.sku} onChange={(e) => handleVarChange(idx, "sku", e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:border-[#fbb931] outline-none" />
                </div>
              </div>
            </div>

          </div>
        </div>
      ))}
    </div>
  </motion.div>
)}

          {/* 2. IMAGE GALLERY PREVIEW */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cardStyle}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-bold flex items-center gap-2"><ImageIcon size={20} className="text-[#fbb931]"/> Gallery Preview</h2>
              <button type="button" onClick={() => setForm({...form, images: [...form.images, ""]})} className="text-[10px] font-black bg-[#fbb931] text-black px-4 py-2 rounded-full hover:scale-105 transition-all">
                + ADD IMAGE
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <AnimatePresence>
                {form.images.map((img, i) => (
                  <motion.div key={i} layout initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="group relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="aspect-square flex items-center justify-center bg-slate-900">
                      {img ? (
                        <img src={img} alt="preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <ImageIcon className="text-slate-800" size={30} />
                      )}
                    </div>
                    <input 
                      value={img} 
                      onChange={(e) => handleImageChange(i, e.target.value)} 
                      placeholder="Paste Link" 
                      className="w-full p-2 text-[10px] bg-slate-900 border-t border-slate-800 focus:outline-none text-[#fbb931]" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setForm({...form, images: form.images.filter((_, idx) => idx !== i)})}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* 3. ATTRIBUTES (Added to Bottom) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cardStyle}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white font-bold flex items-center gap-2"><ListTree size={20} className="text-[#fbb931]"/> Attributes</h2>
              <button type="button" onClick={addAttribute} className="text-[10px] font-black border border-slate-700 px-4 py-2 rounded-xl text-slate-400 hover:border-[#fbb931] hover:text-[#fbb931] transition-all">
                + NEW ATTRIBUTE
              </button>
            </div>
            <div className="space-y-4">
              <AnimatePresence>
                {form.attributes.map((attr, i) => (
                  <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, x: 10 }} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl relative">
                    <div className="md:col-span-4">
                      <label className={labelStyle}>Name</label>
                      <input value={attr.name} onChange={(e) => handleAttrChange(i, "name", e.target.value)} className={inputStyle} placeholder="e.g. Size" />
                    </div>
                    <div className="md:col-span-7">
                      <label className={labelStyle}>Values (Comma separated)</label>
                      <input value={attr.options?.join(", ")} onChange={(e) => handleAttrChange(i, "options", e.target.value)} className={inputStyle} placeholder="S, M, L" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center pb-2">
                      <button type="button" onClick={() => setForm({...form, attributes: form.attributes.filter((_, idx) => idx !== i)})} className="text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={attributesEndRef} />
            </div>
          </motion.div>

          {/* 4. RANK MATH SEO & GOOGLE PREVIEW */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardStyle} border-l-4 border-l-blue-500`}>
            <h2 className="text-white font-bold mb-8 flex items-center gap-2"><Globe size={20} className="text-blue-500"/> Rank Math SEO</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className={labelStyle}>SEO Title</label>
                  <input name="meta_title" value={form.meta_title} onChange={handleChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Meta Description</label>
                  <textarea name="meta_desc" rows="4" value={form.meta_desc} onChange={handleChange} className={`${inputStyle} resize-none`} />
                </div>
              </div>

              {/* Google Preview Card */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
                <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 mb-4"><Eye size={12}/> Live Google Preview</span>
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <div className="text-[12px] text-[#202124] mb-1">https://brighthub.lk/product/<span className="text-slate-400">{form.slug || "product"}</span></div>
                  <div className="text-[#1a0dab] text-xl font-medium mb-1 truncate">{form.meta_title || form.name || "Product Page Title"}</div>
                  <div className="text-[#4d5156] text-sm leading-snug line-clamp-2">
                    {form.meta_desc || "Start typing a meta description to see how your product will look in search results..."}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 5. DESCRIPTION */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cardStyle}>
              <label className={labelStyle}>Short Description</label>
              <textarea name="short_description" rows="2" value={form.short_description} onChange={handleChange} className={`${inputStyle} mb-6`} />
              <label className={labelStyle}>Full Description</label>
              <textarea name="description" rows="6" value={form.description} onChange={handleChange} className={inputStyle} />
          </motion.div>

          {/* FLOATING SUBMIT */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-4">
            <motion.button 
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-[#fbb931] text-black font-black py-5 rounded-full flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(251,185,49,0.4)] border-4 border-slate-950 uppercase tracking-widest text-sm"
            >
              <Save size={20} /> Update Product
            </motion.button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default WooEditProductPage;