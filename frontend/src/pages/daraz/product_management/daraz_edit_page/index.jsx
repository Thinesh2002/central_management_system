import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { darazProductsApi } from "../../../../config/sub_api/daraz_api/daraz_products_api";
import { getApiError } from "../../../../config/api";
import PageLoader from "../../../../components/ui/PageLoader";
import ErrorState from "../../../../components/ui/ErrorState";

function unwrap(response) {
  return response?.data?.data || response?.data?.product || response?.data || response;
}

export default function DarazProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({ local_sku: "", local_product_id: "", sync_status: "", note: "" });
  const [rawText, setRawText] = useState("{}");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await darazProductsApi.view(id);
      const data = unwrap(response);
      setProduct(data);
      setForm({
        local_sku: data?.local_sku || data?.sku || "",
        local_product_id: data?.local_product_id || "",
        sync_status: data?.sync_status || data?.status || "",
        note: data?.note || "",
      });
      setRawText(JSON.stringify(data?.raw_json || data?.raw || data || {}, null, 2));
    } catch (err) {
      setError(getApiError(err, "Daraz edit page load failed."));
    } finally {
      setLoading(false);
    }
  }

  async function saveLocalLink(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      setError("");
      await darazProductsApi.updateLocalLink(id, {
        local_sku: form.local_sku,
        local_product_id: form.local_product_id,
        note: form.note,
      });
      setMessage("Daraz local SKU link saved.");
      await load();
    } catch (err) {
      setError(getApiError(err, "Daraz local link save failed."));
    } finally {
      setSaving(false);
    }
  }

  async function saveStatus() {
    try {
      setSaving(true);
      setMessage("");
      setError("");
      await darazProductsApi.updateStatus(id, { sync_status: form.sync_status, status: form.sync_status, note: form.note });
      setMessage("Daraz local status saved.");
      await load();
    } catch (err) {
      setError(getApiError(err, "Daraz status save failed."));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const title = useMemo(() => product?.title || product?.name || product?.product_name || `Daraz Product ${id}`, [product, id]);

  if (loading) return <PageLoader label="Loading Daraz product edit..." />;
  if (error && !product) return <ErrorState title="Daraz edit page failed" text={error} />;

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={14}/> Back</button>
          <h1 className="text-xl font-bold">Edit Daraz Product</h1>
          <p className="mt-1 text-sm text-slate-500">{title}</p>
        </div>
      </div>
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
      <form onSubmit={saveLocalLink} className="erp-card space-y-4">
        <h2 className="text-sm font-bold">Local SKU Mapping</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="erp-input" placeholder="Local SKU" value={form.local_sku} onChange={(e)=>setForm(p=>({...p,local_sku:e.target.value}))}/>
          <input className="erp-input" placeholder="Local Product ID" value={form.local_product_id} onChange={(e)=>setForm(p=>({...p,local_product_id:e.target.value}))}/>
          <input className="erp-input" placeholder="Local Status" value={form.sync_status} onChange={(e)=>setForm(p=>({...p,sync_status:e.target.value}))}/>
          <input className="erp-input" placeholder="Note" value={form.note} onChange={(e)=>setForm(p=>({...p,note:e.target.value}))}/>
        </div>
        <div className="flex gap-2"><button disabled={saving} className="erp-btn-primary" type="submit"><Save size={14}/> Save Mapping</button><button disabled={saving} className="erp-btn-secondary" type="button" onClick={saveStatus}>Save Status</button></div>
      </form>
      <div className="erp-card"><h2 className="mb-3 text-sm font-bold">Raw Daraz Data Preview</h2><textarea className="erp-input min-h-[360px] font-mono text-xs" value={rawText} onChange={(e)=>setRawText(e.target.value)} /></div>
    </div>
  );
}
