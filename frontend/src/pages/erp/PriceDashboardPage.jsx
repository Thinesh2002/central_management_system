import { useEffect, useMemo, useState } from 'react';
import { Calculator, Search, Save } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Status({ value }) {
  const key = String(value || 'need_review');
  return <span className={`status-pill status-${key}`}>{key.replaceAll('_', ' ')}</span>;
}

const defaultPriceForm = {
  local_sku: '',
  marketplace_sku: '',
  marketplace: 'DARAZ',
  account_code: '',
  current_price: '',
  product_cost: '',
  marketplace_fee: '',
  payment_fee: '',
  ppc_cost: '',
  promotion_cost: '',
  courier_cost: '',
  packaging_cost: '',
  target_margin_percent: '20',
};

const defaultMapForm = {
  platform: 'DARAZ',
  account_code: '',
  local_sku: '',
  marketplace_sku: '',
  marketplace_item_id: '',
};

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

export default function PriceDashboardPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [priceForm, setPriceForm] = useState(defaultPriceForm);
  const [mapForm, setMapForm] = useState(defaultMapForm);
  const [rowEdits, setRowEdits] = useState({});

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await erpApi.priceDashboard({ search: search || undefined, marketplace: marketplace || undefined, limit: 100 });
      setRows(response.data?.rows || response.data?.data || []);
      setSummary(response.data?.summary || {});
    } catch (err) {
      setError(getApiError(err, 'Price dashboard load failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function savePrice(payload) {
    try {
      setBusy(true);
      setMessage('');
      setError('');
      const response = await erpApi.savePrice(payload);
      setMessage(response.data?.message || 'SKU price saved and calculated.');
      await load();
      return true;
    } catch (err) {
      setError(getApiError(err, 'SKU price save failed.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveQuickPrice(event) {
    event.preventDefault();
    const ok = await savePrice(priceForm);
    if (ok) setPriceForm(defaultPriceForm);
  }

  async function saveMapping(event) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage('');
      setError('');
      await erpApi.saveSkuMapping(mapForm);
      setMessage('SKU mapping saved. Wrong Daraz/Woo SKU will now map to local SKU.');
      setMapForm(defaultMapForm);
    } catch (err) {
      setError(getApiError(err, 'SKU mapping save failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveRowPrice(row) {
    const edit = rowEdits[row.id] || {};
    await savePrice({ ...row, ...edit });
  }

  useEffect(() => { load(); }, []);

  const visibleRows = useMemo(() => rows, [rows]);

  if (loading) return <PageLoader label="Loading price dashboard..." />;
  if (error && !rows.length) return <ErrorState title="Price dashboard failed" text={error} />;

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Price Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">SKU price, Daraz/Woo fees, PPC, promotion, profit margin and suggested price.</p>
        </div>
        <button onClick={() => savePrice({ local_sku: search, marketplace: marketplace || 'DARAZ' })} disabled={!search || busy} className="erp-btn-primary"><Calculator size={14} /> Calculate SKU</button>
      </div>

      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="erp-card"><p className="text-xs text-slate-500">Items</p><p className="mt-2 text-xl font-bold">{summary.total_items || rows.length}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Net sales</p><p className="mt-2 text-xl font-bold">LKR {money(summary.total_net_sales)}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Profit</p><p className="mt-2 text-xl font-bold">LKR {money(summary.total_profit)}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Alerts</p><p className="mt-2 text-xl font-bold">{Number(summary.loss_count || 0) + Number(summary.low_margin_count || 0)}</p></div>
      </div>

      <form onSubmit={saveQuickPrice} className="erp-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold text-slate-100">Add / Update SKU Price</h2><p className="text-xs text-slate-500">Type SKU price and Daraz fees; system calculates net sales, profit and margin.</p></div>
          <button disabled={busy} className="erp-btn-primary" type="submit"><Save size={14} /> Save Price</button>
        </div>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Field label="Local SKU"><input className="erp-input" value={priceForm.local_sku} onChange={(e)=>setPriceForm(p=>({...p,local_sku:e.target.value}))} required /></Field>
          <Field label="Daraz/Woo SKU"><input className="erp-input" value={priceForm.marketplace_sku} onChange={(e)=>setPriceForm(p=>({...p,marketplace_sku:e.target.value}))} /></Field>
          <Field label="Marketplace"><select className="erp-input" value={priceForm.marketplace} onChange={(e)=>setPriceForm(p=>({...p,marketplace:e.target.value}))}><option>DARAZ</option><option>WOO</option></select></Field>
          <Field label="Account Code"><input className="erp-input" value={priceForm.account_code} onChange={(e)=>setPriceForm(p=>({...p,account_code:e.target.value}))} /></Field>
          <Field label="SKU Price"><input className="erp-input" type="number" step="0.01" value={priceForm.current_price} onChange={(e)=>setPriceForm(p=>({...p,current_price:e.target.value}))} required /></Field>
          <Field label="Product Cost"><input className="erp-input" type="number" step="0.01" value={priceForm.product_cost} onChange={(e)=>setPriceForm(p=>({...p,product_cost:e.target.value}))} /></Field>
          <Field label="Target %"><input className="erp-input" type="number" step="0.01" value={priceForm.target_margin_percent} onChange={(e)=>setPriceForm(p=>({...p,target_margin_percent:e.target.value}))} /></Field>
          <Field label="Daraz Fee"><input className="erp-input" type="number" step="0.01" value={priceForm.marketplace_fee} onChange={(e)=>setPriceForm(p=>({...p,marketplace_fee:e.target.value}))} /></Field>
          <Field label="Payment Fee"><input className="erp-input" type="number" step="0.01" value={priceForm.payment_fee} onChange={(e)=>setPriceForm(p=>({...p,payment_fee:e.target.value}))} /></Field>
          <Field label="PPC"><input className="erp-input" type="number" step="0.01" value={priceForm.ppc_cost} onChange={(e)=>setPriceForm(p=>({...p,ppc_cost:e.target.value}))} /></Field>
          <Field label="Promotion"><input className="erp-input" type="number" step="0.01" value={priceForm.promotion_cost} onChange={(e)=>setPriceForm(p=>({...p,promotion_cost:e.target.value}))} /></Field>
          <Field label="Courier"><input className="erp-input" type="number" step="0.01" value={priceForm.courier_cost} onChange={(e)=>setPriceForm(p=>({...p,courier_cost:e.target.value}))} /></Field>
          <Field label="Packaging"><input className="erp-input" type="number" step="0.01" value={priceForm.packaging_cost} onChange={(e)=>setPriceForm(p=>({...p,packaging_cost:e.target.value}))} /></Field>
        </div>
      </form>

      <form onSubmit={saveMapping} className="erp-card space-y-3">
        <div><h2 className="text-sm font-bold text-slate-100">SKU Mapping</h2><p className="text-xs text-slate-500">Wrong Daraz/Woo SKU ah local SKU ku map panna inga save pannunga.</p></div>
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Platform"><select className="erp-input" value={mapForm.platform} onChange={(e)=>setMapForm(p=>({...p,platform:e.target.value}))}><option>DARAZ</option><option>WOO</option></select></Field>
          <Field label="Account Code"><input className="erp-input" value={mapForm.account_code} onChange={(e)=>setMapForm(p=>({...p,account_code:e.target.value}))} /></Field>
          <Field label="Marketplace SKU"><input className="erp-input" value={mapForm.marketplace_sku} onChange={(e)=>setMapForm(p=>({...p,marketplace_sku:e.target.value}))} required /></Field>
          <Field label="Local SKU"><input className="erp-input" value={mapForm.local_sku} onChange={(e)=>setMapForm(p=>({...p,local_sku:e.target.value}))} required /></Field>
          <Field label="Item/Product ID"><input className="erp-input" value={mapForm.marketplace_item_id} onChange={(e)=>setMapForm(p=>({...p,marketplace_item_id:e.target.value}))} /></Field>
        </div>
        <button disabled={busy} className="erp-btn-secondary" type="submit">Save Mapping</button>
      </form>

      <div className="erp-card grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="erp-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={load} placeholder="Search SKU, marketplace SKU or title" />
        </div>
        <select className="erp-input" value={marketplace} onChange={(e) => { setMarketplace(e.target.value); setTimeout(load, 0); }}>
          <option value="">All marketplace</option>
          <option value="DARAZ">Daraz</option>
          <option value="WOO">Woo</option>
        </select>
      </div>

      {!visibleRows.length ? <EmptyState title="No price records" text="Add SKU price above or run marketplace sync first." /> : (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>SKU</th><th>Marketplace</th><th>SKU Price</th><th>Daraz Fee</th><th>PPC / Promo</th><th>Net Sales</th><th>Profit</th><th>Margin</th><th>Suggested</th><th>Status</th><th>Save</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const edit = rowEdits[row.id] || {};
                return (
                  <tr key={row.id || `${row.local_sku}-${row.marketplace}-${row.account_id}`}>
                    <td><div className="font-mono text-yellow-100">{row.local_sku}</div><div className="mt-1 line-clamp-2 max-w-xs text-slate-500">{row.title || row.marketplace_sku}</div></td>
                    <td>{row.marketplace}<div className="text-slate-500">{row.account_code || row.account_id || '-'}</div></td>
                    <td><input className="erp-input h-9 w-28" type="number" step="0.01" value={edit.current_price ?? row.current_price ?? ''} onChange={(e)=>setRowEdits(p=>({...p,[row.id]:{...p[row.id],current_price:e.target.value}}))} /></td>
                    <td><input className="erp-input h-9 w-28" type="number" step="0.01" value={edit.marketplace_fee ?? row.marketplace_fee ?? ''} onChange={(e)=>setRowEdits(p=>({...p,[row.id]:{...p[row.id],marketplace_fee:e.target.value}}))} /></td>
                    <td>{money(row.ppc_cost)} / {money(row.promotion_cost)}</td>
                    <td>{money(row.net_sales)}</td>
                    <td className={Number(row.profit_amount) < 0 ? 'text-red-300' : 'text-emerald-300'}>{money(row.profit_amount)}</td>
                    <td>{money(row.margin_percent)}%</td>
                    <td className="font-bold text-yellow-100">{money(row.suggested_price)}</td>
                    <td><Status value={row.status} /></td>
                    <td><button type="button" disabled={busy} className="erp-btn-secondary" onClick={()=>saveRowPrice(row)}><Save size={13} /> Save</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
