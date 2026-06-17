import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../../config/api";

const EditColour = () => {
  const { colourCode } = useParams();
  const navigate = useNavigate();

  const [colour, setColour] = useState({
    colour_name: "",
  });

  const fetchColour = async () => {
    try {
      const res = await API.get(`/colours/${colourCode}`);
      setColour(res.data.data);
    } catch (err) {
      console.error("Fetch colour error", err);
      alert(err.response?.data?.message || "Failed to load colour");
    }
  };

  const handleChange = (e) => {
    setColour({
      ...colour,
      [e.target.name]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      await API.put(`/colours/${colourCode}`, {
        colour_name: colour.colour_name,
      });

      navigate("/colours");
    } catch (err) {
      console.error("Update error", err);
      alert(err.response?.data?.message || "Update failed");
    }
  };

  useEffect(() => {
    fetchColour();
  }, []);

  return (
    <div className="w-full bg-[#020617] text-slate-200">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">
          Edit Colour
        </h1>
      </div>

      {/* FORM CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl">

        <form onSubmit={submit} className="space-y-5">

          {/* COLOUR CODE (READ ONLY) */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Colour Code
            </label>

            <input
              value={colourCode}
              disabled
              className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-500"
            />
          </div>

          {/* COLOUR NAME */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Colour Name
            </label>

            <input
              name="colour_name"
              value={colour.colour_name}
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
              Update Colour
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

export default EditColour;