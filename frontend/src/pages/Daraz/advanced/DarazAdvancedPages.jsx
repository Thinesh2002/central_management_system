import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, Save, AlertTriangle, CheckCircle, Image as ImageIcon, PackageCheck, Layers, FileClock, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { darazApi, extractApiMessage, formatDateTime, safeJsonParse, extractProductImages } from "../../../services/daraz/darazCentral.service";

const pageSizeOptions = [25, 50, 100, 250];

const money = (value) => Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PageShell({ title, subtitle, actions, children }) {
  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-stone-200 rounded-sm px-4 py-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-stone-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

function Alert({ type = "info", children }) {
  const cls = type === "error" ? "border-red-200 bg-red-50 text-red-700" : type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-cyan-200 bg-cyan-50 text-cyan-800";
  return <div className={`border rounded-sm px-3 py-2 ${cls}`}>{children}</div>;
}

function Toolbar({ filters, setFilters, onRefresh, loading, children }) {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-3 flex flex-col lg:flex-row gap-2 lg:items-end justify-between">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 flex-1">
        <label className="text-xs text-stone-600">Account
          <input className="mt-1 w-full border px-2 py-2 rounded-sm" placeholder="All / BH" value={filters.account_code || ""} onChange={(e) => setFilters({ ...filters, account_code: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600 md:col-span-2">Search
          <div className="mt-1 flex border rounded-sm overflow-hidden"><input className="flex-1 px-2 py-2 outline-none" placeholder="SKU, title, item ID" value={filters.search || ""} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><span className="px-3 py-2 bg-stone-50"><Search size={16} /></span></div>
        </label>
        <label className="text-xs text-stone-600">Rows
          <select className="mt-1 w-full border px-2 py-2 rounded-sm" value={filters.limit || 50} onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}>{pageSizeOptions.map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>
      <div className="flex gap-2">
        {children}
        <button onClick={onRefresh} disabled={loading} className="px-3 py-2 border border-cyan-700 text-cyan-700 rounded-sm hover:bg-cyan-50 flex items-center gap-2"><RefreshCcw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>
    </div>
  );
}

export function DarazAdvancedDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); setError(""); try { setData(await darazApi.advancedDashboard()); } catch (e) { setError(extractApiMessage(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const cards = [
    ["Accounts", data?.accounts?.total_accounts || 0, `${data?.accounts?.needs_attention || 0} need attention`],
    ["Products", data?.products?.total_products || 0, `${data?.products?.active_products || 0} active`],
    ["SKUs", data?.skus?.total_skus || 0, `${data?.skus?.unmapped_skus || 0} unmapped`],
    ["Gross Sales", money(data?.orders?.gross_sales), `${data?.orders?.total_orders || 0} orders`]
  ];
  return <PageShell title="Daraz Seller Central" subtitle="Advanced account, inventory, order and finance control center." actions={<button onClick={load} className="px-3 py-2 bg-cyan-700 text-white rounded-sm">Refresh</button>}>
    {error && <Alert type="error">{error}</Alert>}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{cards.map(([t,v,s]) => <div key={t} className="bg-white border rounded-sm p-4"><p className="text-stone-500">{t}</p><h2 className="text-2xl font-semibold mt-1">{v}</h2><p className="text-xs text-stone-500 mt-1">{s}</p></div>)}</div>
    <div className="bg-white border rounded-sm p-3"><h3 className="font-semibold mb-2">Latest sync activity</h3><table className="w-full text-left"><thead><tr className="border-b text-stone-500"><th>Module</th><th>Account</th><th>Status</th><th>Message</th><th>Started</th></tr></thead><tbody>{(data?.latest_logs || []).map((r) => <tr key={r.id} className="border-b"><td className="py-2">{r.module}</td><td>{r.account_code || "-"}</td><td>{r.status}</td><td>{r.message}</td><td>{formatDateTime(r.started_at || r.created_at)}</td></tr>)}</tbody></table></div>
  </PageShell>;
}

export function DarazManageProducts() {
  const [filters, setFilters] = useState({ page: 1, limit: 50, search: "" });
  const [rows, setRows] = useState([]); const [total, setTotal] = useState(0); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  const load = async () => { setLoading(true); setError(""); try { const res = await darazApi.advancedProducts(filters); setRows(res.rows || []); setTotal(res.total || 0); } catch (e) { setError(extractApiMessage(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const sync = async () => { setLoading(true); setMessage(""); try { await darazApi.advancedSyncProducts(filters.account_code || null); setMessage("Product sync started/completed. Latest data will appear after refresh."); await load(); } catch (e) { setError(extractApiMessage(e)); } finally { setLoading(false); } };
  return <PageShell title="Manage All Daraz Products" subtitle="Account-wise product list with stock, price, images and latest sync status." actions={<button onClick={sync} className="px-3 py-2 bg-[#007185] text-white rounded-sm">Sync Products</button>}>
    {error && <Alert type="error">{error}</Alert>}{message && <Alert type="success">{message}</Alert>}
    <Toolbar filters={filters} setFilters={setFilters} onRefresh={load} loading={loading} />
    <div className="bg-white border rounded-sm overflow-x-auto"><div className="px-3 py-2 border-b font-semibold">1 - {rows.length} of {total}</div><table className="min-w-[1100px] w-full text-left"><thead className="bg-stone-50 text-stone-600"><tr><th className="p-2">Product</th><th>Account</th><th>Item ID</th><th>Status</th><th>SKUs</th><th>Stock</th><th>Price range</th><th>Last sync</th></tr></thead><tbody>{rows.map((p) => { const img = extractProductImages(p)[0]; return <tr key={p.id} className="border-t align-top"><td className="p-2 flex gap-3 min-w-[420px]">{img ? <img src={img} className="w-14 h-14 object-contain border" /> : <div className="w-14 h-14 border flex items-center justify-center"><PackageCheck size={18}/></div>}<div><p className="font-medium text-cyan-700">{p.name || "Untitled product"}</p><p className="text-xs text-stone-500">Brand: {p.brand || "-"}</p></div></td><td>{p.account_code}</td><td>{p.item_id}</td><td>{p.status}</td><td>{p.sku_count}</td><td>{p.total_quantity || 0}</td><td>{money(p.min_price)} - {money(p.max_price)}</td><td>{formatDateTime(p.last_synced_at)}</td></tr>; })}</tbody></table></div>
  </PageShell>;
}

export function DarazManageInventory() {
  const [filters, setFilters] = useState({ page: 1, limit: 50, search: "", mismatch: "" });
  const [rows, setRows] = useState([]); const [total, setTotal] = useState(0); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); setError(""); try { const res = await darazApi.advancedInventory(filters); setRows(res.rows || []); setTotal(res.total || 0); } catch (e) { setError(extractApiMessage(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const saveStock = async (row, value) => { try { await darazApi.updateDarazStock({ account_code: row.account_code, item_id: row.item_id, sku_id: row.sku_id, seller_sku: row.seller_sku, new_stock: Number(value) }); setMessage(`Stock queued for ${row.seller_sku}`); } catch(e) { setError(extractApiMessage(e)); } };
  const saveMapping = async (row) => { const systemSku = prompt("Enter correct system SKU", row.system_sku || ""); if (!systemSku) return; try { await darazApi.saveAdvancedSkuMapping({ account_code: row.account_code, daraz_seller_sku: row.seller_sku, daraz_item_id: row.item_id, daraz_sku_id: row.sku_id, system_sku: systemSku }); setMessage("SKU mapping saved."); load(); } catch(e) { setError(extractApiMessage(e)); } };
  return <PageShell title="Manage All Daraz Inventory" subtitle="Inline Daraz stock change, local inventory match and SKU issue tracking." actions={<button onClick={load} className="px-3 py-2 bg-cyan-700 text-white rounded-sm">Refresh Inventory</button>}>
    {error && <Alert type="error">{error}</Alert>}{message && <Alert type="success">{message}</Alert>}
    <Toolbar filters={filters} setFilters={setFilters} onRefresh={load} loading={loading}><select className="border px-2 py-2" value={filters.mismatch} onChange={(e)=>setFilters({...filters,mismatch:e.target.value})}><option value="">All health</option><option value="missing_system_sku">SKU not mapped</option><option value="stock_mismatch">Stock mismatch</option><option value="price_missing">Cost missing</option></select></Toolbar>
    <div className="bg-white border rounded-sm overflow-x-auto"><div className="px-3 py-2 border-b font-semibold">{rows.length} of {total} inventory rows</div><table className="min-w-[1250px] w-full text-left"><thead className="bg-stone-50 text-stone-600"><tr><th className="p-2">SKU / Product</th><th>Account</th><th>Daraz Stock</th><th>Local Stock</th><th>Price</th><th>Buy Cost</th><th>Health</th><th>Action</th></tr></thead><tbody>{rows.map((r) => <tr key={`${r.account_code}-${r.seller_sku}`} className="border-t align-top"><td className="p-2"><p className="font-semibold text-cyan-700">{r.seller_sku}</p><p className="text-xs text-stone-500">System SKU: {r.system_sku || <span className="text-red-600">Not mapped</span>}</p><p className="text-xs">{r.product_name}</p></td><td>{r.account_code}</td><td><input className="w-20 border px-2 py-1" defaultValue={r.daraz_stock || 0} onBlur={(e)=>saveStock(r,e.target.value)} /></td><td>{r.local_available_stock ?? "-"}</td><td>{money(r.price)}</td><td>{r.buy_price ? money(r.buy_price) : <span className="text-red-600">Missing</span>}</td><td><span className={r.health_status === "healthy" ? "text-emerald-700" : "text-red-700"}>{r.health_status}</span></td><td><button onClick={()=>saveMapping(r)} className="px-2 py-1 border border-cyan-700 text-cyan-700 rounded-sm">Map SKU</button></td></tr>)}</tbody></table></div>
  </PageShell>;
}

export function DarazSkuMappingPage() {
  const [rows, setRows] = useState([]); const [form, setForm] = useState({ account_code: "BH", daraz_seller_sku: "", system_sku: "", notes: "" }); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = async () => { try { const r = await darazApi.getAdvancedSkuMappings({ account_code: form.account_code }); setRows(r.rows || []); } catch(e) { setError(extractApiMessage(e)); } };
  useEffect(()=>{ load(); }, []);
  const save = async () => { setError(""); try { await darazApi.saveAdvancedSkuMapping(form); setMessage("SKU mapping saved."); setForm({...form, daraz_seller_sku:"", system_sku:""}); load(); } catch(e) { setError(extractApiMessage(e)); } };
  return <PageShell title="Daraz SKU Mapping" subtitle="Use this when Daraz seller SKU is wrong or not found in local product system.">
    {error && <Alert type="error">{error}</Alert>}{message && <Alert type="success">{message}</Alert>}
    <div className="bg-white border rounded-sm p-3 grid md:grid-cols-5 gap-2"><input className="border px-2 py-2" placeholder="Account" value={form.account_code} onChange={e=>setForm({...form,account_code:e.target.value})}/><input className="border px-2 py-2 md:col-span-2" placeholder="Daraz wrong SKU" value={form.daraz_seller_sku} onChange={e=>setForm({...form,daraz_seller_sku:e.target.value})}/><input className="border px-2 py-2" placeholder="Correct system SKU" value={form.system_sku} onChange={e=>setForm({...form,system_sku:e.target.value})}/><button onClick={save} className="bg-cyan-700 text-white rounded-sm px-3 py-2 flex items-center justify-center gap-2"><Save size={15}/> Save</button></div>
    <div className="bg-white border rounded-sm overflow-x-auto"><table className="w-full text-left"><thead className="bg-stone-50"><tr><th className="p-2">Account</th><th>Daraz SKU</th><th>System SKU</th><th>Status</th><th>Updated</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.id}><td className="p-2">{r.account_code}</td><td>{r.daraz_seller_sku}</td><td>{r.system_sku || r.correct_sku}</td><td>{r.mapping_status}</td><td>{formatDateTime(r.updated_at)}</td></tr>)}</tbody></table></div>
  </PageShell>;
}

export function DarazCategoryMappingPage() {
  const [rows,setRows]=useState([]); const [form,setForm]=useState({account_code:"BH", local_category_code:"", local_sub_category_code:"", daraz_category_id:"", daraz_category_name:""}); const [error,setError]=useState(""); const [message,setMessage]=useState("");
  const load=async()=>{try{const r=await darazApi.getCategoryMappings({account_code:form.account_code});setRows(r.rows||[])}catch(e){setError(extractApiMessage(e))}}; useEffect(()=>{load()},[]);
  const save=async()=>{try{await darazApi.saveCategoryMapping(form);setMessage("Category mapping saved.");load()}catch(e){setError(extractApiMessage(e))}};
  return <PageShell title="Daraz Category Mapping" subtitle="Map local categories/subcategories with Daraz category IDs and required attributes.">{error&&<Alert type="error">{error}</Alert>}{message&&<Alert type="success">{message}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-6 gap-2"><input className="border p-2" placeholder="Account" value={form.account_code} onChange={e=>setForm({...form,account_code:e.target.value})}/><input className="border p-2" placeholder="Local category" value={form.local_category_code} onChange={e=>setForm({...form,local_category_code:e.target.value})}/><input className="border p-2" placeholder="Local subcategory" value={form.local_sub_category_code} onChange={e=>setForm({...form,local_sub_category_code:e.target.value})}/><input className="border p-2" placeholder="Daraz category ID" value={form.daraz_category_id} onChange={e=>setForm({...form,daraz_category_id:e.target.value})}/><input className="border p-2" placeholder="Daraz category name" value={form.daraz_category_name} onChange={e=>setForm({...form,daraz_category_name:e.target.value})}/><button onClick={save} className="bg-cyan-700 text-white">Save</button></div><div className="bg-white border overflow-x-auto"><table className="w-full text-left"><thead className="bg-stone-50"><tr><th className="p-2">Account</th><th>Local</th><th>Daraz</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.id}><td className="p-2">{r.account_code||"All"}</td><td>{r.local_category_code} / {r.local_sub_category_code}</td><td>{r.daraz_category_id} - {r.daraz_category_name}</td><td>{r.status}</td></tr>)}</tbody></table></div></PageShell>;
}

export function DarazNetSalesPage() {
  const [filters,setFilters]=useState({account_code:"", date_from:"2022-01-01", date_to:""}); const [data,setData]=useState({summary:{},rows:[]}); const [error,setError]=useState("");
  const load=async()=>{try{setData(await darazApi.getAdvancedNetSales(filters))}catch(e){setError(extractApiMessage(e))}}; useEffect(()=>{load()},[]);
  return <PageShell title="Daraz Net Sales" subtitle="Net sales = item sales - Daraz fees/commission - shipping fees - product cost." actions={<button onClick={load} className="px-3 py-2 bg-cyan-700 text-white">Apply</button>}>{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-4 gap-2"><input className="border p-2" placeholder="Account" value={filters.account_code} onChange={e=>setFilters({...filters,account_code:e.target.value})}/><input className="border p-2" type="date" value={filters.date_from} onChange={e=>setFilters({...filters,date_from:e.target.value})}/><input className="border p-2" type="date" value={filters.date_to} onChange={e=>setFilters({...filters,date_to:e.target.value})}/></div><div className="grid md:grid-cols-5 gap-3">{[["Orders",data.summary.orders],["Gross",money(data.summary.gross_sales)],["Fees",money(data.summary.commission)],["Product Cost",money(data.summary.product_cost)],["Net Sales",money(data.summary.estimated_net_sales)]].map(([a,b])=><div className="bg-white border p-3" key={a}><p className="text-stone-500">{a}</p><h2 className="text-xl font-semibold">{b}</h2></div>)}</div><div className="bg-white border p-3 h-80"><ResponsiveContainer><LineChart data={data.rows || []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month_key"/><YAxis/><Tooltip/><Line type="monotone" dataKey="gross_sales"/><Line type="monotone" dataKey="estimated_net_sales"/></LineChart></ResponsiveContainer></div></PageShell>;
}

export function DarazImagesPage(){const[rows,setRows]=useState([]);const[filters,setFilters]=useState({account_code:"",search:"",limit:60});const[error,setError]=useState("");const load=async()=>{try{const r=await darazApi.getAdvancedImages(filters);setRows(r.rows||[])}catch(e){setError(extractApiMessage(e))}};useEffect(()=>{load()},[]);return <PageShell title="Daraz Product Images" subtitle="Image gallery from synced Daraz product data." actions={<button onClick={load} className="px-3 py-2 bg-cyan-700 text-white">Refresh</button>}>{error&&<Alert type="error">{error}</Alert>}<Toolbar filters={filters} setFilters={setFilters} onRefresh={load}/><div className="grid grid-cols-2 md:grid-cols-6 gap-3">{rows.map((r,i)=><div className="bg-white border p-2" key={`${r.item_id}-${i}`}><img src={r.image_url} className="w-full h-32 object-contain"/><p className="text-xs mt-1 truncate">{r.product_name}</p><p className="text-[10px] text-stone-500">{r.account_code} • {r.item_id}</p></div>)}</div></PageShell>}

export function DarazSyncLogsPage(){const[rows,setRows]=useState([]);const[error,setError]=useState("");const load=async()=>{try{const r=await darazApi.getAdvancedSyncLogs();setRows(r.rows||[])}catch(e){setError(extractApiMessage(e))}};useEffect(()=>{load()},[]);return <PageShell title="Daraz Sync Logs" subtitle="Every product/order/category/inventory sync should write a log here." actions={<button onClick={load} className="px-3 py-2 bg-cyan-700 text-white">Refresh</button>}>{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border overflow-x-auto"><table className="w-full text-left"><thead className="bg-stone-50"><tr><th className="p-2">Module</th><th>Type</th><th>Account</th><th>Status</th><th>Products</th><th>Orders</th><th>Message</th><th>Time</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-2">{r.module}</td><td>{r.sync_type}</td><td>{r.account_code}</td><td>{r.status}</td><td>{r.synced_products}/{r.total_products}</td><td>{r.synced_orders}/{r.total_orders}</td><td>{r.message}</td><td>{formatDateTime(r.created_at)}</td></tr>)}</tbody></table></div></PageShell>}

export function DarazPackRulesPage(){const[rows,setRows]=useState([]);const[form,setForm]=useState({pack_size:"",pack_code:"",pack_label:"",sku_suffix:""});const[message,setMessage]=useState("");const[error,setError]=useState("");const load=async()=>{try{const r=await darazApi.getPackRules();setRows(r.rows||[])}catch(e){setError(extractApiMessage(e))}};useEffect(()=>{load()},[]);const save=async()=>{try{await darazApi.savePackRule(form);setMessage("Pack rule saved.");setForm({pack_size:"",pack_code:"",pack_label:"",sku_suffix:""});load()}catch(e){setError(extractApiMessage(e))}};return <PageShell title="Pack Rules" subtitle="Map pack quantities to SKU suffixes. Example: 2 pack → 2PK, 3 pack → 3PK.">{error&&<Alert type="error">{error}</Alert>}{message&&<Alert type="success">{message}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-5 gap-2"><input className="border p-2" placeholder="Pack size" value={form.pack_size} onChange={e=>setForm({...form,pack_size:e.target.value})}/><input className="border p-2" placeholder="Code 2PK" value={form.pack_code} onChange={e=>setForm({...form,pack_code:e.target.value})}/><input className="border p-2" placeholder="Label" value={form.pack_label} onChange={e=>setForm({...form,pack_label:e.target.value})}/><input className="border p-2" placeholder="SKU suffix" value={form.sku_suffix} onChange={e=>setForm({...form,sku_suffix:e.target.value})}/><button className="bg-cyan-700 text-white" onClick={save}>Save</button></div><div className="bg-white border"><table className="w-full text-left"><thead className="bg-stone-50"><tr><th className="p-2">Size</th><th>Code</th><th>Label</th><th>SKU suffix</th><th>Multiplier</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.id}><td className="p-2">{r.pack_size}</td><td>{r.pack_code}</td><td>{r.pack_label}</td><td>{r.sku_suffix}</td><td>{r.multiplier}</td></tr>)}</tbody></table></div></PageShell>}

export function DarazBusinessReportsPage(){const[data,setData]=useState({trend:[],summary:{}});const[error,setError]=useState("");const load=async()=>{try{const r=await darazApi.getBusinessReports();setData(r.data||{trend:[],summary:{}})}catch(e){setError(extractApiMessage(e))}};useEffect(()=>{load()},[]);return <PageShell title="Business Reports & Trend Analysis" subtitle="Monthly order, sales, fee and net-sales trend." actions={<button onClick={load} className="px-3 py-2 bg-cyan-700 text-white">Refresh</button>}>{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border p-3 h-80"><ResponsiveContainer><BarChart data={data.trend||[]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month_key"/><YAxis/><Tooltip/><Bar dataKey="orders"/><Bar dataKey="estimated_net_sales"/></BarChart></ResponsiveContainer></div></PageShell>}
