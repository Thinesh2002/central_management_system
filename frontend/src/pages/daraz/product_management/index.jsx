import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Package,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../../../config/api";
import { darazProductsApi } from "../../../config/sub_api/daraz_api/daraz_products_api";
import skuMappingApi from "../../../config/sub_api/product_management_api/sku_mapping_api";
import ExportCsvModal from "../../../components/common/export/ExportCsvModal";
import { exportRowsAsCsv } from "../../../utils/csvExport";
import { usePageOverlay } from "../../../components/common/page_overlay/PageOverlayProvider";
import { useConfirm } from "../../../components/common/confirm_modal/ConfirmProvider";
import Loader from "../../../components/common/Loader";

const PAGE_SIZES = [25, 50, 100, 200];

const DARAZ_EXPORT_COLUMNS = [
  { key: "listingId", label: "Listing ID", value: (r) => r.listingId },
  { key: "title", label: "Title", value: (r) => r.title },
  { key: "sku", label: "SKU", value: (r) => r.sku },
  { key: "account", label: "Account", value: (r) => r.accountName },
  { key: "status", label: "Status", value: (r) => r.statusLabel },
  { key: "created", label: "Daraz Created", value: (r) => r.darazCreatedLabel },
  { key: "qty", label: "Qty", value: (r) => r.qty },
  { key: "price", label: "Price", value: (r) => r.price },
];

const DARAZ_EXPORT_DATE_PRESETS = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_60_days", label: "Last 60 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "custom", label: "Custom Range" },
];

const FIELD = {
  id: ["id"],
  listingId: ["listing_id", "item_id", "daraz_item_id", "itemId", "ItemId"],
  title: ["name", "title", "product_name", "item_name", "ProductName"],
  sku: ["seller_sku", "sku", "SellerSku", "shop_sku", "ShopSku"],
  image: ["image", "main_image", "image_url", "thumbnail", "mainImage", "images"],
  qty: ["stock", "available_stock", "quantity", "qty", "inventory", "sellable_stock"],
  price: ["price", "sale_price", "current_price", "special_price", "selling_price"],
  currency: ["currency", "currency_code", "Currency"],
  status: [
    "status",
    "Status",
    "product_status",
    "listing_status",
    "item_status",
    "sale_status",
    "daraz_status",
    "live_status",
    "publish_status",
    "seller_status",
  ],
  accountId: ["account_id", "marketplace_account_id", "daraz_account_id"],
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function readValue(obj, keys, fallback = "-") {
  for (const key of keys) {
    const value = obj?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

// `||` treats 0 as falsy, so a chain of `readValue(...) || raw?.x || raw?.y`
// silently skips a genuine 0 (e.g. quantity/price actually being zero) and
// falls through to the next fallback instead of keeping it.
function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "-";
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.accounts)) return payload.accounts;

  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.result?.rows)) return payload.result.rows;
  if (Array.isArray(payload?.result?.products)) return payload.result.products;
  if (Array.isArray(payload?.result?.items)) return payload.result.items;

  return [];
}

function getError(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getAccountId(account) {
  return account?.id || account?.account_id || account?.marketplace_account_id || "";
}

function getAccountName(account) {
  return (
    account?.account_name ||
    account?.name ||
    account?.store_name ||
    account?.shop_name ||
    account?.account_uid ||
    `Account ${getAccountId(account)}`
  );
}

function getPlatform(account) {
  return String(
    account?.platform_code ||
      account?.platform ||
      account?.marketplace ||
      account?.marketplace_code ||
      ""
  )
    .trim()
    .toUpperCase();
}

function isDarazAccount(account) {
  const platform = getPlatform(account);
  return !platform || platform === "DARAZ" || platform.includes("DARAZ");
}

function parseJsonMaybe(value) {
  if (!value) return null;

  if (typeof value === "object") return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (typeof parsed === "string") {
        try {
          return JSON.parse(parsed);
        } catch {
          return null;
        }
      }

      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

function readRawObject(product) {
  const candidates = [
    product?.raw_json,
    product?.rawJson,
    product?.rawJSON,
    product?.raw,
    product?.raw_data,
    product?.rawData,
    product?.response_json,
    product?.responseJson,
    product?.payload,
    product?.daraz_raw_json,
    product?.product_json,
    product?.api_response,
  ];

  for (const candidate of candidates) {
    const parsed = parseJsonMaybe(candidate);

    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  if (
    product?.created_time ||
    product?.updated_time ||
    product?.attributes ||
    product?.skus ||
    product?.item_id
  ) {
    return product;
  }

  return null;
}

function findDeepValue(object, keys = []) {
  if (!object || typeof object !== "object") return null;

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(object, key) &&
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  for (const value of Object.values(object)) {
    if (value && typeof value === "object") {
      const found = findDeepValue(value, keys);

      if (found !== null && found !== undefined && found !== "") {
        return found;
      }
    }
  }

  return null;
}

function toDate(value) {
  if (!value || value === "-") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();

  if (!text || text === "0000-00-00 00:00:00") return null;

  if (/^\d+$/.test(text)) {
    let timestamp = Number(text);

    if (!Number.isFinite(timestamp)) return null;

    if (timestamp > 0 && timestamp < 10000000000) {
      timestamp *= 1000;
    }

    const date = new Date(timestamp);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fixedValue =
    text.includes(" ") && !text.includes("T") ? text.replace(" ", "T") : text;

  const date = new Date(fixedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value || value === "-") return "-";

  const date = toDate(value);

  if (!date) return "-";

  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getDateKey(value) {
  if (!value || value === "-") return "";

  const date = toDate(value);

  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDatePresetRange(preset, customStartDate, customEndDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "all") return { start: "", end: "" };

  if (preset === "today") {
    const date = formatInputDate(today);
    return { start: date, end: date };
  }

  if (preset === "yesterday") {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    const formatted = formatInputDate(date);
    return { start: formatted, end: formatted };
  }

  if (preset === "last_7_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_30_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_60_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_90_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  return {
    start: customStartDate,
    end: customEndDate,
  };
}

function isDateInRange(dateKey, range) {
  if (!range.start && !range.end) return true;
  if (!dateKey) return false;
  if (range.start && dateKey < range.start) return false;
  if (range.end && dateKey > range.end) return false;
  return true;
}

function formatStatus(value) {
  if (value === undefined || value === null || value === "" || value === "-") {
    return "";
  }

  const text = String(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getDarazCreatedTime(product) {
  const raw = readRawObject(product);

  return (
    product?.daraz_created_at ||
    product?.daraz_created_time ||
    product?._daraz_created_time ||
    product?.created_time ||
    product?.CreatedTime ||
    product?.createdTime ||
    product?.create_time ||
    product?.CreateTime ||
    product?.createTime ||
    raw?._daraz_created_time ||
    raw?.daraz_created_at ||
    raw?.daraz_created_time ||
    raw?.created_time ||
    raw?.CreatedTime ||
    raw?.createdTime ||
    raw?.create_time ||
    raw?.CreateTime ||
    raw?.createTime ||
    raw?.gmt_create ||
    raw?.GmtCreate ||
    raw?.gmtCreate ||
    raw?.date_created ||
    raw?.DateCreated ||
    raw?.dateCreated ||
    findDeepValue(raw, [
      "_daraz_created_time",
      "daraz_created_at",
      "daraz_created_time",
      "created_time",
      "CreatedTime",
      "createdTime",
      "create_time",
      "CreateTime",
      "createTime",
      "gmt_create",
      "GmtCreate",
      "gmtCreate",
      "date_created",
      "DateCreated",
      "dateCreated",
    ]) ||
    ""
  );
}

function getDarazUpdatedTime(product) {
  const raw = readRawObject(product);

  return (
    product?.daraz_updated_at ||
    product?.daraz_updated_time ||
    product?._daraz_updated_time ||
    product?.updated_time ||
    product?.UpdatedTime ||
    product?.updatedTime ||
    product?.update_time ||
    product?.UpdateTime ||
    product?.updateTime ||
    raw?._daraz_updated_time ||
    raw?.daraz_updated_at ||
    raw?.daraz_updated_time ||
    raw?.updated_time ||
    raw?.UpdatedTime ||
    raw?.updatedTime ||
    raw?.update_time ||
    raw?.UpdateTime ||
    raw?.updateTime ||
    raw?.modified_time ||
    raw?.ModifiedTime ||
    raw?.modifiedTime ||
    raw?.gmt_modified ||
    raw?.GmtModified ||
    raw?.gmtModified ||
    raw?.date_modified ||
    raw?.DateModified ||
    raw?.dateModified ||
    findDeepValue(raw, [
      "_daraz_updated_time",
      "daraz_updated_at",
      "daraz_updated_time",
      "updated_time",
      "UpdatedTime",
      "updatedTime",
      "update_time",
      "UpdateTime",
      "updateTime",
      "modified_time",
      "ModifiedTime",
      "modifiedTime",
      "gmt_modified",
      "GmtModified",
      "gmtModified",
      "date_modified",
      "DateModified",
      "dateModified",
    ]) ||
    ""
  );
}

function getStatusValue(product) {
  const raw = readRawObject(product);
  const directStatus = readValue(product, FIELD.status, "");
  if (directStatus) return directStatus;
  return raw?.status || raw?.Status || raw?.skus?.[0]?.Status || raw?.skus?.[0]?.status || "";
}

function getImage(product) {
  const raw = readRawObject(product);

  const value =
    readValue(product, FIELD.image, "") ||
    raw?.marketImages ||
    raw?.images ||
    raw?.skus?.[0]?.Images ||
    "";

  if (Array.isArray(value)) return value[0] || "";

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed[0] || "" : value;
    } catch {
      return value;
    }
  }

  return "";
}

function getTitle(product) {
  const raw = readRawObject(product);
  return (
    readValue(product, FIELD.title, "") ||
    raw?.attributes?.name ||
    raw?.name ||
    raw?.title ||
    "Untitled Product"
  );
}

function getSku(product) {
  const raw = readRawObject(product);
  return (
    readValue(product, FIELD.sku, "") ||
    raw?.skus?.[0]?.SellerSku ||
    raw?.skus?.[0]?.ShopSku ||
    "-"
  );
}

function getSkuCount(product) {
  const raw = readRawObject(product);
  const skus = raw?.skus || product?.skus;
  return Array.isArray(skus) ? skus.length : 1;
}

function getQty(product) {
  const raw = readRawObject(product);
  return firstDefined(
    readValue(product, FIELD.qty, ""),
    raw?.skus?.[0]?.Available,
    raw?.skus?.[0]?.quantity,
    raw?.skus?.[0]?.multiWarehouseInventories?.[0]?.sellableQuantity
  );
}

function getRawPriceNumber(product) {
  const raw = readRawObject(product);

  const rawPrice = firstDefined(
    readValue(product, FIELD.price, ""),
    raw?.skus?.[0]?.price,
    raw?.price
  );

  const number = Number(rawPrice);
  return Number.isFinite(number) ? number : 0;
}

function getPrice(product) {
  const raw = readRawObject(product);

  const rawPrice = firstDefined(
    readValue(product, FIELD.price, ""),
    raw?.skus?.[0]?.price,
    raw?.price
  );

  if (rawPrice === "-") return "-";

  const currency = readValue(product, FIELD.currency, "LKR");
  const price = Number(rawPrice);

  if (!Number.isFinite(price)) return `${currency} ${rawPrice}`;

  return `${currency} ${price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeProduct(product, accountMap) {
  const raw = readRawObject(product) || {};
  const accountId = String(readValue(product, FIELD.accountId, ""));
  const account = accountMap[accountId] || {};
  const createdRaw = getDarazCreatedTime(product);
  const createdDate = toDate(createdRaw);
  const updatedRaw = getDarazUpdatedTime(product);
  const updatedDate = toDate(updatedRaw);
  const qty = getQty(product);
  const qtyNumber = Number(qty);
  const statusRaw = getStatusValue(product);
  const statusLabel = formatStatus(statusRaw);
  const title = getTitle(product);
  const sku = getSku(product);
  const skuCount = getSkuCount(product);

  const row = {
    raw: product,
    id: readValue(product, FIELD.id, null),
    listingId:
      readValue(product, FIELD.listingId, "") ||
      raw?.item_id ||
      raw?.itemId ||
      raw?.ItemId ||
      "-",
    accountId,
    accountName:
      product?.account_name ||
      product?.store_name ||
      product?.shop_name ||
      getAccountName(account),
    title,
    sku,
    skuCount,
    image: getImage(product),
    statusRaw,
    statusLabel,
    darazCreatedRaw: createdRaw,
    darazCreatedKey: getDateKey(createdRaw),
    darazCreatedTime: createdDate ? createdDate.getTime() : 0,
    darazCreatedLabel: formatDate(createdRaw),
    darazUpdatedRaw: updatedRaw,
    darazUpdatedKey: getDateKey(updatedRaw),
    darazUpdatedTime: updatedDate ? updatedDate.getTime() : 0,
    darazUpdatedLabel: formatDate(updatedRaw),
    qty,
    qtyNumber: Number.isFinite(qtyNumber) ? qtyNumber : null,
    price: getPrice(product),
    priceNumber: getRawPriceNumber(product),
  };

  row.searchText = `
    ${row.listingId}
    ${row.title}
    ${row.sku}
    ${row.accountName}
    ${row.statusLabel}
    ${row.darazCreatedLabel}
    ${row.darazUpdatedLabel}
    ${row.price}
    Daraz
  `.toLowerCase();

  return row;
}

export default function DarazDashboardPage() {
  const { openOverlay } = usePageOverlay();
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [products, setProducts] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [idSearch, setIdSearch] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [selectedRows, setSelectedRows] = useState([]);

  const [accountFilterOpen, setAccountFilterOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [skuMappingByWrong, setSkuMappingByWrong] = useState({});
  const [skuMapDrafts, setSkuMapDrafts] = useState({});
  const [skuMapSavingKey, setSkuMapSavingKey] = useState("");

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncIds, setSyncIds] = useState([]);
  const [syncingId, setSyncingId] = useState("");
  const [syncResults, setSyncResults] = useState([]);
  const [stockSavingKey, setStockSavingKey] = useState("");

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const accountMap = useMemo(() => {
    const map = {};
    accounts.forEach((account) => {
      map[String(getAccountId(account))] = account;
    });
    return map;
  }, [accounts]);

  const rows = useMemo(() => {
    return products
      .map((product) => normalizeProduct(product, accountMap))
      .sort((a, b) => {
        if (!a.darazCreatedTime && !b.darazCreatedTime) return 0;
        if (!a.darazCreatedTime) return 1;
        if (!b.darazCreatedTime) return -1;
        return b.darazCreatedTime - a.darazCreatedTime;
      });
  }, [products, accountMap]);


  const statusTabs = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      if (!row.statusLabel) return;
      const key = row.statusLabel.toLowerCase();
      const old = map.get(key);
      map.set(key, {
        key,
        label: row.statusLabel,
        count: old ? old.count + 1 : 1,
      });
    });

    const dynamicTabs = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    return [{ key: "all", label: "All", count: rows.length }, ...dynamicTabs];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const idQ = idSearch.trim().toLowerCase();
    const skuQ = skuSearch.trim().toLowerCase();
    const dateRange = getDatePresetRange(
      datePreset,
      customStartDate,
      customEndDate
    );

    return rows.filter((row) => {
      const searchOk = !q || row.searchText.includes(q);
      const idOk = !idQ || String(row.listingId || "").toLowerCase().includes(idQ);

      // row.sku is the original ("wrong") Daraz seller SKU - a search also
      // needs to match the mapped correct SKU (SKU Mapping page), otherwise
      // searching by the SKU you actually mapped to never finds anything.
      const mappedSku = skuMappingByWrong[row.sku]?.correct_sku || "";
      const skuOk =
        !skuQ ||
        String(row.sku || "").toLowerCase().includes(skuQ) ||
        mappedSku.toLowerCase().includes(skuQ);

      const accountOk =
        selectedAccountIds.length === 0 ||
        selectedAccountIds.includes(String(row.accountId));

      const dateRangeOk = isDateInRange(row.darazCreatedKey, dateRange);

      const tabOk =
        activeTab === "all" ||
        (row.statusLabel && row.statusLabel.toLowerCase() === activeTab);

      return (
        searchOk &&
        idOk &&
        skuOk &&
        accountOk &&
        dateRangeOk &&
        tabOk
      );
    });
  }, [
    rows,
    search,
    idSearch,
    skuSearch,
    datePreset,
    customStartDate,
    customEndDate,
    selectedAccountIds,
    activeTab,
    skuMappingByWrong,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIndex = filteredRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(safePage * pageSize, filteredRows.length);

  const pageKeys = pageRows.map((row, index) =>
    String(row.id || row.listingId || row.sku || index)
  );

  const allPageSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selectedRows.includes(key));

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 120);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const exists = statusTabs.some((tab) => tab.key === activeTab);
    if (!exists) setActiveTab("all");
  }, [statusTabs, activeTab]);

  useEffect(() => {
    loadInitial();
    loadSkuMappings();
  }, []);

  async function loadSkuMappings() {
    try {
      const res = await skuMappingApi.getAll({ limit: 2000 });
      const rows = res?.data?.data || res?.data || [];
      const byWrong = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        byWrong[row.wrong_sku] = row;
      });
      setSkuMappingByWrong(byWrong);
    } catch {
      setSkuMappingByWrong({});
    }
  }

  async function handleSaveSkuMapping(wrongSku) {
    const correctSku = String(skuMapDrafts[wrongSku] || "").trim();
    if (!correctSku || correctSku === wrongSku) return;

    setSkuMapSavingKey(wrongSku);
    setError("");

    try {
      const existing = skuMappingByWrong[wrongSku];

      if (existing) {
        await skuMappingApi.update(existing.id, { correct_sku: correctSku });
      } else {
        await skuMappingApi.create({
          wrong_sku: wrongSku,
          correct_sku: correctSku,
          platform: "DARAZ",
        });
      }

      setSuccess(`SKU mapping saved: ${wrongSku} → ${correctSku}.`);
      await loadSkuMappings();

      setSkuMapDrafts((prev) => {
        const next = { ...prev };
        delete next[wrongSku];
        return next;
      });
    } catch (err) {
      setError(getError(err, "Failed to save SKU mapping."));
    } finally {
      setSkuMapSavingKey("");
    }
  }

  async function loadInitial() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await api.get("/marketplace/accounts", {
        params: { platform_code: "DARAZ" },
        timeout: 300000,
      });

      const accountList = normalizeArray(res?.data)
        .filter(isDarazAccount)
        .filter((account) => getAccountId(account));

      const ids = accountList.map((account) => String(getAccountId(account)));

      setAccounts(accountList);
      setSelectedAccountIds(ids);

      await loadProducts(accountList);
    } catch (err) {
      setAccounts([]);
      setSelectedAccountIds([]);
      setProducts([]);
      setError(getError(err, "Failed to load Daraz products."));
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts(accountList = accounts) {
    const ids = accountList.map((account) => String(getAccountId(account))).filter(Boolean);

    if (!ids.length) {
      setProducts([]);
      return;
    }

    const results = await Promise.allSettled(
      ids.map(async (accountId) => {
        const account = accountList.find(
          (item) => String(getAccountId(item)) === String(accountId)
        );

        const res = await darazProductsApi.preview({
          account_id: accountId,
          limit: 5000,
        });

        return normalizeArray(res?.data).map((product) => ({
          ...product,
          account_id:
            product.account_id ||
            product.marketplace_account_id ||
            product.daraz_account_id ||
            accountId,
          account_name: product.account_name || getAccountName(account),
        }));
      })
    );

    const allProducts = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") allProducts.push(...result.value);
    });

    setProducts(allProducts);

    const failedCount = results.filter((result) => result.status === "rejected").length;

    if (failedCount > 0) {
      setError(`${failedCount} Daraz account products failed to load.`);
    }
  }

  function handleExportCsv(config) {
    const dateRange =
      config.datePreset === "custom"
        ? { start: config.customStart, end: config.customEnd }
        : getDatePresetRange(config.datePreset);

    const exportRows = filteredRows.filter((row) => {
      const dateOk = isDateInRange(row.darazCreatedKey, dateRange);
      const minOk = config.minPrice === null || row.priceNumber >= config.minPrice;
      const maxOk = config.maxPrice === null || row.priceNumber <= config.maxPrice;
      const accountOk =
        !config.accountIds ||
        !config.accountIds.length ||
        config.accountIds.includes(String(row.accountId));

      return dateOk && minOk && maxOk && accountOk;
    });

    const selectedColumns = DARAZ_EXPORT_COLUMNS.filter((column) =>
      config.columnKeys.includes(column.key)
    );

    exportRowsAsCsv(exportRows, selectedColumns, `daraz-products-${Date.now()}.csv`);
    setSuccess(`Exported ${exportRows.length} Daraz product${exportRows.length === 1 ? "" : "s"} to CSV.`);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setIdSearch("");
    setSkuSearch("");
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setActiveTab("all");
    setSelectedAccountIds(accounts.map((account) => String(getAccountId(account))));
    setPage(1);
  }

  function toggleAccountFilter(accountId) {
    const id = String(accountId);
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setPage(1);
  }

  function selectAllAccountsFilter() {
    setSelectedAccountIds(accounts.map((account) => String(getAccountId(account))));
    setPage(1);
  }

  function clearAccountFilterOnly() {
    setSelectedAccountIds([]);
    setPage(1);
  }


  function togglePageRows() {
    if (allPageSelected) {
      setSelectedRows((prev) => prev.filter((key) => !pageKeys.includes(key)));
      return;
    }

    setSelectedRows((prev) => Array.from(new Set([...prev, ...pageKeys])));
  }

  function toggleRow(rowKey) {
    const key = String(rowKey);
    setSelectedRows((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  function openProduct(row) {
    if (row.id) {
      openOverlay(`/product/daraz-products/view/${row.id}`);
      return;
    }

    if (row.accountId && row.listingId) {
      openOverlay(`/product/daraz-products/item/${row.accountId}/${row.listingId}`);
      return;
    }

    setError("Product ID missing. Please sync this product again.");
  }

  function openEdit(row) {
    const id = row.id || row.listingId;

    if (!id) {
      setError("Product ID missing.");
      return;
    }

    openOverlay(`/product/daraz-products/edit/${id}`);
  }

  async function openDelete(row) {
    const id = row.id || row.listingId;

    if (!id) {
      setError("Product ID missing.");
      return;
    }

    if (!(await confirm(`Delete "${row.title}" from Daraz? This cannot be undone.`))) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await darazProductsApi.delete(id);
      setProducts((prev) =>
        prev.filter((product) => String(readValue(product, FIELD.id, null)) !== String(id))
      );
      setSuccess(`Daraz product ${row.sku || row.listingId} deleted.`);
    } catch (err) {
      setError(getError(err, "Failed to delete Daraz product."));
    }
  }



  async function updateDarazRowStock(row, value) {
    const id = row.id;
    const quantity = Number(value);

    if (!id) {
      setError("Daraz product row ID missing. Please sync this product again before stock update.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Valid stock quantity is required.");
      return;
    }

    const key = String(row.id || row.listingId || row.sku);
    setStockSavingKey(key);
    setError("");
    setSuccess("");

    try {
      await darazProductsApi.update(id, { quantity: Math.trunc(quantity) });

      setProducts((prev) =>
        prev.map((product) => {
          const productId = readValue(product, FIELD.id, null);

          if (String(productId) !== String(id)) return product;

          return {
            ...product,
            quantity: Math.trunc(quantity),
            stock: Math.trunc(quantity),
            available_stock: Math.trunc(quantity),
          };
        })
      );

      setSuccess(`Daraz stock updated for ${row.sku || row.listingId}.`);
    } catch (err) {
      setError(getError(err, "Failed to update Daraz stock."));
    } finally {
      setStockSavingKey("");
    }
  }

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(Number(nextPage), 1), totalPages));
  }

  function openSyncPopup() {
    if (!accounts.length) {
      setError("No Daraz accounts found.");
      return;
    }

    setSyncIds(accounts.map((account) => String(getAccountId(account))));
    setSyncResults([]);
    setSyncingId("");
    setSyncOpen(true);
    setError("");
    setSuccess("");
  }

  function toggleSyncAccount(accountId) {
    const id = String(accountId);
    setSyncIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function syncSelectedAccounts() {
    if (!syncIds.length) {
      setError("Please select at least one Daraz account.");
      return;
    }

    try {
      setSyncing(true);
      setSyncResults([]);
      setError("");
      setSuccess("");

      const results = [];

      for (const accountId of syncIds) {
        const account = accounts.find(
          (item) => String(getAccountId(item)) === String(accountId)
        );

        const accountName = account ? getAccountName(account) : `Account ${accountId}`;

        try {
          setSyncingId(accountId);

          if (darazProductsApi.syncWithOptions) {
            await darazProductsApi.syncWithOptions({
              accountId,
              filter: "all_products",
              withDetail: true,
            });
          } else {
            await darazProductsApi.sync(accountId, {
              filter: "all_products",
              withDetail: true,
            });
          }

          results.push({
            id: accountId,
            name: accountName,
            success: true,
            message: "Synced",
          });
        } catch (err) {
          results.push({
            id: accountId,
            name: accountName,
            success: false,
            message: getError(err, "Sync failed"),
          });
        }

        setSyncResults([...results]);
      }

      await loadProducts(accounts);

      const successCount = results.filter((item) => item.success).length;
      const failedCount = results.length - successCount;

      if (failedCount > 0) {
        setError(`${successCount} synced, ${failedCount} failed.`);
      } else {
        setSuccess(`${successCount} Daraz account sync completed.`);
        setSyncOpen(false);
      }
    } catch (err) {
      setError(getError(err, "Failed to sync."));
    } finally {
      setSyncing(false);
      setSyncingId("");
    }
  }

  const buttonClass =
    "rounded-sm border border-zinc-800/40 transition hover:-translate-y-[1px] hover:border-[#D0E7E6]/50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="w-full overflow-hidden text-[13px] text-zinc-200">
      <div className="space-y-3">

        <div className="rounded-md border border-zinc-700/60 bg-[#1c2838] shadow-sm shadow-black/20">
          <div className="flex items-center justify-between border-b border-zinc-700/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-orange-400" />
              <h2 className="text-[13px] font-semibold text-white">
                Search & Filter Daraz Products
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openSyncPopup}
                disabled={syncing || !accounts.length}
                className="h-7 rounded-sm border border-zinc-600 bg-[#44546b] px-3 text-[11px] font-semibold text-white hover:bg-[#52657f] disabled:opacity-40"
              >
                ⚙ ACTIONS
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500"
              >
                <Download size={13} />
                EXPORT CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 px-3 py-2 xl:grid-cols-12">
            <div className="xl:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">▦</span>
                Date Range
              </label>

              <select
                value={datePreset}
                onChange={(event) => {
                  setDatePreset(event.target.value);
                  setPage(1);
                }}
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_60_days">Last 60 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {datePreset === "custom" ? (
              <>
                <div className="xl:col-span-1">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">
                    From
                  </label>

                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => {
                      setCustomStartDate(event.target.value);
                      setPage(1);
                    }}
                    className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
                  />
                </div>

                <div className="xl:col-span-1">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">
                    To
                  </label>

                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => {
                      setCustomEndDate(event.target.value);
                      setPage(1);
                    }}
                    className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
                  />
                </div>
              </>
            ) : null}

            <div className="xl:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">▥</span>
                ID
              </label>

              <input
                value={idSearch}
                onChange={(event) => {
                  setIdSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Enter ID"
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">▥</span>
                SKU
              </label>

              <input
                value={skuSearch}
                onChange={(event) => {
                  setSkuSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Enter SKU"
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>

            <div className={datePreset === "custom" ? "xl:col-span-2" : "xl:col-span-3"}>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">⌕</span>
                Search
              </label>

              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search Daraz Products"
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>

            <div className={datePreset === "custom" ? "flex items-end gap-2 xl:col-span-2" : "flex items-end gap-2 xl:col-span-3"}>
              <button
                type="button"
                onClick={() => {
                  setSearch(searchInput);
                  setPage(1);
                }}
                className="h-8 rounded-sm bg-orange-500 px-3 text-[12px] font-bold text-white hover:bg-orange-400"
              >
                SEARCH
              </button>

              <button
                type="button"
                onClick={() => setAccountFilterOpen(true)}
                className="h-8 rounded-sm bg-indigo-500 px-3 text-[12px] font-bold text-white hover:bg-indigo-400"
              >
                FILTERS
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="h-8 rounded-sm bg-white px-3 text-[12px] font-bold text-slate-700 hover:bg-zinc-100"
              >
                CLEAR
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex gap-2 rounded-sm border border-red-500/20 bg-red-500/5 p-2 text-red-400">
            <AlertTriangle size={15} />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="flex gap-2 rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-400">
            <CheckCircle size={15} />
            <p>{success}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 pb-3">
          {statusTabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={cx(
                  "border-b-2 px-3 py-2 text-[13px] font-semibold transition",
                  active
                    ? "border-yellow-400 text-yellow-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                )}
              >
                {tab.label}
                <span className="ml-2 rounded-sm bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-3 text-[12px] text-zinc-400 md:flex-row md:items-center md:justify-between">
          <div>
            Total: <b className="text-zinc-100">{rows.length}</b>
            <span className="mx-2 text-zinc-700">|</span>
            Filtered: <b className="text-zinc-100">{filteredRows.length}</b>
            <span className="mx-2 text-zinc-700">|</span>
            Accounts: <b className="text-zinc-100">{selectedAccountIds.length || accounts.length}</b>
          </div>

          <div>
            Showing <b className="text-zinc-100">{startIndex}</b>-<b className="text-zinc-100">{endIndex}</b> of <b className="text-zinc-100">{filteredRows.length}</b>
            <span className="mx-2 text-zinc-700">|</span>
            Page <b className="text-zinc-100">{safePage}</b> of <b className="text-zinc-100">{totalPages}</b>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-sm border border-zinc-800/40 bg-[#050817]">
          <table className="w-full min-w-[1450px] table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-white/[0.015]">
                <th className="w-[3%] px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePageRows}
                    className="h-3 w-3 cursor-pointer accent-[#D0E7E6]"
                  />
                </th>
                <th className="w-[6%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Image</th>
                <th className="w-[10%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Listing ID</th>
                <th className="w-[12%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Market Place</th>
                <th className="w-[25%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Product Title</th>
                <th className="w-[10%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">SKU</th>
                <th className="w-[8%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Status</th>
                <th className="w-[10%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Daraz Created</th>
                <th className="w-[8%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Qty</th>
                <th className="w-[8%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Price</th>
                <th className="w-[3%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-2 py-10">
                    <Loader label="Loading Daraz products..." minHeight="0" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-2 py-10 text-center text-zinc-400">
                    No Daraz products found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => {
                  const key = String(row.id || row.listingId || row.sku || index);
                  const selected = selectedRows.includes(key);

                  return (
                    <tr key={key} className="border-b border-zinc-800/60 hover:bg-white/[0.04]">
                      <td className="px-2 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRow(key)}
                          className="h-3 w-3 cursor-pointer accent-[#D0E7E6]"
                        />
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => row.image && setImagePreview(row)}
                          className="mx-auto flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-zinc-800/40 bg-zinc-950 hover:border-[#D0E7E6]/50"
                        >
                          {row.image ? (
                            <img
                              src={row.image}
                              alt={row.title}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Package size={14} className="text-zinc-600" />
                          )}
                        </button>
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => openProduct(row)}
                          title={row.listingId}
                          className="mx-auto block max-w-full cursor-pointer truncate text-center text-[12px] font-medium text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
                        >
                          {row.listingId || "-"}
                        </button>
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <p title={`Daraz ${row.accountName || "-"}`} className="truncate text-[12px] font-medium text-zinc-300">
                          Daraz {row.accountName || "-"}
                        </p>
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => openProduct(row)}
                          title={row.title}
                          className="whitespace-normal break-words text-center text-[11px] font-normal leading-[1.3] text-zinc-300 hover:text-[#D0E7E6]"
                        >
                          {row.title}
                        </button>
                      </td>

                      <td className="px-2 py-2 text-center align-middle text-[11px] text-zinc-400">
                        {row.sku && row.skuCount <= 1 ? (
                          <button
                            type="button"
                            onClick={() => openOverlay(`/order-management/sku-report/${encodeURIComponent(row.sku)}`)}
                            className="block w-full cursor-pointer truncate text-orange-300 underline decoration-dotted hover:text-orange-200"
                            title={`View SKU report for ${row.sku}`}
                          >
                            {row.sku}
                          </button>
                        ) : (
                          <span className="block truncate" title={row.skuCount > 1 ? "Parent product — see child SKUs for analysis" : ""}>
                            {row.sku || "-"}
                          </span>
                        )}

                        {row.sku && skuMappingByWrong[row.sku] ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSkuMapDrafts((prev) => ({
                                ...prev,
                                [row.sku]: skuMappingByWrong[row.sku].correct_sku,
                              }))
                            }
                            className="mt-0.5 block w-full truncate text-[10px] font-semibold text-emerald-300"
                            title="Mapped correct SKU — click to edit"
                          >
                            → {skuMappingByWrong[row.sku].correct_sku}
                          </button>
                        ) : (
                          row.sku &&
                          skuMapDrafts[row.sku] === undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                setSkuMapDrafts((prev) => ({ ...prev, [row.sku]: "" }))
                              }
                              className="mt-0.5 block w-full truncate text-[10px] text-zinc-600 hover:text-zinc-400"
                            >
                              + Map correct SKU
                            </button>
                          )
                        )}

                        {row.sku && skuMapDrafts[row.sku] !== undefined && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <input
                              value={skuMapDrafts[row.sku]}
                              onChange={(e) =>
                                setSkuMapDrafts((prev) => ({ ...prev, [row.sku]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveSkuMapping(row.sku);
                                if (e.key === "Escape") {
                                  setSkuMapDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[row.sku];
                                    return next;
                                  });
                                }
                              }}
                              placeholder="Correct SKU"
                              disabled={skuMapSavingKey === row.sku}
                              className="h-6 w-full min-w-0 border border-zinc-700 bg-zinc-950 px-1 text-[10px] text-zinc-200 outline-none focus:border-emerald-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSkuMapping(row.sku)}
                              disabled={skuMapSavingKey === row.sku}
                              title="Save mapping"
                              className="shrink-0 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                            >
                              <Check size={13} />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center align-middle text-[12px] text-zinc-300">{row.statusLabel || "-"}</td>
                      <td className="px-2 py-2 text-center align-middle text-[12px] text-zinc-400">{row.darazCreatedLabel}</td>
                      <td className="px-2 py-2 text-center align-middle text-[12px] font-medium text-zinc-300">
                        <input
                          type="number"
                          min="0"
                          defaultValue={row.qtyNumber === null ? row.qty : row.qtyNumber}
                          disabled={stockSavingKey === key}
                          onBlur={(event) => updateDarazRowStock(row, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                          }}
                          className="mx-auto h-8 w-20 rounded-sm border border-yellow-200/70 bg-[#050817] px-2 text-center text-[12px] font-semibold text-zinc-100 outline-none focus:border-yellow-400 disabled:opacity-60"
                        />
                      </td>
                      <td className="px-2 py-2 text-center align-middle text-[12px] font-medium text-zinc-300">{row.price}</td>

                      <td className="px-2 py-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openProduct(row)}
                            title="View"
                            className="flex h-6 w-6 items-center justify-center rounded-sm text-zinc-400 hover:bg-white/5 hover:text-[#D0E7E6]"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            title="Edit"
                            className="flex h-6 w-6 items-center justify-center rounded-sm text-zinc-400 hover:bg-white/5 hover:text-[#D0E7E6]"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openDelete(row)}
                            title="Delete"
                            className="flex h-6 w-6 items-center justify-center rounded-sm text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800/60 pt-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <span>Rows per page</span>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className={cx("h-8 bg-[#050817] px-2 text-zinc-200 outline-none", buttonClass)}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className={cx("flex h-8 items-center gap-1 px-2.5 text-zinc-300", buttonClass)}
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
              const pageNumber =
                totalPages <= 5
                  ? index + 1
                  : safePage <= 3
                    ? index + 1
                    : safePage >= totalPages - 2
                      ? totalPages - 4 + index
                      : safePage - 2 + index;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => goToPage(pageNumber)}
                  className={cx(
                    "h-8 min-w-8 rounded-sm border-b-2 px-1.5 font-semibold hover:-translate-y-[1px]",
                    safePage === pageNumber
                      ? "border-yellow-400 text-yellow-300"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className={cx("flex h-8 items-center gap-1 px-2.5 text-zinc-300", buttonClass)}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {accountFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[860px] overflow-hidden rounded-2xl border border-zinc-700 bg-[#172235] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#653bb3] px-4 py-3">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Daraz Account Filter</h3>
                <p className="mt-0.5 text-[12px] text-purple-200/80">Select Daraz accounts.</p>
              </div>

              <button
                type="button"
                onClick={() => setAccountFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[13px] text-zinc-300">
                  Accounts: <b className="text-white">{selectedAccountIds.length}</b> of <b className="text-white">{accounts.length}</b>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-8 rounded-sm border border-white/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 hover:bg-zinc-100"
                >
                  Clear All
                </button>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">Account Filter</h4>
                    <p className="mt-0.5 text-[11px] text-zinc-400">Select Daraz accounts.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllAccountsFilter}
                      className="h-8 rounded-sm border border-[#D0E7E6]/30 bg-[#D0E7E6] px-3 text-[12px] font-semibold text-zinc-950 hover:bg-[#c0f7f4]"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={clearAccountFilterOnly}
                      className="h-8 rounded-sm border border-white/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 hover:bg-zinc-100"
                    >
                      Clear Account
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {accounts.map((account) => {
                    const id = String(getAccountId(account));
                    const checked = selectedAccountIds.includes(id);

                    return (
                      <label
                        key={id}
                        className={cx(
                          "flex cursor-pointer items-center justify-between rounded-sm border px-3 py-3 transition",
                          checked
                            ? "border-[#D0E7E6]/40 bg-[#D0E7E6]/5"
                            : "border-white/10 bg-white/[0.03] hover:border-[#D0E7E6]/30"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-white">{getAccountName(account)}</p>
                          <p className="mt-0.5 text-[11px] text-zinc-400">Daraz</p>
                        </div>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAccountFilter(id)}
                          className="h-4 w-4 cursor-pointer accent-[#D0E7E6]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={clearFilters}
                className="h-8 rounded-sm border border-white/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 hover:bg-zinc-100"
              >
                Clear Filters
              </button>

              <button
                type="button"
                onClick={() => setAccountFilterOpen(false)}
                className="h-8 rounded-sm border border-cyan-500/30 bg-cyan-600 px-3 text-[12px] font-semibold text-white hover:bg-cyan-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {imagePreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="flex w-full max-w-155 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between bg-[#653bb3] px-4 py-3">
              <h3 className="truncate text-[15px] font-semibold text-white">Product Image</h3>

              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex justify-center bg-[#0b1220] px-4 py-4">
              <div className="flex max-h-[65vh] w-full items-center justify-center overflow-hidden border border-[#653bb3]/20 bg-white p-3">
                <img
                  src={imagePreview.image}
                  alt={imagePreview.title}
                  className="max-h-[60vh] max-w-full object-contain"
                />
              </div>
            </div>

            <div className="px-4 pb-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Image URL
              </p>
              <p title={imagePreview.image} className="break-all text-xs font-medium leading-5 text-slate-400">
                {imagePreview.image}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {syncOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#050817] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#653bb3] px-4 py-3">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Select Daraz Accounts to Sync</h3>
                <p className="mt-0.5 text-[12px] text-purple-200/80">Selected accounts will sync.</p>
              </div>

              <button
                type="button"
                onClick={() => !syncing && setSyncOpen(false)}
                disabled={syncing}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-4 py-3">
              <label className="mb-3 flex cursor-pointer items-center justify-between rounded-sm border border-zinc-800/60 bg-white/[0.02] px-3 py-2">
                <div>
                  <p className="text-[13px] font-semibold text-zinc-200">Select All Daraz Accounts</p>
                  <p className="text-[12px] text-zinc-500">{syncIds.length} of {accounts.length} selected</p>
                </div>

                <input
                  type="checkbox"
                  checked={accounts.length > 0 && syncIds.length === accounts.length}
                  onChange={() =>
                    setSyncIds(
                      syncIds.length === accounts.length
                        ? []
                        : accounts.map((account) => String(getAccountId(account)))
                    )
                  }
                  disabled={syncing}
                  className="h-4 w-4 cursor-pointer accent-[#D0E7E6]"
                />
              </label>

              <div className="space-y-2">
                {accounts.map((account) => {
                  const id = String(getAccountId(account));
                  const checked = syncIds.includes(id);
                  const active = syncingId === id;

                  return (
                    <label
                      key={id}
                      className={cx(
                        "flex cursor-pointer items-center justify-between rounded-sm border px-3 py-2",
                        checked
                          ? "border-[#D0E7E6]/40 bg-[#D0E7E6]/5"
                          : "border-zinc-800/60 bg-white/[0.01]"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-zinc-100">{getAccountName(account)}</p>
                        <p className="mt-0.5 text-[12px] text-zinc-500">
                          ID: {id}{active ? <span className="text-yellow-300"> | Syncing...</span> : null}
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSyncAccount(id)}
                        disabled={syncing}
                        className="ml-3 h-4 w-4 cursor-pointer accent-[#D0E7E6]"
                      />
                    </label>
                  );
                })}
              </div>

              {syncResults.length ? (
                <div className="mt-3 space-y-1 rounded-sm border border-zinc-800/60 bg-black/20 p-2">
                  {syncResults.map((result) => (
                    <p
                      key={result.id}
                      className={cx("text-[12px]", result.success ? "text-emerald-400" : "text-red-400")}
                    >
                      <span className="font-medium">{result.name}</span>
                      <span className="text-zinc-500"> — {result.message}</span>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800/70 px-4 py-3">
              <button
                type="button"
                onClick={() => !syncing && setSyncOpen(false)}
                disabled={syncing}
                className={cx("h-8 px-3 text-zinc-300", buttonClass)}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={syncSelectedAccounts}
                disabled={syncing || !syncIds.length}
                className="flex h-8 items-center gap-1 rounded-sm border border-[#D0E7E6]/30 bg-[#D0E7E6] px-3 font-semibold text-zinc-950 hover:bg-[#c0f7f4] disabled:opacity-40"
              >
                {syncing ? "Syncing..." : "Start Sync"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ExportCsvModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Daraz Products CSV"
        columns={DARAZ_EXPORT_COLUMNS}
        datePresetOptions={DARAZ_EXPORT_DATE_PRESETS}
        accounts={accounts.map((account) => ({
          id: getAccountId(account),
          label: getAccountName(account),
        }))}
        buttonColor="green"
        onExport={handleExportCsv}
      />
    </div>
  );
}
