import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getApiError } from '../../config/api';

export function money(value, currency = 'LKR') {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function number(value) {
  return Number(value || 0).toLocaleString();
}

export function Badge({ value }) {
  const status = String(value || '').toLowerCase();
  const tone = status.includes('fail') || status.includes('loss') || status.includes('bad') || status.includes('critical')
    ? 'border-red-800 bg-red-950/40 text-red-300'
    : status.includes('pending') || status.includes('warning') || status.includes('review') || status.includes('need')
      ? 'border-amber-800 bg-amber-950/40 text-amber-300'
      : 'border-emerald-800 bg-emerald-950/40 text-emerald-300';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${tone}`}>{value || '-'}</span>;
}

export function PageShell({ title, description, actions, children }) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="border-b border-slate-800 bg-[#0b1019] px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">{title}</h1>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
      <div className="space-y-4 p-3 lg:p-5">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b1019] p-4 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-slate-700">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value ?? '-'}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function StateBlock({ loading, error, empty, emptyText = 'No data found.' }) {
  if (loading) return <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-slate-400"><RefreshCw size={16} className="animate-spin" /> Loading...</div>;
  if (error) return <div className="m-4 flex gap-2 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300"><AlertTriangle size={16} /> {error}</div>;
  if (empty) return <div className="p-8 text-center text-sm font-semibold text-slate-500">{emptyText}</div>;
  return null;
}

export function TableCard({ columns, rows, loading, error, emptyText }) {
  const hasRows = Array.isArray(rows) && rows.length > 0;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1019]">
      {!hasRows || loading || error ? <StateBlock loading={loading} error={error} empty={!loading && !error && !hasRows} emptyText={emptyText} /> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 bg-[#111827] text-xs uppercase tracking-wide text-slate-400">
              <tr>{columns.map((column) => <th className="px-4 py-3 text-left font-bold" key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row, index) => (
                <tr key={row.id || row.local_sku || row.job_uid || row.return_uid || index} className="hover:bg-[#111827]">
                  {columns.map((column) => <td key={column.key} className="px-4 py-3 align-top text-slate-300">{column.render ? column.render(row, index) : (row[column.key] ?? '-')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function FilterBar({ filters, setFilters, onRefresh, loading, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#0b1019] p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60">
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>
  );
}

export function PrimaryButton({ children, onClick, loading, type = 'button' }) {
  return <button type={type} onClick={onClick} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-60">{loading ? 'Please wait...' : children}</button>;
}

export function usePhase4Page(loader, initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async (overrideFilters) => {
    const activeFilters = overrideFilters || filters;
    setLoading(true);
    setError('');
    try {
      const response = await loaderRef.current(activeFilters);
      const payload = response?.data || response || {};
      const payloadData = payload.data || payload;
      const nextRows = payload.rows || payloadData.rows || (Array.isArray(payloadData) ? payloadData : []);
      setData(payloadData);
      setRows(Array.isArray(nextRows) ? nextRows : []);
      setPagination(payload.pagination || payloadData.pagination || {});
    } catch (error) {
      setError(getApiError(error));
      setData(null);
      setRows([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(filters);
  }, [JSON.stringify(filters)]);

  return useMemo(() => ({ filters, setFilters, data, rows, pagination, loading, error, reload: () => load(filters) }), [filters, data, rows, pagination, loading, error, load]);
}
