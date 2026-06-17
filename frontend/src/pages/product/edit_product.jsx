import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { API_BASE_URL } from "../../config/api";
import { 
  Camera, 
  Trash2, 
  Save, 
  Package, 
  Tag, 
  RefreshCw, 
  ChevronLeft, 
  Folder, 
  Image as ImageIcon, 
  Plus,
  LayoutDashboard,
  Info,
  Eye
} from "lucide-react";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subCategories, setSubCategories] = useState([]);
  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mainImage, setMainImage] = useState(null);
  const [existingMainImage, setExistingMainImage] = useState(null);
  const mainImageRef = useRef(null);

  const getImageUrl = (sku, imageName) => {
    if (!sku || !imageName) return null;
    return `${API_BASE_URL}/images/productimage/${sku}/${imageName}`;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id || id === "undefined") {
        setLoading(false);
        return;
      }

      try {
        const [prodRes, subCatRes] = await Promise.all([
          API.get(`/products/${id}`),
          API.get("/sub-categories")
        ]);

        const prodData = prodRes.data?.data || prodRes.data;

        if (prodData) {
          setProduct({
            parent_sku: prodData.parent_sku,
            product_name: prodData.product_name || "",
            sub_category_code: prodData.sub_category_code || "",
            brand: prodData.brand || "",
            description: prodData.description || ""
          });

          setExistingMainImage(prodData.main_image);
        }

        setSubCategories(subCatRes.data?.data || subCatRes.data || []);

      } catch (err) {
        console.error("Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const submit = async () => {
    if (!product) return;
    if (!product.product_name?.trim()) return alert("Product name is required");

    setSaving(true);
    try {
      await API.put(`/products/${id}`, {
        product_name: product.product_name.trim(),
        sub_category_code: product.sub_category_code || null,
        brand: product.brand?.trim() || null,
        description: product.description?.trim() || null
      });

      if (mainImage) {
        const fd = new FormData();
        fd.append("sku", product.parent_sku);
        fd.append("type", "main");
        fd.append("image", mainImage);
        await API.post("/product-images/upload", fd);
      }

      alert("Product updated successfully!");
      navigate(`/products/view/${id}`);

    } catch (err) {
      console.error("Update error:", err);
      alert(err.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={32} className="animate-spin text-teal-500" />
          <p className="text-slate-400 font-medium animate-pulse">Loading details...</p>
        </div>
      </div>
    );
  }

  const displayImage = mainImage 
    ? URL.createObjectURL(mainImage) 
    : getImageUrl(product.parent_sku, existingMainImage);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-slate-950 min-h-screen text-slate-200">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-1">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-400 uppercase tracking-widest transition-colors mb-4"
          >
            <ChevronLeft size={14} /> Back to List
          </button>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-teal-500/10 rounded-lg">
                <Edit3 size={24} className="text-teal-500" />
             </div>
             <h1 className="text-3xl font-bold text-white tracking-tight">Edit Product</h1>
          </div>
          <p className="text-slate-400 flex items-center gap-2 text-sm mt-2">
            Reference SKU: <span className="text-amber-500 font-mono font-bold">{product.parent_sku}</span>
          </p>
        </div>

        <button 
          onClick={submit} 
          disabled={saving} 
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-900/20 active:scale-95"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving Changes..." : "Save Product Details"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: CORE INFO */}
        <div className="lg:col-span-8 space-y-6">
          <FormSection title="Core Information" icon={<Package size={18} />}>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Product Display Name</label>
                <input 
                  type="text"
                  value={product.product_name}
                  onChange={e => setProduct({ ...product, product_name: e.target.value })}
                  placeholder="e.g. Premium Cotton T-Shirt"
                  className="w-full bg-slate-900/50 border border-slate-800 px-4 py-3.5 rounded-xl text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Brand / Manufacturer</label>
                  <input 
                    type="text"
                    value={product.brand}
                    onChange={e => setProduct({ ...product, brand: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-800 px-4 py-3.5 rounded-xl text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Sub Category</label>
                  <div className="relative">
                    <select 
                      value={product.sub_category_code}
                      onChange={e => setProduct({ ...product, sub_category_code: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-800 px-4 py-3.5 rounded-xl text-white outline-none focus:border-teal-500/50 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">Select Sub Category</option>
                      {subCategories.map(sc => (
                        <option key={sc.sub_category_code} value={sc.sub_category_code}>{sc.sub_category_name}</option>
                      ))}
                    </select>
                    <Folder size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Description</label>
                <textarea 
                  value={product.description}
                  onChange={e => setProduct({ ...product, description: e.target.value })}
                  rows={6}
                  placeholder="Describe your product features and specifications..."
                  className="w-full bg-slate-900/50 border border-slate-800 px-4 py-3.5 rounded-xl text-white outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all resize-none"
                />
              </div>
            </div>
          </FormSection>
        </div>

        {/* RIGHT COLUMN: MEDIA & ACTIONS */}
        <div className="lg:col-span-4 space-y-6">
          
          <FormSection title="Visual Asset" icon={<Camera size={18} />}>
            <div className="flex flex-col items-center">
              <div 
                onClick={() => mainImageRef.current?.click()}
                className="group relative w-full aspect-square bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-teal-500/50 transition-all flex items-center justify-center p-2"
              >
                {displayImage ? (
                  <>
                    <img src={displayImage} className="w-full h-full object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                       <RefreshCw size={24} className="text-white" />
                       <span className="text-[10px] font-bold uppercase text-white tracking-widest">Change Image</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <ImageIcon size={40} className="mx-auto text-slate-700" />
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">No Image Selected</p>
                  </div>
                )}
              </div>

              <input 
                ref={mainImageRef} 
                type="file" 
                hidden 
                accept="image/*" 
                onChange={e => setMainImage(e.target.files[0])} 
              />

              {(mainImage || existingMainImage) && (
                <button 
                  onClick={() => { setMainImage(null); setExistingMainImage(null); }}
                  className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} /> Remove Current Image
                </button>
              )}
            </div>
          </FormSection>

          <FormSection title="Quick Utilities" icon={<LayoutDashboard size={18} />}>
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => navigate(`/products/add-variation/${id}`)}
                className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:border-teal-500/50 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all"
              >
                <Plus size={16} className="text-teal-500 group-hover:scale-125 transition-transform" />
                Add Variation
              </button>
              <button
                onClick={() => navigate(`/products/view/${id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-sm font-bold transition-all"
              >
                <Eye size={16} />
                Preview Listing
              </button>
            </div>
          </FormSection>

          <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
             <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
             <p className="text-[11px] leading-relaxed text-amber-500/80">
                <b>Niyapithu Kavaniyungal:</b> SKU identifiers are unique and immutable. If you need to change the SKU, you must delete this product and create a new entry.
             </p>
          </div>

        </div>

      </div>
    </div>
  );
}

const FormSection = ({ title, icon, children }) => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-sm">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-slate-950 rounded-lg text-teal-500">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

const Edit3 = ({ size, className }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);