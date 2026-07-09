import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../../../../config/sub_api/product_management_api/category/categories_api";

function getCategory(res) {
  return res.data?.data || res.data?.category || res.data?.row || res.data;
}

export default function CategoryDeletePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function loadCategory() {
    try {
      setLoading(true);
      setError("");

      const res = await categoryApi.getById(id);
      setCategory(getCategory(res));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Category load failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setError("");

      await categoryApi.delete(id);

      navigate("/product/categories");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Category delete failed"
      );
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadCategory();
  }, [id]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/product/categories"
          className="mb-2 inline-block text-sm text-slate-400 hover:text-white"
        >
          ← Back to Category Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-white">Delete Category</h1>
        <p className="mt-1 text-sm text-slate-400">
          Confirm before deleting this category.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="max-w-2xl rounded-2xl border border-red-900 bg-red-950/40 p-5">
        <div className="flex gap-4">
          <div className="h-fit rounded-xl bg-red-950 p-3 text-red-300">
            <AlertTriangle size={28} />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">
              Are you sure you want to delete this category?
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              This action may affect products linked to this category. Check
              before deleting.
            </p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
              {loading ? (
                <p className="text-sm text-slate-400">Loading category...</p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Category
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {category?.category_name || category?.name || "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    ID: {category?.id || category?.category_id || id}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Slug: {category?.slug || "-"}
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[12px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                <Trash2 size={18} />
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>

              <Link
                to="/product/categories"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}