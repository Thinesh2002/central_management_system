import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { categoryApi } from "../../../../config/sub_api/product_management_api/category/categories_api";

function getCategory(res) {
  return res.data?.data || res.data?.category || res.data?.row || res.data;
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
        {value === null || value === undefined || value === "" ? "-" : String(value)}
      </p>
    </div>
  );
}

export default function CategoryViewPage() {
  const { id } = useParams();

  const [category, setCategory] = useState(null);
  const [error, setError] = useState("");

  async function loadCategory() {
    try {
      setError("");

      const res = await categoryApi.getById(id);
      setCategory(getCategory(res));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Category view failed"
      );
    }
  }

  useEffect(() => {
    loadCategory();
  }, [id]);

  if (!category && !error) {
    return <div className="p-6 text-slate-400">Loading category...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/product/categories"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-white"
          >
            ← Back to Category Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-white">View Category</h1>
          <p className="mt-1 text-sm text-slate-400">
            Check full category details.
          </p>
        </div>

        <Link
          to={`/product/categories/delete/${id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950"
        >
          <Trash2 size={18} />
          Delete
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {category && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Info label="ID" value={category.id || category.category_id} />
            <Info
              label="Category Name"
              value={category.category_name || category.name}
            />
            <Info label="Slug" value={category.slug} />
            <Info label="Created At" value={category.created_at} />
            <Info label="Updated At" value={category.updated_at} />

            <div className="md:col-span-2">
              <Info label="Description" value={category.description} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}