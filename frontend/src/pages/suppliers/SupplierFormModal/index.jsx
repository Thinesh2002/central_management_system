import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../../../config/api";
import { supplierApi } from "../../../config/sub_api/supplierApi";

const initialForm = {
  supplier_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  bank_name: "",
  bank_branch: "",
  account_holder_name: "",
  account_number: "",
  swift_code: "",
  status: "active",
};

export default function SupplierFormModal({
  open,
  onClose,
  editingSupplier,
  onSuccess,
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSupplier) {
      setForm({
        supplier_name: editingSupplier.supplier_name || "",
        contact_person: editingSupplier.contact_person || "",
        phone: editingSupplier.phone || "",
        email: editingSupplier.email || "",
        address: editingSupplier.address || "",
        bank_name: editingSupplier.bank_name || "",
        bank_branch: editingSupplier.bank_branch || "",
        account_holder_name: editingSupplier.account_holder_name || "",
        account_number: editingSupplier.account_number || "",
        swift_code: editingSupplier.swift_code || "",
        status: editingSupplier.status || "active",
      });
    } else {
      setForm(initialForm);
    }
  }, [editingSupplier, open]);

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

      if (editingSupplier) {
        await supplierApi.updateSupplier(editingSupplier.id, form);
      } else {
        await supplierApi.createSupplier(form);
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#101010] border border-orange-500/30 shadow-2xl shadow-orange-500/20 animate-[fadeIn_.25s_ease]">
        <div className="sticky top-0 bg-[#101010] border-b border-white/10 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <p className="text-gray-400 text-sm">
              Supplier details and bank account details
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          <div>
            <h3 className="text-orange-400 font-semibold mb-3">
              Supplier Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="supplier_name" label="Supplier Name *" value={form.supplier_name} onChange={handleChange} />
              <Input name="contact_person" label="Contact Person" value={form.contact_person} onChange={handleChange} />
              <Input name="phone" label="Phone" value={form.phone} onChange={handleChange} />
              <Input name="email" label="Email" value={form.email} onChange={handleChange} />

              <div className="md:col-span-2">
                <label className="text-sm text-gray-400">Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full mt-1 bg-[#070707] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 focus:shadow-lg focus:shadow-orange-500/20 transition-all"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full mt-1 bg-[#070707] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-orange-400 font-semibold mb-3">
              Bank Account Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="bank_name" label="Bank Name" value={form.bank_name} onChange={handleChange} />
              <Input name="bank_branch" label="Bank Branch" value={form.bank_branch} onChange={handleChange} />
              <Input name="account_holder_name" label="Account Holder Name" value={form.account_holder_name} onChange={handleChange} />
              <Input name="account_number" label="Account Number" value={form.account_number} onChange={handleChange} />
              <Input name="swift_code" label="SWIFT / Bank Code" value={form.swift_code} onChange={handleChange} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-orange-500 text-black font-semibold hover:shadow-lg hover:shadow-orange-500/40 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange }) {
  return (
    <div>
      <label className="text-sm text-gray-400">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="w-full mt-1 bg-[#070707] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 focus:shadow-lg focus:shadow-orange-500/20 transition-all"
      />
    </div>
  );
}