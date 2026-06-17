import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../config/api";
import { 
  Save, Plus, Trash2, Upload, ChevronLeft, ChevronDown, 
  Package, Layers, Image as ImageIcon, X, Loader2 
} from "lucide-react";

export default function AddProductWithVariations() {
  const navigate = useNavigate();
  const parentImageRef = useRef(null);
  const mainImageRefs = useRef({});
  const subImageRefs = useRef({});

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Master data
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [colours, setColours] = useState([]);

  // Product form
  const [form, setForm] = useState({
    parent_sku: "",
    product_name: "",
    category_code: "",
    sub_category_code: "",
    brand: "",
    description: ""
  });

  // Parent SKU main image
  const [parentImage, setParentImage] = useState(null);

  // Variations
  const [variations, setVariations] = useState([]);
  const [expandedVariations, setExpandedVariations] = useState({});

  // Fetch master data
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoadingData(true);
    try {
      const [catRes, subCatRes, colourRes] = await Promise.all([
        API.get("/categories"),
        API.get("/sub-categories"),
        API.get("/colours")
      ]);
      setCategories(catRes.data?.data || []);
      setSubCategories(subCatRes.data?.data || []);
      setColours(colourRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load master data:", err);
      alert("Failed to load data. Please refresh.");
    }
    setLoadingData(false);
  };

  // Filter sub-categories by category
  useEffect(() => {
    if (form.category_code) {
      const filtered = subCategories.filter(sc => sc.category_code === form.category_code);
      setFilteredSubCategories(filtered);
      if (!filtered.find(sc => sc.sub_category_code === form.sub_category_code)) {
        setForm(prev => ({ ...prev, sub_category_code: "", parent_sku: "" }));
      }
    } else {
      setFilteredSubCategories([]);
      setForm(prev => ({ ...prev, sub_category_code: "", parent_sku: "" }));
    }
  }, [form.category_code, subCategories]);

  // Generate Parent SKU: CATEGORYSUBCATEGORY
  useEffect(() => {
    if (form.category_code && form.sub_category_code) {
      const parentSku = `${form.category_code}${form.sub_category_code}`.toUpperCase();
      setForm(prev => ({ ...prev, parent_sku: parentSku }));
    }
  }, [form.category_code, form.sub_category_code]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Generate variation SKU: CATEGORYSUBCATEGORYCOLOURCODE (Size removed as requested)
  const generateVariationSku = (variation) => {
    let sku = "";
    if (form.category_code) sku += form.category_code;
    if (form.sub_category_code) sku += form.sub_category_code;
    // variation.size logic removed from SKU generation
    if (variation.colour_code) sku += variation.colour_code;
    return sku.toUpperCase();
  };

  // Update variation SKU when color changes
  const updateVariationWithSku = (id, field, value) => {
    setVariations(prev =>
      prev.map(v => {
        if (v.id !== id) return v;
        const updated = { ...v, [field]: value };
        
        if (field === "colour_code") {
          const colourObj = colours.find(c => c.colour_code === value);
          updated.color = colourObj ? colourObj.colour_name : "";
        }
        
        updated.sku = generateVariationSku(updated);
        return updated;
      })
    );
  };

  const addVariation = () => {
    const newId = Date.now();
    const newVariation = {
      id: newId,
      sku: "",
      colour_code: "",
      color: "",
      size: "",
      material: "",
      weight: "",
      weight_unit: "kg",
      length: "",
      length_unit: "cm",
      width: "",
      width_unit: "cm",
      height: "",
      height_unit: "cm",
      capacity: "",
      capacity_unit: "ml",
      power: "",
      voltage: "",
      wattage: "",
      shape: "",
      style: "",
      pattern: "",
      cost_price: "",
      selling_price: "",
      status: 1,
      main_image: null,
      sub_images: [null, null, null, null, null, null, null, null, null]
    };
    setVariations(prev => [...prev, newVariation]);
    setExpandedVariations(prev => ({ ...prev, [newId]: true }));
  };

  const removeVariation = (id) => {
    const variation = variations.find(v => v.id === id);
    if (variation) {
      if (variation.main_image?.preview) URL.revokeObjectURL(variation.main_image.preview);
      variation.sub_images.forEach(img => {
        if (img?.preview) URL.revokeObjectURL(img.preview);
      });
    }
    setVariations(prev => prev.filter(v => v.id !== id));
  };

  const toggleVariation = (id) => {
    setExpandedVariations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleParentImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (parentImage?.preview) URL.revokeObjectURL(parentImage.preview);
    setParentImage({
      file,
      preview: URL.createObjectURL(file)
    });
    e.target.value = "";
  };

  const removeParentImage = () => {
    if (parentImage?.preview) URL.revokeObjectURL(parentImage.preview);
    setParentImage(null);
  };

  const handleMainImage = (varId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVariations(prev =>
      prev.map(v => {
        if (v.id !== varId) return v;
        if (v.main_image?.preview) URL.revokeObjectURL(v.main_image.preview);
        return {
          ...v,
          main_image: { file, preview: URL.createObjectURL(file) }
        };
      })
    );
    e.target.value = "";
  };

  const handleSubImage = (varId, slotIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVariations(prev =>
      prev.map(v => {
        if (v.id !== varId) return v;
        const newSubImages = [...v.sub_images];
        if (newSubImages[slotIndex]?.preview) URL.revokeObjectURL(newSubImages[slotIndex].preview);
        newSubImages[slotIndex] = { file, preview: URL.createObjectURL(file) };
        return { ...v, sub_images: newSubImages };
      })
    );
    e.target.value = "";
  };

  const removeMainImage = (varId) => {
    setVariations(prev =>
      prev.map(v => {
        if (v.id !== varId) return v;
        if (v.main_image?.preview) URL.revokeObjectURL(v.main_image.preview);
        return { ...v, main_image: null };
      })
    );
  };

  const removeSubImage = (varId, slotIndex) => {
    setVariations(prev =>
      prev.map(v => {
        if (v.id !== varId) return v;
        const newSubImages = [...v.sub_images];
        if (newSubImages[slotIndex]?.preview) URL.revokeObjectURL(newSubImages[slotIndex].preview);
        newSubImages[slotIndex] = null;
        return { ...v, sub_images: newSubImages };
      })
    );
  };

  const uploadParentImage = async (parentSku) => {
    if (!parentImage) return;
    const fd = new FormData();
    fd.append("sku", parentSku);
    fd.append("type", "main");
    fd.append("image", parentImage.file);
    try {
      await API.post("/product-images/upload", fd);
    } catch (err) {
      console.error(`Failed to upload parent image:`, err);
    }
  };

  const uploadVariationImages = async (sku, mainImage, subImages) => {
    if (mainImage) {
      const fd = new FormData();
      fd.append("sku", sku);
      fd.append("type", "main");
      fd.append("image", mainImage.file);
      try { await API.post("/product-images/upload", fd); } catch (err) { console.error(err); }
    }
    for (let i = 0; i < subImages.length; i++) {
      if (subImages[i]) {
        const fd = new FormData();
        fd.append("sku", sku);
        fd.append("type", "sub");
        fd.append("slot", (i + 1).toString());
        fd.append("image", subImages[i].file);
        try { await API.post("/product-images/upload", fd); } catch (err) { console.error(err); }
      }
    }
  };

  const submit = async () => {
    if (!form.parent_sku || !form.product_name) {
      alert("Product SKU and Name are required");
      return;
    }
    if (!variations.length) {
      alert("Add at least one variation");
      return;
    }
    for (const v of variations) {
      if (!v.sku) {
        alert("All variations must have SKU (select color)");
        return;
      }
      if (!v.selling_price || Number(v.selling_price) <= 0) {
        alert(`Variation ${v.sku} must have a valid selling price`);
        return;
      }
    }

    setSaving(true);
    try {
      await API.post("/products/add", {
        parent_sku: form.parent_sku,
        product_name: form.product_name,
        sub_category_code: form.sub_category_code || null,
        brand: form.brand || null,
        description: form.description || null
      });

      if (parentImage) await uploadParentImage(form.parent_sku);

      for (const v of variations) {
        await API.post("/variations", {
          parent_sku: form.parent_sku,
          sku: v.sku,
          color: v.color || null,
          size: v.size || null,
          material: v.material || null,
          weight: v.weight ? Number(v.weight) : null,
          weight_unit: v.weight_unit || null,
          length: v.length ? Number(v.length) : null,
          length_unit: v.length_unit || null,
          width: v.width ? Number(v.width) : null,
          width_unit: v.width_unit || null,
          height: v.height ? Number(v.height) : null,
          height_unit: v.height_unit || null,
          capacity: v.capacity ? Number(v.capacity) : null,
          capacity_unit: v.capacity_unit || null,
          power: v.power || null,
          voltage: v.voltage || null,
          wattage: v.wattage || null,
          shape: v.shape || null,
          style: v.style || null,
          pattern: v.pattern || null,
          cost_price: Number(v.cost_price) || 0,
          selling_price: Number(v.selling_price) || 0,
          status: v.status
        });
        await uploadVariationImages(v.sku, v.main_image, v.sub_images);
      }

      alert("Product created successfully!");
      navigate("/products");
    } catch (err) {
      console.error("Submit error:", err);
      alert(err.response?.data?.message || "Failed to create product");
    }
    setSaving(false);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-slate-400">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ChevronLeft size={18} /> Back
          </button>
          <button onClick={submit} disabled={saving} className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-5 py-2 rounded-lg flex items-center gap-2 text-white font-medium">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>

        <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Package className="text-teal-500" /> Add New Product
        </h1>

        {/* Product Info Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-teal-500" /> Product Information
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category *</label>
                <select value={form.category_code} onChange={(e) => updateField("category_code", e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 outline-none">
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat.category_code} value={cat.category_code}>{cat.category_name} ({cat.category_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sub-Category *</label>
                <select value={form.sub_category_code} onChange={(e) => updateField("sub_category_code", e.target.value)} disabled={!form.category_code} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 outline-none disabled:opacity-50">
                  <option value="">Select Sub-Category</option>
                  {filteredSubCategories.map(sc => <option key={sc.sub_category_code} value={sc.sub_category_code}>{sc.sub_category_name} ({sc.sub_category_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Product SKU <span className="text-teal-500">(Auto)</span></label>
                <input type="text" value={form.parent_sku} readOnly className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono" placeholder="CATEGORYSUBCATEGORY" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Product Name *</label>
                <input type="text" value={form.product_name} onChange={(e) => updateField("product_name", e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 outline-none" placeholder="Enter product name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Brand</label>
                <input type="text" value={form.brand} onChange={(e) => updateField("brand", e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 outline-none" placeholder="Enter brand" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 outline-none resize-none" placeholder="Enter description" />
              </div>
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs text-slate-400 mb-2">Product Main Image <span className="text-slate-500">(Parent)</span></label>
              <div onClick={() => parentImageRef.current?.click()} className="w-full aspect-square max-w-[200px] border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-teal-500 relative overflow-hidden">
                {parentImage ? (
                  <>
                    <img src={parentImage.preview} className="w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); removeParentImage(); }} className="absolute top-2 right-2 bg-red-500 rounded-full p-1"><X size={14} /></button>
                  </>
                ) : (
                  <div className="text-center text-slate-500 p-4">
                    <Upload size={32} className="mx-auto mb-2" />
                    <p className="text-xs">Click to upload</p>
                  </div>
                )}
              </div>
              <input type="file" hidden ref={parentImageRef} onChange={handleParentImage} />
            </div>
          </div>
        </div>

        {/* Variations Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2"><Layers size={18} className="text-teal-500" /> Variations ({variations.length})</h2>
            <button onClick={addVariation} className="flex items-center gap-1 px-3 py-1.5 bg-teal-600/20 text-teal-400 rounded-lg hover:bg-teal-600/30 text-sm"><Plus size={14} /> Add Variation</button>
          </div>

          <div className="space-y-3">
            {variations.map((v, idx) => (
              <div key={v.id} className="border border-slate-700 rounded-lg overflow-hidden">
                <div onClick={() => toggleVariation(v.id)} className="flex items-center justify-between p-3 bg-slate-800/50 cursor-pointer hover:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded">#{idx + 1}</span>
                    <span className="text-sm font-mono text-amber-400">{v.sku || "Select color"}</span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedVariations[v.id] ? "rotate-180" : ""}`} />
                </div>

                {expandedVariations[v.id] && (
                  <div className="p-4 bg-slate-900 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Size</label>
                        <input type="text" value={v.size} onChange={(e) => setVariations(prev => prev.map(x => x.id === v.id ? {...x, size: e.target.value} : x))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500" placeholder="S, M, L" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Color *</label>
                        <select value={v.colour_code} onChange={(e) => updateVariationWithSku(v.id, "colour_code", e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500">
                          <option value="">Select</option>
                          {colours.map(c => <option key={c.colour_code} value={c.colour_code}>{c.colour_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Material</label>
                        <input type="text" value={v.material} onChange={(e) => setVariations(prev => prev.map(x => x.id === v.id ? {...x, material: e.target.value} : x))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 text-teal-500">Generated SKU (Color only)</label>
                        <input type="text" value={v.sku} readOnly className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Cost Price</label>
                        <input type="number" value={v.cost_price} onChange={(e) => setVariations(prev => prev.map(x => x.id === v.id ? {...x, cost_price: e.target.value} : x))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Selling Price *</label>
                        <input type="number" value={v.selling_price} onChange={(e) => setVariations(prev => prev.map(x => x.id === v.id ? {...x, selling_price: e.target.value} : x))} className="w-full bg-slate-800 border border-teal-500/50 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Status</label>
                        <select value={v.status} onChange={(e) => setVariations(prev => prev.map(x => x.id === v.id ? {...x, status: Number(e.target.value)} : x))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                          <option value={1}>Active</option>
                          <option value={0}>Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* Image Section */}
                    <div className="border-t border-slate-700 pt-4">
                      <div className="flex gap-4 flex-wrap">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1 uppercase">Main Image</label>
                          <div onClick={() => mainImageRefs.current[v.id]?.click()} className="w-24 h-24 border border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer relative">
                            {v.main_image ? <img src={v.main_image.preview} className="w-full h-full object-cover rounded-lg" /> : <Upload size={16} />}
                            <input type="file" hidden ref={el => mainImageRefs.current[v.id] = el} onChange={(e) => handleMainImage(v.id, e)} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 mb-1 uppercase">Sub Images</label>
                          <div className="grid grid-cols-5 md:grid-cols-9 gap-2">
                            {v.sub_images.map((img, sIdx) => (
                              <div key={sIdx} onClick={() => subImageRefs.current[v.id][sIdx]?.click()} className="aspect-square border border-dashed border-slate-700 rounded-lg flex items-center justify-center cursor-pointer relative">
                                {img ? <img src={img.preview} className="w-full h-full object-cover rounded-lg" /> : <span className="text-[10px]">{sIdx + 1}</span>}
                                <input type="file" hidden ref={el => { if(!subImageRefs.current[v.id]) subImageRefs.current[v.id] = {}; subImageRefs.current[v.id][sIdx] = el; }} onChange={(e) => handleSubImage(v.id, sIdx, e)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => removeVariation(v.id)} className="flex items-center gap-1 text-xs text-red-400 mt-2"><Trash2 size={12} /> Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}