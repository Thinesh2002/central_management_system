import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../../config/api";

export default function SubCategoryCreate() {

  const { categoryCode } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    sub_category_code: "",
    sub_category_name: "",
    category_code: categoryCode || "",
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

    try {

      setLoading(true);

      await API.post("/sub-categories", {
        sub_category_code: form.sub_category_code,
        sub_category_name: form.sub_category_name,
        category_code: form.category_code,
        created_by: form.created_by
      });

      navigate("/category-view");

    } catch (err) {
      alert(err.response?.data?.message || "Create failed");
      setLoading(false);
    }
  };

  const input =
    "w-full border border-slate-700 bg-slate-900 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-slate-500";

  return (
    <div className="min-h-screen bg-[#020617] text-white flex justify-center items-center p-6">

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold">Create Sub Category</h1>
          <p className="text-sm text-slate-400">
            Add sub category to parent category
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* PARENT CATEGORY */}
          <input
            className={`${input} bg-slate-800`}
            value={form.category_code}
            disabled
          />

          {/* SUB CATEGORY CODE */}
          <input
            placeholder="Sub Category Code"
            className={input}
            value={form.sub_category_code}
            onChange={(e) =>
              handleChange(
                "sub_category_code",
                e.target.value.toUpperCase()
              )
            }
            required
          />

          {/* SUB CATEGORY NAME */}
          <input
            placeholder="Sub Category Name"
            className={input}
            value={form.sub_category_name}
            onChange={(e) =>
              handleChange(
                "sub_category_name",
                e.target.value
              )
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
              {loading ? "Creating..." : "Create Sub Category"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}