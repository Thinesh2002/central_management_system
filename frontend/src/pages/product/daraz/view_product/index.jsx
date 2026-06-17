import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Check, ChevronDown, ExternalLink, Filter, MoreVertical, RefreshCw, Search, Send, ShoppingBag, X } from "lucide-react";
import { darazApi, extractApiMessage, extractProductImages, formatDateOnly, normalizeStatus, safeJsonParse } from "../../../../services/daraz/darazCentral.service";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);
  const [transferPopupOpen, setTransferPopupOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [selectedTransferAccounts, setSelectedTransferAccounts] = useState([]);
  const itemsPerPage = 100;

  const formatProduct = (product) => ({
    ...product,
    images: extractProductImages(product),
    attributes_data: safeJsonParse(product.attributes_json, {}),
    raw_data: safeJsonParse(product.raw_json, {}),
    skus: Array.isArray(product.skus) ? product.skus : []
  });

  const loadProducts = async (page = currentPage) => {
    setLoading(true);
    setNotice({ type: "", text: "" });
    try {
      const response = await darazApi.getProducts({
        page,
        limit: itemsPerPage,
        search: search || undefined,
        account_code: selectedStore !== "all" ? selectedStore : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      });
      setProducts((response.rows || []).map(formatProduct));
      setTotalPages(response.totalPages || 1);
      setTotalRows(response.total || response.rows?.length || 0);
      setCurrentPage(response.page || page);
    } catch (error) {
      setProducts([]);
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz products could not be loaded. Please check backend connection and try again.") });
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await darazApi.getAccounts({ active_only: "false" });
      setAccounts(response.rows || []);
    } catch (error) {
      setNotice({ type: "warning", text: extractApiMessage(error, "Products loaded, but Daraz account list could not be loaded.") });
    }
  };

  useEffect(() => {
    loadProducts(1);
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSync = async () => {
    setSyncing(true);
    setNotice({ type: "info", text: selectedStore === "all" ? "Product sync started for all active Daraz accounts." : `Product sync started for ${selectedStore}.` });
    try {
      const response = await darazApi.syncProducts(selectedStore, false);
      setNotice({ type: "success", text: response?.message || "Daraz products synced successfully. Listings are now refreshed from seller center." });
      await loadProducts(1);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz product sync failed. Please verify token status and try again.") });
    } finally {
      setSyncing(false);
    }
  };

  const filteredByDate = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return products.filter((product) => {
      if (!from && !to) return true;
      const rawDate = product.daraz_created_time || product.created_at;
      const date = rawDate && /^\d+$/.test(String(rawDate)) ? new Date(Number(rawDate) > 9999999999 ? Number(rawDate) : Number(rawDate) * 1000) : new Date(rawDate);
      if (!date || Number.isNaN(date.getTime())) return true;
      return (!from || date >= from) && (!to || date <= to);
    });
  }, [products, fromDate, toDate]);

  const statusCounts = useMemo(() => {
    const counts = { all: totalRows || products.length, active: 0, inactive: 0, suspended: 0, pendingqc: 0 };
    products.forEach((p) => {
      const norm = normalizeStatus(p.status);
      if (norm === "active") counts.active++;
      else if (norm === "inactive") counts.inactive++;
      else if (norm === "suspended") counts.suspended++;
      else if (norm === "pendingqc") counts.pendingqc++;
    });
    return counts;
  }, [products, totalRows]);

  const storeOptions = useMemo(() => ["all", ...new Set([...accounts.map((a) => a.account_code), ...products.map((p) => p.account_code)].filter(Boolean))], [accounts, products]);

  const searchNow = () => loadProducts(1);

  const handleView = (product) => {
    setOpenActionId(null);
    navigate(`/daraz/products/${product.id}`);
  };

  const handleTransfer = (product) => {
    setTransferProduct(product);
    setSelectedTransferAccounts([]);
    setTransferPopupOpen(true);
    setOpenActionId(null);
  };

  const toggleTransferAccount = (accountCode) => {
    setSelectedTransferAccounts((prev) => prev.includes(accountCode) ? prev.filter((code) => code !== accountCode) : [...prev, accountCode]);
  };

  const continueTransfer = () => {
    if (!transferProduct) {
      setNotice({ type: "warning", text: "Please select a product before continuing transfer." });
      return;
    }
    if (selectedTransferAccounts.length === 0) {
      setNotice({ type: "warning", text: "Please select at least one target Daraz account for transfer." });
      return;
    }
    const selectedAccountDetails = accounts.filter((account) => selectedTransferAccounts.includes(account.account_code));
    localStorage.setItem("daraz_transfer_preview", JSON.stringify({
      source_account_code: transferProduct.account_code,
      target_accounts: selectedTransferAccounts,
      accounts: selectedTransferAccounts,
      account_details: selectedAccountDetails,
      products: [transferProduct]
    }));
    setTransferPopupOpen(false);
    navigate("/daraz/daraz-to-daraz/preview");
  };

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-4 bg-stone-50 min-h-screen text-stone-800 text-xs">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-semibold uppercase tracking-wide text-[11px]"><ShoppingBag size={15} /> Daraz Product Catalog</div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight mt-1">Daraz Products Inventory</h1>
          <p className="text-[11px] text-stone-500 mt-0.5">Seller-center style listing control for multi-account Daraz sync.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate("/daraz/accounts")} className="px-3 py-2 bg-white border border-stone-300 rounded hover:bg-stone-50 font-semibold">Accounts</button>
          <button disabled={syncing} onClick={runSync} className="px-3 py-2 bg-[#002f36] text-white rounded hover:bg-[#003f48] font-semibold flex items-center gap-2 disabled:opacity-60"><RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync Now"}</button>
        </div>
      </div>

      <Notice notice={notice} />

      <div className="flex flex-wrap items-center gap-4 text-xs border-b border-stone-200 pb-0 text-stone-500">
        <StatusTab label="All listings" value="all" current={statusFilter} count={statusCounts.all} onClick={setStatusFilter} />
        <StatusTab label="Active" value="Active" current={statusFilter} count={statusCounts.active} onClick={setStatusFilter} />
        <StatusTab label="InActive" value="InActive" current={statusFilter} count={statusCounts.inactive} onClick={setStatusFilter} />
        <StatusTab label="Suspended" value="Suspended" current={statusFilter} count={statusCounts.suspended} onClick={setStatusFilter} />
        <StatusTab label="Pending QC" value="Pending QC" current={statusFilter} count={statusCounts.pendingqc} onClick={setStatusFilter} />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 border border-stone-200 rounded shadow-sm">
        <div className="flex items-center border border-stone-300 rounded overflow-hidden bg-white max-w-md flex-1 min-w-[280px]">
          <span className="bg-stone-50 px-3 py-1.5 border-r border-stone-200 text-stone-500 font-medium select-none">All Keys</span>
          <div className="relative flex-1">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchNow()} placeholder="Search by product title, item ID, SKU, or account code..." className="w-full pl-3 pr-8 py-1.5 rounded text-xs text-stone-900 placeholder-stone-400 focus:outline-none bg-white" />
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setIsStoreOpen(!isStoreOpen)} className="flex items-center gap-2 px-3 py-1.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium rounded transition-all text-xs shadow-sm cursor-pointer min-w-[150px]">
            <Filter size={12} className="text-stone-400" />
            <span className="flex-1 text-left capitalize truncate">{selectedStore === "all" ? "All Accounts" : selectedStore}</span>
            <ChevronDown size={12} className={`text-stone-400 transition-transform ${isStoreOpen ? "rotate-180" : ""}`} />
          </button>
          {isStoreOpen && <div className="absolute top-[calc(100%+4px)] left-0 w-52 bg-white border border-stone-200 rounded shadow-xl z-50 py-1 overflow-hidden">
            {storeOptions.map((option) => <button key={option} onClick={() => { setSelectedStore(option); setIsStoreOpen(false); }} className={`w-full px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${selectedStore === option ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-600 hover:bg-stone-50"}`}><span className="capitalize">{option === "all" ? "All Accounts" : option}</span>{selectedStore === option && <Check size={12} className="text-cyan-600" />}</button>)}
          </div>}
        </div>

        <div className="flex items-center gap-2 border border-stone-300 rounded px-2 py-1 bg-white shadow-sm">
          <Calendar size={13} className="text-stone-400" />
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-stone-700 outline-none text-xs cursor-pointer focus:text-stone-900" />
          <span className="text-stone-300 px-0.5 select-none">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-stone-700 outline-none text-xs cursor-pointer focus:text-stone-900" />
          {(fromDate || toDate) && <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-stone-400 hover:text-stone-600 ml-1 p-0.5 cursor-pointer"><X size={12} /></button>}
        </div>
        <button onClick={searchNow} className="px-3 py-1.5 border border-stone-300 bg-white rounded hover:bg-stone-50 font-semibold">Apply</button>
      </div>

      <div className="bg-white border border-stone-200 rounded overflow-visible shadow-sm min-h-[400px] flex flex-col justify-between">
        {loading ? <div className="flex-1 flex items-center justify-center p-12 text-stone-400"><RefreshCw className="animate-spin mr-2" size={18} /> Loading Daraz products…</div> : <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50/80 text-stone-600 border-b border-stone-200 text-[11px] font-medium uppercase tracking-tight"><tr><th className="p-3 pl-4 font-semibold">Product Info & Identifier</th><th className="p-3 font-semibold w-32 text-center">Store Code</th><th className="p-3 font-semibold w-28 text-center">Status</th><th className="p-3 font-semibold w-36">Created Date</th><th className="p-3 font-semibold w-24 text-right pr-6">Actions</th></tr></thead>
            <tbody className="divide-y divide-stone-200">
              {filteredByDate.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-stone-400 font-medium">No matching Daraz listings found. Try changing filters or run sync.</td></tr> : filteredByDate.map((product) => {
                const firstImage = product.images?.[0] || "https://via.placeholder.com/80";
                const isActionOpen = openActionId === product.id;
                return <tr key={product.id} onClick={() => navigate(`/daraz/products/${product.id}`)} className="hover:bg-stone-50/50 transition-colors cursor-pointer">
                  <td className="p-3 pl-4"><div className="flex gap-3 items-start"><div className="w-10 h-10 rounded border border-stone-200 bg-stone-50 overflow-hidden shrink-0 flex"><img src={firstImage} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/80"; }} /></div><div className="space-y-0.5 min-w-0"><div className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:underline transition-colors block leading-tight max-w-2xl truncate cursor-pointer flex items-center gap-1.5 group"><span>{product.name || "Untitled Daraz product"}</span><ExternalLink size={11} className="opacity-0 group-hover:opacity-100 text-stone-400 transition-opacity shrink-0" /></div><div className="text-[10px] text-stone-400 font-mono">ITEM ID: <strong className="text-stone-600 uppercase">{product.item_id}</strong></div></div></div></td>
                  <td className="p-3 text-center text-stone-600 font-medium font-mono text-[11px] uppercase">{product.account_code || "-"}</td>
                  <td className="p-3 text-center"><StatusBadge status={product.status} /></td>
                  <td className="p-3 text-stone-500 font-medium">{formatDateOnly(product.daraz_created_time || product.created_at)}</td>
                  <td className="p-3 text-right pr-6" onClick={(e) => e.stopPropagation()}><div className="relative inline-block"><button onClick={() => setOpenActionId(isActionOpen ? null : product.id)} className={`p-1 rounded border border-stone-200 transition-colors bg-white cursor-pointer ${isActionOpen ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-50"}`}><MoreVertical size={14} /></button>{isActionOpen && <div className="absolute right-0 mt-1 w-44 bg-white border border-stone-200 rounded shadow-xl z-50 py-1 overflow-hidden text-left text-xs"><button onClick={() => handleView(product)} className="w-full flex items-center gap-2 px-3 py-1.5 text-stone-700 hover:bg-stone-50 hover:text-cyan-600 transition-colors cursor-pointer text-left"><ExternalLink size={12} className="text-cyan-600" /> View Details</button><button onClick={() => handleTransfer(product)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[#e5a928] hover:bg-stone-50 transition-colors cursor-pointer text-left font-medium"><Send size={12} /> Channel Transfer</button></div>}</div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>}

        {!loading && filteredByDate.length > 0 && <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-t border-stone-200 bg-stone-50 text-stone-500 text-[11px]"><div>Showing page {currentPage} of {totalPages} • {totalRows || filteredByDate.length} total listings</div><div className="flex items-center gap-1.5"><button disabled={currentPage <= 1} onClick={() => loadProducts(currentPage - 1)} className="px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-all cursor-pointer shadow-sm">Prev</button><button disabled={currentPage >= totalPages} onClick={() => loadProducts(currentPage + 1)} className="px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-all cursor-pointer shadow-sm">Next</button></div></div>}
      </div>

      {transferPopupOpen && <div className="fixed inset-0 z-[9999] bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-xl bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden text-stone-700 text-xs"><div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50"><div><h2 className="text-stone-900 text-sm font-bold">Select Target Transfer Channels</h2><p className="text-[11px] text-stone-400 mt-0.5">Select one or more Daraz accounts for transfer validation.</p></div><button onClick={() => setTransferPopupOpen(false)} className="p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"><X size={16} /></button></div><div className="p-5 space-y-3 max-h-80 overflow-y-auto">{accounts.filter((a) => a.account_code !== transferProduct?.account_code).map((account) => <button key={account.account_code} onClick={() => toggleTransferAccount(account.account_code)} className={`w-full text-left p-3 rounded border transition-colors ${selectedTransferAccounts.includes(account.account_code) ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-stone-200 hover:bg-stone-50"}`}><div className="font-bold">{account.account_name || account.account_code}</div><div className="text-[10px] font-mono opacity-70">{account.account_code}</div></button>)}</div><div className="px-5 py-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2"><button onClick={() => setTransferPopupOpen(false)} className="px-3 py-2 border border-stone-300 rounded bg-white hover:bg-stone-50 font-semibold">Cancel</button><button onClick={continueTransfer} className="px-3 py-2 bg-[#002f36] text-white rounded hover:bg-[#003f48] font-semibold">Continue Transfer</button></div></div></div>}
    </div>
  );
}

function StatusTab({ label, value, current, count, onClick }) {
  const active = current === value;
  return <button onClick={() => onClick(value)} className={`pb-2 px-1 transition-colors font-medium border-b-2 cursor-pointer ${active ? "text-cyan-600 border-cyan-600 font-semibold" : "border-transparent hover:text-stone-700"}`}>{label} <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${active ? "bg-cyan-100 text-cyan-800" : "bg-stone-200 text-stone-700"}`}>{count}</span></button>;
}

function StatusBadge({ status }) {
  const norm = normalizeStatus(status);
  const cls = norm === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : norm === "inactive" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight ${cls}`}>{status || "Unknown"}</span>;
}

function Notice({ notice }) {
  if (!notice?.text) return null;
  const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200";
  return <div className={`border rounded px-4 py-3 font-medium ${cls}`}>{notice.text}</div>;
}
