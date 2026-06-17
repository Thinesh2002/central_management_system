import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../../config/api";
import { motion, AnimatePresence } from "framer-motion";

const WooProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  const [dateRange, setDateRange] = useState("All Time");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const [accounts, setAccounts] = useState([]);
  const [transferPopupOpen, setTransferPopupOpen] = useState(false);

  const [selectedTransferProducts, setSelectedTransferProducts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchDarazAccounts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    filterLogic();
  }, [
    searchTerm,
    selectedCategory,
    selectedType,
    dateRange,
    customDates,
    products,
  ]);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/woo-products/all");
      setProducts(res.data || []);
      setFilteredProducts(res.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      alert("Failed to fetch WooCommerce products");
    } finally {
      setLoading(false);
    }
  };

  const fetchDarazAccounts = async () => {
    try {
      const res = await API.get("/accounts/view");
      setAccounts(res.data?.accounts || res.data || []);
    } catch (err) {
      console.error("Daraz accounts fetch error:", err);
      setAccounts([]);
    }
  };

  const filterLogic = () => {
    let temp = [...products];

    if (searchTerm) {
      temp = temp.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "All") {
      temp = temp.filter((p) =>
        p.categories?.some((cat) => cat.name === selectedCategory)
      );
    }

    if (selectedType !== "All") {
      temp = temp.filter((p) => p.type === selectedType);
    }

    const now = new Date();

    if (dateRange !== "All Time") {
      temp = temp.filter((p) => {
        const pDate = new Date(p.date_created);

        if (dateRange === "Yesterday") {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return pDate.toDateString() === yesterday.toDateString();
        }

        if (dateRange === "Last 7 Days") {
          const d = new Date();
          d.setDate(now.getDate() - 7);
          return pDate >= d;
        }

        if (dateRange === "Last 30 Days") {
          const d = new Date();
          d.setDate(now.getDate() - 30);
          return pDate >= d;
        }

        if (dateRange === "Last 90 Days") {
          const d = new Date();
          d.setDate(now.getDate() - 90);
          return pDate >= d;
        }

        if (dateRange === "Custom" && customDates.start && customDates.end) {
          const start = new Date(customDates.start);
          const end = new Date(customDates.end);
          end.setHours(23, 59, 59);
          return pDate >= start && pDate <= end;
        }

        return true;
      });
    }

    setFilteredProducts(temp);
  };

  const handleOpenProduct = (id) => {
    window.open(`/woo-products/${id}`, "_blank");
  };

  const handleEdit = (id) => {
    window.open(`/woo-edit-product/${id}`, "_blank");
    setOpenMenu(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure to delete this product?")) return;

    try {
      await API.delete(`/woo-products/${id}`);
      const updatedProducts = products.filter((p) => p.id !== id);
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
      setOpenMenu(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete product");
    }
  };

  const openTransferPopup = (product) => {
    setSelectedTransferProducts([product]);
    setSelectedAccounts([]);
    setTransferPopupOpen(true);
    setOpenMenu(null);
  };

  const toggleAccount = (accountCode) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(accountCode)) {
        return prev.filter((item) => item !== accountCode);
      }
      return [...prev, accountCode];
    });
  };

  const selectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
      return;
    }
    setSelectedAccounts(accounts.map((acc) => acc.account_code));
  };

  const goToPreview = () => {
    if (!selectedAccounts.length) {
      alert("Please select at least one Daraz account");
      return;
    }

    const selectedAccountDetails = accounts.filter((account) =>
      selectedAccounts.includes(account.account_code)
    );

    const transferData = {
      products: selectedTransferProducts,
      accounts: selectedAccounts,
      account_details: selectedAccountDetails,
    };

    localStorage.setItem("woo_transfer_preview", JSON.stringify(transferData));
    window.open("/woo-transfer-preview", "_blank");
  };

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(products.flatMap((p) => p.categories?.map((c) => c.name) || [])),
    ];
  }, [products]);

  return (
    <div className="bg-stone-50 text-stone-800 min-h-screen p-6 font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-[600] text-stone-900 mb-6 tracking-tight">
            Woo Products
          </h1>

          {/* Clean Light Filters Row Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <input
              type="text"
              placeholder="Search Name or SKU..."
              className="bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 rounded-xl px-4 py-2 outline-none focus:border-stone-400 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="bg-stone-50 border border-stone-200 text-stone-700 rounded-xl px-4 py-2 outline-none focus:border-stone-400 cursor-pointer transition"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-white text-stone-800">
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="bg-stone-50 border border-stone-200 text-stone-700 rounded-xl px-4 py-2 outline-none focus:border-stone-400 cursor-pointer transition"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="All" className="bg-white text-stone-800">All Types</option>
              <option value="simple" className="bg-white text-stone-800">Simple Product</option>
              <option value="variable" className="bg-white text-stone-800">Variable Product</option>
            </select>

            <select
              className="bg-slate-50 border border-stone-200 text-stone-700 rounded-xl px-4 py-2 outline-none focus:border-stone-400 cursor-pointer transition"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="All Time" className="bg-white text-stone-800">All Time</option>
              <option value="Yesterday" className="bg-white text-stone-800">Yesterday</option>
              <option value="Last 7 Days" className="bg-white text-stone-800">Last 7 Days</option>
              <option value="Last 30 Days" className="bg-white text-stone-800">Last 30 Days</option>
              <option value="Last 90 Days" className="bg-white text-stone-800">Last 90 Days</option>
              <option value="Custom" className="bg-white text-stone-800">Custom Range</option>
            </select>

            {dateRange === "Custom" && (
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-full bg-stone-50 border border-stone-200 text-stone-700 rounded-xl px-3 py-2 outline-none focus:border-stone-400 cursor-pointer transition"
                  value={customDates.start}
                  onChange={(e) =>
                    setCustomDates({
                      ...customDates,
                      start: e.target.value,
                    })
                  }
                />

                <input
                  type="date"
                  className="w-full bg-stone-50 border border-stone-200 text-stone-700 rounded-xl px-3 py-2 outline-none focus:border-stone-400 cursor-pointer transition"
                  value={customDates.end}
                  onChange={(e) =>
                    setCustomDates({
                      ...customDates,
                      end: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20 text-stone-500 font-mono text-xs tracking-wider">
            LOADING WOO PRODUCTS MATRIX RECORDS...
          </div>
        ) : (
          /* Light Professional Minimalist Inventory Table Block */
          <div className="bg-white border border-stone-200 rounded-2xl overflow-visible shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600 border-b border-stone-200 font-mono uppercase text-[11px] tracking-wider">
                  <th className="p-4">Preview</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Product ID</th>
                  <th className="p-4">SKU Code</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Price Matrix</th>
                  <th className="p-4">Images</th>
                  <th className="p-4">Start Date</th>
                  <th className="p-4 text-center">Action Matrix</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-16 text-center text-stone-400 font-mono uppercase tracking-wide"
                    >
                      No inventory registry records found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-stone-100 group hover:bg-stone-50/60 transition-colors"
                    >
                      <td className="p-4">
                        <img
                          src={p.images?.[0]?.src}
                          alt={p.name}
                          className="w-11 h-11 rounded-lg object-cover bg-stone-100 border border-stone-200 shadow-sm transition-transform group-hover:scale-105"
                        />
                      </td>

                      <td
                        className="p-4 font-semibold text-stone-800 text-[13px] hover:text-cyan-700 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProduct(p.id);
                        }}
                      >
                        {p.name}
                      </td>

                      <td className="p-4 text-stone-400 font-mono">#{p.id}</td>

                      <td className="p-4 text-stone-600 font-mono uppercase">
                        {p.sku || "—"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase font-mono ${
                            p.type === "variable"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-stone-100 text-stone-600 border-stone-200"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>

                      <td className="p-4 text-stone-900 font-bold font-mono text-[13px]">
                        Rs {p.price || "0.00"}
                      </td>

                      <td className="p-4 text-stone-500 font-mono">
                        {p.images?.length || 0}
                      </td>

                      <td className="p-4 text-stone-400 font-mono">
                        {p.date_created
                          ? new Date(p.date_created).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="p-4 relative text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === p.id ? null : p.id);
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 transition-all bg-white cursor-pointer ${
                            openMenu === p.id 
                              ? 'bg-stone-100 text-stone-900 border-stone-300' 
                              : 'text-stone-400 hover:bg-stone-50 hover:text-stone-800'
                          }`}
                        >
                          ⋮
                        </button>

                        <AnimatePresence>
                          {openMenu === p.id && (
                            <>
                              <div className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenu(null)} />
                              <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-10 mt-1 bg-white border border-stone-200 rounded-xl w-36 shadow-xl overflow-hidden z-20 text-left py-1"
                              >
                                <button
                                  onClick={() => handleEdit(p.id)}
                                  className="w-full text-left px-4 py-2 hover:bg-stone-50 transition text-stone-700 hover:text-amber-600 font-medium cursor-pointer"
                                >
                                  Edit Node
                                </button>

                                <button
                                  onClick={() => openTransferPopup(p)}
                                  className="w-full text-left px-4 py-2 text-cyan-600 hover:bg-cyan-50/50 transition font-medium cursor-pointer"
                                >
                                  Transfer Cluster
                                </button>

                                <div className="h-px bg-stone-100 my-1" />

                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition font-medium cursor-pointer"
                                >
                                  Delete Matrix
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Transfer Modal Glassmorphic Overlay Component */}
        <AnimatePresence>
          {transferPopupOpen && (
            <motion.div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-2xl bg-white border border-stone-200 rounded-2xl shadow-2xl p-6 text-stone-800"
                initial={{ scale: 0.96, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 20 }}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                      Transfer Product Node
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Select Daraz account. Preview page la category and attributes select pannalam.
                    </p>
                  </div>

                  <button
                    onClick={() => setTransferPopupOpen(false)}
                    className="text-stone-400 hover:text-stone-700 text-2xl font-light cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                {/* Light Popup Target Meta Summary */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5">
                  {selectedTransferProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <img
                        src={product.images?.[0]?.src}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-cover bg-white border border-stone-200 shadow-sm"
                      />

                      <div>
                        <h3 className="text-sm font-semibold text-stone-800 leading-snug">{product.name}</h3>
                        <p className="text-[11px] text-stone-400 font-mono mt-1 uppercase">
                          ID: #{product.id} | SKU: {product.sku || "N/A"} | Rs {product.price || "0"} | Images: {product.images?.length || 0}
                        </p>

                        {product.permalink && (
                          <a
                            href={product.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-cyan-600 hover:text-cyan-700 underline mt-1 inline-block font-medium cursor-pointer"
                          >
                            Open Website Product
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-stone-500 font-mono uppercase tracking-wider">Daraz Target Accounts</h3>

                  <button
                    onClick={selectAllAccounts}
                    className="text-xs text-stone-600 font-semibold hover:text-stone-900 transition hover:underline cursor-pointer"
                  >
                    {selectedAccounts.length === accounts.length
                      ? "Clear Selection"
                      : "Select All Accounts"}
                  </button>
                </div>

                {/* Account Cards Select Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {accounts.length === 0 ? (
                    <div className="text-xs text-stone-400 font-mono uppercase border border-stone-200 border-dashed rounded-xl p-4 text-center">
                      No Daraz target configurations registered
                    </div>
                  ) : (
                    accounts.map((account) => (
                      <label
                        key={account.account_code}
                        className={`border rounded-xl p-4 cursor-pointer flex items-start transition ${
                          selectedAccounts.includes(account.account_code)
                            ? "border-stone-800 bg-stone-50 shadow-inner"
                            : "border-stone-200 bg-white hover:bg-stone-50/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 mr-3 accent-stone-900 cursor-pointer"
                          checked={selectedAccounts.includes(
                            account.account_code
                          )}
                          onChange={() => toggleAccount(account.account_code)}
                        />

                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-stone-800 block truncate">
                            {account.account_name || account.name}
                          </span>
                          <span className="block text-[11px] text-stone-400 font-mono mt-0.5 uppercase">
                            CODE: {account.account_code}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t border-stone-100 pt-4">
                  <button
                    onClick={() => setTransferPopupOpen(false)}
                    className="px-5 py-2 rounded-xl border border-stone-200 text-stone-500 font-medium hover:bg-stone-50 transition cursor-pointer text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={goToPreview}
                    className="px-5 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-md text-xs"
                    disabled={!selectedAccounts.length}
                  >
                    Go to Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WooProductsPage;