import React from 'react';
import { Link } from 'react-router-dom';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, money, number, PageShell, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function Phase4ControlCenterPage() {
  const { data, loading, error, reload } = usePhase4Page(() => phase4Api.dashboard());
  const cards = [
    ['Roles', number(data?.roles?.total_roles), 'User access roles'],
    ['Audit 7 Days', number(data?.audit?.audit_count), `${number(data?.audit?.failed_actions)} failed actions`],
    ['Backup 30 Days', number(data?.backup?.backup_runs), `${number(data?.backup?.backup_failed)} failed`],
    ['Net Profit 30 Days', money(data?.profit?.net_profit), `${number(data?.profit?.loss_orders)} loss orders`],
    ['Returns 30 Days', number(data?.returns?.return_count), money(data?.returns?.return_loss)],
    ['Courier Shipments', number(data?.courier?.shipments), `${number(data?.courier?.delivered)} delivered`],
    ['Bulk Jobs', number(data?.bulk?.bulk_jobs), `${number(data?.bulk?.bulk_failed)} failed/partial`],
    ['Quality Avg', `${Number(data?.quality?.avg_score || 0).toFixed(1)}%`, `${number(data?.quality?.need_work)} need work`],
  ];

  return (
    <PageShell title="Phase 4 Control Center" description="System stability, audit, backup, order profit, courier, bulk tools, quality score and queue control." actions={<button onClick={reload} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">Refresh</button>}>
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note]) => <StatCard key={label} label={label} value={loading ? '...' : value} note={note} />)}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TableCard loading={loading} rows={data?.recent_audit || []} emptyText="No audit logs yet." columns={[
          { key: 'module_name', label: 'Module' },
          { key: 'action_name', label: 'Action' },
          { key: 'user_name', label: 'User' },
          { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
          { key: 'created_at', label: 'Time' },
        ]} />
        <TableCard loading={loading} rows={data?.notifications || []} emptyText="No notifications." columns={[
          { key: 'title', label: 'Notification' },
          { key: 'module_name', label: 'Module' },
          { key: 'type', label: 'Type', render: (row) => <Badge value={row.type} /> },
          { key: 'action_route', label: 'Action', render: (row) => row.action_route ? <Link className="text-blue-300" to={row.action_route}>Open</Link> : '-' },
        ]} />
      </div>
    </PageShell>
  );
}
