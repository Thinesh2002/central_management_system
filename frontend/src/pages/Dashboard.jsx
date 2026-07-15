import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ImageOff,
  LayoutDashboard,
  Package,
  RefreshCcw,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import ordersApi from "../config/sub_api/order_management_api/orders_api";
import localProductsApi from "../config/sub_api/product_management_api/local_products_api";
import notificationsApi from "../config/sub_api/notifications_api";
import darazContentOptimizerApi from "../config/sub_api/daraz_api/daraz_content_optimizer_api";
import { getApiError } from "../config/api";
import { getStoredUser } from "../config/auth";
import { resolveImageUrl } from "./product_management/products/product_dashboard/utils/localProductsImageHelpers";

function money(value, currency = "LKR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getItemQty(item = {}) {
  return Number(item.qty || item.quantity || 1) || 1;
}

function getItemLineTotal(item = {}) {
  const lineTotal = Number(item.line_total || item.total_price || 0);
  if (lineTotal) return lineTotal;

  const unit = Number(item.unit_price || item.price || 0);
  return unit * getItemQty(item);
}

function getItemSku(item = {}) {
  return item.local_sku || item.sku || item.seller_sku || item.shop_sku || item.marketplace_sku || "";
}

function getItemName(item = {}) {
  return item.product_title || item.name || item.product_name || item.title || "-";
}

function getItemImage(item = {}) {
  return item.product_main_image || item.product_image_url || item.image_url || item.image || "";
}

const OPEN_STATUSES = new Set(["pending", "unpaid", "new", "packed", "ready_to_ship", "shipped", "dispatched"]);
const TO_SHIP_STATUSES = new Set(["pending", "unpaid", "new"]);

function normalizeOrderList(response) {
  return response?.orders || [];
}

function normalizeProductList(response) {
  const parsed = response?.data ?? response;
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.data)) return parsed.data;
  return [];
}

function SnapshotCard({ label, value, icon: Icon, tone = "orange" }) {
  const toneClass = {
    orange: "border-orange-900/60 bg-orange-950/30 text-orange-300",
    emerald: "border-emerald-900/60 bg-emerald-950/30 text-emerald-300",
    sky: "border-sky-900/60 bg-sky-950/30 text-sky-300",
    red: "border-red-900/60 bg-red-950/30 text-red-300",
  }[tone];

  return (
    <div className="border border-slate-800 bg-[#0a101d] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{value}</h3>
        </div>
        <div className={`border p-2 ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ label, count, description, to }) {
  if (!count) return null;

  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 border border-amber-500/30 bg-amber-500/5 px-4 py-3 hover:border-amber-400/60"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={16} className="shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-200">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="flex h-6 min-w-6 items-center justify-center bg-amber-500 px-1.5 text-[11px] font-bold text-slate-950">
          {count}
        </span>
        <ArrowRight size={14} className="text-amber-400" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const currentUser = getStoredUser();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiPendingCount, setAiPendingCount] = useState(0);
  const [aiCriticalCount, setAiCriticalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      ordersApi.listOrders({ limit: 2000 }),
      localProductsApi.getProducts(),
      localProductsApi.getInventory({ limit: 500 }),
      notificationsApi.list({ limit: 1 }),
    ]);

    const [ordersResult, productsResult, inventoryResult, notifResult] = results;

    setOrders(ordersResult.status === "fulfilled" ? normalizeOrderList(ordersResult.value) : []);
    setProducts(productsResult.status === "fulfilled" ? normalizeProductList(productsResult.value) : []);
    setInventoryRows(
      inventoryResult.status === "fulfilled" ? normalizeProductList(inventoryResult.value) : []
    );
    setUnreadCount(
      notifResult.status === "fulfilled" ? notifResult.value?.data?.unread_count || 0 : 0
    );

    const failed = results.find((item) => item.status === "rejected");
    if (failed) setError(getApiError(failed.reason));

    // Fetched separately and fails silently - this is a supplementary
    // widget, not core dashboard data, so a permission/network hiccup here
    // shouldn't block or error out the rest of the dashboard.
    try {
      const aiRes = await darazContentOptimizerApi.listSuggestions({ status: "pending", limit: 500 });
      const rows = aiRes?.data?.data || [];
      setAiPendingCount(rows.length);
      setAiCriticalCount(rows.filter((row) => (row.recommendations_json?.critical?.length || 0) > 0).length);
    } catch {
      setAiPendingCount(0);
      setAiCriticalCount(0);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const salesToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return orders
      .filter((order) => order.order_date && new Date(order.order_date) >= start)
      .reduce((sum, order) => sum + Number(order.grand_total || 0), 0);
  }, [orders]);

  const openOrdersCount = useMemo(
    () => orders.filter((order) => OPEN_STATUSES.has(String(order.order_status || "").toLowerCase())).length,
    [orders]
  );

  const toShipCount = useMemo(
    () => orders.filter((order) => TO_SHIP_STATUSES.has(String(order.order_status || "").toLowerCase())).length,
    [orders]
  );

  const lowStockCount = useMemo(
    () =>
      inventoryRows.filter((row) => {
        const alertQty = Number(row.low_stock_alert_qty || 0);
        const availableQty = Number(row.available_qty ?? row.stock_qty ?? 0);
        return alertQty > 0 && availableQty <= alertQty;
      }).length,
    [inventoryRows]
  );

  const topProducts = useMemo(() => {
    const bySku = new Map();

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const sku = getItemSku(item);
        if (!sku) return;

        const entry = bySku.get(sku) || {
          sku,
          name: getItemName(item),
          image: getItemImage(item),
          units: 0,
          sales: 0,
        };

        entry.units += getItemQty(item);
        entry.sales += getItemLineTotal(item);
        bySku.set(sku, entry);
      });
    });

    return Array.from(bySku.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [orders]);

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard size={24} className="text-orange-400" />
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Welcome back,{" "}
              <span className="font-semibold text-slate-200">
                {currentUser?.user_uid || currentUser?.name || "User"}
              </span>
              . Here's how the store is doing.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <div className="w-full space-y-5 p-5">
        <div className="space-y-2">
          <ActionCard
            label="Orders to ship"
            count={toShipCount}
            description="Waiting to be packed"
            to="/order-management/orders?status=to_pack"
          />
          <ActionCard
            label="Low stock products"
            count={lowStockCount}
            description="At or below their reorder threshold"
            to="/product/local-products"
          />
          <ActionCard
            label="Unread notifications"
            count={unreadCount}
            description="New alerts to review"
            to="/notifications"
          />
          <ActionCard
            label="AI content reports pending review"
            count={aiPendingCount}
            description={`${aiCriticalCount} with critical issues`}
            to="/product/daraz-products/content-optimizer"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard label="Sales Today" value={money(salesToday)} icon={TrendingUp} tone="orange" />
          <SnapshotCard label="Open Orders" value={openOrdersCount} icon={ShoppingCart} tone="sky" />
          <SnapshotCard label="Total Products" value={products.length} icon={Package} tone="emerald" />
          <SnapshotCard
            label="Low Stock Items"
            value={lowStockCount}
            icon={AlertTriangle}
            tone={lowStockCount > 0 ? "red" : "emerald"}
          />
        </div>

        <div className="border border-slate-800 bg-[#0a101d]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-orange-300" />
              <div>
                <h3 className="text-sm font-bold text-white">Product Performance</h3>
                <p className="text-xs text-slate-500">Top-selling SKUs across all orders</p>
              </div>
            </div>

            <Link
              to="/reports/sales"
              className="flex items-center gap-1 text-[11px] font-semibold text-orange-300 hover:text-orange-200"
            >
              View Sales Dashboard
              <ArrowRight size={12} />
            </Link>
          </div>

          {!topProducts.length ? (
            <p className="py-10 text-center text-[12px] text-slate-500">No sales data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-[#111827]">
                  <tr>
                    {["Product", "SKU", "Units Sold", "Sales"].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topProducts.map((product) => {
                    const imageUrl = resolveImageUrl(product.image);

                    return (
                      <tr key={product.sku}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-slate-700">
                              {imageUrl ? (
                                <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <ImageOff size={13} className="text-slate-400" />
                              )}
                            </div>
                            <span className="line-clamp-1 text-[12px] text-slate-200">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-400">{product.sku}</td>
                        <td className="px-4 py-2 text-[12px] text-slate-200">{product.units}</td>
                        <td className="px-4 py-2 text-[12px] text-slate-200">{money(product.sales)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
