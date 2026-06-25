export default function OrderStatusBadge({ status = "Pending" }) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

  const classMap = {
    Pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    Processing: "border-sky-500/40 bg-sky-500/10 text-sky-200",
    Packed: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
    "Ready To Ship": "border-violet-500/40 bg-violet-500/10 text-violet-200",
    Shipped: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    Delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    Cancelled: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    Returned: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    Failed: "border-red-500/40 bg-red-500/10 text-red-200",
  };

  return <span className={`${base} ${classMap[status] || classMap.Pending}`}>{status}</span>;
}
