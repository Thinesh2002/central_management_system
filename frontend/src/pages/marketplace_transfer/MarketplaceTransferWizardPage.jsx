import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';

const steps = ['Product', 'Marketplace', 'Account', 'Category', 'Attributes', 'Price & Stock', 'Preview', 'Transfer'];

export default function MarketplaceTransferWizardPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ local_product_id: '', local_sku: '', marketplace: 'DARAZ', account_id: '', category_id: '', price: '', stock_qty: '', attributes_json: '{}', payload: {} });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function next() { setStep((s) => Math.min(s + 1, steps.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  function payload() {
    let attrs = {};
    try { attrs = JSON.parse(form.attributes_json || '{}'); } catch { attrs = {}; }
    return { ...form, attributes: attrs, payload: { sku: form.local_sku, price: form.price, stock_qty: form.stock_qty, category_id: form.category_id, attributes: attrs } };
  }

  async function submit() {
    try {
      setSaving(true); setError(''); setMessage('');
      const response = await erpApi.transfer(payload());
      setMessage(`Transfer job created successfully. Job ID: ${response.data?.data?.id}`);
      setStep(steps.length - 1);
    } catch (err) { setError(getApiError(err, 'Transfer job failed.')); } finally { setSaving(false); }
  }

  return (
    <div className="page-shell">
      <div className="page-header-card">
        <h1 className="text-xl font-bold">Marketplace Transfer Wizard</h1>
        <p className="mt-1 text-sm text-slate-500">Step by step local product transfer to Daraz or Woo. This page creates a transfer job and keeps payload preview clear.</p>
      </div>

      <div className="erp-card flex flex-wrap gap-2">
        {steps.map((name, index) => <button key={name} type="button" onClick={() => setStep(index)} className={`rounded-full border px-3 py-1 text-xs font-bold ${index === step ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-white/10 bg-[#070B14] text-slate-400'}`}>{index + 1}. {name}</button>)}
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}

      <div className="erp-card min-h-[320px]">
        {step === 0 && <div className="grid gap-3 md:grid-cols-2"><input className="erp-input" placeholder="Local product ID" value={form.local_product_id} onChange={(e) => set('local_product_id', e.target.value)} /><input className="erp-input" placeholder="Local SKU" value={form.local_sku} onChange={(e) => set('local_sku', e.target.value)} /></div>}
        {step === 1 && <select className="erp-input max-w-xs" value={form.marketplace} onChange={(e) => set('marketplace', e.target.value)}><option value="DARAZ">Daraz</option><option value="WOO">WooCommerce</option></select>}
        {step === 2 && <input className="erp-input max-w-xs" placeholder="Account ID" value={form.account_id} onChange={(e) => set('account_id', e.target.value)} />}
        {step === 3 && <input className="erp-input max-w-xs" placeholder="Marketplace category ID" value={form.category_id} onChange={(e) => set('category_id', e.target.value)} />}
        {step === 4 && <div><p className="mb-2 text-xs text-slate-500">Required attributes JSON. Daraz category attributes can be pasted here if API permission is available.</p><textarea className="min-h-52 w-full rounded-lg border border-white/10 bg-[#070B14] p-3 font-mono text-xs outline-none focus:border-yellow-400/60" value={form.attributes_json} onChange={(e) => set('attributes_json', e.target.value)} /></div>}
        {step === 5 && <div className="grid gap-3 md:grid-cols-2"><input className="erp-input" type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => set('price', e.target.value)} /><input className="erp-input" type="number" placeholder="Stock qty" value={form.stock_qty} onChange={(e) => set('stock_qty', e.target.value)} /></div>}
        {step === 6 && <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-[#070B14] p-4 text-xs text-slate-300">{JSON.stringify(payload(), null, 2)}</pre>}
        {step === 7 && <div className="flex flex-col items-center justify-center py-16 text-center"><CheckCircle2 size={36} className="text-emerald-300"/><p className="mt-3 text-sm font-bold text-slate-100">Ready to transfer</p><p className="mt-1 text-xs text-slate-500">Click submit to create transfer job. Final Daraz/Woo submit can run from backend worker after permission check.</p><button onClick={submit} disabled={saving} className="erp-btn-primary mt-4"><Send size={14}/> Create Transfer Job</button></div>}
      </div>

      <div className="flex justify-between">
        <button onClick={back} disabled={step === 0} className="erp-btn-secondary"><ChevronLeft size={14}/> Back</button>
        {step < steps.length - 1 && <button onClick={next} className="erp-btn-primary">Next <ChevronRight size={14}/></button>}
      </div>
    </div>
  );
}
