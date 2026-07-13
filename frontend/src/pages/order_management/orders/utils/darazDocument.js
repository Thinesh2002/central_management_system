function pick(obj, keys) {
  if (!obj || typeof obj !== "object") return null;

  for (const key of keys) {
    if (obj[key]) return obj[key];
  }

  return null;
}

export function extractPdfUrl(result) {
  return pick(result?.data || {}, ["pdf_url", "pdfUrl", "file_url", "document_url", "url"]);
}

// Bulk Print AWB returns one PDF per sheet of up to 9 labels - falls back
// to the singular pdf_url so single-order calls (which only ever produce
// one sheet) don't need a special case on the caller's side.
export function extractPdfUrls(result) {
  const urls = result?.data?.pdf_urls;
  if (Array.isArray(urls) && urls.length) return urls;

  const single = extractPdfUrl(result);
  return single ? [single] : [];
}

export function openDarazDocument(result) {
  const pdfUrl = extractPdfUrl(result);
  if (!pdfUrl) return false;

  window.open(pdfUrl, "_blank");
  return true;
}

export function extractDarazActionMessage(result) {
  const data = result?.data || {};
  const errors = data.errors || [];
  const skipped = data.skipped || [];

  if (!errors.length && !skipped.length) return result?.message || "";

  const lines = [result?.message || ""];

  if (errors.length) {
    lines.push(...errors.map((e) => (e.order_id ? `Order ${e.order_id}: ${e.reason}` : e.reason)));
  }
  if (skipped.length) lines.push(...skipped.map((s) => `Order ${s.order_id}: skipped — ${s.reason || "not eligible"}`));

  return lines.filter(Boolean).join("\n");
}
