import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { financeApi, getApiError } from "../lib/api";
import { useSession } from "../components/Session";
import { Alert, Button, Card, EmptyState, Field, inputClass, Modal, Spinner } from "../components/ui";

export default function CategoriesPage() {
  const { access } = useSession();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.categories({ include_inactive: 1 });
      setCategories(res.data.data || []);
    } catch (err) {
      setError(getApiError(err, "Could not load categories."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (category) => {
    try {
      await financeApi.updateCategory(category.id, { status: category.status === "active" ? "inactive" : "active" });
      load();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    try {
      const res = await financeApi.deleteCategory(category.id);
      setNotice(res.data.message);
      load();
    } catch (err) {
      setError(getApiError(err, "Could not delete the category."));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Categories</h1>
          <p className="mt-0.5 text-sm text-slate-400">Group ledger entries for the dashboard breakdowns.</p>
        </div>
        {access.ledger.edit && <Button onClick={() => setEditing({})}><Plus size={15} /> Add category</Button>}
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {["expense", "income"].map((type) => {
            const rows = categories.filter((c) => c.entry_type === type);
            return (
              <Card key={type} title={type === "expense" ? "Expense categories" : "Income categories"}>
                {rows.length === 0 ? (
                  <EmptyState>No categories yet.</EmptyState>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {rows.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className={`truncate text-sm ${c.status === "active" ? "text-slate-200" : "text-slate-500 line-through"}`}>{c.name}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {c.entry_count} {Number(c.entry_count) === 1 ? "entry" : "entries"}
                            {c.description ? ` · ${c.description}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {access.ledger.edit && (
                            <>
                              <button type="button" onClick={() => toggleStatus(c)} className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-white">
                                {c.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label={`Edit ${c.name}`}>
                                <Pencil size={14} />
                              </button>
                            </>
                          )}
                          {access.ledger.delete && (
                            <button type="button" onClick={() => remove(c)} className="rounded p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300" aria-label={`Delete ${c.name}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <CategoryModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            load();
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({ category, onClose, onSaved }) {
  const isNew = !category.id;
  const [form, setForm] = useState({
    name: category.name || "",
    entry_type: category.entry_type || "expense",
    description: category.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isNew) await financeApi.createCategory(form);
      else await financeApi.updateCategory(category.id, form);
      onSaved(isNew ? "Category added." : "Category updated.");
    } catch (err) {
      setError(getApiError(err, "Could not save the category."));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isNew ? "Add category" : "Edit category"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="category-form" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Name">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required autoFocus />
        </Field>
        <Field label="Type" hint={!isNew && Number(category.entry_count) > 0 ? "Type can't change once a category has entries." : undefined}>
          <select
            className={inputClass}
            value={form.entry_type}
            onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
            disabled={!isNew && Number(category.entry_count) > 0}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </Field>
        <Field label="Description">
          <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={255} />
        </Field>
      </form>
    </Modal>
  );
}
