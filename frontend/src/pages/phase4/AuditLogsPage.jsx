import React from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, FilterBar, PageShell, TableCard, usePhase4Page } from './Phase4Shared';

export default function AuditLogsPage() {
  const page = usePhase4Page((filters) => phase4Api.auditLogs(filters), { search: '', limit: 50 });
  return (
    <PageShell title="Audit Logs" description="Track product edits, price changes, stock updates, status changes and system actions.">
      <FilterBar filters={page.filters} setFilters={page.setFilters} onRefresh={page.reload} loading={page.loading}>
        <select value={page.filters.status || ''} onChange={(e) => page.setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none"><option value="">All Status</option><option value="success">Success</option><option value="failed">Failed</option></select>
      </FilterBar>
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No audit records found." columns={[
        { key: 'created_at', label: 'Time' },
        { key: 'user_name', label: 'User' },
        { key: 'module_name', label: 'Module' },
        { key: 'action_name', label: 'Action' },
        { key: 'entity_id', label: 'Entity' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
        { key: 'message', label: 'Message' },
      ]} />
    </PageShell>
  );
}
