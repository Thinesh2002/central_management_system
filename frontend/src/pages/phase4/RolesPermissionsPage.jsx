import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, PageShell, PrimaryButton, TableCard, usePhase4Page } from './Phase4Shared';

export default function RolesPermissionsPage() {
  const page = usePhase4Page(() => phase4Api.roles());
  const [form, setForm] = useState({ role_code: '', role_name: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function saveRole(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await phase4Api.createRole(form);
      setForm({ role_code: '', role_name: '', description: '' });
      page.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Roles & Permissions" description="Create professional roles and keep action permissions separated by module.">
      <form onSubmit={saveRole} className="grid gap-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4 md:grid-cols-4">
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Role code" value={form.role_code} onChange={(e) => setForm({ ...form, role_code: e.target.value })} />
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Role name" value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} />
        <input className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none md:col-span-1" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <PrimaryButton type="submit" loading={saving}>Save Role</PrimaryButton>
      </form>
      <div className="grid gap-4 xl:grid-cols-2">
        <TableCard loading={page.loading} error={page.error} rows={page.data?.roles || []} emptyText="No roles found." columns={[
          { key: 'role_code', label: 'Role Code' },
          { key: 'role_name', label: 'Name' },
          { key: 'permission_count', label: 'Permissions' },
          { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
        ]} />
        <TableCard loading={page.loading} rows={page.data?.permissions || []} emptyText="No permissions found." columns={[
          { key: 'module_name', label: 'Module' },
          { key: 'permission_code', label: 'Code' },
          { key: 'permission_name', label: 'Permission' },
          { key: 'action_name', label: 'Action' },
        ]} />
      </div>
    </PageShell>
  );
}
