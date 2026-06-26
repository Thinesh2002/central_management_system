import { useCallback, useEffect, useState } from 'react';
import { getApiError } from '../../../config/api';

export default function useApiPage(loader, initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await loader(filters);
      const payload = response?.data || response || {};
      const nextRows = payload.rows || payload.data?.rows || (Array.isArray(payload.data) ? payload.data : []) || [];
      setData(payload.data || payload);
      setRows(Array.isArray(nextRows) ? nextRows : []);
      setPagination(payload.pagination || payload.data?.pagination || {});
    } catch (err) {
      setError(getApiError(err));
      setRows([]);
      setData(null);
      setPagination({});
    } finally {
      setLoading(false);
    }
  }, [loader, filters]);

  useEffect(() => { load(); }, [load]);

  return { filters, setFilters, data, rows, pagination, loading, error, reload: load };
}
