import { useState } from 'react';
import inventoryApi from '../../config/sub_api/inventory_api';
import { PageHeader, Shell } from '../business/components/AdminPageShell';
import { getApiError } from '../../config/api';

const initialForm = { sku: '', movement_type: 'ADJUSTMENT', qty_change: '', cost_price: '', note: '' };

export default function StockAdjustmentPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await inventoryApi.adjust(form);
      setMessage('Stock adjustment saved successfully.');
      setForm(initialForm);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <PageHeader title="Stock Adjustment" description="Add stock IN, OUT, ADJUSTMENT, RETURN, DAMAGE, RESERVED or RELEASED movement." />
      <form onSubmit={submit} className="max-w-3xl rounded-xl border border-slate-800 bg-[#0b1019] p-4">
        {message && <div className="mb-3 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</div>}
        {error && <div className="mb-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-300">SKU<input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 text-slate-100" required /></label>
          <label className="text-sm font-semibold text-slate-300">Movement Type<select value={form.movement_type} onChange={(e) => setForm((p) => ({ ...p, movement_type: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 text-slate-100">{['IN','OUT','ADJUSTMENT','RETURN','DAMAGE','RESERVED','RELEASED'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-300">Quantity<input type="number" min="1" value={form.qty_change} onChange={(e) => setForm((p) => ({ ...p, qty_change: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 text-slate-100" required /></label>
          <label className="text-sm font-semibold text-slate-300">Cost Price<input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((p) => ({ ...p, cost_price: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 text-slate-100" /></label>
          <label className="sm:col-span-2 text-sm font-semibold text-slate-300">Note<textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 py-2 text-slate-100" /></label>
        </div>
        <button disabled={loading} className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Saving...' : 'Save Adjustment'}</button>
      </form>
    </Shell>
  );
}
