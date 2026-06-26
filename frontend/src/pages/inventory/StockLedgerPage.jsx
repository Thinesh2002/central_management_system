import { useCallback } from 'react';
import inventoryApi from '../../config/sub_api/inventory_api';
import { FilterBar, PageHeader, Shell, SimpleTable } from '../business/components/AdminPageShell';
import useApiPage from '../business/hooks/useApiPage';

export default function StockLedgerPage() {
  const loader = useCallback((params) => inventoryApi.ledger(params), []);
  const { rows, loading, error, filters, setFilters, reload } = useApiPage(loader, { page: 1, limit: 50 });
  return (
    <Shell>
      <PageHeader title="Stock Movements" description="Complete inventory stock movement ledger." />
      <FilterBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading}>
        <select value={filters.movement_type || ''} onChange={(e) => setFilters((p) => ({ ...p, movement_type: e.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100">
          <option value="">All movement types</option>
          {['IN','OUT','ADJUSTMENT','RETURN','DAMAGE','RESERVED','RELEASED'].map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </FilterBar>
      <SimpleTable
        rows={rows}
        loading={loading}
        error={error}
        emptyText="No stock movement found."
        columns={[
          { key: 'created_at', label: 'Date' },
          { key: 'sku', label: 'SKU' },
          { key: 'movement_type', label: 'Type' },
          { key: 'reference_type', label: 'Reference' },
          { key: 'qty_before', label: 'Before' },
          { key: 'qty_change', label: 'Change' },
          { key: 'qty_after', label: 'After' },
          { key: 'note', label: 'Note' },
        ]}
      />
    </Shell>
  );
}
