// Local-calendar ISO date (YYYY-MM-DD) — toISOString() would shift to UTC
// and turn "today" into yesterday for part of the day in Sri Lanka.
export function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const RANGE_PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "30_days", label: "Last 30 days" },
  { value: "90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "12_months", label: "Last 12 months" },
  { value: "custom", label: "Custom" },
];

export function presetRange(preset) {
  const today = new Date();
  switch (preset) {
    case "last_month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: isoDate(first), to: isoDate(last) };
    }
    case "30_days":
      return { from: isoDate(addDays(today, -29)), to: isoDate(today) };
    case "90_days":
      return { from: isoDate(addDays(today, -89)), to: isoDate(today) };
    case "this_year":
      return { from: `${today.getFullYear()}-01-01`, to: isoDate(today) };
    case "12_months": {
      const first = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      return { from: isoDate(first), to: isoDate(today) };
    }
    case "this_month":
    default:
      return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDate(today) };
  }
}
