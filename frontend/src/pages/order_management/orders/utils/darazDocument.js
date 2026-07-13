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

  if (errors.length) lines.push(...errors.map((e) => `Order ${e.order_id}: ${e.reason}`));
  if (skipped.length) lines.push(...skipped.map((s) => `Order ${s.order_id}: skipped — ${s.reason || "not eligible"}`));

  return lines.filter(Boolean).join("\n");
}
