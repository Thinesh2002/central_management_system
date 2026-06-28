import React from 'react';
import { Download } from 'lucide-react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, FilterBar, PageShell, TableCard, usePhase4Page } from './Phase4Shared';

export default function AuditLogsPage() {
  const page = usePhase4Page((filters) => phase4Api.auditLogs(filters), { search: '', limit: 50 });
  function exportCsv() {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const query = new URLSearchParams({ ...page.filters, export: 'csv', limit: 1000 });
    window.open(`${base}/logs/audit?${query.toString()}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <PageShell
      title="Audit Logs"
      description="Track product edits, price changes, stock updates, status changes and system actions."
      actions={<button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950 px-4 text-sm font-bold text-emerald-200 hover:bg-emerald-900"><Download size={15} /> Export CSV</button>}
    >
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
