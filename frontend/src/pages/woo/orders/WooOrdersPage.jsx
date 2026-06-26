import { Link } from 'react-router-dom';
import { useCallback } from 'react';
import wooOrdersApi from '../../../config/sub_api/woo_api/woo_orders_api';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

function money(value, currency = 'LKR') { return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function WooOrdersPage() {
  const loader = useCallback((params) => wooOrdersApi.list(params), []);
  const { rows, loading, error, filters, setFilters, reload } = useApiPage(loader, { page: 1, limit: 25 });
  return (
    <Shell>
      <PageHeader title="WooCommerce Orders" description="Synced WooCommerce order list with payment, shipping and finance values." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <select value={filters.status || ''} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100">
          <option value="">All statuses</option>
          {['pending','processing','completed','cancelled','refunded','failed'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </FilterBar>
      <SimpleTable rows={rows} loading={loading} error={error} emptyText="No WooCommerce orders found." columns={[
        { key: 'order_number', label: 'Order', render: (row) => <Link className="font-bold text-blue-300 hover:text-blue-200" to={`/woo/orders/${row.id || row.woo_order_id}`}>#{row.order_number || row.woo_order_id}</Link> },
        { key: 'order_date', label: 'Date' }, { key: 'account_code', label: 'Account' }, { key: 'customer_name', label: 'Customer' }, { key: 'status', label: 'Status' },
        { key: 'payment_status', label: 'Payment' }, { key: 'net_sales', label: 'Net Sales', render: (row) => money(row.net_sales, row.currency) },
      ]} />
    </Shell>
  );
}
