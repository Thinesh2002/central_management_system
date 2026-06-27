import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Save, Send, Search } from 'lucide-react';
import erpApi from '../../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../../config/api';
import EmptyState from '../../../components/ui/EmptyState';

function money(v) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function n(v) { return Number(v || 0).toLocaleString(); }

export default function SkuSearchPage() {
  const [params] = useSearchParams();
  const [sku, setSku] = useState(params.get('sku') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [autoStock, setAutoStock] = useState({ daraz_auto_stock_update: false, woo_auto_stock_update: false });

  async function loadSettings() {
    try {
      const response = await erpApi.autoStockSettings();
      setAutoStock(response.data?.data || {});
    } catch {
      // SQL may not be imported yet. Page still works without this.
    }
  }

  async function search(e) {
    e?.preventDefault();
    if (!sku.trim()) return;
    try {
      setLoading(true);
      setError('');
      setMessage('');
      const r = await erpApi.skuSearch(sku.trim());
      const next = r.data?.data || {};
      setData(next);
      if (next.auto_stock_settings) setAutoStock(next.auto_stock_settings);
    } catch (err) {
      setError(getApiError(err, 'SKU search failed.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(nextSettings) {
    try {
      setSaving(true);
      setError('');
      const response = await erpApi.saveAutoStockSettings(nextSettings);
      setAutoStock(response.data?.data || nextSettings);
      setMessage('Auto stock settings saved.');
    } catch (err) {
      setError(getApiError(err, 'Auto stock settings save failed. Run database_phase4_operational_hotfix.sql first.'));
    } finally {
      setSaving(false);
    }
  }

  async function manualUpdate() {
    if (!data?.sku) return;
    const current = data?.inventory?.available_stock ?? data?.inventory?.stock_qty ?? 0;
    const qty = window.prompt(`Enter new local stock for ${data.sku}`, String(current));
    if (qty === null || qty === '') return;
    try {
      setSaving(true);
      setError('');
      const response = await erpApi.manualStockUpdate({
        local_sku: data.sku,
        stock_qty: Number(qty),
        push_daraz: autoStock.daraz_auto_stock_update,
        push_woo: autoStock.woo_auto_stock_update,
        note: 'Updated from SKU Search page',
      });
      setMessage(`Local stock updated. Queued pushes: ${response.data?.data?.queued?.length || 0}`);
      await search();
    } catch (err) {
      setError(getApiError(err, 'Manual stock update failed.'));
    } finally {
      setSaving(false);
    }
  }

  async function pushStock(marketplace, listing = {}) {
    try {
      setMessage('');
      setError('');
      const qty = data?.inventory?.available_stock || 0;
      const r = await erpApi.pushStock({ sku: data.sku, marketplace, account_id: listing.account_id, marketplace_sku: listing.marketplace_sku, requested_qty: qty });
      setMessage(`${marketplace} stock push queued. Queue ID: ${r.data?.data?.id || '-'}`);
      await search();
    } catch (e) {
      setError(getApiError(e, 'Stock push failed.'));
    }
  }

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { if (params.get('sku')) search(); }, []);

  return (
    <div className="page-shell">
      <div className="page-header-card">
        <h1 className="text-xl font-bold">SKU Search</h1>
        <p className="mt-1 text-sm text-slate-500">Search SKU, view sales/inventory, manually update stock and queue Daraz/Woo stock update.</p>
      </div>

      <form onSubmit={search} className="erp-card flex gap-2">
        <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="erp-input pl-9" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Enter local SKU" /></div>
        <button disabled={loading} className="erp-btn-primary"><Search size={14} /> Search</button>
      </form>

      <div className="erp-card grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
        <Toggle title="Daraz auto stock update" checked={autoStock.daraz_auto_stock_update} onClick={() => saveSettings({ ...autoStock, daraz_auto_stock_update: !autoStock.daraz_auto_stock_update })} disabled={saving} />
        <Toggle title="Woo auto stock update" checked={autoStock.woo_auto_stock_update} onClick={() => saveSettings({ ...autoStock, woo_auto_stock_update: !autoStock.woo_auto_stock_update })} disabled={saving} />
        <button type="button" onClick={manualUpdate} disabled={!data || saving} className="erp-btn-primary"><Save size={14} /> Manual Stock Update</button>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}

      {!data ? <EmptyState title="Search a SKU" text="Enter a SKU to load economics, inventory, marketplace and stock sync details." /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="erp-card"><p className="text-xs text-slate-500">SKU</p><p className="mt-2 font-mono text-xl font-bold text-yellow-100">{data.sku}</p></div>
            <div className="erp-card"><p className="text-xs text-slate-500">Available</p><p className="mt-2 text-xl font-bold">{n(data.inventory?.available_stock)}</p></div>
            <div className="erp-card"><p className="text-xs text-slate-500">30D Sales</p><p className="mt-2 text-xl font-bold">{n(data.sales?.units_30d)}</p></div>
            <div className="erp-card"><p className="text-xs text-slate-500">60D Sales</p><p className="mt-2 text-xl font-bold">{n(data.sales?.units_60d)}</p></div>
            <div className="erp-card"><p className="text-xs text-slate-500">90D Sales</p><p className="mt-2 text-xl font-bold">{n(data.sales?.units_90d)}</p></div>
            <div className="erp-card"><p className="text-xs text-slate-500">Reorder</p><p className="mt-2 text-xl font-bold">{n(data.demand?.suggested_reorder_qty)}</p></div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="erp-card">
              <h2 className="text-sm font-bold">Marketplace listings</h2>
              <div className="mt-3 space-y-2">
                {(data.listings || []).length ? (data.listings || []).map((l) => (
                  <div key={l.id || `${l.marketplace}-${l.marketplace_sku}`} className="erp-card-soft flex items-center justify-between gap-3">
                    <div><p className="text-xs font-bold">{l.marketplace} • {l.account_code || l.account_id || '-'}</p><p className="mt-1 font-mono text-xs text-yellow-100">{l.marketplace_sku}</p><p className="line-clamp-1 text-xs text-slate-500">{l.title}</p></div>
                    <button onClick={() => pushStock(l.marketplace, l)} className="erp-btn-secondary"><Send size={13} /> Push Stock</button>
                  </div>
                )) : <p className="text-xs text-slate-500">No marketplace listing mapping found.</p>}
              </div>
            </div>

            <div className="erp-card">
              <h2 className="text-sm font-bold">Pending stock push queue</h2>
              <div className="mt-3 space-y-2">
                {(data.pending_stock_push || []).length ? (data.pending_stock_push || []).map((q) => (
                  <div key={q.id} className="erp-card-soft flex items-center justify-between gap-3">
                    <div><p className="text-xs font-bold">{q.marketplace} • Qty {n(q.requested_qty)}</p><p className="text-xs text-slate-500">{q.status} {q.error_message ? `• ${q.error_message}` : ''}</p></div>
                    <RefreshCw size={14} className="text-slate-500" />
                  </div>
                )) : <p className="text-xs text-slate-500">No pending stock push queue for this SKU.</p>}
              </div>
            </div>
          </div>

          <div className="erp-card"><Link className="erp-btn-primary" to={`/reports/sku-economics/${encodeURIComponent(data.sku)}`}>Open Full SKU Economics</Link></div>
        </>
      )}
    </div>
  );
}

function Toggle({ title, checked, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-semibold text-slate-100">
      <span>{title}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? 'bg-emerald-400/30' : 'bg-slate-800'}`}><span className={`block h-4 w-4 rounded-full transition ${checked ? 'translate-x-4 bg-emerald-300' : 'bg-slate-500'}`} /></span>
    </button>
  );
}
