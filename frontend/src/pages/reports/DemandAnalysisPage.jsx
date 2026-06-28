import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterSection, { FilterField, FilterInput, FilterSelect } from '../../components/ui/FilterSection';

function n(value) {
  return Number(value || 0).toLocaleString();
}

function Status({ value }) {
  return (
    <span className={`status-pill status-${value || 'muted'}`}>
      {String(value || '-').replaceAll('_', ' ')}
    </span>
  );
}

const defaultFilters = {
  search: '',
  priority: '',
  stock_status: '',
  min_sales_30: '',
  min_reorder_qty: '',
  safety_days: 7,
};

export default function DemandAnalysisPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const out = { limit: 300, safety_days: filters.safety_days || 7 };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) out[key] = value;
    });
    return out;
  }, [filters]);

  async function load(nextParams = params) {
    try {
      setLoading(true);
      setError('');
      const response = await erpApi.demandAnalysis(nextParams);
      setRows(response.data?.rows || response.data?.data || []);
    } catch (err) {
      setError(getApiError(err, 'Demand analysis failed.'));
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => load(params), 400);
    return () => window.clearTimeout(timer);
  }, [params]);

  if (loading && !rows.length) return <PageLoader label="Loading demand analysis..." />;
  if (error && !rows.length) return <ErrorState title="Demand analysis failed" text={error} />;

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Demand Analysis</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search SKU/product, filter priority, and calculate reorder quantity using 30/60/90 days sales.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400">
          <Filter size={14} /> {rows.length} SKU rows
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

      <FilterSection
        title="Search & Filter Demand Analysis"
        loading={loading}
        filterCount={Object.entries(filters).filter(([key, value]) => key !== 'safety_days' && value).length}
        onSearch={(event) => { event.preventDefault(); load(params); }}
        onClear={resetFilters}
        onOpenFilters={() => {}}
      >
        <FilterField label="SKU / Product" icon="sku">
          <FilterInput value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search SKU or product name" />
        </FilterField>
        <FilterField label="Priority" icon="select">
          <FilterSelect value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
            <option value="">All priority</option>
            <option value="urgent">Urgent</option>
            <option value="need_order">Need Order</option>
            <option value="good">Good</option>
            <option value="slow_moving">Slow Moving</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Stock" icon="select">
          <FilterSelect value={filters.stock_status} onChange={(event) => updateFilter('stock_status', event.target.value)}>
            <option value="">All stock</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="low_stock">Low stock</option>
            <option value="in_stock">In stock</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Min 30D Sales" icon="select">
          <FilterInput type="number" min="0" value={filters.min_sales_30} onChange={(event) => updateFilter('min_sales_30', event.target.value)} placeholder="Min 30D sales" />
        </FilterField>
        <FilterField label="Min Reorder" icon="select">
          <FilterInput type="number" min="0" value={filters.min_reorder_qty} onChange={(event) => updateFilter('min_reorder_qty', event.target.value)} placeholder="Min reorder qty" />
        </FilterField>
      </FilterSection>

      {!rows.length ? (
        <EmptyState title="No demand data" text="Try changing the filters or import marketplace sales data first." />
      ) : (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>30D</th>
                <th>60D</th>
                <th>90D</th>
                <th>Available</th>
                <th>Lead Time</th>
                <th>Reorder Qty</th>
                <th>Priority</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.local_sku}>
                  <td>
                    <Link className="font-mono text-yellow-100 hover:underline" to={`/reports/sku-economics/${encodeURIComponent(row.local_sku)}`}>
                      {row.local_sku}
                    </Link>
                  </td>
                  <td className="max-w-xs">{row.product_name || '-'}</td>
                  <td>{n(row.sales_30_days)}</td>
                  <td>{n(row.sales_60_days)}</td>
                  <td>{n(row.sales_90_days)}</td>
                  <td>{n(row.available_stock)}</td>
                  <td>{row.supplier_lead_time_days} days</td>
                  <td className="font-bold text-yellow-100">{n(row.suggested_reorder_qty)}</td>
                  <td><Status value={row.priority} /></td>
                  <td className="text-slate-500">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
