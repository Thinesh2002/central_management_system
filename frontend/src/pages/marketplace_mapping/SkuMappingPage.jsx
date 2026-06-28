import { useEffect, useMemo, useState } from 'react';
import api from '../../config/api';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import FilterSection, { FilterField, FilterInput, FilterSelect } from '../../components/ui/FilterSection';

const empty = { platform: 'DARAZ', account_id: '', account_code: '', marketplace_sku: '', local_sku: '', marketplace_item_id: '' };

function normalizeList(response) {
  return response?.data?.data || response?.data?.accounts || response?.data?.rows || response?.data || [];
}

function getAccountCode(account = {}) {
  return account.account_code || account.code || account.account_uid || account.short_code || '';
}

function getAccountName(account = {}) {
  return account.account_name || account.name || account.store_name || getAccountCode(account) || `Account ${account.id || ''}`;
}

function getPlatform(account = {}) {
  return String(account.platform_code || account.platform || account.marketplace || '').toUpperCase();
}

export default function SkuMappingPage() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [skuRows, setSkuRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [filters, setFilters] = useState({ search: '', platform: '', account_code: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredAccounts = useMemo(() => {
    const platform = String(form.platform || '').toUpperCase();
    return accounts.filter((account) => {
      const accountPlatform = getPlatform(account);
      if (platform === 'WOO') return accountPlatform === 'WOO' || accountPlatform === 'WOOCOMMERCE';
      return accountPlatform === platform;
    });
  }, [accounts, form.platform]);

  const visibleRows = useMemo(() => {
    const q = String(filters.search || '').toLowerCase().trim();
    const platform = String(filters.platform || '').toUpperCase();
    const account = String(filters.account_code || '').toLowerCase().trim();
    return rows.filter((row) => {
      const text = `${row.platform || ''} ${row.account_code || ''} ${row.account_id || ''} ${row.marketplace_sku || ''} ${row.local_sku || ''} ${row.marketplace_item_id || ''}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (platform && String(row.platform || '').toUpperCase() !== platform) return false;
      if (account && !String(row.account_code || row.account_id || '').toLowerCase().includes(account)) return false;
      return true;
    });
  }, [rows, filters]);

  const localSkuOptions = useMemo(() => {
    const seen = new Set();
    return skuRows
      .map((row) => String(row.local_sku || row.sku || '').trim())
      .filter((sku) => {
        if (!sku || seen.has(sku)) return false;
        seen.add(sku);
        return true;
      })
      .slice(0, 500);
  }, [skuRows]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [mappingResponse, accountsResponse, metricsResponse] = await Promise.all([
        erpApi.skuMappings({ limit: 300 }),
        api.get('/marketplace/accounts').catch(() => ({ data: [] })),
        erpApi.productMetrics({ limit: 500 }).catch(() => ({ data: { rows: [] } })),
      ]);
      setRows(mappingResponse.data?.rows || mappingResponse.data?.data || []);
      setAccounts(normalizeList(accountsResponse));
      setSkuRows(metricsResponse.data?.rows || metricsResponse.data?.data || []);
    } catch (err) {
      setError(getApiError(err, 'SKU mappings load failed.'));
    } finally {
      setLoading(false);
    }
  }

  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handlePlatformChange(platform) {
    setForm({ ...empty, platform });
  }

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function resetFilters() {
    setFilters({ search: '', platform: '', account_code: '' });
  }

  function handleAccountChange(value) {
    if (!value) return updateForm({ account_id: '', account_code: '' });
    const selected = filteredAccounts.find((account) => String(account.id || account.account_id) === String(value));
    updateForm({
      account_id: selected?.id || selected?.account_id || '',
      account_code: getAccountCode(selected || {}),
    });
  }

  async function submit(event) {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      await erpApi.saveSkuMapping(form);
      setMessage('SKU mapping saved. Daraz/Woo wrong SKU will now map to this local SKU.');
      setForm({ ...empty, platform: form.platform });
      await load();
    } catch (err) {
      setError(getApiError(err, 'SKU mapping save failed.'));
    }
  }

  useEffect(() => { load(); }, []);
  if (loading) return <PageLoader label="Loading SKU mappings..." />;

  return (
    <div className="page-shell">
      <div className="page-header-card">
        <h1 className="text-xl font-bold">SKU Mapping</h1>
        <p className="mt-1 text-sm text-slate-500">
          Daraz/Woo wrong SKU ah correct local SKU ku map pannunga. This mapping now saves in Product Management DB, so stock reduce and SKU reports use one source.
        </p>
      </div>

      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

      <form onSubmit={submit} className="erp-card grid gap-3 lg:grid-cols-[130px_1fr_1fr_1fr_150px]">
        <select className="erp-input" value={form.platform} onChange={(event) => handlePlatformChange(event.target.value)}>
          <option value="DARAZ">DARAZ</option>
          <option value="WOO">WOO</option>
        </select>

        <select className="erp-input" value={form.account_id} onChange={(event) => handleAccountChange(event.target.value)}>
          <option value="">Select account from database</option>
          {filteredAccounts.map((account) => {
            const id = account.id || account.account_id;
            const code = getAccountCode(account);
            return (
              <option key={id || code} value={id || ''}>
                {code ? `${code} - ` : ''}{getAccountName(account)}
              </option>
            );
          })}
        </select>

        <input
          className="erp-input"
          placeholder="Marketplace SKU / Wrong SKU"
          value={form.marketplace_sku}
          onChange={(event) => updateForm({ marketplace_sku: event.target.value })}
          required
        />

        <input
          className="erp-input"
          placeholder="Local SKU"
          value={form.local_sku}
          list="local-sku-options"
          onChange={(event) => updateForm({ local_sku: event.target.value })}
          required
        />
        <datalist id="local-sku-options">
          {localSkuOptions.map((sku) => <option key={sku} value={sku} />)}
        </datalist>

        <button className="erp-btn-primary justify-center" type="submit">Save Mapping</button>
      </form>

      <FilterSection
        title="Search & Filter SKU Mappings"
        filterCount={Object.values(filters).filter(Boolean).length}
        onSearch={(event) => { event.preventDefault(); }}
        onOpenFilters={() => {}}
        onClear={resetFilters}
      >
        <FilterField label="SKU / Item ID" icon="sku">
          <FilterInput value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search marketplace SKU / local SKU / item ID" />
        </FilterField>
        <FilterField label="Platform" icon="select">
          <FilterSelect value={filters.platform} onChange={(event) => updateFilter('platform', event.target.value)}>
            <option value="">All platform</option>
            <option value="DARAZ">Daraz</option>
            <option value="WOO">Woo</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Account" icon="select">
          <FilterInput value={filters.account_code} onChange={(event) => updateFilter('account_code', event.target.value)} placeholder="Search account code" />
        </FilterField>
      </FilterSection>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr><th>Platform</th><th>Account</th><th>Marketplace SKU</th><th>Local SKU</th><th>Item ID</th><th>Status</th></tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id || `${row.platform}-${row.marketplace_sku}-${row.local_sku}`}>
                <td>{row.platform}</td>
                <td>{row.account_code || row.account_id || '-'}</td>
                <td className="font-mono text-yellow-100">{row.marketplace_sku}</td>
                <td className="font-mono text-emerald-100">{row.local_sku}</td>
                <td>{row.marketplace_item_id || '-'}</td>
                <td>{row.status || 'active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
