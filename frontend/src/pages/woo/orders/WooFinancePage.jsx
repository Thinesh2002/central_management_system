import { useCallback } from 'react';
import wooOrdersApi from '../../../config/sub_api/woo_api/woo_orders_api';
import { FilterBar, PageHeader, Shell, StatCard } from '../../business/components/AdminPageShell';
import useApiPage from '../../business/hooks/useApiPage';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function n(value) { return Number(value || 0).toLocaleString(); }

export default function WooFinancePage() {
  const loader = useCallback((params) => wooOrdersApi.financeSummary(params), []);
  const { data, loading, error, filters, setFilters, reload } = useApiPage(loader, {});
  const summary = data || {};
  return (
    <Shell>
      <PageHeader title="Woo Finance" description="WooCommerce sales, discounts, refunds and net sales." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading} />
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Orders" value={n(summary.total_orders)} />
        <StatCard label="Gross Sales" value={money(summary.gross_sales)} />
        <StatCard label="Discounts" value={money(summary.discounts)} />
        <StatCard label="Refunds" value={money(summary.refunds)} />
        <StatCard label="Shipping" value={money(summary.shipping_total)} />
        <StatCard label="Net Sales" value={money(summary.net_sales)} />
      </div>
    </Shell>
  );
}
