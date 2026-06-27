import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, PageShell, PrimaryButton, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function BulkToolsPage() {
  const page = usePhase4Page((filters) => phase4Api.bulkJobs(filters), { limit: 30 });
  const [form, setForm] = useState({ job_type: 'product_import', file_name: '', total_rows: '' });
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try { await phase4Api.createBulkJob(form); setForm({ job_type: 'product_import', file_name: '', total_rows: '' }); page.reload(); } finally { setSaving(false); }
  }
  return (
    <PageShell title="Bulk Tools" description="Base for CSV/Excel product, stock, price, image import and report export logs.">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Jobs" value={page.data?.summary?.total_jobs || 0} /><StatCard label="Success Rows" value={page.data?.summary?.success_rows || 0} /><StatCard label="Failed Rows" value={page.data?.summary?.failed_rows || 0} /></div>
      <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-4">
        <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm"><option value="product_import">Product Import</option><option value="stock_import">Stock Import</option><option value="price_import">Price Import</option><option value="image_import">Image Import</option><option value="sales_export">Sales Export</option><option value="inventory_export">Inventory Export</option></select>
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="File name" value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} />
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Total rows" value={form.total_rows} onChange={(e) => setForm({ ...form, total_rows: e.target.value })} />
        <PrimaryButton type="submit" loading={saving}>Create Job</PrimaryButton>
      </form>
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No bulk jobs found." columns={[
        { key: 'job_uid', label: 'Job UID' },
        { key: 'job_type', label: 'Type' },
        { key: 'file_name', label: 'File' },
        { key: 'total_rows', label: 'Rows' },
        { key: 'success_rows', label: 'Success' },
        { key: 'failed_rows', label: 'Failed' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
      ]} />
    </PageShell>
  );
}
