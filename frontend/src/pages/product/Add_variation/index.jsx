import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { API_BASE_URL } from "../../../config/api";
import { 
  Camera, 
  Trash2, 
  ArrowLeft, 
  Save, 
  Layers, 
  Tag, 
  DollarSign, 
  Palette,
  Ruler,
  Box,
  Zap,
  Image as ImageIcon,
  Plus,
  RefreshCw
} from "lucide-react";

export default function AddVariation() {
  const { parentSku } = useParams();
  const navigate = useNavigate();

  const [colours, setColours] = useState([]);
  const [parentProduct, setParentProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    parent_sku: parentSku || "",
    sku: "",
    color: "",
    color_code: "",
    size: "",
    material: "",
    weight: "",
    weight_unit: "kg",
    length: "",
    width: "",
    height: "",
    length_unit: "cm",
    capacity: "",
    capacity_unit: "L",
    power: "",
    voltage: "",
    wattage: "",
    cost_price: "",
    selling_price: "",
    status: 1
  });

  // Images state
  const [mainImage, setMainImage] = useState(null);
  const [subImages, setSubImages] = useState([null, null, null, null, null, null, null, null, null]);
  const mainImageRef = useRef(null);
  const subImageRefs = useRef([]);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Colours
        const colRes = await API.get("/colours");
        setColours(colRes.data?.data || colRes.data || []);

        // 2. Fetch Parent Product Details
        if (parentSku) {
          const prodRes = await API.get(`/products/${parentSku}`);
          const parent = prodRes.data?.data || prodRes.data;
          if (parent) {
            setParentProduct(parent);
            setForm(f => ({
              ...f,
              parent_sku: parent.parent_sku
            }));
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [parentSku]);

  /* ================= AUTO SKU GENERATION ================= */
useEffect(() => {
  // Generate SKU: PARENTSKU + COLORCODE (no dashes, uppercase)
  const parts = [form.parent_sku];

  if (form.color_code) {
    parts.push(form.color_code.toUpperCase());
  }

  setForm(f => ({
    ...f,
    sku: parts.join('').toUpperCase()
  }));
}, [form.parent_sku, form.color_code]);

  /* ================= HANDLE COLOR SELECT ================= */
  const handleColorSelect = (e) => {
    const selectedColor = colours.find(c => c.colour_code === e.target.value);
    if (selectedColor) {
      setForm({
        ...form,
        color: selectedColor.colour_name,
        color_code: selectedColor.colour_code
      });
    } else {
      setForm({
        ...form,
        color: "",
        color_code: ""
      });
    }
  };

  /* ================= HANDLE SUB IMAGE ================= */
  const handleSubImageChange = (index, file) => {
    const newSubImages = [...subImages];
    newSubImages[index] = file;
    setSubImages(newSubImages);
  };

  const removeSubImage = (index) => {
    const newSubImages = [...subImages];
    newSubImages[index] = null;
    setSubImages(newSubImages);
  };

  /* ================= UPLOAD IMAGES ================= */
  const uploadImage = async (sku, file, type, slot = null) => {
    const fd = new FormData();
    fd.append("sku", sku);
    fd.append("type", type);
    if (slot) fd.append("slot", slot);
    fd.append("image", file);

    try {
      await API.post("/product-images/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return true;
    } catch (err) {
      console.error(`Failed to upload ${type} image:`, err);
      return false;
    }
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    // Validation
    if (!form.sku) {
      return alert("SKU is required. Please select color or size.");
    }
if (!form.color) {
  return alert("Please select a color.");
}
    if (!form.selling_price) {
      return alert("Selling price is required.");
    }

    setSubmitting(true);

    try {
      // 1. Create variation
      const variationData = {
        parent_sku: form.parent_sku,
        sku: form.sku,
        color: form.color || null,
        size: null,
        material: form.material || null,
        weight: form.weight ? parseFloat(form.weight) : null,
        weight_unit: form.weight ? form.weight_unit : null,
        length: form.length ? parseFloat(form.length) : null,
        width: form.width ? parseFloat(form.width) : null,
        height: form.height ? parseFloat(form.height) : null,
        length_unit: (form.length || form.width || form.height) ? form.length_unit : null,
        capacity: form.capacity ? parseFloat(form.capacity) : null,
        capacity_unit: form.capacity ? form.capacity_unit : null,
        power: form.power || null,
        voltage: form.voltage || null,
        wattage: form.wattage || null,
        cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
        selling_price: parseFloat(form.selling_price),
        status: form.status
      };

      await API.post("/variations", variationData);

      // 2. Upload main image if exists
      if (mainImage) {
        await uploadImage(form.sku, mainImage, "main");
      }

      // 3. Upload sub images
      for (let i = 0; i < subImages.length; i++) {
        if (subImages[i]) {
          await uploadImage(form.sku, subImages[i], "sub", i + 1);
        }
      }

      alert("Variation added successfully!");
      navigate(`/products/view/${form.parent_sku}`);

    } catch (err) {
      console.error("Submit error:", err);
      alert(err.response?.data?.message || "Failed to add variation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-teal-500" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-all"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Add Variation
            </h1>
            <p className="text-sm text-slate-400">
              Parent: <span className="text-amber-400 font-mono">{parentProduct?.product_name || parentSku}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={submit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-all"
        >
          {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {submitting ? "Saving..." : "Save Variation"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: FORM */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Variation Attributes */}
          <Section title="Variation Attributes" icon={<Layers size={16} />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Color Select */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Color</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  value={form.color_code}
                  onChange={handleColorSelect}
                >
                  <option value="">Select Color</option>
                  {colours.map(c => (
                    <option key={c.colour_code} value={c.colour_code}>
                      {c.colour_name} ({c.colour_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Size */}
           <div className="space-y-2">
  <label className="text-xs font-medium text-slate-400">
  Size
</label>
  <input 
    type="text"
    placeholder=""
    value={form.size}
    className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
    onChange={e => setForm({ ...form, size: e.target.value })}
  />
</div>

              {/* Generated SKU */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-slate-400">Generated SKU</label>
                <input 
                  readOnly 
                  value={form.sku} 
                  className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-lg text-amber-400 font-mono cursor-not-allowed"
                  placeholder="Auto-generated..."
                />
              </div>

              {/* Material */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-slate-400">Material</label>
                <input 
                  type="text"
                  placeholder="e.g., Cotton, Leather, Plastic"
                  value={form.material}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, material: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Pricing" icon={<DollarSign size={16} />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Cost Price (LKR)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={form.cost_price}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-amber-400 font-medium outline-none focus:border-amber-500"
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Selling Price (LKR) *</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={form.selling_price}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-teal-400 font-medium outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, selling_price: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* Dimensions */}
          <Section title="Dimensions" icon={<Ruler size={16} />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Weight</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.weight}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Unit</label>
                <select 
                  value={form.weight_unit}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, weight_unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Length</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.length}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, length: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Width</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.width}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, width: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Height</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.height}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, height: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Dim Unit</label>
                <select 
                  value={form.length_unit}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, length_unit: e.target.value })}
                >
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Electrical (Optional) */}
          <Section title="Electrical Specs (Optional)" icon={<Zap size={16} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Power</label>
                <input 
                  type="text"
                  placeholder="e.g., 100W"
                  value={form.power}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, power: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Voltage</label>
                <input 
                  type="text"
                  placeholder="e.g., 220V"
                  value={form.voltage}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, voltage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Wattage</label>
                <input 
                  type="text"
                  placeholder="e.g., 1000W"
                  value={form.wattage}
                  className="w-full bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-white outline-none focus:border-teal-500"
                  onChange={e => setForm({ ...form, wattage: e.target.value })}
                />
              </div>
            </div>
          </Section>

          {/* Status */}
          <Section title="Status" icon={<Tag size={16} />}>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="status" 
                  checked={form.status === 1}
                  onChange={() => setForm({ ...form, status: 1 })}
                  className="w-4 h-4 accent-teal-500"
                />
                <span className="text-sm text-white">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="status" 
                  checked={form.status === 0}
                  onChange={() => setForm({ ...form, status: 0 })}
                  className="w-4 h-4 accent-red-500"
                />
                <span className="text-sm text-white">Inactive</span>
              </label>
            </div>
          </Section>
        </div>

        {/* RIGHT: IMAGES */}
        <div className="space-y-6">
          
          {/* Main Image */}
          <Section title="Main Image" icon={<Camera size={16} />}>
            <div className="flex flex-col items-center">
              {!mainImage ? (
                <div 
                  onClick={() => mainImageRef.current?.click()}
                  className="w-full aspect-square border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-500/5 transition-all"
                >
                  <Camera className="text-slate-600 mb-2" size={32} />
                  <span className="text-xs text-slate-500">Click to upload</span>
                  <input 
                    type="file" 
                    hidden 
                    ref={mainImageRef} 
                    accept="image/*" 
                    onChange={e => setMainImage(e.target.files[0])} 
                  />
                </div>
              ) : (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-700">
                  <img 
                    src={URL.createObjectURL(mainImage)} 
                    className="w-full h-full object-cover" 
                    alt="Main" 
                  />
                  <button 
                    onClick={() => setMainImage(null)}
                    className="absolute top-2 right-2 bg-red-500 p-2 rounded-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Sub Images */}
          <Section title="Additional Images" icon={<ImageIcon size={16} />}>
            <div className="grid grid-cols-3 gap-2">
              {subImages.map((img, idx) => (
                <div key={idx} className="relative">
                  {!img ? (
                    <div 
                      onClick={() => subImageRefs.current[idx]?.click()}
                      className="aspect-square border border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 transition-all"
                    >
                      <Plus size={16} className="text-slate-600" />
                      <span className="text-[10px] text-slate-600">{idx + 1}</span>
                      <input 
                        type="file" 
                        hidden 
                        ref={el => subImageRefs.current[idx] = el}
                        accept="image/*" 
                        onChange={e => handleSubImageChange(idx, e.target.files[0])} 
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-700">
                      <img 
                        src={URL.createObjectURL(img)} 
                        className="w-full h-full object-cover" 
                        alt={`Sub ${idx + 1}`} 
                      />
                      <button 
                        onClick={() => removeSubImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 p-1 rounded hover:bg-red-600"
                      >
                        <Trash2 size={10} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, icon, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-teal-500">{icon}</span>
      <h3 className="text-sm font-medium text-white">{title}</h3>
    </div>
    {children}
  </div>
);