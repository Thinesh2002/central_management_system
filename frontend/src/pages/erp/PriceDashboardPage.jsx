import { useEffect, useState } from 'react';
import { Calculator, RefreshCw, Search } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Status({ value }) {
  const key = String(value || 'need_review');
  return <span className={`status-pill status-${key}`}>{key.replaceAll('_', ' ')}</span>;
}

export default function PriceDashboardPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await erpApi.priceDashboard({ search: search || undefined, marketplace: marketplace || undefined, limit: 100 });
      setRows(response.data?.rows || response.data?.data || []);
      setSummary(response.data?.summary || {});
    } catch (err) {
      setError(getApiError(err, 'Price dashboard load failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function recalculate() {
    try {
      setBusy(true);
      setError('');
      setMessage('');
      const response = await erpApi.recalculatePrices();
      const data = response.data?.data || {};
      setMessage(`Price calculation completed. Success: ${data.success_items || 0}, Failed: ${data.failed_items || 0}.`);
      await load();
    } catch (err) {
      setError(getApiError(err, 'Price calculation failed.'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader label="Loading price dashboard..." />;
  if (error && !rows.length) return <ErrorState title="Price dashboard failed" text={error} />;

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Price Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Daraz/Woo price, fees, PPC, promotion, net sales, profit margin and suggested price.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={recalculate} disabled={busy} className="erp-btn-primary"><Calculator size={14} /> Recalculate</button>
          <button onClick={load} className="erp-btn-secondary"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="erp-card"><p className="text-xs text-slate-500">Items</p><p className="mt-2 text-xl font-bold">{summary.total_items || rows.length}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Net sales</p><p className="mt-2 text-xl font-bold">LKR {money(summary.total_net_sales)}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Profit</p><p className="mt-2 text-xl font-bold">LKR {money(summary.total_profit)}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Alerts</p><p className="mt-2 text-xl font-bold">{Number(summary.loss_count || 0) + Number(summary.low_margin_count || 0)}</p></div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="erp-card grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="erp-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU, marketplace SKU or title" />
        </div>
        <select className="erp-input" value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
          <option value="">All marketplace</option>
          <option value="DARAZ">Daraz</option>
          <option value="WOO">Woo</option>
        </select>
        <button className="erp-btn-secondary" type="submit">Search</button>
      </form>

      {!rows.length ? <EmptyState title="No price records" text="Add marketplace listing price data or run sync first." /> : (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>SKU</th><th>Marketplace</th><th>Current</th><th>Fees</th><th>PPC / Promo</th><th>Net Sales</th><th>Profit</th><th>Margin</th><th>Suggested</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || `${row.local_sku}-${row.marketplace}-${row.account_id}`}>
                  <td><div className="font-mono text-yellow-100">{row.local_sku}</div><div className="mt-1 line-clamp-2 max-w-xs text-slate-500">{row.title || row.marketplace_sku}</div></td>
                  <td>{row.marketplace}<div className="text-slate-500">{row.account_code || row.account_id || '-'}</div></td>
                  <td>{row.currency || 'LKR'} {money(row.current_price)}</td>
                  <td>{money(Number(row.marketplace_fee || 0) + Number(row.payment_fee || 0))}</td>
                  <td>{money(row.ppc_cost)} / {money(row.promotion_cost)}</td>
                  <td>{money(row.net_sales)}</td>
                  <td className={Number(row.profit_amount) < 0 ? 'text-red-300' : 'text-emerald-300'}>{money(row.profit_amount)}</td>
                  <td>{money(row.margin_percent)}%</td>
                  <td className="font-bold text-yellow-100">{money(row.suggested_price)}</td>
                  <td><Status value={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
