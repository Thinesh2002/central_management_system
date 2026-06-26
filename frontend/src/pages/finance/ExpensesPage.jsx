import { useCallback, useState } from 'react';
import financeApi from '../../config/sub_api/finance_api';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../business/components/AdminPageShell';
import useApiPage from '../business/hooks/useApiPage';
import { getApiError } from '../../config/api';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
const initialForm = { expense_date: new Date().toISOString().slice(0, 10), expense_type: 'OTHER', channel: 'ALL', amount: '', note: '' };

export default function ExpensesPage() {
  const loader = useCallback((params) => financeApi.expenses(params), []);
  const { rows, loading, error, filters, setFilters, reload } = useApiPage(loader, { channel: 'ALL' });
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setFormError(''); setMessage('');
    try {
      await financeApi.createExpense(form);
      setMessage('Expense saved successfully.');
      setForm(initialForm);
      reload();
    } catch (err) { setFormError(getApiError(err)); }
    finally { setSaving(false); }
  }

  return (
    <Shell>
      <PageHeader title="Business Expenses" description="Packing, ads, courier, staff, platform and other expenses." />
      <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-[#0b1019] p-4">
        {message && <div className="mb-3 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</div>}
        {formError && <div className="mb-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{formError}</div>}
        <div className="grid gap-3 md:grid-cols-5">
          <input type="date" value={form.expense_date} onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" required />
          <input value={form.expense_type} onChange={(e) => setForm((p) => ({ ...p, expense_type: e.target.value }))} placeholder="Expense type" className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" />
          <select value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100">{['ALL','MANUAL','DARAZ','WOO'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
          <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" required />
          <button disabled={saving} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Add Expense'}</button>
          <input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note" className="md:col-span-5 h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" />
        </div>
      </form>
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <select value={filters.channel || 'ALL'} onChange={(e) => setFilters((p) => ({ ...p, channel: e.target.value }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100">{['ALL','MANUAL','DARAZ','WOO'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
      </FilterBar>
      <SimpleTable rows={rows} loading={loading} error={error} emptyText="No expenses found." columns={[
        { key: 'expense_date', label: 'Date' }, { key: 'expense_type', label: 'Type' }, { key: 'channel', label: 'Channel' }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }, { key: 'note', label: 'Note' },
      ]} />
    </Shell>
  );
}
