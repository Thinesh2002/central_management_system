import { useCallback, useState } from 'react';
import darazFinanceApi from '../../../config/sub_api/daraz_api/daraz_finance_api';
import DarazFinanceAccountSelect from './DarazFinanceAccountSelect';
import { FilterBar, PageHeader, Shell, StatCard } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';
import { getApiError } from '../../../config/api';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function DarazFinanceDashboardPage() {
  const loader = useCallback((params) => darazFinanceApi.summary(params), []);
  const { data, loading, error, filters, setFilters, reload } = useApiPage(loader, { account_id: '', account_code: '', start_time: '', end_time: '', date_from: '', date_to: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  async function syncFinance() {
    setSyncing(true); setSyncMessage(''); setSyncError('');
    try {
      const response = await darazFinanceApi.sync(filters);
      setSyncMessage(response?.data?.message || 'Daraz finance synced.');
      reload();
    } catch (err) { setSyncError(getApiError(err)); }
    finally { setSyncing(false); }
  }

  const summary = data || {};
  return (
    <Shell>
      <PageHeader title="Daraz Finance" description="Daraz seller income, fees, refunds and payout data." actions={<button onClick={syncFinance} disabled={syncing} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{syncing ? 'Syncing...' : 'Sync Finance'}</button>} />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <DarazFinanceAccountSelect filters={filters} setFilters={setFilters} />
        <input type="date" value={filters.start_time || ''} onChange={(e) => setFilters((p) => ({ ...p, start_time: e.target.value, date_from: e.target.value }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" />
        <input type="date" value={filters.end_time || ''} onChange={(e) => setFilters((p) => ({ ...p, end_time: e.target.value, date_to: e.target.value }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" />
      </FilterBar>
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
      {syncError && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{syncError}</div>}
      {syncMessage && <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{syncMessage}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Sales" value={money(summary.total_sales || summary.gross_sales)} />
        <StatCard label="Seller Income" value={money(summary.seller_income)} />
        <StatCard label="Daraz Fees" value={money(summary.total_fees || summary.daraz_fees)} />
        <StatCard label="Commission" value={money(summary.commission || summary.commission_amount)} />
        <StatCard label="Shipping Fee" value={money(summary.shipping_fee)} />
        <StatCard label="Payment Fee" value={money(summary.payment_fee)} />
        <StatCard label="Refunds" value={money(summary.refunds || summary.refund_amount)} />
        <StatCard label="Rows Checked" value={Number(summary.rows_count || summary.total_transactions || 0).toLocaleString()} />
      </div>
    </Shell>
  );
}
