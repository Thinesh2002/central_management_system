import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import ErrorState from '../../components/ui/ErrorState';

const API_BASE = import.meta.env.VITE_IMAGE_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://backend.teckvora.com';
const BACKEND_BASE = API_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');

function resolveImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${BACKEND_BASE}${value}`;
  return `${BACKEND_BASE}/${value}`;
}
function money(v){return `LKR ${Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function n(v){return Number(v||0).toLocaleString();}
function Card({title,value,note}){return <div className="erp-card"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-xl font-bold">{value}</p>{note&&<p className="mt-1 text-xs text-slate-500">{note}</p>}</div>}
function Line({ rows=[] }){ const vals=rows.map(r=>Number(r.net_sales||0)); const max=Math.max(...vals,1); const w=640,h=160; const path=vals.map((v,i)=>`${i?'L':'M'} ${vals.length<=1?0:(i/(vals.length-1))*w} ${h-(v/max)*(h-20)-10}`).join(' '); return <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full"><path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-300"/></svg> }

function ImagePreview({ src }) {
  const resolved = resolveImageUrl(src);
  return <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
    {resolved ? <img src={resolved} alt="SKU" className="h-full w-full object-contain" /> : <ImageIcon className="text-slate-500" size={22} />}
  </div>;
}

export default function SkuEconomicsPage(){
 const { sku }=useParams(); const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){try{setLoading(true);setError('');const r=await erpApi.skuEconomics(sku);setData(r.data?.data||{});}catch(e){setError(getApiError(e,'SKU economics failed.'));}finally{setLoading(false);}}
 useEffect(()=>{load();},[sku]); if(loading)return <PageLoader label="Loading SKU economics..."/>; if(error)return <ErrorState title="SKU economics failed" text={error}/>;
 const productImage = data.product_image || data.image_summary?.product_image;
 const skuImages = data.sku_images || data.image_summary?.sku_images || [];
 const marketplaceImages = data.marketplace_images || data.image_summary?.marketplace_images || [];
 return <div className="page-shell">
 <div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-xl font-bold">SKU Economics</h1><p className="mt-1 font-mono text-sm text-yellow-100">{data.sku}</p></div><Link to="/inventory/sku-search" className="erp-btn-secondary">SKU Search</Link></div>
 <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
  <div className="erp-card"><h2 className="text-sm font-bold">Product Image</h2><div className="mt-3 flex items-center gap-3"><ImagePreview src={productImage}/><div className="text-xs text-slate-500"><p>Local SKU image</p><p>{skuImages.length} local images</p><p>{marketplaceImages.length} marketplace images</p></div></div></div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card title="7D Units" value={n(data.sales?.units_7d)}/><Card title="30D Units" value={n(data.sales?.units_30d)}/><Card title="90D Units" value={n(data.sales?.units_90d)}/><Card title="Net Sales" value={money(data.sales?.net_sales)}/><Card title="Days Cover" value={n(data.sales?.days_of_cover)} note={`Available ${n(data.inventory?.available_stock)}`}/></div>
 </div>
 <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><div className="erp-card"><h2 className="text-sm font-bold">Last 30 days net sales</h2><div className="mt-3 rounded-xl border border-white/10 bg-[#070B14] p-3"><Line rows={data.daily_sales||[]}/></div></div><div className="erp-card"><h2 className="text-sm font-bold">Issues</h2><div className="mt-3 flex flex-wrap gap-2">{(data.issues||[]).length ? data.issues.map((x)=><span key={x} className="status-pill status-warning">{x}</span>) : <span className="status-pill status-good">No major issue</span>}</div></div></div>
 <div className="grid gap-4 xl:grid-cols-3"><div className="erp-card"><h2 className="text-sm font-bold">Available Accounts / Listings</h2><div className="mt-3 space-y-2">{(data.listings||[]).map((l)=><div key={l.id} className="erp-card-soft"><p className="text-xs font-bold">{l.marketplace} • {l.account_code || '-'}</p><p className="font-mono text-xs text-yellow-100">{l.marketplace_sku}</p><p className="line-clamp-2 text-xs text-slate-500">{l.title}</p>{l.open_url ? <button type="button" onClick={()=>window.open(l.open_url,'_blank','noopener,noreferrer')} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-200"><ExternalLink size={12}/> Open {l.marketplace}</button> : <p className="mt-2 text-xs text-slate-600">No listing URL saved</p>}</div>)}</div></div><div className="erp-card"><h2 className="text-sm font-bold">SKU Images</h2><div className="mt-3 grid grid-cols-3 gap-2">{skuImages.length ? skuImages.slice(0,9).map((img)=><button key={img.id || img.image_url} onClick={()=>window.open(resolveImageUrl(img.image_url),'_blank','noopener,noreferrer')} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-white"><img src={resolveImageUrl(img.image_url)} alt="" className="h-full w-full object-contain" /></button>) : <p className="col-span-3 text-xs text-slate-500">No local SKU image found.</p>}</div></div><div className="erp-card"><h2 className="text-sm font-bold">Price Economics</h2><div className="mt-3 space-y-2">{(data.prices||[]).map((p)=><div key={p.id} className="erp-card-soft"><p className="text-xs font-bold">{p.marketplace} • Price {money(p.current_price)}</p><p className="text-xs text-slate-500">Profit {money(p.profit_amount)} • Margin {Number(p.margin_percent||0).toFixed(2)}% • Suggested {money(p.suggested_price)}</p></div>)}</div></div></div>
 </div>;
}
