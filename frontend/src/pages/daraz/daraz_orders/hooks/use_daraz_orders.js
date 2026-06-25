import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../../config/api";
import { darazOrdersApi } from "../../../../config/sub_api/daraz_api/daraz_orders_api";
import { EMPTY_FILTERS, EMPTY_TAB_COUNTS, STATUS_TABS } from "../constants/daraz_order_constants";
import {
  asArray,
  buildGroupedOrders,
  buildOrderParams,
  isTimeoutError,
  normalizeAccounts,
  normalizeOrders,
} from "../utils/daraz_order_utils";

export default function useDarazOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState(EMPTY_TAB_COUNTS);
  const [accountOptions, setAccountOptions] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedAccountCodes, setSelectedAccountCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const groupedOrders = useMemo(() => buildGroupedOrders(orders), [orders]);

  const accountsByCode = useMemo(() => {
    return accountOptions.reduce((map, account) => {
      map[account.code] = account;
      return map;
    }, {});
  }, [accountOptions]);

  const selectedAccountLabel = useMemo(() => {
    if (selectedAccountCodes.length === 0) return "All Accounts";
    if (selectedAccountCodes.length === 1) return accountsByCode[selectedAccountCodes[0]]?.name || selectedAccountCodes[0];
    return `${selectedAccountCodes.length} Accounts`;
  }, [accountsByCode, selectedAccountCodes]);

  const appliedFilterCount = useMemo(() => {
    let count = selectedAccountCodes.length;
    if (filters.sku) count += 1;
    if (filters.order_id) count += 1;
    if (filters.status) count += 1;
    if (filters.date_from) count += 1;
    if (filters.date_to) count += 1;
    if (Number(filters.limit || 25) !== 25) count += 1;
    return count;
  }, [filters, selectedAccountCodes.length]);

  const displayTotal = total || groupedOrders.length || orders.length;
  const totalPages = Math.max(1, Math.ceil(displayTotal / Number(filters.limit || 25)));

  const loadAccounts = useCallback(async () => {
    setAccountLoading(true);

    try {
      const response = await api.get("/marketplace/accounts", {
        params: { platform_code: "DARAZ", marketplace: "daraz" },
      });
      setAccountOptions(normalizeAccounts(response));
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || err?.message || "Failed to load marketplace accounts.");
    } finally {
      setAccountLoading(false);
    }
  }, []);

  const loadTabCounts = useCallback(async (nextFilters, nextAccountCodes) => {
    try {
      const baseFilters = { ...nextFilters, status: "", page: 1, limit: 1 };
      const baseParams = buildOrderParams(baseFilters, nextAccountCodes);
      const allPayload = await darazOrdersApi.getOrders(baseParams);
      const allNormalized = normalizeOrders(allPayload);

      if (allNormalized.statusCounts) {
        setTabCounts(allNormalized.statusCounts);
        return;
      }

      const statusTabs = STATUS_TABS.filter((tab) => tab.key);
      const statusResults = await Promise.all(
        statusTabs.map(async (tab) => {
          try {
            const payload = await darazOrdersApi.getOrders(
              buildOrderParams({ ...baseFilters, status: tab.key }, nextAccountCodes)
            );
            return [tab.countKey, normalizeOrders(payload).total || 0];
          } catch (_) {
            return [tab.countKey, 0];
          }
        })
      );

      setTabCounts({
        ...EMPTY_TAB_COUNTS,
        all: allNormalized.total || 0,
        ...Object.fromEntries(statusResults),
      });
    } catch (_) {
      setTabCounts((prev) => prev || EMPTY_TAB_COUNTS);
    }
  }, []);

  const fetchOrders = useCallback(
    async (nextFilters, nextAccountCodes, refreshCounts = false) => {
      setLoading(true);
      setError("");

      try {
        const payload = await darazOrdersApi.getOrders(buildOrderParams(nextFilters, nextAccountCodes));
        const normalized = normalizeOrders(payload);
        const nextGroupedOrders = buildGroupedOrders(normalized.orders);

        setOrders(normalized.orders);
        setTotal(normalized.total || nextGroupedOrders.length || normalized.orders.length);

        if (refreshCounts) {
          await loadTabCounts(nextFilters, nextAccountCodes);
        }
      } catch (err) {
        setOrders([]);
        setTotal(0);
        setError(err?.response?.data?.message || err?.friendlyMessage || err?.message || "Failed to load Daraz orders.");
      } finally {
        setLoading(false);
      }
    },
    [loadTabCounts]
  );

  useEffect(() => {
    loadAccounts();
    fetchOrders(EMPTY_FILTERS, [], true);
  }, [fetchOrders, loadAccounts]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));
  }

  function runSearch(event) {
    event?.preventDefault?.();
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    fetchOrders(nextFilters, selectedAccountCodes, true);
  }

  function changeStatus(status) {
    const nextFilters = { ...filters, status, page: 1 };
    setFilters(nextFilters);
    fetchOrders(nextFilters, selectedAccountCodes, false);
  }

  function changePage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    fetchOrders(nextFilters, selectedAccountCodes, false);
  }

  function applyAdvancedFilters(nextFilters, nextAccountCodes = []) {
    const cleanAccountCodes = asArray(nextAccountCodes).map((code) => String(code || "").trim()).filter(Boolean);
    const cleanFilters = {
      ...filters,
      ...nextFilters,
      page: 1,
      limit: Number(nextFilters?.limit || filters.limit || 25),
    };

    setSelectedAccountCodes(cleanAccountCodes);
    setFilters(cleanFilters);
    fetchOrders(cleanFilters, cleanAccountCodes, true);
  }

  function clearFilters() {
    const cleared = { ...EMPTY_FILTERS, limit: filters.limit };
    setFilters(cleared);
    setSelectedAccountCodes([]);
    fetchOrders(cleared, [], true);
  }

  async function syncAccounts(accountCodes = selectedAccountCodes) {
    const cleanAccountCodes = asArray(accountCodes).filter(Boolean);
    if (cleanAccountCodes.length === 0) {
      setError("Please select at least one Daraz account before sync.");
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const results = await Promise.allSettled(
        cleanAccountCodes.map((accountCode) =>
          api.post("/daraz/orders/sync", { account_code: accountCode, days_back: 1000, limit: 1000 }, { timeout: 0 })
        )
      );

      const failed = results.filter((result) => result.status === "rejected" && !isTimeoutError(result.reason));
      if (failed.length > 0) setError(`${failed.length} account sync failed. Please check backend logs.`);
      else setSuccessMessage(`${cleanAccountCodes.length} account sync started successfully.`);

      fetchOrders({ ...filters, page: 1 }, selectedAccountCodes, true);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.friendlyMessage || "Daraz order manual sync failed.");
    }
  }

  return {
    orders,
    groupedOrders,
    total,
    displayTotal,
    totalPages,
    tabCounts,
    accountOptions,
    accountsByCode,
    filters,
    selectedAccountCodes,
    selectedAccountLabel,
    appliedFilterCount,
    loading,
    accountLoading,
    error,
    successMessage,
    updateFilter,
    runSearch,
    changeStatus,
    changePage,
    applyAdvancedFilters,
    clearFilters,
    syncAccounts,
  };
}
