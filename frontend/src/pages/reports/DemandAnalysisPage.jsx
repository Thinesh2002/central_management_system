import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';

function n(v){return Number(v||0).toLocaleString();}
function Status({value}){return <span className={`status-pill status-${value || 'muted'}`}>{String(value||'-').replaceAll('_',' ')}</span>}
export default function DemandAnalysisPage(){
 const [rows,setRows]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 async function load(){try{setLoading(true);setError('');const r=await erpApi.demandAnalysis({limit:100});setRows(r.data?.rows || r.data?.data || []);}catch(e){setError(getApiError(e,'Demand analysis failed.'));}finally{setLoading(false);}}
 useEffect(()=>{load();},[]); if(loading)return <PageLoader label="Loading demand analysis..."/>; if(error && !rows.length)return <ErrorState title="Demand analysis failed" text={error}/>;
 return <div className="page-shell"><div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-xl font-bold">Demand Analysis</h1><p className="mt-1 text-sm text-slate-500">Uses 30/60/90 days sales, lead time, safety stock and available stock to suggest next stock quantity.</p></div><button onClick={load} className="erp-btn-secondary"><RefreshCw size={14}/> Refresh</button></div>{!rows.length ? <EmptyState title="No demand data" text="Add SKU sales daily records or import marketplace sales to calculate demand."/> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>SKU</th><th>Product</th><th>30D</th><th>60D</th><th>90D</th><th>Available</th><th>Lead Time</th><th>Reorder Qty</th><th>Priority</th><th>Reason</th></tr></thead><tbody>{rows.map((r)=><tr key={r.local_sku}><td><Link className="font-mono text-yellow-100 hover:underline" to={`/reports/sku-economics/${encodeURIComponent(r.local_sku)}`}>{r.local_sku}</Link></td><td className="max-w-xs">{r.product_name || '-'}</td><td>{n(r.sales_30_days)}</td><td>{n(r.sales_60_days)}</td><td>{n(r.sales_90_days)}</td><td>{n(r.available_stock)}</td><td>{r.supplier_lead_time_days} days</td><td className="font-bold text-yellow-100">{n(r.suggested_reorder_qty)}</td><td><Status value={r.priority}/></td><td className="text-slate-500">{r.reason}</td></tr>)}</tbody></table></div>}</div>;
}
