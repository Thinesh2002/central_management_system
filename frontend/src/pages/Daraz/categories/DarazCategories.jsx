import React, { useEffect, useState } from "react";
import { Layers, RefreshCw, Search, Tags } from "lucide-react";
import { darazApi, extractApiMessage, formatDateTime } from "../../../services/daraz/darazCentral.service";

export default function DarazCategories() {
  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await darazApi.getCategories({ search, limit: 500 });
      setCategories(data.rows || []);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Daraz categories could not be loaded.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncTree = async () => {
    setNotice({ type: "info", text: "Daraz category tree sync started. This can take a moment." });
    try {
      const res = await darazApi.syncCategories();
      setNotice({ type: "success", text: res?.message || "Daraz category tree synced successfully." });
      await loadCategories();
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Category tree sync failed.") });
    }
  };

  const openCategory = async (category) => {
    setSelected(category);
    setAttributes([]);
    setBrands([]);
    setPanelLoading(true);
    try {
      const [attrData, brandData] = await Promise.allSettled([
        darazApi.getCategoryAttributes(category.category_id),
        darazApi.getCategoryBrands(category.category_id)
      ]);
      if (attrData.status === "fulfilled") setAttributes(attrData.value.rows || []);
      if (brandData.status === "fulfilled") setBrands(brandData.value.rows || []);
    } catch (error) {
      setNotice({ type: "warning", text: extractApiMessage(error, "Category details could not be fully loaded.") });
    } finally {
      setPanelLoading(false);
    }
  };

  const syncSelectedDetails = async () => {
    if (!selected?.category_id) return;
    setPanelLoading(true);
    setNotice({ type: "info", text: `Syncing attributes and brands for category ${selected.category_id}…` });
    try {
      await Promise.allSettled([
        darazApi.syncCategoryAttributes(selected.category_id),
        darazApi.syncCategoryBrands(selected.category_id)
      ]);
      setNotice({ type: "success", text: "Category attributes and brand list refreshed successfully." });
      await openCategory(selected);
    } catch (error) {
      setNotice({ type: "error", text: extractApiMessage(error, "Category attribute/brand sync failed.") });
    } finally {
      setPanelLoading(false);
    }
  };

  const visibleCategories = categories.filter((cat) => {
    const q = search.toLowerCase();
    return !q || String(cat.category_name || "").toLowerCase().includes(q) || String(cat.category_id || "").includes(q);
  });

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-5 bg-stone-50 min-h-screen text-stone-800 text-xs">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-semibold uppercase tracking-wide text-[11px]"><Layers size={15} /> Daraz Catalog Setup</div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">Category, Attribute & Brand Center</h1>
          <p className="text-[11px] text-stone-500 mt-1">Prepare marketplace-required attributes before creating or transferring listings.</p>
        </div>
        <button onClick={syncTree} className="px-3 py-2 bg-[#002f36] text-white rounded shadow-sm hover:bg-[#003f48] font-semibold flex items-center gap-2"><RefreshCw size={14} /> Sync Category Tree</button>
      </header>

      <Notice notice={notice} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-stone-900">Daraz Categories</h2>
              <p className="text-[11px] text-stone-500">Select a leaf category to view required listing data.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadCategories()} placeholder="Search category" className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded outline-none focus:ring-1 focus:ring-cyan-600" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-[11px] uppercase text-stone-500 border-b border-stone-200"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">Leaf</th><th className="px-4 py-3">Last Sync</th></tr></thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? <tr><td colSpan="4" className="px-4 py-10 text-center text-stone-400">Loading Daraz categories…</td></tr> : visibleCategories.length === 0 ? <tr><td colSpan="4" className="px-4 py-10 text-center text-stone-400">No matching category found.</td></tr> : visibleCategories.map((cat) => (
                  <tr key={`${cat.country_code}-${cat.category_id}`} onClick={() => openCategory(cat)} className={`cursor-pointer hover:bg-stone-50 ${selected?.category_id === cat.category_id ? "bg-cyan-50/70" : ""}`}>
                    <td className="px-4 py-3"><div className="font-bold text-stone-900">{cat.category_name}</div><div className="text-[10px] text-stone-500 truncate max-w-md">{cat.category_path || "No path saved"}</div></td>
                    <td className="px-4 py-3 font-mono text-stone-600">{cat.category_id}</td>
                    <td className="px-4 py-3">{Number(cat.is_leaf) ? <span className="text-emerald-700 font-bold">Yes</span> : <span className="text-stone-400">No</span>}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDateTime(cat.last_synced_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <div><h2 className="font-bold text-stone-900 flex items-center gap-2"><Tags size={15} className="text-cyan-700" /> Category Details</h2><p className="text-[11px] text-stone-500">Attributes and brands from Daraz.</p></div>
            <button disabled={!selected || panelLoading} onClick={syncSelectedDetails} className="px-3 py-2 border border-stone-300 rounded bg-white hover:bg-stone-50 font-semibold disabled:opacity-50 flex items-center gap-2"><RefreshCw size={14} className={panelLoading ? "animate-spin" : ""} /> Sync</button>
          </div>
          {!selected ? (
            <div className="p-8 text-center text-stone-400">Select a category to view required attributes and approved brands.</div>
          ) : (
            <div className="p-4 space-y-5 max-h-[720px] overflow-y-auto">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded"><div className="font-bold text-stone-900">{selected.category_name}</div><div className="text-[10px] text-stone-500 font-mono">Category ID: {selected.category_id}</div></div>
              <div>
                <h3 className="font-bold text-stone-900 mb-2">Required Attributes</h3>
                {panelLoading ? <p className="text-stone-400">Loading details…</p> : attributes.length === 0 ? <p className="text-stone-400">No attributes synced yet.</p> : <div className="space-y-2">{attributes.slice(0, 40).map((attr) => <div key={`${attr.attribute_name}-${attr.id}`} className="p-2 border border-stone-200 rounded flex justify-between gap-3"><span className="font-semibold text-stone-700">{attr.attribute_name}</span><span className={`text-[10px] font-bold ${Number(attr.is_mandatory) ? "text-rose-700" : "text-stone-400"}`}>{Number(attr.is_mandatory) ? "Required" : "Optional"}</span></div>)}</div>}
              </div>
              <div>
                <h3 className="font-bold text-stone-900 mb-2">Brands</h3>
                {brands.length === 0 ? <p className="text-stone-400">No brands synced yet.</p> : <div className="flex flex-wrap gap-2">{brands.slice(0, 80).map((brand) => <span key={`${brand.brand_name}-${brand.id}`} className="px-2 py-1 border border-stone-200 rounded bg-stone-50 text-stone-700 font-medium">{brand.brand_name}</span>)}</div>}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Notice({ notice }) {
  if (!notice?.text) return null;
  const cls = notice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : notice.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : notice.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-cyan-50 text-cyan-800 border-cyan-200";
  return <div className={`border rounded px-4 py-3 font-medium ${cls}`}>{notice.text}</div>;
}
