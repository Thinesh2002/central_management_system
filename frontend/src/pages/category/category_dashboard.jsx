import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../../config/api";

export default function CategoryDashboard() {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [subCategories, setSubCategories] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/categories");
      setRows(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const loadSubCategories = async (categoryCode) => {
    try {

      if (subCategories[categoryCode]) return;

      const res = await API.get(`/sub-categories/category/${categoryCode}`);

      setSubCategories((prev) => ({
        ...prev,
        [categoryCode]: res.data.data || []
      }));

    } catch (err) {
      alert(err.response?.data?.message || "Failed to load sub categories");
    }
  };

  const toggleCategory = async (code) => {

    if (expandedCategory === code) {
      setExpandedCategory(null);
      return;
    }

    setExpandedCategory(code);
    await loadSubCategories(code);
  };

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      r.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rows, searchTerm]);

  const handleDelete = async (code) => {

    if (!window.confirm("Delete this category?")) return;

    try {
      await API.delete(`/categories/${code}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const deleteSubCategory = async (code, parent) => {

    if (!window.confirm("Delete this sub category?")) return;

    try {

      await API.delete(`/sub-categories/${code}`);

      setSubCategories((prev) => ({
        ...prev,
        [parent]: prev[parent].filter(
          (s) => s.sub_category_code !== code
        )
      }));

    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="w-full  bg-[#020617] text-slate-200 ">

      {/* HEADER */}
      <div className="flex justify-between mb-6">

        <h1 className="text-xl font-semibold text-white">
          Categories
        </h1>

        <div className="flex gap-3">

          <input
            placeholder="Search..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm"
          />

          <button
            onClick={() => navigate("/category-create")}
            className="px-4 py-2 bg-green-600 rounded-lg text-sm cursor-pointer"
          >
            Add Category
          </button>

        </div>

      </div>

      {/* TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4 text-left">Code</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Sub Categories</th>
              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">

            {filtered.map((cat) => (
              <React.Fragment key={cat.category_code}>

                {/* CATEGORY ROW */}
                <tr
                  onClick={() => toggleCategory(cat.category_code)}
                  className="cursor-pointer"
                >

                  <td className="px-6 py-4 flex items-center gap-2 font-mono text-sm text-slate-400">

                    {expandedCategory === cat.category_code ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}

                    {cat.category_code}

                  </td>

                  <td className="px-6 py-4">
                    {cat.category_name}
                  </td>

                  <td className="px-6 py-4">
                    {cat.sub_category_count}
                  </td>

                  <td
                    className="px-6 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >

                    <div className="flex gap-4 text-sm">
                      <button
                        onClick={() =>
                          navigate(`/sub-category-create/${cat.category_code}`)
                        }
                        className="text-green-400 cursor-pointer"
                      >
                        Add Sub
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/category-edit/${cat.category_code}`)
                        }
                        className="text-blue-400 cursor-pointer"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(cat.category_code)}
                        className="text-red-400 cursor-pointer"
                      >
                        Delete
                      </button>



                    </div>

                  </td>

                </tr>

                {/* SUB CATEGORY TABLE */}
                {expandedCategory === cat.category_code && (

                  <tr>

                    <td colSpan="4" className="p-0">

                      <div className="border border-slate-800  overflow-hidden ">



                        <table className="w-full text-sm">

                          <thead className="bg-[#030524] text-slate-400">
                            <tr>
                              <th className="px-4 py-3 text-left">
                                Sub Code
                              </th>
                              <th className="px-4 py-3 text-left">
                                Sub Category Name
                              </th>
                              <th className="px-4 py-3 text-left">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody>

                            {(subCategories[cat.category_code] || []).length === 0 && (
                              <tr>
                                <td
                                  colSpan="3"
                                  className="px-4 py-4 text-center text-slate-500"
                                >
                                  No Sub Categories
                                </td>
                              </tr>
                            )}

                            {(subCategories[cat.category_code] || []).map((sub) => (

                              <tr
                                key={sub.sub_category_code}
                                className="border-t border-slate-800"
                              >

                                <td className="px-4 py-3 font-mono">
                                  {sub.sub_category_code}
                                </td>

                                <td className="px-4 py-3">
                                  {sub.sub_category_name}
                                </td>

                                <td className="px-4 py-3">

                                  <button
                                    onClick={() =>
                                      deleteSubCategory(
                                        sub.sub_category_code,
                                        cat.category_code
                                      )
                                    }
                                    className="text-red-400 text-sm cursor-pointer"
                                  >
                                    Delete
                                  </button>

                                </td>

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      </div>

                    </td>

                  </tr>

                )}

              </React.Fragment>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}