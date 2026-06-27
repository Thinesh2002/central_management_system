import React from 'react';
import { Link } from 'react-router-dom';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, FilterBar, PageShell, TableCard, usePhase4Page } from './Phase4Shared';

export default function NotificationsPage() {
  const page = usePhase4Page((filters) => phase4Api.notifications(filters), { is_read: '', limit: 50 });
  async function markRead(id) { await phase4Api.markNotificationRead(id, true); page.reload(); }
  return (
    <PageShell title="Notification Center" description="Low stock, token expiry, sync failure, loss making SKU, order delay and missing mapping alerts.">
      <FilterBar filters={page.filters} setFilters={page.setFilters} onRefresh={page.reload} loading={page.loading}>
        <select value={page.filters.is_read} onChange={(e) => page.setFilters((p) => ({ ...p, is_read: e.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm"><option value="">All</option><option value="0">Unread</option><option value="1">Read</option></select>
      </FilterBar>
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No notifications found." columns={[
        { key: 'title', label: 'Title' },
        { key: 'module_name', label: 'Module' },
        { key: 'type', label: 'Type', render: (row) => <Badge value={row.type} /> },
        { key: 'message', label: 'Message' },
        { key: 'action_route', label: 'Open', render: (row) => row.action_route ? <Link className="text-blue-300" to={row.action_route}>Open</Link> : '-' },
        { key: 'is_read', label: 'Action', render: (row) => row.is_read ? <Badge value="read" /> : <button onClick={() => markRead(row.id)} className="text-blue-300">Mark read</button> },
      ]} />
    </PageShell>
  );
}
