import { useCallback } from 'react';
import inventoryApi from '../../config/sub_api/inventory_api';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../business/components/AdminPageShell';
import useApiPage from '../business/hooks/useApiPage';

function money(value) { return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function InventoryListPage({ type = 'low' }) {
  const isOut = type === 'out';
  const loader = useCallback((params) => isOut ? inventoryApi.outOfStock(params) : inventoryApi.lowStock(params), [isOut]);
  const { rows, loading, error, filters, setFilters, reload } = useApiPage(loader, { page: 1, limit: 50 });
  return (
    <Shell>
      <PageHeader title={isOut ? 'Out of Stock' : 'Low Stock'} description={isOut ? 'SKUs with zero available quantity.' : 'SKUs below low stock alert level.'} />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading} />
      <SimpleTable
        rows={rows}
        loading={loading}
        error={error}
        emptyText={isOut ? 'No out of stock SKUs.' : 'No low stock SKUs.'}
        columns={[
          { key: 'sku', label: 'SKU' },
          { key: 'stock_qty', label: 'Stock' },
          { key: 'reserved_qty', label: 'Reserved' },
          { key: 'available_qty', label: 'Available', render: (row) => row.available_qty ?? row.available_qty_calc ?? '-' },
          { key: 'low_stock_alert_qty', label: 'Alert Qty' },
          { key: 'stock_value', label: 'Value', render: (row) => money(row.stock_value) },
          { key: 'updated_at', label: 'Updated' },
        ]}
      />
    </Shell>
  );
}
