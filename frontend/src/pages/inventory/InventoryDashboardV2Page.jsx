import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, PackageSearch, RefreshCw, Search } from 'lucide-react';
import inventoryApi from '../../config/sub_api/inventory_api';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import ErrorState from '../../components/ui/ErrorState';

function money(value){return `LKR ${Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function n(value){return Number(value||0).toLocaleString();}
function Card({title,value,note,icon:Icon}){return <div className="erp-card"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-xl font-bold">{value}</p>{note&&<p className="mt-1 text-xs text-slate-500">{note}</p>}</div>{Icon&&<Icon className="text-yellow-200" size={18}/>}</div></div>}
export default function InventoryDashboardV2Page(){
 const [data,setData]=useState({}); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){try{setLoading(true);setError('');const r=await inventoryApi.dashboard();setData(r.data?.data||{});}catch(e){setError(getApiError(e,'Inventory dashboard failed.'));}finally{setLoading(false);}}
 useEffect(()=>{load();},[]); if(loading)return <PageLoader label="Loading inventory dashboard..."/>; if(error)return <ErrorState title="Inventory dashboard failed" text={error}/>;
 const s=data.summary||data||{};
 return <div className="page-shell"><div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-xl font-bold">Inventory Dashboard</h1><p className="mt-1 text-sm text-slate-500">Stock value, alerts, fast moving, slow moving and marketplace stock sync.</p></div><div className="flex gap-2"><Link to="/inventory/sku-search" className="erp-btn-primary"><Search size={14}/> SKU Search</Link><button onClick={load} className="erp-btn-secondary"><RefreshCw size={14}/> Refresh</button></div></div>
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card title="Total SKUs" value={n(s.total_skus)} icon={Boxes}/><Card title="Available Stock" value={n(s.available_stock)} note={`Reserved: ${n(s.reserved_stock)}`} icon={Boxes}/><Card title="Stock Value" value={money(s.stock_value)} icon={Boxes}/><Card title="Stock Alerts" value={`${n(s.low_stock_count)} / ${n(s.out_of_stock_count)}`} note="Low / Out of stock" icon={PackageSearch}/></div>
 <div className="grid gap-4 xl:grid-cols-2"><div className="erp-card"><h2 className="text-sm font-bold">Fast moving SKUs</h2><div className="mt-3 space-y-2">{(data.fast_moving_skus||[]).map((r)=><Link key={r.sku} to={`/reports/sku-economics/${encodeURIComponent(r.sku)}`} className="erp-card-soft block"><p className="font-mono text-xs text-yellow-100">{r.sku}</p><p className="text-xs text-slate-500">Moved qty: {n(r.moved_qty)} • Movements: {n(r.movement_count)}</p></Link>)}</div></div><div className="erp-card"><h2 className="text-sm font-bold">Slow moving / Dead stock</h2><div className="mt-3 space-y-2">{(data.dead_stock_skus||[]).map((r)=><Link key={r.sku} to={`/reports/sku-economics/${encodeURIComponent(r.sku)}`} className="erp-card-soft block"><p className="font-mono text-xs text-yellow-100">{r.sku}</p><p className="text-xs text-slate-500">Available: {n(r.available_qty)} • Last update: {r.updated_at || '-'}</p></Link>)}</div></div></div></div>;
}
