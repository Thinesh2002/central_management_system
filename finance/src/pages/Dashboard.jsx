import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, BarChart3, Info, RefreshCw, Table as TableIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { financeApi, getApiError } from "../lib/api";
import { presetRange, RANGE_PRESETS } from "../lib/dates";
import { compact, dateLabel, money, percentChange, periodLabel } from "../lib/format";
import { Alert, Button, Card, EmptyState, inputClass, Spinner } from "../components/ui";

// Categorical slots 1-3 of the dataviz reference palette, dark-surface
// steps (validated all-pairs against #171717). Color follows the entity:
// income is always blue, costs always orange, net always aqua.
const SERIES = {
  income: { color: "#3987e5", label: "Income" },
  costs: { color: "#d95926", label: "Costs" },
  net: { color: "#199e70", label: "Net" },
};

const AXIS_TICK = { fill: "#a3a3a3", fontSize: 11 };

const compactInput = inputClass.replace("w-full", "w-auto");

const RANGE_STORAGE_KEY = "finance_dashboard_range";

function loadSavedRange() {
  try {
    const saved = JSON.parse(localStorage.getItem(RANGE_STORAGE_KEY) || "null");
    if (saved?.preset === "custom" && saved.from && saved.to) return saved;
    if (saved?.preset) return { preset: saved.preset, ...presetRange(saved.preset) };
  } catch {
    // fall through to default
  }
  return { preset: "this_month", ...presetRange("this_month") };
}

export default function DashboardPage() {
  const [range, setRange] = useState(loadSavedRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await financeApi.dashboard({ date_from: range.from, date_to: range.to });
      setData(res.data.data);
    } catch (err) {
      setError(getApiError(err, "Could not load the finance dashboard."));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(range));
    } catch {
      // storage unavailable - range just won't persist
    }
  }, [range]);

  const changePreset = (preset) => {
    if (preset === "custom") setRange((current) => ({ ...current, preset }));
    else setRange({ preset, ...presetRange(preset) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Finance Dashboard</h1>
          <p className="mt-0.5 text-sm text-neutral-400">
            {dateLabel(range.from)} – {dateLabel(range.to)}
            {data?.range && (
              <span className="text-neutral-500"> · compared with {dateLabel(data.range.previous_from)} – {dateLabel(data.range.previous_to)}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className={`${compactInput}`} value={range.preset} onChange={(e) => changePreset(e.target.value)} aria-label="Date range">
            {RANGE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
          {range.preset === "custom" && (
            <>
              <input type="date" className={`${compactInput}`} value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} aria-label="From date" />
              <input type="date" className={`${compactInput}`} value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} aria-label="To date" />
            </>
          )}
          <Button variant="secondary" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data && loading && (
        <div className="flex h-72 items-center justify-center"><Spinner size={28} /></div>
      )}

      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <KpiRow totals={data.totals} previous={data.previous_totals} />
          <TrendCard series={data.series} granularity={data.range.granularity} />

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Revenue by channel" subtitle="Order totals, excluding cancelled/returned">
              <BarList
                items={data.channels.map((c) => ({ name: c.channel, amount: c.revenue, meta: `${c.orders} orders` }))}
                color={SERIES.income.color}
                empty="No orders in this period."
              />
            </Card>
            <Card title="Expenses by category" subtitle="From the ledger">
              <BarList
                items={data.expense_breakdown.map((c) => ({ name: c.name, amount: c.amount, meta: `${c.entries} entries` }))}
                color={SERIES.costs.color}
                empty={<>No expenses recorded. <Link to="/ledger" className="text-orange-300 hover:underline">Add one</Link></>}
              />
            </Card>
            <Card title="Daraz fees" subtitle="Net of fee reversals, by fee type">
              <BarList
                items={data.fee_breakdown.map((f) => ({ name: f.name, amount: f.amount, meta: `${f.lines} lines` }))}
                color={SERIES.costs.color}
                empty="No Daraz fee transactions in this period."
              />
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <PayoutsCard payouts={data.payouts} className="lg:col-span-3" />
            <RecentEntriesCard entries={data.recent_entries} incomeBreakdown={data.income_breakdown} className="lg:col-span-2" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------

const KPIS = [
  { key: "order_revenue", label: "Order revenue", goodWhenUp: true, sub: (t) => `${Number(t.order_count).toLocaleString()} orders` },
  { key: "marketplace_fees", label: "Marketplace fees", goodWhenUp: false, sub: (t) => pctOf(t.marketplace_fees, t.daraz_revenue, "of Daraz sales") },
  { key: "other_income", label: "Other income", goodWhenUp: true, sub: () => "Ledger income entries" },
  { key: "expenses", label: "Expenses", goodWhenUp: false, sub: () => "Ledger expense entries" },
  { key: "net_profit", label: "Net profit", goodWhenUp: true, sub: (t) => pctOf(t.net_profit, t.order_revenue + t.other_income, "margin"), hero: true },
];

function pctOf(value, base, suffix) {
  if (!Number(base)) return "—";
  return `${((Number(value) / Number(base)) * 100).toFixed(1)}% ${suffix}`;
}

function KpiRow({ totals, previous }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {KPIS.map((kpi) => {
        const change = percentChange(totals[kpi.key], previous[kpi.key]);
        const up = change !== null && change >= 0;
        const good = change === null ? null : up === kpi.goodWhenUp;
        const value = totals[kpi.key];

        return (
          <div
            key={kpi.key}
            className={`rounded-lg border p-4 ${kpi.hero ? "col-span-2 border-orange-500/40 bg-orange-500/5 md:col-span-1" : "border-neutral-800 bg-neutral-900"}`}
          >
            <p className="text-xs font-medium text-neutral-400">{kpi.label}</p>
            <p className={`mt-1.5 truncate font-mono text-xl font-bold tabular-nums ${kpi.hero && value < 0 ? "text-red-300" : "text-white"}`} title={money(value)}>
              {money(value, { decimals: 0 })}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-neutral-500">{kpi.sub(totals)}</span>
              {change !== null && (
                <span
                  className={`inline-flex shrink-0 items-center gap-0.5 font-medium ${good ? "text-emerald-300" : "text-red-300"}`}
                  title={`Previous period: ${money(previous[kpi.key])}`}
                >
                  {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(change).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-52 rounded-md border border-neutral-700 bg-neutral-950/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-white">{periodLabel(label, { long: true })}</p>
      {["income", "costs", "net"].map((key) => (
        <div key={key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-neutral-300">
            <span className="h-0.5 w-3 rounded" style={{ background: SERIES[key].color }} />
            {SERIES[key].label}
          </span>
          <span className="font-mono tabular-nums text-white">{money(row[key])}</span>
        </div>
      ))}
      <div className="mt-1.5 space-y-0.5 border-t border-neutral-800 pt-1.5 text-neutral-400">
        <Detail label="Order revenue" value={row.revenue} />
        <Detail label="Other income" value={row.other_income} />
        <Detail label="Marketplace fees" value={row.marketplace_fees} />
        <Detail label="Expenses" value={row.expenses} />
        <div className="flex justify-between gap-4"><span>Orders</span><span className="font-mono tabular-nums">{row.orders}</span></div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-mono tabular-nums">{money(value, { decimals: 0 })}</span>
    </div>
  );
}

function TrendCard({ series, granularity }) {
  const [view, setView] = useState("chart");
  const hasData = useMemo(() => series.some((row) => row.income || row.costs), [series]);
  const hasNegative = useMemo(() => series.some((row) => row.net < 0), [series]);

  return (
    <Card
      title="Income vs costs"
      subtitle={`LKR per ${granularity}. Income = order revenue + other income; costs = marketplace fees + expenses.`}
      action={
        <div className="flex rounded-md border border-neutral-700 p-0.5">
          {[
            { value: "chart", icon: BarChart3, label: "Chart" },
            { value: "table", icon: TableIcon, label: "Table" },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${view === value ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}
              aria-pressed={view === value}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      }
    >
      {!hasData ? (
        <EmptyState>No income or costs recorded in this period.</EmptyState>
      ) : view === "chart" ? (
        <>
        <ul className="mb-2 flex justify-end gap-4 text-xs text-neutral-300">
          {Object.entries(SERIES).map(([key, s]) => (
            <li key={key} className="flex items-center gap-1.5">
              <svg width="16" height="4" aria-hidden="true">
                <line x1="0" y1="2" x2="16" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={key === "net" ? "4 2" : undefined} />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="period" tickFormatter={(p) => periodLabel(p)} tick={AXIS_TICK} axisLine={{ stroke: "#404040" }} tickLine={false} minTickGap={24} />
              <YAxis tickFormatter={compact} tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} />
              {hasNegative && <ReferenceLine y={0} stroke="#525252" />}
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#737373", strokeDasharray: "3 3" }} />
              {Object.entries(SERIES).map(([key, s]) => (
                <Line
                  key={key}
                  type="linear"
                  dataKey={key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={key === "net" ? "5 3" : undefined}
                  dot={series.length <= 14 ? { r: 3, strokeWidth: 0, fill: s.color } : false}
                  activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        </>
      ) : (
        <TrendTable series={series} />
      )}
    </Card>
  );
}

function TrendTable({ series }) {
  const rows = series.filter((row) => row.income || row.costs);
  const cols = [
    ["revenue", "Order revenue"],
    ["other_income", "Other income"],
    ["marketplace_fees", "Fees"],
    ["expenses", "Expenses"],
    ["net", "Net"],
  ];
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-neutral-900 text-xs text-neutral-400">
          <tr>
            <th className="py-2 pr-3 text-left font-medium">Period</th>
            <th className="px-3 py-2 text-right font-medium">Orders</th>
            {cols.map(([key, label]) => <th key={key} className="px-3 py-2 text-right font-medium">{label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {rows.map((row) => (
            <tr key={row.period} className="text-neutral-300">
              <td className="py-1.5 pr-3">{periodLabel(row.period, { long: true })}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{row.orders}</td>
              {cols.map(([key]) => (
                <td key={key} className={`px-3 py-1.5 text-right font-mono tabular-nums ${key === "net" && row.net < 0 ? "text-red-300" : ""}`}>
                  {compactMoney(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function compactMoney(value) {
  return Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 });
}

// ---------------------------------------------------------------------

function BarList({ items, color, empty }) {
  if (!items.length) return <EmptyState>{empty}</EmptyState>;
  const max = Math.max(...items.map((item) => item.amount), 1);
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name} title={`${item.name}: ${money(item.amount)} · ${item.meta}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-neutral-300">{item.name}</span>
            <span className="shrink-0 font-mono tabular-nums text-neutral-200">
              {compactMoney(item.amount)}
              <span className="ml-1.5 text-neutral-500">{total ? `${Math.round((item.amount / total) * 100)}%` : ""}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-800">
            <div className="h-2 rounded-full" style={{ width: `${Math.max((item.amount / max) * 100, 1.5)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PayoutsCard({ payouts, className }) {
  return (
    <Card
      className={className}
      title="Daraz payouts"
      subtitle={`${money(payouts.paid, { decimals: 0 })} paid out across ${payouts.statements} statement${payouts.statements === 1 ? "" : "s"} in this period`}
    >
      {payouts.balances.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {payouts.balances.map((b) => (
            <div key={b.account_id} className="min-w-40 flex-1 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2">
              <p className="truncate text-xs text-neutral-400">{b.account_name}</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-white">{money(b.closing_balance, { decimals: 0 })}</p>
              <p className="text-[11px] text-neutral-500">Balance as of {dateLabel(b.statement_date)}</p>
            </div>
          ))}
        </div>
      )}

      {payouts.recent.length === 0 ? (
        <EmptyState>No payout statements in this period.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-400">
              <tr>
                <th className="py-2 pr-3 text-left font-medium">Statement</th>
                <th className="px-3 py-2 text-right font-medium">Item revenue</th>
                <th className="px-3 py-2 text-right font-medium">Fees</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {payouts.recent.map((p) => (
                <tr key={`${p.account_id}-${p.statement_number}`} className="text-neutral-300">
                  <td className="py-2 pr-3">
                    <p className="font-mono text-xs text-neutral-200">{p.statement_number}</p>
                    <p className="text-[11px] text-neutral-500">{p.account_name} · {dateLabel(p.daraz_created_at)}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{compactMoney(p.item_revenue)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{compactMoney(p.fees_total)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white">{compactMoney(p.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RecentEntriesCard({ entries, incomeBreakdown, className }) {
  return (
    <Card
      className={className}
      title="Recent ledger entries"
      action={<Link to="/ledger" className="text-xs font-medium text-orange-300 hover:text-orange-200">Open ledger</Link>}
    >
      {entries.length === 0 ? (
        <EmptyState>No ledger entries yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-200">{e.description || e.category_name || "Untitled entry"}</p>
                <p className="text-[11px] text-neutral-500">{dateLabel(e.entry_date)} · {e.category_name || "Uncategorised"}</p>
              </div>
              <span className={`shrink-0 font-mono text-sm tabular-nums ${e.entry_type === "income" ? "text-emerald-300" : "text-neutral-200"}`}>
                {e.entry_type === "income" ? "+" : "−"}{compactMoney(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {incomeBreakdown.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-neutral-500">
          <Info size={12} className="mt-px shrink-0" />
          Top other-income category this period: {incomeBreakdown[0].name} ({money(incomeBreakdown[0].amount, { decimals: 0 })})
        </p>
      )}
    </Card>
  );
}
