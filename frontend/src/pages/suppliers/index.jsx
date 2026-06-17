import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supplierApi } from "../../config/sub_api/supplierApi";
import SupplierFormModal from "./SupplierFormModal/index";
import SupplierDetailsPopup from "./SupplierDetails/index";

export default function SupplierDashboard() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);

      const res = await supplierApi.getSuppliers({
        search,
        status,
      });

      setSuppliers(res.data.data || []);
    } catch (error) {
      console.error("Fetch suppliers error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, status]);

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

    try {
      await supplierApi.deleteSupplier(id);
      fetchSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const openSupplierDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setDetailsOpen(true);
  };

  return (
    <div>
      <div className="space-y-6">
        <div className="">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
          

              <h1 className="text-3xl font-bold  text-yellow-400">
                Supplier Dashboard
              </h1>

     
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierModalOpen(true);
                }}
                className="cursor-pointer px-5 py-2 rounded-[10px] bg-yellow-400 text-[#07111f] font-semibold shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/50 hover:scale-[1.03] transition-all"
              >
                + Add Supplier
              </button>

              <Link
                to="/suppliers/products"
                className="cursor-pointer px-5 py-2 rounded-[10px] bg-white text-[#07111f] font-semibold hover:shadow-lg hover:shadow-white/30 hover:scale-[1.03] transition-all"
              >
                Supplier Products
              </Link>

              <Link
                to="/suppliers-shipments"
                className="cursor-pointer px-5 py-2 rounded-[10px] bg-[#132238] border border-white/10 text-white font-semibold hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20 transition-all"
              >
                Shipments
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#0d1726] border border-white/10 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier, phone, email..."
              className="lg:col-span-2 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="cursor-pointer bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={fetchSuppliers}
              className="cursor-pointer rounded-2xl bg-[#132238] border border-white/10 px-4 py-3 font-semibold text-white hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20 transition-all"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-yellow-400 py-10">
            Loading suppliers...
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl bg-[#0d1726] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#132238] text-slate-200">
                  <tr>
                    <th className="text-left p-4">Supplier</th>
                    <th className="text-left p-4">Contact</th>
                    <th className="text-left p-4">Total SKUs</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-t border-white/10 hover:bg-white/[0.04] transition-all"
                    >
                      <td className="p-4">
                        <button
                          onClick={() => openSupplierDetails(supplier)}
                          className="cursor-pointer font-semibold text-yellow-400 hover:text-yellow-300 transition-all"
                        >
                          {supplier.supplier_name}
                        </button>

                        <div className="text-slate-400">
                          {supplier.contact_person || "-"}
                        </div>
                      </td>

                      <td className="p-4">
                        <div>{supplier.phone || "-"}</div>
                        <div className="text-slate-400">
                          {supplier.email || "-"}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full bg-white/10">
                          {supplier.total_skus || 0}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            supplier.status === "active"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {supplier.status || "-"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openSupplierDetails(supplier)}
                            className="cursor-pointer px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                          >
                            Show All Details
                          </button>

                          <button
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setSupplierModalOpen(true);
                            }}
                            className="cursor-pointer px-3 py-2 rounded-xl bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400 hover:text-[#07111f] transition-all"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteSupplier(supplier.id)}
                            className="cursor-pointer px-3 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {suppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-10 text-center text-slate-400"
                      >
                        No suppliers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SupplierFormModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        editingSupplier={editingSupplier}
        onSuccess={fetchSuppliers}
      />

      <SupplierDetailsPopup
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        supplier={selectedSupplier}
      />
    </div>
  );
}