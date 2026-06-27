import { useEffect, useState } from 'react';
import marketplaceApi from '../../../config/sub_api/marketplace_management_api/marketplace_api';

function unwrapRows(response) {
  const payload = response?.data || response || {};
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;
  return [];
}

export default function DarazFinanceAccountSelect({ filters, setFilters }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    async function load() {
      const response = await marketplaceApi.getAccounts({ platform_code: 'DARAZ' }).catch(() => null);
      setAccounts(unwrapRows(response));
    }
    load();
  }, []);

  return (
    <select
      value={filters.account_id || ''}
      onChange={(event) => {
        const account = accounts.find((item) => String(item.id || item.account_id) === event.target.value) || {};
        setFilters((prev) => ({
          ...prev,
          account_id: event.target.value,
          account_code: account.account_code || '',
          page: 1,
        }));
      }}
      className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm text-slate-100"
    >
      <option value="">All Daraz accounts</option>
      {accounts.map((account) => <option key={account.id || account.account_id} value={account.id || account.account_id}>{account.account_name || account.account_code}</option>)}
    </select>
  );
}
