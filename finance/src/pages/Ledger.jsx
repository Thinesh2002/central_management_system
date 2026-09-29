import { useCallback, useEffect, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { financeApi, getApiError } from "../lib/api";
import { isoDate, presetRange } from "../lib/dates";
import { dateLabel, money } from "../lib/format";
import { useSession } from "../components/Session";
import { Alert, Button, Card, EmptyState, Field, inputClass, Modal, Spinner } from "../components/ui";

const PAGE_SIZE = 50;

function toQuery({ from, to, ...rest }) {
  return { ...rest, date_from: from, date_to: to };
}
const PAYMENT_METHODS = ["Cash", "Bank transfer", "Card", "Online payment", "Cheque", "Other"];

function defaultFilters() {
  return { entry_type: "", category_id: "", search: "", ...presetRange("this_month") };
}

export default function LedgerPage() {
  const { access } = useSession();
  const [filters, setFilters] = useState(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ rows: [], total: 0, totals: { income: 0, expense: 0 } });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await financeApi.categories({ include_inactive: 1 });
      setCategories(res.data.data || []);
    } catch (err) {
      setError(getApiError(err, "Could not load categories."));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await financeApi.entries({ ...toQuery(filters), limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setResult(res.data);
    } catch (err) {
      setError(getApiError(err, "Could not load ledger entries."));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce the search box so every keystroke isn't a request.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key === "entry_type" ? { category_id: "" } : {}) }));
    setPage(0);
  };

  const handleSaved = (message) => {
    setEditing(null);
    setNotice(message);
    load();
  };

  const handleDelete = async () => {
    try {
      await financeApi.deleteEntry(deleting.id);
      setDeleting(null);
      setNotice("Entry deleted.");
      load();
    } catch (err) {
      setDeleting(null);
      setError(getApiError(err, "Could not delete the entry."));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await financeApi.entries({ ...toQuery(filters), limit: 1000, offset: 0 });
      const header = ["Date", "Type", "Category", "Amount", "Payment method", "Reference", "Description"];
      const lines = res.data.rows.map((r) =>
        [r.entry_date, r.entry_type, r.category_name || "", r.amount, r.payment_method || "", r.reference || "", r.description || ""]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-ledger_${filters.from || "all"}_${filters.to || "all"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (res.data.total > 1000) setNotice("Exported the latest 1,000 entries. Narrow the date range to export the rest.");
    } catch (err) {
      setError(getApiError(err, "Export failed."));
    }
  };

  const filterCategories = categories.filter((c) => !filters.entry_type || c.entry_type === filters.entry_type);
  const net = result.totals.income - result.totals.expense;
  const pages = Math.max(Math.ceil(result.total / PAGE_SIZE), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Ledger</h1>
          <p className="mt-0.5 text-sm text-neutral-400">Expenses and income that don't come from marketplace orders.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}><Download size={15} /> CSV</Button>
          {access.ledger.edit && (
            <Button onClick={() => setEditing({})}><Plus size={15} /> Add entry</Button>
          )}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && (
        <div onClick={() => setNotice("")}><Alert tone="success">{notice}</Alert></div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Income" value={result.totals.income} tone="text-emerald-300" />
        <Stat label="Expenses" value={result.totals.expense} tone="text-white" />
        <Stat label="Net" value={net} tone={net < 0 ? "text-red-300" : "text-white"} />
      </div>

      <Card>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-neutral-500" />
            <input className={`${inputClass} pl-8`} placeholder="Search…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search entries" />
          </div>
          <select className={inputClass} value={filters.entry_type} onChange={(e) => updateFilter("entry_type", e.target.value)} aria-label="Type">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className={inputClass} value={filters.category_id} onChange={(e) => updateFilter("category_id", e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {filterCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.status === "inactive" ? " (inactive)" : ""}</option>
            ))}
          </select>
          <input type="date" className={inputClass} value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} aria-label="From date" />
          <input type="date" className={inputClass} value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} aria-label="To date" />
        </div>

        {loading && !result.rows.length ? (
          <div className="flex h-40 items-center justify-center"><Spinner /></div>
        ) : result.rows.length === 0 ? (
          <EmptyState>No entries match these filters.</EmptyState>
        ) : (
          <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-neutral-400">
                <tr className="border-b border-neutral-800">
                  <th className="py-2 pr-3 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-left font-medium">Payment</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="w-20 py-2 pl-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {result.rows.map((row) => (
                  <tr key={row.id} className="text-neutral-300 hover:bg-neutral-800/40">
                    <td className="whitespace-nowrap py-2 pr-3">{dateLabel(row.entry_date)}</td>
                    <td className="px-3 py-2">
                      <span className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${row.entry_type === "income" ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-700/60 text-neutral-300"}`}>
                        {row.entry_type}
                      </span>
                      {row.category_name || <span className="text-neutral-500">Uncategorised</span>}
                    </td>
                    <td className="max-w-72 px-3 py-2">
                      <p className="truncate">{row.description || "—"}</p>
                      {row.reference && <p className="truncate text-[11px] text-neutral-500">Ref: {row.reference}</p>}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">{row.payment_method || "—"}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums ${row.entry_type === "income" ? "text-emerald-300" : "text-white"}`}>
                      {row.entry_type === "income" ? "+" : "−"}{money(row.amount)}
                    </td>
                    <td className="py-2 pl-3">
                      <div className="flex justify-end gap-1">
                        {access.ledger.edit && (
                          <button type="button" onClick={() => setEditing(row)} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white" aria-label="Edit entry">
                            <Pencil size={14} />
                          </button>
                        )}
                        {access.ledger.delete && (
                          <button type="button" onClick={() => setDeleting(row)} className="rounded p-1.5 text-neutral-400 hover:bg-red-500/20 hover:text-red-300" aria-label="Delete entry">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
            <span>{result.total.toLocaleString()} entries · page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <EntryModal entry={editing} categories={categories} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      {deleting && (
        <Modal
          title="Delete entry?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            </>
          }
        >
          <p className="text-sm text-neutral-300">
            {deleting.entry_type === "income" ? "Income" : "Expense"} of <span className="font-mono text-white">{money(deleting.amount)}</span> on {dateLabel(deleting.entry_date)}
            {deleting.description ? ` — ${deleting.description}` : ""} will be removed from the ledger and dashboard.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={`mt-1 truncate font-mono text-base font-semibold tabular-nums sm:text-lg ${tone}`}>{money(value)}</p>
    </div>
  );
}

function EntryModal({ entry, categories, onClose, onSaved }) {
  const isNew = !entry.id;
  const [form, setForm] = useState({
    entry_type: entry.entry_type || "expense",
    category_id: entry.category_id ? String(entry.category_id) : "",
    entry_date: entry.entry_date || isoDate(new Date()),
    amount: entry.amount ? String(Number(entry.amount)) : "",
    payment_method: entry.payment_method || "",
    reference: entry.reference || "",
    description: entry.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) =>
    setForm((f) => ({ ...f, [key]: value, ...(key === "entry_type" ? { category_id: "" } : {}) }));

  const options = categories.filter(
    (c) => c.entry_type === form.entry_type && (c.status === "active" || String(c.id) === form.category_id)
  );

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, category_id: form.category_id || null };
      if (isNew) await financeApi.createEntry(payload);
      else await financeApi.updateEntry(entry.id, payload);
      onSaved(isNew ? "Entry added." : "Entry updated.");
    } catch (err) {
      setError(getApiError(err, "Could not save the entry."));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isNew ? "Add ledger entry" : "Edit ledger entry"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="entry-form" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <form id="entry-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-2 gap-1 rounded-md border border-neutral-700 p-1">
          {["expense", "income"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("entry_type", type)}
              className={`rounded py-1.5 text-sm font-medium capitalize ${form.entry_type === type ? (type === "income" ? "bg-emerald-600 text-white" : "bg-orange-500 text-white") : "text-neutral-400 hover:text-white"}`}
              aria-pressed={form.entry_type === type}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (LKR)">
            <input className={inputClass} type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} required />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">Uncategorised</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Payment method">
            <input className={inputClass} list="payment-methods" value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} maxLength={60} />
            <datalist id="payment-methods">
              {PAYMENT_METHODS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>
        </div>

        <Field label="Reference" hint="Invoice, receipt or bank reference number">
          <input className={inputClass} value={form.reference} onChange={(e) => set("reference", e.target.value)} maxLength={120} />
        </Field>
        <Field label="Description">
          <textarea className={`${inputClass} h-20 py-2`} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
        </Field>
      </form>
    </Modal>
  );
}
