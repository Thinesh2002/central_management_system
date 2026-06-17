import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Database, Layers, PackagePlus, RefreshCcw, Save, Search, Settings, ShoppingBag, Tags, Truck } from "lucide-react";
import { unifiedInventoryApi, extractApiMessage } from "../../services/unifiedInventory.service";

const money = (value) => Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const healthLabel = {
  healthy: "Healthy",
  low_stock: "Low stock",
  stock_mismatch: "Stock mismatch",
  sku_not_mapped: "SKU not mapped",
  sku_not_in_system: "SKU not in system",
  cost_missing: "Cost missing"
};

function AlertBox({ type = "info", children }) {
  const cls = type === "error" ? "border-red-200 bg-red-50 text-red-700" : type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-cyan-200 bg-cyan-50 text-cyan-800";
  return <div className={`border rounded px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

function TopCard({ title, value, note, icon: Icon }) {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-stone-500">{title}</p>
          <h3 className="text-2xl font-semibold text-slate-900 mt-1">{value ?? 0}</h3>
          <p className="text-xs text-stone-500 mt-1">{note}</p>
        </div>
        <Icon size={20} className="text-[#007185]" />
      </div>
    </div>
  );
}

function AddProductPanel({ onSaved, packRules }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ sku: "", product_name: "", brand: "", buy_price: "", selling_price: "", stock: "0", pack_size: "1", image_url: "" });

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await unifiedInventoryApi.addProduct(form);
      setForm({ sku: "", product_name: "", brand: "", buy_price: "", selling_price: "", stock: "0", pack_size: "1", image_url: "" });
      setOpen(false);
      await onSaved?.("Product saved successfully. Local inventory is ready.");
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-sm">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <span className="font-semibold flex items-center gap-2"><PackagePlus size={17} /> Add new local product / SKU</span>
        <span className="text-xs text-[#007185]">{open ? "Close" : "Open"}</span>
      </button>
      {open && (
        <div className="border-t p-4 space-y-3">
          {error && <AlertBox type="error">{error}</AlertBox>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="border px-3 py-2 rounded-sm" placeholder="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <input className="border px-3 py-2 rounded-sm md:col-span-2" placeholder="Product name *" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            <input className="border px-3 py-2 rounded-sm" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <input className="border px-3 py-2 rounded-sm" placeholder="Buy price / cost" value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })} />
            <input className="border px-3 py-2 rounded-sm" placeholder="Selling price" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
            <input className="border px-3 py-2 rounded-sm" placeholder="Opening stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <select className="border px-3 py-2 rounded-sm" value={form.pack_size} onChange={(e) => setForm({ ...form, pack_size: e.target.value })}>
              {(packRules || []).map((p) => <option key={p.pack_size} value={p.pack_size}>{p.pack_label || p.pack_code}</option>)}
            </select>
            <input className="border px-3 py-2 rounded-sm md:col-span-3" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <button onClick={save} disabled={saving} className="bg-[#ffce00] hover:bg-[#f7c600] text-slate-900 font-semibold rounded-sm px-4 py-2">{saving ? "Saving..." : "Save product"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StockInput({ row, onSaved }) {
  const [value, setValue] = useState(row.channel === "local" ? (row.local_available_stock ?? 0) : (row.channel_stock ?? 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(row.channel === "local" ? (row.local_available_stock ?? 0) : (row.channel_stock ?? 0));
  }, [row.channel, row.local_available_stock, row.channel_stock]);

  const save = async () => {
    if (String(value) === String(row.channel === "local" ? (row.local_available_stock ?? 0) : (row.channel_stock ?? 0))) return;
    setSaving(true);
    try {
      await unifiedInventoryApi.updateStock({
        channel: row.channel,
        account_code: row.account_code,
        sku: row.system_sku || row.sku,
        channel_sku: row.sku,
        seller_sku: row.sku,
        new_stock: Number(value)
      });
      onSaved?.(`${row.channel.toUpperCase()} stock saved for ${row.sku}. ${row.channel === "local" ? "Local inventory updated." : "Channel update queued."}`);
    } catch (e) {
      onSaved?.(extractApiMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      className={`w-20 border px-2 py-1 text-right rounded-sm ${saving ? "bg-yellow-50" : "bg-white"}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

function MappingBox({ row, onSaved }) {
  const [systemSku, setSystemSku] = useState(row.system_sku || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!systemSku.trim()) return onSaved?.("Enter correct system SKU before saving mapping.", "error");
    setSaving(true);
    try {
      await unifiedInventoryApi.saveMapping({
        channel: row.channel,
        account_code: row.account_code,
        channel_sku: row.sku,
        daraz_seller_sku: row.sku,
        system_sku: systemSku.trim(),
        notes: "Mapped from Manage All Inventory"
      });
      onSaved?.(`SKU mapping saved: ${row.sku} → ${systemSku}`);
    } catch (e) {
      onSaved?.(extractApiMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  if (row.channel === "local") return <span className="text-stone-400 text-xs">Local SKU</span>;

  return (
    <div className="flex gap-1 min-w-[220px]">
      <input className="border rounded-sm px-2 py-1 flex-1" placeholder="Correct system SKU" value={systemSku} onChange={(e) => setSystemSku(e.target.value)} />
      <button onClick={save} disabled={saving} className="border border-[#007185] text-[#007185] px-2 rounded-sm hover:bg-cyan-50"><Save size={14} /></button>
    </div>
  );
}

export default function UnifiedInventoryCenter() {
  const [dashboard, setDashboard] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [packRules, setPackRules] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ channel: "all", account_code: "", search: "", status: "", health: "", limit: 50, page: 1 });

  const showMessage = (text, type = "success") => {
    if (type === "error") { setError(text); setMessage(""); }
    else { setMessage(text); setError(""); }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      await unifiedInventoryApi.bootstrap();
      const [dash, list, packs] = await Promise.all([
        unifiedInventoryApi.dashboard(),
        unifiedInventoryApi.products(filters),
        unifiedInventoryApi.packRules()
      ]);
      setDashboard(dash);
      setRows(list.rows || []);
      setTotal(list.total || 0);
      setPackRules(packs.rows || []);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const byHealth = rows.reduce((acc, r) => { acc[r.health_status] = (acc[r.health_status] || 0) + 1; return acc; }, {});
    return byHealth;
  }, [rows]);

  return (
    <div className="space-y-3 text-[13px]">
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manage All Inventory</h1>
          <p className="text-stone-500 mt-1">Local stock, Daraz stock, WooCommerce stock, SKU mapping and channel update queue in one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="border border-[#007185] text-[#007185] px-3 py-2 rounded-sm flex items-center gap-2"><RefreshCcw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
          <button onClick={() => window.location.href = "/add-product"} className="bg-[#232f3e] text-white px-3 py-2 rounded-sm">Open Full Product Create</button>
        </div>
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}
      {message && <AlertBox type="success">{message}</AlertBox>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <TopCard icon={Database} title="Local SKUs" value={dashboard?.inventory?.skus || 0} note={`${dashboard?.inventory?.stock || 0} stock available`} />
        <TopCard icon={ShoppingBag} title="Daraz SKUs" value={dashboard?.daraz?.skus || 0} note={`${dashboard?.daraz?.unmapped || 0} need SKU mapping`} />
        <TopCard icon={Truck} title="WooCommerce Products" value={dashboard?.woo?.products || 0} note={`${dashboard?.woo?.stock || 0} channel stock`} />
        <TopCard icon={AlertTriangle} title="Issues in page" value={(counts.stock_mismatch || 0) + (counts.sku_not_mapped || 0) + (counts.sku_not_in_system || 0) + (counts.cost_missing || 0)} note="Based on current filters" />
      </div>

      <AddProductPanel packRules={packRules} onSaved={(msg) => { showMessage(msg); load(); }} />

      <div className="bg-white border border-stone-200 rounded-sm">
        <div className="p-3 border-b grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
          <label className="text-xs text-stone-600 lg:col-span-2">Channel
            <select className="mt-1 w-full border px-2 py-2 rounded-sm" value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
              <option value="all">All channels</option>
              <option value="local">Local system</option>
              <option value="daraz">Daraz</option>
              <option value="woo">WooCommerce</option>
            </select>
          </label>
          <label className="text-xs text-stone-600 lg:col-span-2">Account
            <input className="mt-1 w-full border px-2 py-2 rounded-sm" placeholder="BH / all" value={filters.account_code} onChange={(e) => setFilters({ ...filters, account_code: e.target.value })} />
          </label>
          <label className="text-xs text-stone-600 lg:col-span-4">Search SKU, title, item ID
            <div className="mt-1 flex border rounded-sm overflow-hidden"><input className="flex-1 px-2 py-2 outline-none" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><span className="px-3 py-2 bg-stone-50"><Search size={16} /></span></div>
          </label>
          <label className="text-xs text-stone-600 lg:col-span-2">Health
            <select className="mt-1 w-full border px-2 py-2 rounded-sm" value={filters.health} onChange={(e) => setFilters({ ...filters, health: e.target.value })}>
              <option value="">All health</option>
              <option value="healthy">Healthy</option>
              <option value="stock_mismatch">Stock mismatch</option>
              <option value="sku_not_mapped">SKU not mapped</option>
              <option value="sku_not_in_system">SKU not in system</option>
              <option value="cost_missing">Cost missing</option>
              <option value="low_stock">Low stock</option>
            </select>
          </label>
          <button onClick={load} className="lg:col-span-2 bg-[#007185] text-white px-3 py-2 rounded-sm">Apply filters</button>
        </div>

        <div className="px-3 py-2 border-b flex flex-wrap gap-2 text-xs">
          <span className="font-semibold">1 - {rows.length} of {total}</span>
          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700"><CheckCircle size={12} className="inline mr-1" /> Healthy {counts.healthy || 0}</span>
          <span className="px-2 py-1 rounded-full bg-red-50 text-red-700"><AlertTriangle size={12} className="inline mr-1" /> Mismatch {counts.stock_mismatch || 0}</span>
          <span className="px-2 py-1 rounded-full bg-yellow-50 text-yellow-700"><Tags size={12} className="inline mr-1" /> Not mapped {counts.sku_not_mapped || 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left">
            <thead className="bg-stone-50 text-stone-600 border-b">
              <tr>
                <th className="p-2 w-8"><input type="checkbox" /></th>
                <th className="p-2">Listing status</th>
                <th className="p-2 min-w-[360px]">Product details</th>
                <th className="p-2">Channel</th>
                <th className="p-2">Inventory</th>
                <th className="p-2">Editable stock</th>
                <th className="p-2">Price / Cost</th>
                <th className="p-2 min-w-[260px]">SKU mapping</th>
                <th className="p-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.channel}-${r.account_code || "local"}-${r.sku}-${idx}`} className="border-b align-top hover:bg-stone-50">
                  <td className="p-2"><input type="checkbox" /></td>
                  <td className="p-2"><p className="font-semibold text-slate-900">{r.status || "Active"}</p><p className="text-xs text-stone-500">{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "-"}</p></td>
                  <td className="p-2">
                    <div className="flex gap-3">
                      {r.image_url ? <img src={r.image_url} className="w-14 h-14 object-contain border" /> : <div className="w-14 h-14 border bg-stone-50 flex items-center justify-center"><Layers size={18} className="text-stone-400" /></div>}
                      <div>
                        <p className="font-semibold text-[#007185]">{r.product_name || "Untitled product"}</p>
                        <p className="text-xs text-stone-600">SKU: <span className="font-medium">{r.sku}</span></p>
                        {r.system_sku && <p className="text-xs text-stone-600">System SKU: {r.system_sku}</p>}
                        {r.item_id && <p className="text-xs text-stone-500">Item ID: {r.item_id}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-2"><span className="uppercase font-semibold">{r.channel}</span><p className="text-xs text-stone-500">{r.account_code || "System"}</p></td>
                  <td className="p-2">
                    <p>Local: <b>{r.local_available_stock ?? "-"}</b></p>
                    <p>Channel: <b>{r.channel_stock ?? "-"}</b></p>
                    <p className="text-xs text-stone-500">Reserved: {r.reserved_stock ?? 0}</p>
                  </td>
                  <td className="p-2"><StockInput row={r} onSaved={showMessage} /><p className="text-[11px] text-stone-500 mt-1">Click outside to save</p></td>
                  <td className="p-2"><p>Price: {money(r.price)}</p><p>Buy cost: {Number(r.buy_price || 0) > 0 ? money(r.buy_price) : <span className="text-red-600">Missing</span>}</p></td>
                  <td className="p-2"><MappingBox row={r} onSaved={(msg, type) => { showMessage(msg, type); if (type !== "error") load(); }} /></td>
                  <td className="p-2"><span className={`px-2 py-1 rounded-full text-xs ${r.health_status === "healthy" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{healthLabel[r.health_status] || r.health_status || "Unknown"}</span></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan="9" className="p-8 text-center text-stone-500">No inventory rows found. Add a local product or sync Daraz products.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-3">
        <h3 className="font-semibold flex items-center gap-2"><Settings size={16} /> Pack rules</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {packRules.map((p) => <span key={p.id} className="px-2 py-1 bg-stone-100 rounded text-xs">{p.pack_size} pack → {p.pack_code}</span>)}
        </div>
      </div>
    </div>
  );
}
