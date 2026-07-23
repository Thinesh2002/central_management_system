import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Boxes, Edit3, History, ImageOff, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import localProductsApi from "../../config/sub_api/product_management_api/local_products_api";
import { getErrorMessage, normalizeList } from "../product_management/products/utils/productSku";
import { useToast } from "../../components/common/toast/ToastProvider";
import { useCanViewCostPrice } from "../../components/common/permissions/PermissionsProvider";
import Loader from "../../components/common/Loader";

const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").trim();
const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
const emptyForm = { sku: "", product_sku: "", variant_sku: "", product_name: "", image_url: "", colour_name: "", location_code: "MAIN", total_stock: 0, stock_qty: 0, quantity: 0, reserved_stock: 0, reserved_qty: 0, damaged_stock: 0, supplied_qty: 0, sold_qty: 0, low_stock_alert_qty: 5, cost_price: "", status: "active" };

function clean(v) { return String(v ?? "").trim(); }
function num(v) { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function fmt(v) { return num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function getSku(r = {}) { return clean(r.sku || r.variant_sku || r.product_sku || r.local_sku || r.seller_sku || "-"); }
function getStock(r = {}) { return num(r.stock_qty ?? r.total_stock ?? r.quantity ?? r.qty ?? r.stock); }
function getReserved(r = {}) { return num(r.reserved_qty ?? r.reserved_stock ?? r.reserved ?? 0); }
function getAvailable(r = {}) { return r.available_qty !== undefined ? num(r.available_qty) : r.available_stock !== undefined ? num(r.available_stock) : Math.max(getStock(r) - getReserved(r), 0); }
function getLocation(r = {}) { return r.location_name || r.warehouse_name || r.location_code || r.location || "MAIN"; }
function imgUrl(url) { const u = clean(url); if (!u) return ""; if (/^https?:\/\//i.test(u)) return u; if (u.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${u}`; if (u.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${u}`; if (u.startsWith("/")) return `${BACKEND_BASE_URL}${u}`; return `${BACKEND_BASE_URL}/${u.replace(/^\/+/, "")}`; }
function productName(p = {}) { return clean(p.product_name || p.title || p.name || p.product_title || p.model_name || p.product_sku || p.sku || "Product"); }
function productSku(p = {}) { return clean(p.product_sku || p.sku || p.local_sku || p.model_sku || p.item_sku || p.code || ""); }
function variantSku(v = {}) { return clean(v.variant_sku || v.sku || v.child_sku || v.local_sku || v.seller_sku || v.model_sku || ""); }
function colourName(v = {}) { return clean(v.colour_name || v.color_name || v.colour || v.color || v.variant_name || v.name || ""); }
function mainImage(row = {}) { return clean(row.main_image_url || row.image_url || row.product_image_url || row.variant_image_url || row.thumbnail_url || row.image || row.main_image?.image_url || row.main_image?.url || ""); }
function flattenCatalog(products = []) {
  const out = [];
  products.forEach((p) => {
    const pSku = productSku(p);
    const base = { product_id: p.id || p.product_id, product_sku: pSku, product_name: productName(p), image_url: mainImage(p), raw_product: p };
    const variants = Array.isArray(p.variants) ? p.variants : [];
    if (variants.length) {
      variants.forEach((v) => {
        const vSku = variantSku(v);
        if (!vSku) return;
        out.push({ ...base, sku: vSku, variant_sku: vSku, colour_name: colourName(v), image_url: mainImage(v) || base.image_url, label: `${vSku} — ${base.product_name}${colourName(v) ? ` / ${colourName(v)}` : ""}`, is_variant: true, raw_variant: v });
      });
    } else if (pSku) {
      out.push({ ...base, sku: pSku, variant_sku: "", colour_name: "", label: `${pSku} — ${base.product_name}`, is_variant: false });
    }
  });
  return out;
}
function stockStatus(row = {}) {
  const available = getAvailable(row);
  if (available <= 0) return { label: "Out of Stock", className: "bg-rose-500/10 text-rose-300 border-rose-500/30" };
  const low = num(row.low_stock_alert_qty ?? 0);
  if (low > 0 && available <= low) return { label: "Low Stock", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" };
  return { label: "In Stock", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" };
}
function normalizeForm(row = {}, price = {}) {
  return {
    ...emptyForm,
    ...row,
    sku: getSku(row) === "-" ? "" : getSku(row),
    reserved_qty: getReserved(row),
    stock_qty: getStock(row),
    total_stock: num(row.total_stock ?? getStock(row)),
    quantity: num(row.quantity ?? getStock(row)),
    location_code: clean(row.location_code || row.location || "MAIN"),
    image_url: mainImage(row) || row.image_url || "",
    cost_price: price?.cost_price ?? "",
  };
}
function ProductImage({ src, name }) {
  const url = imgUrl(src);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-[#070b16]">
      {url ? <img src={url} alt={name || "Product"} className="h-full w-full object-cover" /> : <ImageOff size={15} className="text-slate-600" />}
    </div>
  );
}
function StatCard({ label, value, tone = "text-slate-100" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a101d] px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-[16px] font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function InventoryPage() {
  const showToast = useToast();
  const canViewCostPrice = useCanViewCostPrice();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [skuSearch, setSkuSearch] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [productMatches, setProductMatches] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySku, setHistorySku] = useState("");
  const [historyRows, setHistoryRows] = useState([]);

  async function loadCatalog(q = "") {
    setProductLoading(true);
    try {
      const res = await localProductsApi.getProducts({ limit: 200, search: q });
      const flat = flattenCatalog(normalizeList(res));
      if (!q) setCatalog(flat);
      return flat;
    } catch (e) {
      console.warn("[INVENTORY_CATALOG_LOAD]", e);
      return [];
    } finally {
      setProductLoading(false);
    }
  }

  async function loadInventory() {
    setLoading(true);
    try {
      const [inv, , priceRes] = await Promise.all([
        localProductsApi.getInventory({ limit: 500, sort_by: "updated_at", sort_dir: "DESC" }),
        loadCatalog(),
        localProductsApi.getPrices({ limit: 1000 }).catch(() => []),
      ]);
      setRows(normalizeList(inv));
      setPrices(normalizeList(priceRes));
    } catch (e) {
      alert(getErrorMessage(e, "Unable to load inventory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInventory(); }, []);

  const catalogMap = useMemo(() => { const m = new Map(); catalog.forEach((p) => m.set(clean(p.sku).toLowerCase(), p)); return m; }, [catalog]);
  const inventoryMap = useMemo(() => { const m = new Map(); rows.forEach((r) => m.set(getSku(r).toLowerCase(), r)); return m; }, [rows]);
  const priceMap = useMemo(() => { const m = new Map(); prices.forEach((p) => m.set(getSku(p).toLowerCase(), p)); return m; }, [prices]);

  const displayRows = useMemo(() => {
    const merged = [];
    const used = new Set();
    catalog.forEach((p) => {
      const key = clean(p.sku).toLowerCase();
      if (!key) return;
      const inv = inventoryMap.get(key);
      used.add(key);
      merged.push(inv ? { ...p, ...inv, image_url: mainImage(inv) || p.image_url, product_name: inv.product_name || p.product_name, colour_name: inv.colour_name || p.colour_name } : { ...p, id: null, stock_qty: 0, reserved_qty: 0, available_qty: 0, low_stock_alert_qty: 5, location_code: "MAIN", status: "active", _not_created: true });
    });
    rows.forEach((r) => { const key = getSku(r).toLowerCase(); if (!used.has(key)) merged.push(r); });
    return merged;
  }, [catalog, inventoryMap, rows]);

  function meta(row) { return catalogMap.get(getSku(row).toLowerCase()) || {}; }
  function priceOf(row) { return priceMap.get(getSku(row).toLowerCase()) || {}; }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayRows;
    return displayRows.filter((r) => [getSku(r), r.product_sku, r.variant_sku, r.product_name, meta(r).product_name, r.colour_name, meta(r).colour_name, getLocation(r), r.status].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [displayRows, search, catalogMap]);

  const totals = useMemo(() => filteredRows.reduce((s, r) => {
    const stock = getStock(r);
    const price = priceOf(r);
    s.stock += stock;
    s.reserved += getReserved(r);
    s.available += getAvailable(r);
    s.costValue += num(price.cost_price) * stock;
    s.sellingValue += num(price.local_selling_price || price.sale_price) * stock;
    if (getAvailable(r) <= 0) s.out += 1;
    else if (num(r.low_stock_alert_qty) > 0 && getAvailable(r) <= num(r.low_stock_alert_qty)) s.low += 1;
    return s;
  }, { stock: 0, reserved: 0, available: 0, low: 0, out: 0, costValue: 0, sellingValue: 0 }), [filteredRows, priceMap]);

  function resetProductSearch() { setSkuSearch(""); setProductMatches([]); setSelectedProduct(null); }

  function openAdd() { setEditing(null); setForm(emptyForm); resetProductSearch(); setModalOpen(true); }

  function openEdit(row) {
    setEditing(row);
    const price = priceOf(row);
    const f = normalizeForm(row, price);
    const m = meta(row);
    setForm({ ...f, product_name: f.product_name || m.product_name || "", image_url: f.image_url || m.image_url || "", colour_name: f.colour_name || m.colour_name || "" });
    setSelectedProduct(m.sku ? m : { sku: f.sku, product_sku: f.product_sku, variant_sku: f.variant_sku, product_name: f.product_name, image_url: f.image_url, colour_name: f.colour_name });
    setSkuSearch(f.sku);
    setProductMatches([]);
    setModalOpen(true);
  }

  function setField(n, v) { setForm((p) => ({ ...p, [n]: v })); }

  async function searchProducts() {
    const q = clean(skuSearch);
    if (!q) return alert("Enter a SKU to search first.");
    const flat = await loadCatalog(q);
    setProductMatches(flat.filter((x) => [x.sku, x.product_sku, x.product_name, x.colour_name].join(" ").toLowerCase().includes(q.toLowerCase())).slice(0, 30));
  }

  function selectProduct(p) {
    setSelectedProduct(p);
    setForm((prev) => ({ ...prev, sku: p.sku, product_sku: p.product_sku || p.sku, variant_sku: p.variant_sku || "", product_name: p.product_name || "", image_url: p.image_url || "", colour_name: p.colour_name || "" }));
    setProductMatches([]);
  }

  async function syncAllDaraz() {
    setSyncAllLoading(true);
    try {
      const res = await localProductsApi.syncAllDarazInventory();
      const d = res?.data?.data || res?.data || {};
      alert(`Daraz inventory sync finished. Success: ${d.success_records || 0}, Failed: ${d.failed_records || 0}, Skipped: ${d.skipped_records || 0}`);
      await loadInventory();
    } catch (e) {
      alert(getErrorMessage(e, "Unable to sync Daraz inventory."));
    } finally {
      setSyncAllLoading(false);
    }
  }

  async function openHistory(row) {
    const s = getSku(row);
    setHistorySku(s);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const res = await localProductsApi.getCostHistoryBySku(s);
      setHistoryRows(normalizeList(res));
    } catch (e) {
      showToast(getErrorMessage(e, "Unable to load cost history."), { type: "error" });
      setHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    const s = clean(form.sku);
    if (!s) return alert("First search for a SKU and select a product/variant.");

    const stock = num(form.stock_qty);
    const reserved = num(form.reserved_qty ?? form.reserved_stock);
    const costPrice = clean(form.cost_price);

    const payload = {
      ...form,
      sku: s,
      product_sku: clean(form.product_sku) || s,
      variant_sku: clean(form.variant_sku),
      product_name: clean(form.product_name),
      image_url: clean(form.image_url),
      colour_name: clean(form.colour_name),
      location_code: clean(form.location_code) || "MAIN",
      total_stock: num(form.total_stock || stock),
      stock_qty: stock,
      quantity: num(form.quantity || stock),
      reserved_qty: reserved,
      reserved_stock: reserved,
      available_qty: Math.max(stock - reserved, 0),
      available_stock: Math.max(stock - reserved, 0),
      damaged_stock: num(form.damaged_stock),
      supplied_qty: num(form.supplied_qty),
      sold_qty: num(form.sold_qty),
      low_stock_alert_qty: num(form.low_stock_alert_qty || 5),
      cost_price: costPrice ? num(costPrice) : undefined,
    };

    setSaving(true);
    try {
      const id = editing?.id || editing?.inventory_id;
      if (id) await localProductsApi.patchInventory(id, payload);
      else await localProductsApi.createInventory(payload);
      setModalOpen(false);
      showToast("Inventory saved successfully.");
      await loadInventory();
    } catch (e) {
      alert(getErrorMessage(e, "Unable to save inventory."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Boxes size={20} />
            Inventory Dashboard
          </h1>
          <p className="text-[13px] text-slate-500">
            Stock levels across every SKU. Receiving new stock is done directly here — enter a cost price when it
            changes and it's logged automatically.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={syncAllDaraz}
            disabled={syncAllLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={syncAllLoading ? "animate-spin" : ""} />
            Sync Daraz Stock
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400"
          >
            <Plus size={13} />
            Add Inventory
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${canViewCostPrice ? "xl:grid-cols-7" : "xl:grid-cols-6"}`}>
        <StatCard label="Total Stock" value={totals.stock.toLocaleString()} tone="text-orange-300" />
        <StatCard label="Reserved" value={totals.reserved.toLocaleString()} tone="text-cyan-300" />
        <StatCard label="Available" value={totals.available.toLocaleString()} tone="text-emerald-300" />
        <StatCard label="Low" value={totals.low.toLocaleString()} tone="text-amber-300" />
        <StatCard label="Out" value={totals.out.toLocaleString()} tone="text-rose-300" />
        {canViewCostPrice && <StatCard label="Total Cost Value" value={fmt(totals.costValue)} tone="text-sky-300" />}
        <StatCard label="Total Selling Value" value={fmt(totals.sellingValue)} tone="text-lime-300" />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950">
        <div className="flex flex-col gap-2 border-b border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, product, colour, location..."
              className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-3 text-[12px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400/60"
            />
          </div>
          <p className="text-[12px] text-slate-500">
            Showing {filteredRows.length} of {displayRows.length}
          </p>
        </div>

        {loading ? (
          <Loader label="Loading inventory..." minHeight="0" className="py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-slate-900">
                <tr>
                  {["Product", "SKU / Colour", "Stock", "Reserved", "Available", "Low Alert", "Status", "Location", "Action"].map((header) => (
                    <th
                      key={header}
                      className={`px-3 py-2 font-normal uppercase tracking-wide text-slate-500 ${["Stock", "Reserved", "Available", "Low Alert"].includes(header) ? "text-right" : header === "Action" ? "text-right" : header === "Status" ? "text-center" : "text-left"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRows.length ? (
                  filteredRows.map((r, i) => {
                    const st = stockStatus(r);
                    const m = meta(r);
                    const name = r.product_name || m.product_name || "Product";
                    return (
                      <tr key={r.id || r.inventory_id || `${getSku(r)}-${i}`} className="hover:bg-slate-900">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <ProductImage src={r.image_url || m.image_url} name={name} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{name}</p>
                              <p className="truncate text-[11px] text-slate-500">SKU: {r.product_sku || m.product_sku || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-mono text-[11px] font-semibold text-orange-300/90">{getSku(r)}</p>
                          {(r.colour_name || m.colour_name) && <p className="text-[11px] text-slate-500">{r.colour_name || m.colour_name}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-200">{getStock(r).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-cyan-300">{getReserved(r).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-300">{getAvailable(r).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-amber-300">{num(r.low_stock_alert_qty).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.className}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{getLocation(r)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canViewCostPrice && (
                              <button
                                type="button"
                                onClick={() => openHistory(r)}
                                title="Cost Price History"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
                              >
                                <History size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-400 hover:text-orange-300"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-3 py-10 text-center text-[12px] text-slate-500">No SKU rows found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <form onSubmit={submitForm} className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#653bb3] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-white">{editing ? "Modify Inventory" : "Add Inventory"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-md border border-slate-800 bg-[#070b16] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-orange-300">1. Search SKU</p>
                <div className="flex gap-2">
                  <input
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    placeholder="Enter product SKU or variant SKU"
                    className="h-9 flex-1 rounded-md border border-slate-700 bg-[#020617] px-3 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
                  />
                  <button type="button" onClick={searchProducts} className="h-9 rounded-md bg-orange-400 px-3 text-[12px] font-semibold text-slate-950">
                    {productLoading ? "Searching..." : "Search"}
                  </button>
                </div>

                {productMatches.length > 0 && (
                  <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-slate-800">
                    {productMatches.map((p) => (
                      <button
                        type="button"
                        key={`${p.sku}-${p.product_id}`}
                        onClick={() => selectProduct(p)}
                        className="flex w-full items-center gap-3 border-b border-slate-800 px-3 py-2 text-left last:border-b-0 hover:bg-slate-800/60"
                      >
                        <ProductImage src={p.image_url} name={p.product_name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{p.label}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.is_variant ? "Variant SKU stock" : "Single product SKU stock"}
                            {p.colour_name ? ` • Colour: ${p.colour_name}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedProduct && (
                  <div className="mt-3 flex items-center gap-3 rounded-md border border-orange-500/30 bg-orange-500/5 p-3">
                    <ProductImage src={selectedProduct.image_url} name={selectedProduct.product_name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">Selected: {selectedProduct.product_name}</p>
                      <p className="text-[11px] font-semibold text-orange-300">
                        SKU: {selectedProduct.sku} {selectedProduct.colour_name ? `/ Colour: ${selectedProduct.colour_name}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["stock_qty", "2. Stock Qty", "number"],
                  ["reserved_qty", "Reserved Qty", "number"],
                  ["available_qty", "Available Qty", "number"],
                  ["location_code", "Location Code", "text"],
                  ["damaged_stock", "Damaged Stock", "number"],
                  ["supplied_qty", "Supplied Qty", "number"],
                  ["sold_qty", "Sold Qty", "number"],
                  ["low_stock_alert_qty", "Low Stock Alert", "number"],
                ].map(([n, l, t]) => (
                  <label key={n} className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l}</span>
                    <input
                      type={t}
                      value={form[n] ?? ""}
                      onChange={(e) => setField(n, e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                    />
                  </label>
                ))}

                {canViewCostPrice && (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Cost Price <span className="normal-case text-slate-600">(this batch)</span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.cost_price ?? ""}
                      onChange={(e) => setField("cost_price", e.target.value)}
                      placeholder="Leave blank to keep current cost"
                      className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</span>
                  <select
                    value={form.status || "active"}
                    onChange={(e) => setField("status", e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <button type="button" onClick={() => setModalOpen(false)} className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-400 px-3 text-[12px] font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
                <Save size={13} /> {saving ? "Saving..." : "Save Inventory"}
              </button>
            </div>
          </form>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#653bb3] px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
                <History size={15} /> Cost Price History — {historySku}
              </h2>
              <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              {historyLoading ? (
                <Loader label="Loading cost history..." minHeight="120px" />
              ) : !historyRows.length ? (
                <p className="rounded-md border border-slate-800 bg-[#070b16] px-3 py-6 text-center text-[12px] text-slate-500">
                  No cost price changes recorded yet for this SKU. Cost history is logged automatically whenever you save a
                  different cost price here.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-slate-800">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Date</th>
                        <th className="px-3 py-1.5 font-medium text-right">Old Cost</th>
                        <th className="px-3 py-1.5 font-medium text-right">New Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {historyRows.map((h) => (
                        <tr key={h.id}>
                          <td className="px-3 py-1.5 text-slate-300">{h.created_at ? String(h.created_at).slice(0, 10) : "-"}</td>
                          <td className="px-3 py-1.5 text-right text-slate-400">{fmt(h.old_value)}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-emerald-300">{fmt(h.new_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
