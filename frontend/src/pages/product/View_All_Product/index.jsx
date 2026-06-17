import React, { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import API, { API_BASE_URL } from "../../../config/api";
import {
  Search,
  Plus,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Eye,
  Package,
  Layers,
  RefreshCw,
  ChevronRight,
  Filter,
  MoreVertical,
  Calendar,
  X
} from "lucide-react";

export default function ProductList() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [expandedProduct, setExpandedProduct] = useState(null);
  const [variationsCache, setVariationsCache] = useState({});
  const [loadingVariations, setLoadingVariations] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await API.get("/products");
      const fetchedProducts = res.data?.data || [];
      setProducts(fetchedProducts);
      
      fetchedProducts.forEach(p => {
        if (p.variation_count > 0) {
          silentFetchVariations(p.parent_sku);
        }
      });
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    }
    setLoading(false);
  };

  const silentFetchVariations = async (parentSku) => {
    try {
      const res = await API.get(`/products/${parentSku}/variations`);
      const variations = res.data?.data || [];
      setVariationsCache(prev => ({ ...prev, [parentSku]: variations }));
    } catch (err) {
      console.error(`Silent fetch failed for ${parentSku}:`, err);
    }
  };

  const fetchVariations = async (parentSku) => {
    if (variationsCache[parentSku]) {
      setExpandedProduct(expandedProduct === parentSku ? null : parentSku);
      return;
    }
    setLoadingVariations(parentSku);
    try {
      const res = await API.get(`/products/${parentSku}/variations`);
      const variations = res.data?.data || [];
      setVariationsCache(prev => ({ ...prev, [parentSku]: variations }));
      setExpandedProduct(parentSku);
    } catch (err) {
      console.error("Failed to load variations:", err);
    }
    setLoadingVariations(null);
  };

  const handleDelete = async (parentSku, productName, variationCount) => {
    const msg = variationCount > 0
      ? `Delete "${productName}" and all ${variationCount} variation(s)?`
      : `Delete "${productName}"?`;
    if (!window.confirm(msg)) return;
    try {
      await API.delete(`/products/${parentSku}`);
      setProducts(prev => prev.filter(p => p.parent_sku !== parentSku));
      setOpenMenu(null);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleDeleteVariation = async (e, parentSku, variationSku) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm(`Delete variation ${variationSku}?`)) return;
    try {
      await API.delete(`/variations/${variationSku}`);
      setVariationsCache(prev => ({
        ...prev,
        [parentSku]: prev[parentSku].filter(v => v.sku !== variationSku)
      }));
      setProducts(prev => prev.map(p => 
        p.parent_sku === parentSku 
          ? { ...p, variation_count: Math.max(0, (p.variation_count || 1) - 1) }
          : p
      ));
      setOpenMenu(null);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const getImageUrl = (sku, image) =>
    image ? `${API_BASE_URL}/images/productimage/${sku}/${image}` : null;

  const formatPrice = (value) => `${Number(value || 0).toFixed(2)}`;

  const searchLower = searchTerm.trim().toLowerCase();
  let isStrictSubSkuSearch = false;

  if (searchLower) {
    isStrictSubSkuSearch = Object.values(variationsCache).flat().some(v => 
      v.sku?.toLowerCase() === searchLower || v.sku?.toLowerCase().includes(searchLower)
    );
  }

  const filteredProducts = products.filter(p => {
    if (startDate || endDate) {
      const itemDate = p.created_at ? new Date(p.created_at) : null;
      if (itemDate) {
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate && itemDate > new Date(endDate + "T23:59:59")) return false;
      }
    }

    if (!searchLower) return true;

    const matchesParentSku = p.parent_sku?.toLowerCase().includes(searchLower);
    const matchesProductName = p.product_name?.toLowerCase().includes(searchLower);
    
    return matchesParentSku || matchesProductName;
  });

  const getDirectSubSkuRows = () => {
    let directRows = [];
    products.forEach(p => {
      const variations = variationsCache[p.parent_sku] || [];
      variations.forEach(v => {
        if (v.sku?.toLowerCase().includes(searchLower)) {
          directRows.push({
            ...v,
            parent_sku: p.parent_sku,
            parent_product_name: p.product_name?.split(" - ")?.[0] || p.product_name
          });
        }
      });
    });
    return directRows;
  };

  const directSubSkuRows = isStrictSubSkuSearch ? getDirectSubSkuRows() : [];

  const ActionMenu = ({ sku, name, count, isVariation = false, parentSku = null }) => {
    const isOpen = openMenu === sku;
    const viewPath = isVariation ? `/variations/view/${sku}` : `/products/view/${sku}`;
    const editPath = isVariation ? `/products/edit-variation/${sku}` : `/products/edit/${sku}`;

    return (
      <div className="relative flex justify-end">
        <button 
          onClick={(e) => { e.stopPropagation(); setOpenMenu(isOpen ? null : sku); }}
          className={`p-1 rounded border border-stone-200 transition-colors bg-white cursor-pointer ${isOpen ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          <MoreVertical size={14} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenu(null)} />
            <div className="absolute right-0 mt-6 w-44 bg-white border border-stone-200 rounded shadow-xl z-20 py-1 overflow-hidden text-left text-xs">
              <a href={viewPath} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-stone-700 hover:bg-stone-50 hover:text-cyan-600 cursor-pointer" onClick={() => setOpenMenu(null)}>
                <Eye size={12} className="text-cyan-600" /> View Details
              </a>
              <a href={editPath} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-stone-700 hover:bg-stone-50 hover:text-amber-600 cursor-pointer" onClick={() => setOpenMenu(null)}>
                <Edit3 size={12} className="text-amber-500" /> Edit Details
              </a>
              {!isVariation && (
                <a href={`/products/add-variation/${sku}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-stone-700 hover:bg-stone-50 hover:text-emerald-600 cursor-pointer" onClick={() => setOpenMenu(null)}>
                  <Plus size={12} className="text-emerald-500" /> Add Variation
                </a>
              )}
              <div className="h-px bg-stone-100 my-1" />
              <button 
                onClick={() => isVariation ? handleDeleteVariation(null, parentSku, sku) : handleDelete(sku, name, count)}
                className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 w-full text-left font-medium cursor-pointer"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-4 bg-stone-50 min-h-screen text-stone-800 text-xs">
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Preview" className="max-w-full max-h-full rounded border border-stone-200 shadow-lg" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Manage All Inventory</h1>
          <p className="text-[11px] text-stone-400 mt-0.5">Strict SKU isolation system matrix registry</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/products/add-variation/new`} target="_blank" rel="noreferrer" className="px-3 py-1.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium rounded transition-all text-xs shadow-sm cursor-pointer">
            Add a variation
          </a>
          <a href="/products/add" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded transition-all text-xs shadow-sm cursor-pointer">
            Add a product
          </a>
        </div>
      </div>

      {/* Subnav tab count */}
      <div className="flex flex-wrap items-center gap-4 text-xs border-b border-stone-200 pb-2 text-stone-500">
        <span className="text-cyan-600 font-semibold border-b-2 border-cyan-600 pb-2 px-1 cursor-pointer">
          All listings <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-stone-200 text-stone-700 rounded-full">{products.length}</span>
        </span>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 border border-stone-200 rounded shadow-sm">
        <div className="flex items-center border border-stone-300 rounded overflow-hidden bg-white max-w-md flex-1 min-w-[280px]">
          <span className="bg-stone-50 px-3 py-1.5 border-r border-stone-200 text-stone-500 font-medium select-none">All Keys</span>
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Parent SKU or strict Sub SKU variant..."
              className="w-full pl-3 pr-8 py-1.5 rounded text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
            />
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
        </div>

        {/* Date Ranges */}
        <div className="flex items-center gap-2 border border-stone-300 rounded px-2 py-1 bg-white shadow-sm">
          <Calendar size={13} className="text-stone-400" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-stone-700 outline-none text-xs cursor-pointer focus:text-stone-900"
          />
          <span className="text-stone-300 px-0.5 select-none">to</span>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-stone-700 outline-none text-xs cursor-pointer focus:text-stone-900"
          />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(""); setEndDate(""); }} className="text-stone-400 hover:text-stone-600 ml-1 p-0.5 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <button className="flex items-center gap-1 px-3 py-1.5 border border-cyan-600/30 bg-cyan-50/40 text-cyan-700 hover:bg-cyan-50 rounded text-xs font-medium cursor-pointer">
          <Filter size={12} /> Active filters
        </button>

        <button onClick={fetchProducts} className="p-2 border border-stone-300 rounded bg-white text-stone-500 hover:text-stone-800 transition-colors ml-auto cursor-pointer">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border border-stone-200 rounded overflow-visible shadow-sm min-h-[300px] flex flex-col justify-between">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="relative left-[50px]">
              <span className="loader"></span>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            {isStrictSubSkuSearch ? (
              <>
                <thead className="bg-stone-100/80 text-stone-600 border-b border-stone-200 text-[11px] font-medium uppercase">
                  <tr>
                    <th className="p-3 pl-4 font-semibold w-20">Status</th>
                    <th className="p-3 font-semibold w-16 text-center">Image</th>
                    <th className="p-3 font-semibold">Strict Sub SKU Details</th>
                    <th className="p-3 font-semibold w-40">Parent Source Ref</th>
                    <th className="p-3 font-semibold w-40 text-right">Price Matrix</th>
                    <th className="p-3 font-semibold w-24 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {directSubSkuRows.map(v => {
                    const varImageUrl = getImageUrl(v.sku, v.main_image);
                    return (
                      <tr key={v.sku} className="hover:bg-stone-50/60 transition-colors">
                        <td className="p-3 pl-4">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight ${v.status === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {v.status === 1 ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="w-9 h-9 rounded border border-stone-200 bg-stone-50 overflow-hidden cursor-pointer flex mx-auto" onClick={() => varImageUrl && setSelectedImage(varImageUrl)}>
                            {varImageUrl ? <img src={varImageUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={12} className="m-auto text-stone-300" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-stone-900 font-mono text-xs uppercase block">{v.sku}</span>
                            <p className="text-stone-500 text-[11px]">Option Details: <span className="text-stone-700 font-medium">{v.color} {v.size ? `/ ${v.size}` : ""}</span></p>
                          </div>
                        </td>
                        <td className="p-3 text-stone-600 font-medium vertical-middle">
                          <span className="block truncate max-w-[180px] text-cyan-700 font-semibold">{v.parent_product_name}</span>
                          <span className="text-[10px] font-mono text-stone-400 uppercase">Ref: {v.parent_sku}</span>
                        </td>
                        <td className="p-3 text-right font-medium text-stone-900 vertical-middle">
                          <div className="text-xs font-bold text-stone-800">LKR {formatPrice(v.selling_price)}</div>
                        </td>
                        <td className="p-3 text-right pr-6">
                          <ActionMenu sku={v.sku} isVariation={true} parentSku={v.parent_sku} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            ) : (
              <>
                <thead className="bg-stone-50/80 text-stone-600 border-b border-stone-200 text-[11px] font-medium uppercase tracking-tight">
                  <tr>
                    <th className="p-3 w-6 text-center"></th>
                    <th className="p-3 font-semibold">Product Details & Identifiers</th>
                    <th className="p-3 font-semibold w-40 text-center">Product Name</th>
                    <th className="p-3 font-semibold w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredProducts.map(product => {
                    const isExpanded = expandedProduct === product.parent_sku;
                    const imageUrl = getImageUrl(product.parent_sku, product.main_image);
                    const variations = variationsCache[product.parent_sku] || [];
                    const actualCleanProductName = product.product_name?.split(" - ")?.[0] || product.product_name;

                    return (
                      <Fragment key={product.parent_sku}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-stone-50/80 border-b border-stone-200' : 'hover:bg-stone-50/40'}`}>
                          <td className="p-3 text-center">
                            {product.variation_count > 0 && (
                              <button
                                onClick={() => fetchVariations(product.parent_sku)}
                                className={`p-0.5 rounded transition-colors cursor-pointer ${isExpanded ? 'text-cyan-600 bg-cyan-50' : 'text-stone-400 hover:text-stone-700'}`}
                              >
                                {loadingVariations === product.parent_sku ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-3 items-start">
                              <div className="w-10 h-10 rounded border border-stone-200 bg-stone-50 overflow-hidden cursor-pointer shrink-0 flex" onClick={() => imageUrl && setSelectedImage(imageUrl)}>
                                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={14} className="m-auto text-stone-300" />}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <a href={`/products/view/${product.parent_sku}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:underline transition-colors block leading-tight max-w-2xl truncate cursor-pointer">
                                  {actualCleanProductName}
                                </a>
                                <div className="flex items-center gap-2 text-[11px] text-stone-500">
                                  <span>Parent SKU: <strong className="font-mono text-stone-800 uppercase">{product.parent_sku}</strong></span>
                                  {product.sub_category_name && (
                                    <>
                                      <span className="text-stone-300">|</span>
                                      <span>Category: <strong className="text-stone-600">{product.sub_category_name}</strong></span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-medium text-stone-700 text-[11px]">
                              <Layers size={11} className="text-stone-400" /> Variations ({product.variation_count || 0})
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <ActionMenu sku={product.parent_sku} name={product.product_name} count={product.variation_count} />
                          </td>
                        </tr>

                        {/* Regular Expanded View */}
                        {isExpanded && variations.length > 0 && (
                          <tr>
                            <td colSpan={4} className="p-0 bg-stone-50/30">
                              <div className="p-3 border-l-4 border-cyan-600/60 bg-stone-50/20">
                                <p className="text-[11px] font-medium text-stone-500 mb-2 pl-1 uppercase tracking-wider select-none">Related to {product.variation_count} variations</p>
                                
                                <div className="border border-stone-200 rounded overflow-hidden bg-white shadow-inner">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-stone-100/80 text-stone-500 border-b border-stone-200">
                                      <tr>
                                        <th className="p-2.5 pl-4 font-semibold w-16">Status</th>
                                        <th className="p-2.5 font-semibold w-12 text-center">Image</th>
                                        <th className="p-2.5 font-semibold">Child Option Details</th>
                                        <th className="p-2.5 font-semibold w-40 text-right">Price Matrix</th>
                                        <th className="p-2.5 font-semibold w-24 text-right pr-4">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                      {variations.map(v => {
                                        const varImageUrl = getImageUrl(v.sku, v.main_image);
                                        return (
                                          <tr key={v.sku} className="hover:bg-stone-50/60 transition-colors">
                                            <td className="p-2.5 pl-4 vertical-middle">
                                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight ${v.status === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                {v.status === 1 ? "Active" : "Inactive"}
                                              </span>
                                            </td>
                                            <td className="p-2.5 text-center">
                                              <div className="w-8 h-8 rounded border border-stone-200 bg-stone-50 overflow-hidden cursor-pointer flex mx-auto" onClick={() => varImageUrl && setSelectedImage(varImageUrl)}>
                                                {varImageUrl ? <img src={varImageUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={12} className="m-auto text-stone-300" />}
                                              </div>
                                            </td>
                                            <td className="p-2.5">
                                              <div className="space-y-0.5">
                                                <span className="font-semibold text-stone-800 font-mono uppercase tracking-wide block">{v.sku}</span>
                                                <p className="text-stone-500 text-[10px]">Options: <span className="text-stone-700 font-medium">{v.color} {v.size ? `/ ${v.size}` : ""}</span></p>
                                              </div>
                                            </td>
                                            <td className="p-2.5 text-right font-medium text-stone-900 vertical-middle">
                                              <div className="text-xs font-bold text-stone-800">LKR {formatPrice(v.selling_price)}</div>
                                            </td>
                                            <td className="p-2.5 text-right pr-4">
                                              <ActionMenu sku={v.sku} isVariation={true} parentSku={product.parent_sku} />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="mt-2 flex justify-start pl-1">
                                  <a href={`/products/add-variation/${product.parent_sku}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 transition-colors hover:underline cursor-pointer">
                                    <Plus size={12} /> Add another variation node
                                  </a>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        )}
      </div>
    </div>
  );
}