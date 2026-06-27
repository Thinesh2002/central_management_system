import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, money, PageShell, PrimaryButton, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function CourierDashboardPage() {
  const page = usePhase4Page(() => phase4Api.courier());
  const [account, setAccount] = useState({ courier_code: '', courier_name: '' });
  const [shipment, setShipment] = useState({ order_number: '', tracking_number: '', customer_name: '', cod_amount: '' });
  const [saving, setSaving] = useState(false);

  async function saveAccount(event) {
    event.preventDefault(); setSaving(true);
    try { await phase4Api.createCourierAccount(account); setAccount({ courier_code: '', courier_name: '' }); page.reload(); } finally { setSaving(false); }
  }
  async function saveShipment(event) {
    event.preventDefault(); setSaving(true);
    try { await phase4Api.createShipment(shipment); setShipment({ order_number: '', tracking_number: '', customer_name: '', cod_amount: '' }); page.reload(); } finally { setSaving(false); }
  }

  return (
    <PageShell title="Courier & COD Dashboard" description="Courier accounts, shipments, waybill tracking and COD reconciliation base module.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Shipments" value={page.data?.summary?.shipments || 0} />
        <StatCard label="Delivered" value={page.data?.summary?.delivered || 0} />
        <StatCard label="Returned" value={page.data?.summary?.returned || 0} />
        <StatCard label="COD Collected" value={money(page.data?.summary?.collected_amount)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={saveAccount} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-3">
          <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Courier code" value={account.courier_code} onChange={(e) => setAccount({ ...account, courier_code: e.target.value })} />
          <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Courier name" value={account.courier_name} onChange={(e) => setAccount({ ...account, courier_name: e.target.value })} />
          <PrimaryButton type="submit" loading={saving}>Save Courier</PrimaryButton>
        </form>
        <form onSubmit={saveShipment} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-5">
          {['order_number','tracking_number','customer_name','cod_amount'].map((key) => <input key={key} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder={key.replaceAll('_',' ')} value={shipment[key]} onChange={(e) => setShipment({ ...shipment, [key]: e.target.value })} />)}
          <PrimaryButton type="submit" loading={saving}>Create Shipment</PrimaryButton>
        </form>
      </div>
      <TableCard loading={page.loading} error={page.error} rows={page.data?.shipments || []} emptyText="No shipments found." columns={[
        { key: 'order_number', label: 'Order' },
        { key: 'courier_name', label: 'Courier' },
        { key: 'tracking_number', label: 'Tracking' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'cod_amount', label: 'COD', render: (row) => money(row.cod_amount) },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
      ]} />
    </PageShell>
  );
}
