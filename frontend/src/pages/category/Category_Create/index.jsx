import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../config/api";

export default function CategoryCreate() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    category_code: "",
    category_name: "",
    created_by: "admin"
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {

      await API.post("/categories", {
        category_code: form.category_code,
        category_name: form.category_name,
        created_by: form.created_by
      });

      navigate("/category-view");

    } catch (err) {
      console.error(err.response?.data || err.message);
      setLoading(false);
    }
  };

  const input =
    "w-full border border-slate-700 bg-slate-900 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-slate-500";

  return (
    <div className="min-h-screen bg-[#020617] text-white flex justify-center items-center p-6">

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold">Create Category</h1>
          <p className="text-sm text-slate-400">
            Add a new category to the system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            placeholder="Category Code"
            className={input}
            value={form.category_code}
            onChange={(e) =>
              handleChange("category_code", e.target.value.toUpperCase())
            }
            required
          />

          <input
            placeholder="Category Name"
            className={input}
            value={form.category_name}
            onChange={(e) =>
              handleChange("category_name", e.target.value)
            }
            required
          />

          <div className="flex justify-end gap-3 pt-4">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-white text-black rounded-lg font-medium hover:opacity-90"
            >
              {loading ? "Creating..." : "Create Category"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}