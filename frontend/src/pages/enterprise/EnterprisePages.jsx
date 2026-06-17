import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle, Edit3, Eye, Image as ImageIcon, PackagePlus, RefreshCcw, Save, Search, Settings, Star, Trash2, X } from "lucide-react";
import { enterpriseApi, extractError } from "../../services/enterprise/enterprise.service";

const money = (v) => Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusText = {
  healthy: "Healthy",
  low_stock: "Low stock",
  stock_mismatch: "Stock mismatch",
  sku_not_mapped: "SKU not mapped",
  sku_not_in_system: "SKU not in system",
  cost_missing: "Cost missing",
};

function Loader() { return <div className="py-10"><span className="loader" /></div>; }
function Alert({ type = "info", children }) {
  const cls = type === "error" ? "border-red-300 bg-red-50 text-red-700" : type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-cyan-300 bg-cyan-50 text-cyan-800";
  return <div className={`border px-3 py-2 text-sm rounded-sm ${cls}`}>{children}</div>;
}
function Page({ title, subtitle, actions, children }) {
  return <div className="space-y-3 text-[13px] text-slate-900">
    <div className="bg-white border-b border-stone-200 px-3 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="text-stone-500 mt-1">{subtitle}</p>}</div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
    {children}
  </div>;
}
function SellerTabs({ active = "inventory" }) {
  const tabs = [
    ["inventory", "Manage All Inventory", "/manage-all-inventory"],
    ["orders", "Manage Orders", "/daraz/orders"],
    ["products", "Create Products", "/system/products"],
    ["sku", "SKU Mapping", "/daraz/sku-mapping"],
    ["categories", "Category Mapping", "/daraz/category-mapping"],
    ["reports", "Business Reports", "/daraz/business-reports"],
  ];
  return <div className="bg-white border-b border-stone-200 flex overflow-x-auto text-sm">
    {tabs.map(([key, label, path]) => <button key={key} onClick={() => { window.location.href = path; }} className={`px-4 py-3 whitespace-nowrap border-b-2 ${active === key ? "border-[#007185] text-[#007185] font-semibold" : "border-transparent text-slate-600 hover:text-[#007185]"}`}>{label}</button>)}
  </div>;
}
function ImageModal({ url, onClose }) {
  if (!url) return null;
  return <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-sm p-3 max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-end mb-2"><button onClick={onClose} className="border px-2 py-1"><X size={16} /></button></div>
      <img src={url} className="max-h-[75vh] max-w-full object-contain" />
    </div>
  </div>;
}
function StockBox({ row, onSaved }) {
  const current = row.channel === "local" ? row.local_available_stock : row.channel_stock;
  const [value, setValue] = useState(current ?? 0);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(current ?? 0), [current]);
  const save = async () => {
    if (String(value) === String(current ?? 0)) return;
    setSaving(true);
    try {
      await enterpriseApi.updateStock({ channel: row.channel, account_code: row.account_code, sku: row.system_sku || row.sku, channel_sku: row.sku, seller_sku: row.sku, new_stock: Number(value) });
      onSaved?.(`${row.channel.toUpperCase()} stock saved for ${row.sku}. ${row.channel === "local" ? "Local inventory updated." : "Marketplace update queued."}`, "success");
    } catch (e) { onSaved?.(extractError(e), "error"); }
    finally { setSaving(false); }
  };
  return <input className={`w-20 border rounded-sm px-2 py-1 text-right ${saving ? "bg-yellow-50" : "bg-white"}`} value={value ?? 0} onChange={(e) => setValue(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}
function MappingBox({ row, onSaved }) {
  const [sku, setSku] = useState(row.system_sku || "");
  const save = async () => {
    if (!sku.trim()) return onSaved?.("Enter correct system SKU before saving mapping.", "error");
    try { await enterpriseApi.saveMapping({ channel: row.channel, account_code: row.account_code, channel_sku: row.sku, daraz_seller_sku: row.sku, system_sku: sku.trim(), notes: "Mapped from seller central UI" }); onSaved?.(`SKU mapped: ${row.sku} → ${sku}`, "success"); }
    catch (e) { onSaved?.(extractError(e), "error"); }
  };
  if (row.channel === "local") return <span className="text-xs text-stone-400">Local SKU</span>;
  return <div className="flex gap-1 w-56"><input className="border px-2 py-1 rounded-sm w-full" placeholder="Correct system SKU" value={sku} onChange={(e) => setSku(e.target.value)} /><button onClick={save} className="border border-[#007185] text-[#007185] px-2"><Save size={14} /></button></div>;
}
function ProductForm({ onDone }) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState({ categories: [], sub_categories: [] });
  const [packs, setPacks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ product_type: "parent", brand_prefix: "LS", sub_category_code: "CY", model_code: "001", colour_code: "BM", pack_size: 1, sku: "", parent_sku: "", product_name: "", brand: "", buy_price: "", selling_price: "", stock: "0", main_image: "" });
  useEffect(() => { enterpriseApi.categories().then(setCats).catch(() => null); enterpriseApi.packRules().then((r) => setPacks(r.rows || [])).catch(() => null); }, []);
  useEffect(() => {
    enterpriseApi.generateSku(form).then((r) => { if (!form.sku) setForm((f) => ({ ...f, sku_preview: r.data?.sku || "" })); }).catch(() => null);
  }, [form.brand_prefix, form.sub_category_code, form.model_code, form.colour_code, form.pack_size]);
  const save = async () => {
    setErr(""); setMsg(""); setSaving(true);
    try {
      await enterpriseApi.saveProduct({ ...form, sku: form.sku || form.sku_preview, parent_sku: form.product_type === "child" ? form.parent_sku : (form.parent_sku || form.sku || form.sku_preview) });
      setMsg("Product saved. Stock and SKU are ready for channel mapping.");
      onDone?.();
    } catch (e) { setErr(extractError(e)); }
    finally { setSaving(false); }
  };
  return <div className="bg-white border border-stone-200 rounded-sm">
    <button onClick={() => setOpen(!open)} className="w-full p-3 flex items-center justify-between"><span className="font-semibold flex gap-2"><PackagePlus size={17}/> Add product / parent-child SKU</span><span className="text-[#007185]">{open ? "Close" : "Open"}</span></button>
    {open && <div className="border-t p-3 space-y-3">
      {err && <Alert type="error">{err}</Alert>}{msg && <Alert type="success">{msg}</Alert>}
      <div className="grid md:grid-cols-6 gap-2">
        <select className="border p-2" value={form.product_type} onChange={(e)=>setForm({...form,product_type:e.target.value})}><option value="parent">Parent product</option><option value="child">Child variation</option></select>
        <input className="border p-2" placeholder="Prefix LS" value={form.brand_prefix} onChange={(e)=>setForm({...form,brand_prefix:e.target.value})}/>
        <select className="border p-2" value={form.sub_category_code} onChange={(e)=>setForm({...form,sub_category_code:e.target.value})}>{(cats.sub_categories||[]).map(c=><option key={c.sub_category_code} value={c.sub_category_code}>{c.sub_category_code} - {c.sub_category_name}</option>)}<option value={form.sub_category_code}>{form.sub_category_code}</option></select>
        <input className="border p-2" placeholder="Model 001" value={form.model_code} onChange={(e)=>setForm({...form,model_code:e.target.value})}/>
        <input className="border p-2" placeholder="Colour BM" value={form.colour_code} onChange={(e)=>setForm({...form,colour_code:e.target.value})}/>
        <select className="border p-2" value={form.pack_size} onChange={(e)=>setForm({...form,pack_size:e.target.value})}>{packs.map(p=><option value={p.pack_size} key={p.id}>{p.pack_code} - {p.pack_label}</option>)}</select>
        <input className="border p-2" placeholder="SKU override optional" value={form.sku} onChange={(e)=>setForm({...form,sku:e.target.value})}/>
        <input className="border p-2" placeholder="Parent SKU for child" value={form.parent_sku} onChange={(e)=>setForm({...form,parent_sku:e.target.value})}/>
        <input className="border p-2 md:col-span-2" placeholder="Product title/name" value={form.product_name} onChange={(e)=>setForm({...form,product_name:e.target.value})}/>
        <input className="border p-2" placeholder="Buy price" value={form.buy_price} onChange={(e)=>setForm({...form,buy_price:e.target.value})}/>
        <input className="border p-2" placeholder="Selling price" value={form.selling_price} onChange={(e)=>setForm({...form,selling_price:e.target.value})}/>
        <input className="border p-2" placeholder="Opening stock" value={form.stock} onChange={(e)=>setForm({...form,stock:e.target.value})}/>
        <input className="border p-2 md:col-span-4" placeholder="Main image URL" value={form.main_image} onChange={(e)=>setForm({...form,main_image:e.target.value})}/>
        <div className="border bg-stone-50 p-2 text-xs">Generated SKU: <b>{form.sku || form.sku_preview || "-"}</b></div>
        <button disabled={saving} onClick={save} className="bg-[#ffce00] hover:bg-[#f7c600] font-semibold px-4 py-2">{saving ? "Saving..." : "Save product"}</button>
      </div>
    </div>}
  </div>;
}

export function ManageAllInventoryAmazon() {
  const [rows, setRows] = useState([]), [total, setTotal] = useState(0), [loading, setLoading] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(""), [image, setImage] = useState(null);
  const [filters, setFilters] = useState({ channel: "all", search: "", account_code: "", health: "", limit: 250 });
  const notify = (txt, type="success") => { if(type==="error"){setError(txt);setMessage("")} else {setMessage(txt);setError("")} };
  const load = async () => { setLoading(true); setError(""); try { await enterpriseApi.bootstrap(); const res = await enterpriseApi.products(filters); setRows(res.rows); setTotal(res.total); } catch(e){ setError(extractError(e)); } finally { setLoading(false); } };
  useEffect(()=>{ load(); }, []);
  const counts = useMemo(()=> rows.reduce((a,r)=>{a[r.health_status]=(a[r.health_status]||0)+1; return a},{}),[rows]);
  return <Page title="Manage All Inventory" subtitle="System, Daraz and WooCommerce inventory with inline stock update, SKU mapping and product actions." actions={<><button onClick={load} className="border border-[#007185] px-3 py-2 text-[#007185] flex gap-2"><RefreshCcw size={15}/>Refresh</button><button onClick={()=>window.location.href='/system/products'} className="bg-[#232f3e] text-white px-3 py-2">Add a product</button></>}>
    <SellerTabs active="inventory" />
    {message && <Alert type="success">{message}</Alert>}{error && <Alert type="error">{error}</Alert>}
    <ProductForm onDone={load}/>
    <div className="bg-white border border-stone-200">
      <div className="p-3 grid lg:grid-cols-12 gap-2 border-b bg-stone-50">
        <select className="border p-2 lg:col-span-1" value={filters.channel} onChange={(e)=>setFilters({...filters,channel:e.target.value})}><option value="all">All</option><option value="local">System</option><option value="daraz">Daraz</option><option value="woo">Woo</option></select>
        <input className="border p-2 lg:col-span-4" placeholder="Search SKU, title, FNSKU, item ID" value={filters.search} onChange={(e)=>setFilters({...filters,search:e.target.value})}/>
        <input className="border p-2 lg:col-span-2" placeholder="Account" value={filters.account_code} onChange={(e)=>setFilters({...filters,account_code:e.target.value})}/>
        <select className="border p-2 lg:col-span-2" value={filters.health} onChange={(e)=>setFilters({...filters,health:e.target.value})}><option value="">All health</option>{Object.entries(statusText).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select>
        <button onClick={load} className="border border-[#007185] text-[#007185] lg:col-span-1"><Search size={16} className="mx-auto"/></button>
        <button className="border border-[#007185] text-[#007185] lg:col-span-1 flex items-center justify-center"><Settings size={16}/></button>
      </div>
      <div className="px-3 py-2 border-b text-sm flex flex-wrap gap-3"><b>1 - {Math.min(rows.length, Number(filters.limit))} of {total}</b><span>SKU not mapped: {counts.sku_not_mapped||0}</span><span>Stock mismatch: {counts.stock_mismatch||0}</span><span>Cost missing: {counts.cost_missing||0}</span></div>
      {loading ? <Loader/> : <div className="overflow-x-auto"><table className="w-full text-left min-w-[1450px]"><thead className="bg-white border-b"><tr><th className="p-2 w-8"><input type="checkbox"/></th><th className="p-2">Listing status<br/><span className="font-normal text-stone-500">Next step</span></th><th className="p-2">Product details<br/><span className="font-normal text-stone-500">Image, title and SKU</span></th><th className="p-2">Performance<br/><span className="font-normal text-stone-500">Last 30 days</span></th><th className="p-2">Inventory<br/><span className="font-normal text-stone-500">System and channel stock</span></th><th className="p-2">Price + Cost<br/><span className="font-normal text-stone-500">Net sales base</span></th><th className="p-2">SKU Mapping</th><th className="p-2">Actions</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.channel}-${r.account_code}-${r.sku}-${i}`} className="border-b align-top hover:bg-cyan-50/20"><td className="p-2"><input type="checkbox"/></td><td className="p-2"><div className="flex gap-2"><Star size={16} className="text-stone-400"/><div><b className="capitalize">{r.status || 'Active'}</b><br/><span className={`text-xs ${r.health_status==='healthy'?'text-emerald-700':'text-red-600'}`}>{statusText[r.health_status] || r.health_status}</span><br/><span className="text-xs text-stone-500">{r.channel}{r.account_code?` • ${r.account_code}`:""}</span></div></div></td><td className="p-2"><div className="flex gap-3"><div className="w-16 h-16 border bg-white flex items-center justify-center cursor-pointer" onClick={()=>setImage(r.image_url)}>{r.image_url?<img src={r.image_url} className="max-w-full max-h-full object-contain"/>:<ImageIcon size={18} className="text-stone-400"/>}</div><div className="max-w-md"><button className="text-[#007185] text-left font-medium hover:underline">{r.product_name || r.sku}</button><div className="grid grid-cols-[70px_1fr] text-xs mt-2 gap-y-1"><span>SKU</span><span className="text-[#007185] break-all">{r.sku}</span><span>Parent</span><span>{r.parent_sku || '-'}</span><span>Item ID</span><span>{r.item_id || '-'}</span><span>Pack</span><span>{r.pack_code || '-'}</span></div></div></div></td><td className="p-2 text-xs"><b>Sales</b><br/>Units sold --<br/>Page views --<br/>Sales rank --</td><td className="p-2 text-xs"><b>System stock</b> <StockBox row={{...r,channel:'local',sku:r.system_sku || r.sku,local_available_stock:r.local_available_stock}} onSaved={notify}/><br/><span>Reserved {r.reserved_stock||0}</span><br/><b className="mt-2 inline-block">{r.channel.toUpperCase()} stock</b> <StockBox row={r} onSaved={notify}/></td><td className="p-2 text-xs"><b>Price</b> {money(r.price)}<br/><b>Buy cost</b> {money(r.buy_price)}<br/><span className={Number(r.buy_price||0)===0?'text-red-600':'text-emerald-700'}>{Number(r.buy_price||0)===0?'Product cost missing':'Cost available'}</span></td><td className="p-2"><MappingBox row={r} onSaved={notify}/></td><td className="p-2"><div className="flex flex-col gap-1"><button onClick={()=>enterpriseApi.deactivateProduct(r.sku).then(()=>{notify('Product deactivated');load()}).catch(e=>notify(extractError(e),'error'))} className="border px-2 py-1">Deactivate</button><button onClick={()=>enterpriseApi.deleteProduct(r.sku,false).then(()=>{notify('Product removed from active list');load()}).catch(e=>notify(extractError(e),'error'))} className="border px-2 py-1 text-red-600">Delete</button></div></td></tr>)}</tbody></table></div>}
    </div><ImageModal url={image} onClose={()=>setImage(null)}/>
  </Page>;
}

export function LocalCategoryManager() {
  const [data,setData]=useState({categories:[],sub_categories:[]}), [message,setMessage]=useState(''), [error,setError]=useState('');
  const [cat,setCat]=useState({category_code:'',category_name:'',image_url:''}); const [sub,setSub]=useState({category_code:'',sub_category_code:'',sub_category_name:'',image_url:''});
  const load=()=>enterpriseApi.categories().then(setData).catch(e=>setError(extractError(e))); useEffect(()=>{load()},[]);
  const saveCat=()=>enterpriseApi.saveCategory(cat).then(()=>{setMessage('Category saved');setCat({category_code:'',category_name:'',image_url:''});load()}).catch(e=>setError(extractError(e)));
  const saveSub=()=>enterpriseApi.saveSubCategory(sub).then(()=>{setMessage('Sub category saved');setSub({category_code:'',sub_category_code:'',sub_category_name:'',image_url:''});load()}).catch(e=>setError(extractError(e)));
  return <Page title="Local Category & Image Manager" subtitle="Create local categories/sub-categories and attach images for product creation." actions={<button onClick={load} className="border px-3 py-2">Refresh</button>}><SellerTabs active="categories" />{message&&<Alert type="success">{message}</Alert>}{error&&<Alert type="error">{error}</Alert>}<div className="grid lg:grid-cols-2 gap-3"><div className="bg-white border p-3 space-y-2"><h3 className="font-semibold">Add main category</h3><input className="border p-2 w-full" placeholder="Category code e.g. LS" value={cat.category_code} onChange={e=>setCat({...cat,category_code:e.target.value})}/><input className="border p-2 w-full" placeholder="Category name" value={cat.category_name} onChange={e=>setCat({...cat,category_name:e.target.value})}/><input className="border p-2 w-full" placeholder="Category image URL" value={cat.image_url} onChange={e=>setCat({...cat,image_url:e.target.value})}/><button onClick={saveCat} className="bg-[#ffce00] px-4 py-2 font-semibold">Save category</button></div><div className="bg-white border p-3 space-y-2"><h3 className="font-semibold">Add sub category</h3><select className="border p-2 w-full" value={sub.category_code} onChange={e=>setSub({...sub,category_code:e.target.value})}><option value="">Select main category</option>{data.categories.map(c=><option key={c.category_code} value={c.category_code}>{c.category_code} - {c.category_name}</option>)}</select><input className="border p-2 w-full" placeholder="Sub code e.g. CY" value={sub.sub_category_code} onChange={e=>setSub({...sub,sub_category_code:e.target.value})}/><input className="border p-2 w-full" placeholder="Sub category name" value={sub.sub_category_name} onChange={e=>setSub({...sub,sub_category_name:e.target.value})}/><input className="border p-2 w-full" placeholder="Sub category image URL" value={sub.image_url} onChange={e=>setSub({...sub,image_url:e.target.value})}/><button onClick={saveSub} className="bg-[#ffce00] px-4 py-2 font-semibold">Save sub category</button></div></div><div className="grid lg:grid-cols-2 gap-3"><DataTable title="Categories" rows={data.categories}/><DataTable title="Sub categories" rows={data.sub_categories}/></div></Page>
}
function DataTable({title,rows}){return <div className="bg-white border overflow-x-auto"><h3 className="p-3 font-semibold border-b">{title}</h3><table className="w-full text-left"><tbody>{rows.map((r,i)=><tr className="border-b" key={i}><td className="p-2">{r.image_url&&<img src={r.image_url} className="w-10 h-10 object-contain"/>}</td><td className="p-2 font-semibold">{r.category_code||r.sub_category_code}</td><td>{r.category_name||r.sub_category_name}</td><td>{r.is_active?'Active':'Inactive'}</td></tr>)}</tbody></table></div>}

export function SkuMappingManager(){const[rows,setRows]=useState([]),[form,setForm]=useState({channel:'daraz',account_code:'BH',channel_sku:'',system_sku:'',notes:''}),[message,setMessage]=useState(''),[error,setError]=useState('');const load=()=>enterpriseApi.mappings().then(r=>setRows(r.rows)).catch(e=>setError(extractError(e)));useEffect(()=>{load()},[]);const save=()=>enterpriseApi.saveMapping(form).then(()=>{setMessage('SKU mapping saved');setForm({...form,channel_sku:'',system_sku:'',notes:''});load()}).catch(e=>setError(extractError(e)));return <Page title="SKU Mapping" subtitle="Map wrong marketplace SKU to the correct local system SKU."><SellerTabs active="sku" />{message&&<Alert type="success">{message}</Alert>}{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-6 gap-2"><select className="border p-2" value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}><option value="daraz">Daraz</option><option value="woo">WooCommerce</option></select><input className="border p-2" placeholder="Account" value={form.account_code} onChange={e=>setForm({...form,account_code:e.target.value})}/><input className="border p-2" placeholder="Wrong/channel SKU" value={form.channel_sku} onChange={e=>setForm({...form,channel_sku:e.target.value})}/><input className="border p-2" placeholder="Correct system SKU" value={form.system_sku} onChange={e=>setForm({...form,system_sku:e.target.value})}/><input className="border p-2" placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><button onClick={save} className="bg-[#ffce00] font-semibold">Save mapping</button></div><div className="bg-white border"><table className="w-full text-left"><thead className="bg-stone-50"><tr><th className="p-2">Channel</th><th>Account</th><th>Channel SKU</th><th>System SKU</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.id}><td className="p-2">{r.channel}</td><td>{r.account_code}</td><td>{r.channel_sku}</td><td>{r.system_sku}</td><td>{r.mapping_status}</td></tr>)}</tbody></table></div></Page>}

export function CategoryMappingManager(){const[rows,setRows]=useState([]),[form,setForm]=useState({channel:'daraz',account_code:'BH',local_category_code:'',local_sub_category_code:'',channel_category_id:'',channel_category_name:''}),[message,setMessage]=useState(''),[error,setError]=useState('');const load=()=>enterpriseApi.categoryMappings().then(r=>setRows(r.rows)).catch(e=>setError(extractError(e)));useEffect(()=>{load()},[]);const save=()=>enterpriseApi.saveCategoryMapping(form).then(()=>{setMessage('Category mapping saved');load()}).catch(e=>setError(extractError(e)));return <Page title="Category Mapping" subtitle="Map local product category to Daraz/Woo category before listing transfer."><SellerTabs active="categories" />{message&&<Alert type="success">{message}</Alert>}{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-7 gap-2">{['channel','account_code','local_category_code','local_sub_category_code','channel_category_id','channel_category_name'].map(k=><input key={k} className="border p-2" placeholder={k.replaceAll('_',' ')} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<button onClick={save} className="bg-[#ffce00] font-semibold">Save</button></div><div className="bg-white border"><table className="w-full text-left"><tbody>{rows.map(r=><tr className="border-b" key={r.id}><td className="p-2">{r.channel}</td><td>{r.account_code}</td><td>{r.local_category_code}/{r.local_sub_category_code}</td><td>{r.channel_category_id} - {r.channel_category_name}</td><td>{r.status}</td></tr>)}</tbody></table></div></Page>}

export function OrdersAmazonPage(){const[rows,setRows]=useState([]),[filters,setFilters]=useState({date_from:'2022-01-01',account_code:'',search:'',status:''}),[loading,setLoading]=useState(false),[error,setError]=useState(''),[image,setImage]=useState(null);const load=()=>{setLoading(true);enterpriseApi.orders(filters).then(r=>setRows(r.rows)).catch(e=>setError(extractError(e))).finally(()=>setLoading(false))};useEffect(()=>{load()},[]);const upd=(r,status)=>enterpriseApi.updateOrderStatus({order_id:r.order_id,order_item_id:r.order_item_id,status}).then(load).catch(e=>setError(extractError(e)));return <Page title="Manage Orders" subtitle="Daraz orders from 2022 onwards with images, customer, tracking and status update." actions={<button onClick={load} className="border px-3 py-2">Refresh</button>}><SellerTabs active="orders" />{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-6 gap-2"><input className="border p-2" type="date" value={filters.date_from} onChange={e=>setFilters({...filters,date_from:e.target.value})}/><input className="border p-2" placeholder="Account" value={filters.account_code} onChange={e=>setFilters({...filters,account_code:e.target.value})}/><input className="border p-2 md:col-span-2" placeholder="Search order, customer, SKU" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/><input className="border p-2" placeholder="Status" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}/><button onClick={load} className="bg-[#232f3e] text-white">Search</button></div>{loading?<Loader/>:<div className="bg-white border overflow-x-auto"><table className="w-full text-left min-w-[1200px]"><thead className="bg-stone-50"><tr><th className="p-2">Order date</th><th>Order details</th><th>Image</th><th>Product</th><th>Customer</th><th>Status</th><th>Tracking</th><th>Action</th></tr></thead><tbody>{rows.map((r,i)=><tr className="border-t align-top" key={`${r.order_id}-${i}`}><td className="p-2">{String(r.daraz_created_at||r.created_at||'').slice(0,16)}</td><td><b className="text-[#007185]">{r.order_id}</b><br/>Account: {r.account_code}<br/>Total: {money(r.order_total||r.paid_price)}</td><td>{r.image_url&&<img onClick={()=>setImage(r.image_url)} src={r.image_url} className="w-14 h-14 object-contain cursor-pointer"/>}</td><td>{r.item_name||r.product_name}<br/><span className="text-xs">SKU: {r.seller_sku}</span></td><td>{r.customer_first_name} {r.customer_last_name}<br/>{r.customer_phone}</td><td><span className="bg-red-100 text-red-700 px-2 py-1 rounded-sm text-xs">{r.item_status||r.order_status}</span></td><td>{r.item_tracking_code||r.tracking_code||'-'}<br/>{r.item_shipping_provider||r.shipping_provider}</td><td><div className="flex flex-col gap-1"><button onClick={()=>upd(r,'packed')} className="bg-[#ffce00] px-2 py-1">Packed</button><button onClick={()=>upd(r,'shipped')} className="bg-[#ffce00] px-2 py-1">Shipped</button><button onClick={()=>upd(r,'delivered')} className="border px-2 py-1">Delivered</button></div></td></tr>)}</tbody></table></div>}<ImageModal url={image} onClose={()=>setImage(null)}/></Page>}

export function FinanceReportsPage(){const[data,setData]=useState({summary:{},rows:[]}),[error,setError]=useState(''),[filters,setFilters]=useState({date_from:'2022-01-01'});const load=()=>enterpriseApi.finance(filters).then(setData).catch(e=>setError(extractError(e)));useEffect(()=>{load()},[]);return <Page title="Net Sales Dashboard" subtitle="Gross sales, Daraz fees, shipping, product cost and estimated net sales." actions={<button onClick={load} className="border px-3 py-2">Refresh</button>}><SellerTabs active="reports" />{error&&<Alert type="error">{error}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-4 gap-2"><input className="border p-2" type="date" value={filters.date_from} onChange={e=>setFilters({...filters,date_from:e.target.value})}/><button className="bg-[#232f3e] text-white" onClick={load}>Apply</button></div><div className="grid md:grid-cols-5 gap-3">{[['Orders',data.summary.orders],['Gross',money(data.summary.gross_sales)],['Fees',money(data.summary.commission)],['Cost',money(data.summary.product_cost)],['Net Sales',money(data.summary.estimated_net_sales)]].map(([a,b])=><div className="bg-white border p-3" key={a}><p className="text-stone-500">{a}</p><h2 className="text-xl font-semibold">{b}</h2></div>)}</div><div className="bg-white border p-3 h-80"><ResponsiveContainer><LineChart data={data.rows||[]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month_key"/><YAxis/><Tooltip/><Line type="monotone" dataKey="gross_sales"/><Line type="monotone" dataKey="estimated_net_sales"/></LineChart></ResponsiveContainer></div></Page>}

export function PackRulesPage(){const[rows,setRows]=useState([]),[form,setForm]=useState({pack_size:'',pack_code:'',pack_label:'',sku_suffix:''}),[msg,setMsg]=useState(''),[err,setErr]=useState('');const load=()=>enterpriseApi.packRules().then(r=>setRows(r.rows)).catch(e=>setErr(extractError(e)));useEffect(()=>{load()},[]);const save=()=>enterpriseApi.savePackRule(form).then(()=>{setMsg('Pack rule saved');load()}).catch(e=>setErr(extractError(e)));return <Page title="Pack Rules" subtitle="2 pack = 2PK, 3 pack = 3PK, 4 pack = 4PK, 5 pack = 5PK, 10 pack = 10PK.">{msg&&<Alert type="success">{msg}</Alert>}{err&&<Alert type="error">{err}</Alert>}<div className="bg-white border p-3 grid md:grid-cols-5 gap-2">{['pack_size','pack_code','pack_label','sku_suffix'].map(k=><input className="border p-2" key={k} placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>) }<button onClick={save} className="bg-[#ffce00] font-semibold">Save</button></div><div className="bg-white border"><table className="w-full text-left"><tbody>{rows.map(r=><tr className="border-b" key={r.id}><td className="p-2">{r.pack_size}</td><td>{r.pack_code}</td><td>{r.pack_label}</td><td>{r.sku_suffix}</td><td>{r.multiplier}</td></tr>)}</tbody></table></div></Page>}

export function ImagesDashboard(){const[rows,setRows]=useState([]),[image,setImage]=useState(null),[err,setErr]=useState('');const load=()=>enterpriseApi.images({limit:500}).then(r=>setRows(r.rows)).catch(e=>setErr(extractError(e)));useEffect(()=>{load()},[]);return <Page title="Product Images Dashboard" subtitle="Click any image to preview. Old images can be replaced from product edit/create page." actions={<button onClick={load} className="border px-3 py-2">Refresh</button>}>{err&&<Alert type="error">{err}</Alert>}<div className="grid grid-cols-2 md:grid-cols-6 gap-3">{rows.map((r,i)=><div className="bg-white border p-2" key={i}><img src={r.image_url} onClick={()=>setImage(r.image_url)} className="w-full h-32 object-contain cursor-pointer"/><p className="text-xs truncate mt-1">{r.product_name}</p><p className="text-[11px] text-stone-500">{r.channel} • {r.sku}</p></div>)}</div><ImageModal url={image} onClose={()=>setImage(null)}/></Page>}

export function LogsPage(){const[rows,setRows]=useState([]);useEffect(()=>{enterpriseApi.logs().then(r=>setRows(r.rows)).catch(()=>null)},[]);return <Page title="System Sync & Action Logs" subtitle="Every stock, SKU mapping, product and order action is recorded here."><div className="bg-white border overflow-x-auto"><table className="w-full text-left"><thead className="bg-stone-50"><tr><th className="p-2">Time</th><th>Module</th><th>Action</th><th>Channel</th><th>Reference</th><th>Status</th><th>Message</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.id}><td className="p-2">{String(r.created_at).slice(0,19)}</td><td>{r.module}</td><td>{r.action}</td><td>{r.channel}</td><td>{r.reference_id}</td><td>{r.status}</td><td>{r.message}</td></tr>)}</tbody></table></div></Page>}
