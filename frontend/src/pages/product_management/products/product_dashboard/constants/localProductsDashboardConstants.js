const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL
).replace(/\/$/, "");

export const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

export const EMPTY_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="20" fill="#111827"/>
    <rect x="34" y="42" width="92" height="76" rx="10" fill="#1f2937" stroke="#334155"/>
    <circle cx="61" cy="66" r="9" fill="#64748b"/>
    <path d="M43 106l28-28 18 18 14-14 22 24" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`)}`;

export const EMPTY_FILTERS = {
  search: "",
  category_id: "",
  sub_category_id: "",
  model_id: "",
  image_status: "",
  status: "",
};

export const VIEW_TABS = [
  { key: "all", label: "All Products" },
  { key: "single", label: "Single Products" },
  { key: "variant", label: "Variant Products" },
  { key: "current", label: "Current Products" },
];
