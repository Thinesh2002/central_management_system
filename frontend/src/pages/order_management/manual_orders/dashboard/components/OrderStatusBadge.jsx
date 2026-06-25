const STATUS_STYLE = {
  Pending: "bg-yellow-500/10 text-yellow-300 ring-yellow-500/30",
  "In Progress": "bg-blue-500/10 text-blue-300 ring-blue-500/30",
  Confirmed: "bg-indigo-500/10 text-indigo-300 ring-indigo-500/30",
  Packed: "bg-purple-500/10 text-purple-300 ring-purple-500/30",
  Shipped: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30",
  Delivered: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  Cancelled: "bg-red-500/10 text-red-300 ring-red-500/30",
};

export default function OrderStatusBadge({ status = "Pending" }) {
  const cleanStatus = String(status || "Pending").trim();
  const style =
    STATUS_STYLE[cleanStatus] ||
    "bg-slate-500/10 text-slate-300 ring-slate-500/30";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${style}`}
    >
      {cleanStatus}
    </span>
  );
}
