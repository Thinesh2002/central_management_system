import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import wooOrdersApi from '../../../config/sub_api/woo_api/woo_orders_api';
import { PageHeader, Shell, SimpleTable, StatCard } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

function money(value, currency = 'LKR') { return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function WooOrderDetailPage() {
  const { id } = useParams();
  const loader = useCallback(() => wooOrdersApi.detail(id), [id]);
  const { data, loading, error } = useApiPage(loader, {});
  const order = data?.data || data || {};
  const items = order?.items || order?.line_items || [];
  return (
    <Shell>
      <PageHeader title={`Woo Order #${order.order_number || id}`} description="Customer, items, payment, shipping and profit data." />
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Status" value={order.status || '-'} />
        <StatCard label="Payment" value={order.payment_status || '-'} />
        <StatCard label="Customer" value={order.customer_name || '-'} />
        <StatCard label="Gross" value={money(order.gross_sales, order.currency)} />
        <StatCard label="Net Sales" value={money(order.net_sales, order.currency)} />
      </div>
      <SimpleTable loading={loading} error="" rows={items} emptyText="No order items found." columns={[
        { key: 'product_name', label: 'Product' }, { key: 'sku', label: 'Woo SKU' }, { key: 'local_sku', label: 'Local SKU' }, { key: 'quantity', label: 'Qty' },
        { key: 'item_total', label: 'Total', render: (row) => money(row.item_total, order.currency) }, { key: 'product_cost', label: 'Product Cost', render: (row) => money(row.product_cost, order.currency) },
      ]} />
    </Shell>
  );
}
