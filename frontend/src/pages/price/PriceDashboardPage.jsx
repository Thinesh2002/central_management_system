import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Edit3, History, ImageOff, Plus, Save, Search, X } from "lucide-react";
import localProductsApi from "../../config/sub_api/product_management_api/local_products_api";
import { getErrorMessage, normalizeList } from "../product_management/products/utils/productSku";
import { useToast } from "../../components/common/toast/ToastProvider";
import { useCanViewCostPrice } from "../../components/common/permissions/PermissionsProvider";
import Loader from "../../components/common/Loader";
import { money, calcProductSelling, calcDaraz } from "../product_management/products/utils/priceCalc";

const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").trim();
const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
const emptyForm = { sku: "", product_sku: "", variant_sku: "", product_name: "", image_url: "", colour_name: "", cost_price: 0, sale_price: 0, local_selling_price: 0, daraz_price: 0, woo_price: 0, packing_percent: 3, profit_percent: 50, daraz_fee_percent: 20, advertising_percent: 10, currency: "LKR", status: "active" };
function clean(v){return String(v??"").trim();}
function fmt(v){return money(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
function sku(r={}){return clean(r.sku||r.variant_sku||r.product_sku||r.local_sku||r.seller_sku||"-");}
function imgUrl(url){const u=clean(url); if(!u) return ""; if(/^https?:\/\//i.test(u)) return u; if(u.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${u}`; if(u.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${u}`; if(u.startsWith("/")) return `${BACKEND_BASE_URL}${u}`; return `${BACKEND_BASE_URL}/${u.replace(/^\/+/,"")}`;}
function productName(p={}){return clean(p.product_name||p.title||p.name||p.product_title||p.model_name||p.product_sku||p.sku||"Product");}
function productSku(p={}){return clean(p.product_sku||p.sku||p.local_sku||p.model_sku||p.item_sku||p.code||"");}
function variantSku(v={}){return clean(v.variant_sku||v.sku||v.child_sku||v.local_sku||v.seller_sku||v.model_sku||"");}
function colourName(v={}){return clean(v.colour_name||v.color_name||v.colour||v.color||v.variant_name||v.name||"");}
function mainImage(row={}){return clean(row.main_image_url||row.image_url||row.product_image_url||row.variant_image_url||row.thumbnail_url||row.image||row.main_image?.image_url||row.main_image?.url||"");}
function normalizeForm(row={}){return {...emptyForm,...row, sku: sku(row)==='-'?'':sku(row), image_url: mainImage(row)||row.image_url||""};}
function flattenCatalog(products=[]){const out=[]; products.forEach((p)=>{const pSku=productSku(p); const base={ product_id:p.id||p.product_id, product_sku:pSku, product_name:productName(p), image_url:mainImage(p), has_variants:Number(p.has_variants||0), raw_product:p}; const variants=Array.isArray(p.variants)?p.variants:[]; if(variants.length){variants.forEach((v)=>{const vSku=variantSku(v); if(!vSku)return; out.push({...base, sku:vSku, variant_sku:vSku, colour_name:colourName(v), image_url:mainImage(v)||base.image_url, label:`${vSku} — ${base.product_name}${colourName(v)?` / ${colourName(v)}`:""}`, is_variant:true, raw_variant:v});});}else if(pSku){out.push({...base, sku:pSku, variant_sku:"", colour_name:"", label:`${pSku} — ${base.product_name}`, is_variant:false});}}); return out;}
function ProductImage({src,name}){const url=imgUrl(src); return <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-[#070b16]">{url?<img src={url} alt={name||"Product"} className="h-full w-full object-cover"/>:<ImageOff size={18} className="text-slate-600"/>}</div>;}

export default function PriceDashboardPage(){
 const showToast=useToast();
 const canViewCostPrice=useCanViewCostPrice();
 const [searchParams]=useSearchParams();
 const [rows,setRows]=useState([]),[catalog,setCatalog]=useState([]),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[search,setSearch]=useState(()=>searchParams.get("search")||""),[modalOpen,setModalOpen]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(emptyForm),[skuSearch,setSkuSearch]=useState(""),[productLoading,setProductLoading]=useState(false),[productMatches,setProductMatches]=useState([]),[selectedProduct,setSelectedProduct]=useState(null);
 const [historyOpen,setHistoryOpen]=useState(false),[historyLoading,setHistoryLoading]=useState(false),[historySku,setHistorySku]=useState(""),[historyRows,setHistoryRows]=useState([]);
 async function openHistory(row){const s=sku(row); setHistorySku(s); setHistoryOpen(true); setHistoryLoading(true); setHistoryRows([]); try{const res=await localProductsApi.getCostHistoryBySku(s); setHistoryRows(normalizeList(res));}catch(e){showToast(getErrorMessage(e,'Unable to load cost history.'),{type:'error'});setHistoryOpen(false);}finally{setHistoryLoading(false);}}
 async function loadCatalog(q=""){setProductLoading(true); try{const res=await localProductsApi.getProducts({limit:200,search:q}); const items=normalizeList(res); const flat=flattenCatalog(items); if(!q)setCatalog(flat); return flat;}catch(e){console.warn("[PRICE_CATALOG_LOAD]",e); return [];}finally{setProductLoading(false);}}
 async function loadPrices(){setLoading(true);try{const [prices]=await Promise.all([localProductsApi.getPrices({limit:500,sort_by:'updated_at',sort_dir:'DESC'}),loadCatalog()]);setRows(normalizeList(prices));}catch(e){alert(getErrorMessage(e,'Unable to load prices.'));}finally{setLoading(false);}}
 useEffect(()=>{loadPrices();},[]);
 const catalogMap=useMemo(()=>{const m=new Map(); catalog.forEach((p)=>m.set(clean(p.sku).toLowerCase(),p)); return m;},[catalog]);
 function meta(row){return catalogMap.get(sku(row).toLowerCase())||{};}
 const filtered=useMemo(()=>{const q=search.toLowerCase().trim(); if(!q)return rows; return rows.filter(r=>[sku(r),r.product_sku,r.variant_sku,r.product_name,meta(r).product_name,meta(r).colour_name,r.currency,r.status].filter(Boolean).join(' ').toLowerCase().includes(q));},[rows,search,catalogMap]);
 const totals=useMemo(()=>filtered.reduce((s,r)=>{s.cost+=money(r.cost_price);s.local+=money(r.local_selling_price||r.sale_price);s.daraz+=money(r.daraz_price);s.woo+=money(r.woo_price);return s;},{cost:0,local:0,daraz:0,woo:0}),[filtered]);
 function resetProductSearch(){setSkuSearch("");setProductMatches([]);setSelectedProduct(null);} function openAdd(){setEditing(null);setForm(emptyForm);resetProductSearch();setModalOpen(true);} function openEdit(row){setEditing(row);const f=normalizeForm(row); const m=meta(row); setForm({...f, product_name:f.product_name||m.product_name||"", image_url:f.image_url||m.image_url||"", colour_name:f.colour_name||m.colour_name||""}); setSelectedProduct(m.sku?m:{sku:f.sku,product_sku:f.product_sku,variant_sku:f.variant_sku,product_name:f.product_name,image_url:f.image_url,colour_name:f.colour_name}); setSkuSearch(f.sku); setProductMatches([]); setModalOpen(true);} const AUTO_CALC_FIELDS=new Set(['cost_price','profit_percent','daraz_fee_percent','advertising_percent','packing_percent']); function setField(n,v){setForm(p=>{const next={...p,[n]:v}; if(AUTO_CALC_FIELDS.has(n)){const productSelling=calcProductSelling(next.cost_price,next.profit_percent).toFixed(2); const daraz=calcDaraz(next.cost_price,next.profit_percent,next.daraz_fee_percent,next.advertising_percent,next.packing_percent).toFixed(2); next.sale_price=productSelling; next.local_selling_price=productSelling; next.daraz_price=daraz; next.woo_price=productSelling;} return next;});}
 async function searchProducts(){const q=clean(skuSearch); if(!q)return alert('First SKU search pannunga.'); const flat=await loadCatalog(q); setProductMatches(flat.filter(x=>[x.sku,x.product_sku,x.product_name,x.colour_name].join(' ').toLowerCase().includes(q.toLowerCase())).slice(0,30));}
 function selectProduct(p){setSelectedProduct(p); setForm(prev=>({...prev, sku:p.sku, product_sku:p.product_sku||p.sku, variant_sku:p.variant_sku||"", product_name:p.product_name||"", image_url:p.image_url||"", colour_name:p.colour_name||""})); setProductMatches([]);}
 function autoCalculate(){const productSelling=calcProductSelling(form.cost_price,form.profit_percent).toFixed(2); const daraz=calcDaraz(form.cost_price,form.profit_percent,form.daraz_fee_percent,form.advertising_percent,form.packing_percent).toFixed(2); setForm(p=>({...p,sale_price:productSelling,local_selling_price:productSelling,daraz_price:daraz,woo_price:productSelling}));}
 const SUGGESTION_FIELD_MAP={local_selling_price:'suggested_sale_price',daraz_price:'suggested_daraz_price',woo_price:'suggested_woo_price'};
 function applySuggestion(fieldName,suggestedValue){setForm(p=>({...p,[fieldName]:suggestedValue, ...(fieldName==='local_selling_price'?{sale_price:suggestedValue}:{})}));}
 async function submit(e){e.preventDefault();const s=clean(form.sku); if(!s)return alert('First SKU search panni product/variant select pannunga.'); const payload={...form, sku:s, product_sku:clean(form.product_sku)||s, variant_sku:clean(form.variant_sku), product_name:clean(form.product_name), image_url:clean(form.image_url), colour_name:clean(form.colour_name), cost_price:money(form.cost_price), sale_price:money(form.sale_price||form.local_selling_price), local_selling_price:money(form.local_selling_price||form.sale_price), daraz_price:money(form.daraz_price), woo_price:money(form.woo_price), packing_percent:money(form.packing_percent), profit_percent:money(form.profit_percent), daraz_fee_percent:money(form.daraz_fee_percent), advertising_percent:money(form.advertising_percent), currency:clean(form.currency)||'LKR'}; setSaving(true); try{const id=editing?.id||editing?.price_id; if(id) await localProductsApi.patchPrice(id,payload); else await localProductsApi.createPrice(payload); setModalOpen(false); showToast('Price saved successfully.'); await loadPrices();}catch(e){alert(getErrorMessage(e,'Unable to save price.'));}finally{setSaving(false);}}
 return (
  <div className="min-h-screen bg-[#070b16] p-3 text-slate-100">
    <div className="mx-auto max-w-[1680px] space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white">
            <Search size={15} className="text-emerald-400" />
            Price Dashboard
          </h3>

          <button onClick={openAdd} type="button" className="flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500">
            <Plus size={13} /> ADD PRICE
          </button>
        </div>

        <div className={`grid gap-2 px-4 py-3 text-center text-xs font-semibold ${canViewCostPrice ? "grid-cols-4" : "grid-cols-3"}`}>
          {[
            ...(canViewCostPrice ? [["Cost", totals.cost, "text-slate-200"]] : []),
            ["Product Selling", totals.local, "text-emerald-300"],
            ["Daraz Selling", totals.daraz, "text-orange-300"],
            ["Woo Selling", totals.woo, "text-cyan-300"],
          ].map(([l, v, c]) => (
            <div key={l} className="border border-slate-800 bg-[#0a101d] px-4 py-2">
              <p className="text-slate-500">{l}</p>
              <p className={`mt-1 ${c}`}>{fmt(v)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 px-4 py-3">
          <label className="flex h-9 w-full max-w-md items-center border border-slate-600 bg-[#2b3441] px-3 focus-within:border-emerald-400">
            <Search size={15} className="text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU, product, colour..." className="h-full flex-1 bg-transparent px-2 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-500" />
          </label>
        </div>
      </section>

      <section className="overflow-hidden border border-slate-800 bg-[#0b1220]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="border-b border-slate-800 bg-[#111827] text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU / Colour</th>
                {canViewCostPrice && <th className="px-4 py-3 text-right">Cost</th>}
                <th className="px-4 py-3 text-right">Product Selling</th>
                <th className="px-4 py-3 text-right">Daraz Selling</th>
                <th className="px-4 py-3 text-right">Woo Price</th>
                <th className="px-4 py-3 text-right">Profit %</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-[#0b1220]">
              {loading ? (
                <tr><td colSpan={canViewCostPrice ? 9 : 8} className="px-4 py-10"><Loader label="Loading prices..." minHeight="0" /></td></tr>
              ) : filtered.length ? (
                filtered.map((r, i) => {
                  const m = meta(r);
                  const name = r.product_name || m.product_name || "Product";
                  return (
                    <tr key={r.id || `${sku(r)}-${i}`} className="hover:bg-[#111827]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage src={r.image_url || m.image_url} name={name} />
                          <div>
                            <p className="font-semibold text-white">{name}</p>
                            <p className="text-xs font-semibold text-slate-500">Product SKU: {r.product_sku || m.product_sku || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{sku(r)}</p>
                        <p className="text-xs text-slate-500">{r.variant_sku || m.variant_sku ? "Variant SKU" : ""} {r.colour_name || m.colour_name ? `/ ${r.colour_name || m.colour_name}` : ""}</p>
                      </td>
                      {canViewCostPrice && <td className="px-4 py-3 text-right font-semibold text-slate-300">{fmt(r.cost_price)}</td>}
                      <td className="px-4 py-3 text-right font-semibold text-emerald-300">{fmt(r.local_selling_price || r.sale_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-300">{fmt(r.daraz_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-cyan-300">{fmt(r.woo_price)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmt(r.profit_percent)}</td>
                      <td className="px-4 py-3 text-slate-400">{r.currency || "LKR"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canViewCostPrice && (
                            <button type="button" onClick={() => openHistory(r)} title="Cost Price History" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-300">
                              <History size={13} />
                            </button>
                          )}
                          <button type="button" onClick={() => openEdit(r)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-emerald-400 hover:text-emerald-300">
                            <Edit3 size={13} /> Modify
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={canViewCostPrice ? 9 : 8} className="px-4 py-16 text-center text-slate-500">No price rows found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    {modalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
        <form onSubmit={submit} className="w-full max-w-5xl rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl">
          <div className="flex items-center justify-between rounded-t-lg border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
            <h2 className="text-[14px] font-semibold text-white">{editing ? "Modify Price" : "Add Price"}</h2>
            <button type="button" onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-md border border-slate-800 bg-[#070b16] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-emerald-300">1. First SKU Search</p>
              <div className="flex gap-2">
                <input value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} placeholder="Enter product SKU or variant SKU" className="h-9 flex-1 rounded-md border border-slate-700 bg-[#020617] px-3 text-[12px] font-semibold outline-none focus:border-emerald-400" />
                <button type="button" onClick={searchProducts} className="h-9 rounded-md bg-emerald-400 px-3 text-[12px] font-semibold text-slate-950">{productLoading ? "Searching..." : "Search"}</button>
              </div>
              {productMatches.length > 0 && (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-800">
                  {productMatches.map((p) => (
                    <button type="button" key={`${p.sku}-${p.product_id}`} onClick={() => selectProduct(p)} className="flex w-full items-center gap-3 border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-800/60">
                      <ProductImage src={p.image_url} name={p.product_name} />
                      <div>
                        <p className="font-semibold text-white">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.is_variant ? "Variant stock/price SKU" : "Single product SKU"} {p.colour_name ? `• Colour: ${p.colour_name}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <ProductImage src={selectedProduct.image_url} name={selectedProduct.product_name} />
                  <div>
                    <p className="font-semibold text-white">Selected: {selectedProduct.product_name}</p>
                    <p className="text-xs font-semibold text-emerald-300">SKU: {selectedProduct.sku} {selectedProduct.colour_name ? `/ Colour: ${selectedProduct.colour_name}` : ""}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ...(canViewCostPrice ? [["cost_price", "2. Cost Price", "number"]] : []),
                ["profit_percent", "Profit %", "number"],
                ["local_selling_price", "Product Selling Price", "number"],
                ["daraz_fee_percent", "Daraz Fee %", "number"],
                ["advertising_percent", "Advertising %", "number"],
                ["packing_percent", "Packing %", "number"],
                ["daraz_price", "Daraz Selling Price", "number"],
                ["woo_price", "Woo Price", "number"],
                ["currency", "Currency", "text"],
              ].map(([n, l, t]) => {
                const suggestedField = SUGGESTION_FIELD_MAP[n];
                const suggestedValue = suggestedField ? form[suggestedField] : null;
                const showSuggestion = suggestedValue !== null && suggestedValue !== undefined && Number(suggestedValue) !== Number(form[n] || 0);
                return (
                  <label key={n} className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">{l}</span>
                    <input type={t} value={form[n] ?? ""} onChange={(e) => setField(n, e.target.value)} className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-semibold text-slate-100 outline-none focus:border-emerald-400" />
                    {showSuggestion && (
                      <button type="button" onClick={() => applySuggestion(n, suggestedValue)} className="flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200">
                        Suggested: {fmt(suggestedValue)} <span className="underline">Apply</span>
                      </button>
                    )}
                  </label>
                );
              })}
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Status</span>
                <select value={form.status || "active"} onChange={(e) => setField("status", e.target.value)} className="h-9 w-full rounded-md border border-slate-700 bg-[#070b16] px-3 text-[12px] font-semibold text-slate-100 outline-none focus:border-emerald-400">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex justify-between gap-2 border-t border-slate-800 px-4 py-3">
            {canViewCostPrice ? (
              <button type="button" onClick={autoCalculate} className="h-8 rounded-md border border-emerald-500/60 px-3 text-[12px] font-semibold text-emerald-300">Auto calculate Selling + Daraz</button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300">Cancel</button>
              <button disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-400 px-3 text-[12px] font-semibold text-slate-950 disabled:opacity-60">
                <Save size={13} /> {saving ? "Saving..." : "Save Price"}
              </button>
            </div>
          </div>
        </form>
      </div>
    )}

    {historyOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={() => setHistoryOpen(false)}>
        <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-white"><History size={15} /> Cost Price History — {historySku}</h2>
            <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            {historyLoading ? (
              <Loader label="Loading cost history..." minHeight="120px" />
            ) : !historyRows.length ? (
              <p className="rounded-md border border-slate-800 bg-[#070b16] px-3 py-6 text-center text-[12px] text-slate-500">
                No cost price changes recorded yet for this SKU. Cost history is logged automatically when goods are received against a purchase order.
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
