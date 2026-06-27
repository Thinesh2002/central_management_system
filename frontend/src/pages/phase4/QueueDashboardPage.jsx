import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, PageShell, PrimaryButton, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function QueueDashboardPage() {
  const page = usePhase4Page((filters) => phase4Api.queues(filters), { limit: 30 });
  const [form, setForm] = useState({ module_name: 'system', job_type: 'manual_job', priority: 'normal' });
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try { await phase4Api.createQueueJob(form); setForm({ module_name: 'system', job_type: 'manual_job', priority: 'normal' }); page.reload(); } finally { setSaving(false); }
  }
  return (
    <PageShell title="Sync Queue Dashboard" description="Keep heavy sync jobs in queue and show only clean success/failure summaries in terminal.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Jobs" value={page.data?.summary?.total_jobs || 0} />
        <StatCard label="Pending" value={page.data?.summary?.pending || 0} />
        <StatCard label="Running" value={page.data?.summary?.running || 0} />
        <StatCard label="Failed" value={page.data?.summary?.failed || 0} />
      </div>
      <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-4">
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Module" value={form.module_name} onChange={(e) => setForm({ ...form, module_name: e.target.value })} />
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Job type" value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
        <PrimaryButton type="submit" loading={saving}>Create Queue Job</PrimaryButton>
      </form>
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No queue jobs found." columns={[
        { key: 'queue_uid', label: 'Queue UID' },
        { key: 'module_name', label: 'Module' },
        { key: 'job_type', label: 'Job Type' },
        { key: 'priority', label: 'Priority', render: (row) => <Badge value={row.priority} /> },
        { key: 'attempt_count', label: 'Attempts' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
        { key: 'message', label: 'Message' },
      ]} />
    </PageShell>
  );
}
