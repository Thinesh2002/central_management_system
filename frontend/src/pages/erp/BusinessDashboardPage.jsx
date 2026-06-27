import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, RefreshCw, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import ErrorState from '../../components/ui/ErrorState';

function money(value) {
  return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function num(value) {
  return Number(value || 0).toLocaleString();
}

function StatCard({ title, value, note, icon: Icon }) {
  return (
    <div className="erp-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
        </div>
        {Icon && <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-yellow-200"><Icon size={18} /></div>}
      </div>
    </div>
  );
}

function MiniLineChart({ rows = [] }) {
  const points = rows.map((row) => Number(row.net_sales || row.gross_sales || 0));
  const max = Math.max(...points, 1);
  const width = 640;
  const height = 180;
  const path = points.map((value, index) => {
    const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - (value / max) * (height - 20) - 10;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  return (
    <div className="erp-card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Business report</h2>
          <p className="text-xs text-slate-500">Daily net sales line chart</p>
        </div>
        <TrendingUp size={18} className="text-yellow-200" />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#070B14] p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
          <line x1="0" y1={height - 12} x2={width} y2={height - 12} stroke="currentColor" className="text-slate-700" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-300" />
          {points.map((value, index) => {
            const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
            const y = height - (value / max) * (height - 20) - 10;
            return <circle key={index} cx={x} cy={y} r="3" fill="currentColor" className="text-yellow-200" />;
          })}
        </svg>
      </div>
    </div>
  );
}

export default function BusinessDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await erpApi.businessDashboard();
      setData(response.data?.data || {});
    } catch (err) {
      setError(getApiError(err, 'Dashboard load failed.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const summary = data?.summary || {};
  const inventory = data?.inventory || {};
  const sync = data?.sync || {};
  const notifications = data?.notifications || [];

  const quickLinks = useMemo(() => [
    { to: '/price-dashboard', title: 'Price Dashboard', note: 'Profit, margin, suggested price' },
    { to: '/image-dashboard', title: 'Image Dashboard', note: 'Missing / low quality image checks' },
    { to: '/inventory/sku-search', title: 'SKU Search', note: 'Stock, sales and marketplace report' },
    { to: '/reports/demand-analysis', title: 'Demand Analysis', note: 'Next stock order suggestion' },
  ], []);

  if (loading) return <PageLoader label="Loading business dashboard..." />;
  if (error) return <ErrorState title="Dashboard failed" text={error} />;

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Central Business Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Today sales, Daraz/Woo new orders, delivered sales, stock alerts and sync status.</p>
        </div>
        <button onClick={load} className="erp-btn-secondary"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today sales" value={money(summary.today_sales || 0)} note={`Daraz: ${money(summary.daraz_today_sales)} | Woo: ${money(summary.woo_today_sales)}`} icon={ShoppingBag} />
        <StatCard title="30 days sales" value={money(summary.total_sales)} note={`Daraz: ${money(summary.daraz_30_days_sales)} | Woo: ${money(summary.woo_30_days_sales)}`} icon={Wallet} />
        <StatCard title="Delivered sales" value={money(summary.delivered_30_days_sales || summary.net_sales)} note="Delivered/completed last 30 days" icon={TrendingUp} />
        <StatCard title="New orders" value={num(summary.new_orders_24h)} note={`Today orders: ${num(summary.order_count)}`} icon={ShoppingBag} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Low stock" value={num(inventory.low_stock_count)} note="Need purchase check" icon={AlertTriangle} />
        <StatCard title="Out of stock" value={num(inventory.out_of_stock_count)} note="Urgent listing risk" icon={AlertTriangle} />
        <StatCard title="Sync summary" value={`${num(sync.success_count)} / ${num(sync.failed_count)}`} note="Success / failure last 24 hours" icon={RefreshCw} />
        <StatCard title="Stock value" value={money(inventory.stock_value)} note={`Available: ${num(inventory.available_stock)}`} icon={Boxes} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <MiniLineChart rows={data?.daily_sales || []} />
        <div className="erp-card">
          <h2 className="text-sm font-bold text-slate-100">Notifications</h2>
          <div className="mt-3 space-y-2">
            {notifications.length ? notifications.map((item) => (
              <div key={item.id} className="erp-card-soft">
                <p className="text-xs font-bold text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.message}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No unread notifications.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="erp-card block">
            <p className="text-sm font-bold text-slate-100">{link.title}</p>
            <p className="mt-1 text-xs text-slate-500">{link.note}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
