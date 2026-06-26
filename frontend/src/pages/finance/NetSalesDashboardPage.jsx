import { useCallback, useMemo } from 'react';
import financeApi from '../../config/sub_api/finance_api';
import { FilterBar, PageHeader, Shell, SimpleTable, StatCard } from '../business/components/AdminPageShell';
import useApiPage from '../business/hooks/useApiPage';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function n(value) { return Number(value || 0).toLocaleString(); }

export default function NetSalesDashboardPage() {
  const summaryLoader = useCallback((params) => financeApi.summary(params), []);
  const { data: summary, loading, error, filters, setFilters, reload } = useApiPage(summaryLoader, { channel: 'ALL' });

  const channelLoader = useCallback((params) => financeApi.channelWise(params), []);
  const channels = useApiPage(channelLoader, filters);
  const orderLoader = useCallback((params) => financeApi.orderWise({ ...params, limit: 20 }), []);
  const orders = useApiPage(orderLoader, filters);

  const statRows = useMemo(() => [
    ['Gross Sales', money(summary?.gross_sales)],
    ['Net Sales', money(summary?.net_sales)],
    ['Orders', n(summary?.total_orders)],
    ['Delivered', n(summary?.delivered_orders)],
    ['Cancelled', n(summary?.cancelled_orders)],
    ['Returned', n(summary?.returned_orders)],
    ['Product Cost', money(summary?.product_cost)],
    ['Shipping Cost', money(summary?.shipping_cost)],
    ['Marketplace Fees', money(summary?.marketplace_fee)],
    ['Payment Fees', money(summary?.payment_fee)],
    ['Other Expenses', money(summary?.other_expense)],
    ['Net Profit', money(summary?.net_profit)],
    ['Profit Margin', `${Number(summary?.profit_margin || 0).toFixed(2)}%`],
  ], [summary]);

  return (
    <Shell>
      <PageHeader title="Net Sales Dashboard" description="Manual, Daraz and WooCommerce sales, costs and net profit." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={() => { reload(); channels.reload(); orders.reload(); }} loading={loading}>
        <select value={filters.channel || 'ALL'} onChange={(e) => setFilters((p) => ({ ...p, channel: e.target.value }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100">
          {['ALL','MANUAL','DARAZ','WOO'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </FilterBar>
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {statRows.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SimpleTable
          rows={channels.rows}
          loading={channels.loading}
          error={channels.error}
          emptyText="No channel summary yet."
          columns={[
            { key: 'channel', label: 'Channel' },
            { key: 'gross_sales', label: 'Gross', render: (row) => money(row.gross_sales) },
            { key: 'net_sales', label: 'Net Sales', render: (row) => money(row.net_sales) },
            { key: 'net_profit', label: 'Net Profit', render: (row) => money(row.net_profit) },
            { key: 'orders_count', label: 'Orders' },
          ]}
        />
        <SimpleTable
          rows={orders.rows}
          loading={orders.loading}
          error={orders.error}
          emptyText="No order profit rows yet."
          columns={[
            { key: 'order_number', label: 'Order' },
            { key: 'channel', label: 'Channel' },
            { key: 'order_status', label: 'Status' },
            { key: 'net_sales', label: 'Net Sales', render: (row) => money(row.net_sales) },
            { key: 'net_profit', label: 'Profit', render: (row) => money(row.net_profit) },
          ]}
        />
      </div>
    </Shell>
  );
}
