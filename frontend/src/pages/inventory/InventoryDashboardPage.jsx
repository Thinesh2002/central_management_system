import { useCallback } from 'react';
import inventoryApi from '../../config/sub_api/inventory_api';
import { FilterBar, PageHeader, Shell, SimpleTable, StatCard } from '../business/components/AdminPageShell';
import useApiPage from '../business/hooks/useApiPage';

function n(value) { return Number(value || 0).toLocaleString(); }
function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function InventoryDashboardPage() {
  const loader = useCallback((params) => inventoryApi.dashboard(params), []);
  const { data, loading, error, reload, filters, setFilters } = useApiPage(loader, {});
  const summary = data?.summary || {};
  const recent = data?.recent || [];

  return (
    <Shell>
      <PageHeader title="Inventory Dashboard" description="Local SKU stock, reserved quantity and stock value." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading} />
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Total SKUs" value={n(summary.total_skus)} />
        <StatCard label="Stock Qty" value={n(summary.total_stock_qty)} />
        <StatCard label="Available" value={n(summary.available_stock)} />
        <StatCard label="Reserved" value={n(summary.reserved_stock)} />
        <StatCard label="Low Stock" value={n(summary.low_stock_count)} />
        <StatCard label="Out of Stock" value={n(summary.out_of_stock_count)} />
        <StatCard label="Stock Value" value={money(summary.stock_value)} />
      </div>
      <SimpleTable
        loading={loading}
        error=""
        rows={recent}
        emptyText="No recently updated stock."
        columns={[
          { key: 'sku', label: 'SKU' },
          { key: 'stock_qty', label: 'Stock' },
          { key: 'reserved_qty', label: 'Reserved' },
          { key: 'available_qty', label: 'Available', render: (row) => row.available_qty ?? row.available_qty_calc ?? '-' },
          { key: 'cost_price', label: 'Cost', render: (row) => money(row.cost_price) },
          { key: 'updated_at', label: 'Updated' },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <SimpleTable
          rows={data?.fast_moving_skus || []}
          columns={[{ key: 'sku', label: 'Fast Moving SKU' }, { key: 'moved_qty', label: 'Moved Qty' }, { key: 'movement_count', label: 'Movements' }]}
          emptyText="No movement data yet."
        />
        <SimpleTable
          rows={data?.dead_stock_skus || []}
          columns={[{ key: 'sku', label: 'Dead Stock SKU' }, { key: 'available_qty', label: 'Available' }, { key: 'updated_at', label: 'Last Updated' }]}
          emptyText="No dead stock data yet."
        />
      </div>
    </Shell>
  );
}
