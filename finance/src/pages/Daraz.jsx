import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  Layers3,
  RefreshCw,
  Search,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import { financeApi, getApiError } from "../lib/api";
import { presetRange, RANGE_PRESETS } from "../lib/dates";
import { dateLabel, money } from "../lib/format";
import { useSession } from "../components/Session";
import { Alert, Button, Card, EmptyState, inputClass, Modal, Spinner } from "../components/ui";

const PAGE_SIZE = 50;
const CATEGORY_TONES = {
  product_price: "text-sky-300",
  buyer_shipping: "text-cyan-300",
  commission: "text-orange-300",
  payment_fee: "text-amber-300",
  shipping: "text-violet-300",
  handling: "text-fuchsia-300",
  promotions: "text-pink-300",
  marketing: "text-rose-300",
  penalties: "text-red-300",
  claims: "text-lime-300",
  other: "text-neutral-300",
};

function defaultFilters() {
  return { account_id: "", search: "", paid: "", preset: "this_month", ...presetRange("this_month") };
}

function queryFrom(filters) {
  return {
    account_id: filters.account_id || undefined,
    date_from: filters.from,
    date_to: filters.to,
  };
}

function signedMoney(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : number < 0 ? "-" : ""}${money(Math.abs(number))}`;
}

function accountName(accounts, id) {
  return accounts.find((account) => Number(account.id) === Number(id))?.name || `Account ${id}`;
}

export default function DarazPage() {
  const { access } = useSession();
  const [filters, setFilters] = useState(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState({ rows: [], total: 0, totals: null });
  const [feeTypes, setFeeTypes] = useState([]);
  const [statements, setStatements] = useState([]);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    financeApi.darazAccounts()
      .then((res) => {
        const loadedAccounts = res.data.data || [];
        setAccounts(loadedAccounts);
        setFilters((current) => (
          current.account_id || !loadedAccounts.length
            ? current
            : { ...current, account_id: String(loadedAccounts[0].id) }
        ));
      })
      .catch((err) => setError(getApiError(err, "Could not load Daraz accounts.")))
      .finally(() => setAccountsLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.search === searchInput ? current : { ...current, search: searchInput }));
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!filters.account_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = queryFrom(filters);
      const [summaryRes, ordersRes, feeRes, statementRes, accountTransactionRes] = await Promise.all([
        financeApi.darazSummary(query),
        financeApi.darazOrders({
          ...query,
          search: filters.search || undefined,
          paid: filters.paid || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        financeApi.darazFeeTypes(query),
        financeApi.darazStatements(query),
        financeApi.darazAccountTransactions(query),
      ]);
      setSummary(summaryRes.data.data);
      setOrders({
        rows: ordersRes.data.rows || [],
        total: Number(ordersRes.data.total || 0),
        totals: ordersRes.data.totals || null,
      });
      setFeeTypes(feeRes.data.data || []);
      setStatements(statementRes.data.data || []);
      setAccountTransactions(accountTransactionRes.data.data || []);
    } catch (err) {
      setError(getApiError(err, "Could not load Daraz finance data."));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const changePreset = (preset) => {
    setFilters((current) => ({
      ...current,
      preset,
      ...(preset === "custom" ? {} : presetRange(preset)),
    }));
    setPage(0);
  };

  const sync = async () => {
    if (!filters.account_id) return;
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const res = await financeApi.syncDaraz(filters.account_id, {
        date_from: filters.from,
        date_to: filters.to,
      });
      const result = res.data.data;
      setNotice(
        `Synced ${result.transactions.total_saved.toLocaleString()} order finance lines, ${result.account_transactions.total_saved.toLocaleString()} account movements, and ${result.payouts.total_saved.toLocaleString()} payout statements.`
      );
      await load();
    } catch (err) {
      setError(getApiError(err, "Daraz finance sync failed."));
    } finally {
      setSyncing(false);
    }
  };

  const pages = Math.max(Math.ceil(orders.total / PAGE_SIZE), 1);
  const selectedAccount = accounts.find((account) => String(account.id) === String(filters.account_id));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Daraz Income</h1>
          <p className="mt-0.5 text-sm text-neutral-400">
            Every buyer payment, Daraz deduction, settlement, and payout statement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || syncing} aria-label="Refresh data">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          {access.daraz.edit && (
            <Button onClick={sync} disabled={!filters.account_id || syncing} title={!filters.account_id ? "Select one account to sync" : "Sync the selected date range from Daraz"}>
              <Download size={15} className={syncing ? "animate-bounce" : ""} /> {syncing ? "Syncing..." : "Sync Daraz"}
            </Button>
          )}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <div onClick={() => setNotice("")}><Alert tone="success">{notice}</Alert></div>}

      <Card>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <select className={inputClass} value={filters.account_id} onChange={(event) => updateFilter("account_id", event.target.value)} aria-label="Daraz account">
            {!accounts.length && <option value="">{accountsLoading ? "Loading Daraz accounts..." : "No Daraz accounts"}</option>}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}{account.code ? ` · ${account.code}` : ""}
              </option>
            ))}
          </select>
          <select className={inputClass} value={filters.preset} onChange={(event) => changePreset(event.target.value)} aria-label="Date range">
            {RANGE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
          <input type="date" className={inputClass} value={filters.from} max={filters.to} onChange={(event) => updateFilter("from", event.target.value)} aria-label="From date" />
          <input type="date" className={inputClass} value={filters.to} min={filters.from} onChange={(event) => updateFilter("to", event.target.value)} aria-label="To date" />
          <select className={inputClass} value={filters.paid} onChange={(event) => updateFilter("paid", event.target.value)} aria-label="Payment status">
            <option value="">All payment statuses</option>
            <option value="paid">Fully paid</option>
            <option value="unpaid">Not fully paid</option>
          </select>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-neutral-500" />
            <input className={`${inputClass} pl-8`} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Order, SKU, product..." aria-label="Search orders" />
          </div>
        </div>
      </Card>

      {selectedAccount && <AccountDetailsCard account={selectedAccount} totalAccounts={accounts.length} />}

      {!summary && (loading || accountsLoading) ? (
        <div className="flex h-64 items-center justify-center"><Spinner size={28} /></div>
      ) : !accounts.length ? (
        <Card><EmptyState>No Daraz marketplace accounts are configured.</EmptyState></Card>
      ) : summary && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <SummaryCards summary={summary} />
          <div className="grid gap-5 xl:grid-cols-5">
            <CategoryCard summary={summary} className="xl:col-span-2" />
            <FeeTypesCard rows={feeTypes} className="xl:col-span-3" />
          </div>
          <OrdersCard
            result={orders}
            accounts={accounts}
            page={page}
            pages={pages}
            onPage={setPage}
            onOpen={setDetail}
          />
          <AccountTransactionsCard rows={accountTransactions} accounts={accounts} />
          <StatementsCard rows={statements} accounts={accounts} />
        </div>
      )}

      {detail && <OrderDetailModal order={detail} accounts={accounts} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AccountDetailsCard({ account, totalAccounts }) {
  const connection = account.connection_status || "Unknown";
  const connected = connection.toLowerCase() === "connected";
  const token = account.token_status || "Unknown";

  return (
    <Card
      title={account.name}
      subtitle={`Selected Daraz account · ${totalAccounts} account${totalAccounts === 1 ? "" : "s"} available`}
      action={(
        <div className="flex flex-wrap justify-end gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
            {connection}
          </span>
          <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-300">{account.status || "Unknown"}</span>
        </div>
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AccountDetail label="Account code" value={account.code || "—"} />
        <AccountDetail label="Seller ID" value={account.seller_id || "—"} />
        <AccountDetail label="Seller email" value={account.seller_email || "—"} />
        <AccountDetail label="Country" value={account.country_code || "—"} />
        <AccountDetail label="Token status" value={token} />
        <AccountDetail label="Environment" value={account.is_sandbox ? "Sandbox" : "Production"} />
        <AccountDetail label="Last finance sync" value={account.last_sync_at ? new Date(account.last_sync_at).toLocaleString() : "Not synced"} />
        <AccountDetail label="Last connection check" value={account.last_checked_at ? new Date(account.last_checked_at).toLocaleString() : "Not checked"} />
      </div>
    </Card>
  );
}

function AccountDetail({ label, value }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm text-neutral-200" title={String(value)}>{value}</p>
    </div>
  );
}

function SummaryCards({ summary }) {
  const cards = [
    { label: "Buyer income", value: summary.income, sub: "Product price + buyer shipping", icon: CircleDollarSign, tone: "text-sky-300" },
    { label: "Daraz deductions", value: Math.abs(summary.deductions), sub: "Fees, promotions, refunds and adjustments", icon: Layers3, tone: "text-orange-300" },
    { label: "Net settlement", value: summary.net, sub: `${summary.line_count.toLocaleString()} finance lines`, icon: Banknote, tone: summary.net < 0 ? "text-red-300" : "text-emerald-300" },
    { label: "Orders", value: summary.order_count, sub: "Orders with finance activity", icon: ShoppingBag, count: true, tone: "text-white" },
    { label: "Paid net", value: summary.paid_amount, sub: `Unpaid: ${money(summary.unpaid_amount)}`, icon: WalletCards, tone: "text-violet-300" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map(({ label, value, sub, icon: Icon, count, tone }) => (
        <div key={label} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between gap-2 text-neutral-400"><p className="text-xs font-medium">{label}</p><Icon size={15} /></div>
          <p className={`mt-2 truncate font-mono text-xl font-bold tabular-nums ${tone}`} title={count ? String(value) : money(value)}>
            {count ? Number(value || 0).toLocaleString() : money(value, { decimals: 0 })}
          </p>
          <p className="mt-1 truncate text-xs text-neutral-500" title={sub}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

function CategoryCard({ summary, className = "" }) {
  return (
    <Card title="Finance categories" subtitle="Net of reversals in the selected period" className={className}>
      <div className="space-y-2">
        {(summary.category_definitions || []).map((category) => {
          const value = Number(summary.categories?.[category.key] || 0);
          return (
            <div key={category.key} className="flex items-center justify-between gap-3 border-b border-neutral-800/70 py-1.5 last:border-0">
              <span className="text-sm text-neutral-300">{category.label}</span>
              <span className={`font-mono text-sm tabular-nums ${CATEGORY_TONES[category.key]}`}>{signedMoney(value)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FeeTypesCard({ rows, className = "" }) {
  return (
    <Card title="Every Daraz fee and income type" subtitle="Exact fee names returned by QueryTransactionDetails" className={className}>
      {!rows.length ? <EmptyState>No finance lines in this period.</EmptyState> : (
        <div className="max-h-[430px] overflow-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-neutral-900 text-xs text-neutral-400">
              <tr className="border-b border-neutral-800">
                <th className="py-2 text-left font-medium">Fee / income type</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((row) => (
                <tr key={`${row.category}-${row.fee_type}-${row.fee_name}`} className="text-neutral-300">
                  <td className="py-2"><p>{row.fee_name}</p><p className="text-[11px] text-neutral-500">ID {row.fee_type || "-"} · {row.line_count} lines</p></td>
                  <td className={`px-3 py-2 text-xs ${CATEGORY_TONES[row.category]}`}>{row.category.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.order_count}</td>
                  <td className={`py-2 text-right font-mono tabular-nums ${row.amount < 0 ? "text-orange-300" : "text-emerald-300"}`}>{signedMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function OrdersCard({ result, accounts, page, pages, onPage, onOpen }) {
  return (
    <Card title="Income by order" subtitle={`${result.total.toLocaleString()} orders · click Details to inspect every Daraz line`}>
      {!result.rows.length ? <EmptyState>No orders match these filters.</EmptyState> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="text-xs text-neutral-400">
              <tr className="border-b border-neutral-800">
                {['Date', 'Order', 'Account', 'SKU', 'Product', 'Buyer income', 'Deductions', 'Net', 'Status', ''].map((heading) => (
                  <th key={heading} className={`px-2 py-2 font-medium ${['Buyer income', 'Deductions', 'Net'].includes(heading) ? 'text-right' : 'text-left'}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {result.rows.map((row) => (
                <tr key={`${row.account_id}-${row.order_no}`} className="text-neutral-300 hover:bg-neutral-800/40">
                  <td className="whitespace-nowrap px-2 py-2">{dateLabel(row.last_date)}</td>
                  <td className="px-2 py-2 font-mono text-xs text-orange-300">{row.order_no}</td>
                  <td className="px-2 py-2">{accountName(accounts, row.account_id)}</td>
                  <td className="max-w-40 truncate px-2 py-2 font-mono text-xs text-neutral-400">{row.seller_skus || "-"}</td>
                  <td className="max-w-56 truncate px-2 py-2" title={row.product_title}>{row.product_title || "-"}</td>
                  <td className="px-2 py-2 text-right font-mono text-sky-300">{money(row.income)}</td>
                  <td className="px-2 py-2 text-right font-mono text-orange-300">{money(Math.abs(row.deductions))}</td>
                  <td className={`px-2 py-2 text-right font-mono font-semibold ${row.net < 0 ? "text-red-300" : "text-emerald-300"}`}>{money(row.net)}</td>
                  <td className="px-2 py-2"><Status value={row.paid_status} /></td>
                  <td className="px-2 py-2 text-right"><button type="button" onClick={() => onOpen(row)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white"><Eye size={13} /> Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result.total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-3 text-xs text-neutral-400">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-1">
            <Button variant="secondary" className="h-8 px-2" disabled={page === 0} onClick={() => onPage(Math.max(page - 1, 0))}><ChevronLeft size={14} /> Previous</Button>
            <Button variant="secondary" className="h-8 px-2" disabled={page + 1 >= pages} onClick={() => onPage(Math.min(page + 1, pages - 1))}>Next <ChevronRight size={14} /></Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function StatementsCard({ rows, accounts }) {
  return (
    <Card title="Payout statements" subtitle="Balances and settlements returned by GetPayoutStatus">
      {!rows.length ? <EmptyState>No payout statements in this period.</EmptyState> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="text-xs text-neutral-400"><tr className="border-b border-neutral-800">
              {['Created', 'Statement', 'Account', 'Item revenue', 'Other revenue', 'Fees', 'Refunds', 'Opening', 'Closing', 'Payout', 'Status'].map((heading) => <th key={heading} className={`px-2 py-2 font-medium ${['Created', 'Statement', 'Account', 'Status'].includes(heading) ? 'text-left' : 'text-right'}`}>{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((row) => <tr key={`${row.account_id}-${row.statement_number}`} className="text-neutral-300">
                <td className="whitespace-nowrap px-2 py-2">{dateLabel(row.created_at)}</td>
                <td className="px-2 py-2 font-mono text-xs">{row.statement_number}</td>
                <td className="px-2 py-2">{accountName(accounts, row.account_id)}</td>
                <MoneyCell value={row.item_revenue} /><MoneyCell value={row.other_revenue} /><MoneyCell value={row.fees_total} /><MoneyCell value={row.refunds} /><MoneyCell value={row.opening_balance} /><MoneyCell value={row.closing_balance} /><MoneyCell value={row.payout} strong />
                <td className="px-2 py-2"><Status value={row.is_paid ? "Paid" : "Not paid"} /></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AccountTransactionsCard({ rows, accounts }) {
  return (
    <Card title="Daraz account movements" subtitle="Deposits, withdrawals, payments, settlements, returned payments, and Sponsored Solutions top-ups">
      {!rows.length ? <EmptyState>No account movements in this period.</EmptyState> : (
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 bg-neutral-900 text-xs text-neutral-400"><tr className="border-b border-neutral-800">
              {['Time', 'Transaction', 'Account', 'Type', 'Sub-type', 'Reference', 'Payee', 'Amount'].map((heading) => <th key={heading} className={`px-2 py-2 font-medium ${heading === 'Amount' ? 'text-right' : 'text-left'}`}>{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((row) => <tr key={`${row.account_id}-${row.transaction_number}`} className="text-neutral-300">
                <td className="whitespace-nowrap px-2 py-2">{row.transaction_time_parsed ? new Date(row.transaction_time_parsed).toLocaleString("en-LK") : row.transaction_time || "-"}</td>
                <td className="px-2 py-2 font-mono text-xs">{row.transaction_number}</td>
                <td className="px-2 py-2">{accountName(accounts, row.account_id)}</td>
                <td className="px-2 py-2">{row.transaction_type || "-"}</td>
                <td className="px-2 py-2">{row.sub_transaction_type || "-"}</td>
                <td className="max-w-40 truncate px-2 py-2 text-xs text-neutral-400" title={row.pmt_reference}>{row.pmt_reference || "-"}</td>
                <td className="max-w-44 truncate px-2 py-2" title={row.payee_description || row.payee_account}>{row.payee_description || row.payee_account || "-"}</td>
                <td className={`whitespace-nowrap px-2 py-2 text-right font-mono font-semibold ${row.amount < 0 ? "text-orange-300" : "text-emerald-300"}`}>{signedMoney(row.amount)} {row.currency || ""}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function MoneyCell({ value, strong = false }) {
  return <td className={`whitespace-nowrap px-2 py-2 text-right font-mono tabular-nums ${strong ? "font-semibold text-emerald-300" : ""}`}>{signedMoney(value)}</td>;
}

function Status({ value }) {
  const normalized = String(value || "").toLowerCase();
  const paid = ["paid", "yes", "1", "true"].includes(normalized);
  const partial = normalized === "partly paid";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${paid ? "bg-emerald-500/15 text-emerald-300" : partial ? "bg-amber-500/15 text-amber-300" : "bg-neutral-700 text-neutral-300"}`}>{value}</span>;
}

function OrderDetailModal({ order, accounts, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    financeApi.darazOrderLines(order.account_id, order.order_no)
      .then((res) => setRows(res.data.data || []))
      .catch((err) => setError(getApiError(err, "Could not load order finance lines.")))
      .finally(() => setLoading(false));
  }, [order.account_id, order.order_no]);

  const totals = useMemo(() => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [rows]);

  return (
    <Modal title={`Daraz finance - ${order.order_no}`} onClose={onClose} width="max-w-6xl">
      <div className="mb-4 grid gap-2 text-sm sm:grid-cols-4">
        <Detail label="Account" value={accountName(accounts, order.account_id)} />
        <Detail label="Seller SKU" value={order.seller_skus || "-"} />
        <Detail label="Payment" value={order.paid_status} />
        <Detail label="Net settlement" value={money(order.net)} />
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? <div className="flex h-36 items-center justify-center"><Spinner /></div> : !rows.length ? <EmptyState>No finance lines found for this order.</EmptyState> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="text-xs text-neutral-400"><tr className="border-b border-neutral-800">
              {['Date', 'Item', 'Finance type', 'Category', 'Type', 'Amount', 'VAT', 'WHT', 'Paid', 'Statement'].map((heading) => <th key={heading} className={`px-2 py-2 font-medium ${['Amount', 'VAT', 'WHT'].includes(heading) ? 'text-right' : 'text-left'}`}>{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((row) => <tr key={row.id} className="text-neutral-300">
                <td className="whitespace-nowrap px-2 py-2">{dateLabel(row.transaction_date)}</td>
                <td className="px-2 py-2 font-mono text-xs">{row.order_item_no || "-"}</td>
                <td className="px-2 py-2"><p>{row.fee_name || "Unnamed"}</p><p className="text-[11px] text-neutral-500">Fee ID {row.fee_type || "-"}</p></td>
                <td className={`px-2 py-2 text-xs ${CATEGORY_TONES[row.category]}`}>{String(row.category).replaceAll("_", " ")}</td>
                <td className="px-2 py-2 text-xs text-neutral-400">{row.transaction_type || "-"}</td>
                <td className={`px-2 py-2 text-right font-mono ${row.amount < 0 ? "text-orange-300" : "text-emerald-300"}`}>{signedMoney(row.amount)}</td>
                <td className="px-2 py-2 text-right font-mono">{money(row.vat_in_amount)}</td>
                <td className="px-2 py-2 text-right font-mono">{money(row.wht_amount)}</td>
                <td className="px-2 py-2"><Status value={row.paid_status || "Not paid"} /></td>
                <td className="max-w-36 truncate px-2 py-2 text-xs text-neutral-400" title={row.statement}>{row.statement || "-"}</td>
              </tr>)}
            </tbody>
            <tfoot><tr className="border-t border-neutral-700 text-white"><td colSpan="5" className="px-2 py-3 text-right font-semibold">Net total</td><td className="px-2 py-3 text-right font-mono font-bold">{money(totals)}</td><td colSpan="4" /></tr></tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-md bg-neutral-950 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-0.5 truncate text-neutral-200" title={value}>{value}</p></div>;
}
