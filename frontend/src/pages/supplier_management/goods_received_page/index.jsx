import { useEffect, useState } from "react";
import { Boxes, Search, X } from "lucide-react";

import grnApi from "../../../config/sub_api/supplier_management_api/grn_api";
import { getApiError } from "../../../config/api";
import Loader from "../../../components/common/Loader";

function money(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

export default function GoodsReceivedPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await grnApi.list({ search });
      setRows(res?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load goods received notes"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(row) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);

    try {
      const res = await grnApi.getById(row.id);
      setDetail(res?.data);
    } catch (err) {
      setError(getApiError(err, "Failed to load goods received note"));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
          <Boxes size={20} />
          Goods Received Notes
        </h1>
        <p className="text-[13px] text-slate-500">
          A record of everything physically received against a purchase order. Receive goods from the Purchase Orders page.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          onBlur={load}
          placeholder="Search GRN number, PO number, supplier..."
          className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>

      {error && <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>}

      {loading ? (
        <Loader label="Loading goods received notes..." minHeight="200px" />
      ) : !rows.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          Nothing has been received yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">GRN Number</th>
                <th className="px-3 py-2 font-medium">PO Number</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Received Date</th>
                <th className="px-3 py-2 font-medium">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openDetail(row)}
                  className="cursor-pointer bg-[#0b1220] hover:bg-slate-900/60"
                >
                  <td className="px-3 py-2 font-mono font-semibold text-slate-100">{row.grn_number}</td>
                  <td className="px-3 py-2 font-mono text-slate-300">{row.po_number}</td>
                  <td className="px-3 py-2 text-slate-300">{row.supplier_name}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.received_date ? String(row.received_date).slice(0, 10) : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.item_count ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={() => setDetailOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
              <h2 className="text-[14px] font-semibold text-white">{detail?.grn_number || "Goods Received Note"}</h2>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <Loader label="Loading..." minHeight="140px" />
            ) : (
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2 text-[12px] text-slate-300">
                  <p>
                    PO: <span className="font-mono text-slate-100">{detail?.po_number}</span>
                  </p>
                  <p>
                    Supplier: <span className="font-semibold text-slate-100">{detail?.supplier_name}</span>
                  </p>
                  <p>
                    Received: <span className="text-slate-100">{detail?.received_date ? String(detail.received_date).slice(0, 10) : "-"}</span>
                  </p>
                </div>

                <div className="overflow-x-auto rounded-md border border-slate-800">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">SKU</th>
                        <th className="px-2 py-1.5 font-medium">Qty Received</th>
                        <th className="px-2 py-1.5 font-medium">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(detail?.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1.5">
                            <p className="font-mono font-semibold text-slate-100">{item.sku}</p>
                            <p className="truncate text-slate-500">{item.product_name}</p>
                          </td>
                          <td className="px-2 py-1.5 text-slate-300">{item.quantity_received}</td>
                          <td className="px-2 py-1.5 text-slate-300">{money(item.unit_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {detail?.notes && <p className="text-[12px] text-slate-400">{detail.notes}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
