import { AlertTriangle, RefreshCw } from 'lucide-react';

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-800 bg-[#0b1019] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-bold text-slate-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b1019] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value ?? '-'}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function DataState({ loading, error, empty, emptyText = 'No records found.' }) {
  if (loading) {
    return <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-slate-400"><RefreshCw size={16} className="animate-spin" /> Loading...</div>;
  }
  if (error) {
    return <div className="m-4 flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300"><AlertTriangle size={16} /> {error}</div>;
  }
  if (empty) {
    return <div className="p-8 text-center text-sm font-semibold text-slate-500">{emptyText}</div>;
  }
  return null;
}

export function FilterBar({ filters, setFilters, onRefresh, loading, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#0b1019] p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.search || ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
          placeholder="Search..."
          className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-700"
        />
        <input
          type="date"
          value={filters.date_from || ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value, page: 1 }))}
          className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-blue-700"
        />
        <input
          type="date"
          value={filters.date_to || ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value, page: 1 }))}
          className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-blue-700"
        />
        {children}
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60">
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>
  );
}

export function SimpleTable({ columns, rows, loading, error, emptyText }) {
  const state = <DataState loading={loading} error={error} empty={!loading && !error && (!rows || rows.length === 0)} emptyText={emptyText} />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1019]">
      {(loading || error || !rows || rows.length === 0) ? state : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 bg-[#111827] text-xs uppercase tracking-wide text-slate-400">
              <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 text-left font-bold">{column.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row, rowIndex) => (
                <tr key={row.id || row.sku || row.order_number || rowIndex} className="hover:bg-[#111827]">
                  {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-300">{column.render ? column.render(row, rowIndex) : (row[column.key] ?? '-')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }) {
  return <div className="min-h-screen bg-[#020617] text-slate-100"><div className="space-y-4 p-3 lg:p-5">{children}</div></div>;
}
