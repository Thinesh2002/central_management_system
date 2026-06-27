import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import darazFinanceApi from '../../../config/sub_api/daraz_api/daraz_finance_api';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function DarazOrderFinancePage() {
  const { orderNo } = useParams();
  const loader = useCallback((params) => darazFinanceApi.order(orderNo, params), [orderNo]);
  const { rows, data, loading, error, filters, setFilters, reload } = useApiPage(loader, {});
  const finalRows = rows.length ? rows : (data?.rows || []);
  return (
    <Shell>
      <PageHeader title={`Daraz Order Finance #${orderNo}`} description="Order-wise Daraz settlement details." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <input value={filters.account_code || ''} onChange={(e) => setFilters((p) => ({ ...p, account_code: e.target.value }))} placeholder="Account code" className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" />
      </FilterBar>
      <SimpleTable rows={finalRows} loading={loading} error={error} emptyText="No order finance rows found." columns={[
        { key: 'transaction_date', label: 'Date', render: (row) => row.transaction_date || row.date || '-' },
        { key: 'transaction_type', label: 'Type', render: (row) => row.transaction_type || row.type || '-' },
        { key: 'amount', label: 'Amount', render: (row) => money(row.amount || row.transaction_amount) },
        { key: 'fee_type', label: 'Fee Type', render: (row) => row.fee_type || row.fee_name || '-' },
      ]} />
    </Shell>
  );
}
