export function money(value, { decimals = 2 } = {}) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Axis ticks: 1.2K / 3.4M, no currency prefix (the chart title carries it).
export function compact(value) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(n));
}

export function percentChange(current, previous) {
  const cur = Number(current || 0);
  const prev = Number(previous || 0);
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-12" -> "12 Sep", "2026-09" -> "Sep 2026"
export function periodLabel(period, { long = false } = {}) {
  const [year, month, day] = String(period || "").split("-");
  if (!month) return period;
  const name = MONTHS[Number(month) - 1];
  if (!day) return long ? `${name} ${year}` : `${name} '${year.slice(2)}`;
  return long ? `${Number(day)} ${name} ${year}` : `${Number(day)} ${name}`;
}

export function dateLabel(value) {
  if (!value) return "—";
  const iso = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  return periodLabel(iso, { long: true });
}
