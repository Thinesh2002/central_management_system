import React, { useState, useEffect } from "react";
import API from "../../../../config/api"; 
import { motion, AnimatePresence } from "framer-motion";

const CreateProduct = () => {
  const [activeTab, setActiveTab] = useState("basic");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Main Form State (Matched to your working JSON) ---
  const [form, setForm] = useState({
    name: "",
    price: "", // Backend-la 'price' nu irukku
    description: "",
    short_description: "",
    categoryId: "",
    image: "", // Backend-la 'image' nu irukku
    type: "simple", 
  });

  // --- Attributes & SEO ---
  const [attributes, setAttributes] = useState([]);
  const [seo, setSeo] = useState({ focus_keyword: "", meta_title: "", meta_description: "" });

  useEffect(() => {
    if (form.name) {
      setSeo({
        focus_keyword: form.name,
        meta_title: `${form.name} Best Price in Sri Lanka`,
        meta_description: `Buy ${form.name} online at best price in Sri Lanka.`
      });
    }
  }, [form.name]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addAttribute = () => setAttributes([...attributes, { name: "", options: "", visible: true }]);
  const updateAttribute = (index, field, value) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = value;
    setAttributes(newAttrs);
  };
  const removeAttribute = (index) => setAttributes(attributes.filter((_, i) => i !== index));

  /* ================= SUBMIT LOGIC (MATCHED TO YOUR JSON) ================= */
  const handleSubmit = async () => {
    if (!form.name) return showToast("Product name is required", "error");
    if (!form.image) return showToast("Image URL is required", "error");

    setSubmitting(true);
    try {
      // Formatting attributes
      const formattedAttributes = attributes
        .filter(a => a.name.trim() !== "")
        .map((attr, idx) => ({
          name: String(attr.name),
          position: idx,
          visible: true,
          variation: form.type === "variable",
          options: attr.options.split(",").map(opt => opt.trim()).filter(o => o !== "")
        }));

      // 🔥 PAYLOAD (Unga working backend JSON format-la irukku)
      const payload = {
        name: String(form.name),
        price: String(form.price), // backend expects string '1500'
        description: form.description || "",
        short_description: form.short_description || "",
        categoryId: Number(form.categoryId), // backend expects number 9
        image: String(form.image), // backend expects direct URL string
        type: form.type,
        // Optional: Adding attributes if they are supported
        attributes: formattedAttributes,
        // Optional: Metadata for SEO
        meta_data: [
          { key: "rank_math_focus_keyword", value: String(seo.focus_keyword) },
          { key: "_yoast_wpseo_title", value: String(seo.meta_title) },
          { key: "_yoast_wpseo_metadesc", value: String(seo.meta_description) }
        ]
      };

      // 🎯 Working Endpoint
      const res = await API.post("/woo-products/create", payload);
      
      showToast("Product Created Successfully!");
      console.log("Success:", res.data);

      // Reset image preview/form if needed
    } catch (err) {
      console.error("Error Detail:", err.response?.data);
      const msg = err.response?.data?.error || "Error creating product";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black uppercase text-white tracking-widest decoration-[#fbb931] underline underline-offset-8">Create Product</h1>
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800">
            {["simple", "variable"].map(t => (
              <button key={t} onClick={() => setForm({...form, type: t})} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${form.type === t ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>
        </header>

        {/* TABS */}
        <div className="flex gap-6 border-b border-slate-800 mb-8 overflow-x-auto no-scrollbar">
          {["basic", "inventory", "attributes", "seo"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            
            {activeTab === "basic" && (
              <motion.div key="basic" initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Name *</label>
                    <input name="name" value={form.name} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="Product Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Image URL *</label>
                    <div className="flex gap-3 items-center">
                      <input name="image" value={form.image} onChange={handleInputChange} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500 text-xs" placeholder="https://..." />
                      {form.image && <img src={form.image} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Full Description</label>
                  <textarea name="description" value={form.description} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none h-32 text-sm" />
                </div>
              </motion.div>
            )}

            {activeTab === "inventory" && (
              <motion.div key="inv" initial={{opacity:0}} animate={{opacity:1}} className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Price (Rs.)</label>
                  <input name="price" value={form.price} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="1500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Stock Qty</label>
                  <input name="stock_quantity" value={form.stock_quantity} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Category ID</label>
                  <input name="categoryId" value={form.categoryId} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none" placeholder="9" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Short Description</label>
                  <input name="short_description" value={form.short_description} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none" placeholder="Short Desc" />
                </div>
              </motion.div>
            )}

            {/* Attributes & SEO Tabs Logic Same As Before */}
            {activeTab === "attributes" && (
              <motion.div key="attr" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
                <button onClick={addAttribute} className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:bg-indigo-600/5 transition-all">+ Add Attribute</button>
                {attributes.map((attr, index) => (
                  <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative group">
                    <button onClick={() => removeAttribute(index)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 transition-all">✕</button>
                    <div className="grid grid-cols-2 gap-4">
                      <input placeholder="Attribute (e.g. Size)" value={attr.name} onChange={(e) => updateAttribute(index, 'name', e.target.value)} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs outline-none focus:border-indigo-500" />
                      <input placeholder="Values (S, M, L)" value={attr.options} onChange={(e) => updateAttribute(index, 'options', e.target.value)} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "seo" && (
              <motion.div key="seo" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-4">
                  <h3 className="text-blue-500 text-lg font-medium">{seo.meta_title}</h3>
                  <p className="text-slate-400 text-xs line-clamp-2">{seo.meta_description}</p>
                </div>
                <input value={seo.meta_title} onChange={(e)=>setSeo({...seo, meta_title: e.target.value})} placeholder="SEO Title" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none text-sm" />
                <textarea value={seo.meta_description} onChange={(e)=>setSeo({...seo, meta_description: e.target.value})} placeholder="Meta Description" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none h-24 text-sm" />
              </motion.div>
            )}

          </AnimatePresence>

          <button onClick={handleSubmit} disabled={submitting} className={`w-full mt-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all ${submitting ? 'bg-slate-800 text-slate-600' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-[0.98]'}`}>
            {submitting ? "Syncing..." : "Publish Product Now →"}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{y: 50, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: 50, opacity: 0}} className={`fixed bottom-10 right-10 px-6 py-4 rounded-2xl border flex items-center gap-3 shadow-2xl z-[100] ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateProduct;