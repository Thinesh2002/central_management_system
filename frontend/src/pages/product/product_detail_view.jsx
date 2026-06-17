import React, { useState, useEffect, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { API_BASE_URL } from "../../config/api";
import {
  ChevronLeft,
  Package,
  Layers,
  Edit3,
  Trash2,
  Plus,
  Copy,
  Check,
  Image as ImageIcon,
  X,
  RefreshCw,
  Tag,
  DollarSign,
  Ruler,
  Zap,
  Palette,
  Box,
  Eye,
  Calendar,
  ChevronRight,
  Info,
  Layers2,
  Bookmark
} from "lucide-react";

export default function ProductDetailView() {
  const { id } = useParams(); // parent_sku
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedSku, setCopiedSku] = useState(null);
  const [imageModal, setImageModal] = useState(null);
  const [viewMode, setViewMode] = useState("product"); // "product" or "variation"

  useEffect(() => {
    if (id) fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const productRes = await API.get(`/products/${id}`);
      const productData = productRes.data?.data || productRes.data;
      setProduct(productData);

      const variationsRes = await API.get(`/products/${id}/variations`);
      const vars = variationsRes.data?.data || [];
      setVariations(vars);

      setViewMode("product");
      setSelectedVariation(null);
      setSelectedImageIndex(0);
    } catch (err) {
      console.error("Failed to load product:", err);
    }
    setLoading(false);
  };

  const handleBackToProduct = () => {
    setViewMode("product");
    setSelectedVariation(null);
    setSelectedImageIndex(0);
  };

  const handleSelectVariation = (variation) => {
    setSelectedVariation(variation);
    setViewMode("variation");
    setSelectedImageIndex(0);
  };

  const getImageUrl = (sku, image) => {
    if (!sku || !image) return null;
    return `${API_BASE_URL}/images/productimage/${sku}/${image}`;
  };

  const getActiveImages = () => {
    const target = selectedVariation || product;
    if (!target) return [];
    const images = [];
    const sku = selectedVariation ? target.sku : target.parent_sku;
    
    if (target.main_image) images.push({ url: getImageUrl(sku, target.main_image) });
    for (let i = 1; i <= 9; i++) {
      const sub = target[`sub_image${i}`];
      if (sub) images.push({ url: getImageUrl(sku, sub) });
    }
    return images;
  };

  const formatPrice = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
  
  const handleCopySku = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleDeleteVariation = async (variationSku) => {
    if (!window.confirm(`Delete variation ${variationSku}?`)) return;
    try {
      await API.delete(`/variations/${variationSku}`);
      setVariations(prev => prev.filter(v => v.sku !== variationSku));
      if (selectedVariation?.sku === variationSku) handleBackToProduct();
    } catch (err) {
      alert("Delete failed");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <RefreshCw size={24} className="animate-spin text-teal-500" />
    </div>
  );

  const currentImages = getActiveImages();
  const currentImage = currentImages[selectedImageIndex]?.url;
  const showPrice = selectedVariation ? selectedVariation.selling_price : null;

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-200">
      {imageModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
          <button className="absolute top-6 right-6 text-white"><X size={32} /></button>
          <img src={imageModal} className="max-w-full max-h-full object-contain" alt="" />
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/products")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-400 transition-colors">
            <ChevronLeft size={18} /> Inventory List
          </button>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/products/edit/${id}`)} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-amber-500"><Edit3 size={18} /></button>
            <button onClick={() => navigate(`/products/add-variation/${id}`)} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-900/20"><Plus size={16} /> New Variation</button>
          </div>
        </div>

        {/* Amazon-Style Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-slate-900/20 border border-slate-800/50 rounded-[32px] p-6 md:p-10 shadow-2xl backdrop-blur-sm">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-5 flex gap-5">
            {currentImages.length > 0 && (
              <div className="flex flex-col gap-3 shrink-0">
                {currentImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    onMouseEnter={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden cursor-pointer bg-slate-950 p-1.5 transition-all duration-300 ${selectedImageIndex === idx ? 'border-teal-500 shadow-lg shadow-teal-500/10' : 'border-slate-800 hover:border-slate-600'}`}
                  >
                    <img src={img.url} className="w-full h-full object-cover rounded-lg" alt="" />
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 aspect-square bg-slate-950 border border-slate-800 rounded-[24px] overflow-hidden flex items-center justify-center group relative" onClick={() => currentImage && setImageModal(currentImage)}>
              {currentImage ? (
                <img src={currentImage} className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500" alt="" />
              ) : (
                <ImageIcon size={64} className="text-slate-800 opacity-20" />
              )}
              <div className="absolute bottom-4 right-4 p-3 bg-slate-900/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={20} className="text-teal-500" />
              </div>
            </div>
          </div>

          {/* Right Column: Information */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                  {product.category_name || "General"}
                </span>
                <ChevronRight size={12} className="text-slate-700" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {product.sub_category_name || "Misc"}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                {selectedVariation ? `${product.product_name} - ${selectedVariation.color || ''} ${selectedVariation.size || ''}` : product.product_name}
              </h1>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">SKU</span>
                  <code className="text-sm font-mono text-amber-500 font-bold">{selectedVariation ? selectedVariation.sku : product.parent_sku}</code>
                  <button onClick={() => handleCopySku(selectedVariation ? selectedVariation.sku : product.parent_sku)} className="ml-3 text-slate-600 hover:text-white transition-colors">
                     {copiedSku === (selectedVariation ? selectedVariation.sku : product.parent_sku) ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Price Display */}
            {showPrice ? (
              <div className="bg-teal-500/5 border border-teal-500/20 rounded-[24px] p-8">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Selling Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{formatPrice(showPrice)}</span>
                  <span className="text-xs text-slate-500 font-medium">LKR inclusive of all taxes</span>
                </div>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-slate-800 rounded-[24px] text-slate-500 italic text-sm flex items-center gap-3">
                <Info size={18} className="text-teal-500" /> 
                Main product price illai. Variation-ai select seithu check seiyungal.
              </div>
            )}

            {/* Selection Chips */}
            {variations.length > 0 && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Variations</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleBackToProduct} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${viewMode === "product" ? 'bg-teal-500 text-slate-950 border-teal-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                  >
                    Product Info
                  </button>
                  {variations.map(v => (
                    <button 
                      key={v.sku} 
                      onClick={() => handleSelectVariation(v)} 
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${selectedVariation?.sku === v.sku ? 'bg-teal-500 text-slate-950 border-teal-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      {v.color || v.size || v.sku}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amazon-Style Specifications Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-8 border-t border-slate-800/50">
               <SpecItem label="Category" value={product.category_name} icon={<Bookmark size={14}/>} />
               <SpecItem label="Sub-Category" value={product.sub_category_name} icon={<Tag size={14}/>} />
               <SpecItem label="Brand" value={product.brand || "System Generic"} icon={<Layers2 size={14}/>} />
               {selectedVariation && (
                 <>
                   <SpecItem label="Material" value={selectedVariation.material} icon={<Box size={14}/>} />
                   <SpecItem label="Size" value={selectedVariation.size} icon={<Ruler size={14}/>} />
                   <SpecItem label="Weight" value={selectedVariation.weight ? `${selectedVariation.weight} ${selectedVariation.weight_unit || ''}` : null} icon={<Zap size={14}/>} />
                 </>
               )}
            </div>

            {product.description && (
              <div className="pt-6 border-t border-slate-800/50">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Description</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Variations List Table */}
        <div className="bg-slate-900/20 border border-slate-800/50 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="px-8 py-5 border-b border-slate-800/50 bg-slate-900/30">
            <h3 className="text-sm font-bold text-white flex items-center gap-3">
              <Layers size={18} className="text-teal-500" />
              Variation Inventory ({variations.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800/50">
                <tr>
                  <th className="px-8 py-5">Image</th>
                  <th className="px-8 py-5">SKU</th>
                  <th className="px-8 py-5">Options</th>
                  <th className="px-8 py-5 text-right">Selling Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {variations.map(v => (
                  <tr key={v.sku} onClick={() => handleSelectVariation(v)} className="hover:bg-teal-500/[0.02] cursor-pointer transition-all group">
                    <td className="px-8 py-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-1 group-hover:border-teal-500 transition-colors">
                        <img src={getImageUrl(v.sku, v.main_image)} className="w-full h-full object-cover rounded-lg" alt="" />
                      </div>
                    </td>
                    <td className="px-8 py-4 font-mono text-[11px] font-bold text-teal-500">{v.sku}</td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-300">{v.color || ''} {v.size || ''}</td>
                    <td className="px-8 py-4 text-sm font-black text-white text-right font-mono">{formatPrice(v.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ label, value, icon }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 group transition-colors hover:border-slate-700">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
      </div>
      <span className="text-xs text-slate-200 font-bold group-hover:text-teal-400">{value}</span>
    </div>
  );
}