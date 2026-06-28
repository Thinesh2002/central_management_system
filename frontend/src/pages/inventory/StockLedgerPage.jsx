import { useCallback, useEffect, useState } from 'react';
import { Download, PackageMinus, RefreshCcw, Send } from 'lucide-react';
import inventoryApi from '../../config/sub_api/inventory_api';
import FilterSection, { FilterField, FilterInput, FilterSelect } from '../../components/ui/FilterSection';
import PageLoader from '../../components/ui/PageLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';

function useTable(loader, initialFilters = {}) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async (next = filters) => {
    setLoading(true);
    setError('');
    try {
      const response = await loader(next);
      setRows(response.data?.rows || response.data?.data || []);
      setSummary(response.data?.summary || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }, [loader, filters]);

  return { rows, summary, filters, setFilters, loading, error, reload };
}

function Status({ value }) {
  return <span className={`status-pill status-${value || 'muted'}`}>{value || '-'}</span>;
}

export default function StockLedgerPage() {
  const [tab, setTab] = useState('deductions');
  const loader = useCallback((params) => tab === 'queue' ? inventoryApi.stockPushQueue(params) : inventoryApi.orderStockDeductions(params), [tab]);
  const table = useTable(loader, { page: 1, limit: 50 });

  useEffect(() => {
    table.reload({ page: 1, limit: 50 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function updateFilter(key, value) {
    table.setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function search(event) {
    event.preventDefault();
    table.reload();
  }

  function exportCsv() {
    const endpoint = tab === 'queue' ? '/inventory/stock-push-queue' : '/inventory/order-stock-deductions';
    const query = new URLSearchParams({ ...table.filters, export: 'csv', limit: 1000 });
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${endpoint}?${query.toString()}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Stock Logs</h1>
          <p className="mt-1 text-sm text-slate-500">Daraz/Woo order stock deductions and marketplace stock push queue.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setTab('deductions'); table.setFilters({ page: 1, limit: 50 }); }} className={tab === 'deductions' ? 'erp-btn-primary' : 'erp-btn-secondary'}><PackageMinus size={14} /> Order Deduction Logs</button>
          <button onClick={() => { setTab('queue'); table.setFilters({ page: 1, limit: 50 }); }} className={tab === 'queue' ? 'erp-btn-primary' : 'erp-btn-secondary'}><Send size={14} /> Stock Push Queue</button>
          <button onClick={exportCsv} className="erp-btn-secondary"><Download size={14} /> Export</button>
          <button onClick={() => table.reload()} className="erp-btn-secondary"><RefreshCcw size={14} /> Load</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="erp-card"><p className="text-xs text-slate-500">Total Logs</p><p className="mt-2 text-xl font-bold">{table.summary.total || table.rows.length}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Deducted</p><p className="mt-2 text-xl font-bold text-emerald-300">{table.summary.deducted || 0}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Skipped</p><p className="mt-2 text-xl font-bold text-amber-300">{table.summary.skipped || 0}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Failed</p><p className="mt-2 text-xl font-bold text-red-300">{table.summary.failed || 0}</p></div>
      </div>

      <FilterSection
        title={tab === 'queue' ? 'Search & Filter Stock Push Queue' : 'Search & Filter Stock Deduction Logs'}
        loading={table.loading}
        filterCount={(table.filters.platform ? 1 : 0) + (table.filters.status ? 1 : 0)}
        onSearch={search}
        onClear={() => table.setFilters({ page: 1, limit: 50 })}
      >
        <FilterField label="SKU / Order / Account" icon="sku">
          <FilterInput value={table.filters.search || ''} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Enter SKU, order ID, account" />
        </FilterField>
        <FilterField label="Platform" icon="select">
          <FilterSelect value={table.filters.platform || table.filters.marketplace || ''} onChange={(e) => updateFilter(tab === 'queue' ? 'marketplace' : 'platform', e.target.value)}>
            <option value="">All platforms</option>
            <option value="DARAZ">Daraz</option>
            <option value="WOO">Woo</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Status" icon="select">
          <FilterSelect value={table.filters.status || ''} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All status</option>
            {tab === 'queue' ? <><option value="pending">Pending</option><option value="success">Success</option><option value="failed">Failed</option></> : <><option value="deducted">Deducted</option><option value="skipped">Skipped</option><option value="failed">Failed</option></>}
          </FilterSelect>
        </FilterField>
      </FilterSection>

      {table.loading ? <PageLoader label="Loading stock logs..." /> : table.error ? <ErrorState title="Stock logs failed" text={table.error} /> : !table.rows.length ? <EmptyState title="No stock logs" text="When Daraz/Woo orders sync, stock deduction logs will appear here." /> : (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              {tab === 'queue' ? (
                <tr><th>Date</th><th>SKU</th><th>Marketplace</th><th>Account</th><th>Marketplace SKU</th><th>Qty</th><th>Status</th><th>Error</th></tr>
              ) : (
                <tr><th>Date</th><th>Platform</th><th>Account</th><th>Order</th><th>Marketplace SKU</th><th>Local SKU</th><th>Qty</th><th>Before</th><th>After</th><th>Status</th><th>Reason</th></tr>
              )}
            </thead>
            <tbody>
              {table.rows.map((row) => tab === 'queue' ? (
                <tr key={row.id}><td>{row.created_at}</td><td className="font-mono text-yellow-100">{row.local_sku}</td><td>{row.marketplace}</td><td>{row.account_id || '-'}</td><td>{row.marketplace_sku || '-'}</td><td>{row.requested_qty}</td><td><Status value={row.status} /></td><td className="max-w-sm text-slate-500">{row.error_message || '-'}</td></tr>
              ) : (
                <tr key={row.id}><td>{row.created_at}</td><td>{row.platform}</td><td>{row.account_code || row.account_id || '-'}</td><td>{row.marketplace_order_id}</td><td>{row.marketplace_sku || '-'}</td><td className="font-mono text-yellow-100">{row.local_sku || '-'}</td><td>{row.quantity}</td><td>{row.qty_before}</td><td>{row.qty_after}</td><td><Status value={row.status} /></td><td className="max-w-sm text-slate-500">{row.reason || '-'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
