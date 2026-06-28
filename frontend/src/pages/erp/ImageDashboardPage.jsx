import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Image, ScanLine, Star, Trash2, UploadCloud } from 'lucide-react';
import erpApi from '../../config/sub_api/erp_api/erpApi';
import { getApiError } from '../../config/api';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterSection, { FilterField, FilterInput, FilterSelect } from '../../components/ui/FilterSection';

const API_BASE = import.meta.env.VITE_IMAGE_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://backend.teckvora.com';
const BACKEND_BASE = API_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');

function resolveImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${BACKEND_BASE}${value}`;
  return `${BACKEND_BASE}/${value}`;
}

function Status({ value }) {
  return <span className={`status-pill status-${value || 'muted'}`}>{value || '-'}</span>;
}

export default function ImageDashboardPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [checkType, setCheckType] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const didMountRef = useRef(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const response = await erpApi.imageDashboard({ search: search || undefined, status: status || undefined, check_type: checkType || undefined, limit: 100 });
      setRows(response.data?.rows || response.data?.data || []);
      setSummary(response.data?.summary || {});
    } catch (err) {
      setError(getApiError(err, 'Image dashboard load failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function audit() {
    try {
      setBusy('audit');
      setMessage('');
      setError('');
      const response = await erpApi.runImageAudit();
      setMessage(`Image audit completed. Checked: ${response.data?.data?.total_checked || 0}`);
      await load();
    } catch (err) {
      setError(getApiError(err, 'Image audit failed.'));
    } finally {
      setBusy('');
    }
  }

  async function updateUrl(row) {
    const nextUrl = window.prompt('Paste correct image URL/path', row.image_url || '');
    if (!nextUrl) return;
    try {
      const imageId = row.product_image_id || row.source_image_id || row.id;
      setBusy(`url-${row.id}`);
      await erpApi.updateImageUrl(imageId, { image_url: nextUrl });
      setMessage('Image URL updated.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Image URL update failed.'));
    } finally {
      setBusy('');
    }
  }

  async function setMain(row) {
    const imageId = row.product_image_id || row.source_image_id || row.id;
    try {
      setBusy(`main-${row.id}`);
      await erpApi.setMainImage(imageId);
      setMessage('Main image updated.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Set main image failed.'));
    } finally {
      setBusy('');
    }
  }

  async function deleteImage(row) {
    const imageId = row.product_image_id || row.source_image_id;
    if (!imageId) {
      setError('This image check is not linked to a local product image record, so it cannot be deleted here.');
      return;
    }

    const ok = window.confirm('Delete this local image record? If another product uses this same image URL, system will block the delete.');
    if (!ok) return;

    try {
      setBusy(`delete-${row.id}`);
      setError('');
      await erpApi.deleteImage(imageId);
      setMessage('Image deleted successfully.');
      await load();
    } catch (err) {
      setError(getApiError(err, 'Image delete failed.'));
    } finally {
      setBusy('');
    }
  }

  async function pushImage(row, marketplace) {
    try {
      setBusy(`${marketplace}-${row.id}`);
      const response = await erpApi.pushImage({ local_sku: row.local_sku, marketplace, image_url: row.image_url });
      setMessage(response.data?.message || `${marketplace} image push queued.`);
    } catch (err) {
      setError(getApiError(err, `${marketplace} image push failed.`));
    } finally {
      setBusy('');
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return undefined;
    }
    const timer = window.setTimeout(() => load(), 500);
    return () => window.clearTimeout(timer);
  }, [search, status, checkType]);

  if (loading) return <PageLoader label="Loading image dashboard..." />;
  if (error && !rows.length) return <ErrorState title="Image dashboard failed" text={error} />;

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Image Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Audit, correct image URL, set main image, and queue Daraz/Woo image sync.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={audit} disabled={busy === 'audit'} className="erp-btn-primary"><ScanLine size={14} /> Run Audit</button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="erp-card"><p className="text-xs text-slate-500">Checks</p><p className="mt-2 text-xl font-bold">{summary.total_checks || rows.length}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Failed</p><p className="mt-2 text-xl font-bold text-red-300">{summary.failed || 0}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Warning</p><p className="mt-2 text-xl font-bold text-amber-300">{summary.warning || 0}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Missing main</p><p className="mt-2 text-xl font-bold">{summary.missing_main || 0}</p></div>
        <div className="erp-card"><p className="text-xs text-slate-500">Low resolution</p><p className="mt-2 text-xl font-bold">{summary.low_resolution || 0}</p></div>
      </div>

      <FilterSection
        title="Search & Filter Images"
        loading={loading}
        filterCount={(status ? 1 : 0) + (checkType ? 1 : 0)}
        onSearch={(event) => { event.preventDefault(); load(); }}
        onOpenFilters={() => setShowAdvanced((prev) => !prev)}
        onClear={() => { setSearch(''); setStatus(''); setCheckType(''); }}
      >
        <FilterField label="SKU / Product" icon="sku">
          <FilterInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU or product name" />
        </FilterField>
        <FilterField label="Status" icon="select">
          <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option><option value="fail">Fail</option><option value="warning">Warning</option><option value="pass">Pass</option>
          </FilterSelect>
        </FilterField>
        {showAdvanced && (
          <FilterField label="Check Type" icon="select">
            <FilterSelect value={checkType} onChange={(e) => setCheckType(e.target.value)}>
              <option value="">All checks</option>
              <option value="missing_main">Missing main</option>
              <option value="low_resolution">Low resolution</option>
              <option value="missing_url">Missing URL</option>
              <option value="sync_failed">Sync failed</option>
              <option value="duplicate_url">Duplicate URL</option>
            </FilterSelect>
          </FilterField>
        )}
      </FilterSection>

      {!rows.length ? <EmptyState title="No image checks" text="Run image audit to create image quality records." /> : (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>Image</th><th>SKU</th><th>Product</th><th>Size</th><th>Type</th><th>Marketplace</th><th>Status</th><th>Message</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const resolved = resolveImageUrl(row.image_url);
                return (
                  <tr key={row.id}>
                    <td>
                      <button type="button" onClick={() => resolved && window.open(resolved, '_blank', 'noopener,noreferrer')} className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
                        {resolved ? <img src={resolved} alt="" className="h-full w-full object-contain" loading="lazy" /> : <Image className="text-slate-500" size={18} />}
                      </button>
                    </td>
                    <td className="font-mono text-yellow-100">{row.local_sku}</td>
                    <td className="max-w-xs">{row.product_name || '-'}</td>
                    <td>{row.width || '-'} x {row.height || '-'}</td>
                    <td>{String(row.check_type || '').replaceAll('_', ' ')}</td>
                    <td>{row.marketplace}</td>
                    <td><Status value={row.status} /></td>
                    <td className="max-w-sm text-slate-500">{row.message}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <button className="erp-btn-secondary" onClick={() => resolved && window.open(resolved, '_blank', 'noopener,noreferrer')}><ExternalLink size={13} /> View</button>
                        <button className="erp-btn-secondary" onClick={() => updateUrl(row)}>Fix URL</button>
                        <button className="erp-btn-secondary" onClick={() => setMain(row)} disabled={busy === `main-${row.id}`}><Star size={13} /> Main</button>
                        <button
                          className="erp-btn-danger"
                          onClick={() => deleteImage(row)}
                          disabled={busy === `delete-${row.id}` || !(row.product_image_id || row.source_image_id)}
                          title={row.product_image_id || row.source_image_id ? "Delete local product image" : "This is a marketplace/missing image check, not a local image record"}
                        >
                          <Trash2 size={13} /> {row.product_image_id || row.source_image_id ? "Delete Image" : "No Local Image"}
                        </button>
                        <button className="erp-btn-secondary" onClick={() => pushImage(row, 'DARAZ')} disabled={busy === `DARAZ-${row.id}`}><UploadCloud size={13} /> Daraz</button>
                        <button className="erp-btn-secondary" onClick={() => pushImage(row, 'WOO')} disabled={busy === `WOO-${row.id}`}><UploadCloud size={13} /> Woo</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
