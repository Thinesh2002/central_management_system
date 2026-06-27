import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, FilterBar, money, PageShell, PrimaryButton, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function ReturnsRefundsPage() {
  const page = usePhase4Page((filters) => phase4Api.returns(filters), { search: '', limit: 30 });
  const [form, setForm] = useState({ order_source: 'MANUAL', order_number: '', local_sku: '', refund_amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try { await phase4Api.createReturn(form); setForm({ order_source: 'MANUAL', order_number: '', local_sku: '', refund_amount: '', reason: '' }); page.reload(); } finally { setSaving(false); }
  }

  return (
    <PageShell title="Return & Refund Module" description="Track returned products, refund amount, restock option and actual return loss.">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Returns" value={page.data?.summary?.total_returns || 0} /><StatCard label="Return Loss" value={money(page.data?.summary?.total_loss)} /><StatCard label="Restocked Qty" value={page.data?.summary?.restocked_qty || 0} /></div>
      <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-6">
        {['order_number','local_sku','refund_amount','reason'].map((key) => <input key={key} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder={key.replaceAll('_',' ')} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}
        <select value={form.order_source} onChange={(e) => setForm({ ...form, order_source: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm"><option>MANUAL</option><option>DARAZ</option><option>WOO</option></select>
        <PrimaryButton type="submit" loading={saving}>Create</PrimaryButton>
      </form>
      <FilterBar filters={page.filters} setFilters={page.setFilters} onRefresh={page.reload} loading={page.loading} />
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No returns found." columns={[
        { key: 'return_uid', label: 'Return UID' },
        { key: 'order_source', label: 'Source' },
        { key: 'order_number', label: 'Order' },
        { key: 'local_sku', label: 'SKU' },
        { key: 'refund_amount', label: 'Refund', render: (row) => money(row.refund_amount) },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
      ]} />
    </PageShell>
  );
}
