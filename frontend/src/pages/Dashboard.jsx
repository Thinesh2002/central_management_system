import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleCheck,
  Clock,
  PackageSearch,
  RotateCcw,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { getApiError } from "../config/api";
import { getStoredUser } from "../config/auth";

function money(value) {
  return `LKR ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function unwrap(response) {
  return response?.data?.data || response?.data || response || {};
}

function getTotal(data) {
  return data?.pagination?.total || data?.total || data?.total_orders || 0;
}

const toneStyles = {
  slate: {
    border: "border-slate-800",
    iconBox: "border-slate-700 bg-slate-800/70 text-slate-300",
    accent: "bg-slate-500",
  },
  blue: {
    border: "border-blue-500/20",
    iconBox: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    accent: "bg-blue-400",
  },
  green: {
    border: "border-emerald-500/20",
    iconBox: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    accent: "bg-emerald-400",
  },
  amber: {
    border: "border-amber-500/20",
    iconBox: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    accent: "bg-amber-400",
  },
  red: {
    border: "border-red-500/20",
    iconBox: "border-red-500/20 bg-red-500/10 text-red-300",
    accent: "bg-red-400",
  },
};

function GlassCard({ children, className = "", delay = 0, tone = "slate" }) {
  const style = toneStyles[tone] || toneStyles.slate;

  return (
    <div
      className={`dashboard-glass-card relative overflow-hidden rounded-xl border ${style.border} bg-white/[0.035] p-4 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.055] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${style.accent}`} />
      {children}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  delay = 0,
  tone = "slate",
}) {
  const style = toneStyles[tone] || toneStyles.slate;

  return (
    <GlassCard delay={delay} tone={tone}>
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-bold text-slate-100">
            {value}
          </p>

          {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
        </div>

        {Icon && (
          <div className={`rounded-lg border p-2 ${style.iconBox}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function QuickLink({
  to,
  title,
  description,
  icon: Icon,
  delay = 0,
  tone = "slate",
}) {
  const style = toneStyles[tone] || toneStyles.slate;

  return (
    <Link to={to}>
      <GlassCard delay={delay} tone={tone} className="h-full">
        <div className="flex items-start justify-between gap-3 pl-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              {description}
            </p>
          </div>

          {Icon && (
            <div className={`rounded-lg border p-2 ${style.iconBox}`}>
              <Icon size={17} />
            </div>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}

export default function Dashboard() {
  const currentUser = getStoredUser();

  const [finance, setFinance] = useState({});
  const [inventory, setInventory] = useState({});
  const [manualOrders, setManualOrders] = useState({});
  const [darazOrders, setDarazOrders] = useState({});
  const [wooOrders, setWooOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const today = new Date().toISOString().slice(0, 10);

    try {
      const results = await Promise.allSettled([
        api.get("/finance/net-sales/summary", {
          params: { date_from: today, date_to: today },
        }),
        api.get("/inventory/dashboard"),
        api.get("/orders/summary").catch(() =>
          api.get("/orders", { params: { limit: 5 } })
        ),
        api.get("/daraz/orders", { params: { limit: 5 } }),
        api.get("/woo/orders", { params: { limit: 5 } }),
      ]);

      if (results[0].status === "fulfilled") {
        setFinance(unwrap(results[0].value));
      }

      if (results[1].status === "fulfilled") {
        const data = unwrap(results[1].value);
        setInventory(data?.summary || data);
      }

      if (results[2].status === "fulfilled") {
        setManualOrders(unwrap(results[2].value));
      }

      if (results[3].status === "fulfilled") {
        setDarazOrders(unwrap(results[3].value));
      }

      if (results[4].status === "fulfilled") {
        setWooOrders(unwrap(results[4].value));
      }

      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        setError(getApiError(failed.reason));
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const dashboard = useMemo(() => {
    const manualTotal = getTotal(manualOrders);
    const darazTotal = getTotal(darazOrders);
    const wooTotal = getTotal(wooOrders);

    const totalOrders =
      Number(finance?.total_orders || 0) || manualTotal + darazTotal + wooTotal;

    const delivered = Number(finance?.delivered_orders || 0);
    const cancelled = Number(finance?.cancelled_orders || 0);
    const returned = Number(finance?.returned_orders || 0);
    const pending = Math.max(totalOrders - delivered - cancelled - returned, 0);

    return {
      manualTotal,
      darazTotal,
      wooTotal,
      totalOrders,
      delivered,
      cancelled,
      returned,
      pending,
    };
  }, [finance, manualOrders, darazOrders, wooOrders]);

  const salesCards = [
    {
      title: "Today Sales",
      value: money(finance?.gross_sales),
      note: "Gross sales today",
      icon: TrendingUp,
      tone: "green",
    },
    {
      title: "Net Sales",
      value: money(finance?.net_sales),
      note: "After discounts and refunds",
      icon: Wallet,
      tone: "green",
    },
    {
      title: "Net Profit",
      value: money(finance?.net_profit),
      note: `${Number(finance?.profit_margin || 0).toFixed(2)}% margin`,
      icon: BarChart3,
      tone: "green",
    },
  ];

  const orderCards = [
    {
      title: "Total Orders",
      value: formatNumber(dashboard.totalOrders),
      note: "Manual + Daraz + Woo",
      icon: ShoppingBag,
      tone: "blue",
    },
    {
      title: "Delivered",
      value: formatNumber(dashboard.delivered),
      note: "Completed orders",
      icon: CircleCheck,
      tone: "blue",
    },
    {
      title: "Pending",
      value: formatNumber(dashboard.pending),
      note: "Orders still pending",
      icon: Clock,
      tone: "blue",
    },
    {
      title: "Cancelled",
      value: formatNumber(dashboard.cancelled),
      note: "Cancelled orders",
      icon: XCircle,
      tone: "red",
    },
    {
      title: "Returned",
      value: formatNumber(dashboard.returned),
      note: "Returned orders",
      icon: RotateCcw,
      tone: "amber",
    },
  ];

  const channelCards = [
    {
      title: "Manual Orders",
      value: formatNumber(dashboard.manualTotal),
      note: "Direct customer orders",
      icon: Store,
      tone: "slate",
    },
    {
      title: "Daraz Orders",
      value: formatNumber(dashboard.darazTotal),
      note: "Daraz marketplace orders",
      icon: ShoppingBag,
      tone: "slate",
    },
    {
      title: "Woo Orders",
      value: formatNumber(dashboard.wooTotal),
      note: "WooCommerce orders",
      icon: ShoppingBag,
      tone: "slate",
    },
  ];

  const inventoryCards = [
    {
      title: "Low Stock",
      value: formatNumber(inventory?.low_stock_count),
      note: "SKUs below alert level",
      icon: AlertTriangle,
      tone: "amber",
    },
    {
      title: "Out of Stock",
      value: formatNumber(inventory?.out_of_stock_count),
      note: "Zero available SKUs",
      icon: Boxes,
      tone: "red",
    },
    {
      title: "Stock Value",
      value: money(inventory?.stock_value),
      note: "Available qty × cost",
      icon: PackageSearch,
      tone: "amber",
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <style>
        {`
          @keyframes dashboardFadeUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .dashboard-glass-card {
            opacity: 0;
            animation: dashboardFadeUp 420ms ease forwards;
          }

          .dashboard-glass-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(
              120deg,
              transparent 0%,
              rgba(255,255,255,0.025) 45%,
              rgba(255,255,255,0.065) 50%,
              rgba(255,255,255,0.025) 55%,
              transparent 100%
            );
            transform: translateX(-120%);
            transition: transform 700ms ease;
            pointer-events: none;
          }

          .dashboard-glass-card:hover::before {
            transform: translateX(120%);
          }
        `}
      </style>

      <main className="">
        <div>


          {loading && (
            <p className="mt-2 text-xs text-slate-500">
              Dashboard data loading...
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <Section title="Sales Summary" description="Today sales and profit details">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {salesCards.map((item, index) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                note={item.note}
                icon={item.icon}
                tone={item.tone}
                delay={index * 45}
              />
            ))}
          </div>
        </Section>

        <Section title="Order Summary" description="Order status overview">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {orderCards.map((item, index) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                note={item.note}
                icon={item.icon}
                tone={item.tone}
                delay={180 + index * 45}
              />
            ))}
          </div>
        </Section>

        <Section title="Sales Channels" description="Orders by source">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {channelCards.map((item, index) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                note={item.note}
                icon={item.icon}
                tone={item.tone}
                delay={420 + index * 45}
              />
            ))}
          </div>
        </Section>

        <Section title="Inventory Summary" description="Stock and inventory value">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inventoryCards.map((item, index) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                note={item.note}
                icon={item.icon}
                tone={item.tone}
                delay={560 + index * 45}
              />
            ))}
          </div>
        </Section>

        <Section title="Quick Links" description="Open main management pages">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <QuickLink
              to="/net-sales"
              title="Net Sales Dashboard"
              description="Review sales, costs, expenses and profit."
              icon={Wallet}
              tone="slate"
              delay={720}
            />

            <QuickLink
              to="/inventory"
              title="Inventory Dashboard"
              description="Track SKUs, stock value and low stock alerts."
              icon={PackageSearch}
              tone="slate"
              delay={765}
            />

            <QuickLink
              to="/manual/orders"
              title="Manual Orders"
              description="Create and manage direct customer orders."
              icon={Store}
              tone="slate"
              delay={810}
            />

            <QuickLink
              to="/daraz/orders"
              title="Daraz Orders"
              description="Sync marketplace orders and fulfillment actions."
              icon={ShoppingBag}
              tone="slate"
              delay={855}
            />

            <QuickLink
              to="/woo/orders"
              title="WooCommerce Orders"
              description="Sync Woo orders and finance summary."
              icon={ShoppingBag}
              tone="slate"
              delay={900}
            />

            <QuickLink
              to="/finance/expenses"
              title="Expenses"
              description="Add expenses for profit calculation."
              icon={BarChart3}
              tone="slate"
              delay={945}
            />
          </div>
        </Section>
      </main>
    </div>
  );
}