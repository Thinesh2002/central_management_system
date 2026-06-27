import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import darazFinanceApi from '../../../config/sub_api/daraz_api/daraz_finance_api';
import DarazFinanceAccountSelect from './DarazFinanceAccountSelect';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function DarazOrderFinancePage() {
  const { orderNo } = useParams();
  const loader = useCallback((params) => darazFinanceApi.order(orderNo, params), [orderNo]);
  const { rows, data, loading, error, filters, setFilters, reload } = useApiPage(loader, { account_id: '', account_code: '', start_time: '', end_time: '', date_from: '', date_to: '' });
  const finalRows = rows.length ? rows : (data?.rows || []);
  return (
    <Shell>
      <PageHeader title={`Daraz Order Finance #${orderNo}`} description="Order-wise Daraz settlement details." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <DarazFinanceAccountSelect filters={filters} setFilters={setFilters} />
      </FilterBar>
      <SimpleTable rows={finalRows} loading={loading} error={error} emptyText="No order finance rows found." columns={[
        { key: 'order_no', label: 'Order No', render: (row) => row.order_no || row.trade_order_id || orderNo || '-' },
        { key: 'seller_sku', label: 'Seller SKU', render: (row) => row.seller_sku || row.sku || '-' },
        { key: 'item_price', label: 'Item Price', render: (row) => money(row.item_price || row.price || row.gross_sales || row.amount) },
        { key: 'shipping', label: 'Shipping', render: (row) => money(row.shipping_amount || row.shipping || row.shipping_fee) },
        { key: 'commission', label: 'Commission', render: (row) => money(row.commission_amount || row.commission) },
        { key: 'fees', label: 'Fees', render: (row) => money(row.fee_amount || row.fees || row.total_fees) },
        { key: 'payout_amount', label: 'Payout', render: (row) => money(row.payout_amount || row.seller_income || row.net_amount) },
        { key: 'net_sales', label: 'Net Sales', render: (row) => money(row.net_sales || row.seller_income || row.payout_amount) },
      ]} />
    </Shell>
  );
}
