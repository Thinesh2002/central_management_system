import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { API_BASE_URL } from "../../../config/api";
import {
  ChevronLeft,
  Layers,
  Edit3,
  Trash2,
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
  Package,
} from "lucide-react";

export default function VariationDetailView() {
  const { sku } = useParams(); // variation sku
  const navigate = useNavigate();

  const [variation, setVariation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedSku, setCopiedSku] = useState(null);
  const [imageModal, setImageModal] = useState(null);

  useEffect(() => {
    if (sku) {
      fetchVariationData();
    }
  }, [sku]);

  const fetchVariationData = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/variations/${sku}`);
      const variationData = res.data?.data || res.data;
      setVariation(variationData);
    } catch (err) {
      console.error("Failed to load variation:", err);
    }
    setLoading(false);
  };

  // Image URL helper
  const getImageUrl = (skuVal, image) => {
    if (!skuVal || !image) return null;
    return `${API_BASE_URL}/images/productimage/${skuVal}/${image}`;
  };

  // Get all images for variation
  const getVariationImages = () => {
    if (!variation) return [];
    
    const images = [];
    
    if (variation.main_image) {
      images.push({
        url: getImageUrl(variation.sku, variation.main_image),
        type: "main",
        label: "Main"
      });
    }
    
    for (let i = 1; i <= 9; i++) {
      const subImg = variation[`sub_image${i}`];
      if (subImg) {
        images.push({
          url: getImageUrl(variation.sku, subImg),
          type: "sub",
          label: `Sub ${i}`
        });
      }
    }
    
    return images;
  };

  const handleCopySku = (skuVal) => {
    navigator.clipboard.writeText(skuVal);
    setCopiedSku(skuVal);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete variation ${sku}?`)) return;

    try {
      await API.delete(`/variations/${sku}`);
      // Navigate back to parent product
      if (variation?.parent_sku) {
        navigate(`/products/view/${variation.parent_sku}`);
      } else {
        navigate("/products");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const formatPrice = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

  const currentImages = getVariationImages();
  const currentImage = currentImages[selectedImageIndex]?.url;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-teal-500" />
          <p className="text-slate-400">Loading variation...</p>
        </div>
      </div>
    );
  }

  if (!variation) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Layers size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Variation not found</p>
          <button
            onClick={() => navigate("/products")}
            className="mt-4 text-teal-400 hover:text-teal-300"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Image Modal */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <button
            onClick={() => setImageModal(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X size={32} />
          </button>
          <img
            src={imageModal}
            alt="Variation"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ChevronLeft size={18} />
              Products
            </button>
            
            {variation.parent_sku && (
              <>
                <span className="text-slate-600">/</span>
                <button
                  onClick={() => navigate(`/products/view/${variation.parent_sku}`)}
                  className="text-sm text-teal-400 hover:text-teal-300"
                >
                  {variation.product_name || variation.parent_sku}
                </button>
                <span className="text-slate-600">/</span>
                <span className="text-sm text-white font-medium">{variation.sku}</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/products/edit-variation/${sku}`)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm"
            >
              <Edit3 size={16} />
              Edit Variation
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image Display */}
            <div
              onClick={() => currentImage && setImageModal(currentImage)}
              className="aspect-square bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
            >
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={variation.sku}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-600">
                  <ImageIcon size={64} className="mx-auto mb-2" />
                  <p>No image available</p>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {currentImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {currentImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedImageIndex === idx
                        ? "border-teal-500"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Parent Product Link */}
            {variation.parent_sku && (
              <div 
                onClick={() => navigate(`/products/view/${variation.parent_sku}`)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
                    <Package size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Parent Product</p>
                    <p className="text-white font-medium">{variation.product_name || "View Product"}</p>
                    <p className="text-xs text-amber-400 font-mono">{variation.parent_sku}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Variation Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={20} className="text-teal-500" />
                <h1 className="text-xl font-bold text-white">Variation Details</h1>
              </div>
              
              {/* SKU */}
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-sm text-teal-400 bg-teal-500/10 px-3 py-1 rounded">
                  {variation.sku}
                </span>
                <button
                  onClick={() => handleCopySku(variation.sku)}
                  className="text-slate-400 hover:text-white"
                  title="Copy SKU"
                >
                  {copiedSku === variation.sku ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  variation.status === 1 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {variation.status === 1 ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {variation.color && (
                  <div>
                    <p className="text-slate-500">Color</p>
                    <p className="text-white font-medium">{variation.color}</p>
                  </div>
                )}
                {variation.size && (
                  <div>
                    <p className="text-slate-500">Size</p>
                    <p className="text-white font-medium">{variation.size}</p>
                  </div>
                )}
                {variation.material && (
                  <div>
                    <p className="text-slate-500">Material</p>
                    <p className="text-white">{variation.material}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Price Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-teal-500" />
                <span className="text-sm font-medium text-white">Pricing</span>
              </div>
              
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-3xl font-bold text-teal-400">
                  {formatPrice(variation.selling_price)}
                </span>
              </div>
              
              <div className="flex gap-6 text-sm">
                {variation.cost_price > 0 && (
                  <div>
                    <span className="text-slate-500">Cost Price:</span>
                    <span className="ml-2 text-white">{formatPrice(variation.cost_price)}</span>
                  </div>
                )}
                {variation.cost_price > 0 && variation.selling_price > 0 && (
                  <div>
                    <span className="text-slate-500">Profit:</span>
                    <span className="ml-2 text-emerald-400">
                      {formatPrice(variation.selling_price - variation.cost_price)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Attributes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Attributes</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {variation.color && (
                  <AttributeCard icon={<Palette size={14} />} label="Color" value={variation.color} />
                )}
                {variation.size && (
                  <AttributeCard icon={<Tag size={14} />} label="Size" value={variation.size} />
                )}
                {variation.material && (
                  <AttributeCard icon={<Box size={14} />} label="Material" value={variation.material} />
                )}
                {variation.weight && (
                  <AttributeCard icon={<Ruler size={14} />} label="Weight" value={`${variation.weight} ${variation.weight_unit || ''}`} />
                )}
                {(variation.length || variation.width || variation.height) && (
                  <AttributeCard 
                    icon={<Ruler size={14} />} 
                    label="Dimensions" 
                    value={`${variation.length || '-'}×${variation.width || '-'}×${variation.height || '-'} ${variation.length_unit || 'cm'}`} 
                  />
                )}
                {variation.capacity && (
                  <AttributeCard icon={<Box size={14} />} label="Capacity" value={`${variation.capacity} ${variation.capacity_unit || ''}`} />
                )}
                {variation.power && (
                  <AttributeCard icon={<Zap size={14} />} label="Power" value={variation.power} />
                )}
                {variation.voltage && (
                  <AttributeCard icon={<Zap size={14} />} label="Voltage" value={variation.voltage} />
                )}
                {variation.wattage && (
                  <AttributeCard icon={<Zap size={14} />} label="Wattage" value={variation.wattage} />
                )}
                {variation.shape && (
                  <AttributeCard icon={<Box size={14} />} label="Shape" value={variation.shape} />
                )}
                {variation.style && (
                  <AttributeCard icon={<Tag size={14} />} label="Style" value={variation.style} />
                )}
                {variation.pattern && (
                  <AttributeCard icon={<Tag size={14} />} label="Pattern" value={variation.pattern} />
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {variation.created_at && (
                  <div>
                    <p className="text-slate-500">Created</p>
                    <p className="text-white">{new Date(variation.created_at).toLocaleDateString()}</p>
                  </div>
                )}
                {variation.updated_at && (
                  <div>
                    <p className="text-slate-500">Last Updated</p>
                    <p className="text-white">{new Date(variation.updated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Attribute Card Component
const AttributeCard = ({ icon, label, value }) => (
  <div className="bg-slate-800/50 rounded-lg p-3">
    <div className="flex items-center gap-2 text-slate-500 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-sm text-white font-medium">{value}</p>
  </div>
);