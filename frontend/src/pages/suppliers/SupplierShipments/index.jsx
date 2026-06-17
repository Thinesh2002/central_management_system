import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Truck,
  PackageCheck,
  Search,
  Filter,
} from "lucide-react";
import { supplierApi } from "../../../config/sub_api/supplierApi";
import ShipmentFormModal from "./ShipmentFormModal";

export default function SupplierShipments() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [shipments, setShipments] = useState([]);

  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      const supplierRes = await supplierApi.getSuppliers({});
      const shipmentRes = await supplierApi.getShipments({
        search,
        supplier_id: supplierId,
        status,
      });

      setSuppliers(supplierRes.data.data || []);
      setShipments(shipmentRes.data.data || []);
    } catch (error) {
      console.error("Fetch shipments error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, supplierId, status]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shipment?")) return;

    try {
      await supplierApi.deleteShipment(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="">
      <div className="space-y-6">
        <div className="">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
            

              <h1 className="text-3xl font-bold mt-1 text-yellow-400">
                Supplier Shipments
              </h1>


            </div>

            <div className="flex flex-wrap gap-3">
     

              <button
                onClick={() => {
                  setEditingShipment(null);
                  setShipmentModalOpen(true);
                }}
                className="cursor-pointer px-4 py-2 rounded-[10px] bg-yellow-400 text-[#161616] font-semibold shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/50 hover:scale-[1.03] transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                New Shipment
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#0d1726] border border-white/10 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shipment, supplier, SKU..."
                className="w-full bg-[#081221] border border-white/10 rounded-2xl pl-11 pr-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400"
              />
            </div>

            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="cursor-pointer bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplier_name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="cursor-pointer bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="shipped">Shipped</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={fetchData}
              className="cursor-pointer rounded-2xl bg-[#132238] border border-white/10 px-4 py-3 font-semibold text-white hover:border-yellow-400 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-yellow-400 py-10">
            Loading shipments...
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl bg-[#0d1726] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#132238] text-slate-200">
                  <tr>
                    <th className="text-left p-4">Shipment</th>
                    <th className="text-left p-4">Supplier</th>
                    <th className="text-left p-4">Shipment Date</th>
                    <th className="text-left p-4">Expected</th>
                    <th className="text-left p-4">Orders</th>
                    <th className="text-left p-4">Qty</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {shipments.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/10 hover:bg-white/[0.04]"
                    >
                      <td className="p-4">
                        <button
                          onClick={() =>
                            navigate(`/suppliers-shipments/${item.id}/orders`)
                          }
                          className="cursor-pointer font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-2"
                        >
                          <PackageCheck size={16} />
                          {item.shipment_code}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold">{item.supplier_name}</div>
                        <div className="text-slate-400">{item.phone || "-"}</div>
                      </td>

                      <td className="p-4">{item.shipment_date || "-"}</td>
                      <td className="p-4">{item.expected_arrival_date || "-"}</td>
                      <td className="p-4">{item.total_orders || 0}</td>
                      <td className="p-4">{item.total_qty || 0}</td>

                      <td className="p-4">
                        Rs. {Number(item.total_amount || 0).toFixed(2)}
                      </td>

                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full bg-yellow-400/15 text-yellow-400 text-xs font-semibold">
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`/suppliers-shipments/${item.id}/orders`)
                            }
                            className="cursor-pointer px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center gap-2"
                          >
                            <Eye size={15} />
                            View
                          </button>

                          <button
                            onClick={() => {
                              setEditingShipment(item);
                              setShipmentModalOpen(true);
                            }}
                            className="cursor-pointer px-3 py-2 rounded-xl bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400 hover:text-[#07111f] flex items-center gap-2"
                          >
                            <Edit size={15} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="cursor-pointer px-3 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {shipments.length === 0 && (
                    <tr>
                      <td colSpan="9" className="p-10 text-center text-slate-400">
                        No shipments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ShipmentFormModal
        open={shipmentModalOpen}
        onClose={() => setShipmentModalOpen(false)}
        editingShipment={editingShipment}
        suppliers={suppliers}
        onSuccess={fetchData}
      />
    </div>
  );
}