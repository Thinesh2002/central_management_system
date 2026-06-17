import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../config/api";

const CreateColour = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    colour_code: "",
    colour_name: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/colours", form);
      navigate("/colours");
    } catch (err) {
      console.error("Create error", err);
      alert(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="w-full bg-[#020617] text-slate-200">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">
          Create Colour
        </h1>
      </div>

      {/* FORM CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl">

        <form onSubmit={submit} className="space-y-5">

          {/* COLOUR CODE */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Colour Code
            </label>

            <input
              name="colour_code"
              value={form.colour_code}
              onChange={handleChange}
              className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* COLOUR NAME */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Colour Name
            </label>

            <input
              name="colour_name"
              value={form.colour_name}
              onChange={handleChange}
              className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 pt-2">

            <button
              type="submit"
              className="px-4 py-2 bg-green-600 rounded-lg text-sm cursor-pointer"
            >
              Save Colour
            </button>

            <button
              type="button"
              onClick={() => navigate("/colours")}
              className="px-4 py-2 bg-slate-700 rounded-lg text-sm cursor-pointer"
            >
              Cancel
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default CreateColour;