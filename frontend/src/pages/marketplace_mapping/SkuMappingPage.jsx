import { useEffect, useState } from 'react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';

const empty = { platform: 'DARAZ', account_code: '', marketplace_sku: '', local_sku: '', marketplace_item_id: '' };

export default function SkuMappingPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      const response = await erpApi.skuMappings({ limit: 200 });
      setRows(response.data?.rows || response.data?.data || []);
    } catch (err) {
      setError(getApiError(err, 'SKU mappings load failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      setError(''); setMessage('');
      await erpApi.saveSkuMapping(form);
      setMessage('SKU mapping saved.');
      setForm(empty);
      await load();
    } catch (err) {
      setError(getApiError(err, 'SKU mapping save failed.'));
    }
  }

  useEffect(() => { load(); }, []);
  if (loading) return <PageLoader label="Loading SKU mappings..." />;

  return <div className="page-shell">
    <div className="page-header-card"><h1 className="text-xl font-bold">SKU Mapping</h1><p className="mt-1 text-sm text-slate-500">Wrong Daraz/Woo SKU ah correct local SKU ku map pannunga.</p></div>
    {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}
    {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
    <form onSubmit={submit} className="erp-card grid gap-3 md:grid-cols-5">
      <select className="erp-input" value={form.platform} onChange={(e)=>setForm(p=>({...p,platform:e.target.value}))}><option>DARAZ</option><option>WOO</option></select>
      <input className="erp-input" placeholder="Account code" value={form.account_code} onChange={(e)=>setForm(p=>({...p,account_code:e.target.value}))} />
      <input className="erp-input" placeholder="Marketplace SKU" value={form.marketplace_sku} onChange={(e)=>setForm(p=>({...p,marketplace_sku:e.target.value}))} required />
      <input className="erp-input" placeholder="Local SKU" value={form.local_sku} onChange={(e)=>setForm(p=>({...p,local_sku:e.target.value}))} required />
      <button className="erp-btn-primary" type="submit">Save Mapping</button>
    </form>
    <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Platform</th><th>Account</th><th>Marketplace SKU</th><th>Local SKU</th><th>Status</th></tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td>{row.platform}</td><td>{row.account_code || row.account_id || '-'}</td><td className="font-mono text-yellow-100">{row.marketplace_sku}</td><td className="font-mono text-emerald-100">{row.local_sku}</td><td>{row.status}</td></tr>)}</tbody></table></div>
  </div>;
}
