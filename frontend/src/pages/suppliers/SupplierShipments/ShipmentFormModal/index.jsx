import { useEffect, useState } from "react";
import { supplierApi } from "../../../../config/sub_api/supplierApi";

const initialForm = {
  supplier_id: "",
  shipment_code: "",
  shipment_date: "",
  expected_arrival_date: "",
  status: "draft",
  notes: "",
};

export default function ShipmentFormModal({
  open,
  onClose,
  editingShipment,
  suppliers,
  onSuccess,
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const generateShipmentCode = async () => {
    try {
      const res = await supplierApi.getShipments({});
      const shipments = res.data?.data || [];

      const numbers = shipments
        .map((item) => {
          const match = item.shipment_code?.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(Boolean);

      const nextNumber =
        numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

      return `S${String(nextNumber).padStart(3, "0")}`;
    } catch (error) {
      console.error("Generate shipment code error:", error);
      return "S001";
    }
  };

  useEffect(() => {
    const loadForm = async () => {
      if (editingShipment) {
        setForm({
          supplier_id: editingShipment.supplier_id || "",
          shipment_code: editingShipment.shipment_code || "",
          shipment_date:
            editingShipment.shipment_date?.split("T")[0] || "",
          expected_arrival_date:
            editingShipment.expected_arrival_date?.split("T")[0] || "",
          status: editingShipment.status || "draft",
          notes: editingShipment.notes || "",
        });
      } else {
        const shipmentCode = await generateShipmentCode();

        setForm({
          ...initialForm,
          shipment_code: shipmentCode,
        });
      }
    };

    if (open) {
      loadForm();
    }
  }, [editingShipment, open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingShipment) {
        await supplierApi.updateShipment(editingShipment.id, form);
      } else {
        await supplierApi.createShipment(form);
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Shipment save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-[#0d1726] border border-yellow-400/30 shadow-2xl shadow-yellow-400/20 overflow-hidden">
        <div className="border-b border-white/10 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              {editingShipment ? "Edit Shipment" : "Create Shipment"}
            </h2>

            <p className="text-slate-300 text-sm">
              Create supplier shipment and track incoming orders
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-slate-300">
                Supplier *
              </label>

              <select
                name="supplier_id"
                value={form.supplier_id}
                onChange={handleChange}
                required
                className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
              >
                <option value="">Select Supplier</option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.supplier_name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              name="shipment_code"
              label="Shipment Code *"
              value={form.shipment_code}
              onChange={handleChange}
              required
            />

            <div>
              <label className="text-sm text-slate-300">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
              >
                <option value="draft">Draft</option>
                <option value="ordered">Ordered</option>
                <option value="shipped">Shipped</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <Input
              name="shipment_date"
              label="Shipment Date"
              type="date"
              value={form.shipment_date}
              onChange={handleChange}
            />

            <Input
              name="expected_arrival_date"
              label="Expected Arrival Date"
              type="date"
              value={form.expected_arrival_date}
              onChange={handleChange}
            />

            <div className="md:col-span-2">
              <label className="text-sm text-slate-300">
                Notes
              </label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-yellow-400 text-[#07111f] font-semibold hover:shadow-lg hover:shadow-yellow-400/40 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Shipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
        className="w-full mt-1 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
      />
    </div>
  );
}