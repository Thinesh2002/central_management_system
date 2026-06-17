import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../../config/api";

export default function CategoryEdit() {

  const { categoryCode } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category_code: "",
    category_name: ""
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!categoryCode) {
      navigate("/category-view");
      return;
    }

    loadData();
  }, [categoryCode]);

  const loadData = async () => {
    try {

      const res = await API.get(`/categories/${categoryCode}`);
      const data = res.data.data;

      setForm({
        category_code: data.category_code || "",
        category_name: data.category_name || ""
      });

    } catch (err) {
      alert("Failed to load category");
      navigate("/category-view");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      setLoading(true);

      await API.put(`/categories/${categoryCode}`, {
        category_name: form.category_name
      });

      alert("Category updated successfully");
      navigate("/category-view");

    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-6">Loading category...</div>;
  }

  return (
    <div className="p-6 max-w-md">

      <h2 className="text-xl font-bold mb-4">Edit Category</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* CATEGORY CODE (READ ONLY) */}
        <input
          className="w-full border p-2 bg-gray-100"
          value={form.category_code}
          disabled
        />

        {/* CATEGORY NAME */}
        <input
          placeholder="Category Name"
          className="w-full border p-2"
          value={form.category_name}
          onChange={(e) =>
            setForm({ ...form, category_name: e.target.value })
          }
          required
        />

        <button
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Updating..." : "Update Category"}
        </button>

      </form>

    </div>
  );
}