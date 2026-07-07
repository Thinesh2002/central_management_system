function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-slate-800/80 py-2 last:border-b-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="break-words text-sm font-medium text-slate-200">{value || "-"}</p>
    </div>
  );
}

function parseAttributes(value) {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

export default function LocalProductDarazInfoCard({ product = {} }) {
  if (!product?.daraz_category_id) return null;

  const attributes = parseAttributes(product.daraz_attributes_json);
  const attributeEntries = Object.entries(attributes).filter(([, value]) => value !== "" && value != null);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4">
      <h2 className="text-sm font-semibold text-slate-100">Daraz Listing Info</h2>
      <p className="mt-1 text-xs text-slate-500">
        Category and attributes saved from the last transfer to Daraz.
      </p>

      <div className="mt-3 rounded-lg border border-slate-800 bg-[#070b16] p-3">
        <InfoRow label="Category" value={product.daraz_category_name} />
        <InfoRow label="Category ID" value={product.daraz_category_id} />
        <InfoRow label="Brand" value={product.daraz_brand} />
      </div>

      {attributeEntries.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#070b16] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Attribute</th>
                <th className="px-3 py-2 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attributeEntries.map(([key, value]) => (
                <tr key={key}>
                  <td className="px-3 py-2 text-slate-400">{key}</td>
                  <td className="px-3 py-2 font-medium text-slate-200">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
