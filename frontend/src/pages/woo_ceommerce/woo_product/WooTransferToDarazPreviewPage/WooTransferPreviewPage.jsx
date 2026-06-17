import React, { useEffect, useMemo, useState } from "react";
import API from "../../../../config/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";

const WooTransferPreviewPage = () => {
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountDetails, setAccountDetails] = useState([]);
  const [editableProducts, setEditableProducts] = useState([]);

  const [categoryTree, setCategoryTree] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [showLeafOnly, setShowLeafOnly] = useState(true);

  const [transferCategoryId, setTransferCategoryId] = useState("");
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});

  const [attributeLoading, setAttributeLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  
  const [notification, setNotification] = useState({ show: false, type: "", message: "" });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("woo_transfer_preview") || "{}");
      const savedProducts = saved.products || [];

      setSelectedAccounts(saved.accounts || []);
      setAccountDetails(saved.account_details || []);

      const editable = savedProducts.map((product) => {
        const images = product.images?.map((img) => img.src).slice(0, 6) || [];
        const mainImage = images[0] || "";

        return {
          id: product.id,
          title: product.name || "",
          price: product.price || "",
          sku: product.sku || "",
          website_link: product.permalink || "",
          description_html: product.description || product.short_description || "",
          short_description_html: product.short_description || "",
          highlights: htmlToHighlights(product.short_description || product.description || ""),
          image_links: images,
          white_background_image: mainImage,
        };
      });

      setEditableProducts(editable);
      fetchDarazCategories();
    } catch (err) {
      triggerNotification("error", "Failed to load products from storage");
    }
  }, []);

  useEffect(() => {
    if (transferCategoryId) {
      fetchCategoryAttributes(transferCategoryId);
    } else {
      setCategoryAttributes([]);
      setAttributeValues({});
    }
  }, [transferCategoryId]);

  useEffect(() => {
    validateProductMatrix();
  }, [editableProducts, transferCategoryId, attributeValues]);

  const htmlToText = (html = "") => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const htmlToHighlights = (html = "") => {
    const text = htmlToText(html);
    return text
      .split(/\n|\.|•|-/)
      .map((item) => item.trim())
      .filter((item) => item.length > 5)
      .slice(0, 8);
  };

  const triggerNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: "", message: "" }), 6000);
  };

  const validateProductMatrix = () => {
    let errors = {};
    editableProducts.forEach((product) => {
      let prodErrors = [];
      const imageCount = product.image_links.filter(Boolean).length;
      
      if (!product.title || product.title.length < 80) {
        prodErrors.push("Product title must be at least 80 characters long.");
      }
      if (!product.price || isNaN(product.price) || Number(product.price) <= 0) {
        prodErrors.push("Please enter a valid price higher than 0.");
      }
      if (!product.description_html || htmlToText(product.description_html).trim().length < 100) {
        prodErrors.push("Description must be at least 100 characters long.");
      }
      if (imageCount < 3 || imageCount > 5) {
        prodErrors.push(`Please add between 3 to 5 images. (Current: ${imageCount})`);
      }
      if (!product.white_background_image) {
        prodErrors.push("Main image with a white background is required.");
      }
      if (prodErrors.length > 0) errors[product.id] = prodErrors;
    });

    requiredAttributes.forEach(attr => {
      const key = getAttributeKey(attr);
      if (key && !attributeValues[key]) {
        errors[`attr_${key}`] = `The field "${getAttributeLabel(attr)}" is required.`;
      }
    });

    setValidationErrors(errors);
  };

  const fetchDarazCategories = async () => {
    try {
      const res = await API.get("/daraz/categories");
      setCategoryTree(res.data?.categories || res.data?.data || res.data || []);
    } catch (err) {
      triggerNotification("error", "Failed to load categories.");
    }
  };

  const flattenCategories = (categories = [], parentPath = "") => {
    let result = [];
    categories.forEach((cat) => {
      const id = cat.category_id || cat.id;
      const name = cat.name || cat.category_name || "Unnamed Category";
      const children = cat.children || cat.childrens || cat.sub_categories || cat.subCategories || [];
      const apiPath = cat.path || cat.full_path || cat.fullPath;
      const fullPath = apiPath || (parentPath ? `${parentPath} > ${name}` : name);
      const isLeaf = cat.leaf === true || cat.is_leaf === true || cat.isLeaf === true || children.length === 0;

      result.push({ id, name, path: apiPath, fullPath, isLeaf });
      if (children.length > 0) {
        result = [...result, ...flattenCategories(children, fullPath)];
      }
    });
    return result;
  };

  const flatCategories = useMemo(() => flattenCategories(categoryTree), [categoryTree]);

  const filteredCategories = useMemo(() => {
    return flatCategories.filter((cat) => {
      const searchText = `${cat.fullPath || ""} ${cat.id || ""}`.toLowerCase();
      const matchSearch = searchText.includes(categorySearch.toLowerCase());
      const matchLeaf = showLeafOnly ? cat.isLeaf : true;
      return matchSearch && matchLeaf;
    });
  }, [flatCategories, categorySearch, showLeafOnly]);

  const selectedCategory = useMemo(() => {
    return flatCategories.find((cat) => String(cat.id) === String(transferCategoryId));
  }, [flatCategories, transferCategoryId]);

  const fetchCategoryAttributes = async (categoryId) => {
    try {
      setAttributeLoading(true);
      setCategoryAttributes([]);
      const res = await API.get("/daraz/category-attributes", {
        params: { category_id: categoryId, account_code: selectedAccounts[0] },
      });
      const rawAttributes = res.data?.data || res.data?.attributes || res.data || [];
      const normalizedAttributes = Array.isArray(rawAttributes) ? rawAttributes : rawAttributes.attributes || [];
      setCategoryAttributes(normalizedAttributes);
    } catch (err) {
      triggerNotification("error", "Failed to load category features.");
    } finally {
      setAttributeLoading(false);
    }
  };

  const getAttributeKey = (attr) => attr.name || attr.attribute_name || attr.field_name || attr.code || attr.key || "";
  const getAttributeLabel = (attr) => attr.label || attr.display_name || attr.name || "Field";
  const getAttributeOptions = (attr) => attr.options || attr.option_values || attr.values || attr.candidate_values || [];
  const isRequiredAttribute = (attr) => attr.is_mandatory === true || attr.is_mandatory === 1 || attr.required === true || attr.is_required === true;
  
  const isDuplicateAttribute = (attr) => {
    const text = `${getAttributeKey(attr)} ${getAttributeLabel(attr)}`.toLowerCase();
    return ["title", "name", "price", "description", "short description", "highlight", "image", "white background", "sku"].some(k => text.includes(k));
  };

  const visibleCategoryAttributes = useMemo(() => categoryAttributes.filter((attr) => !isDuplicateAttribute(attr)), [categoryAttributes]);
  const requiredAttributes = useMemo(() => visibleCategoryAttributes.filter((attr) => isRequiredAttribute(attr)), [visibleCategoryAttributes]);

  const updateEditableProduct = (productId, field, value) => {
    setEditableProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: value } : p));
  };

  const updateImageLink = (productId, index, value) => {
    setEditableProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const updatedImages = [...p.image_links];
      updatedImages[index] = value;
      return { ...p, image_links: updatedImages.slice(0, 5) };
    }));
  };

  const addImageLink = (productId) => {
    setEditableProducts(prev => prev.map(p => p.id === productId ? { ...p, ...p.image_links.length < 5 ? { image_links: [...p.image_links, ""] } : alert("You can add a maximum of 5 images.") } : p));
  };

  const removeImageLink = (productId, index) => {
    setEditableProducts(prev => prev.map(p => p.id !== productId ? p : { ...p, image_links: p.image_links.filter((_, i) => i !== index) }));
  };

  const updateHighlight = (productId, index, value) => {
    setEditableProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const updated = [...p.highlights];
      updated[index] = value;
      return { ...p, highlights: updated };
    }));
  };

  const addHighlight = (productId) => {
    setEditableProducts(prev => prev.map(p => p.id === productId ? { ...p, highlights: [...p.highlights, ""] } : p));
  };

  const removeHighlight = (productId, index) => {
    setEditableProducts(prev => prev.map(p => p.id !== productId ? p : { ...p, highlights: p.highlights.filter((_, i) => i !== index) }));
  };

  const submitDisabled = useMemo(() => Object.keys(validationErrors).length > 0 || !transferCategoryId || transferLoading, [validationErrors, transferCategoryId, transferLoading]);

  const submitTransfer = async () => {
    if (submitDisabled) {
      triggerNotification("error", "Please fix the errors before transferring products.");
      return;
    }

    try {
      setTransferLoading(true);
      const payload = {
        product_ids: editableProducts.map((p) => p.id),
        account_codes: selectedAccounts,
        account_details: accountDetails,
        category_id: transferCategoryId,
        category_path: selectedCategory?.fullPath || "",
        category_attributes: attributeValues,
        customized_products: editableProducts.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          sku: p.sku,
          website_link: p.website_link,
          description_html: p.description_html,
          description_text: htmlToText(p.description_html),
          highlights: p.highlights.filter(Boolean),
          image_links: p.image_links.filter(Boolean),
          white_background_image: p.white_background_image,
        })),
      };

      const res = await API.post("/daraz/transfer-listings", payload);
      
      if (res.data?.success || res.status === 200) {
        triggerNotification("success", "Products successfully transferred to Daraz!");
      } else {
        triggerNotification("error", res.data?.message || "Failed to transfer products.");
      }
    } catch (err) {
      triggerNotification("error", err.response?.data?.message || "An error occurred during transfer.");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="bg-stone-50 text-stone-800 min-h-screen p-4 sm:p-6 font-sans antialiased relative selection:bg-amber-100 selection:text-amber-900">
      
      <AnimatePresence>
        {notification.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl max-w-xl w-[90%] ${
              notification.type === "success" 
                ? "bg-emerald-50 text-emerald-900 border-emerald-200" 
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 className="text-emerald-600 shrink-0" size={20} /> : <XCircle className="text-rose-600 shrink-0" size={20} />}
            <div className="text-xs font-medium tracking-wide leading-relaxed">{notification.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
          <div>
            <h1 className="text-2xl font-[600] text-stone-900 tracking-tight">Woo to Daraz Transfer Preview</h1>
            <p className="text-[12px] text-stone-400 mt-0.5">Review and update products before sending them to Daraz</p>
          </div>
          <div className="w-full sm:w-auto bg-white px-4 py-2 border border-stone-200 rounded-xl flex items-center gap-2 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="text-[11px] font-mono font-bold uppercase text-stone-500">Status: Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-4">
            {editableProducts.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 text-xs font-mono text-stone-400 text-center uppercase tracking-wider shadow-sm">
                No products selected
              </div>
            ) : (
              editableProducts.map((product) => (
                <div key={product.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden group">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-stone-900 font-mono">PRODUCT: #{product.id}</span>
                    {validationErrors[product.id] && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase font-mono">
                        <AlertTriangle size={10} /> Needs Review
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Product Title</label>
                      <input
                        type="text"
                        className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-2.5 outline-none focus:border-stone-400 text-xs font-medium transition"
                        value={product.title}
                        onChange={(e) => updateEditableProduct(product.id, "title", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Price</label>
                        <input
                          type="text"
                          className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-2.5 outline-none focus:border-stone-400 text-xs font-mono transition"
                          value={product.price}
                          onChange={(e) => updateEditableProduct(product.id, "price", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">SKU</label>
                        <input
                          type="text"
                          className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-2.5 outline-none focus:border-stone-400 text-xs font-mono uppercase transition"
                          value={product.sku}
                          onChange={(e) => updateEditableProduct(product.id, "sku", e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1.5">Main Image URL (White Background Recommended)</label>
                      <input
                        type="text"
                        className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-2.5 outline-none focus:border-stone-400 text-xs transition mb-2"
                        value={product.white_background_image}
                        onChange={(e) => updateEditableProduct(product.id, "white_background_image", e.target.value)}
                      />
                      {product.white_background_image && (
                        <div className="w-full max-h-[340px] rounded-xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center relative shadow-inner group-hover:border-stone-300 transition-colors">
                          <img
                            src={product.white_background_image}
                            alt="Main product view"
                            className="w-full h-auto max-h-[340px] object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                        <label className="text-[10px] font-mono uppercase text-stone-400">More Image Links</label>
                        <button type="button" onClick={() => addImageLink(product.id)} className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer">+ Add Image</button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {product.image_links.map((link, index) => (
                          <div key={index} className="border border-stone-100 rounded-xl p-2 bg-stone-50/60 space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="w-full bg-white border border-stone-200 text-stone-900 rounded-xl px-3 py-1.5 outline-none focus:border-stone-400 text-xs transition"
                                value={link}
                                onChange={(e) => updateImageLink(product.id, index, e.target.value)}
                              />
                              <button type="button" onClick={() => removeImageLink(product.id, index)} className="px-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs hover:bg-rose-100 transition cursor-pointer">×</button>
                            </div>
                            {link && (
                              <div className="w-full max-h-[160px] rounded-lg border border-stone-200 bg-white overflow-hidden flex items-center justify-center relative shadow-sm">
                                <img src={link} alt="" className="w-full h-auto max-h-[160px] object-contain" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                        <label className="text-[10px] font-mono uppercase text-stone-400">Product Highlights</label>
                        <button type="button" onClick={() => addHighlight(product.id)} className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer">+ Add Highlight</button>
                      </div>
                      <div className="space-y-1.5">
                        {product.highlights.map((h, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-3 py-1.5 outline-none focus:border-stone-400 text-xs transition"
                              value={h}
                              onChange={(e) => updateHighlight(product.id, i, e.target.value)}
                            />
                            <button type="button" onClick={() => removeHighlight(product.id, i)} className="px-2 bg-stone-100 text-stone-500 border border-stone-200 rounded-xl text-xs hover:bg-stone-200 transition cursor-pointer">×</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="block text-[10px] font-mono uppercase text-stone-400">Description</label>
                      <textarea
                        rows="4"
                        className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-2.5 outline-none focus:border-stone-400 text-xs transition font-sans"
                        value={product.description_html}
                        onChange={(e) => updateEditableProduct(product.id, "description_html", e.target.value)}
                      />
                    </div>

                    {validationErrors[product.id] && (
                      <div className="bg-rose-50/80 border border-rose-100 rounded-xl p-3.5 space-y-1 mt-2 shadow-inner">
                        <div className="text-[10px] font-bold text-rose-800 font-mono uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle size={12} /> Validation Errors:
                        </div>
                        <ul className="list-none space-y-0.5 pl-0 mt-1">
                          {validationErrors[product.id].map((errText, errIdx) => (
                            <li key={errIdx} className="text-[11px] text-rose-700 leading-relaxed font-medium flex items-start gap-1">
                              <span className="text-rose-400 select-none font-mono mt-0.5">▪</span> {errText}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-stone-400 font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-stone-400" /> Connected Accounts
              </h3>
              <div className="flex flex-wrap gap-2">
                {accountDetails.map((acc) => (
                  <span key={acc.account_code} className="text-xs bg-stone-50 border border-stone-200 text-stone-700 font-medium rounded-xl px-3 py-2 shadow-inner">
                    {acc.account_name || acc.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <Layers size={15} className="text-stone-500" /> Select Daraz Category
              </h3>
              <div className="relative flex items-center bg-stone-50 border border-stone-200 rounded-xl focus-within:border-stone-400 transition-all shadow-inner">
                <input
                  type="text"
                  placeholder="Search categories..."
                  className="w-full pl-4 pr-10 py-2.5 bg-transparent text-xs text-stone-900 placeholder-stone-400 outline-none"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                <Search size={14} className="absolute right-3.5 text-stone-400" />
              </div>

              <label className="flex items-center gap-2 text-xs text-stone-500 font-medium select-none">
                <input
                  type="checkbox"
                  className="rounded border-stone-300 accent-stone-900 cursor-pointer"
                  checked={showLeafOnly}
                  onChange={(e) => setShowLeafOnly(e.target.checked)}
                />
                Show sub-categories only
              </label>

              <select
                className="w-full bg-stone-50 border border-stone-200 text-stone-700 rounded-xl px-4 py-2.5 outline-none focus:border-stone-400 text-xs cursor-pointer transition shadow-sm font-medium"
                value={transferCategoryId}
                onChange={(e) => setTransferCategoryId(e.target.value)}
              >
                <option value="">Choose a category...</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-white text-stone-800">
                    {cat.path || cat.fullPath || cat.name} ({cat.id})
                  </option>
                ))}
              </select>

              {selectedCategory && (
                <div className="text-xs bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-stone-600 font-medium shadow-inner flex items-center gap-2">
                  <Zap size={13} className="text-[#fbb931]" />
                  <span>Selected Category: <strong className="text-cyan-700 font-bold">{selectedCategory.fullPath || selectedCategory.name}</strong></span>
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Category Features & Attributes</h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">Fill in specific features for the selected Daraz category</p>
                </div>
                {requiredAttributes.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    {requiredAttributes.length} Required Fields
                  </span>
                )}
              </div>

              {attributeLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-stone-500 font-mono text-xs uppercase tracking-wider">
                  <RefreshCw size={14} className="animate-spin text-stone-400" /> Loading category features...
                </div>
              ) : !transferCategoryId ? (
                <div className="text-stone-400 text-xs py-10 text-center border border-dashed border-stone-200 rounded-xl font-mono uppercase select-none">
                  Select a category to view required features
                </div>
              ) : visibleCategoryAttributes.length === 0 ? (
                <div className="text-stone-400 text-xs py-10 text-center border border-dashed border-stone-200 rounded-xl font-mono uppercase select-none">
                  No additional features required for this category
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleCategoryAttributes.map((attr, index) => {
                    const key = getAttributeKey(attr);
                    const label = getAttributeLabel(attr);
                    const options = getAttributeOptions(attr);
                    const required = isRequiredAttribute(attr);

                    if (!key) return null;

                    return (
                      <div key={`${key}-${index}`} className="space-y-1.5">
                        <label className="block text-xs font-semibold text-stone-700">
                          {label}
                          {required && <span className="text-rose-500 ml-1 font-mono font-bold">*</span>}
                        </label>

                        {Array.isArray(options) && options.length > 0 ? (
                          <select
                            className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 outline-none focus:border-stone-400 text-xs cursor-pointer transition shadow-sm font-medium"
                            value={attributeValues[key] || ""}
                            onChange={(e) => setAttributeValues(prev => ({ ...prev, [key]: e.target.value }))}
                          >
                            <option value="">Select {label}...</option>
                            {options.map((opt, optIdx) => {
                              const val = opt.name || opt.value || opt.label || opt.id || opt;
                              const lbl = opt.name || opt.label || opt.value || opt.id || opt;
                              return (
                                <option key={`${val}-${optIdx}`} value={val} className="bg-white text-stone-800">{lbl}</option>
                              );
                            })}
                          </select>
                        ) : (
                          <textarea
                            rows="2"
                            className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 outline-none focus:border-stone-400 text-xs transition shadow-sm"
                            value={attributeValues[key] || ""}
                            onChange={(e) => setAttributeValues(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`Enter ${label}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <div className="bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <div className="text-xs font-bold font-mono uppercase tracking-wider">Transfer Blocked</div>
                  <p className="text-[11px] leading-relaxed text-rose-700">Cannot transfer products. Please clear the errors shown in the product configuration sections.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={submitTransfer}
              disabled={submitDisabled || transferLoading}
              className="w-full px-6 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition shadow-md disabled:opacity-20 disabled:cursor-not-allowed text-xs font-mono tracking-widest uppercase flex items-center justify-center gap-2"
            >
              {transferLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-white" /> Transferring products...
                </>
              ) : (
                "Transfer Products to Daraz"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WooTransferPreviewPage;