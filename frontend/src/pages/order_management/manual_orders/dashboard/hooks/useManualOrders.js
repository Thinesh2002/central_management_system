import { useEffect, useMemo, useState } from "react";

import { DEFAULT_FILTERS } from "../constants/manualOrdersConstants";
import { deleteOrder, fetchManualOrders } from "../services/manualOrdersService";
import { loadProductMapForOrders } from "../services/manualProductLookupService";

import {
  buildParams,
  getPagination,
  normalizeList,
} from "../utils/commonManualOrderUtils";

import { normalizeError } from "../utils/orderFrontendHelpers";

export default function useManualOrders() {
  const [orders, setOrders] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    page: DEFAULT_FILTERS.page || 1,
    limit: DEFAULT_FILTERS.limit || 25,
    order_status: DEFAULT_FILTERS.order_status || "",
    payment_method: DEFAULT_FILTERS.payment_method || "",
    date_from: DEFAULT_FILTERS.date_from || "",
    date_to: DEFAULT_FILTERS.date_to || "",
    search: DEFAULT_FILTERS.search || "",
    q: DEFAULT_FILTERS.q || "",
  });
  const [searchText, setSearchText] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [error, setError] = useState("");

  async function loadOrders(nextFilters = filters) {
    try {
      setLoading(true);
      setError("");

      const cleanFilters = {
        ...nextFilters,
        order_status: nextFilters.order_status || nextFilters.status || "",
        status: nextFilters.order_status || nextFilters.status || "",
        payment_method: nextFilters.payment_method || "",
        date_from: nextFilters.date_from || "",
        date_to: nextFilters.date_to || "",
        search: nextFilters.search || "",
        q: nextFilters.q || nextFilters.search || "",
        page: nextFilters.page || 1,
        limit: nextFilters.limit || 25,
      };

      const response = await fetchManualOrders(buildParams(cleanFilters));
      const list = normalizeList(response);
      const nextProductMap = await loadProductMapForOrders(list);

      setOrders(list);
      setProductMap(nextProductMap);
      setPagination(getPagination(response, cleanFilters, list.length));
    } catch (err) {
      setOrders([]);
      setProductMap({});
      setError(normalizeError(err, "Orders load panna mudiyala"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders(filters);
  }, [
    filters.page,
    filters.limit,
    filters.order_status,
    filters.status,
    filters.payment_method,
    filters.date_from,
    filters.date_to,
    filters.search,
    filters.q,
  ]);

  function applySearch(event) {
    event?.preventDefault?.();

    setFilters((prev) => ({
      ...prev,
      search: searchText.trim(),
      q: searchText.trim(),
      page: 1,
    }));
  }

  function changeTab(status) {
    setFilters((prev) => ({
      ...prev,
      order_status: status || "",
      status: status || "",
      page: 1,
    }));
  }

  function openNewTab(path) {
    window.open(
      `${window.location.origin}${path}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleDelete(orderId) {
    if (!orderId) return;

    const ok = window.confirm(`Delete order ${orderId}?`);
    if (!ok) return;

    try {
      setDeleteId(orderId);
      setError("");

      await deleteOrder(orderId);
      await loadOrders(filters);
    } catch (err) {
      setError(normalizeError(err, "Order delete panna mudiyala"));
    } finally {
      setDeleteId("");
    }
  }

  const rows = useMemo(() => orders, [orders]);

  return {
    rows,
    orders,
    productMap,
    filters,
    searchText,
    setSearchText,
    pagination,
    loading,
    deleteId,
    error,
    setFilters,
    loadOrders,
    applySearch,
    changeTab,
    openNewTab,
    handleDelete,
  };
}