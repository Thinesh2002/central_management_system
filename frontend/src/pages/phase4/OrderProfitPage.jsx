import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, FilterBar, money, PageShell, PrimaryButton, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function OrderProfitPage() {
  const page = usePhase4Page((filters) => phase4Api.orderProfit(filters), { search: '', limit: 30 });
  const [form, setForm] = useState({ order_source: 'MANUAL', order_id: '', gross_sales: '', product_cost: '', marketplace_fees: '', courier_cost: '', ppc_cost: '', promotion_cost: '' });
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await phase4Api.saveOrderProfit(form);
      setForm({ order_source: 'MANUAL', order_id: '', gross_sales: '', product_cost: '', marketplace_fees: '', courier_cost: '', ppc_cost: '', promotion_cost: '' });
      page.reload();
    } finally { setSaving(false); }
  }

  return (
    <PageShell title="Order Profit Report" description="Calculate real order profit after product cost, marketplace fees, PPC, promotion, courier, packaging and refund.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross Sales" value={money(page.data?.summary?.gross_sales)} />
        <StatCard label="Net Sales" value={money(page.data?.summary?.net_sales)} />
        <StatCard label="Net Profit" value={money(page.data?.summary?.net_profit)} />
        <StatCard label="Loss Orders" value={page.data?.summary?.loss_count || 0} />
      </div>
      <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-4 xl:grid-cols-8">
        {['order_id','gross_sales','product_cost','marketplace_fees','courier_cost','ppc_cost','promotion_cost'].map((key) => <input key={key} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder={key.replaceAll('_',' ')} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}
        <PrimaryButton type="submit" loading={saving}>Save</PrimaryButton>
      </form>
      <FilterBar filters={page.filters} setFilters={page.setFilters} onRefresh={page.reload} loading={page.loading} />
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No profit data found." columns={[
        { key: 'order_source', label: 'Source' },
        { key: 'order_number', label: 'Order' },
        { key: 'account_code', label: 'Account' },
        { key: 'gross_sales', label: 'Gross', render: (row) => money(row.gross_sales) },
        { key: 'product_cost', label: 'Cost', render: (row) => money(row.product_cost) },
        { key: 'net_profit', label: 'Profit', render: (row) => money(row.net_profit) },
        { key: 'margin_percent', label: 'Margin %' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
      ]} />
    </PageShell>
  );
}
