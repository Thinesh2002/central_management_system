import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import ErrorState from '../../components/ui/ErrorState';

function money(v){return `LKR ${Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function n(v){return Number(v||0).toLocaleString();}
function Card({title,value,note}){return <div className="erp-card"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-xl font-bold">{value}</p>{note&&<p className="mt-1 text-xs text-slate-500">{note}</p>}</div>}
function Line({ rows=[] }){ const vals=rows.map(r=>Number(r.net_sales||0)); const max=Math.max(...vals,1); const w=640,h=160; const path=vals.map((v,i)=>`${i?'L':'M'} ${vals.length<=1?0:(i/(vals.length-1))*w} ${h-(v/max)*(h-20)-10}`).join(' '); return <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full"><path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-300"/></svg> }
export default function SkuEconomicsPage(){
 const { sku }=useParams(); const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){try{setLoading(true);setError('');const r=await erpApi.skuEconomics(sku);setData(r.data?.data||{});}catch(e){setError(getApiError(e,'SKU economics failed.'));}finally{setLoading(false);}}
 useEffect(()=>{load();},[sku]); if(loading)return <PageLoader label="Loading SKU economics..."/>; if(error)return <ErrorState title="SKU economics failed" text={error}/>;
 return <div className="page-shell"><div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-xl font-bold">SKU Economics</h1><p className="mt-1 font-mono text-sm text-yellow-100">{data.sku}</p></div><button onClick={load} className="erp-btn-secondary"><RefreshCw size={14}/> Refresh</button></div>
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card title="7D Units" value={n(data.sales?.units_7d)}/><Card title="30D Units" value={n(data.sales?.units_30d)}/><Card title="90D Units" value={n(data.sales?.units_90d)}/><Card title="Net Sales" value={money(data.sales?.net_sales)}/><Card title="Days Cover" value={n(data.sales?.days_of_cover)} note={`Available ${n(data.inventory?.available_stock)}`}/></div>
 <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><div className="erp-card"><h2 className="text-sm font-bold">Last 30 days net sales</h2><div className="mt-3 rounded-xl border border-white/10 bg-[#070B14] p-3"><Line rows={data.daily_sales||[]}/></div></div><div className="erp-card"><h2 className="text-sm font-bold">Issues</h2><div className="mt-3 flex flex-wrap gap-2">{(data.issues||[]).length ? data.issues.map((x)=><span key={x} className="status-pill status-warning">{x}</span>) : <span className="status-pill status-good">No major issue</span>}</div></div></div>
 <div className="grid gap-4 xl:grid-cols-3"><div className="erp-card"><h2 className="text-sm font-bold">Active Listings</h2><div className="mt-3 space-y-2">{(data.listings||[]).map((l)=><div key={l.id} className="erp-card-soft"><p className="text-xs font-bold">{l.marketplace} • {l.account_code || '-'}</p><p className="font-mono text-xs text-yellow-100">{l.marketplace_sku}</p><p className="line-clamp-2 text-xs text-slate-500">{l.title}</p></div>)}</div></div><div className="erp-card"><h2 className="text-sm font-bold">Price Economics</h2><div className="mt-3 space-y-2">{(data.prices||[]).map((p)=><div key={p.id} className="erp-card-soft"><p className="text-xs font-bold">{p.marketplace} • Price {money(p.current_price)}</p><p className="text-xs text-slate-500">Profit {money(p.profit_amount)} • Margin {Number(p.margin_percent||0).toFixed(2)}% • Suggested {money(p.suggested_price)}</p></div>)}</div></div><div className="erp-card"><h2 className="text-sm font-bold">Issues</h2><div className="mt-3 space-y-2">{(data.issues||[]).length ? data.issues.map((issue)=><div key={issue} className="erp-card-soft text-xs text-slate-300">{issue}</div>) : <p className="text-xs text-slate-500">No major issues found.</p>}</div></div></div>
 </div>;
}
