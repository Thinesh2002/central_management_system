import { useCallback } from 'react';
import darazFinanceApi from '../../../config/sub_api/daraz_api/daraz_finance_api';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

function money(value, currency = 'LKR') { return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function DarazFinanceTransactionsPage() {
  const loader = useCallback((params) => darazFinanceApi.transactions(params), []);
  const { rows, data, loading, error, filters, setFilters, reload } = useApiPage(loader, { limit: 100 });
  const finalRows = rows.length ? rows : (data?.rows || []);
  return (
    <Shell>
      <PageHeader title="Daraz Finance Transactions" description="Finance API transaction rows by account and date range." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <input value={filters.account_code || ''} onChange={(e) => setFilters((p) => ({ ...p, account_code: e.target.value }))} placeholder="Account code" className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100" />
      </FilterBar>
      <SimpleTable rows={finalRows} loading={loading} error={error} emptyText="No transactions found." columns={[
        { key: 'transaction_date', label: 'Date', render: (row) => row.transaction_date || row.date || '-' },
        { key: 'order_no', label: 'Order', render: (row) => row.order_no || row.trade_order_id || row.order_id || '-' },
        { key: 'transaction_type', label: 'Type', render: (row) => row.transaction_type || row.type || row.fee_type || '-' },
        { key: 'amount', label: 'Amount', render: (row) => money(row.amount || row.transaction_amount, row.currency) },
        { key: 'seller_income', label: 'Seller Income', render: (row) => money(row.seller_income || row.amount, row.currency) },
      ]} />
    </Shell>
  );
}
