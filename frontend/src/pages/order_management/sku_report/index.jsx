import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Package, Store, Boxes, ImageOff, Tag } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import skuReportApi from "../../../config/sub_api/order_management_api/sku_report_api";
import Loader from "../../../components/common/Loader";
import { useCanViewCostPrice } from "../../../components/common/permissions/PermissionsProvider";
import { resolveImageUrl } from "../../product_management/products/product_dashboard/utils/localProductsImageHelpers";

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function formatStatus(value) {
  if (!value) return "-";
  return String(value)
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getError(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="border border-slate-800 bg-[#0a101d] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function chartDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", { month: "short", day: "2-digit" });
}

function SalesLineChart({ title, data }) {
  const chartData = useMemo(
    () => data.map((point) => ({ ...point, label: chartDate(point.date) })),
    [data]
  );

  return (
    <div className="border border-slate-800 bg-[#0a101d] p-4">
      <p className="mb-3 text-xs font-black uppercase text-orange-300">{title}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="amount" stroke="#fb923c" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="qty" orientation="right" stroke="#22d3ee" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#0b1220", border: "1px solid #1e293b", fontSize: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Line
              yAxisId="amount"
              type="monotone"
              dataKey="sales_amount"
              name="Sales Amount"
              stroke="#fb923c"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="qty"
              type="monotone"
              dataKey="qty"
              name="Qty Sold"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SkuReportPage() {
  const { sku } = useParams();
  const canViewCostPrice = useCanViewCostPrice();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const res = await skuReportApi.get(sku);
      const data = res?.data?.data || null;
      setReport(data);
      setActiveImage(resolveImageUrl(data?.images?.[0] || ""));
    } catch (err) {
      setError(getError(err, "Failed to load SKU report."));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  const currency = report?.price?.currency || "LKR";

  return (
    <div className="min-h-screen bg-[#070b16] p-3 text-slate-100 lg:p-5">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
              SKU Economics Report
            </p>
            <h1 className="mt-1 text-xl font-black text-white">
              {report?.local_product?.title || sku}
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              SKU: {report?.sku || sku}
            </p>
          </div>
        </div>

        {error ? (
          <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <Loader label="Loading SKU report..." minHeight="320px" />
        ) : !report ? (
          <div className="border border-dashed border-slate-700 bg-[#0b1220] px-4 py-10 text-center text-sm text-slate-500">
            No report data found for this SKU.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {report.platforms.map((platform) => (
                <span
                  key={platform.platform}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-300 ring-1 ring-slate-700"
                >
                  <Store size={12} />
                  {platform.platform}
                </span>
              ))}
              {!report.platforms.length ? (
                <span className="text-xs text-slate-500">No sales history found on any platform.</span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
              <div className="border border-slate-800 bg-[#0a101d] p-3">
                <div className="flex aspect-square items-center justify-center overflow-hidden border border-slate-800 bg-white">
                  {activeImage ? (
                    <img src={activeImage} alt={report.local_product?.title || sku} className="h-full w-full object-contain" />
                  ) : (
                    <ImageOff size={28} className="text-slate-400" />
                  )}
                </div>

                {report.images?.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.images.map((image) => {
                      const url = resolveImageUrl(image);
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setActiveImage(url)}
                          className={`h-10 w-10 shrink-0 overflow-hidden border bg-white ${
                            activeImage === url ? "border-orange-400" : "border-slate-700"
                          }`}
                        >
                          <img src={url} alt="" className="h-full w-full object-contain" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Total Sales" value={`${currency} ${money(report.totals.total_sales)}`} accent="text-white" />
                <StatCard label="Net Sales" value={`${currency} ${money(report.totals.net_sales)}`} accent="text-orange-300" />
                <StatCard label="Total Qty Sold" value={report.totals.total_qty.toLocaleString()} accent="text-white" />
                <StatCard
                  label="Current Stock"
                  value={report.stock ? report.stock.stock_qty.toLocaleString() : "-"}
                  accent={report.stock && report.stock.stock_qty <= 0 ? "text-red-300" : "text-white"}
                />

                <div className="col-span-2 border border-slate-800 bg-[#0a101d] px-4 py-3 md:col-span-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <Tag size={12} /> Pricing &amp; Inventory
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                    {canViewCostPrice && (
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Cost Price</p>
                        <p className="text-sm font-bold text-slate-200">
                          {report.price ? money(report.price.cost_price) : "-"}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Local Price</p>
                      <p className="text-sm font-bold text-slate-200">
                        {report.price ? money(report.price.local_selling_price) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Daraz Price</p>
                      <p className="text-sm font-bold text-slate-200">
                        {report.price ? money(report.price.daraz_price) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Woo Price</p>
                      <p className="text-sm font-bold text-slate-200">
                        {report.price ? money(report.price.woo_price) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Available Qty</p>
                      <p className="text-sm font-bold text-slate-200">
                        {report.stock ? report.stock.available_qty ?? "-" : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Reserved Qty</p>
                      <p className="text-sm font-bold text-slate-200">
                        {report.stock ? report.stock.reserved_qty ?? "-" : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {report.platforms.map((platform) => (
                <StatCard
                  key={platform.platform}
                  label={`${platform.platform} Sales / Net / Orders`}
                  value={`${currency} ${money(platform.total_sales)} / ${money(platform.net_sales)} / ${platform.order_count}`}
                  accent="text-slate-200"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SalesLineChart title="Last 30 Days" data={report.daily_series.last_30_days} />
              <SalesLineChart title="Last 90 Days" data={report.daily_series.last_90_days} />
            </div>

            <div className="border border-slate-800 bg-[#0b1220]">
              <div className="flex items-center gap-2 border-b border-slate-800 bg-[#07101f] px-4 py-3">
                <Boxes size={15} className="text-orange-300" />
                <p className="text-sm font-black text-white">Marketplace & Account Stock Details</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2">Platform</th>
                      <th className="px-4 py-2">Account</th>
                      <th className="px-4 py-2">Listing Title</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Stock Qty</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...report.listings.daraz.map((row) => ({ ...row, platform: "DARAZ" })), ...report.listings.woo.map((row) => ({ ...row, platform: "WOO" }))].map(
                      (row, index) => (
                        <tr key={`${row.platform}-${row.account_id}-${index}`} className="border-b border-slate-800/60">
                          <td className="px-4 py-2 text-slate-300">{row.platform}</td>
                          <td className="px-4 py-2 text-slate-300">{row.account_name}</td>
                          <td className="max-w-[320px] truncate px-4 py-2 text-slate-400" title={row.title}>{row.title}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{currency} {money(row.price)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-100">{row.stock_qty}</td>
                          <td className="px-4 py-2 text-center text-slate-400">{formatStatus(row.status)}</td>
                        </tr>
                      )
                    )}
                    {!report.listings.daraz.length && !report.listings.woo.length ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-slate-500">
                          No marketplace listings found for this SKU.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-slate-800 bg-[#0b1220]">
              <div className="flex items-center gap-2 border-b border-slate-800 bg-[#07101f] px-4 py-3">
                <Package size={15} className="text-orange-300" />
                <p className="text-sm font-black text-white">Full Sales History ({report.history.length})</p>
              </div>

              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[1000px] text-[13px]">
                  <thead className="sticky top-0 bg-[#111827]">
                    <tr className="border-b border-slate-800 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Platform</th>
                      <th className="px-4 py-2">Order No</th>
                      <th className="px-4 py-2">Account</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Discount</th>
                      <th className="px-4 py-2 text-right">Line Total</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.history.map((row, index) => (
                      <tr key={`${row.platform}-${row.order_no}-${index}`} className="border-b border-slate-800/60 hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-slate-400">{formatDate(row.order_date)}</td>
                        <td className="px-4 py-2 text-slate-300">{row.platform}</td>
                        <td className="px-4 py-2 text-slate-300">{row.order_no}</td>
                        <td className="px-4 py-2 text-slate-400">{row.account_name || "-"}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{row.qty}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{money(row.unit_price)}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{money(row.discount_amount)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-100">{money(row.line_total)}</td>
                        <td className="px-4 py-2 text-center text-slate-400">{formatStatus(row.status)}</td>
                      </tr>
                    ))}
                    {!report.history.length ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-6 text-center text-slate-500">
                          No sales history found for this SKU.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-slate-800 bg-[#0b1220]">
              <div className="flex items-center gap-2 border-b border-slate-800 bg-[#07101f] px-4 py-3">
                <Tag size={15} className="text-orange-300" />
                <p className="text-sm font-black text-white">
                  Mapped SKUs ({report.mapped_wrong_skus?.length || 0})
                </p>
              </div>

              <div className="p-4">
                {report.mapped_wrong_skus?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {report.mapped_wrong_skus.map((wrongSku) => (
                      <span
                        key={wrongSku}
                        className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-300 ring-1 ring-orange-500/30"
                      >
                        {wrongSku} → {report.sku}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No wrong SKUs mapped to this SKU.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
