import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, PageShell, PrimaryButton, TableCard, usePhase4Page } from './Phase4Shared';

export default function BackupMigrationPage() {
  const backupPage = usePhase4Page((filters) => phase4Api.backups(filters), { limit: 20 });
  const migrationPage = usePhase4Page((filters) => phase4Api.migrations(filters), { limit: 20 });
  const [runningBackup, setRunningBackup] = useState(false);
  const [migration, setMigration] = useState({ migration_name: '', sql_text: '' });
  const [runningMigration, setRunningMigration] = useState(false);

  async function runBackup() {
    setRunningBackup(true);
    try {
      await phase4Api.runBackup({ backup_type: 'manual' });
      backupPage.reload();
    } finally {
      setRunningBackup(false);
    }
  }

  async function runMigration(event) {
    event.preventDefault();
    setRunningMigration(true);
    try {
      await phase4Api.runMigration(migration);
      setMigration({ migration_name: '', sql_text: '' });
      migrationPage.reload();
    } finally {
      setRunningMigration(false);
    }
  }

  return (
    <PageShell title="Backup & Migration Manager" description="Run manual database backups and safe upgrade SQL from one place." actions={<PrimaryButton onClick={runBackup} loading={runningBackup}>Run Backup</PrimaryButton>}>
      <TableCard loading={backupPage.loading} error={backupPage.error} rows={backupPage.rows} emptyText="No backup runs yet." columns={[
        { key: 'backup_uid', label: 'Backup UID' },
        { key: 'backup_type', label: 'Type' },
        { key: 'database_name', label: 'Database' },
        { key: 'file_name', label: 'File' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
        { key: 'message', label: 'Message' },
        { key: 'created_at', label: 'Created' },
      ]} />
      <form onSubmit={runMigration} className="space-y-3 rounded-xl border border-slate-800 bg-[#0b1019] p-4">
        <h2 className="text-sm font-bold text-slate-100">Safe SQL Migration Runner</h2>
        <input className="h-10 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm outline-none" placeholder="Migration name" value={migration.migration_name} onChange={(e) => setMigration({ ...migration, migration_name: e.target.value })} />
        <textarea className="min-h-32 w-full rounded-lg border border-slate-700 bg-[#020617] px-3 py-2 font-mono text-sm outline-none" placeholder="Paste safe SQL here. Dangerous DROP/TRUNCATE commands are blocked." value={migration.sql_text} onChange={(e) => setMigration({ ...migration, sql_text: e.target.value })} />
        <PrimaryButton type="submit" loading={runningMigration}>Run Migration</PrimaryButton>
      </form>
      <TableCard loading={migrationPage.loading} error={migrationPage.error} rows={migrationPage.rows} emptyText="No migrations yet." columns={[
        { key: 'migration_name', label: 'Migration' },
        { key: 'migration_uid', label: 'UID' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
        { key: 'message', label: 'Message' },
        { key: 'created_at', label: 'Created' },
      ]} />
    </PageShell>
  );
}
