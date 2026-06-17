import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../config/api";

export default function ColoursDashboard() {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadColours();
  }, []);

  const loadColours = async () => {
    try {
      setLoading(true);
      const res = await API.get("/colours");
      setRows(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load colours");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      r.colour_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rows, searchTerm]);

  const handleDelete = async (code) => {
    if (!window.confirm("Delete this colour?")) return;

    try {
      await API.delete(`/colours/${code}`);
      loadColours();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="w-full bg-[#020617] text-slate-200">

      {/* HEADER */}
      <div className="flex justify-between mb-6">

        <h1 className="text-xl font-semibold text-white">
          Colours
        </h1>

        <div className="flex gap-3">

          <input
            placeholder="Search..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm"
          />

          <button
            onClick={() => navigate("/colours/add")}
            className="px-4 py-2 bg-green-600 rounded-lg text-sm cursor-pointer"
          >
            Add Colour
          </button>

        </div>

      </div>

      {/* TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        <table className="w-full table-auto">

          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4 text-left">Code</th>
              <th className="px-6 py-4 text-left">Colour Name</th>
              <th className="px-6 py-4 text-right w-[1%] whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">

            {loading && (
              <tr>
                <td colSpan="3" className="px-6 py-6 text-center text-slate-500">
                  Loading colours...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-6 text-center text-slate-500">
                  No colours found
                </td>
              </tr>
            )}

            {filtered.map((colour) => (

              <tr key={colour.colour_code} className="hover:bg-slate-800">

                <td className="px-6 py-4 font-mono text-sm text-slate-400">
                  {colour.colour_code}
                </td>

                <td className="px-6 py-4">
                  {colour.colour_name}
                </td>

                <td className="px-6 py-4 text-right whitespace-nowrap">

                  <button
                    onClick={() =>
                      navigate(`/colours/edit/${colour.colour_code}`)
                    }
                    className="text-blue-400 cursor-pointer mr-4"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(colour.colour_code)}
                    className="text-red-400 cursor-pointer"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}