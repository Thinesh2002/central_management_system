import { useState } from "react";
import { Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { categoryApi } from "../../../../config/sub_api/product_management_api/category/categories_api";

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(name, value) {
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "name" && !prev.slug) {
        next.slug = makeSlug(value);
      }

      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await categoryApi.create({
        name: form.name.trim(),
        slug: form.slug.trim() || makeSlug(form.name),
        description: form.description.trim(),
      });

      navigate("/product/categories");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Category create failed"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/product/categories"
          className="mb-2 inline-block text-sm text-slate-400 hover:text-white"
        >
          ← Back to Category Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-white">Create Category</h1>
        <p className="mt-1 text-sm text-slate-400">
          Add a new product category.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">
              Category Name <b className="text-red-400">*</b>
            </span>

            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Example: Wall Lights"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Slug</span>

            <input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="wall-lights"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-slate-300">
              Description
            </span>

            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Write category description..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            to="/product/categories"
            className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Category"}
          </button>
        </div>
      </form>
    </div>
  );
}