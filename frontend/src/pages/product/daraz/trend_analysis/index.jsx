import { useEffect, useState, useMemo } from "react";
import API from "../../../../config/api";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://backend.teckvora.com";

export default function ProductTrend() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: "last_30_days_qty",
    direction: "desc",
  });

  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchTrend();
  }, []);

  const fetchTrend = async () => {
    try {
      setLoading(true);
      const res = await API.get("/daraz/analytics/product-moving-trend");
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (sku, image) => {
    if (!sku || !image) return null;
    if (image.startsWith("http")) return image;
    return `${API_BASE_URL}/images/products/${encodeURIComponent(
      sku
    )}/${encodeURIComponent(image)}`;
  };

  const processedData = useMemo(() => {
    const grouped = {};

    data.forEach((item) => {
      const key = item.final_sku;

      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          last_30_days_qty: Number(item.last_30_days_qty || 0),
          last_90_days_qty: Number(item.last_90_days_qty || 0),
          total_sales_amount: Number(item.total_sales_amount || 0),
        };
      } else {
        grouped[key].last_30_days_qty += Number(item.last_30_days_qty || 0);
        grouped[key].last_90_days_qty += Number(item.last_90_days_qty || 0);
        grouped[key].total_sales_amount += Number(item.total_sales_amount || 0);
      }
    });

    return Object.values(grouped).map((item) => {
      const avg90 = item.last_90_days_qty / 3;
      const prediction = Math.ceil(
        item.last_30_days_qty * 0.7 + avg90 * 0.3
      );
      return { ...item, prediction };
    });
  }, [data]);

  const mergedData = useMemo(() => {
    let filtered = [...processedData];

    if (filterStatus === "CORRECT") {
      filtered = filtered.filter(
        (item) => item.mapping_status === "CORRECT_SKU"
      );
    }

    if (filterStatus === "NOT_MAPPED") {
      filtered = filtered.filter(
        (item) => item.mapping_status !== "CORRECT_SKU"
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue)
          return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [processedData, sortConfig, filterStatus]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;

    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="inline ml-1" />
    ) : (
      <ArrowDown size={14} className="inline ml-1" />
    );
  };

  return (
    <div className="text-slate-300 space-y-3">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-1xl font-400 text-[#ffc935]">
          Product Sales Overview
        </h1>

        <div className="flex items-center gap-4">

          <div className="relative group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="
                appearance-none
                bg-slate-900
                border border-slate-700
                text-white
                text-[12px]
                rounded-xl
                pl-4 pr-10 py-1.5
                shadow-lg
                transition-all duration-200
                hover:border-slate-500
                focus:outline-none
                focus:ring-2
                focus:ring-slate-600
                cursor-pointer
                w-44
              "
            >
              <option value="ALL" className="bg-slate-900">All Products</option>
              <option value="CORRECT" className="bg-slate-900">Matched SKU</option>
              <option value="NOT_MAPPED" className="bg-slate-900">Not Mapped SKU</option>
            </select>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-slate-300">
              <ChevronDown size={16} />
            </div>
          </div>

          <div className="text-[sm] text-slate-400">
            Total:
            <span className="text-white font-semibold ml-2">
              {mergedData.length}
            </span>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#071118] border border-slate-800 rounded-xl overflow-hidden ">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">

            <thead className="bg-[#2e2e30] text-slate-400 ">
              <tr>
                <th
                  className="px-4 py-4 text-left cursor-pointer hover:bg-[#3d3d3d]"
                  onClick={() => requestSort("final_sku")}
                >
                  Product SKU {renderSortIcon("final_sku")}
                </th>

                <th className="px-4 py-4 text-center">
                  SKU Match
                </th>

                <th
                  className="px-4 py-4 text-center cursor-pointer hover:bg-[#3d3d3d]"
                  onClick={() => requestSort("last_30_days_qty")}
                >
                  Last 30 Days {renderSortIcon("last_30_days_qty")}
                </th>

                <th
                  className="px-4 py-4 text-center cursor-pointer hover:bg-[#3d3d3d]"
                  onClick={() => requestSort("last_90_days_qty")}
                >
                  Last 90 Days {renderSortIcon("last_90_days_qty")}
                </th>

                <th
                  className="px-4 py-4 text-center cursor-pointer hover:bg-[#3d3d3d]"
                  onClick={() => requestSort("prediction")}
                >
                  Expected Next 30 {renderSortIcon("prediction")}
                </th>

                <th
                  className="px-4 py-4 text-right cursor-pointer hover:bg-[#3d3d3d]"
                  onClick={() => requestSort("total_sales_amount")}
                >
                  Revenue (Rs.) {renderSortIcon("total_sales_amount")}
                </th>

                <th className="px-4 py-4 text-center">
                  Images
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {mergedData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-800/40 transition">

                  <td className="px-4 py-4 font-medium text-white">
                    {item.final_sku}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {item.mapping_status === "CORRECT_SKU" ? (
                      <span className="text-green-400 font-medium">Matched</span>
                    ) : (
                      <span className="text-red-400 font-medium">Not Mapped</span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {item.last_30_days_qty}
                  </td>

                  <td className="px-4 py-4 text-center text-slate-400">
                    {item.last_90_days_qty}
                  </td>

                  <td className="px-4 py-4 text-center text-green-400 font-bold">
                    {item.prediction}
                  </td>

                  <td className="px-4 py-4 text-right">
                    {item.total_sales_amount.toLocaleString()}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center gap-3">

                      {getImageUrl(item.final_sku, item.product_main_image) && (
                        <img
                          src={getImageUrl(item.final_sku, item.product_main_image)}
                          alt="System"
                          onClick={() =>
                            window.open(
                              getImageUrl(item.final_sku, item.product_main_image),
                              "_blank"
                            )
                          }
                          className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-150 cursor-pointer rounded bg-slate-800"
                        />
                      )}

                      {item.order_item_image && (
                        <img
                          src={item.order_item_image}
                          alt="Daraz"
                          onClick={() =>
                            window.open(item.order_item_image, "_blank")
                          }
                          className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-150 cursor-pointer rounded bg-slate-800"
                        />
                      )}

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}