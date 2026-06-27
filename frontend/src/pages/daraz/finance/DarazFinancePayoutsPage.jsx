import { useCallback } from 'react';
import darazFinanceApi from '../../../config/sub_api/daraz_api/daraz_finance_api';
import DarazFinanceAccountSelect from './DarazFinanceAccountSelect';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

export default function DarazFinancePayoutsPage() {
  const loader = useCallback((params) => darazFinanceApi.payoutStatus(params), []);
  const { rows, data, loading, error, filters, setFilters, reload } = useApiPage(loader, { account_id: '', account_code: '', start_time: '', end_time: '', date_from: '', date_to: '' });
  const finalRows = rows.length ? rows : (data?.rows || data?.payouts || []);
  return (
    <Shell>
      <PageHeader title="Daraz Payouts" description="Daraz payout status and settlement data." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <DarazFinanceAccountSelect filters={filters} setFilters={setFilters} />
      </FilterBar>
      <SimpleTable rows={finalRows} loading={loading} error={error} emptyText="No payout data found." columns={[
        { key: 'payout_id', label: 'Payout ID', render: (row) => row.payout_id || row.statement_id || row.id || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || row.payout_status || '-' },
        { key: 'amount', label: 'Amount', render: (row) => row.amount || row.total_amount || '-' },
        { key: 'created_at', label: 'Date', render: (row) => row.created_at || row.date || row.statement_date || '-' },
      ]} />
    </Shell>
  );
}
