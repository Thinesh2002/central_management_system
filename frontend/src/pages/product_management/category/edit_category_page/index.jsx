import { useEffect, useState } from "react";
import { ArrowLeft, FolderTree, RefreshCw, Save } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../../../../config/sub_api/product_management_api/category/categories_api";

function extractCategory(res) {
  const payload = res?.data;

  if (!payload) return null;

  if (payload?.data?.row && typeof payload.data.row === "object") {
    return payload.data.row;
  }

  if (payload?.data?.category && typeof payload.data.category === "object") {
    return payload.data.category;
  }

  if (
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    !payload.data.rows &&
    !payload.data.pagination
  ) {
    return payload.data;
  }

  if (payload?.row && typeof payload.row === "object") return payload.row;
  if (payload?.category && typeof payload.category === "object") {
    return payload.category;
  }

  return null;
}

function isValidCategoryId(id) {
  return Boolean(id && /^\d+$/.test(String(id)));
}

function getCategoryCode(category, id) {
  if (
    category?.category_code &&
    String(category.category_code).trim() !== ""
  ) {
    return category.category_code;
  }

  return `CAT-${String(id || 0).padStart(4, "0")}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({
    category_code: "",
    name: "",
    slug: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isValidCategoryId(id)) {
    return <Navigate to="/product/categories" replace />;
  }

  async function loadCategory() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await categoryApi.getById(id);
      const categoryData = extractCategory(res);

      if (!categoryData) {
        setCategory(null);
        setError("Category data not found.");
        return;
      }

      const categoryCode = getCategoryCode(categoryData, id);

      setCategory(categoryData);
      setForm({
        category_code: categoryCode,
        name: categoryData.name || categoryData.category_name || "",
        slug: categoryData.slug || "",
        description: categoryData.description || "",
      });
    } catch (err) {
      setCategory(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load category"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategory();
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "name") {
        next.slug = slugify(value);
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

    if (!form.slug.trim()) {
      setError("Slug is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await categoryApi.update(id, {
        category_code: form.category_code.trim(),
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
      });

      setSuccess("Category updated successfully.");

      setTimeout(() => {
        navigate("/product/categories");
      }, 600);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update category"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/product/categories"
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Category Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-200">
              <FolderTree size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">Edit Category</h1>
              <p className="mt-1 text-sm text-slate-400">
                Update category information.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadCategory}
          disabled={loading || saving}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
          Loading category...
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && success && (
        <div className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {!loading && category && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Category Code
              </label>
              <input
                type="text"
                name="category_code"
                value={form.category_code}
                onChange={handleChange}
                placeholder="CAT-0001"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Category Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Lighting"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Slug
              </label>
              <input
                type="text"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="lighting"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="5"
                placeholder="Category description..."
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/product/categories"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}